import { readGame, writeGame } from '../../save';
import { isDifficulty, type Difficulty } from '../../difficulty';

const GAME_ID = 'coloringBook';

/** "model": copy the coloured model, graded; "free": any colour, anywhere, no grade. */
export type BookMode = 'model' | 'free';
export const BOOK_MODES: readonly BookMode[] = ['model', 'free'];

export interface PageInProgress {
  drawingId: string;
  difficulty: Difficulty;
  /** The paint holds indexes into this palette. */
  palette: string[];
  /** Run-length text of the paint (see bookPaint). */
  paint: string;
}

export interface BookSave {
  mode: BookMode;
  difficulty: Difficulty;
  /** Best stars per drawing, in model mode. */
  best: Record<string, number>;
  /** Pages finished in model mode. */
  pagesDone: number;
  pages: Record<BookMode, PageInProgress | null>;
}

export function loadBook(): BookSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const pages = (typeof data.pages === 'object' && data.pages !== null ? data.pages : {}) as Record<string, unknown>;
  return {
    mode: BOOK_MODES.includes(data.mode as BookMode) ? (data.mode as BookMode) : 'model',
    difficulty: isDifficulty(data.difficulty) ? data.difficulty : 1,
    best: readStars(data.best),
    pagesDone: Number.isInteger(data.pagesDone) && (data.pagesDone as number) >= 0 ? (data.pagesDone as number) : 0,
    pages: {
      model: isPage(pages.model) ? pages.model : null,
      free: isPage(pages.free) ? pages.free : null,
    },
  };
}

export function saveBook(save: BookSave): void {
  writeGame(GAME_ID, save);
}

function readStars(value: unknown): Record<string, number> {
  const stars: Record<string, number> = {};
  if (typeof value !== 'object' || value === null) return stars;
  for (const [id, count] of Object.entries(value)) {
    if (Number.isInteger(count) && count >= 0 && count <= 3) stars[id] = count;
  }
  return stars;
}

function isPage(value: unknown): value is PageInProgress {
  if (typeof value !== 'object' || value === null) return false;
  const page = value as Record<string, unknown>;
  return (
    typeof page.drawingId === 'string' &&
    isDifficulty(page.difficulty) &&
    Array.isArray(page.palette) &&
    page.palette.length > 0 &&
    page.palette.length < 64 &&
    page.palette.every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) &&
    typeof page.paint === 'string'
  );
}
