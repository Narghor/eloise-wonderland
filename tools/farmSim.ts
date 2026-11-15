// -----------------------------------------------
// FARM SIM: how long the farm takes to play, per player profile
// -----------------------------------------------
// node tools/farm-sim.mjs [days] [seed]
// Model player of docs/ferme.md 8bis on the game's real content tables (src/games/farm/data) and order prices.
// The player is greedy but sensible: collects, serves orders, feeds, queues machines, plants for the next visit,
// buys buildings and fields as soon as they open, then clears land. One action round per game minute of a visit.

import { mulberry32 } from '../src/random';
import { ANIMALS as DATA_ANIMALS, PEN_CAPACITY, animalPrice as dataAnimalPrice } from '../src/games/farm/data/animals';
import { CROPS as DATA_CROPS, STARTING_FIELDS, fieldPrice, maxFields } from '../src/games/farm/data/crops';
import { DAILY_TASKS, dailyChestReward, dailyTaskReward } from '../src/games/farm/data/daily';
import { item } from '../src/games/farm/data/items';
import { OBSTACLES as DATA_OBSTACLES, OBSTACLES_PER_PARCEL, PARCEL_STEPS, STARTING_OBSTACLES } from '../src/games/farm/data/land';
import { XP_TABLE as DATA_XP_TABLE, levelReward as dataLevelReward, orderSlots } from '../src/games/farm/data/levels';
import { FEEDS, RECIPES as DATA_RECIPES, queueSlotPrice } from '../src/games/farm/data/machines';
import { HAZEL as DATA_HAZEL, PLACEABLES, placeable } from '../src/games/farm/data/placeables';
import { project } from '../src/games/farm/data/projects';
import type { ItemId, Unlock } from '../src/games/farm/data/types';
import { ORDER_NUTS, ORDER_XP } from '../src/games/farm/farmOrders';
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

interface Animal { id: string; level: number; pen: string; penPrice: number; capacity: number; price: number; feed: string; minutes: number; product: string; value: number; xp: number }

const ANIMALS: Animal[] = DATA_ANIMALS.map((a) => ({
  id: a.id, level: levelOf(a.unlock), pen: a.pen, penPrice: placeable(a.pen).price, capacity: PEN_CAPACITY[a.pen],
  price: a.price, feed: a.feed, minutes: a.minutes, product: a.product, value: valueOf(a.product), xp: a.xp,
}));

interface Machine { id: string; level: number; price: number }

const MACHINES: Machine[] = PLACEABLES.filter((p) => p.kind === 'machine').map((p) => ({ id: p.id, level: levelOf(p.unlock), price: p.price }));

interface Recipe { id: string; machine: string; level: number; minutes: number; inputs: Record<string, number>; count: number; value: number; xp: number; feed?: boolean }

const RECIPES: Recipe[] = DATA_RECIPES.map((r) => ({
  id: r.item, machine: r.machine, level: levelOf(r.unlock), minutes: r.minutes, inputs: r.inputs as Record<string, number>,
  count: r.count, value: valueOf(r.item), xp: r.xp, feed: FEEDS.includes(r.item),
}));

const hazel = placeable('hazel');
const HAZEL = { level: levelOf(hazel.unlock), price: hazel.price, max: hazel.maxCount ?? 1, minutes: DATA_HAZEL.minutes, coins: DATA_HAZEL.nuts, xp: DATA_HAZEL.xp };

const SLOT_PRICES = [3, 4, 5, 6].map((slot) => queueSlotPrice(slot - 1) ?? Infinity); // queue slots 3 to 6
const MERCHANT_SHARE = DATA_MERCHANT_SHARE;
const animalPrice = (a: Animal, owned: number) => dataAnimalPrice(DATA_ANIMALS.find((x) => x.id === a.id)!, owned);
const ORDER_COINS = ORDER_NUTS;

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

interface Profile { name: string; visits: [number, number][]; boosters: BoosterRule | null }

const hm = (h: number, m = 0) => h * 60 + m;
const every = (from: number, to: number, step: number, length: number): [number, number][] => {
  const list: [number, number][] = [];
  for (let t = from; t <= to; t += step) list.push([t, length]);
  return list;
};
const CAPPED: BoosterRule = { shop: { fertilizer: 5, wateringCan: 1, hourglass: 3 }, fromGames: 2 };
const UNLIMITED: BoosterRule = { shop: { fertilizer: Infinity, wateringCan: Infinity, hourglass: Infinity }, fromGames: 0 };

const PROFILES: Profile[] = [
  { name: 'Posee (2 x 10-15 min)', visits: [[hm(8), 10], [hm(20), 15]], boosters: null },
  { name: 'Reguliere (4 x 10-15 min)', visits: [[hm(7, 30), 10], [hm(12, 30), 10], [hm(18), 15], [hm(22), 10]], boosters: null },
  { name: 'Accro (11 x 15 min)', visits: every(hm(8), hm(23), 90, 15), boosters: null },
  { name: 'Accro + boosters plafonnes', visits: every(hm(8), hm(23), 90, 15), boosters: CAPPED },
  { name: 'Accro + boosters SANS plafond', visits: every(hm(8), hm(23), 90, 15), boosters: UNLIMITED },
];

// -----------------------------------------------
// STATE
// -----------------------------------------------

interface Field { crop: Crop | null; readyAt: number }
interface Job { recipe: Recipe; readyAt: number }
interface Order { items: Record<string, number>; value: number; since: number }

class Farm {
  coins = 50;
  xp = 0;
  level = 1;
  stock: Record<string, number> = {};
  fields: Field[] = Array.from({ length: STARTING_FIELDS }, () => ({ crop: null, readyAt: 0 }));
  fieldsBought = 0;
  machines = new Map<string, { slots: number; queue: Job[] }>();
  pens = new Map<string, number[]>(); // animal id -> per animal: readyAt, -1 hungry
  hazels: number[] = [];
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
  playMinutes = 0;
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
    this.coins += coins;
    this.note(this.coinsFrom, source, coins);
  }

  gainXp(xp: number, now: number, source: string): void {
    this.note(this.xpFrom, source, xp);
    this.xp += xp;
    while (this.level < MAX_LEVEL && this.xp >= XP_TO_NEXT(this.level)) {
      this.xp -= XP_TO_NEXT(this.level);
      this.level++;
      this.levelAt[this.level] = now;
      const reward = levelReward(this.level);
      this.earn(reward.coins, 'niveaux');
      this.boosters.fertilizer += reward.fertilizer;
      this.boosters.hourglass += reward.hourglass;
    }
  }

  // -----------------------------------------------
  // WHAT IS UNLOCKED, WHAT IS WANTED
  // -----------------------------------------------

  crops(): Crop[] {
    return CROPS.filter((c) => c.level <= this.level);
  }
  recipes(): Recipe[] {
    return RECIPES.filter((r) => r.level <= this.level && this.machines.has(r.machine));
  }
  animalCount(id: string): number {
    return this.pens.get(id)?.length ?? 0;
  }

  /** Items the player is short of right now: orders, the bridge stage, feed, one batch of each recipe. */
  demand(): Map<string, number> {
    const want = new Map<string, number>();
    const need = (id: string, n: number) => want.set(id, (want.get(id) ?? 0) + n);
    for (const order of this.orders) for (const [id, n] of Object.entries(order.items)) need(id, n);
    const stage = BRIDGE.stages[this.bridgeStage];
    if (stage && this.level >= BRIDGE.level) for (const [id, n] of Object.entries(stage.items)) need(id, n - (this.bridgePaid[id] ?? 0));
    for (const a of ANIMALS) {
      const count = this.animalCount(a.id);
      if (count > 0) need(a.feed, count * 2);
    }
    for (const r of this.recipes()) if (!r.feed && this.has(r.id) < 2) for (const [id, n] of Object.entries(r.inputs)) need(id, n);
    // Inputs of whatever is itself short (one level deep is enough for lot 1 chains).
    for (const [id, n] of [...want]) {
      const r = RECIPES.find((x) => x.id === id && x.level <= this.level && this.machines.has(x.machine));
      if (r && this.has(id) < n) for (const [input, k] of Object.entries(r.inputs)) need(input, Math.ceil((n - this.has(id)) / r.count) * k);
    }
    for (const [id, n] of [...want]) want.set(id, n - this.has(id));
    return want;
  }

  // -----------------------------------------------
  // ORDERS
  // -----------------------------------------------

  orderable(): { id: string; value: number }[] {
    const list = this.crops().map((c) => ({ id: c.id, value: c.value }));
    for (const r of this.recipes()) if (!r.feed) list.push({ id: r.id, value: r.value });
    for (const a of ANIMALS) if (this.animalCount(a.id) > 0) list.push({ id: a.product, value: a.value });
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
      value += qty * v;
    }
    return { items, value, since: now };
  }

  refillOrders(now: number): void {
    while (this.orders.length + this.nextOrderAt.length < orderSlots(this.level)) this.nextOrderAt.push(now);
    const due = this.nextOrderAt.filter((t) => t <= now);
    this.nextOrderAt = this.nextOrderAt.filter((t) => t > now);
    for (let i = 0; i < due.length; i++) this.orders.push(this.rollOrder(now));
  }

  // -----------------------------------------------
  // ONE ACTION ROUND (one game minute of a visit)
  // -----------------------------------------------

  act(now: number, visitEnd: number, nextVisit: number, rule: BoosterRule | null): void {
    this.collect(now);
    this.refillOrders(now);
    this.serveOrders(now);
    this.feedBridge(now);
    this.buy(now);
    this.feedAnimals(now);
    this.queueMachines(now);
    this.plant(now, visitEnd, nextVisit);
    if (rule) this.useBoosters(now);
    this.sellSurplus();
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
      pen.forEach((readyAt, i) => {
        if (readyAt >= 0 && readyAt <= now) {
          this.add(a.product, 1);
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
  }

  serveOrders(now: number): void {
    const ready = this.orders.filter((o) => this.canPay(o.items)).sort((a, b) => b.value - a.value);
    for (const order of ready) {
      if (!this.canPay(order.items)) continue;
      this.pay(order.items);
      this.earn(Math.round(order.value * ORDER_COINS), 'commandes');
      this.gainXp(Math.round(order.value * ORDER_XP), now, 'commandes');
      this.orders.splice(this.orders.indexOf(order), 1);
      this.nextOrderAt.push(now + 1);
    }
    // An order waiting for a whole day is refused: a new one comes 15 minutes later.
    for (const order of [...this.orders]) {
      if (now - order.since > MIN_PER_DAY) {
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
      if (m.level <= this.level && !this.machines.has(m.id) && this.coins >= m.price) {
        this.coins -= m.price;
        this.machines.set(m.id, { slots: 2, queue: [] });
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
      while (pen.length < a.capacity && this.coins >= animalPrice(a, pen.length) + reserve) {
        this.coins -= animalPrice(a, pen.length);
        pen.push(-1);
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
    for (const [id, machine] of this.machines) {
      while (machine.queue.length < machine.slots) {
        const options = this.recipes().filter((r) => r.machine === id && this.canPay(r.inputs));
        const wanted = options.filter((r) => (want.get(r.id) ?? 0) > 0);
        const extra = options.filter((r) => !r.feed && this.has(r.id) + this.queued(r.id) < 3);
        const pick = (wanted.length ? wanted : extra).sort((a, b) => b.value * b.count - a.value * a.count)[0];
        if (!pick) break;
        this.pay(pick.inputs);
        const start = machine.queue.length ? machine.queue[machine.queue.length - 1].readyAt : now;
        machine.queue.push({ recipe: pick, readyAt: start + pick.minutes });
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
      const end = begin + length;
      const next = i + 1 < visits.length ? day * MIN_PER_DAY + visits[i + 1][0] : (day + 1) * MIN_PER_DAY + visits[0][0];
      for (let t = begin; t < end; t++) farm.act(t, end, next, rule);
      farm.playMinutes += length;
    });
    // The 3 small daily tasks, done over the day.
    farm.earn(DAILY.tasks * DAILY.coins(farm.level) + DAILY.chestCoins(farm.level), 'taches');
    farm.gainXp(DAILY.tasks * DAILY.xp(farm.level), (day + 1) * MIN_PER_DAY - 1, 'taches');
    farm.boosters.hourglass += DAILY.chestHourglass;
    farm.boosters.fertilizer += DAILY.tasks;
    if (farm.level >= MAX_LEVEL && farm.bridgeDoneAt >= 0) break;
  }
  return farm;
}

const when = (t: number | undefined) => (t === undefined ? '   -  ' : `j${(t / MIN_PER_DAY + 1).toFixed(1).padStart(5)}`);

console.log(`Ferme, lot 1 - ${DAYS} jours max, graine ${SEED}`);
console.log(`XP par niveau : ${Array.from({ length: MAX_LEVEL - 1 }, (_, i) => XP_TO_NEXT(i + 1)).join(' ')}`);
const shown = process.env.ALL_LEVELS ? Array.from({ length: MAX_LEVEL - 1 }, (_, i) => i + 2) : [2, 3, 5, 7, 10, 12, 15];
console.log(`\n${'profil'.padEnd(32)}${shown.map((l) => `niv${l}`.padStart(8)).join('')}    pont   jeu/jour  boosters (engrais/arrosoir/sablier)`);
for (const profile of PROFILES) {
  const farm = play(profile, SEED);
  const minutesPerDay = profile.visits.reduce((s, v) => s + v[1], 0);
  console.log(
    `${profile.name.padEnd(32)}${shown.map((l) => when(farm.levelAt[l]).padStart(8)).join('')}  ${when(farm.bridgeDoneAt >= 0 ? farm.bridgeDoneAt : undefined)}   ${String(minutesPerDay).padStart(4)} min  ${farm.used.fertilizer}/${farm.used.wateringCan}/${farm.used.hourglass}`,
  );
  if (process.env.FARM_DETAIL) console.log(`    XP : ${shares(farm.xpFrom)}\n    Eloisettes : ${shares(farm.coinsFrom)}`);
}

function shares(book: Record<string, number>): string {
  const total = Object.values(book).reduce((a, b) => a + b, 0);
  return Object.entries(book)
    .sort((a, b) => b[1] - a[1])
    .map(([source, n]) => `${source} ${Math.round((100 * n) / total)}%`)
    .join(', ');
}
