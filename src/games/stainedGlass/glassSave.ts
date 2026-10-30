import { readGame, writeGame } from '../../save';
import { loadDifficulty, type Difficulty } from '../../difficulty';
import { GLASS_LEVELS, isWindowShape, type Point, type WindowShape } from './glassWindow';

const GAME_ID = 'stainedGlass';

export interface CurrentWindow {
  /** Window number, shown to the player; absent on older saves, where it was the level. */
  number?: number;
  /** Generator level: one of GLASS_LEVELS, so it also tells the difficulty. */
  level: number;
  shape: WindowShape;
  /** Rebuilds the whole layout with generateLayout(seed, level). */
  seed: number;
  /** Palette index per piece, -1 when still uncoloured. */
  colors: number[];
}

/** A finished window keeps its seeds: the gallery redraws it without regenerating it. */
export interface ChapelWindow {
  id: string;
  number?: number;
  level: number;
  shape: WindowShape;
  seeds: Point[];
  palette: string[];
  colors: number[];
  madeAt: string;
}

export interface GlassSave {
  difficulty: Difficulty;
  windowsDone: number;
  current: CurrentWindow | null;
  chapel: ChapelWindow[];
}

export function loadGlass(): GlassSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const windowsDone = typeof data.windowsDone === 'number' ? data.windowsDone : 0;
  return {
    // Saves made before difficulties played level windowsDone + 1.
    difficulty: loadDifficulty(data.difficulty, GLASS_LEVELS, windowsDone + 1),
    windowsDone,
    current: isCurrent(data.current) ? withShape(data.current) : null,
    chapel: Array.isArray(data.chapel) ? data.chapel.filter(isChapelWindow).map(withShape) : [],
  };
}

export function windowNumber(window: { number?: number; level: number }): number {
  return window.number ?? window.level;
}

/** Windows saved before the other shapes existed were all arches. */
function withShape<T extends { shape: WindowShape }>(window: T): T {
  return isWindowShape(window.shape) ? window : { ...window, shape: 'arch' };
}

export function saveGlass(save: GlassSave): void {
  writeGame(GAME_ID, save);
}

function isColorList(value: unknown, colorCount: number): value is number[] {
  return Array.isArray(value) && value.every((color) => Number.isInteger(color) && color >= -1 && color < colorCount);
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || Number.isInteger(value);
}

function isCurrent(value: unknown): value is CurrentWindow {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isOptionalNumber(candidate.number) &&
    Number.isInteger(candidate.level) &&
    Number.isInteger(candidate.seed) &&
    isColorList(candidate.colors, 10)
  );
}

function isChapelWindow(value: unknown): value is ChapelWindow {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const { seeds, palette, colors } = candidate;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.madeAt === 'string' &&
    isOptionalNumber(candidate.number) &&
    Number.isInteger(candidate.level) &&
    Array.isArray(seeds) &&
    seeds.every((point) => Array.isArray(point) && point.length === 2 && point.every((n) => typeof n === 'number')) &&
    Array.isArray(palette) &&
    palette.every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) &&
    isColorList(colors, palette.length) &&
    colors.length === seeds.length
  );
}
