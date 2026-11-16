import { placeable, type Placeable } from './placeables';
import { PRIZES } from './parcels';
import type { PlaceableId, Rarity } from './types';

// -----------------------------------------------
// CHARM: decorating makes the farm better (docs/ferme.md 14)
// -----------------------------------------------
// Every decoration on the map adds charm (stored ones do not). Each step of charm makes Gaston come a little more
// often and the orders pay a little more: decorating is a choice with a return, never needed to progress.
// Charm must reward decorating (MESURE of 15/11, docs/ferme.md 8bis): a bought decoration brings a tenth of its
// price, no more for the cheap ones; a treasure counts for its first copy only, or the parcels alone would fill
// every step. No decoration brings more than a legendary treasure: one showpiece at 10 000 would otherwise fill
// the whole scale at once (docs/ferme.md 23).

const TREASURE_CHARM: Record<Exclude<Rarity, 'common'>, number> = { rare: 15, epic: 30, legendary: 60 };
export const MAX_DECOR_CHARM = TREASURE_CHARM.legendary;

/** Charm one decoration brings: a tenth of its price (a path 0.2, a pond 15) up to MAX_DECOR_CHARM, a fixed amount for a treasure. */
export function charmOf(id: PlaceableId): number {
  const p: Placeable = placeable(id);
  if (p.kind !== 'deco') return 0;
  if (p.treasure) {
    const rarity = (['rare', 'epic', 'legendary'] as const).find((r) => PRIZES[r].some((prize) => prize.kind === 'decor' && prize.decor === id));
    return rarity ? TREASURE_CHARM[rarity] : 10;
  }
  return Math.min(p.price / 10, MAX_DECOR_CHARM);
}

/** Charm of everything standing on a farm, rounded down: each treasure counts once, however many copies stand. */
export function totalCharm(placed: readonly PlaceableId[]): number {
  const seen = new Set<PlaceableId>();
  let total = 0;
  for (const id of placed) {
    if (placeable(id).treasure) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    total += charmOf(id);
  }
  return Math.floor(total + 1e-9);
}

export interface CharmStep {
  min: number;
  name: string;
  /** Orders pay this much more, in percent. */
  orderBonusPercent: number;
  /** Gaston comes every this many minutes. */
  parcelMinutes: number;
  /** Villagers strolling on the farm at once (farmStrollers.ts). */
  strollers: number;
}

export const CHARM_STEPS: readonly CharmStep[] = [
  { min: 0, name: 'Ferme toute simple', orderBonusPercent: 0, parcelMinutes: 240, strollers: 1 },
  { min: 20, name: 'Ferme mignonne', orderBonusPercent: 3, parcelMinutes: 225, strollers: 2 },
  { min: 50, name: 'Ferme coquette', orderBonusPercent: 6, parcelMinutes: 210, strollers: 2 },
  { min: 100, name: 'Ferme charmante', orderBonusPercent: 9, parcelMinutes: 195, strollers: 3 },
  { min: 180, name: 'Ferme ravissante', orderBonusPercent: 12, parcelMinutes: 180, strollers: 3 },
  { min: 300, name: 'Ferme de rêve', orderBonusPercent: 15, parcelMinutes: 165, strollers: 4 },
];

export function charmStep(charm: number): { step: CharmStep; next: CharmStep | null } {
  let index = 0;
  while (index + 1 < CHARM_STEPS.length && charm >= CHARM_STEPS[index + 1].min) index++;
  return { step: CHARM_STEPS[index], next: CHARM_STEPS[index + 1] ?? null };
}
