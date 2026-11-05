import { readGame, writeGame } from '../../save';
import { isDifficulty, type Difficulty } from '../../difficulty';
import type { NapPuzzle } from './napLogic';

const GAME_ID = 'catNap';

export const Mark = { None: 0, Cross: 1, Cat: 2 } as const;
export type Mark = (typeof Mark)[keyof typeof Mark];

export interface CurrentNap extends NapPuzzle {
  number: number;
  difficulty: Difficulty;
  /** Per cell, row-major. Only right cats are ever placed. */
  marks: Mark[];
  /** Cats put where none sleeps. */
  mistakes: number;
}

export interface NapSave {
  difficulty: Difficulty;
  roomsDone: number;
  /** Best grade per difficulty, 0 when never finished. */
  bestStars: number[];
  current: CurrentNap | null;
}

export function loadNap(): NapSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const best = Array.isArray(data.bestStars) ? data.bestStars : [];
  return {
    difficulty: isDifficulty(data.difficulty) ? data.difficulty : 0,
    roomsDone: isCount(data.roomsDone) ? data.roomsDone : 0,
    bestStars: [0, 1, 2, 3, 4].map((index) => ([0, 1, 2, 3].includes(best[index]) ? (best[index] as number) : 0)),
    current: isCurrent(data.current) ? data.current : null,
  };
}

export function saveNap(save: NapSave): void {
  writeGame(GAME_ID, save);
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isCurrent(value: unknown): value is CurrentNap {
  if (typeof value !== 'object' || value === null) return false;
  const nap = value as Record<string, unknown>;
  const size = nap.size;
  if (!Number.isInteger(size) || (size as number) < 4 || (size as number) > 12) return false;
  const n = size as number;
  const cells = n * n;
  return (
    isCount(nap.number) &&
    isDifficulty(nap.difficulty) &&
    isCount(nap.mistakes) &&
    Array.isArray(nap.regions) &&
    nap.regions.length === cells &&
    nap.regions.every((region) => Number.isInteger(region) && region >= 0 && region < n) &&
    Array.isArray(nap.cats) &&
    nap.cats.length === n &&
    nap.cats.every((col) => Number.isInteger(col) && col >= 0 && col < n) &&
    Array.isArray(nap.marks) &&
    nap.marks.length === cells &&
    nap.marks.every((mark, cell) => mark === Mark.None || mark === Mark.Cross || (mark === Mark.Cat && (nap.cats as number[])[Math.floor(cell / n)] === cell % n))
  );
}
