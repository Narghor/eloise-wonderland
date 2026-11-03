// -----------------------------------------------
// ORIGAMI MODELS: a sheet of flat pieces and the folds that turn it into something
// -----------------------------------------------

export interface Point {
  x: number;
  y: number;
}

/** A fold: the crease runs through `a` and `b`; the side holding `handle` turns over onto the other. */
export interface Fold {
  a: Point;
  b: Point;
  /** The corner the finger grabs; it lands on its mirror image across the crease. */
  handle: Point;
  hint: string;
}

export interface Model {
  id: string;
  name: string;
  icon: string;
  /** The colour of the paper's front; the back is white. */
  color: string;
  /** The sheet, white side up, as one convex shape. */
  sheet: Point[];
  folds: Fold[];
  /** Little drawings added once folded: eyes, a nose. */
  face: { x: number; y: number; r: number; color: string }[];
  /** Coins for the first fold of this model, then for each new one. */
  coins: [number, number];
}

export const MODELS: Model[] = [
  {
    id: 'fox',
    name: 'Renard',
    icon: '🦊',
    color: '#e8763a',
    // A square turned into a diamond.
    sheet: [
      { x: 100, y: 0 },
      { x: 200, y: 100 },
      { x: 100, y: 200 },
      { x: 0, y: 100 },
    ],
    folds: [
      { a: { x: 0, y: 100 }, b: { x: 200, y: 100 }, handle: { x: 100, y: 0 }, hint: 'Plie le coin du haut jusqu’en bas, le long des pointillés.' },
      { a: { x: 30, y: 100 }, b: { x: 60, y: 160 }, handle: { x: 0, y: 100 }, hint: 'Relève le coin de gauche : c’est la première oreille.' },
      { a: { x: 170, y: 100 }, b: { x: 140, y: 160 }, handle: { x: 200, y: 100 }, hint: 'Et le coin de droite pour la deuxième oreille.' },
    ],
    face: [
      { x: 80, y: 128, r: 5, color: '#2a1e18' },
      { x: 120, y: 128, r: 5, color: '#2a1e18' },
      { x: 100, y: 188, r: 6, color: '#2a1e18' },
    ],
    coins: [20, 5],
  },
];

// -----------------------------------------------
// GEOMETRY
// -----------------------------------------------

/** One flat piece of paper; `front` is true when its coloured side faces up. */
export interface Piece {
  points: Point[];
  front: boolean;
}

/** Signed distance from the crease line, positive on the handle's side; and the unit normal pointing there. */
export function creaseFrame(fold: Fold): { normal: Point; distance: (p: Point) => number } {
  const dx = fold.b.x - fold.a.x;
  const dy = fold.b.y - fold.a.y;
  const length = Math.hypot(dx, dy);
  let normal = { x: -dy / length, y: dx / length };
  const side = (p: Point) => (p.x - fold.a.x) * normal.x + (p.y - fold.a.y) * normal.y;
  if (side(fold.handle) < 0) normal = { x: -normal.x, y: -normal.y };
  return { normal, distance: (p) => (p.x - fold.a.x) * normal.x + (p.y - fold.a.y) * normal.y };
}

/** Cuts a convex piece along the crease: the part that moves (handle side) and the part that stays. */
export function split(piece: Piece, distance: (p: Point) => number): { moving: Piece | null; staying: Piece | null } {
  const moving: Point[] = [];
  const staying: Point[] = [];
  const pts = piece.points;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const dp = distance(p);
    const dq = distance(q);
    if (dp > 0.001) moving.push(p);
    else if (dp < -0.001) staying.push(p);
    else {
      moving.push(p);
      staying.push(p);
    }
    if ((dp > 0.001 && dq < -0.001) || (dp < -0.001 && dq > 0.001)) {
      const t = dp / (dp - dq);
      const cut = { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
      moving.push(cut);
      staying.push(cut);
    }
  }
  return {
    moving: moving.length >= 3 ? { points: moving, front: piece.front } : null,
    staying: staying.length >= 3 ? { points: staying, front: piece.front } : null,
  };
}

/** Where a point is drawn when the flap has turned by `progress` (0 = flat, 1 = folded over). */
export function turned(p: Point, normal: Point, distance: (p: Point) => number, progress: number): Point {
  const d = distance(p);
  const k = d * (Math.cos(Math.PI * progress) - 1);
  return { x: p.x + normal.x * k, y: p.y + normal.y * k };
}

/** The sheet after a fold: the flap lands on top, mirrored and turned over (its stacking order reversed). */
export function applyFold(pieces: Piece[], fold: Fold): Piece[] {
  const { normal, distance } = creaseFrame(fold);
  const stay: Piece[] = [];
  const flap: Piece[] = [];
  for (const piece of pieces) {
    const { moving, staying } = split(piece, distance);
    if (staying) stay.push(staying);
    if (moving) flap.push({ points: moving.points.map((p) => turned(p, normal, distance, 1)), front: !moving.front });
  }
  return [...stay, ...flap.reverse()];
}
