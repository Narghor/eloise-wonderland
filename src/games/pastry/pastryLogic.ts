// -----------------------------------------------
// LAYER CAKE RULES (no DOM)
// -----------------------------------------------
// A cake is a list of layers, bottom first. Always: a sponge at the bottom, a glaze on top and
// nowhere else, never two identical layers touching. Clues describe a hidden cake; the generator
// adds clues until a solver that only crosses out, like a player, rebuilds the whole cake.

import type { LevelTable } from '../../difficulty';
import { shuffled } from '../../random';

export type Family = 'sponge' | 'cream' | 'jam' | 'fruit' | 'glaze';

export const KIND_IDS = [
  'spongeVanilla', 'spongeChoco', 'spongePistachio',
  'creamVanilla', 'creamChoco', 'creamStrawberry',
  'jam', 'fruit',
  'glazeChoco', 'glazePink', 'glazeWhite',
] as const;
export type KindId = (typeof KIND_IDS)[number];

export interface Kind {
  family: Family;
  /** Button label. */
  label: string;
  /** Noun with its article, as used in clues ("une génoise vanille"). */
  one: string;
  /** Plural noun, for counts. */
  many: string;
  /** Noun after "pas de". */
  none: string;
  color: string;
  /** Height in cake units: a sponge is 1. */
  thickness: number;
}

export const KINDS: Record<KindId, Kind> = {
  spongeVanilla: { family: 'sponge', label: 'Génoise vanille', one: 'une génoise vanille', many: 'génoises vanille', none: 'génoise vanille', color: '#f1cf7e', thickness: 1 },
  spongeChoco: { family: 'sponge', label: 'Génoise chocolat', one: 'une génoise chocolat', many: 'génoises chocolat', none: 'génoise chocolat', color: '#7a4a2e', thickness: 1 },
  spongePistachio: { family: 'sponge', label: 'Génoise pistache', one: 'une génoise pistache', many: 'génoises pistache', none: 'génoise pistache', color: '#b5cf7a', thickness: 1 },
  creamVanilla: { family: 'cream', label: 'Crème vanille', one: 'une crème vanille', many: 'crèmes vanille', none: 'crème vanille', color: '#fff3d6', thickness: 0.5 },
  creamChoco: { family: 'cream', label: 'Crème chocolat', one: 'une crème chocolat', many: 'crèmes chocolat', none: 'crème chocolat', color: '#b07d5e', thickness: 0.5 },
  creamStrawberry: { family: 'cream', label: 'Crème fraise', one: 'une crème fraise', many: 'crèmes fraise', none: 'crème fraise', color: '#ffbfd2', thickness: 0.5 },
  jam: { family: 'jam', label: 'Confiture', one: 'une couche de confiture', many: 'couches de confiture', none: 'confiture', color: '#c42848', thickness: 0.3 },
  fruit: { family: 'fruit', label: 'Fraises', one: 'une couche de fraises', many: 'couches de fraises', none: 'fraises', color: '#fff6ee', thickness: 0.6 },
  glazeChoco: { family: 'glaze', label: 'Glaçage chocolat', one: 'un glaçage chocolat', many: 'glaçages chocolat', none: 'glaçage chocolat', color: '#4f2c1d', thickness: 0.35 },
  glazePink: { family: 'glaze', label: 'Glaçage rose', one: 'un glaçage rose', many: 'glaçages roses', none: 'glaçage rose', color: '#ff8fb1', thickness: 0.35 },
  glazeWhite: { family: 'glaze', label: 'Glaçage blanc', one: 'un glaçage blanc', many: 'glaçages blancs', none: 'glaçage blanc', color: '#fffaf2', thickness: 0.35 },
};

export function isKindId(value: unknown): value is KindId {
  return typeof value === 'string' && (KIND_IDS as readonly string[]).includes(value);
}

/** A clue can talk about one ingredient or about every sponge / every cream. */
export type Target = KindId | 'sponge' | 'cream';

const FAMILY_WORDS: Record<'sponge' | 'cream', Pick<Kind, 'one' | 'many' | 'none'>> = {
  sponge: { one: 'une génoise', many: 'génoises', none: 'génoise' },
  cream: { one: 'une crème', many: 'crèmes', none: 'crème' },
};

export function isTarget(value: unknown): value is Target {
  return value === 'sponge' || value === 'cream' || isKindId(value);
}

export function matches(kind: KindId, target: Target): boolean {
  return kind === target || KINDS[kind].family === target;
}

function words(target: Target): Pick<Kind, 'one' | 'many' | 'none'> {
  return target === 'sponge' || target === 'cream' ? FAMILY_WORDS[target] : KINDS[target];
}

// -----------------------------------------------
// CLUES
// -----------------------------------------------

export type Clue =
  | { type: 'count'; target: Target; count: number }
  | { type: 'at'; index: number; target: Target }
  /** Somewhere, a `lower` layer lies right under an `upper` one. */
  | { type: 'under'; lower: Target; upper: Target }
  /** No `a` layer touches a `b` layer. */
  | { type: 'never'; a: Target; b: Target };

export function holds(clue: Clue, cake: readonly KindId[]): boolean {
  switch (clue.type) {
    case 'count':
      return cake.filter((kind) => matches(kind, clue.target)).length === clue.count;
    case 'at':
      return clue.index < cake.length && matches(cake[clue.index], clue.target);
    case 'under':
      return cake.some((kind, i) => i + 1 < cake.length && matches(kind, clue.lower) && matches(cake[i + 1], clue.upper));
    case 'never':
      return cake.every(
        (kind, i) =>
          i + 1 >= cake.length ||
          !((matches(kind, clue.a) && matches(cake[i + 1], clue.b)) || (matches(kind, clue.b) && matches(cake[i + 1], clue.a))),
      );
  }
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Counts only talk about the hidden layers: what the model shows needs no clue. */
export function clueText(clue: Clue, layers: readonly KindId[], hidden: readonly boolean[]): string {
  switch (clue.type) {
    case 'count': {
      const { many, none, one } = words(clue.target);
      const shown = layers.filter((kind, i) => !hidden[i] && matches(kind, clue.target)).length;
      const count = clue.count - shown;
      const where = hidden.every(Boolean) ? 'Dans le gâteau' : 'Parmi les « ? »';
      if (count === 0) return `${where}, il n’y a pas de ${none}.`;
      if (count === 1) return `${where}, il y a exactement ${one}.`;
      return `${where}, il y a exactement ${count} ${many}.`;
    }
    case 'at': {
      const where = clue.index === 0 ? 'Tout en bas' : clue.index === layers.length - 1 ? 'Tout en haut' : `Couche n°${clue.index + 1} en partant du bas`;
      return `${where} : ${words(clue.target).one}.`;
    }
    case 'under':
      // "Quelque part": without it, the clue reads like a rule about every such layer.
      return `Quelque part, ${words(clue.lower).one} est juste sous ${words(clue.upper).one}.`;
    case 'never':
      return `${capital(words(clue.a).one)} ne touche jamais ${words(clue.b).one}.`;
  }
}

// -----------------------------------------------
// SOLVER
// -----------------------------------------------

/** Every cake of `layers` layers made from `pool` that follows the cake rules. */
export function allCakes(pool: readonly KindId[], layers: number): KindId[][] {
  const sponges = pool.filter((kind) => KINDS[kind].family === 'sponge');
  const glazes = pool.filter((kind) => KINDS[kind].family === 'glaze');
  const middles = pool.filter((kind) => KINDS[kind].family !== 'glaze');
  const cakes: KindId[][] = [];
  const cake: KindId[] = [];
  const grow = () => {
    const index = cake.length;
    const choices = index === 0 ? sponges : index === layers - 1 ? glazes : middles;
    for (const kind of choices) {
      if (index > 0 && cake[index - 1] === kind) continue;
      cake.push(kind);
      if (cake.length === layers) cakes.push([...cake]);
      else grow();
      cake.pop();
    }
  };
  grow();
  return cakes;
}

export interface Puzzle {
  pool: KindId[];
  /** The cake to make, bottom first. */
  layers: KindId[];
  /** Layers the model hides behind a "?". */
  hidden: boolean[];
  clues: Clue[];
}

/** The cakes that fit what the player is shown: the visible layers and the clues. */
export function solutions(puzzle: Omit<Puzzle, 'layers'> & { layers: readonly (KindId | null)[] }, candidates = allCakes(puzzle.pool, puzzle.layers.length)): KindId[][] {
  return candidates.filter(
    (cake) => puzzle.layers.every((kind, i) => puzzle.hidden[i] || cake[i] === kind) && puzzle.clues.every((clue) => holds(clue, cake)),
  );
}

// -----------------------------------------------
// HUMAN SOLVER
// -----------------------------------------------
// Reads the clues one at a time and crosses out what each one forbids, the way a player does.
// Never "what if this layer were X": a chain of hypotheses feels like guessing to a player.

/** One bit per ingredient (index in KIND_IDS): a layer's still-possible ingredients. */
type Domains = number[];

const bit = (kind: KindId) => 1 << KIND_IDS.indexOf(kind);
const masks = new Map<Target, number>();
const maskOf = (target: Target) => {
  let mask = masks.get(target);
  if (mask === undefined) masks.set(target, (mask = KIND_IDS.reduce((m, kind, i) => (matches(kind, target) ? m | (1 << i) : m), 0)));
  return mask;
};
const isSingle = (mask: number) => mask !== 0 && (mask & (mask - 1)) === 0;
const sizeOf = (mask: number) => {
  let size = 0;
  for (let m = mask; m; m &= m - 1) size++;
  return size;
};

/** Crosses out what each clue and rule forbids, until nothing moves; false when the cake became impossible. */
function propagate(domains: Domains, clues: readonly Clue[]): boolean {
  const mask = maskOf;
  const n = domains.length;
  let changed = true;
  const keep = (i: number, allowed: number) => {
    const next = domains[i] & allowed;
    if (next !== domains[i]) {
      domains[i] = next;
      changed = true;
    }
  };
  while (changed) {
    changed = false;
    for (let i = 0; i < n; i++) {
      if (domains[i] === 0) return false;
      if (!isSingle(domains[i])) continue;
      if (i > 0) keep(i - 1, ~domains[i]);
      if (i + 1 < n) keep(i + 1, ~domains[i]);
    }
    for (const clue of clues) {
      switch (clue.type) {
        case 'at':
          keep(clue.index, mask(clue.target));
          break;
        case 'count': {
          const m = mask(clue.target);
          let must = 0;
          let may = 0;
          for (const d of domains) {
            if ((d & ~m) === 0) must++;
            if (d & m) may++;
          }
          if (must > clue.count || may < clue.count) return false;
          for (let i = 0; i < n; i++) {
            if (must === clue.count && (domains[i] & ~m) !== 0) keep(i, ~m);
            if (may === clue.count && (domains[i] & m) !== 0) keep(i, m);
          }
          break;
        }
        case 'under': {
          const lower = mask(clue.lower);
          const upper = mask(clue.upper);
          let spot = -1;
          let spots = 0;
          for (let i = 0; i + 1 < n; i++) {
            if (domains[i] & lower && domains[i + 1] & upper) [spot, spots] = [i, spots + 1];
          }
          if (spots === 0) return false;
          if (spots === 1) {
            keep(spot, lower);
            keep(spot + 1, upper);
          }
          break;
        }
        case 'never': {
          const a = mask(clue.a);
          const b = mask(clue.b);
          for (let i = 0; i < n; i++) {
            for (const j of [i - 1, i + 1]) {
              if (j < 0 || j >= n) continue;
              if ((domains[i] & ~a) === 0) keep(j, ~b);
              if ((domains[i] & ~b) === 0) keep(j, ~a);
            }
          }
          break;
        }
      }
    }
  }
  return domains.every((d) => d !== 0);
}

/** What is left possible for each layer once the player has crossed out all they can; null if contradictory. */
function humanDomains(puzzle: Puzzle): Domains | null {
  const last = puzzle.layers.length - 1;
  const inPool = (family: (f: Family) => boolean) => puzzle.pool.reduce((m, k) => (family(KINDS[k].family) ? m | bit(k) : m), 0);
  const bottom = inPool((f) => f === 'sponge');
  const top = inPool((f) => f === 'glaze');
  const middle = inPool((f) => f !== 'glaze');
  const domains: Domains = puzzle.layers.map((kind, i) => (!puzzle.hidden[i] ? bit(kind) : i === 0 ? bottom : i === last ? top : middle));
  return propagate(domains, puzzle.clues) ? domains : null;
}

/** How many choices the player still has to rule out: 0 means solved. */
function openChoices(puzzle: Puzzle): number {
  const domains = humanDomains(puzzle);
  return domains === null ? Infinity : domains.reduce((sum, d) => sum + sizeOf(d) - 1, 0);
}

// -----------------------------------------------
// LEVELS AND GENERATION
// -----------------------------------------------

export interface PastryTier {
  layers: number;
  /** How many layers the model hides; all of them means clues only. */
  hidden: number;
  sponges: number;
  creams: number;
  glazes: number;
}

/** One tier per difficulty, easiest first. */
export const PASTRY_TIERS: readonly PastryTier[] = [
  { layers: 4, hidden: 0, sponges: 2, creams: 2, glazes: 2 },
  { layers: 6, hidden: 0, sponges: 3, creams: 3, glazes: 3 },
  { layers: 6, hidden: 3, sponges: 2, creams: 2, glazes: 2 },
  { layers: 7, hidden: 5, sponges: 2, creams: 2, glazes: 2 },
  { layers: 7, hidden: 7, sponges: 2, creams: 2, glazes: 2 },
];

export const PASTRY_LEVELS: LevelTable = [1, 2, 3, 4, 5];

/** Past this many clues a card gets too long to read on a phone: draw another cake. */
const MAX_CLUES = 8;

function pick<T>(list: readonly T[], count: number, random: () => number): T[] {
  return shuffled(list, random).slice(0, count);
}

function familyKinds(family: Family): KindId[] {
  return KIND_IDS.filter((kind) => KINDS[kind].family === family);
}

function randomCake(pool: readonly KindId[], layers: number, random: () => number): KindId[] {
  const cakes = allCakes(pool, layers).filter((cake) => cake.filter((kind) => KINDS[kind].family === 'sponge').length >= Math.min(2, layers - 2));
  return cakes[Math.floor(random() * cakes.length)];
}

/** Every true clue about `cake`, worth giving: none about the visible layers alone. */
function trueClues(cake: readonly KindId[], pool: readonly KindId[], hidden: readonly boolean[]): Clue[] {
  const targets: Target[] = [...pool.filter((kind) => KINDS[kind].family !== 'glaze'), 'sponge', 'cream'];
  const glazes = pool.filter((kind) => KINDS[kind].family === 'glaze');
  const clues: Clue[] = [];
  for (const target of [...targets, ...glazes]) {
    clues.push({ type: 'count', target, count: cake.filter((kind) => matches(kind, target)).length });
  }
  // Positions only at the ends: "the 4th layer" makes the player count thin layers on a picture.
  cake.forEach((kind, index) => {
    if (!hidden[index] || (index !== 0 && index !== cake.length - 1)) return;
    clues.push({ type: 'at', index, target: kind });
    if (KINDS[kind].family === 'sponge' || KINDS[kind].family === 'cream') clues.push({ type: 'at', index, target: KINDS[kind].family as Target });
  });
  for (const lower of targets) {
    for (const upper of targets) {
      if (lower === upper) continue;
      // Only when every matching pair is hidden: a pair the model shows reads as a wasted clue.
      const pairs = cake.flatMap((kind, i) => (i + 1 < cake.length && matches(kind, lower) && matches(cake[i + 1], upper) ? [i] : []));
      if (pairs.length > 0 && pairs.every((i) => hidden[i] && hidden[i + 1])) clues.push({ type: 'under', lower, upper });
    }
  }
  targets.forEach((a, i) => {
    for (const b of targets.slice(i + 1)) {
      if (KIND_IDS.some((kind) => matches(kind, a) && matches(kind, b))) continue;
      const present = (target: Target) => cake.some((kind) => matches(kind, target));
      const clue: Clue = { type: 'never', a, b };
      if (present(a) && present(b) && holds(clue, cake)) clues.push(clue);
    }
  });
  return clues;
}

/** "At" clues give a layer away: worth less, so the solver prefers the ones that make you think. */
const weight = (clue: Clue) => (clue.type === 'at' ? 0.35 : 1);

export function generatePuzzle(tier: PastryTier, random: () => number = Math.random): Puzzle {
  for (;;) {
    const pool = [
      ...pick(familyKinds('sponge'), tier.sponges, random),
      ...pick(familyKinds('cream'), tier.creams, random),
      'jam' as const,
      'fruit' as const,
      ...pick(familyKinds('glaze'), tier.glazes, random),
    ];
    const layers = randomCake(pool, tier.layers, random);
    const hiddenIndexes = new Set(pick(layers.map((_, i) => i), tier.hidden, random));
    const hidden = layers.map((_, i) => hiddenIndexes.has(i));
    const puzzle: Puzzle = { pool, layers, hidden, clues: [] };
    if (tier.hidden === 0) return puzzle;

    // Clues are added until the human solver rebuilds the cake: unique AND reachable by deduction.
    const unused = shuffled(trueClues(layers, pool, hidden), random);
    // A cake that even every true clue together cannot pin down: draw another before the slow part.
    if (openChoices({ ...puzzle, clues: unused }) !== 0) continue;
    /** The clue among `clues` that lets the player cross out the most, or null if none helps. */
    const bestOf = (clues: readonly Clue[]): Clue | null => {
      const before = openChoices(puzzle);
      let best: Clue | null = null;
      let bestScore = 0;
      for (const clue of clues) {
        const score = (before - openChoices({ ...puzzle, clues: [...puzzle.clues, clue] })) * weight(clue);
        if (score > bestScore) [best, bestScore] = [clue, score];
      }
      return best;
    };
    let open = openChoices(puzzle);
    while (open > 0 && puzzle.clues.length <= MAX_CLUES) {
      // A random sample first, all the clues only when it stalls.
      const best = bestOf(unused.slice(0, 8)) ?? bestOf(unused);
      if (best === null) break;
      unused.splice(unused.indexOf(best), 1);
      puzzle.clues.push(best);
      open = openChoices(puzzle);
    }
    if (open !== 0) continue;
    // Drop the clues the others already make useless.
    for (const clue of [...puzzle.clues]) {
      const without = puzzle.clues.filter((other) => other !== clue);
      if (openChoices({ ...puzzle, clues: without }) === 0) puzzle.clues = without;
    }
    if (puzzle.clues.length <= MAX_CLUES) {
      puzzle.clues = shuffled(puzzle.clues, random);
      return puzzle;
    }
  }
}

/** 3 stars without a mistake, 2 with one, 1 otherwise. */
export function starsFor(mistakes: number): number {
  if (mistakes === 0) return 3;
  return mistakes <= 1 ? 2 : 1;
}

export function cakeHeight(layers: readonly KindId[]): number {
  return layers.reduce((sum, kind) => sum + KINDS[kind].thickness, 0);
}
