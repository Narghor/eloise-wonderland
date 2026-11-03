import type { SceneKind, Zone } from './leavesData';

// -----------------------------------------------
// SCENES AND LEAF SPRITES, drawn once and cached, in a soft picture-book style
// -----------------------------------------------

export const W = 360;
export const H = 480;
/** Every canvas is drawn at this many pixels per scene unit, so curves stay sharp. */
export const SCALE = 2;
/** Leaves only lie below the tree tops. */
export const GROUND_TOP = 96;

type G = CanvasRenderingContext2D;

/** A canvas of w by h scene units, already scaled. */
export function sharpCanvas(w: number, h: number): [HTMLCanvasElement, G] {
  const canvas = document.createElement('canvas');
  canvas.width = w * SCALE;
  canvas.height = h * SCALE;
  const g = canvas.getContext('2d')!;
  g.scale(SCALE, SCALE);
  return [canvas, g];
}

export function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('')}`;
}

/** A cheap repeatable "random" so a scene looks the same every time. */
function noise(i: number): number {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

// -----------------------------------------------
// LEAVES
// -----------------------------------------------

/** Ginkgo fan, maple, oval, oak. */
export const SHAPE_COUNT = 4;
export const LEAF_SIZE = 16;

const sprites = new Map<string, HTMLCanvasElement>();

function leafPath(g: G, shape: number): void {
  g.beginPath();
  if (shape === 0) {
    g.moveTo(0, 4);
    g.bezierCurveTo(-9, -1, -9, -8, -5, -9);
    g.quadraticCurveTo(-1, -6, 0, -8.5);
    g.quadraticCurveTo(1, -6, 5, -9);
    g.bezierCurveTo(9, -8, 9, -1, 0, 4);
  } else if (shape === 1) {
    const points = [[0, -9], [2, -4], [7, -6], [5, -1], [8, 2], [3, 2], [1, 5], [-1, 5], [-3, 2], [-8, 2], [-5, -1], [-7, -6], [-2, -4]];
    g.moveTo(0, -9);
    for (let i = 1; i <= points.length; i++) {
      const [x, y] = points[i % points.length];
      const [px, py] = points[i - 1];
      g.quadraticCurveTo((px + x) / 2 + (i % 2 ? 0.8 : -0.8), (py + y) / 2, x, y);
    }
  } else if (shape === 2) {
    g.moveTo(0, -9);
    g.bezierCurveTo(6, -5, 6, 2, 0, 5);
    g.bezierCurveTo(-6, 2, -6, -5, 0, -9);
  } else {
    // Oak: an oval with rounded lobes.
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const lobe = 1 + 0.17 * Math.abs(Math.sin(a * 3.5));
      const x = Math.sin(a) * 4.6 * lobe;
      const y = -Math.cos(a) * 7 * lobe - 2;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
  }
}

/** A leaf sprite of LEAF_SIZE units, cached by shape, colour and wetness. */
export function leafSprite(shape: number, color: string, wet: boolean): HTMLCanvasElement {
  const key = `${shape}|${color}|${wet}`;
  const cached = sprites.get(key);
  if (cached) return cached;
  const [canvas, g] = sharpCanvas(LEAF_SIZE, LEAF_SIZE);
  g.translate(LEAF_SIZE / 2, LEAF_SIZE / 2 - 1);
  const base = wet ? shade(color, 0.62) : color;
  const fill = g.createLinearGradient(-4, -9, 4, 5);
  fill.addColorStop(0, shade(base, 1.14));
  fill.addColorStop(1, shade(base, 0.84));
  leafPath(g, shape);
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = shade(base, 0.68);
  g.lineWidth = 0.5;
  g.stroke();
  // Veins: a fan for the ginkgo, a midrib for the others.
  g.strokeStyle = shade(base, 0.7);
  g.lineWidth = 0.55;
  if (shape === 0) {
    for (let k = -2; k <= 2; k++) {
      g.beginPath();
      g.moveTo(0, 3);
      g.lineTo(k * 2.6, -7);
      g.stroke();
    }
  } else {
    g.beginPath();
    g.moveTo(0, 4);
    g.lineTo(0, -7);
    g.stroke();
  }
  g.strokeStyle = '#8a5a2a';
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(0, 4);
  g.lineTo(0.5, 7.5);
  g.stroke();
  if (wet) {
    g.fillStyle = 'rgb(255 255 255 / 0.55)';
    g.beginPath();
    g.ellipse(-2, -4, 1.6, 0.9, -0.6, 0, Math.PI * 2);
    g.fill();
  }
  sprites.set(key, canvas);
  return canvas;
}

// -----------------------------------------------
// DRAWING HELPERS
// -----------------------------------------------

function disc(g: G, x: number, y: number, r: number, c: string | CanvasGradient): void {
  g.fillStyle = c;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

function round(g: G, x: number, y: number, w: number, h: number, r: number, c: string | CanvasGradient): void {
  g.fillStyle = c;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

export function shadow(g: G, x: number, y: number, rx: number, ry = rx * 0.32, alpha = 0.22): void {
  g.fillStyle = `rgb(40 50 25 / ${alpha})`;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

function vertical(g: G, y0: number, y1: number, top: string, bottom: string): CanvasGradient {
  const grad = g.createLinearGradient(0, y0, 0, y1);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  return grad;
}

/** Soft lawn: a gradient, sunny patches, little blades. */
function lawn(g: G, top: string, bottom: string, x = 0, y = 0, w = W, h = H): void {
  g.fillStyle = vertical(g, y, y + h, top, bottom);
  g.fillRect(x, y, w, h);
  for (let i = 0; i < (w * h) / 2400; i++) {
    g.fillStyle = `rgb(255 255 220 / ${0.05 + noise(i) * 0.08})`;
    g.beginPath();
    g.ellipse(x + noise(i + 3) * w, y + noise(i + 9) * h, 20 + noise(i + 1) * 30, 8 + noise(i + 2) * 10, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = 'rgb(60 110 45 / 0.35)';
  g.lineWidth = 1.2;
  for (let i = 0; i < (w * h) / 700; i++) {
    const bx = x + noise(i + 5) * w;
    const by = y + noise(i + 55) * h;
    g.beginPath();
    g.moveTo(bx, by);
    g.quadraticCurveTo(bx + 1, by - 4, bx + 3, by - 7);
    g.stroke();
  }
}

function flowerBed(g: G, x: number, y: number, count: number, colors: string[]): void {
  shadow(g, x + count * 4.5, y + 14, count * 5, 5, 0.15);
  for (let i = 0; i < count; i++) {
    const fx = x + i * 9;
    const fy = y + noise(i + x) * 10;
    g.strokeStyle = '#4f8a3a';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(fx, fy + 12);
    g.lineTo(fx, fy);
    g.stroke();
    g.fillStyle = colors[i % colors.length];
    for (let p = 0; p < 5; p++) {
      g.beginPath();
      g.arc(fx + Math.cos(p * 1.26) * 3.2, fy + Math.sin(p * 1.26) * 3.2, 2.6, 0, Math.PI * 2);
      g.fill();
    }
    disc(g, fx, fy, 2, '#ffd95a');
  }
}

function lamp(g: G, x: number, y: number): void {
  const glow = g.createRadialGradient(x, y - 76, 2, x, y - 76, 42);
  glow.addColorStop(0, 'rgb(255 240 170 / 0.55)');
  glow.addColorStop(1, 'rgb(255 240 170 / 0)');
  disc(g, x, y - 76, 42, glow);
  shadow(g, x + 2, y, 16, 5);
  round(g, x - 3, y - 70, 6, 72, 3, '#3d3a4a');
  round(g, x - 11, y - 86, 22, 18, 6, '#3d3a4a');
  round(g, x - 8, y - 83, 16, 12, 4, '#ffeaa0');
}

function stoneTile(g: G, x: number, y: number, w: number, h: number, light: string, dark: string): void {
  round(g, x, y + 3, w, h, 9, 'rgb(120 90 50 / 0.18)');
  round(g, x, y, w, h, 9, vertical(g, y, y + h, light, dark));
}

function vignette(g: G): void {
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, 'rgb(0 0 0 / 0)');
  v.addColorStop(1, 'rgb(60 40 10 / 0.18)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
}

// -----------------------------------------------
// SCENES
// -----------------------------------------------

/** The ground and everything on it; leaves are drawn over this. */
export function drawBack(zone: Zone): HTMLCanvasElement {
  const [canvas, g] = sharpCanvas(W, H);
  SCENES[zone.scene](g);
  vignette(g);
  return canvas;
}

/** The tree tops along the top: drawn over the leaves, leaves fall from them. */
export function drawFront(zone: Zone): HTMLCanvasElement {
  const [canvas, g] = sharpCanvas(W, H);
  const trees = 4;
  for (let t = 0; t < trees; t++) {
    const cx = (W / trees) * (t + 0.5) + (noise(t) - 0.5) * 30;
    shadow(g, cx + 6, GROUND_TOP + 18, 40, 10, 0.25);
    const trunk = g.createLinearGradient(cx - 8, 0, cx + 8, 0);
    trunk.addColorStop(0, '#8a5e3a');
    trunk.addColorStop(1, '#4e301c');
    g.fillStyle = trunk;
    g.beginPath();
    g.moveTo(cx - 9, GROUND_TOP + 18);
    g.lineTo(cx - 6, 40);
    g.lineTo(cx + 6, 40);
    g.lineTo(cx + 9, GROUND_TOP + 18);
    g.fill();
    // Back puffs darker, front puffs lit from the top left.
    for (let i = 0; i < 12; i++) {
      const x = cx + (noise(t * 50 + i) - 0.5) * 86;
      const y = 28 + (noise(t * 70 + i) - 0.5) * 48;
      const r = 16 + noise(t * 30 + i) * 12;
      const color = zone.palette[i % zone.palette.length];
      const puff = g.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r);
      puff.addColorStop(0, shade(color, i < 4 ? 1.0 : 1.22));
      puff.addColorStop(0.6, shade(color, i < 4 ? 0.85 : 1));
      puff.addColorStop(1, shade(color, i < 4 ? 0.62 : 0.76));
      disc(g, x, y, r, puff);
    }
    if (zone.scene === 'orchard') for (let a = 0; a < 6; a++) apple(g, cx + (noise(t * 9 + a) - 0.5) * 70, 20 + noise(t * 11 + a) * 50, 4, '#e8322a');
  }
  return canvas;
}

function apple(g: G, x: number, y: number, r: number, color: string): void {
  const body = g.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
  body.addColorStop(0, shade(color, 1.3));
  body.addColorStop(1, shade(color, 0.75));
  disc(g, x, y, r, body);
  g.strokeStyle = '#5a3a1a';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x, y - r);
  g.lineTo(x + 1, y - r - 3);
  g.stroke();
}

function pot(g: G, x: number, y: number, flower: string): void {
  shadow(g, x + 2, y + 22, 16, 5);
  g.fillStyle = vertical(g, y, y + 22, '#d9693a', '#a8452a');
  g.beginPath();
  g.moveTo(x - 14, y);
  g.lineTo(x + 14, y);
  g.lineTo(x + 10, y + 22);
  g.lineTo(x - 10, y + 22);
  g.fill();
  round(g, x - 16, y - 3, 32, 6, 3, '#c4532a');
  const leaves = g.createRadialGradient(x - 4, y - 14, 2, x, y - 9, 15);
  leaves.addColorStop(0, '#8fcf6e');
  leaves.addColorStop(1, '#4f8a3a');
  disc(g, x, y - 9, 14, leaves);
  for (const [dx, dy] of [[-6, -13], [5, -7], [1, -17]]) disc(g, x + dx, y + dy, 3.6, flower);
}

const SCENES: Record<SceneKind, (g: G) => void> = {
  path(g) {
    lawn(g, '#9fd47e', '#78b85c');
    g.fillStyle = '#e3d1ad';
    g.beginPath();
    g.moveTo(120, 0);
    g.bezierCurveTo(90, 160, 150, 300, 120, H);
    g.lineTo(250, H);
    g.bezierCurveTo(280, 300, 220, 160, 250, 0);
    g.fill();
    for (let y = 10, r = 0; y < H; y += 30, r++) {
      for (let k = 0; k < 3; k++) {
        const mid = 185 + Math.sin(y / 80) * 12;
        stoneTile(g, mid - 48 + k * 44 + (r % 2) * 10 + (noise(y + k) - 0.5) * 8, y, 38, 24, '#f6ead0', '#e2cfa8');
      }
    }
    flowerBed(g, 28, 196, 8, ['#ff8fb8', '#ffffff', '#b38df0']);
    flowerBed(g, 282, 330, 7, ['#ffd23f', '#ff8fb8', '#ffffff']);
    lamp(g, 70, 430);
    lamp(g, 290, 260);
  },
  deck(g) {
    g.fillStyle = '#6a4428';
    g.fillRect(0, 0, W, H);
    for (let y = 0, i = 0; y < H; y += 22, i++) {
      round(g, 0, y, W, 20, 3, vertical(g, y, y + 20, i % 2 ? '#d29a64' : '#c88e58', i % 2 ? '#b97d4a' : '#ad7242'));
      g.strokeStyle = 'rgb(110 70 35 / 0.25)';
      g.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.moveTo(noise(y + k) * W, y + 5 + k * 5);
        g.bezierCurveTo(noise(y + k + 1) * W, y + 3 + k * 5, noise(y + k + 2) * W, y + 8 + k * 5, noise(y + k + 3) * W, y + 6 + k * 5);
        g.stroke();
      }
      for (let x = noise(y) * 90; x < W; x += 110 + noise(y + 3) * 60) round(g, x, y, 2, 20, 1, 'rgb(110 70 35 / 0.45)');
    }
    pot(g, 44, 150, '#ff8fb8');
    pot(g, 318, 140, '#b38df0');
    pot(g, 316, 400, '#ffd23f');
    // A little table with a cup of tea.
    shadow(g, 188, 362, 46, 10);
    round(g, 152, 300, 74, 44, 12, vertical(g, 300, 344, '#f6e8cc', '#e2cfa8'));
    round(g, 160, 342, 6, 20, 3, '#8a5a34');
    round(g, 212, 342, 6, 20, 3, '#8a5a34');
    disc(g, 189, 320, 9, '#ffffff');
    disc(g, 189, 320, 6, '#c98a4a');
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(199, 320, 3.5, -1.2, 1.2);
    g.stroke();
  },
  orchard(g) {
    lawn(g, '#a6da82', '#7fbf62');
    for (let i = 0; i < 9; i++) {
      const x = 30 + noise(i + 40) * 300;
      const y = 140 + noise(i + 60) * 300;
      shadow(g, x + 1, y + 4, 5, 1.8);
      apple(g, x, y, 4.5, i % 3 ? '#d8322a' : '#e8a33a');
    }
    // A crate of apples and a ladder lying in the grass.
    shadow(g, 298, 418, 32, 8);
    round(g, 270, 380, 56, 36, 4, vertical(g, 380, 416, '#c48a55', '#9a6a40'));
    for (let x = 274; x < 326; x += 13) round(g, x, 384, 2, 28, 1, 'rgb(90 55 25 / 0.5)');
    for (const [x, c] of [[284, '#e8322a'], [298, '#f2c94c'], [312, '#e8322a']] as [number, string][]) apple(g, x, 377, 6, c);
    shadow(g, 46, 340, 26, 6);
    g.strokeStyle = '#8a5a34';
    g.lineWidth = 4;
    g.lineCap = 'round';
    for (const dx of [0, 22]) {
      g.beginPath();
      g.moveTo(24 + dx, 300);
      g.lineTo(30 + dx, 340);
      g.stroke();
    }
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.moveTo(25 + k * 1.5, 306 + k * 10);
      g.lineTo(47 + k * 1.5, 306 + k * 10);
      g.stroke();
    }
    g.lineCap = 'butt';
  },
  fountain(g) {
    g.fillStyle = vertical(g, 0, H, '#ddd3c4', '#c9bead');
    g.fillRect(0, 0, W, H);
    // Paving rings around the basin.
    for (let r = 240; r > 100; r -= 24) {
      g.strokeStyle = 'rgb(160 148 130 / 0.6)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(W / 2, 300, r, 0, Math.PI * 2);
      g.stroke();
      for (let a = 0; a < 6.28; a += 0.42 + noise(r) * 0.1) {
        g.beginPath();
        g.moveTo(W / 2 + Math.cos(a) * r, 300 + Math.sin(a) * r);
        g.lineTo(W / 2 + Math.cos(a) * (r - 24), 300 + Math.sin(a) * (r - 24));
        g.stroke();
      }
    }
    shadow(g, W / 2 + 6, 306, 104, 100, 0.18);
    disc(g, W / 2, 300, 98, vertical(g, 200, 400, '#c8beb0', '#9a9082'));
    const water = g.createRadialGradient(W / 2 - 30, 270, 10, W / 2, 300, 86);
    water.addColorStop(0, '#bfe6f6');
    water.addColorStop(1, '#4f98c8');
    disc(g, W / 2, 300, 86, water);
    g.strokeStyle = 'rgb(255 255 255 / 0.5)';
    g.lineWidth = 1.5;
    for (const r of [34, 52, 70]) {
      g.beginPath();
      g.arc(W / 2, 300, r, 3.6, 5.2);
      g.stroke();
    }
    disc(g, W / 2, 300, 20, vertical(g, 280, 320, '#d6ccbe', '#a89e90'));
    round(g, W / 2 - 5, 254, 10, 44, 5, vertical(g, 254, 298, '#d6ccbe', '#a89e90'));
    disc(g, W / 2, 252, 12, '#bfe6f6');
    disc(g, W / 2 - 3, 249, 4, '#ffffff');
    flowerBed(g, 18, 112, 10, ['#ff8fb8', '#ffd23f', '#ffffff']);
    flowerBed(g, 258, 112, 10, ['#b38df0', '#ff8fb8', '#ffffff']);
  },
  bench(g) {
    g.fillStyle = vertical(g, 0, H, '#e2d6bc', '#cdbf9f');
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 700; i++) disc(g, noise(i) * W, noise(i + 1000) * H, 1 + noise(i + 2000) * 1.4, ['rgb(170 155 125 / 0.5)', 'rgb(245 238 222 / 0.7)', 'rgb(150 135 105 / 0.4)'][i % 3]);
    lawn(g, '#9fd47e', '#86c86a', 0, 400, W, 80);
    // The bench, seen from above: three slats and iron feet.
    shadow(g, 186, 276, 92, 16, 0.25);
    for (const [y, c] of [[218, '#9a6a40'], [236, '#a87648'], [254, '#9a6a40']] as [number, string][]) round(g, 100, y, 160, 15, 5, vertical(g, y, y + 15, shade(c, 1.15), shade(c, 0.85)));
    for (const x of [104, 248]) round(g, x, 210, 8, 68, 4, '#3d3a4a');
    // A heart carved in the middle slat.
    g.fillStyle = 'rgb(110 60 30 / 0.55)';
    g.beginPath();
    g.moveTo(180, 248);
    g.bezierCurveTo(170, 241, 172, 236, 176, 236);
    g.bezierCurveTo(178, 236, 180, 238, 180, 240);
    g.bezierCurveTo(180, 238, 182, 236, 184, 236);
    g.bezierCurveTo(188, 236, 190, 241, 180, 248);
    g.fill();
    lamp(g, 50, 330);
    flowerBed(g, 232, 420, 12, ['#ff8fb8', '#ffffff', '#ffd23f']);
  },
  bridge(g) {
    lawn(g, '#9fd47e', '#7fbf62');
    const river = g.createLinearGradient(0, 180, 0, 380);
    river.addColorStop(0, '#5aa6d0');
    river.addColorStop(0.5, '#7fc4e8');
    river.addColorStop(1, '#4f98c8');
    g.fillStyle = river;
    g.beginPath();
    g.moveTo(0, 186);
    g.bezierCurveTo(120, 170, 240, 200, W, 182);
    g.lineTo(W, 376);
    g.bezierCurveTo(240, 392, 120, 362, 0, 380);
    g.fill();
    g.strokeStyle = 'rgb(255 255 255 / 0.45)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 26; i++) {
      const x = noise(i + 300) * W;
      const y = 200 + noise(i + 400) * 160;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 8, y - 3, x + 16, y);
      g.stroke();
    }
    // Reeds on both banks.
    for (let i = 0; i < 9; i++) {
      for (const [bx, by] of [[18 + i * 8, 186], [284 + i * 8, 378]]) {
        g.strokeStyle = '#4f8a3a';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(bx, by);
        g.quadraticCurveTo(bx + 2, by - 14, bx + (noise(i + bx) - 0.5) * 8, by - 26);
        g.stroke();
        round(g, bx - 1.5, by - 22, 3, 8, 1.5, '#8a5a34');
      }
    }
    // The wooden bridge.
    shadow(g, 186, 280, 70, 130, 0.22);
    for (let y = 150; y < 410; y += 16) round(g, 122, y, 116, 14, 3, vertical(g, y, y + 14, '#d29a64', '#ad7242'));
    for (const x of [112, 238]) round(g, x, 140, 10, 282, 5, vertical(g, 140, 422, '#8a5e3a', '#6a4428'));
  },
};
