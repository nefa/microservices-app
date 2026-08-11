import { Component, input } from '@angular/core';
import { FormField, type Field } from '@angular/forms/signals';

@Component({
  selector: 'app-personal-step',
  standalone: true,
  imports: [FormField],
  templateUrl: './personal-step.html',
  styleUrl: './personal-step.scss',
})
export class PersonalStep {
  readonly addressLine1Field = input.required<Field<string>>();
  readonly addressLine2Field = input.required<Field<string>>();
  readonly cityField = input.required<Field<string>>();
  readonly postalCodeField = input.required<Field<string>>();
  readonly countryField = input.required<Field<string>>();
  readonly emergencyContactNameField = input.required<Field<string>>();
  readonly emergencyContactPhoneField = input.required<Field<string>>();
  readonly emergencyContactRelationshipField = input.required<Field<string>>();
}
