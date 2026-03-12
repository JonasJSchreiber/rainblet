import { TitleCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RARITY_DISPLAY_ORDER, Rarity, StickerRollResult } from '../models/game.models';
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
  readonly rarityOrder = RARITY_DISPLAY_ORDER;
  readonly selectedPack = signal<Rarity | null>(null);
  readonly focusedPack = signal<Rarity | null>(null);

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

}

