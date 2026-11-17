import { todayKey } from '../../daily/daily';
import { loadCompanion, saveCompanion } from '../../companion/companionSave';
import { BOOSTERS, GAME_DROPS_PER_DAY, GAME_DROP_ODDS, booster } from './data/boosters';
import type { BoosterId } from './data/types';
import { MINUTE_MS } from './farmTime';
import { loadFarm, saveFarm, type FarmSave, type PlacedObject } from './farmSave';
import { fieldState, mealReadyAt } from './farmProduction';
import { CASINO_TEST_BUTTONS } from '../casino/fx/testMode'; // TEST-BUTTONS

// -----------------------------------------------
// BOOSTERS (docs/ferme.md 4.8): stock, shop, effects
// -----------------------------------------------

const HOURGLASS_MINUTES = 60;

/** Starts a new shop day when the date changed. */
function shopDay(save: FarmSave, now: number): FarmSave['shop'] {
  const day = todayKey(new Date(now));
  if (save.shop.day !== day) save.shop = { day, bought: {}, fromGames: 0 };
  return save.shop;
}

export function shopLeft(save: FarmSave, id: BoosterId, now: number): number {
  return booster(id).dailyStock - (shopDay(save, now).bought[id] ?? 0);
}

/** Buys a booster with the site's coins (the companion's purse). */
export function buyBooster(save: FarmSave, id: BoosterId, now: number): boolean {
  const b = booster(id);
  if (shopLeft(save, id, now) <= 0) return false;
  const purse = loadCompanion();
  if (purse.coins < b.price) return false;
  purse.coins -= b.price;
  saveCompanion(purse);
  const shop = shopDay(save, now);
  shop.bought[id] = (shop.bought[id] ?? 0) + 1;
  save.boosters[id]++;
  return true;
}

export function siteCoins(): number {
  return loadCompanion().coins;
}

/**
 * Called when a level of another game is finished: sometimes a booster for the farm, twice a day at most.
 * Nothing before the farm was opened once. Returns the booster won, already saved.
 */
export function rollGameBooster(random: () => number = Math.random): BoosterId | null {
  const save = loadFarm();
  if (!save) return null;
  const shop = shopDay(save, Date.now());
  if (shop.fromGames >= GAME_DROPS_PER_DAY) return null;
  if (!CASINO_TEST_BUTTONS && random() * GAME_DROP_ODDS >= 1) return null; // TEST-BUTTONS: every win drops one
  const total = BOOSTERS.reduce((s, b) => s + b.gameWeight, 0);
  let roll = random() * total;
  const won = (BOOSTERS.find((b) => (roll -= b.gameWeight) < 0) ?? BOOSTERS[0]).id;
  shop.fromGames++;
  save.boosters[won]++;
  saveFarm(save);
  return won;
}

// -----------------------------------------------
// EFFECTS
// -----------------------------------------------

function use(save: FarmSave, id: BoosterId): boolean {
  if (save.boosters[id] <= 0) return false;
  save.boosters[id]--;
  return true;
}

/** Fertilizer: one growing field is ripe at once. */
export function fertilize(save: FarmSave, field: PlacedObject, now: number): boolean {
  const state = fieldState(field, now);
  if (state === 'empty' || state === 'ripe' || !use(save, 'fertilizer')) return false;
  field.readyAt = now;
  return true;
}

export function growingFields(save: FarmSave, now: number): PlacedObject[] {
  return save.objects.filter((o) => o.type === 'field' && o.crop && o.readyAt !== undefined && o.readyAt > now);
}

/** Watering can: every growing field has half its time left. */
export function water(save: FarmSave, now: number): number {
  const fields = growingFields(save, now);
  if (fields.length === 0 || !use(save, 'wateringCan')) return 0;
  for (const f of fields) f.readyAt = now + Math.ceil((f.readyAt! - now) / 2);
  return fields.length;
}

/** Whether an hourglass would gain time on this machine or pen. */
export function canHurry(object: PlacedObject, now: number): boolean {
  if (object.queue) return object.queue.some((j) => j.readyAt > now);
  if (object.animals) return mealReadyAt(object, now) !== null;
  return false;
}

/** Hourglass: an hour less on what runs in a machine (its whole queue moves up) or in a pen (its meal). */
export function hurry(save: FarmSave, object: PlacedObject, now: number): boolean {
  if (!canHurry(object, now) || !use(save, 'hourglass')) return false;
  const cut = HOURGLASS_MINUTES * MINUTE_MS;
  if (object.queue) {
    const running = object.queue.filter((j) => j.readyAt > now);
    const shift = Math.min(cut, running[0].readyAt - now);
    for (const job of running) job.readyAt -= shift;
  }
  if (object.animals) object.readyAt = Math.max(now, object.readyAt! - cut);
  return true;
}
