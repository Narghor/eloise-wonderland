import type { Reward } from './types';

// -----------------------------------------------
// MEDALS (docs/ferme.md 4.7): bronze, silver, gold on a lifetime counter
// -----------------------------------------------

export interface Medal {
  /** Stable id, kept in the save with the tier reached. */
  id: string;
  name: string;
  /** Counter key, as quests write it. */
  key: string;
  tiers: [number, number, number];
  /** "1 000 cultures récoltées". */
  text: (count: number) => string;
}

export const MEDALS: readonly Medal[] = [
  { id: 'harvest', name: 'Main verte', key: 'harvest', tiers: [100, 1000, 10000], text: (n) => `${fr(n)} cultures récoltées` },
  { id: 'eggs', name: 'Reine du poulailler', key: 'collect:egg', tiers: [50, 500, 5000], text: (n) => `${fr(n)} œufs ramassés` },
  { id: 'milk', name: 'Amie des vaches', key: 'collect:milk', tiers: [10, 100, 1000], text: (n) => `${fr(n)} vaches traites` },
  { id: 'produce', name: 'Artisane', key: 'produce', tiers: [50, 500, 5000], text: (n) => `${fr(n)} produits fabriqués` },
  { id: 'orders', name: 'Bonne voisine', key: 'order', tiers: [10, 100, 1000], text: (n) => `${fr(n)} commandes servies` },
  { id: 'clear', name: 'Défricheuse', key: 'clear', tiers: [10, 50, 150], text: (n) => `${fr(n)} obstacles dégagés` },
  { id: 'decor', name: 'Décoratrice', key: 'place:deco', tiers: [10, 50, 200], text: (n) => `${fr(n)} décos placées` },
  { id: 'hazel', name: 'Cueilleuse', key: 'collect:hazel', tiers: [10, 100, 1000], text: (n) => `${fr(n)} noisetiers cueillis` },
  { id: 'album', name: 'Collectionneuse', key: 'collect:treasure', tiers: [3, 6, 9], text: (n) => `${fr(n)} trésors dans l’album` },
  { id: 'earn', name: 'Petit pécule', key: 'earn', tiers: [1000, 10000, 100000], text: (n) => `${fr(n)} Éloisettes gagnées` },
];

export const MEDAL_TIERS = ['Bronze', 'Argent', 'Or'] as const;

export function medalReward(tier: 0 | 1 | 2): Reward {
  return [
    { nuts: 25, boosters: { fertilizer: 1 } },
    { nuts: 100, boosters: { hourglass: 1 } },
    { nuts: 500, boosters: { wateringCan: 1 } },
  ][tier];
}

function fr(n: number): string {
  return n.toLocaleString('fr-FR');
}
