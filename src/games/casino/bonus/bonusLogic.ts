// -----------------------------------------------
// BONUS SLOT ("machine a porte") - pure maths, no DOM
// -----------------------------------------------
// Base game: 5x3, 10 lines, small and medium wins. A door on reels 1, 3 and 5 opens the
// Hold & Spin bonus. Its coins are worth multiples of the bet, and higher bets
// unlock bigger jackpots, so the RTP rises a little with the bet.

export const MACHINE_ID = 'slots-bonus';
export const COLS = 5;
export const ROWS = 3;
export const CELLS = COLS * ROWS;
export const JACKPOT_FEED = 0.01;
/** The Grand pays at least this many bets, topping up the progressive pool. */
export const GRAND_MIN_BETS = 1380;
/** Share of the table paid by the base game: kept light, the door bonus carries the machine. */
export const PAY_SCALE = 0.6;

export type Rng = () => number;
/** 'door' opens the bonus; a number forces that jackpot tier in it. */ // TEST-BUTTONS
export type BonusForce = 'door' | number; // TEST-BUTTONS

export interface BetLevel {
  bet: number;
  /** Highest jackpot reachable: 0 Mini, 1 Minor, 2 Major, 3 Grand. */
  jackpotTier: number;
}

// Simulated RTP (4M spins, pool feed included): 94.8 / 95.7 / 96.4 / 96.6 by tier.
export const BET_LEVELS: BetLevel[] = [
  { bet: 10, jackpotTier: 0 },
  { bet: 20, jackpotTier: 0 },
  { bet: 50, jackpotTier: 1 },
  { bet: 100, jackpotTier: 1 },
  { bet: 200, jackpotTier: 2 },
  { bet: 500, jackpotTier: 3 },
  { bet: 1000, jackpotTier: 3 },
];

// -----------------------------------------------
// BASE GAME
// -----------------------------------------------

export interface SymbolDef {
  id: string;
  glyph: string;
  weight: number;
  /** Pays for 3, 4, 5 in a row, in multiples of the TOTAL bet. */
  pays: [number, number, number];
}

export const SYMBOLS: SymbolDef[] = [
  { id: 'cherry', glyph: '🍒', weight: 30, pays: [0.15, 0.8, 2.5] },
  { id: 'lemon', glyph: '🍋', weight: 26, pays: [0.25, 1.2, 4] },
  { id: 'bell', glyph: '🔔', weight: 18, pays: [0.5, 2.5, 8] },
  { id: 'star', glyph: '⭐', weight: 12, pays: [1, 5, 15] },
  { id: 'gem', glyph: '💎', weight: 7, pays: [2, 10, 40] },
  { id: 'seven', glyph: '7️⃣', weight: 4, pays: [4, 20, 100] },
  { id: 'door', glyph: '🚪', weight: 0, pays: [0, 0, 0] },
];
export const DOOR = SYMBOLS.length - 1;
/** Reels (0-based) that can show a door; one door on each triggers the bonus. */
export const DOOR_REELS = [0, 2, 4];
/** Weight a door used to have in each cell: kept as the source of the reel's door chance below. */
const DOOR_WEIGHT = 8;
const BASE_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
/**
 * A door reel shows at most one door (two doors on a reel counted once, which looked like a cheat).
 * Its chance of showing one is the old chance of showing at least one, so the bonus is exactly as frequent.
 */
export const DOOR_REEL_CHANCE = 1 - (BASE_WEIGHT / (BASE_WEIGHT + DOOR_WEIGHT)) ** ROWS;

/** Row index per column, for each of the 10 lines. */
export const LINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
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

function drawSymbol(rng: Rng): number {
  let roll = rng() * BASE_WEIGHT;
  for (let i = 0; i < DOOR; i++) {
    roll -= SYMBOLS[i].weight;
    if (roll < 0) return i;
  }
  return DOOR - 1;
}

export function spinGrid(rng: Rng, force?: BonusForce): Grid { // TEST-BUTTONS
  const grid: Grid = [];
  for (let c = 0; c < COLS; c++) {
    const column: number[] = [];
    for (let r = 0; r < ROWS; r++) column.push(drawSymbol(rng));
    if (DOOR_REELS.includes(c) && rng() < DOOR_REEL_CHANCE) column[Math.floor(rng() * ROWS)] = DOOR;
    if (force !== undefined && DOOR_REELS.includes(c)) { // TEST-BUTTONS
      for (let r = 0; r < ROWS; r++) if (column[r] === DOOR) column[r] = drawSymbol(rng); // TEST-BUTTONS
      column[1] = DOOR; // TEST-BUTTONS
    } // TEST-BUTTONS
    grid.push(column);
  }
  return grid;
}

export function hasDoor(grid: Grid, column: number): boolean {
  return grid[column].includes(DOOR);
}

export function triggersBonus(grid: Grid): boolean {
  return DOOR_REELS.every((c) => hasDoor(grid, c));
}

export function lineWins(grid: Grid): LineWin[] {
  const wins: LineWin[] = [];
  LINES.forEach((rows, line) => {
    const symbol = grid[0][rows[0]];
    if (symbol === DOOR) return;
    let count = 1;
    while (count < COLS && grid[count][rows[count]] === symbol) count++;
    if (count >= 3) wins.push({ line, symbol, count, mult: SYMBOLS[symbol].pays[count - 3] * PAY_SCALE });
  });
  return wins;
}

/** Chips paid by the base game for this grid. */
export function basePayout(wins: LineWin[], bet: number): number {
  const mult = wins.reduce((sum, w) => sum + w.mult, 0);
  return Math.round(mult * bet);
}

/** What the Grand pays for a given pool and bet. */
export function grandPrize(pool: number, bet: number): number {
  return Math.max(Math.floor(pool), GRAND_MIN_BETS * bet);
}

// -----------------------------------------------
// HOLD & SPIN BONUS
// -----------------------------------------------

export const START_COINS = 6;
/** A bonus always pays at least this many times the bet. */
export const BONUS_MIN_X = 30;
export const RESPINS = 3;
/** Chance per empty cell per respin to land a coin. */
export const LAND_CHANCE = 0.04;

export const JACKPOT_NAMES = ['Mini', 'Minor', 'Major', 'Grand'];
/** Fixed jackpots in multiples of the bet (Grand is the progressive pool). */
export const JACKPOT_MULTS = [12, 55, 275];
/** Each spin at a bet level grows that level's Minor and Major by this many bets (the Mini stays fixed). */
export const JACKPOT_GROWTH = [0, 0.015, 0.03];
/**
 * The opening coins are small; the coins landing on a respin carry the big values and every jackpot,
 * so a bonus builds up as it goes. Weights tuned by simulation: same average bonus as one shared table.
 */
export const OPENING_COIN_VALUES: [number, number][] = [[4, 30], [5, 26], [8, 16], [10, 12], [15, 7]];
export const RESPIN_COIN_VALUES: [number, number][] = [[8, 16], [10, 12], [15, 7], [40, 16], [80, 8]];
const RESPIN_JACKPOT_WEIGHTS = [7.5, 2.8, 0.7];

export type Coin = { kind: 'value'; mult: number } | { kind: 'jackpot'; tier: number };

export interface BonusStep {
  cells: (Coin | null)[];
  /** Cells that got a coin on this step. */
  fresh: number[];
  respinsLeft: number;
}

export interface BonusResult {
  steps: BonusStep[];
  /** Chips from coins and fixed jackpots, the top-up included. */
  chips: number;
  /** Chips added at the end to reach BONUS_MIN_X (0 when the coins paid enough). */
  topUp: number;
  /** All 15 cells filled at a level that unlocks the Grand. */
  grand: boolean;
}

function drawCoin(rng: Rng, jackpotTier: number, opening: boolean): Coin {
  const values = opening ? OPENING_COIN_VALUES : RESPIN_COIN_VALUES;
  const jackpots = opening ? [] : RESPIN_JACKPOT_WEIGHTS.slice(0, Math.min(jackpotTier + 1, 3));
  const total = values.reduce((s, [, w]) => s + w, 0) + jackpots.reduce((s, w) => s + w, 0);
  let roll = rng() * total;
  for (const [mult, w] of values) {
    roll -= w;
    if (roll < 0) return { kind: 'value', mult };
  }
  for (let tier = 0; tier < jackpots.length; tier++) {
    roll -= jackpots[tier];
    if (roll < 0) return { kind: 'jackpot', tier };
  }
  return { kind: 'value', mult: 1 };
}

/** The fixed jackpots at their starting value, in chips, for this bet. */
export function baseJackpots(bet: number): number[] {
  return JACKPOT_MULTS.map((m) => m * bet);
}

/** `jackpots`: what Mini, Minor and Major are worth right now, in chips. */
export function coinChips(coin: Coin, bet: number, jackpots = baseJackpots(bet)): number {
  return coin.kind === 'value' ? coin.mult * bet : jackpots[coin.tier];
}

export function playBonus(rng: Rng, level: BetLevel, forceTier?: number, jackpots = baseJackpots(level.bet)): BonusResult { // TEST-BUTTONS
  const cells: (Coin | null)[] = new Array(CELLS).fill(null);
  const order = [...Array(CELLS).keys()];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const first = order.slice(0, START_COINS);
  for (const i of first) cells[i] = drawCoin(rng, level.jackpotTier, true);
  if (forceTier !== undefined && forceTier < 3) cells[first[0]] = { kind: 'jackpot', tier: forceTier }; // TEST-BUTTONS
  if (forceTier === 3) for (const i of order) cells[i] ??= drawCoin(rng, level.jackpotTier, false); // TEST-BUTTONS: Grand fills the grid
  const steps: BonusStep[] = [{ cells: [...cells], fresh: forceTier === 3 ? order : first, respinsLeft: RESPINS }]; // TEST-BUTTONS

  let left = RESPINS;
  let filled = forceTier === 3 ? CELLS : START_COINS; // TEST-BUTTONS
  while (left > 0 && filled < CELLS) {
    const fresh: number[] = [];
    for (let i = 0; i < CELLS; i++) {
      if (cells[i] === null && rng() < LAND_CHANCE) {
        cells[i] = drawCoin(rng, level.jackpotTier, false);
        fresh.push(i);
      }
    }
    filled += fresh.length;
    left = fresh.length > 0 ? RESPINS : left - 1;
    steps.push({ cells: [...cells], fresh, respinsLeft: left });
  }
  const coins = cells.reduce((sum, c) => sum + (c ? coinChips(c, level.bet, jackpots) : 0), 0);
  const topUp = Math.max(0, BONUS_MIN_X * level.bet - coins);
  return { steps, chips: coins + topUp, topUp, grand: filled === CELLS && (level.jackpotTier >= 3 || forceTier === 3) }; // TEST-BUTTONS
}
