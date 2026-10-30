// -----------------------------------------------
// CREATURE SILHOUETTES
// -----------------------------------------------
// Mirrored noise, smoothed into blobs, kept only when it reads as one little creature.

type Grid = boolean[][];

export const STEPS_4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

const MAX_DRAWS = 10000;

export function creatureShape(size: number): Grid {
  let shape: Grid = [];
  for (let draw = 0; draw < MAX_DRAWS; draw++) {
    shape = mirroredNoise(size, size <= 5 ? 0.6 : 0.5 + Math.random() * 0.1);
    // A 5x5 grid has no room for smoothing: it would erase the whole shape.
    if (size > 5) shape = smooth(smooth(shape));
    shape = withoutSpecks(shape, Math.max(2, Math.floor(size / 3)));
    if (isCreatureLike(shape)) break;
  }
  return shape;
}

function mirroredNoise(size: number, density: number): Grid {
  const half = Math.ceil(size / 2);
  return Array.from({ length: size }, () => {
    const left = Array.from({ length: half }, () => Math.random() < density);
    return [...left, ...left.slice(0, size - half).reverse()];
  });
}

/** Majority vote over the 3x3 neighbourhood: noise becomes rounded blobs. */
function smooth(grid: Grid): Grid {
  return grid.map((row, r) =>
    row.map((_, c) => {
      let filled = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (grid[r + dr]?.[c + dc]) filled++;
        }
      }
      return filled >= 5;
    }),
  );
}

function withoutSpecks(grid: Grid, minCells: number): Grid {
  const result = grid.map((row) => row.slice());
  for (const piece of pieces(grid)) {
    if (piece.length < minCells) for (const [r, c] of piece) result[r][c] = false;
  }
  return result;
}

function isCreatureLike(grid: Grid): boolean {
  const size = grid.length;
  const filled = grid.flat().filter(Boolean).length / (size * size);
  if (filled < 0.35 || filled > 0.75) return false;
  if (pieces(grid).length !== 1) return false;
  // The creature must use the grid: no tiny figure lost in a big puzzle.
  const rows = grid.map((row, r) => (row.some(Boolean) ? r : -1)).filter((r) => r >= 0);
  const cols = grid[0].map((_, c) => (grid.some((row) => row[c]) ? c : -1)).filter((c) => c >= 0);
  const height = rows[rows.length - 1] - rows[0] + 1;
  const width = cols[cols.length - 1] - cols[0] + 1;
  return height >= size * 0.8 && width >= size * 0.8;
}

/** Groups of filled cells touching by a side. */
function pieces(grid: Grid): [number, number][][] {
  const size = grid.length;
  const seen = grid.map((row) => row.map(() => false));
  const found: [number, number][][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c] || seen[r][c]) continue;
      const piece: [number, number][] = [];
      const stack: [number, number][] = [[r, c]];
      seen[r][c] = true;
      while (stack.length > 0) {
        const [cr, cc] = stack.pop()!;
        piece.push([cr, cc]);
        for (const [dr, dc] of STEPS_4) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (grid[nr]?.[nc] && !seen[nr][nc]) {
            seen[nr][nc] = true;
            stack.push([nr, nc]);
          }
        }
      }
      found.push(piece);
    }
  }
  return found;
}
