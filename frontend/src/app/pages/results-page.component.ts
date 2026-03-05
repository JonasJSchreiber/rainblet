import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../services/game.service';

@Component({
  standalone: true,
  template: `
    @if (state(); as session) {
      <section class="card results">
        <h2>Round Results</h2>
        <p><strong>{{ session.playerName }}</strong>, nice run. You scored <strong>{{ session.score }}</strong>.</p>

        <ul>
          <li>Questions answered: {{ session.answers.length }} / {{ session.roundSize }}</li>
          <li>Correct answers: {{ correctCount() }}</li>
          <li>Best streak: {{ session.bestStreak }}</li>
          <li>Coins in wallet: {{ session.coins }}</li>
          <li>Sticker avatars unlocked: {{ stickerCount() }}</li>
        </ul>

        <div class="actions">
          <button (click)="playAgain()">Play Again</button>
          <button class="gold" (click)="toStore()">Open Store</button>
          <button class="secondary" (click)="toCollection()">Collection</button>
        </div>
      </section>
    } @else {
      <section class="card">
        <h2>No results yet</h2>
        <p>Start a game to generate round stats.</p>
      </section>
    }
  `,
  styles: [
    `
      .results h2 {
        margin-top: 0;
      }

      ul {
        padding-left: 1rem;
      }

      li {
        margin-bottom: 0.35rem;
        font-weight: 700;
      }

      .actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      button {
        border: 0;
        border-radius: 10px;
        padding: 0.5rem 0.9rem;
        font-weight: 900;
        background: linear-gradient(120deg, #1c53ff, #43a1ff);
        color: #fff;
      }

      .gold {
        background: linear-gradient(120deg, #ffc537, #ffed6f);
        color: #473600;
      }

      .secondary {
        background: #edf3ff;
        color: #2a4f8d;
      }
    `
  ]
})
export class ResultsPageComponent {
  private readonly game = inject(GameService);
  private readonly router = inject(Router);

  readonly state = this.game.gameState;
  readonly correctCount = computed(() => this.state()?.answers.filter((entry) => entry.isCorrect).length ?? 0);
  readonly stickerCount = this.game.ownedStickerCount;

  playAgain(): void {
    const name = this.state()?.playerName ?? 'Learner';
    this.game.startGame(name);
    this.router.navigateByUrl('/play');
  }

  toStore(): void {
    this.router.navigateByUrl('/store');
  }

  toCollection(): void {
    this.router.navigateByUrl('/collection');
  }
}
