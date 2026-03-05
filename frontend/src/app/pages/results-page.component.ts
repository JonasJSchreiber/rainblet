import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../services/game.service';

@Component({
  standalone: true,
  templateUrl: './results-page.component.html',
  styleUrls: ['./results-page.component.css']
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