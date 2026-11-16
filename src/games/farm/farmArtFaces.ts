import type { PersonId } from './data/types';
import { C, OUTLINE, SKIN, cached, sprite, type Sprite } from './farmPaint';

// -----------------------------------------------
// PORTRAITS: quests, orders, dialogs, the gate call (docs/ferme.md 23)
// -----------------------------------------------
// A bust of 22 x 22 pixels: the face of the map (eyes two pixels tall, blush, nose, a little smile) over the
// shoulders of the villager's outfit. Each part is a mask filled with three tones, lit from the top left.

type Tones = readonly [light: string, base: string, dark: string];
type Mask = (x: number, y: number) => boolean;

const SKIN_TONES: Tones = ['#fde3cc', SKIN, '#e6b190'];
const SKIN_DEEP = '#d39474';
const EYE = '#2e2228';
const CHEEK = '#f7a3b0';
const MOUTH = '#b8545e';
const FRAME = '#5b4a48';
const WHITE: Tones = ['#ffffff', '#f3eee6', '#d3cabd'];

interface Look {
  hair: Tones;
  cut: 'bun' | 'short' | 'long' | 'curly' | 'bob';
  shirt: Tones;
  apron?: boolean;
  chest?: 'buttons' | 'check' | 'collar' | 'scarf';
  hat?: 'toque' | 'cap' | 'postman' | 'baker';
  hatTones?: Tones;
  beard?: Tones;
  moustache?: string;
  glasses?: boolean;
  flower?: boolean;
  cheek?: string;
  freckles?: boolean;
}

/** Colours follow each villager's outfit on the map (farmPeopleArt LOOKS). */
const LOOKS: Record<PersonId, Look> = {
  marthe: { hair: ['#f1edf5', '#cbc4d3', '#a19aae'], cut: 'bun', shirt: ['#9cc874', '#7fae5a', '#678f48'], apron: true },
  leon: { hair: ['#a87450', C.bark, '#6b4430'], cut: 'short', shirt: WHITE, chest: 'scarf', hat: 'toque', hatTones: WHITE, moustache: C.bark },
  rosalie: { hair: ['#f8adc8', '#e8789e', '#c45a7e'], cut: 'long', shirt: [C.leafPale, C.leafLight, C.leaf], chest: 'collar', flower: true },
  basile: { hair: [C.bark, C.barkDark, '#563424'], cut: 'short', shirt: [C.roofLight, C.roof, C.roofDark], chest: 'check', hat: 'cap', hatTones: ['#6a98d4', '#3f6fb0', '#2f5590'], beard: ['#a87450', C.bark, '#6b4430'] },
  jules: { hair: ['#b88458', C.bark, '#6b4430'], cut: 'curly', shirt: ['#f8c063', '#f2a33a', '#d9862a'], freckles: true },
  capucine: { hair: ['#6a5262', '#43323f', '#2b1f28'], cut: 'bob', shirt: ['#b89ad8', '#9b7bc4', '#7f62a8'], chest: 'collar', glasses: true },
  gaston: { hair: [C.bark, C.barkDark, '#563424'], cut: 'short', shirt: ['#5a76ad', '#3f5a8f', '#2f3f6b'], chest: 'buttons', hat: 'postman', hatTones: ['#4f659b', '#2f3f6b', '#1f2a4a'] },
  pivoine: { hair: ['#c98a5a', '#a8693e', '#85502c'], cut: 'short', shirt: ['#f7a0ac', '#f27a8a', '#d95f70'], apron: true, hat: 'baker', hatTones: WHITE, cheek: '#f27a8a' },
};

// -----------------------------------------------
// GEOMETRY
// -----------------------------------------------

const W = 22;
const H = 22;
/** Between two pixel columns: the face is symmetric on an even width. */
const CX = 10.5;
const CY = 8.5;
const RX = 6;
const RY = 6;
const EYE_Y = 9;
const EYE_X = [7, 13] as const;
/** Last row of hair over the forehead. */
const FRINGE = 6;
const SHOULDER_TOP = 16;
const MOUTH_Y = 13;

/** A rounded box: p = 2 is an ellipse, higher is squarer. */
const blob = (cx: number, cy: number, rx: number, ry: number, p = 2): Mask => (x, y) => Math.abs((x - cx) / (rx + 0.45)) ** p + Math.abs((y - cy) / (ry + 0.45)) ** p <= 1;
const box = (x0: number, y0: number, w: number, h: number): Mask => (x, y) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h;
const and = (...m: Mask[]): Mask => (x, y) => m.every((f) => f(x, y));
const or = (...m: Mask[]): Mask => (x, y) => m.some((f) => f(x, y));

/** The portrait's pixels, painted layer over layer before going through `sprite` for the outline. */
class Canvas {
  private readonly px: (string | null)[][] = Array.from({ length: H }, () => Array<string | null>(W).fill(null));

  /** Fills a mask: a light rim at the top left, a dark rim right and below. */
  layer(m: Mask, [light, base, dark]: Tones, lit = true): void {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!m(x, y)) continue;
        if (!m(x + 1, y) || !m(x, y + 1)) this.px[y][x] = dark;
        else if (lit && x <= CX && (!m(x, y - 1) || !m(x - 1, y))) this.px[y][x] = light;
        else this.px[y][x] = base;
      }
    }
  }

  fill(m: Mask, col: string): void {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m(x, y)) this.px[y][x] = col;
  }

  dot(x: number, y: number, col: string): void {
    if (x >= 0 && y >= 0 && x < W && y < H) this.px[y][x] = col;
  }

  isOneOf(x: number, y: number, tones: readonly string[]): boolean {
    const col = x >= 0 && y >= 0 && x < W && y < H ? this.px[y][x] : null;
    return col !== null && tones.includes(col);
  }

  sprite(): Sprite {
    return sprite(W, H, (P) => this.px.forEach((row, y) => row.forEach((col, x) => col && P.px(x, y, col))));
  }
}

// -----------------------------------------------
// THE PORTRAIT
// -----------------------------------------------

export function faceSprite(id: PersonId): Sprite {
  return cached(`face-${id}`, () => {
    const L = LOOKS[id];
    const K = new Canvas();
    const mid = Math.floor(CX);
    const head = blob(CX, CY, RX, RY, 2.3);

    // Long hair and the bob fall behind the face.
    if (L.cut === 'long') K.layer(or(blob(CX, CY, RX + 2, RY + 1, 2.4), box(Math.ceil(CX - RX - 2), Math.floor(CY), 2 * RX + 5, RY + 4)), L.hair);
    if (L.cut === 'bob') K.layer(or(blob(CX, CY, RX + 1, RY + 1, 2.6), box(Math.ceil(CX - RX - 1), Math.floor(CY), 2 * RX + 3, RY - 1)), L.hair);

    // Neck and shoulders, with what the outfit shows on the chest.
    const shoulders = and(blob(CX, H + 3, 9, H + 3 - SHOULDER_TOP, 2.2), box(0, SHOULDER_TOP, W, H));
    K.layer(box(mid - 1, CY + RY - 2, 4, 4), [SKIN_TONES[2], SKIN_TONES[2], SKIN_DEEP], false);
    K.layer(shoulders, L.shirt);
    if (L.apron) {
      K.layer(and(shoulders, box(mid - 3, SHOULDER_TOP + 2, 8, H)), WHITE);
      for (const x of [mid - 3, mid + 4]) for (let y = SHOULDER_TOP; y < SHOULDER_TOP + 2; y++) if (shoulders(x, y)) K.dot(x, y, WHITE[1]);
    }
    if (L.chest === 'buttons') for (let y = SHOULDER_TOP + 2; y < H; y += 2) K.dot(mid + 1, y, C.gold);
    if (L.chest === 'check') {
      for (let y = SHOULDER_TOP; y < H; y++) for (let x = 0; x < W; x++) if ((x % 3 === 0 || y % 3 === 0) && K.isOneOf(x, y, L.shirt.slice(0, 2))) K.dot(x, y, '#f6c9cc');
    }
    if (L.chest === 'collar') for (const x of [mid - 2, mid - 1, mid + 2, mid + 3]) K.dot(x, SHOULDER_TOP, C.white);
    if (L.chest === 'scarf') K.layer(and(shoulders, box(mid - 2, SHOULDER_TOP, 6, 2)), ['#ee8b90', C.red, '#b83a4a']);

    // Ears, then the face.
    if (L.cut !== 'long' && L.cut !== 'bob') K.layer(or(blob(CX - RX, CY + 1, 1, 1.4), blob(CX + RX, CY + 1, 1, 1.4)), SKIN_TONES);
    K.layer(head, SKIN_TONES);

    // Hair over the head down to the fringe; under a hat, only what shows below its brim.
    const fringe = (x: number): number => {
      if (L.cut === 'long') return FRINGE + (x < CX - 1 ? 1 : x > CX + 2 ? -1 : 0);
      if (L.cut === 'curly') return FRINGE + (x % 2 === 0 ? 1 : 0);
      if (L.cut === 'bob') return FRINGE + 1;
      if (L.cut === 'bun') return FRINGE - (Math.abs(x - CX) < 1 ? 1 : 0);
      return FRINGE;
    };
    const brim = L.hat === 'baker' || L.hat === 'toque' ? FRINGE - 2 : FRINGE - 1;
    const top = and(blob(CX, CY - 0.5, RX + 1, RY + 1, 2.5), (x, y) => y <= fringe(x) && (!L.hat || y >= brim));
    const sides = (w: number, h: number) => or(box(Math.ceil(CX - RX - 1), Math.floor(CY) - 2, w, h), box(Math.floor(CX + RX + 2 - w), Math.floor(CY) - 2, w, h));
    const locks = L.cut === 'long' || L.cut === 'bob' ? sides(2, RY + 1) : sides(1, 3);
    K.layer(or(top, locks), L.hair);
    if (L.cut === 'curly') for (const dx of [-4, 0, 4]) K.layer(blob(CX + dx, CY - RY + 0.5 - (dx === 0 ? 1 : 0), 2, 2), L.hair);
    if (L.cut === 'bun') K.layer(blob(CX, CY - RY - 1.5, 2.6, 2), L.hair);
    // The fringe throws a shadow on the forehead.
    for (let y = H - 1; y > 0; y--) for (let x = 0; x < W; x++) if (head(x, y) && K.isOneOf(x, y, SKIN_TONES) && K.isOneOf(x, y - 1, L.hair)) K.dot(x, y, SKIN_TONES[2]);

    paintHat(K, L);
    if (L.beard) K.layer(and(head, (x, y) => y >= MOUTH_Y - 2 || (y >= EYE_Y + 2 && (x < EYE_X[0] || x > EYE_X[1]))), L.beard);
    if (L.flower) {
      const fx = Math.floor(CX + RX);
      const fy = FRINGE - 2;
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) K.dot(fx + dx, fy + dy, '#ffd84a');
      K.dot(fx, fy, C.orange);
    }
    paintFace(K, L);
    return K.sprite();
  });
}

function paintHat(K: Canvas, L: Look): void {
  if (!L.hat) return;
  const t = L.hatTones!;
  const mid = Math.floor(CX);
  if (L.hat === 'toque' || L.hat === 'baker') {
    const puff = L.hat === 'toque'
      ? or(blob(CX - 2.5, FRINGE - 6, 3, 3), blob(CX + 2.5, FRINGE - 6, 3, 3), blob(CX, FRINGE - 7, 3.2, 3))
      : or(blob(CX - 3, FRINGE - 4.5, 3, 2.2), blob(CX + 3, FRINGE - 4.5, 3, 2.2), blob(CX, FRINGE - 5, 2.5, 2));
    K.layer(puff, t);
    // Pleats, so the toque reads as a cook's hat and not as a block.
    if (L.hat === 'toque') for (let x = Math.ceil(CX - RX) + 1; x < CX + RX; x += 2) for (let y = 1; y < FRINGE - 3; y++) if (puff(x, y) && K.isOneOf(x, y, [t[1]])) K.dot(x, y, t[2]);
    K.layer(box(Math.ceil(CX - RX), FRINGE - 3, 2 * RX, 2), t, false);
    if (L.hat === 'baker') for (let x = Math.ceil(CX - RX); x < CX + RX; x++) K.dot(x, FRINGE - 2, '#f27a8a');
    return;
  }
  const crown = and(blob(CX, CY - 0.5, RX + 1, RY + 1, 2.4), (_x, y) => y < FRINGE - 1);
  K.layer(crown, t);
  if (L.hat === 'postman') {
    for (let x = 0; x < W; x++) if (crown(x, FRINGE - 2)) K.dot(x, FRINGE - 2, C.gold);
    K.dot(mid, FRINGE - 4, C.gold);
    K.dot(mid + 1, FRINGE - 4, C.gold);
  }
  // The cap's visor points to the side, the postman's to the front.
  K.fill(L.hat === 'cap' ? box(Math.ceil(CX - RX) - 3, FRINGE - 1, RX + 3, 1) : box(Math.ceil(CX - RX), FRINGE - 1, 2 * RX, 1), t[2]);
}

function paintFace(K: Canvas, L: Look): void {
  const mid = Math.floor(CX);
  if (L.glasses) {
    // Top and bottom bars only: side bars would swallow a one-pixel eye, the lens shows on both sides instead.
    for (const ex of EYE_X) {
      K.fill(box(ex - 1, EYE_Y - 1, 3, 4), '#e3edf6');
      for (let x = ex - 1; x <= ex + 1; x++) K.dot(x, EYE_Y - 1, FRAME), K.dot(x, EYE_Y + 2, FRAME);
    }
    for (let x = EYE_X[0] + 2; x < EYE_X[1] - 1; x++) K.dot(x, EYE_Y, FRAME);
  }
  for (const ex of EYE_X) {
    K.dot(ex, EYE_Y, OUTLINE);
    K.dot(ex, EYE_Y + 1, EYE);
  }
  const cheekY = EYE_Y + 2 + (L.glasses ? 1 : 0);
  if (!L.beard) {
    K.dot(EYE_X[0] - 1, cheekY, L.cheek ?? CHEEK);
    K.dot(EYE_X[1] + 1, cheekY, L.cheek ?? CHEEK);
  }
  if (L.freckles) for (const x of EYE_X) K.dot(x, cheekY + 1, SKIN_DEEP);
  K.dot(mid, MOUTH_Y - 2, SKIN_TONES[2]);
  K.dot(mid + 1, MOUTH_Y - 2, SKIN_DEEP);
  if (L.moustache) for (let x = mid - 2; x <= mid + 3; x++) K.dot(x, MOUTH_Y - 1, L.moustache);
  if (L.beard) {
    K.dot(mid, MOUTH_Y - 1, MOUTH);
    K.dot(mid + 1, MOUTH_Y - 1, MOUTH);
    return;
  }
  // A little smile: the corners one row up.
  K.dot(mid - 1, MOUTH_Y - 1, MOUTH);
  K.dot(mid, MOUTH_Y, MOUTH);
  K.dot(mid + 1, MOUTH_Y, MOUTH);
  K.dot(mid + 2, MOUTH_Y - 1, MOUTH);
}
