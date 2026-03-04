import { Collectible } from '../models/game.models';

export const COLLECTIBLES: Collectible[] = [
  {
    id: 'spark-seed',
    name: 'Spark Seed',
    description: 'Awarded the first time you answer correctly.',
    rarity: 'common',
    unlockRule: 'Get 1 correct answer.'
  },
  {
    id: 'streak-3',
    name: 'Streak Stone',
    description: 'You held focus with a 3-answer streak.',
    rarity: 'common',
    unlockRule: 'Reach a 3-answer streak.'
  },
  {
    id: 'score-60',
    name: 'Scholar Crest',
    description: 'A badge for high-scoring knowledge runs.',
    rarity: 'rare',
    unlockRule: 'Score at least 60 points in one round.'
  },
  {
    id: 'perfect-run',
    name: 'Perfect Prism',
    description: 'Granted only to players with a flawless round.',
    rarity: 'epic',
    unlockRule: 'Answer every question correctly.'
  },
  {
    id: 'veteran-5',
    name: 'Rain Veteran Medal',
    description: 'Shows long-term persistence and repeated play.',
    rarity: 'rare',
    unlockRule: 'Finish 5 sessions in this browser tab session.'
  }
];
