import { readGame, writeGame } from '../save';
import { isPixelPicture } from '../pictures/pixelPicture';
import { RARITIES, type Creature, type Rarity } from './creature';

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
  if (!isPixelPicture(value)) return false;
  const candidate = value as unknown as Record<string, unknown>;
  return typeof candidate.bornAt === 'string' && (candidate.rarity === undefined || RARITIES.includes(candidate.rarity as Rarity));
}
