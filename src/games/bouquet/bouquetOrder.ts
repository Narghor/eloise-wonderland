import type { LevelTable } from '../../difficulty';
import { mulberry32, shuffled } from '../../random';
import {
  ALL_FLOWERS,
  COLOURS,
  FAMILY_NAMES,
  SPECIES,
  flower,
  type ColourId,
  type Family,
  type FlowerKey,
  type SpeciesId,
} from './flowers';

// -----------------------------------------------
// LEVELS
// -----------------------------------------------

export interface LevelParams {
  slots: number;
  constraints: number;
  stall: number;
}

const LEVEL_PARAMS: readonly LevelParams[] = [
  { slots: 5, constraints: 2, stall: 6 },
  { slots: 5, constraints: 3, stall: 7 },
  { slots: 7, constraints: 4, stall: 8 },
  { slots: 7, constraints: 5, stall: 10 },
  { slots: 9, constraints: 6, stall: 12 },
];

export const BOUQUET_LEVELS: LevelTable = [1, 2, 3, 4, 5];

export function levelParams(level: number): LevelParams {
  return LEVEL_PARAMS[Math.min(LEVEL_PARAMS.length, Math.max(1, level)) - 1];
}

// -----------------------------------------------
// CONSTRAINTS
// -----------------------------------------------

export type Constraint =
  | { kind: 'speciesExactly'; species: SpeciesId; count: number }
  | { kind: 'speciesAbsent'; species: SpeciesId }
  | { kind: 'colourAtLeast'; colour: ColourId; count: number }
  | { kind: 'colourAbsent'; colour: ColourId }
  | { kind: 'familyAtLeast'; family: Family; count: number }
  | { kind: 'sameFamily'; family: Family }
  | { kind: 'centreSpecies'; species: SpeciesId }
  | { kind: 'centreTall'; tall: boolean }
  | { kind: 'edgesTall'; tall: boolean }
  | { kind: 'tallExactly'; count: number }
  | { kind: 'symmetric' }
  | { kind: 'speciesAtLeast'; count: number }
  | { kind: 'coloursAtMost'; count: number }
  | { kind: 'noSameNeighbours' };

/** A full bouquet, left to right; the centre is the middle slot. */
export type Bouquet = readonly FlowerKey[];

export function satisfies(bouquet: Bouquet, constraint: Constraint): boolean {
  const flowers = bouquet.map(flower);
  const centre = flowers[(flowers.length - 1) >> 1];
  const count = (test: (f: (typeof flowers)[number]) => boolean) => flowers.filter(test).length;
  switch (constraint.kind) {
    case 'speciesExactly':
      return count((f) => f.species.id === constraint.species) === constraint.count;
    case 'speciesAbsent':
      return count((f) => f.species.id === constraint.species) === 0;
    case 'colourAtLeast':
      return count((f) => f.colour.id === constraint.colour) >= constraint.count;
    case 'colourAbsent':
      return count((f) => f.colour.id === constraint.colour) === 0;
    case 'familyAtLeast':
      return count((f) => f.colour.family === constraint.family) >= constraint.count;
    case 'sameFamily':
      return flowers.every((f) => f.colour.family === constraint.family);
    case 'centreSpecies':
      return centre.species.id === constraint.species;
    case 'centreTall':
      return centre.species.tall === constraint.tall;
    case 'edgesTall':
      return flowers[0].species.tall === constraint.tall && flowers[flowers.length - 1].species.tall === constraint.tall;
    case 'tallExactly':
      return count((f) => f.species.tall) === constraint.count;
    case 'symmetric':
      return bouquet.every((key, i) => key === bouquet[bouquet.length - 1 - i]);
    case 'speciesAtLeast':
      return new Set(flowers.map((f) => f.species.id)).size >= constraint.count;
    case 'coloursAtMost':
      return new Set(flowers.map((f) => f.colour.id)).size <= constraint.count;
    case 'noSameNeighbours':
      return flowers.every((f, i) => i === 0 || f.species.id !== flowers[i - 1].species.id);
  }
}

/** The order card's line, in French. */
export function describe(constraint: Constraint): string {
  switch (constraint.kind) {
    case 'speciesExactly':
      return `Exactement ${constraint.count === 1 ? SPECIES[constraint.species].one : `${constraint.count} ${SPECIES[constraint.species].plural}`}`;
    case 'speciesAbsent':
      return `${/^[aeiouy]/.test(SPECIES[constraint.species].plural) ? 'Pas d’' : 'Pas de '}${SPECIES[constraint.species].plural}`;
    case 'colourAtLeast':
      return `Au moins ${constraint.count} fleurs ${COLOURS[constraint.colour].plural}`;
    case 'colourAbsent':
      return `Aucune fleur ${COLOURS[constraint.colour].singular}`;
    case 'familyAtLeast':
      return `Au moins ${constraint.count} fleurs ${FAMILY_NAMES[constraint.family].plural} (${FAMILY_NAMES[constraint.family].detail})`;
    case 'sameFamily':
      return constraint.family === 'blanc'
        ? 'Rien que des fleurs blanches'
        : `Rien que des fleurs ${FAMILY_NAMES[constraint.family].plural} (${FAMILY_NAMES[constraint.family].detail})`;
    case 'centreSpecies':
      return `Au centre, ${SPECIES[constraint.species].one}`;
    case 'centreTall':
      return constraint.tall ? 'Une grande fleur au centre' : 'Une petite fleur au centre';
    case 'edgesTall':
      return constraint.tall ? 'Des grandes fleurs aux deux bords' : 'Des petites fleurs aux deux bords';
    case 'tallExactly':
      return constraint.count === 0 ? 'Aucune grande fleur' : constraint.count === 1 ? 'Une seule grande fleur' : `Exactement ${constraint.count} grande${constraint.count > 1 ? 's' : ''} fleur${constraint.count > 1 ? 's' : ''}`;
    case 'symmetric':
      return 'Un bouquet symétrique : la gauche en miroir de la droite';
    case 'speciesAtLeast':
      return `Au moins ${constraint.count} sortes de fleurs différentes`;
    case 'coloursAtMost':
      return constraint.count === 1 ? 'Une seule couleur pour tout le bouquet' : `Pas plus de ${constraint.count} couleurs`;
    case 'noSameNeighbours':
      return 'Jamais deux fleurs de la même sorte côte à côte';
  }
}

// -----------------------------------------------
// ORDERS
// -----------------------------------------------

export interface Order {
  slots: number;
  /** Flowers on sale, each in unlimited quantity. */
  stall: FlowerKey[];
  constraints: Constraint[];
  /** The bouquet the order was written from: proof that it can be met. */
  solution: FlowerKey[];
}

export function judge(order: Order, bouquet: Bouquet): boolean[] {
  return order.constraints.map((constraint) => satisfies(bouquet, constraint));
}

/** 3 stars when everything is met, one less per missed wish. */
export function starsFor(results: boolean[]): number {
  return Math.max(0, 3 - results.filter((met) => !met).length);
}

const SAMPLE_SIZE = 100;
/** A wish that most random bouquets already meet says nothing. */
const MAX_WISH_PASS_RATE = 0.7;

/** Same seed and level, same order, on every device. */
export function generateOrder(seed: number, level: number): Order {
  const params = levelParams(level);
  const random = mulberry32(seed);
  for (let attempt = 0; ; attempt++) {
    const order = tryOrder(params, random);
    if (order || attempt > 300) return order ?? fallbackOrder(params, random);
  }
}

export function randomBouquet(stall: readonly FlowerKey[], slots: number, random: () => number): FlowerKey[] {
  return Array.from({ length: slots }, () => stall[Math.floor(random() * stall.length)]);
}

function tryOrder(params: LevelParams, random: () => number): Order | null {
  const stall = pickStall(params.stall, random);
  const solution = pickSolution(stall, params.slots, random);
  const randoms = Array.from({ length: SAMPLE_SIZE }, () => randomBouquet(stall, params.slots, random));
  // Near misses of the solution: they tell whether a wish adds anything to the others.
  const nearMisses = Array.from({ length: SAMPLE_SIZE }, () => mutate(solution, stall, random));
  const samples = [...randoms, ...nearMisses];

  const candidates = shuffled(candidatesFor(solution, stall), random).filter(
    (c) => randoms.filter((b) => satisfies(b, c)).length / randoms.length <= MAX_WISH_PASS_RATE,
  );
  const chosen: Constraint[] = [];
  let passing = samples;
  while (chosen.length < params.constraints) {
    let best: { constraint: Constraint; left: FlowerKey[][] } | null = null;
    for (const constraint of candidates) {
      if (chosen.includes(constraint) || !kindAllowed(chosen, constraint)) continue;
      const left = passing.filter((b) => satisfies(b, constraint));
      if (left.length === passing.length) continue;
      // Not always the strongest: a little luck keeps the orders varied.
      if (!best || left.length * (0.7 + random() * 0.6) < best.left.length) best = { constraint, left };
    }
    if (!best) return null;
    chosen.push(best.constraint);
    passing = best.left;
  }
  if (chosen.some((c, i) => isImplied(c, chosen.filter((_, j) => j !== i), samples))) return null;
  return { slots: params.slots, stall, constraints: sortForReading(chosen), solution };
}

function fallbackOrder(params: LevelParams, random: () => number): Order {
  const stall = pickStall(params.stall, random);
  const solution = pickSolution(stall, params.slots, random);
  const centre = flower(solution[(params.slots - 1) >> 1]).species.id;
  return { slots: params.slots, stall, constraints: [{ kind: 'centreSpecies', species: centre }], solution };
}

function isImplied(constraint: Constraint, others: Constraint[], samples: FlowerKey[][]): boolean {
  return samples.every((b) => !others.every((o) => satisfies(b, o)) || satisfies(b, constraint));
}

const REPEATABLE = new Set<Constraint['kind']>(['speciesExactly', 'speciesAbsent', 'colourAbsent']);

function kindAllowed(chosen: Constraint[], candidate: Constraint): boolean {
  const same = chosen.filter((c) => c.kind === candidate.kind).length;
  return same === 0 || (REPEATABLE.has(candidate.kind) && same < 2);
}

const READING_ORDER: Constraint['kind'][] = [
  'speciesExactly',
  'speciesAbsent',
  'tallExactly',
  'colourAtLeast',
  'familyAtLeast',
  'sameFamily',
  'colourAbsent',
  'coloursAtMost',
  'speciesAtLeast',
  'centreSpecies',
  'centreTall',
  'edgesTall',
  'symmetric',
  'noSameNeighbours',
];

function sortForReading(constraints: Constraint[]): Constraint[] {
  return [...constraints].sort((a, b) => READING_ORDER.indexOf(a.kind) - READING_ORDER.indexOf(b.kind));
}

// -----------------------------------------------
// THE HIDDEN BOUQUET
// -----------------------------------------------

function pickStall(size: number, random: () => number): FlowerKey[] {
  // One flower per species first, so the stall shows variety, then any other colours.
  const firsts = shuffled(Object.values(SPECIES), random).map(
    (species): FlowerKey => `${species.id}/${species.colours[Math.floor(random() * species.colours.length)]}`,
  );
  const picked = firsts.slice(0, Math.min(size, firsts.length - 2));
  for (const key of shuffled(ALL_FLOWERS, random)) {
    if (picked.length >= size) break;
    if (!picked.includes(key)) picked.push(key);
  }
  return picked.sort((a, b) => ALL_FLOWERS.indexOf(a) - ALL_FLOWERS.indexOf(b));
}

/** A bouquet with some intent (a few flowers, often a mirror), so the order has something to say. */
function pickSolution(stall: FlowerKey[], slots: number, random: () => number): FlowerKey[] {
  let pool = shuffled(stall, random).slice(0, 2 + Math.floor(random() * 3));
  if (random() < 0.25) {
    const family = flower(pool[0]).colour.family;
    const sameFamily = stall.filter((key) => flower(key).colour.family === family);
    if (sameFamily.length >= 2) pool = sameFamily;
  }
  const pick = () => pool[Math.floor(random() * pool.length)];
  if (random() < 0.45) {
    const half = Array.from({ length: (slots - 1) / 2 }, pick);
    return [...half, pick(), ...[...half].reverse()];
  }
  return Array.from({ length: slots }, pick);
}

function mutate(solution: FlowerKey[], stall: FlowerKey[], random: () => number): FlowerKey[] {
  const copy = [...solution];
  const changes = 1 + Math.floor(random() * 3);
  for (let i = 0; i < changes; i++) {
    if (random() < 0.3) {
      const a = Math.floor(random() * copy.length);
      const b = Math.floor(random() * copy.length);
      [copy[a], copy[b]] = [copy[b], copy[a]];
    } else copy[Math.floor(random() * copy.length)] = stall[Math.floor(random() * stall.length)];
  }
  return copy;
}

/** Every wish the solution meets. */
function candidatesFor(solution: FlowerKey[], stall: FlowerKey[]): Constraint[] {
  const flowers = solution.map(flower);
  const stallFlowers = stall.map(flower);
  const centre = flowers[(flowers.length - 1) >> 1];
  const list: Constraint[] = [];

  const speciesHere = new Set(flowers.map((f) => f.species.id));
  for (const species of new Set(stallFlowers.map((f) => f.species.id))) {
    const count = flowers.filter((f) => f.species.id === species).length;
    list.push(count === 0 ? { kind: 'speciesAbsent', species } : { kind: 'speciesExactly', species, count });
  }
  for (const colour of new Set(stallFlowers.map((f) => f.colour.id))) {
    const count = flowers.filter((f) => f.colour.id === colour).length;
    if (count === 0) list.push({ kind: 'colourAbsent', colour });
    else if (count >= 2) list.push({ kind: 'colourAtLeast', colour, count });
  }
  const families = new Set(flowers.map((f) => f.colour.family));
  for (const family of ['chaud', 'froid', 'pastel'] as Family[]) {
    const count = flowers.filter((f) => f.colour.family === family).length;
    if (count >= 2) list.push({ kind: 'familyAtLeast', family, count });
  }
  if (families.size === 1) list.push({ kind: 'sameFamily', family: [...families][0] });
  list.push({ kind: 'centreSpecies', species: centre.species.id }, { kind: 'centreTall', tall: centre.species.tall });
  const first = flowers[0].species.tall;
  if (flowers[flowers.length - 1].species.tall === first) list.push({ kind: 'edgesTall', tall: first });
  list.push({ kind: 'tallExactly', count: flowers.filter((f) => f.species.tall).length });
  if (solution.every((key, i) => key === solution[solution.length - 1 - i])) list.push({ kind: 'symmetric' });
  if (speciesHere.size >= 3) list.push({ kind: 'speciesAtLeast', count: speciesHere.size });
  const colours = new Set(flowers.map((f) => f.colour.id)).size;
  if (colours <= 3) list.push({ kind: 'coloursAtMost', count: colours });
  if (flowers.every((f, i) => i === 0 || f.species.id !== flowers[i - 1].species.id)) list.push({ kind: 'noSameNeighbours' });
  return list;
}
