import { readGame, writeGame } from '../../save';
import { MODELS } from './origamiModels';

const GAME_ID = 'origami';

export interface OrigamiSave {
  /** Times each model was folded. */
  folded: Record<string, number>;
}

export function loadOrigami(): OrigamiSave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const folded: Record<string, number> = {};
  const counts = typeof data.folded === 'object' && data.folded !== null ? (data.folded as Record<string, unknown>) : {};
  for (const m of MODELS) {
    const n = counts[m.id];
    if (Number.isInteger(n) && (n as number) > 0) folded[m.id] = n as number;
  }
  return { folded };
}

export function saveOrigami(save: OrigamiSave): void {
  writeGame(GAME_ID, save);
}
