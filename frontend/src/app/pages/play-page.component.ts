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

  readonly gameState = this.game.gameState;
  readonly question = this.game.currentQuestion;
  readonly progress = this.game.progressText;
  readonly isRoundComplete = this.game.isRoundComplete;
  readonly shuffledOptions = computed(() => {
    const currentQuestion = this.question();
    if (!currentQuestion) {
      return [];
    }

    const options = currentQuestion.options.map((label, originalIndex) => ({ label, originalIndex }));
    return this.shuffle(options);
  });

  protected readonly resultReady = signal(false);
  protected readonly selectedOption = signal<number | null>(null);
  protected readonly lastWasCorrect = signal(false);
  protected readonly lastCorrectIndex = signal<number | null>(null);
  protected readonly lastCoinsAwarded = signal(0);
  private readonly hasRequestedRefresh = signal(false);

  readonly correctAnswers = computed(() => this.gameState()?.answers.filter((answer) => answer.isCorrect).length ?? 0);
  readonly totalQuestions = computed(() => this.gameState()?.roundSize ?? 0);
  readonly correctPercentage = computed(() => {
    const total = this.totalQuestions();
    if (total <= 0) {
      return 0;
    }

    return Math.round((this.correctAnswers() / total) * 100);
  });

  constructor() {
    effect(() => {
      const session = this.gameState();
      const ready = this.game.hasReferenceData();

      if (!session && !ready && !this.hasRequestedRefresh()) {
        untracked(() => {
          this.hasRequestedRefresh.set(true);
          this.game.refreshReferenceData();
        });
        return;
      }

      if (!session && ready) {
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
    this.game.advanceQuestion();
  }

  backToHome(): void {
    this.router.navigateByUrl('/');
  }

  playAgain(): void {
    this.resultReady.set(false);
    this.selectedOption.set(null);
    this.lastCorrectIndex.set(null);
    this.lastWasCorrect.set(false);
    this.lastCoinsAwarded.set(0);
    this.game.startGame('Learner');
  }

  private shuffle<T>(items: T[]): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }
}
