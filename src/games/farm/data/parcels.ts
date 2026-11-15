import type { AnimalId, BoosterId, BreedId, DecorId, Rarity } from './types';

// -----------------------------------------------
// GASTON'S PARCELS: the surprise of the farm (docs/ferme.md 13)
// -----------------------------------------------
// A parcel arrives in the mailbox every few hours, and comes with levels and the daily chest. Opening one draws a
// rarity, then a prize of that rarity. Treasures (decorations and rare animals) are found nowhere else and fill
// the album. Parcels are only earned by playing, never bought: the farm must not be bought.

export const PARCEL_EVERY_MINUTES = 240;
/** The mailbox holds this many parcels from Gaston's rounds; gifts (levels, chest) always fit. */
export const MAILBOX_SIZE = 3;
/** At most this many parcels in a row without a rare or better: the next one is at least rare. */
export const PITY = 10;

export const RARITIES: readonly { id: Rarity; name: string; weight: number }[] = [
  { id: 'common', name: 'Commun', weight: 62 },
  { id: 'rare', name: 'Rare', weight: 28 },
  { id: 'epic', name: 'Épique', weight: 8.5 },
  { id: 'legendary', name: 'Légendaire', weight: 1.5 },
];

export function rarityName(id: Rarity): string {
  return RARITIES.find((r) => r.id === id)!.name;
}

/** One prize. `nuts` scale with the level: a parcel stays worth opening all game long. */
export type Prize =
  | { kind: 'nuts'; perLevel: number; base: number }
  | { kind: 'boosters'; boosters: Partial<Record<BoosterId, number>> }
  | { kind: 'decor'; decor: DecorId }
  | { kind: 'breed'; breed: BreedId };

export const PRIZES: Record<Rarity, readonly Prize[]> = {
  common: [
    { kind: 'nuts', base: 20, perLevel: 10 },
    { kind: 'boosters', boosters: { fertilizer: 2 } },
    { kind: 'boosters', boosters: { helpingHand: 1 } },
    { kind: 'boosters', boosters: { hourglass: 1 } },
  ],
  rare: [
    { kind: 'boosters', boosters: { wateringCan: 1 } },
    { kind: 'boosters', boosters: { hourglass: 2, fertilizer: 2 } },
    { kind: 'decor', decor: 'gnome' },
    { kind: 'decor', decor: 'hayBales' },
    { kind: 'decor', decor: 'teaTable' },
  ],
  epic: [
    { kind: 'decor', decor: 'flowerArch' },
    { kind: 'decor', decor: 'swing' },
    { kind: 'breed', breed: 'redHen' },
    { kind: 'breed', breed: 'pinkCow' },
  ],
  legendary: [
    { kind: 'decor', decor: 'fountain' },
    { kind: 'breed', breed: 'goldenHen' },
  ],
};

// -----------------------------------------------
// RARE ANIMALS
// -----------------------------------------------

export interface Breed {
  id: BreedId;
  name: string;
  animal: AnimalId;
  rarity: Rarity;
  /** Chance that a collect gives one product more for this animal. */
  bonusChance: number;
}

export const BREEDS: readonly Breed[] = [
  { id: 'redHen', name: 'Poule rousse', animal: 'chicken', rarity: 'epic', bonusChance: 0.3 },
  { id: 'pinkCow', name: 'Vache à taches roses', animal: 'cow', rarity: 'epic', bonusChance: 0.3 },
  { id: 'goldenHen', name: 'Poule dorée', animal: 'chicken', rarity: 'legendary', bonusChance: 0.5 },
];

export const BREED_IDS = BREEDS.map((b) => b.id);

export function breed(id: BreedId): Breed {
  return BREEDS.find((b) => b.id === id)!;
}

// -----------------------------------------------
// THE ALBUM: every treasure, in the order shown
// -----------------------------------------------

export type TreasureId = DecorId | BreedId;

export const TREASURES: readonly { id: TreasureId; rarity: Rarity }[] = (['rare', 'epic', 'legendary'] as const).flatMap((rarity) =>
  PRIZES[rarity].flatMap((p): { id: TreasureId; rarity: Rarity }[] => (p.kind === 'decor' ? [{ id: p.decor, rarity }] : p.kind === 'breed' ? [{ id: p.breed, rarity }] : [])),
);
