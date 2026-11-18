import { mulberry32 } from '../../random';
import type { BuildingStyle } from './data/styles';
import type { DecorStyleId } from './data/types';
import type { Glow } from './farmArtDecor';
import { C, IRON, IRON_LIGHT, OUTLINE, ROOF_RED, ROOF_TONES, WARM_STONE, canvas, type Sprite, type View } from './farmPaint';

// -----------------------------------------------
// BUILDING STYLES: a drawing repainted with other materials (docs/ferme.md 26)
// -----------------------------------------------
// Every roof is painted with one of the tones of ROOF_TONES, the wood with C.wood*, the stone with WARM_STONE: a
// style swaps those colours pixel for pixel, then paints its touch over the roofs it found. The building's own
// drawing never changes, so a new building wears every style at once.

const SNOW = '#ffffff';
const SNOW_SHADE = '#e6f0fa';
const ICICLE = '#cfe6f7';
const ICING = '#fffaf2';
const SPRINKLES = ['#e0475b', '#5aa54a', '#5c9fd6'];
const PETALS = ['#ffffff', '#f06a96'];
const SPARKLE = '#fff6c8';

const rgb = (hex: string): number => parseInt(hex.slice(1), 16);
const ROOF_COLOURS = new Set(ROOF_TONES.flat().map(rgb));
const WOOD: readonly string[] = [C.woodLight, C.wood, C.woodDark];

/** The colours a style swaps: from each roof's tone to the style's tone of the same rank, likewise wood and stone. */
function swapsOf(s: BuildingStyle): Map<number, number> {
  const swaps = new Map<number, number>();
  const add = (from: readonly string[], to: readonly string[] | undefined) => {
    if (to) from.forEach((col, i) => swaps.set(rgb(col), rgb(to[i])));
  };
  for (const roof of ROOF_TONES) add(roof, s.roof);
  add(WOOD, s.wood);
  add(WARM_STONE, s.stone);
  return swaps;
}

/** A copy of `base` in the style: the source sprite (cached by farmArt) is never touched. */
export function styledSprite(base: Sprite, s: BuildingStyle): Sprite {
  const out = canvas(base.width, base.height);
  const g = out.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(base, 0, 0);
  const W = out.width;
  const H = out.height;
  const image = g.getImageData(0, 0, W, H);
  const d = image.data;
  const swaps = swapsOf(s);
  // The roof pixels, found before the swap: the touch is painted on them.
  const roof = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    if (d[i + 3] < 255) continue;
    const col = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    if (ROOF_COLOURS.has(col)) roof[p] = 1;
    const to = swaps.get(col);
    if (to !== undefined) setRgb(d, i, to);
  }
  if (s.touch) paintTouch(s.touch, d, roof, W, H);
  g.putImageData(image, 0, 0);
  return out;
}

function setRgb(d: Uint8ClampedArray, i: number, col: number): void {
  d[i] = col >> 16;
  d[i + 1] = (col >> 8) & 0xff;
  d[i + 2] = col & 0xff;
}

function paintTouch(touch: NonNullable<BuildingStyle['touch']>, d: Uint8ClampedArray, roof: Uint8Array, W: number, H: number): void {
  /** Paints over the drawing only, never on the transparent margin or past the outline. */
  const put = (x: number, y: number, hex: string) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    if (d[i + 3] === 255) setRgb(d, i, rgb(hex));
  };
  const top = (x: number) => {
    for (let y = 0; y < H; y++) if (roof[y * W + x]) return y;
    return -1;
  };
  const bottom = (x: number) => {
    for (let y = H - 1; y >= 0; y--) if (roof[y * W + x]) return y;
    return -1;
  };
  const random = mulberry32(W * 131 + H);
  for (let x = 0; x < W; x++) {
    const t = top(x);
    if (t < 0) continue;
    const b = bottom(x);
    if (touch === 'snow') {
      // A thick cap on the ridge, a lip on the eave, icicles here and there.
      put(x, t, SNOW);
      put(x, t + 1, SNOW);
      if ((x * 7) % 5 < 3) put(x, t + 2, SNOW_SHADE);
      if (b > t + 3 && x % 3 === 1) put(x, b, SNOW);
      if (b > t + 3 && x % 4 === 2) put(x, b + 1, ICICLE);
    } else if (touch === 'icing') {
      // Icing dripping off the eave, sprinkles on the roof.
      const drip = [0, 1, 2, 1, 0, 0, 1, 0][x % 8];
      for (let k = 0; k <= drip; k++) put(x, b + 1 + k, ICING);
      if (x % 4 === 1) put(x, t + 3, SPRINKLES[(x >> 2) % SPRINKLES.length]);
    }
  }
  if (touch === 'petals' || touch === 'sparkle') {
    const share = touch === 'petals' ? 0.09 : 0.04;
    for (let p = 0; p < W * H; p++) {
      if (!roof[p] || random() >= share) continue;
      put(p % W, Math.floor(p / W), touch === 'petals' ? PETALS[random() < 0.5 ? 0 : 1] : SPARKLE);
    }
  }
}

// -----------------------------------------------
// DECORATION STYLES: one decoration recoloured, a touch, sometimes a drawing on top (docs/ferme.md 27)
// -----------------------------------------------
// Each recipe swaps colours of its decoration's own drawing (exact colours, read in farmArt / farmArtDecor), paints
// its touch on some of them, and the face may get an extra drawing (the lotus flowers, the coins of the well): the
// profile keeps the colours and the touch only, its pixels being elsewhere.

type Put = (x: number, y: number, col: string) => void;
type DecorTouch = 'sparkle' | 'petals' | 'icing' | 'veins' | 'dots' | 'rainbow' | 'blooms';

interface DecorRecipe {
  swaps: readonly (readonly [string, string])[];
  touch?: DecorTouch;
  /** The colours, before the swap, the touch is painted on; all the swapped ones when absent. */
  touchOn?: readonly string[];
  /** Drawn over the face, in the sprite's pixels (margin included); what it draws outside gets the outline. */
  extra?: (put: Put) => void;
  /** Lights at night on the face, when the decoration has none of its own or they move. */
  glows?: readonly Glow[];
  /** The colour of its lights, "r, g, b". */
  glowTint?: string;
}

const pairs = (from: readonly string[], to: readonly string[]): (readonly [string, string])[] => from.map((f, i) => [f, to[i]] as const);
const ICING_ROOF = ['#fffaf2', '#f6efe4', '#e6dccd', '#cfc3b1'];
const GOLD_ROOF = ['#fff1b0', '#f2c94c', '#d9a339', '#b07d22'];
const WHITE_MARBLE = ['#ffffff', '#efe9f2', '#d6cfe0'];
const RAINBOW = [
  ['#ffb3b3', '#f06a6a', '#c94a4a'], ['#ffd2a0', '#f5a04a', '#d07a2a'], ['#fff1a0', '#ffd84a', '#e0ae2a'],
  ['#c8efb0', '#7cc456', '#5aa54a'], ['#b9d0f7', '#6a98cc', '#4f78ab'], ['#dccaf2', '#ab8fd8', '#8a6dbb'],
];
/** The parasol's canvas, by tone rank: the rainbow keeps the light and shade of the drawing. */
const PARASOL_RANK: Record<string, number> = { '#ffb0a3': 0, '#ef7a6d': 1, '#cf5f55': 2, '#b04a45': 2, '#ffffff': 0, '#fff6e0': 1, '#ecdcc0': 2, '#d8c6a6': 2 };

// The lotus pond (choice A of 18/11): big lotus flowers stand on their pads over the pond.
const LOTUS_ROWS = ['....a....', '...aba...', 'c..aba..c', 'cb.aba.bc', 'cbbbhbbbc', '.cbbbbbc.', 'LLLLlLLLL'];
const SMALL_LOTUS_ROWS = ['...a...', '..aba..', 'c.aba.c', 'cbbhbbc', '.cbbbc.', '.LLlLL.'];
const LOTUS_PINK = { a: '#ffe0ea', b: '#ff8fb8', c: '#e0608f', h: '#ffd84a', L: C.leafDark, l: C.leafLight };
const LOTUS_WHITE = { a: '#ffffff', b: '#fff0f6', c: '#e6c3d4', h: '#ffd84a', L: C.leafDark, l: C.leafLight };
const POND_WATER = ['#3f7fb3', '#4f93c8', '#5ea6db'];

/** A small picture centred on x, its last row on row y. */
function stamp(put: Put, rows: readonly string[], pal: Record<string, string>, x: number, y: number): void {
  const half = rows[0].length >> 1;
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '.') put(x - half + i, y - rows.length + 1 + j, pal[ch]);
  }));
}

const DECOR_RECIPES: Record<DecorStyleId, DecorRecipe> = {
  blueRoses: { swaps: pairs(['#ff8fb8', '#ffc0d6', '#e8789e'], ['#7ea4e6', '#b9d0f7', '#5d80c4']) },
  faiencePot: {
    swaps: pairs([C.brick, '#e08a6a', '#d4764f', C.brickDark], ['#dfe9f5', '#ffffff', '#f4f8fc', '#c4d5ea']),
    touch: 'dots', touchOn: ['#d4764f'],
  },
  parrotTulips: {
    swaps: pairs(['#ff8a96', '#b4353f', '#ff8fb8', '#e8789e', '#f2b632', '#a77fd6', '#c9a8f0', '#8460b4'], ['#ffd84a', '#ffd84a', '#ffffff', '#ff4f8a', '#e0475b', '#fff6e0', '#ffffff', '#7d4fc0']),
  },
  gingerbreadBirdhouse: {
    swaps: [...pairs(['#6a9fd8', '#8fbbe8', '#5385bd', '#5c8fc8', '#4d7fb0'], ['#c98a4a', '#e3ab66', '#a86a3a', '#b9773f', '#94552a']), ...pairs(ROOF_RED, ICING_ROOF)],
    touch: 'icing', touchOn: ROOF_RED,
  },
  moonHydrangeas: {
    swaps: [
      ...pairs(['#7ea4e6', '#b9d0f7', '#5d80c4'], ['#eef3ff', '#ffffff', '#c9d6f0']),
      ...pairs(['#c49ae0', '#e6caf5', '#9d72bf'], ['#f1ecff', '#ffffff', '#d3c8ee']),
      ...pairs(['#f2a0c4', '#ffd0e4', '#d27aa3'], ['#fff0f6', '#ffffff', '#ecc9da']),
    ],
    touch: 'sparkle',
  },
  rainbowParasol: { swaps: [], touch: 'rainbow' },
  lovebirdBench: {
    swaps: [...pairs([C.woodLight, C.wood, C.woodDark, '#ecc08a'], ['#fff6f8', '#f6e6ea', '#e3c9d0', '#ffffff']), ...pairs([IRON, IRON_LIGHT], ['#c94a76', '#f06a96'])],
    touch: 'petals', touchOn: [C.woodLight, C.wood, '#ecc08a'],
    extra: (put) => {
      // A heart carved in the back.
      for (const [x, y] of [[13, 1], [15, 1], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [13, 3], [14, 3], [15, 3], [14, 4]] as const) put(x, y, '#f06a96');
      put(13, 2, '#ffb3cc');
    },
  },
  fairyLantern: {
    swaps: pairs([IRON, '#3f3331', C.glow, '#fff3c4'], ['#b8b2d8', '#8f86bf', '#9fe3ff', '#e6fbff']),
    touch: 'sparkle', glowTint: '140, 220, 255',
  },
  pinkMarbleBirdBath: {
    swaps: [...pairs([C.stone, C.stoneDark, '#ffffff', '#f6f1e8'], ['#f6d6dc', '#e0aeb8', '#fff0f3', '#fbe4e8']), ...pairs(['#8a5a3b', '#f08a4b', '#6f4630'], ['#ffffff', '#e8e8f0', '#dfe3ea'])],
    touch: 'veins', touchOn: [C.stone, '#f6f1e8'],
  },
  flowerSwing: {
    swaps: pairs(['#c9f0de', '#8fd6b8', '#62b394', '#46917a'], ['#ffe0ea', '#fbc4d2', '#ec94ac', '#cc6e8a']),
    touch: 'blooms', touchOn: ['#c9f0de', '#8fd6b8', '#62b394', '#ffffff', '#fff6e0', '#ecdcc0'],
  },
  wishingWell: {
    swaps: [...pairs(ROOF_RED, GOLD_ROOF), ...pairs([C.greyLight, C.grey, C.greyDark], WHITE_MARBLE), ...pairs(['#4d7fb0', '#5c9fd6', '#bfe2f7', '#8ec6e8'], ['#2f9a9a', '#4fc4bc', '#d8fff6', '#9fe8de'])],
    touch: 'sparkle', touchOn: [...ROOF_RED, '#4d7fb0', '#5c9fd6'],
    extra: (put) => {
      for (const [x, y] of [[9, 22], [15, 23], [17, 22]] as const) put(x, y, C.gold);
    },
    glows: [{ x: 13, y: 22, r: 18 }],
    glowTint: '255, 220, 120',
  },
  lotusPond: {
    swaps: [
      ...pairs(WARM_STONE, WHITE_MARBLE),
      ...pairs(POND_WATER, ['#2f8f9a', '#3fb0b0', '#62cfc6']),
      ...pairs(['#ff9e4a', '#ffc58a'], [C.gold, '#fff1b0']),
      // The small flowers of the pond become plain pads: only the lotus flower.
      ...pairs(['#ff9ec4', '#ffd0e4', '#fff1a0'], [C.leaf, C.leafLight, C.leaf]),
    ],
    touch: 'sparkle', touchOn: POND_WATER,
    extra: (put) => {
      // Gold specks on every other stone of the rim, then the lotus flowers.
      for (let i = 0; i < 20; i += 2) {
        const a = (i / 20) * Math.PI * 2;
        put(Math.round(16 + Math.cos(a) * 13), Math.round(14 + Math.sin(a) * 6.5), C.gold);
      }
      stamp(put, LOTUS_ROWS, LOTUS_PINK, 10, 17);
      stamp(put, LOTUS_ROWS, LOTUS_PINK, 22, 19);
      stamp(put, SMALL_LOTUS_ROWS, LOTUS_WHITE, 22, 12);
    },
    glows: [{ x: 16, y: 15, r: 20 }],
    glowTint: '255, 190, 220',
  },
};

/** A copy of a decoration's drawing in one of its styles: the source sprite (cached by farmArt) is never touched. */
export function decorStyledSprite(base: Sprite, id: DecorStyleId, view: View): Sprite {
  const recipe = DECOR_RECIPES[id];
  const out = canvas(base.width, base.height);
  const g = out.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(base, 0, 0);
  const W = out.width;
  const H = out.height;
  const image = g.getImageData(0, 0, W, H);
  const d = image.data;
  const swaps = new Map(recipe.swaps.map(([from, to]) => [rgb(from), rgb(to)]));
  const touchOn = new Set((recipe.touchOn ?? recipe.swaps.map(([from]) => from)).map(rgb));
  const ranks = new Map(Object.entries(PARASOL_RANK).map(([col, rank]) => [rgb(col), rank]));
  const marked = new Uint8Array(W * H);
  const rankAt = new Int8Array(W * H).fill(-1);
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    if (d[i + 3] < 255) continue;
    const col = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    if (touchOn.has(col)) marked[p] = 1;
    if (ranks.has(col)) rankAt[p] = ranks.get(col)!;
    const to = swaps.get(col);
    if (to !== undefined) setRgb(d, i, to);
  }
  const added: number[] = [];
  const put = (x: number, y: number, hex: string, overTransparent = false) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    if (d[i + 3] < 255) {
      if (!overTransparent) return;
      added.push(y * W + x);
      d[i + 3] = 255;
    }
    setRgb(d, i, rgb(hex));
  };
  if (recipe.touch) paintDecorTouch(recipe.touch, put, marked, rankAt, W, H);
  if (recipe.extra && view === 'face') recipe.extra((x, y, col) => put(x, y, col, true));
  // What was drawn outside the drawing gets the same dark outline as the rest.
  for (const p of added) {
    const x = p % W;
    const y = Math.floor(p / W);
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const i = (ny * W + nx) * 4;
      if (d[i + 3] === 255) continue;
      setRgb(d, i, rgb(OUTLINE));
      d[i + 3] = 255;
    }
  }
  g.putImageData(image, 0, 0);
  return out;
}

/** The lights of a decoration wearing a style: its own, or the style's on the face, in the style's colour. */
export function decorStyleGlows(own: readonly Glow[], id: DecorStyleId, view: View): Glow[] {
  const recipe = DECOR_RECIPES[id];
  const glows = view === 'face' && recipe.glows ? recipe.glows : own;
  return glows.map((g) => (recipe.glowTint ? { ...g, tint: recipe.glowTint } : { ...g }));
}

function paintDecorTouch(touch: DecorTouch, put: (x: number, y: number, hex: string, over?: boolean) => void, marked: Uint8Array, rankAt: Int8Array, W: number, H: number): void {
  const random = mulberry32(W * 131 + H);
  const top = (x: number) => {
    for (let y = 0; y < H; y++) if (marked[y * W + x]) return y;
    return -1;
  };
  const bottom = (x: number) => {
    for (let y = H - 1; y >= 0; y--) if (marked[y * W + x]) return y;
    return -1;
  };
  if (touch === 'icing') {
    for (let x = 0; x < W; x++) {
      const t = top(x);
      if (t < 0) continue;
      const drip = [0, 1, 2, 1, 0, 0, 1, 0][x % 8];
      for (let k = 0; k <= drip; k++) put(x, bottom(x) + 1 + k, ICING);
      if (x % 3 === 1) put(x, t + 2, SPRINKLES[Math.floor(x / 3) % SPRINKLES.length]);
    }
  } else if (touch === 'rainbow') {
    // Six bands across the canvas, each keeping the light and shade of the pixel it repaints.
    let x0 = W;
    let x1 = 0;
    for (let p = 0; p < W * H; p++) {
      if (rankAt[p] < 0 || Math.floor(p / W) >= 12) continue;
      x0 = Math.min(x0, p % W);
      x1 = Math.max(x1, p % W);
    }
    for (let p = 0; p < W * H; p++) {
      if (rankAt[p] < 0 || Math.floor(p / W) >= 12) continue;
      const band = Math.min(5, Math.floor(((p % W) - x0) / ((x1 - x0 + 1) / 6)));
      put(p % W, Math.floor(p / W), RAINBOW[band][rankAt[p]]);
    }
  } else if (touch === 'blooms') {
    // Flowers along the top, wisteria hanging under it.
    for (let x = 1; x < W - 1; x += 3) {
      const t = top(x);
      if (t < 0 || t > 3) continue;
      const col = ['#ff8fb8', '#ffffff', '#ffd84a', '#d6b8f5'][Math.floor(x / 3) % 4];
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
  } else {
    for (let p = 0; p < W * H; p++) {
      if (!marked[p]) continue;
      const x = p % W;
      const y = Math.floor(p / W);
      if (touch === 'petals' && random() < 0.12) put(x, y, random() < 0.5 ? '#ffffff' : '#f06a96');
      if (touch === 'sparkle' && random() < 0.07) put(x, y, SPARKLE);
      if (touch === 'veins' && (x * 2 + y) % 7 === 0 && random() < 0.6) put(x, y, '#d998a6');
      if (touch === 'dots' && x % 2 === 0 && y % 2 === 0) put(x, y, '#4f78ab');
    }
  }
}
