import { TitleCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { StickerAvatar } from '../models/game.models';
import { GameService } from '../services/game.service';

@Component({
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './store-page.component.html',
  styleUrls: ['./store-page.component.css']
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