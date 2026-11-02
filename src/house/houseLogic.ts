import { findItem } from '../companion/catalog';
import { loadCompanion, saveCompanion } from '../companion/companionSave';
import { CASINO_TEST_BUTTONS } from '../games/casino/fx/testMode'; // TEST-BUTTONS
import {
  BASE_VISITORS,
  CHAPTER_STARS,
  CHARACTERS,
  DISHES,
  FAVOURITE_STARS,
  KITCHEN_LEVELS,
  MAX_PLOTS,
  MEAL_STARS,
  ORDER_CHANCE,
  ORDER_STARS,
  PLOT_PRICES,
  RARE_GIFT_AMOUNT,
  RARE_GIFT_CHANCE,
  RARE_SEED_CHANCE,
  PLANTS,
  currentSeason,
  STAPLES,
  STAPLE_PACK,
  ingredient,
  ROOMS,
  TABLE_PLATES,
  VISIT_MINUTES,
  WATERING_SHARE,
  furniture,
  plant,
  type Character,
  type DishId,
  type Dish,
  type FurnitureId,
  type IngredientId,
  type PlantId,
  type PoseId,
  type RoomId,
  type StapleId,
} from './houseData';
import { emptyPlacement, type HouseSave } from './houseSave';

/** One game minute. TEST-BUTTONS: a second, so growing and cooking can be checked quickly. */
export const MINUTE_MS = CASINO_TEST_BUTTONS ? 1000 : 60_000;

// -----------------------------------------------
// COINS (the companion's purse)
// -----------------------------------------------

export function coins(): number {
  return loadCompanion().coins;
}

/** Takes coins from the companion's purse; false (and nothing taken) when they are missing. */
export function spend(amount: number): boolean {
  const companion = loadCompanion();
  if (companion.coins < amount) return false;
  companion.coins -= amount;
  saveCompanion(companion);
  return true;
}

// -----------------------------------------------
// ROOMS AND FURNITURE
// -----------------------------------------------

export function openRoom(save: HouseSave, room: RoomId): boolean {
  const price = ROOMS.find((r) => r.id === room)!.price;
  if (save.rooms.includes(room) || !spend(price)) return false;
  save.rooms.push(room);
  save.placed[room] = emptyPlacement(room);
  return true;
}

export function buyFurniture(save: HouseSave, id: FurnitureId): boolean {
  if (save.owned.includes(id) || !spend(furniture(id).price)) return false;
  save.owned.push(id);
  return true;
}

/** Puts a piece on a spot of its room; a piece stands on one spot at most. */
export function place(save: HouseSave, room: RoomId, spot: number, id: FurnitureId | null): void {
  const spots = save.placed[room];
  if (id !== null) {
    const other = spots.indexOf(id);
    if (other !== -1) spots[other] = null;
  }
  spots[spot] = id;
}

/** Poses the placed furniture allows, with the room each one happens in. */
export function availablePoses(save: HouseSave): Map<PoseId, { room: RoomId; spot: number }> {
  const poses = new Map<PoseId, { room: RoomId; spot: number }>();
  for (const room of save.rooms) {
    save.placed[room].forEach((id, spot) => {
      if (id) poses.set(furniture(id).pose, { room, spot });
    });
  }
  return poses;
}

// -----------------------------------------------
// GARDEN
// -----------------------------------------------

export function plotPrice(save: HouseSave): number | null {
  return save.plots.length >= MAX_PLOTS ? null : PLOT_PRICES[save.plots.length - (MAX_PLOTS - PLOT_PRICES.length)];
}

export function buyPlot(save: HouseSave): boolean {
  const price = plotPrice(save);
  if (price === null || !spend(price)) return false;
  save.plots.push(null);
  return true;
}

export type SowRefusal = 'season' | 'seed' | 'coins';

/** Why this plant cannot be sown now, or null when it can (coins aside for the seed price). */
export function sowBlock(save: HouseSave, id: PlantId, now: number): 'season' | 'seed' | null {
  const info = plant(id);
  if (info.rare) return (save.seeds[id] ?? 0) > 0 ? null : 'seed';
  if (info.seasons && !info.seasons.includes(currentSeason(new Date(now))) && !save.rooms.includes('greenhouse')) return 'season';
  return null;
}

export function sow(save: HouseSave, index: number, id: PlantId, now: number): SowRefusal | null {
  if (save.plots[index] !== null) return 'coins';
  const block = sowBlock(save, id, now);
  if (block) return block;
  if (plant(id).rare) save.seeds[id]! -= 1;
  else if (!spend(plant(id).price)) return 'coins';
  save.plots[index] = { plant: id, readyAt: now + plant(id).growMinutes * MINUTE_MS, watered: false };
  return null;
}

export function water(save: HouseSave, index: number, now: number): boolean {
  const plot = save.plots[index];
  if (!plot || plot.watered || plot.readyAt <= now) return false;
  plot.watered = true;
  plot.readyAt = now + (plot.readyAt - now) * (1 - WATERING_SHARE);
  return true;
}

/** Ingredients picked, or 0 when the plot is empty or not ripe. */
export function harvest(save: HouseSave, index: number, now: number): number {
  const plot = save.plots[index];
  if (!plot || plot.readyAt > now) return 0;
  const picked = plant(plot.plant).harvest;
  save.pantry[plot.plant] = (save.pantry[plot.plant] ?? 0) + picked;
  save.plots[index] = null;
  return picked;
}

// -----------------------------------------------
// KITCHEN
// -----------------------------------------------

export type CookResult =
  | { ok: true; dish: DishId; discovered: boolean }
  | { ok: false; reason: 'nothing' | 'level' | 'missing' | 'busy' };

/** The recipe these ingredients make, whatever the kitchen level. */
export function recipeFor(ingredients: IngredientId[]): Dish | undefined {
  const key = [...ingredients].sort().join('+');
  return DISHES.find((dish) => [...dish.ingredients].sort().join('+') === key);
}

/** Starts cooking. Nothing is used up unless a dish actually starts. */
export function cook(save: HouseSave, ingredients: IngredientId[], now: number): CookResult {
  const recipe = recipeFor(ingredients);
  if (!recipe) return { ok: false, reason: 'nothing' };
  if (recipe.level > save.kitchenLevel + 1) return { ok: false, reason: 'level' };
  if (save.cooking.length >= KITCHEN_LEVELS[save.kitchenLevel].burners) return { ok: false, reason: 'busy' };
  const needed = new Map<IngredientId, number>();
  for (const id of ingredients) needed.set(id, (needed.get(id) ?? 0) + 1);
  for (const [id, count] of needed) if ((save.pantry[id] ?? 0) < count) return { ok: false, reason: 'missing' };
  for (const [id, count] of needed) save.pantry[id] = (save.pantry[id] ?? 0) - count;
  save.cooking.push({ dish: recipe.id, readyAt: now + recipe.cookMinutes * MINUTE_MS });
  const discovered = !save.known.includes(recipe.id);
  if (discovered) save.known.push(recipe.id);
  return { ok: true, dish: recipe.id, discovered };
}

/** Moves the finished dishes to the stock; returns how many. */
export function collectCooked(save: HouseSave, now: number): number {
  const done = save.cooking.filter((c) => c.readyAt <= now);
  for (const { dish } of done) save.dishes[dish] = (save.dishes[dish] ?? 0) + 1;
  save.cooking = save.cooking.filter((c) => c.readyAt > now);
  return done.length;
}

/** Grocery shelves open with the kitchen level. */
export function buyStaple(save: HouseSave, id: StapleId): boolean {
  const staple = STAPLES.find((s) => s.id === id)!;
  if (staple.level > save.kitchenLevel || !spend(staple.price)) return false;
  save.pantry[id] = (save.pantry[id] ?? 0) + STAPLE_PACK;
  return true;
}

/** Friendship a dish gives: a rare ingredient makes it exceptional, a grocery one makes it good. */
export function dishStars(dish: Dish): number {
  const kinds = dish.ingredients.map((id) => ingredient(id).kind);
  if (kinds.includes('rare')) return MEAL_STARS + 2;
  if (kinds.includes('grocery')) return MEAL_STARS + 1;
  return MEAL_STARS;
}

export function upgradeKitchen(save: HouseSave): boolean {
  const next = KITCHEN_LEVELS[save.kitchenLevel + 1];
  if (!next || !spend(next.price)) return false;
  save.kitchenLevel++;
  return true;
}

export type ServeResult = { eater: string; favourite: boolean; ordered: boolean; newChapter: number | null } | { eater: null };

/** Serves a dish: a visitor present eats it at once, its fan first; with nobody home it waits on the table. */
export function serve(save: HouseSave, id: DishId): ServeResult | null {
  if ((save.dishes[id] ?? 0) === 0) return null;
  const order = save.order && save.order.dish === id && save.visitors.includes(save.order.visitor) ? save.order : null;
  const fan = save.visitors.find((v) => character(v).favourite === id);
  const eater = order?.visitor ?? fan ?? save.visitors[Math.floor(Math.random() * save.visitors.length)];
  if (!eater && save.table.length >= TABLE_PLATES) return null;
  save.dishes[id]! -= 1;
  if (!eater) {
    save.table.push(id);
    return { eater: null };
  }
  const favourite = character(eater).favourite === id;
  if (order) save.order = null;
  const stars = (favourite ? FAVOURITE_STARS : dishStars(dishOf(id))) + (order ? ORDER_STARS : 0);
  const { newChapter } = befriend(save, eater, stars);
  return { eater, favourite, ordered: !!order, newChapter };
}

// -----------------------------------------------
// FRIENDSHIP
// -----------------------------------------------

export function chaptersUnlocked(stars: number): number {
  return CHAPTER_STARS.filter((needed) => stars >= needed).length;
}

/** Adds friendship; the last chapter's gift goes straight into the companion's wardrobe. */
export function befriend(save: HouseSave, id: string, stars: number): { newChapter: number | null } {
  const friend = save.friends[id];
  const before = chaptersUnlocked(friend.stars);
  friend.stars += stars;
  const after = chaptersUnlocked(friend.stars);
  if (after === CHAPTER_STARS.length && before < after) giveGift(character(id).gift);
  return { newChapter: after > before ? after : null };
}

function giveGift(itemId: string): void {
  if (!findItem(itemId)) return;
  const companion = loadCompanion();
  if (!companion.owned.includes(itemId)) companion.owned.push(itemId);
  saveCompanion(companion);
}

export function notePhoto(save: HouseSave, id: string, pose: PoseId, stars: number): { newChapter: number | null; bestPhoto: boolean } {
  const photos = save.friends[id].photos;
  const bestPhoto = stars > (photos[pose] ?? 0);
  if (bestPhoto) photos[pose] = stars;
  return { ...befriend(save, id, stars), bestPhoto };
}

// -----------------------------------------------
// VISITS
// -----------------------------------------------

export function character(id: string): Character {
  return CHARACTERS.find((c) => c.id === id)!;
}

/** Can come: their rooms are open and at least one of their poses is possible. */
export function canVisit(save: HouseSave, c: Character, poses = availablePoses(save)): boolean {
  if (c.season && c.season !== currentSeason()) return false;
  return c.needs.every((room) => save.rooms.includes(room)) && c.poses.some((pose) => poses.has(pose));
}

export function visitorCount(save: HouseSave): number {
  return BASE_VISITORS + save.rooms.length - ROOMS.filter((r) => r.price === 0).length;
}

/** What happened while the page was closed, in sentences. */
export interface VisitNews {
  left: string[];
  arrived: string[];
  meals: string[];
  chapters: string[];
  orders: string[];
}

const FIRST_VISITORS = ['noisette', 'biscotte'];

/** When the visit is over: visitors leave a gift, new ones come and eat what waits on the table. */
export function refreshVisits(save: HouseSave, now: number, random = Math.random): VisitNews | null {
  if (now < save.visitUntil) return null;
  const news: VisitNews = { left: [], arrived: [], meals: [], chapters: [], orders: [] };
  for (const id of save.visitors) {
    const rare = character(id).rare;
    const rareSeeds = PLANTS.filter((p) => p.rare);
    const roll = random();
    save.gifts.push(
      roll < RARE_SEED_CHANCE
        ? { from: id, coins: 0, seed: rareSeeds[Math.floor(random() * rareSeeds.length)].id }
        : rare && roll < RARE_SEED_CHANCE + RARE_GIFT_CHANCE
          ? { from: id, coins: 0, ingredient: rare }
          : { from: id, coins: 4 + 2 * chaptersUnlocked(save.friends[id].stars) },
    );
    news.left.push(character(id).name);
  }

  const poses = availablePoses(save);
  const pool = CHARACTERS.filter((c) => canVisit(save, c, poses));
  const chosen: Character[] = [];
  const room = visitorCount(save);
  const take = (c: Character) => {
    if (chosen.length < room && !chosen.includes(c)) chosen.push(c);
  };
  if (save.visitUntil === 0) for (const id of FIRST_VISITORS) take(character(id));

  // Plates on the table bring their fans first; the rest feed whoever comes.
  const plates = [...save.table];
  save.table = [];
  for (const plate of plates) {
    const fan = pool.find((c) => c.favourite === plate && !chosen.includes(c));
    if (fan && chosen.length < room) {
      take(fan);
      feast(save, fan, plate, true, news);
    } else save.table.push(plate);
  }
  const weighted = pool.filter((c) => !chosen.includes(c)).flatMap((c) => (save.friends[c.id].met ? [c] : [c, c]));
  while (chosen.length < room && weighted.length > 0) {
    const pick = weighted[Math.floor(random() * weighted.length)];
    take(pick);
    for (let i = weighted.length - 1; i >= 0; i--) if (weighted[i] === pick) weighted.splice(i, 1);
  }
  for (const plate of save.table.splice(0)) {
    const eater = chosen[Math.floor(random() * chosen.length)];
    if (eater) feast(save, eater, plate, false, news);
    else save.table.push(plate);
  }

  save.visitors = chosen.map((c) => c.id);
  save.order = null;
  if (chosen.length > 0 && save.known.length > 0 && random() < ORDER_CHANCE) {
    const visitor = chosen[Math.floor(random() * chosen.length)];
    const dish = save.known[Math.floor(random() * save.known.length)];
    save.order = { visitor: visitor.id, dish };
    news.orders.push(` aimerait goûter : ${dishOf(dish).name.toLowerCase()}`);
  }
  for (const c of chosen) {
    news.arrived.push(save.friends[c.id].met ? c.name : `${c.name} (nouveau visiteur !)`);
    save.friends[c.id].met = true;
  }
  // Real minutes even in TEST: the "next visit" button is the shortcut there.
  save.visitUntil = now + VISIT_MINUTES * 60_000;
  return news;
}

function feast(save: HouseSave, c: Character, plate: DishId, favourite: boolean, news: VisitNews): void {
  const name = dishOf(plate).name.toLowerCase();
  const { newChapter } = befriend(save, c.id, favourite ? FAVOURITE_STARS : dishStars(dishOf(plate)));
  news.meals.push(favourite ? `${c.name} a dévoré son plat préféré : ${name} !` : `${c.name} a goûté ton plat : ${name}.`);
  if (newChapter) news.chapters.push(`${c.name} : chapitre ${newChapter}`);
}

function dishOf(id: DishId): Dish {
  return DISHES.find((d) => d.id === id)!;
}

/** Takes every gift waiting in the house: coins go to the purse, rare ingredients to the pantry. */
export function openGifts(save: HouseSave): { coins: number; ingredients: IngredientId[]; seeds: PlantId[] } {
  const total = save.gifts.reduce((sum, gift) => sum + gift.coins, 0);
  const ingredients = save.gifts.flatMap((gift) => (gift.ingredient ? [gift.ingredient] : []));
  for (const id of ingredients) save.pantry[id] = (save.pantry[id] ?? 0) + RARE_GIFT_AMOUNT;
  const seeds = save.gifts.flatMap((gift) => (gift.seed ? [gift.seed] : []));
  for (const id of seeds) save.seeds[id] = (save.seeds[id] ?? 0) + 1;
  save.gifts = [];
  if (total > 0) {
    const companion = loadCompanion();
    companion.coins += total;
    companion.earned += total;
    saveCompanion(companion);
  }
  return { coins: total, ingredients, seeds };
}
