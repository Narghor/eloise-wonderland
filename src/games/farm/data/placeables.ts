import { atLevel, type DecorId, type MachineId, type ObstacleId, type PenId, type PlaceableId, type TreeId, type Unlock } from './types';

// -----------------------------------------------
// EVERYTHING THAT STANDS ON THE MAP (docs/ferme.md 4.2)
// -----------------------------------------------
// Fields, pens, machines, trees, decorations and the wild share one shape and one code to be bought, placed,
// moved, turned and stored. `size` is the size seen from the front; a quarter turn swaps it.

export type PlaceableKind = 'field' | 'pen' | 'machine' | 'tree' | 'deco' | 'obstacle';

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
}

const machine = (id: MachineId, name: string, level: number, price: number): Placeable => ({ id, name, kind: 'machine', size: [2, 2], price, unlock: atLevel(level), maxCount: 1 });
const pen = (id: PenId, name: string, level: number, price: number): Placeable => ({ id, name, kind: 'pen', size: [3, 3], price, unlock: atLevel(level), maxCount: 1 });
const tree = (id: TreeId, name: string, level: number, price: number, maxCount: number): Placeable => ({ id, name, kind: 'tree', size: [2, 2], price, unlock: atLevel(level), maxCount });
const deco = (id: DecorId, name: string, size: [number, number], price: number, level: number, flat = false): Placeable => ({ id, name, kind: 'deco', size, price, unlock: atLevel(level), ...(flat ? { flat } : {}) });
const wild = (id: ObstacleId, name: string, size: [number, number]): Placeable => ({ id, name, kind: 'obstacle', size, price: 0, unlock: atLevel(1) });

export const PLACEABLES: readonly Placeable[] = [
  { id: 'field', name: 'Champ', kind: 'field', size: [1, 1], price: 0, unlock: atLevel(1) },
  machine('mill', 'Moulin', 2, 40),
  machine('bakery', 'Fournil', 4, 120),
  machine('dairy', 'Laiterie', 7, 200),
  machine('spinning', 'Filature', 14, 400),
  pen('coop', 'Poulailler', 2, 60),
  pen('cowshed', 'Étable', 6, 250),
  tree('hazel', 'Noisetier', 5, 150, 3),
  // Decorations (docs/ferme.md 7.6): purely decorative in lot 1.
  deco('fence', 'Barrière en bois', [1, 1], 5, 1),
  deco('pathDirt', 'Chemin de terre', [1, 1], 2, 1, true),
  deco('hedge', 'Haie', [1, 1], 8, 2),
  deco('flowersPink', 'Parterre de roses', [1, 1], 12, 2),
  deco('pathStone', 'Chemin pavé', [1, 1], 4, 2, true),
  deco('flowersYellow', 'Parterre de boutons-d’or', [1, 1], 12, 3),
  deco('scarecrow', 'Épouvantail', [1, 1], 30, 3),
  deco('flowersWhite', 'Parterre de marguerites', [1, 1], 12, 4),
  deco('bench', 'Banc', [2, 1], 40, 4),
  deco('well', 'Puits', [2, 2], 120, 5),
  deco('logPile', 'Tas de bûches', [2, 1], 25, 5),
  deco('wheelbarrow', 'Brouette', [1, 1], 35, 6),
  deco('appleTree', 'Pommier', [2, 2], 90, 7),
  deco('lantern', 'Lanterne', [1, 1], 60, 8),
  deco('birdhouse', 'Nichoir', [1, 1], 45, 9),
  deco('pond', 'Petite mare', [2, 2], 150, 10),
  // The wild, cleared one piece at a time (land.ts).
  wild('bush', 'Buisson', [1, 1]),
  wild('stump', 'Souche', [1, 1]),
  wild('rock', 'Rocher', [1, 1]),
  wild('bigRock', 'Gros rocher', [2, 2]),
];

export const PLACEABLE_IDS = PLACEABLES.map((p) => p.id);

export function placeable(id: PlaceableId): Placeable {
  return PLACEABLES.find((p) => p.id === id)!;
}

export const DECOR = PLACEABLES.filter((p) => p.kind === 'deco');

/** Hazel tree: Eloisettes every few hours, never replanted. */
export const HAZEL = { minutes: 240, nuts: [5, 10] as const, xp: 1 };
