import { Injectable, computed, signal } from '@angular/core';
import { COLLECTIBLES } from '../data/collectibles';
import { QUESTION_BANK } from '../data/questions';
import { STICKERS } from '../data/stickers';
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

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private readonly state = signal<GameSessionState | null>(this.loadState());

  readonly gameState = computed(() => this.state());
  readonly hasActiveGame = computed(() => {
    const session = this.state();
    return !!session && session.completedAt === null;
  });
  readonly isRoundComplete = computed(() => this.state()?.completedAt !== null);
  readonly allCollectibles = COLLECTIBLES;
  readonly allStickers = STICKERS;

  readonly currentQuestion = computed<Question | null>(() => {
    const session = this.state();
    if (!session || session.completedAt !== null) {
      return null;
    }

    const questionId = session.questionIds[session.currentQuestion];
    return QUESTION_BANK.find((question) => question.id === questionId) ?? null;
  });

  readonly unlockedCollectibles = computed<Collectible[]>(() => {
    const unlockedIds = new Set(this.state()?.unlockedCollectibleIds ?? []);
    return COLLECTIBLES.filter((collectible) => unlockedIds.has(collectible.id));
  });

  readonly walletCoins = computed(() => this.state()?.coins ?? 0);

  readonly progressText = computed(() => {
    const session = this.state();
    if (!session) {
      return '0 / 0';
    }
    const current = Math.min(session.currentQuestion + 1, session.roundSize);
    return `${current} / ${session.roundSize}`;
  });

  readonly ownedStickerCount = computed(() => {
    const inventory = this.state()?.stickerInventory ?? {};
    return Object.keys(inventory).length;
  });

  readonly totalStickerCopies = computed(() => {
    const inventory = this.state()?.stickerInventory ?? {};
    return Object.values(inventory).reduce((sum, value) => sum + value, 0);
  });

  startGame(playerName: string, roundSize = DEFAULT_ROUND_SIZE): void {
    const safeName = playerName.trim() || this.state()?.playerName || 'Player';
    const selectedQuestions = this.shuffle([...QUESTION_BANK])
      .slice(0, Math.min(roundSize, QUESTION_BANK.length))
      .map((question) => question.id);

    const profile = this.currentProfile();

    const nextState: GameSessionState = {
      playerName: safeName,
      roundSize: selectedQuestions.length,
      questionIds: selectedQuestions,
      currentQuestion: 0,
      score: 0,
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

  submitAnswer(selectedIndex: number): { isCorrect: boolean; correctIndex: number; coinsAwarded: number } {
    const session = this.state();
    const question = this.currentQuestion();

    if (!session || !question || session.completedAt !== null) {
      throw new Error('No active question to answer.');
    }

    const isCorrect = selectedIndex === question.correctIndex;
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

    this.state.set(this.applyCollectibleUnlocks(nextState));
    this.persistState();

    return { isCorrect, correctIndex: question.correctIndex, coinsAwarded };
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

  buyStickerChance(stickerId: string): StickerRollResult | null {
    const session = this.state();
    const sticker = STICKERS.find((entry) => entry.id === stickerId);
    if (!session || !sticker) {
      return null;
    }

    const offer = this.getOfferForSticker(sticker);
    if (!this.canAffordOffer(offer)) {
      return null;
    }

    const baseState: GameSessionState = {
      ...session,
      coins: offer.currency === 'coins' ? session.coins - offer.cost : session.coins,
      score: offer.currency === 'score' ? Math.max(0, session.score - offer.cost) : session.score
    };

    const success = Math.random() < offer.successRate;
    if (!success) {
      this.state.set(baseState);
      this.persistState();
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

    return {
      offer,
      success: true,
      sticker,
      isNew,
      remainingCoins: nextState.coins,
      remainingScore: nextState.score
    };
  }

  canAffordOffer(offer: StickerRollOffer): boolean {
    const session = this.state();
    if (!session) {
      return false;
    }
    return offer.currency === 'coins' ? session.coins >= offer.cost : session.score >= offer.cost;
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

  resetProgress(): void {
    this.state.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  private currentProfile(): Pick<
    GameSessionState,
    'unlockedCollectibleIds' | 'stickerInventory' | 'coins' | 'sessionsPlayed'
  > {
    const session = this.state();
    if (!session) {
      return {
        unlockedCollectibleIds: [],
        stickerInventory: {},
        coins: 0,
        sessionsPlayed: 0
      };
    }

    return {
      unlockedCollectibleIds: session.unlockedCollectibleIds,
      stickerInventory: session.stickerInventory,
      coins: session.coins,
      sessionsPlayed: session.sessionsPlayed
    };
  }

  private applyCollectibleUnlocks(session: GameSessionState): GameSessionState {
    const unlocked = new Set(session.unlockedCollectibleIds);

    const correctCount = session.answers.filter((answer) => answer.isCorrect).length;
    const perfectRun = session.answers.length === session.roundSize && correctCount === session.roundSize;

    if (correctCount >= 1) {
      unlocked.add('spark-seed');
    }
    if (session.bestStreak >= 3) {
      unlocked.add('streak-3');
    }
    if (session.score >= 60) {
      unlocked.add('score-60');
    }
    if (perfectRun) {
      unlocked.add('perfect-run');
    }
    if (session.sessionsPlayed >= 5) {
      unlocked.add('veteran-5');
    }

    return {
      ...session,
      unlockedCollectibleIds: Array.from(unlocked)
    };
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
      // Migrate legacy sessions created before the coin system existed.
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
