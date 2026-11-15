import { mulberry32 } from '../../random';
import { PEN_CAPACITY } from './data/animals';
import { STARTING_FIELDS, fieldPrice, maxFields } from './data/crops';
import { STARTING_QUEUE } from './data/machines';
import { HAZEL, placeable, type Placeable } from './data/placeables';
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
import type { BoosterId, DecorId, ObstacleId, PlaceableId } from './data/types';
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

/** Width and height on the map: a quarter turn swaps them. */
export function footprint(o: Pick<PlacedObject, 'type' | 'rot'>): [number, number] {
  const [w, h] = placeable(o.type).size;
  return o.rot % 2 === 1 ? [h, w] : [w, h];
}

export function objectAt(save: FarmSave, x: number, y: number): PlacedObject | null {
  for (const o of save.objects) {
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
  return p.kind === 'field' ? fieldPrice(Math.max(0, ownCount(save, 'field') - STARTING_FIELDS)) : p.price;
}

/** How many may stand on the map now; Infinity when no cap. */
export function capOf(save: FarmSave, p: Placeable): number {
  return p.kind === 'field' ? maxFields(save.level) : p.maxCount ?? Infinity;
}

/** Why a placeable cannot be bought now, or null when it can. A stored decoration is always free to place. */
export function buyRefusal(save: FarmSave, p: Placeable): BuyRefusal {
  if (!isUnlocked(save, p.unlock)) return 'locked';
  if (ownCount(save, p.id) >= capOf(save, p)) return 'max';
  if (save.nuts < priceOf(save, p)) return 'nuts';
  return null;
}

/**
 * Pays (unless it comes from the decoration store) and places a new object. Returns it, or null when
 * the spot or the purse refuses.
 */
export function buyAndPlace(save: FarmSave, id: PlaceableId, x: number, y: number, rot: Rotation, now: number): PlacedObject | null {
  const p = placeable(id);
  const [w, h] = footprint({ type: id, rot });
  if (!canStand(save, x, y, w, h)) return null;
  const stored = p.kind === 'deco' && (save.decorStore[id as DecorId] ?? 0) > 0;
  if (stored) save.decorStore[id as DecorId]! -= 1;
  else if (buyRefusal(save, p) !== null || !spend(save, priceOf(save, p))) return null;
  const object = newObject(save, id, x, y, rot, now);
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
    object.skin = chosenSkin(save, p.joins);
  }
  if (p.kind === 'pen') {
    object.animals = [];
    object.breeds = [];
  }
  if (p.kind === 'machine') {
    object.queue = [];
    object.slots = STARTING_QUEUE;
  }
  if (p.kind === 'tree') object.readyAt = now + HAZEL.minutes * MINUTE_MS;
  save.objects.push(object);
  return object;
}

/** Moves and turns an object; production goes on untouched. False when the new spot does not fit. */
export function moveObject(save: FarmSave, object: PlacedObject, x: number, y: number, rot: Rotation): boolean {
  const [w, h] = footprint({ type: object.type, rot });
  if (!canStand(save, x, y, w, h, object)) return false;
  object.x = x;
  object.y = y;
  object.rot = rot;
  return true;
}

/** Obstacles are cleared, not moved; everything else moves, the mailbox included. */
export function canMove(object: PlacedObject): boolean {
  return placeable(object.type).kind !== 'obstacle';
}

export function canStore(object: PlacedObject): boolean {
  return placeable(object.type).kind === 'deco';
}

/** Puts a decoration away in the store, to place it again later for free. */
export function storeObject(save: FarmSave, object: PlacedObject): boolean {
  if (!canStore(object)) return false;
  save.objects = save.objects.filter((o) => o !== object);
  const id = object.type as DecorId;
  save.decorStore[id] = (save.decorStore[id] ?? 0) + 1;
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

/**
 * A farm with no free tile left still gets its mailbox: at the gate, on the first free dry tile just outside its
 * land, so the parcels can always be opened. It can be moved in once there is room.
 */
function gateSpot(save: FarmSave): [number, number] | null {
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (isOwned(save, x, y) || isWater(x, y) || isRoad(save, x, y) || objectAt(save, x, y)) continue;
      const nextToFarm = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isOwned(save, x + dx, y + dy));
      if (nextToFarm) return [x, y];
    }
  }
  return null;
}

/** Room left in a pen. */
export function penRoom(object: PlacedObject): number {
  return object.type === 'coop' || object.type === 'cowshed' ? PEN_CAPACITY[object.type] - (object.animals?.length ?? 0) : 0;
}
