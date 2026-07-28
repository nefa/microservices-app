import { Service, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

interface AuthUser {
  id: number;
  email: string;
  createdAt: string;
}

interface LoginResponse {
  user: AuthUser;
  token: string;
}

// NOTE: hardcoded here for learning purposes, same caveat as every
// hardcoded config value on the backend (Postgres connection, JWT
// secrets) - in a real app this would come from Angular's environment
// files (environment.ts / environment.prod.ts), since it needs to differ
// between local dev and a deployed build.
const GATEWAY_URL = 'http://localhost:3000';
const TOKEN_STORAGE_KEY = 'auth_token';
const USER_STORAGE_KEY = 'auth_user';

@Service()
export class Auth {
  // @Service classes can't use classic constructor injection (Angular
  // enforces this) - inject() is the replacement, callable directly in a
  // field initializer instead of needing a constructor parameter.
  private readonly http = inject(HttpClient);

  // Private writable signals hold the actual auth state. Only this
  // service can change them (via login()/logout()) - everything else in
  // the app reads the readonly views exposed below. This is the
  // signal-based equivalent of a BehaviorSubject + getter pattern.
  private readonly currentUserSignal = signal<AuthUser | null>(this.readStoredUser());
  private readonly tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_STORAGE_KEY));

  // .asReadonly() gives callers a signal they can read/react to but not
  // call .set()/.update() on - the same intent as EF Core's DbSet being
  // exposed but not letting callers swap the whole DbContext out.
  readonly currentUser = this.currentUserSignal.asReadonly();

  // computed() derives a signal from other signals - it automatically
  // recalculates (and notifies anything reading it) whenever tokenSignal
  // changes, without manually wiring up subscriptions.
  readonly isAuthenticated = computed(() => this.tokenSignal() !== null);

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${GATEWAY_URL}/auth/login`, { email, password }).pipe(
      // tap runs a side effect when the request succeeds, without
      // altering the value flowing through the Observable - the login()
      // caller still receives the raw LoginResponse, while this service
      // separately updates its own state and persists it to
      // localStorage so a page refresh doesn't lose the session.
      tap((response) => {
        this.tokenSignal.set(response.token);
        this.currentUserSignal.set(response.user);
        localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
      }),
    );
  }

  logout(): void {
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
}
