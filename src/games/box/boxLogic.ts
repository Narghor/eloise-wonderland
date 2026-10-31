// -----------------------------------------------
// TREASURE BOX RULES (no DOM)
// -----------------------------------------------
// A box of rows x cols cells, some maybe blocked, must be filled exactly by a set of pieces.
// The puzzle is made by cutting the box into pieces, so a solution always exists.

import type { LevelTable } from '../../difficulty';
import { shuffled } from '../../random';

/** A cell of a shape: [row, col]. */
export type Cell = [number, number];

export type Motif = 'flower' | 'button' | 'ribbon';
export const MOTIFS: readonly Motif[] = ['flower', 'button', 'ribbon'];

export function isMotif(value: unknown): value is Motif {
  return typeof value === 'string' && (MOTIFS as readonly string[]).includes(value);
}

export const PIECE_COLORS = ['#e8547a', '#f2a03d', '#f5d547', '#5fbf6e', '#3fa7c9', '#5b6fd6', '#9b5bd0', '#f39bc0', '#7fd8c4', '#c98a5b'];

export interface Piece {
  /** The piece as it lies in the solution, top-left at 0,0. */
  cells: Cell[];
  color: number;
  motif: Motif;
  /** Quarter turns clockwise, then the mirror, applied to `cells`. */
  rot: number;
  flip: boolean;
  /** Top-left of the oriented shape in the box, or null in the tray. */
  at: { row: number; col: number } | null;
}

export interface Puzzle {
  rows: number;
  cols: number;
  /** Cell indexes (row * cols + col) that are not part of the box. */
  blocked: number[];
  pieces: Piece[];
}

/** The shape turned and maybe mirrored, moved back so its top-left is 0,0. */
export function orient(cells: readonly Cell[], rot: number, flip: boolean): Cell[] {
  let shape: Cell[] = cells.map(([r, c]) => [r, flip ? -c : c]);
  for (let i = 0; i < rot; i++) shape = shape.map(([r, c]) => [c, -r]);
  const minR = Math.min(...shape.map(([r]) => r));
  const minC = Math.min(...shape.map(([, c]) => c));
  return shape.map(([r, c]) => [r - minR, c - minC] as Cell).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

export function shapeOf(piece: Piece): Cell[] {
  return orient(piece.cells, piece.rot, piece.flip);
}

/** Owner of every cell: -2 blocked, -1 empty, else the piece index. Pieces in the tray are skipped. */
export function occupancy(puzzle: Puzzle, skip = -1): number[] {
  const owners = new Array<number>(puzzle.rows * puzzle.cols).fill(-1);
  for (const index of puzzle.blocked) owners[index] = -2;
  puzzle.pieces.forEach((piece, index) => {
    if (!piece.at || index === skip) return;
    for (const [r, c] of shapeOf(piece)) owners[(piece.at.row + r) * puzzle.cols + piece.at.col + c] = index;
  });
  return owners;
}

/** Can the piece, as currently oriented, lie with its top-left at row, col? */
export function canPlace(puzzle: Puzzle, pieceIndex: number, row: number, col: number): boolean {
  const owners = occupancy(puzzle, pieceIndex);
  return shapeOf(puzzle.pieces[pieceIndex]).every(([r, c]) => {
    const rr = row + r;
    const cc = col + c;
    return rr >= 0 && cc >= 0 && rr < puzzle.rows && cc < puzzle.cols && owners[rr * puzzle.cols + cc] === -1;
  });
}

export function isSolved(puzzle: Puzzle): boolean {
  return puzzle.pieces.every((piece) => piece.at !== null);
}

function neighbours(index: number, rows: number, cols: number): number[] {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const list: number[] = [];
  if (row > 0) list.push(index - cols);
  if (row < rows - 1) list.push(index + cols);
  if (col > 0) list.push(index - 1);
  if (col < cols - 1) list.push(index + 1);
  return list;
}

/** Connected groups of cells whose owner is -1. */
function emptyRegions(owners: number[], rows: number, cols: number): number[][] {
  const seen = new Array<boolean>(owners.length).fill(false);
  const regions: number[][] = [];
  owners.forEach((owner, start) => {
    if (owner !== -1 || seen[start]) return;
    const region = [start];
    seen[start] = true;
    for (let i = 0; i < region.length; i++) {
      for (const next of neighbours(region[i], rows, cols)) {
        if (owners[next] === -1 && !seen[next]) {
          seen[next] = true;
          region.push(next);
        }
      }
    }
    regions.push(region);
  });
  return regions;
}

/**
 * Cells of an empty hole that can no longer be filled, or null. A hole is filled by whole pieces,
 * so its size must be a sum of some of the pieces still in the tray: when it is not, the box is lost.
 */
export function deadHole(puzzle: Puzzle): number[] | null {
  const sizes = puzzle.pieces.filter((piece) => !piece.at).map((piece) => piece.cells.length);
  const reachable = new Array<boolean>(puzzle.rows * puzzle.cols + 1).fill(false);
  reachable[0] = true;
  for (const size of sizes) {
    for (let sum = reachable.length - 1; sum >= size; sum--) if (reachable[sum - size]) reachable[sum] = true;
  }
  return emptyRegions(occupancy(puzzle), puzzle.rows, puzzle.cols).find((region) => !reachable[region.length]) ?? null;
}

/** 3 stars without a mistake, 2 with one, 1 otherwise. */
export function starsFor(mistakes: number): number {
  return mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
}

// -----------------------------------------------
// LEVELS AND PUZZLE GENERATION
// -----------------------------------------------

export interface BoxTier {
  rows: number;
  cols: number;
  minSize: number;
  maxSize: number;
  /** Pieces wait in the tray turned at random: they must be turned back. */
  turned: boolean;
  /** Pieces can be mirrored, and may wait mirrored. */
  flip: boolean;
  blocked: number;
}

/** One tier per difficulty, easiest first. */
export const BOX_TIERS: readonly BoxTier[] = [
  { rows: 4, cols: 4, minSize: 2, maxSize: 4, turned: false, flip: false, blocked: 0 },
  { rows: 5, cols: 4, minSize: 3, maxSize: 4, turned: false, flip: false, blocked: 0 },
  { rows: 5, cols: 5, minSize: 3, maxSize: 5, turned: true, flip: false, blocked: 0 },
  { rows: 6, cols: 5, minSize: 4, maxSize: 5, turned: true, flip: true, blocked: 0 },
  { rows: 7, cols: 6, minSize: 4, maxSize: 6, turned: true, flip: true, blocked: 3 },
];

/** Generator level per difficulty: the tier number, from 1. */
export const BOX_LEVELS: LevelTable = [1, 2, 3, 4, 5];

const MAX_ATTEMPTS = 5000;

export function generatePuzzle(tier: BoxTier, random: () => number = Math.random): Puzzle {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const puzzle = tryPartition(tier, random);
    if (puzzle) return puzzle;
  }
  throw new Error('Box generation failed');
}

/** One random cut of the box, or null when it leaves a scrap too small for a piece. */
function tryPartition(tier: BoxTier, random: () => number): Puzzle | null {
  const { rows, cols } = tier;
  const owners = new Array<number>(rows * cols).fill(-1);
  const blocked: number[] = [];
  while (blocked.length < tier.blocked) {
    const index = Math.floor(random() * owners.length);
    if (owners[index] !== -1) continue;
    owners[index] = -2;
    blocked.push(index);
  }
  if (blocked.length > 0 && emptyRegions(owners, rows, cols).length !== 1) return null;

  const freeAround = (index: number) => neighbours(index, rows, cols).filter((n) => owners[n] === -1).length;
  const groups: number[][] = [];
  for (;;) {
    const free = owners.flatMap((owner, index) => (owner === -1 ? [index] : []));
    if (free.length === 0) break;
    // Start in the tightest corner, so no lonely cell is left behind.
    const fewest = Math.min(...free.map(freeAround));
    const seeds = free.filter((index) => freeAround(index) === fewest);
    const group = [seeds[Math.floor(random() * seeds.length)]];
    owners[group[0]] = groups.length;
    const target = tier.minSize + Math.floor(random() * (tier.maxSize - tier.minSize + 1));
    while (group.length < target) {
      const frontier = [...new Set(group.flatMap((index) => neighbours(index, rows, cols)))].filter((n) => owners[n] === -1);
      if (frontier.length === 0) break;
      const next = frontier[Math.floor(random() * frontier.length)];
      owners[next] = groups.length;
      group.push(next);
    }
    if (group.length < tier.minSize) return null;
    groups.push(group);
    if (emptyRegions(owners, rows, cols).some((region) => region.length < tier.minSize)) return null;
  }

  const colors = shuffled(PIECE_COLORS.map((_, index) => index), random);
  const pieces = groups.map((group, index): Piece => {
    const cells = group.map((cell): Cell => [Math.floor(cell / cols), cell % cols]);
    return {
      cells: orient(cells, 0, false),
      color: colors[index % colors.length],
      motif: MOTIFS[Math.floor(random() * MOTIFS.length)],
      rot: tier.turned ? Math.floor(random() * 4) : 0,
      flip: tier.flip && random() < 0.5,
      at: null,
    };
  });
  // The tray must not list the pieces in the order they were cut.
  return { rows, cols, blocked, pieces: shuffled(pieces, random) };
}
