import { FormsModule } from '@angular/forms';
import { Component, ElementRef, HostListener, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { StickerAvatar } from './models/game.models';
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
  private readonly authPictureSource = computed(() => this.auth.user()?.pictureUrl || '');
  readonly profileImageErrored = signal(false);
  readonly authPicture = computed(() => (this.profileImageErrored() ? '' : this.authPictureSource()));
  readonly selectedAvatarSticker = this.game.selectedAvatarSticker;
  readonly ownedAvatarStickers = computed<StickerAvatar[]>(() => {
    const inventory = this.game.stickerInventory();
    return this.game
      .allStickers()
      .filter((sticker) => (inventory[sticker.id] ?? 0) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  });
  readonly isProfileMenuOpen = signal(false);
  readonly isLoginModalOpen = signal(false);
  readonly isAvatarModalOpen = signal(false);
  readonly loginEmail = signal('');
  readonly loginPassword = signal('');
  readonly loginError = signal('');
  readonly isLoginSubmitting = signal(false);

  constructor() {
    effect(() => {
      this.authPictureSource();
      this.profileImageErrored.set(false);
    });

    effect(() => {
      const loggedIn = this.isAuthenticated();
      const loginModalOpen = this.isLoginModalOpen();
      if (loggedIn && loginModalOpen) {
        this.closeLoginModal();
      }
    });
  }

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

  openAvatarModal(event?: Event): void {
    event?.stopPropagation();
    this.isAvatarModalOpen.set(true);
    this.isProfileMenuOpen.set(false);
  }

  closeAvatarModal(): void {
    this.isAvatarModalOpen.set(false);
  }

  selectAvatar(stickerId: string): void {
    this.game.setAvatarSticker(stickerId).subscribe((avatarStickerId) => {
      if (avatarStickerId) {
        this.closeAvatarModal();
      }
    });
  }

  onProfileImageError(): void {
    this.profileImageErrored.set(true);
  }

  logout(): void {
    this.isProfileMenuOpen.set(false);
    this.isAvatarModalOpen.set(false);
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
