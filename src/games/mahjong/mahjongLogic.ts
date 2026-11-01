import { mulberry32, shuffled } from '../../random';
import type { Spot } from './mahjongLayouts';

// -----------------------------------------------
// FACES
// -----------------------------------------------
// 34 ordinary faces (4 copies each in a full set), then 4 seasons and 4 flowers: a season matches
// any other season, a flower any other flower.

export interface Face {
  emoji: string;
  suit: 'fruit' | 'animal' | 'sweet' | 'honor' | 'season' | 'flower';
}

const SUITS: [Face['suit'], string[]][] = [
  ['fruit', ['🍓', '🍋', '🍇', '🍉', '🍒', '🍍', '🥥', '🍌', '🍏']],
  ['animal', ['🐱', '🐌', '🐰', '🐢', '🐼', '🐸', '🐧', '🦋', '🐙']],
  ['sweet', ['🍩', '🧁', '🍯', '🍭', '🍿', '🍰', '🍫', '🍦', '🥐']],
  ['honor', ['⭐', '🎈', '🌈', '❤️', '👑', '🔔', '💎']],
  ['season', ['🌱', '☀️', '🍂', '❄️']],
  ['flower', ['🌷', '🌹', '🌼', '🌸']],
];

export const FACES: readonly Face[] = SUITS.flatMap(([suit, emojis]) => emojis.map((emoji) => ({ emoji, suit })));

const ORDINARY_FACES = 34;
const SEASON_KEY = 34;
const FLOWER_KEY = 38;

/** Two tiles match when their keys are equal. */
export function matchKey(face: number): number {
  if (face < ORDINARY_FACES) return face;
  return face < FLOWER_KEY ? SEASON_KEY : FLOWER_KEY;
}

// -----------------------------------------------
// TIERS
// -----------------------------------------------

export interface MahjongTier {
  hints: number;
  /** Shuffles allowed when stuck; Infinity at the easiest tier. */
  shuffles: number;
  dimBlocked: boolean;
  /** 0..1: how often both pairs of a face are freed at the same time (wrong-pair traps). */
  trickiness: number;
  bonusGroups: boolean;
}

export const MAHJONG_TIERS: readonly MahjongTier[] = [
  { hints: 5, shuffles: Infinity, dimBlocked: true, trickiness: 0, bonusGroups: false },
  { hints: 3, shuffles: 3, dimBlocked: true, trickiness: 0.2, bonusGroups: false },
  { hints: 3, shuffles: 2, dimBlocked: false, trickiness: 0.45, bonusGroups: true },
  { hints: 2, shuffles: 1, dimBlocked: false, trickiness: 0.7, bonusGroups: true },
  { hints: 1, shuffles: 1, dimBlocked: false, trickiness: 0.9, bonusGroups: true },
];

export function seedFromDay(day: string): number {
  let hash = 2166136261;
  for (const char of `mahjong:${day}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

// -----------------------------------------------
// GEOMETRY: WHO BLOCKS WHOM
// -----------------------------------------------

export interface Geometry {
  spots: readonly Spot[];
  above: number[][];
  left: number[][];
  right: number[][];
}

export function geometryOf(spots: readonly Spot[]): Geometry {
  const above: number[][] = spots.map(() => []);
  const left: number[][] = spots.map(() => []);
  const right: number[][] = spots.map(() => []);
  spots.forEach((a, i) => {
    spots.forEach((b, j) => {
      if (i === j || Math.abs(a.y - b.y) >= 2) return;
      if (b.z > a.z && Math.abs(a.x - b.x) < 2) above[i].push(j);
      else if (b.z === a.z && b.x === a.x - 2) left[i].push(j);
      else if (b.z === a.z && b.x === a.x + 2) right[i].push(j);
    });
  });
  return { spots, above, left, right };
}

export function isFree(geometry: Geometry, present: readonly boolean[], index: number): boolean {
  if (geometry.above[index].some((j) => present[j])) return false;
  return !geometry.left[index].some((j) => present[j]) || !geometry.right[index].some((j) => present[j]);
}

export function freeTiles(geometry: Geometry, present: readonly boolean[]): number[] {
  const free: number[] = [];
  for (let i = 0; i < present.length; i++) if (present[i] && isFree(geometry, present, i)) free.push(i);
  return free;
}

/** Every pair of free matching tiles. */
export function availablePairs(geometry: Geometry, present: readonly boolean[], faces: readonly number[]): [number, number][] {
  const free = freeTiles(geometry, present);
  const pairs: [number, number][] = [];
  for (let a = 0; a < free.length; a++) {
    for (let b = a + 1; b < free.length; b++) {
      if (matchKey(faces[free[a]]) === matchKey(faces[free[b]])) pairs.push([free[a], free[b]]);
    }
  }
  return pairs;
}

// -----------------------------------------------
// DEALING (SOLVABLE BY CONSTRUCTION)
// -----------------------------------------------
// We play the game backwards on empty tiles: remove two free tiles at a time until the board is empty.
// That removal order is a solution, so giving each removed pair the same face makes a solvable deal.

/** Removal order of the given tiles, two by two; null when the random walk got stuck. */
function removalOrder(geometry: Geometry, start: readonly boolean[], random: () => number): [number, number][] | null {
  const present = [...start];
  let left = present.filter(Boolean).length;
  const order: [number, number][] = [];
  while (left > 0) {
    const free = freeTiles(geometry, present);
    if (free.length < 2) return null;
    // Favour tiles that block others: removing them first keeps the walk from painting itself into a corner.
    const weight = (i: number) => 1 + geometry.spots[i].z * 2 + countBlocked(geometry, present, i);
    const a = pick(free, weight, random);
    const b = pick(free.filter((i) => i !== a), weight, random);
    present[a] = present[b] = false;
    order.push([a, b]);
    left -= 2;
  }
  return order;
}

function countBlocked(geometry: Geometry, present: readonly boolean[], index: number): number {
  let count = 0;
  for (let j = 0; j < present.length; j++) {
    if (!present[j] || j === index) continue;
    if (geometry.above[j].includes(index) || geometry.left[j].includes(index) || geometry.right[j].includes(index)) count++;
  }
  return count;
}

function pick(list: readonly number[], weight: (i: number) => number, random: () => number): number {
  const weights = list.map(weight);
  let roll = random() * weights.reduce((sum, w) => sum + w, 0);
  for (let k = 0; k < list.length; k++) {
    roll -= weights[k];
    if (roll < 0) return list[k];
  }
  return list[list.length - 1];
}

/** The face of each pair, in removal order. `trickiness` keeps both pairs of a face close together. */
function pairFaces(pairCount: number, tier: MahjongTier, random: () => number): number[][] {
  const groups: number[][][] = [];
  if (tier.bonusGroups && pairCount >= 40) {
    for (const base of [SEASON_KEY, FLOWER_KEY]) {
      const four = shuffled([base, base + 1, base + 2, base + 3], random);
      groups.push([four.slice(0, 2), four.slice(2)]);
    }
  }
  const kinds = shuffled(Array.from({ length: ORDINARY_FACES }, (_, i) => i), random);
  let k = 0;
  while (groups.reduce((sum, g) => sum + g.length, 0) < pairCount) {
    const face = kinds[k++ % ORDINARY_FACES];
    const missing = pairCount - groups.reduce((sum, g) => sum + g.length, 0);
    groups.push(missing >= 2 ? [[face, face], [face, face]] : [[face, face]]);
  }
  const order = shuffled(groups, random).flat();
  // Easy tiers scatter the two pairs of a face across the game.
  const swaps = Math.round((1 - tier.trickiness) * pairCount * 2);
  for (let s = 0; s < swaps; s++) {
    const a = Math.floor(random() * order.length);
    const b = Math.floor(random() * order.length);
    [order[a], order[b]] = [order[b], order[a]];
  }
  return order;
}

const MIN_PAIRS_AT_START = 3;

export interface Deal {
  faces: number[];
  solution: [number, number][];
}

export function deal(geometry: Geometry, tier: MahjongTier, seed: number): Deal {
  const random = mulberry32(seed);
  const all = geometry.spots.map(() => true);
  for (let attempt = 0; attempt < 200; attempt++) {
    const order = removalOrder(geometry, all, random);
    if (!order) continue;
    const pairs = pairFaces(order.length, tier, random);
    const faces = new Array<number>(geometry.spots.length).fill(0);
    order.forEach(([a, b], step) => {
      [faces[a], faces[b]] = pairs[step];
    });
    // Fair start: a few choices on the first move, never a single forced pair.
    if (attempt < 40 && availablePairs(geometry, all, faces).length < MIN_PAIRS_AT_START) continue;
    return { faces, solution: order };
  }
  throw new Error('Layout cannot be dealt');
}

/** Gives the remaining faces new places, solvable when the shape allows it. */
export function reshuffle(geometry: Geometry, present: readonly boolean[], faces: readonly number[], seed: number): number[] {
  const random = mulberry32(seed);
  const byKey = new Map<number, number[]>();
  present.forEach((here, i) => {
    if (!here) return;
    const key = matchKey(faces[i]);
    byKey.set(key, [...(byKey.get(key) ?? []), faces[i]]);
  });
  const pairs: number[][] = [];
  for (const group of byKey.values()) {
    const mixed = shuffled(group, random);
    for (let k = 0; k + 1 < mixed.length; k += 2) pairs.push([mixed[k], mixed[k + 1]]);
  }
  const next = [...faces];
  for (let attempt = 0; attempt < 200; attempt++) {
    const order = removalOrder(geometry, present, random);
    if (!order) continue;
    const ordered = shuffled(pairs, random);
    order.forEach(([a, b], step) => {
      [next[a], next[b]] = ordered[step];
    });
    return next;
  }
  const spots = present.flatMap((here, i) => (here ? [i] : []));
  const mixed = shuffled(spots.map((i) => faces[i]), random);
  spots.forEach((i, k) => (next[i] = mixed[k]));
  return next;
}

// -----------------------------------------------
// SOLVER (hints and tests)
// -----------------------------------------------

/** A winning sequence from this position, or null if none was found within the budget. */
export function solve(
  geometry: Geometry,
  start: readonly boolean[],
  faces: readonly number[],
  budget = 20000,
): [number, number][] | null {
  const present = [...start];
  const seen = new Set<string>();
  const path: [number, number][] = [];
  let nodes = 0;
  const key = () => present.map((here) => (here ? '1' : '0')).join('');
  const search = (): boolean | null => {
    if (!present.includes(true)) return true;
    if (++nodes > budget) return null;
    const state = key();
    if (seen.has(state)) return false;
    seen.add(state);
    const free = freeTiles(geometry, present);
    const byKey = new Map<number, number[]>();
    for (const i of free) byKey.set(matchKey(faces[i]), [...(byKey.get(matchKey(faces[i])) ?? []), i]);
    const moves: [number, number][] = [];
    for (const [match, tiles] of byKey) {
      if (tiles.length < 2) continue;
      const remaining = present.reduce((count, here, i) => count + (here && matchKey(faces[i]) === match ? 1 : 0), 0);
      // All the copies left are free: pairing them in any order is safe, so only try one.
      if (tiles.length === remaining) {
        moves.length = 0;
        moves.push([tiles[0], tiles[1]]);
        break;
      }
      for (let a = 0; a < tiles.length; a++) for (let b = a + 1; b < tiles.length; b++) moves.push([tiles[a], tiles[b]]);
    }
    const unlocks = (i: number) => geometry.spots[i].z * 3 + countBlocked(geometry, present, i);
    const score = new Map(moves.map((move) => [move, unlocks(move[0]) + unlocks(move[1])]));
    moves.sort((m, n) => score.get(n)! - score.get(m)!);
    for (const [a, b] of moves) {
      present[a] = present[b] = false;
      path.push([a, b]);
      const result = search();
      if (result !== false) {
        if (result === null) {
          present[a] = present[b] = true;
          path.pop();
        }
        return result;
      }
      present[a] = present[b] = true;
      path.pop();
    }
    return false;
  };
  return search() === true ? [...path] : null;
}

// -----------------------------------------------
// STARS
// -----------------------------------------------

/** 3 stars for a clean game; each hint or shuffle costs one, never below one on a win. */
export function starsFor(hints: number, shuffles: number): number {
  return Math.max(1, 3 - hints - shuffles);
}
