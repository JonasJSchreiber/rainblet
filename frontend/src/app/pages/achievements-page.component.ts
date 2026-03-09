import { Component, computed, inject } from '@angular/core';
import { Collectible, RARITY_DISPLAY_ORDER } from '../models/game.models';
import { GameService } from '../services/game.service';

@Component({
  standalone: true,
  templateUrl: './achievements-page.component.html',
  styleUrls: ['./achievements-page.component.css']
})
export class AchievementsPageComponent {
  readonly game = inject(GameService);

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
}
