import { readGame, writeGame } from '../../save';
import { isDifficulty, type Difficulty } from '../../difficulty';
import { isDayKey } from '../../daily/daily';
import { isKnot, knotCount, type Knot, type Pattern } from './braceletLogic';

export const GAME_ID = 'bracelets';

export interface CurrentBracelet extends Pattern {
  number: number;
  difficulty: Difficulty;
  model: Knot[];
  /** Knots made so far, in order. */
  knots: Knot[];
  /** Every wrong knot ever made: undoing one does not give it back. */
  mistakes: number;
  /** Day of the daily challenge this bracelet is. */
  challenge?: string;
}

/** A finished bracelet keeps its knots: the box redraws it by knotting it again. */
export interface BoxedBracelet extends Pattern {
  id: string;
  number: number;
  knots: Knot[];
  stars: number;
  madeAt: string;
}

export interface BraceletSave {
  difficulty: Difficulty;
  braceletsDone: number;
  current: CurrentBracelet | null;
  box: BoxedBracelet[];
}

export function loadBracelets(): BraceletSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    difficulty: isDifficulty(data.difficulty) ? data.difficulty : 0,
    braceletsDone: Number.isInteger(data.braceletsDone) && (data.braceletsDone as number) >= 0 ? (data.braceletsDone as number) : 0,
    current: isCurrent(data.current) ? data.current : null,
    box: Array.isArray(data.box) ? data.box.filter(isBoxed) : [],
  };
}

export function saveBracelets(save: BraceletSave): void {
  writeGame(GAME_ID, save);
}

// -----------------------------------------------
// VALIDATION
// -----------------------------------------------

function isPattern(candidate: Record<string, unknown>): boolean {
  const { palette, strings, rows } = candidate;
  return (
    Array.isArray(palette) &&
    palette.length > 0 &&
    palette.every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) &&
    Array.isArray(strings) &&
    strings.length >= 4 &&
    strings.length <= 12 &&
    strings.length % 2 === 0 &&
    strings.every((color) => Number.isInteger(color) && color >= 0 && color < palette.length) &&
    Number.isInteger(rows) &&
    (rows as number) >= 1 &&
    (rows as number) <= 40
  );
}

function isKnotList(value: unknown, maxLength: number): value is Knot[] {
  return Array.isArray(value) && value.length <= maxLength && value.every(isKnot);
}

function isCurrent(value: unknown): value is CurrentBracelet {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (!isPattern(candidate)) return false;
  const total = knotCount(candidate as unknown as Pattern);
  return (
    Number.isInteger(candidate.number) &&
    isDifficulty(candidate.difficulty) &&
    isKnotList(candidate.model, total) &&
    candidate.model.length === total &&
    isKnotList(candidate.knots, total - 1) &&
    Number.isInteger(candidate.mistakes) &&
    (candidate.mistakes as number) >= 0 &&
    (candidate.challenge === undefined || isDayKey(candidate.challenge))
  );
}

function isBoxed(value: unknown): value is BoxedBracelet {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (!isPattern(candidate)) return false;
  const total = knotCount(candidate as unknown as Pattern);
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.madeAt === 'string' &&
    Number.isInteger(candidate.number) &&
    [1, 2, 3].includes(candidate.stars as number) &&
    isKnotList(candidate.knots, total) &&
    candidate.knots.length === total
  );
}
