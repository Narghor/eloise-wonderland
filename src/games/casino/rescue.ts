// -----------------------------------------------
// RESCUE: a rare help after a long wait without a bonus
// -----------------------------------------------
// Pure rules, simulated by tools/casino-stats.mjs; chips.ts keeps each machine's drought.

type Rng = () => number;

/** The help can come once the wait reaches this share of the machine's average wait for its bonus. */
export const RESCUE_AFTER_PERCENT = 130;
export const RESCUE_CHANCE_PER_SPIN = 0.005;
export const RESCUE_MIN_PERCENT = 15;
export const RESCUE_MAX_PERCENT = 30;

/** Spins and net chips lost (stakes minus reel wins) since the machine's last bonus. */
export interface Drought {
  spins: number;
  lost: number;
}

export interface Rescue {
  /** Share of the losses given back, RESCUE_MIN_PERCENT to RESCUE_MAX_PERCENT. */
  percent: number;
  chips: number;
}

export const NO_DROUGHT: Drought = { spins: 0, lost: 0 };

export function rescueAfterSpins(bonusEvery: number): number {
  return Math.round((bonusEvery * RESCUE_AFTER_PERCENT) / 100);
}

/** Low percents come more often than high ones: about 21 % on average. */
export function rollRescuePercent(rng: Rng): number {
  return Math.round(RESCUE_MIN_PERCENT + (RESCUE_MAX_PERCENT - RESCUE_MIN_PERCENT) * rng() ** 1.5);
}

/**
 * One spin on a machine whose bonus comes once every `bonusEvery` spins on average: the drought
 * afterwards and the rescue it brings (null almost always). A bonus or a rescue ends the drought.
 */
export function stepDrought(
  drought: Drought,
  stake: number,
  reelWin: number,
  bonus: boolean,
  bonusEvery: number,
  rng: Rng,
  forceRescue = false, // TEST-BUTTONS
): { drought: Drought; rescue: Rescue | null } {
  if (bonus) return { drought: NO_DROUGHT, rescue: null };
  const next = { spins: drought.spins + 1, lost: drought.lost + stake - reelWin };
  const due = next.spins >= rescueAfterSpins(bonusEvery) && rng() < RESCUE_CHANCE_PER_SPIN;
  if (!due && !forceRescue) return { drought: next, rescue: null }; // TEST-BUTTONS
  const percent = rollRescuePercent(rng);
  // A forced test rescue plays as if the drought had just reached its threshold.
  const lost = forceRescue ? Math.max(next.lost, rescueAfterSpins(bonusEvery) * stake * 0.8) : next.lost; // TEST-BUTTONS
  const chips = Math.floor((Math.max(0, lost) * percent) / 100);
  return { drought: NO_DROUGHT, rescue: chips > 0 ? { percent, chips } : null };
}
