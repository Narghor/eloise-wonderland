import { readGame, writeGame } from '../../save';
import { isDifficulty, type Difficulty } from '../../difficulty';
import { isDayKey } from '../../daily/daily';

export const GAME_ID = 'mahjong';

export type DimSetting = 'auto' | 'on' | 'off';

export interface LayoutStats {
  wins: number;
  /** Best time in seconds, 0 when never won. */
  best: number;
}

/** A game in progress: enough to rebuild the exact board. */
export interface MahjongCurrent {
  layoutId: string;
  tier: Difficulty;
  seed: number;
  faces: number[];
  /** Pairs removed, in order (undo pops from the end). */
  removed: [number, number][];
  hints: number;
  shuffles: number;
  elapsed: number;
  challenge?: string;
}

export interface MahjongSave {
  difficulty: Difficulty;
  dim: DimSetting;
  /** By layout id; the surprise shapes count as `surprise-<tier>`. */
  stats: Record<string, LayoutStats>;
  gamesWon: number;
  current?: MahjongCurrent;
  /** Day of a daily challenge started and not yet won. */
  challenge?: string;
}

export function statsKey(layoutId: string, tier: Difficulty): string {
  return layoutId === 'surprise' ? `surprise-${tier}` : layoutId;
}

export function loadMahjong(): MahjongSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const stats: Record<string, LayoutStats> = {};
  if (typeof data.stats === 'object' && data.stats !== null) {
    for (const [id, value] of Object.entries(data.stats as Record<string, unknown>)) {
      const entry = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
      if (isCount(entry.wins) && isCount(entry.best)) stats[id] = { wins: entry.wins, best: entry.best };
    }
  }
  return {
    difficulty: isDifficulty(data.difficulty) ? data.difficulty : 0,
    dim: data.dim === 'on' || data.dim === 'off' ? data.dim : 'auto',
    stats,
    gamesWon: isCount(data.gamesWon) ? data.gamesWon : 0,
    current: readCurrent(data.current),
    challenge: isDayKey(data.challenge) ? data.challenge : undefined,
  };
}

export function saveMahjong(save: MahjongSave): void {
  writeGame(GAME_ID, save);
}

function readCurrent(value: unknown): MahjongCurrent | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const data = value as Record<string, unknown>;
  const pairs = Array.isArray(data.removed) ? data.removed : null;
  const faces = Array.isArray(data.faces) ? data.faces : null;
  if (
    typeof data.layoutId !== 'string' ||
    !isDifficulty(data.tier) ||
    !isCount(data.seed) ||
    !faces ||
    !faces.every(isCount) ||
    !pairs ||
    !pairs.every((pair) => Array.isArray(pair) && pair.length === 2 && pair.every(isCount)) ||
    !isCount(data.hints) ||
    !isCount(data.shuffles) ||
    !isCount(data.elapsed)
  ) {
    return undefined;
  }
  return {
    layoutId: data.layoutId,
    tier: data.tier,
    seed: data.seed,
    faces: faces as number[],
    removed: pairs as [number, number][],
    hints: data.hints,
    shuffles: data.shuffles,
    elapsed: data.elapsed,
    challenge: isDayKey(data.challenge) ? data.challenge : undefined,
  };
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}
