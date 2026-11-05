import { shuffled } from '../random';
import { modelSize, type PixelModel } from './pixelModel';
import { PIXEL_MODELS } from './pixelModels';

/** Grid sizes that have at least one model. */
export function modelSizes(): number[] {
  return [...new Set(PIXEL_MODELS.map(modelSize))].sort((a, b) => a - b);
}

export function modelCount(): number {
  return PIXEL_MODELS.length;
}

/**
 * A random model of this size that `accept` takes, a not yet discovered one first;
 * `avoid` (the model just played) only comes back when nothing else fits.
 */
export function pickModel(
  size: number,
  discovered: ReadonlySet<string>,
  accept: (model: PixelModel) => boolean = () => true,
  avoid?: string,
): PixelModel | undefined {
  const ofSize = shuffled(PIXEL_MODELS.filter((model) => modelSize(model) === size));
  const rank = (model: PixelModel) => (model.id === avoid ? 2 : discovered.has(model.id) ? 1 : 0);
  return ofSize.sort((a, b) => rank(a) - rank(b)).find(accept);
}
