import { atLevel, type BuildingId, type DecorId, type DecorStyleId, type ObjectStyleId, type PlaceableId, type StyleId, type Unlock } from './types';
import { isBuilding, placeable } from './placeables';

// -----------------------------------------------
// BUILDING STYLES: other materials on the same drawings (docs/ferme.md 26)
// -----------------------------------------------
// A style repaints a building's roof, wood and stone with its own tones, and may add a touch on top (snow on the
// ridges, icing that drips...). The shop styles are bought for one kind of building at a time, in Eloisettes; the
// treasure styles come out of Gaston's parcels and dress every building.

/** Light, base, dark, deep: matched one for one with every roof of farmPaint.ROOF_TONES. */
type RoofTones = readonly [string, string, string, string];
/** Light, base, dark: matched with the wood (C.woodLight, C.wood, C.woodDark) and the stone (WARM_STONE). */
type ThreeTones = readonly [string, string, string];

/** A touch painted over the repainted drawing (farmArtStyles.ts). */
export type StyleTouch = 'snow' | 'icing' | 'petals' | 'sparkle';

export interface BuildingStyle {
  id: StyleId;
  name: string;
  roof?: RoofTones;
  wood?: ThreeTones;
  stone?: ThreeTones;
  touch?: StyleTouch;
  /** A shop style: from which level it is sold. None: a treasure style, found in parcels (data/parcels.ts PRIZES). */
  unlock?: Unlock;
}

export const STYLES: readonly BuildingStyle[] = [
  { id: 'thatch', name: 'Chaumière', unlock: atLevel(5), roof: ['#f5e7bf', '#e2c77e', '#c3a256', '#9a7c3c'], wood: ['#e6c08c', '#c99a62', '#a3743f'] },
  { id: 'provence', name: 'Provence', unlock: atLevel(7), roof: ['#ffc1a1', '#f29a72', '#d27552', '#ad5a3d'], wood: ['#c9d8f0', '#9db6de', '#7a95c4'] },
  { id: 'seaside', name: 'Bord de mer', unlock: atLevel(9), roof: ['#d8ecfb', '#9cc8ef', '#78a8d6', '#5a88b8'], wood: ['#fffaf2', '#ece6da', '#cfc6b6'], stone: ['#f4efe6', '#e0d6c6', '#c2b5a1'] },
  { id: 'forest', name: 'Forêt', unlock: atLevel(11), roof: ['#c2e08a', '#86b350', '#64903a', '#4a6d2b'], wood: ['#b5835b', '#8f5e3e', '#6f4630'] },
  { id: 'chalet', name: 'Chalet', unlock: atLevel(13), roof: ['#a08b8b', '#7a6666', '#5e4d4d', '#463939'], wood: ['#9a6644', '#7a4c31', '#5e3824'], stone: ['#dad5ce', '#bdb6ae', '#9c958d'] },
  { id: 'cherry', name: 'Cerisier', roof: ['#ffe0ea', '#fbc4d2', '#ec94ac', '#cc6e8a'], wood: ['#f2d6c4', '#d9b39b', '#b88d74'], touch: 'petals' },
  { id: 'icing', name: 'Sucre glace', roof: ['#fffaf2', '#f6efe4', '#e6dccd', '#cfc3b1'], wood: ['#d9935a', '#b8703c', '#94552a'], stone: ['#d9935a', '#b8703c', '#94552a'], touch: 'icing' },
  { id: 'winter', name: 'Hiver', touch: 'snow' },
  { id: 'golden', name: 'Doré', roof: ['#fff1b0', '#f2c94c', '#d9a339', '#b07d22'], wood: ['#fbe38a', '#e8b54a', '#c48f2c'], touch: 'sparkle' },
];

export const STYLE_IDS = STYLES.map((s) => s.id);

export function style(id: StyleId): BuildingStyle {
  return STYLES.find((s) => s.id === id)!;
}

/** Found in a parcel rather than bought. */
export function isTreasureStyle(s: BuildingStyle): boolean {
  return s.unlock === undefined;
}

/** A shop style for one kind of building: a base, plus ten times the building's own price. */
export const STYLE_BASE_PRICE = 1000;
export const STYLE_PRICE_PER_BUILDING_NUT = 10;

export function stylePrice(building: BuildingId): number {
  return STYLE_BASE_PRICE + STYLE_PRICE_PER_BUILDING_NUT * placeable(building).price;
}

// -----------------------------------------------
// DECORATION STYLES: the rare looks of one decoration (docs/ferme.md 27)
// -----------------------------------------------
// Found in a parcel only (their rarity lives in data/parcels.ts PRIZES), never bought: once in the album, every copy
// of their decoration may wear them. The drawing recipe (colours, touch, extra drawing) is in farmArtStyles.ts.
// Never for a piece that joins: a run of fence would mix looks.

export interface DecorStyle {
  id: DecorStyleId;
  name: string;
  decor: DecorId;
}

export const DECOR_STYLES: readonly DecorStyle[] = [
  { id: 'blueRoses', name: 'Roses bleues', decor: 'flowersPink' },
  { id: 'faiencePot', name: 'Pot en faïence', decor: 'flowerPot' },
  { id: 'parrotTulips', name: 'Tulipes perroquet', decor: 'tulips' },
  { id: 'gingerbreadBirdhouse', name: 'Nichoir en pain d’épices', decor: 'birdhouse' },
  { id: 'moonHydrangeas', name: 'Hortensias de lune', decor: 'hydrangeas' },
  { id: 'rainbowParasol', name: 'Parasol arc-en-ciel', decor: 'parasol' },
  { id: 'lovebirdBench', name: 'Banc des amoureux', decor: 'bench' },
  { id: 'fairyLantern', name: 'Lanterne de fée', decor: 'lantern' },
  { id: 'pinkMarbleBirdBath', name: 'Bain d’oiseaux en marbre rose', decor: 'birdBath' },
  { id: 'flowerSwing', name: 'Balancelle fleurie', decor: 'porchSwing' },
  { id: 'wishingWell', name: 'Puits aux souhaits', decor: 'well' },
  { id: 'lotusPond', name: 'Bassin aux lotus', decor: 'lilyPond' },
];

export const DECOR_STYLE_IDS = DECOR_STYLES.map((s) => s.id);

export function decorStyle(id: DecorStyleId): DecorStyle {
  return DECOR_STYLES.find((s) => s.id === id)!;
}

export function isDecorStyle(id: ObjectStyleId): id is DecorStyleId {
  return (DECOR_STYLE_IDS as readonly string[]).includes(id);
}

/** The styles a decoration may wear, in the order of the list; empty for most. */
export function decorStylesOf(decor: PlaceableId): DecorStyle[] {
  return DECOR_STYLES.filter((s) => s.decor === decor);
}

/** Whether `id` is one of the styles of this kind of object (a building style on a building, its own on a decoration). */
export function fitsStyle(type: PlaceableId, id: ObjectStyleId): boolean {
  return isDecorStyle(id) ? decorStyle(id).decor === type : isBuilding(type);
}

/** A style's name as the player reads it: "Style Chalet" for a building, the decoration style's own name. */
export function styleName(id: ObjectStyleId): string {
  return isDecorStyle(id) ? decorStyle(id).name : `Style ${style(id).name}`;
}
