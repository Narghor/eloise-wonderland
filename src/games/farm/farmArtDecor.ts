import type { DecorId } from './data/types';
import {
  C, OUTLINE, IRON, IRON_LIGHT, ROOF_PINK, ROOF_RED, ROSE, ROSE_DARK, ROSE_LIGHT, WARM_STONE, WATER_MIST, GLINT,
  framedWindow, pathTile, plankDoor, sprite, stones, twinkle,
} from './farmPaint';
import type { Painter, Sprite, Tones, View } from './farmPaint';
import { mulberry32 } from '../../random';

// -----------------------------------------------
// THE GARDEN DECORATIONS OF 16/11 (docs/ferme.md 23)
// -----------------------------------------------
// Flowers, garden furniture, water, lights, country pieces and the showpieces. Same recipe as the rest (docs/ferme.md
// 16, step 3): one light from the top left, three or four tones per material, the dark outline added by `sprite`.
// A drawing stands on the bottom row of its footprint and may rise above it; its width stays within the footprint.

export type GardenPath = Extract<DecorId, 'pathFlag' | 'pathGravel' | 'pathPlank'>;
export type GardenDecor = Extract<DecorId,
  | 'tulips' | 'lavender' | 'sunflowers' | 'hydrangeas' | 'climbingRose' | 'planter'
  | 'wateringCan' | 'picnicTable' | 'deckChair' | 'parasol' | 'hammock' | 'porchSwing'
  | 'birdBath' | 'lilyPond' | 'gardenBridge'
  | 'candleJar' | 'lamppost' | 'stringLights'
  | 'flowerBarrel' | 'weathervane' | 'flowerCart'
  | 'pergola' | 'bandstand' | 'greenhouse' | 'treehouse' | 'dovecote' | 'carousel' | 'hedgeMaze'>;

/** Seen the same from every side: one drawing for both views (mirrored when turned the other way). */
export const GARDEN_SYMMETRIC: ReadonlySet<GardenDecor> = new Set<GardenDecor>([
  'tulips', 'lavender', 'sunflowers', 'hydrangeas', 'climbingRose', 'wateringCan', 'parasol', 'birdBath', 'lilyPond',
  'candleJar', 'lamppost', 'flowerBarrel', 'weathervane', 'bandstand', 'treehouse', 'dovecote', 'carousel', 'hedgeMaze',
]);

export function gardenDecor(id: GardenDecor, view: View): Sprite {
  switch (id) {
    case 'tulips': return tulips();
    case 'lavender': return lavender();
    case 'sunflowers': return sunflowers();
    case 'hydrangeas': return hydrangeas();
    case 'climbingRose': return climbingRose();
    case 'planter': return planter(view);
    case 'wateringCan': return wateringCan();
    case 'picnicTable': return picnicTable(view);
    case 'deckChair': return deckChair(view);
    case 'parasol': return parasol();
    case 'hammock': return hammock(view);
    case 'porchSwing': return porchSwing(view);
    case 'birdBath': return birdBath();
    case 'lilyPond': return lilyPond();
    case 'gardenBridge': return gardenBridge(view);
    case 'candleJar': return candleJar();
    case 'lamppost': return lamppost();
    case 'stringLights': return stringLights(view);
    case 'flowerBarrel': return flowerBarrel();
    case 'weathervane': return weathervane();
    case 'flowerCart': return flowerCart(view);
    case 'pergola': return pergola(view);
    case 'bandstand': return bandstand();
    case 'greenhouse': return greenhouse(view);
    case 'treehouse': return treehouse();
    case 'dovecote': return dovecote();
    case 'carousel': return carousel();
    case 'hedgeMaze': return hedgeMaze();
    default: {
      const unknown: never = id;
      throw new Error(`no drawing for ${String(unknown)}`);
    }
  }
}

/** A light that glows at night: a point of the drawing as drawn (margin included, not mirrored) and its reach. */
export interface Glow {
  x: number;
  y: number;
  r: number;
}

/** Where a garden decoration glows at night; empty for most. */
export function gardenGlows(id: GardenDecor, view: View): Glow[] {
  switch (id) {
    case 'candleJar': return [{ x: 5, y: 7, r: 16 }];
    case 'lamppost': return [{ x: 7, y: 8, r: 30 }];
    case 'stringLights': return stringBulbs(view).map(([x, y]) => ({ x: x + 1, y: y + 2, r: 9 }));
    case 'treehouse': return [{ x: 18, y: 23, r: 18 }];
    case 'bandstand': return BANDSTAND_BULBS.map((x) => ({ x: x + 1, y: 21, r: 10 }));
    case 'carousel': return CAROUSEL_BULBS.map((x) => ({ x: x + 1, y: 21, r: 10 }));
    default: return [];
  }
}

// -----------------------------------------------
// SHARED PIECES
// -----------------------------------------------

type Bloom = readonly [string, string, string];

/** Base, light, dark of each flower colour. */
const BLOOM = {
  red: ['#e0475b', '#ff8a96', '#b4353f'],
  pink: ['#ff8fb8', '#ffc0d6', '#e8789e'],
  yellow: ['#ffd84a', '#fff1a0', '#f2b632'],
  purple: ['#a77fd6', '#c9a8f0', '#8460b4'],
  white: ['#fff6e0', '#ffffff', '#e3dccd'],
  orange: ['#ff9e4a', '#ffc58a', '#e07a2a'],
  blue: ['#7ea4e6', '#b9d0f7', '#5d80c4'],
} as const satisfies Record<string, Bloom>;

const WICKER = ['#e0b878', '#c99a5b', '#a87a40'] as const;
const ZINC = ['#d4e0dd', '#a9bcb8', '#82958f', '#64756f'] as const;
const CREAM: Tones = ['#ffffff', '#fff6e0', '#ecdcc0', '#d8c6a6'];
const MINT: Tones = ['#c9f0de', '#8fd6b8', '#62b394', '#46917a'];
const FRAME = '#fbf8f2';
const FRAME_SHADE = '#d8d2c6';

/** A small flower: a cross of petals around a heart. */
function bloom(P: Painter, x: number, y: number, [base, light, dark]: Bloom, heart: string = C.gold): void {
  P.px(x - 1, y, base);
  P.px(x + 1, y, dark);
  P.px(x, y - 1, light);
  P.px(x, y + 1, dark);
  P.px(x, y, heart);
}

/** A climbing rose, two by two. */
function rose(P: Painter, x: number, y: number): void {
  P.rect(x, y, 2, 2, ROSE);
  P.px(x, y, ROSE_LIGHT);
  P.px(x + 1, y + 1, ROSE_DARK);
}

/** A round clump of leaves, lit on its top left. */
function leafClump(P: Painter, x: number, y: number, rx: number, ry: number): void {
  P.ellipse(x, y, rx, ry, C.leafDark);
  P.ellipse(x - 1, y - 1, Math.max(1, rx - 1), Math.max(0, ry - 1), C.leaf);
  P.px(x - Math.ceil(rx / 2), y - ry, C.leafLight);
}

/** A mound of soil with a border of little stones along its front, its middle at (cx, y). */
function soilMound(P: Painter, cx: number, y: number, rx: number): void {
  P.ellipse(cx, y + 1, rx, 2, '#9a6a46');
  P.ellipse(cx, y, rx - 1, 1, C.soil);
  P.px(cx - 2, y - 1, C.soilLight);
  for (let x = cx - rx + 1; x < cx + rx - 1; x += 2) {
    P.px(x, y + 3, C.greyLight);
    P.px(x + 1, y + 3, C.grey);
  }
}

/** A column of wood two or three pixels wide: lit on the left, shaded on the right. */
function woodPost(P: Painter, x: number, y: number, w: number, h: number): void {
  P.rect(x, y, w, h, C.wood);
  P.rect(x, y, 1, h, C.woodLight);
  P.rect(x + w - 1, y, 1, h, C.woodDark);
}

/** Gingham, red and white: for the picnic cloth. */
function gingham(x: number, y: number): string {
  const n = ((x >> 1) % 2) + ((y >> 1) % 2);
  return n === 0 ? '#fff6f0' : n === 1 ? '#f39aa6' : '#e0475b';
}

/** A white dove sitting, its head to the left. */
function dove(P: Painter, x: number, y: number): void {
  P.rect(x, y, 4, 2, '#ffffff');
  P.px(x, y - 1, '#ffffff');
  P.px(x - 1, y - 1, C.gold);
  P.rect(x + 2, y, 2, 1, '#dfe3ea');
  P.px(x + 4, y, '#dfe3ea');
}

// -----------------------------------------------
// FLOWERS
// -----------------------------------------------

function tulip(P: Painter, x: number, y: number, foot: number, [base, light, dark]: Bloom): void {
  P.line(x, y + 2, x, foot, C.leafDark);
  P.px(x - 1, foot - 1, C.leaf);
  P.px(x - 1, foot - 2, C.leafLight);
  P.px(x + 1, foot - 1, C.leafDark);
  P.px(x - 1, y - 1, light);
  P.px(x + 1, y - 1, base);
  P.rect(x - 1, y, 3, 2, base);
  P.px(x - 1, y, light);
  P.px(x + 1, y, dark);
  P.px(x + 1, y + 1, dark);
  P.px(x, y + 1, dark);
}

function tulips(): Sprite {
  return sprite(14, 15, (P) => {
    soilMound(P, 7, 11, 7);
    const colours = [BLOOM.red, BLOOM.pink, BLOOM.yellow, BLOOM.purple];
    [[3, 2], [7, 1], [11, 2]].forEach(([x, y], i) => tulip(P, x, y, 10, colours[(i + 1) % 4]));
    [[2, 5], [5, 6], [9, 6], [12, 5]].forEach(([x, y], i) => tulip(P, x, y, 12, colours[i]));
  });
}

function lavender(): Sprite {
  return sprite(14, 14, (P) => {
    const [base, light, dark] = ['#9b7ad1', '#c3a8ec', '#7356a8'];
    P.ellipse(7, 11, 6, 2, '#5f7d5a');
    P.ellipse(7, 10, 5, 2, '#7d9c74');
    for (const x of [3, 6, 9]) P.px(x, 9, '#a3bf98');
    for (const [x, top, lean] of [[2, 5, -1], [4, 3, 0], [6, 1, 0], [8, 2, 0], [10, 3, 0], [12, 5, 0]] as const) {
      const xl = x + lean;
      P.line(x, 10, xl, top + 4, '#5f7d5a');
      P.px(xl, top, light);
      P.px(xl, top + 1, base);
      P.px(xl - 1, top + 1, light);
      P.px(xl, top + 2, base);
      P.px(xl + 1, top + 2, dark);
      P.px(xl, top + 3, dark);
    }
    // A bee at work.
    P.px(11, 1, '#ffd84a');
    P.px(12, 1, OUTLINE);
    P.px(11, 0, '#e8f4ff');
  });
}

/** A sunflower's head: petals all round, lit on the top left, a brown heart of seeds. */
function sunHead(P: Painter, cx: number, cy: number, r: number): void {
  P.disc(cx, cy, r, C.gold);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * r);
    const y = Math.round(cy + Math.sin(a) * r);
    const lit = Math.cos(a) + Math.sin(a) < -0.6;
    const shade = Math.cos(a) + Math.sin(a) > 0.6;
    P.px(x, y, lit ? C.goldLight : shade ? C.goldDark : C.gold);
  }
  const heart = Math.max(0, r - 2);
  P.disc(cx, cy, heart, '#8a552b');
  P.px(cx - (heart > 0 ? 1 : 0), cy - (heart > 0 ? 1 : 0), '#b5763f');
  if (heart > 0) P.px(cx + 1, cy + 1, '#6b3e26');
}

function sunflowers(): Sprite {
  return sprite(15, 27, (P) => {
    soilMound(P, 7, 23, 6);
    for (const [x, top, foot] of [[4, 11, 23], [10, 9, 23], [7, 17, 24]] as const) {
      P.line(x, foot, x, top, C.leafDark);
      P.px(x - 1, top + 5, C.leaf);
      P.px(x - 2, top + 4, C.leafLight);
      P.px(x + 1, top + 8, C.leaf);
      P.px(x + 2, top + 7, C.leafLight);
    }
    sunHead(P, 10, 5, 4);
    sunHead(P, 4, 9, 3);
    sunHead(P, 7, 16, 2);
  });
}

function hydrangeas(): Sprite {
  const pompom = (P: Painter, cx: number, cy: number, [base, light, dark]: Bloom) => {
    P.disc(cx, cy, 2, base);
    for (const [dx, dy] of [[-1, -1], [0, -2], [-2, 0], [0, 0]] as const) P.px(cx + dx, cy + dy, light);
    for (const [dx, dy] of [[1, 1], [-1, 1], [2, 0], [0, 2]] as const) P.px(cx + dx, cy + dy, dark);
  };
  return sprite(15, 13, (P) => {
    P.ellipse(7, 9, 7, 3, C.leafDark);
    P.ellipse(7, 8, 6, 3, C.leaf);
    for (const [x, y] of [[2, 9], [12, 10], [7, 11]] as const) P.px(x, y, C.leafLight);
    pompom(P, 3, 6, BLOOM.blue);
    pompom(P, 8, 4, ['#c49ae0', '#e6caf5', '#9d72bf']);
    pompom(P, 12, 6, ['#f2a0c4', '#ffd0e4', '#d27aa3']);
    pompom(P, 7, 9, BLOOM.blue);
  });
}

function climbingRose(): Sprite {
  return sprite(14, 33, (P) => {
    // The trellis: two posts, a rounded top rail, a diamond lattice between.
    woodPost(P, 0, 3, 2, 25);
    woodPost(P, 12, 3, 2, 25);
    P.rect(0, 2, 14, 2, C.wood);
    P.rect(1, 1, 12, 1, C.woodLight);
    P.rect(0, 3, 14, 1, C.woodDark);
    for (let y = 4; y < 27; y++) {
      for (let x = 2; x < 12; x++) {
        if ((x + y) % 5 === 0) P.px(x, y, C.woodLight);
        else if ((x - y + 50) % 5 === 0) P.px(x, y, C.wood);
      }
    }
    // The wooden box it grows from.
    P.rect(0, 27, 14, 6, '#a86a45');
    P.rect(0, 27, 14, 1, '#c98a5e');
    P.rect(11, 28, 3, 5, '#8a5236');
    P.rect(4, 28, 1, 5, '#8a5236');
    P.rect(8, 28, 1, 5, '#8a5236');
    // Leaves thick at the foot, thinner up the trellis, and the roses.
    for (const [x, y, r] of [[3, 25, 2], [10, 25, 2], [6, 22, 2], [10, 19, 2], [3, 17, 2], [8, 14, 2], [4, 10, 2], [10, 9, 1], [6, 5, 2], [2, 5, 1], [11, 4, 1]] as const) {
      P.disc(x, y, r, C.leafDark);
      P.px(x - 1, y - 1, C.leaf);
      P.px(x, y - r, C.leafLight);
    }
    for (const [x, y] of [[2, 22], [9, 23], [6, 18], [11, 15], [2, 13], [8, 10], [5, 6], [10, 5], [1, 8], [6, 0], [11, 0], [1, 0]] as const) rose(P, x, y);
  });
}

function planter(view: View): Sprite {
  const flowers: readonly Bloom[] = [BLOOM.pink, BLOOM.white, BLOOM.yellow, BLOOM.purple, BLOOM.red];
  if (view === 'face') {
    return sprite(30, 15, (P) => {
      for (const x of [3, 8, 13, 18, 23, 27]) leafClump(P, x, 5, 3, 2);
      P.rect(1, 7, 28, 8, C.wood);
      P.rect(1, 7, 1, 8, C.woodLight);
      for (let x = 5; x < 26; x += 5) P.rect(x, 8, 1, 6, C.woodDark);
      P.rect(25, 7, 4, 8, '#ad7645');
      P.rect(0, 6, 30, 2, C.woodLight);
      P.rect(0, 7, 30, 1, C.wood);
      P.rect(1, 14, 28, 1, C.woodDark);
      // Ivy falling over the front.
      for (const x of [4, 11, 17, 24]) {
        P.line(x, 8, x, 10 + (x % 3), C.leafDark);
        P.px(x + 1, 9, C.leaf);
      }
      [[3, 3], [7, 2], [10, 4], [14, 2], [18, 3], [21, 2], [24, 4], [27, 3], [5, 5], [16, 5]].forEach(([x, y], i) => bloom(P, x, y, flowers[i % flowers.length]));
    });
  }
  return sprite(14, 30, (P) => {
    P.rect(1, 3, 12, 22, C.woodLight);
    P.rect(12, 3, 1, 22, C.woodDark);
    P.rect(2, 4, 10, 20, C.soil);
    for (let y = 6; y < 24; y += 5) leafClump(P, 7, y, 4, 2);
    [[4, 5], [9, 7], [5, 10], [10, 12], [4, 15], [8, 17], [5, 20], [10, 22]].forEach(([x, y], i) => bloom(P, x, y, flowers[i % flowers.length]));
    P.rect(1, 25, 12, 5, C.wood);
    P.rect(1, 25, 12, 1, C.woodLight);
    P.rect(4, 26, 1, 4, C.woodDark);
    P.rect(9, 26, 1, 4, C.woodDark);
    P.rect(11, 25, 2, 5, '#ad7645');
    P.line(3, 25, 3, 28, C.leafDark);
    P.line(10, 25, 10, 27, C.leafDark);
  });
}

// -----------------------------------------------
// GARDEN FURNITURE
// -----------------------------------------------

function wateringCan(): Sprite {
  return sprite(13, 10, (P) => {
    const [light, base, dark, deep] = ZINC;
    P.rect(3, 0, 4, 1, deep);
    P.px(2, 1, deep);
    P.px(7, 1, deep);
    P.rect(0, 4, 1, 3, deep);
    P.px(1, 3, deep);
    P.px(1, 7, deep);
    P.rect(2, 2, 6, 1, light);
    P.rect(2, 3, 6, 7, base);
    P.rect(2, 3, 1, 7, light);
    P.rect(6, 3, 2, 7, dark);
    P.rect(2, 5, 6, 1, dark);
    P.rect(2, 8, 6, 1, dark);
    P.line(8, 8, 11, 4, base);
    P.line(8, 9, 11, 5, dark);
    P.rect(11, 2, 2, 3, dark);
    P.px(11, 2, light);
  });
}

function picnicTable(view: View): Sprite {
  if (view === 'face') {
    return sprite(30, 17, (P) => {
      // The far bench, the table top in long boards, a gingham cloth hanging over the front.
      P.rect(2, 3, 26, 2, C.wood);
      P.rect(2, 3, 26, 1, C.woodLight);
      P.rect(0, 5, 30, 4, C.woodLight);
      P.rect(0, 5, 30, 1, '#ecc08a');
      P.rect(0, 7, 30, 1, '#c9965f');
      P.rect(0, 9, 30, 1, C.woodDark);
      for (let y = 5; y < 12; y++) for (let x = 8; x < 22; x++) if (y < 10 || x % 3 !== 2) P.px(x, y, gingham(x, y));
      woodPost(P, 4, 10, 2, 5);
      woodPost(P, 24, 10, 2, 5);
      // The near bench and its legs.
      P.rect(1, 12, 28, 2, C.wood);
      P.rect(1, 12, 28, 1, C.woodLight);
      P.rect(3, 14, 1, 3, C.woodDark);
      P.rect(26, 14, 1, 3, C.woodDark);
      // A cherry pie, a jug of lemonade, a wicker basket.
      P.ellipse(5, 5, 3, 1, COOKIE_DARK);
      P.rect(3, 4, 5, 1, '#f6d29a');
      P.px(4, 4, C.red);
      P.px(6, 4, C.red);
      P.rect(13, 2, 3, 4, '#ffe27a');
      P.px(13, 2, '#fff6c8');
      P.px(16, 3, '#e9f4f7');
      P.px(14, 1, '#e9f4f7');
      P.rect(20, 2, 6, 3, WICKER[1]);
      for (let x = 20; x < 26; x += 2) P.px(x, 3, WICKER[2]);
      P.rect(21, 0, 4, 1, WICKER[2]);
      P.px(20, 1, WICKER[2]);
      P.px(25, 1, WICKER[2]);
      P.px(21, 2, C.red);
    });
  }
  return sprite(16, 30, (P) => {
    P.rect(0, 6, 2, 20, C.wood);
    P.rect(0, 6, 1, 20, C.woodLight);
    P.rect(14, 6, 2, 20, C.woodDark);
    P.rect(3, 3, 10, 21, C.woodLight);
    P.rect(3, 3, 10, 1, '#ecc08a');
    for (const x of [6, 9]) P.rect(x, 4, 1, 20, '#c9965f');
    P.rect(12, 3, 1, 21, C.wood);
    for (let y = 6; y < 22; y++) for (let x = 5; x < 11; x++) P.px(x, y, gingham(x, y));
    P.rect(3, 24, 10, 2, C.woodDark);
    P.rect(4, 26, 2, 4, C.woodDark);
    P.rect(10, 26, 2, 4, C.woodDark);
    P.rect(0, 26, 1, 3, C.woodDark);
    P.rect(15, 26, 1, 3, C.woodDark);
    P.ellipse(8, 9, 2, 1, COOKIE_DARK);
    P.rect(7, 8, 3, 1, '#f6d29a');
    P.px(8, 8, C.red);
    P.rect(6, 14, 5, 3, WICKER[1]);
    P.rect(7, 13, 3, 1, WICKER[2]);
    P.rect(7, 19, 2, 3, '#ffe27a');
  });
}

const COOKIE_DARK = '#c98a4a';
const STRIPES = { blue: ['#5b9bd5', '#4a80b8'], white: ['#fff6e8', '#e6dccb'] } as const;

function deckChair(view: View): Sprite {
  const stripe = (i: number, shade: boolean) => (i % 2 ? STRIPES.white : STRIPES.blue)[shade ? 1 : 0];
  const hat = (P: Painter, x: number, y: number) => {
    P.ellipse(x, y + 1, 3, 1, C.strawDark);
    P.ellipse(x, y, 3, 1, C.straw);
    P.disc(x, y - 1, 1, C.strawLight);
    P.rect(x - 1, y, 3, 1, ROSE);
  };
  if (view === 'face') {
    return sprite(28, 14, (P) => {
      for (const x of [4, 14, 25]) P.rect(x, 10, 1, 4, C.woodDark);
      P.rect(5, 9, 23, 2, C.wood);
      P.rect(5, 9, 23, 1, C.woodLight);
      for (let y = 5; y < 9; y++) for (let x = 8; x < 27; x++) P.px(x, y, stripe((x - 8) >> 1, y === 8));
      // The backrest leans back towards the left.
      for (let y = 0; y < 9; y++) {
        const x0 = 1 + Math.floor(y * 0.75);
        P.px(x0 - 1, y, C.wood);
        for (let x = x0; x < x0 + 5; x++) P.px(x, y, stripe(y >> 1, x === x0 + 4));
        P.px(x0 + 5, y, C.woodDark);
      }
      hat(P, 21, 4);
    });
  }
  return sprite(14, 28, (P) => {
    woodPost(P, 1, 1, 2, 23);
    woodPost(P, 11, 1, 2, 23);
    for (let y = 1; y < 24; y++) for (let x = 3; x < 11; x++) P.px(x, y, stripe(y >> 1, x === 10));
    P.rect(3, 9, 8, 1, C.woodDark);
    P.rect(1, 24, 1, 4, C.woodDark);
    P.rect(12, 24, 1, 4, C.woodDark);
    P.rect(3, 24, 8, 1, C.woodDark);
    hat(P, 7, 16);
  });
}

function parasol(): Sprite {
  const coral: Tones = ['#ffb0a3', '#ef7a6d', '#cf5f55', '#b04a45'];
  return sprite(22, 28, (P) => {
    // A little round table under it.
    P.rect(10, 22, 2, 5, IRON);
    P.rect(8, 27, 6, 1, IRON);
    P.ellipse(11, 21, 6, 1, '#e3dccd');
    P.ellipse(11, 20, 6, 1, C.white);
    woodPost(P, 10, 9, 2, 12);
    // The canopy: a dome in six panels, coral and cream, a scalloped edge.
    for (let y = 1; y <= 8; y++) {
      const half = Math.round(10 * Math.sqrt(Math.max(0, 1 - ((8 - y) / 7.6) ** 2)));
      for (let x = 11 - half; x <= 11 + half; x++) {
        const t = (x - 11) / (half + 0.5);
        const panel = Math.floor((t + 1) * 3) % 2;
        const tone = y <= 2 || t < -0.5 ? 0 : t > 0.45 ? 2 : 1;
        P.px(x, y, (panel ? CREAM : coral)[tone]);
      }
    }
    for (let x = 1; x <= 21; x++) {
      if ((x - 1) % 4 === 3) continue;
      const panel = Math.floor(((x - 11) / 10.5 + 1) * 3) % 2;
      P.px(x, 9, (panel ? CREAM : coral)[2]);
    }
    P.px(11, 0, C.gold);
  });
}

function hammock(view: View): Sprite {
  const band = ['#ffd84a', '#ff8fb8', '#7ec4cf', '#fff6e0'];
  const cat = (P: Painter, x: number, y: number) => {
    P.ellipse(x, y, 3, 2, '#f0a050');
    P.px(x - 3, y - 2, '#f0a050');
    P.px(x - 2, y - 3, '#f0a050');
    P.px(x - 1, y - 2, '#f0a050');
    P.px(x, y - 1, '#d07a30');
    P.px(x + 2, y, '#d07a30');
    P.px(x - 2, y, OUTLINE);
    P.px(x + 3, y + 1, '#f0a050');
    P.px(x - 1, y - 1, '#ffc58a');
  };
  if (view === 'face') {
    return sprite(30, 22, (P) => {
      woodPost(P, 0, 2, 3, 20);
      woodPost(P, 27, 2, 3, 20);
      P.rect(0, 1, 3, 1, C.woodLight);
      P.rect(27, 1, 3, 1, C.woodLight);
      P.line(3, 5, 6, 8, '#c9a477');
      P.line(26, 5, 23, 8, '#c9a477');
      for (let x = 6; x <= 23; x++) {
        const yc = 8 + Math.round(5 * Math.sin((Math.PI * (x - 6)) / 17));
        band.forEach((col, i) => P.px(x, yc + i, col));
        if (x % 2 === 0) P.px(x, yc + 4, '#fff6e0');
      }
      cat(P, 15, 10);
    });
  }
  // Seen along it: the far post a little to the left, the near one to the right, the cloth sagging between.
  return sprite(15, 44, (P) => {
    woodPost(P, 1, 0, 3, 24);
    P.line(3, 4, 4, 8, '#c9a477');
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = Math.round(3 + 5 * t);
      const y = Math.round(8 + 14 * t + 6 * Math.sin(Math.PI * t));
      band.forEach((col, k) => P.px(x + k, y, col));
    }
    cat(P, 8, 18);
    woodPost(P, 11, 18, 3, 26);
    P.line(11, 22, 9, 24, '#c9a477');
  });
}

function porchSwing(view: View): Sprite {
  const canopy = (P: Painter, x0: number, w: number) => {
    for (let x = x0; x < x0 + w; x++) {
      const col = Math.floor((x - x0) / 3) % 2 ? CREAM : MINT;
      P.rect(x, 1, 1, 6, col[1]);
      P.px(x, 1, col[0]);
      if (x > x0 + w - 4) P.rect(x, 2, 1, 5, col[2]);
      if ((x - x0) % 4 !== 3) P.px(x, 7, col[2]);
    }
    P.rect(x0 + 1, 0, w - 2, 1, C.woodDark);
  };
  const cushion = (P: Painter, x: number, y: number, w: number) => {
    P.rect(x, y, w, 4, '#ff9ec4');
    P.rect(x, y, w, 1, '#ffc0d6');
    P.rect(x + w - 1, y + 1, 1, 3, '#e8789e');
    P.px(x + (w >> 1), y + 2, '#e8789e');
  };
  if (view === 'face') {
    return sprite(30, 34, (P) => {
      P.line(1, 33, 5, 8, C.wood);
      P.line(2, 33, 6, 8, C.woodDark);
      P.line(28, 33, 24, 8, C.wood);
      P.line(27, 33, 23, 8, C.woodDark);
      P.rect(2, 8, 26, 2, C.wood);
      P.rect(2, 8, 26, 1, C.woodLight);
      canopy(P, 0, 30);
      P.line(7, 10, 7, 18, IRON);
      P.line(22, 10, 22, 18, IRON);
      P.rect(5, 15, 20, 5, C.woodLight);
      for (const x of [8, 12, 16, 20]) P.rect(x, 15, 1, 5, C.wood);
      P.rect(4, 20, 22, 3, C.wood);
      P.rect(4, 20, 22, 1, C.woodLight);
      P.rect(4, 22, 22, 1, C.woodDark);
      cushion(P, 6, 17, 8);
      cushion(P, 16, 17, 8);
    });
  }
  return sprite(16, 40, (P) => {
    P.line(1, 39, 7, 8, C.wood);
    P.line(14, 39, 8, 8, C.woodDark);
    P.line(2, 39, 7, 9, C.woodLight);
    canopy(P, 2, 12);
    P.line(8, 9, 8, 22, IRON);
    P.rect(9, 18, 2, 10, C.woodLight);
    P.rect(4, 27, 7, 2, C.wood);
    P.rect(4, 27, 7, 1, C.woodLight);
    cushion(P, 5, 23, 4);
  });
}

// -----------------------------------------------
// WATER
// -----------------------------------------------

function birdBath(): Sprite {
  return sprite(14, 17, (P) => {
    P.rect(3, 14, 8, 3, C.stoneDark);
    P.rect(3, 14, 8, 1, C.stone);
    P.rect(4, 13, 6, 1, C.stone);
    P.rect(5, 7, 4, 6, C.stone);
    P.rect(5, 7, 1, 6, '#ffffff');
    P.rect(8, 7, 1, 6, C.stoneDark);
    P.rect(4, 10, 6, 1, C.stoneDark);
    P.px(5, 11, C.leaf);
    P.px(6, 12, C.leafDark);
    P.px(8, 9, C.leaf);
    P.ellipse(7, 7, 5, 1, C.stoneDark);
    P.ellipse(7, 5, 6, 2, '#f6f1e8');
    P.ellipse(7, 5, 4, 1, C.water);
    P.px(5, 4, C.waterLight);
    P.px(9, 6, C.waterDark);
    // A robin on the rim.
    P.rect(11, 1, 2, 2, '#8a5a3b');
    P.rect(10, 0, 2, 2, '#8a5a3b');
    P.rect(10, 2, 2, 1, '#f08a4b');
    P.px(9, 1, C.gold);
    P.px(10, 0, OUTLINE);
    P.px(13, 0, '#6f4630');
    P.px(11, 3, OUTLINE);
  });
}

function lilyPond(): Sprite {
  return sprite(30, 24, (P) => {
    P.ellipse(15, 14, 14, 8, WARM_STONE[2]);
    P.ellipse(15, 13, 14, 7, WARM_STONE[1]);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const x = Math.round(15 + Math.cos(a) * 13);
      const y = Math.round(13 + Math.sin(a) * 6.5);
      P.rect(x, y, 2, 1, i % 2 ? WARM_STONE[0] : WARM_STONE[1]);
      P.px(x + 2, y, WARM_STONE[2]);
    }
    P.ellipse(15, 14, 12, 6, '#3f7fb3');
    P.ellipse(15, 14, 11, 5, '#4f93c8');
    P.ellipse(13, 13, 7, 3, '#5ea6db');
    // Two koi under the water.
    P.rect(8, 17, 3, 1, '#ff9e4a');
    P.px(7, 17, '#ffffff');
    P.px(11, 18, '#ffc58a');
    P.rect(19, 11, 3, 1, '#ffffff');
    P.px(20, 11, '#ff9e4a');
    P.px(22, 10, '#ffc58a');
    // Lily pads, three in flower.
    for (const [x, y, dark] of [[6, 12, false], [11, 9, true], [22, 16, false], [17, 18, true], [24, 11, false], [13, 16, false]] as const) {
      P.ellipse(x, y, 2, 1, dark ? C.leafDark : C.leaf);
      P.px(x + 1, y, '#4f93c8');
      P.px(x - 1, y - 1, C.leafLight);
    }
    for (const [x, y] of [[6, 11], [22, 15], [24, 10]] as const) {
      P.rect(x - 1, y, 3, 1, '#ff9ec4');
      P.px(x - 1, y - 1, '#ffd0e4');
      P.px(x + 1, y - 1, '#ff9ec4');
      P.px(x, y, '#fff1a0');
    }
    // A dragonfly over the water.
    P.rect(23, 4, 4, 1, '#4fb0c6');
    P.px(22, 4, '#2f7f95');
    P.px(24, 3, '#d6eefc');
    P.px(25, 3, '#d6eefc');
    P.px(24, 5, '#d6eefc');
  }, true, 1, (P) => {
    P.rect(9, 11, 3, 1, C.waterLight);
    P.px(10, 10, '#ffffff');
    P.rect(18, 15, 2, 1, WATER_MIST);
  });
}

/** A small round pool edged with stones, reeds on one side: under the bridge. */
function pool(P: Painter, cx: number, cy: number, rx: number, ry: number): void {
  P.ellipse(cx, cy + 1, rx, ry, C.greyDark);
  P.ellipse(cx, cy, rx, ry, C.grey);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    P.ellipse(Math.round(cx + Math.cos(a) * (rx - 1)), Math.round(cy + Math.sin(a) * (ry - 0.5)), 1, 1, i % 2 ? C.greyLight : '#e2ddd5');
  }
  P.ellipse(cx, cy + 1, rx - 2, ry - 2, C.waterDark);
  P.ellipse(cx, cy + 1, rx - 3, ry - 3, C.water);
  P.ellipse(cx - 2, cy, Math.max(1, rx - 7), Math.max(1, ry - 4), '#6aaee0');
}

function gardenBridge(view: View): Sprite {
  if (view === 'face') {
    return sprite(46, 31, (P) => {
      pool(P, 23, 22, 18, 8);
      for (const [x, h] of [[40, 9], [42, 11], [44, 7]] as const) {
        P.line(x, 22, x, 22 - h, C.leafDark);
        P.rect(x, 22 - h, 1, 3, C.bark);
      }
      P.ellipse(9, 25, 2, 1, C.leaf);
      P.px(9, 24, '#ff9ec4');
      // Stone footings at each end.
      stones(P, 0, 14, 5, 8, [C.greyLight, C.grey, C.greyDark]);
      stones(P, 41, 14, 5, 8, [C.greyLight, C.grey, C.greyDark]);
      // The arched deck: its boards on top, its side beam under them.
      const top = (x: number) => 14 - Math.round(6 * Math.sin((Math.PI * x) / 45));
      for (let x = 0; x < 46; x++) {
        const y = top(x);
        P.rect(x, y - 2, 1, 2, x % 3 === 0 ? C.woodDark : C.woodLight);
        P.rect(x, y, 1, 3, C.wood);
        P.px(x, y, '#ad7645');
        P.px(x, y + 2, C.woodDark);
      }
      // The far handrail, thin, then the near one on its posts.
      for (let x = 0; x < 46; x++) P.px(x, top(x) - 7, '#9a6639');
      for (let x = 1; x < 46; x += 7) {
        P.rect(x, top(x) - 7, 1, 5, '#9a6639');
        P.rect(x, top(x) - 6, 2, 9, C.wood);
        P.px(x, top(x) - 6, C.woodLight);
      }
      for (let x = 0; x < 46; x++) {
        P.px(x, top(x) - 6, C.woodLight);
        P.px(x, top(x) - 5, C.wood);
      }
      // A pot of flowers on each newel.
      for (const x of [1, 43]) {
        P.rect(x, top(x) - 9, 2, 2, C.brick);
        bloom(P, x + 1, top(x) - 11, BLOOM.pink);
      }
    });
  }
  return sprite(30, 46, (P) => {
    pool(P, 15, 24, 14, 11);
    stones(P, 8, 0, 14, 4, [C.greyLight, C.grey, C.greyDark]);
    stones(P, 8, 42, 14, 4, [C.greyLight, C.grey, C.greyDark]);
    for (let y = 2; y < 44; y++) {
      const hump = Math.sin((Math.PI * (y - 2)) / 41);
      P.rect(10, y, 10, 1, hump > 0.75 ? '#ecc08a' : C.woodLight);
      if (y % 3 === 0) P.rect(10, y, 10, 1, '#c9965f');
      P.px(19, y, C.wood);
    }
    for (const x of [8, 20]) {
      P.rect(x, 1, 2, 43, x === 8 ? C.woodLight : C.wood);
      for (let y = 2; y < 44; y += 7) P.rect(x, y, 2, 3, C.woodDark);
    }
    bloom(P, 9, 1, BLOOM.pink);
    bloom(P, 21, 1, BLOOM.pink);
  });
}

// -----------------------------------------------
// LIGHTS
// -----------------------------------------------

function candleJar(): Sprite {
  return sprite(8, 11, (P) => {
    P.rect(2, 0, 4, 1, IRON);
    P.px(1, 1, IRON);
    P.px(6, 1, IRON);
    P.px(1, 2, IRON);
    P.px(6, 2, IRON);
    P.rect(1, 3, 6, 1, '#e9f4f7');
    P.rect(1, 4, 6, 7, '#bcdbe6');
    P.rect(1, 4, 1, 7, '#e9f4f7');
    P.rect(5, 4, 2, 7, '#9cc3d2');
    P.rect(2, 5, 3, 2, '#f3e2b0');
    P.rect(3, 7, 2, 4, C.cream);
    P.px(3, 7, '#ffffff');
    P.px(3, 5, '#fff3c4');
    P.px(3, 6, '#ffcf6b');
    P.px(4, 6, '#ffb347');
    P.rect(1, 9, 6, 1, '#c9a477');
  });
}

function lamppost(): Sprite {
  return sprite(13, 37, (P) => {
    P.rect(3, 33, 7, 4, IRON);
    P.rect(3, 33, 7, 1, IRON_LIGHT);
    P.rect(4, 32, 5, 1, IRON);
    P.rect(5, 13, 3, 19, IRON);
    P.rect(5, 13, 1, 19, IRON_LIGHT);
    P.rect(4, 21, 5, 1, IRON);
    P.rect(4, 28, 5, 2, IRON);
    // The lantern: a little iron roof, warm glass, a bright heart.
    P.px(6, 0, IRON);
    P.rect(5, 1, 3, 1, IRON);
    P.rect(4, 2, 5, 1, IRON);
    P.rect(2, 3, 9, 1, IRON);
    P.rect(3, 4, 7, 8, IRON);
    P.rect(4, 5, 5, 6, C.glow);
    P.rect(5, 6, 2, 3, '#fff3c4');
    P.rect(4, 12, 5, 1, IRON);
    // A hanging basket of flowers.
    P.rect(8, 16, 4, 1, IRON);
    P.px(11, 17, IRON);
    P.rect(9, 19, 4, 2, WICKER[1]);
    P.rect(10, 21, 2, 1, WICKER[2]);
    P.px(9, 18, C.leaf);
    P.px(12, 18, C.leafDark);
    P.px(10, 18, BLOOM.pink[0]);
    P.px(12, 17, BLOOM.pink[1]);
    P.px(9, 21, C.leaf);
    P.px(12, 22, C.leafDark);
  });
}

const BULB_COLOURS = ['#ffd479', '#ff9ec4', '#9fe3c4', '#a8d6f5'];

/** The bulbs of the string lights, as [x, y] in the drawing. */
function stringBulbs(view: View): [number, number][] {
  if (view === 'face') {
    const bulbs: [number, number][] = [];
    for (let x = 4; x <= 26; x += 4) bulbs.push([x, 4 + Math.round(8 * Math.sin((Math.PI * (x - 1)) / 27)) + 1]);
    return bulbs;
  }
  return [0.15, 0.32, 0.5, 0.68, 0.85].map((t) => [stringX(t), stringY(t) + 1]);
}

/** The string seen along it, from the far post's top (t = 0) to the near one's (t = 1), sagging between. */
const stringX = (t: number) => Math.round(3 + 8 * t);
const stringY = (t: number) => Math.round(1 + 16 * t + 5 * Math.sin(Math.PI * t));

function stringLights(view: View): Sprite {
  if (view === 'face') {
    return sprite(30, 24, (P) => {
      woodPost(P, 0, 3, 2, 21);
      woodPost(P, 28, 3, 2, 21);
      P.rect(0, 2, 2, 1, C.woodLight);
      P.rect(28, 2, 2, 1, C.woodLight);
      for (let x = 2; x <= 27; x++) P.px(x, 4 + Math.round(8 * Math.sin((Math.PI * (x - 1)) / 27)), '#3f3331');
      stringBulbs(view).forEach(([x, y], i) => {
        P.rect(x, y, 1, 2, BULB_COLOURS[i % 4]);
        P.px(x, y, '#ffffff');
      });
    });
  }
  return sprite(14, 40, (P) => {
    woodPost(P, 2, 1, 2, 22);
    P.rect(2, 0, 2, 1, C.woodLight);
    for (let i = 0; i <= 30; i++) P.px(stringX(i / 30), stringY(i / 30), '#3f3331');
    stringBulbs(view).forEach(([x, y], i) => {
      P.rect(x, y, 1, 2, BULB_COLOURS[i % 4]);
      P.px(x, y, '#ffffff');
    });
    woodPost(P, 10, 17, 2, 23);
    P.rect(10, 16, 2, 1, C.woodLight);
  });
}

// -----------------------------------------------
// COUNTRY PIECES
// -----------------------------------------------

/** A tight cluster of geranium flowers. */
function geranium(P: Painter, x: number, y: number, [base, light, dark]: Bloom): void {
  P.rect(x - 1, y, 3, 1, base);
  P.px(x, y - 1, light);
  P.px(x - 1, y - 1, base);
  P.px(x + 1, y + 1, dark);
  P.px(x, y + 1, base);
}

function flowerBarrel(): Sprite {
  return sprite(14, 16, (P) => {
    leafClump(P, 7, 4, 6, 3);
    P.rect(1, 7, 12, 9, '#b07444');
    P.rect(1, 7, 2, 9, '#cf9260');
    for (const x of [4, 7, 10]) P.rect(x, 7, 1, 9, '#8f5a34');
    P.rect(11, 7, 2, 9, '#8f5a34');
    P.rect(1, 9, 12, 1, IRON);
    P.rect(1, 13, 12, 1, IRON);
    P.px(2, 9, IRON_LIGHT);
    P.px(2, 13, IRON_LIGHT);
    P.rect(0, 6, 14, 2, '#cf9260');
    P.rect(0, 7, 14, 1, '#b07444');
    P.line(1, 8, 0, 11, C.leafDark);
    P.line(13, 8, 13, 10, C.leafDark);
    geranium(P, 3, 2, BLOOM.red);
    geranium(P, 8, 1, BLOOM.red);
    geranium(P, 11, 4, BLOOM.white);
    geranium(P, 5, 5, BLOOM.white);
    geranium(P, 10, 6, BLOOM.red);
  });
}

const ROOSTER = [
  '.kk......',
  'bLLr...Lr',
  '.LrrrrLrr',
  '..rrrrrR.',
  '...RrrR..',
  '....i.i..',
];

function weathervane(): Sprite {
  return sprite(14, 36, (P) => {
    P.map(3, 0, ROOSTER, { k: C.red, b: C.gold, L: '#f0a868', r: '#d08040', R: '#a85a2c', i: IRON });
    P.rect(6, 6, 1, 7, IRON);
    // The compass arrow.
    P.rect(1, 9, 12, 1, IRON);
    P.px(12, 8, IRON);
    P.px(12, 10, IRON);
    P.px(13, 9, IRON);
    P.px(1, 8, IRON_LIGHT);
    P.px(1, 10, IRON_LIGHT);
    P.px(2, 8, IRON_LIGHT);
    P.px(2, 10, IRON_LIGHT);
    // The little cupola it stands on, and its post.
    for (let i = 0; i < 4; i++) {
      P.rect(5 - i, 13 + i, 2 * i + 4, 1, i < 2 ? ROOF_RED[0] : ROOF_RED[1]);
      P.px(8 + i, 13 + i, ROOF_RED[2]);
    }
    P.rect(1, 17, 12, 1, ROOF_RED[3]);
    P.rect(3, 18, 8, 6, C.white);
    P.rect(3, 18, 1, 6, '#ffffff');
    P.rect(9, 18, 2, 6, '#e3dccd');
    for (const y of [19, 21]) P.rect(4, y, 5, 1, C.grey);
    P.rect(3, 23, 8, 1, C.greyDark);
    woodPost(P, 6, 24, 2, 12);
  });
}

function flowerCart(view: View): Sprite {
  const colours: readonly Bloom[] = [BLOOM.pink, BLOOM.yellow, BLOOM.white, BLOOM.purple, BLOOM.red, BLOOM.orange];
  if (view === 'face') {
    return sprite(30, 22, (P) => {
      P.line(7, 12, 0, 17, C.woodDark);
      P.line(7, 13, 1, 18, C.wood);
      P.rect(1, 18, 1, 4, C.woodDark);
      for (const x of [9, 14, 19, 24]) leafClump(P, x, 6, 4, 3);
      P.rect(6, 8, 20, 7, C.wood);
      P.rect(6, 8, 1, 7, C.woodLight);
      P.rect(6, 10, 20, 1, C.woodDark);
      P.rect(6, 12, 20, 1, C.woodDark);
      P.rect(23, 8, 3, 7, '#ad7645');
      P.rect(5, 7, 22, 1, C.woodLight);
      [[8, 3], [11, 5], [13, 2], [16, 4], [19, 2], [21, 5], [24, 3], [10, 1], [18, 6], [26, 6]].forEach(([x, y], i) => bloom(P, x, y, colours[i % colours.length]));
      // One big spoked wheel.
      P.disc(18, 16, 5, C.woodDark);
      P.disc(18, 16, 4, '#ad7645');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        P.line(18, 16, Math.round(18 + Math.cos(a) * 4), Math.round(16 + Math.sin(a) * 4), C.woodDark);
      }
      P.disc(18, 16, 1, IRON);
      P.px(15, 13, C.woodLight);
    });
  }
  return sprite(16, 32, (P) => {
    P.line(4, 6, 4, 0, C.woodDark);
    P.line(11, 6, 11, 0, C.woodDark);
    P.rect(3, 5, 10, 20, C.wood);
    P.rect(3, 5, 1, 20, C.woodLight);
    P.rect(12, 5, 1, 20, C.woodDark);
    for (let y = 8; y < 22; y += 4) leafClump(P, 8, y, 4, 2);
    [[5, 7], [10, 9], [6, 12], [10, 15], [5, 17], [9, 20], [7, 6]].forEach(([x, y], i) => bloom(P, x, y, colours[i % colours.length]));
    P.rect(3, 25, 10, 5, C.wood);
    P.rect(3, 25, 10, 1, C.woodLight);
    P.rect(3, 27, 10, 1, C.woodDark);
    P.ellipse(1, 25, 1, 5, C.woodDark);
    P.ellipse(14, 25, 1, 5, C.woodDark);
    P.px(1, 22, C.woodLight);
  });
}

// -----------------------------------------------
// SHOWPIECES: one per farm, the Eloisettes' great goals
// -----------------------------------------------

const WISTERIA = ['#d6b8f5', '#b58ee0', '#8f6ac2'] as const;

/**
 * The pergola, for both views: `w` wide, its back beam `depth` pixels above the front one. Posts at the four
 * corners, rafters running back, wisteria hanging from the beams, a little table on a stone floor.
 */
function pergola(view: View): Sprite {
  const w = view === 'face' ? 46 : 30;
  const depth = view === 'face' ? 14 : 28;
  const back = 5;
  const front = back + depth;
  const postH = 30;
  return sprite(w, front + postH + 1, (P) => {
    const base = front + postH;
    stones(P, 2, back + postH - 6, w - 4, base - (back + postH - 6), WARM_STONE);
    // Back posts and beam, in shade, and the wisteria hanging from it.
    P.rect(5, back, 2, postH, '#a06a40');
    P.rect(w - 7, back, 2, postH, '#a06a40');
    P.rect(3, back - 1, w - 6, 2, C.wood);
    for (let x = 5; x < w - 4; x += 5) for (let i = 0; i < 3 + (x % 3); i++) P.px(x, back + 1 + i, WISTERIA[2]);
    // A round table and two wicker chairs.
    const cx = w >> 1;
    const floor = base - 6;
    P.rect(cx - 1, floor - 6, 2, 6, IRON);
    P.ellipse(cx, floor - 7, 5, 1, C.white);
    bloom(P, cx, floor - 9, BLOOM.purple);
    for (const side of [-1, 1]) {
      const x = cx + side * 9 - 3;
      P.rect(x, floor - 11, 6, 6, WICKER[1]);
      P.rect(x, floor - 11, 6, 1, WICKER[0]);
      P.rect(x, floor - 5, 6, 2, WICKER[2]);
      for (let i = 0; i < 6; i += 2) P.px(x + i, floor - 8, WICKER[2]);
      P.rect(x, floor - 3, 1, 3, WICKER[2]);
      P.rect(x + 5, floor - 3, 1, 3, WICKER[2]);
    }
    // Rafters running from the back beam to the front one.
    for (let x = 4; x <= w - 6; x += 6) {
      const xf = x + Math.round((x - w / 2) * 0.08);
      P.line(x, back, xf, front, C.woodLight);
      P.line(x + 1, back, xf + 1, front, C.wood);
    }
    // Front posts and beam, leaves along the beams, the wisteria in long bunches.
    woodPost(P, 1, front, 3, postH);
    woodPost(P, w - 4, front, 3, postH);
    for (let x = 2; x < w - 1; x += 4) {
      leafClump(P, x, back - 1, 2, 1);
      leafClump(P, x + 1, front - 1, 3, 2);
    }
    P.rect(0, front, w, 3, C.wood);
    P.rect(0, front, w, 1, C.woodLight);
    P.rect(0, front + 2, w, 1, C.woodDark);
    for (let x = 3; x < w - 2; x += 4) {
      const len = 4 + ((x * 7) % 5);
      for (let i = 0; i < len; i++) {
        P.px(x, front + 3 + i, i % 2 ? WISTERIA[1] : WISTERIA[0]);
        if (i < len - 1) P.px(x + 1, front + 4 + i, WISTERIA[2]);
      }
      P.px(x - 1, front + 3, C.leaf);
    }
    // A pot of flowers at the foot of each front post.
    for (const x of [4, w - 8]) {
      P.rect(x, base - 4, 4, 4, C.brick);
      P.rect(x, base - 4, 4, 1, '#e08a6a');
      bloom(P, x + 1, base - 6, BLOOM.pink);
      bloom(P, x + 3, base - 7, BLOOM.white);
    }
  });
}

/** The bulbs along the bandstand's valance, as x in the drawing. */
const BANDSTAND_BULBS = [3, 9, 15, 21, 27, 33, 39];

function bandstand(): Sprite {
  return sprite(46, 58, (P) => {
    // The dark inside, the back columns, the floor.
    P.rect(3, 22, 40, 20, '#6e4f55');
    for (const x of [8, 17, 28, 37]) P.rect(x, 22, 2, 20, '#bfb1a3');
    P.ellipse(23, 43, 21, 3, '#e6d6b6');
    for (const x of [8, 15, 23, 31, 38]) P.px(x, 43, '#c9b391');
    // The base: white panels, a gold band, steps up the middle.
    P.rect(2, 44, 42, 9, C.stone);
    P.rect(2, 45, 42, 1, C.gold);
    for (let x = 3; x < 42; x += 7) {
      P.rect(x, 47, 5, 4, '#f3ede2');
      P.rect(x, 50, 5, 1, '#ddd3c3');
    }
    P.rect(2, 52, 42, 1, C.stoneDark);
    P.rect(17, 48, 12, 2, C.stone);
    P.rect(16, 50, 14, 2, '#f3ede2');
    P.rect(15, 52, 16, 2, C.stone);
    P.rect(14, 54, 18, 3, '#f3ede2');
    for (const y of [49, 51, 53]) P.rect(16, y, 14, 1, C.stoneDark);
    // The railing and the front columns.
    for (const y of [37, 41]) {
      P.rect(3, y, 21, 1, C.white);
      P.rect(32, y, 11, 1, C.white);
    }
    for (let x = 4; x < 42; x += 2) if (x < 23 || x > 32) P.rect(x, 38, 1, 3, C.white);
    for (const x of [3, 12, 22, 32, 41]) {
      P.rect(x, 22, 2, 22, C.white);
      P.px(x + 1, 22, '#e3dccd');
      P.rect(x + 1, 23, 1, 21, '#e3dccd');
      P.rect(x - 1, 22, 4, 1, C.gold);
      P.rect(x - 1, 43, 4, 1, C.stoneDark);
    }
    // Bunting under the roof.
    const flags = [C.red, C.gold, C.blue, ROSE, MINT[1]];
    for (let x = 4, i = 0; x < 42; x += 3, i++) {
      if ([3, 12, 22, 32, 41].some((c) => x >= c - 1 && x <= c + 2)) continue;
      P.rect(x, 23, 2, 1, flags[i % flags.length]);
      P.px(x, 24, flags[i % flags.length]);
    }
    roofCone(P, 23, 2, 15, 21, ROOF_PINK, CREAM);
    P.rect(0, 17, 46, 4, ROOF_PINK[1]);
    for (let x = 0; x < 46; x++) {
      const col = Math.floor(x / 4) % 2 ? CREAM : ROOF_PINK;
      P.rect(x, 17, 1, 4, col[1]);
      P.px(x, 17, col[0]);
      if (x % 4 !== 3) P.px(x, 21, col[2]);
    }
    for (const x of BANDSTAND_BULBS) P.px(x, 20, C.glow);
    // A gold lyre over the steps, a gold finial.
    P.rect(21, 18, 1, 2, C.goldDark);
    P.rect(24, 18, 1, 2, C.goldDark);
    P.rect(22, 18, 2, 1, C.gold);
    P.px(22, 20, C.gold);
    P.px(23, 20, C.gold);
    P.rect(22, 0, 2, 2, C.gold);
    P.px(22, 0, C.goldLight);
    twinkle(P, 7, 9);
  });
}

/**
 * A round roof seen from the front, its eave `half` pixels either side of `cx` at `bottom`, flaring like a bell:
 * panels of two colours meeting at the top, lit on the left.
 */
function roofCone(P: Painter, cx: number, top: number, rows: number, half: number, a: Tones, b: Tones): void {
  for (let i = 0; i < rows; i++) {
    const h = Math.round(1 + (half - 1) * (i / (rows - 1)) ** 1.5);
    for (let x = cx - h; x <= cx + h; x++) {
      const t = (x - cx) / (h + 0.5);
      const panel = Math.floor((t + 1) * 4) % 2 ? b : a;
      const tone = i < 2 ? 0 : t < -0.45 ? 0 : t > 0.55 ? 2 : 1;
      P.px(x, top + i, panel[tone]);
    }
  }
}

const GLASS = '#bfe0ea';
const GLASS_LIGHT = '#e6f6fb';

function greenhouse(view: View): Sprite {
  if (view === 'face') {
    return sprite(46, 40, (P) => {
      // The glass roof leaning back, its ridge with white cresting and gold finials.
      P.rect(2, 4, 42, 11, '#cfe9f1');
      for (let x = 4; x < 44; x += 5) P.rect(x, 4, 1, 11, FRAME_SHADE);
      for (let x = 6; x < 40; x += 9) P.line(x, 13, x + 4, 5, GLASS_LIGHT);
      P.rect(1, 3, 44, 1, FRAME);
      for (let x = 2; x < 44; x += 2) P.px(x, 2, FRAME);
      for (const x of [1, 44]) {
        P.rect(x, 0, 1, 3, C.gold);
        P.px(x, 0, C.goldLight);
      }
      P.rect(0, 15, 46, 1, FRAME_SHADE);
      // The glass wall, the plants seen through it.
      P.rect(1, 16, 44, 14, GLASS);
      P.ellipse(7, 23, 4, 5, '#8fcfa6');
      P.ellipse(16, 25, 3, 4, '#7cbf96');
      P.ellipse(33, 23, 5, 5, '#8fcfa6');
      P.ellipse(40, 25, 3, 4, '#7cbf96');
      for (const [x, y, col] of [[6, 20, '#ffc6d9'], [9, 24, '#ffc6d9'], [15, 23, '#ffd2a0'], [32, 20, '#fff0b0'], [35, 25, '#ffc6d9'], [40, 23, '#ffd2a0']] as const) P.px(x, y, col);
      P.rect(1, 27, 44, 1, '#a7c9c9');
      for (let x = 3; x < 44; x += 11) P.line(x, 29, x + 5, 17, GLASS_LIGHT);
      for (let x = 5; x < 45; x += 5) P.rect(x, 16, 1, 14, FRAME);
      P.rect(1, 22, 44, 1, FRAME);
      P.rect(0, 15, 1, 15, FRAME);
      P.rect(45, 15, 1, 15, FRAME_SHADE);
      // The porch: a little glass gable over a double door.
      for (let i = 0; i < 6; i++) P.rect(23 - i - 1, 9 + i, 2 * i + 2, 1, i === 0 ? FRAME : GLASS);
      P.line(17, 15, 22, 9, FRAME);
      P.line(28, 15, 23, 9, FRAME);
      P.px(22, 8, C.gold);
      P.px(23, 8, C.gold);
      P.rect(18, 16, 10, 14, FRAME);
      P.rect(19, 17, 4, 13, '#a8d8e4');
      P.rect(23, 17, 4, 13, '#a8d8e4');
      P.px(22, 23, C.gold);
      P.px(23, 23, C.gold);
      P.px(20, 18, GLASS_LIGHT);
      P.px(24, 18, GLASS_LIGHT);
      // A low brick wall.
      P.rect(0, 30, 46, 1, C.stone);
      P.rect(0, 31, 46, 9, C.brick);
      for (const y of [33, 36, 39]) P.rect(0, y, 46, 1, C.brickDark);
      for (let y = 31; y < 39; y += 3) for (let x = (y % 2 ? 2 : 5); x < 46; x += 6) P.rect(x, y, 1, 2, C.brickDark);
      P.rect(18, 30, 10, 10, C.stone);
      P.rect(18, 34, 10, 1, C.stoneDark);
    });
  }
  return sprite(30, 54, (P) => {
    const gableTop = 18;
    const shift = 16;
    const edge = (x: number) => gableTop + Math.round(Math.abs(x - 15) * (12 / 15));
    // The two slopes of the roof going back, then the gable end in front.
    for (let x = 0; x < 30; x++) {
      P.rect(x, edge(x) - shift, 1, shift, x < 15 ? '#d9eef5' : '#b5d7e2');
      for (let j = 4; j < shift; j += 5) P.px(x, edge(x) - j, FRAME_SHADE);
    }
    for (let y = gableTop - shift; y < gableTop; y++) P.px(15, y, FRAME);
    P.rect(14, 0, 2, 2, C.gold);
    for (let x = 0; x < 30; x++) P.rect(x, edge(x), 1, 42 - edge(x), GLASS);
    for (let x = 0; x < 30; x++) P.px(x, edge(x), FRAME);
    P.ellipse(6, 36, 3, 4, '#8fcfa6');
    P.ellipse(24, 35, 3, 5, '#8fcfa6');
    P.px(6, 34, '#ffc6d9');
    P.px(24, 33, '#ffd2a0');
    for (const x of [4, 9, 20, 25]) P.rect(x, edge(x), 1, 42 - edge(x), FRAME);
    P.rect(0, 30, 30, 1, FRAME);
    P.rect(11, 28, 8, 14, FRAME);
    P.rect(12, 29, 3, 13, '#a8d8e4');
    P.rect(15, 29, 3, 13, '#a8d8e4');
    P.px(14, 35, C.gold);
    P.px(15, 35, C.gold);
    P.line(2, 40, 8, 26, GLASS_LIGHT);
    P.rect(0, 42, 30, 1, C.stone);
    P.rect(0, 43, 30, 11, C.brick);
    for (const y of [45, 48, 51]) P.rect(0, y, 30, 1, C.brickDark);
    P.rect(11, 42, 8, 12, C.stone);
    P.rect(11, 47, 8, 1, C.stoneDark);
  });
}

function treehouse(): Sprite {
  return sprite(46, 66, (P) => {
    // The trunk, its roots, a branch with a tyre swing.
    P.rect(19, 30, 8, 32, C.bark);
    P.rect(19, 30, 2, 32, '#a87050');
    P.rect(25, 30, 2, 32, C.barkDark);
    P.ellipse(23, 62, 8, 2, C.barkDark);
    P.rect(16, 59, 14, 3, C.bark);
    P.rect(16, 59, 3, 3, '#a87050');
    for (const [x, y] of [[22, 40], [23, 48], [21, 54], [24, 35]] as const) P.rect(x, y, 1, 3, C.barkDark);
    P.line(19, 42, 6, 39, C.bark);
    P.line(19, 43, 7, 40, C.barkDark);
    P.line(8, 40, 8, 50, '#c9a477');
    P.ellipse(8, 53, 3, 2, '#3f3331');
    P.ellipse(8, 53, 1, 0, '#6e5a58');
    // The crown, in big round clumps.
    const r = mulberry32(7);
    for (const [cx, cy, rad] of [[23, 15, 14], [10, 21, 9], [36, 21, 9], [14, 9, 8], [32, 9, 8], [23, 6, 8]] as const) {
      P.disc(cx, cy, rad, C.leafDark);
      P.disc(cx - 1, cy - 1, rad - 2, C.leaf);
      P.disc(cx - 3, cy - 3, Math.max(1, rad - 6), C.leafLight);
    }
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(r() * 44) + 1;
      const y = Math.floor(r() * 28) + 1;
      P.px(x, y, r() < 0.5 ? C.leafPale : C.leafDark);
    }
    // The platform on its beams, the cabin with a pointed roof, its railing.
    P.line(20, 44, 10, 34, C.woodDark);
    P.line(26, 44, 36, 34, C.woodDark);
    P.rect(11, 18, 24, 13, C.wood);
    for (let x = 14; x < 35; x += 3) P.rect(x, 18, 1, 13, '#ad7645');
    P.rect(11, 18, 1, 13, C.woodLight);
    P.rect(32, 18, 3, 13, '#ad7645');
    framedWindow(P, 15, 22, 5, 4, { flowers: true });
    plankDoor(P, 26, 22, 5, 9);
    for (let i = 0; i < 10; i++) {
      const half = 3 + Math.round(i * 1.4);
      P.rect(23 - half, 8 + i, 2 * half + 1, 1, i < 2 ? ROOF_RED[0] : ROOF_RED[1]);
      if (i % 3 === 2) for (let x = 23 - half + 1; x < 23 + half; x += 3) P.rect(x, 8 + i, 2, 1, ROOF_RED[2]);
      P.rect(23 + half - 1, 8 + i, 2, 1, ROOF_RED[2]);
    }
    P.rect(8, 17, 31, 2, ROOF_RED[3]);
    P.rect(8, 17, 31, 1, ROOF_RED[2]);
    P.disc(23, 13, 1, C.glow);
    P.rect(6, 31, 34, 3, C.wood);
    P.rect(6, 31, 34, 1, C.woodLight);
    P.rect(6, 33, 34, 1, C.woodDark);
    P.rect(6, 27, 34, 1, C.woodLight);
    for (let x = 6; x < 40; x += 4) if (x < 25 || x > 31) P.rect(x, 27, 1, 4, C.woodLight);
    // A flag on the roof, a rope ladder to the ground.
    P.rect(23, 1, 1, 7, IRON);
    P.rect(24, 1, 4, 1, ROSE);
    P.rect(24, 2, 3, 1, ROSE);
    P.px(24, 3, ROSE_DARK);
    P.line(29, 34, 29, 61, '#c9a477');
    P.line(32, 34, 32, 61, '#c9a477');
    for (let y = 36; y < 61; y += 3) P.rect(29, y, 4, 1, C.wood);
  });
}

function dovecote(): Sprite {
  return sprite(30, 58, (P) => {
    // The round tower in warm stone courses, shaded towards the right.
    for (let x = 3; x < 27; x++) {
      const t = (x - 3) / 23;
      P.rect(x, 22, 1, 36, t < 0.25 ? WARM_STONE[0] : t < 0.7 ? WARM_STONE[1] : WARM_STONE[2]);
    }
    for (let y = 26; y < 57; y += 4) {
      P.rect(3, y, 24, 1, '#c4ab88');
      for (let x = 3 + ((y >> 2) % 2) * 3; x < 27; x += 6) P.px(x, y + 2, '#c4ab88');
    }
    P.rect(2, 30, 26, 2, '#efe1c8');
    P.rect(2, 31, 26, 1, '#d9c4a2');
    P.rect(2, 44, 26, 1, '#efe1c8');
    // The pigeon holes, each with its ledge.
    for (const [x, y] of [[7, 24], [12, 24], [17, 24], [22, 24], [9, 35], [15, 35], [20, 35]] as const) {
      P.rect(x, y, 2, 3, '#3a2a2e');
      P.px(x, y - 1, WARM_STONE[2]);
      P.rect(x - 1, y + 3, 4, 1, '#efe1c8');
    }
    plankDoor(P, 12, 47, 6, 11);
    // Ivy up the right side.
    for (const [x, y] of [[25, 52], [24, 49], [26, 46], [25, 41], [24, 38]] as const) {
      P.px(x, y, C.leafDark);
      P.px(x - 1, y + 1, C.leaf);
    }
    // The pointed roof in tiles, its lantern and finial.
    for (let i = 0; i < 18; i++) {
      const h = Math.round(1 + 14 * (i / 17) ** 1.15);
      for (let x = 15 - h; x <= 15 + h; x++) {
        const t = (x - 15) / (h + 0.5);
        const tone = t < -0.4 ? 0 : t > 0.45 ? 2 : 1;
        P.px(x, 4 + i, ROOF_RED[tone]);
      }
      if (i % 3 === 2) for (let x = 15 - h + 1; x < 15 + h; x += 3) P.px(x, 4 + i, ROOF_RED[2]);
    }
    P.rect(0, 21, 30, 2, ROOF_RED[3]);
    P.rect(0, 21, 30, 1, ROOF_RED[2]);
    P.rect(13, 1, 4, 4, C.white);
    P.rect(14, 2, 2, 2, '#3a2a2e');
    P.rect(12, 1, 6, 1, ROOF_RED[2]);
    P.rect(15, 0, 1, 1, IRON);
    // The doves.
    dove(P, 7, 21);
    dove(P, 16, 32);
    dove(P, 23, 19);
    P.px(3, 9, '#ffffff');
    P.px(4, 10, '#ffffff');
    P.px(5, 9, '#ffffff');
    P.px(6, 8, '#dfe3ea');
    P.px(2, 8, '#dfe3ea');
  });
}

const HORSE = [
  '.......mm.',
  '......mHHe',
  '......HHH.',
  'tHHHHHHH..',
  'tHSSSHHh..',
  '.hSSShh...',
  '.l.l..l.l.',
  'l......l..',
];

/** The bulbs along the carousel's valance, as x in the drawing. */
const CAROUSEL_BULBS = [2, 8, 14, 20, 26, 32, 38, 44];

function carousel(): Sprite {
  const horse = (P: Painter, x: number, y: number, flip: boolean, saddle: string) => {
    const rows = flip ? HORSE.map((row) => [...row].reverse().join('')) : HORSE;
    P.map(x, y, rows, { H: '#fffaf2', h: '#e3dccd', m: C.gold, t: C.goldDark, S: saddle, l: '#e3dccd', e: OUTLINE });
  };
  return sprite(46, 58, (P) => {
    // The turning floor: a red skirt with a gold trim, boards on top.
    P.ellipse(23, 51, 22, 5, '#a83f4c');
    P.rect(1, 47, 44, 5, '#c24a58');
    for (let x = 3; x < 44; x += 6) P.rect(x, 48, 3, 3, '#e8798a');
    P.rect(1, 47, 44, 1, C.gold);
    P.ellipse(23, 46, 21, 4, '#e6c99a');
    P.ellipse(23, 45, 15, 2, '#f0d8ad');
    // The middle column with its mirrors, the back poles in shade.
    for (const x of [10, 35]) P.rect(x, 21, 2, 24, C.goldDark);
    horse(P, 6, 30, false, BLOOM.blue[0]);
    horse(P, 30, 33, true, MINT[1]);
    P.rect(18, 21, 10, 25, '#f3e2c0');
    P.rect(18, 21, 1, 25, '#fffaf2');
    P.rect(27, 21, 1, 25, '#d8c6a6');
    P.rect(19, 24, 8, 6, '#cfe6f2');
    P.px(20, 25, '#ffffff');
    P.px(21, 26, '#ffffff');
    P.rect(19, 32, 8, 7, '#ffc0d6');
    P.disc(23, 35, 2, ROSE);
    P.rect(18, 23, 10, 1, C.gold);
    P.rect(18, 31, 10, 1, C.gold);
    P.rect(18, 40, 10, 1, C.gold);
    // The front poles and their horses, at different heights.
    for (const [x, y, flip, saddle] of [[2, 27, false, ROSE], [12, 33, false, C.gold], [26, 28, true, BLOOM.purple[0]], [36, 33, true, C.red]] as const) {
      P.rect(x + 4, 21, 1, 26, C.gold);
      P.px(x + 4, 21, C.goldLight);
      horse(P, x, y, flip, saddle);
      P.rect(x + 4, y + 2, 1, 4, C.goldLight);
    }
    // The roof: a striped bell, its valance with bulbs, a gold finial and pennant.
    roofCone(P, 23, 2, 13, 21, ROOF_PINK, CREAM);
    for (let x = 0; x < 46; x++) {
      const col = Math.floor(x / 3) % 2 ? CREAM : [ROOF_RED[0], C.red, '#b4353f', '#9c2f3a'] as const;
      P.rect(x, 15, 1, 5, col[1]);
      P.px(x, 15, col[0]);
      if (x % 3 !== 2) P.px(x, 20, col[2]);
    }
    P.rect(0, 17, 46, 1, C.gold);
    for (const x of CAROUSEL_BULBS) P.px(x, 20, C.glow);
    P.rect(22, 0, 2, 3, C.gold);
    P.px(22, 0, C.goldLight);
    P.rect(24, 0, 3, 1, MINT[1]);
    P.px(24, 1, MINT[2]);
    twinkle(P, 8, 10);
    twinkle(P, 39, 7);
  });
}

/** The maze on a grid of 4-pixel cells: '#' a hedge, '.' a gravel walk, 'o' the clearing in the middle. */
const MAZE = [
  '###############',
  '#.....#.......#',
  '#.###.#.#####.#',
  '#.#...#.....#.#',
  '#.#.#######.#.#',
  '#...#ooooo#...#',
  '###.#ooooo#.###',
  '#...#ooooo#...#',
  '#.###ooooo###.#',
  '#.#.#ooooo#.#.#',
  '#.#.###.###.#.#',
  '#.#.....#...#.#',
  '#.#####.#.###.#',
  '#.......#.....#',
  '#######.#######',
];

function hedgeMaze(): Sprite {
  const cell = 4;
  const wall = (x: number, y: number) => MAZE[y]?.[x] === '#';
  return sprite(MAZE[0].length * cell, MAZE.length * cell + 3, (P) => {
    const r = mulberry32(11);
    P.rect(0, 0, MAZE[0].length * cell, MAZE.length * cell, '#e3d6bd');
    for (let i = 0; i < 160; i++) P.px(Math.floor(r() * 60), Math.floor(r() * 60), r() < 0.5 ? '#cbbd9f' : '#f2ead9');
    // The clearing: a little fountain among rose bushes.
    P.ellipse(30, 31, 7, 4, C.stoneDark);
    P.ellipse(30, 30, 7, 3, C.stone);
    P.ellipse(30, 30, 5, 2, C.water);
    P.rect(29, 23, 2, 7, C.stone);
    P.rect(29, 23, 1, 7, '#ffffff');
    P.ellipse(30, 23, 3, 1, C.stone);
    P.px(30, 22, C.water);
    for (const [x, y] of [[22, 22], [37, 22], [22, 37], [37, 37]] as const) {
      P.disc(x, y, 2, C.leafDark);
      P.px(x - 1, y - 1, ROSE);
      P.px(x + 1, y, ROSE_LIGHT);
    }
    // The hedges, row by row from the back: a leafy top, and a face where no hedge goes on southwards.
    for (let y = 0; y < MAZE.length; y++) {
      for (let x = 0; x < MAZE[y].length; x++) {
        if (!wall(x, y)) continue;
        const X = x * cell;
        const Y = y * cell;
        P.rect(X, Y, cell, cell, C.leaf);
        P.px(X + ((x + y) % 2 ? 1 : 2), Y + 1, C.leafLight);
        if ((x * 7 + y * 3) % 11 === 0) P.px(X + 2, Y + 2, C.white);
        if (!wall(x, y + 1)) {
          P.rect(X, Y + cell, cell, 3, C.leafDark);
          P.rect(X, Y + cell + 2, cell, 1, '#3d7a33');
        }
      }
    }
    // Roses either side of the way in.
    rose(P, 26, 57);
    rose(P, 32, 57);
  }, true, 1, (P) => {
    P.px(30, 21, GLINT);
    P.px(29, 22, WATER_MIST);
    P.px(31, 22, WATER_MIST);
  });
}

// -----------------------------------------------
// PATHS
// -----------------------------------------------

/** One tile of a garden path: worn edges where no path of the same kind goes on (`sides`, a join mask). */
export function gardenPath(id: GardenPath, sides: number): Sprite {
  switch (id) {
    case 'pathFlag':
      return pathTile(sides, { base: '#b9b0a2', edge: '#a69d8e', rim: '#8e8576' }, (_P, clip) => {
        for (const [x, y] of [[0, 0], [8, 0], [0, 8], [8, 8]] as const) {
          clip(x + 1, y + 1, 6, 6, '#c9c0b2');
          clip(x + 1, y + 1, 6, 5, '#e4ddd1');
          clip(x + 1, y + 1, 6, 1, '#f2ede4');
          clip(x + 1, y + 1, 1, 5, '#ece6dc');
        }
        clip(7, 3, 1, 1, '#8cbf5a');
        clip(3, 7, 1, 1, '#8cbf5a');
        clip(12, 15, 1, 1, '#8cbf5a');
      });
    case 'pathGravel':
      return pathTile(sides, { base: '#cfc4ae', edge: '#b9ab91', rim: '#988a70' }, (P, _clip, inside) => {
        const r = mulberry32(53);
        for (let i = 0; i < 90; i++) {
          const x = Math.floor(r() * 16);
          const y = Math.floor(r() * 16);
          if (inside(x, y)) P.px(x, y, ['#f6f1e7', '#a89a80', '#e3d8c2', '#8f816a'][Math.floor(r() * 4)]);
        }
      });
    case 'pathPlank':
      return pathTile(sides, { base: C.wood, edge: '#ad7645', rim: C.woodDark }, (_P, clip) => {
        for (let y = 0; y < 16; y += 4) {
          clip(0, y, 16, 1, C.woodLight);
          clip(0, y + 3, 16, 1, '#9a6639');
          const seam = (y >> 2) % 2 ? 5 : 11;
          clip(seam, y, 1, 3, '#9a6639');
          clip(seam - 2, y + 1, 1, 1, IRON);
          clip(seam + 2, y + 1, 1, 1, IRON);
        }
      });
  }
}

const GARDEN_DECOR_IDS = new Set<string>([
  'tulips', 'lavender', 'sunflowers', 'hydrangeas', 'climbingRose', 'planter', 'wateringCan', 'picnicTable', 'deckChair',
  'parasol', 'hammock', 'porchSwing', 'birdBath', 'lilyPond', 'gardenBridge', 'candleJar', 'lamppost', 'stringLights',
  'flowerBarrel', 'weathervane', 'flowerCart', 'pergola', 'bandstand', 'greenhouse', 'treehouse', 'dovecote', 'carousel',
  'hedgeMaze',
] satisfies GardenDecor[]);

export function isGardenDecor(id: string): id is GardenDecor {
  return GARDEN_DECOR_IDS.has(id);
}

export function isGardenPath(id: string): id is GardenPath {
  return id === 'pathFlag' || id === 'pathGravel' || id === 'pathPlank';
}
