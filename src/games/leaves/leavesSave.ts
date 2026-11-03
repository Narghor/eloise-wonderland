import { readGame, writeGame } from '../../save';
import { CRITTERS, MAX_LEVEL, ORNAMENTS, RARE_LEAVES, TREASURES, UPGRADES, ZONES, type UpgradeId } from './leavesData';

const GAME_ID = 'leaves';

export interface ZoneState {
  /** Leaves left when the player went away. */
  left: number;
  /** When `left` was saved, for the wind to bring leaves back. */
  at: number;
  /** Levels finished here: the place's level is this plus one. */
  cleared: number;
  /** Leaves raked toward the next level's goal. */
  progress: number;
  /** Finished level played again, or 0 when moving on to the next one. */
  replay: number;
  /** Leaves raked toward the replayed level's goal. */
  replayProgress: number;
  /** Ornaments bought for this place. */
  ornaments: string[];
}

export interface LeavesSave {
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
}

export function loadLeaves(): LeavesSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const levels = {} as Record<UpgradeId, number>;
  for (const u of UPGRADES) {
    const value = rec(data.levels)[u.id];
    levels[u.id] = isCount(value) ? Math.min(u.max, value) : 0;
  }
  const zones: Record<string, ZoneState> = {};
  for (const z of ZONES) {
    const s = rec(rec(data.zones)[z.id]);
    const cleared = isCount(s.cleared) ? Math.min(MAX_LEVEL, s.cleared) : s.done === true ? 1 : 0;
    zones[z.id] = {
      left: isCount(s.left) ? s.left : -1,
      at: typeof s.at === 'number' ? s.at : Date.now(),
      cleared,
      progress: isCount(s.progress) ? s.progress : 0,
      replay: isCount(s.replay) && s.replay <= cleared ? s.replay : 0,
      replayProgress: isCount(s.replayProgress) ? s.replayProgress : 0,
      ornaments: Array.isArray(s.ornaments) ? s.ornaments.filter((id): id is string => ORNAMENTS.some((o) => o.id === id)) : [],
    };
  }
  return {
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

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}
