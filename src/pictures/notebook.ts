import { readGame, writeGame } from '../save';
import { pickModel } from './modelPicker';
import type { PixelModel } from './pixelModel';
import { hasPaint, isPixelPicture, newPictureId, pixelsOfModel, type PixelPicture } from './pixelPicture';

// -----------------------------------------------
// THE PIXEL ART NOTEBOOK
// -----------------------------------------------
// Drawings made from hand-drawn models, won at the Picross or drawn in Pixel art.

const GAME_ID = 'pixelArt';

/** Won by solving a Picross, or drawn in Pixel art. */
export type DrawingSource = 'picross' | 'pixel';

export interface NotebookDrawing extends PixelPicture {
  modelId: string;
  source: DrawingSource;
  addedAt: string;
}

export function loadNotebook(): NotebookDrawing[] {
  const raw = readGame(GAME_ID);
  const drawings = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>).drawings : undefined;
  return Array.isArray(drawings) ? drawings.filter(isNotebookDrawing) : [];
}

export function findNotebookDrawing(id: string): NotebookDrawing | undefined {
  return loadNotebook().find((drawing) => drawing.id === id);
}

export function updateNotebookDrawing(drawing: NotebookDrawing): void {
  saveNotebook(loadNotebook().map((existing) => (existing.id === drawing.id ? drawing : existing)));
}

/** Models already in the notebook, coloured or not. */
export function discoveredModels(drawings: readonly NotebookDrawing[] = loadNotebook()): Set<string> {
  return new Set(drawings.map((drawing) => drawing.modelId));
}

export function addModelDrawing(model: PixelModel, source: DrawingSource): NotebookDrawing {
  const drawing: NotebookDrawing = {
    id: newPictureId(),
    name: model.name,
    modelId: model.id,
    source,
    addedAt: new Date().toISOString(),
    ...pixelsOfModel(model),
  };
  saveNotebook([...loadNotebook(), drawing]);
  return drawing;
}

/**
 * A new drawing of this size for Pixel art. A Pixel art drawing of that size never touched is dropped first,
 * so asking for another model does not fill the notebook with blank pages.
 */
export function startNotebookDrawing(size: number, avoid?: string): NotebookDrawing | null {
  const kept = loadNotebook().filter((drawing) => drawing.source !== 'pixel' || drawing.size !== size || hasPaint(drawing));
  const model = pickModel(size, discoveredModels(kept), undefined, avoid);
  if (!model) return null;
  saveNotebook(kept);
  return addModelDrawing(model, 'pixel');
}

function saveNotebook(drawings: NotebookDrawing[]): void {
  writeGame(GAME_ID, { drawings });
}

/** A drawing whose model is gone (renamed id) is kept: it carries its own pixels and colours. */
function isNotebookDrawing(value: unknown): value is NotebookDrawing {
  if (!isPixelPicture(value)) return false;
  const candidate = value as unknown as Record<string, unknown>;
  return (
    typeof candidate.modelId === 'string' &&
    (candidate.source === 'picross' || candidate.source === 'pixel') &&
    typeof candidate.addedAt === 'string'
  );
}
