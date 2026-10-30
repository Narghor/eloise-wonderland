import { darken, lighten } from '../../color';
import { mulberry32 } from '../../random';
import type { Cookie, Point } from './cookie';
import type { Stroke } from './icingScore';

/** Width of the icing line, in cookie units (1 = the whole picture). */
export const ICING_WIDTH = 0.028;
const SPRINKLE_COLORS = ['#ff5d73', '#ffd23f', '#4d9de0', '#3ecf8e', '#a66cff', '#ffffff'];

export interface PaintOptions {
  showGuides: boolean;
  /** Seed of the sprinkles thrown on a finished cookie; none when absent. */
  sprinkles?: number;
}

/** Draws the cookie into a square canvas whose size is already set. */
export function paintCookie(canvas: HTMLCanvasElement, cookie: Cookie, strokes: readonly Stroke[], options: PaintOptions): void {
  const context = canvas.getContext('2d')!;
  const size = canvas.width;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, size, size);
  context.setTransform(size, 0, 0, size, 0, 0);
  context.lineCap = 'round';
  context.lineJoin = 'round';

  // Dough: a warm gradient, a baked rim, a few specks.
  const dough = context.createRadialGradient(0.45, 0.42, 0.05, 0.5, 0.5, 0.45);
  dough.addColorStop(0, lighten(cookie.dough, 0.18));
  dough.addColorStop(1, cookie.dough);
  tracePath(context, cookie.outline, true);
  context.fillStyle = dough;
  context.fill();
  context.lineWidth = 0.014;
  context.strokeStyle = darken(cookie.dough, 0.82);
  context.stroke();
  // Specks scattered in a disc, clipped to the cookie so none lands between a star's arms.
  context.save();
  tracePath(context, cookie.outline, true);
  context.clip();
  const specks = mulberry32(7);
  context.fillStyle = darken(cookie.dough, 0.75);
  for (let i = 0; i < 40; i++) {
    const angle = specks() * Math.PI * 2;
    const distance = Math.sqrt(specks()) * 0.36;
    context.beginPath();
    context.arc(0.5 + Math.cos(angle) * distance, 0.5 + Math.sin(angle) * distance, 0.0035, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();

  if (options.showGuides) {
    context.setLineDash([0.012, 0.012]);
    context.lineWidth = 0.008;
    for (const guide of cookie.guides) {
      context.strokeStyle = guideColor(cookie.palette[guide.color]);
      tracePath(context, guide.points, guide.closed);
      context.stroke();
    }
    context.setLineDash([]);
  }

  for (const stroke of strokes) drawIcing(context, stroke.points, cookie.palette[stroke.color]);
  if (options.sprinkles !== undefined) drawSprinkles(context, strokes, options.sprinkles);
}

/** Piped icing: a darker rim, the colour, then a glossy highlight. */
function drawIcing(context: CanvasRenderingContext2D, points: Point[], color: string): void {
  if (points.length === 1) points = [points[0], [points[0][0] + 0.0001, points[0][1]]];
  tracePath(context, points, false);
  context.strokeStyle = darken(color, 0.8);
  context.lineWidth = ICING_WIDTH * 1.2;
  context.stroke();
  context.strokeStyle = color;
  context.lineWidth = ICING_WIDTH;
  context.stroke();
  context.save();
  context.translate(-0.003, -0.003);
  tracePath(context, points, false);
  context.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  context.lineWidth = ICING_WIDTH * 0.3;
  context.stroke();
  context.restore();
}

function drawSprinkles(context: CanvasRenderingContext2D, strokes: readonly Stroke[], seed: number): void {
  const random = mulberry32(seed);
  const points = strokes.flatMap((stroke) => stroke.points);
  if (points.length === 0) return;
  for (let i = 0; i < 70; i++) {
    const [x, y] = points[Math.floor(random() * points.length)];
    context.save();
    context.translate(x + (random() - 0.5) * 0.02, y + (random() - 0.5) * 0.02);
    context.rotate(random() * Math.PI);
    context.fillStyle = SPRINKLE_COLORS[Math.floor(random() * SPRINKLE_COLORS.length)];
    context.fillRect(-0.007, -0.002, 0.014, 0.004);
    context.restore();
  }
}

function tracePath(context: CanvasRenderingContext2D, points: Point[], closed: boolean): void {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) context.lineTo(points[i][0], points[i][1]);
  if (closed) context.closePath();
}

/** White icing would vanish as a white dotted guide: guides are always drawn a little darker. */
function guideColor(hex: string): string {
  return darken(hex, 0.7);
}
