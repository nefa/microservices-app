import type { SchemaFn } from '@angular/forms/signals';
import { email, minLength, pattern, required, validate, validateHttp } from '@angular/forms/signals';
import { environment } from '../../environments/environment';

// The full shape of the multi-step registration form. Flat rather than
// nested per-step, since the LMA registration endpoint (called on the
// final submit) needs the whole thing in one payload anyway - nesting it
// under account/professional/personal would just mean unwrapping it
// again right before the POST.
export interface RegistrationModel {
  // Step 1 — account
  email: string;
  password: string;
  confirmPassword: string;

  // Step 2 — professional info
  jobFunction: string;
  role: string;
  /** Features the user is actively requesting; these need approval later - see ROLE_DEFAULT_FEATURES for what's granted automatically. */
  requestedFeatures: string[];

  // Step 3 — personal info
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

export function emptyRegistrationModel(): RegistrationModel {
  return {
    email: '',
    password: '',
    confirmPassword: '',
    jobFunction: '',
    role: '',
    requestedFeatures: [],
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    country: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
  };
}

// Placeholder role catalogue for the "function/role" step, and which
// features come with each role automatically (no approval needed) vs.
// which ones a user has to actively request (see requestedFeatures).
// TODO: replace with whatever LMA's real role catalogue turns out to be.
export const ROLES = ['engineer', 'manager', 'analyst', 'administrator'] as const;

export const ROLE_DEFAULT_FEATURES: Record<string, string[]> = {
  engineer: ['chat', 'document-submit'],
  manager: ['chat', 'document-submit', 'team-dashboard'],
  analyst: ['chat', 'document-submit', 'reporting'],
  administrator: ['chat', 'document-submit', 'team-dashboard', 'reporting', 'admin-console'],
};

// Features any role CAN request but none get by default - the ones that
// need later approval, per the multi-step form's step 2.
export const REQUESTABLE_FEATURES = [
  { key: 'admin-console', label: 'Admin console access' },
  { key: 'billing-management', label: 'Billing management' },
  { key: 'api-access', label: 'API access (voice/chat services)' },
  { key: 'bulk-export', label: 'Bulk data export' },
] as const;

// At least one special character - kept as its own rule rather than
// folded into one giant regex, so the UI can tell the user exactly which
// part of "8 chars, with special chars" is still unmet.
//
// This is UX only, not enforcement: these rules must be re-checked by
// LMA server-side with the same policy (min 8 chars, ≥1 special
// character), since any request that skips this form entirely - a
// direct API call - bypasses every validator below. See
// lma-api.ts's RegistrationError.passwordInvalid, which is what surfaces
// LMA's own rejection back onto the password field if its policy ever
// differs from what's enforced here.
const SPECIAL_CHAR = /[^A-Za-z0-9]/;

export const registrationSchema: SchemaFn<RegistrationModel> = (p) => {
  // ---- Step 1: account ----
  required(p.email, { message: 'Email is required.' });
  email(p.email, { error: { kind: 'email-format', message: 'Enter a valid email address.' } });

  // TODO: confirm the real LMA contract once it exists - this assumes
  // GET {lmaApiUrl}/registrations/email-availability?email=... returns
  // { available: boolean } on 200. If LMA instead signals "taken" via a
  // non-2xx status, that only changes onError below, not this shape.
  validateHttp<string, { available: boolean }>(p.email, {
    request: (ctx) => {
      const value = ctx.value();
      // required() above already covers the empty case - skip firing a
      // request for a value we already know is invalid.
      if (!value) return undefined;
      return `${environment.lmaApiUrl}/registrations/email-availability?email=${encodeURIComponent(value)}`;
    },
    debounce: 400,
    onSuccess: (result) =>
      result.available ? undefined : { kind: 'email-taken', message: 'This email is already registered.' },
    onError: () => ({
      kind: 'availability-check-failed',
      message: 'Could not verify email availability. Please try again.',
    }),
  });

  required(p.password, { message: 'Password is required.' });
  minLength(p.password, 8, { message: 'Password must be at least 8 characters.' });
  pattern(p.password, SPECIAL_CHAR, {
    error: { kind: 'special-char', message: 'Password must include at least one special character.' },
  });

  required(p.confirmPassword, { message: 'Please confirm your password.' });
  validate(p.confirmPassword, (ctx) =>
    ctx.value() !== ctx.valueOf(p.password)
      ? { kind: 'password-mismatch', message: 'Passwords do not match.' }
      : undefined,
  );

  // ---- Step 2: professional info ----
  required(p.jobFunction, { message: 'Function is required.' });
  required(p.role, { message: 'Role is required.' });
  // requestedFeatures has no validators - every combination, including
  // none selected, is valid; it's a request, not a requirement.

  // ---- Step 3: personal info ----
  required(p.addressLine1, { message: 'Address is required.' });
  required(p.city, { message: 'City is required.' });
  required(p.postalCode, { message: 'Postal code is required.' });
  required(p.country, { message: 'Country is required.' });
  required(p.emergencyContactName, { message: 'Emergency contact name is required.' });
  required(p.emergencyContactPhone, { message: 'Emergency contact phone is required.' });
};
