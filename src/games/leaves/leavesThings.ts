import { shade, shadow, sharpCanvas } from './leavesArt';

// -----------------------------------------------
// THINGS ON THE GROUND: treasures, the hedgehog, the gift, the ornaments, drawn by hand
// -----------------------------------------------

type G = CanvasRenderingContext2D;

const cache = new Map<string, HTMLCanvasElement>();

function disc(g: G, x: number, y: number, r: number, c: string | CanvasGradient): void {
  g.fillStyle = c;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

function ball(g: G, x: number, y: number, r: number, color: string): void {
  const grad = g.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
  grad.addColorStop(0, shade(color, 1.35));
  grad.addColorStop(1, shade(color, 0.72));
  disc(g, x, y, r, grad);
}

function line(g: G, color: string, width: number, points: number[]): void {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
  g.stroke();
}

function sparkle(g: G, x: number, y: number, r: number): void {
  g.fillStyle = 'rgb(255 255 255 / 0.9)';
  g.beginPath();
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y);
  g.quadraticCurveTo(x, y, x, y - r);
  g.fill();
}

/** Each drawing is centred on (0, 0) in a box of about 22 units, ground at y = 8. */
/** A five-pointed leaf like a sweetgum's, with veins from the stem to each point. */
function starLeaf(g: G, r: number, colors: string[]): void {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.48;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
  const grad = g.createLinearGradient(-r, -r, r, r);
  colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = shade(colors[colors.length - 1], 0.7);
  g.lineWidth = 0.8;
  g.stroke();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    line(g, 'rgb(255 255 255 / 0.55)', 0.6, [0, 1, Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75]);
  }
  line(g, '#8a5a2a', 1.2, [0, 1, 1, r * 0.95]);
}

const DRAW: Record<string, (g: G) => void> = {
  star(g) {
    starLeaf(g, 9, ['#fff4a8', '#ffd23f', '#e0a400']);
    sparkle(g, 7, -7, 2.6);
  },
  megastar(g) {
    const glow = g.createRadialGradient(0, 0, 2, 0, 0, 12);
    glow.addColorStop(0, 'rgb(255 240 160 / 0.9)');
    glow.addColorStop(1, 'rgb(255 180 220 / 0)');
    disc(g, 0, 0, 12, glow);
    starLeaf(g, 10.5, ['#fff6c8', '#ffb3d9', '#c99bff', '#ffd23f']);
    sparkle(g, 8, -8, 3);
    sparkle(g, -9, -3, 2.2);
    sparkle(g, 6, 8, 1.8);
  },
  acorn(g) {
    ball(g, 0, 2, 6, '#c98a4a');
    g.fillStyle = '#7a4e2c';
    g.beginPath();
    g.ellipse(0, -2, 7, 4, 0, Math.PI, 0);
    g.fill();
    line(g, '#5a3a1a', 1.5, [0, -6, 1, -9]);
  },
  mushroom(g) {
    g.fillStyle = '#f6e6cc';
    g.beginPath();
    g.roundRect(-3.5, -2, 7, 10, 3);
    g.fill();
    const cap = g.createRadialGradient(-3, -6, 1, 0, -3, 10);
    cap.addColorStop(0, '#ff7a6a');
    cap.addColorStop(1, '#cc3a30');
    g.fillStyle = cap;
    g.beginPath();
    g.ellipse(0, -1, 10, 8, 0, Math.PI, 0);
    g.fill();
    for (const [x, y, r] of [[-5, -4, 1.6], [2, -6, 2], [6, -2.5, 1.3]]) disc(g, x, y, r, '#fff6ee');
  },
  feather(g) {
    g.save();
    g.rotate(-0.6);
    const vane = g.createLinearGradient(-4, 0, 4, 0);
    vane.addColorStop(0, '#b8d4f0');
    vane.addColorStop(1, '#6a8ec8');
    g.fillStyle = vane;
    g.beginPath();
    g.moveTo(0, -10);
    g.bezierCurveTo(6, -4, 5, 4, 0, 8);
    g.bezierCurveTo(-5, 4, -6, -4, 0, -10);
    g.fill();
    line(g, '#f4f0e8', 1, [0, -9, 0, 10]);
    g.restore();
  },
  pinecone(g) {
    for (let row = 0; row < 5; row++) {
      const y = -7 + row * 3.4;
      const half = 2 + Math.sin(((row + 1) / 6) * Math.PI) * 4;
      for (let x = -half; x <= half; x += 3.2) disc(g, x, y, 2.2, row % 2 ? '#8a5a34' : '#a06a3c');
    }
    line(g, '#5a3a1a', 1.5, [0, -9, 0, -11]);
  },
  marble(g) {
    const glass = g.createRadialGradient(-2, -3, 1, 0, 0, 7);
    glass.addColorStop(0, '#e8dcff');
    glass.addColorStop(0.5, '#9b7ae8');
    glass.addColorStop(1, '#5a3ab0');
    disc(g, 0, 0, 7, glass);
    g.strokeStyle = 'rgb(255 160 220 / 0.8)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(0, 0, 3.5, 0.5, 3);
    g.stroke();
    disc(g, -2.5, -3, 1.6, '#ffffff');
  },
  coin(g) {
    ball(g, 0, 0, 8, '#e0a82a');
    disc(g, 0, 0, 5.5, '#f2c94c');
    g.fillStyle = '#b07a1a';
    g.font = 'bold 8px serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('€', 0, 0.5);
    sparkle(g, 5, -6, 2.5);
  },
  key(g) {
    g.strokeStyle = '#c9a03a';
    g.lineWidth = 2.4;
    g.beginPath();
    g.arc(-5, 0, 4, 0, Math.PI * 2);
    g.stroke();
    line(g, '#c9a03a', 2.4, [-1, 0, 9, 0]);
    line(g, '#c9a03a', 2, [6, 0, 6, 3.5]);
    line(g, '#c9a03a', 2, [8.5, 0, 8.5, 3]);
  },
  ring(g) {
    g.strokeStyle = '#e0b84a';
    g.lineWidth = 2.6;
    g.beginPath();
    g.ellipse(0, 3, 6.5, 5, 0, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#bfe6ff';
    g.beginPath();
    g.moveTo(0, -9);
    g.lineTo(4, -5);
    g.lineTo(0, -1.5);
    g.lineTo(-4, -5);
    g.fill();
    sparkle(g, 5, -9, 2.5);
  },
  gem(g) {
    const facets: [number[], string][] = [
      [[-8, -2, -4, -7, 4, -7, 8, -2], '#9ef0f0'],
      [[-8, -2, 8, -2, 0, 9], '#3fb8d8'],
      [[-3, -2, 3, -2, 0, 9], '#6ad8ee'],
    ];
    for (const [p, c] of facets) {
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
      g.fill();
    }
    sparkle(g, 6, -8, 3);
  },
  compass(g) {
    ball(g, 0, 0, 9, '#c9a03a');
    disc(g, 0, 0, 7, '#fbf3e0');
    g.fillStyle = '#d8322a';
    g.beginPath();
    g.moveTo(0, -6);
    g.lineTo(2, 0);
    g.lineTo(-2, 0);
    g.fill();
    g.fillStyle = '#3d3a4a';
    g.beginPath();
    g.moveTo(0, 6);
    g.lineTo(2, 0);
    g.lineTo(-2, 0);
    g.fill();
  },
  letter(g) {
    g.save();
    g.rotate(-0.15);
    g.fillStyle = '#fbf3e0';
    g.beginPath();
    g.roundRect(-10, -7, 20, 14, 2);
    g.fill();
    line(g, '#d9c7a4', 1, [-10, -7, 0, 1, 10, -7]);
    g.fillStyle = '#e8506a';
    g.beginPath();
    g.moveTo(0, 5);
    g.bezierCurveTo(-5, 1, -3, -3, 0, -1);
    g.bezierCurveTo(3, -3, 5, 1, 0, 5);
    g.fill();
    g.restore();
  },
  musicbox(g) {
    g.fillStyle = '#b97d4a';
    g.beginPath();
    g.roundRect(-10, -4, 20, 12, 2);
    g.fill();
    g.fillStyle = '#d29a64';
    g.beginPath();
    g.roundRect(-11, -8, 22, 5, 2);
    g.fill();
    disc(g, 0, 2, 2, '#f2c94c');
    g.fillStyle = '#3d3a4a';
    g.font = 'bold 9px serif';
    g.textAlign = 'center';
    g.fillText('♪', 8, -10);
  },
  locket(g) {
    line(g, '#c9a03a', 1, [-7, -9, 0, -4, 7, -9]);
    const heart = g.createRadialGradient(-2, -1, 1, 0, 1, 8);
    heart.addColorStop(0, '#ffe68a');
    heart.addColorStop(1, '#c9a03a');
    g.fillStyle = heart;
    g.beginPath();
    g.moveTo(0, 8);
    g.bezierCurveTo(-9, 1, -6, -5, 0, -2);
    g.bezierCurveTo(6, -5, 9, 1, 0, 8);
    g.fill();
  },
  telescope(g) {
    g.save();
    g.rotate(-0.4);
    g.fillStyle = '#c9a03a';
    g.beginPath();
    g.roundRect(-11, -3, 9, 6, 1);
    g.fill();
    g.fillStyle = '#7a4e2c';
    g.beginPath();
    g.roundRect(-3, -4, 14, 8, 2);
    g.fill();
    disc(g, 11, 0, 3.5, '#bfe6f6');
    g.restore();
  },
  crown(g) {
    const colors = ['#e8322a', '#f09a3c', '#ffd23f', '#f09a3c', '#e8322a'];
    for (let i = 0; i < 5; i++) {
      g.save();
      g.translate(-8 + i * 4, -1 - Math.abs(i - 2) * -1.2);
      g.rotate((i - 2) * 0.35);
      g.fillStyle = colors[i];
      g.beginPath();
      g.ellipse(0, -4, 2.6, 5.5, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    g.fillStyle = '#8a5a34';
    g.beginPath();
    g.roundRect(-10, 3, 20, 4, 2);
    g.fill();
  },
  hedgehog(g) {
    const body = g.createRadialGradient(-4, -4, 1, -2, 0, 13);
    body.addColorStop(0, '#9a7a5e');
    body.addColorStop(1, '#5e4532');
    g.fillStyle = body;
    g.beginPath();
    g.ellipse(-2, 2, 12, 8, 0, Math.PI, 0);
    g.lineTo(10, 5);
    g.lineTo(-14, 5);
    g.fill();
    g.strokeStyle = '#4a3424';
    g.lineWidth = 1.1;
    for (let i = 0; i < 8; i++) line(g, '#4a3424', 1.1, [-12 + i * 3, -2 + Math.abs(i - 4) * 0.8, -14 + i * 3, -7 + Math.abs(i - 4) * 1.2]);
    g.fillStyle = '#f0d4b0';
    g.beginPath();
    g.ellipse(11, 3, 5.5, 3.6, 0, 0, Math.PI * 2);
    g.fill();
    disc(g, 16, 2.5, 1.3, '#2a1e18');
    // Asleep: a closed eye and a little "z".
    line(g, '#2a1e18', 0.8, [10, 1.5, 12, 1.5]);
    g.fillStyle = '#ffffff';
    g.font = 'bold 6px sans-serif';
    g.fillText('z', 12, -6);
  },
  deco(g) {
    const box = g.createLinearGradient(0, -6, 0, 8);
    box.addColorStop(0, '#ff8fb8');
    box.addColorStop(1, '#d9507e');
    g.fillStyle = box;
    g.beginPath();
    g.roundRect(-8, -5, 16, 13, 2);
    g.fill();
    g.fillStyle = '#ffd23f';
    g.fillRect(-1.5, -5, 3, 13);
    g.fillRect(-8, -1, 16, 3);
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(s * 3.5, -7, 3.5, 2.2, s * 0.5, 0, Math.PI * 2);
      g.fill();
    }
  },
  // Ornaments: drawn bigger, they stand at the edges of the scene.
  flowers(g) {
    g.fillStyle = '#c4532a';
    g.beginPath();
    g.moveTo(-8, 0);
    g.lineTo(8, 0);
    g.lineTo(6, 9);
    g.lineTo(-6, 9);
    g.fill();
    line(g, '#4f8a3a', 1.6, [0, 0, 0, -6]);
    for (let p = 0; p < 10; p++) {
      const a = (p / 10) * Math.PI * 2;
      g.fillStyle = '#ffd23f';
      g.beginPath();
      g.ellipse(Math.cos(a) * 4.5, -9 + Math.sin(a) * 4.5, 2.6, 1.4, a, 0, Math.PI * 2);
      g.fill();
    }
    disc(g, 0, -9, 3, '#7a4e2c');
  },
  lantern(g) {
    const glow = g.createRadialGradient(0, 0, 1, 0, 0, 11);
    glow.addColorStop(0, 'rgb(255 200 120 / 0.6)');
    glow.addColorStop(1, 'rgb(255 200 120 / 0)');
    disc(g, 0, 0, 11, glow);
    line(g, '#3d3a4a', 1, [0, -10, 0, -7]);
    const body = g.createRadialGradient(-2, -2, 1, 0, 0, 7);
    body.addColorStop(0, '#ffb070');
    body.addColorStop(1, '#d9402a');
    g.fillStyle = body;
    g.beginPath();
    g.ellipse(0, 0, 6, 7.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3d3a4a';
    g.fillRect(-3, -8, 6, 2);
    g.fillRect(-3, 6.5, 6, 2);
  },
  pumpkin(g) {
    for (const [x, r] of [[-5, 6], [5, 6], [0, 7]] as [number, number][]) {
      const body = g.createRadialGradient(x - 2, -2, 1, x, 2, r + 2);
      body.addColorStop(0, '#ffb04a');
      body.addColorStop(1, '#d9672a');
      g.fillStyle = body;
      g.beginPath();
      g.ellipse(x, 2, r, 7, 0, 0, Math.PI * 2);
      g.fill();
    }
    line(g, '#4f8a3a', 2.2, [0, -5, 1.5, -9]);
  },
  birdhouse(g) {
    line(g, '#7a4e2c', 2.4, [0, 2, 0, 10]);
    g.fillStyle = '#d29a64';
    g.beginPath();
    g.roundRect(-6, -6, 12, 10, 1);
    g.fill();
    g.fillStyle = '#c4532a';
    g.beginPath();
    g.moveTo(-9, -5);
    g.lineTo(0, -12);
    g.lineTo(9, -5);
    g.fill();
    disc(g, 0, -1, 2, '#3d2a1a');
    ball(g, 6, -12, 2.6, '#e8506a');
  },
};

/** A drawn sprite for a thing, `size` units wide; unknown ids fall back to their emoji. */
export function thingSprite(id: string, fallback: string, size = 24): HTMLCanvasElement {
  const key = `${id}|${size}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const [canvas, g] = sharpCanvas(size, size);
  g.translate(size / 2, size / 2);
  g.scale(size / 24, size / 24);
  shadow(g, 0, 9, 9, 2.6, 0.25);
  const draw = DRAW[id];
  if (draw) draw(g);
  else {
    g.font = '16px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(fallback, 0, 0);
  }
  cache.set(key, canvas);
  return canvas;
}
