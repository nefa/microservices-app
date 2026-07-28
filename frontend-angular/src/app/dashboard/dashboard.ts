import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { Auth } from '../auth/auth';

@Component({
  selector: 'app-dashboard',
  imports: [Card, Button],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  // Reading the service's signal directly - the template re-renders
  // automatically whenever currentUser changes, no manual subscription.
  protected readonly currentUser = this.auth.currentUser;

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
