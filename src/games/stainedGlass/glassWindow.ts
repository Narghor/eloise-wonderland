// -----------------------------------------------
// STAINED-GLASS WINDOW: SHAPE, PIECES, NEIGHBOURS
// -----------------------------------------------
// Coordinates are in window units: u from 0 to 1 across, v from 0 to WINDOW_ASPECT down.
// Pieces are Voronoi cells of seed points, evened out by Lloyd relaxation.

import { mulberry32, shuffled } from '../../random';
import type { LevelTable } from '../../difficulty';

export const WINDOW_ASPECT = 1.5;
/** Resolution of the playable window; also the one the neighbours are computed at. */
export const GAME_WIDTH = 360;

const FRAME_MARGIN = 0.04;
const RELAX_WIDTH = 90;
const RELAX_ITERATIONS = 3;
/** Two pieces touching on fewer border pixels than this only meet at a corner: not neighbours. */
const MIN_SHARED_BORDER = 4;

export type Point = [number, number];

export const JEWEL_COLORS = ['#c8324b', '#2f5fb3', '#2e9d6a', '#f2b33d', '#8a4fbf', '#2fb3b3'];
export const COLORS_PER_WINDOW = 4;

export interface Layout {
  seeds: Point[];
  palette: string[];
  /** One colour index per piece: a valid answer the quotas and hints come from. */
  solution: number[];
  /** How many pieces of each palette colour the window needs. */
  quotas: number[];
  /** Pieces given from the start, locked to their solution colour. */
  hints: Set<number>;
  neighbours: number[][];
}

export interface Raster {
  width: number;
  height: number;
  /** Piece index per pixel, -1 outside the window. */
  region: Int16Array;
  /** 1 where the lead (the dark joint between pieces) is drawn. */
  lead: Uint8Array;
  centroids: Point[];
  /** Distance from each piece's centroid to its farthest pixel, in pixels. */
  radii: number[];
}

export const WINDOW_SHAPES = ['arch', 'rose', 'gothic', 'heart'] as const;
export type WindowShape = (typeof WINDOW_SHAPES)[number];

export function isWindowShape(value: unknown): value is WindowShape {
  return typeof value === 'string' && (WINDOW_SHAPES as readonly string[]).includes(value);
}

export function insideWindow(shape: WindowShape, u: number, v: number): boolean {
  if (u < FRAME_MARGIN || u > 1 - FRAME_MARGIN || v < FRAME_MARGIN || v > WINDOW_ASPECT - FRAME_MARGIN) return false;
  switch (shape) {
    case 'rose':
      return (u - 0.5) ** 2 + (v - WINDOW_ASPECT / 2) ** 2 <= (0.5 - FRAME_MARGIN) ** 2;
    case 'gothic': {
      // Two arcs, each centred on the opposite side, meeting in a point at the top.
      const springY = 0.62;
      if (v >= springY) return true;
      const radius = 0.6;
      const left = (u - (FRAME_MARGIN + radius)) ** 2 + (v - springY) ** 2 <= radius * radius;
      const right = (u - (1 - FRAME_MARGIN - radius)) ** 2 + (v - springY) ** 2 <= radius * radius;
      return left && right;
    }
    case 'heart': {
      // The curve spans x in [-1.14, 1.14] and y in [-1, 1.25]: scaled and centred in the frame.
      const x = (u - 0.5) / 0.4;
      const y = (0.82 - v) / 0.55;
      return (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0;
    }
    default: {
      if (v >= 0.5) return true;
      const radius = 0.5 - FRAME_MARGIN;
      return (u - 0.5) ** 2 + (v - 0.5) ** 2 <= radius * radius;
    }
  }
}

// -----------------------------------------------
// GENERATION
// -----------------------------------------------

/** 10, 19, 28, 37 then 45 pieces, with fewer of them given as hints. */
export const GLASS_LEVELS: LevelTable = [1, 4, 7, 10, 13];

export function pieceCountFor(level: number): number {
  return Math.min(10 + 3 * (level - 1), 45);
}

/** Same seed, level and shape, same window: only those need saving. */
export function generateLayout(seed: number, level: number, shape: WindowShape): Layout {
  const random = mulberry32(seed);
  const count = pieceCountFor(level);

  let seeds: Point[] = [];
  while (seeds.length < count) {
    const point: Point = [random(), random() * WINDOW_ASPECT];
    if (insideWindow(shape, point[0], point[1])) seeds.push(point);
  }
  for (let i = 0; i < RELAX_ITERATIONS; i++) {
    const raster = rasterize(seeds, RELAX_WIDTH, shape);
    seeds = raster.centroids.map((centroid, piece) =>
      centroid[0] < 0 ? seeds[piece] : [(centroid[0] + 0.5) / RELAX_WIDTH, (centroid[1] + 0.5) / RELAX_WIDTH],
    );
  }

  const neighbours = neighboursOf(rasterize(seeds, GAME_WIDTH, shape), count);
  const palette = shuffled(JEWEL_COLORS, random).slice(0, COLORS_PER_WINDOW);
  const solution = colorGraph(neighbours, COLORS_PER_WINDOW, random);
  const quotas = palette.map((_, color) => solution.filter((c) => c === color).length);

  const hintShare = Math.max(0.1, 0.45 - 0.05 * (level - 1));
  const hintCount = Math.max(1, Math.round(count * hintShare));
  const hints = new Set(shuffled([...Array(count).keys()], random).slice(0, hintCount));

  return { seeds, palette, solution, quotas, hints, neighbours };
}

/** A 4-colouring always exists for a flat map; backtracking with a random colour order finds one. */
function colorGraph(neighbours: number[][], colorCount: number, random: () => number): number[] {
  const colors = new Array<number>(neighbours.length).fill(-1);
  const order = [...neighbours.keys()].sort((a, b) => neighbours[b].length - neighbours[a].length);
  const assign = (position: number): boolean => {
    if (position === order.length) return true;
    const piece = order[position];
    for (const color of shuffled([...Array(colorCount).keys()], random)) {
      if (neighbours[piece].some((other) => colors[other] === color)) continue;
      colors[piece] = color;
      if (assign(position + 1)) return true;
    }
    colors[piece] = -1;
    return false;
  };
  if (!assign(0)) throw new Error('window could not be coloured');
  return colors;
}

// -----------------------------------------------
// RASTER
// -----------------------------------------------

/** Assigns every pixel to its nearest seed. `thickLead` draws 2 px joints, for big renders. */
export function rasterize(seeds: Point[], width: number, shape: WindowShape, thickLead = false): Raster {
  const height = Math.round(width * WINDOW_ASPECT);
  const region = new Int16Array(width * height).fill(-1);
  const sums = seeds.map(() => [0, 0, 0]);

  for (let y = 0; y < height; y++) {
    const v = (y + 0.5) / width;
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width;
      if (!insideWindow(shape, u, v)) continue;
      let best = 0;
      let bestDistance = Infinity;
      for (let s = 0; s < seeds.length; s++) {
        const du = seeds[s][0] - u;
        const dv = seeds[s][1] - v;
        const distance = du * du + dv * dv;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = s;
        }
      }
      region[y * width + x] = best;
      sums[best][0] += x;
      sums[best][1] += y;
      sums[best][2]++;
    }
  }

  const lead = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const right = x + 1 < width ? region[index + 1] : -1;
      const down = y + 1 < height ? region[index + width] : -1;
      if (region[index] !== right && (region[index] >= 0 || right >= 0)) {
        lead[index] = 1;
        if (thickLead && x + 1 < width) lead[index + 1] = 1;
      }
      if (region[index] !== down && (region[index] >= 0 || down >= 0)) {
        lead[index] = 1;
        if (thickLead && y + 1 < height) lead[index + width] = 1;
      }
    }
  }

  const centroids: Point[] = sums.map(([sx, sy, n]) => (n === 0 ? [-1, -1] : [sx / n, sy / n]));
  const radii = seeds.map(() => 1);
  for (let index = 0; index < region.length; index++) {
    const piece = region[index];
    if (piece < 0) continue;
    const dx = (index % width) - centroids[piece][0];
    const dy = Math.floor(index / width) - centroids[piece][1];
    radii[piece] = Math.max(radii[piece], Math.sqrt(dx * dx + dy * dy));
  }
  return { width, height, region, lead, centroids, radii };
}

function neighboursOf(raster: Raster, count: number): number[][] {
  const shared = new Map<number, number>();
  const { width, height, region } = raster;
  const touch = (a: number, b: number) => {
    if (a < 0 || b < 0 || a === b) return;
    const key = a < b ? a * count + b : b * count + a;
    shared.set(key, (shared.get(key) ?? 0) + 1);
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (x + 1 < width) touch(region[index], region[index + 1]);
      if (y + 1 < height) touch(region[index], region[index + width]);
    }
  }
  const neighbours: number[][] = Array.from({ length: count }, () => []);
  for (const [key, length] of shared) {
    if (length < MIN_SHARED_BORDER) continue;
    const a = Math.floor(key / count);
    const b = key % count;
    neighbours[a].push(b);
    neighbours[b].push(a);
  }
  return neighbours;
}

