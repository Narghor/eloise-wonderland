import { readGame, writeGame } from '../../save';
import { BAITS, FINDS, fishById, type BaitId, type FindId } from './fishingData';

const GAME_ID = 'fishing';

export interface Caught {
  count: number;
  /** Biggest one, in centimetres. */
  best: number;
}

export interface FishingSave {
  caught: Record<string, Caught>;
  /** Coins earned by selling fish, all time. */
  earned: number;
  /** Baits left; the worm is never counted. */
  baits: Partial<Record<BaitId, number>>;
  bait: BaitId;
  /** Odd things brought up, by kind. */
  finds: Partial<Record<FindId, number>>;
  /** The daily challenge's day, progress, and whether it was paid. */
  challenge: { day: string; progress: number; done: boolean };
}

export function loadFishing(): FishingSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const caught: Record<string, Caught> = {};
  for (const [id, value] of Object.entries(asRecord(data.caught))) {
    const entry = asRecord(value);
    if (fishById(id) && isCount(entry.count) && entry.count > 0 && isCount(entry.best)) caught[id] = { count: entry.count, best: entry.best };
  }
  const challenge = asRecord(data.challenge);
  const bait = BAITS.find((b) => b.id === data.bait)?.id ?? 'worm';
  return {
    caught,
    earned: isCount(data.earned) ? data.earned : 0,
    baits: counts(data.baits, BAITS.map((b) => b.id)),
    bait,
    finds: counts(data.finds, FINDS.map((f) => f.id)),
    challenge: {
      day: typeof challenge.day === 'string' ? challenge.day : '',
      progress: isCount(challenge.progress) ? challenge.progress : 0,
      done: challenge.done === true,
    },
  };
}

export function saveFishing(save: FishingSave): void {
  writeGame(GAME_ID, save);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function counts<T extends string>(value: unknown, ids: T[]): Partial<Record<T, number>> {
  const result: Partial<Record<T, number>> = {};
  for (const [id, count] of Object.entries(asRecord(value))) if (ids.includes(id as T) && isCount(count) && count > 0) result[id as T] = count;
  return result;
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}
