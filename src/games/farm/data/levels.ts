import type { Reward } from './types';

// -----------------------------------------------
// LEVELS (docs/ferme.md 4.6)
// -----------------------------------------------
// Written by hand: the first five levels fall on the first day, then each one takes longer without dragging on.

/** XP to go from level L to L + 1, at index L - 1. */
export const XP_TABLE: readonly number[] = [15, 30, 50, 80, 200, 320, 480, 680, 950, 1600, 2900, 3700, 4500, 5300];

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
