import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { UserRole } from '../users/user.entity';

interface AuthenticatedRequest extends Request {
  user: { userId: number; email: string; role: UserRole };
}

// Applied alongside AuthGuard('jwt'), never instead of it - this only
// reads the role already on request.user (attached by JwtStrategy.
// validate() once the token's signature/expiry are verified), it
// doesn't verify anything about the token itself. See user.entity.ts's
// UserRole comment for what this exists to eventually gate: the
// pending_document approve/reject endpoints.
//
// A single hardcoded role check rather than a @Roles(...) decorator +
// Reflector setup, since 'manager' is still the only role anything
// actually gates on - that's the right complexity for one guarded
// feature, not a sign this couldn't grow into the decorator-based
// version once a second role-gated feature shows up.
@Injectable()
export class ManagerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user?.role !== 'manager') {
      throw new ForbiddenException('Only managers can review document submissions.');
    }

    return true;
  }
}
