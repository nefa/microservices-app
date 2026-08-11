import { expect, type Locator, type Page } from '@playwright/test';

export interface RegistrationInput {
  email: string;
  password: string;
  jobFunction: string;
  role: 'engineer' | 'manager' | 'analyst' | 'administrator';
  addressLine1: string;
  city: string;
  postalCode: string;
  country: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

// Page Object for register-form-angular's 4-step form (see
// src/app/register/register-form/) - one method per step, plus
// fillThroughReview() as the shared setup every test that reaches
// submission starts from. Field selectors are the same #ids
// account-step.html/professional-step.html/personal-step.html already
// use as <label for> targets, not invented for testing.
export class RegistrationFormPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async fillAccountStep(email: string, password: string): Promise<void> {
    await this.page.locator('#email').fill(email);
    await this.page.locator('#password').fill(password);
    await this.page.locator('#confirmPassword').fill(password);
  }

  async fillProfessionalStep(jobFunction: string, role: RegistrationInput['role']): Promise<void> {
    await this.page.locator('#jobFunction').fill(jobFunction);
    await this.page.locator('#role').selectOption(role);
  }

  async fillPersonalStep(
    input: Pick<
      RegistrationInput,
      'addressLine1' | 'city' | 'postalCode' | 'country' | 'emergencyContactName' | 'emergencyContactPhone'
    >,
  ): Promise<void> {
    await this.page.locator('#addressLine1').fill(input.addressLine1);
    await this.page.locator('#city').fill(input.city);
    await this.page.locator('#postalCode').fill(input.postalCode);
    await this.page.locator('#country').fill(input.country);
    await this.page.locator('#emergencyContactName').fill(input.emergencyContactName);
    await this.page.locator('#emergencyContactPhone').fill(input.emergencyContactPhone);
  }

  get nextButton(): Locator {
    return this.page.getByRole('button', { name: 'Next' });
  }

  get backButton(): Locator {
    return this.page.getByRole('button', { name: 'Back' });
  }

  get submitButton(): Locator {
    return this.page.getByRole('button', { name: 'Create account' });
  }

  // Advances through steps 1-3, filling each one, and stops on step 4
  // (Review) without submitting - every test that reaches submission
  // shares this, then adds its own assertions/interactions on top.
  async fillThroughReview(input: RegistrationInput): Promise<void> {
    await this.goto();

    await this.fillAccountStep(input.email, input.password);
    await this.nextButton.click();

    await this.fillProfessionalStep(input.jobFunction, input.role);
    await this.nextButton.click();

    await this.fillPersonalStep(input);
    await this.nextButton.click();

    await expect(this.page.getByRole('heading', { name: 'Review your information' })).toBeVisible();
  }
}
