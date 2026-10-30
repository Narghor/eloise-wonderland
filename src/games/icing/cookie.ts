// -----------------------------------------------
// COOKIES AND THE ICING GUIDES ON THEM
// -----------------------------------------------
// Everything lives in a unit square, the cookie centred on (0.5, 0.5).

import { mulberry32, shuffled } from '../../random';

export type Point = [number, number];

export interface Guide {
  /** Index in the cookie's palette. */
  color: number;
  points: Point[];
  closed: boolean;
}

export interface Cookie {
  outline: Point[];
  dough: string;
  palette: string[];
  guides: Guide[];
}

export const ICING_COLORS = ['#fffaf2', '#ff8fb1', '#8de0c4', '#ffe27a', '#c7a6ff', '#8cc8ff', '#7a4a3a'];
const DOUGHS = ['#e9b97a', '#d89c5c', '#c98c56'];

const CENTER = 0.5;
const COOKIE_RADIUS = 0.42;
/** The outline guide sits this far in from the cookie's edge (share of the radius). */
const OUTLINE_INSET = 0.86;
/** The crown (level 3+) is the outline again, this much smaller: between the edge and the middle motif. */
const CROWN_FACTOR = 0.62;
const POINTS_PER_SHAPE = 180;

type ShapeKind = 'circle' | 'flower' | 'star' | 'heart';
const SHAPES: ShapeKind[] = ['circle', 'flower', 'star', 'heart'];

// -----------------------------------------------
// SHAPES
// -----------------------------------------------

/** Closed outline of a shape, scaled so its farthest point is `radius` from the centre. */
function shapeOutline(kind: ShapeKind, radius: number, rotation: number): Point[] {
  const raw: Point[] = [];
  for (let i = 0; i < POINTS_PER_SHAPE; i++) {
    const t = (i / POINTS_PER_SHAPE) * Math.PI * 2;
    if (kind === 'heart') {
      // Classic heart curve, y flipped so the point is at the bottom.
      raw.push([16 * Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]);
      continue;
    }
    const angle = t + rotation;
    const r =
      kind === 'circle'
        ? 1
        : kind === 'flower'
          ? 0.72 + 0.28 * Math.abs(Math.cos(2.5 * t))
          : 0.6 + 0.4 * ((Math.cos(5 * t) + 1) / 2) ** 2.5;
    raw.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }
  // Centre on the shape's middle (the heart's curve is not centred on 0), then fit the radius.
  const xs = raw.map(([x]) => x);
  const ys = raw.map(([, y]) => y);
  const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const farthest = Math.max(...raw.map(([x, y]) => Math.hypot(x - midX, y - midY)));
  return raw.map(([x, y]) => [CENTER + ((x - midX) / farthest) * radius, CENTER + ((y - midY) / farthest) * radius]);
}

function scaled(points: Point[], factor: number): Point[] {
  return points.map(([x, y]) => [CENTER + (x - CENTER) * factor, CENTER + (y - CENTER) * factor]);
}

/** Distance from the centre to the nearest point of the outline: what fits inside. */
function innerRadius(outline: Point[]): number {
  return Math.min(...outline.map(([x, y]) => Math.hypot(x - CENTER, y - CENTER)));
}

// -----------------------------------------------
// PATTERNS INSIDE THE COOKIE
// -----------------------------------------------

function spiral(radius: number, rotation: number): Point[] {
  const points: Point[] = [];
  const turns = 2.2;
  for (let i = 0; i <= 160; i++) {
    const progress = i / 160;
    const angle = rotation + progress * turns * Math.PI * 2;
    const r = radius * (0.12 + 0.88 * progress);
    points.push([CENTER + Math.cos(angle) * r, CENTER + Math.sin(angle) * r]);
  }
  return points;
}

/** A smaller copy of the cookie's outline, optionally made wavy (`waves` bumps around). */
function crown(outline: Point[], factor: number, waves: number): Point[] {
  return outline.map(([x, y], i): Point => {
    const wave = waves === 0 ? 1 : 1 + 0.08 * Math.sin((i / outline.length) * Math.PI * 2 * waves);
    return [CENTER + (x - CENTER) * factor * wave, CENTER + (y - CENTER) * factor * wave];
  });
}

// -----------------------------------------------
// GENERATION
// -----------------------------------------------

/** Same seed and level, same cookie: only those two numbers need saving. */
export function generateCookie(seed: number, level: number): Cookie {
  const random = mulberry32(seed);
  const kind = SHAPES[Math.floor(random() * SHAPES.length)];
  const rotation = -Math.PI / 2;
  const outline = shapeOutline(kind, COOKIE_RADIUS, rotation);
  const inner = innerRadius(outline);
  const colorCount = Math.min(3, 1 + Math.min(level - 1, 2));
  const palette = shuffled(ICING_COLORS, random).slice(0, colorCount);

  const guides: Guide[] = [{ color: 0, points: scaled(outline, OUTLINE_INSET), closed: true }];
  if (level >= 2) {
    const centerKinds: ShapeKind[] = SHAPES.filter((shape) => shape !== kind);
    const useSpiral = random() < 0.35;
    // Inside the crown's own inner room (CROWN_FACTOR of the cookie's), with a margin.
    const centerRadius = inner * CROWN_FACTOR * 0.62;
    guides.push(
      useSpiral
        ? { color: 1, points: spiral(centerRadius, random() * Math.PI * 2), closed: false }
        : { color: 1, points: shapeOutline(centerKinds[Math.floor(random() * centerKinds.length)], centerRadius, rotation), closed: true },
    );
  }
  if (level >= 3) {
    const waves = level >= 5 ? 8 + Math.floor(random() * 5) : 0;
    guides.push({ color: 2, points: crown(outline, CROWN_FACTOR, waves), closed: true });
  }

  return { outline, dough: DOUGHS[Math.floor(random() * DOUGHS.length)], palette, guides };
}

/** Points every `spacing` along a guide, so long and short guides weigh by their length. */
export function sampleGuide(guide: Guide, spacing: number): Point[] {
  const points = guide.closed ? [...guide.points, guide.points[0]] : guide.points;
  const samples: Point[] = [points[0]];
  let carried = 0;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const length = Math.hypot(x1 - x0, y1 - y0);
    let at = spacing - carried;
    while (at <= length) {
      samples.push([x0 + ((x1 - x0) * at) / length, y0 + ((y1 - y0) * at) / length]);
      at += spacing;
    }
    carried = length - (at - spacing);
  }
  return samples;
}
