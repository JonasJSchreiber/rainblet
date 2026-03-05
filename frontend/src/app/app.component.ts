import { FormsModule } from '@angular/forms';
import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { GameService } from './services/game.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private readonly game = inject(GameService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly playerName = computed(() => this.game.gameState()?.playerName || 'Guest');
  readonly coins = this.game.walletCoins;
  readonly ownedStickers = this.game.ownedStickerCount;
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly authName = computed(() => this.auth.user()?.name || 'User');
  readonly authEmail = computed(() => this.auth.user()?.email || this.authName());
  readonly authPicture = computed(() => this.auth.user()?.pictureUrl || '');
  readonly authInitials = computed(() => {
    const source = this.auth.user()?.name || this.auth.user()?.email || 'U';
    const first = source.trim().charAt(0);
    return first ? first.toUpperCase() : 'U';
  });
  readonly isProfileMenuOpen = signal(false);
  readonly isLoginModalOpen = signal(false);
  readonly loginEmail = signal('');
  readonly loginPassword = signal('');
  readonly loginError = signal('');
  readonly isLoginSubmitting = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isProfileMenuOpen()) {
      return;
    }

    const target = event.target;
    if (target instanceof Node && !this.elementRef.nativeElement.contains(target)) {
      this.isProfileMenuOpen.set(false);
    }
  }

  openLoginModal(): void {
    this.loginError.set('');
    this.isLoginModalOpen.set(true);
  }

  closeLoginModal(): void {
    this.isLoginModalOpen.set(false);
    this.loginPassword.set('');
    this.loginError.set('');
  }

  submitEmailLogin(): void {
    const email = this.loginEmail().trim();
    const password = this.loginPassword();
    if (!email || !password) {
      this.loginError.set('Email and password are required.');
      return;
    }

    this.isLoginSubmitting.set(true);
    this.loginError.set('');

    this.auth.loginWithEmail(email, password).subscribe({
      next: () => {
        this.isLoginSubmitting.set(false);
        this.closeLoginModal();
      },
      error: (error) => {
        this.isLoginSubmitting.set(false);
        this.loginError.set(this.readAuthError(error, 'Login failed. Check your credentials.'));
      }
    });
  }

  loginWithGoogle(): void {
    this.auth.loginWithGoogle();
  }

  goToCreateUser(): void {
    this.closeLoginModal();
    this.router.navigateByUrl('/signup');
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update((open) => !open);
  }

  logout(): void {
    this.isProfileMenuOpen.set(false);
    this.auth.logout();
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
