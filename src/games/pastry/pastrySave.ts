import { readGame, writeGame } from '../../save';
import { isDifficulty, type Difficulty } from '../../difficulty';
import { isDayKey } from '../../daily/daily';
import { isKindId, isTarget, type Clue, type KindId, type Puzzle } from './pastryLogic';

export const GAME_ID = 'pastry';

export interface CurrentCake extends Puzzle {
  number: number;
  difficulty: Difficulty;
  /** Layers stacked so far, bottom first. */
  placed: KindId[];
  /** Every wrong layer ever placed: taking one off does not give it back. */
  mistakes: number;
  /** Day of the daily challenge this cake is. */
  challenge?: string;
}

/** A finished cake in the showcase. */
export interface ShowcaseCake {
  id: string;
  number: number;
  layers: KindId[];
  stars: number;
  madeAt: string;
}

export interface PastrySave {
  difficulty: Difficulty;
  cakesDone: number;
  current: CurrentCake | null;
  showcase: ShowcaseCake[];
}

export function loadPastry(): PastrySave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    difficulty: isDifficulty(data.difficulty) ? data.difficulty : 0,
    cakesDone: Number.isInteger(data.cakesDone) && (data.cakesDone as number) >= 0 ? (data.cakesDone as number) : 0,
    current: isCurrent(data.current) ? data.current : null,
    showcase: Array.isArray(data.showcase) ? data.showcase.filter(isShowcased) : [],
  };
}

export function savePastry(save: PastrySave): void {
  writeGame(GAME_ID, save);
}

// -----------------------------------------------
// VALIDATION
// -----------------------------------------------

function isLayerList(value: unknown, maxLength: number): value is KindId[] {
  return Array.isArray(value) && value.length <= maxLength && value.every(isKindId);
}

function isIndex(value: unknown, length: number): boolean {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < length;
}

function isClue(value: unknown, layers: number): value is Clue {
  if (typeof value !== 'object' || value === null) return false;
  const clue = value as Record<string, unknown>;
  switch (clue.type) {
    case 'count':
      return isTarget(clue.target) && Number.isInteger(clue.count) && (clue.count as number) >= 0 && (clue.count as number) <= layers;
    case 'at':
      return isIndex(clue.index, layers) && isTarget(clue.target);
    case 'under':
      return isTarget(clue.lower) && isTarget(clue.upper);
    case 'never':
      return isTarget(clue.a) && isTarget(clue.b);
    default:
      return false;
  }
}

function isCurrent(value: unknown): value is CurrentCake {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (!isLayerList(candidate.layers, 12) || candidate.layers.length < 2) return false;
  const total = candidate.layers.length;
  return (
    isLayerList(candidate.pool, 12) &&
    candidate.layers.every((kind) => (candidate.pool as KindId[]).includes(kind)) &&
    Array.isArray(candidate.hidden) &&
    candidate.hidden.length === total &&
    candidate.hidden.every((flag) => typeof flag === 'boolean') &&
    Array.isArray(candidate.clues) &&
    candidate.clues.every((clue) => isClue(clue, total)) &&
    Number.isInteger(candidate.number) &&
    isDifficulty(candidate.difficulty) &&
    isLayerList(candidate.placed, total) &&
    Number.isInteger(candidate.mistakes) &&
    (candidate.mistakes as number) >= 0 &&
    (candidate.challenge === undefined || isDayKey(candidate.challenge))
  );
}

function isShowcased(value: unknown): value is ShowcaseCake {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.madeAt === 'string' &&
    Number.isInteger(candidate.number) &&
    [1, 2, 3].includes(candidate.stars as number) &&
    isLayerList(candidate.layers, 12) &&
    candidate.layers.length >= 2
  );
}
