import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../services/game.service';

@Component({
  standalone: true,
  templateUrl: './play-page.component.html',
  styleUrls: ['./play-page.component.css']
})
export class PlayPageComponent {
  private readonly game = inject(GameService);
  private readonly router = inject(Router);

  readonly question = this.game.currentQuestion;
  readonly progress = this.game.progressText;

  protected readonly resultReady = signal(false);
  protected readonly selectedOption = signal<number | null>(null);
  protected readonly lastWasCorrect = signal(false);
  protected readonly lastCorrectIndex = signal<number | null>(null);
  protected readonly lastCoinsAwarded = signal(0);
  private readonly hasRequestedRefresh = signal(false);

  readonly nextLabel = computed(() => (this.game.isRoundComplete() ? 'See Results' : 'Next Question'));

  constructor() {
    effect(() => {
      const hasActiveGame = this.game.hasActiveGame();
      const ready = this.game.hasReferenceData();

      if (!hasActiveGame && !ready && !this.hasRequestedRefresh()) {
        untracked(() => {
          this.hasRequestedRefresh.set(true);
          this.game.refreshReferenceData();
        });
        return;
      }

      if (!hasActiveGame && ready) {
        untracked(() => {
          this.game.startGame('Learner');
        });
      }
    });
  }

  selectAnswer(index: number): void {
    if (this.resultReady()) {
      return;
    }

    const result = this.game.submitAnswer(index);
    this.selectedOption.set(index);
    this.lastWasCorrect.set(result.isCorrect);
    this.lastCorrectIndex.set(result.correctIndex);
    this.lastCoinsAwarded.set(result.coinsAwarded);
    this.resultReady.set(true);
  }

  next(): void {
    this.resultReady.set(false);
    this.selectedOption.set(null);
    this.lastCorrectIndex.set(null);

    if (this.game.isRoundComplete()) {
      this.router.navigateByUrl('/results');
      return;
    }

    this.game.advanceQuestion();
  }
}
