import type { Difficulty } from '../../difficulty';
import { mulberry32 } from '../../random';

// -----------------------------------------------
// LAYOUTS
// -----------------------------------------------
// Coordinates are in HALF tiles: a tile covers x..x+2 and y..y+2, so a tile at x+1 sits half over
// its neighbour. A layer is drawn as rows of '#' on a full-tile grid, shifted by (dx, dy) half tiles.

export interface Spot {
  x: number;
  y: number;
  z: number;
}

interface Layer {
  rows: string[];
  dx?: number;
  dy?: number;
}

export interface Layout {
  id: string;
  name: string;
  tier: Difficulty;
  spots: Spot[];
}

function build(layers: Layer[], extras: Spot[] = []): Spot[] {
  const spots: Spot[] = [];
  layers.forEach((layer, z) => {
    layer.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        if (row[c] === '#') spots.push({ x: c * 2 + (layer.dx ?? 0), y: r * 2 + (layer.dy ?? 0), z });
      }
    });
  });
  return [...spots, ...extras];
}

function layout(id: string, name: string, tier: Difficulty, layers: Layer[], extras: Spot[] = []): Layout {
  return { id, name, tier, spots: build(layers, extras) };
}

export const LAYOUTS: readonly Layout[] = [
  // ----- Decouverte -----
  layout('coeur', 'Cœur', 0, [
    { rows: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'] },
    { rows: ['.......', '.##.##.', '.#####.', '..###..'] },
    { rows: ['.##.', '.##.'], dx: 3, dy: 3 },
  ], [{ x: 6, y: 4, z: 3 }]),
  layout('fleur', 'Fleur', 0, [
    { rows: ['..##..', '.####.', '######', '######', '.####.', '..##..'] },
    { rows: ['.##.', '####', '####', '.##.'], dx: 2, dy: 2 },
    { rows: ['##', '##'], dx: 4, dy: 4 },
  ], [{ x: 5, y: 5, z: 3 }, { x: 5, y: 5, z: 4 }]),
  layout('chat', 'Chat', 0, [
    { rows: ['#....#', '##..##', '######', '######', '.####.', '..##..'] },
    { rows: ['......', '.#..#.', '.####.', '..##..'] },
    { rows: ['##'], dx: 4, dy: 5 },
  ], [{ x: 0, y: 8, z: 1 }, { x: 10, y: 8, z: 1 }]),

  // ----- Facile -----
  layout('papillon', 'Papillon', 1, [
    { rows: ['##.....##', '###...###', '####.####', '#########', '####.####', '###...###', '##.....##'] },
    { rows: ['.#.....#.', '.##...##.', '.##.#.##.', '.##...##.', '.#.....#.'], dy: 2 },
    { rows: ['#', '#', '#'], dx: 8, dy: 4 },
  ], [{ x: 8, y: 6, z: 3 }]),
  layout('pont', 'Pont', 1, [
    { rows: ['############', '##........##', '##........##', '############'] },
    { rows: ['###......###', '##........##', '##........##', '###......###'] },
    { rows: ['.##########.'], dy: 3 },
    { rows: ['..########..'], dy: 3 },
  ]),
  layout('etoile', 'Étoile', 1, [
    { rows: ['....#....', '...###...', '#########', '.#######.', '..#####..', '.###.###.', '##.....##'] },
    { rows: ['....#....', '...###...', '..#####..', '...###...', '..##.##..'], dy: 2 },
    { rows: ['.#.', '###', '.#.'], dx: 6, dy: 4 },
  ]),

  // ----- Moyen -----
  layout('pyramide', 'Pyramide', 2, [
    { rows: ['#######', '#######', '#######', '#######', '#######'] },
    { rows: ['######', '######', '######', '######'], dx: 1, dy: 1 },
    { rows: ['#####', '#####', '#####'], dx: 2, dy: 2 },
    { rows: ['####', '####'], dx: 3, dy: 3 },
    { rows: ['###'], dx: 4, dy: 4 },
  ], [{ x: 6, y: 4, z: 5 }]),
  layout('araignee', 'Araignée', 2, [
    { rows: ['#..#....#..#', '.#..#..#..#.', '..########..', '############', '..########..', '.#..#..#..#.', '#..#....#..#'] },
    { rows: ['...######...', '..########..', '...######...'], dy: 4 },
    { rows: ['####', '####'], dx: 8, dy: 5 },
    { rows: ['##'], dx: 10, dy: 6 },
  ], [{ x: 0, y: 6, z: 1 }, { x: 22, y: 6, z: 1 }]),
  layout('arene', 'Arène', 2, [
    { rows: ['..########..', '.##########.', '###......###', '###......###', '###......###', '.##########.', '..########..'] },
    { rows: ['..######..', '.##....##.', '##......##', '.##....##.', '..######..'], dx: 2, dy: 2 },
    { rows: ['####', '#..#', '####'], dx: 8, dy: 4 },
  ], [{ x: 10, y: 6, z: 0 }, { x: 12, y: 6, z: 0 }, { x: 11, y: 6, z: 1 }, { x: 11, y: 6, z: 2 }]),

  // ----- Difficile -----
  layout('dragon', 'Dragon', 3, [
    { rows: ['##............', '###....####...', '.###..######..', '..##########..', '...##########.', '....###..#####', '.....#....####', '...........##.'] },
    { rows: ['.#............', '..#....###....', '..##..#####...', '...########...', '....######.##.', '..........###.', '...........#..'], dx: 1, dy: 1 },
    { rows: ['......#......', '.....###.....', '....#####....', '.....###..#..'], dx: 2, dy: 3 },
    { rows: ['#', '#', '#'], dx: 14, dy: 5 },
  ], [{ x: 14, y: 7, z: 4 }]),
  layout('forteresse', 'Forteresse', 3, [
    { rows: ['##.######.##', '############', '.##########.', '.##########.', '.##########.', '.##########.', '############', '##.######.##'] },
    { rows: ['##........##', '##.######.##', '...#....#...', '...#....#...', '...#....#...', '...#....#...', '##.######.##', '##........##'] },
    { rows: ['#..........#'], dx: 1, dy: 1 },
    { rows: ['#..........#'], dx: 1, dy: 13 },
  ]),
  layout('lanterne', 'Lanterne', 3, [
    { rows: ['...######...', '..########..', '.##########.', '############', '############', '.##########.', '..########..', '...######...'] },
    { rows: ['..#######..', '.#########.', '.#########.', '..#######..'], dx: 1, dy: 4 },
    { rows: ['.######.', '########', '.######.'], dx: 4, dy: 5 },
    { rows: ['####'], dx: 9, dy: 7 },
  ]),

  // ----- Expert -----
  layout('tortue', 'Tortue classique', 4, [
    { rows: ['.############.', '...########...', '..##########..', '.############.', '.############.', '..##########..', '...########...', '.############.'] },
    { rows: ['....######....', '....######....', '....######....', '....######....', '....######....', '....######....'], dy: 2 },
    { rows: ['.....####.....', '.....####.....', '.....####.....', '.....####.....'], dy: 4 },
    { rows: ['......##......', '......##......'], dy: 6 },
  ], [{ x: 0, y: 7, z: 0 }, { x: 26, y: 7, z: 0 }, { x: 28, y: 7, z: 0 }, { x: 13, y: 7, z: 4 }]),
  layout('tour', 'Tour infernale', 4, [
    { rows: ['#######', '#######', '#######', '#######', '#######', '#######'] },
    { rows: ['#######', '#######', '#######', '#######', '#######', '#######'] },
    { rows: ['######', '######', '######', '######', '######'], dx: 1, dy: 1 },
    { rows: ['#####', '#####', '#####', '#####'], dx: 2, dy: 2 },
    { rows: ['####', '####'], dx: 3, dy: 3 },
    { rows: ['##'], dx: 5, dy: 4 },
  ]),
  layout('muraille', 'Muraille', 4, [
    { rows: ['##############', '.############.', '##############', '.############.', '##############'] },
    { rows: ['#############', '#############', '#############', '#############'], dx: 1, dy: 1 },
    { rows: ['...########...', '...########...', '...########...'], dy: 2 },
    { rows: ['##'], dx: 12, dy: 4 },
  ]),
];

// -----------------------------------------------
// PROCEDURAL LAYOUTS
// -----------------------------------------------

export const SURPRISE_ID = 'surprise';

interface ShapeTier {
  cols: number;
  rows: number;
  layers: number;
  target: number;
}

const SHAPE_TIERS: readonly ShapeTier[] = [
  { cols: 7, rows: 6, layers: 3, target: 44 },
  { cols: 9, rows: 7, layers: 4, target: 68 },
  { cols: 11, rows: 7, layers: 4, target: 92 },
  { cols: 12, rows: 8, layers: 5, target: 116 },
  { cols: 14, rows: 8, layers: 6, target: 140 },
];

function covers(spot: Spot, hx: number, hy: number): boolean {
  return spot.x <= hx && hx < spot.x + 2 && spot.y <= hy && hy < spot.y + 2;
}

/** A mirrored random shape, stacked with half offsets; always an even tile count. */
export function surpriseLayout(tier: Difficulty, seed: number): Layout {
  const random = mulberry32(seed ^ 0x5eed);
  const shape = SHAPE_TIERS[tier];
  const width = shape.cols * 2;
  const spots: Spot[] = [];
  const mirror = (x: number) => width - 2 - x;
  const add = (x: number, y: number, z: number) => {
    spots.push({ x, y, z });
    if (mirror(x) !== x) spots.push({ x: mirror(x), y, z });
  };
  const half = Math.ceil(shape.cols / 2);
  const cy = (shape.rows - 1) / 2;
  for (let r = 0; r < shape.rows; r++) {
    for (let c = 0; c < half; c++) {
      const edge = Math.abs(r - cy) / (cy + 0.5) + (half - 1 - c) / half * 0.6;
      if (random() > edge * 0.5 - 0.3) add(c * 2, r * 2, 0);
    }
  }
  for (let z = 1; z < shape.layers; z++) {
    const below = spots.filter((spot) => spot.z === z - 1);
    const dx = random() < 0.5 ? 1 : 0;
    const dy = random() < 0.5 ? 1 : 0;
    for (let y = dy; y < shape.rows * 2; y += 2) {
      for (let x = dx; x <= width / 2 - 1; x += 2) {
        const corners: [number, number][] = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
        if (!corners.every(([hx, hy]) => below.some((spot) => covers(spot, hx, hy)))) continue;
        if (random() < 0.88 - z * 0.04) add(x, y, z);
      }
    }
  }
  // Trim the topmost tiles (by mirrored pairs) down to the target, then fix the parity.
  spots.sort((a, b) => a.z - b.z);
  while (spots.length > shape.target) {
    const top = spots[spots.length - 1];
    const twin = spots.findIndex((spot) => spot.z === top.z && spot.y === top.y && spot.x === mirror(top.x) && spot !== top);
    spots.pop();
    if (twin >= 0 && spots.length > shape.target) spots.splice(twin, 1);
  }
  if (spots.length % 2 === 1) spots.pop();
  return { id: SURPRISE_ID, name: 'Forme surprise', tier, spots };
}

export function layoutById(id: string, tier: Difficulty, seed: number): Layout | undefined {
  return id === SURPRISE_ID ? surpriseLayout(tier, seed) : LAYOUTS.find((candidate) => candidate.id === id);
}
