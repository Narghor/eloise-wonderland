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
  // A batch of cookies feeds a whole pen (docs/ferme.md 17-18).
  { item: 'chickenFeed', machine: 'cookiery', unlock: atLevel(2), minutes: 10, inputs: { wheat: 4, corn: 2 }, count: 6, xp: 1 },
  { item: 'cowFeed', machine: 'cookiery', unlock: atLevel(6), minutes: 15, inputs: { corn: 3, carrot: 2 }, count: 5, xp: 1 },
  { item: 'sheepFeed', machine: 'cookiery', unlock: atLevel(8), minutes: 15, inputs: { corn: 2, beet: 3 }, count: 5, xp: 1 },
  { item: 'pigFeed', machine: 'cookiery', unlock: atLevel(10), minutes: 20, inputs: { beet: 2, carrot: 3 }, count: 5, xp: 1 },
  { item: 'beeFeed', machine: 'cookiery', unlock: atLevel(12), minutes: 20, inputs: { sunflower: 1, wheat: 3 }, count: 4, xp: 1 },
  { item: 'goatFeed', machine: 'cookiery', unlock: atLevel(16), minutes: 20, inputs: { carrot: 3, tomato: 2 }, count: 5, xp: 1 },
  { item: 'duckFeed', machine: 'cookiery', unlock: atLevel(19), minutes: 25, inputs: { wheat: 4, blueberry: 1 }, count: 6, xp: 1 },
  { item: 'rabbitFeed', machine: 'cookiery', unlock: atLevel(23), minutes: 25, inputs: { carrot: 4, lavender: 1 }, count: 6, xp: 1 },
  { item: 'flour', machine: 'mill', unlock: atLevel(4), minutes: 10, inputs: { wheat: 3 }, count: 1, xp: 1 },
  { item: 'bread', machine: 'bakery', unlock: atLevel(4), minutes: 30, inputs: { flour: 2 }, count: 1, xp: 3 },
  { item: 'carrotPie', machine: 'bakery', unlock: atLevel(5), minutes: 45, inputs: { flour: 1, carrot: 2, egg: 1 }, count: 1, xp: 4 },
  { item: 'strawberryCake', machine: 'bakery', unlock: atLevel(9), minutes: 120, inputs: { flour: 1, egg: 2, strawberry: 3, cream: 1 }, count: 1, xp: 9 },
  { item: 'applePie', machine: 'bakery', unlock: atLevel(9), minutes: 60, inputs: { flour: 1, apple: 3, egg: 1 }, count: 1, xp: 5 },
  { item: 'pumpkinPie', machine: 'bakery', unlock: atLevel(11), minutes: 180, inputs: { flour: 1, pumpkin: 1, egg: 1, butter: 1 }, count: 1, xp: 10 },
  { item: 'blueberryPie', machine: 'bakery', unlock: atLevel(17), minutes: 150, inputs: { flour: 1, blueberry: 3, egg: 1, butter: 1 }, count: 1, xp: 10 },
  { item: 'pizza', machine: 'bakery', unlock: atLevel(27), minutes: 90, inputs: { flour: 2, tomato: 3, cheese: 1 }, count: 1, xp: 9 },
  { item: 'layerCake', machine: 'bakery', unlock: atLevel(29), minutes: 300, inputs: { flour: 3, egg: 4, cream: 2, strawberryJam: 1, sugar: 2 }, count: 1, xp: 17 },
  { item: 'cream', machine: 'dairy', unlock: atLevel(7), minutes: 20, inputs: { milk: 1 }, count: 1, xp: 2 },
  { item: 'butter', machine: 'dairy', unlock: atLevel(7), minutes: 30, inputs: { milk: 2 }, count: 1, xp: 3 },
  { item: 'cheese', machine: 'dairy', unlock: atLevel(12), minutes: 120, inputs: { milk: 3 }, count: 1, xp: 6 },
  { item: 'goatCheese', machine: 'dairy', unlock: atLevel(16), minutes: 120, inputs: { goatMilk: 3 }, count: 1, xp: 8 },
  { item: 'yarn', machine: 'spinning', unlock: atLevel(13), minutes: 40, inputs: { wool: 2 }, count: 1, xp: 5 },
  { item: 'thread', machine: 'spinning', unlock: atLevel(14), minutes: 60, inputs: { cotton: 2 }, count: 1, xp: 6 },
  { item: 'fabric', machine: 'spinning', unlock: atLevel(15), minutes: 180, inputs: { thread: 3 }, count: 1, xp: 15 },
  { item: 'angoraYarn', machine: 'spinning', unlock: atLevel(24), minutes: 60, inputs: { angora: 2 }, count: 1, xp: 9 },
  // Lot 2 machines (docs/ferme.md 18).
  { item: 'sugar', machine: 'refinery', unlock: atLevel(9), minutes: 20, inputs: { beet: 2 }, count: 1, xp: 2 },
  { item: 'carrotJuice', machine: 'press', unlock: atLevel(10), minutes: 20, inputs: { carrot: 4 }, count: 1, xp: 2 },
  { item: 'tomatoJuice', machine: 'press', unlock: atLevel(10), minutes: 30, inputs: { tomato: 3 }, count: 1, xp: 3 },
  { item: 'appleJuice', machine: 'press', unlock: atLevel(10), minutes: 30, inputs: { apple: 3 }, count: 1, xp: 3 },
  { item: 'strawberryJuice', machine: 'press', unlock: atLevel(15), minutes: 45, inputs: { strawberry: 3 }, count: 1, xp: 4 },
  { item: 'strawberryJam', machine: 'jamKitchen', unlock: atLevel(11), minutes: 60, inputs: { strawberry: 3, sugar: 1 }, count: 1, xp: 6 },
  { item: 'blueberryJam', machine: 'jamKitchen', unlock: atLevel(17), minutes: 90, inputs: { blueberry: 3, sugar: 1 }, count: 1, xp: 7 },
  { item: 'cherryJam', machine: 'jamKitchen', unlock: atLevel(18), minutes: 90, inputs: { cherry: 3, sugar: 1 }, count: 1, xp: 8 },
  { item: 'honeyCandy', machine: 'candyShop', unlock: atLevel(14), minutes: 40, inputs: { honey: 1, sugar: 1 }, count: 1, xp: 6 },
  { item: 'lollipop', machine: 'candyShop', unlock: atLevel(15), minutes: 30, inputs: { sugar: 2, strawberry: 2 }, count: 1, xp: 5 },
  { item: 'nougat', machine: 'candyShop', unlock: atLevel(24), minutes: 90, inputs: { honey: 2, sugar: 1, egg: 2 }, count: 1, xp: 11 },
  { item: 'giftBasket', machine: 'candyShop', unlock: atLevel(30), minutes: 240, inputs: { honeyCandy: 2, strawberryJam: 1, goatCheese: 1 }, count: 1, xp: 22 },
  { item: 'scarf', machine: 'sewing', unlock: atLevel(18), minutes: 90, inputs: { yarn: 2 }, count: 1, xp: 12 },
  { item: 'cushion', machine: 'sewing', unlock: atLevel(19), minutes: 180, inputs: { fabric: 1, feather: 3 }, count: 1, xp: 20 },
  { item: 'sweater', machine: 'sewing', unlock: atLevel(20), minutes: 180, inputs: { yarn: 3, thread: 1 }, count: 1, xp: 18 },
  { item: 'plushie', machine: 'sewing', unlock: atLevel(26), minutes: 240, inputs: { angoraYarn: 2, fabric: 1 }, count: 1, xp: 28 },
  { item: 'strawberryIce', machine: 'iceCream', unlock: atLevel(20), minutes: 45, inputs: { cream: 1, sugar: 1, strawberry: 2 }, count: 1, xp: 6 },
  { item: 'cherryIce', machine: 'iceCream', unlock: atLevel(20), minutes: 60, inputs: { cream: 1, sugar: 1, cherry: 2 }, count: 1, xp: 7 },
  { item: 'honeyIce', machine: 'iceCream', unlock: atLevel(21), minutes: 60, inputs: { cream: 1, honey: 1, goatMilk: 1 }, count: 1, xp: 8 },
  { item: 'blueberryIce', machine: 'iceCream', unlock: atLevel(22), minutes: 60, inputs: { cream: 1, sugar: 1, blueberry: 2 }, count: 1, xp: 7 },
  { item: 'lavenderSoap', machine: 'soapWorks', unlock: atLevel(22), minutes: 90, inputs: { lavender: 2, goatMilk: 1 }, count: 1, xp: 9 },
  { item: 'honeyCandle', machine: 'soapWorks', unlock: atLevel(24), minutes: 120, inputs: { honey: 2, lavender: 1 }, count: 1, xp: 11 },
  { item: 'crepe', machine: 'creperie', unlock: atLevel(25), minutes: 30, inputs: { flour: 2, egg: 2, milk: 1 }, count: 1, xp: 4 },
  { item: 'jamCrepe', machine: 'creperie', unlock: atLevel(26), minutes: 45, inputs: { flour: 2, egg: 2, milk: 1, strawberryJam: 1 }, count: 1, xp: 9 },
  { item: 'honeyCrepe', machine: 'creperie', unlock: atLevel(27), minutes: 45, inputs: { flour: 2, egg: 2, milk: 1, honey: 1 }, count: 1, xp: 7 },
  { item: 'truffleGalette', machine: 'creperie', unlock: atLevel(28), minutes: 60, inputs: { flour: 2, egg: 2, truffle: 1, cheese: 1 }, count: 1, xp: 11 },
];

export function recipe(item: ItemId): Recipe | undefined {
  return RECIPES.find((r) => r.item === item);
}

/** Feeds are made for the animals, never asked by orders. */
export const FEEDS: readonly ItemId[] = ['chickenFeed', 'cowFeed', 'sheepFeed', 'pigFeed', 'beeFeed', 'goatFeed', 'duckFeed', 'rabbitFeed'];

/** Recipes waiting at once in a new machine; more places are bought, up to MAX_QUEUE. */
export const STARTING_QUEUE = 2;
export const MAX_QUEUE = 6;

/** Price of the queue place after `slots` (3rd, 4th, 5th, 6th). */
export function queueSlotPrice(slots: number): number | null {
  return [50, 100, 200, 400][slots - STARTING_QUEUE] ?? null;
}
