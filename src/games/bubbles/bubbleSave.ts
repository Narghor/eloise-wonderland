import { readGame, writeGame } from '../../save';
import { loadDifficulty, type Difficulty } from '../../difficulty';
import { isDayKey } from '../../daily/daily';
import { BUBBLE_LEVELS } from './bubbleBoard';

const GAME_ID = 'bubbles';

export interface BubbleSave {
  /** A level is short: an unfinished one simply starts again at this difficulty. */
  difficulty: Difficulty;
  cleared: number;
  /** Zen mode: the ceiling never comes down. */
  zen: boolean;
  /** Day of a daily challenge waiting to be won: the next levels are that challenge, without zen. */
  challenge?: string;
}

export function loadBubbles(): BubbleSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    // Saves made before difficulties stored the next level to play.
    difficulty: loadDifficulty(data.difficulty, BUBBLE_LEVELS, data.level),
    cleared: Number.isInteger(data.cleared) ? (data.cleared as number) : 0,
    zen: data.zen === true,
    challenge: isDayKey(data.challenge) ? data.challenge : undefined,
  };
}

export function saveBubbles(save: BubbleSave): void {
  writeGame(GAME_ID, save);
}
