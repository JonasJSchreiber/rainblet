import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { GameService } from './services/game.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private readonly game = inject(GameService);
  private readonly auth = inject(AuthService);
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

  loginWithGoogle(): void {
    this.auth.loginWithGoogle();
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update((open) => !open);
  }

  logout(): void {
    this.isProfileMenuOpen.set(false);
    this.auth.logout();
  }
}