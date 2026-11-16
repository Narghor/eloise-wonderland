import { atLevel, type DecorId, type ItemId, type JoinFamily, type MachineId, type ObstacleId, type PenId, type PlaceableId, type TreeId, type Unlock } from './types';

// -----------------------------------------------
// EVERYTHING THAT STANDS ON THE MAP (docs/ferme.md 4.2)
// -----------------------------------------------
// Fields, pens, machines, trees, decorations and the wild share one shape and one code to be bought, placed,
// moved, turned and stored. `size` is the size seen from the front; a quarter turn swaps it.

export type PlaceableKind = 'field' | 'pen' | 'machine' | 'tree' | 'deco' | 'obstacle' | 'mailbox' | 'cart';

export interface Placeable {
  id: PlaceableId;
  name: string;
  kind: PlaceableKind;
  size: [number, number];
  /** Eloisettes; fields and obstacles have their own price rules. */
  price: number;
  unlock: Unlock;
  /** How many may stand on the map at once. */
  maxCount?: number;
  /** Flat on the ground (paths): drawn under everything, walked over. */
  flat?: boolean;
  /** Found first in Gaston's parcels; once in the album, more copies are bought like any decoration. */
  treasure?: boolean;
  /** Joins its neighbours of this family (wearing the same skin, when the family has skins; farmJoins.ts): one tile, never turned. */
  joins?: JoinFamily;
  /** A small decoration may sit on it (farmMap.ts, docs/ferme.md 16): one at a time. */
  carries?: boolean;
  /** Stands on the ground, or sits on a decoration that carries. */
  perches?: boolean;
  /** No longer sold; its id stays for old saves, which turn it into something else on load (farmSave.ts). */
  retired?: boolean;
}

/** Machines and pens: their copies open with the levels (COPY_LEVELS), not with a fixed count. */
const machine = (id: MachineId, name: string, level: number, price: number): Placeable => ({ id, name, kind: 'machine', size: [2, 2], price, unlock: atLevel(level) });
const pen = (id: PenId, name: string, level: number, price: number): Placeable => ({ id, name, kind: 'pen', size: [3, 3], price, unlock: atLevel(level) });
const tree = (id: TreeId, name: string, level: number, price: number, maxCount: number): Placeable => ({ id, name, kind: 'tree', size: [2, 2], price, unlock: atLevel(level), maxCount });
const deco = (id: DecorId, name: string, size: [number, number], price: number, level: number, flat = false): Placeable => ({ id, name, kind: 'deco', size, price, unlock: atLevel(level), ...(flat ? { flat } : {}) });
const treasure = (id: DecorId, name: string, size: [number, number], price: number): Placeable => ({ id, name, kind: 'deco', size, price, unlock: atLevel(1), treasure: true });
const wild = (id: ObstacleId, name: string, size: [number, number]): Placeable => ({ id, name, kind: 'obstacle', size, price: 0, unlock: atLevel(1) });

export const PLACEABLES: readonly Placeable[] = [
  { id: 'field', name: 'Champ', kind: 'field', size: [1, 1], price: 0, unlock: atLevel(1) },
  machine('cookiery', 'Cookiterie', 2, 40),
  machine('mill', 'Moulin', 4, 60),
  machine('bakery', 'Fournil', 4, 120),
  machine('dairy', 'Laiterie', 7, 200),
  machine('refinery', 'Sucrerie', 9, 250),
  machine('press', 'Pressoir', 10, 300),
  machine('jamKitchen', 'Confiturerie', 11, 350),
  machine('spinning', 'Filature', 13, 400),
  machine('candyShop', 'Confiserie', 14, 450),
  machine('sewing', 'Atelier de couture', 18, 600),
  machine('iceCream', 'Glacier', 20, 700),
  machine('soapWorks', 'Savonnerie', 22, 800),
  machine('creperie', 'Crêperie', 25, 900),
  pen('coop', 'Poulailler', 2, 60),
  pen('cowshed', 'Étable', 6, 250),
  pen('sheepfold', 'Bergerie', 8, 350),
  pen('pigsty', 'Porcherie', 10, 450),
  pen('hive', 'Rucher', 12, 400),
  pen('goatShed', 'Chèvrerie', 16, 600),
  pen('duckPond', 'Mare aux canards', 19, 700),
  pen('hutch', 'Clapier', 23, 850),
  tree('hazel', 'Noisetier', 5, 150, 3),
  tree('apple', 'Pommier', 9, 120, 4),
  tree('cherry', 'Cerisier', 18, 300, 4),
  // Decorations (docs/ferme.md 7.6): purely decorative in lot 1.
  { ...deco('fence', 'Barrière en bois', [1, 1], 5, 1), joins: 'fence', carries: true },
  { ...deco('fenceGate', 'Portillon', [1, 1], 15, 1), joins: 'fence' },
  { ...deco('pathDirt', 'Chemin de terre', [1, 1], 2, 1, true), joins: 'pathDirt' },
  { ...deco('hedge', 'Haie', [1, 1], 8, 2), joins: 'hedge' },
  deco('flowersPink', 'Parterre de roses', [1, 1], 12, 2),
  { ...deco('pathStone', 'Chemin pavé', [1, 1], 4, 2, true), joins: 'pathStone' },
  deco('flowersYellow', 'Parterre de boutons-d’or', [1, 1], 12, 3),
  { ...deco('flowerPot', 'Pot de fleurs', [1, 1], 15, 3), perches: true },
  deco('scarecrow', 'Épouvantail', [1, 1], 30, 3),
  deco('flowersWhite', 'Parterre de marguerites', [1, 1], 12, 4),
  { ...deco('bench', 'Banc', [2, 1], 40, 4), carries: true },
  { ...deco('well', 'Puits', [2, 2], 120, 5), carries: true },
  { ...deco('logPile', 'Tas de bûches', [2, 1], 25, 5), carries: true },
  deco('wheelbarrow', 'Brouette', [1, 1], 35, 6),
  // The decorative apple tree became the fruit tree 'apple' (lot 2): placed ones turn into it on load.
  { ...deco('appleTree', 'Pommier', [2, 2], 90, 7), retired: true },
  { ...deco('lantern', 'Lanterne', [1, 1], 60, 8), perches: true },
  { ...deco('birdhouse', 'Nichoir', [1, 1], 45, 9), perches: true },
  deco('pond', 'Petite mare', [2, 2], 150, 10),
  // The wild, cleared one piece at a time (land.ts).
  wild('bush', 'Buisson', [1, 1]),
  wild('stump', 'Souche', [1, 1]),
  wild('rock', 'Rocher', [1, 1]),
  wild('bigRock', 'Gros rocher', [2, 2]),
  // Gaston's mailbox: every farm has one; it moves like the rest but is never sold nor stored.
  { id: 'mailbox', name: 'Boîte aux lettres', kind: 'mailbox', size: [1, 1], price: 0, unlock: atLevel(1), maxCount: 1 },
  // The market cart (docs/ferme.md 18): given at its level, by the gate; it moves like the rest but is never sold nor stored.
  { id: 'marketCart', name: 'Charrette du marché', kind: 'cart', size: [2, 1], price: 0, unlock: atLevel(7), maxCount: 1 },
  // Treasures from the parcels (data/parcels.ts), with the price of each copy bought after the first one found.
  treasure('gnome', 'Nain de jardin', [1, 1], 60),
  treasure('hayBales', 'Bottes de foin', [2, 1], 60),
  treasure('teaTable', 'Table à thé', [1, 1], 60),
  treasure('flowerArch', 'Arche fleurie', [2, 1], 150),
  treasure('swing', 'Balançoire', [2, 2], 150),
  treasure('fountain', 'Fontaine dorée', [2, 2], 400),
];

export const PLACEABLE_IDS = PLACEABLES.map((p) => p.id);

export function placeable(id: PlaceableId): Placeable {
  return PLACEABLES.find((p) => p.id === id)!;
}

/**
 * Levels after a machine's or a pen's own when its 1st, 2nd and 3rd copies open (docs/ferme.md 18-19); copy n costs
 * n times its price.
 */
export const COPY_LEVELS = [0, 6, 12] as const;

/** Machines and pens come in copies (COPY_LEVELS); the rest has a fixed count or none. */
export function hasCopies(p: Placeable): boolean {
  return p.kind === 'machine' || p.kind === 'pen';
}

/** Level from which copy `n` (1, 2, 3) of a machine or a pen may be built, or null past the last one. */
export function copyLevel(p: Placeable, n: number): number | null {
  const after = COPY_LEVELS[n - 1];
  return after === undefined ? null : ('level' in p.unlock ? p.unlock.level : 1) + after;
}

export function isTree(id: PlaceableId): id is TreeId {
  return placeable(id).kind === 'tree';
}

export const DECOR = PLACEABLES.filter((p) => p.kind === 'deco' && !p.treasure && !p.retired);

/**
 * What a tree gives every `minutes`, never replanted: fruit, or Eloisettes (the hazel) worth `orderPercent` of an
 * average order at the farm's level, so a pick never becomes pocket change as the farm grows.
 */
export interface TreeYield {
  minutes: number;
  xp: number;
  gives: { orderPercent: number } | { item: ItemId; count: number };
}

export const TREE_YIELDS: Record<TreeId, TreeYield> = {
  hazel: { minutes: 240, xp: 1, gives: { orderPercent: 35 } },
  apple: { minutes: 180, xp: 2, gives: { item: 'apple', count: 4 } },
  cherry: { minutes: 300, xp: 3, gives: { item: 'cherry', count: 4 } },
};
