import { hexToRgb, type Rgb } from '../../color';
import { LEAVE_WHITE, type BookDrawing } from './bookDrawing';

// -----------------------------------------------
// THE PENCILS
// -----------------------------------------------

/** Free mode: a full box of pencils, white included to cover a mistake. */
export const FREE_PALETTE: readonly string[] = [
  '#ffffff', '#fff1a8', '#ffd23f', '#ffa94d', '#ff7a45', '#e5455a', '#c2185b', '#ff9ec7',
  '#f6c6d9', '#d7b8f3', '#9b6fd6', '#5b4bb7', '#9cc9ff', '#4a90e2', '#2b5fa8', '#9fe6c4',
  '#5cc28b', '#2e8b57', '#c9e27a', '#d9b48f', '#a0672f', '#6b4423', '#b8b0b8', '#3b2a3f',
];

/** The model's colours, plus `decoys` close shades that are not in it, sorted by hue. */
export function modelPalette(drawing: BookDrawing, decoys: number): string[] {
  const colors = [...new Set(drawing.zones.map((zone) => zone.color.toLowerCase()))].filter((color) => color !== LEAVE_WHITE);
  const fakes: string[] = [];
  for (let i = 0; fakes.length < decoys && i < colors.length * 2; i++) {
    const base = hexToRgb(colors[i % colors.length]);
    const fake = i < colors.length ? mix(base, [255, 255, 255], 0.35) : mix(base, [0, 0, 0], 0.25);
    if (![...colors, ...fakes].includes(fake)) fakes.push(fake);
  }
  return [...colors, ...fakes].sort((a, b) => hue(a) - hue(b));
}

function mix(color: Rgb, toward: Rgb, amount: number): string {
  return `#${color.map((channel, i) => Math.round(channel + (toward[i] - channel) * amount).toString(16).padStart(2, '0')).join('')}`;
}

/** Hue in degrees; greys go last. */
function hue(hex: string): number {
  const [red, green, blue] = hexToRgb(hex).map((channel) => channel / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  if (max - min < 0.08) return 400 + (1 - max) * 100;
  let degrees: number;
  if (max === red) degrees = ((green - blue) / (max - min)) % 6;
  else if (max === green) degrees = (blue - red) / (max - min) + 2;
  else degrees = (red - green) / (max - min) + 4;
  return (degrees * 60 + 360) % 360;
}
