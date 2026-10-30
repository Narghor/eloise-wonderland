import { readGame, writeGame } from '../../save';
import { isDifficulty, type Difficulty } from '../../difficulty';
import { isDayKey } from '../../daily/daily';
import { isFlowerKey, type FlowerKey } from './flowers';

const GAME_ID = 'bouquet';

export interface CurrentOrder {
  /** Order number, shown to the player. */
  number: number;
  difficulty: Difficulty;
  /** Rebuilds the order with generateOrder(seed, level). */
  level: number;
  seed: number;
  /** Left to right; null is an empty slot. */
  slots: (FlowerKey | null)[];
  /** Day of the daily challenge this order is. */
  challenge?: string;
}

export interface DeliveredBouquet {
  id: string;
  number: number;
  level: number;
  seed: number;
  flowers: FlowerKey[];
  /** One per wish of the order, in its order. */
  results: boolean[];
  stars: number;
  deliveredAt: string;
}

export interface BouquetSave {
  difficulty: Difficulty;
  ordersDone: number;
  current: CurrentOrder | null;
  gallery: DeliveredBouquet[];
}

export function loadBouquet(): BouquetSave {
  return parseBouquetSave(readGame(GAME_ID));
}

export function saveBouquet(save: BouquetSave): void {
  writeGame(GAME_ID, save);
}

/** Keeps what is valid from a saved block; anything else falls back to a fresh start. */
export function parseBouquetSave(raw: unknown): BouquetSave {
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    difficulty: isDifficulty(data.difficulty) ? data.difficulty : 0,
    ordersDone: Number.isInteger(data.ordersDone) && (data.ordersDone as number) >= 0 ? (data.ordersDone as number) : 0,
    current: isCurrent(data.current) ? data.current : null,
    gallery: Array.isArray(data.gallery) ? data.gallery.filter(isDelivered) : [],
  };
}

function isCurrent(value: unknown): value is CurrentOrder {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    Number.isInteger(c.number) &&
    isDifficulty(c.difficulty) &&
    Number.isInteger(c.level) &&
    Number.isInteger(c.seed) &&
    Array.isArray(c.slots) &&
    c.slots.length > 0 &&
    c.slots.every((slot) => slot === null || isFlowerKey(slot)) &&
    (c.challenge === undefined || isDayKey(c.challenge))
  );
}

function isDelivered(value: unknown): value is DeliveredBouquet {
  if (typeof value !== 'object' || value === null) return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    Number.isInteger(d.number) &&
    Number.isInteger(d.level) &&
    Number.isInteger(d.seed) &&
    Array.isArray(d.flowers) &&
    d.flowers.length > 0 &&
    d.flowers.every(isFlowerKey) &&
    Array.isArray(d.results) &&
    d.results.every((r) => typeof r === 'boolean') &&
    Number.isInteger(d.stars) &&
    typeof d.deliveredAt === 'string'
  );
}
