import { mulberry32 } from '../../random';

// -----------------------------------------------
// THE FARM'S PAINTING KIT
// -----------------------------------------------
// The sprite engine, the palette and the shared pieces every drawing is built from (buildings, pens).
// Drawing modules import from here; nothing here imports a drawing.

export const TILE = 16;
export const OUTLINE = '#4a3135';
export type Sprite = HTMLCanvasElement;
export type View = 'face' | 'profile';
export type FieldStage = 'empty' | 'sprout' | 'growing' | 'ripe';

// -----------------------------------------------
// SPRITE ENGINE
// -----------------------------------------------

export interface Painter {
  px(x: number, y: number, col: string): void;
  rect(x: number, y: number, w: number, h: number, col: string): void;
  ellipse(cx: number, cy: number, rx: number, ry: number, col: string): void;
  disc(cx: number, cy: number, r: number, col: string): void;
  line(x0: number, y0: number, x1: number, y1: number, col: string): void;
  map(x: number, y: number, rows: readonly string[], pal: Record<string, string>): void;
  /** Crops only: the row the next plant stands on (the wind leans what is high above it). */
  foot?(y: number): void;
}

export function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * A drawing of w x h pixels; `margin` pixels are added around it for the outline. `glaze` paints after the outline,
 * for what must stay light and thin (water jets): it gets no outline.
 */
export function sprite(w: number, h: number, paint: (P: Painter) => void, outline = true, margin = 1, glaze?: (P: Painter) => void): Sprite {
  const c = canvas(w + 2 * margin, h + 2 * margin);
  paint(painterOn(c, margin));
  if (outline) addOutline(c);
  if (glaze) glaze(painterOn(c, margin));
  return c;
}

function painterOn(c: HTMLCanvasElement, margin: number): Painter {
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const fill = (x: number, y: number, ww: number, hh: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x + margin, y + margin, ww, hh);
  };
  const P: Painter = {
    px: (x, y, col) => fill(Math.round(x), Math.round(y), 1, 1, col),
    rect: (x, y, ww, hh, col) => fill(Math.round(x), Math.round(y), ww, hh, col),
    ellipse(cx, cy, rx, ry, col) {
      for (let y = -ry; y <= ry; y++) {
        for (let x = -rx; x <= rx; x++) {
          if ((x * x) / ((rx + 0.45) * (rx + 0.45)) + (y * y) / ((ry + 0.45) * (ry + 0.45)) <= 1) fill(cx + x, cy + y, 1, 1, col);
        }
      }
    },
    disc: (cx, cy, r, col) => P.ellipse(cx, cy, r, r, col),
    line(x0, y0, x1, y1, col) {
      const dx = Math.abs(x1 - x0);
      const dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        P.px(x0, y0, col);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) {
          err += dy;
          x0 += sx;
        }
        if (e2 <= dx) {
          err += dx;
          y0 += sy;
        }
      }
    },
    map(x, y, rows, pal) {
      rows.forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch !== '.' && pal[ch]) P.px(x + i, y + j, pal[ch]);
      }));
    },
  };
  return P;
}

function addOutline(c: HTMLCanvasElement): void {
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const { width: w, height: h } = c;
  const d = g.getImageData(0, 0, w, h).data;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  g.fillStyle = OUTLINE;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) g.fillRect(x, y, 1, 1);
    }
  }
}

const cache = new Map<string, Sprite>();
export function cached(key: string, make: () => Sprite): Sprite {
  let s = cache.get(key);
  if (!s) {
    s = make();
    cache.set(key, s);
  }
  return s;
}

/** A pixel map drawing: each row a string, '.' transparent, other letters looked up in the palette. */
/** An icon as a pixel map: rows of letters looked up in the palette, '.' transparent. */
export type PixelMap = { rows: string[]; pal: Record<string, string> };

/** Rows of a field's plants, from the back: each plant stands with its foot on one of them (14 x 24 field drawing). */
export const RIDGES = [12, 16, 20];

export function mapSprite(rows: readonly string[], pal: Record<string, string>): Sprite {
  const w = Math.max(...rows.map((r) => r.length));
  return sprite(w, rows.length, (P) => P.map(0, 0, rows, pal));
}

// -----------------------------------------------
// PALETTE
// -----------------------------------------------

export const C = {
  soil: '#b07a52', soilDark: '#8f5e3e', soilLight: '#c99466',
  wood: '#c38a55', woodDark: '#9a6639', woodLight: '#dcaa72',
  roof: '#d9606a', roofDark: '#b4474f', roofLight: '#ee8b90',
  straw: '#ead69d', strawDark: '#d6bd78', strawLight: '#f5e7bf',
  leaf: '#5aa54a', leafDark: '#468a3b', leafLight: '#7cc456', leafPale: '#a6dc7f',
  gold: '#f2c94c', goldDark: '#d9a339', goldLight: '#fbe38a',
  stone: '#e8e0d2', stoneDark: '#cfc3b1', grey: '#bdb6ae', greyDark: '#9c958d', greyLight: '#dad5ce',
  cream: '#f6e5c8', brick: '#c96a4e', brickDark: '#a9533b', glow: '#ffd479', white: '#fffaf2',
  door: '#6b4a3a', bark: '#8a5a3b', barkDark: '#6f4630',
  water: '#5c9fd6', waterDark: '#4a86bd', waterLight: '#a8d6f5',
  blue: '#5b86b8', blueDark: '#45699a', blueLight: '#86acd6',
  red: '#e0475b', orange: '#f08a2b', orangeDark: '#d46a1f',
};

// -----------------------------------------------
// BUILDING KIT: one light from the top left, three or four tones per material (docs/ferme.md 16, step 3)
// -----------------------------------------------

/** Light, base, dark, deep. */
export type Tones = readonly [string, string, string, string];

export const ROOF_RED: Tones = ['#f6a98a', '#de7a5c', '#bb5a42', '#9c4634'];
export const ROOF_BLUE: Tones = ['#a4c8ee', '#6a98cc', '#4f78ab', '#3d5f8c'];
export const ROOF_BROWN: Tones = ['#c39064', '#9a6644', '#7a4c31', '#5e3824'];
export const ROOF_SLATE: Tones = ['#a08b8b', '#7a6666', '#5e4d4d', '#463939'];
export const DOOR: Tones = ['#c08657', '#a46c46', '#8d5a3c', '#6b4430'];
export const DOOR_BLUE: Tones = ['#a4c8ee', '#5b86b8', '#45699a', '#2f4f78'];
export const TIMBER = '#7a4b33';
export const TIMBER_LIGHT = '#9a6542';
export const WARM_STONE = ['#efe1c8', '#d9c4a2', '#b49a76'] as const;
export const GLINT = '#ffffff';

/** A front roof in scalloped tiles, narrowing towards its ridge; its right end in shade. */
export function tiledRoof(P: Painter, top: number, rows: number, width: number, t: Tones): void {
  const inset = (row: number) => Math.max(0, 6 - Math.floor(row * 0.5));
  for (let i = 0; i < rows; i++) P.rect(inset(i), top + i, width - 2 * inset(i), 1, i === 0 ? t[0] : t[1]);
  for (let i = 2; i < rows; i += 3) {
    const shift = Math.floor(i / 3) % 2 ? 2 : 0;
    const right = width - inset(i);
    for (let x = inset(i) + shift; x < right; x += 4) {
      P.rect(x, top + i, Math.min(3, right - x), 1, t[2]);
      if (x + 3 < width - inset(i - 1) - 3) P.px(x + 3, top + i - 1, t[2]);
      if (x + 1 < width - inset(i - 2) - 3) P.px(x + 1, top + i - 2, t[0]);
    }
  }
  for (let i = 0; i < rows; i++) P.rect(width - inset(i) - 3, top + i, 3, 1, i % 3 === 2 ? t[3] : t[2]);
}

/** The thick front edge of a roof, and the shade it casts on the wall under it. */
export function eave(P: Painter, x: number, y: number, w: number, t: Tones, wallShade: string): void {
  P.rect(x, y, w, 2, t[3]);
  P.rect(x, y, w, 1, t[2]);
  P.rect(x + 1, y + 2, w - 2, 1, wallShade);
}

/** A gable end: a triangle of wall between two barge boards, light on the left, dark on the right. */
export function tiledGable(P: Painter, cx: number, top: number, rows: number, slope: number, t: Tones, wall: string): void {
  for (let i = 0; i < rows; i++) {
    const half = Math.round(i * slope) + 1;
    P.rect(cx - half - 1, top + i, 2 * half + 3, 1, i < 2 ? t[0] : t[1]);
    if (half > 2) P.rect(cx - half + 2, top + i, 2 * half - 3, 1, wall);
    P.px(cx - half - 1, top + i, t[0]);
    P.px(cx + half + 1, top + i, t[3]);
    if (half > 1) P.px(cx + half, top + i, t[2]);
  }
}

/** Cut stones: dark joints, light tops; clipped to the band. */
export function stones(P: Painter, x0: number, y0: number, w: number, h: number, [light, base, dark]: readonly [string, string, string]): void {
  P.rect(x0, y0, w, h, base);
  const clip = (x: number, y: number, ww: number, hh: number, col: string) => {
    const r = Math.min(x + ww, x0 + w);
    const b = Math.min(y + hh, y0 + h);
    if (r > x && b > y) P.rect(x, y, r - x, b - y, col);
  };
  for (let y = y0; y < y0 + h; y += 3) {
    clip(x0, y, w, 1, dark);
    const odd = Math.floor((y - y0) / 3) % 2 === 1;
    for (let x = x0 + (odd ? 2 : 5); x < x0 + w; x += 6) clip(x, y + 1, 1, 2, dark);
    for (let x = x0 + (odd ? 3 : 0); x < x0 + w; x += 6) clip(x, y + 1, 2, 1, light);
  }
}

export interface WindowLook {
  /** A box of flowers under the sill. */
  flowers?: boolean;
  frame?: string;
  glass?: string;
}

/** A window set into the wall: frame, glass shaded on its top and left, cross bars, a glint. */
export function framedWindow(P: Painter, x: number, y: number, w: number, h: number, look: WindowLook = {}): void {
  const glass = look.glass ?? C.glow;
  const inner = look.glass ? '#a9c9de' : '#e8b54a';
  P.rect(x - 1, y - 1, w + 2, h + 2, look.frame ?? C.woodDark);
  P.rect(x, y, w, h, glass);
  P.rect(x, y, w, 1, inner);
  P.rect(x, y, 1, h, inner);
  if (w > 3) P.rect(x + Math.floor(w / 2), y, 1, h, look.frame ?? C.woodDark);
  if (h > 4) P.rect(x, y + Math.floor(h / 2), w, 1, look.frame ?? C.woodDark);
  P.px(x + 1, y + 1, GLINT);
  if (w > 3 && h > 3) P.px(x + 2, y + 2, '#fff3c4');
  if (look.flowers) {
    P.rect(x - 1, y + h + 1, w + 2, 1, C.woodLight);
    P.rect(x - 1, y + h + 2, w + 2, 1, C.wood);
    for (let i = 0; i < w; i += 2) {
      P.px(x + i, y + h + 1, i % 4 === 0 ? '#ff8fb8' : C.gold);
      if (i + 1 < w) P.px(x + i + 1, y + h + 1, C.leaf);
    }
  }
}

/** A plank door set into the wall, its top rounded; the knob on the right. */
export function plankDoor(P: Painter, x: number, y: number, w: number, h: number, t: Tones = DOOR): void {
  P.rect(x - 1, y + 1, w + 2, h - 1, t[3]);
  P.rect(x, y, w, 1, t[3]);
  P.rect(x, y + 2, w, h - 2, t[1]);
  P.rect(x + 1, y + 1, w - 2, 1, t[1]);
  P.rect(x, y + 2, 1, h - 2, t[2]);
  for (let px = x + 2; px < x + w - 1; px += 2) P.rect(px, y + 3, 1, h - 3, t[2]);
  P.rect(x + 1, y + 2, 1, 1, t[0]);
  P.px(x + w - 2, y + Math.floor(h / 2) + 1, C.gold);
}

export const IRON = '#5b4a48';
export const IRON_LIGHT = '#7d6b68';

// -----------------------------------------------
// PEN KIT: a 46-pixel-wide yard, its ranch fences, plank walls
// -----------------------------------------------

/** The yard's ground from `top` down, speckled. */
export function yard(P: Painter, top: number, base: string, dark: string, light: string, seed: number): void {
  const r = mulberry32(seed);
  P.rect(0, top, 46, 58 - top + (top > 12 ? 2 : 0), base);
  for (let i = 0; i < 90; i++) P.px(Math.floor(r() * 46), top + 2 + Math.floor(r() * (56 - top)), r() < 0.5 ? dark : light);
}

/** A ranch rail from x to x + w: light top, dark underside, like the ranch fences. */
export function rail(P: Painter, x: number, y: number, w: number): void {
  P.rect(x, y, w, 2, C.wood);
  P.rect(x, y, w, 1, C.woodLight);
  P.rect(x, y + 1, w, 1, C.woodDark);
}

/** A ranch post: light face, shaded right edge, a straw-light cap. */
export function post(P: Painter, x: number, y: number, h: number): void {
  P.rect(x, y, 2, h, C.woodLight);
  P.px(x + 1, y + 1, C.wood);
  P.rect(x + 1, y + 2, 1, h - 2, C.wood);
  P.px(x, y, C.strawLight);
}

/** The pen's sides and front, in the ranch fence's style. */
export function sideAndFrontFence(P: Painter, from: number, bottom: number): void {
  for (let y = from; y < bottom; y += 6) {
    P.rect(0, y, 2, 4, C.wood);
    P.rect(44, y, 2, 4, C.wood);
    P.px(0, y, C.woodLight);
  }
  P.rect(0, from, 1, bottom - from, C.woodDark);
  P.rect(45, from, 1, bottom - from, C.woodDark);
  rail(P, 0, bottom - 8, 46);
  rail(P, 0, bottom - 4, 46);
  for (let x = 0; x < 46; x += 7) post(P, x, bottom - 10, 10);
  post(P, 44, bottom - 10, 10);
}

/** The fence at the back of a pen. */
export function backFence(P: Painter, top: number): void {
  rail(P, 0, top + 3, 46);
  rail(P, 0, top + 6, 46);
  for (let x = 0; x < 46; x += 7) post(P, x, top, 9);
}

/** Wooden planks: a dark line every few columns, the right end in shade. */
export function planks(P: Painter, x: number, y: number, w: number, h: number): void {
  P.rect(x, y, w, h, C.wood);
  P.rect(x + w - 4, y, 4, h, '#ad7645');
  for (let px = x + 2; px < x + w; px += 4) P.rect(px, y, 1, h, C.woodDark);
  P.rect(x, y, 1, h, C.woodLight);
  P.rect(x, y + h - 1, w, 1, C.woodDark);
}

// -----------------------------------------------
// COOKIES: the Cookiterie and every animal's food
// -----------------------------------------------

export const ROOF_PINK: Tones = ['#fbc4d2', '#ec94ac', '#cc6e8a', '#a8526c'];
export const COOKIE = { light: '#f6d29a', base: '#e3ab66', dark: '#b9773f', chip: '#6b3e26' };

/** A big round cookie, its chips, a glint top left. */
export function cookieDisc(P: Painter, cx: number, cy: number, r: number): void {
  P.disc(cx, cy, r, COOKIE.dark);
  P.disc(cx, cy, r - 1, COOKIE.base);
  P.px(cx - r + 2, cy - r + 2, COOKIE.light);
  P.px(cx - r + 3, cy - r + 2, COOKIE.light);
  for (const [dx, dy] of [[-2, -1], [1, -2], [2, 1], [-1, 2], [0, 0]] as const) {
    if (Math.abs(dx) < r - 1 && Math.abs(dy) < r - 1) P.px(cx + dx, cy + dy, COOKIE.chip);
  }
}
