import { readGame, writeGame } from '../../save';
import type { Point } from './cookie';
import type { Stroke } from './icingScore';

const GAME_ID = 'icing';

export interface CurrentCookie {
  level: number;
  /** Rebuilds the cookie with generateCookie(seed, level). */
  seed: number;
  strokes: Stroke[];
}

export interface ShowcaseCookie {
  id: string;
  level: number;
  seed: number;
  strokes: Stroke[];
  stars: number;
  madeAt: string;
}

export interface IcingSave {
  cookiesDone: number;
  current: CurrentCookie | null;
  showcase: ShowcaseCookie[];
}

export function loadIcing(): IcingSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    cookiesDone: Number.isInteger(data.cookiesDone) ? (data.cookiesDone as number) : 0,
    current: isCurrent(data.current) ? data.current : null,
    showcase: Array.isArray(data.showcase) ? data.showcase.filter(isShowcaseCookie) : [],
  };
}

export function saveIcing(save: IcingSave): void {
  writeGame(GAME_ID, save);
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
  return Number.isInteger(candidate.level) && Number.isInteger(candidate.seed) && isStrokeList(candidate.strokes);
}

function isShowcaseCookie(value: unknown): value is ShowcaseCookie {
  if (!isCurrent(value)) return false;
  const candidate = value as unknown as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.madeAt === 'string' && Number.isInteger(candidate.stars);
}
