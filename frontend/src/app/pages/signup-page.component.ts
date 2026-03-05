import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  templateUrl: './signup-page.component.html',
  styleUrls: ['./signup-page.component.css']
})
export class SignupPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly name = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly error = signal('');
  readonly isSubmitting = signal(false);

  createUser(): void {
    const email = this.email().trim();
    const name = this.name().trim();
    const password = this.password();
    const confirmPassword = this.confirmPassword();

    if (!email || !name || !password || !confirmPassword) {
      this.error.set('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }

    this.error.set('');
    this.isSubmitting.set(true);

    this.auth.registerWithEmail(email, name, password).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigateByUrl('/');
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.error.set(this.readAuthError(error, 'Unable to create user.'));
      }
    });
  }

  private readAuthError(error: unknown, fallback: string): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const payload = (error as { error?: { message?: string } }).error;
      if (payload?.message) {
        return payload.message;
      }
    }

    return fallback;
  }
}
