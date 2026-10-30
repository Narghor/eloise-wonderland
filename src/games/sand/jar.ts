// -----------------------------------------------
// THE SAND IN A CONTAINER
// -----------------------------------------------
// A grid of cells: the container's mask says where the glass and the inside are, the cells hold the grains.
// A grain code packs its colour and a shade: 0 = empty, else 1 + color * SHADES + shade.

import { JAR_HEIGHT, JAR_WIDTH, MaskCell, type Container } from './containers';

export const SHADES = 3;

const POUR_ROWS = 3;
const POUR_SPREAD = 2;

export function grainCode(color: number, shade: number): number {
  return 1 + color * SHADES + shade;
}

/** Colour index of a grain code, or -1 for an empty cell. */
export function colorOfGrain(code: number): number {
  return code === 0 ? -1 : Math.floor((code - 1) / SHADES);
}

export class SandJar {
  readonly cells: Uint8Array;
  private tick = 0;

  constructor(
    readonly container: Container,
    cells?: Uint8Array,
  ) {
    this.cells = cells ?? new Uint8Array(JAR_WIDTH * JAR_HEIGHT);
  }

  /** Drops up to `count` grains at the top, around column `spoutX`. Returns how many fitted. */
  pour(spoutX: number, color: number, count: number): number {
    let poured = 0;
    for (let attempt = 0; attempt < count * 4 && poured < count; attempt++) {
      const x = Math.round(spoutX + (Math.random() * 2 - 1) * POUR_SPREAD);
      const y = Math.floor(Math.random() * POUR_ROWS);
      if (x < 0 || x >= JAR_WIDTH) continue;
      const index = y * JAR_WIDTH + x;
      if (!this.isFree(index)) continue;
      this.cells[index] = grainCode(color, Math.floor(Math.random() * SHADES));
      poured++;
    }
    return poured;
  }

  /**
   * Moves every grain once: straight down if free, else diagonally down. Rows are scanned from the
   * bottom so a grain moves at most once per step; the scan direction alternates to avoid a drift.
   * Returns false once nothing moves any more.
   */
  step(): boolean {
    const cells = this.cells;
    let moved = false;
    this.tick++;
    for (let y = JAR_HEIGHT - 2; y >= 0; y--) {
      const leftToRight = ((y + this.tick) & 1) === 0;
      for (let k = 0; k < JAR_WIDTH; k++) {
        const x = leftToRight ? k : JAR_WIDTH - 1 - k;
        const index = y * JAR_WIDTH + x;
        const grain = cells[index];
        if (grain === 0) continue;

        const below = index + JAR_WIDTH;
        let target = -1;
        if (this.isFree(below)) {
          target = below;
        } else {
          const side = Math.random() < 0.5 ? -1 : 1;
          if (x + side >= 0 && x + side < JAR_WIDTH && this.isFree(below + side)) target = below + side;
          else if (x - side >= 0 && x - side < JAR_WIDTH && this.isFree(below - side)) target = below - side;
        }
        if (target >= 0) {
          cells[target] = grain;
          cells[index] = 0;
          moved = true;
        }
      }
    }
    return moved;
  }

  /** Steps until every grain rests (bounded, in case of a pathological pile). */
  settle(): void {
    for (let i = 0; i < JAR_HEIGHT * 4 && this.step(); i++);
  }

  fillRatio(): number {
    let grains = 0;
    for (const cell of this.cells) if (cell !== 0) grains++;
    return grains / this.container.insideCount;
  }

  /** Colour per cell: 0 empty, else colour index + 1. What saves and scores compare. */
  colors(): Uint8Array {
    return this.cells.map((code) => colorOfGrain(code) + 1);
  }

  private isFree(index: number): boolean {
    return this.container.mask[index] === MaskCell.Inside && this.cells[index] === 0;
  }
}

/** Rebuilds grain codes from saved colours; the shade comes from the position, so it is stable. */
export function cellsFromColors(colors: Uint8Array): Uint8Array {
  return colors.map((color, index) => {
    if (color === 0) return 0;
    const x = index % JAR_WIDTH;
    const y = Math.floor(index / JAR_WIDTH);
    const shade = (((x * 73856093) ^ (y * 19349663)) >>> 0) % SHADES;
    return grainCode(color - 1, shade);
  });
}

/** Grid column under a horizontal fraction of the grid's width, clamped to the container's opening. */
export function spoutColumn(container: Container, fraction: number): number {
  return Math.min(container.pourMaxX, Math.max(container.pourMinX, fraction * JAR_WIDTH));
}
