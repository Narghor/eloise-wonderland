// -----------------------------------------------
// VIALS OF COLOURED LIQUID: RULES, SOLVER, LEVELS
// -----------------------------------------------
// A vial is a string of colour letters, bottom first, at most CAPACITY long.

import type { LevelTable } from '../../difficulty';

export const CAPACITY = 4;
const EMPTY_VIALS = 2;

/** In order of arrival: the first colours of a small level contrast the most. */
export const POTION_COLORS: Record<string, string> = {
  a: '#ef476f', // red
  b: '#3a6ea5', // blue
  c: '#ffd166', // yellow
  d: '#06d6a0', // green
  e: '#9b5de5', // purple
  f: '#ff9f1c', // orange
  g: '#4cc9f0', // sky
  h: '#f15bb5', // pink
  i: '#8d6346', // brown
};
const LETTERS = Object.keys(POTION_COLORS);

export type Vials = string[];

export function topColor(vial: string): string | undefined {
  return vial[vial.length - 1];
}

/** How many units of the top colour sit on top of each other. */
function topRun(vial: string): number {
  let run = 0;
  for (let i = vial.length - 1; i >= 0 && vial[i] === vial[vial.length - 1]; i--) run++;
  return run;
}

/** Units that would flow from one vial to another (0 when the pour is not allowed). */
export function pourAmount(vials: Vials, from: number, to: number): number {
  const source = vials[from];
  const target = vials[to];
  if (from === to || source.length === 0 || target.length === CAPACITY) return 0;
  if (target.length > 0 && topColor(target) !== topColor(source)) return 0;
  return Math.min(topRun(source), CAPACITY - target.length);
}

export function pour(vials: Vials, from: number, to: number): Vials {
  const amount = pourAmount(vials, from, to);
  const next = vials.slice();
  next[to] = vials[to] + vials[from].slice(-amount);
  next[from] = vials[from].slice(0, -amount);
  return next;
}

export function isSolved(vials: Vials): boolean {
  return vials.every((vial) => vial.length === 0 || (vial.length === CAPACITY && topRun(vial) === CAPACITY));
}

// -----------------------------------------------
// SOLVER (A*: the fewest pours that sort the vials)
// -----------------------------------------------

/** Every pour joins at most one run of colour to another, so this never overestimates the pours left. */
function runsToMerge(vials: Vials): number {
  let runs = 0;
  const colors = new Set<string>();
  for (const vial of vials) {
    for (let i = 0; i < vial.length; i++) {
      colors.add(vial[i]);
      if (i === 0 || vial[i] !== vial[i - 1]) runs++;
    }
  }
  return runs - colors.size;
}

/** The vials are interchangeable: a sorted copy names the position once. */
function keyOf(vials: Vials): string {
  return vials.slice().sort().join('|');
}

/** Moves worth trying: no pour of a whole single-colour vial into an empty one, it changes nothing. */
function usefulMoves(vials: Vials): [number, number][] {
  const moves: [number, number][] = [];
  for (let from = 0; from < vials.length; from++) {
    const source = vials[from];
    if (source.length === 0) continue;
    const uniform = topRun(source) === source.length;
    let triedEmpty = false;
    for (let to = 0; to < vials.length; to++) {
      if (pourAmount(vials, from, to) === 0) continue;
      if (vials[to].length === 0) {
        if (uniform || triedEmpty) continue;
        triedEmpty = true;
      }
      moves.push([from, to]);
    }
  }
  return moves;
}

/** Fewest pours to solve, or null when the search gives up after `maxNodes` positions. */
export function solve(start: Vials, maxNodes = 400000): number | null {
  type Node = { vials: Vials; cost: number; score: number };
  const heap: Node[] = [];
  const push = (node: Node) => {
    heap.push(node);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].score <= heap[i].score) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };
  const popMin = (): Node => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < heap.length && heap[left].score < heap[smallest].score) smallest = left;
        if (right < heap.length && heap[right].score < heap[smallest].score) smallest = right;
        if (smallest === i) break;
        [heap[smallest], heap[i]] = [heap[i], heap[smallest]];
        i = smallest;
      }
    }
    return top;
  };

  const bestCost = new Map<string, number>([[keyOf(start), 0]]);
  push({ vials: start, cost: 0, score: runsToMerge(start) });
  for (let explored = 0; heap.length > 0 && explored < maxNodes; explored++) {
    const node = popMin();
    if (isSolved(node.vials)) return node.cost;
    for (const [from, to] of usefulMoves(node.vials)) {
      const next = pour(node.vials, from, to);
      const key = keyOf(next);
      const cost = node.cost + 1;
      if ((bestCost.get(key) ?? Infinity) <= cost) continue;
      bestCost.set(key, cost);
      push({ vials: next, cost, score: cost + runsToMerge(next) });
    }
  }
  return null;
}

// -----------------------------------------------
// LEVELS
// -----------------------------------------------

/** 3, 4, 6, 8 then 9 colours. */
export const POTION_LEVELS: LevelTable = [1, 3, 7, 11, 13];

export function colorCountFor(level: number): number {
  return Math.min(3 + Math.floor((level - 1) / 2), LETTERS.length);
}

export interface PotionLevel {
  vials: Vials;
  /** Pours a good player needs: the target for three stars. */
  par: number;
}

export function generateLevel(level: number): PotionLevel {
  const colors = colorCountFor(level);
  for (;;) {
    const units = LETTERS.slice(0, colors).flatMap((letter) => letter.repeat(CAPACITY).split(''));
    for (let i = units.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [units[i], units[j]] = [units[j], units[i]];
    }
    const vials: Vials = [];
    for (let v = 0; v < colors; v++) vials.push(units.slice(v * CAPACITY, (v + 1) * CAPACITY).join(''));
    for (let v = 0; v < EMPTY_VIALS; v++) vials.push('');
    // A vial sorted from the start is a gift: draw again.
    if (vials.some((vial) => vial.length === CAPACITY && topRun(vial) === CAPACITY)) continue;
    // The true minimum: measured at 1-40 ms even with 9 colours.
    const par = solve(vials, 400000);
    if (par !== null) return { vials, par };
  }
}

export function starsFor(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= par + Math.max(3, Math.round(par * 0.25))) return 2;
  return 1;
}
