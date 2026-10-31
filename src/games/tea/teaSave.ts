import { readGame, writeGame } from '../../save';
import { isDifficulty, type Difficulty } from '../../difficulty';
import { isDayKey } from '../../daily/daily';

export const GAME_ID = 'tea';

/** A service is short: only the results are saved, never a service in progress. */
export interface TeaSave {
  difficulty: Difficulty;
  servicesDone: number;
  /** Best score for each difficulty, 0 when never played. */
  best: number[];
  /** Day of a daily challenge started and not yet won. */
  challenge?: string;
}

export function loadTea(): TeaSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const best = Array.isArray(data.best) ? data.best : [];
  return {
    difficulty: isDifficulty(data.difficulty) ? data.difficulty : 0,
    servicesDone: isCount(data.servicesDone) ? data.servicesDone : 0,
    best: [0, 1, 2, 3, 4].map((i) => (isCount(best[i]) ? best[i] : 0)),
    challenge: isDayKey(data.challenge) ? data.challenge : undefined,
  };
}

export function saveTea(save: TeaSave): void {
  writeGame(GAME_ID, save);
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}
