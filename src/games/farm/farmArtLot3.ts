import type { DecorId } from './data/types';
import {
  C, OUTLINE, IRON, IRON_LIGHT, ROOF_RED, DOOR_BLUE, TILE, WATER_MIST,
  canvas, eave, framedWindow, plankDoor, sprite, stones, tiledRoof,
} from './farmPaint';
import type { Painter, Sprite, Tones, View } from './farmPaint';
import type { Glow } from './farmArtDecor';

// -----------------------------------------------
// LOT 3 OF DECORATIONS (docs/ferme.md 27)
// -----------------------------------------------
// Same recipe as farmArtDecor: one light from the top left, three or four tones per material, outline by `sprite`.
// A profile (a piece turned a quarter) is its own drawing, its long side running away from the viewer; a square
// piece seen the same from every side only has its face (LOT3_SYMMETRIC). The wall is a piece that joins (`stoneWall`).

export type Lot3Decor = Extract<DecorId,
  | 'torch' | 'steppingStones' | 'topiaryBall' | 'hopscotch' | 'fireflyJar' | 'sundial' | 'wickerSet' | 'sandbox'
  | 'topiaryRabbit' | 'paperLanterns' | 'columnUrn' | 'doeStatue' | 'slide' | 'topiaryHeart' | 'toolShed' | 'tipi'
  | 'moonGate' | 'rockery' | 'roulotte' | 'carriage'>;

const LOT3_IDS = new Set<string>([
  'torch', 'steppingStones', 'topiaryBall', 'hopscotch', 'fireflyJar', 'sundial', 'wickerSet', 'sandbox',
  'topiaryRabbit', 'paperLanterns', 'columnUrn', 'doeStatue', 'slide', 'topiaryHeart', 'toolShed', 'tipi',
  'moonGate', 'rockery', 'roulotte', 'carriage',
] satisfies Lot3Decor[]);

export function isLot3Decor(id: string): id is Lot3Decor {
  return LOT3_IDS.has(id);
}

/** Seen the same from every side: one drawing for both views (mirrored when turned the other way). */
export const LOT3_SYMMETRIC: ReadonlySet<Lot3Decor> = new Set<Lot3Decor>([
  'torch', 'steppingStones', 'topiaryBall', 'fireflyJar', 'sundial', 'topiaryRabbit', 'columnUrn', 'doeStatue',
  'topiaryHeart', 'toolShed', 'tipi', 'moonGate', 'rockery',
]);

export function lot3Decor(id: Lot3Decor, view: View): Sprite {
  const face = view === 'face';
  switch (id) {
    case 'torch': return torch();
    case 'steppingStones': return steppingStones();
    case 'topiaryBall': return topiaryBall();
    case 'hopscotch': return face ? hopscotchFace() : turnedFlat(hopscotchFace());
    case 'fireflyJar': return fireflyJar();
    case 'sundial': return sundial();
    case 'wickerSet': return face ? wickerSetFace() : wickerSetProfile();
    case 'sandbox': return face ? sandboxFace() : sandboxProfile();
    case 'topiaryRabbit': return topiaryRabbit();
    case 'paperLanterns': return face ? paperLanternsFace() : paperLanternsProfile();
    case 'columnUrn': return columnUrn();
    case 'doeStatue': return doeStatue();
    case 'slide': return face ? slideFace() : slideProfile();
    case 'topiaryHeart': return topiaryHeart();
    case 'toolShed': return toolShed();
    case 'tipi': return tipi();
    case 'moonGate': return moonGate();
    case 'rockery': return rockery();
    case 'roulotte': return face ? roulotteFace() : roulotteProfile();
    case 'carriage': return face ? carriageFace() : carriageProfile();
    default: {
      const unknown: never = id;
      throw new Error(`no drawing for ${String(unknown)}`);
    }
  }
}

/** Where a lot 3 decoration glows at night; empty for most. */
export function lot3Glows(id: Lot3Decor, view: View): Glow[] {
  const face = view === 'face';
  switch (id) {
    case 'torch': return torchGlows();
    case 'fireflyJar': return fireflyGlows;
    case 'paperLanterns': return face ? paperLanternFaceGlows : paperLanternProfileGlows;
    case 'roulotte': return face ? roulotteFaceGlows : roulotteProfileGlows;
    case 'carriage': return face ? carriageFaceGlows : carriageProfileGlows;
    default: return [];
  }
}

/** The torch sitting on a support: only its cup and flame. */
export function perchedTorch(): Sprite {
  return torch(true);
}

/** A flat drawing turned a quarter, for a flat piece's profile: its outline turns with it. */
function turnedFlat(face: Sprite): Sprite {
  const out = canvas(face.height, face.width);
  const g = out.getContext('2d')!;
  g.translate(out.width, 0);
  g.rotate(Math.PI / 2);
  g.drawImage(face, 0, 0);
  return out;
}

type Three = readonly [string, string, string];

const GREY: Three = [C.greyLight, C.grey, C.greyDark];
const MARBLE: Three = ['#f6f1e8', '#ddd5c8', '#b8ad9d'];
const TERRACOTTA: Three = ['#e08a6a', '#d4764f', '#a9533b'];
const WICKER: Three = ['#e0b878', '#c99a5b', '#a87a40'];
const FLAME = { tip: '#ffb347', base: '#f08a2b', heart: '#ffd84a', core: '#fff3c4' };
const BRASS: Three = ['#f5d98a', '#e0b45a', '#b8862e'];
const CANVAS: Tones = ['#ffffff', '#fff6e0', '#ecdcc0', '#d8c6a6'];
const PINK: Three = ['#ffc0d6', '#ff8fb8', '#e8789e'];
const MOSS = '#7cbd5c';

function woodPost(P: Painter, x: number, y: number, w: number, h: number): void {
  P.rect(x, y, w, h, C.wood);
  P.rect(x, y, 1, h, C.woodLight);
  P.rect(x + w - 1, y, 1, h, C.woodDark);
}

function bloom(P: Painter, x: number, y: number, [light, base, dark]: Three, heart: string = C.gold): void {
  P.px(x - 1, y, base);
  P.px(x + 1, y, dark);
  P.px(x, y - 1, light);
  P.px(x, y + 1, dark);
  P.px(x, y, heart);
}

/** A terracotta pot, its rim at `top`, `w` wide, centred on cx. */
function pot(P: Painter, cx: number, top: number, w: number, h: number, t: Three = TERRACOTTA): void {
  const x = cx - (w >> 1);
  P.rect(x, top, w, 2, t[1]);
  P.rect(x, top, w, 1, t[0]);
  P.rect(x + 1, top + 2, w - 2, h - 2, t[1]);
  P.rect(x + w - 3, top + 2, 2, h - 2, t[2]);
  P.rect(x + 1, top + 2, 1, h - 2, t[0]);
}

/** A clipped ball of box leaves, lit on its top left. */
function leafBall(P: Painter, cx: number, cy: number, r: number): void {
  P.disc(cx, cy, r, C.leafDark);
  P.disc(cx - 1, cy - 1, r - 1, C.leaf);
  for (let y = cy - r + 1; y < cy + r; y += 2) {
    for (let x = cx - r + 1 + ((y >> 1) % 2); x < cx + r; x += 3) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < (r - 1) * (r - 1)) P.px(x, y, dx + dy < 0 ? C.leafLight : C.leafDark);
    }
  }
}

// -----------------------------------------------
// FOR NOW (levels 6 to 20)
// -----------------------------------------------

/** On the ground a pole; perched, only the cup and the flame. */
function torch(perched = false): Sprite {
  const h = perched ? 11 : 24;
  return sprite(8, h, (P) => {
    // The flame.
    P.px(4, 0, FLAME.tip);
    P.rect(3, 1, 2, 2, FLAME.base);
    P.rect(2, 3, 4, 4, FLAME.base);
    P.px(2, 2, FLAME.tip);
    P.px(5, 2, FLAME.tip);
    P.rect(3, 4, 2, 3, FLAME.heart);
    P.px(3, 4, FLAME.core);
    P.px(4, 5, FLAME.core);
    // The iron cup.
    P.rect(1, 7, 6, 2, IRON);
    P.rect(1, 7, 6, 1, IRON_LIGHT);
    P.rect(2, 9, 4, 1, IRON);
    if (perched) {
      P.rect(3, 10, 2, 1, IRON);
      return;
    }
    woodPost(P, 3, 10, 2, 13);
    P.rect(3, 13, 2, 1, C.straw);
    P.rect(3, 15, 2, 1, C.strawDark);
    P.rect(2, 23, 4, 1, C.woodDark);
  });
}
const torchGlows = (perched = false): Glow[] => [{ x: 4, y: 4, r: perched ? 18 : 22, tint: '255, 170, 90' }];

function steppingStones(): Sprite {
  // Flat stones set in the grass: pale tops and a thin rim, nothing that stands up like a rock to clear.
  return sprite(14, 14, (P) => {
    for (const [x, y, rx, ry] of [[4, 2, 4, 2], [10, 7, 3, 2], [5, 11, 4, 2]] as const) {
      P.ellipse(x, y, rx, ry, '#b5ad9f');
      P.ellipse(x, y, rx - 1, ry - 1, '#d9d3c9');
      P.rect(x - rx + 1, y - 1, 2, 1, '#eeeae3');
    }
    for (const [x, y] of [[9, 2], [1, 7], [12, 11], [9, 12]] as const) {
      P.px(x, y, MOSS);
      P.px(x + 1, y, C.leafLight);
    }
  }, false);
}

/** One tile of low stone wall: its coping runs on into the neighbours, its face shows where it ends southwards. */
export function stoneWall(mask: number): Sprite {
  const n = (mask & 1) !== 0;
  const e = (mask & 2) !== 0;
  const s = (mask & 4) !== 0;
  const w = (mask & 8) !== 0;
  return sprite(TILE, 24, (P) => {
    const top = n ? 0 : 8;
    const face = 13;
    const left = w ? 0 : 1;
    const right = e ? TILE : TILE - 1;
    const bottom = s ? 24 : 23;
    // The coping seen from above: flat stones, joints across.
    P.rect(left, top, right - left, (s ? bottom : face) - top, C.greyLight);
    for (let y = top; y < (s ? bottom : face); y++) {
      if ((y - top) % 5 === 4) P.rect(left, y, right - left, 1, C.grey);
    }
    for (let x = left + 3; x < right; x += 6) P.rect(x, top, 1, (s ? bottom : face) - top, C.grey);
    if (!n) P.rect(left, top, right - left, 1, '#ece8e1');
    // The face, where the wall ends to the south.
    if (!s) {
      stones(P, left, face, right - left, bottom - face, GREY);
      P.rect(left, face, right - left, 1, C.greyDark);
    }
    // Moss and a tuft, always at the same spots so a long wall does not flicker.
    P.px(5, top + 1, MOSS);
    P.px(6, top + 1, C.leafLight);
    if (!s) {
      P.px(12, bottom - 1, C.leaf);
      P.px(13, bottom - 2, C.leafLight);
    }
  }, true, 0);
}
/** Where a perched decoration sits on a wall tile. */
export const WALL_SEAT = { x: 8, y: 10 };

function topiaryBall(): Sprite {
  return sprite(12, 20, (P) => {
    pot(P, 6, 14, 8, 6);
    P.rect(5, 9, 2, 5, C.bark);
    P.px(5, 9, '#a87a52');
    leafBall(P, 6, 6, 5);
  });
}

/** Flat, two tiles long: chalk boxes on pale slabs. */
function hopscotchFace(): Sprite {
  return sprite(30, 14, (P) => {
    // Pale paving, boxes in white chalk, their numbers in coloured chalk, a pebble.
    P.rect(0, 0, 30, 14, '#ddd5c6');
    for (let x = 0; x < 30; x += 6) P.rect(x, 0, 1, 14, '#cfc6b4');
    P.rect(0, 7, 30, 1, '#cfc6b4');
    const box = (x: number, y: number) => {
      P.rect(x, y, 6, 1, '#ffffff');
      P.rect(x, y + 5, 6, 1, '#ffffff');
      P.rect(x, y, 1, 6, '#ffffff');
      P.rect(x + 5, y, 1, 6, '#ffffff');
    };
    box(1, 4);
    box(6, 4);
    box(11, 1);
    box(11, 6);
    box(16, 4);
    P.rect(3, 6, 1, 2, '#ff8fb8');
    P.rect(8, 6, 2, 1, '#86c4f0');
    P.rect(8, 7, 2, 1, '#86c4f0');
    P.rect(13, 3, 2, 2, '#ffd84a');
    P.rect(13, 8, 2, 2, '#9fe3c4');
    P.rect(18, 6, 2, 2, '#c9a8f0');
    for (let y = 2; y < 13; y++) {
      const half = Math.round(Math.sqrt(Math.max(0, 30 - (y - 7) * (y - 7))));
      P.px(21 + half, y, '#ffffff');
    }
    P.rect(21, 2, 1, 11, '#ffffff');
    P.px(24, 7, '#ff8fb8');
    P.px(25, 6, '#ffd84a');
    P.rect(7, 11, 2, 1, '#8f877a');
    P.px(7, 10, '#b8b0a2');
  });
}

/** A jar of fireflies, its cloth lid tied with string: sits on the ground or on a support. */
function fireflyJar(): Sprite {
  return sprite(8, 11, (P) => {
    P.rect(1, 1, 6, 2, '#f39aa6');
    P.px(2, 1, '#fff6f0');
    P.px(5, 2, '#fff6f0');
    P.rect(0, 2, 1, 2, '#e0475b');
    P.rect(7, 2, 1, 2, '#e0475b');
    P.rect(1, 3, 6, 1, C.straw);
    P.rect(1, 4, 6, 7, '#9fc7b8');
    P.rect(1, 4, 1, 7, '#d0ebe2');
    P.rect(5, 4, 2, 7, '#7fa99a');
    for (const [x, y] of [[3, 5], [4, 8], [2, 9], [5, 6]] as const) P.px(x, y, '#f2ff8a');
    P.px(3, 6, '#d8f06a');
    P.rect(1, 10, 6, 1, '#6f9488');
  });
}
const fireflyGlows: Glow[] = [{ x: 4, y: 7, r: 14, tint: '200, 255, 120' }];

function sundial(): Sprite {
  return sprite(14, 17, (P) => {
    stones(P, 2, 13, 10, 4, MARBLE);
    P.rect(3, 12, 8, 1, MARBLE[0]);
    P.rect(4, 5, 6, 7, MARBLE[1]);
    P.rect(4, 5, 1, 7, MARBLE[0]);
    P.rect(8, 5, 2, 7, MARBLE[2]);
    P.rect(6, 6, 1, 5, MARBLE[2]);
    // The dial: a flat marble plate, its hour marks, a brass gnomon.
    P.ellipse(7, 4, 6, 1, MARBLE[2]);
    P.ellipse(7, 3, 6, 1, MARBLE[0]);
    for (const x of [2, 4, 7, 10, 12]) P.px(x, 3, '#9c917f');
    P.rect(6, 0, 1, 3, BRASS[1]);
    P.line(7, 1, 9, 3, BRASS[2]);
    P.px(7, 2, BRASS[0]);
    P.px(8, 2, BRASS[1]);
    P.px(3, 11, C.leaf);
    P.px(4, 10, C.leafLight);
    P.px(10, 12, C.leafDark);
  });
}

/** A round table between two wicker armchairs, a jug of lemonade. */
function wickerSetFace(): Sprite {
  const chair = (P: Painter, x: number, flip: boolean) => {
    // The rounded back, woven.
    P.rect(x + 1, 3, 8, 8, WICKER[1]);
    P.rect(x + 2, 2, 6, 1, WICKER[1]);
    for (let yy = 3; yy < 11; yy++) for (let xx = x + 1 + (yy % 2); xx < x + 9; xx += 2) P.px(xx, yy, WICKER[0]);
    P.rect(flip ? x + 8 : x + 1, 3, 1, 8, flip ? WICKER[2] : WICKER[0]);
    // The arms, the seat with its cushion, the legs.
    P.rect(x, 7, 2, 6, WICKER[2]);
    P.rect(x + 8, 7, 2, 6, WICKER[2]);
    P.rect(x, 7, 2, 1, WICKER[0]);
    P.rect(x + 8, 7, 2, 1, WICKER[0]);
    P.rect(x + 2, 9, 6, 3, PINK[1]);
    P.rect(x + 2, 9, 6, 1, PINK[0]);
    P.rect(x + 2, 12, 6, 2, WICKER[1]);
    P.rect(x + 2, 13, 6, 1, WICKER[2]);
    P.rect(x + 1, 14, 1, 3, WICKER[2]);
    P.rect(x + 8, 14, 1, 3, WICKER[2]);
  };
  return sprite(30, 17, (P) => {
    chair(P, 0, false);
    chair(P, 20, true);
    // The table.
    P.rect(14, 10, 2, 7, IRON);
    P.rect(12, 16, 6, 1, IRON);
    P.ellipse(15, 9, 4, 1, '#e3dccd');
    P.ellipse(15, 8, 4, 1, C.white);
    // The jug and two glasses.
    P.rect(13, 3, 3, 5, '#fff3a6');
    P.rect(13, 3, 1, 5, '#fffbe0');
    P.rect(13, 2, 3, 1, '#e6f6fb');
    P.px(16, 4, '#e6f6fb');
    P.px(16, 5, '#e6f6fb');
    P.px(14, 4, C.leafLight);
    P.rect(11, 6, 1, 2, '#fff3a6');
    P.rect(18, 6, 1, 2, '#fff3a6');
    P.px(11, 5, '#e6f6fb');
    P.px(18, 5, '#e6f6fb');
  });
}

function sandboxFace(): Sprite {
  return sprite(30, 17, (P) => {
    P.rect(0, 4, 30, 13, C.wood);
    P.rect(0, 4, 30, 1, C.woodLight);
    P.rect(2, 6, 26, 7, '#f2dca0');
    P.rect(2, 6, 26, 1, '#d9bf7f');
    for (const [x, y] of [[6, 9], [13, 11], [20, 8], [24, 11], [9, 12]] as const) {
      P.px(x, y, '#fbeac0');
      P.px(x + 1, y, '#d9bf7f');
    }
    P.rect(0, 13, 30, 4, C.woodDark);
    P.rect(0, 13, 30, 1, C.wood);
    for (const x of [7, 15, 23]) P.rect(x, 14, 1, 3, '#7f5634');
    P.rect(28, 4, 2, 13, C.woodDark);
    // A sand castle with its flag.
    P.rect(4, 6, 7, 5, '#e8c983');
    P.rect(4, 6, 1, 5, '#f5dfa8');
    P.rect(9, 6, 2, 5, '#cfae6a');
    for (const x of [4, 6, 8, 10]) P.px(x, 5, '#e8c983');
    P.rect(6, 8, 2, 3, '#b8955a');
    P.line(7, 5, 7, 1, C.woodDark);
    P.rect(8, 1, 2, 2, '#e0475b');
    // A bucket and a spade.
    P.rect(19, 4, 5, 6, '#5b9bd5');
    P.rect(19, 4, 5, 1, '#9cc8ef');
    P.rect(22, 5, 2, 5, '#4a80b8');
    P.line(19, 3, 23, 3, '#4a80b8');
    P.line(25, 11, 27, 2, '#e0475b');
    P.rect(24, 11, 3, 2, '#f2c94c');
  });
}

// -----------------------------------------------
// LATE GAME (levels 22 to 30)
// -----------------------------------------------

function topiaryRabbit(): Sprite {
  return sprite(14, 24, (P) => {
    // A white wooden planter.
    P.rect(2, 17, 10, 7, '#f6efe4');
    P.rect(2, 17, 10, 1, '#ffffff');
    P.rect(10, 18, 2, 6, '#ddd2c0');
    P.rect(2, 19, 10, 1, '#e6dccd');
    // The rabbit in box: body, head, two ears, a round tail.
    leafBall(P, 6, 13, 4);
    leafBall(P, 9, 7, 3);
    P.rect(8, 0, 2, 5, C.leafDark);
    P.rect(8, 0, 1, 4, C.leaf);
    P.rect(11, 1, 2, 4, C.leafDark);
    P.px(11, 1, C.leaf);
    P.disc(2, 13, 1, C.leafLight);
    P.rect(4, 16, 3, 1, C.leafDark);
    P.rect(8, 16, 3, 1, C.leafDark);
    // A pink ribbon at the neck.
    P.rect(7, 10, 3, 1, PINK[1]);
    P.px(6, 10, PINK[0]);
    P.px(10, 11, PINK[2]);
  });
}

/** Paper lanterns on a string between two poles. */
function paperLanternsFace(): Sprite {
  const string = (x: number) => 5 + Math.round(4 * Math.sin((Math.PI * (x - 1)) / 27));
  return sprite(30, 31, (P) => {
    woodPost(P, 0, 3, 2, 28);
    woodPost(P, 28, 3, 2, 28);
    P.rect(0, 2, 2, 1, C.woodDark);
    P.rect(28, 2, 2, 1, C.woodDark);
    for (let x = 2; x < 28; x++) P.px(x, string(x), '#6b4a3a');
    const colours: Three[] = [PINK, ['#fff1a0', '#ffd84a', '#f2b632'], ['#d6b8f5', '#b58ee0', '#8f6ac2']];
    LANTERN_XS.forEach((x, i) => {
      const [light, base, dark] = colours[i % colours.length];
      const top = string(x) + 2;
      P.px(x, top - 1, '#6b4a3a');
      P.rect(x - 1, top, 3, 1, OUTLINE);
      P.ellipse(x, top + 4, 3, 3, base);
      P.rect(x - 2, top + 2, 1, 4, light);
      P.rect(x + 2, top + 2, 1, 4, dark);
      P.rect(x - 3, top + 3, 7, 1, dark);
      P.rect(x - 3, top + 5, 7, 1, dark);
      P.px(x - 1, top + 2, '#ffffff');
      P.rect(x - 1, top + 8, 3, 1, OUTLINE);
      P.px(x, top + 9, base);
      P.px(x, top + 10, dark);
    });
  });
}
const LANTERN_XS = [7, 15, 23];
const paperLanternFaceGlows: Glow[] = LANTERN_XS.map((x) => {
  const y = 5 + Math.round(4 * Math.sin((Math.PI * (x - 1)) / 27)) + 6;
  return { x: x + 1, y: y + 1, r: 10, tint: '255, 170, 150' };
});

function columnUrn(): Sprite {
  return sprite(16, 28, (P) => {
    stones(P, 3, 24, 10, 4, MARBLE);
    P.rect(2, 23, 12, 1, MARBLE[0]);
    P.rect(5, 13, 6, 10, MARBLE[1]);
    P.rect(5, 13, 1, 10, MARBLE[0]);
    P.rect(9, 13, 2, 10, MARBLE[2]);
    P.rect(7, 14, 1, 8, MARBLE[2]);
    P.rect(4, 12, 8, 1, MARBLE[2]);
    P.rect(4, 11, 8, 1, MARBLE[0]);
    // The urn.
    P.rect(6, 9, 4, 2, MARBLE[1]);
    P.ellipse(8, 7, 5, 2, MARBLE[1]);
    P.ellipse(7, 6, 4, 1, MARBLE[0]);
    P.rect(11, 6, 2, 3, MARBLE[2]);
    // Flowers on top, ivy and petunias trailing down.
    for (const [x, y] of [[4, 4], [8, 3], [12, 4], [6, 2], [10, 2]] as const) {
      P.disc(x, y + 1, 1, C.leafDark);
      P.px(x - 1, y, C.leaf);
    }
    bloom(P, 5, 3, PINK);
    bloom(P, 9, 1, ['#d6b8f5', '#b58ee0', '#8f6ac2']);
    bloom(P, 12, 3, PINK);
    for (const [x, y0, len] of [[3, 7, 7], [13, 7, 9], [2, 9, 4]] as const) {
      for (let y = y0; y < y0 + len; y++) P.px(x + ((y >> 1) % 2 ? 0 : -1 + (x > 8 ? 2 : 0)), y, y % 3 ? C.leafDark : C.leaf);
      P.px(x, y0 + len, PINK[1]);
    }
  });
}

const DOE = [
  '...a.a........',
  '...aaab.......',
  '..abbbb.......',
  '.abbbb........',
  'cbbbbc........',
  '....abc.......',
  '.....abc......',
  '.....abbbbbbb.',
  '.....abbbbbbbc',
  '......bbbbbbc.',
  '......bc...bc.',
  '......bc...bc.',
  '......bc...bc.',
  '......bc...bc.',
  '......bc...bc.',
  '......cc...cc.',
];

function doeStatue(): Sprite {
  return sprite(14, 23, (P) => {
    P.map(0, 0, DOE, { a: MARBLE[0], b: MARBLE[1], c: MARBLE[2] });
    P.px(2, 3, OUTLINE);
    P.px(12, 6, MARBLE[0]);
    P.px(13, 6, MARBLE[1]);
    stones(P, 1, 16, 12, 7, MARBLE);
    P.rect(0, 16, 14, 1, MARBLE[0]);
    P.rect(11, 17, 2, 6, MARBLE[2]);
    P.px(2, 22, MOSS);
    P.px(3, 21, C.leafLight);
    P.px(12, 16, MOSS);
  });
}

function slideFace(): Sprite {
  return sprite(30, 28, (P) => {
    // The ladder and its little platform.
    P.rect(1, 4, 2, 24, '#5b9bd5');
    P.rect(8, 4, 2, 24, '#4a80b8');
    P.rect(1, 4, 1, 24, '#9cc8ef');
    for (let y = 8; y < 27; y += 4) P.rect(3, y, 5, 1, C.woodLight);
    P.rect(0, 3, 12, 2, C.wood);
    P.rect(0, 3, 12, 1, C.woodLight);
    P.rect(1, 0, 1, 3, '#4a80b8');
    P.rect(8, 0, 1, 3, '#4a80b8');
    P.rect(1, 0, 8, 1, '#5b9bd5');
    // The slide: a yellow chute between red sides, curving out at the foot.
    const y = (x: number) => (x < 26 ? 4 + Math.round((x - 11) * 1.25) : 23);
    for (let x = 11; x < 30; x++) {
      P.rect(x, y(x) - 1, 1, 1, '#e0475b');
      P.rect(x, y(x), 1, 3, '#f2c94c');
      P.px(x, y(x), '#fbe38a');
      P.rect(x, y(x) + 3, 1, 2, '#b4353f');
    }
    // A leg under the middle.
    P.rect(20, 18, 2, 10, '#4a80b8');
  });
}

const HEART = [
  '.aab...aab.',
  'aabbb.abbbc',
  'abbbbbbbbbc',
  'abbbbbbbbbc',
  'abbbbbbbbbc',
  '.bbbbbbbbc.',
  '..bbbbbbc..',
  '...bbbbc...',
  '....bbc....',
  '.....c.....',
];
function topiaryHeart(): Sprite {
  return sprite(13, 23, (P) => {
    pot(P, 6, 17, 8, 6);
    P.rect(5, 10, 2, 7, C.bark);
    P.px(5, 10, '#a87a52');
    P.map(1, 1, HEART, { a: C.leafLight, b: C.leaf, c: C.leafDark });
    for (const [x, y] of [[3, 3], [8, 2], [6, 6], [9, 5], [4, 7]] as const) {
      P.px(x, y, PINK[1]);
      P.px(x, y - 1, PINK[0]);
    }
  });
}

function toolShed(): Sprite {
  return sprite(30, 34, (P) => {
    // Plank walls, painted sage.
    const SAGE: Three = ['#c8e3a6', '#93c06f', '#6f9c52'];
    P.rect(1, 10, 28, 24, SAGE[1]);
    for (let x = 1; x < 29; x += 3) P.rect(x, 10, 1, 24, SAGE[2]);
    P.rect(1, 10, 1, 24, SAGE[0]);
    P.rect(26, 10, 3, 24, SAGE[2]);
    tiledRoof(P, 0, 9, 30, ROOF_RED);
    eave(P, 0, 9, 30, ROOF_RED, SAGE[2]);
    framedWindow(P, 5, 16, 6, 5, { flowers: true, frame: C.white });
    plankDoor(P, 16, 17, 8, 17, DOOR_BLUE);
    // A rake leaning on the wall, a watering can at the door.
    P.line(27, 33, 28, 14, C.woodDark);
    P.rect(26, 13, 5, 1, IRON);
    for (const x of [26, 28, 30]) P.px(x, 14, IRON);
    P.rect(11, 29, 4, 4, '#a9bcb8');
    P.rect(11, 29, 4, 1, '#d4e0dd');
    P.line(15, 30, 16, 28, '#82958f');
    P.px(10, 30, '#82958f');
    // A sign.
    P.rect(17, 12, 6, 3, C.woodLight);
    P.rect(18, 13, 4, 1, C.woodDark);
  });
}

function tipi(): Sprite {
  return sprite(30, 36, (P) => {
    // Poles crossing at the top.
    P.line(11, 0, 15, 6, C.woodDark);
    P.line(19, 0, 15, 6, C.wood);
    P.line(15, 0, 15, 5, C.woodLight);
    // The canvas, shaded on its right.
    for (let y = 5; y < 36; y++) {
      const half = Math.round((y - 4) * 0.45);
      P.rect(15 - half, y, 2 * half + 1, 1, CANVAS[1]);
      P.rect(15 - half, y, 1, 1, CANVAS[0]);
      P.rect(15 + Math.round(half * 0.4), y, Math.ceil(half * 0.6) + 1, 1, CANVAS[2]);
      P.px(15 + half, y, CANVAS[3]);
    }
    // Two bands of colour with little triangles.
    for (const [y, col, dark] of [[14, '#ff8fb8', '#e8789e'], [25, '#7ea4e6', '#5d80c4']] as const) {
      const half = Math.round((y - 4) * 0.45);
      P.rect(15 - half, y, 2 * half + 1, 2, col);
      P.rect(15 + Math.round(half * 0.4), y, Math.ceil(half * 0.6) + 1, 2, dark);
      for (let x = 15 - half + 1; x < 15 + half; x += 3) P.px(x, y + 2, col);
    }
    // The open flap, the cushions inside.
    for (let y = 22; y < 36; y++) {
      const half = Math.round((y - 21) * 0.4);
      P.rect(15 - half, y, 2 * half + 1, 1, '#7a5440');
    }
    P.line(15, 22, 9, 35, CANVAS[0]);
    P.line(14, 23, 8, 34, CANVAS[2]);
    P.rect(13, 32, 4, 3, PINK[1]);
    P.rect(13, 32, 4, 1, PINK[0]);
    P.rect(16, 33, 3, 2, '#ffd84a');
    // Bunting from the top.
    for (const [x, y, col] of [[12, 8, '#ffd84a'], [17, 9, '#9fe3c4'], [10, 11, '#ff8fb8'], [20, 12, '#ffd84a']] as const) {
      P.rect(x, y, 2, 1, col);
      P.px(x, y + 1, col);
    }
  });
}

/** Two tiles of the stone wall with a round opening: it joins the wall east and west. */
export function moonGate(): Sprite {
  return sprite(32, 40, (P) => {
    const cx = 16;
    const cy = 27;
    const r = 10;
    // The stone panel, rounded at its top, coped with tiles.
    for (let y = 4; y < 40; y++) {
      for (let x = 0; x < 32; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const inside = dx * dx + dy * dy < r * r && y < 38;
        if (inside) continue;
        const ring = dx * dx + dy * dy < (r + 2) * (r + 2) && y < 38;
        const joint = y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 3) % 6 === 0;
        P.px(x, y, ring ? (dx + dy < 0 ? C.greyLight : C.grey) : joint ? C.greyDark : x < 2 ? C.greyLight : C.grey);
      }
    }
    for (let y = 0; y < 5; y++) P.rect(y > 2 ? 0 : 2 - y, y, y > 2 ? 32 : 28 + 2 * y, 1, y < 2 ? ROOF_RED[0] : y < 4 ? ROOF_RED[1] : ROOF_RED[3]);
    for (let x = 3; x < 30; x += 4) P.px(x, 2, ROOF_RED[2]);
    P.rect(cx - r, 38, 2 * r + 1, 2, C.greyLight);
    // Wisteria over the top, a rose at the foot.
    for (const [x, len] of [[5, 6], [8, 9], [11, 5], [21, 6], [24, 9], [27, 5]] as const) {
      for (let y = 5; y < 5 + len; y++) P.px(x + (y % 2), y, y % 3 === 0 ? '#d6b8f5' : '#b58ee0');
      P.px(x, 5, C.leafDark);
    }
    P.disc(3, 37, 2, C.leafDark);
    P.px(3, 35, PINK[1]);
    P.px(2, 36, PINK[0]);
  }, true, 0);
}

function rockery(): Sprite {
  return sprite(30, 34, (P) => {
    P.ellipse(15, 28, 13, 5, C.greyDark);
    P.ellipse(15, 27, 13, 4, C.grey);
    P.ellipse(15, 28, 11, 3, C.waterDark);
    P.ellipse(14, 27, 9, 2, C.water);
    // Boulders from the back, each with a crease where it meets the next.
    for (const [x, y, rx, ry] of [[15, 8, 6, 6], [8, 15, 7, 6], [22, 15, 7, 7], [5, 23, 4, 3], [25, 23, 4, 3]] as const) {
      P.ellipse(x, y + 1, rx + 1, ry + 1, '#8e877f');
      P.ellipse(x, y + 1, rx, ry, C.greyDark);
      P.ellipse(x, y, rx, ry - 1, C.grey);
      P.ellipse(x - 2, y - 2, Math.max(1, rx - 3), Math.max(1, ry - 3), C.greyLight);
    }
    for (const [x, y] of [[4, 12], [11, 4], [25, 9], [19, 5], [28, 19], [2, 20]] as const) {
      P.px(x, y, MOSS);
      P.px(x + 1, y, C.leafLight);
      P.px(x, y + 1, C.leaf);
    }
    for (const [x, y] of [[3, 16], [27, 12]] as const) {
      P.line(x, y + 4, x - 2, y, C.leafDark);
      P.line(x, y + 4, x + 2, y + 1, C.leaf);
      P.px(x - 1, y + 1, C.leafLight);
    }
    bloom(P, 9, 10, PINK);
    bloom(P, 23, 8, ['#fff6e0', '#ffffff', '#e3dccd']);
    bloom(P, 27, 20, ['#d6b8f5', '#b58ee0', '#8f6ac2']);
  }, true, 1, (P) => {
    for (let y = 9; y < 26; y++) {
      P.rect(13, y, 4, 1, y % 4 === 0 ? C.waterLight : C.water);
      P.px(13, y, '#d6eefc');
      P.px(16, y, C.waterDark);
    }
    P.rect(11, 25, 8, 1, WATER_MIST);
    P.px(10, 24, '#ffffff');
    P.px(19, 24, '#ffffff');
    P.rect(8, 28, 3, 1, C.waterLight);
  });
}

/** A spoked wheel: a rim one pixel thick, lit on its top left, spokes to a hub. */
function wheel(P: Painter, cx: number, cy: number, r: number, rim: Three, spoke: string, spokes: number): void {
  for (let a = 0; a < spokes; a++) {
    const ang = (a / spokes) * Math.PI * 2 + 0.3;
    P.line(cx, cy, Math.round(cx + Math.cos(ang) * (r - 1)), Math.round(cy + Math.sin(ang) * (r - 1)), spoke);
  }
  for (let y = -r - 1; y <= r + 1; y++) {
    for (let x = -r - 1; x <= r + 1; x++) {
      const dist = Math.sqrt(x * x + y * y);
      if (dist >= r - 0.6 && dist < r + 0.6) P.px(cx + x, cy + y, x + y < -r * 0.5 ? rim[0] : x + y > r * 0.5 ? rim[2] : rim[1]);
    }
  }
  P.disc(cx, cy, 1, rim[1]);
}

function roulotteFace(): Sprite {
  const GREEN: Three = ['#8fd6b8', '#5fae8a', '#3f8a6a'];
  const RED: Tones = ['#f6a98a', '#de7a5c', '#bb5a42', '#9c4634'];
  return sprite(46, 38, (P) => {
    P.line(0, 34, 8, 24, C.woodDark);
    P.line(2, 35, 9, 25, C.wood);
    P.rect(6, 10, 34, 18, GREEN[1]);
    for (let x = 6; x < 40; x += 3) P.rect(x, 10, 1, 18, GREEN[2]);
    P.rect(6, 10, 1, 18, GREEN[0]);
    P.rect(37, 10, 3, 18, GREEN[2]);
    P.rect(6, 26, 34, 2, C.goldDark);
    P.rect(6, 26, 34, 1, C.gold);
    P.rect(4, 28, 38, 2, C.woodDark);
    for (let x = 4; x < 42; x++) {
      const t = (x - 23) / 19;
      const top = 2 + Math.round(t * t * 6);
      P.rect(x, top, 1, 10 - top, x < 10 ? RED[0] : x > 36 ? RED[2] : RED[1]);
      P.px(x, top, RED[0]);
      P.px(x, 9, RED[3]);
    }
    P.rect(4, 9, 38, 1, C.gold);
    P.rect(32, 0, 2, 5, IRON);
    P.rect(31, 0, 4, 1, IRON_LIGHT);
    for (const x of [10, 20]) {
      framedWindow(P, x, 14, 6, 5, { flowers: true, frame: C.gold });
      P.px(x, 14, '#ff8fb8');
      P.px(x + 5, 14, '#ff8fb8');
    }
    plankDoor(P, 30, 12, 6, 14, RED);
    P.rect(30, 30, 6, 1, C.wood);
    P.rect(31, 33, 6, 1, C.wood);
    P.rect(36, 30, 1, 5, C.woodDark);
    wheel(P, 13, 31, 6, ['#f6a98a', '#de7a5c', '#9c4634'], '#f2c94c', 8);
    wheel(P, 34, 32, 5, ['#f6a98a', '#de7a5c', '#9c4634'], '#f2c94c', 8);
  });
}
const roulotteFaceGlows: Glow[] = [{ x: 14, y: 17, r: 12 }, { x: 24, y: 17, r: 12 }];

/** A flower-decked coach: round white body, pink panels, a gold crown, a lantern. */
function carriageFace(): Sprite {
  const WHITE: Three = ['#ffffff', '#f6efe4', '#d8cbb6'];
  return sprite(46, 38, (P) => {
    // Shafts to the front, the gold chassis.
    P.line(0, 36, 9, 27, C.goldDark);
    P.line(1, 36, 10, 28, C.gold);
    P.rect(8, 27, 32, 2, C.goldDark);
    P.rect(8, 27, 32, 1, C.gold);
    // The body: a gold rim, white shell lit on the top left, pink ribs.
    P.ellipse(24, 15, 13, 12, C.goldDark);
    P.ellipse(24, 15, 12, 11, WHITE[1]);
    P.ellipse(22, 12, 8, 7, WHITE[0]);
    for (let y = 5; y < 26; y++) {
      for (const k of [-1, 1]) {
        const dy = (y - 15) / 11;
        const x = 24 + Math.round(k * 8 * Math.sqrt(Math.max(0, 1 - dy * dy)));
        P.px(x, y, PINK[k < 0 ? 0 : 2]);
      }
      P.px(24 + 11, y, WHITE[2]);
    }
    // The window with its curtains, a glow behind.
    P.ellipse(24, 13, 4, 4, C.gold);
    P.ellipse(24, 13, 3, 3, C.glow);
    P.rect(21, 10, 2, 7, PINK[1]);
    P.rect(26, 10, 2, 7, PINK[2]);
    P.px(23, 11, '#fff3c4');
    // A garland of roses round its belt, a crown on top.
    for (let x = 13; x < 36; x += 3) {
      const dy = 0;
      P.px(x, 21 + dy, C.leaf);
      P.rect(x + 1, 20 + dy, 2, 2, PINK[1]);
      P.px(x + 1, 20 + dy, PINK[0]);
    }
    P.rect(21, 2, 7, 2, C.gold);
    P.px(21, 1, C.gold);
    P.px(24, 0, C.gold);
    P.px(27, 1, C.gold);
    P.px(24, 1, '#e0475b');
    P.rect(21, 3, 7, 1, C.goldDark);
    // The lantern at the front.
    P.rect(7, 13, 4, 1, IRON);
    P.rect(5, 10, 3, 4, IRON);
    P.px(6, 11, C.glow);
    P.px(6, 12, C.glow);
    // Wheels: big at the back, small at the front.
    wheel(P, 34, 29, 7, ['#ffffff', '#f2c94c', '#b8862e'], '#d9a339', 10);
    wheel(P, 13, 31, 5, ['#ffffff', '#f2c94c', '#b8862e'], '#d9a339', 8);
  });
}
const carriageFaceGlows: Glow[] = [{ x: 7, y: 12, r: 16 }, { x: 25, y: 14, r: 14 }];

// -----------------------------------------------
// PROFILES: the long pieces turned a quarter, their length running away from the viewer
// -----------------------------------------------

/** A woven wicker panel, lit on its left. */
function weave(P: Painter, x: number, y: number, w: number, h: number): void {
  P.rect(x + 1, y, w - 2, 1, WICKER[1]);
  P.rect(x, y + 1, w, h - 1, WICKER[1]);
  for (let yy = y + 1; yy < y + h; yy++) for (let xx = x + (yy % 2); xx < x + w; xx += 2) P.px(xx, yy, WICKER[0]);
  P.rect(x, y + 1, 1, h - 1, WICKER[0]);
  P.rect(x + w - 1, y + 1, 1, h - 1, WICKER[2]);
}

/** The far chair facing us over the table, the near one showing its woven back. */
function wickerSetProfile(): Sprite {
  return sprite(12, 30, (P) => {
    weave(P, 1, 0, 10, 8);
    P.rect(0, 5, 2, 6, WICKER[2]);
    P.rect(10, 5, 2, 6, WICKER[2]);
    P.rect(2, 7, 8, 3, PINK[1]);
    P.rect(2, 7, 8, 1, PINK[0]);
    P.rect(2, 10, 8, 1, WICKER[2]);
    P.rect(2, 11, 1, 2, WICKER[2]);
    P.rect(9, 11, 1, 2, WICKER[2]);
    // The table and its jug.
    P.rect(5, 16, 2, 4, IRON);
    P.ellipse(6, 15, 4, 2, '#e3dccd');
    P.ellipse(6, 14, 4, 1, C.white);
    P.rect(5, 10, 3, 4, '#fff3a6');
    P.rect(5, 10, 1, 4, '#fffbe0');
    P.rect(5, 9, 3, 1, '#e6f6fb');
    P.px(6, 11, C.leafLight);
    // The near chair, from behind.
    weave(P, 1, 19, 10, 9);
    P.rect(0, 22, 2, 6, WICKER[2]);
    P.rect(10, 22, 2, 6, WICKER[2]);
    P.rect(1, 28, 1, 2, WICKER[2]);
    P.rect(10, 28, 1, 2, WICKER[2]);
  });
}

function sandboxProfile(): Sprite {
  return sprite(14, 30, (P) => {
    P.rect(0, 2, 14, 25, C.wood);
    P.rect(0, 2, 14, 1, C.woodLight);
    P.rect(0, 2, 1, 25, C.woodLight);
    P.rect(12, 2, 2, 25, C.woodDark);
    P.rect(2, 4, 10, 22, '#f2dca0');
    P.rect(2, 4, 10, 1, '#d9bf7f');
    for (const [x, y] of [[4, 12], [8, 22], [3, 19], [9, 14]] as const) {
      P.px(x, y, '#fbeac0');
      P.px(x + 1, y, '#d9bf7f');
    }
    P.rect(0, 26, 14, 4, C.woodDark);
    P.rect(0, 26, 14, 1, C.wood);
    P.rect(6, 27, 1, 3, '#7f5634');
    // The sand castle at the back, its flag; a bucket and a spade at the front.
    P.rect(3, 5, 7, 5, '#e8c983');
    P.rect(3, 5, 1, 5, '#f5dfa8');
    P.rect(8, 5, 2, 5, '#cfae6a');
    for (const x of [3, 5, 7, 9]) P.px(x, 4, '#e8c983');
    P.rect(5, 7, 2, 3, '#b8955a');
    P.line(6, 4, 6, 0, C.woodDark);
    P.rect(7, 0, 2, 2, '#e0475b');
    P.rect(4, 15, 5, 5, '#5b9bd5');
    P.rect(4, 15, 5, 1, '#9cc8ef');
    P.rect(7, 16, 2, 4, '#4a80b8');
    P.line(4, 14, 8, 14, '#4a80b8');
    P.line(10, 24, 11, 18, '#e0475b');
    P.rect(9, 23, 3, 2, '#f2c94c');
  });
}

/** The far pole high and to the left, the near one low and to the right, the string sagging between them. */
const lanternString = (t: number): [number, number] => [Math.round(1 + 13 * t), Math.round(2 + 18 * t + 6 * Math.sin(Math.PI * t))];
/** Along the string, from the far pole: the nearer a lantern, the later it is drawn, over the ones behind. */
const LANTERN_TS = [0.22, 0.5, 0.78];

/** A paper lantern as on the face, hung by its string at (x, y). */
function paperLantern(P: Painter, x: number, y: number, [light, base, dark]: Three): void {
  const top = y + 2;
  P.px(x, top - 1, '#6b4a3a');
  P.rect(x - 1, top, 3, 1, OUTLINE);
  P.ellipse(x, top + 4, 3, 3, base);
  P.rect(x - 2, top + 2, 1, 4, light);
  P.rect(x + 2, top + 2, 1, 4, dark);
  P.rect(x - 3, top + 3, 7, 1, dark);
  P.rect(x - 3, top + 5, 7, 1, dark);
  P.px(x - 1, top + 2, '#ffffff');
  P.rect(x - 1, top + 8, 3, 1, OUTLINE);
  P.px(x, top + 9, base);
}

function paperLanternsProfile(): Sprite {
  return sprite(16, 46, (P) => {
    woodPost(P, 0, 2, 2, 24);
    P.rect(0, 1, 2, 1, C.woodDark);
    for (let i = 0; i <= 40; i++) {
      const [x, y] = lanternString(i / 40);
      P.px(x, y, '#6b4a3a');
    }
    const colours: Three[] = [PINK, ['#fff1a0', '#ffd84a', '#f2b632'], ['#d6b8f5', '#b58ee0', '#8f6ac2']];
    LANTERN_TS.forEach((t, i) => {
      const [x, y] = lanternString(t);
      paperLantern(P, x, y, colours[i % colours.length]);
    });
    woodPost(P, 14, 20, 2, 26);
    P.rect(14, 19, 2, 1, C.woodDark);
  });
}
const paperLanternProfileGlows: Glow[] = LANTERN_TS.map((t) => {
  const [x, y] = lanternString(t);
  return { x: x + 1, y: y + 7, r: 10, tint: '255, 170, 150' };
});

/** Seen from the foot of the chute: the platform and its rail at the back, the chute coming down towards us. */
function slideProfile(): Sprite {
  return sprite(14, 40, (P) => {
    P.rect(0, 8, 2, 16, '#4a80b8');
    P.rect(12, 8, 2, 16, '#4a80b8');
    P.rect(0, 8, 1, 16, '#9cc8ef');
    P.rect(2, 0, 1, 7, '#4a80b8');
    P.rect(11, 0, 1, 7, '#4a80b8');
    P.rect(2, 0, 10, 1, '#5b9bd5');
    P.rect(1, 6, 12, 3, C.wood);
    P.rect(1, 6, 12, 1, C.woodLight);
    for (let y = 9; y < 37; y++) {
      P.px(2, y, '#e0475b');
      P.px(11, y, '#b4353f');
      P.rect(3, y, 8, 1, y % 6 === 0 ? '#e8b93c' : '#f2c94c');
      P.px(4, y, '#fbe38a');
    }
    P.rect(2, 37, 10, 2, '#f2c94c');
    P.rect(2, 37, 10, 1, '#fbe38a');
    P.rect(2, 39, 10, 1, '#d9a339');
    P.rect(5, 22, 4, 1, '#4a80b8');
  });
}

const ROULOTTE_GREEN: Three = ['#8fd6b8', '#5fae8a', '#3f8a6a'];
const ROULOTTE_RED: Tones = ['#f6a98a', '#de7a5c', '#bb5a42', '#9c4634'];

/** Its barrel roof seen from above, the back wall facing us with the door and the steps, the wheels along its sides. */
function roulotteProfile(): Sprite {
  const RED = ROULOTTE_RED;
  const GREEN = ROULOTTE_GREEN;
  return sprite(30, 52, (P) => {
    P.line(12, 0, 12, 6, C.woodDark);
    P.line(17, 0, 17, 6, C.wood);
    for (const y of [11, 36]) {
      P.ellipse(1, y, 1, 6, RED[3]);
      P.ellipse(28, y, 1, 6, RED[3]);
      P.rect(1, y - 5, 1, 4, RED[0]);
    }
    P.rect(2, 4, 26, 31, RED[1]);
    P.rect(2, 4, 5, 31, RED[0]);
    P.rect(22, 4, 6, 31, RED[2]);
    P.rect(2, 4, 26, 1, RED[0]);
    for (let y = 9; y < 34; y += 6) P.rect(2, y, 26, 1, C.gold);
    P.rect(19, 13, 3, 5, IRON);
    P.rect(18, 12, 5, 1, IRON_LIGHT);
    // The back wall, under the eave.
    P.rect(4, 35, 22, 12, GREEN[1]);
    for (let x = 4; x < 26; x += 3) P.rect(x, 35, 1, 12, GREEN[2]);
    P.rect(4, 35, 1, 12, GREEN[0]);
    P.rect(23, 35, 3, 12, GREEN[2]);
    P.rect(2, 34, 26, 2, RED[3]);
    P.rect(4, 45, 22, 2, C.goldDark);
    P.rect(4, 45, 22, 1, C.gold);
    framedWindow(P, 7, 38, 4, 4, { frame: C.gold });
    plankDoor(P, 15, 37, 7, 9, RED);
    P.rect(3, 47, 2, 3, C.woodDark);
    P.rect(25, 47, 2, 3, C.woodDark);
    P.rect(14, 47, 9, 1, C.wood);
    P.rect(14, 49, 9, 1, C.wood);
    P.rect(14, 47, 1, 5, C.woodDark);
    P.rect(22, 47, 1, 5, C.woodDark);
  });
}
const roulotteProfileGlows: Glow[] = [{ x: 10, y: 40, r: 12 }];

/** Seen from behind: the round shell from above, its crown, the back window, the wheels along its sides. */
function carriageProfile(): Sprite {
  const WHITE: Three = ['#ffffff', '#f6efe4', '#d8cbb6'];
  return sprite(30, 50, (P) => {
    // Shafts, to the back; wheels edge on, small at the front, big at the rear.
    P.line(11, 0, 11, 8, C.goldDark);
    P.line(18, 0, 18, 8, C.gold);
    P.ellipse(2, 12, 1, 5, C.goldDark);
    P.ellipse(27, 12, 1, 5, C.goldDark);
    P.ellipse(2, 34, 1, 7, C.goldDark);
    P.ellipse(27, 34, 1, 7, C.goldDark);
    P.rect(2, 28, 1, 4, '#ffffff');
    P.rect(2, 8, 1, 3, '#ffffff');
    // The shell, lit on its top left, its pink ribs running back.
    P.ellipse(15, 24, 12, 17, C.goldDark);
    P.ellipse(15, 24, 11, 16, WHITE[1]);
    P.ellipse(13, 20, 7, 11, WHITE[0]);
    for (let y = 9; y < 40; y++) {
      const dy = (y - 24) / 16;
      const half = Math.round(6 * Math.sqrt(Math.max(0, 1 - dy * dy)));
      P.px(15 - half, y, PINK[0]);
      P.px(15 + half, y, PINK[2]);
      P.px(15 + 10, y, WHITE[2]);
    }
    // The crown on top.
    P.rect(12, 14, 7, 2, C.gold);
    P.px(12, 13, C.gold);
    P.px(15, 12, C.gold);
    P.px(18, 13, C.gold);
    P.px(15, 13, '#e0475b');
    P.rect(12, 15, 7, 1, C.goldDark);
    // The back window and its curtains, a garland of roses round the belt.
    P.ellipse(15, 32, 4, 3, C.gold);
    P.ellipse(15, 32, 3, 2, C.glow);
    P.rect(12, 30, 2, 5, PINK[1]);
    P.rect(17, 30, 2, 5, PINK[2]);
    for (let x = 5; x < 26; x += 3) {
      P.px(x, 37, C.leaf);
      P.rect(x + 1, 36, 2, 2, PINK[1]);
      P.px(x + 1, 36, PINK[0]);
    }
    P.rect(9, 42, 12, 2, C.goldDark);
    P.rect(9, 42, 12, 1, C.gold);
  });
}
const carriageProfileGlows: Glow[] = [{ x: 16, y: 33, r: 14 }];
