import { darken, lighten } from '../color';
import { el } from '../dom';
import { NECK_Y, SPECIES_HEIGHT, SPRITE_WIDTH, findItem, speciesOf, type WornItem } from './catalog';
import type { Look } from './companionSave';

/** Room above the species for the tallest hats. */
const HEADROOM = 2;
export const SPRITE_HEIGHT = SPECIES_HEIGHT + HEADROOM;

const FACE_COLORS: Record<string, string> = {
  i: '#f7a6c1',
  c: '#ff9fb8',
  n: '#5a3a48',
  e: '#2e2236',
  w: '#ffffff',
};

/** The companion on a pixel canvas, scaled up by CSS (`image-rendering: pixelated`). */
export function companionCanvas(look: Look, height: number): HTMLCanvasElement {
  const canvas = el('canvas', { class: 'companion-canvas' });
  canvas.width = SPRITE_WIDTH;
  canvas.height = SPRITE_HEIGHT;
  canvas.style.height = `${height}px`;
  canvas.style.width = `${Math.round((height * SPRITE_WIDTH) / SPRITE_HEIGHT)}px`;
  drawCompanion(canvas.getContext('2d')!, look);
  return canvas;
}

/** A square card: the companion on its background. */
export function companionPortrait(look: Look, size: number): HTMLElement {
  const portrait = el('div', { class: 'companion-portrait' }, companionCanvas(look, Math.round(size * 0.86)));
  portrait.style.width = portrait.style.height = `${size}px`;
  const background = findItem(look.background);
  if (background?.slot === 'background') portrait.style.background = background.css;
  return portrait;
}

function drawCompanion(context: CanvasRenderingContext2D, look: Look): void {
  const species = speciesOf(look.species);
  const coat = findItem(look.color);
  const body = coat?.slot === 'color' ? coat.color : species.color;
  const colors: Record<string, string> = { ...FACE_COLORS, b: body, o: darken(body, 0.5), l: lighten(body, 0.55) };
  paint(context, species.pixels, colors, 0, HEADROOM);

  const worn = (id: string | null) => {
    const item = findItem(id);
    return item && (item.slot === 'hat' || item.slot === 'glasses' || item.slot === 'neck') ? (item as WornItem) : undefined;
  };
  const neck = worn(look.neck);
  if (neck) paint(context, neck.pixels, neck.colors, centred(neck), NECK_Y + HEADROOM);
  const glasses = worn(look.glasses);
  if (glasses) paint(context, glasses.pixels, glasses.colors, 2, species.eyeY - 1 + HEADROOM);
  const hat = worn(look.hat);
  if (hat) paint(context, hat.pixels, hat.colors, centred(hat), species.hatY + HEADROOM - (hat.pixels.length - 1));
}

function centred(item: WornItem): number {
  return Math.floor((SPRITE_WIDTH - item.pixels[0].length) / 2);
}

function paint(context: CanvasRenderingContext2D, pixels: string[], colors: Record<string, string>, left: number, top: number): void {
  pixels.forEach((row, y) => {
    [...row].forEach((char, x) => {
      const color = colors[char];
      if (!color) return;
      context.fillStyle = color;
      context.fillRect(left + x, top + y, 1, 1);
    });
  });
}
