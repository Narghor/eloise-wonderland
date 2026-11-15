import type { BoosterId } from './types';

// -----------------------------------------------
// BOOSTERS (docs/ferme.md 4.8)
// -----------------------------------------------
// The shop sells them for the site's coins, with a stock per day: that cap is what keeps the farm from being
// bought (measured, docs/ferme.md 8bis). Boosters won in the farm itself are not capped.

export interface Booster {
  id: BoosterId;
  name: string;
  plural: string;
  effect: string;
  /** Site coins. */
  price: number;
  /** Bought in the shop per day at most. */
  dailyStock: number;
  /** Weight when a booster is won in another game of the site. */
  gameWeight: number;
}

export const BOOSTERS: readonly Booster[] = [
  { id: 'fertilizer', name: 'Engrais', plural: 'Engrais', effect: 'Un champ est mûr tout de suite.', price: 5, dailyStock: 5, gameWeight: 50 },
  { id: 'wateringCan', name: 'Arrosoir', plural: 'Arrosoirs', effect: 'Tous les champs : le temps restant est divisé par deux.', price: 25, dailyStock: 1, gameWeight: 10 },
  { id: 'hourglass', name: 'Sablier', plural: 'Sabliers', effect: 'Une machine ou un enclos : une heure de moins sur ce qui est en cours.', price: 15, dailyStock: 3, gameWeight: 25 },
  { id: 'helpingHand', name: 'Coup de main', plural: 'Coups de main', effect: 'Une commande refusée est remplacée tout de suite.', price: 10, dailyStock: 2, gameWeight: 15 },
];

export const BOOSTER_IDS = BOOSTERS.map((b) => b.id);

export function booster(id: BoosterId): Booster {
  return BOOSTERS.find((b) => b.id === id)!;
}

/** A finished level of another game drops a booster one time in GAME_DROP_ODDS, GAME_DROPS_PER_DAY at most. */
export const GAME_DROP_ODDS = 3;
export const GAME_DROPS_PER_DAY = 2;
