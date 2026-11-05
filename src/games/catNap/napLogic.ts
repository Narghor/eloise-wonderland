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
}

/** One tier per difficulty, easiest first. */
export const NAP_TIERS: readonly NapTier[] = [
  { size: 5, singleCushions: 2 },
  { size: 6, singleCushions: 1 },
  { size: 7, singleCushions: 1 },
  { size: 8, singleCushions: 0 },
  { size: 9, singleCushions: 1 },
];

export interface NapPuzzle {
  size: number;
  /** Cushion of each cell, row-major. */
  regions: number[];
  /** Column of the cat of each row. */
  cats: number[];
}

const MAX_ATTEMPTS = 4000;

/** A room whose cats can all be found by deduction alone, without ever guessing. */
export function generateNap(tier: NapTier, random: () => number = Math.random): NapPuzzle {
  const { size } = tier;
  let last: NapPuzzle | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const cats = randomCats(size, random);
    if (!cats) continue;
    const regions = growCushions(size, cats, random);
    last = { size, regions, cats };
    if (singleCushions(size, regions) <= tier.singleCushions && solveByDeduction(size, regions)) return last;
  }
  // Never seen in tests; a room that needs a guess is still a valid room.
  return last!;
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
      if (owner !== -1) return;
      const row = Math.floor(cell / size);
      const col = cell % size;
      const sides = [row > 0 ? cell - size : -1, row < size - 1 ? cell + size : -1, col > 0 ? cell - 1 : -1, col < size - 1 ? cell + 1 : -1];
      if (sides.some((side) => side >= 0 && regions[side] === region)) border.push(cell);
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

/**
 * Solves the room with the deductions a player makes: a line or cushion with one free cell,
 * a cushion held in one line (or a line in one cushion), and a cell that would leave a line or
 * a cushion without any free cell. Returns the cats' columns, or null when it would need a guess.
 */
export function solveByDeduction(size: number, regions: readonly number[]): number[] | null {
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
    progress = confine(size, free, units, cats) || blockers(size, regions, free, units, cats);
  }
  return cats.every((col) => col >= 0) ? cats : null;
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
