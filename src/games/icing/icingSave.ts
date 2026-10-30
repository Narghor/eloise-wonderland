import { readGame, writeGame } from '../../save';
import { difficultyFromLevel, isDifficulty, type Difficulty } from '../../difficulty';
import { ICING_LEVELS, type Point } from './cookie';
import type { Stroke } from './icingScore';

const GAME_ID = 'icing';

export interface CurrentCookie {
  /** Cookie number, shown to the player; absent on older saves, where it was the level. */
  number?: number;
  /** Absent on older saves: derived from the level. */
  difficulty?: Difficulty;
  /** Generator level. */
  level: number;
  /** Rebuilds the cookie with generateCookie(seed, level). */
  seed: number;
  strokes: Stroke[];
}

export interface ShowcaseCookie {
  id: string;
  number?: number;
  level: number;
  seed: number;
  strokes: Stroke[];
  stars: number;
  madeAt: string;
}

export interface IcingSave {
  difficulty: Difficulty;
  cookiesDone: number;
  current: CurrentCookie | null;
  showcase: ShowcaseCookie[];
}

export function loadIcing(): IcingSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const cookiesDone = Number.isInteger(data.cookiesDone) ? (data.cookiesDone as number) : 0;
  return {
    // Saves made before difficulties never had the tighter Expert judging: they stop at Difficile.
    difficulty: isDifficulty(data.difficulty) ? data.difficulty : oldDifficulty(difficultyFromLevel(ICING_LEVELS, cookiesDone + 1)),
    cookiesDone,
    current: isCurrent(data.current) ? data.current : null,
    showcase: Array.isArray(data.showcase) ? data.showcase.filter(isShowcaseCookie) : [],
  };
}

export function saveIcing(save: IcingSave): void {
  writeGame(GAME_ID, save);
}

export function cookieDifficulty(cookie: CurrentCookie): Difficulty {
  return isDifficulty(cookie.difficulty) ? cookie.difficulty : oldDifficulty(difficultyFromLevel(ICING_LEVELS, cookie.level));
}

export function cookieNumber(cookie: { number?: number; level: number }): number {
  return cookie.number ?? cookie.level;
}

function oldDifficulty(difficulty: Difficulty): Difficulty {
  return difficulty === 4 ? 3 : difficulty;
}

/** Three decimals is a tenth of a pixel on a phone: plenty, and the save stays small. */
export function compactStroke(stroke: Stroke): Stroke {
  return { color: stroke.color, points: stroke.points.map(([x, y]): Point => [round(x), round(y)]) };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function isStrokeList(value: unknown): value is Stroke[] {
  return (
    Array.isArray(value) &&
    value.every((stroke) => {
      if (typeof stroke !== 'object' || stroke === null) return false;
      const { color, points } = stroke as Record<string, unknown>;
      return (
        Number.isInteger(color) &&
        Array.isArray(points) &&
        points.length > 0 &&
        points.every((point) => Array.isArray(point) && point.length === 2 && point.every((n) => typeof n === 'number'))
      );
    })
  );
}

function isCurrent(value: unknown): value is CurrentCookie {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.number === undefined || Number.isInteger(candidate.number)) &&
    Number.isInteger(candidate.level) &&
    Number.isInteger(candidate.seed) &&
    isStrokeList(candidate.strokes)
  );
}

function isShowcaseCookie(value: unknown): value is ShowcaseCookie {
  if (!isCurrent(value)) return false;
  const candidate = value as unknown as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.madeAt === 'string' && Number.isInteger(candidate.stars);
}
