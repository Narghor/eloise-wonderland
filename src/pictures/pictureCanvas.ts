import { colorIndexAt, paintedColorAt, type PixelPicture } from './pixelPicture';

const UNPAINTED = '#e7d9e0';

/** Crisp pixel-art drawing of a picture; unpainted pixels show as a soft silhouette. */
export function pictureCanvas(picture: PixelPicture, displaySize: number): HTMLCanvasElement {
  const scale = Math.max(1, Math.floor((displaySize * window.devicePixelRatio) / picture.size));
  const canvas = document.createElement('canvas');
  canvas.className = 'picture-canvas';
  canvas.width = canvas.height = picture.size * scale;
  canvas.style.width = canvas.style.height = `${displaySize}px`;

  const context = canvas.getContext('2d')!;
  for (let r = 0; r < picture.size; r++) {
    for (let c = 0; c < picture.size; c++) {
      const index = colorIndexAt(picture, r, c);
      if (index < 0) continue;
      const painted = paintedColorAt(picture, r, c);
      context.fillStyle = painted < 0 ? UNPAINTED : picture.palette[painted];
      context.fillRect(c * scale, r * scale, scale, scale);
    }
  }
  return canvas;
}
