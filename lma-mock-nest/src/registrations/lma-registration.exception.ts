import { HttpException, HttpStatus } from '@nestjs/common';

export type LmaErrorCode = 'EMAIL_TAKEN' | 'PASSWORD_POLICY';

// register-form-angular's LmaApi.toRegistrationError() (see
// register-form-angular/src/app/register/lma-api.ts) is written to
// recognize exactly these two codes - LMA's real contract isn't
// documented yet, so this mock only needs to cover what that client
// already knows how to interpret. `code` rides along on the exception so
// LmaExceptionFilter can stamp it onto both the response header and body.
export class LmaRegistrationException extends HttpException {
  constructor(
    readonly code: LmaErrorCode,
    message: string,
    status: HttpStatus,
  ) {
    super({ code, message }, status);
  }
}
