import { mulberry32 } from '../../random';
import {
  C, OUTLINE, ROOF_BLUE, ROOF_BROWN, ROOF_SLATE, TIMBER, TIMBER_LIGHT, WARM_STONE, backFence, framedWindow, plankDoor, planks,
  sideAndFrontFence, sprite, stones, tiledGable, yard, type Painter, type Sprite, type Tones, type View,
} from './farmPaint';

// -----------------------------------------------
// LOT 2 PENS (3 x 3) AND THEIR ANIMALS (docs/ferme.md 18)
// -----------------------------------------------
// Built like lot 1's coop and cowshed (farmArt.ts); farmArt caches them.
// Each pen keeps its building in the upper half: the animals wander in the lower half, drawn over it.

export type Lot2Pen = 'sheepfold' | 'pigsty' | 'hive' | 'goatShed' | 'duckPond' | 'hutch';
export type Lot2Animal = 'sheep' | 'pig' | 'bee' | 'goat' | 'duck' | 'rabbit';
export type Lot2Breed = 'blackSheep' | 'spottedPig' | 'queenBee' | 'snowGoat' | 'mandarinDuck' | 'lopRabbit';

/**
 * Where an animal sprite's top-left corner may stand, in pen sprite pixels (margin included): the duck pond's water
 * (a whole duck on it, above the front rail), the air the bees fly in. Kept in step with pondWater and apiary below.
 */
export const LOT2_PEN_AREAS: Partial<Record<Lot2Pen, Partial<Record<View, { x0: number; y0: number; x1: number; y1: number }>>>> = {
  duckPond: { face: { x0: 9, y0: 36, x1: 28, y1: 43 }, profile: { x0: 11, y0: 36, x1: 30, y1: 43 } },
  hive: { face: { x0: 3, y0: 6, x1: 37, y1: 42 }, profile: { x0: 3, y0: 6, x1: 37, y1: 42 } },
};

export function lot2Pen(id: Lot2Pen, view: View): Sprite {
  switch (id) {
    case 'sheepfold': return sheepfold(view);
    case 'pigsty': return pigsty(view);
    case 'hive': return apiary(view);
    case 'goatShed': return goatShed(view);
    case 'duckPond': return duckPond(view);
    case 'hutch': return hutch(view);
  }
}

/** Frame 1 is the idle gesture (grazing, rooting, dabbling...), shown while the animal stands still. */
export function lot2Animal(id: Lot2Animal, frame: 0 | 1): Sprite {
  switch (id) {
    case 'sheep': return sheep(frame, SHEEP);
    case 'pig': return pig(frame, PIG, false);
    case 'bee': return bee(frame, false);
    case 'goat': return goat(frame, GOAT);
    case 'duck': return duck(frame, false);
    case 'rabbit': return rabbit(frame, RABBIT, false);
  }
}

/** A rare animal: same canvas size, pose and frames as its kind. */
export function lot2Breed(id: Lot2Breed, frame: 0 | 1): Sprite {
  switch (id) {
    case 'blackSheep': return sheep(frame, BLACK_SHEEP);
    case 'spottedPig': return pig(frame, PIG, true);
    case 'queenBee': return bee(frame, true);
    case 'snowGoat': return goat(frame, SNOW_GOAT);
    case 'mandarinDuck': return duck(frame, true);
    case 'lopRabbit': return rabbit(frame, LOP_RABBIT, true);
  }
}

// -----------------------------------------------
// PEN PIECES
// -----------------------------------------------

/** Meadow grass: base, dark, light. */
const GRASS = ['#a2d273', '#8cbd60', '#bfe394'] as const;
const DARK_INSIDE = '#5a4038';
const SPARKLE = '#fff6c8';

function grassYard(P: Painter, top: number, seed: number): void {
  yard(P, top, GRASS[0], GRASS[1], GRASS[2], seed);
}

/** Tiny flowers scattered over a band. */
function flowers(P: Painter, x0: number, y0: number, w: number, h: number, count: number, seed: number, colours: readonly string[]): void {
  const r = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = x0 + Math.floor(r() * w);
    const y = y0 + Math.floor(r() * h);
    P.px(x, y + 1, C.leafDark);
    P.px(x, y, colours[i % colours.length]);
  }
}

/** Loose hay: a golden heap, straws on top, shade at its foot. */
function hay(P: Painter, x: number, y: number, w: number, h: number): void {
  P.rect(x, y, w, h, '#e9c45a');
  for (let hx = x; hx < x + w; hx += 2) P.px(hx, y, '#f5dc8a');
  P.rect(x, y + h - 1, w, 1, '#c9a23a');
  P.rect(x + w - 2, y + 1, 2, h - 1, '#d6b048');
}

/** A wooden trough on the ground, its content showing on top. */
function trough(P: Painter, x: number, y: number, w: number, fill: string, fillLight: string): void {
  P.rect(x, y, w, 4, C.woodDark);
  P.rect(x, y, w, 1, C.wood);
  P.rect(x + 1, y + 1, w - 2, 1, fill);
  for (let i = x + 2; i < x + w - 2; i += 3) P.px(i, y + 1, fillLight);
  P.rect(x + 1, y + 2, w - 2, 1, C.wood);
  P.px(x, y + 3, C.barkDark);
  P.px(x + w - 1, y + 3, C.barkDark);
}

/** A sloping board or shingle roof seen from its low edge: courses of tiles, the right end in shade. */
function shingles(P: Painter, x: number, y: number, w: number, h: number, t: Tones): void {
  P.rect(x, y, w, h, t[1]);
  P.rect(x, y, w, 1, t[0]);
  for (let row = 2; row < h; row += 3) {
    const shift = Math.floor(row / 3) % 2 ? 2 : 0;
    for (let px = x + shift; px < x + w; px += 4) {
      P.px(px, y + row, t[2]);
      P.px(px + 1, y + row - 1, t[0]);
    }
    P.rect(x, y + row, w, 1, t[2]);
    for (let px = x + 1 + shift; px < x + w - 4; px += 4) P.px(px, y + row + 1, t[0]);
  }
  P.rect(x + w - 3, y, 3, h, t[2]);
  P.px(x, y, t[0]);
}

const THATCH: Tones = ['#f7e3a6', '#e3c271', '#c69f52', '#a07c3a'];

/** A thatched roof seen from its long side: rounded ridge, straw courses, a ragged fringe. */
function thatch(P: Painter, x: number, top: number, w: number, h: number, seed: number): void {
  const insets = [7, 4, 3, 2, 1, 1];
  const r = mulberry32(seed);
  for (let i = 0; i < h; i++) {
    const inset = insets[i] ?? 0;
    P.rect(x + inset, top + i, w - 2 * inset, 1, i < 2 ? THATCH[0] : THATCH[1]);
    P.rect(x + w - inset - 4, top + i, 4, 1, THATCH[2]);
    P.px(x + inset, top + i, THATCH[0]);
  }
  for (let i = 4; i < h - 2; i += 4) {
    P.rect(x + 1, top + i, w - 2, 1, THATCH[2]);
    P.rect(x + 1, top + i + 1, w - 6, 1, THATCH[0]);
  }
  for (let i = 0; i < 40; i++) {
    const sx = x + 2 + Math.floor(r() * (w - 4));
    const sy = top + 2 + Math.floor(r() * (h - 4));
    P.px(sx, sy, r() < 0.6 ? THATCH[2] : THATCH[0]);
  }
  // The fringe, hanging unevenly.
  for (let fx = x; fx < x + w; fx++) {
    P.px(fx, top + h - 1, THATCH[3]);
    if ((fx * 7) % 3 === 0) P.px(fx, top + h, THATCH[3]);
  }
}

/** A hay rack on legs: a V of slats holding hay. */
function hayRack(P: Painter, x: number, y: number, w: number): void {
  P.rect(x, y + 3, 2, 12, TIMBER);
  P.rect(x + w - 2, y + 3, 2, 12, TIMBER);
  P.px(x, y + 3, TIMBER_LIGHT);
  hay(P, x + 1, y, w - 2, 5);
  for (let i = x + 1; i < x + w - 1; i += 2) P.line(i, y + 4, i + (i < x + w / 2 ? 1 : -1), y + 9, C.woodLight);
  P.rect(x, y + 4, w, 1, C.wood);
  P.rect(x + 1, y + 9, w - 2, 2, C.woodDark);
  P.rect(x + 1, y + 9, w - 2, 1, C.wood);
}

/** Rounded rocks: light top left, dark under, a tuft of moss. */
function rock(P: Painter, cx: number, cy: number, rx: number, ry: number): void {
  P.ellipse(cx, cy, rx, ry, C.greyDark);
  P.ellipse(cx - 1, cy - 1, rx - 1, ry - 1, C.grey);
  P.ellipse(cx - 2, cy - 2, Math.max(1, rx - 3), Math.max(1, ry - 2), C.greyLight);
  P.px(cx - rx + 2, cy - ry + 2, C.white);
  P.rect(cx - rx + 1, cy + ry, 2 * rx - 1, 1, '#7d766f');
}

// -----------------------------------------------
// SHEEPFOLD: stone and timber under thatch, a hay rack
// -----------------------------------------------

function sheepfold(view: View): Sprite {
  return sprite(46, 58, (P) => {
    grassYard(P, 12, 21);
    backFence(P, 9);
    if (view === 'face') {
      stones(P, 2, 19, 32, 13, WARM_STONE);
      P.rect(28, 19, 6, 13, '#cdb791');
      P.rect(2, 19, 2, 13, TIMBER);
      P.rect(32, 19, 2, 13, TIMBER);
      P.rect(17, 19, 2, 13, TIMBER);
      P.px(2, 19, TIMBER_LIGHT);
      P.px(17, 19, TIMBER_LIGHT);
      thatch(P, 0, 4, 36, 15, 5);
      P.rect(2, 19, 32, 1, '#b49a76');
      // A wide open doorway, hay on its floor.
      P.rect(6, 22, 9, 10, DARK_INSIDE);
      P.rect(6, 22, 9, 1, TIMBER);
      P.rect(6, 22, 1, 10, TIMBER);
      P.rect(14, 22, 1, 10, TIMBER);
      hay(P, 7, 29, 7, 3);
      framedWindow(P, 23, 23, 4, 3, { frame: TIMBER });
      hayRack(P, 36, 19, 9);
    } else {
      // The gable end: thatch slopes framing a stone wall, a round loft door.
      const cx = 29;
      for (let i = 0; i < 17; i++) {
        const half = Math.round(i * 0.75) + 2;
        P.rect(cx - half - 2, 1 + i, 2 * half + 5, 1, i < 3 ? THATCH[0] : THATCH[1]);
        P.rect(cx + half, 1 + i, 3, 1, THATCH[2]);
        P.px(cx - half - 2, 1 + i, THATCH[0]);
        if (i % 3 === 2) P.px(cx - half - 1, 1 + i, THATCH[2]);
        if (i % 3 === 1) P.px(cx + half + 1, 1 + i, THATCH[3]);
      }
      for (let i = 4; i < 17; i++) {
        const half = Math.round(i * 0.75) - 1;
        P.rect(cx - half, 1 + i, 2 * half + 1, 1, i < 6 ? '#e6d5b6' : WARM_STONE[1]);
        P.px(cx + half, 1 + i, '#cdb791');
      }
      stones(P, 15, 18, 30, 14, WARM_STONE);
      P.rect(39, 18, 6, 14, '#cdb791');
      P.rect(14, 17, 32, 1, THATCH[3]);
      P.rect(15, 18, 30, 1, '#b49a76');
      P.rect(15, 18, 2, 14, TIMBER);
      P.rect(43, 18, 2, 14, TIMBER);
      P.disc(cx, 11, 3, TIMBER);
      P.disc(cx, 11, 2, DARK_INSIDE);
      hay(P, cx - 2, 11, 5, 3);
      P.rect(24, 22, 10, 10, DARK_INSIDE);
      P.rect(24, 22, 10, 1, TIMBER);
      P.rect(24, 22, 1, 10, TIMBER);
      P.rect(33, 22, 1, 10, TIMBER);
      hay(P, 25, 29, 8, 3);
      hayRack(P, 2, 19, 10);
    }
    sideAndFrontFence(P, 16, 58);
  });
}

// -----------------------------------------------
// PIGSTY: a low shed, a mud puddle, a trough
// -----------------------------------------------

const EARTH = ['#d2a777', '#bd9062', '#e2be92'] as const;

function mudPuddle(P: Painter, cx: number, cy: number, rx: number, ry: number): void {
  P.ellipse(cx, cy, rx, ry, '#8a5c3e');
  P.ellipse(cx + 1, cy, rx - 2, ry - 1, '#74492f');
  P.ellipse(cx + 2, cy + 1, rx - 5, ry - 2, '#6a412a');
  P.rect(cx - rx + 3, cy - 1, 3, 1, '#a87a56');
  P.px(cx - 2, cy - 1, '#c9a07a');
  P.px(cx + 4, cy + 1, '#a87a56');
  P.px(cx - rx + 2, cy + 1, '#a87a56');
}

function pigsty(view: View): Sprite {
  return sprite(46, 58, (P) => {
    yard(P, 12, EARTH[0], EARTH[1], EARTH[2], 31);
    backFence(P, 9);
    if (view === 'face') {
      planks(P, 2, 20, 30, 12);
      shingles(P, 0, 13, 34, 7, ROOF_BROWN);
      P.rect(0, 19, 34, 1, ROOF_BROWN[3]);
      P.rect(2, 20, 30, 1, '#a8743f');
      // A low pig door, its half door open, a pig sign above.
      P.rect(9, 24, 8, 8, DARK_INSIDE);
      P.rect(9, 24, 8, 1, ROOF_BROWN[3]);
      P.rect(17, 27, 3, 5, C.woodLight);
      P.rect(19, 27, 1, 5, C.woodDark);
      P.disc(25, 25, 2, '#f7b0bf');
      P.px(25, 26, '#e07a92');
      P.px(24, 25, OUTLINE);
      P.px(26, 25, OUTLINE);
      trough(P, 33, 29, 11, '#b7c46a', '#e0475b');
      mudPuddle(P, 17, 45, 13, 4);
    } else {
      // The lean-to seen from its end: a wall high at the back, a sloping plank roof.
      for (let x = 14; x < 44; x++) {
        const top = 13 + Math.round((x - 14) * 0.2);
        P.rect(x, top, 1, 32 - top, x > 38 ? '#ad7645' : C.wood);
        if ((x - 14) % 4 === 2) P.rect(x, top, 1, 32 - top, C.woodDark);
      }
      P.rect(14, 13, 1, 19, C.woodLight);
      P.rect(14, 31, 30, 1, C.woodDark);
      for (let x = 12; x < 46; x++) {
        const top = 9 + Math.round((x - 12) * 0.2);
        P.rect(x, top, 1, 4, ROOF_BROWN[1]);
        P.px(x, top, ROOF_BROWN[0]);
        P.px(x, top + 3, ROOF_BROWN[3]);
        if ((x - 12) % 5 === 0) P.px(x, top + 2, ROOF_BROWN[2]);
      }
      P.rect(22, 21, 8, 11, DARK_INSIDE);
      P.rect(22, 21, 8, 1, C.woodDark);
      P.rect(30, 26, 2, 6, C.woodLight);
      framedWindow(P, 36, 21, 3, 3);
      trough(P, 2, 29, 10, '#b7c46a', '#e0475b');
      mudPuddle(P, 28, 45, 13, 4);
    }
    sideAndFrontFence(P, 16, 58);
  });
}

// -----------------------------------------------
// APIARY: beehives among tall flowers, a flowery yard
// -----------------------------------------------

const HIVE_WHITE = ['#ffffff', '#f4eee3', '#ddd3c2'] as const;
const HIVE_YELLOW = ['#fff0a8', '#f7d65c', '#ddb03c'] as const;

/** A box hive seen from its entrance: a gabled lid, stacked boxes, the entrance slit and its landing board. */
function hiveBox(P: Painter, x: number, y: number, w: number, h: number, [light, base, dark]: readonly [string, string, string]): void {
  P.rect(x + 1, y + h, 1, 3, TIMBER);
  P.rect(x + w - 2, y + h, 1, 3, TIMBER);
  P.rect(x, y + 3, w, h - 3, base);
  P.rect(x, y + 3, 1, h - 3, light);
  P.rect(x + w - 2, y + 3, 2, h - 3, dark);
  for (let sy = y + 3 + 5; sy < y + h - 2; sy += 5) P.rect(x, sy, w, 1, dark);
  P.rect(x + 2, y + 5, w - 4, 1, dark);
  // The lid, a little roof of its own.
  P.rect(x - 1, y + 2, w + 2, 2, C.woodDark);
  P.rect(x - 1, y + 2, w + 2, 1, C.wood);
  P.rect(x + 1, y, w - 2, 2, C.woodLight);
  P.rect(x + w - 4, y, 3, 2, C.wood);
  P.rect(x + 2, y + h - 2, w - 4, 1, OUTLINE);
  P.rect(x + 1, y + h - 1, w - 2, 1, C.woodLight);
}

/** A side of a box hive: no entrance, a hand hold. */
function hiveSide(P: Painter, x: number, y: number, w: number, h: number, tones: readonly [string, string, string]): void {
  hiveBox(P, x, y, w, h, tones);
  P.rect(x + 2, y + h - 2, w - 4, 1, tones[1]);
  P.rect(x + 1, y + h - 1, w - 2, 1, tones[2]);
  P.rect(x + Math.floor(w / 2) - 1, y + 8, 3, 1, tones[2]);
}

function sunflower(P: Painter, x: number, top: number, bottom: number): void {
  P.rect(x, top + 2, 1, bottom - top - 2, C.leafDark);
  P.px(x - 1, top + 7, C.leaf);
  P.px(x + 1, top + 10, C.leaf);
  P.disc(x, top + 1, 2, C.gold);
  P.px(x - 2, top - 1, C.goldLight);
  P.px(x, top + 1, '#8a552b');
  P.px(x + 1, top + 1, '#8a552b');
  P.px(x, top + 2, '#8a552b');
}

function hollyhock(P: Painter, x: number, top: number, bottom: number, bloom: string, bloomLight: string): void {
  P.rect(x, top, 1, bottom - top, C.leafDark);
  for (let y = top; y < bottom - 4; y += 2) {
    P.px(x - 1, y, bloom);
    P.px(x + 1, y + 1, bloom);
    P.px(x, y, bloomLight);
  }
  P.px(x - 1, bottom - 3, C.leaf);
  P.px(x + 1, bottom - 2, C.leaf);
}

const BLOOMS = ['#ff8fb8', C.gold, C.white, '#b99be6', '#ff6f7d'] as const;

function apiary(view: View): Sprite {
  return sprite(46, 58, (P) => {
    grassYard(P, 12, 41);
    backFence(P, 9);
    flowers(P, 2, 13, 42, 20, 30, 7, BLOOMS);
    if (view === 'face') {
      sunflower(P, 7, 6, 22);
      hollyhock(P, 15, 5, 22, '#ff8fb8', '#ffc4d9');
      sunflower(P, 23, 3, 18);
      hollyhock(P, 31, 6, 22, '#ff6f7d', '#ffb0b8');
      sunflower(P, 39, 5, 22);
      hiveBox(P, 2, 17, 11, 15, HIVE_WHITE);
      hiveBox(P, 17, 12, 12, 20, HIVE_YELLOW);
      hiveBox(P, 33, 17, 11, 15, HIVE_WHITE);
    } else {
      sunflower(P, 30, 3, 20);
      hollyhock(P, 37, 5, 22, '#ff8fb8', '#ffc4d9');
      sunflower(P, 43, 6, 22);
      hollyhock(P, 22, 6, 20, '#b99be6', '#dccbf5');
      hiveSide(P, 4, 13, 9, 19, HIVE_YELLOW);
      hiveSide(P, 15, 17, 9, 15, HIVE_WHITE);
      hiveSide(P, 32, 19, 9, 13, HIVE_WHITE);
    }
    flowers(P, 3, 35, 40, 18, 46, view === 'face' ? 3 : 9, BLOOMS);
    sideAndFrontFence(P, 16, 58);
  });
}

// -----------------------------------------------
// GOAT SHED: a small chalet, rocks and a plank ramp to climb
// -----------------------------------------------

const DUST = ['#d8cc98', '#c4b682', '#e6dcb0'] as const;

function goatRocks(P: Painter, x: number): void {
  rock(P, x + 13, 25, 10, 7);
  rock(P, x + 5, 30, 6, 4);
  rock(P, x + 15, 15, 6, 5);
  P.px(x + 9, 20, C.leaf);
  P.px(x + 10, 20, C.leafLight);
  P.px(x + 20, 27, C.leaf);
}

function plankRamp(P: Painter, x0: number, y0: number, x1: number, y1: number): void {
  for (let i = 0; i < 4; i++) P.line(x0, y0 + i, x1, y1 + i, i === 0 ? C.woodLight : i === 3 ? C.woodDark : C.wood);
  const steps = Math.abs(x1 - x0);
  for (let s = 2; s < steps; s += 3) {
    const t = s / steps;
    P.px(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t) + 1, C.woodDark);
  }
}

function goatShed(view: View): Sprite {
  return sprite(46, 58, (P) => {
    yard(P, 12, DUST[0], DUST[1], DUST[2], 52);
    backFence(P, 9);
    if (view === 'face') {
      goatRocks(P, 22);
      plankRamp(P, 25, 38, 34, 28);
      // The chalet's gable end: deep slate eaves over a plank wall.
      planks(P, 3, 16, 18, 16);
      tiledGable(P, 12, 2, 15, 0.75, ROOF_SLATE, C.woodLight);
      P.rect(0, 17, 25, 2, ROOF_SLATE[3]);
      P.rect(0, 17, 25, 1, ROOF_SLATE[2]);
      P.rect(4, 19, 16, 1, '#a8743f');
      framedWindow(P, 11, 9, 3, 3, { frame: TIMBER });
      plankDoor(P, 8, 22, 8, 10);
      P.rect(7, 26, 10, 1, C.woodDark);
    } else {
      goatRocks(P, 2);
      plankRamp(P, 20, 38, 12, 28);
      // The chalet's long side: a slate roof and a hay hatch.
      planks(P, 22, 17, 22, 15);
      for (let i = 0; i < 10; i++) {
        const inset = Math.max(0, 5 - i);
        P.rect(20 + inset, 6 + i, 26 - inset, 1, i < 2 ? ROOF_SLATE[0] : ROOF_SLATE[1]);
        if (i % 3 === 2) for (let x = 21 + inset + (i % 2) * 2; x < 46; x += 4) P.rect(x, 6 + i, 3, 1, ROOF_SLATE[2]);
        P.rect(43, 6 + i, 3, 1, ROOF_SLATE[2]);
      }
      P.rect(20, 16, 26, 2, ROOF_SLATE[3]);
      P.rect(20, 16, 26, 1, ROOF_SLATE[2]);
      P.rect(23, 18, 20, 1, '#a8743f');
      P.rect(27, 21, 5, 4, DARK_INSIDE);
      hay(P, 27, 23, 5, 2);
      P.rect(26, 20, 7, 1, TIMBER);
      plankDoor(P, 35, 22, 6, 10);
    }
    sideAndFrontFence(P, 16, 58);
  });
}

// -----------------------------------------------
// DUCK POND: a shallow pond, reeds, a tiny duck house
// -----------------------------------------------

function pondWater(P: Painter, cx: number, cy: number, rx: number, ry: number): void {
  P.ellipse(cx, cy, rx + 1, ry + 1, '#c7b47e');
  P.ellipse(cx, cy, rx, ry, C.waterDark);
  P.ellipse(cx + 1, cy + 1, rx - 1, ry - 1, C.water);
  P.rect(cx - rx + 4, cy - 2, 5, 1, C.waterLight);
  P.rect(cx + 3, cy + 2, 4, 1, C.waterLight);
  P.rect(cx - 3, cy + 4, 3, 1, '#7fbbe8');
  // Lily pads, one in bloom.
  P.rect(cx + rx - 8, cy - 3, 3, 2, C.leaf);
  P.px(cx + rx - 8, cy - 3, C.leafLight);
  P.px(cx + rx - 7, cy - 3, '#ff8fb8');
  P.rect(cx - rx + 5, cy + 2, 2, 1, C.leaf);
}

/** A clump of reeds: blades leaning out from the middle, a few brown cattails. */
function reeds(P: Painter, x: number, y: number, count: number): void {
  const mid = (count - 1) / 2;
  for (let i = 0; i < count; i++) {
    const h = 7 + ((i * 5) % 4);
    const lean = Math.sign(i - mid);
    const bx = x + i * 2;
    P.line(bx, y, bx + lean * 2, y - h, i % 2 ? C.leaf : C.leafDark);
    if (i % 2 === 0) {
      P.rect(bx + lean * 2, y - h - 2, 2, 3, C.bark);
      P.px(bx + lean * 2, y - h - 2, '#a87a56');
    } else P.px(bx + lean * 2, y - h, C.leafLight);
  }
}

function duckPond(view: View): Sprite {
  return sprite(46, 58, (P) => {
    grassYard(P, 12, 63);
    backFence(P, 9);
    const right = view === 'face';
    pondWater(P, right ? 22 : 24, 43, 19, 9);
    if (right) {
      // The duck house: a tiny gabled hut on stilts, a ramp down to the water.
      P.rect(15, 27, 1, 6, TIMBER);
      P.rect(28, 27, 1, 6, TIMBER);
      planks(P, 14, 19, 16, 9);
      tiledGable(P, 21, 10, 10, 0.85, ROOF_BLUE, C.woodLight);
      P.rect(12, 19, 20, 2, ROOF_BLUE[3]);
      P.rect(12, 19, 20, 1, ROOF_BLUE[2]);
      P.disc(21, 24, 2, DARK_INSIDE);
      P.rect(19, 24, 5, 3, DARK_INSIDE);
      P.disc(21, 15, 1, C.white);
      plankRamp(P, 22, 28, 27, 36);
      reeds(P, 2, 36, 5);
      reeds(P, 36, 33, 4);
      P.rect(41, 24, 1, 5, C.bark);
      P.disc(41, 21, 4, C.leafDark);
      P.disc(40, 20, 3, C.leaf);
      P.px(39, 18, C.leafLight);
    } else {
      P.rect(22, 27, 1, 6, TIMBER);
      P.rect(38, 27, 1, 6, TIMBER);
      planks(P, 21, 20, 20, 8);
      for (let i = 0; i < 9; i++) {
        const inset = Math.max(0, 4 - i);
        P.rect(19 + inset, 11 + i, 24 - inset, 1, i < 2 ? ROOF_BLUE[0] : ROOF_BLUE[1]);
        if (i % 3 === 2) for (let x = 20 + inset; x < 43; x += 4) P.rect(x, 11 + i, 3, 1, ROOF_BLUE[2]);
        P.rect(40, 11 + i, 3, 1, ROOF_BLUE[2]);
      }
      P.rect(19, 20, 24, 1, ROOF_BLUE[3]);
      P.rect(21, 21, 20, 1, '#a8743f');
      P.rect(25, 23, 4, 4, DARK_INSIDE);
      framedWindow(P, 34, 23, 3, 2);
      plankRamp(P, 25, 28, 19, 36);
      reeds(P, 39, 39, 3);
      reeds(P, 2, 41, 4);
      P.rect(6, 23, 1, 5, C.bark);
      P.disc(6, 20, 4, C.leafDark);
      P.disc(5, 19, 3, C.leaf);
      P.px(4, 17, C.leafLight);
    }
    sideAndFrontFence(P, 16, 58);
  });
}

// -----------------------------------------------
// HUTCH: rabbit hutches on legs, wire mesh, a carrot patch
// -----------------------------------------------

const ROOF_SAGE: Tones = ['#c8e3a6', '#93c06f', '#6f9c52', '#557d3e'];

function mesh(P: Painter, x: number, y: number, w: number, h: number): void {
  P.rect(x, y, w, h, DARK_INSIDE);
  P.rect(x, y + h - 2, w, 2, '#e9c45a');
  for (let mx = x + 1; mx < x + w; mx += 2) P.rect(mx, y, 1, h, '#c9c3bb');
  for (let my = y + 1; my < y + h; my += 2) P.rect(x, my, w, 1, '#c9c3bb');
  P.px(x + 1, y + 1, C.white);
}

function carrots(P: Painter, x: number, y: number, w: number): void {
  P.rect(x, y, w, 4, C.soil);
  P.rect(x, y, w, 1, C.soilLight);
  P.rect(x, y + 3, w, 1, C.soilDark);
  for (let cx = x + 1; cx < x + w - 1; cx += 3) {
    P.px(cx, y + 1, C.orange);
    P.px(cx + 1, y + 1, C.orangeDark);
    P.px(cx, y - 1, C.leaf);
    P.px(cx + 1, y - 2, C.leafLight);
    P.px(cx + 1, y, C.leafDark);
    P.px(cx - 1, y - 1, C.leafDark);
  }
}

function hutch(view: View): Sprite {
  return sprite(46, 58, (P) => {
    grassYard(P, 12, 84);
    backFence(P, 9);
    if (view === 'face') {
      for (const x of [4, 18, 32]) P.rect(x, 26, 2, 8, TIMBER);
      P.px(4, 26, TIMBER_LIGHT);
      planks(P, 3, 8, 34, 19);
      P.rect(3, 17, 34, 1, C.woodDark);
      mesh(P, 5, 10, 13, 6);
      mesh(P, 20, 19, 15, 6);
      // A nest box with a round hole, a door below it.
      P.disc(27, 13, 2, DARK_INSIDE);
      P.px(26, 12, '#3e2b26');
      plankDoor(P, 7, 19, 8, 7, ROOF_SAGE);
      shingles(P, 1, 2, 38, 6, ROOF_SAGE);
      P.rect(1, 7, 38, 1, ROOF_SAGE[3]);
      P.rect(3, 8, 34, 1, '#a8743f');
      plankRamp(P, 36, 24, 42, 34);
      hay(P, 21, 29, 9, 4);
      carrots(P, 4, 39, 12);
    } else {
      for (const x of [22, 39]) P.rect(x, 26, 2, 8, TIMBER);
      P.px(22, 26, TIMBER_LIGHT);
      planks(P, 21, 6, 20, 21);
      P.rect(21, 16, 20, 1, C.woodDark);
      mesh(P, 25, 9, 12, 6);
      mesh(P, 25, 19, 12, 6);
      for (let x = 19; x < 44; x++) {
        const top = 2 + Math.round((x - 19) * 0.17);
        P.rect(x, top, 1, 5, ROOF_SAGE[1]);
        P.px(x, top, ROOF_SAGE[0]);
        P.px(x, top + 3, ROOF_SAGE[2]);
        P.px(x, top + 4, ROOF_SAGE[3]);
        if ((x - 19) % 4 === 0) P.px(x, top + 2, ROOF_SAGE[2]);
      }
      plankRamp(P, 21, 24, 14, 34);
      hay(P, 26, 29, 9, 4);
      carrots(P, 4, 39, 12);
    }
    sideAndFrontFence(P, 16, 58);
  });
}


// -----------------------------------------------
// ANIMALS: pixel maps facing right; the scene mirrors them
// -----------------------------------------------

function mapped(rows: readonly string[], pal: Record<string, string>): Sprite {
  return sprite(rows[0].length, rows.length, (P) => P.map(0, 0, rows, pal));
}

const SHEEP_ROWS = [
  ['..ll.ll.l..', '.lwwlwwlww.', 'lwwwwwwafef', 'wwwwwwwwffn', 'swwwwwwwff.', '.ssswwss...', '.k.k.k.k...', '.k.k.k.k...'],
  ['..ll.ll....', '.lwwlwwl...', 'lwwwwwwwl..', 'wwwwwwwwww.', 'swwwwwwawwf', '.ssswwssfef', '.k.k.k.kffn', '.k.k.k.k...'],
] as const;
const SHEEP = { l: '#ffffff', w: '#f3ece0', s: '#d9cdb9', f: '#b0928a', a: '#866a64', n: '#866a64', e: '#2e2224', k: '#6b5450' };
const BLACK_SHEEP = { l: '#8a7f8c', w: '#665c6a', s: '#4c4352', f: '#3c3238', a: '#2c2428', n: '#2c2428', e: '#f6e5c8', k: '#3c3238' };

/** 11 x 8: a fluffy body, a dark face; frame 1 grazes. */
function sheep(frame: 0 | 1, pal: Record<string, string>): Sprite {
  return mapped(SHEEP_ROWS[frame], pal);
}

const PIG = { light: '#ffd3dc', base: '#f7b0bf', shade: '#e48aa0', ear: '#e07a92', snout: '#f08aa2', nostril: '#b85a72', hoof: '#8f5a5a', spot: '#a8673f' };

/** 11 x 8: round and pink, a curly tail; frame 1 roots with its snout down. */
function pig(frame: 0 | 1, p: typeof PIG, spotted: boolean): Sprite {
  return sprite(11, 8, (P) => {
    for (const x of [2, 4, 6, 8]) P.rect(x, 6, 1, 2, p.hoof);
    P.ellipse(4, 4, 4, 2, p.base);
    P.rect(1, 2, 7, 1, p.base);
    P.rect(2, 2, 5, 1, p.light);
    P.px(1, 3, p.light);
    P.rect(2, 6, 5, 1, p.shade);
    P.px(0, 2, p.shade);
    P.px(0, 1, p.ear);
    if (spotted) {
      P.rect(2, 3, 2, 2, p.spot);
      P.px(5, 5, p.spot);
      P.px(6, 3, p.spot);
    }
    const hy = frame ? 2 : 0;
    P.rect(7, hy + 1, 3, 4, p.base);
    P.px(7, hy + 1, p.light);
    P.rect(10, hy + 2, 1, 3, p.snout);
    P.px(10, hy + 3, p.nostril);
    P.px(8, hy + 2, OUTLINE);
    P.px(9, hy + 4, p.light);
    P.px(8, hy, p.ear);
    P.px(9, hy, p.ear);
    P.px(9, hy + 1, p.ear);
    if (spotted) P.px(7, hy + 3, p.spot);
  });
}

const BEE_ROWS = [
  ['.wWw..', '.kykyk', 'ykykyk', '.kyky.'],
  ['.W..w.', '.kWkyk', 'ykykyk', '.kyky.'],
] as const;
const BEE = { y: '#f7cf3c', k: '#4a3135', w: '#dff1fb', W: '#ffffff' };
const QUEEN_BEE = { y: '#fbe38a', k: '#c98a2a', w: '#dff1fb', W: '#ffffff', c: '#e0a020', s: SPARKLE };

/** 6 x 4: striped, glassy wings; frame 1 flutters them. The queen is golden, crowned, sparkling. */
function bee(frame: 0 | 1, queen: boolean): Sprite {
  if (!queen) return mapped(BEE_ROWS[frame], BEE);
  const rows: string[] = [...BEE_ROWS[frame]];
  rows[0] = 's' + rows[0].slice(1, 4) + 'cc';
  rows[1] = rows[1].slice(0, 5) + 'c';
  return mapped(rows, QUEEN_BEE);
}

interface Coat { light: string; base: string; shade: string; leg: string; horn: string; beard: string; muzzle: string; hoof: string }
const GOAT: Coat = { light: '#e8cfac', base: '#d2ad82', shade: '#b48d64', leg: '#b48d64', horn: '#9c958d', beard: '#f6e5c8', muzzle: '#f2cfae', hoof: '#5b4a48' };
const SNOW_GOAT: Coat = { light: '#ffffff', base: '#f6f4f0', shade: '#d3e4f2', leg: '#eef0f2', horn: '#86c3ea', beard: '#ffffff', muzzle: '#f6dfe4', hoof: '#7d9ab3' };

/** 11 x 10: long legs, horns curving back, a beard; frame 1 nibbles at the ground. */
function goat(frame: 0 | 1, c: Coat): Sprite {
  return sprite(11, 10, (P) => {
    for (const x of [1, 3, 5, 7]) {
      P.rect(x, 6, 1, 4, c.leg);
      P.px(x, 9, c.hoof);
    }
    P.rect(1, 4, 7, 3, c.base);
    P.rect(1, 4, 6, 1, c.light);
    P.rect(2, 6, 5, 1, c.shade);
    P.px(0, 3, c.base);
    P.px(1, 3, c.light);
    const hy = frame ? 4 : 0;
    P.rect(7, hy + 2, 2, 3, c.base);
    P.rect(8, hy + 1, 3, 2, c.base);
    P.px(8, hy + 1, c.light);
    P.px(10, hy + 3, c.muzzle);
    P.px(9, hy + 3, c.base);
    P.px(9, hy + 4, c.beard);
    P.px(9, hy + 1, OUTLINE);
    P.px(7, hy + 2, c.shade);
    P.px(7, hy, c.horn);
    P.px(8, hy, c.horn);
    P.px(6, hy + 1, c.horn);
  });
}

const DUCK_ROWS = [
  ['....ww..', '...wwkoo', 'w...ww..', 'wwwwwww.', 'wwssswW.', '.ssssss.', '..o.o...'],
  ['........', 'w.......', 'ww......', 'wwwwww..', 'wwssswww', '.sssswko', '..o.o..o'],
] as const;
const DUCK = { w: '#fff8e4', W: '#ffffff', s: '#e6d9bd', k: OUTLINE, o: '#f7a53a' };
const MANDARIN_ROWS = [
  ['....gg..', '...gWkrr', 's...oo..', 'sBOOOpp.', 'bbbbbbp.', '.dddddd.', '..f.f...'],
  ['........', 's.......', 'sO......', 'sBOOpp..', 'bbbbpggg', '.dddoWkr', '..f.f..r'],
] as const;
const MANDARIN = { g: '#2f7a55', W: '#fff6e8', k: OUTLINE, r: '#e0475b', o: '#f08a2b', O: '#f5a55a', p: '#7a4a7a', b: '#d9935a', d: '#b0703f', B: '#5b86b8', s: '#5e4a46', f: '#f2a33a' };

/** 8 x 7: a cream farm duck, or the colourful mandarin; frame 1 dabbles, tail up. */
function duck(frame: 0 | 1, mandarin: boolean): Sprite {
  return mandarin ? mapped(MANDARIN_ROWS[frame], MANDARIN) : mapped(DUCK_ROWS[frame], DUCK);
}

interface Fur { light: string; base: string; shade: string; ear: string; tail: string }
const RABBIT: Fur = { light: '#dfc4a3', base: '#c4a07c', shade: '#a68260', ear: '#f5b3b8', tail: '#ffffff' };
const LOP_RABBIT: Fur = { light: '#fff6e8', base: '#f2e2c8', shade: '#d9c4a2', ear: '#b98a62', tail: '#ffffff' };

/** 7 x 7: a sitting bunny, its ears up (drooping for the lop); frame 1 nibbles. */
function rabbit(frame: 0 | 1, f: Fur, lop: boolean): Sprite {
  return sprite(7, 7, (P) => {
    P.ellipse(2, 4, 2, 2, f.base);
    P.rect(1, 3, 3, 1, f.light);
    P.rect(1, 6, 3, 1, f.shade);
    P.px(0, 4, f.tail);
    P.px(4, 6, f.light);
    const hy = frame ? 1 : 0;
    P.rect(4, hy + 2, 3, 2, f.base);
    P.px(4, hy + 2, f.light);
    P.px(5, hy + 2, OUTLINE);
    P.px(6, hy + 3, '#f08aa2');
    if (lop) {
      P.rect(5, hy + 1, 1, 1, f.base);
      P.rect(3, hy + 1, 2, 1, f.ear);
      P.rect(4, hy + 2, 1, 3, f.ear);
      P.px(5, hy + 4, f.ear);
    } else if (frame) {
      P.px(3, 1, f.base);
      P.px(4, 1, f.base);
      P.px(2, 0, f.ear);
      P.px(3, 0, f.base);
    } else {
      P.rect(4, 0, 1, 2, f.base);
      P.rect(5, 0, 1, 2, f.ear);
    }
  });
}
