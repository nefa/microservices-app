import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { LmaRegistrationException } from './lma-registration.exception';

// register-form-angular's LmaApi.toRegistrationError() checks *both* an
// X-Error-Code response header and a JSON body `code` field, since LMA's
// real error contract isn't documented yet and either shape might turn
// out to be right (see that file's comment). This filter is the one
// place that sets both, so RegistrationsService just throws a typed
// exception without knowing about response shaping.
@Catch(LmaRegistrationException)
export class LmaExceptionFilter implements ExceptionFilter {
  catch(exception: LmaRegistrationException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse() as { code: string; message: string };

    response.header('X-Error-Code', body.code).status(status).json(body);
  }
}
