import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { Auth } from '../auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, InputText, Password, Button, Message],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  // Plain writable signals hold this component's form state - the
  // signal-based equivalent of instance fields, but reactive: any
  // template expression reading email()/password() re-renders
  // automatically whenever the signal's value changes, without manual
  // change detection wiring.
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly auth: Auth,
    private readonly router: Router,
  ) {}

  onSubmit(): void {
    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    this.auth.login(this.email(), this.password()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigateByUrl('/dashboard');
      },
      error: () => {
        this.isSubmitting.set(false);
        // Generic message, matching the gateway's own "never reveal which
        // part was wrong" rule - the frontend has no more specific
        // information than the backend already gave it (a plain 401).
        this.errorMessage.set('Invalid email or password.');
      },
    });
  }
}
