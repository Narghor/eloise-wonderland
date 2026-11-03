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
  /** The collection it belongs to; a full collection pays a bonus. */
  group: Group;
  name: string;
  icon: string;
  /** The colour of the paper's front, and of its back (white when absent: plain origami paper). */
  color: string;
  back?: string;
  /** The sheet, white side up, as one convex shape. */
  sheet: Point[];
  folds: Fold[];
  /** Little drawings added once folded: eyes, a nose. */
  face: { x: number; y: number; r: number; color: string }[];
  /** Strokes added once folded, under the paper (a stem) or over it (whiskers). */
  strokes?: { from: Point; to: Point; color: string; width: number; under?: boolean }[];
  /** Coins for the first fold of this model, then for each new one. */
  coins: [number, number];
}

export type Group = 'animals' | 'nature' | 'objects';

export const GROUPS: { id: Group; name: string; bonus: number }[] = [
  { id: 'animals', name: '🐾 Animaux', bonus: 60 },
  { id: 'nature', name: '🌿 Nature', bonus: 40 },
  { id: 'objects', name: '🏠 Objets', bonus: 40 },
];

const DIAMOND: Point[] = [
  { x: 100, y: 0 },
  { x: 200, y: 100 },
  { x: 100, y: 200 },
  { x: 0, y: 100 },
];
const SQUARE: Point[] = [
  { x: 0, y: 0 },
  { x: 200, y: 0 },
  { x: 200, y: 200 },
  { x: 0, y: 200 },
];

const fold = (ax: number, ay: number, bx: number, by: number, hx: number, hy: number, hint: string): Fold => ({ a: { x: ax, y: ay }, b: { x: bx, y: by }, handle: { x: hx, y: hy }, hint });
const dot = (x: number, y: number, r: number, color: string) => ({ x, y, r, color });
const line = (x1: number, y1: number, x2: number, y2: number, color: string, width: number, under = false) => ({ from: { x: x1, y: y1 }, to: { x: x2, y: y2 }, color, width, under });

const INK = '#2a1e18';
/** The first fold of most animal faces: the diamond's top corner down onto the bottom one. */
const TOP_DOWN = fold(0, 100, 200, 100, 100, 0, 'Plie le coin du haut jusqu’en bas, le long des pointillés.');
const eyes = (y: number, gap = 22, r = 5, color = INK) => [dot(100 - gap, y, r, color), dot(100 + gap, y, r, color)];
const whiskers = (y: number) => [line(92, y, 62, y - 6, INK, 1.2), line(92, y + 3, 64, y + 8, INK, 1.2), line(108, y, 138, y - 6, INK, 1.2), line(108, y + 3, 136, y + 8, INK, 1.2)];

export const MODELS: Model[] = [
  // -----------------------------------------------
  // ANIMALS
  // -----------------------------------------------
  {
    id: 'fox',
    group: 'animals',
    name: 'Renard',
    icon: '🦊',
    color: '#e8763a',
    sheet: DIAMOND,
    folds: [
      TOP_DOWN,
      fold(30, 100, 60, 160, 0, 100, 'Relève le coin de gauche : c’est la première oreille.'),
      fold(170, 100, 140, 160, 200, 100, 'Et le coin de droite pour la deuxième oreille.'),
    ],
    face: [...eyes(128, 20), dot(100, 188, 6, INK)],
    coins: [20, 5],
  },
  {
    id: 'cat',
    group: 'animals',
    name: 'Chat',
    icon: '🐱',
    color: '#7a7a8c',
    sheet: DIAMOND,
    folds: [
      TOP_DOWN,
      fold(45, 100, 55, 140, 0, 100, 'Relève le coin de gauche bien droit : une oreille de chat.'),
      fold(155, 100, 145, 140, 200, 100, 'Pareil à droite pour la deuxième oreille.'),
      fold(60, 160, 140, 160, 100, 200, 'Remonte la pointe du bas : c’est le menton.'),
    ],
    face: [...eyes(122), dot(100, 138, 4, '#ff8fb8')],
    strokes: whiskers(140),
    coins: [25, 6],
  },
  {
    id: 'dog',
    group: 'animals',
    name: 'Chien',
    icon: '🐶',
    color: '#b07a4a',
    sheet: DIAMOND,
    folds: [
      TOP_DOWN,
      fold(62.5, 100, 20.8, 120.8, 0, 100, 'Rabats le coin de gauche vers le bas : une oreille qui tombe.'),
      fold(137.5, 100, 179.2, 120.8, 200, 100, 'Et l’oreille de droite, qui tombe aussi.'),
      fold(60, 170, 140, 170, 100, 200, 'Remonte un peu la pointe du bas : c’est le museau.'),
    ],
    face: [...eyes(118), dot(100, 150, 8, INK)],
    coins: [25, 6],
  },
  {
    id: 'bear',
    group: 'animals',
    name: 'Ours',
    icon: '🐻',
    color: '#8a5a34',
    sheet: DIAMOND,
    folds: [
      TOP_DOWN,
      fold(20, 100, 10, 110, 0, 100, 'Rentre un tout petit coin à gauche pour arrondir la tête.'),
      fold(180, 100, 190, 110, 200, 100, 'Pareil à droite : c’est plus court, sois précis !'),
      fold(60, 175, 140, 175, 100, 200, 'Remonte la pointe du bas : le museau de l’ours.'),
    ],
    face: [dot(28, 94, 16, '#6a4428'), dot(172, 94, 16, '#6a4428'), ...eyes(120, 20), dot(100, 160, 14, '#d9a878'), dot(100, 156, 6, INK)],
    coins: [28, 7],
  },
  {
    id: 'pig',
    group: 'animals',
    name: 'Cochon',
    icon: '🐷',
    color: '#ff9fbf',
    sheet: DIAMOND,
    folds: [
      TOP_DOWN,
      fold(35, 100, 17.5, 117.5, 0, 100, 'Rabats le coin de gauche : une petite oreille qui tombe.'),
      fold(165, 100, 182.5, 117.5, 200, 100, 'Et la petite oreille de droite.'),
      fold(60, 168, 140, 168, 100, 200, 'Remonte la pointe du bas pour le groin.'),
    ],
    face: [...eyes(116), dot(100, 146, 15, '#e8708f'), dot(94, 146, 3, '#7a2a3a'), dot(106, 146, 3, '#7a2a3a')],
    coins: [28, 7],
  },
  {
    id: 'mouse',
    group: 'animals',
    name: 'Souris',
    icon: '🐭',
    color: '#9a9aac',
    sheet: DIAMOND,
    folds: [
      TOP_DOWN,
      fold(15, 100, 7.5, 107.5, 0, 100, 'Rentre une toute petite pointe à gauche.'),
      fold(185, 100, 192.5, 107.5, 200, 100, 'Et une toute petite pointe à droite : vise bien !'),
    ],
    face: [dot(30, 88, 24, '#a8a8b8'), dot(170, 88, 24, '#a8a8b8'), dot(30, 88, 14, '#ffc4dd'), dot(170, 88, 14, '#ffc4dd'), ...eyes(122, 18), dot(100, 192, 6, '#ff8fb8')],
    strokes: whiskers(180),
    coins: [30, 7],
  },
  {
    id: 'panda',
    group: 'animals',
    name: 'Panda',
    icon: '🐼',
    color: '#f2f2ee',
    sheet: DIAMOND,
    folds: [
      TOP_DOWN,
      fold(20, 100, 10, 110, 0, 100, 'Rentre un petit coin à gauche.'),
      fold(180, 100, 190, 110, 200, 100, 'Et un petit coin à droite.'),
      fold(60, 175, 140, 175, 100, 200, 'Remonte la pointe du bas.'),
    ],
    face: [dot(26, 94, 16, '#2a2a30'), dot(174, 94, 16, '#2a2a30'), ...eyes(122, 20, 12, '#2a2a30'), ...eyes(121, 18, 4, '#ffffff'), dot(100, 152, 6, '#2a2a30')],
    coins: [32, 8],
  },
  {
    id: 'frog',
    group: 'animals',
    name: 'Grenouille',
    icon: '🐸',
    color: '#6abf4a',
    back: '#9ad87a',
    sheet: DIAMOND,
    folds: [
      TOP_DOWN,
      fold(20, 100, 10, 110, 0, 100, 'Rentre un petit coin à gauche.'),
      fold(180, 100, 190, 110, 200, 100, 'Et un petit coin à droite.'),
      fold(60, 165, 140, 165, 100, 200, 'Remonte la pointe du bas : la grenouille sourit déjà.'),
    ],
    face: [dot(62, 100, 17, '#6abf4a'), dot(138, 100, 17, '#6abf4a'), dot(62, 100, 11, '#ffffff'), dot(138, 100, 11, '#ffffff'), dot(64, 101, 6, INK), dot(136, 101, 6, INK), dot(74, 132, 6, '#ff8fb8'), dot(126, 132, 6, '#ff8fb8')],
    strokes: [line(80, 140, 100, 150, INK, 2), line(100, 150, 120, 140, INK, 2)],
    coins: [35, 8],
  },

  // -----------------------------------------------
  // NATURE
  // -----------------------------------------------
  {
    id: 'tulip',
    group: 'nature',
    name: 'Tulipe',
    icon: '🌷',
    color: '#e8506a',
    sheet: DIAMOND,
    folds: [
      fold(0, 100, 200, 100, 100, 200, 'Remonte la pointe du bas jusqu’en haut.'),
      fold(60, 100, 40, 60, 0, 100, 'Relève le coin de gauche vers le milieu : un pétale.'),
      fold(140, 100, 160, 60, 200, 100, 'Et le coin de droite pour le deuxième pétale.'),
    ],
    face: [],
    strokes: [line(100, 100, 100, 205, '#4f8a3a', 6, true), line(100, 175, 128, 150, '#5aa84a', 9, true)],
    coins: [25, 6],
  },
  {
    id: 'leaf',
    group: 'nature',
    name: 'Feuille',
    icon: '🍃',
    color: '#8cc63f',
    back: '#b5dd7a',
    sheet: DIAMOND,
    folds: [
      fold(35, 0, 35, 200, 0, 100, 'Rabats le coin de gauche vers l’intérieur.'),
      fold(165, 0, 165, 200, 200, 100, 'Et le coin de droite : la feuille s’affine.'),
      fold(0, 180, 200, 180, 100, 200, 'Remonte la petite pointe du bas.'),
    ],
    face: [],
    strokes: [
      line(100, 160, 100, 215, '#6a4428', 4, true),
      line(100, 12, 100, 168, '#4f8a3a', 2),
      line(100, 60, 80, 45, '#4f8a3a', 1.5),
      line(100, 60, 120, 45, '#4f8a3a', 1.5),
      line(100, 105, 76, 88, '#4f8a3a', 1.5),
      line(100, 105, 124, 88, '#4f8a3a', 1.5),
    ],
    coins: [25, 6],
  },
  {
    id: 'tree',
    group: 'nature',
    name: 'Sapin',
    icon: '🎄',
    color: '#3f8a4a',
    back: '#2f6e3a',
    sheet: DIAMOND,
    folds: [
      fold(50, 0, 50, 200, 0, 100, 'Rabats le coin de gauche jusqu’au milieu.'),
      fold(150, 0, 150, 200, 200, 100, 'Et le coin de droite jusqu’au milieu.'),
      fold(0, 150, 200, 150, 100, 200, 'Remonte la pointe du bas : le sapin prend forme.'),
    ],
    face: [dot(100, 6, 8, '#ffd23f'), dot(88, 80, 4, '#e8322a'), dot(112, 102, 4, '#ffd23f'), dot(92, 124, 4, '#4fa8e0'), dot(110, 136, 4, '#e8322a')],
    strokes: [line(100, 140, 100, 185, '#7a4e2c', 16, true)],
    coins: [28, 7],
  },
  {
    id: 'sun',
    group: 'nature',
    name: 'Soleil',
    icon: '☀️',
    color: '#ffc61a',
    back: '#ffe27a',
    sheet: SQUARE,
    folds: [
      fold(0, 50, 50, 0, 0, 0, 'Rabats le coin en haut à gauche.'),
      fold(150, 0, 200, 50, 200, 0, 'Le coin en haut à droite.'),
      fold(200, 150, 150, 200, 200, 200, 'Le coin en bas à droite.'),
      fold(50, 200, 0, 150, 0, 200, 'Et le dernier coin : le soleil est tout rond.'),
    ],
    face: [...eyes(92, 24, 6), dot(70, 116, 9, '#ff9f6a'), dot(130, 116, 9, '#ff9f6a')],
    strokes: [
      ...Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return line(100 + Math.cos(a) * 92, 100 + Math.sin(a) * 92, 100 + Math.cos(a) * 128, 100 + Math.sin(a) * 128, '#ffb000', 7, true);
      }),
      line(84, 124, 100, 134, INK, 2.5),
      line(100, 134, 116, 124, INK, 2.5),
    ],
    coins: [30, 7],
  },

  // -----------------------------------------------
  // OBJECTS
  // -----------------------------------------------
  {
    id: 'boat',
    group: 'objects',
    name: 'Bateau',
    icon: '⛵',
    color: '#4f7ad0',
    sheet: SQUARE,
    folds: [
      fold(0, 100, 200, 100, 100, 0, 'Plie la feuille en deux : le haut vient en bas.'),
      fold(100, 100, 30, 170, 0, 100, 'Rabats le coin du haut à gauche vers le milieu.'),
      fold(100, 100, 170, 170, 200, 100, 'Pareil avec le coin de droite : la voile apparaît.'),
      fold(0, 172, 200, 172, 100, 200, 'Remonte la bande du bas : c’est la coque du bateau.'),
    ],
    face: [],
    coins: [30, 7],
  },
  {
    id: 'house',
    group: 'objects',
    name: 'Maison',
    icon: '🏡',
    color: '#e8506a',
    sheet: SQUARE,
    folds: [
      fold(0, 50, 200, 50, 100, 0, 'Rabats le bord du haut : ce sera le toit.'),
      fold(0, 100, 50, 50, 0, 50, 'Plie le coin en haut à gauche pour faire la pente du toit.'),
      fold(150, 50, 200, 100, 200, 50, 'Et le coin en haut à droite.'),
    ],
    face: [dot(56, 132, 12, '#bfe6f6'), dot(144, 132, 12, '#bfe6f6')],
    strokes: [line(100, 198, 100, 158, '#8a5a34', 24)],
    coins: [30, 7],
  },
  {
    id: 'envelope',
    group: 'objects',
    name: 'Enveloppe',
    icon: '💌',
    color: '#8fc6e8',
    sheet: DIAMOND,
    folds: [
      fold(50, 0, 50, 200, 0, 100, 'Rabats le coin de gauche jusqu’au milieu.'),
      fold(150, 0, 150, 200, 200, 100, 'Et le coin de droite jusqu’au milieu.'),
      fold(0, 150, 200, 150, 100, 200, 'Remonte la pointe du bas jusqu’au milieu.'),
      fold(0, 45, 200, 45, 100, 0, 'Baisse le rabat du haut pour fermer l’enveloppe.'),
    ],
    face: [dot(95, 92, 6, '#e8506a'), dot(105, 92, 6, '#e8506a'), dot(100, 99, 5, '#e8506a')],
    coins: [32, 8],
  },
  {
    id: 'gift',
    group: 'objects',
    name: 'Cadeau',
    icon: '🎁',
    color: '#c43a5a',
    back: '#e8506a',
    sheet: SQUARE,
    folds: [
      fold(0, 40, 200, 40, 100, 0, 'Rabats une bande en haut : le couvercle.'),
      fold(25, 0, 25, 200, 0, 100, 'Rabats une bande à gauche.'),
      fold(175, 0, 175, 200, 200, 100, 'Et une bande à droite : la boîte est prête.'),
    ],
    face: [dot(86, 36, 14, '#ffd23f'), dot(114, 36, 14, '#ffd23f'), dot(100, 42, 8, '#f2b81a')],
    strokes: [line(100, 42, 100, 200, '#ffd23f', 16), line(25, 80, 175, 80, '#ffd23f', 12)],
    coins: [35, 8],
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
