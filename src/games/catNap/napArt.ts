// -----------------------------------------------
// THE CATS' NAP: ART
// -----------------------------------------------

const OUTLINE = '#3b2a3f';

// -----------------------------------------------
// CUSHION FABRICS
// -----------------------------------------------

interface Fabric {
  base: string;
  /** Repeating tile, drawn on the base colour. */
  tile: number;
  pattern: string;
}

const vichy = (ink: string, opacity: number) =>
  `<rect width="8" height="16" fill="${ink}" opacity="${opacity}"/><rect width="16" height="8" fill="${ink}" opacity="${opacity}"/>`;
const dots = (color: string, radius: number) => `<circle cx="3.5" cy="3.5" r="${radius}" fill="${color}"/><circle cx="10.5" cy="10.5" r="${radius}" fill="${color}"/>`;
const flower = (x: number, y: number, heart: string) =>
  `<g transform="translate(${x} ${y})"><circle cx="0" cy="-2" r="1.8" fill="#fff"/><circle cx="2" cy="1" r="1.8" fill="#fff"/><circle cx="-2" cy="1" r="1.8" fill="#fff"/><circle r="1.3" fill="${heart}"/></g>`;

/** One fabric per cushion: colour and pattern both tell the cushions apart. */
const FABRICS: readonly Fabric[] = [
  { base: '#ffc2d9', tile: 16, pattern: vichy('#e88fb0', 0.35) },
  { base: '#b9dcff', tile: 14, pattern: dots('rgba(255,255,255,0.85)', 2.2) },
  { base: '#c6f2b0', tile: 12, pattern: '<path d="M-3 3 L3 -3 M0 12 L12 0 M9 15 L15 9" stroke="#8fd07a" stroke-width="3" opacity="0.55"/>' },
  { base: '#fff3a3', tile: 22, pattern: flower(6, 6, '#e8cf5a') + flower(17, 17, '#e8cf5a') },
  { base: '#d9c8ff', tile: 16, pattern: vichy('#a98ee8', 0.3) },
  { base: '#ffcf9e', tile: 14, pattern: '<circle cx="7" cy="7" r="2.6" fill="#f0a564" opacity="0.5"/>' },
  { base: '#a6ece4', tile: 10, pattern: '<rect width="10" height="4" fill="#fff" opacity="0.5"/>' },
  { base: '#dcd8d2', tile: 12, pattern: '<path d="M0 6 H12 M6 0 V12" stroke="#b7aea3" stroke-width="1.2" opacity="0.7"/>' },
  { base: '#f0a99a', tile: 12, pattern: '<rect width="4" height="12" fill="#fff" opacity="0.3"/>' },
];

/** CSS custom properties that dress one cell of a cushion. */
export function fabricOf(region: number): { base: string; image: string; tile: string } {
  const fabric = FABRICS[region % FABRICS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${fabric.tile}" height="${fabric.tile}">${fabric.pattern}</svg>`;
  return { base: fabric.base, image: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, tile: `${fabric.tile}px` };
}

// -----------------------------------------------
// MARKS AND CATS
// -----------------------------------------------

/** The cross of this game: a paw print. */
export const PAW = `<svg viewBox="-10 -11 20 20" class="nap-paw" aria-hidden="true"><g fill="currentColor"><ellipse cx="0" cy="4" rx="6" ry="5"/><circle cx="-6.5" cy="-3" r="2.6"/><circle cx="-2.3" cy="-7" r="2.6"/><circle cx="2.3" cy="-7" r="2.6"/><circle cx="6.5" cy="-3" r="2.6"/></g></svg>`;

/** [fur, stripes, inner ear and cheeks, muzzle] for each coat. */
const COATS: readonly [string, string, string, string][] = [
  ['#f4a95f', '#d9803a', '#f7a1b5', '#fde9d2'],
  ['#b9b7c9', '#8f8ca3', '#f7a1b5', '#eeedf4'],
  ['#5d5163', '#3f3545', '#e98fa7', '#8f8495'],
  ['#f7ead6', '#e3cfae', '#f7a1b5', '#fffaf2'],
  ['#c98b5a', '#a5683b', '#f2a0a8', '#efd2b5'],
];

/** A cat curled up asleep, tail wrapped in front; `coat` picks its fur. */
export function sleepingCat(coat: number): string {
  const [fur, stripe, pink, muzzle] = COATS[coat % COATS.length];
  return `<svg viewBox="0 0 100 100" class="nap-cat" aria-hidden="true">
<ellipse cx="52" cy="86" rx="38" ry="6" fill="${OUTLINE}" opacity=".18"/>
<path d="M14 60 C14 36 40 28 62 32 C86 36 92 56 88 70 C85 82 70 86 50 86 C28 86 14 80 14 60 Z" fill="${fur}" stroke="${OUTLINE}" stroke-width="3"/>
<path d="M58 40 q6 -6 12 -2 M66 46 q7 -5 13 0 M72 55 q6 -3 11 2" fill="none" stroke="${stripe}" stroke-width="4" stroke-linecap="round"/>
<path d="M12 74 C10 90 46 92 70 84 C78 81 80 76 74 76 C60 80 36 82 24 76" fill="${fur}" stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="round"/>
<path d="M40 86 q6 -4 12 0" fill="none" stroke="${stripe}" stroke-width="3" stroke-linecap="round"/>
<path d="M13 46 L14 22 L29 34 Z M33 33 L46 20 L48 44 Z" fill="${fur}" stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="round"/>
<path d="M17 39 L18 29 L25 35 Z M37 34 L44 27 L45 39 Z" fill="${pink}"/>
<ellipse cx="31" cy="53" rx="21" ry="18" fill="${fur}" stroke="${OUTLINE}" stroke-width="3"/>
<path d="M26 38 q5 -4 10 0" fill="none" stroke="${stripe}" stroke-width="3" stroke-linecap="round"/>
<ellipse cx="31" cy="62" rx="10" ry="6" fill="${muzzle}"/>
<path d="M17 53 Q21.5 57.5 26 53 M36 53 Q40.5 57.5 45 53" fill="none" stroke="${OUTLINE}" stroke-width="2.6" stroke-linecap="round"/>
<path d="M17 53 l-2 -2 M45 53 l2 -2" stroke="${OUTLINE}" stroke-width="2" stroke-linecap="round"/>
<ellipse cx="17" cy="61" rx="4.5" ry="2.8" fill="${pink}" opacity=".75"/><ellipse cx="45" cy="61" rx="4.5" ry="2.8" fill="${pink}" opacity=".75"/>
<path d="M29 59.5 h4 l-2 2.5 z" fill="#e0607e"/>
<path d="M31 62 q-2 3 -5 2 M31 62 q2 3 5 2" fill="none" stroke="${OUTLINE}" stroke-width="1.8" stroke-linecap="round"/>
<path d="M8 60 l-7 -2 M8 64 l-7 1 M54 60 l7 -2 M54 64 l7 1" stroke="${OUTLINE}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>
</svg>`;
}
