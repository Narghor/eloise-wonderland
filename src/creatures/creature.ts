import { OUTSIDE, newPictureId, type PixelPicture } from '../pictures/pixelPicture';
import { STEPS_4 } from './shape';

export interface Creature extends PixelPicture {
  bornAt: string;
  /** Rare creatures: golden, or a rainbow body. */
  rarity?: Rarity;
}

// -----------------------------------------------
// CREATION
// -----------------------------------------------

const Role = { Body: 0, Outline: 1, Belly: 2, Eyes: 3, BodyMiddle: 4, BodyLow: 5 } as const;
type Role = (typeof Role)[keyof typeof Role];
const ROLE_ORDER: Role[] = [Role.Body, Role.BodyMiddle, Role.BodyLow, Role.Outline, Role.Belly, Role.Eyes];

export type Rarity = 'gold' | 'rainbow';
export const RARITIES: readonly Rarity[] = ['gold', 'rainbow'];
/** About one creature in eight is rare. */
const RARE_CHANCE = 1 / 8;

export function createCreature(shape: boolean[][]): Creature {
  const size = shape.length;
  const rarity: Rarity | undefined = Math.random() < RARE_CHANCE ? RARITIES[Math.floor(Math.random() * RARITIES.length)] : undefined;
  const roles = assignRoles(shape);
  if (rarity === 'rainbow') splitBodyInBands(roles);

  const hue = Math.floor(Math.random() * 360);
  const bellyHue = (hue + (Math.random() < 0.5 ? 40 : 180)) % 360;
  const colorOf: Record<Role, string> =
    rarity === 'gold'
      ? {
          [Role.Body]: '#f6cd4c',
          [Role.BodyMiddle]: '#f6cd4c',
          [Role.BodyLow]: '#f6cd4c',
          [Role.Outline]: '#a8740f',
          [Role.Belly]: '#fff3c4',
          [Role.Eyes]: '#3b2a3f',
        }
      : {
          [Role.Body]: rarity === 'rainbow' ? '#ff9ec7' : hslToHex(hue, 70, 72),
          [Role.BodyMiddle]: '#9fe6c4',
          [Role.BodyLow]: '#9cc9ff',
          [Role.Outline]: rarity === 'rainbow' ? '#7a4f9e' : hslToHex(hue, 45, 38),
          [Role.Belly]: rarity === 'rainbow' ? '#fff0a8' : hslToHex(bellyHue, 75, 80),
          [Role.Eyes]: '#3b2a3f',
        };

  const usedRoles = ROLE_ORDER.filter((role) => roles.some((row) => row.includes(role)));
  return {
    id: newPictureId(),
    name: randomName(),
    size,
    pixels: roles.map((row) => row.map((role) => (role === null ? OUTSIDE : String(usedRoles.indexOf(role)))).join('')),
    palette: usedRoles.map((role) => colorOf[role]),
    painted: roles.map((row) => '0'.repeat(row.length)),
    bornAt: new Date().toISOString(),
    ...(rarity ? { rarity } : {}),
  };
}

/** Rainbow creatures: the body in three horizontal bands, each its own colour to paint. */
function splitBodyInBands(roles: (Role | null)[][]): void {
  const size = roles.length;
  roles.forEach((row, r) => {
    const band = Math.min(2, Math.floor((r / size) * 3));
    row.forEach((role, c) => {
      if (role === Role.Body && band > 0) row[c] = band === 1 ? Role.BodyMiddle : Role.BodyLow;
    });
  });
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
