import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameService } from '../services/game.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="card home">
      <h2>Play. Win. Collect.</h2>
      <p>Beat quiz rounds, stack coins, and pull shiny avatar stickers in the store.</p>

      <div class="stats">
        <div><strong>Coins:</strong> {{ game.walletCoins() }}</div>
        <div><strong>Sticker Avatars:</strong> {{ game.ownedStickerCount() }}</div>
      </div>

      <label for="name">Player name</label>
      <input id="name" type="text" maxlength="24" [(ngModel)]="playerName" placeholder="Type your name" />

      <div class="actions">
        <button (click)="startGame()">Start Quiz</button>
        <button class="secondary" (click)="goStore()">Go to Store</button>
        <button class="danger" (click)="reset()">Reset Session Data</button>
      </div>

      @if (sessionStarted()) {
        <small class="note">Session progress saves in this browser tab session.</small>
      }
    </section>
  `,
  styles: [
    `
      .home h2 {
        margin-top: 0;
        margin-bottom: 0.3rem;
      }

      .home p {
        margin-top: 0;
        color: #365796;
        font-weight: 700;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 0.5rem;
      }

      .stats div {
        background: #f1f8ff;
        border: 1px solid #c5dbff;
        border-radius: 10px;
        padding: 0.5rem;
      }

      label {
        display: block;
        margin: 0.8rem 0 0.35rem;
        font-weight: 800;
      }

      input {
        width: 100%;
        border: 1px solid #b8d2ff;
        border-radius: 10px;
        padding: 0.65rem;
        font-size: 1rem;
      }

      .actions {
        margin-top: 0.8rem;
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      button {
        border: 0;
        border-radius: 10px;
        padding: 0.55rem 0.95rem;
        font-weight: 900;
        cursor: pointer;
        background: linear-gradient(120deg, #1c53ff, #43a1ff);
        color: #fff;
      }

      .secondary {
        background: linear-gradient(120deg, #16b45d, #42d695);
      }

      .danger {
        background: #f2f4fb;
        color: #29467f;
      }

      .note {
        display: block;
        margin-top: 0.7rem;
        color: #5f6d8c;
      }
    `
  ]
})
export class HomePageComponent {
  protected playerName = 'Learner';

  readonly game = inject(GameService);
  private readonly router = inject(Router);
  readonly sessionStarted = computed(() => !!this.game.gameState());

  startGame(): void {
    this.game.startGame(this.playerName);
    this.router.navigateByUrl('/play');
  }

  goStore(): void {
    this.router.navigateByUrl('/store');
  }

  reset(): void {
    this.game.resetProgress();
    this.playerName = 'Learner';
  }
}
