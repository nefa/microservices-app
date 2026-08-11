import { Component, computed, input } from '@angular/core';
import { FormField, type Field } from '@angular/forms/signals';
import { REQUESTABLE_FEATURES, ROLES, ROLE_DEFAULT_FEATURES } from '../../registration-model';

@Component({
  selector: 'app-professional-step',
  standalone: true,
  imports: [FormField],
  templateUrl: './professional-step.html',
  styleUrl: './professional-step.scss',
})
export class ProfessionalStep {
  readonly jobFunctionField = input.required<Field<string>>();
  readonly roleField = input.required<Field<string>>();
  readonly requestedFeaturesField = input.required<Field<string[]>>();

  readonly roles = ROLES;
  readonly requestableFeatures = REQUESTABLE_FEATURES;

  // Read-only, derived from the selected role - not something the user
  // picks directly, so it isn't a form field (see RegistrationModel's
  // comment on requestedFeatures vs. ROLE_DEFAULT_FEATURES).
  readonly defaultFeatures = computed(() => ROLE_DEFAULT_FEATURES[this.roleField()().value()] ?? []);

  isRequested(featureKey: string): boolean {
    return this.requestedFeaturesField()().value().includes(featureKey);
  }

  toggleRequested(featureKey: string, checked: boolean): void {
    const current = this.requestedFeaturesField()().value();
    const next = checked ? [...current, featureKey] : current.filter((key) => key !== featureKey);
    this.requestedFeaturesField()().value.set(next);
  }
}
