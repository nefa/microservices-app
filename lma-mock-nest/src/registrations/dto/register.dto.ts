// Mirrors register-form-angular's RegistrationSubmission field-for-field
// (RegistrationModel + defaultFeatures - see
// register-form-angular/src/app/register/lma-api.ts and
// registration-model.ts), since that's the exact payload
// RegisterForm.submitRegistration() sends. Plain class, no validation
// decorators yet - same deliberate deferral as gateway-nest's LoginDto.
export class RegisterDto {
  // Step 1 - account
  email: string;
  password: string;
  confirmPassword: string;

  // Step 2 - professional info
  jobFunction: string;
  role: string;
  requestedFeatures: string[];

  // Step 3 - personal info
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;

  // Computed client-side from role (ROLE_DEFAULT_FEATURES), not user-edited.
  defaultFeatures: string[];
}
