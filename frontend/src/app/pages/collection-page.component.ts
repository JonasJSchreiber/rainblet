import { TitleCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { StickerAvatar } from '../models/game.models';
import { GameService } from '../services/game.service';

@Component({
  standalone: true,
  imports: [TitleCasePipe],
  template: `
    <section class="card collection">
      <h2>Collection</h2>
      <p class="subtitle">Achievement collectibles + avatar sticker inventory.</p>

      <h3>Achievements</h3>
      <div class="grid">
        @for (collectible of game.allCollectibles; track collectible.id) {
          <article [class.locked]="!isUnlocked(collectible.id)">
            <header>
              <strong>{{ collectible.name }}</strong>
              <span [class]="collectible.rarity">{{ collectible.rarity }}</span>
            </header>
            <p>{{ collectible.description }}</p>
            <small>{{ collectible.unlockRule }}</small>
          </article>
        }
      </div>

      <h3>Avatar Stickers</h3>
      <div class="grid stickers">
        @for (sticker of game.allStickers; track sticker.id) {
          <article
            [class.locked]="stickerCount(sticker.id) === 0"
            [class.clickable]="stickerCount(sticker.id) > 0"
            (click)="openSticker(sticker)">
            <header>
              <strong>{{ sticker.emoji }} {{ sticker.name }}</strong>
              <span [class]="sticker.rarity">{{ sticker.rarity }}</span>
            </header>
            <p>Owned: {{ stickerCount(sticker.id) }}</p>
            @if (stickerCount(sticker.id) > 0) {
              <small class="view-hint">Tap to view</small>
            }
          </article>
        }
      </div>

      @if (selectedSticker(); as sticker) {
        <div class="modal-backdrop" (click)="closeSticker()">
          <article class="modal-card" [class]="'modal-card ' + sticker.rarity" (click)="$event.stopPropagation()">
            <button class="close" (click)="closeSticker()">x</button>
            <div class="modal-emoji">{{ sticker.emoji }}</div>
            <h3>{{ sticker.name }}</h3>
            <p>{{ sticker.rarity | titlecase }}</p>
            <p class="owned-count">Owned: {{ stickerCount(sticker.id) }}</p>
          </article>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .collection h2,
      .collection h3 {
        margin: 0;
      }

      .subtitle {
        margin: 0.3rem 0 0.7rem;
        color: #43609d;
        font-weight: 700;
      }

      .collection h3 {
        margin-top: 0.8rem;
      }

      .grid {
        margin-top: 0.5rem;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 0.65rem;
      }

      article {
        border: 1px solid #d7e4ff;
        border-radius: 12px;
        padding: 0.65rem;
        background: #f9fbff;
      }

      article.locked {
        opacity: 0.45;
        filter: grayscale(0.7);
      }

      article.clickable {
        cursor: pointer;
      }

      article.clickable:hover {
        transform: translateY(-2px);
      }

      header {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
      }

      span {
        text-transform: uppercase;
        font-size: 0.68rem;
        padding: 0.2rem 0.4rem;
        border-radius: 999px;
        font-weight: 900;
      }

      .common {
        background: #e8f6ed;
        color: #2c7645;
      }

      .rare {
        background: #e4edff;
        color: #3158a6;
      }

      .epic {
        background: #ffe8d6;
        color: #a45521;
      }

      .legendary {
        background: #fff2be;
        color: #7f5600;
      }

      .chroma {
        background: #f1e6ff;
        color: #6e2bb5;
      }

      p {
        margin: 0.45rem 0;
      }

      .view-hint {
        font-weight: 800;
        color: #3158a6;
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

      .owned-count {
        color: #3158a6;
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
export class CollectionPageComponent {
  readonly game = inject(GameService);

  readonly inventory = computed(() => this.game.gameState()?.stickerInventory ?? {});
  readonly selectedSticker = signal<StickerAvatar | null>(null);

  isUnlocked(id: string): boolean {
    return this.game.unlockedCollectibles().some((collectible) => collectible.id === id);
  }

  stickerCount(id: string): number {
    return this.inventory()[id] ?? 0;
  }

  openSticker(sticker: StickerAvatar): void {
    if (this.stickerCount(sticker.id) <= 0) {
      return;
    }
    this.selectedSticker.set(sticker);
  }

  closeSticker(): void {
    this.selectedSticker.set(null);
  }
}
