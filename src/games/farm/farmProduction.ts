import { animalOfPen, animalPrice, type Animal } from './data/animals';
import { crop } from './data/crops';
import { item } from './data/items';
import { MAX_QUEUE, RECIPES, queueSlotPrice, recipe, type Recipe } from './data/machines';
import { TREE_YIELDS, isTree, placeable } from './data/placeables';
import { breed } from './data/parcels';
import type { BreedId, CropId, ItemId, MachineId, PenId, TreeId } from './data/types';
import { MINUTE_MS } from './farmTime';
import { HUNGRY, type FarmSave, type PlacedObject } from './farmSave';
import { penRoom } from './farmMap';
import { addItem, earn, emit, gainXp, have, hasItems, isUnlocked, ownCount, spend, takeItems } from './farmProgress';

// -----------------------------------------------
// ONE ENGINE FOR EVERY SOURCE (docs/ferme.md 4.3): fields, pens, machines, trees
// -----------------------------------------------
// Every function takes `now`; nothing ever expires: what is ready waits until collected.

export interface Gain {
  item: ItemId | 'nuts';
  count: number;
  xp: number;
}

// -----------------------------------------------
// FIELDS
// -----------------------------------------------

export type FieldState = 'empty' | 'sprout' | 'growing' | 'ripe';

export function fieldState(field: PlacedObject, now: number): FieldState {
  if (!field.crop || field.readyAt === undefined) return 'empty';
  if (now >= field.readyAt) return 'ripe';
  const total = crop(field.crop).minutes * MINUTE_MS;
  return field.readyAt - now > (total * 2) / 3 ? 'sprout' : 'growing';
}

export function canSow(save: FarmSave, field: PlacedObject, id: CropId): boolean {
  const c = crop(id);
  return field.type === 'field' && !field.crop && isUnlocked(save, c.unlock) && save.nuts >= c.seed;
}

export function sow(save: FarmSave, field: PlacedObject, id: CropId, now: number): boolean {
  if (!canSow(save, field, id) || !spend(save, crop(id).seed)) return false;
  field.crop = id;
  field.readyAt = now + crop(id).minutes * MINUTE_MS;
  save.lastSeed = id;
  emit(save, { type: 'sow', target: id, kind: 'crop', count: 1 });
  return true;
}

export function harvest(save: FarmSave, field: PlacedObject, now: number): Gain | null {
  if (fieldState(field, now) !== 'ripe') return null;
  const c = crop(field.crop!);
  delete field.crop;
  delete field.readyAt;
  addItem(save, c.id, c.yield);
  gainXp(save, c.xp);
  emit(save, { type: 'harvest', target: c.id, kind: 'crop', count: c.yield });
  return { item: c.id, count: c.yield, xp: c.xp };
}

// -----------------------------------------------
// PENS: each animal eats one feed, produces, waits to be collected
// -----------------------------------------------

export function penAnimal(pen: PlacedObject): Animal {
  return animalOfPen(pen.type as PenId);
}

export function readyAnimals(pen: PlacedObject, now: number): number {
  return (pen.animals ?? []).filter((t) => t !== HUNGRY && t <= now).length;
}

export function hungryAnimals(pen: PlacedObject): number {
  return (pen.animals ?? []).filter((t) => t === HUNGRY).length;
}

/** When the next animal of the pen is ready, or null when none is busy. */
export function nextAnimalAt(pen: PlacedObject, now: number): number | null {
  const busy = (pen.animals ?? []).filter((t) => t !== HUNGRY && t > now);
  return busy.length ? Math.min(...busy) : null;
}

export function nextAnimalPrice(save: FarmSave, pen: PlacedObject): number {
  const a = penAnimal(pen);
  return animalPrice(a, ownCount(save, a.id));
}

/** A new animal arrives hungry. */
export function buyAnimal(save: FarmSave, pen: PlacedObject): boolean {
  const a = penAnimal(pen);
  if (!isUnlocked(save, a.unlock) || penRoom(pen) <= 0 || !spend(save, nextAnimalPrice(save, pen))) return false;
  pen.breeds = [...breedsOf(pen), null];
  pen.animals!.push(HUNGRY);
  emit(save, { type: 'buy', target: a.id, kind: 'animal', count: 1 });
  return true;
}

/** Each animal's rare breed (null for a plain one), always as long as the pen's animals. */
export function breedsOf(pen: PlacedObject): (BreedId | null)[] {
  return (pen.animals ?? []).map((_, i) => pen.breeds?.[i] ?? null);
}

/** Feeds every hungry animal the barn can feed; returns how many ate. */
export function feedPen(save: FarmSave, pen: PlacedObject, now: number): number {
  const a = penAnimal(pen);
  let fed = 0;
  pen.animals = pen.animals!.map((t) => {
    if (t !== HUNGRY || have(save, a.feed) <= 0) return t;
    addItem(save, a.feed, -1);
    fed++;
    return now + a.minutes * MINUTE_MS;
  });
  if (fed > 0) emit(save, { type: 'feed', target: a.id, kind: 'animal', count: fed });
  return fed;
}

/** Collects every ready product (a rare animal sometimes gives one more); the animals are hungry again. */
export function collectPen(save: FarmSave, pen: PlacedObject, now: number, random: () => number = Math.random): Gain | null {
  const a = penAnimal(pen);
  const ready = readyAnimals(pen, now);
  if (ready === 0) return null;
  const breeds = breedsOf(pen);
  let bonus = 0;
  pen.animals = pen.animals!.map((t, i) => {
    if (t === HUNGRY || t > now) return t;
    const rare = breeds[i];
    if (rare && random() < breed(rare).bonusChance) bonus++;
    return HUNGRY;
  });
  const count = ready + bonus;
  addItem(save, a.product, count);
  gainXp(save, a.xp * ready);
  emit(save, { type: 'collect', target: a.product, kind: 'animal', count });
  return { item: a.product, count, xp: a.xp * ready };
}

// -----------------------------------------------
// MACHINES: a queue of recipes, the finished ones wait on the tray
// -----------------------------------------------

export function machineRecipes(machine: MachineId): Recipe[] {
  return RECIPES.filter((r) => r.machine === machine);
}

export function pendingJobs(machine: PlacedObject, now: number): number {
  return (machine.queue ?? []).filter((j) => j.readyAt > now).length;
}

export function trayJobs(machine: PlacedObject, now: number): number {
  return (machine.queue ?? []).filter((j) => j.readyAt <= now).length;
}

export type QueueRefusal = 'locked' | 'full' | 'missing' | null;

export function queueRefusal(save: FarmSave, machine: PlacedObject, r: Recipe, now: number): QueueRefusal {
  if (!isUnlocked(save, r.unlock)) return 'locked';
  if (pendingJobs(machine, now) >= (machine.slots ?? 0)) return 'full';
  if (!hasItems(save, r.inputs)) return 'missing';
  return null;
}

/** Takes the inputs and queues the recipe after the jobs already waiting. */
export function queueRecipe(save: FarmSave, machine: PlacedObject, itemId: ItemId, now: number): boolean {
  const r = recipe(itemId);
  if (!r || r.machine !== machine.type || queueRefusal(save, machine, r, now) !== null) return false;
  takeItems(save, r.inputs);
  const last = Math.max(now, ...machine.queue!.map((j) => j.readyAt));
  machine.queue!.push({ item: r.item, readyAt: last + r.minutes * MINUTE_MS });
  return true;
}

export function collectMachine(save: FarmSave, machine: PlacedObject, now: number): Gain[] {
  const done = machine.queue!.filter((j) => j.readyAt <= now);
  if (done.length === 0) return [];
  machine.queue = machine.queue!.filter((j) => j.readyAt > now);
  const gains = new Map<ItemId, Gain>();
  for (const job of done) {
    const r = recipe(job.item)!;
    addItem(save, r.item, r.count);
    gainXp(save, r.xp);
    emit(save, { type: 'produce', target: r.item, kind: machine.type, count: r.count });
    const g = gains.get(r.item) ?? { item: r.item, count: 0, xp: 0 };
    g.count += r.count;
    g.xp += r.xp;
    gains.set(r.item, g);
  }
  return [...gains.values()];
}

export function nextSlotPrice(machine: PlacedObject): number | null {
  return (machine.slots ?? 0) >= MAX_QUEUE ? null : queueSlotPrice(machine.slots ?? 0);
}

export function buySlot(save: FarmSave, machine: PlacedObject): boolean {
  const price = nextSlotPrice(machine);
  if (price === null || !spend(save, price)) return false;
  machine.slots = (machine.slots ?? 0) + 1;
  return true;
}

// -----------------------------------------------
// TREES
// -----------------------------------------------

/** What a tree gives when it is ready: Eloisettes for the hazel, fruit for the others. */
export function treeGives(tree: PlacedObject): ItemId | 'nuts' {
  const gives = TREE_YIELDS[tree.type as TreeId].gives;
  return 'nuts' in gives ? 'nuts' : gives.item;
}

export function collectTree(save: FarmSave, tree: PlacedObject, now: number, random: () => number = Math.random): Gain | null {
  if (tree.readyAt === undefined || tree.readyAt > now) return null;
  const y = TREE_YIELDS[tree.type as TreeId];
  tree.readyAt = now + y.minutes * MINUTE_MS;
  gainXp(save, y.xp);
  emit(save, { type: 'collect', target: tree.type, kind: 'tree', count: 1 });
  if ('nuts' in y.gives) {
    const nuts = y.gives.nuts[0] + Math.floor(random() * (y.gives.nuts[1] - y.gives.nuts[0] + 1));
    earn(save, nuts);
    return { item: 'nuts', count: nuts, xp: y.xp };
  }
  addItem(save, y.gives.item, y.gives.count);
  return { item: y.gives.item, count: y.gives.count, xp: y.xp };
}

// -----------------------------------------------
// WHAT IS READY, FOR THE MAP AND THE HOME PAGE
// -----------------------------------------------

/** What waits to be picked up on this object, or null. */
export function readyOn(object: PlacedObject, now: number): ItemId | 'nuts' | null {
  const kind = placeable(object.type).kind;
  if (kind === 'field') return fieldState(object, now) === 'ripe' ? object.crop! : null;
  if (kind === 'pen') return readyAnimals(object, now) > 0 ? penAnimal(object).product : null;
  if (kind === 'machine') return object.queue!.find((j) => j.readyAt <= now)?.item ?? null;
  if (kind === 'tree') return object.readyAt !== undefined && object.readyAt <= now ? treeGives(object) : null;
  return null;
}

/** Things ready to pick up on the whole farm. */
/** What became ready between two visits: the news told on coming back. */
export interface AwayNews {
  fields: number;
  animals: number;
  machines: number;
  trees: number;
}

export function awayNews(save: FarmSave, since: number, now: number): AwayNews {
  const within = (t: number | undefined) => t !== undefined && t > since && t <= now;
  const news: AwayNews = { fields: 0, animals: 0, machines: 0, trees: 0 };
  for (const o of save.objects) {
    if (o.type === 'field' && o.crop && within(o.readyAt)) news.fields++;
    if (o.animals) news.animals += o.animals.filter((t) => t !== HUNGRY && within(t)).length;
    if (o.queue) news.machines += o.queue.filter((j) => within(j.readyAt)).length;
    if (isTree(o.type) && within(o.readyAt)) news.trees++;
  }
  return news;
}

export function readyCount(save: FarmSave, now: number): number {
  return save.objects.filter((o) => readyOn(o, now) !== null).length;
}

// -----------------------------------------------
// THE MERCHANT
// -----------------------------------------------

/** The merchant pays half an item's value: the fallback, orders pay three times better. */
export const MERCHANT_SHARE = 0.5;

export function sellPrice(id: ItemId, count: number): number {
  return Math.floor(item(id).value * count * MERCHANT_SHARE);
}

export function sell(save: FarmSave, id: ItemId, count: number): number {
  if (count <= 0 || have(save, id) < count) return 0;
  const nuts = sellPrice(id, count);
  addItem(save, id, -count);
  earn(save, nuts);
  emit(save, { type: 'sell', target: id, count });
  return nuts;
}
