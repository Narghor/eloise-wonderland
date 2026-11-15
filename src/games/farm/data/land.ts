import type { BoosterId, ObstacleId, ProjectId } from './types';

// -----------------------------------------------
// THE LAND (docs/ferme.md 4.1 and 7.5)
// -----------------------------------------------
// A grid of MAP_SIZE tiles, cut in parcels of PARCEL tiles. Parcel index = py * PARCELS_PER_SIDE + px.

export const MAP_SIZE = 24;
export const PARCEL = 6;
export const PARCELS_PER_SIDE = MAP_SIZE / PARCEL;

/** The four parcels of the centre, owned from the start (12 x 12 tiles). */
export const STARTING_PARCELS: readonly number[] = [5, 6, 9, 10];

/** The river bank, east of the stream: opened by the old bridge, then bought like the others. */
export const RIVER_PARCELS: readonly number[] = [7, 11];
export const RIVER_PROJECT: ProjectId = 'bridge';
export const RIVER_PARCEL_PRICE = 1000;

/**
 * The n-th parcel bought (river bank excepted): level needed and price.
 * Ten of them in lot 1; the bank's two come with the bridge.
 */
export const PARCEL_STEPS: readonly { level: number; price: number }[] = [
  { level: 3, price: 100 }, { level: 4, price: 200 }, { level: 6, price: 350 }, { level: 7, price: 550 }, { level: 8, price: 800 },
  { level: 9, price: 1100 }, { level: 10, price: 1500 }, { level: 12, price: 2000 }, { level: 13, price: 2600 }, { level: 15, price: 3300 },
];

/**
 * The stream: it comes in from the east edge above the bank, runs down its west side, and leaves by the east
 * edge below it. Water tiles never take anything; the bridge crosses at BRIDGE_TILES.
 */
export function isWater(x: number, y: number): boolean {
  if (x === 18 && y >= 5 && y <= 18) return true;
  return (y === 5 || y === 18) && x >= 18;
}

export const BRIDGE_TILES: readonly [number, number][] = [[18, 11], [18, 12]];

/**
 * The village road comes up out of the forest from the south along this column and stops at the farm's edge,
 * wherever that edge is (farmMap.gateTile). South, because a phone held upright always shows the farm's south edge.
 * Villagers walk it to fetch their orders, Gaston rides it with the parcels.
 */
export const ROAD_COLUMN = 12;

// -----------------------------------------------
// THE WILD
// -----------------------------------------------

export interface Obstacle {
  id: ObstacleId;
  cost: number;
  xp: number;
  /** Share of the draws of a new parcel. */
  weight: number;
  /** Chance of a surprise, and what it may be. */
  surprise: { chance: number; nuts?: [number, number]; boosters?: BoosterId[] };
}

export const OBSTACLES: readonly Obstacle[] = [
  { id: 'bush', cost: 5, xp: 2, weight: 45, surprise: { chance: 0.3, nuts: [2, 6] } },
  { id: 'stump', cost: 15, xp: 4, weight: 30, surprise: { chance: 0.15, boosters: ['fertilizer'] } },
  { id: 'rock', cost: 25, xp: 5, weight: 18, surprise: { chance: 0.2, boosters: ['fertilizer', 'hourglass'] } },
  { id: 'bigRock', cost: 60, xp: 12, weight: 7, surprise: { chance: 1, boosters: ['hourglass', 'wateringCan', 'helpingHand'] } },
];

export function obstacle(id: ObstacleId): Obstacle {
  return OBSTACLES.find((o) => o.id === id)!;
}

export const STARTING_OBSTACLES = 20;
export const OBSTACLES_PER_PARCEL = 10;
