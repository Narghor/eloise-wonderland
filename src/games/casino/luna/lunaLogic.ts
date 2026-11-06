// -----------------------------------------------
// LUNA MATHS (pure, no DOM) - "Eloise's Book"
// -----------------------------------------------
// 5 reels x 3 rows, 10 fixed lines, Book-of style:
// the Book is wild AND scatter; 3+ books = 10 free spins with one special
// symbol that expands to full reels and pays on every line.
// Free spins add sticky books ("reactions"): a book landing in the feature stays
// on its cell as a wild until the next retrigger (which clears them) or the end of the round.

export const REELS = 5;
export const ROWS = 3;
export const BETS = [10, 20, 50, 100, 200, 500, 1000];
export const FREE_SPINS = 10;
export const MIN_BOOKS = 3;
/** New books needed on one free spin to add FREE_SPINS more. */
export const RETRIGGER_BOOKS = 2;
/** Spins added by a retrigger. */
export const RETRIGGER_SPINS = 8;
export const GAMBLE_MAX_STEPS = 5;
/** A gamble never brings more than this multiple of the stake. */
export const GAMBLE_CAP_X = 100;

export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [1, 2, 2, 2, 1],
  [1, 0, 0, 0, 1],
  [2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2],
  [2, 1, 1, 1, 0],
];

export interface LunaSymbol {
  key: string;
  name: string;
  /** Pays per LINE bet for 2, 3, 4, 5 of a kind (0 = no pay). */
  pays: [number, number, number, number];
  weight: number;
}

export const BOOK = 9;
export const LUNA = 8;

export const SYMBOLS: LunaSymbol[] = [
  { key: '10', name: 'Dix', pays: [0, 4, 25, 100], weight: 15 },
  { key: 'J', name: 'Valet', pays: [0, 4, 25, 100], weight: 15 },
  { key: 'Q', name: 'Dame', pays: [0, 4, 25, 100], weight: 14 },
  { key: 'K', name: 'Roi', pays: [0, 4, 40, 150], weight: 11 },
  { key: 'A', name: 'As', pays: [0, 4, 40, 150], weight: 11 },
  { key: 'potion', name: 'Potion', pays: [5, 30, 100, 860], weight: 6 },
  { key: 'crystal', name: 'Boule de cristal', pays: [5, 30, 100, 860], weight: 6 },
  { key: 'owl', name: 'Hibou', pays: [5, 40, 400, 2300], weight: 3.4 },
  { key: 'luna', name: 'Eloise', pays: [10, 100, 1000, 5750], weight: 1.6 },
  { key: 'book', name: 'Livre (joker + bonus)', pays: [0, 0, 0, 0], weight: 2.45 },
];

/** Share of the table paid in the base game, and in the free spins (bigger, so a feature is worth the wait). */
export const PAY_SCALE = 0.815;
export const FREE_PAY_SCALE = 1.26;

/** Book scatter pays, multiple of the TOTAL bet, by count anywhere (3, 4, 5). */
export const BOOK_PAYS: Record<number, number> = { 3: 1, 4: 20, 5: 230 };

/** Special-symbol draw (any paying symbol, the Book excluded). Rarer for the premiums. */
export const SPECIAL_WEIGHTS = [16, 16, 16, 14, 14, 8, 8, 5, 3];

export type Grid = number[][]; // grid[reel][row]
export type Rng = () => number;

export interface LineWin {
  line: number;
  symbol: number;
  count: number;
  /** Multiple of the total bet. */
  mult: number;
}

export interface ExpandWin {
  symbol: number;
  reels: number[];
  /** Multiple of the total bet (all 10 lines). */
  mult: number;
}

export interface SpinOutcome {
  grid: Grid;
  wins: LineWin[];
  books: number;
  bookMult: number;
  expand: ExpandWin | null;
  /** Total multiple of the total bet. */
  mult: number;
}

/** The free spins draw fewer books than the base game: there they stick as wilds and retrigger. */
export const FREE_BOOK_WEIGHT = 1.9;

function drawSymbol(rng: Rng, noBook: boolean, free: boolean): number {
  const weights = SYMBOLS.map((s, i) => (i === BOOK && free ? FREE_BOOK_WEIGHT : s.weight));
  const total = weights.reduce((s, w) => s + w, 0);
  for (;;) {
    let r = rng() * total;
    let pick = SYMBOLS.length - 1;
    for (let i = 0; i < SYMBOLS.length; i++) {
      r -= weights[i];
      if (r < 0) { pick = i; break; }
    }
    if (!(noBook && pick === BOOK)) return pick;
  }
}

/** One book per reel at most, like on a real strip. */
export function randomGrid(rng: Rng, free = false): Grid {
  const grid: Grid = [];
  for (let reel = 0; reel < REELS; reel++) {
    const column: number[] = [];
    let hasBook = false;
    for (let row = 0; row < ROWS; row++) {
      const s = drawSymbol(rng, hasBook, free);
      if (s === BOOK) hasBook = true;
      column.push(s);
    }
    grid.push(column);
  }
  return grid;
}

export function countBooks(grid: Grid): number {
  return grid.reduce((n, col) => n + col.filter((s) => s === BOOK).length, 0);
}

/** `scale`: PAY_SCALE in the base game, FREE_PAY_SCALE in the free spins. */
export function lineWins(grid: Grid, scale = PAY_SCALE): LineWin[] {
  const wins: LineWin[] = [];
  PAYLINES.forEach((path, line) => {
    const cells = path.map((row, reel) => grid[reel][row]);
    let symbol = cells.find((s) => s !== BOOK);
    if (symbol === undefined) return; // five books: paid as scatter only
    let count = 0;
    while (count < REELS && (cells[count] === symbol || cells[count] === BOOK)) count++;
    const pay = count >= 2 ? SYMBOLS[symbol].pays[count - 2] : 0;
    if (pay > 0) wins.push({ line, symbol, count, mult: (pay * scale) / PAYLINES.length });
  });
  return wins;
}

/** Free-spin bonus: the special symbol on enough reels fills them and pays on all lines, anywhere. */
export function expandWin(grid: Grid, special: number): ExpandWin | null {
  const reels: number[] = [];
  for (let reel = 0; reel < REELS; reel++) if (grid[reel].includes(special)) reels.push(reel);
  const pay = reels.length >= 2 ? SYMBOLS[special].pays[reels.length - 2] : 0;
  if (pay === 0) return null;
  return { symbol: special, reels, mult: pay * FREE_PAY_SCALE };
}

function evaluate(grid: Grid, special: number | null, linesGrid: Grid = grid): SpinOutcome {
  const wins = lineWins(linesGrid);
  const books = countBooks(grid);
  const bookMult = BOOK_PAYS[Math.min(books, 5)] ?? 0;
  const expand = special === null ? null : expandWin(grid, special);
  const mult = wins.reduce((s, w) => s + w.mult, 0) + bookMult + (expand?.mult ?? 0);
  return { grid, wins, books, bookMult, expand, mult };
}

export type LunaForce = 'books' | 'luna' | 'big';

export function baseSpin(rng: Rng, force?: LunaForce): SpinOutcome {
  let grid = randomGrid(rng);
  if (force === 'books' || force === 'luna') {
    for (const reel of [0, 2, 4]) grid[reel][Math.floor(rng() * ROWS)] = BOOK;
  } else if (force === 'big') {
    const s = 7;
    grid = grid.map((col, reel) => (reel < 4 ? [s, s, col[2] === BOOK ? 0 : col[2]] : col));
    grid[4][0] = s;
  }
  return evaluate(grid, null);
}

// -----------------------------------------------
// FREE SPINS (decided in full up front)
// -----------------------------------------------

export interface FreeSpin {
  /** The grid as drawn, sticky books included. */
  grid: Grid;
  /** Cells holding a sticky book after this spin, "reel,row". */
  sticky: string[];
  wins: LineWin[];
  expand: ExpandWin | null;
  added: number;
  spinsLeft: number;
  mult: number;
}

export interface FreeSpinsResult {
  special: number;
  spins: FreeSpin[];
  /** Total in multiples of the bet, the top-up included. */
  mult: number;
  /** Added at the end to reach FREE_SPINS_MIN_X (0 when the spins paid enough). */
  topUp: number;
}

/** A free spins round always pays at least this many times the bet. */
export const FREE_SPINS_MIN_X = 30;
/** Spins per free spins round on average, measured by tools/casino-stats.mjs: measure again after changing the odds. */
export const FREE_SPINS_EVERY = 195;

function pickSpecial(rng: Rng): number {
  const total = SPECIAL_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < SPECIAL_WEIGHTS.length; i++) {
    r -= SPECIAL_WEIGHTS[i];
    if (r < 0) return i;
  }
  return 0;
}

/** Hard cap on the round length (retriggers included). */
const MAX_FREE_SPINS = 100;

export function playFreeSpins(rng: Rng, forcedSpecial?: number): FreeSpinsResult {
  const special = forcedSpecial ?? pickSpecial(rng);
  const sticky = new Set<string>();
  const spins: FreeSpin[] = [];
  let left = FREE_SPINS;
  let played = 0;
  while (left > 0 && played < MAX_FREE_SPINS) {
    left--;
    played++;
    const drawn = randomGrid(rng, true);
    // Fresh books (not on a sticky cell) count for the retrigger.
    let fresh = 0;
    drawn.forEach((col, reel) => col.forEach((s, row) => { if (s === BOOK && !sticky.has(`${reel},${row}`)) fresh++; }));
    for (const key of sticky) {
      const [reel, row] = key.split(',').map(Number);
      drawn[reel][row] = BOOK;
    }
    drawn.forEach((col, reel) => col.forEach((s, row) => { if (s === BOOK) sticky.add(`${reel},${row}`); }));
    const wins = lineWins(drawn, FREE_PAY_SCALE);
    const expand = expandWin(drawn, special);
    const added = fresh >= RETRIGGER_BOOKS ? RETRIGGER_SPINS : 0;
    left += added;
    const mult = wins.reduce((s, w) => s + w.mult, 0) + (expand?.mult ?? 0);
    spins.push({ grid: drawn, sticky: [...sticky], wins, expand, added, spinsLeft: left, mult });
    // A retrigger opens a new chapter: the sticky books are cleared, or long rounds would end covered in wilds.
    if (added > 0) sticky.clear();
  }
  const total = spins.reduce((s, x) => s + x.mult, 0);
  const topUp = Math.max(0, FREE_SPINS_MIN_X - total);
  return { special, spins, mult: total + topUp, topUp };
}

export function chipsFor(mult: number, stake: number): number {
  return Math.floor(mult * stake);
}

// -----------------------------------------------
// GAMBLE (red / black, fair 50 %)
// -----------------------------------------------

export function canGamble(amount: number, stake: number, steps: number): boolean {
  return amount > 0 && steps < GAMBLE_MAX_STEPS && amount * 2 <= stake * GAMBLE_CAP_X;
}
