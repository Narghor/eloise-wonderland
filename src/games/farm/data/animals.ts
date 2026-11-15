import { atLevel, type AnimalId, type ItemId, type PenId, type Unlock } from './types';

// -----------------------------------------------
// ANIMALS AND THEIR PENS (docs/ferme.md 7.2)
// -----------------------------------------------
// An animal eats one feed, produces after its time, then waits until collected: it never gets sick nor leaves.

export interface Animal {
  id: AnimalId;
  name: string;
  plural: string;
  pen: PenId;
  unlock: Unlock;
  /** Price of the first one; each one more costs a quarter more. */
  price: number;
  feed: ItemId;
  minutes: number;
  product: ItemId;
  xp: number;
}

export const ANIMALS: readonly Animal[] = [
  { id: 'chicken', name: 'Poule', plural: 'Poules', pen: 'coop', unlock: atLevel(2), price: 20, feed: 'chickenFeed', minutes: 20, product: 'egg', xp: 1 },
  { id: 'cow', name: 'Vache', plural: 'Vaches', pen: 'cowshed', unlock: atLevel(6), price: 60, feed: 'cowFeed', minutes: 60, product: 'milk', xp: 3 },
];

export const ANIMAL_IDS = ANIMALS.map((a) => a.id);

export function animal(id: AnimalId): Animal {
  return ANIMALS.find((a) => a.id === id)!;
}

export function animalOfPen(pen: PenId): Animal {
  return ANIMALS.find((a) => a.pen === pen)!;
}

export function animalPrice(a: Animal, owned: number): number {
  return Math.round(a.price * (1 + 0.25 * owned));
}

/** Animals one pen holds. */
export const PEN_CAPACITY: Record<PenId, number> = { coop: 6, cowshed: 5 };
