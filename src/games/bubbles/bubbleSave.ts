import { readGame, writeGame } from '../../save';

const GAME_ID = 'bubbles';

export interface BubbleSave {
  /** The level to play next. A level is short: an unfinished one simply starts again. */
  level: number;
  cleared: number;
}

export function loadBubbles(): BubbleSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    level: Number.isInteger(data.level) && (data.level as number) >= 1 ? (data.level as number) : 1,
    cleared: Number.isInteger(data.cleared) ? (data.cleared as number) : 0,
  };
}

export function saveBubbles(save: BubbleSave): void {
  writeGame(GAME_ID, save);
}
