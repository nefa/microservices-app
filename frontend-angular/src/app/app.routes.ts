import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Dashboard } from './dashboard/dashboard';
import { Ingest } from './documents/ingest/ingest';
import { ChatPage } from './chat/chat-page/chat-page';
import { authGuard } from './auth/auth-guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'ingest', component: Ingest, canActivate: [authGuard] },
  { path: 'chat', component: ChatPage, canActivate: [authGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
