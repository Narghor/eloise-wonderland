// -----------------------------------------------
// LINE DRAWINGS OF THE COLOURING BOOK
// -----------------------------------------------
// Every drawing lives in a 100 x 100 box, as SVG path data.

export interface BookZone {
  path: string;
  /** Colour of this zone in the model; '#ffffff' means "leave it white". */
  color: string;
}

export interface BookDrawing {
  /** Stable id, kept in saves: never rename one. */
  id: string;
  /** Shown to the player, in French. */
  name: string;
  /** Zones to colour, from back to front: a zone hides the zones and lines behind it. */
  zones: BookZone[];
  /** Lines drawn on top that are not zone borders (whiskers, a smile): stroked, never filled. */
  lines?: string[];
  /** Printed black shapes (pupils, a nose): filled in ink, never coloured. */
  inks?: string[];
}

export const LEAVE_WHITE = '#ffffff';
export const INK = '#2b2230';
/** Line widths, in units of the 100 x 100 box. */
export const ZONE_LINE_WIDTH = 1.3;
export const DETAIL_LINE_WIDTH = 1;

// -----------------------------------------------
// SHAPE HELPERS (return SVG path data)
// -----------------------------------------------

export function circle(cx: number, cy: number, r: number): string {
  return ellipse(cx, cy, r, r);
}

export function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
}

/** A rectangle, with rounded corners when `radius` > 0. */
export function rect(x: number, y: number, width: number, height: number, radius = 0): string {
  const r = Math.min(radius, width / 2, height / 2);
  if (r <= 0) return `M${x} ${y} H${x + width} V${y + height} H${x} Z`;
  return (
    `M${x + r} ${y} H${x + width - r} A${r} ${r} 0 0 1 ${x + width} ${y + r} ` +
    `V${y + height - r} A${r} ${r} 0 0 1 ${x + width - r} ${y + height} ` +
    `H${x + r} A${r} ${r} 0 0 1 ${x} ${y + height - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`
  );
}

/** A closed polygon through the given [x, y] points. */
export function polygon(...points: [number, number][]): string {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ') + ' Z';
}
