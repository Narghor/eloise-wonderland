import { atLevel, type ItemId, type MachineId, type Unlock } from './types';

// -----------------------------------------------
// MACHINES AND THEIR RECIPES (docs/ferme.md 7.3)
// -----------------------------------------------

export interface Recipe {
  /** What comes out; one recipe per item. */
  item: ItemId;
  machine: MachineId;
  unlock: Unlock;
  minutes: number;
  inputs: Partial<Record<ItemId, number>>;
  count: number;
  xp: number;
}

export const RECIPES: readonly Recipe[] = [
  { item: 'chickenFeed', machine: 'mill', unlock: atLevel(2), minutes: 5, inputs: { wheat: 2, corn: 1 }, count: 3, xp: 1 },
  { item: 'flour', machine: 'mill', unlock: atLevel(4), minutes: 10, inputs: { wheat: 3 }, count: 1, xp: 1 },
  { item: 'cowFeed', machine: 'mill', unlock: atLevel(6), minutes: 10, inputs: { corn: 2, carrot: 1 }, count: 3, xp: 1 },
  { item: 'bread', machine: 'bakery', unlock: atLevel(4), minutes: 30, inputs: { flour: 2 }, count: 1, xp: 3 },
  { item: 'carrotPie', machine: 'bakery', unlock: atLevel(5), minutes: 45, inputs: { flour: 1, carrot: 2, egg: 1 }, count: 1, xp: 4 },
  { item: 'strawberryCake', machine: 'bakery', unlock: atLevel(9), minutes: 120, inputs: { flour: 1, egg: 2, strawberry: 3, cream: 1 }, count: 1, xp: 9 },
  { item: 'pumpkinPie', machine: 'bakery', unlock: atLevel(11), minutes: 180, inputs: { flour: 1, pumpkin: 1, egg: 1, butter: 1 }, count: 1, xp: 10 },
  { item: 'cream', machine: 'dairy', unlock: atLevel(7), minutes: 20, inputs: { milk: 1 }, count: 1, xp: 2 },
  { item: 'butter', machine: 'dairy', unlock: atLevel(7), minutes: 30, inputs: { milk: 2 }, count: 1, xp: 3 },
  { item: 'cheese', machine: 'dairy', unlock: atLevel(12), minutes: 120, inputs: { milk: 3 }, count: 1, xp: 6 },
  { item: 'thread', machine: 'spinning', unlock: atLevel(14), minutes: 60, inputs: { cotton: 2 }, count: 1, xp: 6 },
  { item: 'fabric', machine: 'spinning', unlock: atLevel(15), minutes: 180, inputs: { thread: 3 }, count: 1, xp: 15 },
];

export function recipe(item: ItemId): Recipe | undefined {
  return RECIPES.find((r) => r.item === item);
}

/** Feeds are made for the animals, never asked by orders. */
export const FEEDS: readonly ItemId[] = ['chickenFeed', 'cowFeed'];

/** Recipes waiting at once in a new machine; more places are bought, up to MAX_QUEUE. */
export const STARTING_QUEUE = 2;
export const MAX_QUEUE = 6;

/** Price of the queue place after `slots` (3rd, 4th, 5th, 6th). */
export function queueSlotPrice(slots: number): number | null {
  return [50, 100, 200, 400][slots - STARTING_QUEUE] ?? null;
}
