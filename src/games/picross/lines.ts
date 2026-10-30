// -----------------------------------------------
// CLUES AND LINE SOLVER
// -----------------------------------------------

export type Cell = -1 | 0 | 1;
export const UNKNOWN: Cell = -1;
export const EMPTY: Cell = 0;
export const FILLED: Cell = 1;

/** Lengths of the filled runs of a line, in order. An empty line has no clue. */
export function clueOf(line: readonly boolean[]): number[] {
  const clue: number[] = [];
  let run = 0;
  for (const filled of line) {
    if (filled) {
      run++;
    } else if (run > 0) {
      clue.push(run);
      run = 0;
    }
  }
  if (run > 0) clue.push(run);
  return clue;
}

export function sameClue(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((length, i) => length === b[i]);
}

/**
 * Deduces every cell of the line that holds in ALL arrangements of the clue compatible with
 * the known cells. Returns null when no arrangement fits (contradiction).
 */
export function solveLine(clue: readonly number[], line: readonly Cell[]): Cell[] | null {
  const n = line.length;
  const canFill = new Array<boolean>(n).fill(false);
  const canEmpty = new Array<boolean>(n).fill(false);
  const current = new Array<Cell>(n).fill(EMPTY);
  let found = false;

  // spaceAfter[b]: minimum room the blocks after b need, each with its leading gap.
  const spaceAfter = new Array<number>(clue.length).fill(0);
  for (let b = clue.length - 2; b >= 0; b--) spaceAfter[b] = spaceAfter[b + 1] + clue[b + 1] + 1;

  const place = (block: number, from: number): void => {
    if (block === clue.length) {
      for (let i = from; i < n; i++) if (line[i] === FILLED) return;
      for (let i = from; i < n; i++) current[i] = EMPTY;
      found = true;
      for (let i = 0; i < n; i++) {
        if (current[i] === FILLED) canFill[i] = true;
        else canEmpty[i] = true;
      }
      return;
    }

    const length = clue[block];
    for (let start = from; start + length + spaceAfter[block] <= n; start++) {
      // Cells from..start-1 stay empty: a known filled cell there rules out this start and every later one.
      if (start > from && line[start - 1] === FILLED) break;
      let fits = true;
      for (let i = start; i < start + length; i++) {
        if (line[i] === EMPTY) {
          fits = false;
          break;
        }
      }
      if (!fits) continue;
      const end = start + length;
      if (end < n && line[end] === FILLED) continue;

      for (let i = from; i < start; i++) current[i] = EMPTY;
      for (let i = start; i < end; i++) current[i] = FILLED;
      if (end < n) current[end] = EMPTY;
      place(block + 1, Math.min(end + 1, n));
    }
  };

  place(0, 0);
  if (!found) return null;
  return line.map((_, i) => (canFill[i] && canEmpty[i] ? UNKNOWN : canFill[i] ? FILLED : EMPTY));
}

/**
 * True when the clues lead to a full grid by line logic alone: the solution is then unique
 * and the player never has to guess.
 */
export function isSolvableByLines(rowClues: readonly number[][], colClues: readonly number[][]): boolean {
  const rows = rowClues.length;
  const cols = colClues.length;
  const grid: Cell[][] = Array.from({ length: rows }, () => new Array<Cell>(cols).fill(UNKNOWN));

  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < rows; r++) {
      const solved = solveLine(rowClues[r], grid[r]);
      if (!solved) return false;
      for (let c = 0; c < cols; c++) {
        if (solved[c] !== grid[r][c]) {
          grid[r][c] = solved[c];
          changed = true;
        }
      }
    }
    for (let c = 0; c < cols; c++) {
      const solved = solveLine(colClues[c], grid.map((row) => row[c]));
      if (!solved) return false;
      for (let r = 0; r < rows; r++) {
        if (solved[r] !== grid[r][c]) {
          grid[r][c] = solved[r];
          changed = true;
        }
      }
    }
  }
  return grid.every((row) => row.every((cell) => cell !== UNKNOWN));
}
