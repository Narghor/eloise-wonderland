import type { ItemId } from './types';

// -----------------------------------------------
// WHAT GOES INTO THE BARN
// -----------------------------------------------
// `value` is what the merchant's price and the orders are built on (docs/ferme.md 7):
// a made product is worth its inputs plus 20 to 40 %, long recipes earn more.

export interface Item {
  id: ItemId;
  name: string;
  plural: string;
  value: number;
}

export const ITEMS: readonly Item[] = [
  { id: 'wheat', name: 'Blé', plural: 'Blés', value: 1 },
  { id: 'corn', name: 'Maïs', plural: 'Maïs', value: 3 },
  { id: 'carrot', name: 'Carotte', plural: 'Carottes', value: 4 },
  { id: 'tomato', name: 'Tomate', plural: 'Tomates', value: 8 },
  { id: 'strawberry', name: 'Fraise', plural: 'Fraises', value: 12 },
  { id: 'sunflower', name: 'Tournesol', plural: 'Tournesols', value: 18 },
  { id: 'pumpkin', name: 'Citrouille', plural: 'Citrouilles', value: 28 },
  { id: 'cotton', name: 'Coton', plural: 'Cotons', value: 40 },
  { id: 'egg', name: 'Œuf', plural: 'Œufs', value: 6 },
  { id: 'milk', name: 'Lait', plural: 'Laits', value: 14 },
  { id: 'chickenFeed', name: 'Aliment pour poules', plural: 'Aliments pour poules', value: 2 },
  { id: 'cowFeed', name: 'Aliment pour vaches', plural: 'Aliments pour vaches', value: 4 },
  { id: 'flour', name: 'Farine', plural: 'Farines', value: 4 },
  { id: 'bread', name: 'Pain', plural: 'Pains', value: 11 },
  { id: 'carrotPie', name: 'Tarte aux carottes', plural: 'Tartes aux carottes', value: 24 },
  { id: 'strawberryCake', name: 'Gâteau aux fraises', plural: 'Gâteaux aux fraises', value: 95 },
  { id: 'pumpkinPie', name: 'Tarte à la citrouille', plural: 'Tartes à la citrouille', value: 100 },
  { id: 'cream', name: 'Crème', plural: 'Crèmes', value: 18 },
  { id: 'butter', name: 'Beurre', plural: 'Beurres', value: 36 },
  { id: 'cheese', name: 'Fromage', plural: 'Fromages', value: 59 },
  { id: 'thread', name: 'Fil', plural: 'Fils', value: 104 },
  { id: 'fabric', name: 'Tissu', plural: 'Tissus', value: 420 },
];

export const ITEM_IDS = ITEMS.map((i) => i.id);

export function item(id: ItemId): Item {
  return ITEMS.find((i) => i.id === id)!;
}

/** "3 blés", "1 œuf". */
export function itemCount(id: ItemId, count: number): string {
  const i = item(id);
  return `${count} ${(count > 1 ? i.plural : i.name).toLowerCase()}`;
}
