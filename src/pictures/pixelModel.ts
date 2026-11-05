// -----------------------------------------------
// HAND-DRAWN PIXEL MODELS
// -----------------------------------------------
// Pictures for the Picross and for Pixel art. Each model is a square grid of characters:
// '.' is empty, '0'-'9' is the index of its colour. The colour order is the colouring order.

export interface PixelModel {
  /** Stable id, kept in saves: never rename one. */
  id: string;
  /** Shown to the player, in French. */
  name: string;
  colors: string[];
  rows: string[];
}

export const EMPTY_CELL = '.';

export function modelSize(model: PixelModel): number {
  return model.rows.length;
}

export function modelSilhouette(model: PixelModel): boolean[][] {
  return model.rows.map((row) => [...row].map((char) => char !== EMPTY_CELL));
}

/** Reasons a model is malformed; empty when it is fine. */
export function modelProblems(model: PixelModel): string[] {
  const problems: string[] = [];
  const size = model.rows.length;
  if (!/^[a-z0-9-]+$/.test(model.id)) problems.push('id: lowercase letters, digits and dashes only');
  if (model.colors.length === 0 || model.colors.length > 10) problems.push('1 to 10 colours');
  if (!model.colors.every((color) => /^#[0-9a-f]{6}$/i.test(color))) problems.push('colours must be #rrggbb');
  if (model.rows.some((row) => row.length !== size)) problems.push(`rows must all be ${size} long (square grid)`);
  const used = new Set<number>();
  for (const row of model.rows) {
    for (const char of row) {
      if (char === EMPTY_CELL) continue;
      const index = Number(char);
      if (!Number.isInteger(index) || index >= model.colors.length) problems.push(`unknown cell '${char}'`);
      else used.add(index);
    }
  }
  model.colors.forEach((_, index) => {
    if (!used.has(index)) problems.push(`colour ${index} is never used`);
  });
  return [...new Set(problems)];
}
