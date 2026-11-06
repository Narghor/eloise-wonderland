import { readGame, writeGame } from '../../save';
import { loadCompanion, saveCompanion } from '../../companion/companionSave';
import { todayKey } from '../../daily/daily';
import { MAX_GIFT, decodeGift, encodeGift, randomNonce } from './giftCode';
import { NO_DROUGHT, stepDrought, type Drought, type Rescue } from './rescue';

// -----------------------------------------------
// CASINO CHIPS
// -----------------------------------------------
// Chips never turn back into coins: the only bridge is coins -> chips.

const GAME_ID = 'casino';
export const DAILY_GIFT = 5000;
/** Given once to every player, old or new; set it to null at the next update to end the offer. */
export const ONE_TIME_GIFT: { id: string; chips: number } | null = null;
export const CHIPS_PER_COIN = 10;
const JACKPOT_SEED = 5000;

export interface CasinoSave {
  chips: number;
  /** Highest balance ever reached. */
  record: number;
  /** Day key of the last daily refill. */
  refilledOn: string;
  /** Progressive jackpot pool, per machine id. */
  jackpots: Record<string, number>;
  /** Best single win (a spin or a whole bonus) in stakes, per machine id. */
  bestWins: Record<string, number>;
  /** Nonces of the gift codes this device created or redeemed: each code works once here. */
  usedGifts: number[];
  /** Last codes created here, newest first, so a closed page never loses one. */
  sentGifts: string[];
  /** Ids of the one-time gifts already given. */
  claimedGifts: string[];
  /** Wait since the last bonus, per machine id (see rescue.ts). */
  droughts: Record<string, Drought>;
  /** The bet last chosen on each machine, per machine id. */
  lastBets: Record<string, number>;
}

export function loadCasino(): CasinoSave {
  const raw = readGame(GAME_ID);
  if (typeof raw !== 'object' || raw === null) {
    // A new player has no day counted yet: the daily gift is their starting balance.
    return { chips: 0, record: 0, refilledOn: '', jackpots: {}, bestWins: {}, usedGifts: [], sentGifts: [], claimedGifts: [], droughts: {}, lastBets: {} };
  }
  const data = raw as Record<string, unknown>;
  const chips = isCount(data.chips) ? data.chips : 0;
  return {
    chips,
    record: isCount(data.record) ? Math.max(data.record, chips) : chips,
    refilledOn: typeof data.refilledOn === 'string' ? data.refilledOn : '',
    jackpots: readAmounts(data.jackpots),
    bestWins: readAmounts(data.bestWins),
    usedGifts: Array.isArray(data.usedGifts) ? data.usedGifts.filter((nonce): nonce is number => isCount(nonce)) : [],
    sentGifts: Array.isArray(data.sentGifts) ? data.sentGifts.filter((code): code is string => typeof code === 'string') : [],
    claimedGifts: Array.isArray(data.claimedGifts) ? data.claimedGifts.filter((id): id is string => typeof id === 'string') : [],
    droughts: readDroughts(data.droughts),
    lastBets: readAmounts(data.lastBets),
  };
}

function readDroughts(value: unknown): Record<string, Drought> {
  const droughts: Record<string, Drought> = {};
  if (typeof value === 'object' && value !== null) {
    for (const [id, entry] of Object.entries(value)) {
      const d = entry as Partial<Drought> | null;
      if (d && isCount(d.spins) && typeof d.lost === 'number' && Number.isFinite(d.lost)) droughts[id] = { spins: d.spins, lost: d.lost };
    }
  }
  return droughts;
}

/** A saved { machine id: amount } map, keeping only the valid amounts. */
function readAmounts(value: unknown): Record<string, number> {
  const amounts: Record<string, number> = {};
  if (typeof value === 'object' && value !== null) {
    for (const [id, amount] of Object.entries(value)) {
      if (typeof amount === 'number' && Number.isFinite(amount) && amount >= 0) amounts[id] = amount;
    }
  }
  return amounts;
}

function saveCasino(save: CasinoSave): void {
  save.record = Math.max(save.record, save.chips);
  writeGame(GAME_ID, save);
}

/** A chip count as players read it: "1 250 000", spaced every three digits. */
export function formatChips(amount: number): string {
  return Math.floor(amount).toLocaleString('fr-FR');
}

export function chips(): number {
  return loadCasino().chips;
}

/** Takes a bet. Returns false (and takes nothing) when the balance is too low. */
export function bet(amount: number): boolean {
  const save = loadCasino();
  if (!isCount(amount) || amount === 0 || amount > save.chips) return false;
  save.chips -= amount;
  saveCasino(save);
  return true;
}

/** Pays winnings (the stake included, when it is returned). */
export function pay(amount: number): void {
  if (!isCount(amount) || amount === 0) return;
  const save = loadCasino();
  save.chips += amount;
  saveCasino(save);
}

/** Once a day, whatever the balance, gives the daily gift. Returns the chips given (0 if already claimed today). */
export function claimDailyGift(): number {
  const save = loadCasino();
  const today = todayKey();
  if (save.refilledOn === today) return 0;
  save.chips += DAILY_GIFT;
  save.refilledOn = today;
  saveCasino(save);
  return DAILY_GIFT;
}

/** Gives the current one-time gift if this player never got it. Returns the chips given (0 otherwise). */
export function claimOneTimeGift(): number {
  if (!ONE_TIME_GIFT) return 0;
  const save = loadCasino();
  if (save.claimedGifts.includes(ONE_TIME_GIFT.id)) return 0;
  save.chips += ONE_TIME_GIFT.chips;
  save.claimedGifts.push(ONE_TIME_GIFT.id);
  saveCasino(save);
  return ONE_TIME_GIFT.chips;
}

/** Spends companion coins for chips. One way only. Returns false when the coins are missing. */
export function buyChips(coins: number): boolean {
  if (!isCount(coins) || coins === 0) return false;
  const companion = loadCompanion();
  if (companion.coins < coins) return false;
  companion.coins -= coins;
  saveCompanion(companion);
  pay(coins * CHIPS_PER_COIN);
  return true;
}

// -----------------------------------------------
// GIFT CODES
// -----------------------------------------------

const SENT_GIFTS_KEPT = 5;

/** Takes `amount` chips and returns the code that gives them, or null when the balance is too low. */
export function sendGift(amount: number): string | null {
  const save = loadCasino();
  if (!isCount(amount) || amount === 0 || amount > MAX_GIFT || amount > save.chips) return null;
  const nonce = randomNonce();
  const code = encodeGift({ amount, nonce });
  save.chips -= amount;
  // The sender's own device must not cash its code back.
  save.usedGifts.push(nonce);
  save.sentGifts = [code, ...save.sentGifts].slice(0, SENT_GIFTS_KEPT);
  saveCasino(save);
  return code;
}

/** Removes a code from the "last codes" list; the code itself still works for whoever has it. */
export function hideSentGift(code: string): void {
  const save = loadCasino();
  save.sentGifts = save.sentGifts.filter((c) => c !== code);
  saveCasino(save);
}

export type RedeemResult = { ok: true; amount: number } | { ok: false; reason: 'invalid' | 'used' };

/**
 * Secret words typed in the code field give chips every time. Only their hashes are kept here
 * (the repository is public): hash of the word -> chips.
 */
const SECRET_WORDS: Record<number, number> = {
  3752608652: 10000,
  96946897: 100000,
};

/** Chips of a secret word, or 0. Case and surrounding spaces do not matter. */
function secretWordChips(text: string): number {
  let hash = 2166136261;
  for (const char of `cheat:${text.trim().toUpperCase()}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return SECRET_WORDS[hash >>> 0] ?? 0;
}

export function redeemGift(code: string): RedeemResult {
  const secret = secretWordChips(code);
  if (secret > 0) {
    const save = loadCasino();
    save.chips += secret;
    saveCasino(save);
    return { ok: true, amount: secret };
  }
  const gift = decodeGift(code);
  if (!gift) return { ok: false, reason: 'invalid' };
  const save = loadCasino();
  if (save.usedGifts.includes(gift.nonce)) return { ok: false, reason: 'used' };
  save.usedGifts.push(gift.nonce);
  save.chips += gift.amount;
  saveCasino(save);
  return { ok: true, amount: gift.amount };
}

// -----------------------------------------------
// PROGRESSIVE JACKPOTS
// -----------------------------------------------

/** A pool's amount; `seed` is what a pool starts from (and goes back to once won). */
export function jackpot(machineId: string, seed = JACKPOT_SEED): number {
  return loadCasino().jackpots[machineId] ?? seed;
}

/** Feeds a share of a bet into the machine's pool. */
export function feedJackpot(machineId: string, amount: number, seed = JACKPOT_SEED): void {
  if (amount <= 0) return;
  const save = loadCasino();
  save.jackpots[machineId] = (save.jackpots[machineId] ?? seed) + amount;
  saveCasino(save);
}

/** Puts a pool back to its seed without paying it (its value was paid by the caller). */
export function resetJackpot(machineId: string, seed = JACKPOT_SEED): void {
  const save = loadCasino();
  save.jackpots[machineId] = seed;
  saveCasino(save);
}

/** Pays the whole pool (at least `minimum`) to the player, resets it, and returns the amount won. */
export function winJackpot(machineId: string, minimum = 0): number {
  const save = loadCasino();
  const won = Math.floor(Math.max(minimum, save.jackpots[machineId] ?? JACKPOT_SEED));
  save.jackpots[machineId] = JACKPOT_SEED;
  save.chips += won;
  saveCasino(save);
  return won;
}

// -----------------------------------------------
// LAST BET PER MACHINE
// -----------------------------------------------

/** Index in `bets` of the bet last chosen on the machine, or 0 when it is not one of them (or never chosen). */
export function lastBetIndex(machineId: string, bets: readonly number[]): number {
  return Math.max(0, bets.indexOf(loadCasino().lastBets[machineId] ?? -1));
}

export function rememberBet(machineId: string, amount: number): void {
  const save = loadCasino();
  save.lastBets[machineId] = amount;
  saveCasino(save);
}

// -----------------------------------------------
// RESCUE AFTER A LONG WAIT
// -----------------------------------------------

/**
 * Counts one spin of a bonus machine (call it for every spin, bonus or not, once its outcome is
 * known). Returns the rescue it brings, already paid, or null.
 */
export function trackDrought(machineId: string, stake: number, reelWin: number, bonus: boolean, bonusEvery: number, forceRescue = false): Rescue | null { // TEST-BUTTONS
  const save = loadCasino();
  const { drought, rescue } = stepDrought(save.droughts[machineId] ?? NO_DROUGHT, stake, reelWin, bonus, bonusEvery, Math.random, forceRescue); // TEST-BUTTONS
  save.droughts[machineId] = drought;
  if (rescue) save.chips += rescue.chips;
  saveCasino(save);
  return rescue;
}

// -----------------------------------------------
// BEST WIN PER MACHINE
// -----------------------------------------------

/** Remembers a win if it is the machine's best so far, in stakes. Returns true on a new record. */
export function noteWin(machineId: string, amount: number, stake: number): boolean {
  if (amount <= 0 || stake <= 0) return false;
  const times = Math.round((amount / stake) * 10) / 10;
  // A win below the stake is a loss in disguise: "record ×0,2" would read as a joke.
  if (times < 1) return false;
  const save = loadCasino();
  if (times <= (save.bestWins[machineId] ?? 0)) return false;
  save.bestWins[machineId] = times;
  saveCasino(save);
  return true;
}

/** The machine's best win in stakes, or 0 when it never paid. */
export function bestWin(machineId: string): number {
  return loadCasino().bestWins[machineId] ?? 0;
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}
