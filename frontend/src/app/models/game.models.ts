export interface Question {
  id: string;
  prompt: string;
  options: string[];
  topic: string;
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'chroma';

export const RARITY_DISPLAY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'chroma'];

export interface Collectible {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  unlockRule: string;
}

export interface StickerAvatar {
  id: string;
  name: string;
  rarity: Rarity;
  emoji: string;
  sellPrice: number;
}

export interface AnswerRecord {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
}

export type OfferCurrency = 'coins' | 'score';

export interface StickerRollOffer {
  id: string;
  stickerId: string;
  rarity: Rarity;
  cost: number;
  currency: OfferCurrency;
  successRate: number;
}

export interface StickerRollResult {
  offer: StickerRollOffer;
  success: boolean;
  sticker: StickerAvatar | null;
  isNew: boolean;
  remainingCoins: number;
  remainingScore: number;
}

export interface GameSessionState {
  playerName: string;
  roundSize: number;
  questionIds: string[];
  currentQuestion: number;
  score: number;
  streak: number;
  bestStreak: number;
  answers: AnswerRecord[];
  unlockedCollectibleIds: string[];
  stickerInventory: Record<string, number>;
  coins: number;
  sessionsPlayed: number;
  startedAt: string;
  completedAt: string | null;
}

