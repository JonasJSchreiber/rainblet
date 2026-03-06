import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { GameService } from '../services/game.service';

@Component({
  standalone: true,
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent {
  readonly game = inject(GameService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly sessionStarted = computed(() => !!this.game.gameState());
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly canPlay = computed(() => this.isAuthenticated() && this.game.hasReferenceData());

  startGame(): void {
    if (!this.canPlay()) {
      return;
    }

    this.game.startGame('Learner');
    this.router.navigateByUrl('/play');
  }

  goStore(): void {
    this.router.navigateByUrl('/store');
  }
}
