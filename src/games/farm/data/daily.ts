import type { PlaceableId, Reward } from './types';

// -----------------------------------------------
// THE SMALL TASKS OF THE DAY (docs/ferme.md 7.10)
// -----------------------------------------------
// Three drawn each day among the templates the farm can do; missing a day costs nothing.

export interface DailyTemplate {
  id: string;
  /** Counter key, as quests write it. */
  key: string;
  count: (level: number) => number;
  text: (count: number) => string;
  /** Level needed, and what must stand on the map for the task to be doable. */
  level: number;
  needs?: PlaceableId;
  /** Only while obstacles are left to clear. */
  needsObstacles?: number;
}

export const DAILY_TEMPLATES: readonly DailyTemplate[] = [
  { id: 'harvest', key: 'harvest', level: 1, count: (l) => 10 + 2 * l, text: (n) => `Récolter ${n} cultures` },
  { id: 'sow', key: 'sow', level: 1, count: (l) => 8 + 2 * l, text: (n) => `Semer ${n} champs` },
  { id: 'orders', key: 'order', level: 2, count: (l) => 2 + Math.floor(l / 5), text: (n) => `Servir ${n} commandes` },
  { id: 'produce', key: 'produce', level: 2, needs: 'mill', count: (l) => 3 + Math.floor(l / 3), text: (n) => `Fabriquer ${n} produits` },
  { id: 'eggs', key: 'collect:egg', level: 2, needs: 'coop', count: () => 6, text: (n) => `Ramasser ${n} œufs` },
  { id: 'feed', key: 'feed', level: 2, needs: 'coop', count: () => 6, text: (n) => `Nourrir ${n} animaux` },
  { id: 'clear', key: 'clear', level: 2, needsObstacles: 2, count: () => 2, text: (n) => `Dégager ${n} obstacles` },
  { id: 'bread', key: 'produce:bread', level: 4, needs: 'bakery', count: () => 2, text: (n) => `Cuire ${n} pains` },
  { id: 'milk', key: 'collect:milk', level: 6, needs: 'cowshed', count: () => 4, text: (n) => `Ramasser ${n} laits` },
];

export const DAILY_TASKS = 3;

/** Each task done, then the chest once the three are. */
export function dailyTaskReward(level: number): Reward {
  return { nuts: 8 * level, xp: 4 * level, boosters: { fertilizer: 1 } };
}

export function dailyChestReward(level: number): Reward {
  return { nuts: 10 * level, parcels: 1, boosters: { hourglass: 1 } };
}
