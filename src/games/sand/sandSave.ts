import { readGame, writeGame } from '../../save';
import { JAR_HEIGHT, JAR_WIDTH } from './jar';

const GAME_ID = 'sand';
const CELL_COUNT = JAR_WIDTH * JAR_HEIGHT;

export interface CurrentBottle {
  /** Model number, or null for a free creation. */
  level: number | null;
  palette: string[];
  /** Encoded colours of the model (see encodeColors), null in free mode. */
  target: string | null;
  cells: string;
}

export interface ShelfBottle {
  id: string;
  level: number | null;
  palette: string[];
  cells: string;
  /** 0-3, null for a free creation. */
  stars: number | null;
  madeAt: string;
}

export interface SandSave {
  modelsDone: number;
  current: CurrentBottle | null;
  shelf: ShelfBottle[];
}

export function loadSand(): SandSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    modelsDone: typeof data.modelsDone === 'number' ? data.modelsDone : 0,
    current: isCurrent(data.current) ? data.current : null,
    shelf: Array.isArray(data.shelf) ? data.shelf.filter(isShelfBottle) : [],
  };
}

export function saveSand(save: SandSave): void {
  writeGame(GAME_ID, save);
}

// -----------------------------------------------
// COMPACT COLOURS
// -----------------------------------------------
// Run-length encoding: sand comes in layers, so a jar of ~11 000 cells fits in a few KB.
// Format: "<colour>.<count>" runs in base 36, joined by commas.

export function encodeColors(colors: Uint8Array): string {
  const runs: string[] = [];
  let start = 0;
  for (let i = 1; i <= colors.length; i++) {
    if (i === colors.length || colors[i] !== colors[start]) {
      runs.push(`${colors[start].toString(36)}.${(i - start).toString(36)}`);
      start = i;
    }
  }
  return runs.join(',');
}

/** Null when the text is not a full jar. */
export function decodeColors(text: string): Uint8Array | null {
  const colors = new Uint8Array(CELL_COUNT);
  let index = 0;
  for (const run of text.split(',')) {
    const [color, count] = run.split('.').map((part) => parseInt(part, 36));
    if (!Number.isInteger(color) || !Number.isInteger(count) || count <= 0 || index + count > CELL_COUNT) return null;
    colors.fill(color, index, index + count);
    index += count;
  }
  return index === CELL_COUNT ? colors : null;
}

// -----------------------------------------------
// VALIDATION
// -----------------------------------------------

function isPalette(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color));
}

function fitsPalette(cells: unknown, palette: string[]): boolean {
  if (typeof cells !== 'string') return false;
  const colors = decodeColors(cells);
  return colors !== null && colors.every((color) => color <= palette.length);
}

function isCurrent(value: unknown): value is CurrentBottle {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.level === null || typeof candidate.level === 'number') &&
    isPalette(candidate.palette) &&
    fitsPalette(candidate.cells, candidate.palette) &&
    (candidate.target === null || fitsPalette(candidate.target, candidate.palette))
  );
}

function isShelfBottle(value: unknown): value is ShelfBottle {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.madeAt === 'string' &&
    (candidate.level === null || typeof candidate.level === 'number') &&
    (candidate.stars === null || typeof candidate.stars === 'number') &&
    isPalette(candidate.palette) &&
    fitsPalette(candidate.cells, candidate.palette)
  );
}
