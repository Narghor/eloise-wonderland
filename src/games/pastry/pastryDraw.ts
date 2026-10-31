// -----------------------------------------------
// DRAWING A CAKE SLICE (side view, bottom layer first)
// -----------------------------------------------

import { darken, lighten } from '../../color';
import { mulberry32 } from '../../random';
import { KINDS, type KindId } from './pastryLogic';

export interface CakeOptions {
  /** Layers to cross out as mistakes. */
  wrong?: readonly boolean[];
  /** Total layers of the finished cake: empty slots are outlined above the placed ones. */
  slots?: number;
  /** 0 to 1 while the knife cuts; 1 shows the slice, 0 the whole frosted cake. */
  cut?: number;
}

/** A layer the model hides, drawn this thick. */
const HIDDEN_THICKNESS = 0.6;
/** Height of a cake unit (one sponge) as a share of the width. */
const UNIT = 0.2;
const PLATE = 0.1;
const MARGIN = 0.06;

function thickness(kind: KindId | null): number {
  return kind ? KINDS[kind].thickness : HIDDEN_THICKNESS;
}

export function cakeCanvasHeight(layers: readonly (KindId | null)[], width: number, slots = layers.length): number {
  const units = layers.reduce((sum, kind) => sum + thickness(kind), 0) + (slots - layers.length) * HIDDEN_THICKNESS;
  return Math.ceil(width * (UNIT * units + PLATE + MARGIN * 2 + UNIT * 0.4));
}

export function drawCake(canvas: HTMLCanvasElement, layers: readonly (KindId | null)[], width: number, options: CakeOptions = {}): void {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const height = cakeCanvasHeight(layers, width, options.slots);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const unit = width * UNIT;
  const left = width * 0.12;
  const right = width * 0.88;
  const plateY = height - width * (MARGIN + PLATE);
  plate(context, width, plateY);

  let y = plateY;
  const tops: number[] = [];
  layers.forEach((kind, index) => {
    const h = thickness(kind) * unit;
    y -= h;
    tops.push(y);
    if (kind) layer(context, kind, left, y, right - left, h, index);
    else hiddenLayer(context, left, y, right - left, h);
    if (options.wrong?.[index]) cross(context, (left + right) / 2, y + h / 2, Math.min(h * 0.4, unit * 0.3));
  });
  for (let slot = layers.length; slot < (options.slots ?? layers.length); slot++) {
    const h = HIDDEN_THICKNESS * unit;
    y -= h;
    context.setLineDash([5, 4]);
    context.strokeStyle = 'rgb(43 36 51 / 0.3)';
    context.lineWidth = 1.5;
    context.strokeRect(left + 0.5, y + 1, right - left - 1, h - 2);
    context.setLineDash([]);
  }

  const top = layers[layers.length - 1];
  if (top && KINDS[top].family === 'glaze') drips(context, KINDS[top].color, left, tops[tops.length - 1], right - left, unit);
  if (options.cut !== undefined && options.cut < 1 && top) frosting(context, KINDS[top].color, left, y, right - left, plateY - y, options.cut);
}

/** The cut, in about a second and a half: the knife goes down, then the front slides away. */
export function animateCut(canvas: HTMLCanvasElement, layers: readonly KindId[], width: number, done: () => void): () => void {
  const start = performance.now();
  let frame = 0;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 1500);
    drawCake(canvas, layers, width, { cut: t });
    if (t < 1) frame = requestAnimationFrame(step);
    else done();
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}

// -----------------------------------------------
// PIECES
// -----------------------------------------------

function plate(context: CanvasRenderingContext2D, width: number, y: number): void {
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#c9c2d6';
  context.lineWidth = 1.5;
  context.beginPath();
  context.ellipse(width / 2, y + width * 0.03, width * 0.46, width * 0.05, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

function layer(context: CanvasRenderingContext2D, kind: KindId, x: number, y: number, w: number, h: number, seed: number): void {
  const { color, family } = KINDS[kind];
  const random = mulberry32(seed * 977 + kind.length * 31);
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  context.fillStyle = color;
  context.fillRect(x, y, w, h);

  if (family === 'sponge') {
    // Little air holes.
    context.fillStyle = darken(color, 0.82);
    for (let i = 0; i < w / 6; i++) {
      context.beginPath();
      context.arc(x + random() * w, y + 3 + random() * (h - 6), 0.8 + random() * 1.6, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = darken(color, 0.88);
    context.fillRect(x, y + h - 2, w, 2);
  } else if (family === 'cream') {
    context.fillStyle = lighten(color, 0.35);
    context.beginPath();
    context.moveTo(x, y + h * 0.35);
    for (let px = 0; px <= w; px += 6) context.lineTo(x + px, y + h * 0.3 + Math.sin(px / 9 + seed) * h * 0.12);
    context.lineTo(x + w, y);
    context.lineTo(x, y);
    context.fill();
  } else if (family === 'jam') {
    context.fillStyle = lighten(color, 0.3);
    context.fillRect(x, y + h * 0.2, w, Math.max(1, h * 0.15));
  } else if (family === 'fruit') {
    // Strawberry halves cut through, in a cream bed.
    const size = h * 0.42;
    for (let cx = x + size; cx < x + w; cx += size * 2.4) {
      context.fillStyle = '#e8364f';
      context.beginPath();
      context.ellipse(cx, y + h / 2, size, size * 0.95, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffd3d9';
      context.beginPath();
      context.ellipse(cx, y + h / 2, size * 0.45, size * 0.55, 0, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
  context.strokeStyle = darken(color, 0.7);
  context.lineWidth = 1;
  context.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function hiddenLayer(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  context.fillStyle = '#e6e1ec';
  context.fillRect(x, y, w, h);
  context.strokeStyle = '#b9b1c6';
  context.lineWidth = 1;
  context.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  context.fillStyle = '#7d728c';
  context.font = `700 ${Math.round(h * 0.7)}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('?', x + w / 2, y + h / 2 + 1);
}

/** Glaze running down from the top, past its own layer. */
function drips(context: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, unit: number): void {
  context.fillStyle = color;
  context.strokeStyle = darken(color, 0.75);
  context.lineWidth = 1;
  const top = y - unit * 0.12;
  context.beginPath();
  context.moveTo(x - 2, y + unit * 0.3);
  context.quadraticCurveTo(x - 2, top, x + 8, top);
  context.lineTo(x + w - 8, top);
  context.quadraticCurveTo(x + w + 2, top, x + w + 2, y + unit * 0.3);
  const drops = [0.14, 0.33, 0.58, 0.8];
  for (let i = drops.length - 1; i >= 0; i--) {
    const cx = x + w * drops[i];
    const depth = unit * (0.45 + (i % 2) * 0.25);
    context.lineTo(cx + 6, y + unit * 0.3);
    context.quadraticCurveTo(cx + 6, y + depth, cx, y + depth);
    context.quadraticCurveTo(cx - 6, y + depth, cx - 6, y + unit * 0.3);
  }
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = 'rgb(255 255 255 / 0.45)';
  context.fillRect(x + w * 0.1, top + unit * 0.06, w * 0.3, unit * 0.05);
}

/** The outside of the whole cake, covering the slice until the knife has cut it. */
function frosting(context: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number, t: number): void {
  const knife = Math.min(1, t / 0.45);
  const slide = Math.max(0, (t - 0.5) / 0.5);
  const shift = slide * w * 1.2;
  context.save();
  context.globalAlpha = 1 - slide * 0.6;
  context.fillStyle = color;
  context.strokeStyle = darken(color, 0.75);
  context.lineWidth = 1.5;
  context.beginPath();
  context.roundRect(x - 3 + shift, y - 2, w + 6, h + 2, 8);
  context.fill();
  context.stroke();
  context.restore();
  if (slide > 0) return;
  // The knife: a blade going down the middle.
  const blade = x + w / 2;
  context.fillStyle = '#d9dde6';
  context.strokeStyle = '#7d8597';
  context.lineWidth = 1.5;
  context.beginPath();
  context.rect(blade - 3, y - 30 + (h + 30) * knife - 40, 6, 40);
  context.fill();
  context.stroke();
  context.strokeStyle = 'rgb(43 36 51 / 0.5)';
  context.beginPath();
  context.moveTo(blade, y);
  context.lineTo(blade, y + h * knife);
  context.stroke();
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
