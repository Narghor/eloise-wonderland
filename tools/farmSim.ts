// -----------------------------------------------
// FARM SIM: how long the farm takes to play, per player profile
// -----------------------------------------------
// node tools/farm-sim.mjs [days] [seed]
// Options (environment): ALL_LEVELS=1, FARM_DETAIL=1 (sources, orders, machines, items asked), XP_TABLE="...",
// PROFILE="Reguliere (,Posee (", ALBUM=1 (plays on until the album is complete, first find of each treasure),
// ALBUM_LOT1 / PRIZE_WEIGHTS / RARITY_WEIGHTS (other parcel draws, see below), DEMAND_ONE_LEVEL=1 (the old demand).
// Model player of docs/ferme.md 8bis on the game's real content tables (src/games/farm/data) and order prices.
// The player is greedy but sensible: collects, serves orders, feeds, queues machines, plants for the next visit,
// buys buildings and fields as soon as they open, then clears land. One action round per game minute of a visit.
// "Coups de coeur" orders, charm (orders pay more, Gaston comes more often) and the treasures placed from the parcels
// count for every profile; the decorating profiles also set aside a share of what they earn for decorations.

import { mulberry32 } from '../src/random';
import { ANIMALS as DATA_ANIMALS, PEN_CAPACITY, animalPrice as dataAnimalPrice } from '../src/games/farm/data/animals';
import { CROPS as DATA_CROPS, STARTING_FIELDS, fieldPrice, maxFields } from '../src/games/farm/data/crops';
import { DAILY_TASKS, dailyChestReward, dailyTaskReward } from '../src/games/farm/data/daily';
import { item } from '../src/games/farm/data/items';
import { OBSTACLES as DATA_OBSTACLES, OBSTACLES_PER_PARCEL, PARCEL_STEPS, STARTING_OBSTACLES } from '../src/games/farm/data/land';
import { XP_TABLE as DATA_XP_TABLE, levelReward as dataLevelReward, orderSlots } from '../src/games/farm/data/levels';
import { FEEDS, RECIPES as DATA_RECIPES, queueSlotPrice } from '../src/games/farm/data/machines';
import { DECOR, COPY_LEVELS, PLACEABLES, TREE_YIELDS, copyLevel, placeable, type Placeable } from '../src/games/farm/data/placeables';
import { CHARM_STEPS, charmOf, charmStep, totalCharm } from '../src/games/farm/data/charm';
import { project } from '../src/games/farm/data/projects';
import type { BreedId, ItemId, PlaceableId, Rarity, TreeId, Unlock } from '../src/games/farm/data/types';
import {
  CART_BACK_MINUTES, CART_NUTS, CART_PARCEL_CHANCE, CART_SENT_AWAY_MINUTES, CART_XP, ORDER_NUTS, ORDER_XP, SPECIAL_CHANCE, SPECIAL_LEVEL,
} from '../src/games/farm/farmOrders';
import { BREEDS, MAILBOX_SIZE, PITY, PRIZES, RARITIES, TREASURES, breed, type Prize } from '../src/games/farm/data/parcels';
import { MERCHANT_SHARE as DATA_MERCHANT_SHARE } from '../src/games/farm/farmProduction';

const DAYS = Number(process.argv[2] ?? 90);
const SEED = Number(process.argv[3] ?? 7);
const MIN_PER_DAY = 1440;

// -----------------------------------------------
// CONTENT: read from the game's own data (src/games/farm/data), adapted to the shapes this model uses
// -----------------------------------------------

const levelOf = (u: Unlock) => ('level' in u ? u.level : 99);
const valueOf = (id: ItemId) => item(id).value;

interface Crop { id: string; level: number; minutes: number; seed: number; yield: number; value: number; xp: number }

const CROPS: Crop[] = DATA_CROPS.map((c) => ({ id: c.id, level: levelOf(c.unlock), minutes: c.minutes, seed: c.seed, yield: c.yield, value: valueOf(c.id), xp: c.xp }));

/** `capacity` is one pen's; `penLevels`: from which level the 1st, 2nd and 3rd pen may be built (copy n costs n times). */
interface Animal { id: string; level: number; pen: string; penPrice: number; capacity: number; penLevels: number[]; price: number; feed: string; minutes: number; product: string; value: number; xp: number }

const ANIMALS: Animal[] = DATA_ANIMALS.map((a) => ({
  id: a.id, level: levelOf(a.unlock), pen: a.pen, penPrice: placeable(a.pen).price, capacity: PEN_CAPACITY[a.pen],
  penLevels: COPY_LEVELS.map((_, i) => copyLevel(placeable(a.pen), i + 1)!),
  price: a.price, feed: a.feed, minutes: a.minutes, product: a.product, value: valueOf(a.product), xp: a.xp,
}));

/** copyLevels: from which level the 1st, 2nd and 3rd copies may be built (each costs its rank times the price). */
interface Machine { id: string; level: number; price: number; copyLevels: number[] }

const MACHINES: Machine[] = PLACEABLES.filter((p) => p.kind === 'machine').map((p) => ({
  id: p.id, level: levelOf(p.unlock), price: p.price, copyLevels: COPY_LEVELS.map((_, i) => copyLevel(p, i + 1)!),
}));

interface Recipe { id: string; machine: string; level: number; minutes: number; inputs: Record<string, number>; count: number; value: number; xp: number; feed?: boolean }

const RECIPES: Recipe[] = DATA_RECIPES.map((r) => ({
  id: r.item, machine: r.machine, level: levelOf(r.unlock), minutes: r.minutes, inputs: r.inputs as Record<string, number>,
  count: r.count, value: valueOf(r.item), xp: r.xp, feed: FEEDS.includes(r.item),
}));
const RECIPE_OF = new Map(RECIPES.map((r) => [r.id, r]));
/** DEMAND_ONE_LEVEL=1: the old demand, inputs prepared one level deep only (to compare). */
const DEMAND_ONE_LEVEL = !!process.env.DEMAND_ONE_LEVEL;

const hazel = placeable('hazel');
const DATA_HAZEL = TREE_YIELDS.hazel;
const HAZEL_NUTS = 'nuts' in DATA_HAZEL.gives ? DATA_HAZEL.gives.nuts : ([0, 0] as const);
const HAZEL = { level: levelOf(hazel.unlock), price: hazel.price, max: hazel.maxCount ?? 1, minutes: DATA_HAZEL.minutes, coins: HAZEL_NUTS, xp: DATA_HAZEL.xp };

/** Trees that give fruit (the apple and cherry trees of lot 2): bought like the hazel, picked on each visit. */
interface FruitTree { id: string; level: number; price: number; max: number; minutes: number; item: string; count: number; xp: number }
const FRUIT_TREES: FruitTree[] = Object.entries(TREE_YIELDS).flatMap(([id, y]) => {
  if (!('item' in y.gives)) return [];
  const p = placeable(id as TreeId);
  return [{ id, level: levelOf(p.unlock), price: p.price, max: p.maxCount ?? 1, minutes: y.minutes, item: y.gives.item, count: y.gives.count, xp: y.xp }];
});

const SLOT_PRICES = [3, 4, 5, 6].map((slot) => queueSlotPrice(slot - 1) ?? Infinity); // queue slots 3 to 6
const MERCHANT_SHARE = DATA_MERCHANT_SHARE;
const animalPrice = (a: Animal, owned: number) => dataAnimalPrice(DATA_ANIMALS.find((x) => x.id === a.id)!, owned);
const ORDER_COINS = ORDER_NUTS;
const CART_LEVEL = levelOf(placeable('marketCart').unlock);

// Gaston's parcels and the album, with three knobs to try other draws without touching the game:
// ALBUM_LOT1=1 leaves out the rare animals of lot 2 (the album as it was before them);
// PRIZE_WEIGHTS="queenBee:0.5,blackSheep:0.6" weighs prizes within their rarity (1 by default, uniform as in the game);
// RARITY_WEIGHTS="62,28,8.5,1.5" replaces the weights of common, rare, epic, legendary.
const LOT1_ANIMALS = ['chicken', 'cow'];
const keepPrize = (p: Prize) => !process.env.ALBUM_LOT1 || p.kind !== 'breed' || LOT1_ANIMALS.includes(breed(p.breed).animal);
const SIM_PRIZES = Object.fromEntries(Object.entries(PRIZES).map(([r, list]) => [r, list.filter(keepPrize)])) as Record<Rarity, Prize[]>;
const SIM_TREASURES = TREASURES.filter((t) => SIM_PRIZES[t.rarity].some((p) => (p.kind === 'decor' ? p.decor : p.kind === 'breed' ? p.breed : '') === t.id));
const RARITY_WEIGHTS = process.env.RARITY_WEIGHTS?.split(',').map(Number);
const SIM_RARITIES = RARITIES.map((r, i) => ({ id: r.id, weight: RARITY_WEIGHTS?.[i] ?? r.weight }));
const PRIZE_WEIGHTS: Record<string, number> = Object.fromEntries((process.env.PRIZE_WEIGHTS ?? '').split(',').filter(Boolean).map((x) => [x.split(':')[0], Number(x.split(':')[1])]));
const prizeWeight = (p: Prize) => PRIZE_WEIGHTS[p.kind === 'decor' ? p.decor : p.kind === 'breed' ? p.breed : ''] ?? 1;
const BREED_LEVEL = Object.fromEntries(BREEDS.map((b) => [b.id, levelOf(DATA_ANIMALS.find((a) => a.id === b.animal)!.unlock)])) as Record<BreedId, number>;

interface Obstacle { cost: number; xp: number; weight: number }
const OBSTACLE_KINDS: Obstacle[] = DATA_OBSTACLES.map((o) => ({ cost: o.cost, xp: o.xp, weight: o.weight }));
/** Buyable parcels of lot 1 (the river bank opens with the bridge, not counted here). */
const PARCELS = PARCEL_STEPS;

const bridge = project('bridge');
const BRIDGE = {
  level: levelOf(bridge.unlock),
  stages: bridge.stages.map((s) => ({ items: s.items as Record<string, number>, coins: s.nuts, xp: s.xp })),
};

/**
 * XP to go from level L to L+1 (index L - 1), the game's own table.
 * XP_TABLE="15,30,..." on the command line tries another one.
 */
const XP_TABLE = process.env.XP_TABLE ? process.env.XP_TABLE.split(',').map(Number) : [...DATA_XP_TABLE];
const XP_TO_NEXT = (level: number) => XP_TABLE[level - 1];
const MAX_LEVEL = XP_TABLE.length + 1;
const levelReward = (level: number) => {
  const r = dataLevelReward(level);
  return { coins: r.nuts ?? 0, fertilizer: r.boosters?.fertilizer ?? 0, hourglass: r.boosters?.hourglass ?? 0 };
};
const DAILY = {
  tasks: DAILY_TASKS,
  coins: (l: number) => dailyTaskReward(l).nuts ?? 0,
  xp: (l: number) => dailyTaskReward(l).xp ?? 0,
  chestCoins: (l: number) => dailyChestReward(l).nuts ?? 0,
  chestHourglass: dailyChestReward(1).boosters?.hourglass ?? 0,
};

// -----------------------------------------------
// PLAYER PROFILES
// -----------------------------------------------

interface BoosterRule {
  /** Boosters bought in the shop per day (Infinity = no daily cap). */
  shop: { fertilizer: number; wateringCan: number; hourglass: number };
  /** Boosters won in the site's other games per day. */
  fromGames: number;
}

/**
 * A decorating player: `share` of every Eloisette earned goes to decorations. 'mix' buys every decoration in turn,
 * as one who decorates for the look; 'cheap' buys the most charm per Eloisette (fences, paths), as one who aims at
 * the charm steps.
 */
interface DecorRule { share: number; style: 'mix' | 'cheap' }

interface Profile { name: string; visits: [number, number][]; boosters: BoosterRule | null; decor?: DecorRule }

const hm = (h: number, m = 0) => h * 60 + m;
const every = (from: number, to: number, step: number, length: number): [number, number][] => {
  const list: [number, number][] = [];
  for (let t = from; t <= to; t += step) list.push([t, length]);
  return list;
};
const CAPPED: BoosterRule = { shop: { fertilizer: 5, wateringCan: 1, hourglass: 3 }, fromGames: 2 };
const UNLIMITED: BoosterRule = { shop: { fertilizer: Infinity, wateringCan: Infinity, hourglass: Infinity }, fromGames: 0 };

const POSEE: [number, number][] = [[hm(8), 10], [hm(20), 15]];
const REGULIERE: [number, number][] = [[hm(7, 30), 10], [hm(12, 30), 10], [hm(18), 15], [hm(22), 10]];

const PROFILES: Profile[] = [
  { name: 'Posee (2 x 10-15 min)', visits: POSEE, boosters: null },
  { name: 'Posee decoratrice 30 % (melange)', visits: POSEE, boosters: null, decor: { share: 0.3, style: 'mix' } },
  { name: 'Reguliere (4 x 10-15 min)', visits: REGULIERE, boosters: null },
  { name: 'Reguliere deco 15 % (melange)', visits: REGULIERE, boosters: null, decor: { share: 0.15, style: 'mix' } },
  { name: 'Reguliere deco 30 % (melange)', visits: REGULIERE, boosters: null, decor: { share: 0.3, style: 'mix' } },
  { name: 'Reguliere deco 50 % (melange)', visits: REGULIERE, boosters: null, decor: { share: 0.5, style: 'mix' } },
  { name: 'Reguliere deco 15 % (chemins)', visits: REGULIERE, boosters: null, decor: { share: 0.15, style: 'cheap' } },
  { name: 'Accro (11 x 15 min)', visits: every(hm(8), hm(23), 90, 15), boosters: null },
  { name: 'Accro + boosters plafonnes', visits: every(hm(8), hm(23), 90, 15), boosters: CAPPED },
  { name: 'Accro + boosters SANS plafond', visits: every(hm(8), hm(23), 90, 15), boosters: UNLIMITED },
];

// -----------------------------------------------
// STATE
// -----------------------------------------------

interface Field { crop: Crop | null; readyAt: number }
interface Job { recipe: Recipe; readyAt: number }
interface Order { items: Record<string, number>; value: number; since: number; special: boolean }

class Farm {
  coins = 50;
  xp = 0;
  level = 1;
  stock: Record<string, number> = {};
  fields: Field[] = Array.from({ length: STARTING_FIELDS }, () => ({ crop: null, readyAt: 0 }));
  fieldsBought = 0;
  /** Every machine on the farm, copies included: key 	ype#n. */
  machines = new Map<string, { type: string; slots: number; queue: Job[] }>();
  pens = new Map<string, number[]>(); // animal id -> per animal of all its pens: readyAt, -1 hungry
  /** Pens of each kind on the farm (1 to 3). */
  penCount = new Map<string, number>();

  /** Animals all the pens of this kind hold. */
  room(a: Animal): number {
    return a.capacity * (this.penCount.get(a.id) ?? 1);
  }
  hazels: number[] = [];
  fruitTrees: { tree: FruitTree; readyAt: number }[] = [];
  /** The market cart's order, and when it comes back once served or sent away. */
  cart: { items: Record<string, number>; value: number; since: number; parcel: boolean } | null = null;
  cartNextAt = 0;
  orders: Order[] = [];
  nextOrderAt: number[] = [];
  obstacles: Obstacle[] = [];
  parcelsBought = 0;
  bridgeStage = 0;
  bridgePaid: Record<string, number> = {};
  boosters = { fertilizer: 0, wateringCan: 0, hourglass: 0 };
  used = { fertilizer: 0, wateringCan: 0, hourglass: 0 };
  levelAt: number[] = [0, 0];
  bridgeDoneAt = -1;
  /** Gaston's parcels: waiting in the mailbox, next round, plain ones in a row. */
  mail = { waiting: 1, nextAt: charmStep(0).step.parcelMinutes, sinceRare: 0, opened: 0 };
  /** Charm of the decorations on the map (bought ones and placed treasures), and the tiles they take. */
  charm = 0;
  decorTiles = 0;
  /** Eloisettes set aside for decorations, and spent on them. */
  decorBudget = 0;
  decorSpent = 0;
  decorBought = 0;
  decorTurn = 0;
  decor: DecorRule | null = null;

  /** Gaston's round, shorter on a charming farm. */
  parcelEvery(): number {
    return charmStep(this.charm).step.parcelMinutes;
  }

  /** When each charm step was first reached (index of CHARM_STEPS). */
  charmAt: number[] = [0];
  /** Every decoration placed, for the game's own charm rule (a treasure counts once). */
  placed: PlaceableId[] = [];

  placeDecor(p: Placeable, now: number): void {
    this.placed.push(p.id);
    this.charm = totalCharm(this.placed);
    this.decorTiles += p.size[0] * p.size[1];
    CHARM_STEPS.forEach((step, i) => {
      if (this.charmAt[i] === undefined && this.charm >= step.min) this.charmAt[i] = now;
    });
  }

  /** Land owned, in tiles (the river bank left out). */
  ownedTiles(): number {
    return 144 + 36 * this.parcelsBought;
  }

  /** Tiles taken by decorations may not pass this share of the land: the farm itself needs room. */
  decorRoom(): number {
    return 0.4 * this.ownedTiles() - this.decorTiles;
  }

  /** The decorating player spends her decoration budget: every decoration in turn, or the most charm per Eloisette. */
  buyDecor(now: number): void {
    if (!this.decor) return;
    const open = DECOR.filter((d) => levelOf(d.unlock) <= this.level);
    const cheapest = [...open].sort((a, b) => charmOf(b.id) / b.price - charmOf(a.id) / a.price || a.price - b.price)[0];
    for (;;) {
      const pick = this.decor.style === 'cheap' ? cheapest : open[this.decorTurn % open.length];
      const tiles = pick.size[0] * pick.size[1];
      if (this.decorBudget < pick.price || this.decorRoom() < tiles) return;
      this.decorBudget -= pick.price;
      this.decorSpent += pick.price;
      this.decorBought++;
      this.decorTurn++;
      this.placeDecor(pick, now);
    }
  }

  /** Collects Gaston's rounds and opens every parcel, as a player would on each visit. */
  openMail(now: number): void {
    while (now >= this.mail.nextAt) {
      if (this.mail.waiting >= MAILBOX_SIZE) {
        this.mail.nextAt = now + this.parcelEvery();
        break;
      }
      this.mail.waiting++;
      this.mail.nextAt += this.parcelEvery();
    }
    for (; this.mail.waiting > 0; this.mail.waiting--) {
      this.mail.opened++;
      const pool = this.mail.sinceRare >= PITY - 1 ? SIM_RARITIES.filter((x) => x.id !== 'common') : SIM_RARITIES;
      let roll = this.random() * pool.reduce((sum, x) => sum + x.weight, 0);
      const rarity = (pool.find((x) => (roll -= x.weight) < 0) ?? pool[0]).id;
      this.mail.sinceRare = rarity === 'common' ? this.mail.sinceRare + 1 : 0;
      // As the game's farmParcels.isPrizeOpen: a rare animal only comes once its kind is unlocked.
      const prizes = SIM_PRIZES[rarity].filter((p) => p.kind !== 'breed' || this.level >= BREED_LEVEL[p.breed]);
      let pick = this.random() * prizes.reduce((sum, p) => sum + prizeWeight(p), 0);
      const prize = prizes.find((p) => (pick -= prizeWeight(p)) < 0) ?? prizes[prizes.length - 1];
      if (prize.kind === 'nuts') this.earn(prize.base + prize.perLevel * this.level, 'colis');
      if (prize.kind === 'boosters') {
        this.boosters.fertilizer += prize.boosters.fertilizer ?? 0;
        this.boosters.wateringCan += prize.boosters.wateringCan ?? 0;
        this.boosters.hourglass += prize.boosters.hourglass ?? 0;
      }
      // A treasure decoration is placed at once (it is free): its charm counts.
      if (prize.kind === 'decor') this.placeDecor(placeable(prize.decor), now);
      // A rare animal joins its pen when there is room, else it waits for the next free place (buy).
      if (prize.kind === 'breed') this.waitingBreeds.push(prize.breed);
      if (prize.kind === 'decor' || prize.kind === 'breed') {
        const id = prize.kind === 'decor' ? prize.decor : prize.breed;
        if (this.album[id] === undefined) this.album[id] = now;
      }
    }
    this.placeBreeds();
  }

  /** Each treasure (decoration or rare animal) of the album: when it was first found. */
  album: Record<string, number> = {};
  waitingBreeds: BreedId[] = [];
  /** Per animal kind, per animal: the chance that a collect gives one product more (0 for a plain animal). */
  penBonus = new Map<string, number[]>();

  /** Puts the waiting rare animals in their pens while there is room, as the game's welcomeBreed. */
  placeBreeds(): void {
    this.waitingBreeds = this.waitingBreeds.filter((id) => {
      const b = breed(id);
      const a = ANIMALS.find((x) => x.id === b.animal)!;
      const pen = this.pens.get(a.id);
      if (!pen || pen.length >= this.room(a)) return true;
      pen.push(-1);
      this.bonusOf(a.id).push(b.bonusChance);
      return false;
    });
  }

  bonusOf(animal: string): number[] {
    if (!this.penBonus.has(animal)) this.penBonus.set(animal, []);
    return this.penBonus.get(animal)!;
  }
  playMinutes = 0;
  /** Eloisettes in hand when each level was reached, and when the measure stops (last level or last day). */
  coinsAt: number[] = [];
  endAt = 0;
  /** FARM_DETAIL: how many times each event happened before the last level, and the minutes it took in all. */
  stats = {
    count: {} as Record<string, number>,
    minutes: {} as Record<string, number>,
    farm: this,
    note(key: string, minutes: number): void {
      if (this.farm.level >= MAX_LEVEL) return;
      this.count[key] = (this.count[key] ?? 0) + 1;
      this.minutes[key] = (this.minutes[key] ?? 0) + minutes;
    },
  };
  readonly random: () => number;

  constructor(seed: number) {
    this.random = mulberry32(seed);
    for (let i = 0; i < STARTING_OBSTACLES; i++) this.obstacles.push(this.rollObstacle());
  }

  rollObstacle(): Obstacle {
    let roll = this.random() * OBSTACLE_KINDS.reduce((s, o) => s + o.weight, 0);
    return OBSTACLE_KINDS.find((o) => (roll -= o.weight) < 0) ?? OBSTACLE_KINDS[0];
  }

  has(item: string): number {
    return this.stock[item] ?? 0;
  }
  add(item: string, count: number): void {
    this.stock[item] = this.has(item) + count;
  }
  canPay(inputs: Record<string, number>): boolean {
    return Object.entries(inputs).every(([id, n]) => this.has(id) >= n);
  }
  pay(inputs: Record<string, number>): void {
    for (const [id, n] of Object.entries(inputs)) this.stock[id] -= n;
  }

  xpFrom: Record<string, number> = {};
  coinsFrom: Record<string, number> = {};
  /** Books what one source gave, until the last level (what comes after does not pace the game). */
  note(book: Record<string, number>, source: string, n: number): void {
    if (this.level < MAX_LEVEL) book[source] = (book[source] ?? 0) + n;
  }

  earn(coins: number, source: string): void {
    const kept = this.decor ? coins * this.decor.share : 0;
    this.decorBudget += kept;
    this.coins += coins - kept;
    this.note(this.coinsFrom, source, coins);
  }

  gainXp(xp: number, now: number, source: string): void {
    this.note(this.xpFrom, source, xp);
    this.xp += xp;
    while (this.level < MAX_LEVEL && this.xp >= XP_TO_NEXT(this.level)) {
      this.xp -= XP_TO_NEXT(this.level);
      this.level++;
      this.levelAt[this.level] = now;
      this.coinsAt[this.level] = this.coins;
      const reward = levelReward(this.level);
      this.earn(reward.coins, 'niveaux');
      this.boosters.fertilizer += reward.fertilizer;
      this.boosters.hourglass += reward.hourglass;
      this.mail.waiting += dataLevelReward(this.level).parcels ?? 0;
    }
  }

  // -----------------------------------------------
  // WHAT IS UNLOCKED, WHAT IS WANTED
  // -----------------------------------------------

  crops(): Crop[] {
    return CROPS.filter((c) => c.level <= this.level);
  }
  recipes(): Recipe[] {
    return RECIPES.filter((r) => r.level <= this.level && this.machines.has(`${r.machine}#1`));
  }
  animalCount(id: string): number {
    return this.pens.get(id)?.length ?? 0;
  }

  /** Items the player is short of right now: orders, the bridge stage, feed, one batch of each recipe. */
  demand(): Map<string, number> {
    const want = new Map<string, number>();
    const need = (id: string, n: number) => want.set(id, (want.get(id) ?? 0) + n);
    for (const order of this.orders) for (const [id, n] of Object.entries(order.items)) need(id, n);
    if (this.cart) for (const [id, n] of Object.entries(this.cart.items)) need(id, n);
    const stage = BRIDGE.stages[this.bridgeStage];
    if (stage && this.level >= BRIDGE.level) for (const [id, n] of Object.entries(stage.items)) need(id, n - (this.bridgePaid[id] ?? 0));
    for (const a of ANIMALS) {
      const count = this.animalCount(a.id);
      if (count > 0) need(a.feed, count * 2);
    }
    for (const r of this.recipes()) if (!r.feed && this.has(r.id) < 2) for (const [id, n] of Object.entries(r.inputs)) need(id, n);
    if (DEMAND_ONE_LEVEL) {
      for (const [id, n] of [...want]) {
        const r = RECIPES.find((x) => x.id === id && x.level <= this.level && this.machines.has(`${x.machine}#1`));
        if (r && this.has(id) < n) for (const [input, k] of Object.entries(r.inputs)) need(input, Math.ceil((n - this.has(id)) / r.count) * k);
      }
    } else {
      // The whole chain of whatever is short (beet -> sugar -> jam -> layer cake): inputs, then their own inputs, for
      // the part that is neither in the barn nor already on its way. Each item in the barn is promised only once.
      const coming = this.coming();
      const left = new Map<string, number>();
      const free = (id: string) => left.get(id) ?? this.has(id) + (coming.get(id) ?? 0);
      const prepare = (id: string, n: number, chain: Set<string>) => {
        const covered = Math.min(free(id), n);
        left.set(id, free(id) - covered);
        const r = this.recipeOf(id);
        if (!r || covered >= n || chain.has(id)) return;
        const batches = Math.ceil((n - covered) / r.count);
        chain.add(id);
        for (const [input, k] of Object.entries(r.inputs)) {
          need(input, batches * k);
          prepare(input, batches * k, chain);
        }
        chain.delete(id);
      };
      for (const [id, n] of [...want]) prepare(id, n, new Set());
    }
    for (const [id, n] of [...want]) want.set(id, n - this.has(id));
    return want;
  }

  /** The recipe that makes this item, if it is open and its machine is on the farm. */
  recipeOf(id: string): Recipe | undefined {
    const r = RECIPE_OF.get(id);
    return r && r.level <= this.level && this.machines.has(`${r.machine}#1`) ? r : undefined;
  }

  /** What is already on its way: queued in a machine, growing in a field, eaten by a fed animal. */
  coming(): Map<string, number> {
    const list = new Map<string, number>();
    const add = (id: string, n: number) => list.set(id, (list.get(id) ?? 0) + n);
    for (const f of this.fields) if (f.crop) add(f.crop.id, f.crop.yield);
    for (const m of this.machines.values()) for (const j of m.queue) add(j.recipe.id, j.recipe.count);
    for (const a of ANIMALS) for (const readyAt of this.pens.get(a.id) ?? []) if (readyAt >= 0) add(a.product, 1);
    return list;
  }

  // -----------------------------------------------
  // ORDERS
  // -----------------------------------------------

  orderable(): { id: string; value: number }[] {
    const list = this.crops().map((c) => ({ id: c.id, value: c.value }));
    for (const r of this.recipes()) if (!r.feed) list.push({ id: r.id, value: r.value });
    for (const a of ANIMALS) if (this.animalCount(a.id) > 0) list.push({ id: a.product, value: a.value });
    // Fruit from the trees owned, like the game's orderable().
    for (const t of FRUIT_TREES) if (this.fruitTrees.some((f) => f.tree === t)) list.push({ id: t.item, value: valueOf(t.item as ItemId) });
    return list;
  }

  rollOrder(now: number): Order {
    const pool = this.orderable();
    const n = Math.min(pool.length, 1 + (this.random() < 0.5 ? 1 : 0) + (this.level >= 5 && this.random() < 0.25 ? 1 : 0));
    const target = (12 + 10 * this.level) * (0.7 + 0.6 * this.random());
    const items: Record<string, number> = {};
    let value = 0;
    const picked = new Set<number>();
    while (picked.size < n) picked.add(Math.floor(this.random() * pool.length));
    for (const i of picked) {
      const { id, value: v } = pool[i];
      const qty = Math.max(1, Math.min(12, Math.round(target / n / v)));
      items[id] = qty;
      this.stats.note(`asked ${id}`, 0);
      value += qty * v;
    }
    const special = this.level >= SPECIAL_LEVEL && this.random() < SPECIAL_CHANCE;
    return { items, value, since: now, special };
  }

  refillOrders(now: number): void {
    while (this.orders.length + this.nextOrderAt.length < orderSlots(this.level)) this.nextOrderAt.push(now);
    const due = this.nextOrderAt.filter((t) => t <= now);
    this.nextOrderAt = this.nextOrderAt.filter((t) => t > now);
    for (let i = 0; i < due.length; i++) this.orders.push(this.rollOrder(now));
  }

  /** The market cart: rolled like the game's (3 kinds, 6 to 9 items), served as soon as the barn holds it, sent away after a day. */
  serveCart(now: number): void {
    if (this.level < CART_LEVEL) return;
    if (!this.cart && now >= this.cartNextAt) {
      const pool = this.orderable();
      const kinds = Math.min(3, pool.length);
      const picked = new Set<number>();
      while (picked.size < kinds) picked.add(Math.floor(this.random() * pool.length));
      const total = 6 + Math.floor(this.random() * 4);
      const items: Record<string, number> = {};
      let value = 0;
      [...picked].forEach((i, k) => {
        const qty = Math.floor(total / kinds) + (k < total % kinds ? 1 : 0);
        items[pool[i].id] = qty;
        this.stats.note(`asked ${pool[i].id}`, 0);
        value += qty * pool[i].value;
      });
      this.cart = { items, value, since: now, parcel: this.random() < CART_PARCEL_CHANCE };
    }
    if (!this.cart) return;
    if (this.canPay(this.cart.items)) {
      this.pay(this.cart.items);
      const bonus = 1 + charmStep(this.charm).step.orderBonusPercent / 100;
      this.earn(Math.round(this.cart.value * CART_NUTS * bonus), 'charrette');
      this.gainXp(Math.max(1, Math.round(this.cart.value * CART_XP)), now, 'charrette');
      if (this.cart.parcel) this.mail.waiting++;
      this.stats.note('cart served', now - this.cart.since);
      this.cart = null;
      this.cartNextAt = now + CART_BACK_MINUTES;
    } else if (now - this.cart.since > MIN_PER_DAY) {
      this.stats.note('cart sent away', MIN_PER_DAY);
      this.cart = null;
      this.cartNextAt = now + CART_SENT_AWAY_MINUTES;
    }
  }
  // -----------------------------------------------
  // ONE ACTION ROUND (one game minute of a visit)
  // -----------------------------------------------

  act(now: number, visitEnd: number, nextVisit: number, rule: BoosterRule | null): void {
    this.collect(now);
    this.refillOrders(now);
    this.serveOrders(now);
    this.serveCart(now);
    this.feedBridge(now);
    this.buy(now);
    this.feedAnimals(now);
    this.queueMachines(now);
    this.plant(now, visitEnd, nextVisit);
    if (rule) this.useBoosters(now);
    this.sellSurplus();
    this.buyDecor(now);
  }

  collect(now: number): void {
    for (const f of this.fields) {
      if (f.crop && f.readyAt <= now) {
        this.add(f.crop.id, f.crop.yield);
        this.gainXp(f.crop.xp, now, 'champs');
        f.crop = null;
      }
    }
    for (const machine of this.machines.values()) {
      while (machine.queue.length && machine.queue[0].readyAt <= now) {
        const job = machine.queue.shift()!;
        this.add(job.recipe.id, job.recipe.count);
        this.gainXp(job.recipe.xp, now, 'machines');
      }
    }
    for (const a of ANIMALS) {
      const pen = this.pens.get(a.id);
      if (!pen) continue;
      const bonus = this.bonusOf(a.id);
      pen.forEach((readyAt, i) => {
        if (readyAt >= 0 && readyAt <= now) {
          this.add(a.product, bonus[i] > 0 && this.random() < bonus[i] ? 2 : 1);
          this.gainXp(a.xp, now, 'animaux');
          pen[i] = -1;
        }
      });
    }
    this.hazels.forEach((readyAt, i) => {
      if (readyAt <= now) {
        this.earn(HAZEL.coins[0] + Math.floor(this.random() * (HAZEL.coins[1] - HAZEL.coins[0] + 1)), 'noisetiers');
        this.gainXp(HAZEL.xp, now, 'noisetiers');
        this.hazels[i] = now + HAZEL.minutes;
      }
    });
    for (const t of this.fruitTrees) {
      if (t.readyAt > now) continue;
      this.add(t.tree.item, t.tree.count);
      this.gainXp(t.tree.xp, now, 'arbres fruitiers');
      t.readyAt = now + t.tree.minutes;
    }
  }

  serveOrders(now: number): void {
    const ready = this.orders.filter((o) => this.canPay(o.items)).sort((a, b) => b.value - a.value);
    for (const order of ready) {
      if (!this.canPay(order.items)) continue;
      this.pay(order.items);
      const bonus = 1 + charmStep(this.charm).step.orderBonusPercent / 100;
      this.earn(Math.round(order.value * ORDER_COINS * bonus * (order.special ? 2 : 1)), order.special ? 'coups de coeur' : 'commandes');
      if (order.special) this.mail.waiting++;
      this.gainXp(Math.round(order.value * ORDER_XP), now, 'commandes');
      this.stats.note('order served', now - order.since);
      this.orders.splice(this.orders.indexOf(order), 1);
      this.nextOrderAt.push(now + 1);
    }
    // An order waiting for a whole day is refused: a new one comes 15 minutes later.
    for (const order of [...this.orders]) {
      if (now - order.since > MIN_PER_DAY) {
        this.stats.note('order refused', MIN_PER_DAY);
        for (const id of Object.keys(order.items)) this.stats.note(`refused for ${id}`, 0);
        this.orders.splice(this.orders.indexOf(order), 1);
        this.nextOrderAt.push(now + 15);
      }
    }
  }

  feedBridge(now: number): void {
    const stage = BRIDGE.stages[this.bridgeStage];
    if (!stage || this.level < BRIDGE.level) return;
    for (const [id, n] of Object.entries(stage.items)) {
      const give = Math.min(this.has(id), n - (this.bridgePaid[id] ?? 0));
      if (give > 0) {
        this.stock[id] -= give;
        this.bridgePaid[id] = (this.bridgePaid[id] ?? 0) + give;
      }
    }
    const itemsDone = Object.entries(stage.items).every(([id, n]) => (this.bridgePaid[id] ?? 0) >= n);
    if (itemsDone && this.coins >= stage.coins) {
      this.coins -= stage.coins;
      this.gainXp(stage.xp, now, 'pont');
      this.bridgeStage++;
      this.bridgePaid = {};
      if (this.bridgeStage === BRIDGE.stages.length) this.bridgeDoneAt = now;
    }
  }

  buy(now: number): void {
    const reserve = 20 + 5 * this.level;
    for (const m of MACHINES) {
      // The first copy as soon as it opens; another one only when every copy's queue is full, with the reserve kept.
      for (let n = 1; n <= m.copyLevels.length; n++) {
        if (this.machines.has(`${m.id}#${n}`)) continue;
        const busy = [...this.machines.values()].filter((x) => x.type === m.id).every((x) => x.queue.length >= x.slots);
        if (m.copyLevels[n - 1] > this.level || (n > 1 && !busy) || this.coins < m.price * n + (n > 1 ? reserve : 0)) break;
        this.coins -= m.price * n;
        this.machines.set(`${m.id}#${n}`, { type: m.id, slots: 2, queue: [] });
        this.stats.note(`built ${m.id}#${n}`, now);
      }
    }
    for (const a of ANIMALS) {
      if (a.level > this.level) continue;
      if (!this.pens.has(a.id)) {
        if (this.coins < a.penPrice) continue;
        this.coins -= a.penPrice;
        this.pens.set(a.id, []);
      }
      const pen = this.pens.get(a.id)!;
      // Another pen of the kind once all are full, when its level has come, with the reserve kept.
      const copies = this.penCount.get(a.id) ?? 1;
      const nextAt = a.penLevels[copies];
      if (pen.length >= this.room(a) && nextAt !== undefined && nextAt <= this.level && this.coins >= a.penPrice * (copies + 1) + reserve) {
        this.coins -= a.penPrice * (copies + 1);
        this.penCount.set(a.id, copies + 1);
      }
      // A rare animal waiting for room takes the next place before a bought one.
      if (this.waitingBreeds.length) this.placeBreeds();
      while (pen.length < this.room(a) && this.coins >= animalPrice(a, pen.length) + reserve) {
        this.coins -= animalPrice(a, pen.length);
        pen.push(-1);
        this.bonusOf(a.id).push(0);
      }
    }
    while (this.fields.length < maxFields(this.level) && this.coins >= fieldPrice(this.fieldsBought) + reserve) {
      this.coins -= fieldPrice(this.fieldsBought);
      this.fieldsBought++;
      this.fields.push({ crop: null, readyAt: 0 });
    }
    while (this.level >= HAZEL.level && this.hazels.length < HAZEL.max && this.coins >= HAZEL.price + reserve) {
      this.coins -= HAZEL.price;
      this.hazels.push(now + HAZEL.minutes);
    }
    for (const tree of FRUIT_TREES) {
      const owned = () => this.fruitTrees.filter((t) => t.tree === tree).length;
      while (this.level >= tree.level && owned() < tree.max && this.coins >= tree.price + reserve) {
        this.coins -= tree.price;
        this.fruitTrees.push({ tree, readyAt: now + tree.minutes });
      }
    }
    for (const machine of this.machines.values()) {
      const price = SLOT_PRICES[machine.slots - 2];
      if (price !== undefined && this.coins >= price * 2 + reserve) {
        this.coins -= price;
        machine.slots++;
      }
    }
    // Land last: what is left over clears the wild, then buys the next parcel.
    this.obstacles.sort((a, b) => a.cost - b.cost);
    while (this.obstacles.length && this.coins >= this.obstacles[0].cost + reserve * 2) {
      const o = this.obstacles.shift()!;
      this.coins -= o.cost;
      this.gainXp(o.xp, now, 'friche');
    }
    const parcel = PARCELS[this.parcelsBought];
    if (parcel && !this.obstacles.length && parcel.level <= this.level && this.coins >= parcel.price + reserve * 2) {
      this.coins -= parcel.price;
      this.parcelsBought++;
      for (let i = 0; i < OBSTACLES_PER_PARCEL; i++) this.obstacles.push(this.rollObstacle());
    }
  }

  feedAnimals(now: number): void {
    for (const a of ANIMALS) {
      const pen = this.pens.get(a.id);
      if (!pen) continue;
      pen.forEach((readyAt, i) => {
        if (readyAt === -1 && this.has(a.feed) > 0) {
          this.stock[a.feed]--;
          pen[i] = now + a.minutes;
        }
      });
    }
  }

  queueMachines(now: number): void {
    const want = this.demand();
    for (const machine of this.machines.values()) {
      while (machine.queue.length < machine.slots) {
        const options = this.recipes().filter((r) => r.machine === machine.type && this.canPay(r.inputs));
        const wanted = options.filter((r) => (want.get(r.id) ?? 0) > 0);
        const extra = options.filter((r) => !r.feed && this.has(r.id) + this.queued(r.id) < 3);
        const pick = (wanted.length ? wanted : extra).sort((a, b) => b.value * b.count - a.value * a.count)[0];
        if (!pick) break;
        this.pay(pick.inputs);
        const start = machine.queue.length ? machine.queue[machine.queue.length - 1].readyAt : now;
        machine.queue.push({ recipe: pick, readyAt: start + pick.minutes });
        this.stats.note(`machine ${machine.type}`, pick.minutes);
        this.stats.note(`made ${pick.id}`, pick.count);
        want.set(pick.id, (want.get(pick.id) ?? 0) - pick.count);
      }
    }
  }

  queued(id: string): number {
    let n = 0;
    for (const m of this.machines.values()) for (const j of m.queue) if (j.recipe.id === id) n += j.recipe.count;
    return n;
  }

  plant(now: number, visitEnd: number, nextVisit: number): void {
    const want = this.demand();
    const empty = this.fields.filter((f) => !f.crop);
    for (const f of empty) {
      const crops = this.crops().filter((c) => this.coins >= c.seed);
      if (!crops.length) return;
      const short = crops.filter((c) => (want.get(c.id) ?? 0) > 0).sort((a, b) => (want.get(b.id) ?? 0) - (want.get(a.id) ?? 0));
      let crop = short[0];
      if (!crop) {
        const score = (c: Crop) => c.yield * c.value - c.seed + 2 * c.xp;
        const inVisit = crops.filter((c) => c.minutes <= visitEnd - now);
        const forNext = crops.filter((c) => c.minutes <= nextVisit - now);
        if (inVisit.length) crop = inVisit.sort((a, b) => score(b) / b.minutes - score(a) / a.minutes)[0];
        else if (forNext.length) crop = forNext.sort((a, b) => score(b) - score(a))[0];
        else crop = crops.sort((a, b) => a.minutes - b.minutes)[0];
      }
      this.coins -= crop.seed;
      f.crop = crop;
      f.readyAt = now + crop.minutes;
      want.set(crop.id, (want.get(crop.id) ?? 0) - crop.yield);
    }
  }

  useBoosters(now: number): void {
    const growing = this.fields.filter((f) => f.crop && f.readyAt > now).sort((a, b) => b.readyAt - a.readyAt);
    if (this.boosters.wateringCan > 0 && growing.reduce((s, f) => s + (f.readyAt - now), 0) > 120 * Math.max(1, growing.length / 2)) {
      this.boosters.wateringCan--;
      this.used.wateringCan++;
      for (const f of growing) f.readyAt = now + (f.readyAt - now) / 2;
    }
    // A hurried player boosts first what an order or the bridge waits for, then the longest waits.
    const want = this.demand();
    const wanted = (id: string) => (want.get(id) ?? 0) > 0;
    const fields = growing.filter((f) => wanted(f.crop!.id) || f.readyAt - now >= 10);
    fields.sort((a, b) => Number(wanted(b.crop!.id)) - Number(wanted(a.crop!.id)) || b.readyAt - a.readyAt);
    for (const f of fields) {
      if (this.boosters.fertilizer <= 0) break;
      this.boosters.fertilizer--;
      this.used.fertilizer++;
      f.readyAt = now;
    }
    for (const m of this.machines.values()) {
      const head = m.queue[0];
      if (!head || this.boosters.hourglass <= 0) continue;
      if (!wanted(head.recipe.id) && head.readyAt - now < 30) continue;
      this.boosters.hourglass--;
      this.used.hourglass++;
      const cut = Math.min(60, head.readyAt - now);
      for (const job of m.queue) job.readyAt -= cut;
    }
    for (const a of ANIMALS) {
      const pen = this.pens.get(a.id) ?? [];
      pen.forEach((readyAt, i) => {
        if (readyAt > now && this.boosters.hourglass > 0 && (wanted(a.product) || readyAt - now >= 30)) {
          this.boosters.hourglass--;
          this.used.hourglass++;
          pen[i] = Math.max(now, readyAt - 60);
        }
      });
    }
  }

  sellSurplus(): void {
    const want = this.demand();
    for (const [id, n] of Object.entries(this.stock)) {
      const keep = 20 + Math.max(0, want.get(id) ?? 0);
      if (n > keep && !RECIPES.find((r) => r.id === id)?.feed) {
        const value = CROPS.find((c) => c.id === id)?.value ?? RECIPES.find((r) => r.id === id)?.value ?? ANIMALS.find((a) => a.product === id)?.value ?? 0;
        this.earn(Math.floor((n - keep) * value * MERCHANT_SHARE), 'vente');
        this.stock[id] = keep;
      }
    }
  }
}

// -----------------------------------------------
// RUN
// -----------------------------------------------

function play(profile: Profile, seed: number): Farm {
  const farm = new Farm(seed);
  farm.decor = profile.decor ?? null;
  const visits = [...profile.visits].sort((a, b) => a[0] - b[0]);
  for (let day = 0; day < DAYS; day++) {
    const rule = profile.boosters;
    if (rule) {
      const unlimited = rule.shop.fertilizer === Infinity;
      farm.boosters.fertilizer = unlimited ? 1e9 : farm.boosters.fertilizer + rule.shop.fertilizer + rule.fromGames;
      farm.boosters.wateringCan = unlimited ? 1e9 : farm.boosters.wateringCan + rule.shop.wateringCan;
      farm.boosters.hourglass = unlimited ? 1e9 : farm.boosters.hourglass + rule.shop.hourglass;
    }
    visits.forEach(([start, length], i) => {
      const begin = day * MIN_PER_DAY + start;
      farm.openMail(begin);
      const end = begin + length;
      const next = i + 1 < visits.length ? day * MIN_PER_DAY + visits[i + 1][0] : (day + 1) * MIN_PER_DAY + visits[0][0];
      for (let t = begin; t < end; t++) farm.act(t, end, next, rule);
      farm.playMinutes += length;
    });
    // The 3 small daily tasks, done over the day.
    farm.earn(DAILY.tasks * DAILY.coins(farm.level) + DAILY.chestCoins(farm.level), 'taches');
    farm.gainXp(DAILY.tasks * DAILY.xp(farm.level), (day + 1) * MIN_PER_DAY - 1, 'taches');
    farm.boosters.hourglass += DAILY.chestHourglass;
    farm.mail.waiting += dailyChestReward(farm.level).parcels ?? 0;
    farm.boosters.fertilizer += DAILY.tasks;
    const albumDone = !process.env.ALBUM || SIM_TREASURES.every((t) => farm.album[t.id] !== undefined);
    if (farm.level >= MAX_LEVEL && farm.bridgeDoneAt >= 0 && albumDone) break;
  }
  farm.endAt = Math.min(DAYS * MIN_PER_DAY, farm.levelAt[MAX_LEVEL] ?? Infinity);
  return farm;
}

const when = (t: number | undefined) => (t === undefined ? '   -  ' : `j${(t / MIN_PER_DAY + 1).toFixed(1).padStart(5)}`);

console.log(`La ferme - ${DAYS} jours max, graine ${SEED}`);
console.log(`XP par niveau : ${Array.from({ length: MAX_LEVEL - 1 }, (_, i) => XP_TO_NEXT(i + 1)).join(' ')}`);
const shown = process.env.ALL_LEVELS ? Array.from({ length: MAX_LEVEL - 1 }, (_, i) => i + 2) : [2, 3, 5, 7, 10, 12, 15, 20, 25, 30].filter((l) => l <= MAX_LEVEL);
console.log(`\n${'profil'.padEnd(32)}${shown.map((l) => `niv${l}`.padStart(8)).join('')}    pont   jeu/jour  boosters (engrais/arrosoir/sablier)`);
// PROFILE="Reguliere (,Posee (" plays only the profiles whose name holds one of these.
const PICKED = process.env.PROFILE ? PROFILES.filter((p) => process.env.PROFILE!.split(',').some((k) => p.name.includes(k))) : PROFILES;
for (const profile of PICKED) {
  const farm = play(profile, SEED);
  const minutesPerDay = profile.visits.reduce((s, v) => s + v[1], 0);
  console.log(
    `${profile.name.padEnd(32)}${shown.map((l) => when(farm.levelAt[l]).padStart(8)).join('')}  ${when(farm.bridgeDoneAt >= 0 ? farm.bridgeDoneAt : undefined)}   ${String(minutesPerDay).padStart(4)} min  ${farm.used.fertilizer}/${farm.used.wateringCan}/${farm.used.hourglass}`,
  );
  const steps = CHARM_STEPS.slice(1).map((s, i) => `${s.min} ${when(farm.charmAt[i + 1]).trim()}`).join(' · ');
  const deco = farm.decor ? `, deco : ${farm.decorBought} achats, ${Math.round(farm.decorSpent)} Eloisettes` : '';
  console.log(`    charme ${Math.round(farm.charm)} a la fin ; paliers : ${steps}${deco}`);
  if (process.env.FARM_DETAIL) {
    console.log(`    XP : ${shares(farm.xpFrom)}\n    Eloisettes : ${shares(farm.coinsFrom)}`);
    console.log(`    ${detail(farm)}`);
  }
  if (process.env.ALBUM) {
    const found = SIM_TREASURES.filter((t) => farm.album[t.id] !== undefined);
    const done = found.length === SIM_TREASURES.length ? Math.max(...found.map((t) => farm.album[t.id])) : undefined;
    console.log(`    album ${found.length}/${SIM_TREASURES.length}, complet ${when(done).trim()} ; colis ouverts ${farm.mail.opened}`);
    console.log(`    tresors : ${SIM_TREASURES.map((t) => `${t.id}=${when(farm.album[t.id]).trim()}`).join(' ')}`);
  }
}

/** FARM_DETAIL: orders, cart, machines, items asked, Eloisettes in hand, before the last level. */
function detail(farm: Farm): string {
  const { count, minutes } = farm.stats;
  const n = (k: string) => count[k] ?? 0;
  const hours = (k: string) => (n(k) ? (minutes[k] / n(k) / 60).toFixed(1) : '-');
  const lines = [
    `commandes servies ${n('order served')} (attente moy. ${hours('order served')} h), refusees ${n('order refused')} ; charrette servie ${n('cart served')} (attente ${hours('cart served')} h), renvoyee ${n('cart sent away')}`,
  ];
  // Share of the time each machine type worked, from the day its first copy was built (copies count as more time).
  const use = MACHINES.map((m) => {
    const built = [1, 2, 3].filter((k) => count[`built ${m.id}#${k}`]).map((k) => minutes[`built ${m.id}#${k}`]);
    if (!built.length) return `${m.id} jamais`;
    const open = built.reduce((s, t) => s + (farm.endAt - t), 0);
    return `${m.id} ${Math.round((100 * (minutes[`machine ${m.id}`] ?? 0)) / open)}% x${built.length}`;
  });
  lines.push(`machines : ${use.join(', ')}`);
  const asked = Object.keys(count).filter((k) => k.startsWith('asked ')).map((k) => [k.slice(6), count[k]] as const).sort((a, b) => a[1] - b[1]);
  const refused = Object.keys(count).filter((k) => k.startsWith('refused for ')).map((k) => [k.slice(12), count[k]] as const).sort((a, b) => b[1] - a[1]);
  const neverAsked = [...new Set([...CROPS.map((c) => c.id), ...RECIPES.filter((r) => !r.feed).map((r) => r.id), ...ANIMALS.map((a) => a.product), ...FRUIT_TREES.map((t) => t.item)])].filter((id) => !count[`asked ${id}`]);
  const neverMade = RECIPES.filter((r) => !r.feed && !count[`made ${r.id}`]).map((r) => r.id);
  lines.push(`moins demandes : ${asked.slice(0, 8).map(([id, k]) => `${id} ${k}`).join(', ')} ; jamais demandes : ${neverAsked.join(', ') || '-'}`);
  lines.push(`commandes refusees a cause de : ${refused.slice(0, 8).map(([id, k]) => `${id} ${k}`).join(', ') || '-'} ; jamais fabriques : ${neverMade.join(', ') || '-'}`);
  lines.push(`Eloisettes en poche : ${[10, 15, 20, 25, 30].filter((l) => farm.coinsAt[l] !== undefined).map((l) => `niv${l} ${Math.round(farm.coinsAt[l])}`).join(', ')}`);
  return lines.join('\n    ');
}

function shares(book: Record<string, number>): string {
  const total = Object.values(book).reduce((a, b) => a + b, 0);
  return Object.entries(book)
    .sort((a, b) => b[1] - a[1])
    .map(([source, n]) => `${source} ${Math.round((100 * n) / total)}%`)
    .join(', ');
}
