import { expect, test } from '@playwright/test';
import { freshRegistration } from './fixtures/registration-data';
import { RegistrationFormPage } from './pages/registration-form.page';

// alice@example.com is seeded into lma-mock-nest on every boot (see
// lma-mock-nest/src/registrations/seed-users.ts), so it's always taken -
// this test doesn't depend on run order or another test having
// registered something first.
//
// The live debounced availability check on step 1 (registration-model.ts's
// validateHttp) already catches a known-taken email and disables "Next"
// before submission is even reachable - that's step 1's own job, covered
// implicitly by every other test using a fresh email. What this test
// exercises is EMAIL_TAKEN's actual purpose per lma-api.ts's comment: the
// backstop for a *race* with that check (e.g. someone else registers the
// address in the gap between the check and the real submit). Faking the
// availability response is what reproduces that race deterministically.
test('shows an inline error on the email field for an already-registered address, without leaving the form', async ({
  page,
}) => {
  await page.route('**/registrations/email-availability**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ available: true }) }),
  );

  const form = new RegistrationFormPage(page);
  await form.fillThroughReview(freshRegistration({ email: 'alice@example.com' }));
  await form.submitButton.click();

  // register-form.ts jumps back to step 1 so this is actually visible -
  // see its comment on why submission stays "not ok" but the resulting
  // error targets a field on a step that isn't the one currently shown
  // (submission only ever happens from step 4).
  await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
  await expect(page.getByText('This email is already registered.')).toBeVisible();

  // A recoverable field error never reaches the outcome screen.
  await expect(page.getByRole('heading', { name: "You're registered" })).not.toBeVisible();
});
