import { readGame, writeGame } from '../../save';
import { loadCompanion, saveCompanion } from '../../companion/companionSave';
import { todayKey } from '../../daily/daily';

// -----------------------------------------------
// CASINO CHIPS
// -----------------------------------------------
// Chips never turn back into coins: the only bridge is coins -> chips.

const GAME_ID = 'casino';
const STARTING_CHIPS = 1000;
export const DAILY_GIFT = 5000;
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
}

export function loadCasino(): CasinoSave {
  const raw = readGame(GAME_ID);
  if (typeof raw !== 'object' || raw === null) {
    return { chips: STARTING_CHIPS, record: STARTING_CHIPS, refilledOn: todayKey(), jackpots: {} };
  }
  const data = raw as Record<string, unknown>;
  const chips = isCount(data.chips) ? data.chips : 0;
  const jackpots: Record<string, number> = {};
  if (typeof data.jackpots === 'object' && data.jackpots !== null) {
    for (const [id, value] of Object.entries(data.jackpots)) {
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) jackpots[id] = value;
    }
  }
  return {
    chips,
    record: isCount(data.record) ? Math.max(data.record, chips) : chips,
    refilledOn: typeof data.refilledOn === 'string' ? data.refilledOn : '',
    jackpots,
  };
}

function saveCasino(save: CasinoSave): void {
  save.record = Math.max(save.record, save.chips);
  writeGame(GAME_ID, save);
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
  if (save.refilledOn === today) {
    // A brand-new player starts with the day already counted: persist it, or tomorrow would see no date.
    if (readGame(GAME_ID) == null) saveCasino(save);
    return 0;
  }
  save.chips += DAILY_GIFT;
  save.refilledOn = today;
  saveCasino(save);
  return DAILY_GIFT;
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
// PROGRESSIVE JACKPOTS
// -----------------------------------------------

export function jackpot(machineId: string): number {
  return loadCasino().jackpots[machineId] ?? JACKPOT_SEED;
}

/** Feeds a share of a bet into the machine's pool. */
export function feedJackpot(machineId: string, amount: number): void {
  if (amount <= 0) return;
  const save = loadCasino();
  save.jackpots[machineId] = (save.jackpots[machineId] ?? JACKPOT_SEED) + amount;
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

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}
