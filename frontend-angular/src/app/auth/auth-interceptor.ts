import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Auth } from './auth';

// Functional interceptor - runs on every outgoing HttpClient request.
// Attaches the JWT (if we have one) as an Authorization header, so
// protected gateway endpoints (like /chat, once guarded) can identify
// who's calling without every component/service having to remember to
// attach the token itself.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const token = auth.getToken();

  if (!token) {
    return next(req);
  }

  // HttpRequest objects are immutable - clone() with an override is the
  // only way to add a header, same idea as C# records' "with" expressions.
  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authReq);
};
