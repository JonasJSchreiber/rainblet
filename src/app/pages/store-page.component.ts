import { TitleCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { StickerAvatar } from '../models/game.models';
import { GameService } from '../services/game.service';

@Component({
  standalone: true,
  imports: [TitleCasePipe],
  template: `
    <section class="card store">
      <h2>Sticker Store</h2>
      <p class="subtitle">Tap the sticker you want and roll for that exact avatar.</p>

      <div class="banner">
        <div><strong>Coins:</strong> {{ game.walletCoins() }}</div>
        <div><strong>Points:</strong> {{ game.gameState()?.score ?? 0 }}</div>
      </div>

      @if (lastResult(); as result) {
        <article class="drop" [class]="result.success ? 'success ' + result.offer.rarity : 'fail'">
          <div class="emoji" [class.pop]="result.success">{{ result.sticker?.emoji }}</div>
          <div>
            @if (result.success) {
              <h3>You won {{ result.sticker?.name }}!</h3>
              <p>{{ result.offer.rarity | titlecase }} hit.</p>
              <small>@if (result.isNew) { New sticker unlocked! } @else { Duplicate added. }</small>
            } @else {
              <h3>No drop for {{ result.sticker?.name }}</h3>
              <p>Try again after earning more coins/points.</p>
            }
          </div>
        </article>
      }

      <div class="sticker-grid">
        @for (sticker of game.allStickers; track sticker.id) {
          <article class="sticker-card" [class]="'sticker-card ' + sticker.rarity">
            <div class="sticker-emoji">{{ sticker.emoji }}</div>
            <div class="name">{{ sticker.name }}</div>
            <div class="rarity">{{ sticker.rarity | titlecase }}</div>
            <div class="owned">Owned: {{ ownedCount(sticker) }}</div>

            @if (offer(sticker); as currentOffer) {
              <button [disabled]="!canAfford(sticker)" (click)="openPreview(sticker)">
                Try: {{ currentOffer.cost }} {{ currentOffer.currency }} · {{ percent(currentOffer.successRate) }}
              </button>
            }
          </article>
        }
      </div>

      @if (selectedSticker(); as sticker) {
        <div class="modal-backdrop" (click)="closePreview()">
          <article class="modal-card" [class]="'modal-card ' + sticker.rarity" (click)="$event.stopPropagation()">
            <button class="close" (click)="closePreview()">x</button>
            <div class="modal-emoji">{{ sticker.emoji }}</div>
            <h3>{{ sticker.name }}</h3>
            <p>{{ sticker.rarity | titlecase }}</p>
            @if (offer(sticker); as currentOffer) {
              <p class="modal-meta">
                Cost: {{ currentOffer.cost }} {{ currentOffer.currency }} | Win chance: {{ percent(currentOffer.successRate) }}
              </p>
              <button class="confirm" [disabled]="!canAfford(sticker)" (click)="confirmRoll(sticker)">
                Roll for {{ sticker.name }}
              </button>
            }
          </article>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .store h2 { margin: 0; }
      .subtitle { margin-top: 0.3rem; color: #3e5c96; font-weight: 800; }

      .banner {
        margin-top: 0.6rem;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 0.5rem;
      }

      .banner div {
        background: #f1f8ff;
        border-radius: 10px;
        padding: 0.55rem;
        border: 1px solid #c8dbff;
        font-weight: 800;
      }

      .drop {
        margin-top: 0.9rem;
        border-radius: 14px;
        padding: 0.7rem;
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }

      .drop.success { border: 1px solid #ffcf40; background: linear-gradient(120deg, #fff9d9, #ffeaf8); }
      .drop.fail { border: 1px solid #d3dff5; background: #f7fbff; }

      .emoji { font-size: 2.2rem; }
      .pop { animation: pop 280ms ease-out; }

      @keyframes pop {
        0% { transform: scale(0.65); }
        100% { transform: scale(1); }
      }

      .sticker-grid {
        margin-top: 0.75rem;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
        gap: 0.55rem;
      }

      .sticker-card {
        border-radius: 12px;
        border: 2px solid #d5e2fb;
        padding: 0.55rem;
        text-align: center;
        background: #f7fbff;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }

      .sticker-emoji { font-size: 2.1rem; line-height: 1; }
      .name { margin-top: 0.1rem; font-size: 0.85rem; font-weight: 900; }
      .rarity { font-size: 0.76rem; font-weight: 800; }
      .owned { font-size: 0.76rem; color: #35548f; font-weight: 800; }

      .sticker-card button {
        margin-top: auto;
        border: 0;
        border-radius: 10px;
        padding: 0.5rem 0.4rem;
        font-weight: 900;
        cursor: pointer;
        background: linear-gradient(120deg, #ffbf2f, #ffeb65);
        color: #413000;
        font-size: 0.74rem;
      }

      .sticker-card button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .sticker-card.common { border-color: #bce5c8; background: #eaf9ef; }
      .sticker-card.rare { border-color: #bbcdfa; background: #eaf0ff; }
      .sticker-card.epic { border-color: #f6c69f; background: #fff0e3; }
      .sticker-card.legendary { border-color: #f3d46a; background: #fff8de; box-shadow: 0 0 0 2px rgba(255, 210, 61, 0.3); }
      .sticker-card.chroma {
        border-color: #d8b8ff;
        background: linear-gradient(120deg, #f9efff, #dffcff);
        box-shadow: 0 0 0 2px rgba(176, 122, 255, 0.25);
      }

      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(9, 22, 51, 0.55);
        display: grid;
        place-items: center;
        z-index: 30;
        padding: 1rem;
      }

      .modal-card {
        width: min(50vw, 580px);
        min-height: 42vh;
        border-radius: 20px;
        border: 3px solid #d7e3ff;
        background: #f7fbff;
        box-shadow: 0 26px 50px rgba(0, 0, 0, 0.25);
        display: grid;
        place-items: center;
        text-align: center;
        padding: 1.1rem;
        position: relative;
      }

      .modal-emoji {
        font-size: clamp(4rem, 11vw, 8rem);
        line-height: 1;
      }

      .modal-card h3 {
        margin: 0.3rem 0 0;
        font-size: 1.5rem;
      }

      .modal-card p {
        margin: 0.25rem 0 0;
        font-weight: 800;
      }

      .modal-meta {
        color: #2f4d86;
      }

      .close {
        position: absolute;
        top: 0.6rem;
        right: 0.6rem;
        width: 2rem;
        height: 2rem;
        border: 0;
        border-radius: 999px;
        font-weight: 900;
        background: #e6efff;
        color: #284682;
        cursor: pointer;
      }

      .confirm {
        margin-top: 0.65rem;
        border: 0;
        border-radius: 12px;
        padding: 0.68rem 1rem;
        font-size: 1rem;
        font-weight: 900;
        cursor: pointer;
        background: linear-gradient(120deg, #ffbf2f, #ffeb65);
        color: #413000;
      }

      .confirm:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .modal-card.common { border-color: #bce5c8; background: #eaf9ef; }
      .modal-card.rare { border-color: #bbcdfa; background: #eaf0ff; }
      .modal-card.epic { border-color: #f6c69f; background: #fff0e3; }
      .modal-card.legendary { border-color: #f3d46a; background: #fff8de; }
      .modal-card.chroma {
        border-color: #d8b8ff;
        background: linear-gradient(120deg, #f9efff, #dffcff);
      }

      @media (max-width: 900px) {
        .modal-card {
          width: min(92vw, 580px);
          min-height: 46vh;
        }
      }
    `
  ]
})
export class StorePageComponent {
  readonly game = inject(GameService);
  readonly lastResult = signal<ReturnType<GameService['buyStickerChance']>>(null);
  readonly inventory = computed(() => this.game.gameState()?.stickerInventory ?? {});
  readonly selectedSticker = signal<StickerAvatar | null>(null);

  openPreview(sticker: StickerAvatar): void {
    this.selectedSticker.set(sticker);
  }

  closePreview(): void {
    this.selectedSticker.set(null);
  }

  confirmRoll(sticker: StickerAvatar): void {
    this.lastResult.set(this.game.buyStickerChance(sticker.id));
    this.closePreview();
  }

  offer(sticker: StickerAvatar) {
    return this.game.getOfferForSticker(sticker);
  }

  canAfford(sticker: StickerAvatar): boolean {
    return this.game.canAffordOffer(this.offer(sticker));
  }

  percent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  ownedCount(sticker: StickerAvatar): number {
    return this.inventory()[sticker.id] ?? 0;
  }
}
