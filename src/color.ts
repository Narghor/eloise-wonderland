export type Rgb = [number, number, number];

/** "#rrggbb" to its three channels, 0-255. */
export function hexToRgb(hex: string): Rgb {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** The colour with every channel multiplied by `factor` (below 1: darker). */
export function darken(hex: string, factor: number): string {
  const [red, green, blue] = hexToRgb(hex).map((channel) => Math.round(channel * factor));
  return `rgb(${red}, ${green}, ${blue})`;
}

/** The colour moved `amount` (0-1) of the way towards white. */
export function lighten(hex: string, amount: number): string {
  const [red, green, blue] = hexToRgb(hex).map((channel) => Math.round(channel + (255 - channel) * amount));
  return `rgb(${red}, ${green}, ${blue})`;
}

/** True when white text reads better than dark text on this colour. */
export function isDarkColor(hex: string): boolean {
  const [red, green, blue] = hexToRgb(hex);
  return 0.299 * red + 0.587 * green + 0.114 * blue < 140;
}
