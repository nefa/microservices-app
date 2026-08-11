import { Component, input, output } from '@angular/core';

export type OutcomeKind = 'success' | 'error';

// The terminal screen shown once a submission attempt is actually
// finished (not "in progress", not "fix this field and try again" - see
// register-form.ts's comment on why field-specific LMA errors
// deliberately never reach this component). Icon/heading/message are the
// only things that differ between the two kinds; the countdown-and-reset
// behavior is identical either way, so it lives here once rather than
// twice.
@Component({
  selector: 'app-submission-outcome',
  standalone: true,
  templateUrl: './submission-outcome.html',
  styleUrl: './submission-outcome.scss',
})
export class SubmissionOutcome {
  readonly kind = input.required<OutcomeKind>();
  readonly heading = input.required<string>();
  readonly message = input<string | null>(null);
  readonly secondsRemaining = input.required<number>();

  // WCAG 2.2.1 (Timing Adjustable) - an unattended countdown that forces
  // a reset with no way to skip it is a real accessibility problem for
  // anyone who reads the outcome slower than 10 seconds. This is the
  // escape hatch: register-form.ts's resetToStart() runs immediately on
  // click instead of waiting for the timer.
  readonly startOver = output<void>();
}
