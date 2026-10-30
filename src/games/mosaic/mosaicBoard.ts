import type { LevelTable } from '../../difficulty';
import { mulberry32, shuffled } from '../../random';

// -----------------------------------------------
// LEVELS
// -----------------------------------------------
// A level is an index into TIERS; the board is regenerated from (seed, level).

export type FrameShape = 'square' | 'roundSquare' | 'circle' | 'diamond' | 'heart';

interface Tier {
  size: number;
  colors: number;
  maxTile: number;
  /** Above this, a level draws another picture: the tray must stay short on a phone. */
  maxTiles: number;
  shapes: readonly FrameShape[];
}

const TIERS: readonly Tier[] = [
  { size: 5, colors: 2, maxTile: 3, maxTiles: 10, shapes: ['square', 'roundSquare', 'circle', 'diamond'] },
  { size: 6, colors: 3, maxTile: 3, maxTiles: 16, shapes: ['square', 'roundSquare', 'circle'] },
  { size: 8, colors: 3, maxTile: 4, maxTiles: 18, shapes: ['roundSquare', 'circle', 'diamond', 'heart'] },
  { size: 9, colors: 4, maxTile: 4, maxTiles: 22, shapes: ['roundSquare', 'circle', 'heart'] },
  { size: 10, colors: 4, maxTile: 5, maxTiles: 22, shapes: ['roundSquare', 'circle', 'diamond', 'heart'] },
];

export const MOSAIC_LEVELS: LevelTable = [0, 1, 2, 3, 4];

export function isMosaicLevel(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < TIERS.length;
}

// -----------------------------------------------
// TYPES
// -----------------------------------------------

export type Cell = readonly [number, number];

export interface Tile {
  color: number;
  /** Cells of the generated solution, in board coordinates. */
  cells: Cell[];
}

/** Where a tile lies: top-left corner of its rotated bounding box, and quarter turns clockwise. */
export interface Placement {
  x: number;
  y: number;
  rotation: number;
}

export interface Board {
  size: number;
  shape: FrameShape;
  palette: string[];
  /** Colour index per cell (y * size + x), -1 outside the frame. */
  picture: number[];
  tiles: Tile[];
  /** Tray order (tile indices) and the rotation each tile starts with. */
  trayOrder: number[];
  trayRotations: number[];
  maxTile: number;
}

// -----------------------------------------------
// FRAMES AND PICTURES
// -----------------------------------------------

const PALETTES: readonly string[][] = [
  ['#e8607a', '#f6b7c4', '#7a4fa3', '#f4d27a'],
  ['#2f7fb8', '#8ed1e6', '#f2c14e', '#e07a5f'],
  ['#3d9970', '#a8d8a0', '#f7a440', '#8e5ea2'],
  ['#c8324b', '#f2b33d', '#2f5fb3', '#f5efe0'],
  ['#6c5ce7', '#fd79a8', '#81ecec', '#ffeaa7'],
  ['#e76f51', '#2a9d8f', '#e9c46a', '#264653'],
];

/** u, v in [-1, 1], the cell's centre. */
function insideFrame(shape: FrameShape, u: number, v: number): boolean {
  switch (shape) {
    case 'square':
      return true;
    case 'roundSquare':
      return Math.abs(u) + Math.abs(v) <= 1.45;
    case 'circle':
      return u * u + v * v <= 1.05;
    case 'diamond':
      return Math.abs(u) + Math.abs(v) <= 1.05;
    case 'heart':
      return inHeart(u * 1.15, v * 1.15 + 0.08);
  }
}

function inHeart(u: number, v: number): boolean {
  const x = u * 1.2;
  const y = -v * 1.2 + 0.25;
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
}

type Picture = (u: number, v: number) => number;

function pictureMaker(k: number, size: number, random: () => number): Picture {
  const kinds = ['rings', 'stripes', 'sectors', 'blobs', ...(size >= 7 ? ['heart'] : [])];
  const kind = kinds[Math.floor(random() * kinds.length)];
  const band = (t: number) => Math.min(k - 1, Math.max(0, Math.floor(t * k)));
  switch (kind) {
    case 'rings':
      return (u, v) => band(Math.hypot(u, v) / 1.3);
    case 'stripes': {
      const angle = (Math.floor(random() * 4) * Math.PI) / 4;
      const [cx, cy] = [Math.cos(angle), Math.sin(angle)];
      return (u, v) => band(((u * cx + v * cy) / Math.SQRT2 + 1) / 2);
    }
    case 'sectors': {
      const offset = random();
      return (u, v) => band((((Math.atan2(v, u) / (2 * Math.PI) + offset) % 1) + 1) % 1);
    }
    case 'heart':
      return (u, v) => (inHeart(u * 1.7, v * 1.7 + 0.1) ? 0 : 1 + Math.min(k - 2, Math.floor((Math.hypot(u, v) / 1.42) * (k - 1))));
    default: {
      const seeds = Array.from({ length: k }, () => [random() * 1.6 - 0.8, random() * 1.6 - 0.8]);
      return (u, v) => {
        let best = 0;
        seeds.forEach(([x, y], index) => {
          if (Math.hypot(u - x, v - y) < Math.hypot(u - seeds[best][0], v - seeds[best][1])) best = index;
        });
        return best;
      };
    }
  }
}

// -----------------------------------------------
// GENERATION
// -----------------------------------------------

export function generateBoard(seed: number, level: number): Board {
  const tier = TIERS[level];
  const random = mulberry32(seed);
  const n = tier.size;
  const shape = tier.shapes[Math.floor(random() * tier.shapes.length)];
  const centre = (i: number) => ((i + 0.5) / n) * 2 - 1;

  // A picture cut into too many tiles would overflow the tray: draw again, keep the best one.
  let best: { picture: number[]; tiles: Tile[] } | null = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const paint = pictureMaker(tier.colors, n, random);
    let picture: number[] = [];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) picture.push(insideFrame(shape, centre(x), centre(y)) ? paint(centre(x), centre(y)) : -1);
    }
    // Renumber the colours actually used, so the palette has no unused entry.
    const used = [...new Set(picture.filter((c) => c >= 0))].sort((a, b) => a - b);
    if (used.length < 2) continue;
    picture = picture.map((c) => (c < 0 ? -1 : used.indexOf(c)));
    const tiles = cutTiles(n, picture, tier.maxTile, random);
    if (!best || tiles.length < best.tiles.length) best = { picture, tiles };
    if (tiles.length <= tier.maxTiles) break;
  }
  if (!best) throw new Error('mosaic: no two-colour picture');
  const { picture, tiles } = best;
  const colorCount = Math.max(...picture) + 1;
  const palette = shuffled(PALETTES[Math.floor(random() * PALETTES.length)], random).slice(0, colorCount);
  return {
    size: n,
    shape,
    palette,
    picture,
    tiles,
    trayOrder: shuffled(tiles.map((_, index) => index), random),
    trayRotations: tiles.map(() => Math.floor(random() * 4)),
    maxTile: tier.maxTile,
  };
}

function neighbours(n: number, index: number): number[] {
  const x = index % n;
  const y = Math.floor(index / n);
  const result: number[] = [];
  if (x > 0) result.push(index - 1);
  if (x < n - 1) result.push(index + 1);
  if (y > 0) result.push(index - n);
  if (y < n - 1) result.push(index + n);
  return result;
}

/** Grows monochrome polyominoes, then folds lone cells into a neighbour of the same colour. */
function cutTiles(n: number, picture: number[], maxTile: number, random: () => number): Tile[] {
  const owner = new Array<number>(picture.length).fill(-1);
  const groups: number[][] = [];
  const cells = shuffled(
    picture.map((_, index) => index).filter((index) => picture[index] >= 0),
    random,
  );
  // Cells with the fewest free same-colour neighbours go first, so few cells end up stranded alone.
  const freedom = (cell: number) => neighbours(n, cell).filter((next) => owner[next] < 0 && picture[next] === picture[cell]).length;
  const mostConstrained = (list: number[]) => list.reduce((best, cell) => (freedom(cell) < freedom(best) ? cell : best));
  for (;;) {
    const free = cells.filter((cell) => owner[cell] < 0);
    if (free.length === 0) break;
    const start = mostConstrained(free);
    const target = random() < 0.85 ? maxTile : maxTile - 1;
    const group = [start];
    owner[start] = groups.length;
    while (group.length < target) {
      const frontier = group.flatMap((cell) =>
        neighbours(n, cell).filter((next) => owner[next] < 0 && picture[next] === picture[start]),
      );
      if (frontier.length === 0) break;
      const next = mostConstrained(shuffled(frontier, random));
      owner[next] = groups.length;
      group.push(next);
    }
    groups.push(group);
  }
  // Smallest groups first: a whole group joins a same-colour neighbour when both still fit in one tile.
  const bySize = groups.map((_, id) => id).sort((a, b) => groups[a].length - groups[b].length);
  for (const id of bySize) {
    const group = groups[id];
    if (group.length === 0 || group.length > maxTile / 2) continue;
    const host = [...new Set(group.flatMap((cell) => neighbours(n, cell).map((next) => owner[next])))]
      .filter((other) => other >= 0 && other !== id && picture[groups[other][0]] === picture[group[0]])
      .filter((other) => groups[other].length + group.length <= maxTile)
      .sort((a, b) => groups[a].length - groups[b].length)[0];
    if (host === undefined) continue;
    for (const cell of group) owner[cell] = host;
    groups[host].push(...group);
    groups[id] = [];
  }
  return groups
    .filter((group) => group.length > 0)
    .map((group) => ({ color: picture[group[0]], cells: group.map((index) => [index % n, Math.floor(index / n)] as const) }));
}

// -----------------------------------------------
// SHAPES AND PLACEMENT
// -----------------------------------------------

/** The tile's cells after `rotation` quarter turns clockwise, moved so the bounding box starts at 0, 0. */
export function tileShape(tile: Tile, rotation: number): Cell[] {
  let cells: Cell[] = tile.cells.map(([x, y]) => [x, y]);
  for (let turn = 0; turn < ((rotation % 4) + 4) % 4; turn++) cells = cells.map(([x, y]) => [-y, x]);
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells.map(([x, y]) => [x - minX, y - minY]);
}

/** The cell of a shape nearest its bounding box centre: the one held under the finger. */
export function shapeCentre(shape: Cell[]): Cell {
  const cx = Math.max(...shape.map(([x]) => x)) / 2;
  const cy = Math.max(...shape.map(([, y]) => y)) / 2;
  return shape.reduce((best, cell) =>
    Math.hypot(cell[0] - cx, cell[1] - cy) < Math.hypot(best[0] - cx, best[1] - cy) ? cell : best,
  );
}

export function placedCells(tile: Tile, placement: Placement): Cell[] {
  return tileShape(tile, placement.rotation).map(([x, y]) => [x + placement.x, y + placement.y]);
}

/** Placement of the generated solution, used by tests. */
export function solutionPlacement(tile: Tile): Placement {
  return { x: Math.min(...tile.cells.map(([x]) => x)), y: Math.min(...tile.cells.map(([, y]) => y)), rotation: 0 };
}

/** Tile index covering each cell, -1 when free. */
export function occupancy(board: Board, placements: (Placement | null)[]): number[] {
  const covered = new Array<number>(board.size * board.size).fill(-1);
  placements.forEach((placement, tile) => {
    if (!placement) return;
    for (const [x, y] of placedCells(board.tiles[tile], placement)) covered[y * board.size + x] = tile;
  });
  return covered;
}

export type PlacementCheck =
  | { kind: 'ok' }
  | { kind: 'outside' }
  | { kind: 'overlap' }
  | { kind: 'wrong'; cells: Cell[] };

/** Outside and overlap are free refusals; a colour that does not match the picture is a mistake. */
export function checkPlacement(board: Board, placements: (Placement | null)[], tile: number, placement: Placement): PlacementCheck {
  const cells = placedCells(board.tiles[tile], placement);
  const n = board.size;
  if (cells.some(([x, y]) => x < 0 || y < 0 || x >= n || y >= n || board.picture[y * n + x] < 0)) return { kind: 'outside' };
  const covered = occupancy(board, placements.map((p, index) => (index === tile ? null : p)));
  if (cells.some(([x, y]) => covered[y * n + x] >= 0)) return { kind: 'overlap' };
  const wrong = cells.filter(([x, y]) => board.picture[y * n + x] !== board.tiles[tile].color);
  return wrong.length > 0 ? { kind: 'wrong', cells: wrong } : { kind: 'ok' };
}

export function isComplete(board: Board, placements: (Placement | null)[]): boolean {
  const covered = occupancy(board, placements);
  return board.picture.every((color, index) => color < 0 || covered[index] >= 0);
}

/** 3 stars for at most one slip; 2 stars allow about one slip per six tiles (never under 3). */
export function starsFor(mistakes: number, tileCount: number): number {
  if (mistakes <= 1) return 3;
  return mistakes <= Math.max(3, Math.round(tileCount / 6)) ? 2 : 1;
}

export function boardSizeLabel(level: number): string {
  const tier = TIERS[level];
  return `${tier.size}×${tier.size}`;
}
