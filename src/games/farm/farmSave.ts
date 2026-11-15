import { readGame, writeGame } from '../../save';
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
export const FARM_VERSION = 1;

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
  /** Field: what grows. */
  crop?: CropId;
  /** Field and tree: when it is ready. */
  readyAt?: number;
  /** Pen: one entry per animal, when its product is ready; HUNGRY while it waits for food. */
  animals?: number[];
  /** Pen: the rare breed of each animal, same order as `animals`; null for a plain one. */
  breeds?: (BreedId | null)[];
  /** Machine: jobs in order; the finished ones wait on the tray until collected. */
  queue?: Job[];
  /** Machine: jobs that may wait unfinished at once. */
  slots?: number;
}

export const HUNGRY = -1;

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
    xp: count(data.xp),
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
  };
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
  if (isOneOf(o.crop, CROP_IDS) && typeof o.readyAt === 'number') {
    object.crop = o.crop;
    object.readyAt = o.readyAt;
  } else if (typeof o.readyAt === 'number') object.readyAt = o.readyAt;
  if (Array.isArray(o.animals)) {
    object.animals = o.animals.filter((t): t is number => typeof t === 'number');
    const breeds = asArray(o.breeds);
    object.breeds = object.animals.map((_, i) => (isOneOf(breeds[i], BREED_IDS) ? breeds[i] : null));
  }
  if (Array.isArray(o.queue)) {
    object.queue = o.queue.flatMap((j) => {
      const job = asRecord(j);
      return isOneOf(job.item, ITEM_IDS) && typeof job.readyAt === 'number' ? [{ item: job.item, readyAt: job.readyAt }] : [];
    });
  }
  if (isCount(o.slots)) object.slots = o.slots;
  return [object];
}

/** Saves from before the parcels get a mailbox with a welcome parcel. */
function readMail(value: unknown): Mail {
  const m = asRecord(value);
  if (!isCount(m.waiting) || typeof m.nextAt !== 'number') return newMail(Date.now());
  return { waiting: m.waiting, nextAt: m.nextAt, opened: count(m.opened), sinceRare: count(m.sinceRare) };
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
