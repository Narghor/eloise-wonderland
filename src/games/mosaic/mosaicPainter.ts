import { lighten } from '../../color';
import { occupancy, tileShape, type Board, type Cell, type Placement, type Tile } from './mosaicBoard';

const GROUT = '#6b5d52';
const GROUT_LIGHT = '#efe7da';

export interface PaintOptions {
  ghost?: { tile: number; cells: Cell[]; fits: boolean };
  flash?: Cell[];
  finished?: boolean;
}

/** Sizes the canvas backing store for `cssSize` pixels and returns the size of one cell, in backing pixels. */
function prepare(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number, cells: number): number {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(cssWidth * ratio);
  canvas.height = Math.round(cssHeight * ratio);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  return canvas.width / cells;
}

export function paintBoard(
  canvas: HTMLCanvasElement,
  board: Board,
  placements: (Placement | null)[],
  cssSize: number,
  options: PaintOptions = {},
): void {
  const n = board.size;
  const s = prepare(canvas, cssSize, cssSize, n);
  const context = canvas.getContext('2d');
  if (!context) return;
  const gap = Math.max(1, s * 0.07);
  const covered = occupancy(board, placements);

  board.picture.forEach((color, index) => {
    if (color < 0) return;
    const x = index % n;
    const y = Math.floor(index / n);
    context.fillStyle = options.finished ? GROUT : GROUT_LIGHT;
    context.fillRect(x * s, y * s, s, s);
    if (covered[index] < 0) {
      context.fillStyle = lighten(board.palette[color], 0.62);
      context.fillRect(x * s + gap, y * s + gap, s - 2 * gap, s - 2 * gap);
    }
  });

  covered.forEach((tile, index) => {
    if (tile < 0) return;
    paintTileCell(context, covered, n, index, s, gap, board.palette[board.tiles[tile].color]);
  });

  if (options.ghost) {
    const { tile, cells, fits } = options.ghost;
    context.globalAlpha = 0.7;
    context.fillStyle = board.palette[board.tiles[tile].color];
    for (const [x, y] of cells) context.fillRect(x * s + gap, y * s + gap, s - 2 * gap, s - 2 * gap);
    context.globalAlpha = 1;
    context.strokeStyle = fits ? 'rgba(255, 255, 255, 0.95)' : 'rgba(217, 58, 58, 0.95)';
    context.lineWidth = Math.max(2, gap * 1.2);
    for (const [x, y] of cells) context.strokeRect(x * s + gap, y * s + gap, s - 2 * gap, s - 2 * gap);
  }

  context.fillStyle = 'rgba(217, 58, 58, 0.75)';
  for (const [x, y] of options.flash ?? []) context.fillRect(x * s, y * s, s, s);

  if (options.finished) {
    // A soft diagonal sheen over the finished mosaic, clipped to its tiles.
    context.globalCompositeOperation = 'source-atop';
    const sheen = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    sheen.addColorStop(0.45, 'rgba(255, 255, 255, 0)');
    sheen.addColorStop(0.55, 'rgba(255, 255, 255, 0.18)');
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = sheen;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'source-over';
  }
}

/** One cell of a placed tile: the grout gap only shows on the sides that border another tile. */
function paintTileCell(
  context: CanvasRenderingContext2D,
  covered: number[],
  n: number,
  index: number,
  s: number,
  gap: number,
  color: string,
): void {
  const x = index % n;
  const y = Math.floor(index / n);
  const same = (dx: number, dy: number) => {
    const nx = x + dx;
    const ny = y + dy;
    return nx >= 0 && ny >= 0 && nx < n && ny < n && covered[ny * n + nx] === covered[index];
  };
  const left = x * s + (same(-1, 0) ? 0 : gap);
  const top = y * s + (same(0, -1) ? 0 : gap);
  const right = (x + 1) * s - (same(1, 0) ? 0 : gap);
  const bottom = (y + 1) * s - (same(0, 1) ? 0 : gap);
  context.fillStyle = color;
  context.fillRect(left, top, right - left, bottom - top);
  context.fillStyle = 'rgba(255, 255, 255, 0.16)';
  if (!same(0, -1)) context.fillRect(left, top, right - left, gap * 1.2);
}

/** A tray tile on its own canvas, `cell` CSS pixels per cell. */
export function paintTile(canvas: HTMLCanvasElement, tile: Tile, rotation: number, color: string, cell: number): void {
  const shape = tileShape(tile, rotation);
  const width = Math.max(...shape.map(([x]) => x)) + 1;
  const height = Math.max(...shape.map(([, y]) => y)) + 1;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const s = cell * ratio;
  canvas.width = Math.round(width * s);
  canvas.height = Math.round(height * s);
  canvas.style.width = `${width * cell}px`;
  canvas.style.height = `${height * cell}px`;
  const context = canvas.getContext('2d');
  if (!context) return;
  // paintTileCell reads a square grid: use the longer side.
  const side = Math.max(width, height);
  const square = new Array<number>(side * side).fill(-1);
  for (const [x, y] of shape) square[y * side + x] = 0;
  const gap = Math.max(1, s * 0.07);
  for (const [x, y] of shape) paintTileCell(context, square, side, y * side + x, s, gap, color);
}
