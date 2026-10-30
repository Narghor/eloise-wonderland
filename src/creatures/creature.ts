import { STEPS_4 } from './shape';

export interface Creature {
  id: string;
  name: string;
  size: number;
  /** One string per row: '.' outside the creature, otherwise the palette index ('0'-'9'). */
  pixels: string[];
  /** Hex colours, in colouring order: the number shown to the player is index + 1. */
  palette: string[];
  /** One string per row: '1' where the player has painted. */
  painted: string[];
  bornAt: string;
}

export const OUTSIDE = '.';

// -----------------------------------------------
// CREATION
// -----------------------------------------------

const Role = { Body: 0, Outline: 1, Belly: 2, Eyes: 3 } as const;
type Role = (typeof Role)[keyof typeof Role];
const ROLE_ORDER: Role[] = [Role.Body, Role.Outline, Role.Belly, Role.Eyes];

export function createCreature(shape: boolean[][]): Creature {
  const size = shape.length;
  const roles = assignRoles(shape);

  const hue = Math.floor(Math.random() * 360);
  const bellyHue = (hue + (Math.random() < 0.5 ? 40 : 180)) % 360;
  const colorOf: Record<Role, string> = {
    [Role.Body]: hslToHex(hue, 70, 72),
    [Role.Outline]: hslToHex(hue, 45, 38),
    [Role.Belly]: hslToHex(bellyHue, 75, 80),
    [Role.Eyes]: '#3b2a3f',
  };

  const usedRoles = ROLE_ORDER.filter((role) => roles.some((row) => row.includes(role)));
  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: randomName(),
    size,
    pixels: roles.map((row) => row.map((role) => (role === null ? OUTSIDE : String(usedRoles.indexOf(role)))).join('')),
    palette: usedRoles.map((role) => colorOf[role]),
    painted: roles.map((row) => '0'.repeat(row.length)),
    bornAt: new Date().toISOString(),
  };
}

function assignRoles(shape: boolean[][]): (Role | null)[][] {
  const size = shape.length;
  // Below 10x10 an outline would eat the whole body.
  const hasOutline = size > 5;
  const roles = shape.map((row, r) =>
    row.map((filled, c): Role | null => {
      if (!filled) return null;
      const onEdge = STEPS_4.some(([dr, dc]) => !shape[r + dr]?.[c + dc]);
      return hasOutline && onEdge ? Role.Outline : Role.Body;
    }),
  );

  const center = (size - 1) / 2;
  for (let r = Math.floor(size * 0.6); r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (roles[r][c] === Role.Body && Math.abs(c - center) <= size / 4) roles[r][c] = Role.Belly;
    }
  }

  // Eyes: a mirrored pair of body cells, as high as possible (low eyes read as a belly).
  const pairs: [number, number][] = [];
  for (let r = 1; r < Math.ceil(size * 0.55); r++) {
    for (let c = 0; c < Math.floor(size / 2); c++) {
      const mirror = size - 1 - c;
      if (mirror - c >= 2 && roles[r][c] === Role.Body && roles[r][mirror] === Role.Body) pairs.push([r, c]);
    }
  }
  const highestRows = [...new Set(pairs.map(([r]) => r))].slice(0, 2);
  const candidates = pairs.filter(([r]) => highestRows.includes(r));
  if (candidates.length > 0) {
    const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
    roles[r][c] = Role.Eyes;
    roles[r][size - 1 - c] = Role.Eyes;
  }
  return roles;
}

const NAME_STARTS = ['Pom', 'Lou', 'Fifi', 'Bibi', 'Nou', 'Zou', 'Pli', 'Mimo', 'Tchou', 'Gri', 'Plu', 'Coco', 'Rou', 'Moki', 'Pata', 'Lili', 'Bou', 'Kiki'];
const NAME_ENDS = ['nou', 'pette', 'chou', 'lin', 'bulle', 'mou', 'nette', 'pon', 'zou', 'rine', 'pin', 'tou', 'ki', 'lou', 'mine'];

function randomName(): string {
  const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
  return pick(NAME_STARTS) + pick(NAME_ENDS);
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    const value = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

// -----------------------------------------------
// READING
// -----------------------------------------------

/** Palette index of a pixel, or -1 outside the creature. */
export function colorIndexAt(creature: Creature, row: number, col: number): number {
  const char = creature.pixels[row][col];
  return char === OUTSIDE ? -1 : Number(char);
}

export function isPaintedAt(creature: Creature, row: number, col: number): boolean {
  return creature.painted[row][col] === '1';
}

export function isColored(creature: Creature): boolean {
  return creature.pixels.every((row, r) =>
    [...row].every((char, c) => char === OUTSIDE || creature.painted[r][c] === '1'),
  );
}

/** True when white text reads better than dark text on this colour. */
export function isDarkColor(hex: string): boolean {
  const value = parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return 0.299 * red + 0.587 * green + 0.114 * blue < 140;
}
