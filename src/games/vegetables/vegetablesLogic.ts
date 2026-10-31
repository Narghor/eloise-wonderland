import { mulberry32, shuffled } from '../../random';

// -----------------------------------------------
// PLANTS
// -----------------------------------------------
// Growth is counted in half-days: a happy plant gains 2 a night, a plant in the wrong light or
// next to a plant it hates gains less. No DOM here: the season can be played by a solver.

export type KindId = 'lettuce' | 'carrot' | 'tomato' | 'basil' | 'strawberry' | 'potato' | 'pumpkin' | 'sunflower';
export type Light = 'sun' | 'shade' | 'any';

export interface Kind {
  label: string;
  emoji: string;
  /** Nights to ripen when everything goes well. */
  grow: number;
  /** Nights a watering lasts. */
  thirst: number;
  light: Light;
  value: number;
  /** Nights to ripen again after a harvest; absent for a plant picked once. */
  regrow?: number;
  /** Dies on a frosty morning. */
  tender: boolean;
  likes: KindId[];
  dislikes: KindId[];
}

export const KINDS: Record<KindId, Kind> = {
  lettuce: { label: 'Salade', emoji: '🥬', grow: 3, thirst: 1, light: 'shade', value: 2, tender: false, likes: ['carrot', 'strawberry'], dislikes: ['sunflower'] },
  carrot: { label: 'Carotte', emoji: '🥕', grow: 4, thirst: 2, light: 'any', value: 3, tender: false, likes: ['lettuce', 'tomato'], dislikes: ['potato'] },
  tomato: { label: 'Tomate', emoji: '🍅', grow: 5, thirst: 1, light: 'sun', value: 3, regrow: 2, tender: true, likes: ['basil', 'carrot'], dislikes: ['potato'] },
  basil: { label: 'Basilic', emoji: '🌿', grow: 3, thirst: 2, light: 'any', value: 1, tender: true, likes: ['tomato'], dislikes: [] },
  strawberry: { label: 'Fraise', emoji: '🍓', grow: 4, thirst: 1, light: 'sun', value: 2, regrow: 2, tender: true, likes: ['lettuce'], dislikes: [] },
  potato: { label: 'Pomme de terre', emoji: '🥔', grow: 5, thirst: 3, light: 'any', value: 4, tender: false, likes: [], dislikes: ['tomato', 'pumpkin'] },
  pumpkin: { label: 'Citrouille', emoji: '🎃', grow: 7, thirst: 2, light: 'sun', value: 9, tender: true, likes: ['sunflower'], dislikes: ['potato'] },
  sunflower: { label: 'Tournesol', emoji: '🌻', grow: 6, thirst: 3, light: 'sun', value: 5, tender: false, likes: [], dislikes: ['lettuce'] },
};

export const KIND_IDS = Object.keys(KINDS) as KindId[];

export function isKindId(value: unknown): value is KindId {
  return typeof value === 'string' && value in KINDS;
}

/** A ripe plant left this many nights rots. */
export const ROT_NIGHTS = 3;
/** A plant left dry this many nights dies. */
export const DRY_DEATH = 2;
/** At most this many friends add to a harvest. */
export const MAX_FRIENDS = 2;

// -----------------------------------------------
// TIERS AND GENERATION
// -----------------------------------------------

export type Weather = 'sun' | 'rain' | 'frost';

export interface VegetableTier {
  width: number;
  height: number;
  days: number;
  actions: number;
  kinds: number;
  shade: number;
  rain: number;
  frost: boolean;
  /** Seeds in the packet, per cell of the plot. */
  seedsPerCell: number;
  /** Stars ask for a season closer to the solver's. */
  harsh: boolean;
}

export const VEGETABLE_TIERS: readonly VegetableTier[] = [
  { width: 3, height: 3, days: 8, actions: 3, kinds: 3, shade: 2, rain: 2, frost: false, seedsPerCell: 1.6, harsh: false },
  { width: 4, height: 3, days: 10, actions: 3, kinds: 4, shade: 3, rain: 2, frost: false, seedsPerCell: 1.5, harsh: false },
  { width: 4, height: 4, days: 12, actions: 4, kinds: 5, shade: 4, rain: 2, frost: false, seedsPerCell: 1.4, harsh: false },
  { width: 5, height: 4, days: 12, actions: 4, kinds: 6, shade: 5, rain: 1, frost: false, seedsPerCell: 1.3, harsh: true },
  { width: 5, height: 5, days: 14, actions: 4, kinds: 7, shade: 6, rain: 1, frost: true, seedsPerCell: 1.2, harsh: true },
];

export interface Garden {
  width: number;
  height: number;
  shade: boolean[];
  /** Corner the tree stands in: 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right. */
  tree: number;
  days: number;
  actions: number;
  /** Weather of each morning; the first is always sunny. */
  weather: Weather[];
  kinds: KindId[];
  /** Seeds of each kind at the start, aligned with `kinds`. */
  seeds: number[];
  /** Harvest for 1, 2 and 3 stars. */
  targets: [number, number, number];
}

export function generateGarden(tier: VegetableTier, seed: number): Garden {
  const random = mulberry32(seed);
  const { width, height, days } = tier;
  const cells = width * height;

  const tree = Math.floor(random() * 4);
  const cornerX = tree % 2 === 0 ? 0 : width - 1;
  const cornerY = tree < 2 ? 0 : height - 1;
  const byDistance = shuffled([...Array(cells).keys()], random).sort(
    (a, b) => Math.hypot((a % width) - cornerX, Math.floor(a / width) - cornerY) - Math.hypot((b % width) - cornerX, Math.floor(b / width) - cornerY),
  );
  const shade = Array<boolean>(cells).fill(false);
  for (const index of byDistance.slice(0, tier.shade)) shade[index] = true;

  // The two easiest tiers keep the gentle first plants; harder ones draw their mix.
  const picked = tier.kinds <= 4 ? KIND_IDS.slice(0, tier.kinds) : shuffled(KIND_IDS, random).slice(0, tier.kinds);
  const kinds = KIND_IDS.filter((kind) => picked.includes(kind));

  const seeds = kinds.map(() => 1);
  const total = Math.max(kinds.length, Math.round(cells * tier.seedsPerCell));
  for (let i = kinds.length; i < total; i++) seeds[Math.floor(random() * kinds.length)]++;

  const weather = Array<Weather>(days).fill('sun');
  const mornings = shuffled([...Array(days - 1).keys()].map((i) => i + 1), random);
  for (const day of mornings.slice(0, tier.rain)) weather[day] = 'rain';
  if (tier.frost) {
    const late = mornings.filter((day) => weather[day] === 'sun' && day >= Math.floor(days * 0.55) && day < days - 1);
    if (late.length) weather[late[0]] = 'frost';
  }

  const garden: Garden = { width, height, shade, tree, days, actions: tier.actions, weather, kinds, seeds, targets: [0, 0, 0] };
  garden.targets = targetsFor(bestEstimate(garden, 30, seed ^ 0x5eed), tier.harsh);
  return garden;
}

/** Stars are set from a solver's season: reachable, but only with some planning. */
export function targetsFor(estimate: number, harsh: boolean): [number, number, number] {
  const ratios = harsh ? [0.65, 0.85, 1] : [0.6, 0.8, 0.95];
  return [Math.round(estimate * ratios[0]), Math.round(estimate * ratios[1]), Math.round(estimate * ratios[2])];
}

export function starsFor(score: number, targets: readonly number[]): number {
  return targets.filter((target) => score >= target).length;
}

// -----------------------------------------------
// THE SEASON IN PROGRESS
// -----------------------------------------------

export interface Plant {
  kind: KindId;
  /** In half-nights. */
  growth: number;
  /** Nights of water left. */
  moisture: number;
  dryNights: number;
  ripeNights: number;
  dead: boolean;
}

export interface Field {
  /** 1-based; past `garden.days` the season is over. */
  day: number;
  actionsLeft: number;
  cells: (Plant | null)[];
  seeds: number[];
  score: number;
  /** Plants harvested, aligned with `garden.kinds`. */
  harvested: number[];
}

export function newField(garden: Garden): Field {
  return {
    day: 1,
    actionsLeft: garden.actions,
    cells: Array(garden.width * garden.height).fill(null),
    seeds: [...garden.seeds],
    score: 0,
    harvested: garden.kinds.map(() => 0),
  };
}

export function copyField(field: Field): Field {
  return { ...field, cells: field.cells.map((plant) => (plant ? { ...plant } : null)), seeds: [...field.seeds], harvested: [...field.harvested] };
}

export function isOver(garden: Garden, field: Field): boolean {
  return field.day > garden.days;
}

export function isRipe(plant: Plant): boolean {
  return !plant.dead && plant.growth >= KINDS[plant.kind].grow * 2;
}

export function neighbours(garden: Garden, index: number): number[] {
  const x = index % garden.width;
  const y = Math.floor(index / garden.width);
  const list: number[] = [];
  if (x > 0) list.push(index - 1);
  if (x < garden.width - 1) list.push(index + 1);
  if (y > 0) list.push(index - garden.width);
  if (y < garden.height - 1) list.push(index + garden.width);
  return list;
}

export interface Mood {
  friends: number;
  enemies: number;
  wrongLight: boolean;
}

/** How a plant of `kind` would feel at `index`, among the living plants around. */
export function moodAt(garden: Garden, field: Field, index: number, kind: KindId): Mood {
  let friends = 0;
  let enemies = 0;
  for (const other of neighbours(garden, index)) {
    const plant = field.cells[other];
    if (!plant || plant.dead) continue;
    if (KINDS[kind].likes.includes(plant.kind)) friends++;
    if (KINDS[kind].dislikes.includes(plant.kind)) enemies++;
  }
  const light = KINDS[kind].light;
  const wrongLight = light !== 'any' && (light === 'shade') !== garden.shade[index];
  return { friends, enemies, wrongLight };
}

/** Half-nights gained in one good night. */
export function growthPerNight(mood: Mood): number {
  return Math.max(0, 2 - (mood.wrongLight ? 1 : 0) - mood.enemies);
}

export function harvestValue(garden: Garden, field: Field, index: number): number {
  const plant = field.cells[index];
  if (!plant) return 0;
  return KINDS[plant.kind].value + Math.min(MAX_FRIENDS, moodAt(garden, field, index, plant.kind).friends);
}

/** Nights until ripe at the current pace, or Infinity when it does not grow. */
export function nightsToRipe(garden: Garden, field: Field, index: number): number {
  const plant = field.cells[index];
  if (!plant || plant.dead) return Infinity;
  const left = KINDS[plant.kind].grow * 2 - plant.growth;
  if (left <= 0) return 0;
  const pace = growthPerNight(moodAt(garden, field, index, plant.kind));
  return pace === 0 ? Infinity : Math.ceil(left / pace);
}

// -----------------------------------------------
// ACTIONS
// -----------------------------------------------
// Planting and watering spend an action; harvesting and clearing a dead plant are free.

export function canPlant(field: Field, index: number, kindIndex: number): boolean {
  return field.actionsLeft > 0 && field.cells[index] === null && field.seeds[kindIndex] > 0;
}

export function sow(garden: Garden, field: Field, index: number, kindIndex: number): void {
  const kind = garden.kinds[kindIndex];
  field.cells[index] = { kind, growth: 0, moisture: KINDS[kind].thirst, dryNights: 0, ripeNights: 0, dead: false };
  field.seeds[kindIndex]--;
  field.actionsLeft--;
}

export function canWater(field: Field, index: number): boolean {
  const plant = field.cells[index];
  return field.actionsLeft > 0 && !!plant && !plant.dead && !isRipe(plant) && plant.moisture < KINDS[plant.kind].thirst;
}

export function water(field: Field, index: number): void {
  const plant = field.cells[index]!;
  plant.moisture = KINDS[plant.kind].thirst;
  plant.dryNights = 0;
  field.actionsLeft--;
}

/** Picks a ripe plant and returns what it was worth. */
export function harvest(garden: Garden, field: Field, index: number): number {
  const plant = field.cells[index]!;
  const value = harvestValue(garden, field, index);
  const kind = KINDS[plant.kind];
  field.score += value;
  field.harvested[garden.kinds.indexOf(plant.kind)]++;
  if (kind.regrow) {
    plant.growth = (kind.grow - kind.regrow) * 2;
    plant.ripeNights = 0;
  } else {
    field.cells[index] = null;
  }
  return value;
}

export function clear(field: Field, index: number): void {
  field.cells[index] = null;
}

/** The night, then the next morning's weather. Returns what the morning did. */
export function endDay(garden: Garden, field: Field): { rotted: number; dried: number; frozen: number } {
  const report = { rotted: 0, dried: 0, frozen: 0 };
  const paces = field.cells.map((plant, index) => (plant && !plant.dead ? growthPerNight(moodAt(garden, field, index, plant.kind)) : 0));
  field.cells.forEach((plant, index) => {
    if (!plant || plant.dead) return;
    if (isRipe(plant)) {
      plant.ripeNights++;
      if (plant.ripeNights >= ROT_NIGHTS) {
        plant.dead = true;
        report.rotted++;
      }
    } else if (plant.moisture <= 0) {
      plant.dryNights++;
      if (plant.dryNights >= DRY_DEATH) {
        plant.dead = true;
        report.dried++;
      }
    } else {
      plant.moisture--;
      plant.dryNights = 0;
      plant.growth = Math.min(KINDS[plant.kind].grow * 2, plant.growth + paces[index]);
    }
  });
  field.day++;
  field.actionsLeft = garden.actions;
  const weather = garden.weather[field.day - 1];
  for (const plant of field.cells) {
    if (!plant || plant.dead) continue;
    if (weather === 'rain') {
      plant.moisture = KINDS[plant.kind].thirst;
      plant.dryNights = 0;
    } else if (weather === 'frost' && KINDS[plant.kind].tender) {
      plant.dead = true;
      report.frozen++;
    }
  }
  return report;
}

// -----------------------------------------------
// SOLVER
// -----------------------------------------------
// A greedy gardener with a little noise, played many times: its best season sets the targets.

export function bestEstimate(garden: Garden, runs: number, seed: number): number {
  const random = mulberry32(seed);
  let best = playGreedy(garden, random, 0);
  for (let i = 1; i < runs; i++) best = Math.max(best, playGreedy(garden, random, 0.8));
  return best;
}

export function playGreedy(garden: Garden, random: () => number, noise: number): number {
  const field = newField(garden);
  const jitter = () => 1 + noise * (random() - 0.5);
  while (!isOver(garden, field)) {
    field.cells.forEach((plant, index) => {
      if (plant && isRipe(plant)) harvest(garden, field, index);
      else if (plant?.dead) clear(field, index);
    });
    const daysLeft = garden.days - field.day;
    const rainTomorrow = garden.weather[field.day] === 'rain';
    const frostDay = garden.weather.indexOf('frost') + 1;
    while (field.actionsLeft > 0) {
      let best: { score: number; act: () => void } | null = null;
      const offer = (score: number, act: () => void) => {
        if (score > 0 && (!best || score > best.score)) best = { score, act };
      };
      field.cells.forEach((plant, index) => {
        if (plant && canWater(field, index) && plant.moisture === 0 && !rainTomorrow) {
          offer(100 * jitter() + KINDS[plant.kind].value, () => water(field, index));
        }
        if (plant !== null) return;
        garden.kinds.forEach((kind, kindIndex) => {
          if (!canPlant(field, index, kindIndex)) return;
          const info = KINDS[kind];
          const mood = moodAt(garden, field, index, kind);
          const pace = growthPerNight(mood);
          if (pace === 0) return;
          const nights = Math.ceil((info.grow * 2) / pace);
          if (nights > daysLeft) return;
          if (info.tender && frostDay > field.day && field.day + nights >= frostDay) return;
          const hated = neighbours(garden, index).filter((other) => {
            const neighbour = field.cells[other];
            return neighbour && !neighbour.dead && KINDS[neighbour.kind].dislikes.includes(kind);
          }).length;
          const repeats = info.regrow ? Math.floor((daysLeft - nights) / (info.regrow * 2 / pace)) : 0;
          const worth = (info.value + Math.min(MAX_FRIENDS, mood.friends)) * (1 + repeats) - hated * 2;
          const cost = nights + nights / info.thirst;
          offer((worth / cost) * 10 * jitter(), () => sow(garden, field, index, kindIndex));
        });
      });
      if (!best) break;
      (best as { act: () => void }).act();
    }
    endDay(garden, field);
  }
  return field.score;
}
