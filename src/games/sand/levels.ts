import { INSIDE_COUNT, POUR_MAX_X, POUR_MIN_X, SandJar } from './jar';

export const SAND_COLORS = [
  '#f7a6c1', // pink
  '#f6b26b', // orange
  '#ffe08a', // yellow
  '#9fdfc8', // mint
  '#8fb8f0', // blue
  '#c3a6f0', // lilac
  '#f4877e', // coral
  '#fdf3e3', // cream
  '#6e5a78', // plum
];

/** Pouring speed of the player. */
export const GRAINS_PER_FRAME = 6;
export const STEPS_PER_FRAME = 3;
/** The generator pours faster: the piles keep their shape, the model is ready twice as soon. */
const GENERATOR_GRAINS_PER_FRAME = 12;
/** Frames without a single grain fitting before a layer gives up: its pile reached the opening. */
const BLOCKED_FRAMES = 30;

export interface Level {
  palette: string[];
  /** Colour per cell, see SandJar.colors(). */
  target: Uint8Array;
}

/** Where the spout is (0 = left, 1 = right) while a layer goes from 0 to 1. */
type Pattern = (progress: number, phase: number) => number;

const PATTERNS: Pattern[] = [
  (t) => 0.5 + 0.45 * Math.sin(t * Math.PI * 12), // fast sweeps: a flat layer
  () => 0.5, // a mound in the middle
  (_t, phase) => (phase < 0.5 ? 0.12 : 0.88), // a slope from one side
  (t, phase) => 0.5 + 0.4 * Math.sin((t + phase) * Math.PI * 2), // one slow sweep: a wave
  (t) => ((t * 4) % 2 < 1 ? 0.25 : 0.75), // two hills
];

const TARGET_FILL = 0.9;

export function generateLevel(levelNumber: number): Level {
  const colorCount = Math.min(3 + Math.floor((levelNumber - 1) / 3), 5);
  const layerCount = Math.min(3 + Math.floor((levelNumber - 1) / 2), 8);
  const palette = shuffled(SAND_COLORS).slice(0, colorCount);

  const layers: { color: number; pattern: Pattern; phase: number; weight: number }[] = [];
  for (let i = 0; i < layerCount; i++) {
    let color = Math.floor(Math.random() * colorCount);
    if (i > 0 && color === layers[i - 1].color) color = (color + 1) % colorCount;
    layers.push({
      color,
      pattern: PATTERNS[Math.floor(Math.random() * PATTERNS.length)],
      phase: Math.random(),
      weight: 0.6 + Math.random() * 0.8,
    });
  }

  const jar = new SandJar();
  const totalWeight = layers.reduce((sum, layer) => sum + layer.weight, 0);
  const totalGrains = INSIDE_COUNT * TARGET_FILL;
  for (const layer of layers) {
    const amount = (totalGrains * layer.weight) / totalWeight;
    let poured = 0;
    let blocked = 0;
    while (poured < amount && blocked < BLOCKED_FRAMES) {
      const fraction = layer.pattern(poured / amount, layer.phase);
      const column = POUR_MIN_X + fraction * (POUR_MAX_X - POUR_MIN_X);
      const fitted = jar.pour(column, layer.color, Math.min(GENERATOR_GRAINS_PER_FRAME, Math.ceil(amount - poured)));
      poured += fitted;
      blocked = fitted === 0 ? blocked + 1 : 0;
      for (let s = 0; s < STEPS_PER_FRAME; s++) jar.step();
    }
  }
  jar.settle();
  return { palette, target: jar.colors() };
}

function shuffled<T>(list: readonly T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
