import { placeable, type Placeable } from './placeables';
import { PRIZES } from './parcels';
import type { PlaceableId, Rarity } from './types';

// -----------------------------------------------
// CHARM: decorating makes the farm better (docs/ferme.md 14)
// -----------------------------------------------
// Every decoration on the map adds charm (stored ones do not). Each step of charm makes Gaston come a little more
// often and the orders pay a little more: decorating is a choice with a return, never needed to progress.

const TREASURE_CHARM: Record<Exclude<Rarity, 'common'>, number> = { rare: 15, epic: 30, legendary: 60 };

/** Charm a decoration brings: about one point per 10 Eloisettes it costs, much more for a treasure. */
export function charmOf(id: PlaceableId): number {
  const p: Placeable = placeable(id);
  if (p.kind !== 'deco') return 0;
  if (p.treasure) {
    const rarity = (['rare', 'epic', 'legendary'] as const).find((r) => PRIZES[r].some((prize) => prize.kind === 'decor' && prize.decor === id));
    return rarity ? TREASURE_CHARM[rarity] : 10;
  }
  return Math.max(1, Math.round(p.price / 10));
}

export interface CharmStep {
  min: number;
  name: string;
  /** Orders pay this much more, in percent. */
  orderBonusPercent: number;
  /** Gaston comes every this many minutes. */
  parcelMinutes: number;
}

export const CHARM_STEPS: readonly CharmStep[] = [
  { min: 0, name: 'Ferme toute simple', orderBonusPercent: 0, parcelMinutes: 240 },
  { min: 20, name: 'Ferme mignonne', orderBonusPercent: 3, parcelMinutes: 225 },
  { min: 50, name: 'Ferme coquette', orderBonusPercent: 6, parcelMinutes: 210 },
  { min: 100, name: 'Ferme charmante', orderBonusPercent: 9, parcelMinutes: 195 },
  { min: 180, name: 'Ferme ravissante', orderBonusPercent: 12, parcelMinutes: 180 },
  { min: 300, name: 'Ferme de rêve', orderBonusPercent: 15, parcelMinutes: 165 },
];

export function charmStep(charm: number): { step: CharmStep; next: CharmStep | null } {
  let index = 0;
  while (index + 1 < CHARM_STEPS.length && charm >= CHARM_STEPS[index + 1].min) index++;
  return { step: CHARM_STEPS[index], next: CHARM_STEPS[index + 1] ?? null };
}
