import { shuffled } from '../../random';
import type { LevelTable } from '../../difficulty';
import { CONTAINER_IDS, type Container, type ContainerId } from './containers';
import { SandJar } from './jar';

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

/** Model palettes: five colours that go together yet stay easy to tell apart in sand. */
const THEMES: { name: string; colors: string[] }[] = [
  { name: 'Coucher de soleil', colors: ['#ffe08a', '#f6b26b', '#f4877e', '#c25b7a', '#5e3b6e'] },
  { name: 'Océan', colors: ['#f3ecd8', '#9fe3e0', '#4fb3d9', '#2f6fae', '#1f3f6e'] },
  { name: 'Bonbons', colors: ['#ffc2e2', '#b9ecff', '#d8c2ff', '#fff0a8', '#ff8fbf'] },
  { name: 'Forêt', colors: ['#eef5d0', '#a8d58a', '#5f9e57', '#c9a477', '#6b4e3d'] },
  { name: 'Lavande', colors: ['#f6efff', '#d8c2ff', '#a98be0', '#7a5cb8', '#ffd6e8'] },
];

export interface Level {
  theme: string;
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

/** 3 colours in 3 layers up to 5 colours in 8 layers. */
export const SAND_LEVELS: LevelTable = [1, 3, 6, 8, 11];

/** Models go round every container, starting with the plain jar. */
export function containerForModel(modelNumber: number): ContainerId {
  return CONTAINER_IDS[(modelNumber - 1) % CONTAINER_IDS.length];
}

export function generateLevel(levelNumber: number, container: Container): Level {
  const colorCount = Math.min(3 + Math.floor((levelNumber - 1) / 3), 5);
  const layerCount = Math.min(3 + Math.floor((levelNumber - 1) / 2), 8);
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  const palette = shuffled(theme.colors).slice(0, colorCount);

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

  const jar = new SandJar(container);
  const totalWeight = layers.reduce((sum, layer) => sum + layer.weight, 0);
  const totalGrains = container.insideCount * TARGET_FILL;
  for (const layer of layers) {
    const amount = (totalGrains * layer.weight) / totalWeight;
    let poured = 0;
    let blocked = 0;
    while (poured < amount && blocked < BLOCKED_FRAMES) {
      const fraction = layer.pattern(poured / amount, layer.phase);
      const column = container.pourMinX + fraction * (container.pourMaxX - container.pourMinX);
      const fitted = jar.pour(column, layer.color, Math.min(GENERATOR_GRAINS_PER_FRAME, Math.ceil(amount - poured)));
      poured += fitted;
      blocked = fitted === 0 ? blocked + 1 : 0;
      for (let s = 0; s < STEPS_PER_FRAME; s++) jar.step();
    }
  }
  jar.settle();
  return { theme: theme.name, palette, target: jar.colors() };
}
