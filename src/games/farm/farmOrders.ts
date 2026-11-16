import { ANIMALS } from './data/animals';
import { CROPS } from './data/crops';
import { item } from './data/items';
import { FEEDS, RECIPES } from './data/machines';
import { orderSlots } from './data/levels';
import { PERSON_IDS } from './data/people';
import { TREE_YIELDS } from './data/placeables';
import type { ItemId, TreeId } from './data/types';
import { MINUTE_MS } from './farmTime';
import type { CartOrder, FarmSave, Order } from './farmSave';
import { charm, earn, emit, gainXp, hasItems, isUnlocked, ownCount, pay, takeItems } from './farmProgress';
import { charmStep } from './data/charm';

// -----------------------------------------------
// THE ORDER BOARD (docs/ferme.md 4.5): orders never expire
// -----------------------------------------------

/** An order pays this many times the value of its items, plus this share of it in XP. */
export const ORDER_NUTS = 1.6;
export const ORDER_XP = 0.35;
const SERVED_WAIT_MINUTES = 1;
const REFUSED_WAIT_MINUTES = 15;
const MAX_QUANTITY = 12;
const MIN_CAP = 4;
/** A "coup de cœur" order, from level 2: double Eloisettes and a parcel. */
export const SPECIAL_CHANCE = 0.12;
export const SPECIAL_LEVEL = 2;

/** Items the farm can make right now and that people ask for (feeds stay for the animals). */
export function orderable(save: FarmSave): ItemId[] {
  const list: ItemId[] = CROPS.filter((c) => isUnlocked(save, c.unlock)).map((c) => c.id);
  for (const r of RECIPES) if (!FEEDS.includes(r.item) && isUnlocked(save, r.unlock) && ownCount(save, r.machine) > 0) list.push(r.item);
  for (const a of ANIMALS) if (ownCount(save, a.id) > 0) list.push(a.product);
  // Fruit from the trees on the farm (the hazel gives Eloisettes, nothing to ask).
  for (const [tree, y] of Object.entries(TREE_YIELDS)) if ('item' in y.gives && ownCount(save, tree as TreeId) > 0) list.push(y.gives.item);
  return list;
}

/** One to three products, their quantities following the level. */
export function rollOrder(save: FarmSave, random: () => number): Order {
  const pool = orderable(save);
  const n = Math.min(pool.length, 1 + (random() < 0.5 ? 1 : 0) + (save.level >= 5 && random() < 0.25 ? 1 : 0));
  // From a small basket to a big one: the same mean as before, a wider spread so no two orders look alike.
  const target = (12 + 10 * save.level) * (0.45 + 1.1 * random());
  const picked = new Set<ItemId>();
  while (picked.size < n) picked.add(pool[Math.floor(random() * pool.length)]);
  const items: Partial<Record<ItemId, number>> = {};
  let value = 0;
  for (const id of picked) {
    const v = item(id).value;
    // A cap drawn per item, so cheap goods do not always come by the dozen.
    const cap = MIN_CAP + Math.round(random() * (MAX_QUANTITY - MIN_CAP));
    const qty = Math.max(1, Math.min(cap, Math.round(target / n / v)));
    items[id] = qty;
    value += qty * v;
  }
  const special = save.level >= SPECIAL_LEVEL && random() < SPECIAL_CHANCE;
  // Someone who has no order on the board yet: each villager comes to the gate for one order at a time.
  const free = PERSON_IDS.filter((p) => !save.orders.some((o) => o.who === p));
  const people = free.length > 0 ? free : PERSON_IDS;
  return {
    id: save.nextOrderId++,
    who: people[Math.floor(random() * people.length)],
    items,
    nuts: Math.round(value * ORDER_NUTS * (1 + charmStep(charm(save)).step.orderBonusPercent / 100) * (special ? 2 : 1)),
    xp: Math.max(1, Math.round(value * ORDER_XP)),
    ...(special ? { special } : {}),
  };
}

/** Fills the board up to its places: an empty place gets its order once its wait is over. Returns how many came. */
export function refillOrders(save: FarmSave, now: number, random: () => number = Math.random): number {
  while (save.orders.length + save.orderWaits.length < orderSlots(save.level)) save.orderWaits.push(now);
  const due = save.orderWaits.filter((t) => t <= now);
  save.orderWaits = save.orderWaits.filter((t) => t > now);
  for (let i = 0; i < due.length; i++) save.orders.push(rollOrder(save, random));
  return due.length;
}

export function canDeliver(save: FarmSave, order: Order): boolean {
  return hasItems(save, order.items);
}

export function deliver(save: FarmSave, id: number, now: number): Order | null {
  const order = save.orders.find((o) => o.id === id);
  if (!order || !canDeliver(save, order)) return null;
  takeItems(save, order.items);
  save.orders = save.orders.filter((o) => o !== order);
  save.orderWaits.push(now + SERVED_WAIT_MINUTES * MINUTE_MS);
  for (const [itemId, n] of Object.entries(order.items)) emit(save, { type: 'deliver', target: itemId, count: n ?? 0 });
  emit(save, { type: 'order', count: 1 });
  earn(save, order.nuts);
  if (order.special) pay(save, { parcels: 1 });
  gainXp(save, order.xp);
  return order;
}

/** Refuses an order: a new one comes in 15 minutes, or at once for a helping hand. */
export function refuse(save: FarmSave, id: number, now: number, helpingHand: boolean): boolean {
  if (!save.orders.some((o) => o.id === id)) return false;
  if (helpingHand) {
    if (save.boosters.helpingHand <= 0) return false;
    save.boosters.helpingHand--;
  }
  save.orders = save.orders.filter((o) => o.id !== id);
  save.orderWaits.push(helpingHand ? now : now + REFUSED_WAIT_MINUTES * MINUTE_MS);
  return true;
}

export function deliverableCount(save: FarmSave): number {
  return save.orders.filter((o) => canDeliver(save, o)).length;
}

// -----------------------------------------------
// THE MARKET CART (docs/ferme.md 18): one big order of several kinds, better paid, back a few hours after
// -----------------------------------------------

/** The cart pays this many times the value of its items (the board: ORDER_NUTS), and this share in XP. */
export const CART_NUTS = 2.2;
export const CART_XP = 0.45;
export const CART_PARCEL_CHANCE = 0.35;
/** Hours before the cart comes back once served; minutes once sent away without its goods. */
export const CART_BACK_MINUTES = 180;
export const CART_SENT_AWAY_MINUTES = 60;

/** The cart's order, rolled when it is on the farm, unlocked, and its wait is over. Returns true when one came. */
export function refillCart(save: FarmSave, now: number, random: () => number = Math.random): boolean {
  if (save.cart.order || now < save.cart.nextAt || ownCount(save, 'marketCart') === 0) return false;
  save.cart.order = rollCart(save, random);
  return true;
}

/** Three kinds (fewer early on), 6 to 9 items in all, worth about three board orders. */
export function rollCart(save: FarmSave, random: () => number): CartOrder {
  const pool = orderable(save);
  const kinds = Math.min(3, pool.length);
  const picked = new Set<ItemId>();
  while (picked.size < kinds) picked.add(pool[Math.floor(random() * pool.length)]);
  const total = 6 + Math.floor(random() * 4);
  const items: Partial<Record<ItemId, number>> = {};
  [...picked].forEach((id, i) => (items[id] = Math.floor(total / kinds) + (i < total % kinds ? 1 : 0)));
  const value = Object.entries(items).reduce((s, [id, n]) => s + item(id as ItemId).value * (n ?? 0), 0);
  return {
    items,
    nuts: Math.round(value * CART_NUTS * (1 + charmStep(charm(save)).step.orderBonusPercent / 100)),
    xp: Math.max(1, Math.round(value * CART_XP)),
    parcel: random() < CART_PARCEL_CHANCE,
  };
}

export function deliverCart(save: FarmSave, now: number): CartOrder | null {
  const order = save.cart.order;
  if (!order || !hasItems(save, order.items)) return null;
  takeItems(save, order.items);
  save.cart = { order: null, nextAt: now + CART_BACK_MINUTES * MINUTE_MS };
  for (const [itemId, n] of Object.entries(order.items)) emit(save, { type: 'deliver', target: itemId, count: n ?? 0 });
  emit(save, { type: 'order', target: 'cart', count: 1 });
  earn(save, order.nuts);
  if (order.parcel) pay(save, { parcels: 1 });
  gainXp(save, order.xp);
  return order;
}

/** Sends the cart away empty: another order comes an hour later. */
export function sendCartAway(save: FarmSave, now: number): boolean {
  if (!save.cart.order) return false;
  save.cart = { order: null, nextAt: now + CART_SENT_AWAY_MINUTES * MINUTE_MS };
  return true;
}