// -----------------------------------------------
// EUROPEAN ROULETTE - pure logic, no DOM
// -----------------------------------------------

/** Pockets clockwise on a real single-zero wheel, starting at 0. */
export const WHEEL_ORDER: readonly number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29,
  7, 28, 12, 35, 3, 26,
];

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type Color = 'green' | 'red' | 'black';

export function colorOf(n: number): Color {
  if (n === 0) return 'green';
  return RED.has(n) ? 'red' : 'black';
}

/** Bet ids: 'n17', 'red', 'black', 'even', 'odd', 'low', 'high', 'dz1'..'dz3', 'col1'..'col3'. */
export type BetId = string;

/** All bet ids the table offers. */
export const ALL_BETS: readonly BetId[] = [
  ...Array.from({ length: 37 }, (_, n) => `n${n}`),
  'red', 'black', 'even', 'odd', 'low', 'high', 'dz1', 'dz2', 'dz3', 'col1', 'col2', 'col3',
];

export function covers(id: BetId, n: number): boolean {
  if (id.startsWith('n')) return Number(id.slice(1)) === n;
  if (n === 0) return false;
  switch (id) {
    case 'red': return RED.has(n);
    case 'black': return !RED.has(n);
    case 'even': return n % 2 === 0;
    case 'odd': return n % 2 === 1;
    case 'low': return n <= 18;
    case 'high': return n >= 19;
    case 'dz1': case 'dz2': case 'dz3': return Math.ceil(n / 12) === Number(id.slice(2));
    case 'col1': case 'col2': case 'col3': return ((n - 1) % 3) + 1 === Number(id.slice(3));
    default: return false;
  }
}

/** Amount returned per chip staked on a winning bet, stake included. */
export function returnMultiplier(id: BetId): number {
  if (id.startsWith('n')) return 36;
  if (id.startsWith('dz') || id.startsWith('col')) return 3;
  return 2;
}

export type Bets = Map<BetId, number>;

export function totalStake(bets: Bets): number {
  let sum = 0;
  for (const amount of bets.values()) sum += amount;
  return sum;
}

/** Total returned to the player for a drawn number, stakes of winning bets included. */
export function payout(bets: Bets, n: number): number {
  let sum = 0;
  for (const [id, amount] of bets) if (covers(id, n)) sum += amount * returnMultiplier(id);
  return sum;
}

/** Uniform draw over the 37 pockets. */
export function drawNumber(): number {
  const buffer = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / 37) * 37;
  do crypto.getRandomValues(buffer);
  while (buffer[0] >= limit);
  return buffer[0] % 37;
}
