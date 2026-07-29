import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Dashboard } from './dashboard/dashboard';
import { Ingest } from './documents/ingest/ingest';
import { authGuard } from './auth/auth-guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'ingest', component: Ingest, canActivate: [authGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
