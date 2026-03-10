import { TitleCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RARITY_DISPLAY_ORDER, Rarity, StickerAvatar } from '../models/game.models';
import { GameService } from '../services/game.service';

interface StickerRarityGroup {
  rarity: Rarity;
  stickers: StickerAvatar[];
}

@Component({
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './stickers-page.component.html',
  styleUrls: ['./stickers-page.component.css']
})
export class StickersPageComponent {
  readonly game = inject(GameService);

  readonly inventory = computed(() => this.game.stickerInventory());
  readonly selectedSticker = signal<StickerAvatar | null>(null);
  readonly isSellingSticker = signal(false);

  readonly groupedCollectionStickers = computed<StickerRarityGroup[]>(() => {
    const grouped = new Map<Rarity, StickerAvatar[]>();
    for (const rarity of RARITY_DISPLAY_ORDER) {
      grouped.set(rarity, []);
    }

    for (const sticker of this.game.allStickers()) {
      const existing = grouped.get(sticker.rarity);
      if (existing) {
        existing.push(sticker);
      }
    }

    return RARITY_DISPLAY_ORDER
      .map((rarity) => ({
        rarity,
        stickers: (grouped.get(rarity) ?? []).sort((a, b) => a.name.localeCompare(b.name))
      }))
      .filter((group) => group.stickers.length > 0);
  });

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
    if (this.isSellingSticker()) {
      return;
    }

    this.isSellingSticker.set(true);

    setTimeout(() => {
      this.game.sellSticker(sticker.id).subscribe({
        next: () => {
          if (this.stickerCount(sticker.id) <= 0) {
            this.closeSticker();
          }
        },
        complete: () => this.isSellingSticker.set(false),
        error: () => this.isSellingSticker.set(false)
      });
    }, 620);
  }

  closeSticker(): void {
    this.selectedSticker.set(null);
  }
}
