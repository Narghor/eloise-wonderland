import type { AnimalId, BoosterId, BreedId, CropId, ItemId, PersonId, PlaceableId, Rarity, SkinId, TreeId } from './data/types';
import { JOIN_CARRIES, JOIN_EAST, JOIN_NORTH, JOIN_NORTH_GATE, JOIN_SOUTH, JOIN_WEST, SKINS } from './data/skins';
import { BRIDGE_TILES, MAP_SIZE, ROAD_COLUMN, isWater } from './data/land';
import { mulberry32 } from '../../random';
import {
  TILE, OUTLINE, canvas, sprite, cached, mapSprite, C, ROOF_RED, ROOF_BLUE, ROOF_BROWN, ROOF_SLATE, DOOR, DOOR_BLUE, TIMBER, TIMBER_LIGHT,
  WARM_STONE, GLINT, tiledRoof, eave, tiledGable, stones, framedWindow, plankDoor, yard, sideAndFrontFence, backFence, planks,
  ROOF_PINK, COOKIE, cookieDisc, IRON, IRON_LIGHT, RIDGES, SKIN, ROSE, ROSE_DARK, ROSE_LIGHT, SPARKLE, WATER_MIST, twinkle, pathTile,
} from './farmPaint';
import type { Sprite, View, FieldStage, Painter, PixelMap } from './farmPaint';
import { LOT2_CROP_PAINT, LOT2_ITEM_MAPS, type Lot2Crop, type Lot2Item } from './farmArtItems';
import { LOT2_CHIMNEYS, lot2Machine } from './farmArtMachines';
import { LOT2_PEN_AREAS, animalArt, breedArt, lot2Pen, type Lot2Pen } from './farmArtAnimals';
import { faceSprite } from './farmArtFaces';
import { GARDEN_SYMMETRIC, gardenDecor, gardenGlows, gardenPath, isGardenDecor, isGardenPath, type GardenDecor, type GardenPath, type Glow } from './farmArtDecor';
export type { Glow } from './farmArtDecor';
export { TILE, OUTLINE, SKIN, sprite, cached, C } from './farmPaint';
export { faceSprite } from './farmArtFaces';
export type { Sprite, View, FieldStage, Painter } from './farmPaint';

// -----------------------------------------------
// THE FARM'S PIXEL ART
// -----------------------------------------------
// Every drawing is made by code on a small canvas, then gets a dark outline. Nothing is drawn at import time:
// each function draws on its first call and keeps the result.
// A sprite canvas has a 1 px margin around its drawing for the outline, except the full-tile pieces
// (fence, hedge, paths) which are exactly one tile wide so that neighbours join.

export type UiIcon =
  | 'nut' | 'star' | 'chest' | 'barn' | 'orders' | 'quests' | 'shop' | 'build' | 'sack' | 'lock' | 'sickle' | 'medal'
  | 'parcel' | 'gift' | 'bridge' | 'zoomIn' | 'zoomOut' | 'back' | 'rotate' | 'store' | 'check' | 'cross' | 'seed' | 'brush';

type ObjectId = Exclude<PlaceableId, 'field' | TreeId>;

// -----------------------------------------------
// FIELDS
// -----------------------------------------------
// Soil on the 14 bottom rows of a 14 x 24 drawing; crops grow above it.

const FIELD_W = 14;
const FIELD_H = 24;
const SOIL_TOP = 10;

export function fieldSprite(crop: CropId | null, stage: FieldStage): Sprite {
  const shown = crop && stage !== 'empty' ? stage : 'empty';
  return cached(`field-${crop ?? 'none'}-${shown}`, () =>
    sprite(FIELD_W, FIELD_H, (P) => {
      P.rect(0, SOIL_TOP, FIELD_W, 14, C.soil);
      for (const y of [13, 17, 21]) {
        P.rect(1, y, 12, 1, C.soilDark);
        P.rect(1, y - 1, 12, 1, C.soilLight);
      }
      if (!crop || shown === 'empty') return;
      if (shown === 'sprout') paintSprouts(P);
      else CROP_PAINT[crop](P, shown === 'ripe');
    }),
  );
}

/** Seedlings in rows: a bright V of two leaves on a short stem, so a sown field reads at a glance. */
function paintSprouts(P: Painter): void {
  for (const yc of RIDGES) for (const xc of [3, 7, 11]) {
    P.foot?.(yc);
    P.px(xc, yc, C.leafDark);
    P.px(xc, yc - 1, C.leaf);
    P.px(xc - 1, yc - 2, C.leafLight);
    P.px(xc, yc - 2, C.leaf);
    P.px(xc + 1, yc - 2, C.leafLight);
    P.px(xc - 1, yc - 3, '#a8e86f');
    P.px(xc + 1, yc - 3, '#a8e86f');
  }
}

/** One tile of tilled soil, no outline: neighbouring fields join into one ploughed patch. */
export function soilTile(): Sprite {
  return cached('soil', () =>
    sprite(TILE, TILE, (P) => {
      P.rect(0, 0, TILE, TILE, C.soil);
      // Furrows on the same rows as the plants' feet (see cropSprite).
      for (const y of [5, 9, 13]) {
        P.rect(0, y, TILE, 1, C.soilDark);
        P.rect(0, y - 1, TILE, 1, C.soilLight);
      }
      for (const [x, y] of [[3, 2], [11, 7], [6, 11], [13, 15], [1, 14]] as const) P.px(x, y, C.soilDark);
      for (const [x, y] of [[9, 2], [2, 7], [14, 11]] as const) P.px(x, y, C.soilLight);
    }, false, 0),
  );
}

/**
 * The plants of a field without their soil, standing on the tile bottom like other sprites (16 x 24 inside,
 * soilTile under them). Frame 1 leans every plant's top one pixel to the right: the wind.
 */
export function cropSprite(crop: CropId, stage: 'sprout' | 'growing' | 'ripe', frame: 0 | 1): Sprite {
  return cached(`crop-${crop}-${stage}-${frame}`, () =>
    sprite(16, FIELD_H, (P) => {
      // Pumpkins lie on the ground and never set a foot: they do not sway.
      const L = leaning(P, 1, frame === 1);
      if (stage === 'sprout') paintSprouts(L);
      else CROP_PAINT[crop](L, stage === 'ripe');
    }),
  );
}

/** A painter shifted `dx` to the right; when `wind`, a plant's pixels 3 rows or more above its foot lean 1 px more. */
function leaning(P: Painter, dx: number, wind: boolean): Painter {
  let foot = Infinity;
  const px = (x: number, y: number, col: string) => {
    const lean = wind && foot !== Infinity && foot - Math.round(y) >= 3 ? 1 : 0;
    P.px(x + dx + lean, y, col);
  };
  const L: Painter = {
    px,
    foot: (y) => (foot = y),
    rect(x, y, w, h, col) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, col);
    },
    ellipse(cx, cy, rx, ry, col) {
      for (let y = -ry; y <= ry; y++) {
        for (let x = -rx; x <= rx; x++) {
          if ((x * x) / ((rx + 0.45) * (rx + 0.45)) + (y * y) / ((ry + 0.45) * (ry + 0.45)) <= 1) px(cx + x, cy + y, col);
        }
      }
    },
    disc: (cx, cy, r, col) => L.ellipse(cx, cy, r, r, col),
    line(x0, y0, x1, y1, col) {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= steps; i++) px(Math.round(x0 + ((x1 - x0) * i) / (steps || 1)), Math.round(y0 + ((y1 - y0) * i) / (steps || 1)), col);
    },
    map(x, y, rows, pal) {
      rows.forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch !== '.' && pal[ch]) px(x + i, y + j, pal[ch]);
      }));
    },
  };
  return L;
}

const CROP_PAINT_LOT1: Record<Exclude<CropId, Lot2Crop>, (P: Painter, ripe: boolean) => void> = {
  wheat(P, ripe) {
    for (const yc of RIDGES) for (const xc of [2, 6, 10]) {
      P.foot?.(yc);
      if (ripe) {
        P.line(xc + 1, yc + 1, xc + 1, yc - 1, C.goldDark);
        P.rect(xc, yc - 5, 1, 4, C.gold);
        P.rect(xc + 2, yc - 5, 1, 4, C.goldDark);
        P.rect(xc + 1, yc - 6, 1, 5, C.goldLight);
        P.px(xc + 1, yc - 7, C.gold);
      } else {
        P.rect(xc + 1, yc - 3, 1, 4, C.leaf);
        P.px(xc, yc - 2, C.leafLight);
        P.px(xc + 2, yc - 1, C.leafDark);
        P.px(xc + 1, yc - 4, C.leafPale);
      }
    }
  },
  corn(P, ripe) {
    for (const yc of RIDGES) for (const xc of [3, 9]) {
      P.foot?.(yc);
      const h = ripe ? 8 : 5;
      P.line(xc, yc + 1, xc, yc + 1 - h, C.leafDark);
      P.px(xc - 1, yc - 2, C.leaf);
      P.px(xc - 2, yc - 1, C.leaf);
      P.px(xc + 1, yc - 3, C.leafLight);
      P.px(xc + 2, yc - 2, C.leafLight);
      if (ripe) {
        P.rect(xc + 1, yc - 6, 1, 3, C.gold);
        P.px(xc + 1, yc - 3, C.goldDark);
        P.px(xc + 1, yc - 7, C.leafLight);
        P.px(xc, yc - 8, C.goldLight);
      }
    }
  },
  carrot(P, ripe) {
    for (const yc of RIDGES) for (const xc of [3, 9]) {
      P.foot?.(yc);
      P.px(xc, yc - 2, C.leafDark);
      P.px(xc - 1, yc - 3, C.leaf);
      P.px(xc + 1, yc - 3, C.leafLight);
      P.px(xc, yc - 4, C.leafLight);
      if (ripe) {
        P.px(xc - 2, yc - 4, C.leaf);
        P.px(xc + 2, yc - 4, C.leafLight);
        P.px(xc, yc - 5, C.leafPale);
        P.rect(xc - 1, yc - 1, 3, 1, '#f08a4b');
        P.px(xc, yc, '#d46a2f');
        P.px(xc - 1, yc - 1, '#ffb27c');
      }
    }
  },
  tomato(P, ripe) {
    for (const yc of [13, 20]) for (const xc of [3, 10]) {
      P.foot?.(yc);
      P.ellipse(xc, yc - 2, 2, 2, C.leaf);
      P.px(xc - 1, yc - 3, C.leafLight);
      P.px(xc + 1, yc - 1, C.leafDark);
      P.px(xc, yc - 5, C.leafDark);
      const fruit = ripe ? C.red : '#a8d46a';
      P.px(xc + 1, yc - 2, fruit);
      P.px(xc - 1, yc - 1, fruit);
      P.px(xc + 2, yc, fruit);
      if (ripe) P.px(xc - 1, yc - 2, '#ff8a96');
    }
  },
  strawberry(P, ripe) {
    for (const yc of RIDGES) for (const xc of [3, 10]) {
      P.foot?.(yc);
      P.ellipse(xc, yc - 1, 2, 1, C.leaf);
      P.px(xc - 1, yc - 2, C.leafLight);
      P.px(xc + 1, yc - 1, C.leafDark);
      if (ripe) {
        P.px(xc - 2, yc, C.red);
        P.px(xc + 2, yc, C.red);
        P.px(xc + 2, yc - 1, '#ff8a96');
        P.px(xc - 2, yc + 1, '#b4353f');
      } else {
        P.px(xc, yc - 2, C.white);
        P.px(xc + 2, yc, '#d8ecb0');
      }
    }
  },
  sunflower(P, ripe) {
    for (const yc of [14, 21]) for (const xc of [3, 10]) {
      P.foot?.(yc);
      P.line(xc, yc, xc, yc - 8, C.leafDark);
      P.px(xc - 1, yc - 3, C.leaf);
      P.px(xc - 2, yc - 4, C.leafLight);
      P.px(xc + 1, yc - 5, C.leafLight);
      P.px(xc + 2, yc - 6, C.leaf);
      if (ripe) {
        P.disc(xc, yc - 10, 2, C.gold);
        P.px(xc, yc - 12, C.goldLight);
        P.px(xc - 2, yc - 10, C.goldLight);
        P.px(xc, yc - 10, '#8a552b');
        P.px(xc + 1, yc - 10, '#b5763f');
        P.px(xc, yc - 9, '#b5763f');
      } else {
        P.disc(xc, yc - 9, 1, C.leafLight);
        P.px(xc, yc - 10, C.leafPale);
      }
    }
  },
  pumpkin(P, ripe) {
    for (const yc of [14, 21]) {
      P.line(0, yc + 1, 13, yc + 1, C.leafDark);
      for (const xc of [3, 10]) {
        P.px(xc - 2, yc - 2, C.leaf);
        P.px(xc + 3, yc - 1, C.leafLight);
        if (ripe) {
          P.ellipse(xc, yc - 1, 3, 2, C.orange);
          P.px(xc - 1, yc - 1, C.orangeDark);
          P.px(xc + 1, yc - 1, C.orangeDark);
          P.px(xc - 2, yc - 2, '#ffb36a');
          P.px(xc, yc - 4, '#6b8a3a');
        } else {
          P.ellipse(xc, yc - 1, 1, 1, '#8fbf5c');
          P.px(xc, yc - 3, C.leafDark);
        }
      }
    }
  },
  cotton(P, ripe) {
    for (const yc of [13, 17, 21]) for (const xc of [3, 10]) {
      P.foot?.(yc);
      P.ellipse(xc, yc - 2, 2, 2, C.leafDark);
      P.px(xc - 1, yc - 3, C.leaf);
      P.px(xc + 1, yc - 2, C.leaf);
      if (ripe) {
        P.disc(xc - 1, yc - 4, 1, '#ffffff');
        P.disc(xc + 1, yc - 3, 1, '#ffffff');
        P.px(xc, yc - 3, '#e3dccd');
        P.px(xc + 2, yc - 5, '#ffffff');
      } else {
        P.px(xc - 1, yc - 4, '#d8ecb0');
        P.px(xc + 1, yc - 3, '#d8ecb0');
      }
    }
  },
};

const CROP_PAINT: Record<CropId, (P: Painter, ripe: boolean) => void> = { ...CROP_PAINT_LOT1, ...LOT2_CROP_PAINT };

// -----------------------------------------------
// MACHINES (2 x 2)
// -----------------------------------------------

/** The mill's stone tower, widening to its foot: clean courses, the right side in shade, a gallery under the sails. */
function millTower(P: Painter, door: boolean): void {
  for (let y = 14; y < 50; y++) {
    const w = Math.round(16 + ((y - 14) * 10) / 36);
    const left = 15 - Math.floor(w / 2);
    P.rect(left, y, w, 1, '#efe7da');
    P.rect(left, y, 2, 1, '#fbf7ef');
    P.rect(left + w - 5, y, 5, 1, '#d9cdb9');
    P.rect(left + w - 2, y, 2, 1, '#c5b79f');
  }
  for (let y = 16; y < 48; y += 4) {
    const w = Math.round(16 + ((y - 14) * 10) / 36);
    const left = 15 - Math.floor(w / 2);
    P.rect(left + 1, y, w - 2, 1, '#d4c7b1');
    for (let x = left + 2 + (Math.floor(y / 4) % 2) * 3; x < left + w - 2; x += 6) P.rect(x, y + 1, 1, 2, '#d4c7b1');
  }
  if (door) {
    plankDoor(P, 12, 38, 6, 12);
    framedWindow(P, 14, 28, 2, 3);
  } else {
    framedWindow(P, 14, 29, 2, 3);
    framedWindow(P, 14, 39, 2, 3);
  }
  // The wooden gallery round the tower.
  P.rect(5, 22, 20, 2, C.wood);
  P.rect(5, 22, 20, 1, C.woodLight);
  P.rect(5, 24, 20, 1, C.woodDark);
  for (let x = 6; x < 25; x += 3) P.rect(x, 19, 1, 3, C.woodDark);
  P.rect(5, 19, 20, 1, C.wood);
  // Stones at the foot, a few flowers.
  stones(P, 5, 47, 20, 3, WARM_STONE);
  for (const [x, col] of [[7, '#ff8fb8'], [9, C.gold], [20, '#ff8fb8'], [22, GLINT]] as const) {
    P.px(x, 46, col);
    P.px(x, 47, C.leaf);
  }
}

function mill(view: View): Sprite {
  return sprite(30, 50, (P) => {
    if (view === 'face') {
      millTower(P, true);
      // The cap in scalloped shingles, the axle hub.
      P.ellipse(15, 12, 9, 5, '#6a3a27');
      P.ellipse(15, 11, 9, 5, '#9a5b3f');
      for (let y = 9; y < 16; y += 3) for (let x = 7 + (y % 2) * 2; x < 24; x += 4) P.rect(x, y, 3, 1, '#7d4630');
      P.ellipse(12, 8, 4, 2, '#c07b55');
      P.rect(6, 15, 19, 2, '#6a3a27');
      P.disc(15, 11, 2, C.woodDark);
      P.px(15, 11, C.wood);
    } else {
      millTower(P, false);
      // The cap seen from the side, its axle sticking out to the left towards the sails.
      P.rect(12, 7, 9, 1, '#c07b55');
      P.rect(9, 8, 16, 6, '#9a5b3f');
      for (let x = 10; x < 24; x += 3) P.rect(x, 10, 2, 1, '#7d4630');
      for (let x = 11; x < 24; x += 3) P.rect(x, 12, 2, 1, '#7d4630');
      P.rect(10, 14, 14, 2, '#6a3a27');
      P.rect(10, 9, 6, 1, '#c07b55');
      P.rect(21, 9, 3, 3, '#6a3a27');
      P.rect(3, 10, 7, 2, C.woodDark);
      P.px(3, 10, C.wood);
    }
  });
}

/** Sails canvases are square-ish with odd sides: their centre pixel is at floor(width / 2), floor(height / 2). */
export function millSails(view: View, frame: 0 | 1): Sprite {
  return cached(`sails-${view}-${frame}`, () => {
    if (view === 'profile') {
      return sprite(5, 29, (P) => {
        const reach = frame === 0 ? 13 : 9;
        P.rect(2, 14 - reach, 1, reach * 2 + 1, C.woodDark);
        for (let i = 3; i <= reach; i++) {
          P.px(1, 14 - i, C.white);
          P.px(3, 14 + i, C.white);
          if (i % 3 === 0) {
            P.px(1, 14 - i, C.wood);
            P.px(3, 14 + i, C.wood);
          }
        }
        P.rect(1, 13, 3, 3, C.woodDark);
      });
    }
    return sprite(29, 29, (P) => {
      const c = 14;
      const blade = (dx: number, dy: number, length: number) => {
        for (let i = 3; i <= length; i++) {
          const x = c + dx * i;
          const y = c + dy * i;
          P.px(x, y, C.woodDark);
          for (let k = 1; k <= 3; k++) P.px(x - dy * k, y + dx * k, i % 3 === 0 || k === 3 ? C.wood : C.white);
        }
      };
      if (frame === 0) {
        blade(0, -1, 13);
        blade(1, 0, 13);
        blade(0, 1, 13);
        blade(-1, 0, 13);
      } else {
        blade(1, -1, 9);
        blade(1, 1, 9);
        blade(-1, 1, 9);
        blade(-1, -1, 9);
      }
      P.disc(c, c, 2, C.woodDark);
      P.px(c, c, C.wood);
    });
  });
}

/** Where the sails' centre goes, in pixels from the mill canvas's top-left (outline margin included). */
export function millHub(view: View): { x: number; y: number } {
  return view === 'face' ? { x: 16, y: 12 } : { x: 4, y: 12 };
}

function bakery(view: View): Sprite {
  const wallShade = '#ecd5b1';
  return sprite(30, 44, (P) => {
    if (view === 'face') {
      // The chimney.
      P.rect(20, 0, 5, 12, C.brick);
      for (const y of [3, 7, 10]) P.rect(20, y, 5, 1, C.brickDark);
      P.rect(20, 1, 1, 11, '#e08a6a');
      P.rect(19, 0, 7, 2, C.brickDark);
      // Plaster in a timber frame, the right bay in shade.
      P.rect(1, 18, 28, 21, C.cream);
      P.rect(22, 20, 6, 19, wallShade);
      P.rect(1, 18, 2, 21, TIMBER);
      P.rect(27, 18, 2, 21, TIMBER);
      P.rect(13, 20, 2, 19, TIMBER);
      P.rect(1, 37, 28, 2, TIMBER);
      P.rect(13, 20, 1, 19, TIMBER_LIGHT);
      tiledRoof(P, 4, 13, 30, ROOF_RED);
      eave(P, 0, 17, 30, ROOF_RED, '#d9bf98');
      // The shop window under its awning, a loaf behind the glass, flowers on the sill.
      for (let x = 15; x < 27; x += 2) P.rect(x, 20, 2, 3, x % 4 === 3 ? C.red : C.white);
      for (let x = 15; x < 27; x += 2) P.px(x + 1, 23, x % 4 === 3 ? C.red : C.white);
      framedWindow(P, 17, 26, 8, 7, { flowers: true });
      P.rect(18, 31, 3, 2, '#e6a85a');
      P.px(19, 31, '#f6d08c');
      plankDoor(P, 5, 23, 6, 15);
      // The footing in warm stone, the doorstep.
      stones(P, 1, 39, 28, 5, WARM_STONE);
      P.rect(3, 39, 10, 2, '#cdb48d');
      P.rect(3, 39, 10, 1, '#e8d8bb');
    } else {
      P.rect(21, 0, 4, 14, C.brick);
      P.rect(21, 4, 4, 1, C.brickDark);
      P.rect(21, 9, 4, 1, C.brickDark);
      P.rect(21, 1, 1, 13, '#e08a6a');
      P.rect(20, 0, 6, 2, C.brickDark);
      P.rect(4, 20, 22, 19, C.cream);
      P.rect(20, 21, 5, 18, wallShade);
      P.rect(4, 20, 2, 19, TIMBER);
      P.rect(24, 20, 2, 19, TIMBER);
      P.rect(4, 37, 22, 2, TIMBER);
      tiledGable(P, 15, 4, 16, 0.75, ROOF_RED, C.cream);
      P.disc(15, 13, 2, C.woodDark);
      P.disc(15, 13, 1, C.glow);
      P.px(14, 12, GLINT);
      eave(P, 3, 19, 24, ROOF_RED, '#d9bf98');
      // A shuttered window with its flowers.
      P.rect(7, 25, 2, 7, '#b4553f');
      P.rect(19, 25, 2, 7, '#b4553f');
      P.px(7, 27, '#9c4634');
      P.px(20, 29, '#9c4634');
      framedWindow(P, 10, 26, 8, 5, { flowers: true });
      stones(P, 4, 39, 22, 5, WARM_STONE);
      // Bread cooling on a small table.
      P.rect(21, 33, 8, 2, C.woodLight);
      P.rect(21, 34, 8, 1, C.wood);
      P.rect(22, 35, 1, 5, C.woodDark);
      P.rect(27, 35, 1, 5, C.woodDark);
      P.rect(22, 31, 3, 2, '#e6a85a');
      P.rect(25, 31, 3, 2, '#c9813f');
      P.px(23, 31, '#f6d08c');
    }
  });
}

/** A small stone chimney three pixels wide, its cap one pixel wider each side; drawn before the roof that hides its foot. */
function stoneStack(P: Painter, x: number, top: number, h: number): void {
  P.rect(x, top, 3, h, C.stoneDark);
  P.rect(x, top, 1, h, C.stone);
  P.rect(x - 1, top - 1, 5, 2, C.greyDark);
}

function dairy(view: View): Sprite {
  const wall = '#fbf7ef';
  const board = '#e6e0d4';
  const shade = '#ece6da';
  const milkCan = (P: Painter, x: number, y: number) => {
    P.rect(x + 1, y, 3, 2, '#aab3bb');
    P.rect(x, y + 2, 5, 7, '#c9d0d6');
    P.rect(x, y + 2, 5, 1, '#eef2f5');
    P.px(x, y + 3, '#eef2f5');
    P.rect(x + 3, y + 3, 2, 6, '#aab3bb');
    P.rect(x, y + 5, 5, 1, '#9aa4ad');
  };
  // White clapboards: a shadow line under each board, the right end in shade.
  const clapboards = (P: Painter, x: number, y: number, w: number, h: number) => {
    P.rect(x, y, w, h, wall);
    P.rect(x + w - 5, y, 5, h, shade);
    for (let by = y + 2; by < y + h; by += 3) P.rect(x, by, w, 1, board);
  };
  return sprite(30, 42, (P) => {
    if (view === 'face') {
      stoneStack(P, 21, 1, 7);
      tiledRoof(P, 6, 12, 30, ROOF_BLUE);
      clapboards(P, 1, 20, 28, 17);
      eave(P, 0, 18, 30, ROOF_BLUE, '#d9d2c4');
      stones(P, 1, 37, 28, 5, WARM_STONE);
      plankDoor(P, 5, 26, 6, 12, DOOR_BLUE);
      P.rect(7, 29, 2, 2, '#cfe6f2');
      // The milk-drop sign over the door.
      P.disc(8, 23, 2, C.white);
      P.px(8, 23, '#6a9fd8');
      P.px(8, 22, '#6a9fd8');
      // The window under a blue and white awning.
      for (let x = 14; x < 26; x += 2) P.rect(x, 21, 2, 3, x % 4 === 2 ? C.blue : C.white);
      for (let x = 14; x < 26; x += 2) P.px(x + 1, 24, x % 4 === 2 ? C.blue : C.white);
      framedWindow(P, 15, 26, 9, 5, { flowers: true, frame: C.blueDark, glass: '#cfe6f2' });
      milkCan(P, 24, 33);
    } else {
      stoneStack(P, 20, 3, 8);
      clapboards(P, 4, 20, 22, 17);
      tiledGable(P, 15, 4, 16, 0.75, ROOF_BLUE, wall);
      P.disc(15, 13, 2, C.blueDark);
      P.disc(15, 13, 1, '#cfe6f2');
      P.px(14, 12, GLINT);
      eave(P, 3, 19, 24, ROOF_BLUE, '#d9d2c4');
      stones(P, 4, 37, 22, 5, WARM_STONE);
      // Blue shutters on each side of the window.
      P.rect(8, 25, 3, 7, C.blue);
      P.rect(19, 25, 3, 7, C.blue);
      for (let y = 26; y < 32; y += 2) {
        P.px(9, y, C.blueDark);
        P.px(20, y, C.blueDark);
      }
      framedWindow(P, 12, 26, 6, 5, { flowers: true, frame: C.blueDark, glass: '#cfe6f2' });
      milkCan(P, 0, 33);
      milkCan(P, 24, 33);
    }
  });
}

function spinning(view: View): Sprite {
  const plaster = '#efdcb6';
  const plasterShade = '#e2cca3';
  const beam = TIMBER;
  return sprite(30, 46, (P) => {
    if (view === 'face') {
      stoneStack(P, 4, 1, 7);
      tiledRoof(P, 6, 14, 30, ROOF_BROWN);
      P.rect(1, 22, 28, 18, plaster);
      P.rect(23, 22, 6, 18, plasterShade);
      P.rect(1, 22, 28, 2, beam);
      P.rect(1, 32, 28, 2, beam);
      P.rect(1, 22, 2, 18, beam);
      P.rect(13, 22, 2, 18, beam);
      P.rect(13, 24, 1, 16, TIMBER_LIGHT);
      P.line(3, 24, 12, 31, beam);
      eave(P, 0, 20, 30, ROOF_BROWN, '#d8c095');
      stones(P, 1, 40, 28, 6, WARM_STONE);
      framedWindow(P, 5, 25, 5, 5, { flowers: true });
      plankDoor(P, 5, 34, 6, 12);
      // The big wooden wheel against the right wall.
      P.disc(21, 34, 8, beam);
      P.disc(21, 34, 7, '#8a5a3b');
      P.disc(21, 34, 6, C.woodLight);
      P.disc(21, 34, 5, plaster);
      P.line(21, 28, 21, 40, C.wood);
      P.line(15, 34, 27, 34, C.wood);
      P.line(17, 30, 25, 38, C.wood);
      P.line(25, 30, 17, 38, C.wood);
      P.disc(21, 34, 1, C.woodDark);
      for (const [x, y] of [[17, 27], [15, 30], [14, 33]] as const) P.px(x, y, C.strawLight);
      for (const [x, y] of [[21, 26], [29, 34], [21, 42], [13, 34]] as const) P.px(x, y, C.woodLight);
    } else {
      stoneStack(P, 19, 3, 8);
      P.rect(3, 22, 24, 18, plaster);
      P.rect(21, 23, 5, 17, plasterShade);
      tiledGable(P, 15, 5, 17, 0.72, ROOF_BROWN, plaster);
      P.rect(14, 10, 2, 12, beam);
      P.rect(14, 10, 1, 12, TIMBER_LIGHT);
      framedWindow(P, 13, 13, 4, 3);
      eave(P, 2, 21, 26, ROOF_BROWN, '#d8c095');
      P.rect(3, 23, 2, 17, beam);
      P.rect(25, 23, 2, 17, beam);
      stones(P, 3, 40, 24, 6, WARM_STONE);
      // The big spool hanging over the door.
      P.rect(8, 26, 14, 2, C.woodDark);
      P.rect(8, 26, 14, 1, C.wood);
      P.rect(9, 28, 12, 9, '#e8789e');
      for (let y = 29; y < 37; y += 2) P.rect(9, y, 12, 1, '#f7a1c4');
      P.rect(9, 28, 2, 9, '#ffc0d6');
      P.rect(18, 28, 3, 9, '#c95a82');
      P.rect(8, 37, 14, 2, C.woodDark);
      P.rect(14, 24, 2, 2, C.woodDark);
      plankDoor(P, 12, 39, 6, 7);
    }
  });
}

function cookiery(view: View): Sprite {
  const wall = '#fbeee0';
  const wallShade = '#f0dcc8';
  const trim = '#8a5236';
  return sprite(30, 44, (P) => {
    if (view === 'face') {
      // The oven's chimney on the left.
      P.rect(4, 0, 5, 12, C.brick);
      for (const y of [3, 7, 10]) P.rect(4, y, 5, 1, C.brickDark);
      P.rect(4, 1, 1, 11, '#e08a6a');
      P.rect(3, 0, 7, 2, C.brickDark);
      tiledRoof(P, 4, 13, 30, ROOF_PINK);
      // The shop's big cookie, set in the roof.
      cookieDisc(P, 15, 10, 5);
      P.rect(1, 18, 28, 21, wall);
      P.rect(22, 20, 6, 19, wallShade);
      P.rect(1, 18, 2, 21, trim);
      P.rect(27, 18, 2, 21, trim);
      eave(P, 0, 17, 30, ROOF_PINK, '#e6cdb6');
      // Two windows under pink and white awnings, a tray of cookies behind the right one.
      for (const left of [3, 20]) {
        for (let x = left; x < left + 7; x += 2) P.rect(x, 20, 2, 3, (x - left) % 4 === 0 ? ROOF_PINK[1] : C.white);
        for (let x = left; x < left + 7; x += 2) P.px(x + 1, 23, (x - left) % 4 === 0 ? ROOF_PINK[1] : C.white);
        framedWindow(P, left + 1, 26, 5, 5, { flowers: true, frame: trim });
      }
      P.rect(22, 29, 3, 1, COOKIE.dark);
      P.px(22, 28, COOKIE.base);
      P.px(24, 28, COOKIE.base);
      plankDoor(P, 12, 24, 6, 14, DOOR);
      stones(P, 1, 39, 28, 5, WARM_STONE);
      P.rect(10, 39, 10, 2, '#cdb48d');
      P.rect(10, 39, 10, 1, '#e8d8bb');
    } else {
      P.rect(21, 0, 4, 14, C.brick);
      P.rect(21, 4, 4, 1, C.brickDark);
      P.rect(21, 9, 4, 1, C.brickDark);
      P.rect(21, 1, 1, 13, '#e08a6a');
      P.rect(20, 0, 6, 2, C.brickDark);
      P.rect(4, 20, 22, 19, wall);
      P.rect(20, 21, 5, 18, wallShade);
      P.rect(4, 20, 2, 19, trim);
      P.rect(24, 20, 2, 19, trim);
      tiledGable(P, 15, 4, 16, 0.75, ROOF_PINK, wall);
      cookieDisc(P, 15, 13, 3);
      eave(P, 3, 19, 24, ROOF_PINK, '#e6cdb6');
      // A window between pink shutters.
      P.rect(7, 25, 2, 7, ROOF_PINK[2]);
      P.rect(19, 25, 2, 7, ROOF_PINK[2]);
      P.px(7, 27, ROOF_PINK[3]);
      P.px(20, 29, ROOF_PINK[3]);
      framedWindow(P, 10, 26, 8, 5, { flowers: true, frame: trim });
      stones(P, 4, 39, 22, 5, WARM_STONE);
      // The shop sign: a cookie hanging from an iron arm at the corner.
      P.rect(23, 23, 6, 1, IRON);
      P.px(23, 24, IRON);
      P.px(26, 24, IRON_LIGHT);
      cookieDisc(P, 26, 28, 3);
    }
  });
}

/** Top of each chimney, in sprite pixels (margin included): where the scene lets smoke rise. */
const CHIMNEYS: Partial<Record<PlaceableId, Partial<Record<View, { x: number; y: number }>>>> = {
  bakery: { face: { x: 23, y: 0 }, profile: { x: 24, y: 0 } },
  cookiery: { face: { x: 7, y: 0 }, profile: { x: 24, y: 0 } },
  spinning: { face: { x: 6, y: 1 }, profile: { x: 21, y: 3 } },
  dairy: { face: { x: 23, y: 1 }, profile: { x: 22, y: 3 } },
};

export function chimneyOf(id: PlaceableId, view: View): { x: number; y: number } | null {
  return (CHIMNEYS[id] ?? LOT2_CHIMNEYS[id as keyof typeof LOT2_CHIMNEYS])?.[view] ?? null;
}

// -----------------------------------------------
// PENS (3 x 3)
// -----------------------------------------------

function coop(view: View): Sprite {
  return sprite(46, 58, (P) => {
    yard(P, 12, C.straw, C.strawDark, C.strawLight, 4);
    backFence(P, 9);
    if (view === 'face') {
      planks(P, 3, 12, 22, 18);
      // A pitched roof in tile courses, the right side in shade.
      for (let i = 0; i <= 10; i++) {
        const half = Math.round(i * 1.35);
        const row = i < 2 ? ROOF_RED[0] : i % 3 === 2 ? ROOF_RED[2] : ROOF_RED[1];
        P.rect(14 - half, i, half * 2, 1, row);
        if (half > 1) P.rect(14 + half - 2, i, 2, 1, ROOF_RED[2]);
        if (half > 0) P.px(14 - half, i, ROOF_RED[0]);
      }
      eave(P, 0, 11, 28, ROOF_RED, '#a8743f');
      plankDoor(P, 11, 20, 6, 10);
      P.disc(20, 16, 2, C.woodDark);
      P.disc(20, 16, 1, C.glow);
      // The ramp up to the door.
      P.line(17, 26, 23, 30, C.woodLight);
      P.line(17, 27, 23, 31, C.woodDark);
      // A feeder of golden grain.
      P.rect(30, 40, 12, 4, C.woodDark);
      P.rect(30, 40, 12, 1, C.wood);
      P.rect(31, 40, 10, 1, C.gold);
      P.px(33, 40, C.goldLight);
      P.px(38, 40, C.goldLight);
    } else {
      planks(P, 23, 14, 20, 16);
      tiledGable(P, 33, 2, 12, 0.95, ROOF_RED, C.wood);
      P.disc(33, 9, 2, C.woodDark);
      P.disc(33, 9, 1, C.glow);
      eave(P, 21, 13, 24, ROOF_RED, '#a8743f');
      plankDoor(P, 30, 21, 6, 9);
      P.line(29, 29, 23, 33, C.woodLight);
      P.line(29, 30, 23, 34, C.woodDark);
      P.rect(4, 40, 12, 4, C.woodDark);
      P.rect(4, 40, 12, 1, C.wood);
      P.rect(5, 40, 10, 1, C.gold);
      P.rect(36, 40, 6, 3, C.greyDark);
      P.rect(37, 40, 4, 1, C.water);
      P.px(38, 40, C.waterLight);
    }
    sideAndFrontFence(P, 16, 58);
  });
}

function cowshed(view: View): Sprite {
  const red = '#c9483f';
  const redDark = '#a5372f';
  const redLight = '#e06a5f';
  const redShade = '#b33f37';
  const roof = ROOF_SLATE;
  return sprite(46, 60, (P) => {
    yard(P, 24, '#e3cf8f', '#d1ba73', '#f0e1ab', 9);
    // Hay showing through a loft door.
    const hay = (x: number, y: number, w: number, h: number) => {
      P.rect(x, y, w, h, '#e9c45a');
      for (let hx = x; hx < x + w; hx += 2) P.px(hx, y, '#f5dc8a');
      P.rect(x, y + h - 1, w, 1, '#c9a23a');
    };
    if (view === 'face') {
      // The barn's gable end: a gambrel roof framing a red plank wall, white-crossed doors.
      const halves = [8, 10, 12, 14, 16, 17, 18, 19, 19, 20, 20, 21];
      for (let y = 0; y < 32; y++) {
        const half = y < halves.length ? halves[y] : 18;
        P.rect(23 - half, y, half * 2, 1, red);
        P.rect(23 + half - 6, y, 6, 1, redShade);
        if (y < halves.length) {
          P.rect(23 - half, y, 2, 1, y < 3 ? roof[0] : roof[1]);
          P.px(23 - half, y, roof[0]);
          P.rect(23 + half - 2, y, 2, 1, y < 3 ? roof[1] : roof[2]);
          P.px(23 + half - 1, y, roof[3]);
        }
      }
      P.rect(15, 0, 16, 2, roof[0]);
      P.rect(15, 1, 16, 1, roof[1]);
      P.rect(3, 12, 40, 1, roof[2]);
      for (let x = 7; x < 40; x += 3) P.rect(x, 13, 1, 19, redDark);
      P.rect(5, 13, 1, 19, redLight);
      P.rect(5, 30, 36, 2, redDark);
      // The hayloft, hay showing, a lamp under it.
      P.rect(18, 3, 10, 8, C.white);
      hay(19, 4, 8, 6);
      P.px(23, 12, '#5b4a48');
      P.rect(22, 13, 3, 2, C.glow);
      // The big doors.
      P.rect(14, 17, 18, 15, redDark);
      P.rect(14, 17, 18, 1, C.white);
      P.rect(14, 17, 1, 15, C.white);
      P.rect(31, 17, 1, 15, C.white);
      P.rect(22, 17, 2, 15, C.white);
      P.line(15, 18, 21, 31, C.white);
      P.line(21, 18, 15, 31, C.white);
      P.line(24, 18, 30, 31, C.white);
      P.line(30, 18, 24, 31, C.white);
      P.px(21, 25, C.gold);
      P.px(24, 25, C.gold);
    } else {
      for (let i = 0; i < 12; i++) {
        const inset = Math.max(0, 8 - i);
        P.rect(1 + inset, 2 + i, 44 - 2 * inset, 1, i < 2 ? roof[0] : roof[1]);
        if (i % 3 === 2) for (let x = 1 + inset + (Math.floor(i / 3) % 2) * 2; x < 45 - inset; x += 4) P.rect(x, 2 + i, 3, 1, roof[2]);
        P.rect(45 - inset - 3, 2 + i, 3, 1, roof[2]);
        P.px(1 + inset, 2 + i, roof[0]);
      }
      P.rect(3, 14, 40, 18, red);
      P.rect(37, 14, 6, 18, redShade);
      for (let x = 5; x < 43; x += 3) P.rect(x, 15, 1, 17, redDark);
      P.rect(3, 15, 1, 17, redLight);
      eave(P, 2, 13, 42, roof, redDark);
      P.rect(3, 30, 40, 2, redDark);
      for (const x of [7, 15]) {
        P.rect(x - 1, 17, 7, 6, C.white);
        hay(x, 18, 5, 4);
      }
      P.rect(28, 19, 9, 13, redDark);
      P.rect(28, 19, 9, 1, C.white);
      P.rect(28, 19, 1, 13, C.white);
      P.rect(36, 19, 1, 13, C.white);
      P.line(29, 20, 35, 31, C.white);
      P.line(35, 20, 29, 31, C.white);
      P.px(26, 21, '#5b4a48');
      P.rect(25, 22, 2, 2, C.glow);
    }
    // A hay bale and a water trough in the yard.
    P.rect(4, 40, 9, 6, '#e9c45a');
    P.rect(4, 40, 9, 1, '#f5dc8a');
    P.rect(4, 42, 9, 1, '#c9a23a');
    P.rect(7, 40, 1, 6, '#c9a23a');
    P.rect(11, 41, 2, 5, '#d6b048');
    P.rect(32, 42, 10, 4, C.woodDark);
    P.rect(32, 42, 10, 1, C.wood);
    P.rect(33, 43, 8, 1, C.water);
    P.px(35, 43, C.waterLight);
    sideAndFrontFence(P, 24, 60);
  });
}

// -----------------------------------------------
// TREES
// -----------------------------------------------

function roundTree(P: Painter, fruit: string | null, fruitLight: string, seed: number, leaves = [C.leafDark, C.leaf, C.leafLight]): void {
  P.rect(13, 30, 4, 12, C.bark);
  P.rect(16, 30, 1, 12, C.barkDark);
  P.px(12, 41, C.bark);
  P.px(17, 41, C.barkDark);
  P.disc(15, 17, 12, leaves[0]);
  P.disc(8, 22, 7, leaves[0]);
  P.disc(22, 22, 7, leaves[0]);
  P.disc(14, 15, 9, leaves[1]);
  P.disc(9, 20, 5, leaves[1]);
  P.disc(21, 20, 5, leaves[1]);
  P.disc(12, 11, 4, leaves[2]);
  P.disc(19, 13, 3, leaves[2]);
  P.px(10, 9, C.leafPale);
  P.px(11, 8, C.leafPale);
  if (fruit) {
    const r = mulberry32(seed);
    for (let i = 0; i < 8; i++) {
      const x = 5 + Math.floor(r() * 19);
      const y = 11 + Math.floor(r() * 15);
      P.rect(x, y, 2, 2, fruit);
      P.px(x, y, fruitLight);
    }
  }
}

/** A tree that gives: hazelnuts, apples, cherries, shown on its branches when ready. */
export function treeSprite(id: TreeId, ready: boolean): Sprite {
  return cached(`tree-${id}-${ready}`, () =>
    sprite(30, 42, (P) => {
      if (id === 'hazel') roundTree(P, ready ? '#b5763f' : null, '#e0a46a', 9);
      else if (id === 'apple') roundTree(P, ready ? C.red : null, '#ff8a96', 21);
      else roundTree(P, ready ? '#a3203a' : null, '#e8506a', 33, ['#3f7d3a', '#4f9a44', '#6fb85a']);
    }),
  );
}

export function wildTreeSprite(seed: number): Sprite {
  const variant = ((seed % 3) + 3) % 3;
  return cached(`wild-${variant}`, () =>
    sprite(30, 42, (P) => {
      if (variant === 0) {
        roundTree(P, null, '', 0, ['#3f7a35', '#4f9442', '#68b04f']);
      } else if (variant === 1) {
        P.rect(14, 34, 3, 8, C.bark);
        for (let tier = 0; tier < 4; tier++) {
          const top = 2 + tier * 8;
          for (let i = 0; i < 12; i++) {
            const half = 3 + Math.round(i * (0.6 + tier * 0.12));
            P.rect(15 - half, top + i, half * 2 + 1, 1, i < 3 ? '#4f9442' : '#3a6f3a');
            P.px(15 - half, top + i, '#2f5c30');
          }
        }
        P.px(15, 2, '#68b04f');
        P.px(12, 13, '#68b04f');
        P.px(17, 22, '#68b04f');
      } else {
        P.rect(14, 26, 3, 16, '#f1ece4');
        P.px(14, 30, '#4a3a3a');
        P.px(16, 35, '#4a3a3a');
        P.px(15, 39, '#4a3a3a');
        P.disc(15, 15, 11, '#6aa84f');
        P.disc(9, 20, 6, '#6aa84f');
        P.disc(21, 19, 6, '#6aa84f');
        P.disc(14, 12, 7, '#8cc760');
        P.disc(20, 14, 4, '#8cc760');
        P.disc(11, 9, 3, '#b3dd86');
      }
    }),
  );
}

// -----------------------------------------------
// DECORATIONS
// -----------------------------------------------

// -----------------------------------------------
// FENCES: three skins, each piece drawn from the sides it joins (farmJoins.ts)
// -----------------------------------------------
// A piece is one tile wide and 8 px taller than its tile, without margin: rails reach the tile's edges to meet the
// neighbour's, and a northern neighbour gets a rail climbing to its post. A post stands where the run turns or
// ends (and on every tile for the ranch).

const FENCE_H = TILE + 8;
const ACROSS = JOIN_EAST | JOIN_WEST;
const ALONG = JOIN_NORTH | JOIN_SOUTH;

/** Where a rail climbing to the northern neighbour starts: its post, or the foot of a gate, which comes lower. */
const CLIMB_TO_POST = 0;
const CLIMB_TO_GATE = 7;

/** One piece of fence: `mask` holds the sides it joins (data/skins.ts), `gate` draws the gate instead. */
export function fenceSprite(skin: SkinId, mask: number, gate: boolean): Sprite {
  // A piece that carries something is never a plain straight run: it falls through to the shape with a post.
  const sides = mask & (ACROSS | ALONG | JOIN_CARRIES);
  const climb = (mask & JOIN_NORTH) === 0 ? null : (mask & JOIN_NORTH_GATE) !== 0 ? CLIMB_TO_GATE : CLIMB_TO_POST;
  return cached(`fence-${skin}-${mask}-${gate ? 'gate' : 'piece'}`, () => sprite(TILE, FENCE_H, (P) => FENCE_ART[skin](P, sides, gate, climb), true, 0));
}

/** A gate in a north-south run is seen edge on. */
function runsAlong(mask: number): boolean {
  return (mask & ALONG) !== 0 && (mask & ACROSS) === 0;
}

/**
 * That edge-on gate, wider than the run so it reads as a way through: a slatted panel with its latch, between the
 * skin's far post (its foot at the tile's top) and a near one on the tile's foot, both short to leave the panel seen.
 */
function sideGate(P: Painter, panel: [string, string, string], post: (P: Painter, top: number, height: number) => void): void {
  post(P, 1, 7);
  P.rect(5, 6, 6, 14, panel[1]);
  P.rect(5, 6, 6, 1, panel[0]);
  for (let y = 9; y < 20; y += 3) P.rect(5, y, 6, 1, panel[2]);
  P.px(9, 12, C.gold);
  P.px(9, 13, C.goldDark);
  post(P, 17, 6);
}

function ranchPost(P: Painter, top: number, height: number): void {
  P.rect(6, top, 4, height, C.woodLight);
  P.rect(8, top + 1, 2, height - 1, C.wood);
  P.rect(9, top + 1, 1, height - 1, C.woodDark);
  P.rect(6, top, 4, 1, C.strawLight);
}

function picketPost(P: Painter, top: number, height: number): void {
  P.rect(5, top + 1, 6, height - 1, PICKET);
  P.rect(9, top + 2, 2, height - 2, PICKET_SHADE);
  P.rect(6, top, 4, 1, PICKET);
  P.rect(7, top - 1, 2, 1, PICKET);
}

function logPost(P: Painter, top: number, height: number): void {
  P.rect(5, top + 1, 6, height - 1, C.bark);
  P.rect(9, top + 2, 2, height - 2, C.barkDark);
  P.ellipse(7, top + 1, 2, 1, '#e6b884');
}

function ranchFence(P: Painter, mask: number, gate: boolean, climb: number | null): void {
  if (climb !== null) {
    P.rect(7, climb, 2, 13 - climb, C.woodLight);
    P.rect(8, climb, 1, 13 - climb, C.wood);
  }
  if (gate && runsAlong(mask)) return sideGate(P, [C.woodLight, C.wood, C.woodDark], ranchPost);
  if (gate) {
    for (const x of [0, 13]) {
      P.rect(x, 8, 3, 15, C.woodLight);
      P.rect(x + 2, 9, 1, 14, C.wood);
      P.rect(x, 8, 3, 1, C.strawLight);
    }
    P.rect(3, 10, 10, 11, C.woodDark);
    for (let x = 3; x < 13; x += 2) {
      P.rect(x, 10, 2, 11, C.woodLight);
      P.px(x + 1, 10, C.wood);
    }
    P.rect(3, 12, 10, 1, C.wood);
    P.rect(3, 18, 10, 1, C.wood);
    P.line(4, 18, 11, 12, C.woodDark);
    P.px(11, 15, C.gold);
    return;
  }
  const rails = (x: number, w: number) => {
    for (const y of [11, 16]) {
      P.rect(x, y, w, 2, C.wood);
      P.rect(x, y, w, 1, C.woodLight);
      P.rect(x, y + 1, w, 1, C.woodDark);
    }
  };
  if (mask & JOIN_WEST) rails(0, 7);
  if (mask & JOIN_EAST) rails(9, 7);
  P.rect(6, 9, 4, 14, C.woodLight);
  P.rect(8, 10, 2, 13, C.wood);
  P.rect(9, 10, 1, 13, C.woodDark);
  P.rect(6, 9, 4, 1, C.strawLight);
}

const PICKET = '#fbf3e4';
const PICKET_SHADE = '#e6d6be';
const PICKET_DARK = '#c9b59a';

function picketFence(P: Painter, mask: number, gate: boolean, climb: number | null): void {
  // A north-south run seen from above: picket tips one behind the other.
  const column = (y0: number, y1: number) => {
    for (let y = y0; y < y1; y += 4) {
      P.rect(6, y + 1, 4, 3, PICKET);
      P.rect(7, y, 2, 1, PICKET);
      P.rect(9, y + 1, 1, 3, PICKET_SHADE);
      P.rect(6, y + 3, 4, 1, PICKET_DARK);
    }
  };
  if (climb !== null) column(climb, 12);
  if (gate && runsAlong(mask)) return sideGate(P, [PICKET, PICKET_SHADE, PICKET_DARK], picketPost);
  if (gate) {
    for (const x of [0, 13]) {
      P.rect(x, 9, 3, 14, PICKET);
      P.rect(x + 2, 10, 1, 13, PICKET_SHADE);
      P.rect(x, 6, 3, 3, PICKET);
      P.px(x + 1, 5, PICKET);
      P.rect(x, 9, 3, 1, PICKET_SHADE);
    }
    P.rect(3, 11, 10, 11, PICKET_SHADE);
    for (let x = 3; x < 13; x += 3) {
      P.rect(x, 11, 2, 11, PICKET);
      P.px(x, 10, PICKET);
    }
    P.rect(3, 13, 10, 1, PICKET_DARK);
    P.rect(3, 19, 10, 1, PICKET_DARK);
    P.line(4, 19, 11, 13, PICKET_DARK);
    P.px(11, 16, C.goldDark);
    return;
  }
  const pickets = (x0: number, x1: number) => {
    P.rect(x0, 14, x1 - x0, 2, PICKET_DARK);
    P.rect(x0, 19, x1 - x0, 2, PICKET_DARK);
    for (let x = x0; x < x1; x += 4) {
      P.rect(x + 1, 10, 2, 12, PICKET);
      P.px(x + 2, 10, PICKET_SHADE);
      P.rect(x + 2, 11, 1, 11, PICKET_SHADE);
      P.px(x + 1, 9, PICKET);
    }
  };
  if (mask & JOIN_WEST) pickets(0, 8);
  if (mask & JOIN_EAST) pickets(8, 16);
  if (mask === ACROSS) return;
  if (mask === ALONG) return column(12, 24);
  // A post with a knob where the run turns or ends.
  P.rect(5, 9, 6, 14, PICKET);
  P.rect(9, 10, 2, 13, PICKET_SHADE);
  P.rect(5, 9, 6, 1, PICKET_SHADE);
  P.rect(6, 6, 4, 3, PICKET);
  P.rect(7, 5, 2, 1, PICKET);
  P.px(9, 7, PICKET_SHADE);
}

const WATTLE = '#a8774a';
const WATTLE_LIGHT = '#c99a66';
const WATTLE_DARK = '#7f5634';

function wattleFence(P: Painter, mask: number, gate: boolean, climb: number | null): void {
  // A north-south run seen from above: the woven strands, and the stakes poking out on both sides.
  const weaveAlong = (y0: number, y1: number) => {
    P.rect(6, y0, 4, y1 - y0, WATTLE);
    for (let y = y0; y < y1; y += 2) P.rect(y % 4 === 0 ? 6 : 8, y, 2, 1, WATTLE_LIGHT);
    for (let y = y0 + 1; y < y1; y += 4) {
      P.px(5, y, WATTLE_DARK);
      P.px(10, y, WATTLE_DARK);
    }
  };
  if (climb !== null) weaveAlong(climb, 14);
  if (gate && runsAlong(mask)) return sideGate(P, ['#e6c391', '#d9b07a', '#c4955f'], logPost);
  if (gate) {
    for (const x of [1, 12]) {
      P.rect(x, 6, 3, 17, C.bark);
      P.rect(x + 2, 8, 1, 15, C.barkDark);
      P.ellipse(x + 1, 6, 1, 1, '#e6b884');
    }
    P.rect(4, 11, 8, 10, '#d9b07a');
    for (let x = 4; x < 12; x += 2) P.rect(x, 11, 1, 10, '#c4955f');
    P.rect(4, 13, 8, 1, WATTLE_DARK);
    P.rect(4, 18, 8, 1, WATTLE_DARK);
    return;
  }
  const weaveAcross = (x0: number, x1: number) => {
    P.rect(x0, 11, x1 - x0, 10, WATTLE);
    for (let y = 11; y < 21; y += 2) {
      for (let x = x0; x < x1; x++) P.px(x, y, (x + (y >> 1) * 3) % 6 < 3 ? WATTLE_LIGHT : WATTLE);
    }
    for (let x = x0; x < x1; x++) P.px(x, 20, WATTLE_DARK);
    // The stakes the branches are woven around, their tips above the weave.
    for (let x = x0 + 2; x < x1; x += 4) {
      P.rect(x, 9, 1, 12, WATTLE_DARK);
      P.px(x, 8, WATTLE_LIGHT);
    }
  };
  if (mask & JOIN_WEST) weaveAcross(0, 8);
  if (mask & JOIN_EAST) weaveAcross(8, 16);
  if (mask === ACROSS) return;
  if (mask === ALONG) return weaveAlong(11, 21);
  // A round log where the run turns or ends.
  P.rect(5, 8, 6, 15, C.bark);
  P.rect(9, 9, 2, 14, C.barkDark);
  P.ellipse(7, 8, 2, 1, '#e6b884');
  P.px(7, 8, C.wood);
}

const FENCE_ART: Record<SkinId, (P: Painter, sides: number, gate: boolean, climb: number | null) => void> = {
  fenceRanch: ranchFence,
  fencePicket: picketFence,
  fenceWattle: wattleFence,
};

// -----------------------------------------------
// HEDGES AND PATHS: pieces that join, like the fences
// -----------------------------------------------

/** A piece that joins its neighbours (farmJoins.ts), drawn from the sides it joins. */
export function joinedSprite(type: PlaceableId, skin: SkinId | null, mask: number): Sprite {
  if (type === 'hedge') return hedgeSprite(mask);
  if (type === 'pathDirt' || type === 'pathStone') return pathSprite(type === 'pathStone', mask);
  if (isGardenPath(type)) {
    const sides = mask & (ACROSS | ALONG);
    return cached(`path-${type}-${sides}`, () => gardenPath(type, sides));
  }
  return fenceSprite(skin ?? 'fenceRanch', mask, type === 'fenceGate');
}

const HEDGE_SHADE = '#3d7a33';

/**
 * One tile of hedge, as tall as a fence piece: its leafy top runs on into the neighbours; the front face shows only
 * where the hedge ends southwards; free ends are rounded.
 */
function hedgeSprite(mask: number): Sprite {
  const sides = mask & (ACROSS | ALONG);
  return cached(`hedge-${sides}`, () => sprite(TILE, FENCE_H, (P) => {
    const n = (sides & JOIN_NORTH) !== 0;
    const e = (sides & JOIN_EAST) !== 0;
    const s = (sides & JOIN_SOUTH) !== 0;
    const w = (sides & JOIN_WEST) !== 0;
    const top = n ? 0 : 6;
    const face = 13;
    const bottom = s ? FENCE_H : FENCE_H - 1;
    for (let y = top; y < bottom; y++) {
      const round = (!n && y === top) || (!s && y === bottom - 1);
      const left = w ? 0 : round ? 2 : 1;
      const right = e ? TILE : round ? TILE - 2 : TILE - 1;
      const onTop = s || y < face;
      P.rect(left, y, right - left, 1, onTop ? C.leaf : y >= bottom - 2 ? HEDGE_SHADE : C.leafDark);
    }
    // Leaf clumps on the top: a lit leaf and its shadow under it, row after row.
    for (let y = top + 1; y < (s ? bottom - 1 : face - 1); y += 2) {
      for (let x = 1 + (Math.floor(y / 2) % 2) * 2; x < TILE - 1; x += 4) {
        P.px(x, y, C.leafLight);
        P.px(x + 1, y + 1, C.leafDark);
      }
    }
    // The face in rounded clumps, lit on top.
    if (!s) {
      for (const y of [face + 1, face + 4, face + 7]) {
        for (let x = (y % 2) * 2; x < TILE; x += 4) {
          P.rect(x, y, 3, 1, C.leaf);
          P.px(x + 1, y - 1, C.leafLight);
        }
      }
    }
    // A few white flowers, always at the same spots so that a long hedge does not flicker.
    P.px(5, top + 2, C.white);
    P.px(11, s ? top + 9 : face + 3, C.white);
    // Bumps along an open top edge.
    if (!n) for (let x = w ? 0 : 2; x < (e ? TILE : TILE - 2); x += 4) P.rect(x, top - 1, 2, 1, C.leaf);
  }, true, 0));
}

/** One tile of path: worn edges and rounded corners wherever no path of the same kind goes on. */
function pathSprite(stone: boolean, mask: number): Sprite {
  const sides = mask & (ACROSS | ALONG);
  const look = stone ? { base: '#d8c4a0', edge: '#c3aa82', rim: '#a88d66' } : { base: '#c99a66', edge: '#b5854f', rim: '#9c7044' };
  return cached(`path-${stone ? 'stone' : 'dirt'}-${sides}`, () => pathTile(sides, look, (P, clip, inside) => {
    const r = mulberry32(stone ? 31 : 37);
    if (stone) {
      for (const [x, y, w, h] of [[1, 1, 6, 5], [8, 0, 7, 6], [0, 8, 5, 6], [6, 7, 5, 5], [12, 8, 4, 6], [6, 13, 6, 3]]) {
        clip(x, y + 1, w, h, '#c9b391');
        clip(x, y, w, h, '#e6d6b6');
        clip(x + 1, y, w - 2, 1, '#f3e8d2');
      }
    } else {
      for (let i = 0; i < 26; i++) {
        const x = Math.floor(r() * TILE);
        const y = Math.floor(r() * TILE);
        if (inside(x, y)) P.px(x, y, r() < 0.5 ? '#b5854f' : '#dcb07a');
      }
      for (let i = 0; i < 4; i++) {
        const x = Math.floor(r() * 14);
        const y = Math.floor(r() * 14);
        if (!inside(x, y) || !inside(x + 1, y + 1)) continue;
        P.rect(x, y, 2, 1, '#e6dccb');
        P.px(x, y + 1, '#a9906e');
      }
    }
  }));
}

const FLOWER_COLORS: Record<'flowersPink' | 'flowersYellow' | 'flowersWhite', [string, string, string]> = {
  flowersPink: ['#ff8fb8', '#ffc0d6', '#e8789e'],
  flowersYellow: ['#ffd84a', '#fff1a0', '#f2b632'],
  flowersWhite: ['#fff6e0', '#ffffff', '#e3dccd'],
};

function flowerBed(id: keyof typeof FLOWER_COLORS): Sprite {
  const [main, light, dark] = FLOWER_COLORS[id];
  return sprite(14, 12, (P) => {
    P.ellipse(7, 8, 7, 3, '#9a6a46');
    P.ellipse(7, 7, 6, 2, C.soil);
    P.ellipse(6, 7, 3, 1, C.soilLight);
    // A border of little stones along the front.
    for (let x = 1; x < 13; x += 2) {
      P.px(x, 10, C.greyLight);
      P.px(x + 1, 10, C.grey);
    }
    for (const [x, y] of [[3, 3], [7, 2], [11, 3], [5, 6], [9, 6], [2, 7], [12, 7], [7, 8]]) {
      P.px(x, y + 2, C.leafDark);
      P.px(x - 1, y + 1, C.leaf);
      P.px(x + 1, y + 2, C.leafLight);
      P.px(x - 1, y, main);
      P.px(x + 1, y, main);
      P.px(x, y - 1, light);
      P.px(x, y + 1, dark);
      P.px(x, y, id === 'flowersYellow' ? '#c97a2b' : C.gold);
    }
  });
}

/** The market cart (2 x 1): a plank cart under a green and white canopy, crates of produce, one big wheel. */
function marketCart(view: View): Sprite {
  const produce = (P: Painter, x: number, y: number) => {
    // Three crates: apples, carrots, cabbages.
    for (const [dx, a, b] of [[0, C.red, '#ff8a96'], [6, C.orange, '#ffb27c'], [12, C.leaf, C.leafLight]] as const) {
      P.rect(x + dx, y + 2, 5, 3, C.woodLight);
      P.rect(x + dx, y + 4, 5, 1, C.woodDark);
      for (let i = 0; i < 5; i += 2) P.px(x + dx + i, y + 1, a);
      P.px(x + dx + 1, y + 1, b);
      P.rect(x + dx, y, 5, 1, a);
      P.px(x + dx + 3, y, b);
    }
  };
  const canopy = (P: Painter, x: number, w: number) => {
    for (let i = 0; i < w; i += 2) {
      const col = i % 4 === 0 ? '#5aa54a' : C.white;
      P.rect(x + i, 0, Math.min(2, w - i), 3, col);
      P.px(x + i + 1, 3, col);
    }
    P.rect(x, 0, w, 1, '#7cc456');
  };
  if (view === 'face') {
    return sprite(30, 22, (P) => {
      canopy(P, 3, 22);
      P.rect(4, 4, 1, 8, C.woodDark);
      P.rect(23, 4, 1, 8, C.woodDark);
      produce(P, 6, 7);
      // The cart's bed and its shafts to the left.
      planks(P, 3, 12, 22, 4);
      P.line(0, 15, 3, 13, C.woodDark);
      P.line(0, 16, 3, 14, C.wood);
      // The big wheel, spokes and iron rim.
      P.disc(19, 17, 4, IRON);
      P.disc(19, 17, 3, C.woodDark);
      P.disc(19, 17, 2, C.wood);
      P.line(16, 17, 22, 17, C.woodDark);
      P.line(19, 14, 19, 20, C.woodDark);
      P.px(19, 17, IRON_LIGHT);
      P.rect(6, 16, 2, 4, C.woodDark);
    });
  }
  return sprite(14, 28, (P) => {
    canopy(P, 1, 12);
    P.rect(2, 4, 1, 12, C.woodDark);
    P.rect(11, 4, 1, 12, C.woodDark);
    // Seen from its end: crates one behind the other, two wheels showing on each side.
    produce(P, 1, 8);
    produce(P, 1, 13);
    planks(P, 1, 18, 12, 5);
    for (const x of [0, 12]) {
      P.rect(x, 20, 2, 7, IRON);
      P.rect(x, 21, 2, 5, C.woodDark);
    }
  });
}

function bench(view: View): Sprite {
  if (view === 'face') {
    return sprite(26, 13, (P) => {
      // The backrest: two boards, light on top.
      P.rect(0, 0, 26, 3, C.wood);
      P.rect(0, 0, 26, 1, C.woodLight);
      P.rect(0, 2, 26, 1, C.woodDark);
      P.rect(23, 0, 3, 3, C.woodDark);
      P.rect(2, 3, 2, 3, IRON);
      P.rect(22, 3, 2, 3, IRON);
      P.px(2, 3, IRON_LIGHT);
      // The seat, its boards, curled iron armrests and legs.
      P.rect(0, 6, 26, 3, C.woodLight);
      P.rect(0, 6, 26, 1, '#ecc08a');
      P.rect(0, 8, 26, 1, C.wood);
      for (const x of [8, 17]) P.px(x, 7, C.wood);
      P.rect(23, 6, 3, 3, C.wood);
      P.rect(0, 4, 3, 1, IRON);
      P.rect(23, 4, 3, 1, IRON);
      P.px(0, 5, IRON);
      P.px(25, 5, IRON);
      P.rect(2, 9, 2, 4, IRON);
      P.rect(22, 9, 2, 4, IRON);
      P.px(2, 9, IRON_LIGHT);
      P.px(1, 12, IRON);
      P.px(4, 12, IRON);
      P.px(21, 12, IRON);
      P.px(24, 12, IRON);
    });
  }
  return sprite(12, 30, (P) => {
    P.rect(8, 0, 3, 24, C.wood);
    P.rect(8, 0, 1, 24, C.woodLight);
    P.rect(10, 0, 1, 24, C.woodDark);
    P.rect(1, 6, 7, 20, C.woodLight);
    P.rect(1, 6, 1, 20, '#ecc08a');
    for (let y = 9; y < 26; y += 4) P.rect(1, y, 7, 1, C.wood);
    P.rect(6, 6, 2, 20, C.wood);
    P.rect(1, 26, 2, 4, IRON);
    P.rect(8, 24, 2, 6, IRON);
    P.px(1, 26, IRON_LIGHT);
    P.px(0, 29, IRON);
    P.px(10, 29, IRON);
  });
}

function well(view: View): Sprite {
  return sprite(26, 34, (P) => {
    if (view === 'face') {
      P.rect(3, 4, 2, 18, C.woodDark);
      P.rect(3, 4, 1, 18, C.wood);
      P.rect(21, 4, 2, 18, C.woodDark);
      // A little tiled roof.
      for (let i = 0; i < 6; i++) P.rect(2, i, 22, 1, i < 1 ? ROOF_RED[0] : ROOF_RED[1]);
      for (const y of [2, 4]) for (let x = 3 + (y === 4 ? 2 : 0); x < 22; x += 4) P.rect(x, y, 3, 1, ROOF_RED[2]);
      P.rect(21, 0, 3, 6, ROOF_RED[2]);
      P.rect(0, 5, 26, 2, ROOF_RED[3]);
      P.rect(0, 5, 26, 1, ROOF_RED[2]);
      // The crossbar, the crank, the rope and a bucket with its bands.
      P.rect(5, 10, 16, 1, C.woodDark);
      P.rect(23, 9, 1, 3, IRON);
      P.px(24, 11, IRON);
      P.line(13, 11, 13, 14, C.door);
      P.rect(11, 15, 5, 4, C.wood);
      P.rect(11, 15, 5, 1, C.woodLight);
      P.rect(11, 17, 5, 1, IRON);
      P.rect(15, 15, 1, 4, C.woodDark);
    } else {
      P.rect(12, 6, 2, 16, C.woodDark);
      P.rect(12, 6, 1, 16, C.wood);
      for (let i = 0; i < 7; i++) P.rect(13 - (i + 1) * 1.5, i, (i + 1) * 3, 1, i < 2 ? ROOF_RED[0] : i % 3 === 2 ? ROOF_RED[2] : ROOF_RED[1]);
      P.rect(1, 7, 24, 1, ROOF_RED[3]);
      P.rect(14, 10, 6, 1, C.woodDark);
      P.rect(19, 10, 1, 3, IRON);
      P.line(16, 11, 16, 14, C.door);
      P.rect(14, 15, 5, 4, C.wood);
      P.rect(14, 15, 5, 1, C.woodLight);
      P.rect(14, 17, 5, 1, IRON);
    }
    // Stones with a little moss, the rim, the water.
    stones(P, 2, 22, 22, 12, [C.greyLight, C.grey, C.greyDark]);
    P.rect(20, 23, 4, 11, C.greyDark);
    for (const [x, y] of [[4, 31], [5, 30], [18, 27], [9, 33]] as const) P.px(x, y, '#7cbd5c');
    P.ellipse(13, 21, 11, 3, '#ece8e1');
    P.ellipse(13, 22, 10, 2, C.greyLight);
    P.ellipse(13, 21, 8, 2, '#4d7fb0');
    P.ellipse(12, 21, 5, 1, '#5c9fd6');
    P.px(10, 20, '#bfe2f7');
    P.px(11, 20, '#8ec6e8');
  });
}

function scarecrow(): Sprite {
  return sprite(14, 26, (P) => {
    P.line(7, 8, 7, 25, C.woodDark);
    P.line(6, 18, 6, 25, C.wood);
    P.line(1, 12, 13, 12, C.wood);
    P.line(1, 11, 13, 11, C.woodLight);
    // The shirt with a patch, the straw at its cuffs and hem.
    P.rect(4, 11, 7, 8, '#6a9fd8');
    P.rect(4, 11, 7, 1, '#86b6e6');
    P.rect(9, 12, 2, 7, '#5385bd');
    P.rect(5, 14, 2, 2, C.red);
    P.px(5, 14, '#ff8a96');
    P.rect(7, 12, 1, 6, '#86b6e6');
    for (const [x, y] of [[1, 13], [13, 13], [0, 12], [5, 19], [7, 19], [9, 19], [12, 13]] as const) P.px(x, y, C.gold);
    // A burlap head with a stitched smile, a straw hat with a red band.
    P.disc(7, 6, 3, '#e8c98a');
    P.px(5, 5, '#f3dcad');
    P.rect(9, 5, 1, 3, '#d4ae6c');
    P.px(6, 6, OUTLINE);
    P.px(8, 6, OUTLINE);
    P.rect(6, 8, 3, 1, '#a07a46');
    P.rect(2, 3, 11, 1, '#c9a23a');
    P.rect(4, 0, 7, 3, '#e9c45a');
    P.rect(4, 0, 7, 1, '#f5dc8a');
    P.rect(4, 2, 7, 1, C.red);
    // A crow resting on the arm.
    P.rect(11, 9, 3, 2, '#3d3540');
    P.px(13, 8, '#3d3540');
    P.px(14, 8, C.orange);
    P.px(12, 9, '#5a5060');
  });
}

function lantern(): Sprite {
  return sprite(10, 26, (P) => {
    P.rect(4, 8, 2, 16, '#5b4a48');
    P.rect(2, 23, 6, 3, '#5b4a48');
    lanternLamp(P);
  });
}

/** The lamp at the top of the lantern; it glows at night (farmScene). */
function lanternLamp(P: Painter): void {
  P.rect(1, 1, 8, 8, '#5b4a48');
  P.rect(2, 2, 6, 6, C.glow);
  P.rect(3, 3, 2, 2, '#fff3c4');
  P.rect(0, 0, 10, 1, '#3f3331');
  P.rect(2, 9, 6, 1, '#3f3331');
}

function flowerPot(): Sprite {
  return sprite(10, 11, (P) => {
    P.rect(2, 3, 6, 2, C.leaf);
    P.px(3, 3, C.leafLight);
    P.px(6, 4, C.leafDark);
    for (const [x, y, col] of [[2, 2, '#ff8fb8'], [5, 1, '#ffd84a'], [7, 2, '#ff8fb8']] as const) {
      P.rect(x - 1, y, 3, 1, col);
      P.px(x, y - 1, col);
      P.px(x, y + 1, col);
      P.px(x, y, '#fff6c8');
    }
    P.rect(0, 5, 10, 2, C.brick);
    P.rect(0, 5, 10, 1, '#e08a6a');
    P.rect(1, 7, 8, 4, '#d4764f');
    P.rect(6, 7, 2, 4, C.brickDark);
  });
}

// -----------------------------------------------
// DECORATIONS SITTING ON OTHERS (docs/ferme.md 16)
// -----------------------------------------------

export type PercherId = 'lantern' | 'birdhouse' | 'flowerPot' | 'wateringCan' | 'candleJar';

/** A decoration as it looks sitting on a support: without the pole it has on the ground. */
export function perchedSprite(id: PercherId, view: View): Sprite {
  // The watering can and the candle jar have no pole: they look the same anywhere.
  if (id === 'wateringCan' || id === 'candleJar') return objectSprite(id, 'face');
  const v: View = id === 'birdhouse' ? view : 'face';
  return cached(`perched-${id}-${v}`, () => {
    if (id === 'lantern') {
      return sprite(10, 11, (P) => {
        lanternLamp(P);
        P.rect(3, 10, 4, 1, '#5b4a48');
      });
    }
    if (id === 'birdhouse') return sprite(14, 12, (P) => {
      birdhouseBox(P, v);
      P.rect(4, 11, 6, 1, C.woodDark);
    });
    return flowerPot();
  });
}

/** Where a decoration glows at night: points of its drawing as drawn (margin included, not mirrored). */
export function glowsOf(id: PlaceableId, view: View): Glow[] {
  if (id === 'lantern') return [{ x: 6, y: 5, r: 26 }];
  return isGardenDecor(id) ? gardenGlows(id, GARDEN_SYMMETRIC.has(id) ? 'face' : view) : [];
}

/**
 * Where a decoration sits on a support: the point of the support's drawing (as drawn, not mirrored) that the
 * bottom row of the perched drawing lands on, centred.
 */
export function seatOf(id: PlaceableId, view: View, skin: SkinId | null): { x: number; y: number } {
  switch (id) {
    case 'fence': return { x: 8, y: skin === 'fencePicket' ? 6 : skin === 'fenceWattle' ? 8 : 9 };
    case 'bench': return view === 'face' ? { x: 14, y: 8 } : { x: 5, y: 17 };
    case 'well': return { x: 8, y: 24 };
    case 'logPile': return view === 'face' ? { x: 16, y: 2 } : { x: 6, y: 3 };
    default: return { x: 8, y: 2 };
  }
}

function wheelbarrow(view: View): Sprite {
  const flowers = (P: Painter, xs: readonly number[], y: number) => {
    xs.forEach((x, i) => {
      P.px(x, y, i % 2 ? '#ff8fb8' : C.gold);
      P.px(x, y + 1, C.leaf);
    });
  };
  if (view === 'face') {
    return sprite(14, 13, (P) => {
      P.rect(1, 0, 1, 4, C.woodDark);
      P.rect(12, 0, 1, 4, C.woodDark);
      P.rect(0, 3, 14, 2, C.woodLight);
      P.rect(0, 3, 14, 1, '#ecc08a');
      P.rect(1, 5, 12, 3, C.wood);
      P.rect(10, 5, 3, 3, C.woodDark);
      P.rect(2, 8, 10, 1, C.woodDark);
      P.rect(2, 3, 10, 1, C.leaf);
      flowers(P, [3, 5, 7, 9, 11], 2);
      P.disc(7, 10, 2, IRON);
      P.px(7, 10, C.greyLight);
      P.px(6, 9, IRON_LIGHT);
    });
  }
  return sprite(15, 11, (P) => {
    P.rect(3, 2, 9, 2, C.woodLight);
    P.rect(3, 2, 9, 1, '#ecc08a');
    P.rect(4, 4, 7, 2, C.wood);
    P.rect(5, 6, 5, 1, C.woodDark);
    P.rect(4, 1, 6, 1, C.leaf);
    flowers(P, [4, 6, 8], 0);
    P.line(11, 3, 14, 1, C.woodDark);
    P.rect(10, 7, 1, 4, C.woodDark);
    P.disc(3, 8, 2, IRON);
    P.px(3, 8, C.greyLight);
  });
}

function logPile(view: View): Sprite {
  const end = (P: Painter, x: number, y: number) => {
    P.disc(x, y, 3, C.bark);
    P.disc(x, y, 2, '#e6b884');
    P.px(x, y, '#c38a55');
    P.px(x + 1, y + 1, '#d3a06c');
    P.px(x - 1, y - 1, '#f3d2a2');
    P.px(x + 2, y + 2, C.barkDark);
  };
  if (view === 'face') {
    return sprite(28, 12, (P) => {
      for (const x of [4, 11, 18, 25]) end(P, x, 8);
      for (const x of [8, 15, 22]) end(P, x, 3);
      P.px(13, 0, C.leafLight);
      P.px(14, 1, C.leaf);
    });
  }
  return sprite(12, 28, (P) => {
    P.rect(0, 5, 5, 22, C.bark);
    P.rect(6, 5, 5, 22, C.bark);
    P.rect(3, 1, 5, 22, '#9a6744');
    P.rect(3, 1, 1, 22, '#b07a52');
    P.rect(0, 5, 1, 22, '#9a6744');
    for (const x of [1, 7, 4]) {
      for (let y = 6; y < 25; y += 5) P.rect(x, y, 2, 1, C.barkDark);
    }
    P.ellipse(2, 26, 2, 1, '#e6b884');
    P.ellipse(8, 26, 2, 1, '#e6b884');
    P.ellipse(5, 22, 2, 1, '#e6b884');
    P.px(5, 22, '#c38a55');
  });
}

function birdhouse(view: View): Sprite {
  return sprite(14, 24, (P) => {
    P.rect(6, 10, 2, 14, C.woodDark);
    P.rect(5, 22, 4, 2, C.woodDark);
    birdhouseBox(P, view);
  });
}

/** The little house itself, on its pole or sitting on a support. */
function birdhouseBox(P: Painter, view: View): void {
  if (view === 'face') {
    // The box: blue boards, lit on the left, a perch under the round hole.
    P.rect(2, 4, 10, 7, '#6a9fd8');
    P.rect(2, 4, 1, 7, '#8fbbe8');
    P.rect(9, 4, 3, 7, '#5385bd');
    for (const x of [5, 8]) P.rect(x, 5, 1, 5, '#5c8fc8');
    P.rect(2, 10, 10, 1, '#4d7fb0');
    for (let i = 0; i < 5; i++) {
      P.rect(6 - i - 1, i, 2 * i + 4, 1, i < 2 ? ROOF_RED[0] : ROOF_RED[1]);
      P.px(6 + i + 2, i, ROOF_RED[2]);
    }
    P.rect(1, 4, 12, 1, ROOF_RED[3]);
    P.disc(7, 7, 1, OUTLINE);
    P.px(6, 6, '#3a2a2e');
    P.rect(6, 9, 3, 1, C.woodLight);
    P.rect(6, 10, 3, 1, C.woodLight);
  } else {
    P.rect(4, 4, 6, 7, '#5c8fc8');
    P.rect(4, 4, 1, 7, '#8fbbe8');
    P.rect(8, 4, 2, 7, '#4d7fb0');
    P.rect(4, 10, 6, 1, '#4d7fb0');
    for (let i = 0; i < 5; i++) {
      P.rect(2, i, 10, 1, i < 2 ? ROOF_RED[0] : ROOF_RED[1]);
      if (i === 2) for (let x = 3; x < 12; x += 3) P.rect(x, i, 2, 1, ROOF_RED[2]);
    }
    P.rect(2, 4, 10, 1, ROOF_RED[3]);
    P.px(6, 7, '#86b6e6');
  }
}

function appleTree(): Sprite {
  return sprite(30, 42, (P) => roundTree(P, C.red, '#ff8a96', 21));
}

function pond(): Sprite {
  return sprite(30, 24, (P) => {
    // A ring of stones, then the water.
    P.ellipse(15, 15, 14, 8, C.greyDark);
    P.ellipse(15, 14, 14, 7, C.grey);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      P.ellipse(Math.round(15 + Math.cos(a) * 13), Math.round(14 + Math.sin(a) * 6.5), 1, 1, i % 2 ? C.greyLight : '#e2ddd5');
    }
    P.ellipse(15, 15, 12, 6, C.waterDark);
    P.ellipse(15, 15, 11, 5, C.water);
    P.ellipse(13, 14, 7, 3, '#6aaee0');
    // Lily pads, one in flower, one with a frog.
    P.ellipse(10, 16, 3, 2, C.leaf);
    P.px(11, 15, C.water);
    P.px(9, 16, C.leafLight);
    P.px(9, 15, '#ff8fb8');
    P.px(10, 14, '#ffc0d6');
    P.ellipse(19, 18, 2, 1, C.leafDark);
    P.rect(18, 16, 3, 2, '#6cbf4a');
    P.px(18, 16, '#9ad574');
    P.px(20, 16, '#9ad574');
    P.px(18, 15, OUTLINE);
    P.px(20, 15, OUTLINE);
    // Reeds with their brown heads.
    for (const [x, h] of [[23, 10], [25, 12], [27, 8]] as const) {
      P.line(x, 14, x, 14 - h, C.leafDark);
      P.rect(x, 14 - h, 1, 3, C.bark);
      P.px(x, 14 - h, '#b07a52');
    }
    P.px(22, 9, C.leaf);
    P.px(24, 6, C.leafLight);
  }, true, 1, (P) => {
    // Glints on the water, never outlined.
    P.rect(8, 13, 4, 1, C.waterLight);
    P.px(9, 12, '#ffffff');
    P.rect(16, 18, 3, 1, C.waterLight);
    P.rect(13, 11, 2, 1, '#d6eefc');
  });
}

/** A bramble bush: thorny stems poking out tell it is something to clear, not a garden plant. */
function bush(): Sprite {
  return sprite(14, 12, (P) => {
    P.disc(7, 7, 5, C.leafDark);
    P.disc(4, 8, 3, C.leaf);
    P.disc(9, 6, 4, C.leaf);
    P.disc(7, 5, 2, C.leafLight);
    const stem = '#8a4f3a';
    P.line(1, 4, 3, 6, stem);
    P.px(0, 3, stem);
    P.px(2, 4, '#c9a07a');
    P.line(12, 2, 11, 4, stem);
    P.px(13, 1, stem);
    P.px(12, 3, '#c9a07a');
    P.line(6, 0, 7, 2, stem);
    P.px(5, 1, '#c9a07a');
    P.px(5, 8, '#7a2c4a');
    P.px(6, 8, '#b0436e');
    P.px(10, 7, '#7a2c4a');
    P.px(11, 7, '#b0436e');
    P.px(8, 10, '#7a2c4a');
  });
}

function stump(): Sprite {
  return sprite(12, 10, (P) => {
    P.rect(1, 3, 10, 7, C.bark);
    P.rect(1, 3, 1, 7, '#a06c48');
    P.rect(3, 3, 1, 7, C.barkDark);
    P.rect(8, 3, 1, 7, C.barkDark);
    P.rect(9, 3, 2, 7, C.barkDark);
    P.px(0, 9, C.bark);
    P.px(11, 9, C.barkDark);
    P.ellipse(6, 3, 5, 2, C.woodLight);
    P.ellipse(6, 3, 3, 1, '#e8bb83');
    P.ellipse(6, 3, 1, 0, C.wood);
    P.px(9, 1, C.leafLight);
    // A little red mushroom at its foot.
    P.rect(9, 7, 2, 1, C.red);
    P.px(10, 7, '#ff8a96');
    P.px(10, 8, C.cream);
  });
}

function rock(): Sprite {
  return sprite(13, 9, (P) => {
    P.ellipse(6, 5, 6, 4, C.grey);
    P.ellipse(8, 6, 4, 2, C.greyDark);
    P.ellipse(5, 4, 4, 2, C.greyLight);
    P.px(3, 3, '#ece8e1');
    P.rect(3, 7, 8, 1, C.greyDark);
    P.px(9, 4, C.greyDark);
    P.px(2, 6, '#7cbd5c');
  });
}

function bigRock(): Sprite {
  return sprite(28, 20, (P) => {
    P.ellipse(18, 13, 9, 6, C.greyDark);
    P.ellipse(18, 12, 8, 5, C.grey);
    P.ellipse(20, 14, 5, 3, C.greyDark);
    P.ellipse(11, 10, 10, 8, C.grey);
    P.ellipse(14, 13, 6, 4, '#a9a29a');
    P.ellipse(10, 8, 7, 5, C.greyLight);
    P.ellipse(8, 6, 3, 2, '#ece8e1');
    P.rect(4, 16, 20, 2, C.greyDark);
    P.line(12, 6, 14, 11, C.greyDark);
    P.line(14, 11, 13, 14, C.greyDark);
    P.rect(5, 4, 4, 2, '#7cbd5c');
    P.rect(6, 3, 2, 1, '#9ad574');
    P.rect(20, 8, 3, 1, '#7cbd5c');
    P.px(21, 7, '#9ad574');
    P.px(3, 15, C.leaf);
    P.px(25, 16, C.leaf);
  });
}

// -----------------------------------------------
// TREASURES: the decorations only Gaston's parcels bring
// -----------------------------------------------
// The rewards people chase: richer colours, and a touch of gold and sparkle on the epic and legendary ones.

function gnome(view: View): Sprite {
  return sprite(13, 20, (P) => {
    const red = C.red;
    const redDark = '#b4353f';
    const redLight = '#ff7a8a';
    const lean = view === 'profile' ? 1 : 0;
    // The pointed hat, its tip leaning forward in profile.
    P.px(6 + 2 * lean, 0, redLight);
    P.rect(5 + lean, 1, 2, 1, red);
    P.rect(5 + lean, 2, 3, 1, red);
    P.rect(4, 3, 4 + lean, 1, red);
    P.rect(4, 4, 5, 1, red);
    P.rect(3, 5, 6, 1, red);
    P.rect(2, 6, 8, 1, red);
    P.rect(2, 7, 8, 1, redDark);
    P.px(5 + lean, 2, redLight);
    P.px(4, 4, redLight);
    P.px(3, 5, redLight);
    // Blue coat, belt, boots.
    P.rect(2, 12, 8, 5, C.blue);
    P.rect(2, 12, 1, 5, C.blueDark);
    P.rect(2, 16, 8, 1, C.woodDark);
    P.px(6, 16, C.gold);
    P.rect(3, 17, 2, 2, C.bark);
    P.rect(7, 17, 2, 2, C.bark);
    P.rect(3, 19, 2, 1, C.barkDark);
    P.rect(7, 19, 2, 1, C.barkDark);
    // Face and the big white beard.
    P.rect(3, 8, 6, 2, SKIN);
    if (view === 'face') {
      P.px(4, 8, OUTLINE);
      P.px(7, 8, OUTLINE);
      P.px(5, 9, '#f29aa6');
      P.px(6, 9, '#f29aa6');
    } else {
      P.px(7, 8, OUTLINE);
      P.rect(9, 8, 1, 2, '#f29aa6');
    }
    P.rect(2, 10, 8, 3, C.white);
    P.rect(3, 13, 6, 1, C.white);
    P.rect(4, 14, 4, 1, '#e8e0d2');
    P.px(3, 11, '#e8e0d2');
    // A little flower held in the hand.
    P.line(10, 13, 11, 11, C.leafDark);
    P.px(12, 10, ROSE);
    P.px(11, 10, ROSE_LIGHT);
    P.px(12, 11, ROSE);
    P.px(10, 12, SKIN);
  });
}

function hayBales(view: View): Sprite {
  const bale = (P: Painter, cx: number, cy: number, r: number) => {
    P.disc(cx, cy, r, C.strawDark);
    P.disc(cx, cy, r - 1, C.straw);
    P.disc(cx - 1, cy - 1, r - 3, C.strawLight);
    P.disc(cx, cy, Math.max(1, r - 4), C.strawDark);
    P.px(cx, cy, C.straw);
    P.rect(cx - r + 1, cy + r - 1, 2 * r - 1, 1, '#bfa060');
  };
  if (view === 'face') {
    return sprite(29, 17, (P) => {
      bale(P, 7, 10, 6);
      bale(P, 21, 10, 6);
      bale(P, 14, 6, 6);
      P.px(3, 3, C.strawLight);
      P.px(26, 4, C.strawLight);
    });
  }
  // Seen from the side, round bales are rolls lying on top of each other.
  return sprite(13, 28, (P) => {
    const roll = (y: number, h: number) => {
      P.rect(1, y, 11, h, C.straw);
      P.rect(1, y, 11, 2, C.strawLight);
      P.rect(1, y + h - 2, 11, 2, C.strawDark);
      for (let x = 3; x < 12; x += 3) P.rect(x, y + 2, 1, h - 4, C.strawDark);
      P.rect(0, y + 1, 1, h - 2, C.strawDark);
      P.rect(12, y + 1, 1, h - 2, C.strawDark);
    };
    roll(16, 12);
    roll(3, 12);
  });
}

function teaTable(): Sprite {
  return sprite(14, 19, (P) => {
    // Long wooden legs, then a flat round top under a short pink cloth: a table, not a cake.
    P.rect(2, 11, 2, 8, C.woodDark);
    P.rect(10, 11, 2, 8, C.woodDark);
    P.rect(2, 11, 1, 8, C.wood);
    P.rect(10, 11, 1, 8, C.wood);
    P.rect(3, 15, 8, 1, C.woodDark);
    P.ellipse(7, 9, 6, 2, '#f7a8c4');
    P.rect(1, 9, 13, 2, '#f48fb1');
    P.ellipse(7, 8, 4, 1, '#ffd0e0');
    for (let x = 1; x < 14; x += 3) P.px(x, 11, '#e0709a');
    // A white teapot with its spout, handle and blue lid, and a cup on its saucer.
    P.disc(5, 5, 3, C.white);
    P.rect(3, 7, 5, 1, '#e8e0d2');
    P.rect(4, 2, 3, 1, C.blue);
    P.px(5, 1, C.blueDark);
    P.rect(3, 5, 5, 1, C.blueLight);
    P.line(8, 5, 10, 3, C.white);
    P.px(10, 2, C.white);
    P.rect(1, 4, 1, 3, C.white);
    P.px(4, 4, '#ffffff');
    P.rect(10, 6, 3, 2, C.white);
    P.px(13, 6, C.white);
    P.rect(9, 8, 5, 1, '#bfe0f5');
    P.rect(10, 6, 3, 1, '#b07a52');
  });
}

function flowerArch(view: View): Sprite {
  const rose = (P: Painter, x: number, y: number) => {
    P.rect(x, y, 2, 2, ROSE);
    P.px(x, y, ROSE_LIGHT);
    P.px(x + 1, y + 1, ROSE_DARK);
  };
  if (view === 'face') {
    return sprite(30, 30, (P) => {
      P.rect(1, 12, 3, 18, C.wood);
      P.rect(26, 12, 3, 18, C.wood);
      P.rect(1, 12, 1, 18, C.woodLight);
      P.rect(28, 12, 1, 18, C.woodDark);
      // The arch: two pixels thick, a half ellipse over the path.
      for (let x = 1; x <= 28; x++) {
        const t = (x - 14.5) / 13.5;
        const y = Math.round(12 - Math.sqrt(Math.max(0, 1 - t * t)) * 10);
        P.rect(x, y, 1, 3, C.wood);
        P.px(x, y, C.woodLight);
      }
      // Leaves and roses climbing all over it.
      for (let x = 2; x <= 27; x += 3) {
        const t = (x - 14.5) / 13.5;
        const y = Math.round(12 - Math.sqrt(Math.max(0, 1 - t * t)) * 10);
        P.disc(x, y + 1, 2, C.leafDark);
        P.px(x - 1, y, C.leaf);
        P.px(x + 1, y + 1, C.leafLight);
      }
      for (const y of [16, 21, 26]) {
        P.disc(2, y, 2, C.leafDark);
        P.disc(27, y + 2, 2, C.leafDark);
        P.px(1, y - 1, C.leaf);
        P.px(28, y + 1, C.leaf);
      }
      for (const [x, y] of [[3, 7], [8, 3], [14, 1], [20, 3], [25, 7], [1, 14], [27, 18], [2, 22], [26, 24], [11, 2], [17, 1]] as const) rose(P, x, y);
      twinkle(P, 14, 6);
    });
  }
  return sprite(14, 30, (P) => {
    P.rect(5, 6, 3, 24, C.wood);
    P.rect(5, 6, 1, 24, C.woodLight);
    P.rect(3, 4, 7, 3, C.wood);
    P.disc(6, 4, 4, C.leafDark);
    P.disc(5, 3, 2, C.leaf);
    for (const y of [11, 16, 21, 26]) {
      P.disc(y % 2 ? 4 : 9, y, 2, C.leafDark);
      P.px(y % 2 ? 3 : 10, y - 1, C.leaf);
    }
    for (const [x, y] of [[3, 1], [8, 2], [9, 6], [2, 10], [9, 15], [2, 20], [9, 24]] as const) rose(P, x, y);
  });
}

function swing(view: View): Sprite {
  return sprite(30, 40, (P) => {
    swingFrame(P, view);
    swingSeat(P, view, 0, 0);
  });
}

/** The swing without its ropes and seat: drawn while someone swings, the seat moving on its own (swingSeatSprite). */
export function swingFrameSprite(view: View): Sprite {
  return cached(`swing-frame-${view}`, () => sprite(30, 40, (P) => swingFrame(P, view)));
}

/**
 * The ropes and the seat, on a canvas the size of the swing's: seen from the front the seat rises (dy < 0) and falls;
 * from the side it swings forward (dx > 0) and back on its rope, from the pivot.
 */
export function swingSeatSprite(view: View, dx: number, dy: number): Sprite {
  return cached(`swing-seat-${view}-${dx}-${dy}`, () => sprite(30, 40, (P) => swingSeat(P, view, dx, dy)));
}

function swingFrame(P: Painter, view: View): void {
  const garland = (x0: number, x1: number, y: number) => {
    const colours = [ROSE, C.gold, C.white, '#b9a2ff'];
    for (let x = x0, i = 0; x <= x1; x += 3, i++) {
      P.px(x, y + 1, C.leaf);
      P.px(x + 1, y, colours[i % colours.length]);
    }
  };
  const meadow = (w: number) => {
    for (let x = 1; x < w - 1; x += 2) P.px(x, 39, x % 4 ? C.leaf : C.leafLight);
    for (const [x, c] of [[4, ROSE], [9, C.gold], [w - 6, C.white], [w - 3, ROSE]] as const) {
      P.px(x, 38, c);
      P.px(x, 39, C.leafDark);
    }
  };
  if (view === 'face') {
    // A slim post on each side with a little brace, and a beam on top: light, not a wall.
    for (const x of [2, 26]) {
      P.rect(x, 3, 2, 37, C.wood);
      P.rect(x, 3, 1, 37, C.woodLight);
      P.rect(x + 1, 3, 1, 37, C.woodDark);
    }
    P.line(4, 7, 7, 4, C.woodDark);
    P.line(25, 7, 22, 4, C.woodDark);
    // A rose vine climbing the left post.
    for (let y = 12; y < 38; y += 5) {
      P.px(1, y, C.leaf);
      P.px(4, y + 2, C.leafDark);
      P.px(1, y + 1, ROSE);
    }
    P.rect(0, 1, 30, 3, C.wood);
    P.rect(0, 1, 30, 1, C.woodLight);
    P.rect(0, 3, 30, 1, C.woodDark);
    garland(2, 27, 4);
    meadow(30);
    return;
  }
  P.line(15, 2, 4, 39, C.woodDark);
  P.line(16, 2, 5, 39, C.wood);
  P.line(15, 2, 25, 39, C.woodDark);
  P.line(16, 2, 26, 39, C.wood);
  P.rect(12, 1, 7, 3, C.wood);
  P.rect(12, 1, 7, 1, C.woodLight);
  garland(12, 18, 4);
  meadow(30);
}

/** Ropes, the seat and its pink cushion. */
function swingSeat(P: Painter, view: View, dx: number, dy: number): void {
  if (view === 'face') {
    P.line(10, 5, 10, 27 + dy, '#d8c9a8');
    P.line(19, 5, 19, 27 + dy, '#d8c9a8');
    P.rect(8, 27 + dy, 14, 3, C.woodLight);
    P.rect(8, 29 + dy, 14, 1, C.woodDark);
    P.rect(9, 25 + dy, 12, 2, '#f48fb1');
    P.rect(10, 25 + dy, 4, 1, '#ffc0d6');
    return;
  }
  P.line(15, 4, 15 + dx, 27 + dy, '#d8c9a8');
  P.rect(13 + dx, 27 + dy, 5, 3, C.woodLight);
  P.rect(13 + dx, 25 + dy, 5, 2, '#f48fb1');
}

/** The legendary one: a royal fountain, stone and gold, a golden swan whose jet falls into a high bowl, then two falls. */
function fountain(): Sprite {
  return sprite(32, 41, (P) => {
    // Basin wall: panels between little pilasters, a gold band under the rim.
    P.rect(1, 33, 31, 8, C.stone);
    P.rect(1, 40, 31, 1, C.stoneDark);
    P.rect(1, 39, 31, 1, '#dcd2c2');
    for (const x of [1, 7, 13, 19, 25]) {
      P.rect(x + 1, 36, 4, 3, '#f3ede2');
      P.rect(x + 1, 38, 4, 1, '#ddd3c3');
    }
    for (const x of [6, 12, 18, 24]) P.rect(x, 35, 2, 5, C.stoneDark);
    P.rect(1, 34, 31, 1, C.gold);
    P.rect(1, 35, 31, 1, C.goldDark);
    // Rim and water.
    P.ellipse(16, 33, 15, 6, C.stoneDark);
    P.ellipse(16, 32, 15, 6, C.stone);
    P.ellipse(16, 31, 15, 5, '#f6f1e8');
    P.ellipse(16, 32, 13, 4, C.gold);
    P.ellipse(16, 32, 12, 4, C.waterDark);
    P.ellipse(16, 31, 11, 3, C.water);
    for (const [x, y, w] of [[6, 31, 3], [20, 33, 4], [12, 34, 3], [24, 30, 2]]) P.rect(x, y, w, 1, C.waterLight);
    P.px(9, 33, C.gold);
    P.px(22, 31, C.goldLight);
    P.px(18, 34, C.gold);
    // Lily pads.
    P.ellipse(7, 33, 2, 1, C.leaf);
    P.px(8, 32, '#ff8fb8');
    P.ellipse(25, 33, 2, 1, C.leafDark);
    P.px(26, 33, C.leaf);
    // The column with its gold ring.
    P.rect(13, 19, 6, 13, C.stone);
    P.rect(13, 19, 1, 13, '#ffffff');
    P.rect(17, 19, 2, 13, C.stoneDark);
    P.rect(13, 25, 6, 1, C.gold);
    P.rect(12, 29, 8, 3, C.stoneDark);
    P.rect(12, 29, 8, 1, C.stone);
    // The upper bowl.
    P.ellipse(16, 20, 8, 3, C.stoneDark);
    P.ellipse(16, 19, 8, 3, C.stone);
    P.ellipse(16, 19, 7, 2, C.gold);
    P.ellipse(16, 19, 6, 1, C.water);
    P.rect(13, 19, 3, 1, C.waterLight);
    // A golden swan on a little plinth, a jet from its beak.
    P.rect(13, 15, 6, 3, C.goldDark);
    P.rect(13, 15, 6, 1, C.goldLight);
    P.ellipse(15, 12, 4, 2, C.gold);
    P.ellipse(14, 11, 2, 1, C.goldLight);
    P.rect(11, 11, 2, 1, C.goldDark);
    // The neck in an S, the head bowed, the beak to the right.
    P.rect(17, 9, 2, 3, C.gold);
    P.rect(18, 6, 2, 3, C.gold);
    P.rect(17, 4, 2, 2, C.gold);
    P.rect(18, 3, 3, 2, C.gold);
    P.px(18, 6, C.goldLight);
    P.px(17, 9, C.goldLight);
    P.px(21, 4, C.orange);
    P.px(19, 3, OUTLINE);
    twinkle(P, 4, 9);
    twinkle(P, 28, 21);
    twinkle(P, 3, 23);
    P.px(9, 3, SPARKLE);
    P.px(29, 1, SPARKLE);
  }, true, 1, (P) => {
    // The water, light and never outlined: the jet from the beak, then the two falls from the bowl.
    const drops: [number, number][] = [
      [22, 3], [23, 2], [24, 2], [25, 3], [26, 5], [26, 7], [26, 9], [25, 12], [24, 15],
      ...Array.from({ length: 9 }, (_, i): [number, number] => [7 - Math.floor(i / 4), 21 + i]),
      ...Array.from({ length: 9 }, (_, i): [number, number] => [24 + Math.floor(i / 4), 21 + i]),
    ];
    drops.forEach(([x, y], i) => {
      P.rect(x - 1, y, 2, 2, WATER_MIST);
      P.px(x, y, i % 3 === 1 ? '#ffffff' : C.waterLight);
    });
  });
}

// -----------------------------------------------
// GASTON'S MAILBOX
// -----------------------------------------------

function mailbox(view: View, hasMail: boolean): Sprite {
  return sprite(14, 22, (P) => {
    // The post.
    P.rect(5, 10, 3, 12, C.wood);
    P.rect(5, 10, 1, 12, C.woodLight);
    P.rect(7, 10, 1, 12, C.woodDark);
    P.rect(3, 20, 7, 2, C.leaf);
    P.px(2, 21, C.leafDark);
    P.px(10, 21, C.leafLight);
    if (view === 'face') {
      // The box seen from the front: a rounded door.
      P.rect(1, 5, 11, 6, C.blue);
      P.ellipse(6, 5, 5, 3, C.blue);
      P.rect(1, 10, 11, 1, C.blueDark);
      P.ellipse(6, 4, 3, 1, C.blueLight);
      P.rect(2, 6, 9, 4, C.blueDark);
      P.rect(3, 7, 7, 3, hasMail ? '#3f5a80' : C.blue);
      if (hasMail) {
        P.rect(3, 6, 6, 4, '#d9b27a');
        P.rect(3, 6, 6, 1, '#e8c48e');
        P.rect(5, 6, 1, 4, C.red);
        P.rect(8, 6, 1, 4, '#b88a55');
      }
      P.px(6, 8, C.gold);
    } else {
      // From the side: the long box, the flag on its flank.
      P.rect(0, 5, 12, 6, C.blue);
      P.rect(0, 4, 11, 1, C.blueLight);
      P.rect(0, 10, 12, 1, C.blueDark);
      P.rect(11, 5, 1, 5, C.blueDark);
      P.rect(1, 6, 1, 3, C.blueLight);
      if (hasMail) {
        P.rect(0, 4, 4, 3, '#d9b27a');
        P.rect(1, 4, 1, 3, C.red);
      }
    }
    // The flag: down along the box, or up when there is mail.
    if (hasMail) {
      P.rect(12, 0, 1, 7, C.greyDark);
      P.rect(10, 0, 2, 3, C.red);
      P.px(10, 0, '#ff7a8a');
    } else {
      P.rect(12, 6, 1, 3, C.greyDark);
      P.rect(12, 8, 2, 2, C.red);
    }
  });
}

/** The mailbox with mail: flag up and a parcel peeking out (same size as objectSprite('mailbox', view)). */
export function mailboxSprite(hasMail: boolean, view: View): Sprite {
  return cached(`mailbox-${hasMail}-${view}`, () => mailbox(view, hasMail));
}

const RIBBONS: Record<Rarity, [string, string, string]> = {
  common: ['#5aa54a', '#3f7f37', '#8fd06f'],
  rare: ['#4f8fd8', '#3a6db0', '#8ec2f2'],
  epic: ['#9b6ad8', '#7449b0', '#c7a6f2'],
  legendary: [C.gold, C.goldDark, C.goldLight],
};

/** A wrapped parcel, about 16x14 inside: kraft paper with string; rarity colours the ribbon and adds sparkles for epic/legendary (common green, rare blue, epic violet, legendary gold); null = plain kraft parcel. */
export function parcelSprite(rarity: Rarity | null): Sprite {
  return cached(`parcel-${rarity ?? 'plain'}`, () =>
    sprite(16, 14, (P) => {
      const paper = rarity === 'legendary' ? '#f0d58a' : '#d9b27a';
      const paperDark = rarity === 'legendary' ? '#d6a94a' : '#b88a55';
      const paperLight = rarity === 'legendary' ? '#fbe9b0' : '#e8c48e';
      P.rect(0, 4, 16, 10, paper);
      P.rect(15, 4, 1, 10, paperDark);
      P.rect(0, 13, 16, 1, paperDark);
      P.rect(0, 3, 16, 2, paperLight);
      P.rect(0, 5, 16, 1, paperDark);
      const [ribbon, dark, light] = rarity ? RIBBONS[rarity] : ['#f6e5c8', '#c9b48a', '#fffaf2'];
      const wide = rarity ? 2 : 1;
      P.rect(8 - (wide === 2 ? 1 : 0), 3, wide, 11, ribbon);
      P.rect(0, 8, 16, wide, ribbon);
      // The bow on top.
      P.ellipse(5, 1, 2, 1, ribbon);
      P.ellipse(11, 1, 2, 1, ribbon);
      P.px(4, 1, light);
      P.px(10, 1, light);
      P.rect(7, 1, 2, 2, dark);
      if (rarity) {
        P.px(6, 3, dark);
        P.px(10, 3, dark);
      }
      if (rarity === 'epic' || rarity === 'legendary') {
        twinkle(P, 2, 10);
        twinkle(P, 13, 6);
      }
      if (rarity === 'legendary') {
        P.px(1, 1, SPARKLE);
        P.px(15, 0, SPARKLE);
        P.px(12, 11, SPARKLE);
      }
    }),
  );
}

/** A small pink heart (~7x6 inside) that pops above a petted animal. */
export function heartSprite(): Sprite {
  return cached('heart', () => mapSprite(['.aa.aa.', 'abaaaaa', 'aaaaaaa', '.aaaaa.', '..aaa..', '...a...'], { a: '#ff6f9e', b: '#ffd0e0' }));
}

// -----------------------------------------------
// ANY OBJECT
// -----------------------------------------------

export function objectSprite(id: ObjectId, view: View): Sprite {
  if (isGardenPath(id)) return joinedSprite(id, null, 0);
  if (isGardenDecor(id)) {
    const v: View = GARDEN_SYMMETRIC.has(id) ? 'face' : view;
    return cached(`obj-${id}-${v}`, () => gardenDecor(id, v));
  }
  const own: Exclude<ObjectId, GardenDecor | GardenPath> = id;
  const v: View = SYMMETRIC.has(own) ? 'face' : view;
  return cached(`obj-${own}-${v}`, () => {
    switch (own) {
      case 'mill': return mill(v);
      case 'bakery': return bakery(v);
      case 'dairy': return dairy(v);
      case 'spinning': return spinning(v);
      case 'cookiery': return cookiery(v);
      case 'refinery':
      case 'press':
      case 'jamKitchen':
      case 'candyShop':
      case 'sewing':
      case 'iceCream':
      case 'soapWorks':
      case 'creperie': return lot2Machine(own, v);
      case 'sheepfold':
      case 'pigsty':
      case 'hive':
      case 'goatShed':
      case 'duckPond':
      case 'hutch': return lot2Pen(own, v);
      case 'coop': return coop(v);
      case 'cowshed': return cowshed(v);
      case 'fence': return fenceSprite('fenceRanch', ACROSS, false);
      case 'fenceGate': return fenceSprite('fenceRanch', ACROSS, true);
      case 'hedge': return hedgeSprite(ACROSS);
      case 'flowersPink':
      case 'flowersYellow':
      case 'flowersWhite': return flowerBed(own);
      case 'pathStone': return pathSprite(true, 0);
      case 'pathDirt': return pathSprite(false, 0);
      case 'bench': return bench(v);
      case 'well': return well(v);
      case 'scarecrow': return scarecrow();
      case 'lantern': return lantern();
      case 'wheelbarrow': return wheelbarrow(v);
      case 'appleTree': return appleTree();
      case 'logPile': return logPile(v);
      case 'birdhouse': return birdhouse(v);
      case 'flowerPot': return flowerPot();
      case 'pond': return pond();
      case 'bush': return bush();
      case 'stump': return stump();
      case 'rock': return rock();
      case 'bigRock': return bigRock();
      case 'gnome': return gnome(v);
      case 'hayBales': return hayBales(v);
      case 'teaTable': return teaTable();
      case 'flowerArch': return flowerArch(v);
      case 'swing': return swing(v);
      case 'fountain': return fountain();
      case 'mailbox': return mailbox(v, false);
      case 'marketCart': return marketCart(v);
      default: {
        const unknown: never = own;
        throw new Error(`no drawing for ${String(unknown)}`);
      }
    }
  });
}

/** Seen the same from every side: one drawing for both views. */
const SYMMETRIC = new Set<ObjectId>([
  'fence', 'fenceGate', 'hedge', 'flowerPot', 'flowersPink', 'flowersYellow', 'flowersWhite', 'pathStone', 'pathDirt', 'scarecrow', 'lantern', 'appleTree', 'pond',
  'bush', 'stump', 'rock', 'bigRock', 'teaTable', 'fountain',
]);

// -----------------------------------------------
// ANIMALS
// -----------------------------------------------

/**
 * Where a pen's animals stand, when the drawing says so (a pond for the ducks, the air above the hives): the
 * range of an animal sprite's top-left corner, in the pen sprite's pixels. Null: the scene uses the lower half.
 */
export function penAreaOf(id: PlaceableId, view: View): { x0: number; y0: number; x1: number; y1: number } | null {
  return LOT2_PEN_AREAS[id as Lot2Pen]?.[view] ?? null;
}

export function animalSprite(id: AnimalId, frame: 0 | 1): Sprite {
  return cached(`animal-${id}-${frame}`, () => animalArt(id, frame));
}

/** A rare animal, same canvas size and pose/frames as animalSprite of its kind. */
export function breedSprite(breed: BreedId, frame: 0 | 1): Sprite {
  return cached(`breed-${breed}-${frame}`, () => breedArt(breed, frame));
}

// -----------------------------------------------
// ICONS
// -----------------------------------------------


/** A round cookie with its animal's head iced on it (docs/ferme.md 17). */
const COOKIE_PAL = { a: COOKIE.dark, b: COOKIE.base, c: COOKIE.chip, w: '#ffffff', k: OUTLINE };
const PIE_ROWS = ['..aaaaa...', '.abbbbba..', 'abcbbbcba.', 'aaaaaaaaa.', '.ddddddd..'];

const ITEM_MAPS_LOT1: Record<Exclude<ItemId, Lot2Item>, PixelMap> = {
  wheat: { rows: ['....b....', '...bab...', '..b.a.b..', '..bab.b..', '...aba...', '..b.a.b..', '...bab...', '....a....', '....a....', '...a.a...', '..a...a..'], pal: { a: '#d9a339', b: '#f2c94c' } },
  corn: { rows: ['...bb...', '..bccb..', '..bccb..', '.abccb..', 'a.bccb.a', '.abccba.', '..abba..', '..a..a..', '.a....a.'], pal: { a: '#5aa54a', b: '#e9b93f', c: '#fbe38a' } },
  carrot: { rows: ['..a.a..', '...a...', '..aaa..', '.bbbb..', '.bcbbb.', '..bbbb.', '..bbb..', '...bb..', '...b...'], pal: { a: '#5aa54a', b: '#f08a4b', c: '#ffb27c' } },
  tomato: { rows: ['...a...', '..aaa..', '.bbabb.', 'bbcbbbb', 'bcbbbbb', 'bbbbbbd', '.bbbbd.', '..ddd..'], pal: { a: '#5aa54a', b: '#e0475b', c: '#ff8a96', d: '#b4353f' } },
  strawberry: { rows: ['..a.a..', '.aaaaa.', '.bbbbb.', 'bbcbbbb', 'bbbbcbb', 'bcbbbbb', '.bbbcb.', '..bbb..', '...b...'], pal: { a: '#5aa54a', b: '#e0475b', c: '#ffe9a8' } },
  sunflower: { rows: ['..a.a.a..', '.aaaaaaa.', 'aaabbbaaa', '.aabcbaa.', 'aaabbbaaa', '.aaaaaaa.', '..a.d.a..', '....d....', '...ed....', '....d....'], pal: { a: '#f2c94c', b: '#8a552b', c: '#c98a3c', d: '#468a3b', e: '#5aa54a' } },
  pumpkin: { rows: ['....a....', '....a....', '.bbcbcbb.', 'bbcbbbcbb', 'bdcbbbcbb', 'bbcbbbcbb', 'bbcbbbcbe', '.bbbbbbe.'], pal: { a: '#6b8a3a', b: '#f08a2b', c: '#d46a1f', d: '#ffb36a', e: '#c45a18' } },
  cotton: { rows: ['.aa..aa.', 'abbaabba', 'abbbbbba', '.abbbba.', 'abbbbbba', '.aabbaa.', '...cc...', '...cc...'], pal: { a: '#e3dccd', b: '#ffffff', c: '#9a6639' } },
  egg: { rows: ['..aaa..', '.aaaaa.', '.abaaa.', 'abbaaaa', 'abaaaaa', 'aaaaaac', 'aaaaaac', '.aaaac.', '..ccc..'], pal: { a: '#fff4e2', b: '#ffffff', c: '#e2cfb5' } },
  milk: { rows: ['..aa..', '..bb..', '.bccb.', 'bccccb', 'bdddcb', 'bdddcb', 'bccccb', '.bbbb.'], pal: { a: '#6a9fd8', b: '#c9d6e3', c: '#ffffff', d: '#8ab8e6' } },
  chickenFeed: {
    rows: ['..aaaaa..', '.abbrbba.', 'abbwwwbba', 'abwkwwoba', 'abbwwwbba', 'abcbbbcba', 'abbbcbbba', '.abbbbba.', '..aaaaa..'],
    pal: { ...COOKIE_PAL, r: '#e0475b', o: '#f2a33a' },
  },
  cowFeed: {
    rows: ['..aaaaa..', '.ahbbbha.', 'abwwwwwba', 'abwkwkwba', 'abwswwwba', 'abpppppba', 'abbcbbcba', '.abbbbba.', '..aaaaa..'],
    pal: { ...COOKIE_PAL, h: '#e8e0d2', s: '#4a3a3a', p: '#f5b3b8' },
  },
  flour: { rows: ['..aaaa..', '.a....a.', 'bbbbbbbb', 'bbccbbbb', 'bcbbbbbb', 'bbbbbbbb', 'bbbbbbbd', '.bbbbbd.'], pal: { a: '#c38a55', b: '#f4ece0', c: '#ffffff', d: '#d8ccbb' } },
  bread: { rows: ['..aaaaa...', '.abbbbba..', 'abcbcbcba.', 'abbbbbbbad', 'aabbbbbaad', '.aaaaaaad.', '..dddddd..'], pal: { a: '#c9813f', b: '#e6a85a', c: '#f6d08c', d: '#9a5f2c' } },
  carrotPie: { rows: PIE_ROWS, pal: { a: '#d9944f', b: '#f08a4b', c: '#ffb27c', d: '#9a5f2c' } },
  pumpkinPie: { rows: ['...aaaa...', '.aabbbbaa.', 'abcbacbcba', 'abbabbabba', 'aaaaaaaaaa', '.dddddddd.'], pal: { a: '#e0a35a', b: '#d9762a', c: '#f5a55a', d: '#9a5f2c' } },
  strawberryCake: { rows: ['...a..a...', '..bab.ab..', '.cccccccc.', '.cdccdccc.', '.eeeeeeee.', '.ffffffff.', '.eeeeeeee.', '.ffffffff.', 'gggggggggg', '.gggggggg.'], pal: { a: '#e0475b', b: '#5aa54a', c: '#fff4e8', d: '#ffd6e0', e: '#f2c98a', f: '#f7a1b5', g: '#dcd3e6' } },
  cream: { rows: ['..aaaa..', '.abbbba.', 'cccccccc', 'cddddddc', 'cdeeeddc', 'cddddddc', 'cddddddc', '.cddddc.', '..cccc..'], pal: { a: '#ffffff', b: '#fff6e6', c: '#4d7fb0', d: '#8ab8e6', e: '#ffffff' } },
  butter: { rows: ['...aaaaaa.', '..abbbbbac', '.aaaaaaacc', '.addddddcc', '.addddddc.', 'eeeeeeeee.'], pal: { a: '#ffe58a', b: '#fff3b8', c: '#e9c45a', d: '#f7d76a', e: '#c9d6e3' } },
  cheese: { rows: ['.......aa.', '.....aabba', '...aabbbba', '.aabbbbbba', 'acccccccca', 'acdccccdca', 'acccdcccca', 'aaaaaaaaaa'], pal: { a: '#d9a339', b: '#fbe38a', c: '#f2c94c', d: '#d9a339' } },
  thread: { rows: ['aaaaaaaa', '.bbbbbb.', '.cdcdcd.', '.dcdcdc.', '.cdcdcd.', '.dcdcdc.', '.cdcdcd.', '.dcdcdc.', '.bbbbbb.', 'aaaaaaaa'], pal: { a: '#9a6639', b: '#c38a55', c: '#e8789e', d: '#f7a1c4' } },
  fabric: { rows: ['.bbbbbbbbb', 'bcbcbcbcbc', 'cccccccccc', '.ddddddddd', 'dedededede', 'eeeeeeeeee', '.fffffffff', 'fgfgfgfgfg', 'gggggggggg'], pal: { b: '#ffc3da', c: '#e8789e', d: '#d4dff0', e: '#8ab8e6', f: '#fff1b8', g: '#e9c45a' } },
};

const ITEM_MAPS: Record<ItemId, PixelMap> = { ...ITEM_MAPS_LOT1, ...LOT2_ITEM_MAPS };

export function itemIcon(id: ItemId): Sprite {
  return cached(`item-${id}`, () => mapSprite(ITEM_MAPS[id].rows, ITEM_MAPS[id].pal));
}

const BOOSTER_MAPS: Record<BoosterId, PixelMap> = {
  fertilizer: { rows: ['.aaaaaa.', '.a.bb.a.', 'cccccccc', 'cddcdccc', 'ccdddccc', 'cccdcccc', 'cccccccc', '.cccccc.'], pal: { a: '#7a5a3a', b: '#5aa54a', c: '#e9c99a', d: '#5aa54a' } },
  wateringCan: { rows: ['....aaa..', '.....a...', 'b.cccccc.', '.bcddcccc', '..ccccccc', '..ccccccc', '...cccccc'], pal: { a: '#6a9fd8', b: '#4d7fb0', c: '#6a9fd8', d: '#a8d1f2' } },
  hourglass: { rows: ['aaaaaaa', '.bcccb.', '..bcb..', '...b...', '..bdb..', '.bdddb.', 'aaaaaaa'], pal: { a: '#9a6639', b: '#cfe6f2', c: '#f2c94c', d: '#e0a93a' } },
  helpingHand: { rows: ['..b.b.b..', '.bbbbbbb.', '.babbabb.', '.bbbbbbbb', '.bbbbbbab', 'abbbbbbba', 'abbbbbbba', '.abbbbba.', '..ccccc..', '..ccccc..'], pal: { a: '#d9a339', b: '#f2c94c', c: '#e0475b' } },
};

export function boosterIcon(id: BoosterId): Sprite {
  return cached(`booster-${id}`, () => mapSprite(BOOSTER_MAPS[id].rows, BOOSTER_MAPS[id].pal));
}

const MAGNIFIER = ['..aaaa....', '.abbbba...', 'abbdbbba..', 'abdddbba..', 'abbdbbba..', '.abbbba...', '..aaaa.c..', '.......cc.', '........cc', '.........c'];

const UI_MAPS: Record<UiIcon, PixelMap> = {
  nut: { rows: ['...a.a...', '..aabaa..', '.aabbbaa.', '.ccccccc.', 'ccddccccc', 'cddcccccc', 'cdccccccc', 'cccccccce', '.ccccccee', '..ceeee..'], pal: { a: '#8fbf5c', b: '#c3dd8f', c: '#b5763f', d: '#e6ad74', e: '#8a552b' } },
  star: { rows: ['....a....', '...aba...', 'aaaabaaaa', '.abbbbba.', '..abbba..', '.abbabba.', '.aa...aa.'], pal: { a: '#f2b632', b: '#ffe07a' } },
  chest: { rows: ['.aaaaaaaa.', 'abbbbbbbba', 'abbbccbbba', 'aaaacaaaaa', 'abbbccbbba', 'abbbbbbbba', 'aaaaaaaaaa'], pal: { a: '#8a5a3b', b: '#c38a55', c: '#f2c94c' } },
  barn: { rows: ['....aaaa....', '...abbbba...', '..abbbbbba..', '.abbbbbbbba.', 'aaaaaaaaaaaa', '.cccccccccc.', '.cddddddddc.', '.cdeedeeddc.', '.cdeeeeeedc.', '.cdedeedfdc.', '.cdeeeeeedc.', '.cccccccccc.'], pal: { a: '#b4474f', b: '#d9606a', c: '#f6e5c8', d: '#c45c4f', e: '#e07a6c', f: '#f2c94c' } },
  orders: { rows: ['...aaaa...', '.bbaccabb.', '.bddddddb.', '.bdeeeedb.', '.bddddddb.', '.bdeeeddb.', '.bddddddb.', '.bdeeeedb.', '.bddddddb.', '.bdeedddb.', '.bddddddb.', '.bbbbbbbb.'], pal: { a: '#9c958d', b: '#c38a55', c: '#e8e0d2', d: '#fffaf2', e: '#bdb6ae' } },
  quests: { rows: ['..aaaaaaa..', '.abbbbbbba.', 'abbbbcbbbba', 'abbbbcbbbba', 'abbbbcbbbba', 'abbbbcbbbba', 'abbbbbbbbba', 'abbbbcbbbba', '.abbbbbbba.', '..aaaab.aa.', '......ba...', '......a....'], pal: { a: '#d9a339', b: '#fff1b8', c: '#c0582f' } },
  shop: { rows: ['abababababab', 'abababababab', '.cccccccccc.', '.c........c.', '.c.de..fg..c', '.c.de..fg..c', 'hhhhhhhhhhhh', 'hiiiiiiiiiih', '.h........h.', '.h........h.'], pal: { a: '#e0475b', b: '#fffaf2', c: '#9a6639', d: '#f08a4b', e: '#5aa54a', f: '#f2c94c', g: '#e0475b', h: '#9a6639', i: '#c38a55' } },
  // "Amenager": a flower in its pot with a little sparkle, the cosy side of arranging the farm.
  build: {
    rows: ['.........s..', '...pp...sss.', '..pyyp...s..', '..pyyp......', '...pp.......', 'g...g...g...', 'gg..g..gg...', '.gg.g.gg....', 'rrrrrrrrrr..', '.tttttttdr..', '.tttttttdr..', '..ttttddd...'],
    pal: { p: '#f48fb1', y: '#ffd84a', s: '#ffe07a', g: '#5aa54a', r: '#b4553a', t: '#d9744f', d: '#b4553a' },
  },
  sack: { rows: ['..a..a..', '...aa...', '.bbbbbb.', 'bbcbbbbb', 'bcccbbbb', 'bbcbbbbb', 'bbbbbbbb', '.bbbbbb.'], pal: { a: '#9a6639', b: '#d98fb5', c: '#fff1b8' } },
  lock: { rows: ['..aaa..', '.a...a.', '.a...a.', 'bbbbbbb', 'bbbcbbb', 'bbcccbb', 'bbbcbbb', 'bbbbbbb'], pal: { a: '#9c958d', b: '#f2c94c', c: '#8a552b' } },
  sickle: { rows: ['..aaaa...', '.abb..a..', 'ab.....a.', 'a.......a', 'a........', '.a.......', '..aa.....', '....c....', '.....c...', '......c..', '.......c.'], pal: { a: '#cfd6dc', b: '#ffffff', c: '#9a6639' } },
  medal: { rows: ['ab...ba', 'ab...ba', '.ab.ba.', '..ccc..', '.cdddc.', 'cddeddc', 'cdeeedc', 'cddeddc', '.cdddc.', '..ccc..'], pal: { a: '#e0475b', b: '#6a9fd8', c: '#d9a339', d: '#f2c94c', e: '#fbe38a' } },
  parcel: { rows: ['....a.....', '....ab....', '....abb...', '....a.....', '....a.....', '.cccacccc.', 'ccdcccccdc', 'cccccdcccc', '.cccccccc.'], pal: { a: '#9a6639', b: '#e0475b', c: '#7cc456', d: '#5aa54a' } },
  gift: { rows: ['.aa...aa.', '..aabaa..', 'ccccacccc', 'ddddaddde', 'aaaaaaaaa', 'ddddaddde', 'ddddaddde', 'eeeeaeeee'], pal: { a: '#e0475b', b: '#a8303f', c: '#e8c48e', d: '#d9b27a', e: '#b88a55' } },
  bridge: { rows: ['a....a....a', 'aaaaaaaaaaa', 'bbbbbbbbbbb', 'b.b.b.b.b.b', 'ccccccccccc', 'd.........d', 'eeeeeeeeeee'], pal: { a: '#9a6639', b: '#c38a55', c: '#dcaa72', d: '#9a6639', e: '#6a9fd8' } },
  zoomIn: { rows: MAGNIFIER, pal: { a: '#9c958d', b: '#cfe6f2', c: '#9a6639', d: '#4a3135' } },
  zoomOut: { rows: MAGNIFIER.map((r, i) => (i === 2 || i === 4 ? r.replace('d', 'b') : r)), pal: { a: '#9c958d', b: '#cfe6f2', c: '#9a6639', d: '#4a3135' } },
  back: { rows: ['...a....', '..aa....', '.aaaaaaa', 'aaaaaaaa', '.aaaaaaa', '..aa....', '...a....'], pal: { a: '#fffaf2' } },
  rotate: { rows: ['...aaa....', '.aa...a...', '.a.....a..', 'a......a..', 'a....aaaaa', 'a.....aaa.', '.a.....a..', '.aa.......', '...aaa....'], pal: { a: '#fffaf2' } },
  brush: { rows: ['........aa', '.......aba', '......aba.', '.....aba..', '....cca...', '...cddc...', '..eddc....', '.eefe.....', 'eeee......', 'ee........'], pal: { a: '#8a5a3b', b: '#c38a55', c: '#9c958d', d: '#dad5ce', e: '#f06a96', f: '#ffb3cc' } },
  store: { rows: ['....a....', '....a....', '..aaaaa..', '...aaa...', '....a....', 'bbbbbbbbb', 'bcdcdcdcb', 'bdcdcdcdb', 'bbbbbbbbb'], pal: { a: '#5f8f33', b: '#9a6639', c: '#c38a55', d: '#dcaa72' } },
  check: { rows: ['........a', '.......aa', 'a.....aa.', 'aa...aa..', '.aa.aa...', '..aaa....', '...a.....'], pal: { a: '#7cc456' } },
  cross: { rows: ['aa...aa', '.aa.aa.', '..aaa..', '.aa.aa.', 'aa...aa'], pal: { a: '#e0475b' } },
  seed: { rows: ['aaaaaaaa', 'abbbbbba', 'abbcbbba', 'abcccbba', 'abbdbbba', 'abbdbbba', 'aeeeeeea', 'aaaaaaaa'], pal: { a: '#9a6639', b: '#efdcb6', c: '#5aa54a', d: '#468a3b', e: '#e0475b' } },
};

export function uiIcon(name: UiIcon): Sprite {
  return cached(`ui-${name}`, () => mapSprite(UI_MAPS[name].rows, UI_MAPS[name].pal));
}

// -----------------------------------------------
// SMALL PIECES
// -----------------------------------------------

export function readyBubble(): Sprite {
  return cached('bubble', () =>
    sprite(14, 15, (P) => {
      P.rect(1, 0, 12, 13, C.white);
      P.rect(0, 1, 14, 11, C.white);
      P.rect(5, 13, 4, 1, C.white);
      P.rect(6, 14, 2, 1, C.white);
    }),
  );
}

export function signSprite(): Sprite {
  return cached('sign', () =>
    sprite(16, 16, (P) => {
      P.rect(7, 7, 2, 9, C.woodDark);
      P.rect(0, 0, 16, 9, C.woodLight);
      P.rect(0, 8, 16, 1, C.wood);
      P.rect(1, 1, 14, 1, '#ecc58f');
      P.px(0, 0, C.wood);
      P.px(15, 0, C.wood);
      // A painted Eloisette: this land is for sale.
      P.map(5, 1, ['.a.a..', '.bbbb.', 'bccbbb', 'bcbbbd', '.bbdd.'], { a: '#5f8f33', b: '#b5763f', c: '#e6ad74', d: '#8a552b' });
    }),
  );
}

/** Wild undergrowth outside the farm: ferns and tall grass, never mistaken for a bramble to clear. */
export function fernSprite(seed: number): Sprite {
  const variant = ((seed % 3) + 3) % 3;
  return cached(`fern-${variant}`, () =>
    sprite(14, 12, (P) => {
      const dark = '#3f7a45';
      const mid = '#549450';
      const light = '#79b465';
      if (variant === 0) {
        // A fern: arched fronds with little leaflets.
        const frond = (x0: number, dir: 1 | -1, h: number) => {
          for (let i = 0; i < h; i++) {
            const x = x0 + Math.round(dir * (i * i) / (h * 1.6));
            const y = 11 - i;
            P.px(x, y, mid);
            if (i > 1 && i % 2 === 0) {
              P.px(x - 1, y, dark);
              P.px(x + 1, y, light);
            }
          }
        };
        frond(6, -1, 10);
        frond(7, 1, 11);
        frond(4, -1, 7);
        frond(9, 1, 8);
        P.px(6, 1, light);
        P.px(9, 0, light);
      } else if (variant === 1) {
        // Tall grass with a few seed heads.
        for (const [x, h, lean] of [[2, 7, -1], [4, 10, 0], [6, 8, 1], [8, 11, 0], [10, 9, 1], [12, 6, 1]] as const) {
          P.line(x, 11, x + lean, 11 - h, x % 4 === 0 ? mid : '#6f9a3a');
          P.px(x + lean, 11 - h, '#c9b05a');
        }
        P.rect(1, 10, 12, 2, dark);
      } else {
        // Long pointed leaves fanning out from one foot, like a wild lily: nothing round like a bush.
        for (const [x, top, lean] of [[2, 4, -1], [5, 1, 0], [8, 0, 0], [11, 3, 1]] as const) {
          for (let y = top; y <= 11; y++) {
            const t = (y - top) / (11 - top);
            const cx = x + Math.round(lean * (1 - t) * 2) + (x < 7 ? Math.round(t * 2) : -Math.round(t * 2));
            P.px(cx, y, t < 0.25 ? light : t < 0.7 ? mid : dark);
            if (t > 0.2 && t < 0.75) P.px(cx + 1, y, t < 0.45 ? light : mid);
          }
        }
      }
    }),
  );
}

// No yellow butterfly: it would pass for a bee out of its hive (lot 2).
const BUTTERFLY_COLORS: [string, string][] = [['#ff9ec4', '#ffd3e4'], ['#f4f1ea', '#ffffff'], ['#8fbfff', '#d3e6ff']];

/** A tiny butterfly; frame 0 wings open, 1 wings closed. */
export function butterflySprite(colour: 0 | 1 | 2, frame: 0 | 1): Sprite {
  return cached(`butterfly-${colour}-${frame}`, () => {
    const [wing, spot] = BUTTERFLY_COLORS[colour];
    const rows = frame === 0 ? ['aa.aa', 'abxba', '.axa.', '..x..'] : ['.a.a.', '.axa.', '..x..', '.....'];
    return mapSprite(rows, { a: wing, b: spot, x: OUTLINE });
  });
}

// -----------------------------------------------
// GROUND
// -----------------------------------------------

/** Tiles of ground drawn around the map on every side (forest edge, no more flat colour past the map). */
export const GROUND_MARGIN = 12;

const GROUND = {
  mown: [0xa0, 0xcc, 0x6c], mownLight: [0xb2, 0xd7, 0x7c], mownDark: [0x8e, 0xbb, 0x5e], clover: [0x98, 0xc8, 0x6e],
  meadow: [0x80, 0xae, 0x58], meadowLight: [0x8f, 0xbb, 0x63], meadowDark: [0x6d, 0x9b, 0x4b], meadowShade: [0x78, 0xa6, 0x53],
  forest: [0x4e, 0x7a, 0x44], forestLight: [0x5b, 0x88, 0x4d], forestDark: [0x40, 0x68, 0x3a],
  water: [0x5c, 0x9f, 0xd6], waterDark: [0x4a, 0x86, 0xbd], mud: [0x8f, 0x6a, 0x44], mudLight: [0xa8, 0x83, 0x56],
} as const;

/** A repeatable pseudo-random value in [0, 1) for a grid point. */
function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1): patches about `scale` pixels wide. */
function noise(x: number, y: number, scale: number, seed: number): number {
  const fx = x / scale;
  const fy = y / scale;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = fx - ix;
  const ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash2(ix, iy, seed) + (hash2(ix + 1, iy, seed) - hash2(ix, iy, seed)) * sx;
  const b = hash2(ix, iy + 1, seed) + (hash2(ix + 1, iy + 1, seed) - hash2(ix, iy + 1, seed)) * sx;
  return a + (b - a) * sy;
}

/**
 * The whole ground with GROUND_MARGIN tiles of forest floor around the map; map tile (0, 0) is at pixel
 * (GROUND_MARGIN * TILE, GROUND_MARGIN * TILE). Mown grass on the farm, meadow outside, the farm's edge wobbling
 * like real grass, the stream with its banks, the old bridge, the village road up to the gate.
 */
export function paintGround(owned: (x: number, y: number) => boolean, bridgeDone: boolean, gate: readonly [number, number]): HTMLCanvasElement {
  const M = GROUND_MARGIN * TILE;
  const size = MAP_SIZE * TILE + 2 * M;
  const c = canvas(size, size);
  const g = c.getContext('2d')!;
  const inMap = (tx: number, ty: number) => tx >= 0 && ty >= 0 && tx < MAP_SIZE && ty < MAP_SIZE;
  const water = (tx: number, ty: number) => isWater(tx, ty);
  type Region = 'mown' | 'meadow' | 'forest';
  const regionOfTile = (tx: number, ty: number): Region => (!inMap(tx, ty) ? 'forest' : owned(tx, ty) ? 'mown' : 'meadow');

  // Pixels first, straight into the image: textures, the wobbling edges, water and banks.
  const image = g.createImageData(size, size);
  const data = image.data;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const wx = px - M;
      const wy = py - M;
      const tx = Math.floor(wx / TILE);
      const ty = Math.floor(wy / TILE);
      const h = hash2(px, py, 7);
      let col: readonly number[];
      if (water(tx, ty)) {
        const lx = wx - tx * TILE;
        const ly = wy - ty * TILE;
        // A bank of uneven width wherever the water meets land.
        const bank = 2 + Math.floor(noise(wx, wy, 5, 11) * 2.5);
        const nearLand = (!water(tx - 1, ty) && lx < bank) || (!water(tx + 1, ty) && lx >= TILE - bank) || (!water(tx, ty - 1) && ly < bank) || (!water(tx, ty + 1) && ly >= TILE - bank);
        const nearBank = (!water(tx - 1, ty) && lx < bank + 1) || (!water(tx + 1, ty) && lx >= TILE - bank - 1) || (!water(tx, ty - 1) && ly < bank + 1) || (!water(tx, ty + 1) && ly >= TILE - bank - 1);
        col = nearLand ? (h < 0.3 ? GROUND.mudLight : GROUND.mud) : nearBank ? GROUND.waterDark : noise(wx, wy * 2, 7, 12) > 0.72 ? GROUND.waterDark : GROUND.water;
      } else {
        // The region of a jittered point: borders between grass kinds wobble and dither instead of running straight.
        const jx = wx + Math.round((noise(wx, wy, 11, 1) - 0.5) * 14 + (noise(wx, wy, 4, 4) - 0.5) * 5) + (h < 0.25 ? 1 : 0);
        const jy = wy + Math.round((noise(wx, wy, 11, 2) - 0.5) * 14 + (noise(wx, wy, 4, 5) - 0.5) * 5) + (h > 0.75 ? 1 : 0);
        const sx = Math.floor(jx / TILE);
        const sy = Math.floor(jy / TILE);
        const region = water(sx, sy) ? regionOfTile(tx, ty) : regionOfTile(sx, sy);
        const patch = noise(wx, wy, 9, 3);
        if (region === 'mown') col = h < 0.05 ? GROUND.mownLight : h > 0.95 ? GROUND.mownDark : patch > 0.72 ? GROUND.clover : GROUND.mown;
        else if (region === 'meadow') col = h < 0.07 ? GROUND.meadowLight : h > 0.92 ? GROUND.meadowDark : patch > 0.68 ? GROUND.meadowShade : GROUND.meadow;
        else col = patch > 0.6 ? GROUND.forestDark : h < 0.06 ? GROUND.forestLight : GROUND.forest;
      }
      const i = (py * size + px) * 4;
      data[i] = col[0];
      data[i + 1] = col[1];
      data[i + 2] = col[2];
      data[i + 3] = 255;
    }
  }
  g.putImageData(image, 0, 0);

  // Then the details, drawn tile by tile with a fixed seed: the ground looks the same at every visit.
  const r = mulberry32(21);
  const dot = (x: number, y: number, w: number, hh: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x + M, y + M, w, hh);
  };
  const tuft = (x: number, y: number, tall: number, dark: string, light: string) => {
    dot(x, y - tall + 1, 1, tall, dark);
    dot(x - 1, y - tall + 2, 1, tall - 1, dark);
    dot(x + 1, y - tall + 3, 1, tall - 2, dark);
    dot(x, y - tall + 1, 1, 1, light);
  };
  const flower = (x: number, y: number, petal: string) => {
    dot(x, y - 1, 1, 1, petal);
    dot(x - 1, y, 1, 1, petal);
    dot(x + 1, y, 1, 1, petal);
    dot(x, y + 1, 1, 1, petal);
    dot(x, y, 1, 1, '#f2c94c');
  };
  const FLOWERS = ['#ffc0d6', '#fff6e0', '#ffe27a', '#d7c2ff'];
  for (let ty = -GROUND_MARGIN; ty < MAP_SIZE + GROUND_MARGIN; ty++) {
    for (let tx = -GROUND_MARGIN; tx < MAP_SIZE + GROUND_MARGIN; tx++) {
      const X = tx * TILE;
      const Y = ty * TILE;
      const at = () => [X + 2 + Math.floor(r() * 12), Y + 3 + Math.floor(r() * 11)] as const;
      if (water(tx, ty)) {
        for (let i = 0; i < 2; i++) {
          const [x, y] = at();
          dot(x, y, 3, 1, C.waterLight);
        }
        if (r() < 0.3) dot(X + 4 + Math.floor(r() * 8), Y + 4 + Math.floor(r() * 8), 1, 1, '#ffffff');
        continue;
      }
      const region = regionOfTile(tx, ty);
      if (region === 'mown') {
        if (r() < 0.16) {
          const petal = FLOWERS[Math.floor(r() * FLOWERS.length)];
          const [x, y] = at();
          flower(x, y, petal);
          if (r() < 0.6) flower(x + 3 - Math.floor(r() * 7), y + 3, petal);
        }
        if (r() < 0.12) {
          const [x, y] = at();
          dot(x, y, 2, 1, '#b8955f');
          dot(x + 1, y + 1, 1, 1, '#a3814f');
        }
        for (let i = 0; i < 2; i++) {
          const [x, y] = at();
          dot(x, y, 1, 2, '#bfe08a');
        }
      } else if (region === 'meadow') {
        for (let i = 0; i < 3; i++) {
          const [x, y] = at();
          tuft(x, y, 3 + Math.floor(r() * 2), '#5c8a40', '#9cc46a');
        }
        if (r() < 0.08) {
          const [x, y] = at();
          flower(x, y, r() < 0.5 ? '#fff6e0' : '#ffe27a');
        }
        // Taller grass all along the farm's edge, on the meadow side.
        const edges: [number, number, (i: number) => [number, number]][] = [
          [tx, ty - 1, (i) => [X + i, Y + 4]], [tx, ty + 1, (i) => [X + i, Y + 14]],
          [tx - 1, ty, (i) => [X + 3, Y + i]], [tx + 1, ty, (i) => [X + 12, Y + i]],
        ];
        for (const [nx, ny, spot] of edges) {
          if (!inMap(nx, ny) || !owned(nx, ny) || water(nx, ny)) continue;
          for (let i = 1 + Math.floor(r() * 3); i < TILE - 1; i += 3 + Math.floor(r() * 5)) {
            if (r() < 0.25) continue;
            const [x, y] = spot(i);
            tuft(x, y + Math.floor(r() * 4) - 1, 4 + Math.floor(r() * 3), r() < 0.5 ? '#5f8f3e' : '#6b9a45', '#a8d070');
          }
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const [x, y] = at();
          dot(x, y, 1 + Math.floor(r() * 2), 1, r() < 0.5 ? '#7a6a3a' : '#8f7a44');
        }
        for (let i = 0; i < 2; i++) {
          const [x, y] = at();
          tuft(x, y, 4, '#355a31', '#5f8f4f');
        }
        if (r() < 0.04) {
          const [x, y] = at();
          dot(x, y, 3, 1, '#d9534f');
          dot(x + 1, y - 1, 1, 1, '#d9534f');
          dot(x + 1, y + 1, 1, 2, '#f3e9d8');
          dot(x, y, 1, 1, '#ffffff');
        }
      }
      // Pebbles and reeds on land along the stream.
      const touchesWater = water(tx - 1, ty) || water(tx + 1, ty) || water(tx, ty - 1) || water(tx, ty + 1);
      if (touchesWater) {
        const side = water(tx + 1, ty) ? [X + 13, Y] : water(tx - 1, ty) ? [X + 1, Y] : water(tx, ty + 1) ? [X, Y + 13] : [X, Y + 1];
        const alongX = water(tx, ty + 1) || water(tx, ty - 1);
        for (let i = 0; i < 3; i++) {
          const k = 2 + Math.floor(r() * 12);
          const [x, y] = alongX ? [side[0] + k, side[1]] : [side[0], side[1] + k];
          dot(x, y, 2, 1, r() < 0.5 ? '#c9c1b4' : '#a59d90');
        }
        if (r() < 0.7) {
          const k = 2 + Math.floor(r() * 11);
          const [x, y] = alongX ? [side[0] + k, side[1] + 2] : [side[0], side[1] + k + 2];
          for (const dx of [0, 2]) {
            dot(x + dx, y - 4, 1, 5, '#5f8a3a');
            dot(x + dx, y - 6, 1, 2, '#7a4f2e');
          }
        }
      }
    }
  }

  paintRoad(g, gate);
  paintBridge(dot, bridgeDone);
  return c;
}

const ROAD = { base: [0xc9, 0xa0, 0x6c], light: [0xd8, 0xb4, 0x80], dark: [0xb6, 0x8c, 0x5c], rim: [0xa2, 0x7b, 0x52] } as const;

/**
 * The village road: a dirt track with wobbling edges and two wheel ruts, coming up from the south edge of the forest
 * to the farm's gate, where it widens into a small yard for the villagers who wait. Painted over the grass details
 * so no tuft grows in it.
 */
function paintRoad(g: CanvasRenderingContext2D, gate: readonly [number, number]): void {
  const M = GROUND_MARGIN * TILE;
  const centre = gate[0] * TILE + 8;
  const yard = { y: gate[1] * TILE + 9, rx: 27, ry: 7.5 };
  const top = gate[1] * TILE - 3;
  const left = centre - yard.rx - 3;
  const width = 2 * (yard.rx + 3);
  const height = (MAP_SIZE + GROUND_MARGIN) * TILE - top;
  const image = g.getImageData(left + M, top + M, width, height);
  const data = image.data;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const wx = left + px;
      const wy = top + py;
      const wobble = noise(0, wy, 9, 31) * 2.2;
      // How far inside the dirt, in pixels: the track, or the yard's wobbling oval.
      const track = 5 + wobble - Math.abs(wx + 0.5 - centre);
      const oval = 1 - Math.hypot((wx + 0.5 - centre) / (yard.rx + noise(wx, 0, 6, 34) * 4), (wy + 0.5 - yard.y) / yard.ry);
      const inside = Math.max(wy >= yard.y ? track : -1, oval * yard.ry);
      if (inside < 0) continue;
      const h = hash2(wx, wy, 35);
      const rut = wy > yard.y + yard.ry && Math.abs(Math.abs(wx + 0.5 - centre) - 2.5) < 0.8 && h < 0.75;
      const col = inside < 1.2 ? ROAD.rim : rut ? ROAD.dark : h < 0.07 ? ROAD.light : h > 0.95 ? ROAD.dark : ROAD.base;
      const i = (py * width + px) * 4;
      data[i] = col[0];
      data[i + 1] = col[1];
      data[i + 2] = col[2];
    }
  }
  g.putImageData(image, left + M, top + M);
  // A few pebbles in the dust.
  const r = mulberry32(41);
  for (let y = yard.y + 8; y < top + height - 4; y += 6 + Math.floor(r() * 10)) {
    g.fillStyle = r() < 0.5 ? '#e6d6b8' : '#9c8a70';
    g.fillRect(centre - 3 + Math.floor(r() * 7) + M, y + M, 1, r() < 0.3 ? 2 : 1);
  }
}

/** The bridge across the stream, west to east, over BRIDGE_TILES. */
function paintBridge(dot: (x: number, y: number, w: number, h: number, col: string) => void, done: boolean): void {
  const xs = BRIDGE_TILES.map(([x]) => x);
  const ys = BRIDGE_TILES.map(([, y]) => y);
  const left = Math.min(...xs) * TILE - 3;
  const right = (Math.max(...xs) + 1) * TILE + 3;
  const top = Math.min(...ys) * TILE + 2;
  const bottom = (Math.max(...ys) + 1) * TILE - 2;
  const width = right - left;
  if (done) {
    dot(left, top + 2, width, bottom - top - 2, '#9a6639');
    for (let x = left; x < right; x += 3) {
      dot(x, top + 2, 2, bottom - top - 3, C.wood);
      dot(x, top + 2, 2, 1, C.woodLight);
    }
    dot(left, bottom - 1, width, 1, '#7a4f2e');
    for (const y of [top, bottom - 4]) {
      dot(left, y, width, 2, C.woodLight);
      dot(left, y + 2, width, 1, '#7a4f2e');
      for (let x = left; x <= right - 2; x += 8) dot(x, y - 3, 2, 5, C.woodDark);
      dot(right - 2, y - 3, 2, 5, C.woodDark);
    }
    dot(left - 1, top - 4, 3, 2, OUTLINE);
    return;
  }
  // Broken: a few planks left, gaps over the water, a fallen rail.
  const planks = [0, 1, 2, 5, 6, 9];
  planks.forEach((i) => {
    const x = left + i * 3;
    if (x + 2 > right) return;
    dot(x, top + 3, 2, bottom - top - 6, '#a9774a');
    dot(x, top + 3, 2, 1, '#c79466');
    dot(x, bottom - 3, 2, 1, '#6f4630');
  });
  dot(left, top + 1, 2, 5, C.woodDark);
  dot(right - 2, bottom - 7, 2, 5, C.woodDark);
  dot(left + 2, top + 1, 8, 2, '#a9774a');
  dot(right - 12, bottom - 5, 10, 2, '#a9774a');
  dot(left + 12, bottom - 2, 5, 1, C.waterLight);
}

// -----------------------------------------------
// DOM IMAGES
// -----------------------------------------------

const urls = new WeakMap<Sprite, string>();

export function spriteImage(s: Sprite, scale: number, alt = ''): HTMLImageElement {
  let url = urls.get(s);
  if (!url) {
    url = s.toDataURL();
    urls.set(s, url);
  }
  const img = document.createElement('img');
  img.src = url;
  img.width = s.width * scale;
  img.height = s.height * scale;
  img.alt = alt;
  img.draggable = false;
  img.style.imageRendering = 'pixelated';
  return img;
}

// -----------------------------------------------
// DEVELOPMENT BOARD
// -----------------------------------------------

const BOARD_CROPS: CropId[] = ['wheat', 'corn', 'carrot', 'tomato', 'strawberry', 'sunflower', 'pumpkin', 'cotton'];
const BOARD_GARDEN: GardenDecor[] = [
  'tulips', 'lavender', 'sunflowers', 'hydrangeas', 'climbingRose', 'planter', 'wateringCan', 'flowerBarrel', 'candleJar',
  'picnicTable', 'deckChair', 'parasol', 'hammock', 'porchSwing', 'birdBath', 'lilyPond', 'gardenBridge', 'lamppost',
  'stringLights', 'weathervane', 'flowerCart', 'pergola', 'bandstand', 'greenhouse', 'treehouse', 'dovecote', 'carousel', 'hedgeMaze',
];
const BOARD_OBJECTS: ObjectId[] = [
  'cookiery', 'mill', 'bakery', 'dairy', 'spinning', 'coop', 'cowshed',
  'fence', 'pathDirt', 'hedge', 'flowersPink', 'pathStone', 'flowersYellow', 'scarecrow', 'flowersWhite', 'bench', 'well',
  'logPile', 'wheelbarrow', 'appleTree', 'lantern', 'birdhouse', 'pond', 'bush', 'stump', 'rock', 'bigRock',
];
const BOARD_TREASURES: ObjectId[] = ['gnome', 'hayBales', 'teaTable', 'flowerArch', 'swing', 'fountain'];
const BOARD_ITEMS: ItemId[] = [
  'wheat', 'corn', 'carrot', 'tomato', 'strawberry', 'sunflower', 'pumpkin', 'cotton', 'egg', 'milk', 'chickenFeed', 'cowFeed',
  'flour', 'bread', 'carrotPie', 'strawberryCake', 'pumpkinPie', 'cream', 'butter', 'cheese', 'thread', 'fabric',
];
const BOARD_BOOSTERS: BoosterId[] = ['fertilizer', 'wateringCan', 'hourglass', 'helpingHand'];
const BOARD_PEOPLE: PersonId[] = ['marthe', 'leon', 'rosalie', 'basile', 'jules', 'capucine', 'gaston', 'pivoine'];
const BOARD_UI = Object.keys(UI_MAPS) as UiIcon[];

/** '#' a fence, 'G' a gate: every shape a piece can take, as the scene stacks them. */
const BOARD_YARD = [
  '............',
  '.#######....',
  '.#.....#..#.',
  '.#.....####.',
  '.#.....G..#.',
  '.###G###....',
  '.........#..',
  '..###.......',
];

function fenceYard(skin: SkinId): Sprite {
  const c = canvas(BOARD_YARD[0].length * TILE, BOARD_YARD.length * TILE);
  const g = c.getContext('2d')!;
  g.fillStyle = '#86c45f';
  g.fillRect(0, 0, c.width, c.height);
  const at = (x: number, y: number) => (BOARD_YARD[y]?.[x] ?? '.') !== '.';
  BOARD_YARD.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const mask = (at(x, y - 1) ? JOIN_NORTH | (BOARD_YARD[y - 1][x] === 'G' ? JOIN_NORTH_GATE : 0) : 0) | (at(x + 1, y) ? JOIN_EAST : 0) | (at(x, y + 1) ? JOIN_SOUTH : 0) | (at(x - 1, y) ? JOIN_WEST : 0);
    g.drawImage(fenceSprite(skin, mask, ch === 'G'), x * TILE, (y + 1) * TILE - FENCE_H + 1);
  }));
  return c;
}

/** Every drawing, labelled, at 3x: to read the whole art at a glance. */
export function artBoard(): HTMLElement {
  const board = document.createElement('div');
  board.style.cssText = 'background:#8ccb68;padding:12px;font:12px system-ui,sans-serif;color:#3b2a3f';
  const section = (title: string, cells: [Sprite, string][], scale = 3) => {
    const h = document.createElement('h3');
    h.textContent = title;
    h.style.margin = '14px 0 6px';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end';
    for (const [s, label] of cells) {
      const cell = document.createElement('figure');
      cell.style.cssText = 'margin:0;display:grid;justify-items:center;gap:2px';
      const caption = document.createElement('figcaption');
      caption.textContent = label;
      cell.append(spriteImage(s, scale, label), caption);
      row.append(cell);
    }
    board.append(h, row);
  };
  const stages = ['sprout', 'growing', 'ripe'] as const;
  // A field as the scene stacks it: three soil tiles side by side, the plants on each, frame 0 / 1 / 0.
  const plot = (crop: CropId, stage: (typeof stages)[number]): Sprite => {
    const c = canvas(3 * TILE + 2, 26);
    const g = c.getContext('2d')!;
    for (let i = 0; i < 3; i++) {
      g.drawImage(soilTile(), 1 + i * TILE, 9);
      g.drawImage(cropSprite(crop, stage, (i % 2) as 0 | 1), i * TILE, 0);
    }
    return c;
  };
  section('Champs (sol + plantes, vent au milieu)', [[soilTile(), 'sol'], ...BOARD_CROPS.flatMap((crop) => stages.map((st): [Sprite, string] => [plot(crop, st), `${crop} ${st}`]))]);
  section('Champs (boutique, fantôme)', [[fieldSprite(null, 'empty'), 'vide'], ...BOARD_CROPS.map((crop): [Sprite, string] => [fieldSprite(crop, 'ripe'), crop])]);
  section('Sauvage, papillons', [
    [fernSprite(0), 'fougère'], [fernSprite(1), 'hautes herbes'], [fernSprite(2), 'touffe'], [objectSprite('bush', 'face'), 'ronces (à dégager)'],
    ...([0, 1, 2] as const).flatMap((col): [Sprite, string][] => [[butterflySprite(col, 0), `papillon ${col}`], [butterflySprite(col, 1), 'ailes fermées']]),
    [signSprite(), 'panneau'],
  ], 4);
  section('Barrières : un enclos par style (angles, T, bouts, poteau seul, portillons)', SKINS.map((s): [Sprite, string] => [fenceYard(s.id), s.name]), 3);
  section('Objets (face / profil)', BOARD_OBJECTS.flatMap((id): [Sprite, string][] => [[objectSprite(id, 'face'), `${id}`], [objectSprite(id, 'profile'), `${id} profil`]]));
  section('Arbres, ailes', [
    [treeSprite('hazel', false), 'noisetier'], [treeSprite('hazel', true), 'noisetier prêt'], [treeSprite('apple', true), 'pommier prêt'], [treeSprite('cherry', true), 'cerisier prêt'],
    [wildTreeSprite(0), 'sauvage 0'], [wildTreeSprite(1), 'sauvage 1'], [wildTreeSprite(2), 'sauvage 2'],
    [millSails('face', 0), 'ailes 0'], [millSails('face', 1), 'ailes 1'], [millSails('profile', 0), 'ailes profil 0'], [millSails('profile', 1), 'ailes profil 1'],
    [readyBubble(), 'bulle'], [signSprite(), 'panneau'],
  ]);
  section('Trésors des colis (face / profil)', BOARD_TREASURES.flatMap((id): [Sprite, string][] => [[objectSprite(id, 'face'), `${id}`], [objectSprite(id, 'profile'), `${id} profil`]]));
  section('Grand lot de décos (face / profil)', BOARD_GARDEN.flatMap((id): [Sprite, string][] => GARDEN_SYMMETRIC.has(id)
    ? [[objectSprite(id, 'face'), id]]
    : [[objectSprite(id, 'face'), id], [objectSprite(id, 'profile'), `${id} profil`]]));
  section('Chemins du grand lot (bout, ligne, angle, croisement)', (['pathFlag', 'pathGravel', 'pathPlank'] as const).flatMap((id): [Sprite, string][] => [
    [joinedSprite(id, null, 0), id], [joinedSprite(id, null, JOIN_EAST | JOIN_WEST), 'ligne'], [joinedSprite(id, null, JOIN_EAST | JOIN_SOUTH), 'angle'], [joinedSprite(id, null, 15), 'croisement'],
  ]), 4);
  section('Gaston et ses colis', [
    [objectSprite('mailbox', 'face'), 'boîte'], [mailboxSprite(true, 'face'), 'boîte + courrier'],
    [objectSprite('mailbox', 'profile'), 'boîte profil'], [mailboxSprite(true, 'profile'), 'profil + courrier'],
    [parcelSprite(null), 'colis'], [parcelSprite('common'), 'commun'], [parcelSprite('rare'), 'rare'], [parcelSprite('epic'), 'épique'], [parcelSprite('legendary'), 'légendaire'],
    [heartSprite(), 'cœur'],
  ], 4);
  section('Animaux (repos / geste)', (['chicken', 'cow', 'sheep', 'pig', 'bee', 'goat', 'duck', 'rabbit'] as const).flatMap((id): [Sprite, string][] => [[animalSprite(id, 0), id], [animalSprite(id, 1), `${id} 1`]]), 4);
  section('Races rares', (['redHen', 'goldenHen', 'pinkCow', 'blackSheep', 'spottedPig', 'queenBee', 'snowGoat', 'mandarinDuck', 'lopRabbit'] as const).flatMap((b): [Sprite, string][] => [[breedSprite(b, 0), b], [breedSprite(b, 1), `${b} 1`]]), 4);
  section('Produits', BOARD_ITEMS.map((id): [Sprite, string] => [itemIcon(id), id]));
  section('Boosters', BOARD_BOOSTERS.map((id): [Sprite, string] => [boosterIcon(id), id]));
  section('Interface', BOARD_UI.map((id): [Sprite, string] => [uiIcon(id), id]));
  section('Visages', BOARD_PEOPLE.map((id): [Sprite, string] => [faceSprite(id), id]), 4);
  // The starting farm plus one parcel bought to the west, to see an L-shaped edge.
  const own = (x: number, y: number) => (x >= 6 && x < 18 && y >= 6 && y < 18) || (x >= 0 && x < 6 && y >= 6 && y < 12);
  const gate: [number, number] = [ROAD_COLUMN, 18];
  section('Sol', [[paintGround(own, false, gate), 'pont cassé'], [paintGround(own, true, gate), 'pont réparé']], 1);
  return board;
}
