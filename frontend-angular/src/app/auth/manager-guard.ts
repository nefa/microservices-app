import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

// Composed alongside authGuard on a route (canActivate: [authGuard,
// managerGuard]), not instead of it - this guard only checks the
// logged-in user's role, it doesn't check whether they're logged in at
// all. Mirrors gateway-nest's ManagerGuard (manager.guard.ts) - the real
// enforcement is server-side; this only spares a non-manager the
// round-trip of hitting a route that would 403 anyway.
export const managerGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.currentUser()?.role === 'manager') {
    return true;
  }

  router.navigateByUrl('/dashboard');
  return false;
};
