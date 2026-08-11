import type { RegistrationInput } from '../pages/registration-form.page';

// lma-mock-nest has no database (see lma-mock-nest/README.md) - just an
// in-memory Map that only resets when the process restarts, not between
// test runs or between tests within a run. A hardcoded email would hit
// EMAIL_TAKEN the second time this suite runs against a
// still-running mock, so every call gets a unique one instead.
export function freshRegistration(overrides: Partial<RegistrationInput> = {}): RegistrationInput {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    email: `e2e-${unique}@example.com`,
    password: 'Testing123!',
    jobFunction: 'QA Engineer',
    role: 'engineer',
    addressLine1: '1 Test St',
    city: 'Testville',
    postalCode: '00000',
    country: 'Testland',
    emergencyContactName: 'Emer Gency',
    emergencyContactPhone: '555-0100',
    ...overrides,
  };
}
