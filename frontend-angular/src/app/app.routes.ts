import { Routes } from '@angular/router';
import { authGuard } from './auth/auth-guard';
import { managerGuard } from './auth/manager-guard';

// loadComponent (not `component`) - each route's chunk (and whatever
// PrimeNG modules only that route uses, e.g. review's Table/InputText)
// loads on navigation instead of all landing in the one initial bundle.
// This stopped being optional once /review pushed the initial bundle
// past angular.json's 1MB hard budget - the fix is fewer things in that
// bundle, not a bigger budget number pretending the growth is fine.
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./auth/login/login').then((m) => m.Login) },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [authGuard],
  },
  {
    path: 'ingest',
    loadComponent: () => import('./documents/ingest/ingest').then((m) => m.Ingest),
    canActivate: [authGuard],
  },
  {
    path: 'review',
    loadComponent: () => import('./documents/review/review').then((m) => m.Review),
    canActivate: [authGuard, managerGuard],
  },
  {
    path: 'chat',
    loadComponent: () => import('./chat/chat-page/chat-page').then((m) => m.ChatPage),
    canActivate: [authGuard],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
