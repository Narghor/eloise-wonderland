// -----------------------------------------------
// THE BUBBLE GRID AND THE COLOUR MIXES
// -----------------------------------------------
// World unit = one bubble diameter. Even rows hold COLS bubbles, odd rows COLS - 1, shifted half a bubble.

export const COLS = 11;
export const MAX_ROWS = 14;
export const ROW_HEIGHT = Math.sqrt(3) / 2;

export const Color = { Red: 1, Yellow: 2, Blue: 3, Orange: 4, Green: 5, Purple: 6 } as const;
export type BubbleColor = (typeof Color)[keyof typeof Color];

export const BUBBLE_HEX: Record<BubbleColor, string> = {
  1: '#ff5d73',
  2: '#ffd23f',
  3: '#4d9de0',
  4: '#ff9f43',
  5: '#3ecf8e',
  6: '#a66cff',
};

export const PRIMARIES: BubbleColor[] = [Color.Red, Color.Yellow, Color.Blue];

export function isPrimary(color: number): boolean {
  return color === Color.Red || color === Color.Yellow || color === Color.Blue;
}

/** The colour two different primaries make together, or null when they do not mix. */
export function mixOf(a: number, b: number): BubbleColor | null {
  if (!isPrimary(a) || !isPrimary(b) || a === b) return null;
  if (a !== Color.Blue && b !== Color.Blue) return Color.Orange;
  if (a !== Color.Red && b !== Color.Red) return Color.Green;
  return Color.Purple;
}

export function componentsOf(color: BubbleColor): BubbleColor[] {
  switch (color) {
    case Color.Orange:
      return [Color.Red, Color.Yellow];
    case Color.Green:
      return [Color.Yellow, Color.Blue];
    case Color.Purple:
      return [Color.Red, Color.Blue];
    default:
      return [color];
  }
}

export type Cell = [row: number, col: number];

export class BubbleBoard {
  /** Row-major, COLS slots per row; 0 = empty. */
  readonly cells = new Uint8Array(MAX_ROWS * COLS);

  static rowLength(row: number): number {
    return row % 2 === 0 ? COLS : COLS - 1;
  }

  /** Centre of a cell, relative to the ceiling. */
  static x(row: number, col: number): number {
    return col + 0.5 + (row % 2) * 0.5;
  }

  static y(row: number): number {
    return 0.5 + row * ROW_HEIGHT;
  }

  get(row: number, col: number): number {
    return this.cells[row * COLS + col];
  }

  set(row: number, col: number, color: number): void {
    this.cells[row * COLS + col] = color;
  }

  isInside(row: number, col: number): boolean {
    return row >= 0 && row < MAX_ROWS && col >= 0 && col < BubbleBoard.rowLength(row);
  }

  neighbours(row: number, col: number): Cell[] {
    // On an even row the touching cells above and below are at col - 1 and col; on an odd row at col and col + 1.
    const shift = row % 2 === 0 ? -1 : 0;
    const around: Cell[] = [
      [row, col - 1],
      [row, col + 1],
      [row - 1, col + shift],
      [row - 1, col + shift + 1],
      [row + 1, col + shift],
      [row + 1, col + shift + 1],
    ];
    return around.filter(([r, c]) => this.isInside(r, c));
  }

  occupied(): Cell[] {
    const cells: Cell[] = [];
    for (let row = 0; row < MAX_ROWS; row++) {
      for (let col = 0; col < BubbleBoard.rowLength(row); col++) if (this.get(row, col) !== 0) cells.push([row, col]);
    }
    return cells;
  }

  isEmpty(): boolean {
    return this.cells.every((cell) => cell === 0);
  }

  /** Every bubble of the same colour connected to this one, itself included. */
  sameColorGroup(row: number, col: number): Cell[] {
    const color = this.get(row, col);
    return this.flood([[row, col]], (r, c) => this.get(r, c) === color);
  }

  /** Bubbles no longer hanging from the ceiling, through any chain of bubbles. */
  floating(): Cell[] {
    const top: Cell[] = [];
    for (let col = 0; col < COLS; col++) if (this.get(0, col) !== 0) top.push([0, col]);
    const attached = new Set(this.flood(top, (r, c) => this.get(r, c) !== 0).map(([r, c]) => r * COLS + c));
    return this.occupied().filter(([r, c]) => !attached.has(r * COLS + c));
  }

  private flood(start: Cell[], belongs: (row: number, col: number) => boolean): Cell[] {
    const seen = new Set(start.map(([r, c]) => r * COLS + c));
    const stack = [...start];
    const found: Cell[] = [];
    while (stack.length > 0) {
      const [row, col] = stack.pop()!;
      found.push([row, col]);
      for (const [r, c] of this.neighbours(row, col)) {
        const key = r * COLS + c;
        if (!seen.has(key) && belongs(r, c)) {
          seen.add(key);
          stack.push([r, c]);
        }
      }
    }
    return found;
  }
}

// -----------------------------------------------
// LEVELS
// -----------------------------------------------

/** Colours on the board for a level: primaries and orange first, the other mixes come later. */
export function levelColors(level: number): BubbleColor[] {
  if (level <= 1) return [Color.Red, Color.Yellow, Color.Blue, Color.Orange];
  if (level === 2) return [Color.Red, Color.Yellow, Color.Blue, Color.Orange, Color.Green];
  return [Color.Red, Color.Yellow, Color.Blue, Color.Orange, Color.Green, Color.Purple];
}

export function generateLevel(level: number): BubbleBoard {
  const board = new BubbleBoard();
  const colors = levelColors(level);
  const rows = Math.min(4 + Math.floor((level - 1) / 2), 8);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < BubbleBoard.rowLength(row); col++) {
      // Copying a neighbour already placed makes clusters, which is what makes a board fun to pop.
      const placed = board.neighbours(row, col).filter(([r, c]) => board.get(r, c) !== 0);
      const copy = placed.length > 0 && Math.random() < 0.55;
      const [r, c] = copy ? placed[Math.floor(Math.random() * placed.length)] : [0, 0];
      board.set(row, col, copy ? board.get(r, c) : colors[Math.floor(Math.random() * colors.length)]);
    }
  }
  return board;
}
