import { TitleCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RARITY_DISPLAY_ORDER, StickerAvatar } from '../models/game.models';
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
  readonly lastSale = signal<ReturnType<GameService['sellSticker']>>(null);
  readonly inventory = computed(() => this.game.gameState()?.stickerInventory ?? {});
  readonly selectedSticker = signal<StickerAvatar | null>(null);

  readonly sortedStoreStickers = computed(() => {
    const rarityRank = new Map(RARITY_DISPLAY_ORDER.map((rarity, index) => [rarity, index]));

    return [...this.game.allStickers()].sort((a, b) => {
      const rankA = rarityRank.get(a.rarity) ?? Number.MAX_SAFE_INTEGER;
      const rankB = rarityRank.get(b.rarity) ?? Number.MAX_SAFE_INTEGER;

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return a.name.localeCompare(b.name);
    });
  });

  openPreview(sticker: StickerAvatar): void {
    this.selectedSticker.set(sticker);
  }

  closePreview(): void {
    this.selectedSticker.set(null);
  }

  confirmRoll(sticker: StickerAvatar): void {
    this.lastResult.set(this.game.buyStickerChance(sticker.id));
    this.lastSale.set(null);
    this.closePreview();
  }

  salePrice(sticker: StickerAvatar): number {
    return this.game.getStickerSalePrice(sticker);
  }

  sellSticker(sticker: StickerAvatar): void {
    this.lastSale.set(this.game.sellSticker(sticker.id));
    this.lastResult.set(null);
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
