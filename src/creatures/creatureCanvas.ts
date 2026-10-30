import { colorIndexAt, paintedColorAt, type Creature } from './creature';

const UNPAINTED = '#e7d9e0';

/** Crisp pixel-art drawing of a creature; unpainted pixels show as a soft silhouette. */
export function creatureCanvas(creature: Creature, displaySize: number): HTMLCanvasElement {
  const scale = Math.max(1, Math.floor((displaySize * window.devicePixelRatio) / creature.size));
  const canvas = document.createElement('canvas');
  canvas.className = 'creature-canvas';
  canvas.width = canvas.height = creature.size * scale;
  canvas.style.width = canvas.style.height = `${displaySize}px`;

  const context = canvas.getContext('2d')!;
  for (let r = 0; r < creature.size; r++) {
    for (let c = 0; c < creature.size; c++) {
      const index = colorIndexAt(creature, r, c);
      if (index < 0) continue;
      const painted = paintedColorAt(creature, r, c);
      context.fillStyle = painted < 0 ? UNPAINTED : creature.palette[painted];
      context.fillRect(c * scale, r * scale, scale, scale);
    }
  }
  return canvas;
}
