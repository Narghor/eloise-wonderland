import { hexToRgb } from '../../color';
import type { Raster } from './glassWindow';

const LEAD = [43, 36, 51];
const FROSTED = [233, 228, 238];
/** Given pieces carry a dark rivet in their middle, this share of the piece's radius wide. */
const HINT_DOT_RADIUS = 0.08;

export interface PaintOptions {
  hints?: ReadonlySet<number>;
  conflicts?: ReadonlySet<number>;
}

/** Draws the window: each piece brighter at its heart, with a little grain; leads in dark grey. */
export function paintWindow(
  canvas: HTMLCanvasElement,
  raster: Raster,
  colors: readonly number[],
  palette: readonly string[],
  options: PaintOptions = {},
): void {
  canvas.width = raster.width;
  canvas.height = raster.height;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(raster.width, raster.height);
  const data = image.data;
  const rgbPalette = palette.map(hexToRgb);

  for (let index = 0; index < raster.region.length; index++) {
    const piece = raster.region[index];
    const offset = index * 4;
    if (piece < 0 && !raster.lead[index]) continue;

    let rgb: number[];
    if (raster.lead[index]) {
      rgb = LEAD;
    } else {
      const x = index % raster.width;
      const y = Math.floor(index / raster.width);
      const [cx, cy] = raster.centroids[piece];
      const distance = Math.hypot(x - cx, y - cy) / raster.radii[piece];
      const isHintDot = options.hints?.has(piece) && distance < HINT_DOT_RADIUS;
      const color = colors[piece];
      const base = color < 0 ? FROSTED : rgbPalette[color];
      // Light through glass: brighter in the middle of the piece, a touch of grain everywhere.
      let light = 0.88 + 0.26 * (1 - Math.min(1, distance)) + (grain(x, y) - 0.5) * 0.08;
      if (options.conflicts?.has(piece) && ((x + y) >> 3) & 1) light *= 0.6;
      rgb = isHintDot ? LEAD : base.map((channel) => Math.min(255, channel * light));
    }
    data[offset] = rgb[0];
    data[offset + 1] = rgb[1];
    data[offset + 2] = rgb[2];
    data[offset + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

function grain(x: number, y: number): number {
  return ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000) / 1000;
}

