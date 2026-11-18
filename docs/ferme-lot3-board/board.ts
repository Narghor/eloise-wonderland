import { C, OUTLINE, ROOF_RED, IRON, IRON_LIGHT, TILE, canvas } from 'C:/Users/Flo/Eloise-Wonderland/src/games/farm/farmPaint';
import type { Sprite } from 'C:/Users/Flo/Eloise-Wonderland/src/games/farm/farmPaint';
import { objectSprite, fenceSprite, perchedSprite, glowsOf } from 'C:/Users/Flo/Eloise-Wonderland/src/games/farm/farmArt';
import { mulberry32 } from 'C:/Users/Flo/Eloise-Wonderland/src/random';
import * as A from './lot3Art';
import type { Glow } from './lot3Art';

// -----------------------------------------------
// THE DECORATIONS
// -----------------------------------------------

interface Item {
  name: string;
  level: number;
  price: number;
  size: [number, number];
  art: () => Sprite;
  glows?: Glow[];
  flat?: boolean;
  note?: string;
}

const NOW: Item[] = [
  { name: 'Torche', level: 6, price: 25, size: [1, 1], art: () => A.torch(), glows: A.torchGlows(), note: 'Se pose sur une barrière, un muret, un banc' },
  { name: 'Pas japonais', level: 7, price: 8, size: [1, 1], art: A.steppingStones, flat: true, note: 'À plat, on marche dessus' },
  { name: 'Muret de pierre', level: 8, price: 20, size: [1, 1], art: () => A.stoneWall(2 | 8), note: 'Se raccorde, porte une petite déco' },
  { name: 'Topiaire en boule', level: 12, price: 150, size: [1, 1], art: A.topiaryBall },
  { name: 'Marelle', level: 14, price: 60, size: [2, 1], art: A.hopscotch, flat: true, note: 'À plat' },
  { name: 'Bocal à lucioles', level: 16, price: 300, size: [1, 1], art: A.fireflyJar, glows: A.fireflyGlows, note: 'Se pose, brille la nuit' },
  { name: 'Cadran solaire', level: 17, price: 600, size: [1, 1], art: A.sundial },
  { name: 'Salon en osier', level: 19, price: 1500, size: [2, 1], art: A.wickerSet },
  { name: 'Bac à sable', level: 20, price: 1000, size: [2, 1], art: A.sandbox },
];

const LATE: Item[] = [
  { name: 'Topiaire lapin', level: 22, price: 1500, size: [1, 1], art: A.topiaryRabbit },
  { name: 'Lanternes de papier', level: 22, price: 2500, size: [2, 1], art: A.paperLanterns, glows: A.paperLanternGlows, note: 'Brillent la nuit' },
  { name: 'Vasque sur colonne', level: 23, price: 2000, size: [1, 1], art: A.columnUrn },
  { name: 'Statue de biche', level: 23, price: 3500, size: [1, 1], art: A.doeStatue },
  { name: 'Toboggan', level: 24, price: 4000, size: [2, 1], art: A.slide },
  { name: 'Topiaire cœur', level: 25, price: 2500, size: [1, 1], art: A.topiaryHeart },
  { name: 'Cabane à outils', level: 25, price: 6000, size: [2, 2], art: A.toolShed },
  { name: 'Tipi', level: 26, price: 8000, size: [2, 2], art: A.tipi },
  { name: 'Porte ronde', level: 27, price: 5000, size: [2, 1], art: A.moonGate, note: 'Se raccorde au muret' },
  { name: 'Cascade de rocaille', level: 28, price: 15000, size: [2, 2], art: A.rockery },
  { name: 'Roulotte', level: 29, price: 25000, size: [3, 2], art: A.roulotte, glows: A.roulotteGlows },
  { name: 'Carrosse fleuri', level: 30, price: 40000, size: [3, 2], art: A.caleche, glows: A.calecheGlows },
];

// -----------------------------------------------
// RARE VARIANTS: the same drawing, other colours, a touch
// -----------------------------------------------

type Rarity = 'rare' | 'epic' | 'legendary';
type Touch = 'sparkle' | 'petals' | 'icing' | 'veins' | 'dots' | 'rainbow' | 'blooms';

interface Variant {
  name: string;
  of: string;
  base: string;
  level: number;
  rarity: Rarity;
  swaps: [string, string][];
  touch?: Touch;
  /** The colours the touch is painted on; all the swapped ones when absent. */
  touchOn?: string[];
  extra?: (put: (x: number, y: number, col: string) => void, W: number, H: number) => void;
  glowTint?: string;
}

const ICING_ROOF = ['#fffaf2', '#f6efe4', '#e6dccd', '#cfc3b1'];
const GOLD_ROOF = ['#fff1b0', '#f2c94c', '#d9a339', '#b07d22'];
const WHITE_MARBLE = ['#ffffff', '#efe9f2', '#d6cfe0'];
const pairs = (from: readonly string[], to: readonly string[]): [string, string][] => from.map((f, i) => [f, to[i]]);

const VARIANTS: Variant[] = [
  { name: 'Roses bleues', of: 'Parterre de roses', base: 'flowersPink', level: 2, rarity: 'rare', swaps: pairs(['#ff8fb8', '#ffc0d6', '#e8789e'], ['#7ea4e6', '#b9d0f7', '#5d80c4']) },
  { name: 'Pot en faïence', of: 'Pot de fleurs', base: 'flowerPot', level: 3, rarity: 'rare', swaps: pairs([C.brick, '#e08a6a', '#d4764f', C.brickDark], ['#dfe9f5', '#ffffff', '#f4f8fc', '#c4d5ea']), touch: 'dots', touchOn: ['#d4764f'] },
  { name: 'Tulipes perroquet', of: 'Massif de tulipes', base: 'tulips', level: 5, rarity: 'rare', swaps: pairs(['#ff8a96', '#b4353f', '#ff8fb8', '#e8789e', '#f2b632', '#a77fd6', '#c9a8f0', '#8460b4'], ['#ffd84a', '#ffd84a', '#ffffff', '#ff4f8a', '#e0475b', '#fff6e0', '#ffffff', '#7d4fc0']) },
  {
    name: 'Nichoir en pain d’épices', of: 'Nichoir', base: 'birdhouse', level: 9, rarity: 'rare',
    swaps: [...pairs(['#6a9fd8', '#8fbbe8', '#5385bd', '#5c8fc8', '#4d7fb0'], ['#c98a4a', '#e3ab66', '#a86a3a', '#b9773f', '#94552a']), ...pairs(ROOF_RED, ICING_ROOF)],
    touch: 'icing', touchOn: [...ROOF_RED],
  },
  {
    name: 'Hortensias de lune', of: 'Hortensias', base: 'hydrangeas', level: 12, rarity: 'rare',
    swaps: [...pairs(['#7ea4e6', '#b9d0f7', '#5d80c4'], ['#eef3ff', '#ffffff', '#c9d6f0']), ...pairs(['#c49ae0', '#e6caf5', '#9d72bf'], ['#f1ecff', '#ffffff', '#d3c8ee']), ...pairs(['#f2a0c4', '#ffd0e4', '#d27aa3'], ['#fff0f6', '#ffffff', '#ecc9da'])],
    touch: 'sparkle',
  },
  { name: 'Parasol arc-en-ciel', of: 'Parasol', base: 'parasol', level: 13, rarity: 'rare', swaps: [...pairs(['#ffb0a3', '#ef7a6d', '#cf5f55', '#b04a45'], ['#ffb0a3', '#ef7a6d', '#cf5f55', '#b04a45']), ...pairs(['#ffffff', '#fff6e0', '#ecdcc0', '#d8c6a6'], ['#ffffff', '#fff6e0', '#ecdcc0', '#d8c6a6'])], touch: 'rainbow' },
  {
    name: 'Banc des amoureux', of: 'Banc', base: 'bench', level: 4, rarity: 'epic',
    swaps: [...pairs([C.woodLight, C.wood, C.woodDark, '#ecc08a'], ['#fff6f8', '#f6e6ea', '#e3c9d0', '#ffffff']), ...pairs([IRON, IRON_LIGHT], ['#c94a76', '#f06a96'])],
    touch: 'petals', touchOn: [C.woodLight, C.wood, '#ecc08a'],
    extra: (put) => {
      for (const [x, y] of [[13, 1], [15, 1], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [13, 3], [14, 3], [15, 3], [14, 4]] as const) put(x, y, '#f06a96');
      put(13, 2, '#ffb3cc');
    },
  },
  {
    name: 'Lanterne de fée', of: 'Lanterne', base: 'lantern', level: 8, rarity: 'epic',
    swaps: pairs(['#5b4a48', '#3f3331', C.glow, '#fff3c4'], ['#b8b2d8', '#8f86bf', '#9fe3ff', '#e6fbff']),
    touch: 'sparkle', glowTint: '140, 220, 255',
  },
  {
    name: 'Bain d’oiseaux en marbre rose', of: 'Bain d’oiseaux', base: 'birdBath', level: 9, rarity: 'epic',
    swaps: [...pairs([C.stone, C.stoneDark, '#ffffff', '#f6f1e8'], ['#f6d6dc', '#e0aeb8', '#fff0f3', '#fbe4e8']), ...pairs(['#8a5a3b', '#f08a4b', '#6f4630'], ['#ffffff', '#e8e8f0', '#dfe3ea'])],
    touch: 'veins', touchOn: [C.stone, '#f6f1e8'],
  },
  {
    name: 'Balancelle fleurie', of: 'Balancelle', base: 'porchSwing', level: 21, rarity: 'epic',
    swaps: pairs(['#c9f0de', '#8fd6b8', '#62b394', '#46917a'], ['#ffe0ea', '#fbc4d2', '#ec94ac', '#cc6e8a']),
    touch: 'blooms', touchOn: ['#c9f0de', '#8fd6b8', '#62b394', '#ffffff', '#fff6e0', '#ecdcc0'],
  },
  {
    name: 'Puits aux souhaits', of: 'Puits', base: 'well', level: 5, rarity: 'legendary',
    swaps: [...pairs(ROOF_RED, GOLD_ROOF), ...pairs([C.greyLight, C.grey, C.greyDark], WHITE_MARBLE), ...pairs(['#4d7fb0', '#5c9fd6', '#bfe2f7', '#8ec6e8'], ['#2f9a9a', '#4fc4bc', '#d8fff6', '#9fe8de'])],
    touch: 'sparkle', touchOn: [...ROOF_RED, '#4d7fb0', '#5c9fd6'],
    extra: (put) => {
      for (const [x, y] of [[9, 22], [15, 23], [17, 22]] as const) put(x, y, C.gold);
    },
    glowTint: '255, 220, 120',
  },
];

// -----------------------------------------------
// THE LOTUS POND, TO REDO: three versions (tri of 18/11)
// -----------------------------------------------
// The first try only recoloured the pond. Each version here draws big lotus flowers over it, so the legendary reads
// as something new at a glance. Coordinates are the canvas's (the sprite's plus its 1 px margin).

type LotusTones = { light: string; base: string; dark: string; heart: string };
const LOTUS_PINK: LotusTones = { light: '#ffe0ea', base: '#ff8fb8', dark: '#e0608f', heart: '#ffd84a' };
const LOTUS_WHITE: LotusTones = { light: '#ffffff', base: '#fff0f6', dark: '#e6c3d4', heart: '#ffd84a' };
const LOTUS_GOLD: LotusTones = { light: '#fff6c8', base: '#ffd84a', dark: '#d9a339', heart: '#ffffff' };
const LOTUS_ROWS = [
  '....a....',
  '...aba...',
  'c..aba..c',
  'cb.aba.bc',
  'cbbbhbbbc',
  '.cbbbbbc.',
  'LLLLlLLLL',
];
const SMALL_LOTUS_ROWS = [
  '...a...',
  '..aba..',
  'c.aba.c',
  'cbbhbbc',
  '.cbbbc.',
  '.LLlLL.',
];
const FROG_ROWS = [
  '.p.p.p.',
  '.ppppp.',
  '.aKaKa.',
  '.abbba.',
  '.bbbbd.',
  'LLLlLLL',
];

function stamp(put: (x: number, y: number, col: string) => void, rows: string[], pal: Record<string, string>, x: number, y: number): void {
  const half = rows[0].length >> 1;
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '.') put(x - half + i, y - rows.length + 1 + j, pal[ch]);
  }));
}

/** A lotus standing on its pad, centred on x, its pad on row y. */
function lotus(put: (x: number, y: number, col: string) => void, x: number, y: number, t: LotusTones, small = false): void {
  stamp(put, small ? SMALL_LOTUS_ROWS : LOTUS_ROWS, { a: t.light, b: t.base, c: t.dark, h: t.heart, L: C.leafDark, l: C.leafLight }, x, y);
}

/** A crowned golden frog on its pad, centred on x, its pad on row y. */
function goldFrog(put: (x: number, y: number, col: string) => void, x: number, y: number): void {
  stamp(put, FROG_ROWS, { p: '#ff8fb8', a: '#fff1b0', b: C.gold, d: C.goldDark, K: OUTLINE, L: C.leafDark, l: C.leafLight }, x, y);
}

const POND_STONE = ['#efe1c8', '#d9c4a2', '#b49a76'];
const POND_WATER = ['#3f7fb3', '#4f93c8', '#5ea6db'];
const POND_FLOWERS = ['#ff9ec4', '#ffd0e4', '#fff1a0'];
const KOI = ['#ff9e4a', '#ffc58a'];
/** The small flowers of the pond become plain pads, so only the lotus flower. */
const PADS_FOR_FLOWERS = pairs(POND_FLOWERS, [C.leaf, C.leafLight, C.leaf]);

/** Gold specks every other stone of the rim. */
function goldRim(put: (x: number, y: number, col: string) => void): void {
  for (let i = 0; i < 20; i += 2) {
    const a = (i / 20) * Math.PI * 2;
    put(Math.round(16 + Math.cos(a) * 13), Math.round(14 + Math.sin(a) * 6.5), C.gold);
  }
}

const LOTUS_VERSIONS: (Variant & { pitch: string })[] = [
  {
    name: 'A · Lotus roses', of: 'Bassin aux nénuphars', base: 'lilyPond', level: 14, rarity: 'legendary',
    pitch: 'Marbre blanc semé d’or, eau turquoise qui scintille, trois grands lotus roses et blancs, les carpes deviennent dorées.',
    swaps: [...pairs(POND_STONE, WHITE_MARBLE), ...pairs(POND_WATER, ['#2f8f9a', '#3fb0b0', '#62cfc6']), ...pairs(KOI, [C.gold, '#fff1b0']), ...PADS_FOR_FLOWERS],
    touch: 'sparkle', touchOn: POND_WATER,
    extra: (put) => {
      goldRim(put);
      lotus(put, 10, 17, LOTUS_PINK);
      lotus(put, 22, 19, LOTUS_PINK);
      lotus(put, 22, 12, LOTUS_WHITE, true);
    },
    glowTint: '255, 190, 220',
  },
  {
    name: 'B · Lotus d’or', of: 'Bassin aux nénuphars', base: 'lilyPond', level: 14, rarity: 'legendary',
    pitch: 'Eau bleu nuit pleine d’étoiles, un grand lotus d’or au milieu qui brille la nuit, des lotus blancs autour.',
    swaps: [...pairs(POND_STONE, WHITE_MARBLE), ...pairs(POND_WATER, ['#24407a', '#2f5596', '#3f6cb4']), ...PADS_FOR_FLOWERS],
    touch: 'sparkle', touchOn: POND_WATER,
    extra: (put) => {
      goldRim(put);
      lotus(put, 16, 18, LOTUS_GOLD);
      lotus(put, 8, 15, LOTUS_WHITE, true);
      lotus(put, 24, 15, LOTUS_WHITE, true);
      for (const [x, y] of [[11, 19], [21, 12], [12, 11]] as const) put(x, y, '#ffffff');
    },
    glowTint: '255, 220, 120',
  },
  {
    name: 'C · La grenouille d’or', of: 'Bassin aux nénuphars', base: 'lilyPond', level: 14, rarity: 'legendary',
    pitch: 'Le bassin de A, et une grenouille d’or couronnée assise sur un nénuphar entre deux lotus.',
    swaps: [...pairs(POND_STONE, WHITE_MARBLE), ...pairs(POND_WATER, ['#2f8f9a', '#3fb0b0', '#62cfc6']), ...pairs(KOI, [C.gold, '#fff1b0']), ...PADS_FOR_FLOWERS],
    touch: 'sparkle', touchOn: POND_WATER,
    extra: (put) => {
      goldRim(put);
      lotus(put, 9, 17, LOTUS_PINK);
      lotus(put, 23, 18, LOTUS_PINK, true);
      goldFrog(put, 17, 19);
    },
    glowTint: '255, 220, 120',
  },
];

const VARIANT_GLOWS: Record<string, Glow[]> = {
  well: [{ x: 13, y: 22, r: 18 }],
  lilyPond: [{ x: 16, y: 15, r: 20 }],
};

const rgb = (hex: string): number => parseInt(hex.slice(1), 16);
const RAINBOW = [
  ['#ffb3b3', '#f06a6a', '#c94a4a'], ['#ffd2a0', '#f5a04a', '#d07a2a'], ['#fff1a0', '#ffd84a', '#e0ae2a'],
  ['#c8efb0', '#7cc456', '#5aa54a'], ['#b9d0f7', '#6a98cc', '#4f78ab'], ['#dccaf2', '#ab8fd8', '#8a6dbb'],
];
const RANK: Record<string, number> = { '#ffb0a3': 0, '#ef7a6d': 1, '#cf5f55': 2, '#b04a45': 2, '#ffffff': 0, '#fff6e0': 1, '#ecdcc0': 2, '#d8c6a6': 2 };

function variantSprite(v: Variant): Sprite {
  const base = objectSprite(v.base as never, 'face');
  const out = canvas(base.width, base.height);
  const g = out.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(base, 0, 0);
  const W = out.width;
  const H = out.height;
  const image = g.getImageData(0, 0, W, H);
  const d = image.data;
  const swaps = new Map(v.swaps.map(([f, t]) => [rgb(f), rgb(t)]));
  const touchOn = new Set((v.touchOn ?? v.swaps.map(([f]) => f)).map(rgb));
  const rank = new Map(Object.entries(RANK).map(([k, r]) => [rgb(k), r]));
  const marked = new Uint8Array(W * H);
  const ranks = new Int8Array(W * H).fill(-1);
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    if (d[i + 3] < 255) continue;
    const col = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    if (touchOn.has(col)) marked[p] = 1;
    if (rank.has(col)) ranks[p] = rank.get(col)!;
    const to = swaps.get(col);
    if (to !== undefined) {
      d[i] = to >> 16;
      d[i + 1] = (to >> 8) & 0xff;
      d[i + 2] = to & 0xff;
    }
  }
  const added: number[] = [];
  const put = (x: number, y: number, hex: string, overTransparent = false) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    if (d[i + 3] < 255 && !overTransparent) return;
    if (d[i + 3] < 255) added.push(y * W + x);
    const c = rgb(hex);
    d[i] = c >> 16;
    d[i + 1] = (c >> 8) & 0xff;
    d[i + 2] = c & 0xff;
    d[i + 3] = 255;
  };
  const random = mulberry32(W * 131 + H);
  const top = (x: number) => {
    for (let y = 0; y < H; y++) if (marked[y * W + x]) return y;
    return -1;
  };
  const bottom = (x: number) => {
    for (let y = H - 1; y >= 0; y--) if (marked[y * W + x]) return y;
    return -1;
  };
  if (v.touch === 'icing') {
    for (let x = 0; x < W; x++) {
      const t = top(x);
      if (t < 0) continue;
      const b = bottom(x);
      const drip = [0, 1, 2, 1, 0, 0, 1, 0][x % 8];
      for (let k = 0; k <= drip; k++) put(x, b + 1 + k, '#fffaf2');
      if (x % 3 === 1) put(x, t + 2, ['#e0475b', '#5aa54a', '#5c9fd6'][(x / 3 | 0) % 3]);
    }
  }
  if (v.touch === 'rainbow') {
    let x0 = W;
    let x1 = 0;
    for (let p = 0; p < W * H; p++) if (ranks[p] >= 0 && Math.floor(p / W) < 12) { x0 = Math.min(x0, p % W); x1 = Math.max(x1, p % W); }
    for (let p = 0; p < W * H; p++) {
      if (ranks[p] < 0 || Math.floor(p / W) >= 12) continue;
      const band = Math.min(5, Math.floor(((p % W) - x0) / ((x1 - x0 + 1) / 6)));
      put(p % W, Math.floor(p / W), RAINBOW[band][ranks[p]]);
    }
  }
  if (v.touch === 'blooms') {
    for (let x = 1; x < W - 1; x += 3) {
      const t = top(x);
      if (t < 0 || t > 3) continue;
      const col = ['#ff8fb8', '#ffffff', '#ffd84a', '#d6b8f5'][(x / 3 | 0) % 4];
      put(x, t, col, true);
      put(x - 1, t + 1, col, true);
      put(x + 1, t + 1, col, true);
      put(x, t + 1, C.gold, true);
      put(x, t + 2, col, true);
    }
    for (let x = 2; x < W; x += 5) {
      const b = bottom(x);
      if (b < 0 || b > 10) continue;
      for (let k = 1; k <= 2 + (x % 3); k++) put(x, b + k, k % 2 ? '#b58ee0' : '#d6b8f5', true);
    }
  }
  if (v.touch === 'petals' || v.touch === 'sparkle' || v.touch === 'veins' || v.touch === 'dots') {
    for (let p = 0; p < W * H; p++) {
      if (!marked[p]) continue;
      const x = p % W;
      const y = Math.floor(p / W);
      if (v.touch === 'petals' && random() < 0.12) put(x, y, random() < 0.5 ? '#ffffff' : '#f06a96');
      if (v.touch === 'sparkle' && random() < 0.07) put(x, y, '#fff6c8');
      if (v.touch === 'veins' && (x * 2 + y) % 7 === 0 && random() < 0.6) put(x, y, '#d998a6');
      if (v.touch === 'dots' && x % 2 === 0 && y % 2 === 0) put(x, y, '#4f78ab');
    }
  }
  if (v.extra) v.extra((x, y, col) => put(x, y, col, true), W, H);
  // What the extra drew outside the drawing gets the same dark outline as the rest.
  const outline = rgb(OUTLINE);
  for (const p of added) {
    const x = p % W;
    const y = Math.floor(p / W);
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const i = (ny * W + nx) * 4;
      if (d[i + 3] === 255) continue;
      d[i] = outline >> 16;
      d[i + 1] = (outline >> 8) & 0xff;
      d[i + 2] = outline & 0xff;
      d[i + 3] = 255;
    }
  }
  g.putImageData(image, 0, 0);
  return out;
}

// -----------------------------------------------
// STAGING: grass, the footprint, day and night
// -----------------------------------------------

const GRASS = ['#a0cc6c', '#b2d77c', '#8ebb5e', '#98c86e'];

function stage(cols: number, rows: number, extraTop: number): HTMLCanvasElement {
  const pad = 4;
  const c = canvas(cols * TILE + 2 * pad, rows * TILE + extraTop + 2 * pad);
  const g = c.getContext('2d')!;
  const r = mulberry32(cols * 7 + rows * 13 + extraTop);
  g.fillStyle = GRASS[0];
  g.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < c.width; x += 2) {
      const n = r();
      if (n < 0.12) g.fillStyle = GRASS[1];
      else if (n < 0.22) g.fillStyle = GRASS[2];
      else if (n < 0.3) g.fillStyle = GRASS[3];
      else continue;
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

function footprint(c: HTMLCanvasElement, x0: number, y0: number, cols: number, rows: number): void {
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(255, 255, 255, 0.22)';
  for (let i = 0; i <= cols; i++) g.fillRect(x0 + i * TILE, y0, 1, rows * TILE);
  for (let j = 0; j <= rows; j++) g.fillRect(x0, y0 + j * TILE, cols * TILE, 1);
}

interface Placed {
  canvas: HTMLCanvasElement;
  glows: Glow[];
}

/** One drawing on its footprint, as the scene places it: its bottom row on the footprint's, centred. */
function placeOne(s: Sprite, size: [number, number], flat: boolean, glows: Glow[] = []): Placed {
  const [cols, rows] = size;
  const extra = Math.max(0, s.height - rows * TILE - 1);
  const c = stage(cols, rows, extra);
  const fx = 4;
  const fy = 4 + extra;
  footprint(c, fx, fy, cols, rows);
  const x = fx + Math.round((cols * TILE - s.width) / 2);
  const y = flat ? fy + Math.round((rows * TILE - s.height) / 2) : fy + rows * TILE - s.height + 1;
  c.getContext('2d')!.drawImage(s, x, y);
  return { canvas: c, glows: glows.map((g) => ({ ...g, x: g.x + x, y: g.y + y })) };
}

function atNight(day: Placed): HTMLCanvasElement {
  const c = canvas(day.canvas.width, day.canvas.height);
  const g = c.getContext('2d')!;
  g.drawImage(day.canvas, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = 'rgba(60, 80, 160, 0.55)';
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'lighter';
  for (const l of day.glows) {
    const tint = l.tint ?? '255, 205, 120';
    const grad = g.createRadialGradient(l.x, l.y, 1, l.x, l.y, l.r);
    grad.addColorStop(0, `rgba(${tint}, 0.55)`);
    grad.addColorStop(1, `rgba(${tint}, 0)`);
    g.fillStyle = grad;
    g.fillRect(l.x - l.r, l.y - l.r, 2 * l.r, 2 * l.r);
  }
  return c;
}

// -----------------------------------------------
// SCENES
// -----------------------------------------------

/** A run of wall with the round gate, things perched on it, and a torch on a fence for comparison. */
function wallScene(): Placed {
  const cols = 10;
  const rows = 4;
  const c = stage(cols, rows, 24);
  const g = c.getContext('2d')!;
  const ox = 4;
  const oy = 4 + 24;
  const glows: Glow[] = [];
  const at = (s: Sprite, tx: number, ty: number) => {
    const x = ox + tx * TILE;
    const y = oy + (ty + 1) * TILE - s.height;
    g.drawImage(s, x, y);
    return { x, y };
  };
  const perch = (s: Sprite, tx: number, ty: number, seat: { x: number; y: number }, glow?: Glow[]) => {
    const tile = { x: ox + tx * TILE, y: oy + (ty + 1) * TILE - 24 };
    const x = tile.x + seat.x - Math.floor(s.width / 2);
    const y = tile.y + seat.y - s.height + 1;
    g.drawImage(s, x, y);
    for (const l of glow ?? []) glows.push({ ...l, x: l.x + x, y: l.y + y });
  };
  // The wall: west end, run, the gate (two tiles), run, a corner going south.
  const E = 2;
  const W = 8;
  const S = 4;
  const N = 1;
  // Back row: wall from x=0 to x=8, the gate at 3-4.
  const run: [number, number][] = [[0, E], [1, E | W], [2, E | W], [5, E | W], [6, E | W], [7, W | S]];
  for (const [tx, mask] of run) at(A.stoneWall(mask), tx, 0);
  at(A.moonGate(), 3, 0);
  at(A.stoneWall(N | S), 7, 1);
  at(A.stoneWall(N), 7, 2);
  perch(A.torch(true), 0, 0, A.WALL_SEAT, A.torchGlows(true));
  perch(perchedSprite('flowerPot', 'face'), 2, 0, A.WALL_SEAT);
  perch(A.fireflyJar(), 6, 0, A.WALL_SEAT, A.fireflyGlows);
  perch(A.torch(true), 7, 2, A.WALL_SEAT, A.torchGlows(true));
  // The existing ranch fence with a torch, for scale.
  for (const [tx, mask] of [[8, 2], [9, 8]] as const) at(fenceSprite('fenceRanch', mask | (tx === 9 ? 32 : 0), false), tx, 3);
  perch(A.torch(true), 9, 3, { x: 8, y: 9 }, A.torchGlows(true));
  // Stepping stones through the gate, a cloche, the existing bench and lamppost for scale.
  for (const [tx, ty] of [[3, 1], [4, 2], [3, 3]] as const) at(A.steppingStones(), tx, ty);
  at(objectSprite('bench', 'face'), 0, 2);
  const lamp = at(objectSprite('lamppost', 'face'), 5, 2);
  for (const l of glowsOf('lamppost', 'face')) glows.push({ ...l, x: l.x + lamp.x, y: l.y + lamp.y });
  return { canvas: c, glows };
}

// -----------------------------------------------
// THE PAGE
// -----------------------------------------------

const RARITY_NAME: Record<Rarity, string> = { rare: 'Rare', epic: 'Épique', legendary: 'Légendaire' };

function img(c: HTMLCanvasElement, label: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'shot';
  c.style.width = `calc(${c.width}px * var(--zoom))`;
  c.setAttribute('role', 'img');
  c.setAttribute('aria-label', label);
  wrap.append(c);
  return wrap;
}

const nuts = (n: number) => n.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ');

function card(item: Item, withNight: boolean): HTMLElement {
  const el = document.createElement('article');
  el.className = 'card';
  const placed = placeOne(item.art(), item.size, !!item.flat, item.glows);
  const pics = document.createElement('div');
  pics.className = 'pics';
  pics.append(img(placed.canvas, item.name));
  if (withNight && item.glows) pics.append(img(atNight(placed), `${item.name}, la nuit`));
  el.append(pics);
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.innerHTML = `<h3>${item.name}</h3><p class="nums"><span>niv. ${item.level}</span><span>${nuts(item.price)} 🌰</span><span>${item.size[0]}×${item.size[1]}</span></p>${item.note ? `<p class="note">${item.note}</p>` : ''}`;
  el.append(meta);
  return el;
}

function lotusCard(v: Variant & { pitch: string }): HTMLElement {
  const el = variantCard(v);
  const meta = el.querySelector('.meta')!;
  meta.querySelector('.note')!.textContent = v.pitch;
  return el;
}

function variantCard(v: Variant): HTMLElement {
  const el = document.createElement('article');
  el.className = `card variant is-${v.rarity}`;
  const size: [number, number] = ['bench', 'porchSwing'].includes(v.base) ? [2, 1] : ['well'].includes(v.base) ? [2, 1] : ['lilyPond'].includes(v.base) ? [2, 2] : [1, 1];
  const before = placeOne(objectSprite(v.base as never, 'face'), size, false);
  const glows = v.glowTint ? (VARIANT_GLOWS[v.base] ?? glowsOf(v.base as never, 'face')).map((g) => ({ ...g, tint: v.glowTint })) : [];
  const after = placeOne(variantSprite(v), size, false, glows);
  const pics = document.createElement('div');
  pics.className = 'pics';
  pics.append(img(before.canvas, v.of), img(after.canvas, v.name));
  if (glows.length) pics.append(img(atNight(after), `${v.name}, la nuit`));
  el.append(pics);
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.innerHTML = `<p class="chip">${RARITY_NAME[v.rarity]}</p><h3>${v.name}</h3><p class="note">${v.of} · tombe dès le niv. ${v.level}</p>`;
  el.append(meta);
  return el;
}

function section(id: string, title: string, lead: string, cards: HTMLElement[]): HTMLElement {
  const s = document.createElement('section');
  s.id = id;
  s.innerHTML = `<header><h2>${title}</h2><p>${lead}</p></header>`;
  const grid = document.createElement('div');
  grid.className = 'grid';
  grid.append(...cards);
  s.append(grid);
  return s;
}

function build(): void {
  const root = document.getElementById('board')!;
  root.append(
    section('lotus', 'À choisir : le Bassin aux lotus, trois versions', 'Le premier essai ne faisait que changer les couleurs. Ici, de grands lotus sont dessinés par-dessus le bassin. À gauche le bassin d’aujourd’hui, puis la version, puis la nuit. Dites laquelle on garde.', LOTUS_VERSIONS.map(lotusCard)),
  );
  root.append(
    section('maintenant', 'Pour tout de suite', 'Niveaux 6 à 20 : là où Eloise joue en ce moment.', NOW.map((i) => card(i, true))),
    section('fin', 'Pour la fin de partie', 'Niveaux 22 à 30 : aujourd’hui, ces niveaux n’ouvrent aucune déco.', LATE.map((i) => card(i, true))),
  );
  const wall = wallScene();
  const scene = document.createElement('section');
  scene.id = 'muret';
  scene.innerHTML = '<header><h2>Le muret, la porte ronde et ce qui s’y pose</h2><p>Le muret se raccorde comme la haie. Dessus : torches, pot de fleurs, bocal à lucioles. Le banc, le lampadaire et la barrière déjà en jeu sont là pour l’échelle.</p></header>';
  const pics = document.createElement('div');
  pics.className = 'pics wide';
  pics.append(img(wall.canvas, 'Le muret de jour'), img(atNight(wall), 'Le muret la nuit'));
  scene.append(pics);
  root.append(scene);
  root.append(section('variantes', 'Les variantes rares des colis', 'À gauche la déco d’aujourd’hui, à droite sa variante. Trouvée une fois, elle habille gratuitement chaque exemplaire de cette déco.', VARIANTS.map(variantCard)));
}

build();
