import { readGame, writeGame } from '../save';
import { OUTSIDE, RARITIES, isPaintedChar, type Creature, type Rarity } from './creature';

const GAME_ID = 'garden';

export function loadGarden(): Creature[] {
  const raw = readGame(GAME_ID);
  const creatures = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>).creatures : undefined;
  return Array.isArray(creatures) ? creatures.filter(isCreature) : [];
}

export function findCreature(id: string): Creature | undefined {
  return loadGarden().find((creature) => creature.id === id);
}

export function addCreature(creature: Creature): void {
  saveGarden([...loadGarden(), creature]);
}

export function updateCreature(creature: Creature): void {
  saveGarden(loadGarden().map((existing) => (existing.id === creature.id ? creature : existing)));
}

function saveGarden(creatures: Creature[]): void {
  writeGame(GAME_ID, { creatures });
}

function isCreature(value: unknown): value is Creature {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const { size, palette, pixels, painted } = candidate;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.bornAt !== 'string' ||
    typeof size !== 'number' ||
    !Array.isArray(palette) ||
    !palette.every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color))
  ) {
    return false;
  }
  const isRows = (rows: unknown, isChar: (char: string) => boolean) =>
    Array.isArray(rows) &&
    rows.length === size &&
    rows.every((row) => typeof row === 'string' && row.length === size && [...row].every(isChar));
  const optionalCount = (value: unknown) => value === undefined || (Number.isInteger(value) && (value as number) >= 0);
  return (
    isRows(pixels, (char) => char === OUTSIDE || Number(char) < palette.length) &&
    isRows(painted, (char) => isPaintedChar(char, palette.length)) &&
    optionalCount(candidate.mistakes) &&
    optionalCount(candidate.stars) &&
    (candidate.rarity === undefined || RARITIES.includes(candidate.rarity as Rarity))
  );
}
