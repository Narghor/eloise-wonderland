import { readGame, writeGame } from '../save';
import {
  CAFE_LEVELS,
  CHARACTERS,
  DISHES,
  FURNITURE,
  INGREDIENTS,
  KITCHEN_LEVELS,
  MAX_PLOTS,
  PLANTS,
  POSES,
  ROOMS,
  SPOTS_PER_ROOM,
  STARTING_PLOTS,
  starterFurniture,
  type DishId,
  type FurnitureId,
  type IngredientId,
  type PlantId,
  type PoseId,
  type RoomId,
} from './houseData';

const GAME_ID = 'house';

export interface Plot {
  plant: PlantId;
  readyAt: number;
  watered: boolean;
}

export interface Cooking {
  dish: DishId;
  readyAt: number;
}

export interface Friendship {
  stars: number;
  /** Best stars per pose photographed. */
  photos: Partial<Record<PoseId, number>>;
  /** Chapters already read, 0 to 3. */
  chaptersRead: number;
  met: boolean;
}

export interface Gift {
  from: string;
  coins: number;
  /** A rare ingredient left instead of coins. */
  ingredient?: IngredientId;
  /** A rare seed left instead of coins. */
  seed?: PlantId;
}

/** A visitor asking for a dish already discovered, until the visit ends. */
export interface Order {
  visitor: string;
  dish: DishId;
}

export interface HouseSave {
  rooms: RoomId[];
  owned: FurnitureId[];
  placed: Record<RoomId, (FurnitureId | null)[]>;
  plots: (Plot | null)[];
  pantry: Partial<Record<IngredientId, number>>;
  /** Rare seeds waiting to be sown. */
  seeds: Partial<Record<PlantId, number>>;
  /** Index in KITCHEN_LEVELS. */
  kitchenLevel: number;
  cooking: Cooking[];
  dishes: Partial<Record<DishId, number>>;
  /** Plates waiting on the kitchen table. */
  table: DishId[];
  known: DishId[];
  friends: Record<string, Friendship>;
  visitors: string[];
  /** When the present visitors leave; 0 before the very first visit. */
  visitUntil: number;
  gifts: Gift[];
  order: Order | null;
  /** Café reputation, 0 to CAFE_LEVELS - 1: its service difficulty. */
  cafeLevel: number;
  /** What the present visitors asked for, until the visit ends. */
  requests: FriendRequest[];
  /** Something a visitor lost behind a piece of furniture, until found or the visit ends. */
  lost: LostItem | null;
  /** Best photo stars of each pair of friends posing together, by pair id. */
  duos: Record<string, number>;
  /** The visit (its visitUntil) that already had its snack: one per visit. */
  snackVisit: number;
}

export interface FriendRequest {
  visitor: string;
  kind: 'ingredient' | 'decor';
  /** An ingredient or a furniture id. */
  target: string;
  count: number;
}

export interface LostItem {
  visitor: string;
  room: RoomId;
  spot: number;
}

const ROOM_IDS = ROOMS.map((room) => room.id);
const FURNITURE_IDS = FURNITURE.map((item) => item.id);
const PLANT_IDS = PLANTS.map((item) => item.id);
const INGREDIENT_IDS = INGREDIENTS.map((item) => item.id);
const DISH_IDS = DISHES.map((item) => item.id);
const POSE_IDS = Object.keys(POSES) as PoseId[];

function starterRooms(): RoomId[] {
  return ROOMS.filter((room) => room.price === 0).map((room) => room.id);
}

export function emptyPlacement(room: RoomId): (FurnitureId | null)[] {
  const spots: (FurnitureId | null)[] = Array.from({ length: SPOTS_PER_ROOM }, () => null);
  spots[0] = starterFurniture(room);
  return spots;
}

export function newFriendship(): Friendship {
  return { stars: 0, photos: {}, chaptersRead: 0, met: false };
}

export function loadHouse(): HouseSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;

  const rooms = new Set(starterRooms());
  for (const id of asArray(data.rooms)) if (isOneOf(id, ROOM_IDS)) rooms.add(id);
  const owned = new Set(FURNITURE.filter((item) => item.price === 0).map((item) => item.id));
  for (const id of asArray(data.owned)) if (isOneOf(id, FURNITURE_IDS)) owned.add(id);

  const savedPlaced = asRecord(data.placed);
  const placed = {} as Record<RoomId, (FurnitureId | null)[]>;
  for (const room of ROOM_IDS) {
    const spots = asArray(savedPlaced[room]);
    placed[room] =
      spots.length === SPOTS_PER_ROOM
        ? spots.map((id) => (isOneOf(id, FURNITURE_IDS) && owned.has(id) && FURNITURE.find((f) => f.id === id)!.room === room ? id : null))
        : emptyPlacement(room);
  }

  const plots = asArray(data.plots)
    .slice(0, MAX_PLOTS)
    .map((value): Plot | null => {
      const plot = asRecord(value);
      return isOneOf(plot.plant, PLANT_IDS) && typeof plot.readyAt === 'number'
        ? { plant: plot.plant, readyAt: plot.readyAt, watered: plot.watered === true }
        : null;
    });
  while (plots.length < STARTING_PLOTS) plots.push(null);

  const friends: Record<string, Friendship> = {};
  const savedFriends = asRecord(data.friends);
  for (const { id } of CHARACTERS) {
    const friend = asRecord(savedFriends[id]);
    const photos: Partial<Record<PoseId, number>> = {};
    for (const [pose, stars] of Object.entries(asRecord(friend.photos))) {
      if (isOneOf(pose, POSE_IDS) && isCount(stars) && stars <= 3) photos[pose] = stars;
    }
    friends[id] = {
      stars: isCount(friend.stars) ? friend.stars : 0,
      photos,
      chaptersRead: isCount(friend.chaptersRead) ? Math.min(3, friend.chaptersRead) : 0,
      met: friend.met === true,
    };
  }

  return {
    rooms: ROOM_IDS.filter((id) => rooms.has(id)),
    owned: [...owned],
    placed,
    plots,
    pantry: counts(data.pantry, INGREDIENT_IDS),
    seeds: counts(data.seeds, PLANT_IDS),
    kitchenLevel: isCount(data.kitchenLevel) ? Math.min(KITCHEN_LEVELS.length - 1, data.kitchenLevel) : 0,
    cooking: asArray(data.cooking).flatMap((value) => {
      const cooking = asRecord(value);
      return isOneOf(cooking.dish, DISH_IDS) && typeof cooking.readyAt === 'number' ? [{ dish: cooking.dish, readyAt: cooking.readyAt }] : [];
    }),
    dishes: counts(data.dishes, DISH_IDS),
    table: asArray(data.table).filter((id): id is DishId => isOneOf(id, DISH_IDS)),
    known: asArray(data.known).filter((id): id is DishId => isOneOf(id, DISH_IDS)),
    friends,
    visitors: asArray(data.visitors).filter((id): id is string => typeof id === 'string' && CHARACTERS.some((c) => c.id === id)),
    visitUntil: typeof data.visitUntil === 'number' ? data.visitUntil : 0,
    order: readOrder(data.order),
    cafeLevel: isCount(data.cafeLevel) ? Math.min(CAFE_LEVELS - 1, data.cafeLevel) : 0,
    requests: asArray(data.requests).flatMap((value) => {
      const r = asRecord(value);
      const known = r.kind === 'ingredient' ? isOneOf(r.target, INGREDIENT_IDS) : r.kind === 'decor' && isOneOf(r.target, FURNITURE_IDS);
      return typeof r.visitor === 'string' && known && isCount(r.count) ? [{ visitor: r.visitor, kind: r.kind as FriendRequest['kind'], target: r.target as string, count: r.count }] : [];
    }),
    lost: readLost(data.lost),
    duos: Object.fromEntries(Object.entries(asRecord(data.duos)).filter(([, stars]) => isCount(stars) && stars <= 3)) as Record<string, number>,
    snackVisit: typeof data.snackVisit === 'number' ? data.snackVisit : 0,
    gifts: asArray(data.gifts).flatMap((value) => {
      const gift = asRecord(value);
      if (typeof gift.from !== 'string' || !isCount(gift.coins)) return [];
      return [{
        from: gift.from,
        coins: gift.coins,
        ...(isOneOf(gift.ingredient, INGREDIENT_IDS) ? { ingredient: gift.ingredient } : {}),
        ...(isOneOf(gift.seed, PLANT_IDS) ? { seed: gift.seed } : {}),
      }];
    }),
  };
}

function readLost(value: unknown): LostItem | null {
  const lost = asRecord(value);
  return typeof lost.visitor === 'string' && isOneOf(lost.room, ROOM_IDS) && isCount(lost.spot) && lost.spot < SPOTS_PER_ROOM
    ? { visitor: lost.visitor, room: lost.room, spot: lost.spot }
    : null;
}

function readOrder(value: unknown): Order | null {
  const order = asRecord(value);
  return typeof order.visitor === 'string' && CHARACTERS.some((c) => c.id === order.visitor) && isOneOf(order.dish, DISH_IDS)
    ? { visitor: order.visitor, dish: order.dish }
    : null;
}

export function saveHouse(save: HouseSave): void {
  writeGame(GAME_ID, save);
}

function counts<T extends string>(value: unknown, ids: readonly T[]): Partial<Record<T, number>> {
  const result: Partial<Record<T, number>> = {};
  for (const [id, count] of Object.entries(asRecord(value))) if (isOneOf(id, ids) && isCount(count) && count > 0) result[id] = count;
  return result;
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
