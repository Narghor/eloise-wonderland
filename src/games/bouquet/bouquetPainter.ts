import { darken, lighten } from '../../color';
import { flower, type FlowerKey, type SpeciesId } from './flowers';

// -----------------------------------------------
// LAYOUT OF THE FAN (unit square, y down)
// -----------------------------------------------

const NECK = { x: 0.5, y: 0.7 };
const FAN_HALF_ANGLE = (68 * Math.PI) / 180;
const TALL_REACH = 0.5;
const LOW_REACH = 0.33;
const EMPTY_REACH = 0.42;
/** Head diameter, as a share of the canvas side. */
export const HEAD_SIZE = 0.13;

/** Where the head of slot `index` sits; a tall flower stands further out. */
export function slotPosition(index: number, count: number, key: FlowerKey | null): { x: number; y: number } {
  const angle = count === 1 ? 0 : -FAN_HALF_ANGLE + (2 * FAN_HALF_ANGLE * index) / (count - 1);
  const reach = key === null ? EMPTY_REACH : flower(key).species.tall ? TALL_REACH : LOW_REACH;
  return { x: NECK.x + reach * Math.sin(angle), y: NECK.y - reach * Math.cos(angle) };
}

// -----------------------------------------------
// THE WHOLE BOUQUET
// -----------------------------------------------

export function paintBouquet(canvas: HTMLCanvasElement, slots: readonly (FlowerKey | null)[], options: { selected?: number } = {}): void {
  const ctx = canvas.getContext('2d')!;
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.scale(size, size);
  ctx.lineCap = 'round';

  const heads = slots.map((key, i) => ({ key, ...slotPosition(i, slots.length, key) }));
  for (const head of heads) {
    if (!head.key) continue;
    stem(ctx, NECK.x, NECK.y + 0.06, head.x, head.y);
  }
  // Tall flowers behind, low ones in front.
  const order = heads.map((_, i) => i).sort((a, b) => (heads[a].y - heads[b].y));
  for (const i of order) {
    const head = heads[i];
    if (head.key) paintHead(ctx, head.key, head.x, head.y, HEAD_SIZE);
    else emptySlot(ctx, head.x, head.y, i === options.selected);
    if (head.key && i === options.selected) selectionRing(ctx, head.x, head.y);
  }
  vase(ctx);
  ctx.restore();
}

/** One flower of the stall, with a little stem. */
export function paintStallFlower(canvas: HTMLCanvasElement, key: FlowerKey): void {
  const ctx = canvas.getContext('2d')!;
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.scale(size, size);
  ctx.lineCap = 'round';
  stem(ctx, 0.5, 1, 0.5, 0.45);
  paintHead(ctx, key, 0.5, 0.42, 0.62);
  ctx.restore();
}

function stem(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
  ctx.strokeStyle = '#4f9a4a';
  ctx.lineWidth = 0.014;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 0.03, x1, y1);
  ctx.stroke();
  const mx = x0 + (x1 - x0) * 0.55;
  const my = y0 + (y1 - y0) * 0.55;
  ctx.fillStyle = '#62b05a';
  ctx.beginPath();
  ctx.ellipse(mx + 0.02, my, 0.03, 0.011, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

function vase(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(150, 205, 230, 0.85)';
  ctx.strokeStyle = '#6fa6c4';
  ctx.lineWidth = 0.008;
  ctx.beginPath();
  ctx.moveTo(0.38, 0.72);
  ctx.lineTo(0.62, 0.72);
  ctx.quadraticCurveTo(0.6, 0.85, 0.66, 0.97);
  ctx.lineTo(0.34, 0.97);
  ctx.quadraticCurveTo(0.4, 0.85, 0.38, 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f48fb1';
  ctx.fillRect(0.385, 0.775, 0.23, 0.03);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillRect(0.41, 0.82, 0.02, 0.11);
}

function emptySlot(ctx: CanvasRenderingContext2D, x: number, y: number, selected: boolean): void {
  ctx.setLineDash([0.012, 0.01]);
  ctx.strokeStyle = selected ? '#d9608c' : '#b9a3bf';
  ctx.lineWidth = selected ? 0.009 : 0.006;
  ctx.fillStyle = selected ? 'rgba(244, 143, 177, 0.25)' : 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(x, y, HEAD_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
}

function selectionRing(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.strokeStyle = '#d9608c';
  ctx.lineWidth = 0.01;
  ctx.beginPath();
  ctx.arc(x, y, HEAD_SIZE * 0.62, 0, Math.PI * 2);
  ctx.stroke();
}

// -----------------------------------------------
// FLOWER HEADS (centred on x, y; `d` is the diameter)
// -----------------------------------------------

function paintHead(ctx: CanvasRenderingContext2D, key: FlowerKey, x: number, y: number, d: number): void {
  const { species, colour } = flower(key);
  const r = d / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = d * 0.04;
  ctx.strokeStyle = colour.id === 'blanc' ? '#c9c2b4' : darken(colour.hex, 0.75);
  HEADS[species.id](ctx, r, colour.hex);
  ctx.restore();
}

function petalRing(ctx: CanvasRenderingContext2D, count: number, distance: number, length: number, width: number, fill: string, turn = 0): void {
  ctx.fillStyle = fill;
  for (let i = 0; i < count; i++) {
    const angle = turn + (i * Math.PI * 2) / count;
    ctx.beginPath();
    ctx.ellipse(Math.cos(angle) * distance, Math.sin(angle) * distance, length, width, angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, outline = true): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (outline) ctx.stroke();
}

const HEADS: Record<SpeciesId, (ctx: CanvasRenderingContext2D, r: number, hex: string) => void> = {
  rose(ctx, r, hex) {
    disc(ctx, 0, 0, r, hex);
    ctx.lineWidth *= 1.2;
    for (const k of [0.72, 0.46, 0.22]) {
      ctx.beginPath();
      ctx.arc(0, 0, r * k, 0.4 + k * 3, 0.4 + k * 3 + Math.PI * 1.4);
      ctx.stroke();
    }
  },
  tulipe(ctx, r, hex) {
    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, -r * 0.5);
    ctx.lineTo(-r * 0.4, -r * 0.1);
    ctx.lineTo(0, -r * 0.9);
    ctx.lineTo(r * 0.4, -r * 0.1);
    ctx.lineTo(r * 0.8, -r * 0.5);
    ctx.quadraticCurveTo(r * 0.95, r * 0.9, 0, r * 0.9);
    ctx.quadraticCurveTo(-r * 0.95, r * 0.9, -r * 0.8, -r * 0.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = lighten(hex, 0.35);
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, r * 0.25, r * 0.12, r * 0.35, 0.2, 0, Math.PI * 2);
    ctx.fill();
  },
  marguerite(ctx, r, hex) {
    petalRing(ctx, 12, r * 0.55, r * 0.45, r * 0.15, hex);
    disc(ctx, 0, 0, r * 0.3, '#f5c518');
  },
  tournesol(ctx, r, hex) {
    petalRing(ctx, 14, r * 0.62, r * 0.38, r * 0.14, hex);
    ctx.strokeStyle = '#5b3a1a';
    disc(ctx, 0, 0, r * 0.48, '#7a4a20');
    ctx.fillStyle = '#4a2c12';
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  lavande(ctx, r, hex) {
    ctx.strokeStyle = '#4f9a4a';
    ctx.beginPath();
    ctx.moveTo(0, r);
    ctx.lineTo(0, -r);
    ctx.stroke();
    ctx.strokeStyle = darken(hex, 0.7);
    for (let i = 0; i < 6; i++) {
      const y = r * 0.8 - i * r * 0.33;
      const w = r * (0.32 - i * 0.03);
      ctx.fillStyle = i % 2 ? hex : lighten(hex, 0.2);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(side * w * 0.6, y, w * 0.6, r * 0.16, side * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  },
  pivoine(ctx, r, hex) {
    petalRing(ctx, 8, r * 0.55, r * 0.42, r * 0.36, hex);
    petalRing(ctx, 6, r * 0.28, r * 0.3, r * 0.26, lighten(hex, 0.25), 0.5);
    disc(ctx, 0, 0, r * 0.2, lighten(hex, 0.45));
  },
  muguet(ctx, r, hex) {
    ctx.strokeStyle = '#4f9a4a';
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r);
    ctx.quadraticCurveTo(-r * 0.2, -r * 0.9, r * 0.8, -r * 0.5);
    ctx.stroke();
    ctx.strokeStyle = '#c9c2b4';
    const bells = [
      [-r * 0.15, -r * 0.05],
      [r * 0.15, -r * 0.45],
      [r * 0.55, -r * 0.35],
      [-r * 0.6, r * 0.35],
    ];
    for (const [bx, by] of bells) {
      ctx.fillStyle = hex;
      ctx.beginPath();
      ctx.arc(bx, by + r * 0.18, r * 0.24, Math.PI, 0);
      ctx.lineTo(bx + r * 0.28, by + r * 0.32);
      ctx.lineTo(bx - r * 0.28, by + r * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  },
  coquelicot(ctx, r, hex) {
    petalRing(ctx, 4, r * 0.45, r * 0.55, r * 0.5, hex, Math.PI / 4);
    ctx.strokeStyle = '#111';
    disc(ctx, 0, 0, r * 0.22, '#2b1d1d');
  },
  iris(ctx, r, hex) {
    // Three falls hanging down, three standards up.
    petalRing(ctx, 3, r * 0.5, r * 0.5, r * 0.26, hex, Math.PI / 2);
    petalRing(ctx, 3, r * 0.4, r * 0.42, r * 0.2, lighten(hex, 0.3), -Math.PI / 2);
    ctx.fillStyle = '#f5c518';
    for (const a of [Math.PI / 2, Math.PI / 2 + (Math.PI * 2) / 3, Math.PI / 2 - (Math.PI * 2) / 3]) {
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.18, r * 0.06, a, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  myosotis(ctx, r, hex) {
    const small = r * 0.42;
    for (const [fx, fy] of [
      [0, -r * 0.45],
      [-r * 0.5, r * 0.25],
      [r * 0.5, r * 0.25],
      [0, r * 0.1],
    ]) {
      ctx.save();
      ctx.translate(fx, fy);
      petalRing(ctx, 5, small * 0.5, small * 0.45, small * 0.38, hex, -Math.PI / 2);
      ctx.strokeStyle = '#d9a400';
      disc(ctx, 0, 0, small * 0.25, '#f5d84a');
      ctx.restore();
    }
  },
};
