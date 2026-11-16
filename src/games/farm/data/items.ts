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
  { id: 'chickenFeed', name: 'Cookie pour poules', plural: 'Cookies pour poules', value: 2 },
  { id: 'cowFeed', name: 'Cookie pour vaches', plural: 'Cookies pour vaches', value: 4 },
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
  // Lot 2 (docs/ferme.md 18).
  { id: 'beet', name: 'Betterave', plural: 'Betteraves', value: 6 },
  { id: 'blueberry', name: 'Myrtille', plural: 'Myrtilles', value: 15 },
  { id: 'lavender', name: 'Lavande', plural: 'Lavandes', value: 34 },
  { id: 'sheepFeed', name: 'Cookie pour moutons', plural: 'Cookies pour moutons', value: 4 },
  { id: 'pigFeed', name: 'Cookie pour cochons', plural: 'Cookies pour cochons', value: 5 },
  { id: 'beeFeed', name: 'Cookie pour abeilles', plural: 'Cookies pour abeilles', value: 6 },
  { id: 'goatFeed', name: 'Cookie pour chèvres', plural: 'Cookies pour chèvres', value: 6 },
  { id: 'duckFeed', name: 'Cookie pour canards', plural: 'Cookies pour canards', value: 4 },
  { id: 'rabbitFeed', name: 'Cookie pour lapins', plural: 'Cookies pour lapins', value: 9 },
  { id: 'wool', name: 'Laine', plural: 'Laines', value: 30 },
  { id: 'truffle', name: 'Truffe', plural: 'Truffes', value: 45 },
  { id: 'honey', name: 'Pot de miel', plural: 'Pots de miel', value: 40 },
  { id: 'goatMilk', name: 'Lait de chèvre', plural: 'Laits de chèvre', value: 24 },
  { id: 'feather', name: 'Plume', plural: 'Plumes', value: 30 },
  { id: 'angora', name: 'Laine angora', plural: 'Laines angora', value: 55 },
  { id: 'sugar', name: 'Sucre', plural: 'Sucres', value: 16 },
  { id: 'carrotJuice', name: 'Jus de carotte', plural: 'Jus de carotte', value: 21 },
  { id: 'tomatoJuice', name: 'Jus de tomate', plural: 'Jus de tomate', value: 32 },
  { id: 'strawberryJuice', name: 'Jus de fraise', plural: 'Jus de fraise', value: 48 },
  { id: 'strawberryJam', name: 'Confiture de fraises', plural: 'Confitures de fraises', value: 70 },
  { id: 'blueberryJam', name: 'Confiture de myrtilles', plural: 'Confitures de myrtilles', value: 82 },
  { id: 'yarn', name: 'Pelote de laine', plural: 'Pelotes de laine', value: 78 },
  { id: 'angoraYarn', name: 'Pelote angora', plural: 'Pelotes angora', value: 145 },
  { id: 'honeyCandy', name: 'Bonbon au miel', plural: 'Bonbons au miel', value: 73 },
  { id: 'lollipop', name: 'Sucette à la fraise', plural: 'Sucettes à la fraise', value: 72 },
  { id: 'nougat', name: 'Nougat', plural: 'Nougats', value: 145 },
  { id: 'giftBasket', name: 'Panier gourmand', plural: 'Paniers gourmands', value: 420 },
  { id: 'goatCheese', name: 'Fromage de chèvre', plural: 'Fromages de chèvre', value: 98 },
  { id: 'blueberryPie', name: 'Tarte aux myrtilles', plural: 'Tartes aux myrtilles', value: 122 },
  { id: 'pizza', name: 'Pizza', plural: 'Pizzas', value: 122 },
  { id: 'layerCake', name: 'Gâteau à étages', plural: 'Gâteaux à étages', value: 245 },
  { id: 'scarf', name: 'Écharpe', plural: 'Écharpes', value: 205 },
  { id: 'cushion', name: 'Coussin', plural: 'Coussins', value: 670 },
  { id: 'sweater', name: 'Pull', plural: 'Pulls', value: 450 },
  { id: 'plushie', name: 'Doudou lapin', plural: 'Doudous lapin', value: 950 },
  { id: 'strawberryIce', name: 'Glace à la fraise', plural: 'Glaces à la fraise', value: 78 },
  { id: 'honeyIce', name: 'Glace au miel', plural: 'Glaces au miel', value: 110 },
  { id: 'blueberryIce', name: 'Glace à la myrtille', plural: 'Glaces à la myrtille', value: 86 },
  { id: 'lavenderSoap', name: 'Savon à la lavande', plural: 'Savons à la lavande', value: 125 },
  { id: 'honeyCandle', name: 'Bougie au miel', plural: 'Bougies au miel', value: 155 },
  { id: 'crepe', name: 'Crêpe', plural: 'Crêpes', value: 45 },
  { id: 'jamCrepe', name: 'Crêpe à la confiture', plural: 'Crêpes à la confiture', value: 135 },
  { id: 'honeyCrepe', name: 'Crêpe au miel', plural: 'Crêpes au miel', value: 98 },
  { id: 'truffleGalette', name: 'Galette aux truffes', plural: 'Galettes aux truffes', value: 165 },
  // Fruit trees.
  { id: 'apple', name: 'Pomme', plural: 'Pommes', value: 10 },
  { id: 'cherry', name: 'Cerise', plural: 'Cerises', value: 20 },
  { id: 'appleJuice', name: 'Jus de pomme', plural: 'Jus de pomme', value: 40 },
  { id: 'applePie', name: 'Tarte aux pommes', plural: 'Tartes aux pommes', value: 55 },
  { id: 'cherryJam', name: 'Confiture de cerises', plural: 'Confitures de cerises', value: 100 },
  { id: 'cherryIce', name: 'Glace à la cerise', plural: 'Glaces à la cerise', value: 95 },
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
