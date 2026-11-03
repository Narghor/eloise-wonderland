// -----------------------------------------------
// SLOTS MATHS (pure, no DOM)
// -----------------------------------------------
// 5 reels x 3 rows, 10 fixed paylines, weighted reel strips.
// Tuned for fun: ~37% of spins win. Simulated RTP, jackpot included: 98.5-99.5% at every bet.

export const MACHINE_ID = 'slots-classic';
export const REELS = 5;
export const ROWS = 3;
export const BET_LEVELS = [10, 20, 50, 100, 200, 500, 1000];
export const MAX_BET = 1000;
export const JACKPOT_SHARE = 0.02;
/** Jackpot chance per spin, the same at every bet so the jackpot's share of the RTP does not grow with the bet. */
export const JACKPOT_ODDS = 1 / 20_000;
/** The jackpot pays at least this many times the bet, so it still matters at a high bet. */
export const JACKPOT_MIN_X = 300;

/** What the jackpot pays at this bet: the floor plus the whole pool, so every spin makes it grow. */
export function jackpotFor(pool: number, bet: number): number {
  return Math.floor(pool + bet * JACKPOT_MIN_X);
}

export interface SymbolInfo {
  id: number;
  glyph: string;
  name: string;
  /** Pays per line bet for 3, 4, 5 of a kind. */
  pays: [number, number, number];
}

/** Every line win is paid this much more than the table, to bring the RTP in line with the other machines. */
export const PAY_SCALE = 1.01;

export const WILD = 7;
export const DIAMOND = 8;

export const SYMBOLS: SymbolInfo[] = [
  { id: 0, glyph: '🍒', name: 'Cerise', pays: [3, 8, 25] },
  { id: 1, glyph: '🍋', name: 'Citron', pays: [3, 8, 25] },
  { id: 2, glyph: '🍊', name: 'Orange', pays: [4, 12, 40] },
  { id: 3, glyph: '🍇', name: 'Raisin', pays: [5, 18, 60] },
  { id: 4, glyph: '🔔', name: 'Cloche', pays: [7, 28, 100] },
  { id: 5, glyph: '⭐', name: 'Étoile', pays: [11, 45, 160] },
  { id: 6, glyph: '7️⃣', name: 'Sept', pays: [22, 90, 350] },
  { id: 7, glyph: '👑', name: 'Couronne (joker)', pays: [35, 140, 550] },
  { id: 8, glyph: '💎', name: 'Diamant', pays: [0, 0, 0] },
];

/** Count of each symbol per reel (index = symbol id, wild included, no diamond). */
const STRIP_COUNTS: number[][] = [
  [10, 10, 7, 6, 4, 3, 2, 5],
  [10, 10, 7, 6, 4, 3, 2, 5],
  [10, 10, 7, 6, 4, 3, 2, 5],
  [10, 10, 7, 6, 4, 3, 2, 5],
  [10, 10, 7, 6, 4, 3, 2, 5],
];

/** Symbols placed in blocks of this size on the strip (stacks make multi-line wins). */
const STACK_SIZE = [3, 3, 3, 3, 2, 2, 1, 2];

/** Spreads the counts into a strip, interleaving stacked symbols deterministically. */
function buildStrip(counts: number[], offset: number): number[] {
  const left = counts.slice();
  const strip: number[] = [];
  const total = counts.reduce((a, b) => a + b, 0);
  let cursor = offset;
  while (strip.length < total) {
    cursor = (cursor + 3) % left.length;
    let tries = 0;
    while (left[cursor] === 0 || (strip.length > 0 && strip[strip.length - 1] === cursor && tries < left.length)) {
      cursor = (cursor + 1) % left.length;
      tries++;
      if (tries > left.length * 2) break;
    }
    const block = Math.min(left[cursor], STACK_SIZE[cursor]);
    for (let k = 0; k < block; k++) strip.push(cursor);
    left[cursor] -= block;
  }
  return strip;
}

export const STRIPS: number[][] = STRIP_COUNTS.map((counts, i) => buildStrip(counts, i));

/** Row index per reel for each payline. */
export const PAYLINES: number[][] = [
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

export interface LineWin {
  line: number;
  symbol: number;
  count: number;
  amount: number;
}

export interface SpinResult {
  /** grid[reel][row] */
  grid: number[][];
  stops: number[];
  wins: LineWin[];
  total: number;
  jackpot: boolean;
}

export type Rng = () => number;
export type SlotsForce = 'big' | 'mega' | 'jackpot'; // TEST-BUTTONS

function lineWin(grid: number[][], line: number, lineBet: number): LineWin | null {
  const cells = PAYLINES[line].map((row, reel) => grid[reel][row]);
  // Best of: paying as wilds only, or as the first non-wild symbol.
  let wildRun = 0;
  while (wildRun < REELS && cells[wildRun] === WILD) wildRun++;
  const target = cells.find((s) => s !== WILD);
  let run = 0;
  if (target !== undefined && target !== DIAMOND) {
    while (run < REELS && (cells[run] === target || cells[run] === WILD)) run++;
  }
  const wildPay = wildRun >= 3 ? SYMBOLS[WILD].pays[wildRun - 3] : 0;
  const symPay = run >= 3 && target !== undefined ? SYMBOLS[target].pays[run - 3] : 0;
  if (wildPay === 0 && symPay === 0) return null;
  return wildPay >= symPay
    ? { line, symbol: WILD, count: wildRun, amount: Math.round(wildPay * PAY_SCALE * lineBet) }
    : { line, symbol: target as number, count: run, amount: Math.round(symPay * PAY_SCALE * lineBet) };
}

/** Spins once. `totalBet` must be a multiple of the line count. */
export function spin(totalBet: number, rng: Rng = Math.random, force?: SlotsForce): SpinResult { // TEST-BUTTONS
  const lineBet = totalBet / PAYLINES.length;
  if (force === 'jackpot' || rng() < JACKPOT_ODDS) { // TEST-BUTTONS
    const grid = STRIPS.map((strip, r) => [strip[r % strip.length], DIAMOND, strip[(r + 5) % strip.length]]);
    return { grid, stops: [0, 0, 0, 0, 0], wins: [{ line: 0, symbol: DIAMOND, count: 5, amount: 0 }], total: 0, jackpot: true };
  }
  const stops = STRIPS.map((strip) => Math.floor(rng() * strip.length));
  const grid = STRIPS.map((strip, r) => [0, 1, 2].map((row) => strip[(stops[r] + row) % strip.length]));
  if (force === 'big') grid.forEach((column) => (column[1] = 5)); // TEST-BUTTONS: five stars on the middle line
  if (force === 'mega') grid.forEach((column) => column.fill(WILD)); // TEST-BUTTONS: crowns everywhere
  const wins: LineWin[] = [];
  for (let line = 0; line < PAYLINES.length; line++) {
    const win = lineWin(grid, line, lineBet);
    if (win) wins.push(win);
  }
  return { grid, stops, wins, total: wins.reduce((a, w) => a + w.amount, 0), jackpot: false };
}
