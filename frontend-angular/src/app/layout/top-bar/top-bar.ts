import { Component, computed, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Avatar } from 'primeng/avatar';
import { Auth } from '../../auth/auth';

@Component({
  selector: 'app-top-bar',
  imports: [Button, Avatar],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
})
export class TopBar {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  // No sidebar exists yet for this to control - output() lets whichever
  // page hosts this header react later without TopBar itself needing to
  // change. output() is the signal-era replacement for @Output()
  // EventEmitter, matching the signal-first style used throughout this app.
  readonly toggleNav = output<void>();

  // Derives a single-letter avatar label from the logged-in user's email
  // (e.g. "bob@example.com" -> "B") - a computed signal, so it updates
  // automatically if Auth.currentUser ever changes.
  protected readonly avatarLabel = computed(() => {
    const email = this.auth.currentUser()?.email;
    return email ? email.charAt(0).toUpperCase() : '?';
  });

  onToggleNav(): void {
    this.toggleNav.emit();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
