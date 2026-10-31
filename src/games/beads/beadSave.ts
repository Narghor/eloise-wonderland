import { readGame, writeGame } from '../../save';
import { isDifficulty, type Difficulty } from '../../difficulty';
import { isDayKey } from '../../daily/daily';
import { beadsNeeded, EMPTY, type Pattern } from './beadLogic';

export const GAME_ID = 'beads';

export interface CurrentBeads extends Pattern {
  number: number;
  difficulty: Difficulty;
  /** Bead on each peg of the board, or EMPTY. */
  placed: number[];
  /** Every bead ever put on a wrong peg: taking it back does not give the mistake back. */
  mistakes: number;
  /** Day of the daily challenge this piece is. */
  challenge?: string;
}

/** A finished piece is its model: it can only be finished by matching it exactly. */
export interface BoxedBeads extends Pattern {
  id: string;
  number: number;
  stars: number;
  madeAt: string;
}

export interface BeadSave {
  difficulty: Difficulty;
  piecesDone: number;
  current: CurrentBeads | null;
  box: BoxedBeads[];
}

export function loadBeads(): BeadSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    difficulty: isDifficulty(data.difficulty) ? data.difficulty : 0,
    piecesDone: Number.isInteger(data.piecesDone) && (data.piecesDone as number) >= 0 ? (data.piecesDone as number) : 0,
    current: isCurrent(data.current) ? data.current : null,
    box: Array.isArray(data.box) ? data.box.filter(isBoxed) : [],
  };
}

export function saveBeads(save: BeadSave): void {
  writeGame(GAME_ID, save);
}

// -----------------------------------------------
// VALIDATION
// -----------------------------------------------

function isCellList(value: unknown, length: number, colors: number): value is number[] {
  return Array.isArray(value) && value.length === length && value.every((cell) => Number.isInteger(cell) && cell >= EMPTY && cell < colors);
}

function isPattern(candidate: Record<string, unknown>): boolean {
  const { palette, width, height, cells } = candidate;
  const isSize = (size: unknown) => Number.isInteger(size) && (size as number) >= 4 && (size as number) <= 24;
  return (
    Array.isArray(palette) &&
    palette.length > 0 &&
    palette.every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) &&
    isSize(width) &&
    isSize(height) &&
    isCellList(cells, (width as number) * (height as number), palette.length) &&
    cells.some((cell) => cell !== EMPTY)
  );
}

function isCurrent(value: unknown): value is CurrentBeads {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (!isPattern(candidate)) return false;
  const pattern = candidate as unknown as Pattern;
  if (!isCellList(candidate.placed, pattern.cells.length, pattern.palette.length)) return false;
  // Never more beads of a colour on the board than the box held.
  const left = beadsNeeded(pattern);
  for (const cell of candidate.placed) if (cell !== EMPTY) left[cell]--;
  return (
    left.every((count) => count >= 0) &&
    Number.isInteger(candidate.number) &&
    isDifficulty(candidate.difficulty) &&
    Number.isInteger(candidate.mistakes) &&
    (candidate.mistakes as number) >= 0 &&
    (candidate.challenge === undefined || isDayKey(candidate.challenge))
  );
}

function isBoxed(value: unknown): value is BoxedBeads {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isPattern(candidate) &&
    typeof candidate.id === 'string' &&
    typeof candidate.madeAt === 'string' &&
    Number.isInteger(candidate.number) &&
    [1, 2, 3].includes(candidate.stars as number)
  );
}
