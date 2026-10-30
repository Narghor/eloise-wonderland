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
  /** Not for sale: given once this many daily challenges are done. */
  challenges?: number;
}

/**
 * Species pixels: o outline, b body, l belly (all three follow the coat), then fixed colours:
 * i inner ear, c cheek, n nose or mouth, e eye, w eye shine, k black patch, y beak or horn, p mane.
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
  /** Horizontal stripes from head to toe; `color` is then only the shop's swatch. */
  bands?: string[];
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
  {
    id: 'chick',
    slot: 'species',
    name: 'Poussin',
    price: 150,
    color: '#ffe08a',
    hatY: 6,
    eyeY: 10,
    pixels: [
      '................',
      '................',
      '................',
      '................',
      '......o..o......',
      '.......oo.......',
      '...oooooooooo...',
      '..obbbbbbbbbbo..',
      '.obbbbbbbbbbbbo.',
      '.obbbbbbbbbbbbo.',
      '.obbewbbbbewbbo.',
      '.obbeebbbbeebbo.',
      '.obccbbyybbccbo.',
      ...ROUND_BODY.slice(6),
    ],
  },
  {
    id: 'fox',
    slot: 'species',
    name: 'Renard',
    price: 200,
    color: '#f08a4b',
    hatY: 6,
    eyeY: 10,
    pixels: [
      '................',
      '................',
      '..o..........o..',
      '..oo........oo..',
      '..obo......obo..',
      '..obio....oibo..',
      '..obboooooobbo..',
      '..obbbbbbbbbbo..',
      '.obbbbbbbbbbbbo.',
      '.obbbbbbbbbbbbo.',
      '.obbewbbbbewbbo.',
      '.obbeebbbbeebbo.',
      '.obllllnnllllbo.',
      '.obbllllllllbbo.',
      '.obbbllllllbbbo.',
      '.obbllllllllbbo.',
      '..obbllllllbbo..',
      '...oooooooooo...',
    ],
  },
  {
    id: 'panda',
    slot: 'species',
    name: 'Panda',
    price: 250,
    color: '#f4f4f4',
    hatY: 6,
    eyeY: 10,
    pixels: [
      '................',
      '................',
      '................',
      '................',
      '..ooo......ooo..',
      '.okkko....okkko.',
      '.okkooooooookko.',
      '..obbbbbbbbbbo..',
      '.obbbbbbbbbbbbo.',
      '.obkkkbbbbkkkbo.',
      '.obkewbbbbewkbo.',
      '.obkeebbbbeekbo.',
      '.obccbbnnbbccbo.',
      ...ROUND_BODY.slice(6),
    ],
  },
  {
    id: 'penguin',
    slot: 'species',
    name: 'Pingouin',
    price: 250,
    color: '#3e4a6b',
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
      '.obbllllllllbbo.',
      '.obllllllllllbo.',
      '.oblewllllewlbo.',
      '.obleelllleelbo.',
      '.oblcllyyllclbo.',
      '.obllllllllllbo.',
      '.obllllllllllbo.',
      '.obbllllllllbbo.',
      '..obbllllllbbo..',
      '...oyyo..oyyo...',
    ],
  },
  {
    id: 'dragon',
    slot: 'species',
    name: 'Dragonnet',
    price: 500,
    color: '#7ccfb0',
    hatY: 6,
    eyeY: 10,
    pixels: [
      '................',
      '................',
      '................',
      '..y..........y..',
      '..yy........yy..',
      '...yo......oy...',
      '...oooooooooo...',
      '..obbbbbbbbbbo..',
      '.obbbbbbbbbbbbo.',
      'yobbbbbbbbbbbboy',
      'yobbewbbbbewbboy',
      '.obbeebbbbeebbo.',
      '.obccbbnnbbccbo.',
      ...ROUND_BODY.slice(6),
    ],
  },
  {
    id: 'unicorn',
    slot: 'species',
    name: 'Licorne',
    price: 800,
    color: '#fbf3ff',
    hatY: 6,
    eyeY: 10,
    pixels: [
      '................',
      '.......yy.......',
      '.......yy.......',
      '......yyyy......',
      '..o...yyyy...o..',
      '..obo.yyyy.obo..',
      '..oboooooooobo..',
      '..oppbbbbbbbbo..',
      '.oppbbbbbbbbbbo.',
      '.opbbbbbbbbbbbo.',
      '.obbewbbbbewbbo.',
      '.obbeebbbbeebbo.',
      '.obccbbnnbbccbo.',
      ...ROUND_BODY.slice(6),
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
  { id: 'coat-peach', slot: 'color', name: 'Pêche', price: 60, color: '#ffc8a8' },
  { id: 'coat-pistachio', slot: 'color', name: 'Pistache', price: 60, color: '#c6e58b' },
  { id: 'coat-turquoise', slot: 'color', name: 'Turquoise', price: 60, color: '#5fd3c9' },
  { id: 'coat-raspberry', slot: 'color', name: 'Framboise', price: 60, color: '#e05a8a' },
  { id: 'coat-caramel', slot: 'color', name: 'Caramel', price: 60, color: '#d9a066' },
  { id: 'coat-chocolate', slot: 'color', name: 'Chocolat', price: 80, color: '#8b5e4a' },
  { id: 'coat-coal', slot: 'color', name: 'Charbon', price: 80, color: '#4a4a52' },
  { id: 'coat-ice', slot: 'color', name: 'Glace', price: 80, color: '#cfe9ff' },
  { id: 'coat-sorbet', slot: 'color', name: 'Sorbet', price: 250, color: '#ffc2e2', bands: ['#ffc2e2', '#fff0a8', '#b9ecff'] },
  { id: 'coat-dusk', slot: 'color', name: 'Crépuscule', price: 250, color: '#f4877e', bands: ['#ffe08a', '#f6b26b', '#f4877e', '#c25b7a'] },
  {
    id: 'coat-rainbow',
    slot: 'color',
    name: 'Arc-en-ciel',
    price: 500,
    color: '#c3a6f0',
    bands: ['#f7a6c1', '#f6b26b', '#ffe08a', '#9fdfc8', '#8fb8f0', '#c3a6f0'],
  },
  { id: 'coat-gold', slot: 'color', name: 'Or', price: 0, challenges: 30, color: '#f6cd4c' },
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
  {
    id: 'hat-leaf',
    slot: 'hat',
    name: 'Feuille',
    price: 30,
    pixels: ['..gg', '.gg.', '.g..'],
    colors: { g: '#6fbf5f' },
  },
  {
    id: 'hat-cap',
    slot: 'hat',
    name: 'Casquette',
    price: 60,
    pixels: ['..rrrrrr..', '.rrrwwrrr.', 'rrrrrrrrrr', '..dddddd..'],
    colors: { r: '#e0605e', w: '#ffffff', d: '#a83c3c' },
  },
  {
    id: 'hat-flowers',
    slot: 'hat',
    name: 'Couronne de fleurs',
    price: 80,
    pixels: ['p.y.p..p.y.p', 'gggggggggggg'],
    colors: { p: '#ff9ec7', y: '#ffe08a', g: '#5f9e57' },
  },
  {
    id: 'hat-party',
    slot: 'hat',
    name: 'Chapeau de fête',
    price: 80,
    pixels: ['..yy..', '..pp..', '.pppp.', '.pbbp.', 'pppppp', 'pbpbpb'],
    colors: { p: '#8fb8f0', b: '#ff7fae', y: '#ffe08a' },
  },
  {
    id: 'hat-mushroom',
    slot: 'hat',
    name: 'Champignon',
    price: 100,
    pixels: ['...rrrr...', '.rrwrrwrr.', 'rrrrrrrrrr', 'rwrrrrrrwr', '...wwww...'],
    colors: { r: '#e0605e', w: '#ffffff' },
  },
  {
    id: 'hat-straw',
    slot: 'hat',
    name: 'Chapeau de paille',
    price: 100,
    pixels: ['....yyyyyy....', '....rrrrrr....', '.yyyyyyyyyyyy.', 'yyyyyyyyyyyyyy'],
    colors: { y: '#e8c56a', r: '#e0605e' },
  },
  {
    id: 'hat-santa',
    slot: 'hat',
    name: 'Bonnet de lutin',
    price: 120,
    pixels: ['.......ww.', '......rr..', '....rrrr..', '..rrrrrr..', '.rrrrrrrr.', 'wwwwwwwwww'],
    colors: { r: '#e0475b', w: '#ffffff' },
  },
  {
    id: 'hat-chef',
    slot: 'hat',
    name: 'Toque',
    price: 120,
    pixels: ['..wwwwww..', '.wwwwwwww.', '.wwwwwwww.', '..wwwwww..', '..wwwwww..', '..gggggg..'],
    colors: { w: '#ffffff', g: '#d9d9e3' },
  },
  {
    id: 'hat-cowboy',
    slot: 'hat',
    name: 'Chapeau de cowboy',
    price: 150,
    pixels: ['....bbbbbb....', '....bbbbbb....', '....dddddd....', 'bbbbbbbbbbbbbb'],
    colors: { b: '#a8743f', d: '#6b4e3d' },
  },
  {
    id: 'hat-tiara',
    slot: 'hat',
    name: 'Diadème',
    price: 250,
    pixels: ['...pp...', '.y.yy.y.', 'yyyyyyyy'],
    colors: { y: '#dfe3f0', p: '#ff7fae' },
  },
  {
    id: 'hat-laurel',
    slot: 'hat',
    name: 'Lauriers',
    price: 0,
    challenges: 50,
    pixels: ['g..........g', 'gg........gg', '.gggg..gggg.'],
    colors: { g: '#d9b44a' },
  },
  {
    id: 'hat-star',
    slot: 'hat',
    name: 'Étoile filante',
    price: 0,
    challenges: 100,
    pixels: ['...yy...', '..yyyy..', 'yyyyyyyy', '.yyyyyy.', '.yy..yy.'],
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
  {
    id: 'glasses-pink',
    slot: 'glasses',
    name: 'Roses',
    price: 60,
    pixels: ['.pppp..pppp.', '.p..pppp..p.', '.p..p..p..p.', '.pppp..pppp.'],
    colors: { p: '#ff5d8f' },
  },
  {
    id: 'glasses-monocle',
    slot: 'glasses',
    name: 'Monocle',
    price: 100,
    pixels: ['.......kkkk.', '.......k..k.', '.......k..k.', '......kkkkk.'],
    colors: { k: '#c9a227' },
  },
  {
    id: 'glasses-pixel',
    slot: 'glasses',
    name: 'Pixels',
    price: 150,
    pixels: ['kkkkkkkkkkkk', '.kwkk..kwkk.', '.kkkk..kkkk.', '............'],
    colors: { k: '#1e1a24', w: '#ffffff' },
  },
  {
    id: 'glasses-stars',
    slot: 'glasses',
    name: 'Étoiles',
    price: 200,
    pixels: ['..y......y..', 'yyyyykkyyyyy', '.yyy....yyy.', '.y.y....y.y.'],
    colors: { y: '#ffd23f', k: '#3b2a3f' },
  },
  {
    id: 'glasses-gold',
    slot: 'glasses',
    name: 'Lunettes d’or',
    price: 0,
    challenges: 15,
    pixels: ['.kkkk..kkkk.', '.k..kkkk..k.', '.k..k..k..k.', '.kkkk..kkkk.'],
    colors: { k: '#d9b44a' },
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
  {
    id: 'neck-tie',
    slot: 'neck',
    name: 'Cravate',
    price: 50,
    pixels: ['bbbb', '.bb.', '.bb.', '..b.'],
    colors: { b: '#3d6fa8' },
  },
  {
    id: 'neck-bandana',
    slot: 'neck',
    name: 'Bandana',
    price: 60,
    pixels: ['bbbbbbbbbbbbbb', '..bbbbbbbbbb..', '....bbwbbb....'],
    colors: { b: '#8fb8f0', w: '#ffffff' },
  },
  {
    id: 'neck-lei',
    slot: 'neck',
    name: 'Collier de fleurs',
    price: 100,
    pixels: ['pypopypopypopy', '.o.p.y.p.o.p.y'],
    colors: { p: '#ff9ec7', y: '#ffe08a', o: '#f6b26b' },
  },
  {
    id: 'neck-heart',
    slot: 'neck',
    name: 'Pendentif cœur',
    price: 180,
    pixels: ['..k........k..', '...kkk..kkk...', '.....pppp.....', '......pp......'],
    colors: { k: '#c9a227', p: '#ff5d8f' },
  },
  {
    id: 'neck-medal',
    slot: 'neck',
    name: 'Médaille',
    price: 0,
    challenges: 7,
    pixels: ['r....r', '.r..r.', '..yy..', '..yy..'],
    colors: { r: '#3d6fa8', y: '#f6cd4c' },
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
  { id: 'bg-candy', slot: 'background', name: 'Bonbons', price: 60, css: 'repeating-linear-gradient(45deg, #ffe1ec 0 10px, #ffffff 10px 20px)' },
  {
    id: 'bg-forest',
    slot: 'background',
    name: 'Forêt',
    price: 80,
    css:
      'radial-gradient(circle at 12% 66%, #5f9e57 0 18%, transparent 19%), radial-gradient(circle at 88% 70%, #4f8a48 0 20%, transparent 21%), ' +
      'linear-gradient(#d8f3dc 0 66%, #7fbf6a 66%)',
  },
  {
    id: 'bg-blossom',
    slot: 'background',
    name: 'Cerisiers',
    price: 100,
    css:
      'radial-gradient(circle at 18% 22%, #ffc2d6 0 14%, transparent 15%), radial-gradient(circle at 80% 18%, #ffb0c8 0 16%, transparent 17%), ' +
      'linear-gradient(#fff0f5 0 68%, #b9e3a8 68%)',
  },
  {
    id: 'bg-snow',
    slot: 'background',
    name: 'Neige',
    price: 100,
    css:
      'radial-gradient(circle at 20% 20%, #fff 0 2px, transparent 3px), radial-gradient(circle at 62% 34%, #fff 0 2px, transparent 3px), ' +
      'radial-gradient(circle at 82% 14%, #fff 0 2px, transparent 3px), radial-gradient(circle at 40% 10%, #fff 0 1.5px, transparent 2.5px), ' +
      'linear-gradient(#b8d8f0 0 70%, #f4f8ff 70%)',
  },
  {
    id: 'bg-sea',
    slot: 'background',
    name: 'Sous la mer',
    price: 150,
    css:
      'radial-gradient(circle at 24% 66%, rgb(255 255 255 / 0.6) 0 3px, transparent 4px), radial-gradient(circle at 72% 40%, rgb(255 255 255 / 0.5) 0 4px, transparent 5px), ' +
      'linear-gradient(#5fc3e4, #1f5f8b 76%, #e8d6a8 76%)',
  },
  { id: 'bg-castle', slot: 'background', name: 'Château', price: 150, css: 'linear-gradient(#e7d9ff 0 58%, transparent 58%), repeating-linear-gradient(90deg, #b9a7d6 0 14px, #a491c4 14px 28px)' },
  { id: 'bg-aurora', slot: 'background', name: 'Aurore boréale', price: 250, css: 'linear-gradient(170deg, #0f1a3a 0 28%, #2fb38f 45%, #8a4fbf 62%, #0f1a3a 82%)' },
  {
    id: 'bg-space',
    slot: 'background',
    name: 'Espace',
    price: 300,
    css:
      'radial-gradient(circle at 78% 24%, #f6b26b 0 10%, #c97a3a 10% 12%, transparent 12.5%), radial-gradient(circle at 20% 30%, #fff 0 1px, transparent 2px), ' +
      'radial-gradient(circle at 40% 76%, #fff 0 1px, transparent 2px), radial-gradient(circle at 86% 80%, #fff 0 1.5px, transparent 2.5px), linear-gradient(#0e0b26, #2b1f5c)',
  },
  { id: 'bg-podium', slot: 'background', name: 'Podium', price: 0, challenges: 3, css: 'radial-gradient(circle at 50% 100%, #f6cd4c 0 30%, transparent 31%), linear-gradient(#fff8dc, #ffe9a8)' },
  { id: 'bg-trophies', slot: 'background', name: 'Gloire', price: 0, challenges: 75, css: 'repeating-conic-gradient(from 0deg at 50% 100%, #ffe36e 0 10deg, #fff4bf 10deg 20deg)' },
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
