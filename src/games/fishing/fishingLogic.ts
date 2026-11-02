import { FISH, RARITY_PRICES, RARITY_WEIGHTS, type BaitId, type Fish, type Season, type TimeOfDay } from './fishingData';

// -----------------------------------------------
// WHAT BITES, AND HOW HARD IT FIGHTS
// -----------------------------------------------

export type Rng = () => number;

export function timeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 18) return 'day';
  if (hour >= 18 && hour < 21) return 'dusk';
  return 'night';
}

export function seasonOf(date = new Date()): Season {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

/** Can this fish bite now, with a cast this far? */
export function canBite(fish: Fish, time: TimeOfDay, season: Season, distance: number): boolean {
  return (!fish.times || fish.times.includes(time)) && (!fish.season || fish.season === season) && distance >= (fish.far ?? 0);
}

/** Draws the fish that bites. A far cast makes rare fish a little likelier; so does the bait. */
export function drawFish(time: TimeOfDay, season: Season, distance: number, bait: BaitId = 'worm', rng: Rng = Math.random): Fish {
  const options = FISH.filter((f) => canBite(f, time, season, distance));
  const baitBoost = (f: Fish) =>
    bait === 'fly' && f.rarity >= 3 ? 2.5 : bait === 'firefly' && f.times?.some((t) => t === 'dusk' || t === 'night') ? 3 : 1;
  const weight = (f: Fish) => RARITY_WEIGHTS[f.rarity] * (f.rarity >= 3 ? 1 + distance : 1) * baitBoost(f);
  let roll = rng() * options.reduce((sum, f) => sum + weight(f), 0);
  for (const f of options) {
    roll -= weight(f);
    if (roll < 0) return f;
  }
  return options[0];
}

/** A size within the fish's range, big ones rarer; bread makes them big. */
export function drawSize(fish: Fish, bait: BaitId = 'worm', rng: Rng = Math.random): number {
  const [min, max] = fish.size;
  return Math.round(min + (max - min) * rng() ** (bait === 'bread' ? 0.6 : 1.6));
}

// -----------------------------------------------
// STREAK: catches in a row raise the price
// -----------------------------------------------

/** Price multiplier for the n-th catch in a row: x1.5 from 5, x2 from 10. */
export function streakBonus(streak: number): number {
  return streak >= 10 ? 2 : streak >= 5 ? 1.5 : 1;
}

// -----------------------------------------------
// DAILY CHALLENGE
// -----------------------------------------------

export interface FishingChallenge {
  text: string;
  goal: number;
  reward: number;
  /** Does this catch count toward it? */
  counts(fish: Fish, size: number): boolean;
}

/** Today's challenge, the same all day: picked from the date. */
export function challengeOf(day: string, season: Season): FishingChallenge {
  const seed = [...day].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const common = FISH.filter((f) => f.rarity <= 2 && !f.times && (!f.season || f.season === season));
  const target = common[seed % common.length];
  const big = Math.round(target.size[0] + (target.size[1] - target.size[0]) * 0.6);
  const kinds: FishingChallenge[] = [
    { text: 'Attrape 3 poissons rares ou mieux', goal: 3, reward: 20, counts: (f) => f.rarity >= 3 },
    { text: `Attrape 5 × ${target.name.toLowerCase()}`, goal: 5, reward: 12, counts: (f) => f.id === target.id },
    { text: `Attrape un(e) ${target.name.toLowerCase()} d’au moins ${big} cm`, goal: 1, reward: 15, counts: (f, size) => f.id === target.id && size >= big },
    { text: 'Attrape 12 poissons', goal: 12, reward: 12, counts: () => true },
  ];
  return kinds[Math.floor(seed / 7) % kinds.length];
}

/** Coins for a catch: its rarity's price, a little more for a big one. */
export function priceOf(fish: Fish, size: number): number {
  const [min, max] = fish.size;
  const big = (size - min) / Math.max(1, max - min);
  return Math.max(1, Math.round(RARITY_PRICES[fish.rarity] * (0.8 + big * 0.5)));
}

/** Coins for a species caught for the first time. */
export const NEW_SPECIES_BONUS = 5;

/** How the reeling bar behaves for a fish: the rarer, the faster and the smaller the zone. */
export interface Fight {
  /** Bar widths per second the fish swims. */
  speed: number;
  /** Seconds between its changes of direction. */
  restless: number;
  /** Width of the player's zone, 0 to 1. */
  zone: number;
  /** Progress per second inside / outside the zone. */
  gain: number;
  loss: number;
}

export function fightOf(fish: Fish): Fight {
  const r = fish.rarity - 1;
  return { speed: 0.2 + r * 0.09, restless: 1.3 - r * 0.15, zone: 0.32 - r * 0.035, gain: 0.3 - r * 0.045, loss: 0.12 + r * 0.04 };
}

/** Milliseconds the player has to strike once the float dives. */
export function biteWindow(fish: Fish): number {
  return 900 - fish.rarity * 70;
}
