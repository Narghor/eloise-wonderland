import { atLevel, type CropId, type Unlock } from './types';

// -----------------------------------------------
// CROPS (docs/ferme.md 7.1)
// -----------------------------------------------
// The longer a crop, the less it earns per minute but the more per visit.
// Wheat and corn give no XP: twenty fields of 2-minute wheat must not beat everything else.

export interface Crop {
  id: CropId;
  unlock: Unlock;
  minutes: number;
  /** Seed price, in Eloisettes. */
  seed: number;
  /** Items harvested per field. */
  yield: number;
  xp: number;
}

export const CROPS: readonly Crop[] = [
  { id: 'wheat', unlock: atLevel(1), minutes: 2, seed: 1, yield: 2, xp: 0 },
  { id: 'corn', unlock: atLevel(2), minutes: 5, seed: 2, yield: 2, xp: 0 },
  { id: 'carrot', unlock: atLevel(3), minutes: 10, seed: 3, yield: 2, xp: 1 },
  { id: 'tomato', unlock: atLevel(5), minutes: 30, seed: 5, yield: 2, xp: 1 },
  { id: 'strawberry', unlock: atLevel(7), minutes: 60, seed: 8, yield: 2, xp: 2 },
  { id: 'sunflower', unlock: atLevel(9), minutes: 120, seed: 10, yield: 2, xp: 2 },
  { id: 'pumpkin', unlock: atLevel(11), minutes: 240, seed: 15, yield: 2, xp: 3 },
  { id: 'cotton', unlock: atLevel(13), minutes: 480, seed: 20, yield: 2, xp: 4 },
];

export const CROP_IDS = CROPS.map((c) => c.id);

export function crop(id: CropId): Crop {
  return CROPS.find((c) => c.id === id)!;
}

// -----------------------------------------------
// FIELDS
// -----------------------------------------------

export const STARTING_FIELDS = 6;

/** Fields allowed at a level: 6, then 1.3 more per level gained (24 at level 15). */
export function maxFields(level: number): number {
  return STARTING_FIELDS + Math.floor(1.3 * (level - 1));
}

/** Price of the next field, by fields already bought beyond the starting ones. */
export function fieldPrice(bought: number): number {
  return 15 + 10 * bought;
}
