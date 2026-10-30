// -----------------------------------------------
// DRAWING A BRACELET (vertical, one diamond per knot)
// -----------------------------------------------

import { darken } from '../../color';
import { knotPlaces, weave, type Knot, type Pattern } from './braceletLogic';

export interface DrawOptions {
  /** Colours the knots should have: a knot that differs is marked as a mistake. */
  target?: number[];
  /** Shows the strings' current order on top, and outlines the next knot. */
  live?: boolean;
}

/** Height of the band on top where the strings arrive, in string spacings. */
const BAND = 1.2;
/** Vertical step between rows, in string spacings: diamonds of neighbouring rows interlock. */
const STEP = 0.6;

export function braceletHeight(pattern: Pattern, width: number): number {
  const spacing = width / pattern.strings.length;
  return Math.ceil(spacing * (BAND + STEP * (pattern.rows + 1)));
}

export function drawBracelet(canvas: HTMLCanvasElement, pattern: Pattern, knots: readonly Knot[], width: number, options: DrawOptions = {}): void {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const height = braceletHeight(pattern, width);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const { palette } = pattern;
  const spacing = width / pattern.strings.length;
  const step = spacing * STEP;
  const top = spacing * BAND;
  const places = knotPlaces(pattern);
  const { colors, strings } = weave(pattern, knots);
  const centre = (index: number) => ({ x: (places[index].left + 1) * spacing, y: top + step * (places[index].row + 1) });

  // Strings arriving on top: their current order while knotting, their starting order otherwise.
  const shown = options.live ? strings : pattern.strings;
  const next = options.live && knots.length < places.length ? knots.length : -1;
  const active = next >= 0 ? [places[next].left, places[next].left + 1] : [];
  shown.forEach((color, position) => {
    const x = (position + 0.5) * spacing;
    context.strokeStyle = palette[color];
    context.lineWidth = Math.max(2, spacing * 0.18);
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, top);
    context.stroke();
    const radius = spacing * (active.includes(position) ? 0.4 : 0.28);
    context.fillStyle = palette[color];
    context.strokeStyle = active.includes(position) ? '#2b2433' : darken(palette[color], 0.6);
    context.lineWidth = active.includes(position) ? 3 : 1.5;
    context.beginPath();
    context.arc(x, top * 0.45, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  });

  places.forEach((_, index) => {
    const { x, y } = centre(index);
    diamond(context, x, y, spacing / 2, step);
    if (index < colors.length) {
      context.fillStyle = palette[colors[index]];
      context.fill();
      context.strokeStyle = darken(palette[colors[index]], 0.6);
      context.lineWidth = 1;
      context.stroke();
      if (options.target && options.target[index] !== colors[index]) cross(context, x, y, spacing * 0.22);
    } else {
      context.strokeStyle = 'rgb(43 36 51 / 0.18)';
      context.lineWidth = 1;
      context.stroke();
    }
  });

  if (next >= 0) {
    const { x, y } = centre(next);
    // Threads from the two arriving strings down to the knot to make.
    active.forEach((position) => {
      context.strokeStyle = palette[strings[position]];
      context.lineWidth = Math.max(2, spacing * 0.14);
      context.beginPath();
      context.moveTo((position + 0.5) * spacing, top * 0.45);
      context.lineTo(x, y);
      context.stroke();
    });
    diamond(context, x, y, spacing / 2 + 2, step + 2);
    context.strokeStyle = '#2b2433';
    context.lineWidth = 3;
    context.stroke();
  }
}

function diamond(context: CanvasRenderingContext2D, x: number, y: number, halfWidth: number, halfHeight: number): void {
  context.beginPath();
  context.moveTo(x, y - halfHeight);
  context.lineTo(x + halfWidth, y);
  context.lineTo(x, y + halfHeight);
  context.lineTo(x - halfWidth, y);
  context.closePath();
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
