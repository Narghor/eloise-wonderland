// -----------------------------------------------
// OLYMPUS SLOT ("Le Regard de Medusa") - pure maths, no DOM
// -----------------------------------------------
// 6x5, 20 lines, high volatility. Medusa is the top symbol AND the wild. The base
// game is dry; in the free spins every reel may land as a full stack of Medusa, so
// the screen floods with her. Scatters retrigger without limit (only a safety cap
// on the total).

export const COLS = 6;
export const ROWS = 5;
export const CELLS = COLS * ROWS;
export const BETS = [10, 20, 50, 100, 200, 500, 1000];

export type Rng = () => number;

export interface SymbolDef {
  glyph: string;
  /** Base-game weight; the free spins use FREE_TILT on top. */
  weight: number;
  /** Pays for 3, 4, 5, 6 on a line, in multiples of the TOTAL bet. */
  pays: [number, number, number, number];
}

export const SYMBOLS: SymbolDef[] = [
  { glyph: 'J', weight: 30, pays: [0.2, 0.5, 1, 2.5] },
  { glyph: 'Q', weight: 30, pays: [0.2, 0.5, 1, 2.5] },
  { glyph: 'K', weight: 28, pays: [0.25, 0.6, 1.25, 3] },
  { glyph: 'A', weight: 26, pays: [0.3, 0.75, 1.5, 4] },
  { glyph: '🏺', weight: 18, pays: [0.5, 1.25, 3, 8] },
  { glyph: '🛡️', weight: 14, pays: [0.75, 1.75, 4, 12] },
  { glyph: '🦉', weight: 11, pays: [1, 2.5, 6, 18] },
  { glyph: '🔱', weight: 9, pays: [1.25, 3.5, 10, 25] },
  { glyph: '🐍', weight: 4, pays: [1.75, 5, 15, 80] },
  { glyph: '🏛️', weight: 0, pays: [0, 0, 0, 0] },
];
/** Medusa pays her own lines and stands in for every symbol but the temple. */
export const MEDUSA = 8;
export const SCATTER = 9;
const PAYING = 9;

/** Base game: extra chance per cell, off the first reel, to show Medusa. */
export const BASE_EXTRA_MEDUSA_CHANCE = 0.008;
/** Chance per cell to show a temple. */
export const BASE_SCATTER_CHANCE = 0.0128;
export const FREE_SCATTER_CHANCE = 0.03;
/** Free spins: chance per reel to be a full stack of Medusa. */
export const FREE_MEDUSA_STACK = 0.285;

export const FREE_SPINS_BY_SCATTERS: Record<number, number> = { 3: 10, 4: 25, 5: 100 };
export const MIN_SCATTERS = 3;
/** Spins added in the free spins by 3+ temples, however many (the 4 and 5 rows are for the base game). */
export const FREE_RETRIGGER_SPINS = 10;
/** A feature always pays at least this many times the bet (topped up at the end). */
export const FREE_SPINS_MIN_X = 10;
/** Safety cap on the spins of one feature, retriggers included. */
export const MAX_FREE_SPINS = 500;

/** Row index per column, for each of the 20 lines. */
export const LINES: number[][] = [
  [2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1], [3, 3, 3, 3, 3, 3], [0, 0, 0, 0, 0, 0], [4, 4, 4, 4, 4, 4],
  [0, 1, 2, 2, 1, 0], [4, 3, 2, 2, 3, 4], [1, 2, 3, 3, 2, 1], [3, 2, 1, 1, 2, 3], [2, 1, 0, 0, 1, 2],
  [2, 3, 4, 4, 3, 2], [0, 1, 0, 1, 0, 1], [4, 3, 4, 3, 4, 3], [1, 2, 1, 2, 1, 2], [3, 2, 3, 2, 3, 2],
  [2, 1, 2, 1, 2, 1], [2, 3, 2, 3, 2, 3], [0, 1, 2, 3, 4, 4], [4, 3, 2, 1, 0, 0], [1, 1, 2, 2, 3, 3],
];

/** grid[col][row] = symbol index. */
export type Grid = number[][];

export interface LineWin {
  line: number;
  symbol: number;
  count: number;
  /** In multiples of the total bet. */
  mult: number;
}

/** Per-reel tilt of the symbol weights (1 = as listed): odd and even reels favour different symbols, which keeps the base game dry. */
const REEL_TILT: number[][] = [
  [1.3, 0.75, 1.3, 0.75, 1.3, 0.75, 1.3, 0.75, 1],
  [0.75, 1.3, 0.75, 1.3, 0.75, 1.3, 0.75, 1.3, 1],
  [1.3, 0.75, 1.3, 0.75, 1.3, 0.75, 1.3, 0.75, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
];
/** Free spins: the loose cells are even (no reel tilt) and never Medusa: she only comes as full stacks. */
const FREE_TILT = [1, 1, 1, 1, 1, 1, 1, 1, 0];
const REEL_WEIGHTS = REEL_TILT.map((tilt) => SYMBOLS.slice(0, PAYING).map((s, i) => s.weight * tilt[i]));
const FREE_WEIGHTS = SYMBOLS.slice(0, PAYING).map((s, i) => s.weight * FREE_TILT[i]);

function drawPaying(rng: Rng, weights: number[]): number {
  let roll = rng() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < PAYING - 1; i++) {
    roll -= weights[i];
    if (roll < 0) return i;
  }
  return PAYING - 1;
}

function drawCell(rng: Rng, col: number, free: boolean): number {
  if (rng() < (free ? FREE_SCATTER_CHANCE : BASE_SCATTER_CHANCE)) return SCATTER;
  if (!free && col > 0 && rng() < BASE_EXTRA_MEDUSA_CHANCE) return MEDUSA;
  return drawPaying(rng, free ? FREE_WEIGHTS : REEL_WEIGHTS[col]);
}

/** Test outcomes: temples on the next base spin, or a screen flooded with Medusa in the free spins. */ // TEST-BUTTONS
export type OlympusForce = 'free3' | 'free5' | 'flood'; // TEST-BUTTONS

export function spinGrid(rng: Rng, free: boolean, force?: OlympusForce): Grid { // TEST-BUTTONS
  const grid: Grid = [];
  for (let c = 0; c < COLS; c++) {
    if (free) {
      const roll = force === 'flood' ? 0 : rng(); // TEST-BUTTONS
      if (roll < FREE_MEDUSA_STACK) {
        grid.push(Array(ROWS).fill(MEDUSA));
        continue;
      }
    }
    const column: number[] = [];
    for (let r = 0; r < ROWS; r++) column.push(drawCell(rng, c, free));
    grid.push(column);
  }
  const temples = force === 'free5' ? [[0, 0], [1, 3], [2, 1], [3, 4], [5, 2]] : force === 'free3' ? [[0, 3], [2, 0], [5, 1]] : []; // TEST-BUTTONS
  temples.forEach(([c, r]) => (grid[c][r] = SCATTER)); // TEST-BUTTONS
  return grid;
}

export function scatterCount(grid: Grid): number {
  let n = 0;
  for (const column of grid) for (const s of column) if (s === SCATTER) n++;
  return n;
}

/** Reels fully covered by Medusa (the stacks of the free spins). */
export function medusaReels(grid: Grid): number[] {
  const reels: number[] = [];
  grid.forEach((column, c) => {
    if (column.every((s) => s === MEDUSA)) reels.push(c);
  });
  return reels;
}

export function lineWins(grid: Grid): LineWin[] {
  const wins: LineWin[] = [];
  LINES.forEach((rows, line) => {
    const cells = rows.map((row, col) => grid[col][row]);
    // Leading Medusas pay as Medusa; the line also pays the first other symbol they stand in for. The better one wins.
    let medusaRun = 0;
    while (medusaRun < COLS && cells[medusaRun] === MEDUSA) medusaRun++;
    const symbol = cells[medusaRun];
    let count = medusaRun;
    if (medusaRun < COLS && symbol !== SCATTER) {
      while (count < COLS && (cells[count] === symbol || cells[count] === MEDUSA)) count++;
    }
    const own = medusaRun >= 3 ? SYMBOLS[MEDUSA].pays[medusaRun - 3] : 0;
    const other = count >= 3 && count > medusaRun && symbol !== SCATTER ? SYMBOLS[symbol].pays[count - 3] : 0;
    if (own === 0 && other === 0) return;
    wins.push(own >= other ? { line, symbol: MEDUSA, count: medusaRun, mult: own } : { line, symbol, count, mult: other });
  });
  return wins;
}

export function winMult(wins: LineWin[]): number {
  return wins.reduce((sum, w) => sum + w.mult, 0);
}

export function freeSpinsFor(scatters: number): number {
  return FREE_SPINS_BY_SCATTERS[Math.min(scatters, 5)] ?? 0;
}

// -----------------------------------------------
// FREE SPINS
// -----------------------------------------------

export interface FreeSpin {
  grid: Grid;
  wins: LineWin[];
  /** In multiples of the bet. */
  mult: number;
  /** Spins added by this spin (retrigger). */
  added: number;
  spinsLeft: number;
}

export interface FreeSpinsResult {
  spins: FreeSpin[];
  /** Total in multiples of the bet, the top-up included. */
  mult: number;
  /** Added at the end to reach FREE_SPINS_MIN_X (0 when the spins paid enough). */
  topUp: number;
  /** True when the safety cap cut retriggers. */
  capped: boolean;
}

export function playFreeSpins(rng: Rng, startSpins: number, boostSpins = 0): FreeSpinsResult { // TEST-BUTTONS
  const spins: FreeSpin[] = [];
  let left = startSpins;
  let awarded = startSpins;
  let total = 0;
  let capped = false;
  while (left > 0) {
    left--;
    const grid = spinGrid(rng, true, spins.length < boostSpins ? 'flood' : undefined); // TEST-BUTTONS
    const wins = lineWins(grid);
    const mult = winMult(wins);
    let added = scatterCount(grid) >= MIN_SCATTERS ? FREE_RETRIGGER_SPINS : 0;
    if (awarded + added > MAX_FREE_SPINS) {
      capped = capped || added > 0;
      added = MAX_FREE_SPINS - awarded;
    }
    awarded += added;
    left += added;
    total += mult;
    spins.push({ grid, wins, mult, added, spinsLeft: left });
  }
  const topUp = Math.max(0, FREE_SPINS_MIN_X - total);
  return { spins, mult: total + topUp, topUp, capped };
}

/** Chips for a multiple of the bet. */
export function chipsFor(mult: number, bet: number): number {
  return Math.round(mult * bet);
}
