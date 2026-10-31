// -----------------------------------------------
// FUSE BEADS RULES (no DOM)
// -----------------------------------------------
// A pegboard of width x height pegs; each cell is empty (-1) or holds a bead of a palette colour.
// The box holds exactly the beads the model needs, colour by colour.

import type { LevelTable } from '../../difficulty';
import { shuffled } from '../../random';

export const EMPTY = -1;

/** The model to copy: what is needed to draw it again. */
export interface Pattern {
  palette: string[];
  width: number;
  height: number;
  /** Colour index of each cell, row by row, or EMPTY. */
  cells: number[];
}

/** Beads of each colour the model needs. */
export function beadsNeeded(pattern: Pattern): number[] {
  const counts = pattern.palette.map(() => 0);
  for (const cell of pattern.cells) if (cell !== EMPTY) counts[cell]++;
  return counts;
}

export function beadTotal(pattern: Pattern): number {
  return pattern.cells.filter((cell) => cell !== EMPTY).length;
}

/** Beads of each colour still in the box, given the beads placed on the board. */
export function beadsLeft(pattern: Pattern, placed: readonly number[]): number[] {
  const left = beadsNeeded(pattern);
  for (const cell of placed) if (cell !== EMPTY) left[cell]--;
  return left;
}

export function isFinished(pattern: Pattern, placed: readonly number[]): boolean {
  return pattern.cells.every((cell, index) => placed[index] === cell);
}

/** 3 stars without a mistake, 2 up to about one bead in twenty, 1 otherwise. */
export function starsFor(mistakes: number, beads: number): number {
  if (mistakes === 0) return 3;
  return mistakes <= Math.max(1, Math.round(beads * 0.05)) ? 2 : 1;
}

// -----------------------------------------------
// LEVELS
// -----------------------------------------------

export interface BeadTier {
  size: number;
  colors: number;
}

/** One tier per difficulty, easiest first. */
export const BEAD_TIERS: readonly BeadTier[] = [
  { size: 8, colors: 2 },
  { size: 10, colors: 3 },
  { size: 12, colors: 4 },
  { size: 14, colors: 5 },
  { size: 16, colors: 6 },
];

/** Generator level per difficulty: the tier number, from 1. */
export const BEAD_LEVELS: LevelTable = [1, 2, 3, 4, 5];

const OUTLINE_COLORS = ['#2d2a3a', '#5a3b2e', '#3b3f8f', '#7a2648'];
const BEAD_COLORS = ['#e8547a', '#f2a03d', '#f5d547', '#5fbf6e', '#3fa7c9', '#5b6fd6', '#9b5bd0', '#f7f3ea', '#ff9fc4', '#7fd8c4', '#e8433a', '#b8e05a'];

// -----------------------------------------------
// HAND-MADE SPRITES (8x8, tier 1)
// -----------------------------------------------
// '.' empty, '0' outline, '1' fill.

const SPRITES: readonly string[][] = [
  ['.00..00.', '01100110', '01111110', '01111110', '.011110.', '..0110..', '...00...', '........'],
  ['..0000..', '.011110.', '01111110', '00000000', '..0110..', '..0110..', '..0000..', '........'],
  ['...00...', '..0110..', '00011000', '01111110', '.011110.', '.011110.', '01100110', '00....00'],
  ['.0....0.', '010..010', '01100110', '01111110', '01011010', '01111110', '.011110.', '..0000..'],
  ['..0..0..', '.010010.', '.011110.', '00111100', '01111110', '01111110', '.011110.', '..0000..'],
];

// -----------------------------------------------
// MODEL GENERATION
// -----------------------------------------------

/**
 * Pretty, not noise: a blob mirrored left-right (and sometimes top-bottom), smoothed, outlined
 * in a dark colour, then filled with rings of the other colours plus a few mirrored accents.
 */
export function generateModel(tier: BeadTier, random: () => number = Math.random): Pattern {
  const palette = [OUTLINE_COLORS[Math.floor(random() * OUTLINE_COLORS.length)], ...shuffled(BEAD_COLORS, random).slice(0, tier.colors - 1)];
  const { size } = tier;
  if (size === 8 && random() < 0.6) {
    const sprite = SPRITES[Math.floor(random() * SPRITES.length)];
    const cells = sprite.join('').split('').map((char) => (char === '.' ? EMPTY : Number(char)));
    return { palette, width: size, height: size, cells };
  }
  for (;;) {
    const cells = generateShape(size, random);
    if (!cells) continue;
    const pattern = { palette, width: size, height: size, cells: colorShape(cells, size, tier.colors, random) };
    if (beadsNeeded(pattern).every((count) => count > 0)) return pattern;
  }
}

/** A filled, symmetric mask (1 inside, 0 outside), or null when the draw was too thin. */
function generateShape(size: number, random: () => number): number[] | null {
  const verticalMirror = random() < 0.4;
  const half = Math.ceil(size / 2);
  const halfRows = verticalMirror ? Math.ceil(size / 2) : size;
  let mask = new Array<number>(size * size).fill(0);
  const set = (x: number, y: number, value: number) => {
    for (const cx of [x, size - 1 - x]) {
      for (const cy of verticalMirror ? [y, size - 1 - y] : [y]) mask[cy * size + cx] = value;
    }
  };
  for (let y = 1; y < halfRows; y++) {
    for (let x = 1; x < half; x++) {
      // Denser towards the centre: shapes stay in one piece.
      const centre = 1 - Math.hypot((x - size / 2) / size, (y - size / 2) / size) * 1.6;
      set(x, y, random() < 0.1 + centre * 0.75 ? 1 : 0);
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    const next = [...mask];
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        let around = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) around += mask[(y + dy) * size + x + dx];
        next[y * size + x] = around >= 5 ? 1 : around <= 2 ? 0 : mask[y * size + x];
      }
    }
    mask = next;
  }
  mask = largestPiece(mask, size);
  const filled = mask.filter((cell) => cell === 1).length;
  return filled >= size * size * 0.35 ? mask : null;
}

function largestPiece(mask: number[], size: number): number[] {
  const piece = new Array<number>(mask.length).fill(-1);
  let best = -1;
  let bestSize = 0;
  for (let start = 0; start < mask.length; start++) {
    if (mask[start] !== 1 || piece[start] !== -1) continue;
    const stack = [start];
    piece[start] = start;
    let count = 0;
    while (stack.length) {
      const index = stack.pop() as number;
      count++;
      for (const next of neighbours(index, size)) {
        if (mask[next] === 1 && piece[next] === -1) {
          piece[next] = start;
          stack.push(next);
        }
      }
    }
    if (count > bestSize) [best, bestSize] = [start, count];
  }
  return mask.map((_, index) => (piece[index] === best ? 1 : 0));
}

function neighbours(index: number, size: number): number[] {
  const x = index % size;
  const y = Math.floor(index / size);
  const list: number[] = [];
  if (x > 0) list.push(index - 1);
  if (x < size - 1) list.push(index + 1);
  if (y > 0) list.push(index - size);
  if (y < size - 1) list.push(index + size);
  return list;
}

/** Outline in colour 0, then rings by depth through colours 1..n-1, with mirrored accent dots. */
function colorShape(mask: number[], size: number, colors: number, random: () => number): number[] {
  const depth = new Array<number>(mask.length).fill(-1);
  let frontier: number[] = [];
  mask.forEach((cell, index) => {
    if (cell === 1 && (index % size === 0 || index % size === size - 1 || neighbours(index, size).length < 4 || neighbours(index, size).some((n) => mask[n] === 0))) {
      depth[index] = 0;
      frontier.push(index);
    }
  });
  while (frontier.length) {
    const next: number[] = [];
    for (const index of frontier) {
      for (const n of neighbours(index, size)) {
        if (mask[n] === 1 && depth[n] === -1) {
          depth[n] = depth[index] + 1;
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  const fills = colors - 1;
  // Rings two beads thick look calmer than one-bead stripes.
  const ringWidth = fills >= 4 ? 1 : 2;
  const order = shuffled(Array.from({ length: fills }, (_, i) => i + 1), random);
  const cells = mask.map((cell, index) => (cell === 0 ? EMPTY : depth[index] === 0 ? 0 : order[Math.floor((depth[index] - 1) / ringWidth) % fills]));
  if (fills >= 2) {
    // A few accents, mirrored left-right so the motif stays symmetric.
    const accent = order[fills - 1];
    for (let i = 0; i < Math.round(size / 4); i++) {
      const x = Math.floor(random() * Math.ceil(size / 2));
      const y = Math.floor(random() * size);
      for (const cx of [x, size - 1 - x]) if (depth[y * size + cx] >= 1) cells[y * size + cx] = accent;
    }
  }
  // Every palette colour must be used: a colour without beads would be an empty button.
  for (let color = 1; color < colors; color++) {
    if (cells.includes(color)) continue;
    // Take beads from a fill colour that has plenty, so no other colour vanishes.
    const counts = cells.reduce((total, cell) => (cell > 0 ? total.set(cell, (total.get(cell) ?? 0) + 1) : total), new Map<number, number>());
    const inside = cells.map((cell, index) => ((counts.get(cell) ?? 0) >= 6 ? index : -1)).filter((index) => index >= 0 && index % size < size / 2);
    const index = inside[Math.floor(random() * inside.length)];
    if (index === undefined) continue;
    cells[index] = color;
    cells[Math.floor(index / size) * size + size - 1 - (index % size)] = color;
  }
  return cells;
}
