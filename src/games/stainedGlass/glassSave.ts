import { readGame, writeGame } from '../../save';
import type { Point } from './glassWindow';

const GAME_ID = 'stainedGlass';

export interface CurrentWindow {
  level: number;
  /** Rebuilds the whole layout with generateLayout(seed, level). */
  seed: number;
  /** Palette index per piece, -1 when still uncoloured. */
  colors: number[];
}

/** A finished window keeps its seeds: the gallery redraws it without regenerating it. */
export interface ChapelWindow {
  id: string;
  level: number;
  seeds: Point[];
  palette: string[];
  colors: number[];
  madeAt: string;
}

export interface GlassSave {
  windowsDone: number;
  current: CurrentWindow | null;
  chapel: ChapelWindow[];
}

export function loadGlass(): GlassSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    windowsDone: typeof data.windowsDone === 'number' ? data.windowsDone : 0,
    current: isCurrent(data.current) ? data.current : null,
    chapel: Array.isArray(data.chapel) ? data.chapel.filter(isChapelWindow) : [],
  };
}

export function saveGlass(save: GlassSave): void {
  writeGame(GAME_ID, save);
}

function isColorList(value: unknown, colorCount: number): value is number[] {
  return Array.isArray(value) && value.every((color) => Number.isInteger(color) && color >= -1 && color < colorCount);
}

function isCurrent(value: unknown): value is CurrentWindow {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return Number.isInteger(candidate.level) && Number.isInteger(candidate.seed) && isColorList(candidate.colors, 10);
}

function isChapelWindow(value: unknown): value is ChapelWindow {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const { seeds, palette, colors } = candidate;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.madeAt === 'string' &&
    Number.isInteger(candidate.level) &&
    Array.isArray(seeds) &&
    seeds.every((point) => Array.isArray(point) && point.length === 2 && point.every((n) => typeof n === 'number')) &&
    Array.isArray(palette) &&
    palette.every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) &&
    isColorList(colors, palette.length) &&
    colors.length === seeds.length
  );
}
