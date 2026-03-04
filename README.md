# Rainblet

Rainblet is a single-player educational quiz game built with Angular.

## Core loop

1. Start a quiz round and answer questions.
2. Earn score + coin rewards for correct answers.
3. Spend coins/points in the Sticker Store on sticker-specific drop chances.
4. Pull avatar stickers with weighted rarity odds.
5. Track achievement collectibles and sticker inventory.

## Features

- Session-based save state (`sessionStorage`)
- Fast quiz rounds with streaks and score feedback
- Collectible achievement unlocks
- Lottery-style sticker store (in-game currency only)

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app:
   ```bash
   npm start
   ```
3. Open `http://localhost:4200`

## Tech

- Angular standalone components + router
- TypeScript
- Browser session storage
