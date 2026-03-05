import { TitleCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { StickerAvatar } from '../models/game.models';
import { GameService } from '../services/game.service';

@Component({
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './collection-page.component.html',
  styleUrls: ['./collection-page.component.css']
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