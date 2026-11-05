import type { PixelModel } from './pixelModel';
import { ANIMALS_MODELS } from './models/animals';
import { FOOD_MODELS } from './models/food';
import { THINGS_MODELS } from './models/things';

export const PIXEL_MODELS: readonly PixelModel[] = [...ANIMALS_MODELS, ...FOOD_MODELS, ...THINGS_MODELS];

export function findModel(id: string): PixelModel | undefined {
  return PIXEL_MODELS.find((model) => model.id === id);
}
