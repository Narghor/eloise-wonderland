// -----------------------------------------------
// THE PAINT ON A COLOURING PAGE (no DOM)
// -----------------------------------------------
// One palette index per pixel of an n x n grid, NO_PAINT where the page is still white.

export const NO_PAINT = 255;

export interface Score {
  /** Share of the zones to colour painted with their right colour, 0-1. */
  filled: number;
  /** Paint where it should not be (another colour, a white zone, outside), as a share of the zones to colour. */
  overflow: number;
}

/** [least filled, most overflow] for 3, 2 and 1 stars. */
const STAR_RULES: readonly [number, number][] = [
  [0.97, 0.01],
  [0.92, 0.03],
  [0.85, 0.06],
];

export function starsFor(score: Score): number {
  const index = STAR_RULES.findIndex(([filled, overflow]) => score.filled >= filled && score.overflow <= overflow);
  return index < 0 ? 0 : 3 - index;
}

/**
 * Keeps the score of a page painted against its model, pixel by pixel as the paint changes.
 * `target` is the right palette index of each pixel, NO_PAINT where it must stay white;
 * pixels under a line (`forgiven`) never count.
 */
export class PageScore {
  private readonly toPaint: number;
  private right = 0;
  private wrong = 0;

  constructor(
    private readonly target: Uint8Array,
    private readonly forgiven: Uint8Array,
    paint: Uint8Array,
  ) {
    let toPaint = 0;
    for (let i = 0; i < target.length; i++) {
      if (forgiven[i]) continue;
      if (target[i] !== NO_PAINT) toPaint++;
      this.add(i, paint[i], 1);
    }
    this.toPaint = Math.max(1, toPaint);
  }

  /** Call before a pixel's paint changes from `before` to `after`. */
  change(pixel: number, before: number, after: number): void {
    if (this.forgiven[pixel]) return;
    this.add(pixel, before, -1);
    this.add(pixel, after, 1);
  }

  get score(): Score {
    return { filled: this.right / this.toPaint, overflow: this.wrong / this.toPaint };
  }

  private add(pixel: number, paint: number, sign: 1 | -1): void {
    if (paint === NO_PAINT) return;
    if (paint === this.target[pixel]) this.right += sign;
    else this.wrong += sign;
  }
}

// -----------------------------------------------
// SAVING: run-length text
// -----------------------------------------------
// Each run is its value in base 36, ':' and its length in base 36, runs separated by ','.

export function encodePaint(paint: Uint8Array): string {
  const runs: string[] = [];
  let start = 0;
  for (let i = 1; i <= paint.length; i++) {
    if (i < paint.length && paint[i] === paint[start]) continue;
    runs.push(`${paint[start].toString(36)}:${(i - start).toString(36)}`);
    start = i;
  }
  return runs.join(',');
}

/** The paint of an n x n page, or null when the text is damaged or of another size. */
export function decodePaint(text: string, n: number, colorCount: number): Uint8Array | null {
  const paint = new Uint8Array(n * n);
  let at = 0;
  for (const run of text.split(',')) {
    const [value, length] = run.split(':').map((part) => parseInt(part, 36));
    if (!Number.isInteger(value) || !Number.isInteger(length) || length <= 0 || at + length > paint.length) return null;
    if (value !== NO_PAINT && value >= colorCount) return null;
    paint.fill(value, at, at + length);
    at += length;
  }
  return at === paint.length ? paint : null;
}
