import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { GameService } from './services/game.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="sparkles"></div>
    <div class="shell">
      <header class="header">
        <div>
          <h1>Rainblet</h1>
          <p>Fast quiz rounds. Big shiny rewards.</p>
        </div>
        <div class="wallet">Coins: {{ coins() }}</div>
      </header>

      <nav>
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
        <a routerLink="/play" routerLinkActive="active">Play</a>
        <a routerLink="/results" routerLinkActive="active">Results</a>
        <a routerLink="/store" routerLinkActive="active">Store</a>
        <a routerLink="/collection" routerLinkActive="active">Collection</a>
      </nav>

      <main>
        <router-outlet />
      </main>

      <footer>
        <span>Player: {{ playerName() }}</span>
        <span>Stickers: {{ ownedStickers() }}</span>
      </footer>
    </div>
  `,
  styles: [
    `
      .shell {
        max-width: 960px;
        margin: 0 auto;
        padding: 1.2rem;
        position: relative;
        z-index: 1;
      }

      .sparkles {
        position: fixed;
        inset: 0;
        pointer-events: none;
        background-image:
          radial-gradient(circle at 20% 15%, rgba(255, 255, 255, 0.55) 0 5px, transparent 6px),
          radial-gradient(circle at 85% 30%, rgba(255, 255, 255, 0.45) 0 4px, transparent 5px),
          radial-gradient(circle at 45% 75%, rgba(255, 255, 255, 0.45) 0 3px, transparent 4px);
        animation: drift 7s linear infinite;
      }

      @keyframes drift {
        0% {
          transform: translateY(0);
        }
        100% {
          transform: translateY(-12px);
        }
      }

      .header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
        background: linear-gradient(140deg, #1c4cf6, #1ca0ff 50%, #34dc7c);
        color: #fff;
        border-radius: 20px;
        padding: 1rem 1.2rem;
        box-shadow: 0 14px 32px rgba(8, 28, 96, 0.35);
      }

      h1 {
        margin: 0;
        font-size: 2rem;
        letter-spacing: 0.02em;
      }

      .header p {
        margin: 0.2rem 0 0;
        font-weight: 700;
      }

      .wallet {
        background: #fff;
        color: #0e44a3;
        font-weight: 900;
        font-size: 1.1rem;
        border-radius: 999px;
        padding: 0.45rem 0.9rem;
      }

      nav {
        margin-top: 0.9rem;
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      a {
        text-decoration: none;
        background: #fff;
        color: #12479e;
        border-radius: 999px;
        padding: 0.4rem 0.85rem;
        font-weight: 800;
        box-shadow: 0 6px 14px rgba(16, 44, 117, 0.18);
      }

      a.active {
        background: #ffe463;
        color: #3d2d00;
      }

      main {
        margin-top: 1rem;
      }

      footer {
        margin-top: 1rem;
        color: #173f82;
        display: flex;
        justify-content: space-between;
        font-weight: 900;
      }

      @media (max-width: 700px) {
        .header {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `
  ]
})
export class AppComponent {
  private readonly game = inject(GameService);

  readonly playerName = computed(() => this.game.gameState()?.playerName || 'Guest');
  readonly coins = this.game.walletCoins;
  readonly ownedStickers = this.game.ownedStickerCount;
}
