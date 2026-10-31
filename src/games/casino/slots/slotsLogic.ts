// -----------------------------------------------
// SLOTS MATHS (pure, no DOM)
// -----------------------------------------------
// 5 reels x 3 rows, 10 fixed paylines, weighted reel strips.
// Base game RTP ~92.95%; the progressive jackpot adds 1% (the fed share)
// plus ~0.05% (the seed), for ~94% in total.

export const MACHINE_ID = 'slots-classic';
export const REELS = 5;
export const ROWS = 3;
export const BET_LEVELS = [10, 20, 50, 100, 200];
export const MAX_BET = 200;
export const JACKPOT_SHARE = 0.01;
/** Chance of the jackpot event per spin at max bet; scales with the bet. */
export const JACKPOT_ODDS_AT_MAX = 1 / 50000;

export interface SymbolInfo {
  id: number;
  glyph: string;
  name: string;
  /** Pays per line bet for 3, 4, 5 of a kind. */
  pays: [number, number, number];
}

export const WILD = 7;
export const DIAMOND = 8;

export const SYMBOLS: SymbolInfo[] = [
  { id: 0, glyph: '🍒', name: 'Cerise', pays: [5, 25, 120] },
  { id: 1, glyph: '🍋', name: 'Citron', pays: [5, 25, 120] },
  { id: 2, glyph: '🍊', name: 'Orange', pays: [8, 45, 200] },
  { id: 3, glyph: '🍇', name: 'Raisin', pays: [10, 70, 300] },
  { id: 4, glyph: '🔔', name: 'Cloche', pays: [16, 110, 500] },
  { id: 5, glyph: '⭐', name: 'Étoile', pays: [30, 220, 1000] },
  { id: 6, glyph: '7️⃣', name: 'Sept', pays: [80, 400, 2000] },
  { id: 7, glyph: '👑', name: 'Couronne (joker)', pays: [150, 800, 5000] },
  { id: 8, glyph: '💎', name: 'Diamant', pays: [0, 0, 0] },
];

/** Count of each symbol per reel (index = symbol id, wild included, no diamond). */
const STRIP_COUNTS: number[][] = [
  [7, 7, 6, 5, 4, 3, 2, 1],
  [7, 7, 6, 5, 4, 3, 2, 1],
  [7, 7, 6, 5, 4, 3, 2, 1],
  [7, 7, 6, 5, 4, 3, 2, 1],
  [7, 7, 6, 5, 4, 3, 2, 1],
];

/** Spreads the counts into a strip, interleaving symbols deterministically. */
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
    left[cursor]--;
    strip.push(cursor);
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
    ? { line, symbol: WILD, count: wildRun, amount: wildPay * lineBet }
    : { line, symbol: target as number, count: run, amount: symPay * lineBet };
}

/** Spins once. `totalBet` must be a multiple of the line count. */
export function spin(totalBet: number, rng: Rng = Math.random): SpinResult {
  const lineBet = totalBet / PAYLINES.length;
  if (rng() < JACKPOT_ODDS_AT_MAX * (totalBet / MAX_BET)) {
    const grid = STRIPS.map((strip, r) => [strip[r % strip.length], DIAMOND, strip[(r + 5) % strip.length]]);
    return { grid, stops: [0, 0, 0, 0, 0], wins: [{ line: 0, symbol: DIAMOND, count: 5, amount: 0 }], total: 0, jackpot: true };
  }
  const stops = STRIPS.map((strip) => Math.floor(rng() * strip.length));
  const grid = STRIPS.map((strip, r) => [0, 1, 2].map((row) => strip[(stops[r] + row) % strip.length]));
  const wins: LineWin[] = [];
  for (let line = 0; line < PAYLINES.length; line++) {
    const win = lineWin(grid, line, lineBet);
    if (win) wins.push(win);
  }
  return { grid, stops, wins, total: wins.reduce((a, w) => a + w.amount, 0), jackpot: false };
}
