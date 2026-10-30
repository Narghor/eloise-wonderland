import { readGame, writeGame } from '../save';
import type { Difficulty } from '../difficulty';
import { STARTER_SPECIES, findItem, type Slot } from './catalog';

const GAME_ID = 'companion';
const DEFAULT_NAME = 'Pompon';

/** Games without a star grade pay as if they had given this many. */
export const UNGRADED_STARS = 2;

/** What the companion wears: an item id per slot; null keeps the species' own look. */
export type Look = { species: string } & Record<Exclude<Slot, 'species'>, string | null>;

export interface CompanionSave {
  name: string;
  coins: number;
  /** Every coin ever earned, spent or not. */
  earned: number;
  owned: string[];
  look: Look;
}

export function loadCompanion(): CompanionSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const owned = new Set(Array.isArray(data.owned) ? data.owned.filter((id): id is string => typeof id === 'string' && !!findItem(id)) : []);
  owned.add(STARTER_SPECIES);
  return {
    name: typeof data.name === 'string' && data.name.trim() !== '' ? data.name : DEFAULT_NAME,
    coins: isCount(data.coins) ? data.coins : 0,
    earned: isCount(data.earned) ? data.earned : 0,
    owned: [...owned],
    look: loadLook(data.look, owned),
  };
}

export function saveCompanion(save: CompanionSave): void {
  writeGame(GAME_ID, save);
}

/** One coin per star, multiplied by the difficulty: hard levels pay up to five times more. */
export function coinsFor(stars: number, difficulty: Difficulty): number {
  return stars * (difficulty + 1);
}

/** Adds the coins of a finished level and returns how many were given. */
export function earnCoins(stars: number, difficulty: Difficulty): number {
  const coins = coinsFor(stars, difficulty);
  if (coins === 0) return 0;
  const save = loadCompanion();
  save.coins += coins;
  save.earned += coins;
  saveCompanion(save);
  return coins;
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

/** Keeps only what is owned and in the right slot: an edited save cannot wear what it never bought. */
function loadLook(value: unknown, owned: Set<string>): Look {
  const data = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const pick = (slot: Slot): string | null => {
    const id = data[slot];
    return typeof id === 'string' && owned.has(id) && findItem(id)?.slot === slot ? id : null;
  };
  return {
    species: pick('species') ?? STARTER_SPECIES,
    color: pick('color'),
    hat: pick('hat'),
    glasses: pick('glasses'),
    neck: pick('neck'),
    background: pick('background'),
  };
}
