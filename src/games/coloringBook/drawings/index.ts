import type { BookDrawing } from '../bookDrawing';
import { ANIMALS_DRAWINGS } from './animals';
import { THINGS_DRAWINGS } from './things';

export const BOOK_DRAWINGS: readonly BookDrawing[] = [...ANIMALS_DRAWINGS, ...THINGS_DRAWINGS];

export function findDrawing(id: string): BookDrawing | undefined {
  return BOOK_DRAWINGS.find((drawing) => drawing.id === id);
}
