import { Component, computed, input, output } from '@angular/core';
import { REQUESTABLE_FEATURES, type RegistrationModel } from '../../registration-model';

// Rendered in two places by register-form.ts, deliberately the same
// component both times so the two summaries can't drift apart:
//  - step 4, "does this look right before we submit?" (editable = true,
//    Edit links jump back to a specific step)
//  - the post-submit confirmation screen (editable = false, nothing left
//    to edit)
@Component({
  selector: 'app-review-step',
  standalone: true,
  templateUrl: './review-step.html',
  styleUrl: './review-step.scss',
})
export class ReviewStep {
  readonly model = input.required<RegistrationModel>();
  // Computed by the parent from the selected role (ROLE_DEFAULT_FEATURES)
  // - same reasoning as professional-step.ts not treating it as a field.
  readonly defaultFeatures = input.required<string[]>();
  readonly editable = input(true);

  readonly goToStep = output<1 | 2 | 3>();

  // Never render the real password back to the user, even on their own
  // review of their own data - a fixed-length mask (not sized to the
  // actual password) avoids revealing its length via dot count, the same
  // reasoning most password managers use for masked fields.
  readonly maskedPassword = '••••••••';

  readonly requestedFeatureLabels = computed(() =>
    this.model().requestedFeatures.map((key) => REQUESTABLE_FEATURES.find((feature) => feature.key === key)?.label ?? key),
  );
}
