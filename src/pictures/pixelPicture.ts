import type { Difficulty } from '../difficulty';
import { EMPTY_CELL, modelSize, type PixelModel } from './pixelModel';

// -----------------------------------------------
// A PIXEL PICTURE TO COLOUR, CELL BY CELL
// -----------------------------------------------
// A creature of the garden or a drawing of the Pixel art notebook.

export interface PixelPicture {
  id: string;
  name: string;
  size: number;
  /** One string per row: '.' outside the picture, otherwise the palette index ('0'-'9'). */
  pixels: string[];
  /** Hex colours, in colouring order: the number shown to the player is index + 1. */
  palette: string[];
  /** One string per row: '0' unpainted, '1' painted right, 'a', 'b'... painted with the wrong colour 0, 1... */
  painted: string[];
  /** Cells painted wrong or touched outside the picture while colouring it. */
  mistakes?: number;
  /** 0-3, set once the picture is fully coloured. */
  stars?: number;
}

export const OUTSIDE = '.';
const WRONG_BASE = 'a'.charCodeAt(0);

/** A grid's size is its difficulty, for the Picross and for colouring the picture. */
export function difficultyForSize(size: number): Difficulty {
  if (size <= 5) return 0;
  return size <= 10 ? 2 : 4;
}

export function newPictureId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** The colouring fields of a hand-drawn model, all unpainted. */
export function pixelsOfModel(model: PixelModel): Pick<PixelPicture, 'size' | 'pixels' | 'palette' | 'painted'> {
  const size = modelSize(model);
  return {
    size,
    pixels: model.rows.map((row) => row.replaceAll(EMPTY_CELL, OUTSIDE)),
    palette: [...model.colors],
    painted: model.rows.map(() => '0'.repeat(size)),
  };
}

// -----------------------------------------------
// READING
// -----------------------------------------------

/** Palette index of a pixel, or -1 outside the picture. */
export function colorIndexAt(picture: PixelPicture, row: number, col: number): number {
  const char = picture.pixels[row][col];
  return char === OUTSIDE ? -1 : Number(char);
}

/** Palette index the player painted this pixel with, or -1 when unpainted. */
export function paintedColorAt(picture: PixelPicture, row: number, col: number): number {
  const char = picture.painted[row][col];
  if (char === '0') return -1;
  return char === '1' ? colorIndexAt(picture, row, col) : char.charCodeAt(0) - WRONG_BASE;
}

/** The `painted` character for a pixel whose right colour is `right`, painted with `painted` (-1: none). */
export function paintedChar(right: number, painted: number): string {
  if (painted < 0) return '0';
  return painted === right ? '1' : String.fromCharCode(WRONG_BASE + painted);
}

export function isColored(picture: PixelPicture): boolean {
  return picture.pixels.every((row, r) => [...row].every((char, c) => char === OUTSIDE || picture.painted[r][c] === '1'));
}

export function hasPaint(picture: PixelPicture): boolean {
  return picture.painted.some((row) => /[^0]/.test(row));
}

/** Checks the colouring fields of a saved picture (the caller checks its own extra fields). */
export function isPixelPicture(value: unknown): value is PixelPicture {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const { size, palette, pixels, painted } = candidate;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof size !== 'number' ||
    !Array.isArray(palette) ||
    palette.length > 10 ||
    !palette.every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color))
  ) {
    return false;
  }
  const isRows = (rows: unknown, isChar: (char: string) => boolean) =>
    Array.isArray(rows) &&
    rows.length === size &&
    rows.every((row) => typeof row === 'string' && row.length === size && [...row].every(isChar));
  const optionalCount = (count: unknown) => count === undefined || (Number.isInteger(count) && (count as number) >= 0);
  return (
    isRows(pixels, (char) => char === OUTSIDE || Number(char) < palette.length) &&
    isRows(painted, (char) => isPaintedChar(char, palette.length)) &&
    optionalCount(candidate.mistakes) &&
    optionalCount(candidate.stars)
  );
}

function isPaintedChar(char: string, colorCount: number): boolean {
  return char === '0' || char === '1' || (char >= 'a' && char.charCodeAt(0) - WRONG_BASE < colorCount);
}
