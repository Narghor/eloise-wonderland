// -----------------------------------------------
// OLYMPUS SLOT ("Foudre de l'Olympe") - pure maths, no DOM
// -----------------------------------------------
// 5x3, 30 lines. The base game returns very little; almost everything is in
// the free spins, where whole reels of wilds raise a multiplier that never
// goes back down for the rest of the feature (capped at MAX_MULTIPLIER).

export const COLS = 5;
export const ROWS = 3;
export const CELLS = COLS * ROWS;
export const BETS = [10, 20, 50, 100, 200];
/** Measured RTP (see the simulation), shown in the rules. */
export const RTP = 93.8;

export type Rng = () => number;

export interface SymbolDef {
  glyph: string;
  weight: number;
  /** Pays for 3, 4, 5 on a line, in multiples of the TOTAL bet. */
  pays: [number, number, number];
}

export const SYMBOLS: SymbolDef[] = [
  { glyph: 'J', weight: 30, pays: [0.1, 0.4, 1.5] },
  { glyph: 'Q', weight: 28, pays: [0.1, 0.3, 1.2] },
  { glyph: 'K', weight: 25, pays: [0.1, 0.4, 1.5] },
  { glyph: 'A', weight: 22, pays: [0.2, 1, 3] },
  { glyph: '🍇', weight: 14, pays: [0.6, 2.5, 10] },
  { glyph: '🏺', weight: 11, pays: [1, 4, 15] },
  { glyph: '🛡️', weight: 8, pays: [1.5, 6, 25] },
  { glyph: '🦉', weight: 6, pays: [2.5, 10, 40] },
  { glyph: '🔱', weight: 4, pays: [5, 20, 100] },
  { glyph: '⚡', weight: 0, pays: [0, 0, 0] },
  { glyph: '🏛️', weight: 0, pays: [0, 0, 0] },
];
export const WILD = 9;
export const SCATTER = 10;
const PAYING = 9;
const PAYING_WEIGHT = SYMBOLS.slice(0, PAYING).reduce((s, x) => s + x.weight, 0);

/** Chance per cell to show a temple. */
export const SCATTER_CHANCE = 0.0275;
/** Reels (0-based) that can turn fully wild. */
export const WILD_REELS = [1, 2, 3];
/** Chance per wild reel per spin to land a full stack of lightning. */
export const BASE_STACK_CHANCE = 0.028;
export const FREE_STACK_CHANCE = 0.1615;

export const FREE_SPINS_BY_SCATTERS: Record<number, number> = { 3: 10, 4: 15, 5: 25 };
export const RETRIGGER_SPINS = 10;
export const MIN_SCATTERS = 3;
export const MAX_MULTIPLIER = 10;

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
  /** In multiples of the total bet, before any multiplier. */
  mult: number;
}

function drawCell(rng: Rng): number {
  if (rng() < SCATTER_CHANCE) return SCATTER;
  let roll = rng() * PAYING_WEIGHT;
  for (let i = 0; i < PAYING - 1; i++) {
    roll -= SYMBOLS[i].weight;
    if (roll < 0) return i;
  }
  return PAYING - 1;
}

export function spinGrid(rng: Rng, free: boolean): Grid {
  const stackChance = free ? FREE_STACK_CHANCE : BASE_STACK_CHANCE;
  const grid: Grid = [];
  for (let c = 0; c < COLS; c++) {
    if (WILD_REELS.includes(c) && rng() < stackChance) {
      grid.push([WILD, WILD, WILD]);
      continue;
    }
    const column: number[] = [];
    for (let r = 0; r < ROWS; r++) column.push(drawCell(rng));
    grid.push(column);
  }
  return grid;
}

export function scatterCount(grid: Grid): number {
  let n = 0;
  for (const column of grid) for (const s of column) if (s === SCATTER) n++;
  return n;
}

export function wildReelCount(grid: Grid): number {
  return grid.filter((column) => column[0] === WILD).length;
}

/** Left to right; wilds never sit on reel 1, so a line's symbol is always its first cell. */
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
// Every lightning reel that lands adds +1 to the multiplier, which then
// applies to that spin and all the following ones.

export interface FreeSpin {
  grid: Grid;
  wins: LineWin[];
  /** Multiplier applied to this spin (already raised by its own wild reels). */
  multiplier: number;
  /** In multiples of the bet, multiplier included. */
  mult: number;
  /** Spins added by this spin (retrigger). */
  added: number;
  spinsLeft: number;
}

export interface FreeSpinsResult {
  spins: FreeSpin[];
  /** Total in multiples of the bet. */
  mult: number;
}

export function playFreeSpins(rng: Rng, startSpins: number): FreeSpinsResult {
  const spins: FreeSpin[] = [];
  let left = startSpins;
  let multiplier = 1;
  let total = 0;
  while (left > 0) {
    left--;
    const grid = spinGrid(rng, true);
    multiplier = Math.min(MAX_MULTIPLIER, multiplier + wildReelCount(grid));
    const wins = lineWins(grid);
    const mult = winMult(wins) * multiplier;
    const added = scatterCount(grid) >= MIN_SCATTERS ? RETRIGGER_SPINS : 0;
    left += added;
    total += mult;
    spins.push({ grid, wins, multiplier, mult, added, spinsLeft: left });
  }
  return { spins, mult: total };
}

/** Chips for a multiple of the bet. */
export function chipsFor(mult: number, bet: number): number {
  return Math.round(mult * bet);
}
