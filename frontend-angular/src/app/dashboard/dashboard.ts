import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { Auth } from '../auth/auth';
import { TopBar } from '../layout/top-bar/top-bar';

@Component({
  selector: 'app-dashboard',
  imports: [Card, Button, RouterLink, TopBar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly auth = inject(Auth);

  // Reading the service's signal directly - the template re-renders
  // automatically whenever currentUser changes, no manual subscription.
  protected readonly currentUser = this.auth.currentUser;

  // Logout now lives in TopBar - Router/logout() logic removed from
  // here to avoid two different "log out" code paths doing the same
  // thing in two places.
}
