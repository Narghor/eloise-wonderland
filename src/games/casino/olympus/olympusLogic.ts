// -----------------------------------------------
// OLYMPUS SLOT ("Foudre de l'Olympe") - pure maths, no DOM
// -----------------------------------------------
// 5x3, 30 lines, high volatility. The base game is dry; the free spins swap in
// a richer reel set where Zeus and the lightning wild land as full-reel stacks.
// Scatters retrigger without limit (only a safety cap on the total).

export const COLS = 5;
export const ROWS = 3;
export const CELLS = COLS * ROWS;
export const BETS = [10, 20, 50, 100, 200, 500, 1000];

export type Rng = () => number;

export interface SymbolDef {
  glyph: string;
  /** Base-game weight; the free spins use FREE_WEIGHTS. */
  weight: number;
  /** Pays for 3, 4, 5 on a line, in multiples of the TOTAL bet. */
  pays: [number, number, number];
}

export const SYMBOLS: SymbolDef[] = [
  { glyph: 'J', weight: 30, pays: [0.5, 1.5, 6] },
  { glyph: 'Q', weight: 30, pays: [0.5, 1.5, 6] },
  { glyph: 'K', weight: 28, pays: [0.6, 1.8, 7] },
  { glyph: 'A', weight: 26, pays: [0.9, 2.4, 9] },
  { glyph: '🏺', weight: 18, pays: [1.8, 6, 24] },
  { glyph: '🛡️', weight: 14, pays: [2.4, 9, 35] },
  { glyph: '🦉', weight: 11, pays: [3.5, 12, 45] },
  { glyph: '🔱', weight: 9, pays: [6, 18, 75] },
  { glyph: '👑', weight: 6, pays: [9, 30, 150] },
  { glyph: '⚡', weight: 0, pays: [0, 0, 0] },
  { glyph: '🏛️', weight: 0, pays: [0, 0, 0] },
];
export const ZEUS = 8;
export const WILD = 9;
export const SCATTER = 10;
const PAYING = 9;

/** Reels (0-based) where the wild can land; never reel 1, so a line's symbol is its first cell. */
export const WILD_REELS = [1, 2, 3, 4];
/** Base game: chance per cell on a wild reel to show a single wild. */
export const BASE_WILD_CHANCE = 0.02;
/** Chance per cell to show a temple. */
export const BASE_SCATTER_CHANCE = 0.0225;
export const FREE_SCATTER_CHANCE = 0.0125;
/** Free spins: chance per reel to be a full stack of Zeus (any reel) or of wilds (wild reels). */
export const FREE_ZEUS_STACK = 0.142;
export const FREE_WILD_STACK = 0.097;

export const FREE_SPINS_BY_SCATTERS: Record<number, number> = { 3: 10, 4: 25, 5: 100 };
export const MIN_SCATTERS = 3;
/** Safety cap on the spins of one feature, retriggers included. */
export const MAX_FREE_SPINS = 500;

/** Row index per column, for each of the 30 lines. */
export const LINES: number[][] = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2], [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2], [1, 0, 2, 0, 1], [1, 2, 0, 2, 1], [0, 2, 2, 2, 0], [2, 0, 0, 0, 2],
  [0, 0, 1, 0, 0], [2, 2, 1, 2, 2], [1, 1, 1, 0, 0], [1, 1, 1, 2, 2], [0, 1, 2, 2, 2],
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
  [2.2, 0.3, 2.2, 0.3, 2.2, 0.3, 2.2, 0.3, 1],
  [0.3, 2.2, 0.3, 2.2, 0.3, 2.2, 0.3, 2.2, 1],
  [2.2, 0.3, 2.2, 0.3, 2.2, 0.3, 2.2, 0.3, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
];
const REEL_WEIGHTS = REEL_TILT.map((tilt) => SYMBOLS.slice(0, PAYING).map((s, i) => s.weight * tilt[i]));

function drawPaying(rng: Rng, col: number): number {
  const weights = REEL_WEIGHTS[col];
  let roll = rng() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < PAYING - 1; i++) {
    roll -= weights[i];
    if (roll < 0) return i;
  }
  return PAYING - 1;
}

function drawCell(rng: Rng, col: number, free: boolean): number {
  if (rng() < (free ? FREE_SCATTER_CHANCE : BASE_SCATTER_CHANCE)) return SCATTER;
  if (!free && WILD_REELS.includes(col) && rng() < BASE_WILD_CHANCE) return WILD;
  return drawPaying(rng, col);
}

/** Test outcomes: temples on the next base spin, or every reel stacked in the free spins. */ // TEST-BUTTONS
export type OlympusForce = 'free3' | 'free5' | 'stacks'; // TEST-BUTTONS

export function spinGrid(rng: Rng, free: boolean, force?: OlympusForce): Grid { // TEST-BUTTONS
  const grid: Grid = [];
  for (let c = 0; c < COLS; c++) {
    if (free) {
      const roll = force === 'stacks' ? (c === 0 ? 0 : c < 3 ? FREE_ZEUS_STACK + rng() * FREE_WILD_STACK : 1) : rng(); // TEST-BUTTONS
      if (roll < FREE_ZEUS_STACK) {
        grid.push([ZEUS, ZEUS, ZEUS]);
        continue;
      }
      if (WILD_REELS.includes(c) && roll < FREE_ZEUS_STACK + FREE_WILD_STACK) {
        grid.push([WILD, WILD, WILD]);
        continue;
      }
    }
    const column: number[] = [];
    for (let r = 0; r < ROWS; r++) column.push(drawCell(rng, c, free));
    grid.push(column);
  }
  const temples = force === 'free5' ? [[0, 0], [1, 2], [2, 1], [3, 0], [4, 2]] : force === 'free3' ? [[0, 2], [2, 0], [4, 1]] : []; // TEST-BUTTONS
  temples.forEach(([c, r]) => (grid[c][r] = SCATTER)); // TEST-BUTTONS
  return grid;
}

export function scatterCount(grid: Grid): number {
  let n = 0;
  for (const column of grid) for (const s of column) if (s === SCATTER) n++;
  return n;
}

/** Reels fully covered by one symbol (the stacks of the free spins). */
export function stackedReels(grid: Grid): number[] {
  const reels: number[] = [];
  grid.forEach((column, c) => {
    if (column[0] !== SCATTER && column.every((s) => s === column[0]) && (column[0] === WILD || column[0] === ZEUS)) reels.push(c);
  });
  return reels;
}

export function lineWins(grid: Grid): LineWin[] {
  const wins: LineWin[] = [];
  LINES.forEach((rows, line) => {
    const symbol = grid[0][rows[0]];
    if (symbol >= PAYING) return;
    let count = 1;
    while (count < COLS) {
      const s = grid[count][rows[count]];
      if (s !== symbol && s !== WILD) break;
      count++;
    }
    if (count >= 3) wins.push({ line, symbol, count, mult: SYMBOLS[symbol].pays[count - 3] });
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
  /** Total in multiples of the bet. */
  mult: number;
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
    const grid = spinGrid(rng, true, spins.length < boostSpins ? 'stacks' : undefined); // TEST-BUTTONS
    const wins = lineWins(grid);
    const mult = winMult(wins);
    let added = freeSpinsFor(scatterCount(grid));
    if (awarded + added > MAX_FREE_SPINS) {
      capped = capped || added > 0;
      added = MAX_FREE_SPINS - awarded;
    }
    awarded += added;
    left += added;
    total += mult;
    spins.push({ grid, wins, mult, added, spinsLeft: left });
  }
  return { spins, mult: total, capped };
}

/** Chips for a multiple of the bet. */
export function chipsFor(mult: number, bet: number): number {
  return Math.round(mult * bet);
}
