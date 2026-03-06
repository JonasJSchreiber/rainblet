import { TitleCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Collectible, RARITY_DISPLAY_ORDER, StickerAvatar } from '../models/game.models';
import { GameService } from '../services/game.service';

@Component({
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './collection-page.component.html',
  styleUrls: ['./collection-page.component.css']
})
export class CollectionPageComponent {
  readonly game = inject(GameService);

  readonly inventory = computed(() => this.game.stickerInventory());
  readonly selectedSticker = signal<StickerAvatar | null>(null);
  readonly sortedCollectionStickers = computed(() => {
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

  readonly sortedCollectibles = computed(() => {
    const rarityRank = new Map(RARITY_DISPLAY_ORDER.map((rarity, index) => [rarity, index]));

    return [...this.game.allCollectibles()].sort((a, b) => {
      const rankA = rarityRank.get(a.rarity) ?? Number.MAX_SAFE_INTEGER;
      const rankB = rarityRank.get(b.rarity) ?? Number.MAX_SAFE_INTEGER;

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return a.name.localeCompare(b.name);
    });
  });

  isUnlocked(id: string): boolean {
    return this.game.unlockedCollectibles().some((collectible: Collectible) => collectible.id === id);
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

  salePrice(sticker: StickerAvatar): number {
    return this.game.getStickerSalePrice(sticker);
  }

  sellSticker(sticker: StickerAvatar): void {
    this.game.sellSticker(sticker.id).subscribe(() => {
      if (this.stickerCount(sticker.id) <= 0) {
        this.closeSticker();
      }
    });
  }

  closeSticker(): void {
    this.selectedSticker.set(null);
  }
}
