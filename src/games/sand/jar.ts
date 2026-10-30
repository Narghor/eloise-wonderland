// -----------------------------------------------
// THE JAR AND ITS SAND
// -----------------------------------------------
// A grid of cells: the mask says where the glass and the inside are, the cells hold the grains.
// A grain code packs its colour and a shade: 0 = empty, else 1 + color * SHADES + shade.

export const JAR_WIDTH = 84;
export const JAR_HEIGHT = 136;
export const SHADES = 3;

const OUTSIDE = 0;
const INSIDE = 1;
const GLASS = 2;
export const MaskCell = { Outside: OUTSIDE, Inside: INSIDE, Glass: GLASS } as const;

const BODY_HALF_WIDTH = JAR_WIDTH / 2 - 3;
const LIP_HALF_WIDTH = BODY_HALF_WIDTH - 2;
const LIP_HEIGHT = 4;
const BOTTOM_RADIUS = 14;
const FLOOR_Y = JAR_HEIGHT - 3;
const GLASS_THICKNESS = 2;

const CENTER_X = (JAR_WIDTH - 1) / 2;
/** Leftmost and rightmost columns a spout can pour into. */
export const POUR_MIN_X = Math.ceil(CENTER_X - LIP_HALF_WIDTH);
export const POUR_MAX_X = Math.floor(CENTER_X + LIP_HALF_WIDTH);

const POUR_ROWS = 3;
const POUR_SPREAD = 2;

export const jarMask = buildMask();
export const INSIDE_COUNT = jarMask.reduce((count, cell) => count + (cell === INSIDE ? 1 : 0), 0);

function innerHalfWidth(y: number): number {
  if (y > FLOOR_Y) return -1;
  if (y < LIP_HEIGHT) return LIP_HALF_WIDTH;
  const curveStart = FLOOR_Y - BOTTOM_RADIUS;
  if (y <= curveStart) return BODY_HALF_WIDTH;
  const dy = y - curveStart;
  return BODY_HALF_WIDTH - BOTTOM_RADIUS + Math.sqrt(BOTTOM_RADIUS * BOTTOM_RADIUS - dy * dy);
}

function buildMask(): Uint8Array {
  const mask = new Uint8Array(JAR_WIDTH * JAR_HEIGHT);
  for (let y = 0; y < JAR_HEIGHT; y++) {
    const half = innerHalfWidth(y);
    for (let x = 0; x < JAR_WIDTH; x++) {
      if (Math.abs(x - CENTER_X) <= half) mask[y * JAR_WIDTH + x] = INSIDE;
    }
  }
  // Glass: every outside cell close enough to the inside. The top stays open.
  for (let y = 0; y < JAR_HEIGHT; y++) {
    for (let x = 0; x < JAR_WIDTH; x++) {
      if (mask[y * JAR_WIDTH + x] === INSIDE) continue;
      if (nearInside(mask, x, y)) mask[y * JAR_WIDTH + x] = GLASS;
    }
  }
  return mask;
}

function nearInside(mask: Uint8Array, x: number, y: number): boolean {
  for (let dy = -GLASS_THICKNESS; dy <= GLASS_THICKNESS; dy++) {
    for (let dx = -GLASS_THICKNESS; dx <= GLASS_THICKNESS; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= JAR_WIDTH || ny < 0 || ny >= JAR_HEIGHT) continue;
      if (mask[ny * JAR_WIDTH + nx] === INSIDE) return true;
    }
  }
  return false;
}

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

  constructor(cells?: Uint8Array) {
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
      if (jarMask[index] !== INSIDE || this.cells[index] !== 0) continue;
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
    return grains / INSIDE_COUNT;
  }

  /** Colour per cell: 0 empty, else colour index + 1. What saves and scores compare. */
  colors(): Uint8Array {
    return this.cells.map((code) => colorOfGrain(code) + 1);
  }

  private isFree(index: number): boolean {
    return jarMask[index] === INSIDE && this.cells[index] === 0;
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

/** Grid column under a horizontal fraction of the jar's width, clamped to the opening. */
export function spoutColumn(fraction: number): number {
  return Math.min(POUR_MAX_X, Math.max(POUR_MIN_X, fraction * JAR_WIDTH));
}
