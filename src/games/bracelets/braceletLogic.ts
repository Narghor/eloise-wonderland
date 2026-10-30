// -----------------------------------------------
// FRIENDSHIP BRACELET RULES (no DOM)
// -----------------------------------------------
// Strings side by side; even rows knot pairs (0,1),(2,3)..., odd rows (1,2),(3,4)... Each knot
// shows the colour of one of its two strings, and may make them swap places.

import type { LevelTable } from '../../difficulty';
import { shuffled } from '../../random';

export type Knot = 'FF' | 'BB' | 'FB' | 'BF';
export const KNOTS: readonly Knot[] = ['FF', 'BB', 'FB', 'BF'];

export function isKnot(value: unknown): value is Knot {
  return typeof value === 'string' && (KNOTS as readonly string[]).includes(value);
}

/** FF and FB show the left string; FF and BB make the strings swap. */
export function showsLeft(knot: Knot): boolean {
  return knot === 'FF' || knot === 'FB';
}

export function swaps(knot: Knot): boolean {
  return knot === 'FF' || knot === 'BB';
}

/** The pattern to knot: what is needed to weave it again. */
export interface Pattern {
  palette: string[];
  /** Colour index of each string, left to right, before the first row. */
  strings: number[];
  rows: number;
}

export function knotsInRow(stringCount: number, row: number): number {
  return row % 2 === 0 ? stringCount / 2 : stringCount / 2 - 1;
}

export function knotCount(pattern: Pattern): number {
  let total = 0;
  for (let row = 0; row < pattern.rows; row++) total += knotsInRow(pattern.strings.length, row);
  return total;
}

/** Row and left string position of every knot, in knotting order. */
export function knotPlaces(pattern: Pattern): { row: number; left: number }[] {
  const places: { row: number; left: number }[] = [];
  for (let row = 0; row < pattern.rows; row++) {
    for (let i = 0; i < knotsInRow(pattern.strings.length, row); i++) places.push({ row, left: 2 * i + (row % 2) });
  }
  return places;
}

export interface Weave {
  /** Colour shown by each knot made. */
  colors: number[];
  /** Order of the strings after these knots. */
  strings: number[];
}

export function weave(pattern: Pattern, knots: readonly Knot[]): Weave {
  const strings = [...pattern.strings];
  const places = knotPlaces(pattern);
  const colors = knots.map((knot, index) => {
    const { left } = places[index];
    const color = showsLeft(knot) ? strings[left] : strings[left + 1];
    if (swaps(knot)) [strings[left], strings[left + 1]] = [strings[left + 1], strings[left]];
    return color;
  });
  return { colors, strings };
}

/** 3 stars without a mistake, 2 up to about one knot in twenty, 1 otherwise. */
export function starsFor(mistakes: number, knots: number): number {
  if (mistakes === 0) return 3;
  return mistakes <= Math.max(1, Math.round(knots * 0.05)) ? 2 : 1;
}

// -----------------------------------------------
// LEVELS AND MODEL GENERATION
// -----------------------------------------------

export interface BraceletTier {
  strings: number;
  rows: number;
  colors: number;
}

/** One tier per difficulty, easiest first. */
export const BRACELET_TIERS: readonly BraceletTier[] = [
  { strings: 4, rows: 6, colors: 2 },
  { strings: 6, rows: 8, colors: 3 },
  { strings: 6, rows: 12, colors: 3 },
  { strings: 8, rows: 12, colors: 4 },
  { strings: 8, rows: 16, colors: 4 },
];

/** Generator level per difficulty: the tier number, from 1. */
export const BRACELET_LEVELS: LevelTable = [1, 2, 3, 4, 5];

const THREAD_COLORS = ['#e8547a', '#f2a03d', '#f5d547', '#5fbf6e', '#3fa7c9', '#5b6fd6', '#9b5bd0', '#f0eee6', '#2d2a3a', '#7fd8c4'];

/**
 * A model is always knottable: it is drawn from random knot types. Pretty, not noise: the strings
 * start mirrored (A B C C B A), each row takes a whole-row motif (chevron in, chevron out, or two
 * kinds of stripes), mirrored on both halves, and motifs tend to repeat over a few rows.
 */
export function generateModel(tier: BraceletTier, random: () => number = Math.random): Pattern & { model: Knot[] } {
  const palette = shuffled(THREAD_COLORS, random).slice(0, tier.colors);
  const half = tier.strings / 2;
  const order = shuffled(palette.map((_, index) => index), random);
  const leftHalf = Array.from({ length: half }, (_, i) => order[i % order.length]);
  const strings = [...leftHalf, ...[...leftHalf].reverse()];
  const pattern: Pattern = { palette, strings, rows: tier.rows };


  const mirror: Record<Knot, Knot> = { FF: 'BB', BB: 'FF', FB: 'BF', BF: 'FB' };
  const model: Knot[] = [];
  let motif = KNOTS[Math.floor(random() * KNOTS.length)];
  for (let row = 0; row < tier.rows; row++) {
    if (random() > 0.6) motif = KNOTS[Math.floor(random() * KNOTS.length)];
    const count = knotsInRow(tier.strings, row);
    const rowKnots: Knot[] = new Array(count);
    for (let i = 0; i < Math.ceil(count / 2); i++) {
      const mirrored = count - 1 - i;
      if (mirrored === i) {
        rowKnots[i] = random() < 0.5 ? 'FF' : 'BB';
        continue;
      }
      let knot = motif;
      if (random() < 0.12) knot = KNOTS[Math.floor(random() * KNOTS.length)];
      rowKnots[i] = knot;
      rowKnots[mirrored] = mirror[knot];
    }
    model.push(...rowKnots);
  }
  return { ...pattern, model };
}
