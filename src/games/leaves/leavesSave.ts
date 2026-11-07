import { readGame, writeGame } from '../../save';
import { CRITTERS, ORNAMENTS, RARE_LEAVES, TREASURES, UPGRADES, ZONES, type UpgradeId } from './leavesData';

const GAME_ID = 'leaves';
/** Bumped when the game changes so much that old progress makes no sense: an older save starts over. */
const SAVE_VERSION = 2;

export interface ZoneState {
  /** Leaves left when the player went away. */
  left: number;
  /** When `left` was saved, for the wind to bring leaves back. */
  at: number;
  /** Levels finished here: the place's level is this plus one. */
  cleared: number;
  /** Finished level played again, or 0 when moving on to the next one. */
  replay: number;
  /** Carpets of leaves already cleared in the level being played. */
  carpets: number;
  /** Ornaments bought for this place. */
  ornaments: string[];
  /** The carpet on the ground is a golden one. */
  golden: boolean;
  /** What is still buried under this carpet; null when unknown (a save from before it was kept). */
  hidden: BuriedThing[] | null;
}

/** Something buried under the leaves, kept so coming back does not bury a fresh set. */
export interface BuriedThing {
  x: number;
  y: number;
  kind: 'treasure' | 'deco' | 'hedgehog' | 'star' | 'megastar';
  /** Treasure or decoration id. */
  id?: string;
}

export interface LeavesSave {
  version: number;
  gold: number;
  /** Leaves in the basket, and what they will give on the compost. */
  basket: number;
  basketGold: number;
  levels: Record<UpgradeId, number>;
  zones: Record<string, ZoneState>;
  herbarium: Record<string, number>;
  treasures: Record<string, number>;
  critters: Record<string, number>;
  /** Coins taken today, to keep the daily cap. */
  coinsDay: string;
  coinsTaken: number;
  /** Place shown last. */
  zone: string;
  /** Golden leaves picked toward the next golden carpet. */
  goldenGauge: number;
  /** The gauge is full: the next carpet laid anywhere is golden. */
  goldenNext: boolean;
}

export function loadLeaves(): LeavesSave {
  const raw = rec(readGame(GAME_ID));
  // An older version starts over, except the daily coin cap, so coins are not taken twice today.
  const data: Record<string, unknown> = raw.version === SAVE_VERSION ? raw : { coinsDay: raw.coinsDay, coinsTaken: raw.coinsTaken };
  const levels = {} as Record<UpgradeId, number>;
  for (const u of UPGRADES) {
    const value = rec(data.levels)[u.id];
    levels[u.id] = isCount(value) ? (u.endless ? value : Math.min(u.max, value)) : 0;
  }
  const zones: Record<string, ZoneState> = {};
  for (const z of ZONES) {
    const s = rec(rec(data.zones)[z.id]);
    const cleared = isCount(s.cleared) ? s.cleared : s.done === true ? 1 : 0;
    zones[z.id] = {
      left: isCount(s.left) ? s.left : -1,
      at: typeof s.at === 'number' ? s.at : Date.now(),
      cleared,
      replay: isCount(s.replay) && s.replay <= cleared ? s.replay : 0,
      carpets: isCount(s.carpets) ? s.carpets : 0,
      ornaments: Array.isArray(s.ornaments) ? s.ornaments.filter((id): id is string => ORNAMENTS.some((o) => o.id === id)) : [],
      golden: s.golden === true,
      hidden: Array.isArray(s.hidden) ? s.hidden.map(rec).filter(isBuried).map((b) => ({ x: b.x, y: b.y, kind: b.kind, ...(typeof b.id === 'string' ? { id: b.id } : {}) })) : null,
    };
  }
  return {
    version: SAVE_VERSION,
    gold: isCount(data.gold) ? data.gold : 0,
    basket: isCount(data.basket) ? data.basket : 0,
    basketGold: typeof data.basketGold === 'number' && data.basketGold >= 0 ? data.basketGold : isCount(data.basket) ? data.basket : 0,
    levels,
    zones,
    herbarium: counts(data.herbarium, RARE_LEAVES.map((r) => r.id)),
    treasures: counts(data.treasures, TREASURES.map((t) => t.id)),
    critters: counts(data.critters, CRITTERS.map((c) => c.id)),
    coinsDay: typeof data.coinsDay === 'string' ? data.coinsDay : '',
    coinsTaken: isCount(data.coinsTaken) ? data.coinsTaken : 0,
    zone: ZONES.some((z) => z.id === data.zone) ? (data.zone as string) : ZONES[0].id,
    goldenGauge: isCount(data.goldenGauge) ? data.goldenGauge : 0,
    goldenNext: data.goldenNext === true,
  };
}

export function saveLeaves(save: LeavesSave): void {
  writeGame(GAME_ID, save);
}

function rec(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function counts(value: unknown, ids: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [id, n] of Object.entries(rec(value))) if (ids.includes(id) && isCount(n) && n > 0) result[id] = n;
  return result;
}

function isBuried(b: Record<string, unknown>): b is Record<string, unknown> & BuriedThing {
  return typeof b.x === 'number' && typeof b.y === 'number' && (b.kind === 'treasure' || b.kind === 'deco' || b.kind === 'hedgehog' || b.kind === 'star' || b.kind === 'megastar');
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}
