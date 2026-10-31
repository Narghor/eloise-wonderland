import { mulberry32 } from '../../random';

// -----------------------------------------------
// MENU
// -----------------------------------------------

export const TEAS = {
  green: { label: 'Thé vert', emoji: '🍵', color: '#8cc084' },
  black: { label: 'Thé noir', emoji: '☕', color: '#7a4a2e' },
  mint: { label: 'Menthe', emoji: '🌿', color: '#3fae7a' },
  rooibos: { label: 'Rooibos', emoji: '🫖', color: '#c4502f' },
} as const;
export type TeaId = keyof typeof TEAS;
export const TEA_IDS = Object.keys(TEAS) as TeaId[];

export const ADDONS = {
  milk: { label: 'Lait', emoji: '🥛' },
  lemon: { label: 'Citron', emoji: '🍋' },
  honey: { label: 'Miel', emoji: '🍯' },
} as const;
export type AddonId = keyof typeof ADDONS;
export const ADDON_IDS = Object.keys(ADDONS) as AddonId[];

export const PASTRIES = {
  macaron: { label: 'Macaron', emoji: '🍪' },
  cupcake: { label: 'Cupcake', emoji: '🧁' },
  croissant: { label: 'Croissant', emoji: '🥐' },
  cake: { label: 'Part de gâteau', emoji: '🍰' },
} as const;
export type PastryId = keyof typeof PASTRIES;
export const PASTRY_IDS = Object.keys(PASTRIES) as PastryId[];

export interface Order {
  tea: TeaId;
  /** Sorted like ADDON_IDS; milk and lemon never together. */
  addons: AddonId[];
  pastry: PastryId | null;
}

// -----------------------------------------------
// TIERS
// -----------------------------------------------

export interface TeaTier {
  teas: number;
  /** How many add-ons can be offered (milk, lemon, honey in that order). */
  addonKinds: number;
  maxAddons: number;
  pastries: number;
  pastryChance: number;
  spots: number;
  /** Seconds a seated customer waits. */
  patience: number;
  /** Mean seconds between two arrivals. */
  interval: number;
  steep: number;
  /** Cups poured from a full teapot. */
  potCups: number;
}

/** Seconds the doors stay open. */
export const SERVICE_SECONDS = 90;

export const TEA_TIERS: readonly TeaTier[] = [
  { teas: 2, addonKinds: 0, maxAddons: 0, pastries: 0, pastryChance: 0, spots: 2, patience: 25, interval: 8, steep: 2, potCups: 3 },
  { teas: 3, addonKinds: 2, maxAddons: 1, pastries: 2, pastryChance: 0.3, spots: 3, patience: 21, interval: 6.2, steep: 2.5, potCups: 2 },
  { teas: 3, addonKinds: 3, maxAddons: 2, pastries: 3, pastryChance: 0.45, spots: 3, patience: 18, interval: 5, steep: 3, potCups: 2 },
  { teas: 4, addonKinds: 3, maxAddons: 2, pastries: 3, pastryChance: 0.6, spots: 4, patience: 16, interval: 4.4, steep: 3.5, potCups: 2 },
  { teas: 4, addonKinds: 3, maxAddons: 2, pastries: 4, pastryChance: 0.7, spots: 4, patience: 14, interval: 3.7, steep: 4, potCups: 2 },
];

// -----------------------------------------------
// SCHEDULE (seeded: a daily challenge is the same for everyone)
// -----------------------------------------------

export interface Arrival {
  at: number;
  order: Order;
  look: string;
}

const LOOKS = ['🐰', '🐱', '🦊', '🐻', '🐼', '🐨', '🐸', '🦉', '🐭', '🦄'];

export function seedFromDay(day: string): number {
  let hash = 2166136261;
  for (const char of `tea:${day}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export function makeSchedule(tier: TeaTier, seed: number): Arrival[] {
  const random = mulberry32(seed);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
  const arrivals: Arrival[] = [];
  let at = 1.5;
  while (at < SERVICE_SECONDS) {
    arrivals.push({ at, order: randomOrder(tier, random), look: pick(LOOKS) });
    at += tier.interval * (0.6 + random() * 0.8);
  }
  return arrivals;
}

function randomOrder(tier: TeaTier, random: () => number): Order {
  const tea = TEA_IDS[Math.floor(random() * tier.teas)];
  const addons: AddonId[] = [];
  const wanted = Math.floor(random() * (tier.maxAddons + 1));
  const offered = ADDON_IDS.slice(0, tier.addonKinds);
  while (addons.length < wanted) {
    const addon = offered[Math.floor(random() * offered.length)];
    const clash = (addon === 'milk' && addons.includes('lemon')) || (addon === 'lemon' && addons.includes('milk'));
    if (!addons.includes(addon) && !clash) addons.push(addon);
  }
  addons.sort((a, b) => ADDON_IDS.indexOf(a) - ADDON_IDS.indexOf(b));
  const pastry = tier.pastries > 0 && random() < tier.pastryChance ? PASTRY_IDS[Math.floor(random() * tier.pastries)] : null;
  return { tea, addons, pastry };
}

// -----------------------------------------------
// THE SERVICE (no DOM, driven by update(dt))
// -----------------------------------------------

export interface Customer {
  id: number;
  order: Order;
  look: string;
  /** Seconds of patience left. */
  patience: number;
}

export interface Teapot {
  tea: TeaId;
  /** Seconds before it is ready; 0 when ready or empty. */
  steeping: number;
  cups: number;
}

export interface Tray {
  tea: TeaId | null;
  addons: AddonId[];
  pastry: PastryId | null;
}

export type TeaEvent =
  | { type: 'arrive'; spot: number }
  | { type: 'served'; spot: number; tip: number }
  | { type: 'wrong'; spot: number }
  | { type: 'left'; spot: number }
  | { type: 'ready'; tea: TeaId };

export function emptyTray(): Tray {
  return { tea: null, addons: [], pastry: null };
}

export function matches(tray: Tray, order: Order): boolean {
  return (
    tray.tea === order.tea &&
    tray.pastry === order.pastry &&
    tray.addons.length === order.addons.length &&
    order.addons.every((addon) => tray.addons.includes(addon))
  );
}

/** A tip from 0 to 3 coins: the faster, the more. */
export function tipFor(patienceLeft: number, patience: number): number {
  return Math.min(3, Math.floor((patienceLeft / patience) * 4));
}

export function scoreOf(served: number, tips: number): number {
  return served * 10 + tips;
}

/** 3 stars with no customer lost, 2 with at most a tenth lost, 1 with at least half served. */
export function starsFor(served: number, total: number): number {
  const lost = total - served;
  if (lost === 0) return 3;
  if (lost <= Math.max(1, Math.floor(total / 10))) return 2;
  return served * 2 >= total ? 1 : 0;
}

export class Service {
  time = 0;
  readonly spots: (Customer | null)[];
  readonly pots: Teapot[];
  tray: Tray = emptyTray();
  served = 0;
  mistakes = 0;
  tips = 0;
  private next = 0;

  constructor(
    readonly tier: TeaTier,
    readonly schedule: Arrival[],
  ) {
    this.spots = Array.from({ length: tier.spots }, () => null);
    this.pots = TEA_IDS.slice(0, tier.teas).map((tea) => ({ tea, steeping: 0, cups: 0 }));
  }

  get total(): number {
    return this.schedule.length;
  }

  get over(): boolean {
    return this.next >= this.schedule.length && this.spots.every((spot) => spot === null);
  }

  /** Customers waiting outside for a free spot. */
  get queue(): number {
    let waiting = 0;
    for (let i = this.next; i < this.schedule.length && this.schedule[i].at <= this.time; i++) waiting++;
    return waiting;
  }

  update(dt: number): TeaEvent[] {
    const events: TeaEvent[] = [];
    this.time += dt;
    for (const pot of this.pots) {
      if (pot.steeping <= 0) continue;
      pot.steeping = Math.max(0, pot.steeping - dt);
      if (pot.steeping === 0) events.push({ type: 'ready', tea: pot.tea });
    }
    this.spots.forEach((customer, spot) => {
      if (!customer) return;
      customer.patience -= dt;
      if (customer.patience <= 0) {
        this.spots[spot] = null;
        this.mistakes++;
        events.push({ type: 'left', spot });
      }
    });
    // Waiting at the door uses up patience too: a full room loses customers.
    while (this.next < this.schedule.length && this.schedule[this.next].at <= this.time) {
      const arrival = this.schedule[this.next];
      const patience = this.tier.patience - (this.time - arrival.at);
      if (patience <= 0) {
        this.next++;
        this.mistakes++;
        events.push({ type: 'left', spot: -1 });
        continue;
      }
      const spot = this.spots.indexOf(null);
      if (spot < 0) break;
      this.spots[spot] = { id: this.next, order: arrival.order, look: arrival.look, patience };
      this.next++;
      events.push({ type: 'arrive', spot });
    }
    return events;
  }

  /** Starts steeping an empty pot, or pours a ready one into an empty cup. */
  usePot(index: number): boolean {
    const pot = this.pots[index];
    if (!pot || pot.steeping > 0) return false;
    if (pot.cups === 0) {
      pot.steeping = this.tier.steep;
      pot.cups = this.tier.potCups;
      return true;
    }
    if (this.tray.tea) return false;
    this.tray.tea = pot.tea;
    pot.cups--;
    return true;
  }

  /** Adds an add-on, or takes it back off. */
  toggleAddon(addon: AddonId): void {
    const { addons } = this.tray;
    if (addons.includes(addon)) addons.splice(addons.indexOf(addon), 1);
    else addons.push(addon);
  }

  togglePastry(pastry: PastryId): void {
    this.tray.pastry = this.tray.pastry === pastry ? null : pastry;
  }

  clearTray(): void {
    this.tray = emptyTray();
  }

  /** Gives the tray to a customer: a wrong order sends them away. */
  serve(spot: number): TeaEvent | null {
    const customer = this.spots[spot];
    if (!customer || !this.tray.tea) return null;
    this.spots[spot] = null;
    const right = matches(this.tray, customer.order);
    this.tray = emptyTray();
    if (!right) {
      this.mistakes++;
      return { type: 'wrong', spot };
    }
    const tip = tipFor(customer.patience, this.tier.patience);
    this.served++;
    this.tips += tip;
    return { type: 'served', spot, tip };
  }
}
