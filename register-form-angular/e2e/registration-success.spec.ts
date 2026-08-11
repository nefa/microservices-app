import { expect, test } from '@playwright/test';
import { freshRegistration } from './fixtures/registration-data';
import { RegistrationFormPage } from './pages/registration-form.page';

test('completes registration and shows the success outcome screen', async ({ page, request }) => {
  const form = new RegistrationFormPage(page);
  const registration = freshRegistration();

  await form.fillThroughReview(registration);
  await form.submitButton.click();

  await expect(page.getByRole('heading', { name: "You're registered" })).toBeVisible();
  // Green check inside a blue circle - see submission-outcome.html/scss.
  await expect(page.locator('.icon-circle .check')).toBeVisible();

  // The review summary embedded in the outcome screen shows what was
  // actually submitted, password masked rather than omitted.
  await expect(page.getByText(registration.email)).toBeVisible();
  await expect(page.getByText('••••••••')).toBeVisible();

  // Cross-service assertion: confirm the registration actually landed on
  // lma-mock-nest, not just that the UI claimed success - see
  // lma-mock-nest/README.md's GET /registrations.
  const response = await request.get('http://localhost:43022/registrations');
  const registrations: Array<{ email: string }> = await response.json();
  expect(registrations.some((r) => r.email === registration.email)).toBe(true);
});

test('"Start over now" resets straight back to a blank step 1', async ({ page }) => {
  const form = new RegistrationFormPage(page);
  await form.fillThroughReview(freshRegistration());
  await form.submitButton.click();

  await expect(page.getByRole('heading', { name: "You're registered" })).toBeVisible();
  await page.getByRole('button', { name: 'Start over now' }).click();

  await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
  await expect(page.locator('#email')).toHaveValue('');
});
