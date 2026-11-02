import type { Sprite } from './houseArt';

// -----------------------------------------------
// ROOM STYLE: wallpapers, floors and wall decorations, bought once, used in any room
// -----------------------------------------------

export interface Finish {
  id: string;
  name: string;
  price: number;
  /** CSS background of the wall or the floor. */
  css: string;
}

export const WALLPAPERS: Finish[] = [
  { id: 'wall-cream', name: 'Crème uni', price: 40, css: '#fff4e2' },
  { id: 'wall-mint-stripes', name: 'Rayures menthe', price: 60, css: 'repeating-linear-gradient(90deg, #e2f7ec 0 18px, #cdeedd 18px 36px)' },
  { id: 'wall-pink-dots', name: 'Pois roses', price: 70, css: 'radial-gradient(circle at 10px 10px, #f7b6cf 3px, transparent 4px) 0 0 / 22px 22px, #fff0f5' },
  { id: 'wall-sky', name: 'Ciel et nuages', price: 90, css: 'radial-gradient(ellipse 30px 12px at 30% 30%, #fff 60%, transparent 62%) 0 0 / 90px 50px, linear-gradient(#bfe6ff, #e6f5ff)' },
  { id: 'wall-flowers', name: 'Petites fleurs', price: 100, css: 'radial-gradient(circle at 8px 8px, #ffd34f 2px, #f48fb1 3px, transparent 5px) 0 0 / 26px 26px, #fdf3e7' },
  { id: 'wall-wood', name: 'Lambris de bois', price: 110, css: 'repeating-linear-gradient(90deg, #d7a46f 0 20px, #c79360 20px 22px)' },
  { id: 'wall-stars', name: 'Nuit étoilée', price: 140, css: 'radial-gradient(circle at 12px 14px, #fff7b0 1.5px, transparent 2.5px) 0 0 / 30px 34px, radial-gradient(circle at 26px 4px, #fff 1px, transparent 2px) 0 0 / 34px 26px, #2f3a6e' },
  { id: 'wall-lilac-check', name: 'Damier lilas', price: 120, css: 'repeating-conic-gradient(#e7defa 0 25%, #f5f0ff 0 50%) 0 0 / 28px 28px' },
];

export const FLOORS: Finish[] = [
  { id: 'floor-light-wood', name: 'Parquet clair', price: 50, css: 'repeating-linear-gradient(90deg, #e8c99a 0 30px, #dcb984 30px 32px)' },
  { id: 'floor-dark-wood', name: 'Parquet foncé', price: 60, css: 'repeating-linear-gradient(90deg, #8a5a3c 0 30px, #7a4e33 30px 32px)' },
  { id: 'floor-tiles', name: 'Carrelage', price: 80, css: 'repeating-conic-gradient(#ffffff 0 25%, #dfe6ee 0 50%) 0 0 / 24px 24px' },
  { id: 'floor-pink-carpet', name: 'Moquette rose', price: 70, css: '#f3b6c9' },
  { id: 'floor-grass', name: 'Gazon', price: 60, css: 'repeating-linear-gradient(90deg, #8fd17a 0 6px, #84c56f 6px 12px)' },
  { id: 'floor-stone', name: 'Pierre', price: 90, css: 'repeating-linear-gradient(90deg, #b9b3ad 0 34px, #a49e98 34px 36px)' },
];

/** Wall hangings: pure decoration, they make nobody pose. */
export interface WallDeco {
  id: string;
  name: string;
  price: number;
  sprite: Sprite;
  /** CSS class for a little life (twinkling lights, a swinging pendulum). */
  animated?: 'twinkle' | 'sway';
}

export const WALL_DECOS: WallDeco[] = [
  {
    id: 'deco-painting',
    name: 'Tableau de paysage',
    price: 60,
    sprite: {
      pixels: ['ffffffffffff', 'fssssssssssf', 'fssssssyyssf', 'fssgsssyyssf', 'fsgggsssgssf', 'fgggggggggsf', 'fggggggggggf', 'ffffffffffff'],
      colors: { f: '#b07a3e', s: '#a8dcff', y: '#ffd34f', g: '#7cc26a' },
    },
  },
  {
    id: 'deco-clock',
    name: 'Horloge',
    price: 70,
    animated: 'sway',
    sprite: {
      pixels: ['..bbbbbb..', '.bwwwwwwb.', 'bwwwkwwwwb', 'bwwwkwwwwb', 'bwwwkkkwwb', 'bwwwwwwwwb', '.bwwwwwwb.', '..bbbbbb..', '....b.....', '....b.....', '...yyy....'],
      colors: { b: '#8a5a3c', w: '#fffaf0', k: '#3b2a3f', y: '#f6cd4c' },
    },
  },
  {
    id: 'deco-plant',
    name: 'Plante suspendue',
    price: 50,
    sprite: {
      pixels: ['....k.....', '....k.....', '..ttttt...', '.gtttttg..', 'gg.ttt.gg.', 'g..g.g..g.', 'g..g.g..g.', '...g..g...', '...g......'],
      colors: { k: '#8a5a3c', t: '#d9774a', g: '#5aa84a' },
    },
  },
  {
    id: 'deco-garland',
    name: 'Guirlande lumineuse',
    price: 90,
    animated: 'twinkle',
    sprite: {
      pixels: ['k.............k', '.kk.........kk.', '...kkkkkkkkk...', '..y..p..b..y...', '..y..p..b..y...'],
      colors: { k: '#5a4a3a', y: '#ffd34f', p: '#ff7fae', b: '#7fc4e8' },
    },
  },
  {
    id: 'deco-shelf',
    name: 'Étagère à bibelots',
    price: 80,
    sprite: {
      pixels: ['..p...r.bb..', '.ppp.rrrbb..', '.ppp.rrrbb..', 'wwwwwwwwwwww', '.k........k.'],
      colors: { p: '#f48fb1', r: '#7fc4e8', b: '#ffd34f', w: '#a8743f', k: '#7a5030' },
    },
  },
  {
    id: 'deco-star-poster',
    name: 'Affiche étoilée',
    price: 70,
    sprite: {
      pixels: ['nnnnnnnnnn', 'nnnnynnnnn', 'nnnyyynnnn', 'nnnnynnnwn', 'nwnnnnnnnn', 'nnnnnnynnn', 'nnnnnyyynn', 'nnnnnnynnn', 'nnnnnnnnnn'],
      colors: { n: '#2f3a6e', y: '#ffd34f', w: '#ffffff' },
    },
  },
  {
    id: 'deco-heart-mirror',
    name: 'Miroir cœur',
    price: 110,
    sprite: {
      pixels: ['.ppp..ppp.', 'pmmmppmmmp', 'pmwmmmmmmp', 'pmwmmmmmmp', '.pmmmmmmp.', '..pmmmmp..', '...pmmp...', '....pp....'],
      colors: { p: '#e0457b', m: '#cfeaf7', w: '#ffffff' },
    },
  },
  {
    id: 'deco-moon-lamp',
    name: 'Lampe lune',
    price: 130,
    animated: 'twinkle',
    sprite: {
      pixels: ['...yyyy...', '..yyy.....', '.yyy......', '.yyy......', '.yyy......', '..yyy.....', '...yyyy...'],
      colors: { y: '#fff3a0' },
    },
  },
];

export const WALL_DECO_SPOTS = 2;
/** Where the wall decorations hang, as % of the room width. */
export const WALL_DECO_X = [24, 76];

export function wallpaper(id: string | null): Finish | undefined {
  return WALLPAPERS.find((w) => w.id === id);
}

export function floor(id: string | null): Finish | undefined {
  return FLOORS.find((f) => f.id === id);
}

export function wallDeco(id: string | null): WallDeco | undefined {
  return WALL_DECOS.find((d) => d.id === id);
}
