import { Component, input } from '@angular/core';
import { FormField, type Field } from '@angular/forms/signals';

@Component({
  selector: 'app-account-step',
  standalone: true,
  imports: [FormField],
  templateUrl: './account-step.html',
  styleUrl: './account-step.scss',
})
export class AccountStep {
  readonly emailField = input.required<Field<string>>();
  readonly passwordField = input.required<Field<string>>();
  readonly confirmPasswordField = input.required<Field<string>>();
}
