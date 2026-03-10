import { TitleCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RARITY_DISPLAY_ORDER, Rarity, StickerAvatar, StickerRollResult } from '../models/game.models';
import { GameService } from '../services/game.service';

@Component({
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './store-page.component.html',
  styleUrls: ['./store-page.component.css']
})
export class StorePageComponent {
  readonly game = inject(GameService);
  readonly lastResult = signal<StickerRollResult | null>(null);
  readonly lastSale = signal<{ salePrice: number; remainingCount: number; remainingCoins: number } | null>(null);
  readonly sellingStickerId = signal<string | null>(null);
  readonly inventory = computed(() => this.game.stickerInventory());
  readonly rarityOrder = RARITY_DISPLAY_ORDER;
  readonly selectedPack = signal<Rarity | null>(null);
  readonly focusedPack = signal<Rarity | null>(null);
  readonly focusedStickerId = signal<string | null>(null);

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

  openPackConfirm(rarity: Rarity): void {
    if (!this.canBuyPack(rarity)) {
      return;
    }
    this.selectedPack.set(rarity);
  }

  closePackConfirm(): void {
    this.selectedPack.set(null);
  }

  confirmPackPurchase(): void {
    const rarity = this.selectedPack();
    if (!rarity) {
      return;
    }

    this.game.buyStickerPack(rarity).subscribe((result) => {
      this.lastResult.set(result);
      this.lastSale.set(null);
      this.focusedPack.set(rarity);
      this.closePackConfirm();
    });
  }

  packCost(rarity: Rarity): number {
    return this.game.getPackOffer(rarity).cost;
  }

  packCurrency(rarity: Rarity): string {
    return this.game.getPackOffer(rarity).currency === 'coins' ? 'coins' : 'points';
  }

  canBuyPack(rarity: Rarity): boolean {
    return this.game.canAffordPack(rarity);
  }

  focusPack(rarity: Rarity): void {
    this.focusedPack.set(rarity);
  }

  clearFocusedPack(): void {
    this.focusedPack.set(null);
  }

  packGlyph(rarity: Rarity): string {
    switch (rarity) {
      case 'common':
        return '◈';
      case 'rare':
        return '✦';
      case 'epic':
        return '✺';
      case 'legendary':
        return '⬢';
      case 'chroma':
        return '⬡';
      default:
        return '◉';
    }
  }

  salePrice(sticker: StickerAvatar): number {
    return this.game.getStickerSalePrice(sticker);
  }

  sellSticker(sticker: StickerAvatar): void {
    if (this.sellingStickerId()) {
      return;
    }

    this.sellingStickerId.set(sticker.id);

    setTimeout(() => {
      this.game.sellSticker(sticker.id).subscribe({
        next: (sale) => {
          this.lastSale.set(sale);
          this.lastResult.set(null);
          if (this.ownedCount(sticker) <= 1) {
            this.focusedStickerId.set(null);
          }
        },
        complete: () => this.sellingStickerId.set(null),
        error: () => this.sellingStickerId.set(null)
      });
    }, 620);
  }

  ownedCount(sticker: StickerAvatar): number {
    return this.inventory()[sticker.id] ?? 0;
  }

  focusSticker(sticker: StickerAvatar): void {
    this.focusedStickerId.set(sticker.id);
  }

  clearFocusedSticker(): void {
    this.focusedStickerId.set(null);
  }

  isStickerFocused(sticker: StickerAvatar): boolean {
    return this.focusedStickerId() === sticker.id;
  }

  focusedSticker(): StickerAvatar | null {
    const stickerId = this.focusedStickerId();
    if (!stickerId) {
      return null;
    }

    return this.sortedStoreStickers().find((sticker) => sticker.id === stickerId) ?? null;
  }
}

