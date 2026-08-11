import { expect, test } from '@playwright/test';
import { freshRegistration } from './fixtures/registration-data';
import { RegistrationFormPage } from './pages/registration-form.page';

test('shows the error outcome screen when registration fails for an unclassified reason', async ({ page }) => {
  // Simulates a failure lma-api.ts can't map to a specific field - no
  // X-Error-Code header, no recognizable body `code` (see its
  // toRegistrationError()) - e.g. a network error or an LMA outage. This
  // is the one case meant to reach the red-X screen instead of an inline
  // field error; register-form.ts's comment explains why
  // EMAIL_TAKEN/PASSWORD_POLICY deliberately never get here.
  await page.route('**/registrations', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    }
    return route.continue();
  });

  const form = new RegistrationFormPage(page);
  await form.fillThroughReview(freshRegistration());
  await form.submitButton.click();

  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
  // Red X inside the same blue circle used for success - see
  // submission-outcome.html/scss.
  await expect(page.locator('.icon-circle .cross')).toBeVisible();
  await expect(page.getByText('Returning to the start in')).toBeVisible();
});
