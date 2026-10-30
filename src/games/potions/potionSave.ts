import { readGame, writeGame } from '../../save';
import { loadDifficulty, type Difficulty } from '../../difficulty';
import { CAPACITY, POTION_COLORS, POTION_LEVELS, type Vials } from './potionBoard';

const GAME_ID = 'potions';

export interface CurrentPotions {
  initial: Vials;
  vials: Vials;
  moves: number;
  par: number;
}

export interface PotionSave {
  difficulty: Difficulty;
  /** Levels sorted so far. */
  done: number;
  /** Always of the chosen difficulty: changing it starts a new level. */
  current: CurrentPotions | null;
}

export function loadPotions(): PotionSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  // Saves made before difficulties stored the next level to play.
  const oldLevel = Number.isInteger(data.level) ? (data.level as number) : undefined;
  return {
    difficulty: loadDifficulty(data.difficulty, POTION_LEVELS, oldLevel),
    done: Number.isInteger(data.done) ? (data.done as number) : Math.max(0, (oldLevel ?? 1) - 1),
    current: isCurrent(data.current) ? data.current : null,
  };
}

export function savePotions(save: PotionSave): void {
  writeGame(GAME_ID, save);
}

function isVials(value: unknown): value is Vials {
  return (
    Array.isArray(value) &&
    value.every((vial) => typeof vial === 'string' && vial.length <= CAPACITY && [...vial].every((letter) => letter in POTION_COLORS))
  );
}

function isCurrent(value: unknown): value is CurrentPotions {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isVials(candidate.initial) &&
    isVials(candidate.vials) &&
    candidate.initial.length === candidate.vials.length &&
    Number.isInteger(candidate.moves) &&
    Number.isInteger(candidate.par)
  );
}
