import { JAR_HEIGHT, JAR_WIDTH } from './containers';

/** A layer boundary a few grains off still counts: nobody pours to the grain. */
const VERTICAL_TOLERANCE = 3;

/** Share (0-1) of the sand that matches the model, both compared as SandJar.colors(). */
export function similarity(player: Uint8Array, target: Uint8Array): number {
  let compared = 0;
  let matched = 0;
  for (let y = 0; y < JAR_HEIGHT; y++) {
    for (let x = 0; x < JAR_WIDTH; x++) {
      const index = y * JAR_WIDTH + x;
      const wanted = target[index];
      if (wanted === 0 && player[index] === 0) continue;
      compared++;
      for (let dy = -VERTICAL_TOLERANCE; dy <= VERTICAL_TOLERANCE; dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < JAR_HEIGHT && player[ny * JAR_WIDTH + x] === wanted) {
          matched++;
          break;
        }
      }
    }
  }
  return compared === 0 ? 0 : matched / compared;
}

export const STAR_THRESHOLDS = [0.55, 0.7, 0.82];

export function starsFor(score: number): number {
  return STAR_THRESHOLDS.filter((threshold) => score >= threshold).length;
}
