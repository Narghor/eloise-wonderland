import { mulberry32 } from '../../random';
import { PEN_CAPACITY } from './data/animals';
import { STARTING_FIELDS, fieldPrice, maxFields } from './data/crops';
import { STARTING_QUEUE } from './data/machines';
import { COPY_LEVELS, DECOR, PLACEABLES, TREE_YIELDS, copyLevel, hasCopies, placeable, type Placeable } from './data/placeables';
import type { TreasureId } from './data/parcels';
import {
  MAP_SIZE,
  OBSTACLES,
  OBSTACLES_PER_PARCEL,
  PARCEL,
  PARCELS_PER_SIDE,
  PARCEL_STEPS,
  RIVER_PARCELS,
  RIVER_PARCEL_PRICE,
  RIVER_PROJECT,
  ROAD_COLUMN,
  STARTING_OBSTACLES,
  STARTING_PARCELS,
  isWater,
  obstacle,
} from './data/land';
import { STARTING_NUTS } from './data/levels';
import type { BoosterId, DecorId, ObstacleId, PenId, PlaceableId, TreeId } from './data/types';
import { MINUTE_MS } from './farmTime';
import { FARM_VERSION, newMail, type FarmSave, type PlacedObject, type Rotation } from './farmSave';
import { earn, emit, gainXp, isUnlocked, noBoosters, ownCount, spend } from './farmProgress';
import { chosenSkin } from './farmJoins';

// -----------------------------------------------
// THE GRID: parcels, footprints, placing, moving, turning, storing, clearing
// -----------------------------------------------

export function parcelOf(x: number, y: number): number {
  return Math.floor(y / PARCEL) * PARCELS_PER_SIDE + Math.floor(x / PARCEL);
}

export function isOwned(save: FarmSave, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < MAP_SIZE && y < MAP_SIZE && save.parcels.includes(parcelOf(x, y));
}

/** Width and height on the map: a quarter turn swaps them, unless the piece turns in place. */
export function footprint(o: Pick<PlacedObject, 'type' | 'rot'>): [number, number] {
  const p = placeable(o.type);
  const [w, h] = p.size;
  return o.rot % 2 === 1 && !p.turnsInPlace ? [h, w] : [w, h];
}

/** What stands on the ground of a tile; a decoration sitting on another takes no tile. */
export function objectAt(save: FarmSave, x: number, y: number): PlacedObject | null {
  for (const o of save.objects) {
    if (o.on !== undefined) continue;
    const [w, h] = footprint(o);
    if (x >= o.x && x < o.x + w && y >= o.y && y < o.y + h) return o;
  }
  return null;
}

/** Whether a footprint fits: on owned dry land, on nothing but `ignore`. */
export function canStand(save: FarmSave, x: number, y: number, w: number, h: number, ignore?: PlacedObject): boolean {
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      if (!isOwned(save, tx, ty) || isWater(tx, ty)) return false;
      const there = objectAt(save, tx, ty);
      if (there && there !== ignore) return false;
    }
  }
  return true;
}

/** The free spot nearest to (cx, cy) where a footprint fits, or null when the farm is full. */
export function freeSpotNear(save: FarmSave, cx: number, cy: number, w: number, h: number): [number, number] | null {
  let best: [number, number] | null = null;
  let bestDistance = Infinity;
  for (let y = 0; y <= MAP_SIZE - h; y++) {
    for (let x = 0; x <= MAP_SIZE - w; x++) {
      const distance = (x + w / 2 - cx) ** 2 + (y + h / 2 - cy) ** 2;
      if (distance < bestDistance && canStand(save, x, y, w, h)) {
        best = [x, y];
        bestDistance = distance;
      }
    }
  }
  return best;
}

// -----------------------------------------------
// BUYING AND PLACING
// -----------------------------------------------

export type BuyRefusal = 'locked' | 'max' | 'nuts' | null;

/** What a new one of this placeable costs now (fields get dearer one by one). */
export function priceOf(save: FarmSave, p: Placeable): number {
  if (p.kind === 'field') return fieldPrice(Math.max(0, ownCount(save, 'field') - STARTING_FIELDS));
  if (hasCopies(p)) return p.price * (ownCount(save, p.id) + 1);
  return p.price;
}

/** How many may stand on the map now; Infinity when no cap. */
export function capOf(save: FarmSave, p: Placeable): number {
  if (p.kind === 'field') return maxFields(save.level);
  if (hasCopies(p)) return COPY_LEVELS.filter((_, i) => (copyLevel(p, i + 1) ?? Infinity) <= save.level).length;
  return p.maxCount ?? Infinity;
}

/**
 * What the decoration shop shows (docs/ferme.md 23), by level: what is open, the decorations of the next level only,
 * the treasures already found, then the showpieces open and the next one; never the whole list of locked cards.
 */
export function decorShopList(save: FarmSave): { decor: Placeable[]; showpieces: Placeable[] } {
  const levelOf = (p: Placeable) => ('level' in p.unlock ? p.unlock.level : 1);
  const open = (p: Placeable) => isUnlocked(save, p.unlock);
  const byLevel = (a: Placeable, b: Placeable) => levelOf(a) - levelOf(b);
  const plain = DECOR.filter((p) => !p.showpiece).sort(byLevel);
  const nextLevel = Math.min(...plain.filter((p) => !open(p)).map(levelOf));
  const treasures = PLACEABLES.filter((p) => p.treasure && save.album.includes(p.id as TreasureId));
  const showpieces = DECOR.filter((p) => p.showpiece).sort(byLevel);
  const nextShowpiece = showpieces.find((p) => !open(p));
  return {
    decor: [...plain.filter((p) => open(p) || levelOf(p) === nextLevel), ...treasures],
    showpieces: showpieces.filter((p) => open(p) || p === nextShowpiece),
  };
}

/**
 * Why a placeable cannot be bought now, or null when it can. A stored decoration is always free to place; a
 * treasure is bought only once a parcel has brought the first one. A stored decoration still counts against its cap
 * (a showpiece put away is not a reason to buy a second one).
 */
export function buyRefusal(save: FarmSave, p: Placeable): BuyRefusal {
  if (p.treasure ? !save.album.includes(p.id as TreasureId) : !isUnlocked(save, p.unlock)) return 'locked';
  const stored = p.kind === 'deco' ? save.decorStore[p.id as DecorId] ?? 0 : 0;
  if (ownCount(save, p.id) + stored >= capOf(save, p)) return 'max';
  if (save.nuts < priceOf(save, p)) return 'nuts';
  return null;
}

/**
 * Pays (unless it comes from the decoration store) and places a new object, on the ground at (x, y) or sitting
 * on `on`. Returns it, or null when the spot or the purse refuses.
 */
export function buyAndPlace(save: FarmSave, id: PlaceableId, x: number, y: number, rot: Rotation, now: number, on?: PlacedObject): PlacedObject | null {
  const p = placeable(id);
  const [w, h] = footprint({ type: id, rot });
  if (on ? !canPerch(save, id, on) : !canStand(save, x, y, w, h)) return null;
  const stored = p.kind === 'deco' && (save.decorStore[id as DecorId] ?? 0) > 0;
  if (stored) save.decorStore[id as DecorId]! -= 1;
  else if (buyRefusal(save, p) !== null || !spend(save, priceOf(save, p))) return null;
  const object = newObject(save, id, on?.x ?? x, on?.y ?? y, rot, now);
  if (on) object.on = on.uid;
  // A stored decoration was already counted when it was first bought.
  if (!stored) {
    emit(save, { type: 'buy', target: id, kind: p.kind, count: 1 });
    emit(save, { type: 'place', target: id, kind: p.kind, count: 1 });
  }
  return object;
}

function newObject(save: FarmSave, id: PlaceableId, x: number, y: number, rot: Rotation, now: number): PlacedObject {
  const p = placeable(id);
  const object: PlacedObject = { uid: save.nextUid++, type: id, x, y, rot };
  if (p.joins) {
    object.rot = 0;
    const skin = chosenSkin(save, p.joins);
    if (skin) object.skin = skin;
  }
  if (p.kind === 'pen') object.animals = [];
  if (p.kind === 'machine') {
    object.queue = [];
    object.slots = STARTING_QUEUE;
  }
  if (p.kind === 'tree') object.readyAt = now + TREE_YIELDS[id as TreeId].minutes * MINUTE_MS;
  save.objects.push(object);
  return object;
}

/**
 * Moves and turns an object, to the ground at (x, y) or onto `on`; what it carries comes along, production goes on
 * untouched. False when the new spot does not fit.
 */
export function moveObject(save: FarmSave, object: PlacedObject, x: number, y: number, rot: Rotation, on?: PlacedObject): boolean {
  if (on) {
    if (!canPerch(save, object.type, on, object)) return false;
    object.on = on.uid;
    object.x = on.x;
    object.y = on.y;
    object.rot = rot;
    return true;
  }
  const [w, h] = footprint({ type: object.type, rot });
  if (!canStand(save, x, y, w, h, object)) return false;
  delete object.on;
  object.x = x;
  object.y = y;
  object.rot = rot;
  const carried = carriedBy(save, object);
  if (carried) {
    carried.x = x;
    carried.y = y;
  }
  return true;
}

// -----------------------------------------------
// DECORATIONS SITTING ON OTHERS (docs/ferme.md 16)
// -----------------------------------------------

/** What sits on a support, if anything. */
export function carriedBy(save: FarmSave, support: PlacedObject): PlacedObject | undefined {
  return save.objects.find((o) => o.on === support.uid);
}

/** Whether a `type` may sit on `support`: it perches, the support carries, and nothing else (but `self`) sits there. */
export function canPerch(save: FarmSave, type: PlaceableId, support: PlacedObject, self?: PlacedObject): boolean {
  if (!placeable(type).perches || !placeable(support.type).carries || support.on !== undefined) return false;
  const there = carriedBy(save, support);
  return !there || there === self;
}

/** The free support nearest to (x, y), at most `reach` tiles away on each axis, that `type` could sit on. */
export function freePerchNear(save: FarmSave, type: PlaceableId, x: number, y: number, reach: number): PlacedObject | null {
  let best: PlacedObject | null = null;
  let bestDistance = Infinity;
  for (const o of save.objects) {
    const distance = (o.x - x) ** 2 + (o.y - y) ** 2;
    if (Math.abs(o.x - x) > reach || Math.abs(o.y - y) > reach || distance >= bestDistance || !canPerch(save, type, o)) continue;
    best = o;
    bestDistance = distance;
  }
  return best;
}

/** The support under a tile that `type` could sit on, or null. */
export function perchAt(save: FarmSave, type: PlaceableId, x: number, y: number, self?: PlacedObject): PlacedObject | null {
  const support = objectAt(save, x, y);
  return support && canPerch(save, type, support, self) ? support : null;
}

/** Obstacles are cleared, not moved; everything else moves, the mailbox included. */
export function canMove(object: PlacedObject): boolean {
  return placeable(object.type).kind !== 'obstacle';
}

export function canStore(object: PlacedObject): boolean {
  return placeable(object.type).kind === 'deco';
}

/** Puts a decoration away in the store, to place it again later for free; what sits on it goes with it. */
export function storeObject(save: FarmSave, object: PlacedObject): boolean {
  if (!canStore(object)) return false;
  const gone = [object, carriedBy(save, object)].filter((o): o is PlacedObject => o !== undefined);
  save.objects = save.objects.filter((o) => !gone.includes(o));
  for (const o of gone) {
    const id = o.type as DecorId;
    save.decorStore[id] = (save.decorStore[id] ?? 0) + 1;
  }
  return true;
}

// -----------------------------------------------
// THE WILD
// -----------------------------------------------

export interface Surprise {
  nuts: number;
  booster: BoosterId | null;
}

/** Clears an obstacle for its price; returns the XP and the surprise found, or null when it cannot be paid. */
export function clearObstacle(save: FarmSave, object: PlacedObject, random: () => number = Math.random): { xp: number; surprise: Surprise } | null {
  const p = placeable(object.type);
  if (p.kind !== 'obstacle') return null;
  const o = obstacle(object.type as ObstacleId);
  if (!spend(save, o.cost)) return null;
  save.objects = save.objects.filter((x) => x !== object);
  emit(save, { type: 'clear', target: o.id, count: 1 });
  const surprise: Surprise = { nuts: 0, booster: null };
  if (random() < o.surprise.chance) {
    if (o.surprise.nuts) surprise.nuts = o.surprise.nuts[0] + Math.floor(random() * (o.surprise.nuts[1] - o.surprise.nuts[0] + 1));
    if (o.surprise.boosters) surprise.booster = o.surprise.boosters[Math.floor(random() * o.surprise.boosters.length)];
  }
  earn(save, surprise.nuts);
  if (surprise.booster) save.boosters[surprise.booster]++;
  gainXp(save, o.xp);
  return { xp: o.xp, surprise };
}

/** Scatters obstacles on the free dry tiles of some parcels; the same seed always gives the same wild. */
function scatterObstacles(save: FarmSave, parcels: readonly number[], count: number, seed: number, keepClear: (x: number, y: number) => boolean): void {
  const random = mulberry32(seed);
  const tiles: [number, number][] = [];
  for (const parcel of parcels) {
    const px = (parcel % PARCELS_PER_SIDE) * PARCEL;
    const py = Math.floor(parcel / PARCELS_PER_SIDE) * PARCEL;
    for (let y = py; y < py + PARCEL; y++) for (let x = px; x < px + PARCEL; x++) if (!isWater(x, y) && !keepClear(x, y)) tiles.push([x, y]);
  }
  const total = OBSTACLES.reduce((s, o) => s + o.weight, 0);
  let placed = 0;
  for (let tries = 0; placed < count && tries < count * 20 && tiles.length > 0; tries++) {
    let roll = random() * total;
    const kind = OBSTACLES.find((o) => (roll -= o.weight) < 0) ?? OBSTACLES[0];
    const [x, y] = tiles[Math.floor(random() * tiles.length)];
    const [w, h] = placeable(kind.id).size;
    if (!canStand(save, x, y, w, h) || !tilesIn(tiles, x, y, w, h)) continue;
    newObject(save, kind.id, x, y, 0, 0);
    placed++;
  }
}

function tilesIn(tiles: [number, number][], x: number, y: number, w: number, h: number): boolean {
  for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) if (!tiles.some(([a, b]) => a === tx && b === ty)) return false;
  return true;
}

// -----------------------------------------------
// PARCELS
// -----------------------------------------------

export interface ParcelOffer {
  parcel: number;
  price: number;
  /** Level needed, 0 when none. */
  level: number;
  river: boolean;
}

/** The parcels next to the farm, with their price; the river bank only once its project is done. */
export function parcelOffers(save: FarmSave): ParcelOffer[] {
  const offers: ParcelOffer[] = [];
  const step = PARCEL_STEPS[save.parcelsBought];
  const riverOpen = save.projectsDone.includes(RIVER_PROJECT);
  for (let parcel = 0; parcel < PARCELS_PER_SIDE ** 2; parcel++) {
    if (save.parcels.includes(parcel) || !isNextToFarm(save, parcel)) continue;
    const river = RIVER_PARCELS.includes(parcel);
    if (river && riverOpen) offers.push({ parcel, price: RIVER_PARCEL_PRICE, level: 0, river });
    else if (!river && step) offers.push({ parcel, price: step.price, level: step.level, river });
  }
  return offers;
}

function isNextToFarm(save: FarmSave, parcel: number): boolean {
  const px = parcel % PARCELS_PER_SIDE;
  const py = Math.floor(parcel / PARCELS_PER_SIDE);
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
    const x = px + dx;
    const y = py + dy;
    return x >= 0 && y >= 0 && x < PARCELS_PER_SIDE && y < PARCELS_PER_SIDE && save.parcels.includes(y * PARCELS_PER_SIDE + x);
  });
}

export function buyParcel(save: FarmSave, parcel: number): boolean {
  const offer = parcelOffers(save).find((o) => o.parcel === parcel);
  if (!offer || save.level < offer.level || !spend(save, offer.price)) return false;
  save.parcels.push(parcel);
  if (!offer.river) save.parcelsBought++;
  emit(save, { type: 'buy', target: offer.river ? 'river' : 'parcel', count: 1 });
  scatterObstacles(save, [parcel], OBSTACLES_PER_PARCEL, 1000 + parcel, () => false);
  return true;
}

// -----------------------------------------------
// A NEW FARM
// -----------------------------------------------

/** Six fields of ripe wheat in the middle, the wild all around: the first quest starts by harvesting. */
export function newFarm(now: number): FarmSave {
  const save: FarmSave = {
    version: FARM_VERSION,
    nuts: STARTING_NUTS,
    xp: 0,
    level: 1,
    levelSeen: 1,
    stock: {},
    objects: [],
    nextUid: 1,
    parcels: [...STARTING_PARCELS],
    parcelsBought: 0,
    decorStore: {},
    orders: [],
    orderWaits: [],
    nextOrderId: 1,
    boosters: noBoosters(),
    shop: { day: '', bought: {}, fromGames: 0 },
    counters: {},
    questsDone: [],
    questStarts: {},
    projects: {},
    projectsDone: [],
    daily: null,
    medals: {},
    lastSeed: 'wheat',
    lastVisit: now,
    mail: newMail(now),
    album: [],
    waitingBreeds: [],
    lastSkins: {},
    boughtStyles: {},
    cart: { order: null, nextAt: 0 },
  };
  const fieldsAt: [number, number][] = [[10, 10], [11, 10], [12, 10], [10, 11], [11, 11], [12, 11]];
  for (const [x, y] of fieldsAt) {
    const field = newObject(save, 'field', x, y, 0, now);
    field.crop = 'wheat';
    field.readyAt = now;
  }
  newObject(save, 'mailbox', MAILBOX_AT[0], MAILBOX_AT[1], 0, now);
  // The middle stays clear for the first buildings; the wild fills the rest.
  const middle = (x: number, y: number) => x >= 8 && x <= 15 && y >= 8 && y <= 14;
  scatterObstacles(save, STARTING_PARCELS, STARTING_OBSTACLES, 77, middle);
  return save;
}

/** The tile where the village road meets the farm: on ROAD_COLUMN, just south of the farm, outside it. */
export function gateTile(save: FarmSave): [number, number] {
  let y = STARTING_SOUTH_ROW;
  while (isOwned(save, ROAD_COLUMN, y + 1)) y++;
  return [ROAD_COLUMN, y + 1];
}

/** The road's tiles: its column from the gate down into the forest, and the gate's two neighbours, where villagers wait. */
export function isRoad(save: FarmSave, x: number, y: number): boolean {
  const [gx, gy] = gateTile(save);
  return (x === gx && y >= gy) || (y === gy && Math.abs(x - gx) <= 1);
}

/** The south row of the starting parcels, always owned. */
const STARTING_SOUTH_ROW = 3 * PARCEL - 1;

/** Where a new farm's mailbox stands, by the fields. */
const MAILBOX_AT: [number, number] = [9, 9];

/** Farms from before the parcels get their mailbox near the middle, on the first free tile. */
export function ensureMailbox(save: FarmSave): void {
  if (save.objects.some((o) => o.type === 'mailbox')) return;
  const spot = freeSpotNear(save, MAILBOX_AT[0] + 0.5, MAILBOX_AT[1] + 0.5, 1, 1) ?? gateSpot(save);
  if (spot) newObject(save, 'mailbox', spot[0], spot[1], 0, 0);
}

/** From its level, the market cart parks inside the farm near the gate, or just outside it when the farm is full. */
export function ensureCart(save: FarmSave, now: number): void {
  if (!isUnlocked(save, placeable('marketCart').unlock) || save.objects.some((o) => o.type === 'marketCart')) return;
  const [gx, gy] = gateTile(save);
  const spot = freeSpotNear(save, gx + 1, gy - 2, 2, 1) ?? gateSpot(save, 2, 1);
  if (spot) newObject(save, 'marketCart', spot[0], spot[1], 0, now);
}

/**
 * A farm with no free tile left still gets its mailbox or its cart: on the free dry tiles just outside its land
 * nearest the gate, so they can always be used. They can be moved in once there is room.
 */
function gateSpot(save: FarmSave, w = 1, h = 1): [number, number] | null {
  const [gx, gy] = gateTile(save);
  const free = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < MAP_SIZE && y < MAP_SIZE && !isOwned(save, x, y) && !isWater(x, y) && !isRoad(save, x, y) && !objectAt(save, x, y);
  let best: [number, number] | null = null;
  for (let y = 0; y + h <= MAP_SIZE; y++) {
    for (let x = 0; x + w <= MAP_SIZE; x++) {
      let fits = true;
      let nextToFarm = false;
      for (let j = 0; j < h && fits; j++) {
        for (let i = 0; i < w && fits; i++) {
          fits = free(x + i, y + j);
          nextToFarm ||= [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isOwned(save, x + i + dx, y + j + dy));
        }
      }
      if (fits && nextToFarm && (!best || Math.hypot(x - gx, y - gy) < Math.hypot(best[0] - gx, best[1] - gy))) best = [x, y];
    }
  }
  return best;
}

/** Room left in a pen. */
export function penRoom(object: PlacedObject): number {
  return placeable(object.type).kind === 'pen' ? PEN_CAPACITY[object.type as PenId] - (object.animals?.length ?? 0) : 0;
}
