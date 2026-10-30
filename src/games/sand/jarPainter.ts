import { hexToRgb, type Rgb } from '../../color';
import { JAR_HEIGHT, JAR_WIDTH, MaskCell, type Container } from './containers';
import { SHADES } from './jar';

const GLASS = [196, 214, 228, 255];
const GLASS_INSIDE = [236, 244, 250, 150];

/** Draws grain codes into a canvas, one pixel per cell; CSS scales it up without blurring. */
export class JarPainter {
  readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly image: ImageData;
  /** RGBA per grain code (index 0 unused). */
  private readonly grainColors: number[][];

  constructor(
    palette: string[],
    private readonly container: Container,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'jar-canvas';
    this.canvas.width = JAR_WIDTH;
    this.canvas.height = JAR_HEIGHT;
    this.context = this.canvas.getContext('2d')!;
    this.image = this.context.createImageData(JAR_WIDTH, JAR_HEIGHT);
    this.grainColors = [[0, 0, 0, 0]];
    // Shades go from a little lighter to a little darker: the sand looks grainy.
    for (const color of palette) {
      const rgb = hexToRgb(color);
      for (let shade = 0; shade < SHADES; shade++) {
        const offset = shade / (SHADES - 1) - 0.5;
        const tinted = offset < 0 ? mix(rgb, [255, 255, 255], -offset * 0.36) : mix(rgb, [0, 0, 0], offset * 0.2);
        this.grainColors.push([...tinted, 255]);
      }
    }
  }

  paint(cells: Uint8Array): void {
    const data = this.image.data;
    for (let i = 0; i < cells.length; i++) {
      const mask = this.container.mask[i];
      const rgba =
        mask === MaskCell.Outside ? null : mask === MaskCell.Glass ? GLASS : cells[i] === 0 ? GLASS_INSIDE : this.grainColors[cells[i]];
      const offset = i * 4;
      data[offset] = rgba ? rgba[0] : 0;
      data[offset + 1] = rgba ? rgba[1] : 0;
      data[offset + 2] = rgba ? rgba[2] : 0;
      data[offset + 3] = rgba ? rgba[3] : 0;
    }
    this.context.putImageData(this.image, 0, 0);
  }
}

function mix(rgb: Rgb, other: number[], amount: number): number[] {
  return rgb.map((channel, i) => Math.round(channel + (other[i] - channel) * amount));
}
