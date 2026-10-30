// -----------------------------------------------
// DRAWING THE FABRIC, FRONT AND BACK
// -----------------------------------------------

import { darken, isDarkColor, lighten } from '../../color';
import { NO_STITCH, targetColors, type Pattern } from './embroideryPattern';

const FABRIC = '#fbf6ec';
const FABRIC_BACK = '#eee3d1';
const HOLE = 'rgba(120, 96, 70, 0.28)';
const WRONG_MARK = '#e53946';

export interface FrontView {
  /** Palette index stitched per cell; omitted: every cell stitched right. */
  stitched?: readonly number[];
  /** Colour whose remaining cells are highlighted. */
  selected?: number;
  /** Cells flashing red, with their strength 0-1. */
  flashes?: ReadonlyMap<number, number>;
}

/** Sizes the canvas backing store for `cssSize` pixels and returns a context in CSS pixels. */
export function prepareCanvas(canvas: HTMLCanvasElement, cssSize: number): CanvasRenderingContext2D {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(cssSize * ratio);
  canvas.height = Math.round(cssSize * ratio);
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;
  const context = canvas.getContext('2d')!;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return context;
}

export function paintFront(context: CanvasRenderingContext2D, pattern: Pattern, cssSize: number, view: FrontView = {}): void {
  const { size, palette } = pattern;
  const cell = cssSize / size;
  const target = targetColors(pattern);
  const stitched = view.stitched ?? target;
  paintFabric(context, cssSize, size, FABRIC);

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `700 ${Math.max(8, cell * 0.42)}px system-ui, sans-serif`;
  target.forEach((right, index) => {
    if (right < 0) return;
    const x = (index % size) * cell;
    const y = Math.floor(index / size) * cell;
    const color = stitched[index];
    if (color === right) {
      paintCross(context, x, y, cell, palette[color]);
      return;
    }
    // Not done yet: a faint tint of the colour to stitch, and its number.
    context.fillStyle = lighten(palette[right], right === view.selected ? 0.55 : 0.82);
    context.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    if (color !== NO_STITCH) {
      paintCross(context, x, y, cell, palette[color]);
      context.fillStyle = WRONG_MARK;
      context.beginPath();
      context.arc(x + cell * 0.82, y + cell * 0.18, Math.max(2, cell * 0.12), 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillStyle = right === view.selected ? '#3b2a3f' : 'rgba(59, 42, 63, 0.45)';
      context.fillText(String(right + 1), x + cell / 2, y + cell / 2 + 1);
    }
  });

  view.flashes?.forEach((strength, index) => {
    context.fillStyle = `rgba(229, 57, 70, ${0.6 * strength})`;
    context.fillRect((index % size) * cell, Math.floor(index / size) * cell, cell, cell);
  });
}

/** The back: each colour's thread from stitch to stitch; a jump shows as a long thread. */
export function paintBack(context: CanvasRenderingContext2D, pattern: Pattern, paths: readonly (readonly number[])[], cssSize: number): void {
  const { size, palette } = pattern;
  const cell = cssSize / size;
  paintFabric(context, cssSize, size, FABRIC_BACK);
  const center = (index: number): [number, number] => [(index % size) * cell + cell / 2, Math.floor(index / size) * cell + cell / 2];
  context.lineCap = 'round';
  context.lineJoin = 'round';
  paths.forEach((path, color) => {
    if (path.length === 0) return;
    context.strokeStyle = palette[color];
    context.lineWidth = Math.max(1.5, cell * 0.16);
    // The short vertical stitch every cross leaves behind.
    for (const index of path) {
      const [x, y] = center(index);
      context.beginPath();
      context.moveTo(x, y - cell * 0.3);
      context.lineTo(x, y + cell * 0.3);
      context.stroke();
    }
    context.lineWidth = Math.max(1, cell * 0.08);
    context.beginPath();
    path.forEach((index, i) => {
      const [x, y] = center(index);
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
  });
}

function paintFabric(context: CanvasRenderingContext2D, cssSize: number, size: number, fabric: string): void {
  const cell = cssSize / size;
  context.fillStyle = fabric;
  context.fillRect(0, 0, cssSize, cssSize);
  context.fillStyle = HOLE;
  const hole = Math.max(0.8, cell * 0.06);
  for (let r = 0; r <= size; r++) {
    for (let c = 0; c <= size; c++) {
      context.beginPath();
      context.arc(c * cell, r * cell, hole, 0, Math.PI * 2);
      context.fill();
    }
  }
}

/** Two thread strokes corner to corner, the top one slightly lighter like real floss. */
function paintCross(context: CanvasRenderingContext2D, x: number, y: number, cell: number, color: string): void {
  const inset = cell * 0.14;
  context.lineCap = 'round';
  context.lineWidth = Math.max(1.5, cell * 0.22);
  context.strokeStyle = isDarkColor(color) ? color : darken(color, 0.85);
  stroke(context, x + inset, y + cell - inset, x + cell - inset, y + inset);
  context.strokeStyle = color;
  stroke(context, x + inset, y + inset, x + cell - inset, y + cell - inset);
}

function stroke(context: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}
