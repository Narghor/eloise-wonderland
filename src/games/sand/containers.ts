// -----------------------------------------------
// THE GLASS CONTAINERS SAND CAN BE POURED IN
// -----------------------------------------------
// Every container lives in the same JAR_WIDTH x JAR_HEIGHT grid, so saves and scores never change size.
// A shape is a single rule: is this cell inside? The glass is drawn around it, the top stays open.

export const JAR_WIDTH = 84;
export const JAR_HEIGHT = 136;

export const MaskCell = { Outside: 0, Inside: 1, Glass: 2 } as const;

const CENTER_X = (JAR_WIDTH - 1) / 2;
const FLOOR_Y = JAR_HEIGHT - 3;
const GLASS_THICKNESS = 2;

export const CONTAINER_IDS = ['jar', 'bottle', 'vase', 'hourglass', 'heart'] as const;
export type ContainerId = (typeof CONTAINER_IDS)[number];

export interface Container {
  id: ContainerId;
  name: string;
  mask: Uint8Array;
  insideCount: number;
  /** Leftmost and rightmost columns of the opening, where a spout can pour. */
  pourMinX: number;
  pourMaxX: number;
}

// -----------------------------------------------
// SHAPES
// -----------------------------------------------

type Inside = (dx: number, y: number) => boolean;

/** A shape symmetric left/right, given its inner half-width per row (negative: closed row). */
function byHalfWidth(halfWidth: (y: number) => number): Inside {
  return (dx, y) => y <= FLOOR_Y && Math.abs(dx) <= halfWidth(y);
}

function roundedBottom(y: number, body: number, radius: number, floor = FLOOR_Y): number {
  const curveStart = floor - radius;
  if (y <= curveStart) return body;
  if (y > floor) return -1;
  const dy = y - curveStart;
  return body - radius + Math.sqrt(radius * radius - dy * dy);
}

const jar = byHalfWidth((y) => (y < 4 ? 37 : roundedBottom(y, 39, 14)));

const bottle = byHalfWidth((y) => {
  if (y < 26) return 9;
  if (y < 46) return 9 + (37 - 9) * (1 - Math.cos(((y - 26) / 20) * Math.PI)) / 2;
  return roundedBottom(y, 37, 10);
});

const vase = byHalfWidth((y) => {
  const floor = 128;
  if (y > floor) return -1;
  if (y < 4) return 13;
  const k = (y - 80) / 52;
  const belly = Math.abs(k) < 1 ? 39 * Math.sqrt(1 - k * k) : -1;
  return Math.max(10, belly);
});

const hourglass = byHalfWidth((y) => {
  const t = Math.min(1, Math.abs(y - 66) / 66);
  return roundedBottom(y, 2.2 + 36 * t ** 0.9, 6);
});

/** A heart-shaped flask: the classic (x^2 + y^2 - 1)^3 - x^2 y^3 <= 0, under a long neck. */
const heart: Inside = (dx, y) => {
  const scale = 34;
  const stretch = 1.25;
  const tipY = FLOOR_Y;
  const centerY = tipY - scale * stretch;
  const x = dx / scale;
  const v = (centerY - y) / (scale * stretch);
  const inHeart = (x * x + v * v - 1) ** 3 - x * x * v ** 3 <= 0;
  const neckBottom = centerY - scale * stretch * 0.8;
  return inHeart || (y <= neckBottom && Math.abs(dx) <= 7);
};

const SHAPES: Record<ContainerId, { name: string; inside: Inside }> = {
  jar: { name: 'Bocal', inside: jar },
  bottle: { name: 'Bouteille', inside: bottle },
  vase: { name: 'Vase', inside: vase },
  hourglass: { name: 'Sablier', inside: hourglass },
  heart: { name: 'Cœur', inside: heart },
};

// -----------------------------------------------
// MASKS
// -----------------------------------------------

function buildContainer(id: ContainerId): Container {
  const { name, inside } = SHAPES[id];
  const mask = new Uint8Array(JAR_WIDTH * JAR_HEIGHT);
  for (let y = 0; y < JAR_HEIGHT; y++) {
    for (let x = 0; x < JAR_WIDTH; x++) {
      if (inside(x - CENTER_X, y)) mask[y * JAR_WIDTH + x] = MaskCell.Inside;
    }
  }
  for (let y = 0; y < JAR_HEIGHT; y++) {
    for (let x = 0; x < JAR_WIDTH; x++) {
      if (mask[y * JAR_WIDTH + x] !== MaskCell.Inside && nearInside(mask, x, y)) mask[y * JAR_WIDTH + x] = MaskCell.Glass;
    }
  }
  const opening = [...Array(JAR_WIDTH).keys()].filter((x) => mask[x] === MaskCell.Inside);
  return {
    id,
    name,
    mask,
    insideCount: mask.reduce((count, cell) => count + (cell === MaskCell.Inside ? 1 : 0), 0),
    pourMinX: opening[0],
    pourMaxX: opening[opening.length - 1],
  };
}

function nearInside(mask: Uint8Array, x: number, y: number): boolean {
  for (let dy = -GLASS_THICKNESS; dy <= GLASS_THICKNESS; dy++) {
    for (let dx = -GLASS_THICKNESS; dx <= GLASS_THICKNESS; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= JAR_WIDTH || ny < 0 || ny >= JAR_HEIGHT) continue;
      if (mask[ny * JAR_WIDTH + nx] === MaskCell.Inside) return true;
    }
  }
  return false;
}

export const CONTAINERS: Record<ContainerId, Container> = Object.fromEntries(
  CONTAINER_IDS.map((id) => [id, buildContainer(id)]),
) as Record<ContainerId, Container>;

export function isContainerId(value: unknown): value is ContainerId {
  return typeof value === 'string' && (CONTAINER_IDS as readonly string[]).includes(value);
}
