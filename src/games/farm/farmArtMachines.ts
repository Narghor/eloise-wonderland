import {
  sprite, C, DOOR, DOOR_BLUE, GLINT, IRON, IRON_LIGHT, TIMBER, TIMBER_LIGHT, WARM_STONE, ROOF_BRETON, ROOF_CHOCO, ROOF_LAVENDER,
  ROOF_MOSS, ROOF_MUSTARD, ROOF_SKY, ROOF_TEAL, THATCH,
  eave, framedWindow, plankDoor, planks, stones, tiledGable, tiledRoof,
  type Painter, type Sprite, type Tones, type View,
} from './farmPaint';

// -----------------------------------------------
// LOT 2 MACHINES (2 x 2), face and profile (docs/ferme.md 18)
// -----------------------------------------------
// Built from the same kit as lot 1's (farmPaint.ts); farmArt.objectSprite caches them.

export type Lot2Machine = 'refinery' | 'press' | 'jamKitchen' | 'candyShop' | 'sewing' | 'iceCream' | 'soapWorks' | 'creperie';

export function lot2Machine(id: Lot2Machine, view: View): Sprite {
  switch (id) {
    case 'refinery': return refinery(view);
    case 'press': return press(view);
    case 'jamKitchen': return jamKitchen(view);
    case 'candyShop': return candyShop(view);
    case 'sewing': return sewing(view);
    case 'iceCream': return iceCream(view);
    case 'soapWorks': return soapWorks(view);
    case 'creperie': return creperie(view);
  }
}

/** Top of each chimney, in sprite pixels (margin included): where the scene lets smoke rise while it works. */
export const LOT2_CHIMNEYS: Partial<Record<Lot2Machine, Partial<Record<View, { x: number; y: number }>>>> = {
  refinery: { face: { x: 25, y: 0 }, profile: { x: 26, y: 0 } },
  jamKitchen: { face: { x: 7, y: 0 }, profile: { x: 23, y: 0 } },
  creperie: { face: { x: 26, y: 0 }, profile: { x: 16, y: 0 } },
  press: { face: { x: 23, y: 0 }, profile: { x: 22, y: 0 } },
  candyShop: { face: { x: 25, y: 4 }, profile: { x: 23, y: 4 } },
  sewing: { face: { x: 25, y: 0 }, profile: { x: 22, y: 1 } },
  iceCream: { face: { x: 6, y: 6 }, profile: { x: 22, y: 4 } },
  soapWorks: { face: { x: 7, y: 2 }, profile: { x: 9, y: 3 } },
};

// -----------------------------------------------
// TONES
// -----------------------------------------------

const DOOR_TEAL: Tones = ['#a6dfd3', '#5aa596', '#438579', '#2f6158'];
const DOOR_BRETON: Tones = ['#8fbaf0', '#3d7cc4', '#2f62a0', '#234a7a'];
const DOOR_PINK: Tones = ['#ffd0e0', '#f27aa8', '#d4568a', '#a8526c'];
const GRANITE = [C.greyLight, C.grey, C.greyDark] as const;
const STRAWBERRY = '#e0475b';
const APRICOT = '#f0902c';
const PLUM = '#8a3a78';
const CANDY_PINK = '#f27aa8';
const CANDY_PINK_DARK = '#d4568a';
const CANDY_BLUE = '#5b9be0';
const IRON_PIPE = [IRON_LIGHT, IRON, '#463836'] as const;
const COPPER_PIPE = ['#f0b080', '#d08850', '#a86838'] as const;
const CANDY_PIPE = [C.white, '#f7e6ec', '#e0c6d0'] as const;

// -----------------------------------------------
// SHARED PIECES
// -----------------------------------------------

function brickChimney(P: Painter, x: number, w: number, h: number): void {
  P.rect(x, 0, w, h, C.brick);
  for (let y = 4; y < h; y += 5) P.rect(x, y, w, 1, C.brickDark);
  P.rect(x, 1, 1, h - 1, '#e08a6a');
  P.rect(x - 1, 0, w + 2, 2, C.brickDark);
}

function stoneChimney(P: Painter, x: number, y: number, w: number, h: number): void {
  stones(P, x, y, w, h, GRANITE);
  P.rect(x, y, 1, h, C.greyLight);
  P.rect(x + w - 1, y, 1, h, C.greyDark);
  P.rect(x - 1, y, w + 2, 2, C.greyDark);
  P.rect(x - 1, y, w + 2, 1, '#8a827a');
}

/** A small stovepipe three pixels wide (light, base, dark), its cap one pixel wider each side, stripes if given. */
function stovepipe(P: Painter, x: number, top: number, h: number, t: readonly [string, string, string], cap: string, stripe?: string): void {
  P.rect(x, top, 3, h, t[1]);
  P.rect(x, top, 1, h, t[0]);
  P.rect(x + 2, top, 1, h, t[2]);
  if (stripe) for (let y = top + 3; y < top + h; y += 3) P.rect(x, y, 3, 1, stripe);
  P.rect(x - 1, top, 5, 2, cap);
  P.px(x - 1, top, t[0]);
}

/** The soap works' sign (16 x 8): a pink bar with a dark rim and a paper wrapper band, foam on top, a bubble beside it. */
function soapSign(P: Painter, x: number, y: number): void {
  P.map(x, y, [
    '..ww.www...',
    '.wwswwwkkk.',
    'kwswwswbbtk',
    'kttttttbbtk',
    'kppppppBBpk',
    'kppppppLBpk',
    'kppppppBBpk',
    '.kkkkkkkkk.',
  ], { w: C.white, s: '#d6ecfa', k: '#9a4a6e', t: '#fde0ea', p: '#f9b8d0', b: '#fff6e4', B: '#efe0c4', L: ROOF_LAVENDER[2] });
  P.px(x + 2, y + 3, GLINT);
  bubble(P, x + 13, y + 3, 2);
}

/** A striped awning: three rows of stripes, its scalloped edge one row lower. */
function awning(P: Painter, x: number, y: number, w: number, a: string, b: string): void {
  for (let i = 0; i < w; i += 2) {
    const col = i % 4 === 0 ? a : b;
    P.rect(x + i, y, Math.min(2, w - i), 3, col);
    P.px(x + i + 1, y + 3, col);
  }
}

/** Gingham: red and white checks. */
function gingham(P: Painter, x: number, y: number, w: number, h: number): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) P.px(x + i, y + j, (i + j) % 2 ? C.white : STRAWBERRY);
}

/** A tall factory window with a round top. */
function archWindow(P: Painter, x: number, y: number, w: number, h: number, frame: string): void {
  framedWindow(P, x, y, w, h, { frame });
  P.rect(x, y - 2, w, 1, frame);
  P.rect(x + 1, y - 3, w - 2, 1, frame);
  P.rect(x + 1, y - 2, w - 2, 1, '#e8b54a');
}

/** The shop's big jam jar (9 x 11): gingham lid, glass rim, round red body, a label. */
function bigJamJar(P: Painter, x: number, y: number): void {
  P.map(x, y, [
    '.ggggggg.',
    'ggggggggg',
    '.ggggggg.',
    '..nnnnn..',
    '.jjjjjjd.',
    'jhjjjjjdd',
    'jhjllljdd',
    'jhjllljdd',
    'jjjjjjjdd',
    '.jjjjjdd.',
    '..ddddd..',
  ], { g: STRAWBERRY, n: '#f6e6e8', j: STRAWBERRY, h: '#ffb0b8', d: '#b8303f', l: '#fff3dc' });
  for (let j = 0; j < 3; j++) for (let i = 0; i < 9; i++) if ((i + j) % 2 && !(j !== 1 && (i === 0 || i === 8))) P.px(x + i, y + j, C.white);
}

/** A jar of jam: a gingham lid, a glass rim, the jam inside with a highlight on the left. */
function jamJar(P: Painter, x: number, y: number, w: number, h: number, jam: string): void {
  const lid = w > 3 ? 1 : 0;
  gingham(P, x - lid, y, w + 2 * lid, 2);
  P.rect(x, y + 2, w, 1, '#f6e6e8');
  P.rect(x, y + 3, w, h - 4, jam);
  P.rect(x + 1, y + h - 1, w - 2, 1, jam);
  P.rect(x + w - 1, y + 3, 1, h - 4, '#00000040');
  if (w > 3) P.rect(x + 1, y + 4, 1, h - 6, '#ffc0c8');
  if (w > 5) P.rect(x + 2, y + 5, w - 4, 2, '#fff3dc');
}

/** A sugar cube seen a little from above (6 x 6 with its edges). */
function sugarCube(P: Painter, x: number, y: number): void {
  P.map(x, y, [
    'eeeeee',
    'etttse',
    'effsse',
    'effsse',
    'efffse',
    'eeeeee',
  ], { e: '#8f9cac', t: '#ffffff', f: '#f1ede6', s: '#c4cfdb' });
  P.px(x + 1, y + 2, GLINT);
}

/** Three sugar cubes in a little pyramid (11 x 11), a sparkle beside it. */
function sugarCubes(P: Painter, x: number, y: number): void {
  sugarCube(P, x, y + 5);
  sugarCube(P, x + 5, y + 5);
  sugarCube(P, x + 2, y);
  for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1], [0, 0]] as const) P.px(x - 2 + dx, y + 2 + dy, GLINT);
}

/** A tied burlap sack with a blue band, like the old sugar sacks (7 x 8). */
function sugarSack(P: Painter, x: number, y: number): void {
  P.map(x, y, [
    '.k...k.',
    '..kkk..',
    '.lbbbd.',
    'lbbbbdd',
    'luuuuvd',
    'lbbbbdd',
    'lbbbbdd',
    '.bbbdd.',
  ], { k: '#8f6c40', l: '#dcb47a', b: '#c49a62', d: '#9c7748', u: C.blue, v: C.blueDark });
}

/** An apple with its leaf. */
function apple(P: Painter, cx: number, cy: number, r: number): void {
  P.disc(cx, cy, r, '#b8303f');
  P.disc(cx, cy, r - 1, STRAWBERRY);
  P.px(cx - r + 2, cy - r + 2, '#ffb0b8');
  if (r > 3) P.px(cx - r + 3, cy - r + 2, '#ffb0b8');
  P.rect(cx, cy - r - 1, 1, 2, C.barkDark);
  P.rect(cx + 1, cy - r - 1, 2, 1, C.leaf);
  P.px(cx + 2, cy - r - 2, C.leafLight);
}

/** A barrel standing up: staves, two iron hoops, its lid. */
function barrel(P: Painter, x: number, y: number, w: number, h: number): void {
  P.rect(x, y + 1, w, h - 1, '#b0723f');
  P.rect(x + 1, y, w - 2, 1, '#b0723f');
  P.rect(x + 1, y + 2, 2, h - 3, '#d39a5f');
  P.rect(x + w - 2, y + 1, 2, h - 1, '#8a542c');
  P.rect(x + 1, y, w - 2, 2, '#d8a874');
  P.rect(x + 2, y + 1, w - 4, 1, '#b0723f');
  P.rect(x, y + 3, w, 1, IRON);
  P.rect(x, y + h - 3, w, 1, IRON);
  P.px(x + 1, y + 3, IRON_LIGHT);
  P.px(x + 1, y + h - 3, IRON_LIGHT);
}

/** A barrel lying down, seen end on. */
function barrelEnd(P: Painter, cx: number, cy: number): void {
  P.disc(cx, cy, 3, '#8a542c');
  P.disc(cx, cy, 2, IRON);
  P.disc(cx, cy, 1, '#c88c52');
  P.px(cx - 1, cy - 1, '#e0b07a');
  P.px(cx, cy, '#6b4430');
}

/** A spiral lollipop: pink and white swirl, a glint top left. */
function lollipop(P: Painter, cx: number, cy: number, r: number): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d > r + 0.45) continue;
      const a = Math.atan2(y, x) / (2 * Math.PI);
      const band = (((d / 2.6 + a) % 1) + 1) % 1;
      P.px(cx + x, cy + y, d > r - 0.6 ? CANDY_PINK_DARK : band < 0.5 ? CANDY_PINK : C.white);
    }
  }
  P.px(cx - Math.ceil(r / 2), cy - Math.ceil(r / 2), GLINT);
}

/** A wrapped sweet, its twisted ends spread like a bow (11 x 5). */
function wrappedSweet(P: Painter, x: number, y: number, col: string, dark: string): void {
  P.map(x, y, [
    'e...bbb...e',
    'ee.bgbbd.ee',
    'eeebbbbdeee',
    'ee.bbbdd.ee',
    'e...ddd...e',
  ], { e: col, b: col, d: dark, g: GLINT });
  P.px(x, y + 2, dark);
  P.px(x + 10, y + 2, dark);
}

/** Open tailor's scissors pointing right: red handle rings, long steel blades (13 x 9). */
function scissors(P: Painter, x: number, y: number): void {
  P.map(x, y, [
    '.rr..........',
    'r..r.......bb',
    'r..r....bbbd.',
    '.rr.rrbbd....',
    '......k......',
    '.rr.rrbbd....',
    'r..r....bbbd.',
    'r..r.......bb',
    '.rr..........',
  ], { b: '#9aa8b8', d: '#5e6b7a', k: IRON, r: STRAWBERRY });
}

/** A rectangular shop sign: cream board in a wooden frame. */
function signBoard(P: Painter, x: number, y: number, w: number, h: number): void {
  P.rect(x, y, w, h, C.woodDark);
  P.rect(x + 1, y + 1, w - 2, h - 2, '#fff6e4');
  P.rect(x + 1, y + h - 2, w - 2, 1, '#efe0c4');
  P.px(x + 1, y + 1, GLINT);
}

/** A dress form in a window: a pink dress on a stand. */
function dressForm(P: Painter, cx: number, y: number): void {
  P.px(cx, y, IRON);
  P.rect(cx - 1, y + 1, 3, 2, CANDY_PINK);
  P.rect(cx - 2, y + 3, 5, 1, CANDY_PINK);
  P.px(cx - 1, y + 1, '#ffc0d6');
  P.rect(cx - 2, y + 4, 5, 1, CANDY_PINK_DARK);
  P.rect(cx, y + 5, 1, 2, IRON);
}

/** A bunting garland: triangles in turn pink, blue, yellow, green. */
function bunting(P: Painter, x0: number, x1: number, y: number): void {
  const flags = [CANDY_PINK, CANDY_BLUE, C.gold, C.leafLight];
  P.rect(x0, y, x1 - x0, 1, C.white);
  let k = 0;
  for (let x = x0 + 1; x + 2 < x1; x += 4) {
    const col = flags[k++ % flags.length];
    P.rect(x, y + 1, 3, 1, col);
    P.px(x + 1, y + 2, col);
  }
}

/** A soap bar: rounded pastel block, a darker underside, a glint. */
function soapBar(P: Painter, x: number, y: number, w: number, col: string, dark: string): void {
  P.rect(x, y, w, 2, col);
  P.rect(x, y + 2, w, 1, dark);
  P.px(x + 1, y, GLINT);
}

/** A soap bubble: a pale ring, a glint, a rainbow touch. */
function bubble(P: Painter, cx: number, cy: number, r: number): void {
  P.disc(cx, cy, r, '#b9dcf2');
  if (r > 1) P.disc(cx, cy, r - 1, '#eef8ff');
  P.px(cx - Math.floor(r / 2), cy - Math.floor(r / 2), GLINT);
  if (r > 1) P.px(cx + Math.floor(r / 2), cy + Math.floor(r / 2), '#f2c2e4');
}

/** Lavender in a box: green stems, purple spikes. */
function lavenderBox(P: Painter, x: number, y: number, w: number): void {
  P.rect(x, y + 2, w, 1, C.woodLight);
  P.rect(x, y + 3, w, 1, C.wood);
  for (let i = 0; i < w; i += 2) {
    P.px(x + i, y, '#9a7ad0');
    P.px(x + i, y + 1, '#7a5cb0');
    if (i + 1 < w) P.px(x + i + 1, y + 1, C.leaf);
  }
}

/** A lavender bush: a green tuft, purple spikes. */
function lavenderBush(P: Painter, x: number, y: number): void {
  P.rect(x, y + 3, 5, 2, C.leafDark);
  P.rect(x + 1, y + 2, 3, 1, C.leaf);
  for (const [dx, dy] of [[0, 1], [2, 0], [4, 1]] as const) {
    P.px(x + dx, y + dy, '#b49ae0');
    P.px(x + dx, y + dy + 1, '#7a5cb0');
  }
}

/** A thatch roof seen from the front: straw streaks, a rounded ridge, the right end in shade. */
function thatchRoof(P: Painter, top: number, rows: number, width: number): void {
  const inset = (i: number) => Math.max(0, 7 - Math.floor(i * 0.6));
  for (let i = 0; i < rows; i++) {
    const x0 = inset(i);
    const x1 = width - inset(i);
    P.rect(x0, top + i, x1 - x0, 1, i < 2 ? THATCH[0] : THATCH[1]);
    for (let x = x0 + 1 + (i % 3); x < x1 - 3; x += 3) P.px(x, top + i, i % 2 ? THATCH[2] : THATCH[0]);
    P.rect(x1 - 3, top + i, 3, 1, THATCH[2]);
    P.px(x1 - 2, top + i, i % 2 ? THATCH[3] : THATCH[2]);
  }
  P.rect(inset(0) + 1, top - 1, width - 2 * inset(0) - 2, 1, THATCH[2]);
}

/** The thick, ragged edge of a thatch, and its shade on the wall. */
function thatchFringe(P: Painter, x: number, y: number, w: number, wallShade: string): void {
  P.rect(x + 1, y, w - 2, 3, THATCH[1]);
  P.rect(x, y + 1, w, 1, THATCH[1]);
  P.rect(x + w - 4, y, 3, 3, THATCH[2]);
  for (let i = 1; i < w - 1; i += 2) {
    P.px(x + i, y + 3, THATCH[2]);
    P.px(x + i + 1, y + 2, THATCH[3]);
  }
  for (let i = 2; i < w - 2; i += 3) P.px(x + i, y, THATCH[0]);
  P.rect(x + 1, y + 4, w - 2, 1, wallShade);
}

/** A thatch gable: thick straw edges round a triangle of planks. */
function thatchGable(P: Painter, cx: number, top: number, rows: number, slope: number): void {
  for (let i = 0; i < rows; i++) {
    const half = Math.round(i * slope) + 2;
    P.rect(cx - half, top + i, 2 * half + 1, 1, THATCH[1]);
    P.px(cx - half, top + i, THATCH[0]);
    P.px(cx - half + 1, top + i, i % 2 ? THATCH[2] : THATCH[0]);
    P.px(cx + half, top + i, THATCH[3]);
    P.px(cx + half - 1, top + i, THATCH[2]);
    const inner = half - 4;
    if (inner > 0 && i > 3) {
      P.rect(cx - inner, top + i, 2 * inner + 1, 1, C.wood);
      for (let x = cx - inner + 1; x <= cx + inner; x += 3) P.px(x, top + i, C.woodDark);
      P.px(cx - inner, top + i, C.woodLight);
    }
  }
}

// -----------------------------------------------
// SUCRERIE: white sugar factory, teal roof, tall brick stack, sugar cubes, sugar sacks
// -----------------------------------------------

function refinery(view: View): Sprite {
  const wall = '#fbf8f1';
  const shade = '#ece6da';
  const frame = ROOF_TEAL[3];
  return sprite(30, 46, (P) => {
    if (view === 'face') {
      brickChimney(P, 22, 4, 22);
      P.rect(22, 5, 4, 1, C.white);
      tiledRoof(P, 9, 13, 30, ROOF_TEAL);
      sugarCubes(P, 10, 9);
      P.rect(1, 22, 28, 19, wall);
      P.rect(22, 24, 6, 17, shade);
      P.rect(1, 22, 1, 19, ROOF_TEAL[2]);
      P.rect(28, 22, 1, 19, ROOF_TEAL[3]);
      eave(P, 0, 21, 30, ROOF_TEAL, '#ddd6c8');
      archWindow(P, 4, 28, 5, 6, frame);
      archWindow(P, 21, 28, 5, 6, frame);
      plankDoor(P, 12, 28, 6, 13, DOOR_TEAL);
      stones(P, 1, 41, 28, 5, WARM_STONE);
      sugarSack(P, 2, 38);
      sugarSack(P, 21, 38);
    } else {
      // The tall stack stands beside the gable, joined to it by a pipe.
      brickChimney(P, 24, 3, 41);
      P.rect(24, 5, 3, 1, C.white);
      stones(P, 23, 36, 5, 5, GRANITE);
      P.rect(2, 24, 20, 17, wall);
      P.rect(17, 25, 5, 16, shade);
      tiledGable(P, 12, 8, 16, 0.6, ROOF_TEAL, wall);
      sugarCube(P, 9, 15);
      eave(P, 1, 23, 22, ROOF_TEAL, '#ddd6c8');
      P.rect(22, 29, 2, 2, IRON);
      P.px(22, 29, IRON_LIGHT);
      plankDoor(P, 4, 29, 8, 12, DOOR_TEAL);
      P.rect(8, 30, 1, 11, DOOR_TEAL[3]);
      archWindow(P, 15, 30, 4, 4, frame);
      stones(P, 2, 41, 26, 5, WARM_STONE);
      sugarSack(P, 14, 38);
    }
  });
}

// -----------------------------------------------
// PRESSOIR: open timber barn under a thatch, the big screw press, barrels and apples
// -----------------------------------------------

function press(view: View): Sprite {
  const inside = '#4f3326';
  const insideLine = '#432a1f';
  return sprite(30, 44, (P) => {
    if (view === 'face') {
      stoneChimney(P, 21, 0, 4, 10);
      thatchRoof(P, 4, 14, 30);
      apple(P, 15, 11, 4);
      // The open front: two posts, a beam, the dark barn inside.
      P.rect(3, 21, 24, 19, inside);
      for (let x = 5; x < 27; x += 4) P.rect(x, 21, 1, 19, insideLine);
      P.rect(1, 20, 2, 20, TIMBER);
      P.rect(27, 20, 2, 20, TIMBER);
      P.rect(1, 20, 1, 20, TIMBER_LIGHT);
      thatchFringe(P, 0, 18, 30, '#3a241b');
      // The press: two uprights and a beam, the iron screw, its long bar, the slatted basket.
      P.rect(6, 24, 2, 14, C.woodLight);
      P.rect(21, 24, 2, 14, C.wood);
      P.px(6, 24, C.strawLight);
      P.rect(5, 24, 19, 2, C.woodLight);
      P.rect(5, 25, 19, 1, C.wood);
      P.rect(14, 23, 2, 9, IRON_LIGHT);
      for (let y = 23; y < 32; y += 2) P.px(15, y, IRON);
      P.rect(8, 28, 14, 1, C.woodLight);
      P.rect(8, 29, 14, 1, C.woodDark);
      P.rect(8, 28, 1, 2, C.woodDark);
      P.rect(21, 28, 1, 2, C.woodDark);
      P.rect(10, 32, 10, 1, C.woodDark);
      for (let x = 10; x < 20; x++) P.rect(x, 33, 1, 5, x % 2 ? C.wood : C.woodLight);
      P.rect(10, 34, 10, 1, IRON);
      P.rect(11, 33, 8, 1, '#c0392b');
      P.rect(20, 37, 2, 1, C.woodDark);
      P.px(21, 38, C.gold);
      // A barrel and a crate of apples in front.
      P.rect(1, 37, 9, 5, C.wood);
      P.rect(1, 37, 9, 1, C.woodLight);
      P.rect(1, 39, 9, 1, C.woodDark);
      for (const [x, col] of [[1, STRAWBERRY], [3, '#8fcf4f'], [5, STRAWBERRY], [7, STRAWBERRY]] as const) {
        P.rect(x, 35, 2, 2, col);
        P.px(x, 35, '#ffd0d4');
      }
      stones(P, 1, 40, 28, 4, WARM_STONE);
      barrel(P, 22, 32, 7, 10);
    } else {
      planks(P, 3, 20, 24, 20);
      stoneChimney(P, 20, 0, 4, 12);
      thatchGable(P, 15, 2, 19, 0.72);
      apple(P, 15, 13, 3);
      thatchFringe(P, 0, 19, 30, '#9a6639');
      // The wide door open on the dark barn, a basket of apples on the step.
      P.rect(5, 26, 9, 14, inside);
      P.rect(4, 25, 11, 1, TIMBER);
      P.rect(4, 25, 1, 15, TIMBER);
      P.rect(14, 25, 1, 15, TIMBER);
      barrel(P, 6, 31, 5, 9);
      P.rect(9, 37, 6, 3, '#c08657');
      P.rect(9, 37, 6, 1, '#dcaa72');
      for (const [x, col] of [[10, STRAWBERRY], [11, STRAWBERRY], [12, '#8fcf4f'], [13, STRAWBERRY]] as const) P.px(x, 36, col);
      stones(P, 3, 40, 24, 4, WARM_STONE);
      barrelEnd(P, 19, 38);
      barrelEnd(P, 25, 38);
      barrelEnd(P, 22, 33);
    }
  });
}

// -----------------------------------------------
// CONFITURERIE: butter-yellow cottage, moss roof, jam jars with gingham lids
// -----------------------------------------------

function jamKitchen(view: View): Sprite {
  const wall = '#fdf0cf';
  const shade = '#f2dfb2';
  const trim = '#a33f50';
  return sprite(30, 44, (P) => {
    if (view === 'face') {
      stoneChimney(P, 4, 0, 5, 12);
      tiledRoof(P, 4, 13, 30, ROOF_MOSS);
      bigJamJar(P, 11, 5);
      P.rect(1, 18, 28, 21, wall);
      P.rect(22, 20, 6, 19, shade);
      P.rect(1, 18, 2, 21, TIMBER);
      P.rect(27, 18, 2, 21, TIMBER);
      eave(P, 0, 17, 30, ROOF_MOSS, '#e6cfa0');
      plankDoor(P, 5, 25, 6, 13, DOOR);
      // The shop window under a gingham awning, three jars on the shelf.
      gingham(P, 14, 20, 12, 2);
      for (let i = 0; i < 12; i += 2) P.px(14 + i, 22, STRAWBERRY);
      framedWindow(P, 15, 24, 10, 4, { frame: trim });
      jamJar(P, 15, 29, 3, 6, STRAWBERRY);
      jamJar(P, 19, 29, 3, 6, APRICOT);
      jamJar(P, 23, 29, 3, 6, PLUM);
      P.rect(14, 35, 12, 1, C.woodLight);
      P.rect(14, 36, 12, 1, C.wood);
      stones(P, 1, 39, 28, 5, WARM_STONE);
      P.rect(3, 39, 10, 2, '#cdb48d');
      P.rect(3, 39, 10, 1, '#e8d8bb');
    } else {
      stoneChimney(P, 20, 0, 4, 14);
      P.rect(4, 20, 22, 19, wall);
      P.rect(20, 21, 5, 18, shade);
      P.rect(4, 20, 2, 19, TIMBER);
      P.rect(24, 20, 2, 19, TIMBER);
      tiledGable(P, 15, 4, 16, 0.75, ROOF_MOSS, wall);
      jamJar(P, 13, 9, 5, 8, STRAWBERRY);
      eave(P, 3, 19, 24, ROOF_MOSS, '#e6cfa0');
      // Gingham curtains and jars, a gingham awning over the door, a crate of strawberries.
      framedWindow(P, 8, 24, 6, 5, { frame: trim });
      gingham(P, 8, 24, 1, 5);
      gingham(P, 13, 24, 1, 5);
      jamJar(P, 8, 31, 3, 6, APRICOT);
      jamJar(P, 12, 31, 3, 6, PLUM);
      P.rect(7, 37, 9, 1, C.woodLight);
      P.rect(7, 38, 9, 1, C.wood);
      gingham(P, 16, 22, 8, 2);
      for (let i = 0; i < 8; i += 2) P.px(16 + i, 24, STRAWBERRY);
      plankDoor(P, 17, 26, 6, 13, DOOR);
      stones(P, 4, 39, 22, 5, WARM_STONE);
      P.rect(23, 36, 6, 5, C.wood);
      P.rect(23, 36, 6, 1, C.woodLight);
      P.rect(23, 38, 6, 1, C.woodDark);
      for (let x = 23; x < 29; x += 2) {
        P.rect(x, 34, 2, 2, STRAWBERRY);
        P.px(x, 34, C.leaf);
        P.px(x + 1, 35, '#b8303f');
      }
    }
  });
}

// -----------------------------------------------
// CONFISERIE: pink candy-striped walls, a striped tent roof, a big lollipop on top
// -----------------------------------------------

function candyShop(view: View): Sprite {
  const pink = '#ffd3e2';
  const white = '#fff7fa';
  const pinkShade = '#f2bccf';
  const whiteShade = '#f1e3e8';
  const stripes = (P: Painter, x: number, y: number, w: number, h: number, shadeFrom: number) => {
    for (let i = 0; i < w; i++) {
      const lit = x + i < shadeFrom;
      P.rect(x + i, y, 1, h, Math.floor(i / 2) % 2 ? (lit ? white : whiteShade) : lit ? pink : pinkShade);
    }
  };
  const cane = (P: Painter, x: number, y: number, h: number) => {
    for (let i = 0; i < h; i++) {
      P.px(x, y + i, (i % 4) < 2 ? STRAWBERRY : C.white);
      P.px(x + 1, y + i, ((i + 1) % 4) < 2 ? '#b8303f' : '#e9dde0');
    }
  };
  const valance = (P: Painter, x: number, y: number, w: number) => {
    P.rect(x, y, w, 2, CANDY_PINK);
    P.rect(x, y, w, 1, '#ffb0cc');
    for (let i = 0; i < w; i += 3) {
      P.rect(x + i, y + 2, 2, 1, CANDY_PINK);
      P.px(x + i, y + 2, '#ffb0cc');
    }
  };
  const blueStripe = (x: number) => Math.floor((x - 15 + 40) / 3) % 2 === 0;
  return sprite(30, 46, (P) => {
    if (view === 'face') {
      P.rect(14, 9, 2, 6, C.white);
      P.px(15, 10, '#e9dde0');
      lollipop(P, 15, 6, 6);
      stovepipe(P, 23, 4, 12, CANDY_PIPE, CANDY_PINK_DARK, CANDY_PINK);
      // A striped tent roof.
      const inset = (i: number) => Math.max(0, 7 - Math.floor(i * 0.7));
      for (let i = 0; i < 10; i++) {
        const x0 = inset(i);
        const x1 = 30 - inset(i);
        for (let x = x0; x < x1; x++) {
          const shaded = x >= x1 - 3;
          P.px(x, 13 + i, blueStripe(x) ? ROOF_SKY[shaded ? 2 : i < 2 ? 0 : 1] : shaded ? '#dfe7f0' : C.white);
        }
      }
      valance(P, 0, 23, 30);
      stripes(P, 1, 25, 28, 16, 23);
      cane(P, 1, 25, 16);
      cane(P, 27, 25, 16);
      P.rect(3, 26, 24, 1, pinkShade);
      // The big window full of sweets, the door, a wrapped sweet as the sign.
      framedWindow(P, 13, 29, 11, 7, { frame: CANDY_PINK_DARK, glass: '#e8f4fb' });
      for (const [x, y, col] of [[14, 31, STRAWBERRY], [16, 33, C.gold], [15, 34, CANDY_BLUE], [19, 31, C.leafLight], [21, 34, CANDY_PINK], [22, 31, APRICOT], [18, 34, PLUM], [20, 33, C.gold]] as const) {
        P.px(x, y, col);
        P.px(x + 1, y, col);
      }
      plankDoor(P, 5, 30, 6, 11, DOOR_BLUE);
      wrappedSweet(P, 3, 26, C.gold, C.goldDark);
      stones(P, 1, 41, 28, 5, WARM_STONE);
    } else {
      stovepipe(P, 21, 4, 9, CANDY_PIPE, CANDY_PINK_DARK, CANDY_PINK);
      const top = 7;
      for (let i = 0; i < 17; i++) {
        const half = Math.round(i * 0.78) + 1;
        for (let x = 15 - half - 1; x <= 15 + half + 1; x++) {
          const edge = x <= 15 - half || x >= 15 + half;
          P.px(x, top + i, edge ? (x > 15 ? ROOF_SKY[3] : ROOF_SKY[0]) : blueStripe(x) ? ROOF_SKY[i < 2 ? 0 : 1] : C.white);
        }
      }
      P.rect(14, 3, 2, 5, C.white);
      lollipop(P, 15, 3, 3);
      valance(P, 2, 23, 26);
      stripes(P, 4, 25, 22, 16, 21);
      cane(P, 4, 25, 16);
      cane(P, 24, 25, 16);
      framedWindow(P, 9, 28, 8, 5, { frame: CANDY_PINK_DARK, glass: '#e8f4fb' });
      for (const [x, col] of [[10, STRAWBERRY], [12, C.gold], [14, CANDY_BLUE], [15, C.leafLight]] as const) P.px(x, 31, col);
      P.rect(8, 34, 10, 1, CANDY_PINK);
      stones(P, 4, 41, 22, 5, WARM_STONE);
      // A wrapped sweet hanging from an iron arm.
      P.rect(22, 27, 7, 1, IRON);
      P.px(24, 28, IRON);
      wrappedSweet(P, 19, 29, C.gold, C.goldDark);
    }
  });
}

// -----------------------------------------------
// ATELIER DE COUTURE: sky-blue plaster, mustard roof, scissors sign, bunting, a dress in the window
// -----------------------------------------------

function sewing(view: View): Sprite {
  const wall = '#e4eef7';
  const shade = '#d3e0ec';
  const trim = '#5a7fa6';
  return sprite(30, 44, (P) => {
    if (view === 'face') {
      stovepipe(P, 23, 0, 10, IRON_PIPE, '#3a2e2c');
      tiledRoof(P, 4, 13, 30, ROOF_MUSTARD);
      signBoard(P, 7, 5, 16, 11);
      scissors(P, 9, 6);
      P.rect(1, 18, 28, 21, wall);
      P.rect(22, 20, 6, 19, shade);
      P.rect(1, 18, 2, 21, trim);
      P.rect(27, 18, 2, 21, trim);
      eave(P, 0, 17, 30, ROOF_MUSTARD, '#c2d2e2');
      bunting(P, 1, 29, 20);
      framedWindow(P, 14, 25, 11, 9, { frame: trim, glass: '#f4f9fd' });
      dressForm(P, 17, 26);
      for (const [x, col] of [[21, CANDY_BLUE], [22, C.gold], [23, C.leafLight]] as const) {
        P.rect(x, 30, 1, 4, col);
        P.px(x, 30, C.white);
      }
      P.rect(13, 35, 13, 1, C.woodLight);
      P.rect(13, 36, 13, 1, C.wood);
      plankDoor(P, 5, 25, 6, 13, DOOR);
      stones(P, 1, 39, 28, 5, WARM_STONE);
      P.rect(3, 39, 10, 2, '#cdb48d');
      P.rect(3, 39, 10, 1, '#e8d8bb');
    } else {
      P.rect(4, 20, 22, 19, wall);
      P.rect(20, 21, 5, 18, shade);
      P.rect(4, 20, 2, 19, trim);
      P.rect(24, 20, 2, 19, trim);
      stovepipe(P, 20, 1, 10, IRON_PIPE, '#3a2e2c');
      tiledGable(P, 15, 4, 16, 0.75, ROOF_MUSTARD, wall);
      P.disc(15, 13, 2, trim);
      P.disc(15, 13, 1, '#f4f9fd');
      P.px(14, 12, GLINT);
      eave(P, 3, 19, 24, ROOF_MUSTARD, '#c2d2e2');
      bunting(P, 4, 26, 22);
      // Bolts of cloth in the window.
      framedWindow(P, 7, 27, 9, 6, { frame: trim, glass: '#f4f9fd' });
      for (const [x, col, dark] of [[8, CANDY_PINK, CANDY_PINK_DARK], [10, C.gold, C.goldDark], [12, CANDY_BLUE, '#45699a'], [14, C.leafLight, C.leaf]] as const) {
        P.rect(x, 29, 2, 4, col);
        P.px(x + 1, 29, dark);
        P.px(x + 1, 31, dark);
      }
      P.rect(6, 34, 11, 1, C.woodLight);
      stones(P, 4, 39, 22, 5, WARM_STONE);
      // A spool of thread hanging from an iron arm, its needle stuck in.
      P.rect(21, 25, 8, 1, IRON);
      P.px(24, 26, IRON);
      signBoard(P, 20, 27, 9, 10);
      P.rect(22, 29, 5, 1, C.woodDark);
      P.rect(23, 30, 3, 4, STRAWBERRY);
      P.px(23, 31, '#ff9aa8');
      P.px(23, 33, '#ff9aa8');
      P.rect(25, 30, 1, 4, '#b8303f');
      P.rect(22, 34, 5, 1, C.woodDark);
      P.line(27, 29, 25, 33, '#7d8a98');
      P.px(27, 28, C.white);
    }
  });
}

// -----------------------------------------------
// GLACIER: mint walls, chocolate roof dripping with strawberry cream, a big cone on top
// -----------------------------------------------

function iceCream(view: View): Sprite {
  const wall = '#d9f3e6';
  const shade = '#c3e6d5';
  const cream = '#fbc9da';
  const creamLight = '#ffeef4';
  const cone = (P: Painter, cx: number, y: number, r: number) => {
    const h = r + 3;
    for (let i = 0; i < h; i++) {
      const half = Math.max(0, Math.round((r - 0.5) * (1 - i / h)));
      P.rect(cx - half, y + i, 2 * half + 1, 1, '#e8b86a');
      for (let x = cx - half; x <= cx + half; x++) if ((x + i) % 3 === 0 || (x - i + 30) % 3 === 0) P.px(x, y + i, '#c48a3e');
      P.px(cx - half, y + i, '#f6d698');
    }
    P.disc(cx, y - r + 1, r, CANDY_PINK);
    P.disc(cx - 1, y - r, r - 1, cream);
    P.px(cx - Math.floor(r / 2), y - r, creamLight);
    P.rect(cx - r, y, 2 * r + 1, 1, CANDY_PINK);
    for (let x = cx - r + 1; x < cx + r; x += 3) P.px(x, y + 1, CANDY_PINK);
    P.disc(cx + 1, y - 2 * r + 1, 1, STRAWBERRY);
    P.px(cx + 1, y - 2 * r - 1, C.leafDark);
  };
  // A waffle chimney, like the cone, topped with strawberry cream.
  const chimney = (P: Painter, x: number, top: number, h: number) => {
    P.rect(x, top, 4, h, '#e8b86a');
    P.rect(x, top, 1, h, '#f6d698');
    P.rect(x + 3, top, 1, h, '#c48a3e');
    for (let y = top + 3; y < top + h; y += 2) P.px(x + 1 + (y % 4 === 1 ? 0 : 1), y, '#c48a3e');
    P.rect(x - 1, top, 6, 2, cream);
    P.rect(x - 1, top, 6, 1, creamLight);
    P.px(x, top + 2, cream);
    P.rect(x + 3, top + 2, 1, 2, cream);
  };
  const drip = (P: Painter, x: number, y: number, w: number) => {
    P.rect(x, y, w, 2, cream);
    P.rect(x, y, w, 1, creamLight);
    for (const [dx, len] of [[2, 2], [6, 1], [9, 3], [14, 1], [17, 2], [22, 1], [25, 3], [28, 1]] as const) {
      if (dx < w) P.rect(x + dx, y + 2, 1, len, cream);
    }
  };
  return sprite(30, 46, (P) => {
    if (view === 'face') {
      chimney(P, 4, 6, 12);
      tiledRoof(P, 13, 9, 30, ROOF_CHOCO);
      cone(P, 15, 9, 5);
      P.rect(1, 23, 28, 18, wall);
      P.rect(22, 25, 6, 16, shade);
      eave(P, 0, 22, 30, ROOF_CHOCO, shade);
      drip(P, 0, 22, 30);
      awning(P, 13, 27, 13, CANDY_PINK, C.white);
      framedWindow(P, 14, 31, 11, 5, { frame: ROOF_CHOCO[2], glass: '#e8f4fb' });
      for (const [x, col] of [[16, CANDY_PINK], [19, '#fff3c4'], [22, '#8a5a3b']] as const) {
        P.rect(x, 33, 2, 2, col);
        P.rect(x, 35, 2, 1, '#c48a3e');
      }
      P.rect(13, 37, 13, 1, C.woodLight);
      P.rect(13, 38, 13, 1, C.wood);
      plankDoor(P, 5, 29, 6, 12, DOOR_PINK);
      stones(P, 1, 41, 28, 5, WARM_STONE);
    } else {
      P.rect(4, 23, 22, 18, wall);
      P.rect(20, 24, 5, 17, shade);
      chimney(P, 20, 4, 9);
      tiledGable(P, 15, 9, 15, 0.75, ROOF_CHOCO, wall);
      for (let i = 0; i < 15; i++) {
        const half = Math.round(i * 0.75) + 1;
        P.px(15 - half - 1, 9 + i, cream);
        P.px(15 + half + 1, 9 + i, cream);
        if (i % 4 === 2) P.px(15 - half - 1, 10 + i, cream);
      }
      P.rect(14, 8, 3, 2, cream);
      P.disc(15, 7, 1, STRAWBERRY);
      P.disc(15, 15, 2, ROOF_CHOCO[2]);
      P.disc(15, 15, 1, '#e8f4fb');
      eave(P, 3, 22, 24, ROOF_CHOCO, shade);
      drip(P, 3, 22, 24);
      // The serving hatch under its awning, a counter, a cone sign on a post.
      awning(P, 6, 26, 13, CANDY_PINK, C.white);
      framedWindow(P, 7, 30, 11, 5, { frame: ROOF_CHOCO[2], glass: '#e8f4fb' });
      P.rect(6, 35, 13, 2, C.woodLight);
      P.rect(6, 36, 13, 1, C.wood);
      stones(P, 4, 41, 22, 5, WARM_STONE);
      P.rect(25, 29, 2, 15, C.woodDark);
      P.px(25, 29, C.wood);
      cone(P, 26, 26, 3);
    }
  });
}

// -----------------------------------------------
// SAVONNERIE: lavender roof, soap bars, bubbles floating up
// -----------------------------------------------

function soapWorks(view: View): Sprite {
  const wall = '#fbf8fd';
  const shade = '#ece4f3';
  const trim = ROOF_LAVENDER[3];
  const bars = [['#f9b8d0', '#e08aac'], ['#b8ecd6', '#86ccb0'], ['#d8c8f4', '#ab8fd8'], ['#fbe6a4', '#e0c060']] as const;
  return sprite(30, 46, (P) => {
    if (view === 'face') {
      stovepipe(P, 5, 2, 10, COPPER_PIPE, '#8a5430');
      tiledRoof(P, 9, 13, 30, ROOF_LAVENDER);
      bubble(P, 24, 4, 3);
      bubble(P, 18, 1, 1);
      bubble(P, 12, 5, 2);
      P.rect(1, 23, 28, 18, wall);
      P.rect(22, 25, 6, 16, shade);
      P.rect(1, 23, 2, 18, trim);
      P.rect(27, 23, 2, 18, trim);
      eave(P, 0, 22, 30, ROOF_LAVENDER, '#ddd2e8');
      soapSign(P, 8, 11);
      framedWindow(P, 16, 27, 9, 6, { frame: trim });
      lavenderBox(P, 15, 34, 11);
      plankDoor(P, 5, 27, 6, 14, ROOF_LAVENDER);
      stones(P, 1, 41, 28, 5, WARM_STONE);
    } else {
      P.rect(4, 23, 22, 18, wall);
      P.rect(20, 24, 5, 17, shade);
      P.rect(4, 23, 2, 18, trim);
      P.rect(24, 23, 2, 18, trim);
      stovepipe(P, 7, 3, 12, COPPER_PIPE, '#8a5430');
      tiledGable(P, 15, 8, 15, 0.75, ROOF_LAVENDER, wall);
      bubble(P, 15, 17, 2);
      bubble(P, 25, 4, 3);
      bubble(P, 20, 1, 1);
      eave(P, 3, 22, 24, ROOF_LAVENDER, '#ddd2e8');
      // Soap bars drying on two shelves, lavender at the foot of the wall.
      framedWindow(P, 8, 26, 6, 5, { frame: trim });
      P.rect(16, 26, 9, 1, C.woodDark);
      P.rect(16, 30, 9, 1, C.woodDark);
      P.rect(16, 34, 9, 1, C.woodDark);
      soapBar(P, 16, 27, 4, bars[0][0], bars[0][1]);
      soapBar(P, 21, 27, 4, bars[1][0], bars[1][1]);
      soapBar(P, 16, 31, 4, bars[2][0], bars[2][1]);
      soapBar(P, 21, 31, 4, bars[3][0], bars[3][1]);
      stones(P, 4, 41, 22, 5, WARM_STONE);
      lavenderBush(P, 5, 36);
      lavenderBush(P, 10, 36);
      lavenderBush(P, 19, 36);
    }
  });
}

// -----------------------------------------------
// CREPERIE: Breton longere, whitewashed stone, slate roof, blue shutters, a crepe sign
// -----------------------------------------------

function creperie(view: View): Sprite {
  const wall = '#f7f5ef';
  const shade = '#e6e3da';
  const shutter = DOOR_BRETON;
  // The sign: a stack of crepes on a plate, chocolate on top, in a blue frame (9 x 9).
  const crepe = (P: Painter, x: number, y: number) => {
    P.rect(x, y, 9, 9, shutter[2]);
    P.rect(x, y, 9, 1, shutter[1]);
    P.rect(x + 1, y + 1, 7, 7, '#fff6e4');
    P.map(x + 1, y + 1, [
      '..ccc..',
      '.lllcl.',
      'yyyyyyy',
      'eeeeeee',
      'yyyyyyy',
      'eeeeeee',
      'ppppppp',
    ], { c: '#6b3e26', l: '#fdebb8', y: '#f6d07a', e: '#c98a3c', p: '#b9c4d0' });
  };
  const shutters = (P: Painter, x: number, y: number, w: number, h: number) => {
    P.rect(x - 3, y, 2, h, shutter[1]);
    P.rect(x + w + 1, y, 2, h, shutter[2]);
    for (let i = 1; i < h; i += 2) {
      P.px(x - 3, y + i, shutter[2]);
      P.px(x + w + 2, y + i, shutter[3]);
    }
    framedWindow(P, x, y, w, h, { frame: C.greyDark });
    P.rect(x - 1, y - 2, w + 2, 1, C.grey);
  };
  const hydrangea = (P: Painter, x: number, y: number, col: string, light: string) => {
    P.rect(x, y + 2, 5, 2, C.leafDark);
    P.rect(x + 1, y, 3, 3, col);
    P.rect(x, y + 1, 5, 1, col);
    P.px(x + 1, y + 1, light);
    P.px(x + 3, y, light);
  };
  return sprite(30, 44, (P) => {
    if (view === 'face') {
      stoneChimney(P, 1, 0, 4, 16);
      stoneChimney(P, 24, 0, 4, 16);
      // A steep slate roof, its courses flat and staggered.
      for (let i = 0; i < 12; i++) {
        const x0 = Math.max(0, 5 - Math.floor(i * 0.5));
        const x1 = 30 - x0;
        P.rect(x0, 6 + i, x1 - x0, 1, i < 2 ? ROOF_BRETON[0] : ROOF_BRETON[1]);
        if (i % 2 === 1) P.rect(x0, 6 + i, x1 - x0, 1, ROOF_BRETON[2]);
        else for (let x = x0 + (i % 4 === 0 ? 1 : 3); x < x1; x += 4) P.px(x, 6 + i, ROOF_BRETON[2]);
        P.rect(x1 - 3, 6 + i, 3, 1, ROOF_BRETON[2]);
      }
      // The dormer in the roof.
      P.rect(12, 9, 7, 8, wall);
      P.rect(17, 9, 2, 8, shade);
      for (let i = 0; i < 4; i++) P.rect(15 - i - 1, 5 + i, 2 * i + 3, 1, i < 1 ? ROOF_BRETON[0] : ROOF_BRETON[1]);
      P.rect(10, 9, 11, 1, ROOF_BRETON[3]);
      framedWindow(P, 14, 11, 3, 4, { frame: C.greyDark });
      P.rect(1, 18, 28, 21, wall);
      P.rect(22, 20, 6, 19, shade);
      for (let y = 18; y < 39; y += 3) {
        P.rect(1, y, y % 2 ? 3 : 2, 2, C.grey);
        P.rect(26 + (y % 2 ? 0 : 1), y, y % 2 ? 3 : 2, 2, C.greyDark);
      }
      eave(P, 0, 17, 30, ROOF_BRETON, '#d8d6cf');
      shutters(P, 19, 25, 5, 6);
      plankDoor(P, 10, 25, 6, 13, shutter);
      P.rect(9, 23, 8, 1, C.grey);
      // The crepe sign hanging beside the door.
      P.rect(1, 20, 9, 1, IRON);
      P.px(2, 21, IRON);
      P.px(8, 21, IRON);
      crepe(P, 1, 22);
      stones(P, 1, 39, 28, 5, WARM_STONE);
      hydrangea(P, 2, 35, '#7fa6e8', '#b8d0f8');
      hydrangea(P, 23, 35, '#f2a0c8', '#ffd0e4');
    } else {
      // The gable wall rises above the roof, the chimney at its peak.
      for (let i = 0; i < 17; i++) {
        const half = Math.round(i * 0.85) + 1;
        P.rect(15 - half - 1, 5 + i, 2 * half + 3, 1, ROOF_BRETON[1]);
        P.px(15 - half - 1, 5 + i, ROOF_BRETON[0]);
        P.px(15 + half + 1, 5 + i, ROOF_BRETON[3]);
        if (half > 1) P.rect(15 - half + 1, 5 + i, 2 * half - 1, 1, wall);
      }
      stoneChimney(P, 13, 0, 4, 8);
      P.rect(3, 21, 24, 18, wall);
      P.rect(20, 22, 6, 17, shade);
      for (let y = 9; y < 39; y += 3) {
        const half = y < 22 ? Math.round((y - 5) * 0.85) : 12;
        P.rect(15 - half + (y % 2 ? 1 : 0), y, 2, 2, C.grey);
        P.rect(15 + half - 2 - (y % 2 ? 1 : 0), y, 2, 2, C.greyDark);
      }
      shutters(P, 14, 13, 3, 4);
      plankDoor(P, 5, 26, 6, 13, shutter);
      P.rect(4, 24, 8, 1, C.grey);
      framedWindow(P, 14, 28, 4, 4, { frame: C.greyDark });
      stones(P, 3, 39, 24, 5, WARM_STONE);
      hydrangea(P, 13, 35, '#7fa6e8', '#b8d0f8');
      // The crepe sign on an iron arm at the corner.
      P.rect(21, 23, 9, 1, IRON);
      P.px(22, 24, IRON);
      P.px(28, 24, IRON);
      crepe(P, 21, 25);
    }
  });
}
