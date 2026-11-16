import type { Reward } from './types';

// -----------------------------------------------
// LEVELS (docs/ferme.md 4.6)
// -----------------------------------------------
// Written by hand: the first five levels fall on the first day, then each one takes longer without dragging on.

/**
 * XP to go from level L to L + 1, at index L - 1. Levels 6 to 15 are lot 1's x 1.68: lot 2 gives more to sell (fruit
 * trees, machine and pen copies, the market cart) and must not make them faster. Then 16 300 + 550 per level up to 30:
 * Flo wants lot 2 to last about four months for a regular player (docs/ferme.md 19). Measured with tools/farm-sim:
 * level 15 on day 44 / 27 / 13, level 30 on day 196 / 119 / 54 for the calm / regular / keen player.
 */
export const XP_TABLE: readonly number[] = [
  15, 30, 50, 80, 200, 550, 810, 1140, 1600, 2690, 4870, 6230, 7570, 8930,
  ...Array.from({ length: 15 }, (_, i) => 16300 + 550 * i),
];

export const MAX_LEVEL = XP_TABLE.length + 1;

export function xpToNext(level: number): number | null {
  return XP_TABLE[level - 1] ?? null;
}

/** What reaching a level gives, on top of what it opens. */
export function levelReward(level: number): Reward {
  return { nuts: 15 * level, parcels: 1, boosters: { fertilizer: 1, ...(level % 2 === 0 ? { hourglass: 1 } : {}) } };
}

/** Order board places at a level. */
export function orderSlots(level: number): number {
  return level >= 8 ? 6 : level >= 5 ? 5 : level >= 3 ? 4 : 3;
}

/** Eloisettes at the very start. */
export const STARTING_NUTS = 50;
