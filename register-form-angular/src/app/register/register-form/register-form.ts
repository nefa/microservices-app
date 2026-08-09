import { Component, computed, inject, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';
import { LmaApi, type RegistrationError } from '../lma-api';
import { ROLE_DEFAULT_FEATURES, emptyRegistrationModel, registrationSchema } from '../registration-model';
import { AccountStep } from '../steps/account-step/account-step';
import { PersonalStep } from '../steps/personal-step/personal-step';
import { ProfessionalStep } from '../steps/professional-step/professional-step';
import { ReviewStep } from '../steps/review-step/review-step';

type Step = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [AccountStep, ProfessionalStep, PersonalStep, ReviewStep],
  templateUrl: './register-form.html',
  styleUrl: './register-form.scss',
})
export class RegisterForm {
  private readonly lmaApi = inject(LmaApi);

  // No longer private - step 4 and the post-submit confirmation screen
  // (both rendered via ReviewStep) read the raw model directly rather
  // than through individual Field bindings, since they only display
  // values, they don't edit them.
  readonly model = signal(emptyRegistrationModel());
  readonly registerForm = form(this.model, registrationSchema);

  readonly step = signal<Step>(1);
  readonly submitted = signal(false);
  // Errors that don't belong to a specific field (network failure, an
  // LMA error we can't map to a field) - shown once, above the actions,
  // rather than attached to a field like email-taken is.
  readonly serverError = signal<string | null>(null);

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

          if (fieldErrors.length > 0) return fieldErrors;

          this.serverError.set(registrationError.message);
          return undefined;
        }
      },
    });

    // submit() reports "ok" purely from the form's perspective (no
    // validation/targeted-field errors) - a generic failure caught above
    // still resolves as "ok" with no field errors, so serverError is
    // checked separately before treating this as a real success.
    if (ok && !this.serverError()) {
      this.submitted.set(true);
    }
  }
}
