import { circle, ellipse, polygon, rect, LEAVE_WHITE, type BookDrawing } from '../bookDrawing';

// -----------------------------------------------
// LOCAL SHAPE HELPERS
// -----------------------------------------------

const round = (value: number): number => Math.round(value * 100) / 100;
const point = (x: number, y: number): string => `${round(x)} ${round(y)}`;

/** A pointed leaf (or petal) from (x1, y1) to (x2, y2), `width` wide at its middle. */
function leaf(x1: number, y1: number, x2: number, y2: number, width: number): string {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const nx = (-(y2 - y1) / length) * width;
  const ny = ((x2 - x1) / length) * width;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return `M${point(x1, y1)} Q${point(mx + nx, my + ny)} ${point(x2, y2)} Q${point(mx - nx, my - ny)} ${point(x1, y1)} Z`;
}

/** A flower outline with `count` round petals between radius `inner` and `outer`. */
function flower(cx: number, cy: number, inner: number, outer: number, count: number, turn = 0): string {
  const step = (Math.PI * 2) / count;
  const at = (angle: number, radius: number) => point(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  const spread = step * 0.45;
  const control = (outer - 0.25 * inner * Math.cos(step / 2)) / (0.75 * Math.cos(spread));
  let path = `M${at(turn - step / 2, inner)}`;
  for (let i = 0; i < count; i++) {
    const angle = turn + i * step;
    path += ` C${at(angle - spread, control)} ${at(angle + spread, control)} ${at(angle + step / 2, inner)}`;
  }
  return path + ' Z';
}

/** A fluffy cloud, 44 x 26 units at scale 1, centred on (cx, cy). */
function cloud(cx: number, cy: number, scale: number): string {
  const p = (x: number, y: number) => point(cx + x * scale, cy + y * scale);
  return (
    `M${p(-18, 8)} Q${p(-22, 8)} ${p(-22, 3)} Q${p(-22, -4)} ${p(-14, -4)} Q${p(-14, -12)} ${p(-5, -12)} ` +
    `Q${p(0, -18)} ${p(7, -12)} Q${p(16, -12)} ${p(15, -3)} Q${p(22, -3)} ${p(22, 3)} Q${p(22, 8)} ${p(18, 8)} Z`
  );
}

/** A band of water whose top edge waves from x 4 to x 96. */
function wave(top: number, amplitude: number, crests: number, bottom: number): string {
  const period = 92 / crests;
  let path = `M4 ${top}`;
  for (let i = 0; i < crests; i++) {
    const x = 4 + i * period;
    path += ` Q${point(x + period / 4, top - amplitude)} ${point(x + period / 2, top)}`;
    path += ` Q${point(x + (period * 3) / 4, top + amplitude)} ${point(x + period, top)}`;
  }
  return path + ` L96 ${bottom - 4} Q96 ${bottom} 92 ${bottom} L8 ${bottom} Q4 ${bottom} 4 ${bottom - 4} Z`;
}

/** A heart whose point is at (cx, bottom), `size` wide. */
function heart(cx: number, bottom: number, size: number): string {
  const s = size / 20;
  const p = (x: number, y: number) => point(cx + x * s, bottom + y * s);
  return `M${p(0, 0)} C${p(-10, -7)} ${p(-11, -15)} ${p(-5, -16)} C${p(-2, -16.5)} ${p(0, -14)} ${p(0, -12)} C${p(0, -14)} ${p(2, -16.5)} ${p(5, -16)} C${p(11, -15)} ${p(10, -7)} ${p(0, 0)} Z`;
}

/** A rain drop centred on (cx, cy), 8 wide. */
function drop(cx: number, cy: number): string {
  return `M${point(cx, cy - 6)} C${point(cx + 1, cy - 3)} ${point(cx + 4, cy - 1)} ${point(cx + 4, cy + 2)} A4 4 0 0 1 ${point(cx - 4, cy + 2)} C${point(cx - 4, cy - 1)} ${point(cx - 1, cy - 3)} ${point(cx, cy - 6)} Z`;
}

/** Parallel chords inside a circle, at `angle` (radians), `spacing` apart. */
function hatch(cx: number, cy: number, radius: number, angle: number, spacing: number): string[] {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const chords: string[] = [];
  for (let offset = -radius + spacing / 2; offset < radius; offset += spacing) {
    const half = Math.sqrt(radius * radius - offset * offset);
    const ox = cx - uy * offset;
    const oy = cy + ux * offset;
    chords.push(`M${point(ox - ux * half, oy - uy * half)} L${point(ox + ux * half, oy + uy * half)}`);
  }
  return chords;
}

/** Sun rays around a circle. */
function rays(cx: number, cy: number, from: number, to: number, count: number, turn = 0): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const angle = turn + (i * Math.PI * 2) / count;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    result.push(`M${point(cx + c * from, cy + s * from)} L${point(cx + c * to, cy + s * to)}`);
  }
  return result;
}

/** One side of the balloon envelope, scaled horizontally by `side` (-1 left edge, 1 right edge). */
function goreEdge(side: number): string[] {
  return [
    point(50 + 20 * side, 5), point(50 + 34 * side, 18), point(50 + 34 * side, 32),
    point(50 + 34 * side, 46), point(50 + 18 * side, 54), point(50 + 12 * side, 60),
  ];
}

/** The balloon stripe between two edges. */
function gore(left: number, right: number): string {
  const a = goreEdge(left);
  const b = goreEdge(right);
  return `M50 5 C${a[0]} ${a[1]} ${a[2]} C${a[3]} ${a[4]} ${a[5]} L${b[5]} C${b[4]} ${b[3]} ${b[2]} C${b[1]} ${b[0]} 50 5 Z`;
}

/** A rainbow band between two radii, centred on (50, cy). */
function arcBand(cy: number, outer: number, inner: number): string {
  return `M${50 - outer} ${cy} A${outer} ${outer} 0 0 1 ${50 + outer} ${cy} L${50 + inner} ${cy} A${inner} ${inner} 0 0 0 ${50 - inner} ${cy} Z`;
}

const SUNFLOWER_X = 50;
const SUNFLOWER_Y = 38;

// -----------------------------------------------
// DRAWINGS
// -----------------------------------------------

export const THINGS_DRAWINGS: BookDrawing[] = [
  {
    id: 'cupcake',
    name: 'Cupcake',
    zones: [
      { path: polygon([20, 60], [32, 60], [36.8, 94], [28, 94]), color: '#8ecae6' },
      { path: polygon([32, 60], [44, 60], [45.6, 94], [36.8, 94]), color: '#cdeaf5' },
      { path: polygon([44, 60], [56, 60], [54.4, 94], [45.6, 94]), color: '#8ecae6' },
      { path: polygon([56, 60], [68, 60], [63.2, 94], [54.4, 94]), color: '#cdeaf5' },
      { path: polygon([68, 60], [80, 60], [72, 94], [63.2, 94]), color: '#8ecae6' },
      {
        path: 'M16 56 Q14 44 30 42 L70 42 Q86 44 84 56 Q86 64 78 64 Q72 68 64 64 Q57 68 50 64 Q43 68 36 64 Q28 68 22 64 Q14 64 16 56 Z',
        color: '#f7b6cf',
      },
      {
        path: 'M24 42 Q22 30 36 28 L64 28 Q78 30 76 42 Q78 50 70 50 Q63 54 56 50 Q50 54 44 50 Q37 54 30 50 Q22 50 24 42 Z',
        color: '#f7b6cf',
      },
      {
        path: 'M34 30 Q32 20 44 18 Q50 10 56 18 Q68 20 66 30 Q68 36 60 36 Q55 39 50 36 Q45 39 40 36 Q32 36 34 30 Z',
        color: '#f7b6cf',
      },
      { path: circle(50, 14, 6), color: '#e2475b' },
    ],
    lines: [
      'M52 8.5 Q54 4 60 4',
      'M23 57 L25 60', 'M38 58 L41 58.5', 'M60 59 L62 56.5', 'M75 57 L77 60',
      'M31 43 L33 46', 'M46 43 L49 44', 'M62 45 L64 42',
      'M41 27 L43 25', 'M58 28 L60 30',
    ],
    inks: [ellipse(48, 12, 1.2, 1.8)],
  },
  {
    id: 'icecream',
    name: 'Glace',
    zones: [
      { path: circle(50, 50, 46), color: '#fff3c4' },
      { path: polygon([30, 58], [70, 58], [50, 96]), color: '#efc07e' },
      { path: rect(27, 54, 46, 9, 4), color: '#d99a4e' },
      { path: polygon([60, 28], [79, 9], [85, 15], [66, 34]), color: '#d99a4e' },
      { path: circle(37, 46, 14), color: '#f7a8c4' },
      { path: circle(63, 46, 14), color: '#a8e0c6' },
      { path: circle(50, 28, 15), color: '#b8835a' },
      { path: circle(50, 11, 6), color: '#e04a5a' },
    ],
    lines: [
      'M43.68 65 L55 86.5', 'M53.68 65 L60 77',
      'M56.32 65 L45 86.5', 'M46.32 65 L40 77',
      'M52 5.5 Q54 2 59 3',
      'M28 41 L30 43.5', 'M34 51 L37 52', 'M41 40 L43.5 42', 'M27 50 L29 47.5',
    ],
    inks: [
      ellipse(60, 40, 1.4, 1), ellipse(69, 46, 1.4, 1), ellipse(58, 50, 1.4, 1), ellipse(66, 54, 1.4, 1),
      ellipse(43, 24, 1.4, 1), ellipse(55, 30, 1.4, 1), ellipse(46, 34, 1.4, 1), ellipse(56, 21, 1.4, 1),
      ellipse(48, 9, 1, 1.5),
    ],
  },
  {
    id: 'strawberry',
    name: 'Fraise',
    zones: [
      { path: circle(50, 50, 46), color: '#ffe3ea' },
      { path: 'M50 92 C30 86 14 64 16 44 C18 30 32 25 50 27 C68 25 82 30 84 44 C86 64 70 86 50 92 Z', color: '#ef5a6f' },
      { path: ellipse(26, 52, 4, 8), color: LEAVE_WHITE },
      { path: leaf(50, 30, 22, 36, 10), color: '#8fd16a' },
      { path: leaf(50, 30, 78, 36, 10), color: '#8fd16a' },
      { path: leaf(50, 30, 33, 45, 10), color: '#6fbf5a' },
      { path: leaf(50, 30, 67, 45, 10), color: '#6fbf5a' },
      { path: leaf(50, 30, 50, 48, 10), color: '#8fd16a' },
      { path: rect(46, 11, 8, 23, 4), color: '#5a9e48' },
    ],
    inks: [
      ellipse(40, 54, 1, 1.6), ellipse(60, 54, 1, 1.6), ellipse(72, 52, 1, 1.6),
      ellipse(34, 63, 1, 1.6), ellipse(47, 62, 1, 1.6), ellipse(60, 64, 1, 1.6), ellipse(73, 63, 1, 1.6),
      ellipse(34, 73, 1, 1.6), ellipse(45, 72, 1, 1.6), ellipse(56, 74, 1, 1.6), ellipse(67, 72, 1, 1.6),
      ellipse(44, 82, 1, 1.6), ellipse(56, 83, 1, 1.6), ellipse(26, 63, 1, 1.6),
    ],
  },
  {
    id: 'teapot',
    name: 'Théière',
    zones: [
      { path: rect(4, 82, 92, 14, 4), color: '#f3d7b6' },
      { path: 'M58 50 C76 46 80 72 60 78 L58 72 C70 68 68 54 58 57 Z', color: '#5fa8d3' },
      { path: 'M24 72 C14 70 10 56 6 44 L14 42 C16 52 20 58 26 58 Z', color: '#8ecae6' },
      { path: ellipse(40, 64, 22, 20), color: '#8ecae6' },
      { path: heart(40, 74, 20), color: '#f49ac1' },
      { path: rect(27, 80, 26, 8, 3), color: '#5fa8d3' },
      { path: 'M24 48 Q24 36 40 35 Q56 36 56 48 Z', color: '#8ecae6' },
      { path: rect(21, 45, 38, 6, 3), color: '#5fa8d3' },
      { path: circle(40, 33, 5), color: '#f49ac1' },
      { path: 'M86 70 C99 68 99 88 82 86 L83 80 C91 81 92 75 87 76 Z', color: '#f7c6d6' },
      { path: ellipse(75, 87, 20, 6), color: LEAVE_WHITE },
      { path: 'M62 68 L88 68 C88 80 83 86 75 86 C67 86 62 80 62 68 Z', color: '#f7c6d6' },
      { path: ellipse(75, 68, 13, 3.5), color: '#b07a4f' },
    ],
    lines: ['M70 60 Q67 56 70 52 Q73 48 70 44', 'M79 60 Q76 56 79 52 Q82 48 79 44'],
  },
  {
    id: 'flowerpot',
    name: 'Pot de fleurs',
    zones: [
      { path: 'M21 42 Q24 56 36 66 L42 66 Q30 56 27 42 Z', color: '#6fbf5a' },
      { path: rect(47, 34, 6, 32), color: '#6fbf5a' },
      { path: 'M73 44 Q76 56 64 66 L58 66 Q70 56 79 44 Z', color: '#6fbf5a' },
      { path: leaf(48, 58, 34, 48, 8), color: '#8fd16a' },
      { path: leaf(52, 54, 64, 46, 8), color: '#8fd16a' },
      { path: 'M14 22 L19 29 L24 21 L29 29 L34 22 C35 36 31 44 24 44 C17 44 13 36 14 22 Z', color: '#f47c8a' },
      { path: flower(50, 22, 7, 15, 8), color: LEAVE_WHITE },
      { path: circle(50, 22, 7), color: '#ffd25e' },
      { path: flower(76, 33, 5, 13, 5, -Math.PI / 2), color: '#b9a3e8' },
      { path: circle(76, 33, 5), color: '#ffd25e' },
      { path: polygon([27, 72], [73, 72], [67, 95], [33, 95]), color: '#e59866' },
      { path: heart(50, 90, 18), color: '#f47c8a' },
      { path: rect(22, 62, 56, 11, 4), color: '#d47f4e' },
    ],
  },
  {
    id: 'sunflower',
    name: 'Tournesol',
    zones: [
      { path: rect(4, 4, 92, 92, 6), color: '#cfe8f7' },
      { path: rect(46, 50, 8, 42), color: '#6fbf5a' },
      { path: leaf(50, 84, 20, 70, 12), color: '#8fd16a' },
      { path: leaf(50, 78, 80, 64, 12), color: '#8fd16a' },
      ...Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI) / 6 - Math.PI / 2;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return {
          path: leaf(SUNFLOWER_X + c * 12, SUNFLOWER_Y + s * 12, SUNFLOWER_X + c * 31, SUNFLOWER_Y + s * 31, 10),
          color: i % 2 === 0 ? '#ffd23f' : '#ffc02e',
        };
      }),
      { path: circle(SUNFLOWER_X, SUNFLOWER_Y, 14), color: '#9a6a3f' },
      { path: 'M4 88 Q28 80 50 86 Q72 92 96 84 L96 90 Q96 96 90 96 L10 96 Q4 96 4 90 Z', color: '#9ed36a' },
    ],
    lines: [
      ...hatch(SUNFLOWER_X, SUNFLOWER_Y, 12, Math.PI / 4, 6),
      ...hatch(SUNFLOWER_X, SUNFLOWER_Y, 12, -Math.PI / 4, 6),
    ],
  },
  {
    id: 'mushroomhouse',
    name: 'Maison champignon',
    zones: [
      { path: 'M4 82 Q50 72 96 82 L96 92 Q96 96 92 96 L8 96 Q4 96 4 92 Z', color: '#9ed36a' },
      { path: rect(66, 8, 9, 16, 2), color: '#b9a99a' },
      { path: 'M30 52 L70 52 L74 86 Q50 92 26 86 Z', color: '#f6e3c3' },
      { path: 'M42 88.5 L42 72 Q42 62 50 62 Q58 62 58 72 L58 88.5 Q50 90 42 88.5 Z', color: '#c48b5a' },
      { path: circle(34, 68, 5.5), color: '#bfe3f5' },
      { path: circle(66, 68, 5.5), color: '#bfe3f5' },
      { path: 'M10 56 Q8 46 16 36 Q30 14 50 12 Q70 14 84 36 Q92 46 90 56 Q50 64 10 56 Z', color: '#e8504f' },
      { path: circle(30, 34, 6), color: LEAVE_WHITE },
      { path: circle(53, 24, 7), color: LEAVE_WHITE },
      { path: circle(72, 39, 6), color: LEAVE_WHITE },
      { path: ellipse(48, 47, 5.5, 4), color: LEAVE_WHITE },
      { path: circle(18, 49, 4), color: LEAVE_WHITE },
      { path: flower(13, 88, 2.5, 5, 5, -Math.PI / 2), color: '#f7a8c4' },
      { path: flower(87, 88, 2.5, 5, 5, -Math.PI / 2), color: '#f7a8c4' },
    ],
    lines: [
      'M46.5 63.5 L46.5 89', 'M53.5 63.5 L53.5 89',
      'M34 62.5 L34 73.5', 'M28.5 68 L39.5 68', 'M66 62.5 L66 73.5', 'M60.5 68 L71.5 68',
      'M76 6 Q72 2 78 1',
    ],
    inks: [circle(56, 77, 1.2), circle(13, 88, 1.3), circle(87, 88, 1.3)],
  },
  {
    id: 'house',
    name: 'Maison',
    zones: [
      { path: circle(16, 15, 8), color: '#ffd54f' },
      { path: cloud(76, 17, 0.5), color: LEAVE_WHITE },
      { path: 'M4 80 Q50 72 96 80 L96 92 Q96 96 92 96 L8 96 Q4 96 4 92 Z', color: '#8fd16a' },
      { path: polygon([35, 82], [47, 82], [58, 96], [26, 96]), color: '#fbe6c2' },
      { path: rect(79, 54, 7, 30, 2), color: '#b07a4f' },
      { path: 'M72 52 Q64 50 66 42 Q66 34 74 34 Q78 26 86 30 Q94 30 94 40 Q97 48 90 52 Q86 58 79 55 Q76 56 72 52 Z', color: '#6fbf5a' },
      { path: circle(74, 44, 3), color: '#e8645a' },
      { path: circle(85, 37, 3), color: '#e8645a' },
      { path: circle(87, 48, 3), color: '#e8645a' },
      { path: rect(51, 22, 8, 18, 1), color: '#e8645a' },
      { path: rect(20, 46, 42, 36), color: '#fbe6c2' },
      { path: 'M14 48 L39 21 Q41 19 43 21 L68 48 Z', color: '#e8645a' },
      { path: circle(41, 37, 4.5), color: '#a8d8f0' },
      { path: 'M35 82 L35 66 Q35 60 41 60 Q47 60 47 66 L47 82 Z', color: '#b07a4f' },
      { path: rect(23, 55, 9, 9, 1), color: '#a8d8f0' },
      { path: rect(50, 55, 9, 9, 1), color: '#a8d8f0' },
      { path: 'M64 88 L64 72 L67 68 L70 72 L70 88 Z', color: LEAVE_WHITE },
      { path: 'M73 88 L73 72 L76 68 L79 72 L79 88 Z', color: LEAVE_WHITE },
      { path: 'M82 88 L82 72 L85 68 L88 72 L88 88 Z', color: LEAVE_WHITE },
      { path: 'M91 88 L91 72 L94 68 L96 71 L96 88 Z', color: LEAVE_WHITE },
      { path: rect(62, 76, 34, 6), color: LEAVE_WHITE },
    ],
    lines: [
      ...rays(16, 15, 10, 13, 8),
      'M27.5 55 L27.5 64', 'M23 59.5 L32 59.5', 'M54.5 55 L54.5 64', 'M50 59.5 L59 59.5',
      'M41 32.5 L41 41.5', 'M36.5 37 L45.5 37',
    ],
    inks: [circle(44.5, 72, 1.1)],
  },
  {
    id: 'balloon',
    name: 'Montgolfière',
    zones: [
      { path: rect(4, 4, 92, 92, 8), color: '#cde9f6' },
      { path: cloud(16, 82, 0.45), color: LEAVE_WHITE },
      { path: cloud(84, 72, 0.42), color: LEAVE_WHITE },
      { path: cloud(16, 16, 0.32), color: LEAVE_WHITE },
      { path: gore(-1, -0.6), color: '#ef6f6c' },
      { path: gore(-0.6, -0.2), color: '#ffd166' },
      { path: gore(-0.2, 0.2), color: '#ef6f6c' },
      { path: gore(0.2, 0.6), color: '#ffd166' },
      { path: gore(0.6, 1), color: '#ef6f6c' },
      { path: rect(37, 57, 26, 8, 3), color: '#f4a259' },
      { path: rect(39, 79, 22, 15, 3), color: '#c99a6b' },
      { path: rect(36, 75, 28, 7, 3), color: '#a8764a' },
    ],
    lines: [
      'M40 65 L40.5 75', 'M50 65 L50 75', 'M60 65 L59.5 75',
      'M44.5 82 L44.5 94', 'M50 82 L50 94', 'M55.5 82 L55.5 94', 'M39 88 L61 88',
    ],
  },
  {
    id: 'sailboat',
    name: 'Voilier',
    zones: [
      { path: circle(17, 17, 8), color: '#ffd54f' },
      { path: cloud(79, 18, 0.5), color: LEAVE_WHITE },
      { path: wave(74, 3, 6, 96), color: '#7fc8e8' },
      { path: rect(47, 8, 6, 56, 2), color: '#b07a4f' },
      { path: polygon([53, 9], [66, 13], [53, 17]), color: '#ef6f6c' },
      { path: 'M55 20 Q72 38 84 58 L55 58 Z', color: LEAVE_WHITE },
      { path: 'M45 20 L45 58 L18 58 Q32 40 45 20 Z', color: '#ffd6a5' },
      { path: 'M12 62 L88 62 Q82 80 70 80 L30 80 Q18 80 12 62 Z', color: '#ef6f6c' },
      { path: circle(34, 69, 3.5), color: LEAVE_WHITE },
      { path: circle(50, 69, 3.5), color: LEAVE_WHITE },
      { path: circle(66, 69, 3.5), color: LEAVE_WHITE },
      { path: wave(84, 3, 5, 96), color: '#4fa9d6' },
    ],
    lines: [...rays(17, 17, 10, 13, 8), 'M60 40 L74 40', 'M58 50 L80 50'],
  },
  {
    id: 'rainbow',
    name: 'Arc-en-ciel',
    zones: [
      { path: circle(84, 15, 8), color: '#ffd95e' },
      { path: cloud(20, 18, 0.45), color: LEAVE_WHITE },
      { path: arcBand(72, 44, 38), color: '#f26d6d' },
      { path: arcBand(72, 38, 32), color: '#f9a65a' },
      { path: arcBand(72, 32, 26), color: '#ffd95e' },
      { path: arcBand(72, 26, 20), color: '#8ed081' },
      { path: arcBand(72, 20, 14), color: '#7cc4ec' },
      { path: cloud(22, 69.6, 0.8), color: LEAVE_WHITE },
      { path: cloud(78, 69.6, 0.8), color: LEAVE_WHITE },
      { path: drop(14, 86), color: '#7cc4ec' },
      { path: drop(28, 89), color: '#7cc4ec' },
      { path: drop(72, 89), color: '#7cc4ec' },
      { path: drop(86, 86), color: '#7cc4ec' },
    ],
    lines: rays(84, 15, 10, 13, 8, Math.PI / 8),
  },
];
