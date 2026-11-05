import { DETAIL_LINE_WIDTH, INK, ZONE_LINE_WIDTH, type BookDrawing } from './bookDrawing';

// -----------------------------------------------
// DRAWING A LINE DRAWING ON A CANVAS, AND READING ITS ZONES BACK
// -----------------------------------------------
// The drawing box is 100 x 100: `scale` is canvas pixels per box unit.

const BOX = 100;
export const OUTSIDE_ZONE = -1;

function context(canvas: HTMLCanvasElement | OffscreenCanvas): CanvasRenderingContext2D {
  return canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
}

function squareCanvas(pixels: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = pixels;
  return canvas;
}

function prepare(ctx: CanvasRenderingContext2D, scale: number): void {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

/**
 * The printed lines on a transparent canvas: each zone first erases what it hides, then draws
 * its border, so a zone in front hides the lines behind it. `extra` widens every line (box units).
 */
export function drawLineArt(ctx: CanvasRenderingContext2D, drawing: BookDrawing, scale: number, extra = 0): void {
  prepare(ctx, scale);
  ctx.strokeStyle = ctx.fillStyle = INK;
  for (const zone of drawing.zones) {
    const path = new Path2D(zone.path);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill(path);
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = ZONE_LINE_WIDTH + extra;
    ctx.stroke(path);
  }
  ctx.lineWidth = DETAIL_LINE_WIDTH + extra;
  for (const line of drawing.lines ?? []) ctx.stroke(new Path2D(line));
  for (const ink of drawing.inks ?? []) {
    const path = new Path2D(ink);
    ctx.fill(path);
    if (extra > 0) {
      ctx.lineWidth = extra;
      ctx.stroke(path);
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** The finished model: every zone in its colour, with the printed lines. */
export function drawModel(ctx: CanvasRenderingContext2D, drawing: BookDrawing, scale: number): void {
  prepare(ctx, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, BOX, BOX);
  ctx.strokeStyle = INK;
  for (const zone of drawing.zones) {
    const path = new Path2D(zone.path);
    ctx.fillStyle = zone.color;
    ctx.fill(path);
    ctx.lineWidth = ZONE_LINE_WIDTH;
    ctx.stroke(path);
  }
  ctx.lineWidth = DETAIL_LINE_WIDTH;
  for (const line of drawing.lines ?? []) ctx.stroke(new Path2D(line));
  ctx.fillStyle = INK;
  for (const ink of drawing.inks ?? []) ctx.fill(new Path2D(ink));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** A canvas of `displaySize` CSS pixels showing the model, or the bare line art on white. */
export function drawingCanvas(drawing: BookDrawing, displaySize: number, colored: boolean): HTMLCanvasElement {
  const pixels = Math.round(displaySize * window.devicePixelRatio);
  const canvas = squareCanvas(pixels);
  canvas.className = 'book-thumb';
  canvas.style.width = canvas.style.height = `${displaySize}px`;
  const ctx = context(canvas);
  if (colored) {
    drawModel(ctx, drawing, pixels / BOX);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pixels, pixels);
    drawLineArt(ctx, drawing, pixels / BOX);
  }
  return canvas;
}

/**
 * Zone index of every pixel of an n x n grid, OUTSIDE_ZONE where no zone is. Each zone is painted
 * with its index in the red channel, front zones last; the blended pixels on a border are hidden
 * under its line, which the line mask forgives anyway.
 */
export function zoneMap(drawing: BookDrawing, n: number): Int16Array {
  const canvas = squareCanvas(n);
  const ctx = context(canvas);
  prepare(ctx, n / BOX);
  drawing.zones.forEach((zone, index) => {
    ctx.fillStyle = `rgb(${index + 1}, 0, 0)`;
    ctx.fill(new Path2D(zone.path));
  });
  const data = ctx.getImageData(0, 0, n, n).data;
  const zones = new Int16Array(n * n);
  for (let i = 0; i < zones.length; i++) {
    const alpha = data[i * 4 + 3];
    zones[i] = alpha < 128 ? OUTSIDE_ZONE : Math.min(drawing.zones.length, data[i * 4]) - 1;
  }
  return zones;
}

/** 1 where a pixel lies on a printed line, or within `band` box units of one: paint there never counts. */
export function lineMask(drawing: BookDrawing, n: number, band: number): Uint8Array {
  const canvas = squareCanvas(n);
  const ctx = context(canvas);
  drawLineArt(ctx, drawing, n / BOX, band * 2);
  const data = ctx.getImageData(0, 0, n, n).data;
  const mask = new Uint8Array(n * n);
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 0 ? 1 : 0;
  return mask;
}
