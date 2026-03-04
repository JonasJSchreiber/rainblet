import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../services/game.service';

@Component({
  standalone: true,
  template: `
    @if (question(); as q) {
      <section class="card play">
        <header>
          <h2>Question {{ progress() }}</h2>
          <p>Topic: {{ q.topic }}</p>
        </header>

        <h3>{{ q.prompt }}</h3>

        <div class="options">
          @for (option of q.options; track $index) {
            <button
              [disabled]="resultReady()"
              [class.correct]="resultReady() && $index === lastCorrectIndex()"
              [class.incorrect]="resultReady() && $index === selectedOption() && !lastWasCorrect()"
              (click)="selectAnswer($index)">
              {{ option }}
            </button>
          }
        </div>

        @if (resultReady()) {
          <p class="feedback" [class.bad]="!lastWasCorrect()">
            @if (lastWasCorrect()) {
              Correct! +10 score and +{{ lastCoinsAwarded() }} coins
            } @else {
              Not this time. Keep going.
            }
          </p>

          <button class="next" (click)="next()">{{ nextLabel() }}</button>
        }
      </section>
    } @else {
      <section class="card">
        <h2>No active game</h2>
        <p>Start a new session from the home page.</p>
      </section>
    }
  `,
  styles: [
    `
      .play h2,
      .play h3 {
        margin: 0;
      }

      .play header p {
        margin: 0.35rem 0 0.8rem;
        color: #43609d;
        font-weight: 700;
      }

      .options {
        display: grid;
        gap: 0.55rem;
        margin-top: 0.8rem;
      }

      .options button {
        text-align: left;
        border: 1px solid #c1d7ff;
        border-radius: 12px;
        padding: 0.75rem;
        background: #f4f9ff;
        cursor: pointer;
        font-weight: 700;
      }

      .options button.correct {
        border-color: #33b861;
        background: #e6faee;
      }

      .options button.incorrect {
        border-color: #c34a4a;
        background: #ffecec;
      }

      .feedback {
        margin: 0.8rem 0 0.6rem;
        color: #1e8a4d;
        font-weight: 900;
      }

      .feedback.bad {
        color: #a13232;
      }

      .next {
        border: 0;
        border-radius: 10px;
        padding: 0.55rem 0.9rem;
        background: linear-gradient(120deg, #ffbf2f, #ffeb65);
        color: #3d3000;
        font-weight: 900;
      }
    `
  ]
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

  readonly nextLabel = computed(() => (this.game.isRoundComplete() ? 'See Results' : 'Next Question'));

  constructor() {
    effect(() => {
      if (!this.game.gameState()) {
        this.router.navigateByUrl('/');
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
