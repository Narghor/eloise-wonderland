import { ANIMALS } from './data/animals';
import { CROPS } from './data/crops';
import { item } from './data/items';
import { FEEDS, RECIPES } from './data/machines';
import { orderSlots } from './data/levels';
import { PERSON_IDS } from './data/people';
import type { ItemId } from './data/types';
import { MINUTE_MS } from './farmTime';
import type { FarmSave, Order } from './farmSave';
import { earn, emit, gainXp, hasItems, isUnlocked, ownCount, takeItems } from './farmProgress';

// -----------------------------------------------
// THE ORDER BOARD (docs/ferme.md 4.5): orders never expire
// -----------------------------------------------

/** An order pays this many times the value of its items, plus this share of it in XP. */
export const ORDER_NUTS = 1.6;
export const ORDER_XP = 0.35;
const SERVED_WAIT_MINUTES = 1;
const REFUSED_WAIT_MINUTES = 15;
const MAX_QUANTITY = 12;

/** Items the farm can make right now and that people ask for (feeds stay for the animals). */
export function orderable(save: FarmSave): ItemId[] {
  const list: ItemId[] = CROPS.filter((c) => isUnlocked(save, c.unlock)).map((c) => c.id);
  for (const r of RECIPES) if (!FEEDS.includes(r.item) && isUnlocked(save, r.unlock) && ownCount(save, r.machine) > 0) list.push(r.item);
  for (const a of ANIMALS) if (ownCount(save, a.id) > 0) list.push(a.product);
  return list;
}

/** One to three products, their quantities following the level. */
export function rollOrder(save: FarmSave, random: () => number): Order {
  const pool = orderable(save);
  const n = Math.min(pool.length, 1 + (random() < 0.5 ? 1 : 0) + (save.level >= 5 && random() < 0.25 ? 1 : 0));
  const target = (12 + 10 * save.level) * (0.7 + 0.6 * random());
  const picked = new Set<ItemId>();
  while (picked.size < n) picked.add(pool[Math.floor(random() * pool.length)]);
  const items: Partial<Record<ItemId, number>> = {};
  let value = 0;
  for (const id of picked) {
    const v = item(id).value;
    const qty = Math.max(1, Math.min(MAX_QUANTITY, Math.round(target / n / v)));
    items[id] = qty;
    value += qty * v;
  }
  return {
    id: save.nextOrderId++,
    who: PERSON_IDS[Math.floor(random() * PERSON_IDS.length)],
    items,
    nuts: Math.round(value * ORDER_NUTS),
    xp: Math.max(1, Math.round(value * ORDER_XP)),
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
