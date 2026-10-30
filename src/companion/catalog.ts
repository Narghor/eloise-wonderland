// -----------------------------------------------
// WHAT THE COMPANION CAN BE AND WEAR
// -----------------------------------------------
// Pixel art as text: one character per pixel, '.' is transparent. Every species is drawn on the
// same 16 x 18 template, so a hat, glasses or a scarf fits all of them through three anchors.

export type Slot = 'species' | 'color' | 'hat' | 'glasses' | 'neck' | 'background';

export const SLOTS: readonly Slot[] = ['species', 'color', 'hat', 'glasses', 'neck', 'background'];

export const SLOT_NAMES: Record<Slot, string> = {
  species: 'Espèce',
  color: 'Pelage',
  hat: 'Chapeau',
  glasses: 'Lunettes',
  neck: 'Cou',
  background: 'Fond',
};

export const SPRITE_WIDTH = 16;
export const SPECIES_HEIGHT = 18;

interface BaseItem {
  id: string;
  name: string;
  price: number;
}

/**
 * Species pixels: o outline, b body, l belly, i inner ear, c cheek, n nose or mouth, e eye, w eye shine.
 * `hatY`: row a hat's last row lands on. `eyeY`: first of the two eye rows.
 */
export interface SpeciesItem extends BaseItem {
  slot: 'species';
  color: string;
  hatY: number;
  eyeY: number;
  pixels: string[];
}

export interface ColorItem extends BaseItem {
  slot: 'color';
  color: string;
}

/** A worn item: its pixels and what each letter paints. */
export interface WornItem extends BaseItem {
  slot: 'hat' | 'glasses' | 'neck';
  pixels: string[];
  colors: Record<string, string>;
}

export interface BackgroundItem extends BaseItem {
  slot: 'background';
  css: string;
}

export type Item = SpeciesItem | ColorItem | WornItem | BackgroundItem;

/** Neck items sit on this row for every species. */
export const NECK_Y = 13;

// -----------------------------------------------
// SPECIES
// -----------------------------------------------

/** Rows 7 to 17, shared by the round-faced species. */
const ROUND_BODY = [
  '..obbbbbbbbbbo..',
  '.obbbbbbbbbbbbo.',
  '.obbbbbbbbbbbbo.',
  '.obbewbbbbewbbo.',
  '.obbeebbbbeebbo.',
  '.obccbbnnbbccbo.',
  '.obbbbbbbbbbbbo.',
  '.obbbllllllbbbo.',
  '.obbllllllllbbo.',
  '..obbllllllbbo..',
  '...oooooooooo...',
];

const SPECIES: SpeciesItem[] = [
  {
    id: 'cat',
    slot: 'species',
    name: 'Chat',
    price: 0,
    color: '#f6b26b',
    hatY: 6,
    eyeY: 10,
    pixels: [
      '................',
      '................',
      '................',
      '...o........o...',
      '..obo......obo..',
      '..oibo....obio..',
      '..obboooooobbo..',
      ...ROUND_BODY,
    ],
  },
  {
    id: 'rabbit',
    slot: 'species',
    name: 'Lapin',
    price: 150,
    color: '#f3ecd8',
    hatY: 6,
    eyeY: 10,
    pixels: [
      '....oo....oo....',
      '...obbo..obbo...',
      '...oibo..obio...',
      '...oibo..obio...',
      '...oibo..obio...',
      '...obbo..obbo...',
      '...oooooooooo...',
      ...ROUND_BODY,
    ],
  },
  {
    id: 'bear',
    slot: 'species',
    name: 'Ourson',
    price: 150,
    color: '#c9a477',
    hatY: 6,
    eyeY: 10,
    pixels: [
      '................',
      '................',
      '................',
      '................',
      '..ooo......ooo..',
      '.obibo....obibo.',
      '.obboooooooobbo.',
      ...ROUND_BODY,
    ],
  },
  {
    id: 'frog',
    slot: 'species',
    name: 'Grenouille',
    price: 200,
    color: '#8fd17a',
    hatY: 4,
    eyeY: 5,
    pixels: [
      '................',
      '................',
      '................',
      '................',
      '...oooo..oooo...',
      '..obweboobwebo..',
      '..obeeboobeebo..',
      '.obbbbbbbbbbbbo.',
      '.obbbbbbbbbbbbo.',
      '.obbbbbbbbbbbbo.',
      '.obbbbbbbbbbbbo.',
      '.obbbbbbbbbbbbo.',
      '.obcbnnnnnnbcbo.',
      '.obbbbbbbbbbbbo.',
      '.obbbllllllbbbo.',
      '.obbllllllllbbo.',
      '..obbllllllbbo..',
      '...oooooooooo...',
    ],
  },
  {
    id: 'ghost',
    slot: 'species',
    name: 'Fantôme',
    price: 300,
    color: '#ece6ff',
    hatY: 6,
    eyeY: 10,
    pixels: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '...oooooooooo...',
      '..obbbbbbbbbbo..',
      '.obbbbbbbbbbbbo.',
      '.obbbbbbbbbbbbo.',
      '.obbewbbbbewbbo.',
      '.obbeebbbbeebbo.',
      '.obccbbnnbbccbo.',
      '.obbbbbbbbbbbbo.',
      '.obbbbbbbbbbbbo.',
      '.obbbbbbbbbbbbo.',
      '.obbbbbbbbbbbbo.',
      '.oo.oo.oo.oo.oo.',
    ],
  },
];

// -----------------------------------------------
// COATS
// -----------------------------------------------

const COLORS: ColorItem[] = [
  { id: 'coat-pink', slot: 'color', name: 'Rose', price: 40, color: '#f7a6c1' },
  { id: 'coat-mint', slot: 'color', name: 'Menthe', price: 40, color: '#9fdfc8' },
  { id: 'coat-lilac', slot: 'color', name: 'Lilas', price: 40, color: '#c3a6f0' },
  { id: 'coat-sky', slot: 'color', name: 'Ciel', price: 40, color: '#8fb8f0' },
  { id: 'coat-lemon', slot: 'color', name: 'Citron', price: 40, color: '#ffe08a' },
  { id: 'coat-coral', slot: 'color', name: 'Corail', price: 40, color: '#f4877e' },
  { id: 'coat-snow', slot: 'color', name: 'Neige', price: 60, color: '#f6f4fb' },
  { id: 'coat-night', slot: 'color', name: 'Nuit', price: 80, color: '#5b5891' },
];

// -----------------------------------------------
// WORN ITEMS
// -----------------------------------------------
// A hat's last row lands on the species' hatY, centred. Glasses start one row above the eyes,
// at column 2. A neck item starts on NECK_Y, centred.

const HATS: WornItem[] = [
  {
    id: 'hat-bow',
    slot: 'hat',
    name: 'Nœud',
    price: 30,
    pixels: ['pp....pp', 'pppkkppp', 'pp....pp'],
    colors: { p: '#ff7fae', k: '#d94f86' },
  },
  {
    id: 'hat-flower',
    slot: 'hat',
    name: 'Fleur',
    price: 40,
    pixels: ['..pp..', '.pyyp.', '..pp..', '..gg..'],
    colors: { p: '#ff9ec7', y: '#ffd23f', g: '#5f9e57' },
  },
  {
    id: 'hat-beanie',
    slot: 'hat',
    name: 'Bonnet',
    price: 60,
    pixels: ['....ww....', '..bbbbbb..', '.bbbbbbbb.', 'bbbbbbbbbb', 'ssssssssss'],
    colors: { b: '#6fa8dc', s: '#3d6fa8', w: '#ffffff' },
  },
  {
    id: 'hat-top',
    slot: 'hat',
    name: 'Haut-de-forme',
    price: 100,
    pixels: ['.kkkkkk.', '.kkkkkk.', '.kkkkkk.', '.rrrrrr.', '.kkkkkk.', 'kkkkkkkk'],
    colors: { k: '#3b2a3f', r: '#e0605e' },
  },
  {
    id: 'hat-witch',
    slot: 'hat',
    name: 'Chapeau de sorcière',
    price: 120,
    pixels: ['....pp....', '....pp....', '...pppp...', '...pppp...', '..pyyyyp..', 'pppppppppp'],
    colors: { p: '#7a5cb8', y: '#ffd23f' },
  },
  {
    id: 'hat-crown',
    slot: 'hat',
    name: 'Couronne',
    price: 150,
    pixels: ['y..yy..y', 'yy.yy.yy', 'yyyyyyyy', 'yryyyyry'],
    colors: { y: '#f6cd4c', r: '#e0605e' },
  },
  {
    id: 'hat-halo',
    slot: 'hat',
    name: 'Auréole',
    price: 200,
    pixels: ['.yyyyyy.', 'y......y', '.yyyyyy.', '........', '........'],
    colors: { y: '#ffe36e' },
  },
];

const GLASSES: WornItem[] = [
  {
    id: 'glasses-round',
    slot: 'glasses',
    name: 'Rondes',
    price: 50,
    pixels: ['.kkkk..kkkk.', '.k..kkkk..k.', '.k..k..k..k.', '.kkkk..kkkk.'],
    colors: { k: '#3b2a3f' },
  },
  {
    id: 'glasses-sun',
    slot: 'glasses',
    name: 'De soleil',
    price: 80,
    pixels: ['.kkkk..kkkk.', '.kwdkkkkwdk.', '.kddk..kddk.', '.kkkk..kkkk.'],
    colors: { k: '#3b2a3f', d: '#2e2236', w: '#8fb8f0' },
  },
  {
    id: 'glasses-hearts',
    slot: 'glasses',
    name: 'Cœurs',
    price: 120,
    pixels: ['pp.pp..pp.pp', 'pppppkkppppp', '.ppp....ppp.', '..p......p..'],
    colors: { p: '#ff5d8f', k: '#3b2a3f' },
  },
];

const NECKS: WornItem[] = [
  {
    id: 'neck-bowtie',
    slot: 'neck',
    name: 'Nœud papillon',
    price: 40,
    pixels: ['rr..rr', 'rrkkrr', 'rr..rr'],
    colors: { r: '#e0605e', k: '#a83c3c' },
  },
  {
    id: 'neck-scarf',
    slot: 'neck',
    name: 'Écharpe',
    price: 60,
    pixels: ['sdsdsdsdsdsdsd', '..........sd..', '..........ds..'],
    colors: { s: '#e0605e', d: '#ffffff' },
  },
  {
    id: 'neck-bell',
    slot: 'neck',
    name: 'Clochette',
    price: 70,
    pixels: ['rrrrrrrrrrrrrr', '.....yyyy.....', '.....yyyy.....', '......yy......'],
    colors: { r: '#e0605e', y: '#f6cd4c' },
  },
  {
    id: 'neck-pearls',
    slot: 'neck',
    name: 'Collier de perles',
    price: 150,
    pixels: ['.w..........w.', '..w.w....w.w..', '.....w..w.....', '......pp......'],
    colors: { w: '#fdf6ff', p: '#ff9ec7' },
  },
];

// -----------------------------------------------
// BACKGROUNDS
// -----------------------------------------------

const BACKGROUNDS: BackgroundItem[] = [
  { id: 'bg-meadow', slot: 'background', name: 'Prairie', price: 50, css: 'linear-gradient(#cdefff 0 62%, #9ed98a 62%)' },
  { id: 'bg-beach', slot: 'background', name: 'Plage', price: 60, css: 'linear-gradient(#bfeaff 0 50%, #4fb3d9 50% 66%, #f6e3b4 66%)' },
  { id: 'bg-sunset', slot: 'background', name: 'Coucher de soleil', price: 80, css: 'linear-gradient(#ffd6a5, #ff9eb5 60%, #a98be0)' },
  {
    id: 'bg-night',
    slot: 'background',
    name: 'Nuit étoilée',
    price: 120,
    css:
      'radial-gradient(circle at 18% 22%, #fff 0 1.5px, transparent 2.5px), radial-gradient(circle at 72% 14%, #fff 0 1px, transparent 2px), ' +
      'radial-gradient(circle at 84% 46%, #ffe08a 0 2px, transparent 3px), radial-gradient(circle at 34% 58%, #fff 0 1px, transparent 2px), ' +
      'radial-gradient(circle at 60% 80%, #fff 0 1px, transparent 2px), linear-gradient(#1f1b3d, #4b3b7a)',
  },
  {
    id: 'bg-rainbow',
    slot: 'background',
    name: 'Arc-en-ciel',
    price: 200,
    css:
      'radial-gradient(circle at 50% 115%, transparent 0 30%, #c3a6f0 30% 36%, #8fb8f0 36% 42%, #9fdfc8 42% 48%, ' +
      '#ffe08a 48% 54%, #f6b26b 54% 60%, #f7a6c1 60% 66%, transparent 66%), linear-gradient(#e8f6ff, #fffaf3)',
  },
];

export const ITEMS: readonly Item[] = [...SPECIES, ...COLORS, ...HATS, ...GLASSES, ...NECKS, ...BACKGROUNDS];

export const STARTER_SPECIES = 'cat';

export function findItem(id: string | null): Item | undefined {
  return id === null ? undefined : ITEMS.find((item) => item.id === id);
}

export function itemsOf(slot: Slot): Item[] {
  return ITEMS.filter((item) => item.slot === slot);
}

export function speciesOf(id: string): SpeciesItem {
  const item = findItem(id);
  return item?.slot === 'species' ? item : SPECIES[0];
}
