import { readGame, writeGame } from '../../save';
import { isDifficulty, type Difficulty } from '../../difficulty';
import { isDayKey } from '../../daily/daily';
import { PIECE_COLORS, canPlace, isMotif, type Piece, type Puzzle } from './boxLogic';

export const GAME_ID = 'box';

export interface CurrentBox extends Puzzle {
  number: number;
  difficulty: Difficulty;
  /** Every drop that left a hole impossible to fill: taking the piece back does not give it back. */
  mistakes: number;
  /** Day of the daily challenge this box is. */
  challenge?: string;
}

export interface BoxSave {
  difficulty: Difficulty;
  boxesDone: number;
  /** Best grade per difficulty, 0 when never finished. */
  bestStars: number[];
  current: CurrentBox | null;
}

export function loadBox(): BoxSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const best = Array.isArray(data.bestStars) ? data.bestStars : [];
  return {
    difficulty: isDifficulty(data.difficulty) ? data.difficulty : 0,
    boxesDone: Number.isInteger(data.boxesDone) && (data.boxesDone as number) >= 0 ? (data.boxesDone as number) : 0,
    bestStars: [0, 1, 2, 3, 4].map((index) => ([0, 1, 2, 3].includes(best[index]) ? (best[index] as number) : 0)),
    current: isCurrent(data.current) ? withValidPlacements(data.current) : null,
  };
}

export function saveBox(save: BoxSave): void {
  writeGame(GAME_ID, save);
}

// -----------------------------------------------
// VALIDATION
// -----------------------------------------------

const isSmallInt = (value: unknown, max: number): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) < max;

function isPiece(value: unknown): value is Piece {
  if (typeof value !== 'object' || value === null) return false;
  const { cells, color, motif, rot, flip, at } = value as Record<string, unknown>;
  const atOk =
    at === null ||
    (typeof at === 'object' && Number.isInteger((at as Record<string, unknown>).row) && Number.isInteger((at as Record<string, unknown>).col));
  return (
    Array.isArray(cells) &&
    cells.length >= 1 &&
    cells.length <= 8 &&
    cells.every((cell) => Array.isArray(cell) && cell.length === 2 && isSmallInt(cell[0], 10) && isSmallInt(cell[1], 10)) &&
    isSmallInt(color, PIECE_COLORS.length) &&
    isMotif(motif) &&
    isSmallInt(rot, 4) &&
    typeof flip === 'boolean' &&
    atOk
  );
}

function isCurrent(value: unknown): value is CurrentBox {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const { rows, cols, blocked, pieces } = candidate;
  if (!isSmallInt(rows, 11) || !isSmallInt(cols, 11) || rows < 2 || cols < 2) return false;
  if (!Array.isArray(blocked) || !blocked.every((index) => isSmallInt(index, rows * cols))) return false;
  if (new Set(blocked).size !== blocked.length) return false;
  if (!Array.isArray(pieces) || pieces.length === 0 || !pieces.every(isPiece)) return false;
  const area = pieces.reduce((sum, piece) => sum + piece.cells.length, 0);
  return (
    area === rows * cols - blocked.length &&
    Number.isInteger(candidate.number) &&
    isDifficulty(candidate.difficulty) &&
    isSmallInt(candidate.mistakes, 10000) &&
    (candidate.challenge === undefined || isDayKey(candidate.challenge))
  );
}

/** A placement that no longer fits (edited save) sends its piece back to the tray. */
function withValidPlacements(current: CurrentBox): CurrentBox {
  const placed = current.pieces.map((piece) => piece.at);
  current.pieces.forEach((piece) => (piece.at = null));
  current.pieces.forEach((piece, index) => {
    const at = placed[index];
    if (at && canPlace(current, index, at.row, at.col)) piece.at = at;
  });
  return current;
}
