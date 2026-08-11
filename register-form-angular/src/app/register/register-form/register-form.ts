import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';
import { LmaApi, type RegistrationError } from '../lma-api';
import { ROLE_DEFAULT_FEATURES, emptyRegistrationModel, registrationSchema } from '../registration-model';
import { AccountStep } from '../steps/account-step/account-step';
import { PersonalStep } from '../steps/personal-step/personal-step';
import { ProfessionalStep } from '../steps/professional-step/professional-step';
import { ReviewStep } from '../steps/review-step/review-step';
import { SubmissionOutcome, type OutcomeKind } from '../submission-outcome/submission-outcome';

type Step = 1 | 2 | 3 | 4;

// How long the outcome screen (success or error) stays up before
// resetToStart() fires automatically - see showOutcome().
const REDIRECT_SECONDS = 10;

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [AccountStep, ProfessionalStep, PersonalStep, ReviewStep, SubmissionOutcome],
  templateUrl: './register-form.html',
  styleUrl: './register-form.scss',
})
export class RegisterForm implements OnDestroy {
  private readonly lmaApi = inject(LmaApi);

  // No longer private - step 4 and the post-submit confirmation screen
  // (both rendered via ReviewStep) read the raw model directly rather
  // than through individual Field bindings, since they only display
  // values, they don't edit them.
  readonly model = signal(emptyRegistrationModel());
  readonly registerForm = form(this.model, registrationSchema);

  readonly step = signal<Step>(1);
  // null while still filling out the form; set once a submission attempt
  // actually finishes, one way or the other. Deliberately does NOT cover
  // "email taken" / "password invalid" - those are recoverable by fixing
  // a field, so they stay on the form instead of ending it (see
  // submitRegistration()'s fieldErrors branch).
  readonly outcome = signal<OutcomeKind | null>(null);
  // The error outcome screen's message. Only ever set together with
  // outcome.set('error') - never shown inline on the form itself, unlike
  // a field-specific error (email-taken/password-policy), which is.
  readonly serverError = signal<string | null>(null);
  readonly secondsUntilReset = signal(REDIRECT_SECONDS);

  private redirectTimer: ReturnType<typeof setInterval> | undefined;

  // Same computation professional-step.ts does locally for its own
  // "included by default" list - duplicated here (not shared) because
  // this one feeds ReviewStep, which is a plain display, not a Field-bound
  // step component.
  readonly defaultFeatures = computed(() => ROLE_DEFAULT_FEATURES[this.model().role] ?? []);

  // Gates the "Next" button per step - only the fields visible on the
  // step being shown need to be valid to advance. Checking the whole
  // form here would block progress on later steps the user hasn't
  // reached yet.
  readonly step1Valid = computed(
    () =>
      this.registerForm.email().valid() &&
      this.registerForm.password().valid() &&
      this.registerForm.confirmPassword().valid(),
  );
  readonly step2Valid = computed(() => this.registerForm.jobFunction().valid() && this.registerForm.role().valid());
  readonly step3Valid = computed(
    () =>
      this.registerForm.addressLine1().valid() &&
      this.registerForm.city().valid() &&
      this.registerForm.postalCode().valid() &&
      this.registerForm.country().valid() &&
      this.registerForm.emergencyContactName().valid() &&
      this.registerForm.emergencyContactPhone().valid(),
  );

  // Step 4 (Review) has nothing of its own to validate - it only reads
  // fields the earlier three steps already validated - so it defaults to
  // valid, same as "no gate needed to leave the last step".
  readonly currentStepValid = computed(() => {
    switch (this.step()) {
      case 1:
        return this.step1Valid();
      case 2:
        return this.step2Valid();
      case 3:
        return this.step3Valid();
      default:
        return true;
    }
  });

  next(): void {
    if (this.step() === 1 && this.step1Valid()) this.step.set(2);
    else if (this.step() === 2 && this.step2Valid()) this.step.set(3);
    else if (this.step() === 3 && this.step3Valid()) this.step.set(4);
  }

  back(): void {
    if (this.step() === 2) this.step.set(1);
    else if (this.step() === 3) this.step.set(2);
    else if (this.step() === 4) this.step.set(3);
  }

  // Wired to ReviewStep's (goToStep) on step 4 - lets "Edit" jump
  // straight to the section that field lives on, instead of forcing
  // three "Back" clicks. The target step's fields are still the same
  // Field instances bound to the same `model` signal, so they show up
  // already filled in - no re-fetching or re-populating needed.
  goToStep(target: 1 | 2 | 3): void {
    this.step.set(target);
  }

  // (ngSubmit) is provided by FormsModule's NgForm directive, which
  // isn't imported here - this component uses @angular/forms/signals
  // instead, which has no equivalent. Without it, "Create account" is
  // just a bare <button type="submit"> in a <form> with no action/method
  // set, so a click falls through to the browser's own default form
  // submission: a real navigation (GET to the current URL), reloading
  // the whole app back to a blank step 1 instead of ever calling
  // submitRegistration(). Binding the native (submit) event and calling
  // preventDefault() ourselves is the fix.
  onSubmit(event: Event): void {
    event.preventDefault();
    void this.submitRegistration();
  }

  async submitRegistration(): Promise<void> {
    this.serverError.set(null);

    const ok = await submit(this.registerForm, {
      action: async (f) => {
        const value = f().value();
        try {
          await this.lmaApi.register({
            ...value,
            defaultFeatures: ROLE_DEFAULT_FEATURES[value.role] ?? [],
          });
          return undefined;
        } catch (error) {
          const registrationError = error as RegistrationError;
          const fieldErrors = [];

          if (registrationError.emailTaken) {
            // Targeted at the email field specifically, matching the
            // requirement that an existing user shows up as a field-level
            // error rather than a generic banner (this is also why the
            // race with the earlier validateHttp availability check is
            // fine to leave unresolved - this catch is the backstop).
            fieldErrors.push({ fieldTree: this.registerForm.email, kind: 'email-taken', message: registrationError.message });
          }
          if (registrationError.passwordInvalid) {
            // LMA re-enforcing its own password policy server-side (see
            // RegistrationError.passwordInvalid) - surfaced the same way
            // as emailTaken, on the field it actually concerns.
            fieldErrors.push({
              fieldTree: this.registerForm.password,
              kind: 'password-policy',
              message: registrationError.message,
            });
          }

          if (fieldErrors.length > 0) {
            // Both possible field errors live on step 1 (email, password)
            // - jump back there so account-step.html's error rendering
            // actually has a chance to be seen, instead of silently
            // attaching to a field on a step that isn't on screen right
            // now (submission only ever happens from step 4).
            this.step.set(1);
            return fieldErrors;
          }

          this.serverError.set(registrationError.message);
          return undefined;
        }
      },
    });

    // submit() reports "ok" purely from the form's perspective - false
    // when fieldErrors were returned above (already handled: back on step
    // 1, form stays open), true otherwise. A generic failure still
    // resolves "ok" with no field errors, so serverError is what tells
    // success and failure apart once we get here.
    if (!ok) return;

    this.showOutcome(this.serverError() ? 'error' : 'success');
  }

  // Wired to SubmissionOutcome's (startOver) - either the 10s timer
  // firing on its own, or the user clicking "Start over now" to skip the
  // wait (see submission-outcome.ts's comment on why that button exists).
  startOver(): void {
    this.clearRedirectTimer();
    this.model.set(emptyRegistrationModel());
    this.step.set(1);
    this.outcome.set(null);
    this.serverError.set(null);
  }

  ngOnDestroy(): void {
    this.clearRedirectTimer();
  }

  private showOutcome(kind: OutcomeKind): void {
    this.outcome.set(kind);
    this.secondsUntilReset.set(REDIRECT_SECONDS);
    this.clearRedirectTimer();
    this.redirectTimer = setInterval(() => {
      const remaining = this.secondsUntilReset() - 1;
      if (remaining <= 0) {
        this.startOver();
      } else {
        this.secondsUntilReset.set(remaining);
      }
    }, 1000);
  }

  private clearRedirectTimer(): void {
    if (this.redirectTimer !== undefined) {
      clearInterval(this.redirectTimer);
      this.redirectTimer = undefined;
    }
  }
}
