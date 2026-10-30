import { readGame, writeGame } from '../../save';
import { isDayKey } from '../../daily/daily';

const GAME_ID = 'picross';

export const Mark = { None: 0, Fill: 1, Cross: 2 } as const;
export type Mark = (typeof Mark)[keyof typeof Mark];

export interface InProgress {
  solution: boolean[][];
  marks: Mark[][];
  elapsedMs: number;
  /** Day of the daily challenge this grid is. */
  challenge?: string;
}

export interface PicrossSave {
  /** Key: grid size ("5", "10", "15"). */
  solvedBySize: Record<string, number>;
  current: InProgress | null;
}

export function loadPicross(): PicrossSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    solvedBySize: readCounts(data.solvedBySize),
    current: isInProgress(data.current) ? data.current : null,
  };
}

export function savePicross(save: PicrossSave): void {
  writeGame(GAME_ID, save);
}

export function emptyMarks(size: number): Mark[][] {
  return Array.from({ length: size }, () => new Array<Mark>(size).fill(Mark.None));
}

function readCounts(value: unknown): Record<string, number> {
  const counts: Record<string, number> = {};
  if (typeof value !== 'object' || value === null) return counts;
  for (const [key, count] of Object.entries(value)) {
    if (typeof count === 'number' && count >= 0) counts[key] = Math.floor(count);
  }
  return counts;
}

function isInProgress(value: unknown): value is InProgress {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const size = Array.isArray(candidate.solution) ? candidate.solution.length : 0;
  return (
    size > 0 &&
    typeof candidate.elapsedMs === 'number' &&
    (candidate.challenge === undefined || isDayKey(candidate.challenge)) &&
    isSquareGrid(candidate.solution, size, (cell) => typeof cell === 'boolean') &&
    isSquareGrid(candidate.marks, size, (cell) => cell === Mark.None || cell === Mark.Fill || cell === Mark.Cross)
  );
}

function isSquareGrid(value: unknown, size: number, isCell: (cell: unknown) => boolean): boolean {
  return (
    Array.isArray(value) &&
    value.length === size &&
    value.every((row) => Array.isArray(row) && row.length === size && row.every(isCell))
  );
}
