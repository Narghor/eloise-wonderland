import { creatureShape } from '../../creatures/shape';
import { clueOf, isSolvableByLines } from './lines';

export interface Puzzle {
  size: number;
  solution: boolean[][];
  rowClues: number[][];
  colClues: number[][];
}

const MAX_ATTEMPTS = 2000;

export function puzzleFrom(solution: boolean[][]): Puzzle {
  const size = solution.length;
  return {
    size,
    solution,
    rowClues: solution.map(clueOf),
    colClues: solution[0].map((_, c) => clueOf(solution.map((row) => row[c]))),
  };
}

/**
 * Draws creature silhouettes until one is solvable by logic alone.
 * The last draw is kept if none is: the win is checked on the clues, so it stays winnable.
 */
export function generatePuzzle(size: number): Puzzle {
  let puzzle = puzzleFrom(creatureShape(size));
  for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) {
    if (isSolvableByLines(puzzle.rowClues, puzzle.colClues)) break;
    puzzle = puzzleFrom(creatureShape(size));
  }
  return puzzle;
}
