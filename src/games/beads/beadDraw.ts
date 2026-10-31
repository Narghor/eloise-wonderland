// -----------------------------------------------
// DRAWING A PEGBOARD (one ring bead per peg)
// -----------------------------------------------

import { darken } from '../../color';
import { EMPTY, type Pattern } from './beadLogic';

const BOARD = '#fdfaf3';

export interface DrawOptions {
  /** Colours the pegs should hold: a bead that differs is marked as a mistake. */
  target?: readonly number[];
  /** Shows the empty pegs. */
  pegs?: boolean;
}

export function drawBeads(canvas: HTMLCanvasElement, pattern: Pattern, cells: readonly number[], width: number, options: DrawOptions = {}): void {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const step = width / pattern.width;
  const height = Math.round(step * pattern.height);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  if (options.pegs) {
    context.fillStyle = BOARD;
    context.fillRect(0, 0, width, height);
  }

  cells.forEach((cell, index) => {
    const x = (index % pattern.width + 0.5) * step;
    const y = (Math.floor(index / pattern.width) + 0.5) * step;
    if (cell === EMPTY) {
      if (!options.pegs) return;
      context.fillStyle = 'rgb(43 36 51 / 0.2)';
      context.beginPath();
      context.arc(x, y, Math.max(1, step * 0.1), 0, Math.PI * 2);
      context.fill();
      return;
    }
    const color = pattern.palette[cell];
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, step * 0.45, 0, Math.PI * 2);
    context.fill();
    if (step >= 8) {
      context.strokeStyle = darken(color, 0.65);
      context.lineWidth = Math.max(1, step * 0.06);
      context.stroke();
      context.fillStyle = options.pegs ? BOARD : '#ffffff';
      context.beginPath();
      context.arc(x, y, step * 0.14, 0, Math.PI * 2);
      context.fill();
    }
    if (options.target && options.target[index] !== cell) cross(context, x, y, step * 0.24);
  });
}

/** Peg under a point of the canvas, or -1 outside. */
export function cellAt(canvas: HTMLCanvasElement, pattern: Pattern, clientX: number, clientY: number): number {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((clientX - rect.left) / rect.width) * pattern.width);
  const y = Math.floor(((clientY - rect.top) / rect.height) * pattern.height);
  if (x < 0 || y < 0 || x >= pattern.width || y >= pattern.height) return -1;
  return y * pattern.width + x;
}

function cross(context: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  context.lineCap = 'round';
  for (const [color, width] of [['#2b2433', 4], ['#ffffff', 2]] as const) {
    context.strokeStyle = color;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(x - size, y - size);
    context.lineTo(x + size, y + size);
    context.moveTo(x + size, y - size);
    context.lineTo(x - size, y + size);
    context.stroke();
  }
  context.lineCap = 'butt';
}
