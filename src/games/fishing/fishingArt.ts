import type { Fish } from './fishingData';

// -----------------------------------------------
// PIXEL FISH, DRAWN FROM THEIR COLOURS, SHAPE AND PATTERN
// -----------------------------------------------

const W = 18;
const H = 11;

/** Half-height of the body at column x, per shape. */
function halfHeight(fish: Fish, x: number): number {
  const centre = 10;
  const length = fish.shape === 'long' ? 7.5 : 6.5;
  const tall = fish.shape === 'round' ? 4.2 : fish.shape === 'flat' ? 4.6 : 2.8;
  const t = (x - centre) / length;
  return t <= -1 || t >= 1 ? 0 : tall * Math.sqrt(1 - t * t);
}

/** The fish as a pixel grid; null = transparent. `shadow` draws a dark silhouette for the notebook. */
function pixels(fish: Fish, shadow: boolean): (string | null)[][] {
  const [body, belly, fins, mark] = fish.colors;
  const grid: (string | null)[][] = Array.from({ length: H }, () => Array<string | null>(W).fill(null));
  const mid = 5;
  const set = (x: number, y: number, color: string) => {
    if (x >= 0 && x < W && y >= 0 && y < H) grid[y][x] = color;
  };
  // Tail
  for (let x = 0; x <= 2; x++) {
    const spread = 3 - x;
    for (let y = mid - spread; y <= mid + spread; y++) set(x, y, fins);
  }
  // Body, belly, pattern
  for (let x = 3; x < W; x++) {
    const h = halfHeight(fish, x);
    if (h < 0.5) continue;
    for (let y = Math.round(mid - h); y <= Math.round(mid + h); y++) {
      let color = y > mid + h * 0.25 ? belly : body;
      const hash = (x * 7 + y * 13) % 5;
      if (fish.pattern === 'stripes' && x % 3 === 0 && y <= mid + 1) color = mark;
      if (fish.pattern === 'spots' && hash === 0 && y <= mid + 1) color = mark;
      if (fish.pattern === 'scales' && (x + y) % 2 === 0 && y < mid) color = mark;
      if (fish.pattern === 'glow' && y === mid) color = mark;
      set(x, y, color);
    }
  }
  // Dorsal fin
  for (let x = 8; x <= 11; x++) set(x, Math.round(mid - halfHeight(fish, x)) - 1, fins);
  // Outline: darken every body pixel that touches the outside.
  const outline = shade(body, 0.55);
  const copy = grid.map((row) => [...row]);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!copy[y][x]) continue;
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !copy[y + dy]?.[x + dx]);
      if (edge) grid[y][x] = outline;
    }
  }
  // Eye
  const eyeX = fish.shape === 'long' ? 15 : 14;
  set(eyeX, mid - 1, '#1d1d24');
  if (shadow) return grid.map((row) => row.map((c) => (c ? '#4a4458' : null)));
  return grid;
}

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `rgb(${r},${g},${b})`;
}

/** A fish drawn `pixel` screen pixels per art pixel. */
export function fishCanvas(fish: Fish, pixel = 4, shadow = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W * pixel;
  canvas.height = H * pixel;
  canvas.className = `fish-art${fish.pattern === 'glow' && !shadow ? ' is-glowing' : ''}`;
  const ctx = canvas.getContext('2d')!;
  pixels(fish, shadow).forEach((row, y) =>
    row.forEach((color, x) => {
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x * pixel, y * pixel, pixel, pixel);
    }),
  );
  return canvas;
}
