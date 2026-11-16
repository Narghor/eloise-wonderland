import { atLevel, type AnimalId, type ItemId, type PenId, type Unlock } from './types';

// -----------------------------------------------
// ANIMALS AND THEIR PENS (docs/ferme.md 7.2)
// -----------------------------------------------
// An animal eats one feed, produces after its time, then waits until collected: it never gets sick nor leaves.

export interface Animal {
  id: AnimalId;
  name: string;
  plural: string;
  /** For the sentences that agree with it: « ta nouvelle poule », « ton nouveau mouton ». */
  feminine: boolean;
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
  { id: 'chicken', feminine: true, name: 'Poule', plural: 'Poules', pen: 'coop', unlock: atLevel(2), price: 20, feed: 'chickenFeed', minutes: 20, product: 'egg', xp: 1 },
  { id: 'cow', feminine: true, name: 'Vache', plural: 'Vaches', pen: 'cowshed', unlock: atLevel(6), price: 60, feed: 'cowFeed', minutes: 60, product: 'milk', xp: 3 },
  { id: 'sheep', feminine: false, name: 'Mouton', plural: 'Moutons', pen: 'sheepfold', unlock: atLevel(8), price: 80, feed: 'sheepFeed', minutes: 120, product: 'wool', xp: 4 },
  { id: 'pig', feminine: false, name: 'Cochon', plural: 'Cochons', pen: 'pigsty', unlock: atLevel(10), price: 100, feed: 'pigFeed', minutes: 180, product: 'truffle', xp: 5 },
  { id: 'bee', feminine: true, name: 'Colonie d’abeilles', plural: 'Colonies d’abeilles', pen: 'hive', unlock: atLevel(12), price: 120, feed: 'beeFeed', minutes: 180, product: 'honey', xp: 5 },
  { id: 'goat', feminine: true, name: 'Chèvre', plural: 'Chèvres', pen: 'goatShed', unlock: atLevel(16), price: 150, feed: 'goatFeed', minutes: 90, product: 'goatMilk', xp: 3 },
  { id: 'duck', feminine: false, name: 'Canard', plural: 'Canards', pen: 'duckPond', unlock: atLevel(19), price: 170, feed: 'duckFeed', minutes: 150, product: 'feather', xp: 4 },
  { id: 'rabbit', feminine: false, name: 'Lapin', plural: 'Lapins', pen: 'hutch', unlock: atLevel(23), price: 220, feed: 'rabbitFeed', minutes: 240, product: 'angora', xp: 6 },
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
export const PEN_CAPACITY: Record<PenId, number> = { coop: 6, cowshed: 5, sheepfold: 5, pigsty: 5, hive: 4, goatShed: 5, duckPond: 6, hutch: 6 };
