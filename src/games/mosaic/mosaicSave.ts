import { readGame, writeGame } from '../../save';
import { isDifficulty, type Difficulty } from '../../difficulty';
import { isDayKey } from '../../daily/daily';
import { isMosaicLevel, type Placement } from './mosaicBoard';

export const GAME_ID = 'mosaic';

export interface CurrentMosaic {
  number: number;
  /** Rebuilds the board with generateBoard(seed, level). */
  seed: number;
  level: number;
  /** One entry per tile, null while it is in the tray. */
  placements: (Placement | null)[];
  mistakes: number;
  challenge?: string;
}

/** A finished mosaic: the gallery regenerates the board and lays the tiles where the player put them. */
export interface GalleryMosaic {
  id: string;
  number: number;
  seed: number;
  level: number;
  placements: Placement[];
  stars: number;
  madeAt: string;
}

export interface MosaicSave {
  difficulty: Difficulty;
  mosaicsDone: number;
  current: CurrentMosaic | null;
  gallery: GalleryMosaic[];
}

export function loadMosaic(): MosaicSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    difficulty: isDifficulty(data.difficulty) ? data.difficulty : 0,
    mosaicsDone: Number.isInteger(data.mosaicsDone) && (data.mosaicsDone as number) >= 0 ? (data.mosaicsDone as number) : 0,
    current: isCurrent(data.current) ? data.current : null,
    gallery: Array.isArray(data.gallery) ? data.gallery.filter(isGalleryMosaic) : [],
  };
}

export function saveMosaic(save: MosaicSave): void {
  writeGame(GAME_ID, save);
}

// -----------------------------------------------
// VALIDATION
// -----------------------------------------------
// Shapes only: whether the placements fit the regenerated board is checked by the game itself.

function isPlacement(value: unknown): value is Placement {
  if (typeof value !== 'object' || value === null) return false;
  const { x, y, rotation } = value as Record<string, unknown>;
  return Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(rotation) && (rotation as number) >= 0 && (rotation as number) < 4;
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isCurrent(value: unknown): value is CurrentMosaic {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isCount(candidate.number) &&
    Number.isInteger(candidate.seed) &&
    isMosaicLevel(candidate.level) &&
    Array.isArray(candidate.placements) &&
    candidate.placements.every((placement) => placement === null || isPlacement(placement)) &&
    isCount(candidate.mistakes) &&
    (candidate.challenge === undefined || isDayKey(candidate.challenge))
  );
}

function isGalleryMosaic(value: unknown): value is GalleryMosaic {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.madeAt === 'string' &&
    isCount(candidate.number) &&
    Number.isInteger(candidate.seed) &&
    isMosaicLevel(candidate.level) &&
    Array.isArray(candidate.placements) &&
    candidate.placements.every(isPlacement) &&
    Number.isInteger(candidate.stars) &&
    (candidate.stars as number) >= 1 &&
    (candidate.stars as number) <= 3
  );
}
