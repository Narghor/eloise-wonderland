import { shuffled } from '../../random';

// -----------------------------------------------
// THE CATS' NAP: PUZZLE AND SOLVER (no DOM)
// -----------------------------------------------
// An n x n room cut into n cushions (regions). One cat per row, per column and per cushion,
// and two cats never touch, not even by a corner. Cells are numbered row * n + col.

export interface NapTier {
  size: number;
  /** Most one-cell cushions allowed: each one gives a cat away. */
  singleCushions: number;
  /** Least hardness (see Deduction) the room must need; 0 keeps the first room found. */
  minHardness: number;
}

/** One tier per difficulty, easiest first. */
export const NAP_TIERS: readonly NapTier[] = [
  { size: 5, singleCushions: 2, minHardness: 0 },
  { size: 6, singleCushions: 1, minHardness: 0 },
  { size: 7, singleCushions: 1, minHardness: 0 },
  { size: 8, singleCushions: 0, minHardness: 0 },
  { size: 9, singleCushions: 1, minHardness: 10 },
];

export interface NapPuzzle {
  size: number;
  /** Cushion of each cell, row-major. */
  regions: number[];
  /** Column of the cat of each row. */
  cats: number[];
}

const MAX_ATTEMPTS = 4000;
const MAX_HARDEN_STEPS = 3000;

/** A room whose cats can all be found by deduction alone, without ever guessing. */
export function generateNap(tier: NapTier, random: () => number = Math.random): NapPuzzle {
  const { size } = tier;
  let last: NapPuzzle | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const cats = randomCats(size, random);
    if (!cats) continue;
    const regions = growCushions(size, cats, random);
    last = { size, regions, cats };
    if (singleCushions(size, regions) <= tier.singleCushions && solveByDeduction(size, regions)) return harden(tier, last, random);
  }
  // Never seen in tests; a room that needs a guess is still a valid room.
  return last!;
}

/**
 * Moves one border cell at a time from a cushion to its neighbour, keeping each move that leaves
 * the room solvable by deduction and at least as hard, until the tier's hardness is reached.
 * Cat cells never move, so the solution stays the same.
 */
function harden(tier: NapTier, puzzle: NapPuzzle, random: () => number): NapPuzzle {
  const { size, cats } = puzzle;
  let regions = puzzle.regions;
  let hardness = solveByDeduction(size, regions)?.hardness ?? 0;
  const catCells = new Set(cats.map((col, row) => row * size + col));
  for (let step = 0; step < MAX_HARDEN_STEPS && hardness < tier.minHardness; step++) {
    const cell = Math.floor(random() * size * size);
    if (catCells.has(cell)) continue;
    const others = sidesOf(size, cell).filter((side) => regions[side] !== regions[cell]);
    if (others.length === 0) continue;
    const moved = [...regions];
    moved[cell] = regions[others[Math.floor(random() * others.length)]];
    if (!isConnected(size, moved, regions[cell]) || singleCushions(size, moved) > tier.singleCushions) continue;
    const deduction = solveByDeduction(size, moved);
    if (!deduction || deduction.hardness < hardness) continue;
    regions = moved;
    hardness = deduction.hardness;
  }
  return { size, regions, cats };
}

function isConnected(size: number, regions: readonly number[], region: number): boolean {
  const start = regions.indexOf(region);
  const reached = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    for (const side of sidesOf(size, queue.pop()!)) {
      if (regions[side] !== region || reached.has(side)) continue;
      reached.add(side);
      queue.push(side);
    }
  }
  return reached.size === regions.filter((owner) => owner === region).length;
}

/** The cells sharing a side with this one. */
function sidesOf(size: number, cell: number): number[] {
  const row = Math.floor(cell / size);
  const col = cell % size;
  const sides: number[] = [];
  if (row > 0) sides.push(cell - size);
  if (row < size - 1) sides.push(cell + size);
  if (col > 0) sides.push(cell - 1);
  if (col < size - 1) sides.push(cell + 1);
  return sides;
}

function singleCushions(size: number, regions: readonly number[]): number {
  const cells = new Array<number>(size).fill(0);
  for (const region of regions) cells[region]++;
  return cells.filter((count) => count === 1).length;
}

export function touches(size: number, a: number, b: number): boolean {
  return a !== b && Math.abs(Math.floor(a / size) - Math.floor(b / size)) <= 1 && Math.abs((a % size) - (b % size)) <= 1;
}

/** One column per row, all different, two neighbouring rows never one column apart or less. */
function randomCats(size: number, random: () => number): number[] | null {
  const cats: number[] = [];
  const used = new Set<number>();
  const place = (row: number): boolean => {
    if (row === size) return true;
    for (const col of shuffled([...Array(size).keys()], random)) {
      if (used.has(col) || (row > 0 && Math.abs(cats[row - 1] - col) <= 1)) continue;
      cats.push(col);
      used.add(col);
      if (place(row + 1)) return true;
      cats.pop();
      used.delete(col);
    }
    return false;
  };
  return place(0) ? cats : null;
}

/**
 * Each cushion starts under its cat and grows, cell by cell, into its free neighbours, each at
 * its own pace: small cushions next to big ones are what give the player something to deduce.
 */
function growCushions(size: number, cats: number[], random: () => number): number[] {
  const regions = new Array<number>(size * size).fill(-1);
  cats.forEach((col, row) => (regions[row * size + col] = row));
  const pace = cats.map(() => random() ** 3 + 0.02);
  const totalPace = pace.reduce((sum, value) => sum + value, 0);
  let free = size * size - size;
  while (free > 0) {
    let pick = random() * totalPace;
    let region = 0;
    while (pick > pace[region] && region < size - 1) pick -= pace[region++];
    const border: number[] = [];
    regions.forEach((owner, cell) => {
      if (owner === -1 && sidesOf(size, cell).some((side) => regions[side] === region)) border.push(cell);
    });
    if (border.length === 0) continue;
    regions[border[Math.floor(random() * border.length)]] = region;
    free--;
  }
  return regions;
}

// -----------------------------------------------
// SOLVING BY DEDUCTION
// -----------------------------------------------

export interface Deduction {
  /** Column of the cat of each row. */
  cats: number[];
  /** Times the simple rule found nothing: 1 per cushion held in one line, 2 per blocking cell. */
  hardness: number;
}

/**
 * Solves the room with the deductions a player makes: a line or cushion with one free cell,
 * a cushion held in one line (or a line in one cushion), and a cell that would leave a line or
 * a cushion without any free cell. Returns null when it would need a guess.
 */
export function solveByDeduction(size: number, regions: readonly number[]): Deduction | null {
  const free = new Array<boolean>(size * size).fill(true);
  const cats = new Array<number>(size).fill(-1);
  const units = unitsOf(size, regions);

  const place = (cell: number): void => {
    const row = Math.floor(cell / size);
    cats[row] = cell % size;
    for (let other = 0; other < free.length; other++) {
      if (other === cell) continue;
      if (Math.floor(other / size) === row || other % size === cell % size || regions[other] === regions[cell] || touches(size, cell, other)) {
        free[other] = false;
      }
    }
  };

  let hardness = 0;
  let progress = true;
  while (progress) {
    progress = false;
    for (const unit of units) {
      if (unit.some((cell) => isCat(cats, size, cell))) continue;
      const open = unit.filter((cell) => free[cell]);
      if (open.length === 0) return null;
      if (open.length === 1) {
        place(open[0]);
        progress = true;
      }
    }
    if (progress) continue;
    if (confine(size, free, units, cats)) {
      hardness += 1;
      progress = true;
    } else if (blockers(size, regions, free, units, cats)) {
      hardness += 2;
      progress = true;
    }
  }
  return cats.every((col) => col >= 0) ? { cats, hardness } : null;
}

function isCat(cats: number[], size: number, cell: number): boolean {
  return cats[Math.floor(cell / size)] === cell % size;
}

/** Every row, every column and every cushion, as lists of cells. */
function unitsOf(size: number, regions: readonly number[]): number[][] {
  const units: number[][] = [];
  for (let i = 0; i < size; i++) {
    units.push([...Array(size).keys()].map((col) => i * size + col));
    units.push([...Array(size).keys()].map((row) => row * size + i));
    units.push(regions.flatMap((region, cell) => (region === i ? [cell] : [])));
  }
  return units;
}

/** A unit whose free cells all lie in one other unit claims it: that unit's other cells are freed of a cat. */
function confine(size: number, free: boolean[], units: number[][], cats: number[]): boolean {
  let changed = false;
  for (const unit of units) {
    if (unit.some((cell) => isCat(cats, size, cell))) continue;
    const open = unit.filter((cell) => free[cell]);
    for (const other of units) {
      if (other === unit || !open.every((cell) => other.includes(cell))) continue;
      for (const cell of other) {
        if (free[cell] && !unit.includes(cell)) {
          free[cell] = false;
          changed = true;
        }
      }
    }
  }
  return changed;
}

/** A free cell whose cat would leave some line or cushion with no free cell cannot hold a cat. */
function blockers(size: number, regions: readonly number[], free: boolean[], units: number[][], cats: number[]): boolean {
  let changed = false;
  for (let cell = 0; cell < free.length; cell++) {
    if (!free[cell]) continue;
    const row = Math.floor(cell / size);
    const col = cell % size;
    const blocked = (other: number) =>
      other === cell || Math.floor(other / size) === row || other % size === col || regions[other] === regions[cell] || touches(size, cell, other);
    const starves = units.some(
      (unit) => !unit.includes(cell) && !unit.some((other) => isCat(cats, size, other)) && unit.every((other) => !free[other] || blocked(other)),
    );
    if (starves) {
      free[cell] = false;
      changed = true;
    }
  }
  return changed;
}
