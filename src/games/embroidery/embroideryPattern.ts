// -----------------------------------------------
// CROSS-STITCH PATTERN AND ITS STITCHES (no DOM)
// -----------------------------------------------
// The front is what each cell is stitched with; the back is, per colour, the ordered list of
// cells its thread went through. Two consecutive stitches of a colour that do not touch (even
// by a corner) leave a long thread on the back: a jump.

import type { LevelTable } from '../../difficulty';
import { createCreature } from '../../creatures/creature';
import { creatureShape } from '../../creatures/shape';

/** Pattern size (cells per side) for each difficulty. */
export const EMBROIDERY_LEVELS: LevelTable = [5, 8, 10, 12, 15];

/** Points allowed for three stars, as a share of the pattern's cells; two and one star allow 3x and 6x that. */
const SCORE_SHARE_FOR_THREE_STARS = 0.05;
/** A jump costs half a mistake: an untidy back is a lesser fault than a wrong colour. */
export const JUMP_COST = 0.5;

export const NO_STITCH = -1;

export interface Pattern {
  name: string;
  size: number;
  /** One string per row: '.' outside the pattern, otherwise the palette index ('0'-'9'). */
  pixels: string[];
  palette: string[];
}

export function createPattern(size: number): Pattern {
  const creature = createCreature(creatureShape(size));
  return { name: creature.name, size, pixels: creature.pixels, palette: creature.palette };
}

/** Right palette index per cell (row-major), -1 outside the pattern. */
export function targetColors(pattern: Pattern): number[] {
  return pattern.pixels.flatMap((row) => [...row].map((char) => (char === '.' ? -1 : Number(char))));
}

export function areTouching(size: number, a: number, b: number): boolean {
  const rowGap = Math.abs(Math.floor(a / size) - Math.floor(b / size));
  const colGap = Math.abs((a % size) - (b % size));
  return rowGap <= 1 && colGap <= 1;
}

/** Jumps along one colour's path: its first stitch is free. */
export function jumpsInPath(size: number, path: readonly number[]): number {
  let jumps = 0;
  for (let i = 1; i < path.length; i++) if (!areTouching(size, path[i - 1], path[i])) jumps++;
  return jumps;
}

/** Jumps no order can avoid: one per extra patch of a colour (cells touching by a side or a corner). */
export function unavoidableJumps(pattern: Pattern): number {
  const { size } = pattern;
  const target = targetColors(pattern);
  const seen = target.map(() => false);
  let patches = 0;
  target.forEach((color, start) => {
    if (color < 0 || seen[start]) return;
    patches++;
    seen[start] = true;
    const stack = [start];
    while (stack.length > 0) {
      const cell = stack.pop()!;
      target.forEach((other, next) => {
        if (other === color && !seen[next] && areTouching(size, cell, next)) {
          seen[next] = true;
          stack.push(next);
        }
      });
    }
  });
  return patches - new Set(target.filter((color) => color >= 0)).size;
}

/** `jumps` beyond `unavoidableJumps` cost JUMP_COST each. */
export function starsForScore(mistakes: number, jumps: number, cellCount: number, freeJumps = 0): number {
  const score = mistakes + Math.max(0, jumps - freeJumps) * JUMP_COST;
  const allowed = Math.max(1, Math.round(cellCount * SCORE_SHARE_FOR_THREE_STARS));
  if (score <= allowed) return 3;
  if (score <= allowed * 3) return 2;
  return score <= allowed * 6 ? 1 : 0;
}

// -----------------------------------------------
// A PIECE BEING STITCHED
// -----------------------------------------------

export type StitchResult = 'outside' | 'unchanged' | 'right' | 'wrong';

export class Work {
  readonly size: number;
  readonly target: number[];
  readonly cellCount: number;
  /** Palette index stitched per cell, NO_STITCH when bare. */
  readonly stitched: number[];
  /** Per colour, the cells its thread went through, in order. */
  readonly paths: number[][];
  jumps = 0;

  constructor(
    readonly pattern: Pattern,
    stitched?: number[],
    paths?: number[][],
  ) {
    this.size = pattern.size;
    this.target = targetColors(pattern);
    this.cellCount = this.target.filter((color) => color >= 0).length;
    this.stitched = stitched ?? this.target.map(() => NO_STITCH);
    this.paths = paths ?? pattern.palette.map(() => []);
    this.jumps = this.paths.reduce((sum, path) => sum + jumpsInPath(this.size, path), 0);
  }

  /** Stitches `cell` with `color`; a stitch that is already there changes nothing. */
  stitch(cell: number, color: number): { result: StitchResult; jump: boolean } {
    if (this.target[cell] < 0) return { result: 'outside', jump: false };
    if (this.stitched[cell] === color) return { result: 'unchanged', jump: false };
    const path = this.paths[color];
    const jump = path.length > 0 && !areTouching(this.size, path[path.length - 1], cell);
    if (jump) this.jumps++;
    path.push(cell);
    this.stitched[cell] = color;
    return { result: color === this.target[cell] ? 'right' : 'wrong', jump };
  }

  isRight(cell: number): boolean {
    return this.target[cell] >= 0 && this.stitched[cell] === this.target[cell];
  }

  /** Cells of this colour not stitched right yet. */
  remaining(color: number): number {
    return this.target.filter((target, cell) => target === color && !this.isRight(cell)).length;
  }

  rightCount(): number {
    return this.target.filter((_, cell) => this.isRight(cell)).length;
  }

  isFinished(): boolean {
    return this.target.every((target, cell) => target < 0 || this.isRight(cell));
  }
}

// -----------------------------------------------
// COMPACT STRINGS FOR THE SAVE
// -----------------------------------------------

/** One char per cell: '.' bare, otherwise the palette index stitched. */
export function encodeStitched(stitched: readonly number[]): string {
  return stitched.map((color) => (color < 0 ? '.' : String(color))).join('');
}

export function decodeStitched(text: string, cellCount: number, colorCount: number): number[] | null {
  if (text.length !== cellCount) return null;
  const stitched = [...text].map((char) => (char === '.' ? NO_STITCH : Number(char)));
  return stitched.every((color) => color === NO_STITCH || (Number.isInteger(color) && color < colorCount)) ? stitched : null;
}

/** Two base-36 chars per cell (patterns stay under 1296 cells). */
export function encodePath(path: readonly number[]): string {
  return path.map((cell) => cell.toString(36).padStart(2, '0')).join('');
}

export function decodePath(text: string, cellCount: number): number[] | null {
  if (text.length % 2 !== 0 || !/^[0-9a-z]*$/.test(text)) return null;
  const path: number[] = [];
  for (let i = 0; i < text.length; i += 2) path.push(parseInt(text.slice(i, i + 2), 36));
  return path.every((cell) => cell < cellCount) ? path : null;
}

export function isPattern(value: unknown): value is Pattern {
  if (typeof value !== 'object' || value === null) return false;
  const { name, size, pixels, palette } = value as Record<string, unknown>;
  if (typeof name !== 'string' || !Number.isInteger(size) || (size as number) < 2 || (size as number) > 30) return false;
  if (!Array.isArray(palette) || palette.length === 0 || palette.length > 10) return false;
  if (!palette.every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color))) return false;
  const digits = new RegExp(`^[.0-${palette.length - 1}]{${size}}$`);
  return Array.isArray(pixels) && pixels.length === size && pixels.every((row) => typeof row === 'string' && digits.test(row));
}
