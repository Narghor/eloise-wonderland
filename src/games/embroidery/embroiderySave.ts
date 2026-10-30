import { readGame, writeGame } from '../../save';
import { isDifficulty, type Difficulty } from '../../difficulty';
import { isDayKey } from '../../daily/daily';
import { decodePath, decodeStitched, encodePath, encodeStitched, isPattern, type Pattern, type Work } from './embroideryPattern';

export const GAME_ID = 'embroidery';

export interface CurrentPiece {
  number: number;
  difficulty: Difficulty;
  pattern: Pattern;
  /** encodeStitched of the front. */
  stitched: string;
  /** encodePath of each colour's thread on the back. */
  paths: string[];
  mistakes: number;
  /** Day of the daily challenge this piece is. */
  challenge?: string;
}

/** A finished piece: its front is the pattern itself, its back is redrawn from the paths. */
export interface FinishedPiece {
  id: string;
  number: number;
  difficulty: Difficulty;
  pattern: Pattern;
  paths: string[];
  mistakes: number;
  jumps: number;
  stars: number;
  madeAt: string;
}

export interface EmbroiderySave {
  difficulty: Difficulty;
  piecesDone: number;
  current: CurrentPiece | null;
  gallery: FinishedPiece[];
}

export function loadEmbroidery(): EmbroiderySave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    difficulty: isDifficulty(data.difficulty) ? data.difficulty : 0,
    piecesDone: isCount(data.piecesDone) ? data.piecesDone : 0,
    current: isCurrent(data.current) ? data.current : null,
    gallery: Array.isArray(data.gallery) ? data.gallery.filter(isFinished) : [],
  };
}

export function saveEmbroidery(save: EmbroiderySave): void {
  writeGame(GAME_ID, save);
}

/** Writes the work's front and back into the piece. */
export function storeWork(piece: CurrentPiece, work: Work, mistakes: number): void {
  piece.stitched = encodeStitched(work.stitched);
  piece.paths = work.paths.map(encodePath);
  piece.mistakes = mistakes;
}

/** Decoded paths, or null when one does not fit the pattern. */
export function readPaths(pattern: Pattern, paths: readonly string[]): number[][] | null {
  const decoded = paths.map((path) => decodePath(path, pattern.size * pattern.size));
  return decoded.every((path): path is number[] => path !== null) ? decoded : null;
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function hasValidPaths(pattern: unknown, paths: unknown): boolean {
  return (
    isPattern(pattern) &&
    Array.isArray(paths) &&
    paths.length === pattern.palette.length &&
    paths.every((path) => typeof path === 'string') &&
    readPaths(pattern, paths as string[]) !== null
  );
}

function isCurrent(value: unknown): value is CurrentPiece {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const { pattern } = candidate;
  return (
    isCount(candidate.number) &&
    isDifficulty(candidate.difficulty) &&
    hasValidPaths(pattern, candidate.paths) &&
    typeof candidate.stitched === 'string' &&
    decodeStitched(candidate.stitched, (pattern as Pattern).size ** 2, (pattern as Pattern).palette.length) !== null &&
    isCount(candidate.mistakes) &&
    (candidate.challenge === undefined || isDayKey(candidate.challenge))
  );
}

function isFinished(value: unknown): value is FinishedPiece {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.madeAt === 'string' &&
    isCount(candidate.number) &&
    isDifficulty(candidate.difficulty) &&
    hasValidPaths(candidate.pattern, candidate.paths) &&
    isCount(candidate.mistakes) &&
    isCount(candidate.jumps) &&
    Number.isInteger(candidate.stars) &&
    (candidate.stars as number) >= 0 &&
    (candidate.stars as number) <= 3
  );
}
