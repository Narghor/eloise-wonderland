import { shade, sharpCanvas } from '../leaves/leavesArt';
import type { Ambiance } from './aquariumData';

// -----------------------------------------------
// THE TANK BACKGROUNDS AND THE DECORATIONS, soft picture-book style like the leaves
// -----------------------------------------------

export const TW = 360;
export const TH = 300;
/** The sand starts here; fish swim above it. */
export const FLOOR = 244;

type G = CanvasRenderingContext2D;

function noise(i: number): number {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

function disc(g: G, x: number, y: number, r: number, c: string | CanvasGradient): void {
  g.fillStyle = c;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

function vertical(g: G, y0: number, y1: number, stops: string[]): CanvasGradient {
  const grad = g.createLinearGradient(0, y0, 0, y1);
  stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
  return grad;
}

interface Look {
  water: string[];
  sand: string[];
  plants: string;
  rays: number;
}

const LOOKS: Record<Ambiance, Look> = {
  pond: { water: ['#9ed8c8', '#5aa89a', '#2f6e66'], sand: ['#c9b48a', '#a8916a'], plants: '#4f8a3a', rays: 0.16 },
  river: { water: ['#bfe8f6', '#6ab8dc', '#2f7aa8'], sand: ['#e8dcbc', '#c9b892'], plants: '#5a9a4a', rays: 0.2 },
  night: { water: ['#3a4a8a', '#202a5a', '#0e1430'], sand: ['#5a5470', '#3e3a52'], plants: '#2f5a4a', rays: 0 },
  seasons: { water: ['#f2d4a8', '#c98a5a', '#6a3e3a'], sand: ['#d9b88a', '#a8845a'], plants: '#8a6a2a', rays: 0.14 },
  wonders: { water: ['#d8c8f2', '#8a7ad0', '#3e3a8a'], sand: ['#f2e2c4', '#cbb892'], plants: '#3f9a7a', rays: 0.18 },
};

/** The water, light, sand and back plants of a tank. */
export function drawTank(ambiance: Ambiance): HTMLCanvasElement {
  const look = LOOKS[ambiance];
  const [canvas, g] = sharpCanvas(TW, TH);
  g.fillStyle = vertical(g, 0, TH, look.water);
  g.fillRect(0, 0, TW, TH);
  // Light rays from the surface.
  for (let i = 0; i < 5 && look.rays > 0; i++) {
    const x = 30 + i * 74 + noise(i) * 30;
    const ray = g.createLinearGradient(0, 0, 0, FLOOR);
    ray.addColorStop(0, `rgb(255 255 240 / ${look.rays})`);
    ray.addColorStop(1, 'rgb(255 255 240 / 0)');
    g.fillStyle = ray;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + 26, 0);
    g.lineTo(x + 60, FLOOR);
    g.lineTo(x + 18, FLOOR);
    g.fill();
  }
  // Back plants, blurred by distance.
  g.globalAlpha = 0.45;
  for (let i = 0; i < 9; i++) {
    const x = noise(i + 20) * TW;
    const h = 60 + noise(i + 30) * 90;
    g.strokeStyle = look.plants;
    g.lineWidth = 6;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, FLOOR + 6);
    g.bezierCurveTo(x - 14, FLOOR - h * 0.4, x + 14, FLOOR - h * 0.7, x - 4, FLOOR - h);
    g.stroke();
  }
  g.globalAlpha = 1;
  // Sand with a soft wavy edge and a few pebbles.
  g.fillStyle = vertical(g, FLOOR - 10, TH, look.sand);
  g.beginPath();
  g.moveTo(0, TH);
  g.lineTo(0, FLOOR);
  for (let x = 0; x <= TW; x += 20) g.quadraticCurveTo(x + 10, FLOOR - 6 + noise(x) * 8, x + 20, FLOOR + noise(x + 1) * 4);
  g.lineTo(TW, TH);
  g.fill();
  for (let i = 0; i < 40; i++) disc(g, noise(i + 50) * TW, FLOOR + 10 + noise(i + 60) * (TH - FLOOR - 12), 1 + noise(i + 70) * 2, shade(look.sand[1], 0.8 + noise(i) * 0.3));
  if (ambiance === 'night') for (let i = 0; i < 30; i++) disc(g, noise(i + 90) * TW, noise(i + 95) * FLOOR, 0.8, 'rgb(255 255 255 / 0.5)');
  if (ambiance === 'seasons') {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = ['#e8322a', '#f09a3c', '#ffd23f'][i % 3];
      g.beginPath();
      g.ellipse(noise(i + 110) * TW, 6 + noise(i + 120) * 8, 6, 3, noise(i) * 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  return canvas;
}

/** The glass: a soft vignette and a highlight, drawn over the fish. */
export function drawGlass(): HTMLCanvasElement {
  const [canvas, g] = sharpCanvas(TW, TH);
  const v = g.createRadialGradient(TW / 2, TH / 2, TH * 0.4, TW / 2, TH / 2, TH * 0.9);
  v.addColorStop(0, 'rgb(0 0 0 / 0)');
  v.addColorStop(1, 'rgb(0 20 30 / 0.3)');
  g.fillStyle = v;
  g.fillRect(0, 0, TW, TH);
  g.fillStyle = 'rgb(255 255 255 / 0.12)';
  g.beginPath();
  g.moveTo(20, 0);
  g.lineTo(60, 0);
  g.lineTo(20, 120);
  g.lineTo(0, 120);
  g.fill();
  return canvas;
}

// -----------------------------------------------
// DECORATIONS (about 56 units wide, standing on their base at y = 0)
// -----------------------------------------------

function blade(g: G, x: number, h: number, bend: number, color: string): void {
  g.strokeStyle = color;
  g.lineWidth = 4;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, 0);
  g.quadraticCurveTo(x + bend, -h / 2, x + bend * 0.4, -h);
  g.stroke();
}

function stone(g: G, x: number, y: number, rx: number, ry: number, color: string): void {
  const grad = g.createRadialGradient(x - rx * 0.4, y - ry * 0.5, 1, x, y, rx);
  grad.addColorStop(0, shade(color, 1.3));
  grad.addColorStop(1, shade(color, 0.7));
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

const DECOR: Record<string, (g: G) => void> = {
  weeds(g) {
    for (let i = 0; i < 6; i++) blade(g, -14 + i * 6, 34 + noise(i) * 26, (noise(i + 4) - 0.5) * 20, i % 2 ? '#5aa84a' : '#3f8a3a');
  },
  pebbles(g) {
    for (const [x, y, r, c] of [[-14, -4, 8, '#9a948c'], [2, -5, 10, '#b8b0a4'], [16, -3, 7, '#8a847c'], [-4, -2, 5, '#c4beb6']] as [number, number, number, string][]) stone(g, x, y, r, r * 0.7, c);
  },
  rock(g) {
    stone(g, 0, -16, 26, 18, '#8a8478');
    g.fillStyle = '#3e3a36';
    g.beginPath();
    g.ellipse(4, -10, 8, 9, 0, Math.PI, 0);
    g.fill();
    for (let i = 0; i < 4; i++) disc(g, -16 + i * 8, -28 + noise(i) * 6, 3, '#5aa84a');
  },
  shell(g) {
    const grad = g.createRadialGradient(-4, -14, 2, 0, -10, 20);
    grad.addColorStop(0, '#fff0e8');
    grad.addColorStop(1, '#f0a8a0');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, -2);
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      g.quadraticCurveTo(Math.cos(a - 0.2) * 22, -10 + Math.sin(a - 0.2) * 20, Math.cos(a) * 18, -8 + Math.sin(a) * 16);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgb(200 110 100 / 0.6)';
    g.lineWidth = 1.2;
    for (let i = 1; i < 8; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      g.beginPath();
      g.moveTo(0, -2);
      g.lineTo(Math.cos(a) * 17, -8 + Math.sin(a) * 15);
      g.stroke();
    }
  },
  amphora(g) {
    g.save();
    g.rotate(-0.35);
    const grad = g.createLinearGradient(-14, 0, 14, 0);
    grad.addColorStop(0, '#e08a5a');
    grad.addColorStop(1, '#a8452a');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(-5, -44);
    g.lineTo(5, -44);
    g.bezierCurveTo(18, -34, 16, -8, 4, 0);
    g.lineTo(-4, 0);
    g.bezierCurveTo(-16, -8, -18, -34, -5, -44);
    g.fill();
    g.strokeStyle = '#a8452a';
    g.lineWidth = 3;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.arc(s * 9, -38, 5, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = '#f2c94c';
    g.fillRect(-12, -24, 24, 3);
    g.restore();
  },
  chest(g) {
    g.fillStyle = vertical(g, -24, 0, ['#c48a55', '#8a5a34']);
    g.beginPath();
    g.roundRect(-22, -22, 44, 22, 3);
    g.fill();
    g.fillStyle = '#6a4428';
    g.beginPath();
    g.ellipse(0, -22, 22, 10, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = '#f2c94c';
    g.fillRect(-22, -14, 44, 3);
    g.fillRect(-3, -20, 6, 10);
    for (let i = 0; i < 5; i++) disc(g, -10 + i * 5, -26 - noise(i) * 4, 3, '#ffd23f');
  },
  bubbler(g) {
    stone(g, 0, -6, 14, 8, '#7a7470');
    disc(g, 0, -12, 4, '#3e3a36');
  },
  castle(g) {
    const wall = vertical(g, -56, 0, ['#e8dcc6', '#b8a88a']);
    g.fillStyle = wall;
    g.fillRect(-24, -30, 48, 30);
    for (const x of [-24, 12]) {
      g.fillRect(x, -52, 12, 52);
      g.fillStyle = '#c4532a';
      g.beginPath();
      g.moveTo(x - 2, -52);
      g.lineTo(x + 6, -64);
      g.lineTo(x + 14, -52);
      g.fill();
      g.fillStyle = wall;
    }
    g.fillStyle = '#3e3a36';
    g.beginPath();
    g.roundRect(-6, -18, 12, 18, [6, 6, 0, 0]);
    g.fill();
    for (const x of [-20, 16]) disc(g, x, -40, 2.2, '#3e3a36');
  },
  lily(g) {
    blade(g, 0, 60, 6, '#3f8a3a');
    g.fillStyle = '#4f9a3a';
    g.beginPath();
    g.ellipse(4, -60, 18, 5, 0, 0.3, Math.PI * 2);
    g.lineTo(4, -60);
    g.fill();
    for (let i = 0; i < 6; i++) {
      g.save();
      g.translate(4, -66);
      g.rotate(-Math.PI / 2 + (i - 2.5) * 0.4);
      g.fillStyle = i % 2 ? '#ffc4dd' : '#ff8fb8';
      g.beginPath();
      g.ellipse(0, -6, 3, 7, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  },
  mill(g) {
    g.fillStyle = vertical(g, -40, 0, ['#c48a55', '#8a5a34']);
    g.fillRect(-20, -34, 30, 34);
    g.fillStyle = '#c4532a';
    g.beginPath();
    g.moveTo(-24, -34);
    g.lineTo(-5, -48);
    g.lineTo(14, -34);
    g.fill();
    g.strokeStyle = '#6a4428';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(16, -16, 14, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath();
      g.moveTo(16, -16);
      g.lineTo(16 + Math.cos(a) * 16, -16 + Math.sin(a) * 16);
      g.stroke();
    }
  },
  moon(g) {
    const glow = g.createRadialGradient(0, -24, 2, 0, -24, 30);
    glow.addColorStop(0, 'rgb(255 250 200 / 0.6)');
    glow.addColorStop(1, 'rgb(255 250 200 / 0)');
    disc(g, 0, -24, 30, glow);
    stone(g, 0, -4, 12, 5, '#6a6478');
    disc(g, 0, -24, 14, '#fff6c8');
    disc(g, 6, -28, 12, 'rgb(40 50 100 / 0.9)');
  },
  lantern(g) {
    g.fillStyle = '#7a7470';
    g.fillRect(-4, -30, 8, 30);
    g.fillRect(-14, -34, 28, 6);
    g.fillStyle = '#ffd98a';
    g.fillRect(-10, -50, 20, 16);
    g.fillStyle = '#5a5450';
    g.beginPath();
    g.moveTo(-16, -50);
    g.lineTo(0, -62);
    g.lineTo(16, -50);
    g.fill();
    const glow = g.createRadialGradient(0, -42, 2, 0, -42, 24);
    glow.addColorStop(0, 'rgb(255 220 140 / 0.6)');
    glow.addColorStop(1, 'rgb(255 220 140 / 0)');
    disc(g, 0, -42, 24, glow);
  },
  pagoda(g) {
    for (let level = 0; level < 3; level++) {
      const y = -level * 20;
      const w = 34 - level * 8;
      g.fillStyle = '#e8506a';
      g.fillRect(-w / 2 + 4, y - 16, w - 8, 16);
      g.fillStyle = '#3e3a36';
      g.beginPath();
      g.moveTo(-w / 2 - 6, y - 14);
      g.quadraticCurveTo(0, y - 26, w / 2 + 6, y - 14);
      g.lineTo(w / 2 - 2, y - 18);
      g.quadraticCurveTo(0, y - 28, -w / 2 + 2, y - 18);
      g.fill();
    }
  },
};

const cache = new Map<string, HTMLCanvasElement>();

/** A decoration sprite, 64 by 72 units, its base at the bottom centre. */
export function decorationSprite(id: string): HTMLCanvasElement {
  const cached = cache.get(id);
  if (cached) return cached;
  const [canvas, g] = sharpCanvas(64, 72);
  g.translate(32, 68);
  g.fillStyle = 'rgb(20 30 30 / 0.22)';
  g.beginPath();
  g.ellipse(0, 0, 24, 5, 0, 0, Math.PI * 2);
  g.fill();
  DECOR[id]?.(g);
  cache.set(id, canvas);
  return canvas;
}
