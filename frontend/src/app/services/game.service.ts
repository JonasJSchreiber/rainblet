import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';
import {
  AnswerRecord,
  Collectible,
  GameSessionState,
  OfferCurrency,
  Question,
  Rarity,
  StickerAvatar,
  StickerRollOffer,
  StickerRollResult
} from '../models/game.models';

const STORAGE_KEY = 'rainblet.session.v2';
const LEGACY_STORAGE_KEY = 'rainblet.session.v1';
const POINTS_PER_CORRECT = 10;
const COINS_PER_CORRECT = 7;
const DEFAULT_ROUND_SIZE = 8;

const RARITY_RULES: Record<Rarity, { cost: number; currency: OfferCurrency; successRate: number }> = {
  common: { cost: 1, currency: 'coins', successRate: 0.2 },
  rare: { cost: 3, currency: 'coins', successRate: 0.12 },
  epic: { cost: 6, currency: 'coins', successRate: 0.05 },
  legendary: { cost: 10, currency: 'score', successRate: 0.02 },
  chroma: { cost: 14, currency: 'score', successRate: 0.01 }
};
const PACK_RULES: Record<Rarity, { cost: number; currency: OfferCurrency }> = {
  common: { cost: 5, currency: 'coins' },
  rare: { cost: 10, currency: 'coins' },
  epic: { cost: 15, currency: 'coins' },
  legendary: { cost: 30, currency: 'coins' },
  chroma: { cost: 50, currency: 'coins' }
};
interface UserCollectiblesResponse {
  collectibleIds: string[];
}

interface UserWalletResponse {
  userId: number;
  coins: number;
  points: number;
}

interface UserStickersResponse {
  stickerInventory: Record<string, number>;
}

interface UserStickerRollResponse {
  affordable: boolean;
  success: boolean;
  isNew: boolean;
  ownedCount: number;
  remainingCoins: number;
  remainingPoints: number;
  stickerId: string | null;
}

interface UserStickerSellResponse {
  sold: boolean;
  remainingCount: number;
  salePrice: number;
  remainingCoins: number;
  remainingPoints: number;
}

interface QuestionValidationResponse {
  isCorrect: boolean;
  correctIndex: number;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);

  private readonly state = signal<GameSessionState | null>(this.loadState());
  private readonly questionBankState = signal<Question[]>([]);
  private readonly collectiblesState = signal<Collectible[]>([]);
  private readonly stickersState = signal<StickerAvatar[]>([]);
  private readonly persistedUnlockedCollectibleIds = signal<string[]>([]);
  private readonly persistedWallet = signal<{ coins: number; points: number }>({ coins: 0, points: 0 });
  private readonly persistedStickerInventory = signal<Record<string, number>>({});

  readonly gameState = computed(() => this.state());
  readonly hasActiveGame = computed(() => {
    const session = this.state();
    return !!session && session.completedAt === null;
  });
  readonly isRoundComplete = computed(() => this.state()?.completedAt !== null);
  readonly allCollectibles = computed(() => this.collectiblesState());
  readonly allStickers = computed(() => this.stickersState());
  readonly hasReferenceData = computed(
    () => this.questionBankState().length > 0 && this.collectiblesState().length > 0 && this.stickersState().length > 0
  );

  readonly currentQuestion = computed<Question | null>(() => {
    const session = this.state();
    if (!session || session.completedAt !== null) {
      return null;
    }

    const questionId = session.questionIds[session.currentQuestion];
    return this.questionBankState().find((question) => question.id === questionId) ?? null;
  });

  readonly unlockedCollectibles = computed<Collectible[]>(() => {
    const unlockedIds = new Set(
      this.toSortedUniqueIds([...(this.state()?.unlockedCollectibleIds ?? []), ...this.persistedUnlockedCollectibleIds()])
    );
    return this.collectiblesState().filter((collectible) => unlockedIds.has(collectible.id));
  });

  readonly walletCoins = computed(() => this.state()?.coins ?? this.persistedWallet().coins);
  readonly walletPoints = computed(() => this.state()?.score ?? this.persistedWallet().points);
  readonly stickerInventory = computed(() => this.state()?.stickerInventory ?? this.persistedStickerInventory());

  readonly progressText = computed(() => {
    const session = this.state();
    if (!session) {
      return '0 / 0';
    }
    const current = Math.min(session.currentQuestion + 1, session.roundSize);
    return `${current} / ${session.roundSize}`;
  });

  readonly ownedStickerCount = computed(() => {
    const inventory = this.stickerInventory();
    return Object.keys(inventory).length;
  });

  readonly totalStickerCopies = computed(() => {
    const inventory = this.stickerInventory();
    return Object.values(inventory).reduce((sum, value) => sum + value, 0);
  });

  constructor() {
    this.refreshReferenceData();
  }

  refreshReferenceData(): void {
    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      this.questionBankState.set([]);
      this.collectiblesState.set([]);
      this.stickersState.set([]);
      this.persistedUnlockedCollectibleIds.set([]);
      this.persistedWallet.set({ coins: 0, points: 0 });
      this.persistedStickerInventory.set({});
      return;
    }

    const apiBase = this.appConfig.apiBaseUrl;

    this.http.get<Question[]>(`${apiBase}/api/questions`).subscribe({
      next: (questions) => this.questionBankState.set(questions ?? []),
      error: () => this.questionBankState.set([])
    });

    this.http.get<Collectible[]>(`${apiBase}/api/collectibles`).subscribe({
      next: (collectibles) => this.collectiblesState.set(collectibles ?? []),
      error: () => this.collectiblesState.set([])
    });

    this.http.get<StickerAvatar[]>(`${apiBase}/api/stickers`).subscribe({
      next: (stickers) => this.stickersState.set(stickers ?? []),
      error: () => this.stickersState.set([])
    });

    this.http.get<UserCollectiblesResponse>(`${apiBase}/api/users/me/collectibles`).subscribe({
      next: (response) => this.applyPersistedCollectibleIds(response?.collectibleIds ?? []),
      error: () => this.persistedUnlockedCollectibleIds.set([])
    });

    this.http.get<UserWalletResponse>(`${apiBase}/api/users/me/wallet`).subscribe({
      next: (response) => this.applyPersistedWallet(response),
      error: () => this.persistedWallet.set({ coins: 0, points: 0 })
    });

    this.http.get<UserStickersResponse>(`${apiBase}/api/users/me/stickers`).subscribe({
      next: (response) => this.applyPersistedStickerInventory(response?.stickerInventory ?? {}),
      error: () => this.persistedStickerInventory.set({})
    });
  }

  startGame(playerName: string, roundSize = DEFAULT_ROUND_SIZE): void {
    const questionBank = this.questionBankState();
    if (!questionBank.length) {
      return;
    }

    const safeName = playerName.trim() || this.state()?.playerName || 'Player';
    const selectedQuestions = this.shuffle([...questionBank])
      .slice(0, Math.min(roundSize, questionBank.length))
      .map((question) => question.id);

    const profile = this.currentProfile();

    const nextState: GameSessionState = {
      playerName: safeName,
      roundSize: selectedQuestions.length,
      questionIds: selectedQuestions,
      currentQuestion: 0,
      score: profile.points,
      streak: 0,
      bestStreak: 0,
      answers: [],
      unlockedCollectibleIds: profile.unlockedCollectibleIds,
      stickerInventory: profile.stickerInventory,
      coins: profile.coins,
      sessionsPlayed: profile.sessionsPlayed,
      startedAt: new Date().toISOString(),
      completedAt: null
    };

    this.state.set(nextState);
    this.persistState();
  }

  submitAnswer(selectedIndex: number): Observable<{ isCorrect: boolean; correctIndex: number; coinsAwarded: number } | null> {
    const session = this.state();
    const question = this.currentQuestion();

    if (!session || !question || session.completedAt !== null) {
      throw new Error('No active question to answer.');
    }

    if (selectedIndex < 0 || selectedIndex >= question.options.length) {
      throw new Error('Selected answer is out of bounds.');
    }

    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      return of(null);
    }

    const apiBase = this.appConfig.apiBaseUrl;
    return this.http
      .post<QuestionValidationResponse>(`${apiBase}/api/questions/${question.id}/validate`, {
        selectedIndex
      })
      .pipe(
        map((validation) => {
          const isCorrect = !!validation?.isCorrect;
          const correctIndex = Number(validation?.correctIndex ?? -1);
          const coinsAwarded = isCorrect ? COINS_PER_CORRECT : 0;

          const updatedAnswers: AnswerRecord[] = [
            ...session.answers,
            {
              questionId: question.id,
              selectedIndex,
              isCorrect
            }
          ];

          const nextStreak = isCorrect ? session.streak + 1 : 0;
          const nextScore = isCorrect ? session.score + POINTS_PER_CORRECT : session.score;
          const nextCoins = session.coins + coinsAwarded;

          const isLastQuestion = session.currentQuestion >= session.roundSize - 1;
          const completedAt = isLastQuestion ? new Date().toISOString() : null;

          const nextState: GameSessionState = {
            ...session,
            answers: updatedAnswers,
            streak: nextStreak,
            bestStreak: Math.max(session.bestStreak, nextStreak),
            score: nextScore,
            coins: nextCoins,
            currentQuestion: session.currentQuestion,
            completedAt,
            sessionsPlayed: isLastQuestion ? session.sessionsPlayed + 1 : session.sessionsPlayed
          };

          const unlockedState = this.applyCollectibleUnlocks(nextState);
          const mergedUnlockedIds = this.toSortedUniqueIds([
            ...unlockedState.unlockedCollectibleIds,
            ...this.persistedUnlockedCollectibleIds()
          ]);

          const finalState: GameSessionState = {
            ...unlockedState,
            unlockedCollectibleIds: mergedUnlockedIds
          };

          this.state.set(finalState);
          this.persistState();

          if (!this.sameIds(mergedUnlockedIds, this.persistedUnlockedCollectibleIds())) {
            this.persistedUnlockedCollectibleIds.set(mergedUnlockedIds);
            this.persistUnlockedCollectiblesToServer(mergedUnlockedIds);
          }

          this.persistWalletToServer(finalState.coins, finalState.score);

          return { isCorrect, correctIndex, coinsAwarded };
        }),
        catchError(() => of(null))
      );
  }

  advanceQuestion(): void {
    const session = this.state();
    if (!session || session.completedAt !== null) {
      return;
    }

    if (session.currentQuestion >= session.roundSize - 1) {
      return;
    }

    this.state.set({
      ...session,
      currentQuestion: session.currentQuestion + 1
    });
    this.persistState();
  }

  buyStickerChance(stickerId: string): Observable<StickerRollResult | null> {
    const session = this.ensureProfileSession();
    const sticker = this.stickersState().find((entry) => entry.id === stickerId);
    if (!sticker) {
      return of(null);
    }

    const offer = this.getOfferForSticker(sticker);
    if (!this.canAffordOffer(offer)) {
      return of(null);
    }

    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      return of(this.buyStickerChanceLocal(session, sticker, offer));
    }

    const apiBase = this.appConfig.apiBaseUrl;
    return this.http.post<UserStickerRollResponse>(`${apiBase}/api/users/me/stickers/roll`, { stickerId: sticker.id }).pipe(
      map((response) => {
        if (!response?.affordable) {
          return {
            offer,
            success: false,
            sticker,
            isNew: false,
            remainingCoins: session.coins,
            remainingScore: session.score
          };
        }

        const currentCount = session.stickerInventory[sticker.id] ?? 0;
        const nextCount = response.success ? Math.max(0, response.ownedCount) : currentCount;
        this.updateSessionWalletAndInventory(response.remainingCoins, response.remainingPoints, sticker.id, nextCount);

        return {
          offer,
          success: !!response.success,
          sticker,
          isNew: !!response.isNew,
          remainingCoins: response.remainingCoins,
          remainingScore: response.remainingPoints
        };
      }),
      catchError(() => of(null))
    );
  }

  buyStickerPack(rarity: Rarity): Observable<StickerRollResult | null> {
    const session = this.ensureProfileSession();
    const stickersForRarity = this.stickersState().filter((entry) => entry.rarity === rarity);
    if (!stickersForRarity.length) {
      return of(null);
    }

    const offer = this.getPackOffer(rarity);
    if (!this.canAffordOffer(offer)) {
      return of(null);
    }

    const selectedSticker = stickersForRarity[Math.floor(Math.random() * stickersForRarity.length)];

    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      const localOffer = { ...offer, stickerId: selectedSticker.id };
      return of(this.buyStickerChanceLocal(session, selectedSticker, localOffer));
    }

    const apiBase = this.appConfig.apiBaseUrl;
    return this.http.post<UserStickerRollResponse>(`${apiBase}/api/users/me/stickers/roll`, { rarity }).pipe(
      map((response) => {
        if (!response?.affordable) {
          return null;
        }

        const awardedStickerId = response.stickerId ?? selectedSticker.id;
        const awardedSticker = this.stickersState().find((entry) => entry.id === awardedStickerId) ?? selectedSticker;
        const currentCount = session.stickerInventory[awardedSticker.id] ?? 0;
        const nextCount = response.success ? Math.max(0, response.ownedCount) : currentCount;

        if (response.success) {
          this.updateSessionWalletAndInventory(response.remainingCoins, response.remainingPoints, awardedSticker.id, nextCount);
        }

        return {
          offer,
          success: !!response.success,
          sticker: awardedSticker,
          isNew: !!response.isNew,
          remainingCoins: response.remainingCoins,
          remainingScore: response.remainingPoints
        };
      }),
      catchError(() => of(null))
    );
  }

  getPackOffer(rarity: Rarity): StickerRollOffer {
    const packRule = PACK_RULES[rarity];
    const rarityCount = Math.max(1, this.stickersState().filter((entry) => entry.rarity === rarity).length);

    return {
      id: `pack-${rarity}`,
      stickerId: `pack-${rarity}`,
      rarity,
      cost: packRule.cost,
      currency: packRule.currency,
      successRate: 1 / rarityCount
    };
  }

  canAffordPack(rarity: Rarity): boolean {
    return this.canAffordOffer(this.getPackOffer(rarity));
  }
  canAffordOffer(offer: StickerRollOffer): boolean {
    const session = this.state();
    const coins = session?.coins ?? this.persistedWallet().coins;
    const points = session?.score ?? this.persistedWallet().points;

    return offer.currency === 'coins' ? coins >= offer.cost : points >= offer.cost;
  }

  getOfferForSticker(sticker: StickerAvatar): StickerRollOffer {
    const rule = RARITY_RULES[sticker.rarity];
    return {
      id: `offer-${sticker.id}`,
      stickerId: sticker.id,
      rarity: sticker.rarity,
      cost: rule.cost,
      currency: rule.currency,
      successRate: rule.successRate
    };
  }

  getStickerSalePrice(sticker: StickerAvatar): number {
    return this.calculateSalePrice(this.getOfferForSticker(sticker));
  }

  sellSticker(stickerId: string): Observable<{ salePrice: number; remainingCount: number; remainingCoins: number } | null> {
    const session = this.ensureProfileSession();
    const sticker = this.stickersState().find((entry) => entry.id === stickerId);
    if (!sticker) {
      return of(null);
    }

    const currentCount = session.stickerInventory[stickerId] ?? 0;
    if (currentCount <= 0) {
      return of(null);
    }

    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      return of(this.sellStickerLocal(session, sticker.id, this.getStickerSalePrice(sticker)));
    }

    const apiBase = this.appConfig.apiBaseUrl;
    return this.http.post<UserStickerSellResponse>(`${apiBase}/api/users/me/stickers/sell`, { stickerId: sticker.id }).pipe(
      map((response) => {
        if (!response?.sold) {
          return null;
        }

        const nextCount = Math.max(0, response.remainingCount ?? 0);
        this.updateSessionWalletAndInventory(response.remainingCoins, response.remainingPoints, sticker.id, nextCount);

        return {
          salePrice: response.salePrice,
          remainingCount: nextCount,
          remainingCoins: response.remainingCoins
        };
      }),
      catchError(() => of(null))
    );
  }

  resetProgress(): void {
    this.state.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  private buyStickerChanceLocal(
    session: GameSessionState,
    sticker: StickerAvatar,
    offer: StickerRollOffer
  ): StickerRollResult | null {
    const baseState: GameSessionState = {
      ...session,
      coins: offer.currency === 'coins' ? session.coins - offer.cost : session.coins,
      score: offer.currency === 'score' ? Math.max(0, session.score - offer.cost) : session.score
    };

    const success = Math.random() < offer.successRate;
    if (!success) {
      this.state.set(baseState);
      this.persistState();
      this.persistWalletToServer(baseState.coins, baseState.score);
      return {
        offer,
        success: false,
        sticker,
        isNew: false,
        remainingCoins: baseState.coins,
        remainingScore: baseState.score
      };
    }

    const currentCount = baseState.stickerInventory[offer.stickerId] ?? 0;
    const isNew = currentCount === 0;

    const nextState: GameSessionState = {
      ...baseState,
      stickerInventory: {
        ...baseState.stickerInventory,
        [offer.stickerId]: currentCount + 1
      }
    };

    this.state.set(nextState);
    this.persistState();
    this.persistWalletToServer(nextState.coins, nextState.score);

    return {
      offer,
      success: true,
      sticker,
      isNew,
      remainingCoins: nextState.coins,
      remainingScore: nextState.score
    };
  }

  private sellStickerLocal(
    session: GameSessionState,
    stickerId: string,
    salePrice: number
  ): { salePrice: number; remainingCount: number; remainingCoins: number } | null {
    const currentCount = session.stickerInventory[stickerId] ?? 0;
    if (currentCount <= 0) {
      return null;
    }

    const nextCount = currentCount - 1;
    const nextInventory = { ...session.stickerInventory };

    if (nextCount <= 0) {
      delete nextInventory[stickerId];
    } else {
      nextInventory[stickerId] = nextCount;
    }

    const nextState: GameSessionState = {
      ...session,
      coins: session.coins + salePrice,
      stickerInventory: nextInventory
    };

    this.state.set(nextState);
    this.persistState();
    this.persistWalletToServer(nextState.coins, nextState.score);

    return {
      salePrice,
      remainingCount: nextCount,
      remainingCoins: nextState.coins
    };
  }

  private updateSessionWalletAndInventory(
    coins: number,
    points: number,
    stickerId: string,
    stickerCount: number
  ): void {
    const normalizedCoins = Math.max(0, coins);
    const normalizedPoints = Math.max(0, points);

    const session = this.ensureProfileSession();
    const nextInventory = { ...session.stickerInventory };

    if (stickerCount <= 0) {
      delete nextInventory[stickerId];
    } else {
      nextInventory[stickerId] = stickerCount;
    }

    this.persistedStickerInventory.set(nextInventory);
    this.persistedWallet.set({ coins: normalizedCoins, points: normalizedPoints });

    this.state.set({
      ...session,
      stickerInventory: nextInventory,
      coins: normalizedCoins,
      score: normalizedPoints
    });
    this.persistState();
  }

  private ensureProfileSession(): GameSessionState {
    const existing = this.state();
    if (existing) {
      return existing;
    }

    const profile = this.currentProfile();
    const fallbackState: GameSessionState = {
      playerName: 'Learner',
      roundSize: 0,
      questionIds: [],
      currentQuestion: 0,
      score: profile.points,
      streak: 0,
      bestStreak: 0,
      answers: [],
      unlockedCollectibleIds: profile.unlockedCollectibleIds,
      stickerInventory: profile.stickerInventory,
      coins: profile.coins,
      sessionsPlayed: profile.sessionsPlayed,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    this.state.set(fallbackState);
    this.persistState();
    return fallbackState;
  }

  private currentProfile(): {
    unlockedCollectibleIds: string[];
    stickerInventory: Record<string, number>;
    coins: number;
    points: number;
    sessionsPlayed: number;
  } {
    const session = this.state();
    const unlockedCollectibleIds = this.toSortedUniqueIds([
      ...(session?.unlockedCollectibleIds ?? []),
      ...this.persistedUnlockedCollectibleIds()
    ]);

    if (!session) {
      return {
        unlockedCollectibleIds,
        stickerInventory: this.persistedStickerInventory(),
        coins: this.persistedWallet().coins,
        points: this.persistedWallet().points,
        sessionsPlayed: 0
      };
    }

    return {
      unlockedCollectibleIds,
      stickerInventory: session.stickerInventory,
      coins: session.coins,
      points: session.score,
      sessionsPlayed: session.sessionsPlayed
    };
  }

  private applyCollectibleUnlocks(session: GameSessionState): GameSessionState {
    const unlocked = new Set(session.unlockedCollectibleIds);

    const correctCount = session.answers.filter((answer) => answer.isCorrect).length;
    const wrongCount = session.answers.length - correctCount;
    const perfectRun = session.answers.length === session.roundSize && correctCount === session.roundSize;
    const ownedStickerKinds = Object.keys(session.stickerInventory).length;
    const totalStickerCopies = Object.values(session.stickerInventory).reduce((sum, value) => sum + value, 0);

    if (correctCount >= 1) {
      unlocked.add('spark-seed');
    }
    if (correctCount >= 3 && wrongCount >= 1) {
      unlocked.add('bounce-back');
    }
    if (session.bestStreak >= 3) {
      unlocked.add('streak-3');
    }
    if (session.bestStreak >= 5) {
      unlocked.add('streak-5');
    }
    if (session.bestStreak >= 8) {
      unlocked.add('streak-8');
    }
    if (session.score >= 40) {
      unlocked.add('score-40');
    }
    if (session.score >= 60) {
      unlocked.add('score-60');
    }
    if (session.score >= 80) {
      unlocked.add('score-80');
    }
    if (session.coins >= 50) {
      unlocked.add('coins-50');
    }
    if (session.coins >= 150) {
      unlocked.add('coins-150');
    }
    if (ownedStickerKinds >= 1) {
      unlocked.add('first-sticker');
    }
    if (ownedStickerKinds >= 5) {
      unlocked.add('sticker-set-5');
    }
    if (totalStickerCopies >= 20) {
      unlocked.add('sticker-copies-20');
    }
    if (perfectRun) {
      unlocked.add('perfect-run');
    }
    if (session.sessionsPlayed >= 5) {
      unlocked.add('veteran-5');
    }
    if (session.sessionsPlayed >= 10) {
      unlocked.add('sessions-10');
    }
    if (session.sessionsPlayed >= 25) {
      unlocked.add('sessions-25');
    }

    return {
      ...session,
      unlockedCollectibleIds: this.toSortedUniqueIds(Array.from(unlocked))
    };
  }

  private applyPersistedCollectibleIds(serverCollectibleIds: string[]): void {
    const serverIds = this.toSortedUniqueIds(serverCollectibleIds);
    this.persistedUnlockedCollectibleIds.set(serverIds);

    const session = this.state();
    if (!session) {
      return;
    }

    const mergedIds = this.toSortedUniqueIds([...serverIds, ...session.unlockedCollectibleIds]);
    if (!this.sameIds(mergedIds, session.unlockedCollectibleIds)) {
      this.state.set({
        ...session,
        unlockedCollectibleIds: mergedIds
      });
      this.persistState();
    }

    if (!this.sameIds(mergedIds, serverIds)) {
      this.persistedUnlockedCollectibleIds.set(mergedIds);
      this.persistUnlockedCollectiblesToServer(mergedIds);
    }
  }

  private applyPersistedWallet(response: UserWalletResponse): void {
    const wallet = {
      coins: Math.max(0, response?.coins ?? 0),
      points: Math.max(0, response?.points ?? 0)
    };
    this.persistedWallet.set(wallet);

    const session = this.state();
    if (!session) {
      return;
    }

    if (session.coins === wallet.coins && session.score === wallet.points) {
      return;
    }

    this.state.set({
      ...session,
      coins: wallet.coins,
      score: wallet.points
    });
    this.persistState();
  }

  private applyPersistedStickerInventory(serverInventory: Record<string, number>): void {
    const normalizedInventory = Object.entries(serverInventory ?? {}).reduce<Record<string, number>>((acc, [id, count]) => {
      const normalizedCount = Math.max(0, Number(count ?? 0));
      if (id && normalizedCount > 0) {
        acc[id] = normalizedCount;
      }
      return acc;
    }, {});

    this.persistedStickerInventory.set(normalizedInventory);

    const session = this.state();
    if (!session) {
      return;
    }

    this.state.set({
      ...session,
      stickerInventory: normalizedInventory
    });
    this.persistState();
  }

  private persistUnlockedCollectiblesToServer(unlockedCollectibleIds: string[]): void {
    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      return;
    }

    const apiBase = this.appConfig.apiBaseUrl;
    this.http
      .put<UserCollectiblesResponse>(`${apiBase}/api/users/me/collectibles`, {
        collectibleIds: this.toSortedUniqueIds(unlockedCollectibleIds)
      })
      .subscribe({
        next: (response) => {
          this.persistedUnlockedCollectibleIds.set(this.toSortedUniqueIds(response?.collectibleIds ?? []));
        },
        error: () => {
          // Keep optimistic client state even if persistence fails temporarily.
        }
      });
  }

  private calculateSalePrice(offer: StickerRollOffer): number {
    // Worth is implied by cost and drop chance: worth = cost / chance.
    const worth = offer.successRate > 0 ? offer.cost / offer.successRate : 0;
    return Math.max(0, Math.floor(worth * 0.4));
  }

  private persistWalletToServer(coins: number, points: number): void {
    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      return;
    }

    const normalized = { coins: Math.max(0, coins), points: Math.max(0, points) };
    this.persistedWallet.set(normalized);

    const apiBase = this.appConfig.apiBaseUrl;
    this.http.put<UserWalletResponse>(`${apiBase}/api/users/me/wallet`, normalized).subscribe({
      next: (response) => {
        this.persistedWallet.set({
          coins: Math.max(0, response?.coins ?? 0),
          points: Math.max(0, response?.points ?? 0)
        });
      },
      error: () => {
        // Keep optimistic client state even if persistence fails temporarily.
      }
    });
  }

  private toSortedUniqueIds(ids: string[]): string[] {
    return Array.from(new Set(ids.filter((entry) => !!entry))).sort((a, b) => a.localeCompare(b));
  }

  private sameIds(left: string[], right: string[]): boolean {
    if (left.length !== right.length) {
      return false;
    }

    for (let i = 0; i < left.length; i += 1) {
      if (left[i] !== right[i]) {
        return false;
      }
    }

    return true;
  }

  private loadState(): GameSessionState | null {
    const raw = sessionStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return this.normalizeState(JSON.parse(raw) as Partial<GameSessionState>);
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_STORAGE_KEY);
      return null;
    }
  }

  private normalizeState(state: Partial<GameSessionState>): GameSessionState {
    const inferredCorrectFromAnswers = (state.answers ?? []).filter((entry) => entry.isCorrect).length;
    const inferredCorrectFromScore = Math.floor((state.score ?? 0) / POINTS_PER_CORRECT);
    const inferredCorrect = Math.max(inferredCorrectFromAnswers, inferredCorrectFromScore);
    const migratedCoins = inferredCorrect * COINS_PER_CORRECT;

    return {
      playerName: state.playerName ?? 'Player',
      roundSize: state.roundSize ?? 0,
      questionIds: state.questionIds ?? [],
      currentQuestion: state.currentQuestion ?? 0,
      score: state.score ?? 0,
      streak: state.streak ?? 0,
      bestStreak: state.bestStreak ?? 0,
      answers: state.answers ?? [],
      unlockedCollectibleIds: state.unlockedCollectibleIds ?? [],
      stickerInventory: state.stickerInventory ?? {},
      coins: state.coins ?? migratedCoins,
      sessionsPlayed: state.sessionsPlayed ?? 0,
      startedAt: state.startedAt ?? '',
      completedAt: state.completedAt ?? new Date().toISOString()
    };
  }

  private persistState(): void {
    const current = this.state();
    if (!current) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }

  private shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
  }
}







