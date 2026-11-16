import { playBaa, playBleat, playBuzz, playCluck, playMoo, playOink, playQuack, playSniff } from '../casino/fx/sound';
import type { AnimalId } from './data/types';

/** What each animal says when it is fed, collected or welcomed. */
export const CRIES: Record<AnimalId, () => void> = {
  chicken: playCluck, cow: playMoo, sheep: playBaa, pig: playOink, bee: playBuzz, goat: playBleat, duck: playQuack, rabbit: playSniff,
};