import { mulberry32 } from '../../random';
import type { AnimalId, BreedId } from './data/types';
import {
  C, OUTLINE, ROOF_BLUE, ROOF_BROWN, ROOF_SLATE, TIMBER, TIMBER_LIGHT, WARM_STONE, backFence, framedWindow, plankDoor, planks,
  sideAndFrontFence, sprite, stones, tiledGable, yard, type Painter, type Sprite, type Tones, type View,
} from './farmPaint';

// -----------------------------------------------
// LOT 2 PENS (3 x 3) (docs/ferme.md 18), THEN EVERY ANIMAL
// -----------------------------------------------
// The pens are built like lot 1's coop and cowshed (farmArt.ts); farmArt caches pens and animals.
// Each pen keeps its building in the upper half: the animals wander in the lower half, drawn over it.

export type Lot2Pen = 'sheepfold' | 'pigsty' | 'hive' | 'goatShed' | 'duckPond' | 'hutch';

/**
 * Where an animal sprite's top-left corner may stand, in pen sprite pixels (margin included): the duck pond's water
 * (a whole duck on it, above the front rail), the air the bees fly in. Kept in step with pondWater, apiary and the
 * size of the duck and bee drawings below.
 */
export const LOT2_PEN_AREAS: Partial<Record<Lot2Pen, Partial<Record<View, { x0: number; y0: number; x1: number; y1: number }>>>> = {
  duckPond: { face: { x0: 7, y0: 33, x1: 26, y1: 40 }, profile: { x0: 9, y0: 33, x1: 28, y1: 40 } },
  hive: { face: { x0: 3, y0: 6, x1: 33, y1: 38 }, profile: { x0: 3, y0: 6, x1: 33, y1: 38 } },
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
// ANIMALS: round and cute, facing right (the scene mirrors them); style C of docs/ferme.md 25
// -----------------------------------------------
// Each animal is a pixel map, or a body with a head laid over it. Frame 1 is the idle gesture: the head goes down
// and the eyes close. The letters mean the same thing in every map: L light, w base, s shade, k eye, e eye shine,
// p pink cheek. A rare breed is the same maps with another palette (or its own maps when its colours sit elsewhere).

type Palette = Record<string, string>;
type Rows = readonly string[];

const EYE = OUTLINE;
const SHINE = '#ffffff';
const CHEEK = '#f7a3b0';

/** A w x h drawing: `under` paints first (legs, a tail), then each map at its place. */
function layered(w: number, h: number, pal: Palette, maps: readonly (readonly [number, number, Rows])[], under?: (P: Painter) => void): Sprite {
  return sprite(w, h, (P) => {
    under?.(P);
    for (const [x, y, rows] of maps) P.map(x, y, rows, pal);
  });
}

/** Legs of `width` px from `top` to the bottom row, the last row in `foot`; the back pair in `back`. */
function legs(P: Painter, front: readonly number[], back: readonly number[], top: number, bottom: number, width: number, leg: string, backLeg: string, foot: string): void {
  for (const [xs, col] of [[back, backLeg], [front, leg]] as const) {
    for (const x of xs) {
      P.rect(x, top, width, bottom - top, col);
      P.rect(x, bottom, width, 1, foot);
    }
  }
}

/** The head maps of frame 1: the eyes' top row (shine and pupil) becomes plain face, the bottom row stays as a closed eye. */
function sleepy(rows: Rows, eyeRow: number, face: string): Rows {
  return rows.map((row, i) => (i === eyeRow ? row.replace(/[ek]/g, face) : row));
}

// -----------------------------------------------
// HEN (12 x 11): a ball of feathers, a three-bump comb
// -----------------------------------------------

const HEN_ROWS = [
  [
    '......rr....',
    '.t...LrRrL..',
    'tLt.LLLLLLw.',
    'tLLLLLLLekw.',
    '.tLLLwwwkkwo',
    '.twLLLLwwpwO',
    '.twwsssswwws',
    '..swwwwwwws.',
    '...swwwwss..',
    '....ssss....',
    '.....y.y....',
  ],
  [
    '............',
    '.t....rr....',
    'tLt..LrRrL..',
    'tLLLLLLLLLw.',
    '.tLLLLwwLLw.',
    '.twLLLLwwwww',
    '.twwsssswkkw',
    '..swwwwwwwpo',
    '...swwwwwsO.',
    '....ssss....',
    '.....y.y....',
  ],
] as const;

const HEN_BEAK = { r: '#e0475b', R: '#b4353f', o: '#f2a33a', O: '#d9862a', y: '#f2a33a', k: EYE, e: SHINE, p: CHEEK };
const HEN: Palette = { ...HEN_BEAK, L: '#ffffff', w: '#f4ede2', s: '#d9cab4', t: '#e3d6c2' };
const RED_HEN: Palette = { ...HEN_BEAK, L: '#e8955e', w: '#c8693a', s: '#a4532c', t: '#83401f' };
const GOLDEN_HEN: Palette = { ...HEN_BEAK, L: '#fff1a8', w: C.gold, s: C.goldDark, t: '#e0ae3c', x: SPARKLE };

function hen(frame: 0 | 1, pal: Palette): Sprite {
  const rows: string[] = [...HEN_ROWS[frame]];
  // The golden hen twinkles: two sparkles off her body.
  if (pal.x) {
    rows[0] = rows[0].slice(0, 11) + 'x';
    rows[8] = 'x' + rows[8].slice(1);
  }
  return layered(12, 11, pal, [[0, 0, rows]]);
}

// -----------------------------------------------
// COW (19 x 14): a big head, short legs, spots
// -----------------------------------------------

const COW_BODY = [
  '.LLLLLLLLLL.',
  'LLbbLLLLLLLw',
  'LbbbwwwwbBww',
  'wbbwwwwwbbww',
  'wwwwwwwwwwws',
  'swwwwwwwwwss',
  '.ssssssssss.',
];
const COW_HEAD = [
  '..h....h..',
  '.LLLbbLLw.',
  'ELLbbLLLwE',
  'ELLLLLLLwE',
  '.ekLLLekw.',
  '.kkLLLkkw.',
  '.pmmmmmmp.',
  '.wmnmmnmw.',
  '..mmmmmm..',
];

const HIDE = { L: '#ffffff', w: '#f4ede2', s: '#d9cab4', h: '#f3e6c8', E: '#f5b3b8', m: '#f5b3b8', n: '#b85a72', k: EYE, e: SHINE, p: CHEEK };
const COW: Palette = { ...HIDE, b: '#4a3a3a', B: '#6a5656' };
const PINK_COW: Palette = { ...HIDE, b: '#f48fb1', B: '#ffc4d8' };

function cow(frame: 0 | 1, pal: Palette): Sprite {
  const head = frame ? sleepy(COW_HEAD, 4, 'L') : COW_HEAD;
  return layered(19, 14, pal, [[1, 5, COW_BODY], [9, frame ? 4 : 0, head]], (P) => {
    legs(P, [4, 10], [2, 8], 11, 13, 2, pal.w, pal.s, '#5b4a48');
    P.rect(0, 6, 1, 2, pal.s);
    P.rect(0, 8, 1, 2, pal.b);
    P.rect(6, 12, 2, 1, pal.m);
  });
}

// -----------------------------------------------
// SHEEP (17 x 11): a woolly cloud, a soft face
// -----------------------------------------------

const SHEEP_BODY = [
  '.LL.LL.LL...',
  'LwwLwwLwwL..',
  'LwwwwwwwwwL.',
  'wwwwwwwwwwww',
  'swwwwwwwwwww',
  'swwwwwwwwwws',
  '.sswwsswwss.',
  '..ss.ss.ss..',
];
const SHEEP_HEAD = [
  '..LwL..',
  '.LwwwL.',
  'aFFFFFa',
  '.ekFek.',
  '.kkFkk.',
  '.pFFFp.',
  '..FnF..',
];

const SHEEP: Palette = { L: '#ffffff', w: '#f3ece0', s: '#d9cdb9', F: '#c4a59b', a: '#9c7e76', n: '#866a64', k: EYE, e: SHINE, p: CHEEK };
const BLACK_SHEEP: Palette = { L: '#8a7f8c', w: '#665c6a', s: '#4c4352', F: '#4a3f46', a: '#2c2428', n: '#2c2428', k: '#1a1216', e: SHINE, p: '#c98a96' };

function sheep(frame: 0 | 1, pal: Palette): Sprite {
  const head = frame ? sleepy(SHEEP_HEAD, 3, 'F') : SHEEP_HEAD;
  return layered(17, 11, pal, [[0, 1, SHEEP_BODY], [10, frame ? 3 : 0, head]], (P) => legs(P, [5, 10], [3, 8], 9, 10, 1, pal.n, pal.a, pal.n));
}

// -----------------------------------------------
// PIG (16 x 11): round and pink, a big snout, a curly tail
// -----------------------------------------------

const PIG_BODY = [
  '.LLLLLLLL..',
  'LLLbbLLLLww',
  'LLwbbwwwwww',
  'wwwwwwwbbww',
  'swwwwwwbbws',
  '.sswwwwwss.',
  '..sssssss..',
];
const PIG_HEAD = [
  'E.....E',
  'EL...LE',
  'LLLLLLw',
  'LekLekw',
  'LkkLkkw',
  'pLmmmLp',
  'wmnmnmw',
  '.smmms.',
];

const PINK = { L: '#ffd3dc', w: '#f7b0bf', s: '#e48aa0', E: '#e07a92', m: '#f08aa2', n: '#b85a72', k: EYE, e: SHINE, p: '#f27a8a' };
const PIG: Palette = { ...PINK, b: PINK.w };
const SPOTTED_PIG: Palette = { ...PINK, b: '#a8673f' };

function pig(frame: 0 | 1, pal: Palette): Sprite {
  const head = frame ? sleepy(PIG_HEAD, 3, 'L') : PIG_HEAD;
  return layered(16, 11, pal, [[1, 3, PIG_BODY], [9, frame ? 3 : 0, head]], (P) => {
    legs(P, [5, 10], [3, 8], 10, 10, 1, pal.s, pal.s, '#8f5a5a');
    // The curly tail.
    P.px(0, 4, pal.s);
    P.px(0, 3, pal.s);
    P.px(1, 2, pal.s);
  });
}

// -----------------------------------------------
// BEE (10 x 8): a striped ball with glassy wings
// -----------------------------------------------

const BEE_ROWS = [
  [
    '..WW.WW...',
    '.WwwWwwW..',
    '..WW.WW...',
    '..ykykyyy.',
    '.yykykyeky',
    'kyykykykky',
    '.yykykyypy',
    '..ykykyy..',
  ],
  [
    '..........',
    '..........',
    '.WWW.WWW..',
    '..ykykyyy.',
    '.yykykyeky',
    'kyykykykky',
    '.yykykyypy',
    '..ykykyy..',
  ],
] as const;

const BEE: Palette = { y: '#f7cf3c', k: '#4a3135', W: '#ffffff', w: '#dff1fb', e: SHINE, p: CHEEK };
const QUEEN_BEE: Palette = { ...BEE, y: '#fbe38a', k: '#c98a2a', c: '#e0a020', C: SPARKLE };

/** Frame 1 flutters the wings. The queen is golden and crowned. */
function bee(frame: 0 | 1, queen: boolean): Sprite {
  const rows: string[] = [...BEE_ROWS[frame]];
  if (queen) {
    rows[1] = rows[1].slice(0, 7) + 'c.c';
    rows[2] = rows[2].slice(0, 7) + 'cCc';
  }
  return layered(10, 8, queen ? QUEEN_BEE : BEE, [[0, 0, rows]]);
}

// -----------------------------------------------
// GOAT (16 x 14): long legs, horns, a beard
// -----------------------------------------------

const GOAT_BODY = [
  '.LLLLLLLL.',
  'LLwwwwwwww',
  'wwwwwwwwww',
  'swwwwwwwws',
  '.ssssssss.',
];
const GOAT_HEAD = [
  '.h....h.',
  '..hLwh..',
  'ELLLLLwE',
  '.ekLekw.',
  '.kkLkkw.',
  '.pLmmLp.',
  '..mnnm..',
  '...bb...',
  '...b....',
];

const GOAT: Palette = { L: '#e8cfac', w: '#d2ad82', s: '#b48d64', h: '#9c958d', E: '#b48d64', m: '#f2cfae', n: '#b85a72', b: '#f6e5c8', f: '#5b4a48', k: EYE, e: SHINE, p: CHEEK };
const SNOW_GOAT: Palette = { L: '#ffffff', w: '#f6f4f0', s: '#d3e4f2', h: '#86c3ea', E: '#d3e4f2', m: '#f6dfe4', n: '#c98a96', b: '#ffffff', f: '#7d9ab3', k: EYE, e: SHINE, p: CHEEK };

function goat(frame: 0 | 1, pal: Palette): Sprite {
  const head = frame ? sleepy(GOAT_HEAD, 3, 'L') : GOAT_HEAD;
  return layered(16, 14, pal, [[1, 5, GOAT_BODY], [8, frame ? 4 : 0, head]], (P) => {
    legs(P, [4, 9], [2, 7], 10, 13, 1, pal.w, pal.s, pal.f);
    P.px(0, 4, pal.L);
    P.px(0, 5, pal.w);
  });
}

// -----------------------------------------------
// DUCK (12 x 10): a cream farm duck, or the colourful mandarin
// -----------------------------------------------

const DUCK_ROWS = [
  [
    '......LLL...',
    '.....LLLLw..',
    '.....LLekwoo',
    'L....LLkkwO.',
    'LL...wwpww..',
    'LwLLLLLwww..',
    'wwLLwwwwwww.',
    'swwsssswwws.',
    '.sswwwwwss..',
    '...o..o.....',
  ],
  [
    '............',
    '............',
    '............',
    'L...........',
    'LL...LLLL...',
    'LwLLLLLLLw..',
    'wwLLwwwkkwoo',
    'swwsssswwpO.',
    '.sswwwwwss..',
    '...o..o.....',
  ],
] as const;
const MANDARIN_ROWS = [
  [
    '......ggg...',
    '.....gggWg..',
    '.....WWekgrr',
    's....OOkkOR.',
    'ss...POOO...',
    'sPOOOPPbbb..',
    'PPOOPPbbbbb.',
    'dPPddddbbbd.',
    '.ddbbbbbdd..',
    '...f..f.....',
  ],
  [
    '............',
    '............',
    '............',
    's...........',
    'ss...gggg...',
    'sPOOOggWgg..',
    'PPOOPPgkkgrr',
    'dPPddddOORR.',
    '.ddbbbbbdd..',
    '...f..f.....',
  ],
] as const;

const DUCK: Palette = { L: '#ffffff', w: '#fff8e4', s: '#e6d9bd', o: '#f7a53a', O: '#d9862a', k: EYE, e: SHINE, p: CHEEK };
const MANDARIN: Palette = { g: '#2f7a55', W: '#fff6e8', r: '#e0475b', R: '#b4353f', O: '#f08a2b', P: '#7a4a7a', b: '#d9935a', d: '#b0703f', s: '#5e4a46', f: '#f2a33a', k: EYE, e: SHINE };

function duck(frame: 0 | 1, mandarin: boolean): Sprite {
  return layered(12, 10, mandarin ? MANDARIN : DUCK, [[0, 0, (mandarin ? MANDARIN_ROWS : DUCK_ROWS)[frame]]]);
}

// -----------------------------------------------
// RABBIT (12 x 12): sitting, ears up (hanging for the lop)
// -----------------------------------------------

const RABBIT_BODY = [
  '..LLLL..',
  '.LLwwwL.',
  'tLwwwwww',
  'wwwwwwww',
  'swwwwwws',
  '.ss..ss.',
];
const RABBIT_HEAD = [
  '..LE.LE.',
  '..LE.LE.',
  '..LE.LE.',
  '.LLLLLLw',
  'LekLLekw',
  'LkkLLkkw',
  'LpLnnLpw',
  '.wwwwws.',
];
const LOP_HEAD = [
  '........',
  '........',
  '..LLLL..',
  'EEwLLwEE',
  'EekLLekE',
  'EkkLLkkE',
  'EpLnnLpE',
  '.Ewwwws.',
];

const RABBIT: Palette = { L: '#dfc4a3', w: '#c4a07c', s: '#a68260', E: '#f5b3b8', t: '#ffffff', n: '#f08aa2', k: EYE, e: SHINE, p: CHEEK };
const LOP_RABBIT: Palette = { L: '#fff6e8', w: '#f2e2c8', s: '#d9c4a2', E: '#b98a62', t: '#ffffff', n: '#f08aa2', k: EYE, e: SHINE, p: CHEEK };

function rabbit(frame: 0 | 1, lop: boolean): Sprite {
  const face = lop ? LOP_HEAD : RABBIT_HEAD;
  const head = frame ? sleepy(face, 4, 'L') : face;
  return layered(12, 12, lop ? LOP_RABBIT : RABBIT, [[0, 6, RABBIT_BODY], [4, frame ? 2 : 1, head]]);
}

// -----------------------------------------------
// THE DRAWINGS BY ID
// -----------------------------------------------

/** Frame 1 is the idle gesture (pecking, grazing, rooting, dabbling...), shown while the animal stands still. */
export function animalArt(id: AnimalId, frame: 0 | 1): Sprite {
  switch (id) {
    case 'chicken': return hen(frame, HEN);
    case 'cow': return cow(frame, COW);
    case 'sheep': return sheep(frame, SHEEP);
    case 'pig': return pig(frame, PIG);
    case 'bee': return bee(frame, false);
    case 'goat': return goat(frame, GOAT);
    case 'duck': return duck(frame, false);
    case 'rabbit': return rabbit(frame, false);
  }
}

/** A rare animal: same canvas size, pose and frames as its kind. */
export function breedArt(id: BreedId, frame: 0 | 1): Sprite {
  switch (id) {
    case 'redHen': return hen(frame, RED_HEN);
    case 'goldenHen': return hen(frame, GOLDEN_HEN);
    case 'pinkCow': return cow(frame, PINK_COW);
    case 'blackSheep': return sheep(frame, BLACK_SHEEP);
    case 'spottedPig': return pig(frame, SPOTTED_PIG);
    case 'queenBee': return bee(frame, true);
    case 'snowGoat': return goat(frame, SNOW_GOAT);
    case 'mandarinDuck': return duck(frame, true);
    case 'lopRabbit': return rabbit(frame, true);
  }
}
