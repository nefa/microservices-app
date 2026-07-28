import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

// Functional route guard - Angular's current recommended pattern,
// replacing the older class-based CanActivate implementation. Applied to
// a route via `canActivate: [authGuard]` (see app.routes.ts).
export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // Returning false alone would just silently block navigation - we also
  // need to actually send the user somewhere, hence the explicit redirect.
  router.navigateByUrl('/login');
  return false;
};
