import { readGame, writeGame } from '../../save';
import { isDifficulty, type Difficulty } from '../../difficulty';
import { isDayKey } from '../../daily/daily';
import { KINDS, isKindId, type Field, type Garden, type KindId, type Plant } from './vegetablesLogic';

// Not 'garden': that block belongs to the creatures' coloring garden.
export const GAME_ID = 'vegetables';

export interface CurrentSeason {
  garden: Garden;
  field: Field;
  /** The field as the day began, for "start the day again". */
  morning: Field;
  number: number;
  difficulty: Difficulty;
  /** Day of the daily challenge this season is. */
  challenge?: string;
}

/** A finished season in the cellar. */
export interface CellarSeason {
  id: string;
  number: number;
  score: number;
  stars: number;
  crops: { kind: KindId; count: number }[];
  madeAt: string;
}

export interface VegetableSave {
  difficulty: Difficulty;
  seasonsDone: number;
  current: CurrentSeason | null;
  cellar: CellarSeason[];
}

export function loadVegetables(): VegetableSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    difficulty: isDifficulty(data.difficulty) ? data.difficulty : 0,
    seasonsDone: isCount(data.seasonsDone) ? data.seasonsDone : 0,
    current: isCurrent(data.current) ? data.current : null,
    cellar: Array.isArray(data.cellar) ? data.cellar.filter(isCellared) : [],
  };
}

export function saveVegetables(save: VegetableSave): void {
  writeGame(GAME_ID, save);
}

// -----------------------------------------------
// VALIDATION
// -----------------------------------------------

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isCountList(value: unknown, length: number): value is number[] {
  return Array.isArray(value) && value.length === length && value.every(isCount);
}

function isGarden(value: unknown): value is Garden {
  if (typeof value !== 'object' || value === null) return false;
  const garden = value as Record<string, unknown>;
  const { width, height, days } = garden;
  if (![width, height, days].every((n) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 30)) return false;
  const cells = (width as number) * (height as number);
  return (
    Array.isArray(garden.shade) &&
    garden.shade.length === cells &&
    garden.shade.every((flag) => typeof flag === 'boolean') &&
    Number.isInteger(garden.tree) &&
    (garden.tree as number) >= 0 &&
    (garden.tree as number) <= 3 &&
    Number.isInteger(garden.actions) &&
    (garden.actions as number) >= 1 &&
    Array.isArray(garden.weather) &&
    garden.weather.length === days &&
    garden.weather.every((weather) => weather === 'sun' || weather === 'rain' || weather === 'frost') &&
    Array.isArray(garden.kinds) &&
    garden.kinds.length >= 1 &&
    garden.kinds.every(isKindId) &&
    isCountList(garden.seeds, garden.kinds.length) &&
    isCountList(garden.targets, 3)
  );
}

function isPlant(value: unknown, kinds: KindId[]): value is Plant {
  if (typeof value !== 'object' || value === null) return false;
  const plant = value as Record<string, unknown>;
  return (
    isKindId(plant.kind) &&
    kinds.includes(plant.kind) &&
    isCount(plant.growth) &&
    (plant.growth as number) <= KINDS[plant.kind].grow * 2 &&
    isCount(plant.moisture) &&
    isCount(plant.dryNights) &&
    isCount(plant.ripeNights) &&
    typeof plant.dead === 'boolean'
  );
}

function isField(value: unknown, garden: Garden): value is Field {
  if (typeof value !== 'object' || value === null) return false;
  const field = value as Record<string, unknown>;
  return (
    Number.isInteger(field.day) &&
    (field.day as number) >= 1 &&
    (field.day as number) <= garden.days + 1 &&
    isCount(field.actionsLeft) &&
    (field.actionsLeft as number) <= garden.actions &&
    Array.isArray(field.cells) &&
    field.cells.length === garden.width * garden.height &&
    field.cells.every((cell) => cell === null || isPlant(cell, garden.kinds)) &&
    isCountList(field.seeds, garden.kinds.length) &&
    isCount(field.score) &&
    isCountList(field.harvested, garden.kinds.length)
  );
}

function isCurrent(value: unknown): value is CurrentSeason {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isGarden(candidate.garden) &&
    isField(candidate.field, candidate.garden) &&
    isField(candidate.morning, candidate.garden) &&
    Number.isInteger(candidate.number) &&
    isDifficulty(candidate.difficulty) &&
    (candidate.challenge === undefined || isDayKey(candidate.challenge))
  );
}

function isCellared(value: unknown): value is CellarSeason {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.madeAt === 'string' &&
    Number.isInteger(candidate.number) &&
    isCount(candidate.score) &&
    [1, 2, 3].includes(candidate.stars as number) &&
    Array.isArray(candidate.crops) &&
    candidate.crops.every((crop) => typeof crop === 'object' && crop !== null && isKindId(crop.kind) && isCount(crop.count))
  );
}
