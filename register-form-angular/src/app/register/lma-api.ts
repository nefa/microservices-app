import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import type { RegistrationModel } from './registration-model';

// This widget talks to the LMA directly instead of going through
// gateway-nest - a deliberate exception to gateway-nest's usual "one
// clear owner per request" pattern (see PROJECT-Structure-diagram.md at
// the microservices-app repo root, section 1). Registration is a write
// that carries sensitive personal/professional data; keeping it off
// gateway-nest avoids pulling that data through a hop it doesn't need to
// pass through - the same reasoning real providers use for e.g. Stripe
// Checkout being embedded directly rather than proxied through your own
// backend.

export interface RegistrationSubmission extends RegistrationModel {
  /** Computed from role (see ROLE_DEFAULT_FEATURES) - not user-edited, so it isn't part of the form model itself. */
  defaultFeatures: string[];
}

export interface RegistrationError {
  message: string;
  /** True when LMA reports this specific email is already registered - lets the caller target the error at the email field instead of showing it generically. */
  emailTaken: boolean;
  /**
   * True when LMA rejects the password against its own policy. The
   * client-side minLength/pattern checks in registration-model.ts are UX
   * only, not enforcement - a request that skips the browser entirely
   * (calling LMA directly) would bypass them completely, so LMA has to
   * re-check the same 8-char/special-character rule server-side
   * regardless of what the form already validated. This flag is what
   * lets that rejection still land on the password field instead of a
   * generic banner, same as emailTaken does for the email field.
   */
  passwordInvalid: boolean;
}

@Injectable({ providedIn: 'root' })
export class LmaApi {
  private readonly http = inject(HttpClient);

  async register(payload: RegistrationSubmission): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>(`${environment.lmaApiUrl}/registrations`, payload));
    } catch (error) {
      throw this.toRegistrationError(error);
    }
  }

  // LMA's error contract isn't documented yet (see the "if the user
  // exists, the endpoint will provide err headers (or some messages)"
  // requirement this widget was built against) - this checks both a
  // custom header and a JSON body field so either shape works once the
  // real API exists, rather than betting on one and breaking on the
  // other. Narrow this once LMA's actual contract is known.
  private toRegistrationError(error: unknown): RegistrationError {
    if (!(error instanceof HttpErrorResponse)) {
      return { emailTaken: false, passwordInvalid: false, message: 'Registration failed. Please try again.' };
    }

    const headerCode = error.headers.get('X-Error-Code');
    const bodyCode = (error.error as { code?: string } | null)?.code;

    // 409 Conflict is a reasonable fallback for "email taken" even
    // without an explicit code, since "conflict" conventionally means
    // "this resource already exists". No such safe fallback exists for
    // "password invalid" - a bare 400/422 could mean any number of
    // validation failures, so that one requires an explicit code and
    // isn't guessed from status alone.
    const emailTaken = headerCode === 'EMAIL_TAKEN' || bodyCode === 'EMAIL_TAKEN' || error.status === 409;
    const passwordInvalid = headerCode === 'PASSWORD_POLICY' || bodyCode === 'PASSWORD_POLICY';

    const bodyMessage = (error.error as { message?: string } | null)?.message;
    const fallbackMessage = emailTaken
      ? 'This email is already registered.'
      : passwordInvalid
        ? 'Password does not meet the required policy.'
        : 'Registration failed. Please try again.';

    return { emailTaken, passwordInvalid, message: bodyMessage ?? fallbackMessage };
  }
}
