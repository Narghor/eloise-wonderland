import { readGame, writeGame } from '../../save';
import { xpToNext } from './data/levels';
import { CROP_IDS } from './data/crops';
import { ITEM_IDS } from './data/items';
import { PLACEABLE_IDS, placeable } from './data/placeables';
import { BOOSTER_IDS } from './data/boosters';
import { PERSON_IDS } from './data/people';
import { PROJECTS } from './data/projects';
import { QUESTS } from './data/quests';
import { MAP_SIZE } from './data/land';
import { BREED_IDS, PARCEL_EVERY_MINUTES, TREASURES, type TreasureId } from './data/parcels';
import { SKINS, SKIN_IDS, skin } from './data/skins';
import type { BoosterId, BreedId, CropId, DecorId, ItemId, JoinFamily, PersonId, PlaceableId, ProjectId, QuestId, SkinId } from './data/types';

// -----------------------------------------------
// THE 'farm' BLOCK OF THE SITE SAVE
// -----------------------------------------------
// Read defensively: anything unknown or broken is dropped, never trusted. FARM_VERSION goes up with each change
// of shape, with its migration in `loadFarm`.

const GAME_ID = 'farm';
export const FARM_VERSION = 5;

/** Version 1 played with lot 1's XP table: its progress in the level is kept as a share of the new one. */
const LOT1_XP_TABLE = [15, 30, 50, 80, 200, 320, 480, 680, 950, 1600, 2900, 3700, 4500, 5300];

export type Rotation = 0 | 1 | 2 | 3;

export interface Job {
  item: ItemId;
  readyAt: number;
}

/** Anything standing on the map; the fields after `rot` belong to its kind. */
export interface PlacedObject {
  uid: number;
  type: PlaceableId;
  x: number;
  y: number;
  rot: Rotation;
  /** A piece that joins (fence, gate): its look; none = the family's first skin. */
  skin?: SkinId;
  /** A small decoration sitting on another: the uid of its support, whose tile it keeps (it takes none itself). */
  on?: number;
  /** Field: what grows. */
  crop?: CropId;
  /** Field, tree and pen: when it is ready (a pen has one timer for all its animals). */
  readyAt?: number;
  /** Pen: one entry per animal, its rare breed; null for a plain one. */
  animals?: (BreedId | null)[];
  /** Pen: how many animals eat in the running meal, the first ones of `animals`; none while the pen waits for food. */
  fed?: number;
  /** Machine: jobs in order; the finished ones wait on the tray until collected. */
  queue?: Job[];
  /** Machine: jobs that may wait unfinished at once. */
  slots?: number;
}

export interface Order {
  id: number;
  who: PersonId;
  items: Partial<Record<ItemId, number>>;
  nuts: number;
  xp: number;
  /** A "coup de cœur": pays double and holds one of Gaston's parcels. */
  special?: boolean;
}

export interface DailyTask {
  template: string;
  key: string;
  count: number;
  text: string;
  /** Counter value when the day started. */
  start: number;
  paid: boolean;
}

export interface FarmSave {
  version: number;
  nuts: number;
  xp: number;
  level: number;
  /** Last level whose news was shown. */
  levelSeen: number;
  stock: Partial<Record<ItemId, number>>;
  objects: PlacedObject[];
  nextUid: number;
  parcels: number[];
  /** Parcels bought outside the river bank: the price ladder's step. */
  parcelsBought: number;
  /** Decorations put away, ready to be placed again. */
  decorStore: Partial<Record<DecorId, number>>;
  orders: Order[];
  /** When each empty place of the order board gets its new order. */
  orderWaits: number[];
  nextOrderId: number;
  boosters: Record<BoosterId, number>;
  /** The booster shop's day, what was bought that day, and the boosters won in other games that day. */
  shop: { day: string; bought: Partial<Record<BoosterId, number>>; fromGames: number };
  /** Lifetime counts of every event, by key ('harvest', 'harvest:wheat'...). */
  counters: Record<string, number>;
  questsDone: QuestId[];
  /** Open quests, with their counters when they opened. */
  questStarts: Record<QuestId, Record<string, number>>;
  /** Stage reached and items already given, per project. */
  projects: Partial<Record<ProjectId, { stage: number; given: Partial<Record<ItemId, number>> }>>;
  projectsDone: ProjectId[];
  daily: { day: string; tasks: DailyTask[]; chestOpened: boolean } | null;
  /** Medal tiers already paid, 0 to 3. */
  medals: Record<string, number>;
  lastSeed: CropId;
  /** Last time the farm was open: the "while you were away" news. */
  lastVisit: number;
  /** Gaston's parcels waiting in the mailbox, when the next round comes, and the pity count. */
  mail: Mail;
  /** Treasures found at least once, for the album. */
  album: TreasureId[];
  /** Rare animals won while their pen was full or not built yet: placed from the shop later. */
  waitingBreeds: BreedId[];
  /** The skin last chosen per family: what the next piece bought wears. */
  lastSkins: Partial<Record<JoinFamily, SkinId>>;
  /** The market cart's big order (none while it is away), and when it comes back. */
  cart: { order: CartOrder | null; nextAt: number };
}

/** A big order of several kinds: pays better than the board, sometimes holds a parcel. */
export interface CartOrder {
  items: Partial<Record<ItemId, number>>;
  nuts: number;
  xp: number;
  parcel: boolean;
}

export interface Mail {
  waiting: number;
  nextAt: number;
  opened: number;
  /** Parcels opened since the last rare or better. */
  sinceRare: number;
}

/** A new mailbox holds a welcome parcel, and Gaston comes back a round later. */
export function newMail(now: number): Mail {
  return { waiting: 1, nextAt: now + PARCEL_EVERY_MINUTES * 60_000, opened: 0, sinceRare: 0 };
}

export function farmExists(): boolean {
  const raw = readGame(GAME_ID);
  return typeof raw === 'object' && raw !== null;
}

/** The saved farm, or null before the first visit (the screen then builds a new one). */
export function loadFarm(): FarmSave | null {
  const raw = readGame(GAME_ID);
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Record<string, unknown>;
  const shop = asRecord(data.shop);
  const daily = asRecord(data.daily);
  const save: FarmSave = {
    version: FARM_VERSION,
    nuts: count(data.nuts),
    xp: readXp(data),
    level: Math.max(1, count(data.level)),
    levelSeen: Math.max(1, count(data.levelSeen)),
    stock: counts(data.stock, ITEM_IDS),
    objects: asArray(data.objects).flatMap(readObject),
    nextUid: Math.max(1, count(data.nextUid)),
    parcels: asArray(data.parcels).filter((p): p is number => isCount(p) && p < (MAP_SIZE / 6) ** 2),
    parcelsBought: count(data.parcelsBought),
    decorStore: counts(data.decorStore, PLACEABLE_IDS.filter((id) => placeable(id).kind === 'deco') as DecorId[]),
    orders: asArray(data.orders).flatMap(readOrder),
    orderWaits: asArray(data.orderWaits).filter((t): t is number => typeof t === 'number'),
    nextOrderId: Math.max(1, count(data.nextOrderId)),
    boosters: Object.fromEntries(BOOSTER_IDS.map((id) => [id, count(asRecord(data.boosters)[id])])) as Record<BoosterId, number>,
    shop: { day: typeof shop.day === 'string' ? shop.day : '', bought: counts(shop.bought, BOOSTER_IDS), fromGames: count(shop.fromGames) },
    counters: Object.fromEntries(Object.entries(asRecord(data.counters)).filter(([, n]) => isCount(n))) as Record<string, number>,
    questsDone: asArray(data.questsDone).filter((id): id is string => typeof id === 'string' && QUESTS.some((q) => q.id === id)),
    questStarts: Object.fromEntries(
      Object.entries(asRecord(data.questStarts))
        .filter(([id]) => QUESTS.some((q) => q.id === id))
        .map(([id, starts]) => [id, Object.fromEntries(Object.entries(asRecord(starts)).filter(([, n]) => isCount(n)))]),
    ) as Record<QuestId, Record<string, number>>,
    projects: readProjects(data.projects),
    projectsDone: asArray(data.projectsDone).filter((id): id is ProjectId => PROJECTS.some((p) => p.id === id)),
    daily:
      typeof daily.day === 'string'
        ? { day: daily.day, tasks: asArray(daily.tasks).flatMap(readTask), chestOpened: daily.chestOpened === true }
        : null,
    medals: Object.fromEntries(Object.entries(asRecord(data.medals)).filter(([, n]) => isCount(n) && n <= 3)) as Record<string, number>,
    lastSeed: isOneOf(data.lastSeed, CROP_IDS) ? data.lastSeed : 'wheat',
    lastVisit: typeof data.lastVisit === 'number' ? data.lastVisit : 0,
    mail: readMail(data.mail),
    album: asArray(data.album).filter((id): id is TreasureId => TREASURES.some((t) => t.id === id)),
    waitingBreeds: asArray(data.waitingBreeds).filter((id): id is BreedId => isOneOf(id, BREED_IDS)),
    lastSkins: Object.fromEntries(
      Object.entries(asRecord(data.lastSkins)).filter(([family, id]) => SKINS.some((s) => s.id === id && s.family === family)),
    ) as FarmSave['lastSkins'],
    cart: readCart(data.cart),
  };
  retireDecorAppleTrees(save);
  if (count(data.version) < 3) standTreesOnTrunks(save);
  if (count(data.version) < 5) standTallDecorOnBase(save);
  settlePerches(save);
  // Two objects must never share a uid: the newest uid is always above every one in use.
  save.nextUid = Math.max(save.nextUid, ...save.objects.map((o) => o.uid + 1));
  save.nextOrderId = Math.max(save.nextOrderId, ...save.orders.map((o) => o.id + 1));
  return save;
}

export function saveFarm(save: FarmSave): void {
  writeGame(GAME_ID, save);
}

function readObject(value: unknown): PlacedObject[] {
  const o = asRecord(value);
  if (!isCount(o.uid) || !isOneOf(o.type, PLACEABLE_IDS) || !isCount(o.x) || !isCount(o.y) || o.x >= MAP_SIZE || o.y >= MAP_SIZE) return [];
  // A joined piece is never turned: its shape comes from its neighbours (old fences were turned by hand).
  const rot = isCount(o.rot) && o.rot <= 3 && !placeable(o.type).joins ? (o.rot as Rotation) : 0;
  const object: PlacedObject = { uid: o.uid, type: o.type, x: o.x, y: o.y, rot };
  if (isOneOf(o.skin, SKIN_IDS) && skin(o.skin).family === placeable(o.type).joins) object.skin = o.skin;
  if (isCount(o.on) && placeable(o.type).perches) object.on = o.on;
  if (isOneOf(o.crop, CROP_IDS) && typeof o.readyAt === 'number') {
    object.crop = o.crop;
    object.readyAt = o.readyAt;
  } else if (typeof o.readyAt === 'number') object.readyAt = o.readyAt;
  if (Array.isArray(o.animals)) readPen(object, o);
  if (Array.isArray(o.queue)) {
    object.queue = o.queue.flatMap((j) => {
      const job = asRecord(j);
      return isOneOf(job.item, ITEM_IDS) && typeof job.readyAt === 'number' ? [{ item: job.item, readyAt: job.readyAt }] : [];
    });
  }
  if (isCount(o.slots)) object.slots = o.slots;
  return [object];
}

function readPen(pen: PlacedObject, o: Record<string, unknown>): void {
  const entries = asArray(o.animals);
  // Up to version 3 each animal had its own timer (-1 = hungry) and `breeds` ran beside them: the busy ones now
  // share one meal, ready when the last of them was.
  if (entries.some((t) => typeof t === 'number')) {
    const breeds = asArray(o.breeds);
    const old = entries.flatMap((t, i) => (typeof t === 'number' ? [{ readyAt: t, breed: isOneOf(breeds[i], BREED_IDS) ? breeds[i] : null }] : []));
    const busy = old.filter((a) => a.readyAt >= 0);
    pen.animals = [...busy, ...old.filter((a) => a.readyAt < 0)].map((a) => a.breed);
    if (busy.length > 0) {
      pen.fed = busy.length;
      pen.readyAt = Math.max(...busy.map((a) => a.readyAt));
    } else delete pen.readyAt;
    return;
  }
  pen.animals = entries.map((b) => (isOneOf(b, BREED_IDS) ? b : null));
  const fed = isCount(o.fed) ? Math.min(o.fed, pen.animals.length) : 0;
  if (fed > 0 && pen.readyAt !== undefined) pen.fed = fed;
  else delete pen.readyAt;
}

/** XP gained inside the current level; a version 1 save keeps the same share of the bar with the lot 2 table. */
function readXp(data: Record<string, unknown>): number {
  const xp = count(data.xp);
  const level = Math.max(1, count(data.level));
  const before = LOT1_XP_TABLE[level - 1];
  const now = xpToNext(level);
  if (count(data.version) >= 2 || before === undefined || now === null) return xp;
  return Math.min(now - 1, Math.round((xp / before) * now));
}

/** Lot 2: a decorative apple tree on the map becomes a fruit tree, ripe at once; one put away is paid back. */
function retireDecorAppleTrees(save: FarmSave): void {
  for (const o of save.objects) {
    if (o.type !== 'appleTree') continue;
    o.type = 'apple';
    o.rot = 0;
    o.readyAt = 0;
  }
  const stored = save.decorStore.appleTree ?? 0;
  if (stored > 0) {
    save.nuts += stored * placeable('appleTree').price;
    delete save.decorStore.appleTree;
  }
}

/** Version 3: a tree took 2 x 2 tiles, it now takes its trunk's one, the lower left tile of its old square. */
function standTreesOnTrunks(save: FarmSave): void {
  for (const o of save.objects) if (placeable(o.type).kind === 'tree') o.y += 1;
}

/** Up to version 4 these took 2 x 2 tiles; they now stand on their bottom row and are drawn where they were. */
const TALL_DECOR_ON_BASE: readonly PlaceableId[] = ['well', 'swing', 'fountain'];

function standTallDecorOnBase(save: FarmSave): void {
  for (const o of save.objects) if (TALL_DECOR_ON_BASE.includes(o.type) && o.on === undefined) o.y += 1;
}

/**
 * A perched decoration keeps its support's tile; one whose support is gone, cannot carry, or already carries
 * another goes back to the store.
 */
function settlePerches(save: FarmSave): void {
  const taken = new Set<number>();
  save.objects = save.objects.filter((o) => {
    if (o.on === undefined) return true;
    const support = save.objects.find((s) => s.uid === o.on && s.on === undefined);
    if (support && placeable(support.type).carries && !taken.has(support.uid)) {
      taken.add(support.uid);
      o.x = support.x;
      o.y = support.y;
      return true;
    }
    const id = o.type as DecorId;
    save.decorStore[id] = (save.decorStore[id] ?? 0) + 1;
    return false;
  });
}

/** Saves from before the parcels get a mailbox with a welcome parcel. */
function readMail(value: unknown): Mail {
  const m = asRecord(value);
  if (!isCount(m.waiting) || typeof m.nextAt !== 'number') return newMail(Date.now());
  return { waiting: m.waiting, nextAt: m.nextAt, opened: count(m.opened), sinceRare: count(m.sinceRare) };
}

function readCart(value: unknown): FarmSave['cart'] {
  const c = asRecord(value);
  const o = asRecord(c.order);
  const items = counts(o.items, ITEM_IDS);
  const order = Object.keys(items).length > 0 && isCount(o.nuts) && isCount(o.xp) ? { items, nuts: o.nuts, xp: o.xp, parcel: o.parcel === true } : null;
  return { order, nextAt: typeof c.nextAt === 'number' ? c.nextAt : 0 };
}

function readOrder(value: unknown): Order[] {
  const o = asRecord(value);
  if (!isCount(o.id) || !isOneOf(o.who, PERSON_IDS) || !isCount(o.nuts) || !isCount(o.xp)) return [];
  const items = counts(o.items, ITEM_IDS);
  return Object.keys(items).length > 0 ? [{ id: o.id, who: o.who, items, nuts: o.nuts, xp: o.xp, ...(o.special === true ? { special: true } : {}) }] : [];
}

function readTask(value: unknown): DailyTask[] {
  const t = asRecord(value);
  if (typeof t.template !== 'string' || typeof t.key !== 'string' || typeof t.text !== 'string' || !isCount(t.count) || !isCount(t.start)) return [];
  return [{ template: t.template, key: t.key, count: t.count, text: t.text, start: t.start, paid: t.paid === true }];
}

function readProjects(value: unknown): FarmSave['projects'] {
  const result: FarmSave['projects'] = {};
  for (const p of PROJECTS) {
    const entry = asRecord(asRecord(value)[p.id]);
    if (isCount(entry.stage)) result[p.id] = { stage: Math.min(entry.stage, p.stages.length), given: counts(entry.given, ITEM_IDS) };
  }
  return result;
}

function counts<T extends string>(value: unknown, ids: readonly T[]): Partial<Record<T, number>> {
  const result: Partial<Record<T, number>> = {};
  for (const [id, n] of Object.entries(asRecord(value))) if (isOneOf(id, ids) && isCount(n) && n > 0) result[id] = n;
  return result;
}

function count(value: unknown): number {
  return isCount(value) ? value : 0;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function isOneOf<T extends string>(value: unknown, ids: readonly T[]): value is T {
  return typeof value === 'string' && (ids as readonly string[]).includes(value);
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}
