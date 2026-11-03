import type { SceneKind, Zone } from './leavesData';

// -----------------------------------------------
// SCENES AND LEAF SPRITES, drawn once and cached
// -----------------------------------------------

export const W = 360;
export const H = 480;
/** Leaves only lie below the tree tops. */
export const GROUND_TOP = 96;

// -----------------------------------------------
// LEAVES
// -----------------------------------------------

/** 'x' leaf, 'v' vein, 's' stem. */
const SHAPES = [
  ['...x...', '..xxx..', '.xxvxx.', 'xxxvxxx', '.xxvxx.', '..xvx..', '...s...'],
  ['x..x..x', 'xx.x.xx', '.xxvxx.', 'xxxvxxx', '.xxvxx.', '..xxx..', '...s...'],
  ['.xxxxx.', 'xxxxxxx', '.xxvxx.', '..xvx..', '...v...', '...s...', '.......'],
  ['..xx...', '.xxxx..', 'xxxvxx.', 'xxxvxxx', '.xxvxx.', '..xxs..', '.......'],
];
export const SHAPE_COUNT = SHAPES.length;
const LEAF_PX = 2;
export const LEAF_SIZE = 7 * LEAF_PX;

const sprites = new Map<string, HTMLCanvasElement>();

/** A leaf sprite, cached by shape, colour and wetness. */
export function leafSprite(shape: number, color: string, wet: boolean): HTMLCanvasElement {
  const key = `${shape}|${color}|${wet}`;
  const cached = sprites.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = LEAF_SIZE;
  const g = canvas.getContext('2d')!;
  const base = wet ? shade(color, 0.55) : color;
  const vein = shade(base, 0.72);
  SHAPES[shape].forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === '.') return;
      g.fillStyle = c === 's' ? '#6a3e22' : c === 'v' ? vein : base;
      g.fillRect(x * LEAF_PX, y * LEAF_PX, LEAF_PX, LEAF_PX);
    }),
  );
  if (wet) {
    g.fillStyle = 'rgb(255 255 255 / 0.5)';
    g.fillRect(2 * LEAF_PX, 2 * LEAF_PX, LEAF_PX, LEAF_PX);
  }
  sprites.set(key, canvas);
  return canvas;
}

export function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('')}`;
}

// -----------------------------------------------
// SCENES
// -----------------------------------------------

type G = CanvasRenderingContext2D;

function rect(g: G, x: number, y: number, w: number, h: number, c: string): void {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function disc(g: G, x: number, y: number, r: number, c: string): void {
  g.fillStyle = c;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

/** A cheap repeatable "random" so a scene looks the same every time. */
function noise(i: number): number {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

function grass(g: G, top = 0, color = '#86c86a'): void {
  rect(g, 0, top, W, H - top, color);
  for (let i = 0; i < 420; i++) rect(g, noise(i) * W, top + noise(i + 500) * (H - top), 2, 4, noise(i + 900) > 0.5 ? shade(color, 0.88) : shade(color, 1.12));
}

function flowers(g: G, x: number, y: number, w: number, colors: string[]): void {
  rect(g, x, y, w, 16, '#5a8a3a');
  for (let i = 0; i < w / 6; i++) {
    const fx = x + 3 + i * 6;
    const fy = y + 3 + noise(i + x) * 8;
    rect(g, fx, fy, 4, 4, colors[i % colors.length]);
    rect(g, fx + 1, fy + 1, 2, 2, '#ffe680');
  }
}

function lamp(g: G, x: number, y: number): void {
  rect(g, x - 2, y - 70, 4, 70, '#3b3a44');
  rect(g, x - 8, y - 82, 16, 12, '#2f2e38');
  rect(g, x - 6, y - 80, 12, 8, '#ffe9a0');
  rect(g, x - 6, y - 2, 12, 4, '#2f2e38');
}

function stones(g: G, x: number, y: number, w: number, h: number): void {
  for (let i = 0; i < (w * h) / 900; i++) {
    const sx = x + noise(i + 77) * w;
    const sy = y + noise(i + 177) * h;
    rect(g, sx, sy, 6, 4, '#9a948c');
    rect(g, sx + 1, sy, 4, 1, '#c4beb6');
  }
}

/** The ground and everything on it; leaves are drawn over this. */
export function drawBack(zone: Zone): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  SCENES[zone.scene](g);
  return canvas;
}

/** The tree tops along the top: drawn over the leaves, leaves fall from them. */
export function drawFront(zone: Zone): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  const trees = 4;
  for (let t = 0; t < trees; t++) {
    const cx = (W / trees) * (t + 0.5) + (noise(t) - 0.5) * 30;
    rect(g, cx - 7, 40, 14, GROUND_TOP - 20, '#6a4428');
    rect(g, cx - 7, 40, 4, GROUND_TOP - 20, '#7e5434');
    for (let i = 0; i < 14; i++) {
      const color = zone.palette[i % zone.palette.length];
      const r = 18 + noise(t * 30 + i) * 16;
      disc(g, cx + (noise(t * 50 + i) - 0.5) * 86, 26 + (noise(t * 70 + i) - 0.5) * 50, r, i % 3 === 0 ? shade(color, 0.8) : color);
    }
    if (zone.scene === 'orchard') for (let a = 0; a < 6; a++) disc(g, cx + (noise(t * 9 + a) - 0.5) * 70, 20 + noise(t * 11 + a) * 50, 4, '#e8322a');
  }
  return canvas;
}

const SCENES: Record<SceneKind, (g: G) => void> = {
  path(g) {
    grass(g);
    rect(g, 110, 0, 140, H, '#d9c7a4');
    for (let y = 0; y < H; y += 26) for (let x = 110 + ((y / 26) % 2) * 20; x < 250; x += 40) rect(g, x + 2, y + 2, 36, 22, '#eadbbb');
    rect(g, 106, 0, 4, H, '#b8a888');
    rect(g, 250, 0, 4, H, '#b8a888');
    flowers(g, 20, 200, 70, ['#ff7fae', '#ffffff', '#9b5de5']);
    flowers(g, 270, 330, 70, ['#ffd23f', '#ff7fae', '#ffffff']);
    lamp(g, 92, 420);
    lamp(g, 268, 250);
    stones(g, 0, 100, 100, H - 100);
  },
  deck(g) {
    for (let y = 0; y < H; y += 20) {
      rect(g, 0, y, W, 18, y % 40 ? '#c48a55' : '#b97d4a');
      rect(g, 0, y + 18, W, 2, '#8a5a34');
      for (let x = noise(y) * 90; x < W; x += 110 + noise(y + 3) * 60) rect(g, x, y, 2, 18, '#8a5a34');
    }
    for (const [x, y, c] of [[40, 160, '#ff7fae'], [320, 400, '#ffd23f'], [300, 150, '#9b5de5']] as [number, number, string][]) {
      rect(g, x - 14, y, 28, 22, '#c4532a');
      rect(g, x - 16, y, 32, 5, '#a8452a');
      disc(g, x, y - 8, 14, '#5a8a3a');
      disc(g, x - 5, y - 12, 4, c);
      disc(g, x + 6, y - 6, 4, c);
    }
    rect(g, 150, 300, 70, 40, '#e8d4b0');
    rect(g, 156, 340, 6, 20, '#8a5a34');
    rect(g, 208, 340, 6, 20, '#8a5a34');
    rect(g, 175, 304, 14, 12, '#ffffff');
    rect(g, 189, 307, 4, 6, '#ffffff');
  },
  orchard(g) {
    grass(g, 0, '#8fcf6e');
    for (let i = 0; i < 9; i++) disc(g, 30 + noise(i + 40) * 300, 140 + noise(i + 60) * 300, 4, '#d8322a');
    rect(g, 270, 380, 54, 34, '#b97d4a');
    for (let x = 270; x < 324; x += 12) rect(g, x, 380, 2, 34, '#8a5a34');
    disc(g, 285, 378, 6, '#e8322a');
    disc(g, 300, 376, 6, '#f2c94c');
    disc(g, 312, 378, 6, '#e8322a');
    rect(g, 30, 300, 4, 60, '#8a5a34');
    rect(g, 20, 300, 24, 6, '#8a5a34');
    stones(g, 0, 120, W, H - 120);
  },
  fountain(g) {
    rect(g, 0, 0, W, H, '#cfc6b8');
    for (let r = 230; r > 0; r -= 26) {
      g.strokeStyle = '#b9b0a2';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(W / 2, 300, r, 0, Math.PI * 2);
      g.stroke();
    }
    disc(g, W / 2, 300, 96, '#a89e90');
    disc(g, W / 2, 300, 86, '#5aa6d0');
    disc(g, W / 2, 300, 70, '#7fc4e8');
    disc(g, W / 2 - 22, 282, 18, '#a8dcf2');
    disc(g, W / 2, 300, 18, '#a89e90');
    rect(g, W / 2 - 4, 256, 8, 40, '#a89e90');
    disc(g, W / 2, 254, 10, '#a8dcf2');
    flowers(g, 10, 110, 100, ['#ff7fae', '#ffd23f', '#ffffff']);
    flowers(g, 250, 110, 100, ['#9b5de5', '#ff7fae', '#ffffff']);
  },
  bench(g) {
    rect(g, 0, 0, W, H, '#d8cbb2');
    for (let i = 0; i < 900; i++) rect(g, noise(i) * W, noise(i + 1000) * H, 3, 3, ['#c4b597', '#e6dcc6', '#b8a98a'][i % 3]);
    rect(g, 100, 220, 160, 14, '#8a5a34');
    rect(g, 100, 238, 160, 14, '#9a6a40');
    rect(g, 100, 256, 160, 14, '#8a5a34');
    rect(g, 110, 270, 8, 30, '#3b3a44');
    rect(g, 242, 270, 8, 30, '#3b3a44');
    rect(g, 96, 200, 8, 70, '#3b3a44');
    rect(g, 256, 200, 8, 70, '#3b3a44');
    disc(g, 160, 230, 7, '#ff7fae');
    lamp(g, 60, 300);
    flowers(g, 230, 420, 120, ['#ff7fae', '#ffffff', '#ffd23f']);
  },
  bridge(g) {
    grass(g, 0, '#7fbf62');
    rect(g, 0, 180, W, 200, '#4f98c8');
    for (let i = 0; i < 70; i++) rect(g, noise(i + 300) * W, 185 + noise(i + 400) * 190, 14 + noise(i) * 14, 2, '#8ac6e6');
    rect(g, 0, 176, W, 6, '#6a9a4a');
    rect(g, 0, 378, W, 6, '#6a9a4a');
    rect(g, 120, 150, 120, 260, '#c48a55');
    for (let y = 150; y < 410; y += 16) rect(g, 120, y, 120, 2, '#8a5a34');
    rect(g, 114, 140, 8, 280, '#7a4e2c');
    rect(g, 238, 140, 8, 280, '#7a4e2c');
    for (let i = 0; i < 8; i++) {
      rect(g, 20 + i * 9, 160 - noise(i) * 20, 2, 26, '#5a8a3a');
      rect(g, 290 + i * 8, 370 - noise(i + 9) * 20, 2, 26, '#5a8a3a');
    }
  },
};
