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

/** Wooden planks on the furniture's pixel grid: a seam, a lit edge, staggered joints. */
export function planks(wood: string, seam: string, light: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='22' height='8' shape-rendering='crispEdges'>` +
    `<rect width='22' height='8' fill='${wood}'/>` +
    `<rect width='22' height='1' fill='${seam}'/><rect y='1' width='22' height='1' fill='${light}'/>` +
    `<rect y='4' width='22' height='1' fill='${seam}'/><rect y='5' width='22' height='1' fill='${light}'/>` +
    `<rect y='1' width='1' height='3' fill='${seam}'/><rect x='11' y='5' width='1' height='3' fill='${seam}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 0 0 / 79.2px 28.8px, ${wood}`;
}

export const FLOORS: Finish[] = [
  { id: 'floor-light-wood', name: 'Parquet clair', price: 50, css: planks('#ecd1a6', '#d6b585', '#f6e2c0') },
  { id: 'floor-dark-wood', name: 'Parquet foncé', price: 60, css: planks('#8a5a3c', '#6e4630', '#9c6b4b') },
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
  /** Not for sale: won in a game, hidden from the shop until owned. */
  reward?: true;
}

/** Frame colours: 1 outline, 2 lit edge, 3 wood, 4 shaded edge. */
type FrameColors = Record<'1' | '2' | '3' | '4', string>;

const WOOD_FRAME: FrameColors = { 1: '#5e3b22', 2: '#d9a35f', 3: '#b07a3e', 4: '#8a5a2e' };
const DARK_FRAME: FrameColors = { 1: '#3e2418', 2: '#a8743f', 3: '#8a5a3c', 4: '#6e4630' };
const GOLD_FRAME: FrameColors = { 1: '#6e4a10', 2: '#ffe27a', 3: '#d9a52a', 4: '#a87a18' };

/** A picture in a two-pixel frame, lit from the top left like the furniture. */
function framed(inner: string[], colors: Record<string, string>, frame: FrameColors = WOOD_FRAME): Sprite {
  const width = inner[0].length;
  return {
    pixels: [
      '1'.repeat(width + 6),
      `1${'2'.repeat(width + 4)}1`,
      `12${'3'.repeat(width + 2)}41`,
      ...inner.map((row) => `123${row}341`),
      `12${'3'.repeat(width + 2)}41`,
      `1${'4'.repeat(width + 4)}1`,
      '1'.repeat(width + 6),
    ],
    colors: { ...frame, ...colors },
  };
}

export const WALL_DECOS: WallDeco[] = [
  {
    id: 'deco-painting',
    name: 'Tableau de paysage',
    price: 60,
    sprite: framed(
      ['SSSSSSYyYS', 'SwwSSSyyyS', 'wwwwsSYySs', 'sshhssssss', 'shgghsshhs', 'hggggGhggh', 'gggGgggggG', 'GgggggGggg'],
      { S: '#cdeeff', s: '#a8dcff', w: '#ffffff', y: '#ffd34f', Y: '#fff3a0', h: '#a4dc8c', g: '#7cc26a', G: '#5aa84a' },
    ),
  },
  {
    id: 'deco-clock',
    name: 'Horloge',
    price: 70,
    animated: 'sway',
    sprite: {
      pixels: [
        '...aaaaaa...',
        '..acccccca..',
        '.acbaaaabda.',
        '.acawwWwada.',
        '.acawkwwada.',
        '.acawkkwada.',
        '.acaWwwWada.',
        '.acbaaaabda.',
        '.acbbbbbbda.',
        '.acaaaaaada.',
        '.acaeyeeada.',
        '.acaeyeeada.',
        '.acayyYeada.',
        '.acaeYYeada.',
        '.acaaaaaada.',
        '.acbbbbbbda.',
        '..adddddda..',
        '...aaaaaa...',
      ],
      colors: { a: '#4a2f22', b: '#a8743f', c: '#c99363', d: '#7f5434', w: '#fffaf0', W: '#e8dcc8', k: '#3b2a3f', e: '#6e4630', y: '#f6cd4c', Y: '#c99a2a' },
    },
  },
  {
    id: 'deco-plant',
    name: 'Plante suspendue',
    price: 50,
    sprite: {
      pixels: [
        '......aa......',
        '.....k..k.....',
        '....k....k....',
        '...k......k...',
        '..k.nnnnnn.k..',
        '..knGgGgGgnk..',
        '.ngaaaaaaaagn.',
        'ngGaTTtttuaGgn',
        'ng.aTttttua.gn',
        'nG..aTttua..Gn',
        '.gn.attuua.ng.',
        '.gn..aaaa..gn.',
        'nGgn......ngGn',
        '.ng........gn.',
        '.nGn......nGn.',
        '..n........n..',
      ],
      colors: { a: '#6d3c25', k: '#8a5a3c', t: '#d9774a', T: '#f2a87c', u: '#b85d38', n: '#2d5425', g: '#5aa84a', G: '#7cc26a' },
    },
  },
  {
    id: 'deco-garland',
    name: 'Guirlande lumineuse',
    price: 90,
    animated: 'twinkle',
    sprite: {
      pixels: [
        'k..............k',
        '.kk..........kk.',
        '..ckkk....kkkc..',
        '.yYy..kkkk..gGg.',
        '.oyy..c..c..hgg.',
        '..o..pPpbBb..h..',
        '.....qppebb.....',
        '......q..e......',
      ],
      colors: {
        k: '#5a4a3a', c: '#8a7a6a',
        y: '#ffd34f', Y: '#fff3a0', o: '#d9a020',
        p: '#ff7fae', P: '#ffc0d8', q: '#d0507e',
        b: '#7fc4e8', B: '#cfeefd', e: '#4f94b8',
        g: '#8ee07a', G: '#d0f5c0', h: '#5aa84a',
      },
    },
  },
  {
    id: 'deco-shelf',
    name: 'Étagère à bibelots',
    price: 80,
    sprite: {
      pixels: [
        '..aaa...........',
        '..aPa......aaaaa',
        '.aPppa.aaaaaYyza',
        '.aPppa.aRraaaaaa',
        '.aPpqa.aRsaaMmna',
        '..aqa..aaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aWWWWWWWWWWWWWWa',
        'adddddddddddddda',
        'aaaaaaaaaaaaaaaa',
        '..ada......ada..',
        '...a........a...',
      ],
      colors: {
        a: '#4a2f22', W: '#c99363', d: '#7f5434',
        p: '#f48fb1', P: '#ffd0e0', q: '#c4628a',
        r: '#7fc4e8', R: '#c4e8fa', s: '#4f94b8',
        y: '#ffd34f', Y: '#fff0a0', z: '#e0a020',
        m: '#8ecf7a', M: '#c4eeb0', n: '#5a9e48',
      },
    },
  },
  {
    id: 'deco-star-poster',
    name: 'Affiche étoilée',
    price: 70,
    sprite: {
      pixels: [
        'aaaaaaaaaaaaaa',
        'arNNNNNNNNNNra',
        'aNNNwNNNNNNNNa',
        'aNNNNNNNyNNwNa',
        'aNNNNNNyYyNNNa',
        'aNwNNNNNyNNNNa',
        'annnnnnnnnnnna',
        'annYYnnnnnnnna',
        'anYYnnnnnwnnna',
        'anYYnnnnnnnnna',
        'annYYnnnnynnna',
        'ammmmmmmyYymma',
        'amwmmmmmmymmca',
        'ammmmmmmmmmcca',
        'aaaaaaaaaaaaaa',
      ],
      colors: { a: '#2a2340', r: '#e0457b', N: '#3f4d8a', n: '#2f3a6e', m: '#232b52', y: '#ffd34f', Y: '#fff3a0', w: '#ffffff', c: '#c9c3e0' },
    },
  },
  {
    id: 'deco-heart-mirror',
    name: 'Miroir cœur',
    price: 110,
    sprite: {
      pixels: [
        '..aaaa..aaaa..',
        '.aPPPPaaPPPPa.',
        'aPPMMmPPmmmmpa',
        'aPMwMmmmmmmmpa',
        'aPMwmmmmmmmspa',
        'aPMmmmmmmmmspa',
        '.aPmmmmmmmsqa.',
        '..aPmmmmmsqa..',
        '...aPmmmsqa...',
        '....aPmsqa....',
        '.....aPqa.....',
        '......aa......',
      ],
      colors: { a: '#7a2648', P: '#f48fb1', p: '#e0457b', q: '#b8325f', m: '#cfeaf7', M: '#eaf7fd', s: '#a8cfe3', w: '#ffffff' },
    },
  },
  {
    id: 'deco-moon-lamp',
    name: 'Lampe lune',
    price: 130,
    animated: 'twinkle',
    sprite: {
      pixels: [
        '.....k......',
        '.....k......',
        '...aaaaa....',
        '..aYYyyaa...',
        '.aYyyaa.....',
        '.aYya.....s.',
        'aYyya....sSs',
        'aYyoa.....s.',
        'aYyoa.......',
        'aYyoa.......',
        '.aYyoa......',
        '.aYyyoaa....',
        '..ayyyooaa..',
        '...aaooooaa.',
        '.....aaaa...',
      ],
      colors: { k: '#5a4a3a', a: '#b8902a', Y: '#ffffff', y: '#fff3a0', o: '#f6d860', s: '#ffd34f', S: '#fff9d0' },
    },
  },
  {
    id: 'deco-ginkgo-frame',
    name: 'Ginkgo encadré',
    price: 0,
    reward: true,
    sprite: framed(
      ['cccccccccc', 'YyYyycyYyo', 'cYoyyyyoyc', 'cYyoyyoyoc', 'ccYyyyyocc', 'cccYyyoccc', 'ccccyocccc', 'ccccbccccc', 'cccccbcccc', 'ccccccbccC'],
      { c: '#fff6e0', C: '#f0e2c0', y: '#ffd23f', Y: '#fff09a', o: '#e0a820', b: '#9a7a3a' },
      DARK_FRAME,
    ),
  },
  {
    id: 'deco-maple-wreath',
    name: 'Couronne d’érable',
    price: 0,
    reward: true,
    sprite: {
      pixels: [
        '....aaaaaa....',
        '..aaRroOrRaa..',
        '.aRrdaaaaoOra.',
        '.aOoa....adRa.',
        'aroa......aoRa',
        'aOda......arra',
        'aRra......adoa',
        'aoRa......aRra',
        'adra......aoOa',
        '.aoRa....aRda.',
        '.araPPaaPPaRa.',
        '..aapqPPqpaa..',
        '....aaqqaa....',
        '....aq..qa....',
        '....aa..aa....',
      ],
      colors: { a: '#6e2a1a', r: '#e8322a', R: '#ff6a4a', d: '#b8221a', o: '#f09a3c', O: '#ffc070', p: '#ff7fae', P: '#ffc0d8', q: '#d0507e' },
    },
  },
  {
    id: 'deco-apple-basket',
    name: 'Panier de pommes',
    price: 0,
    reward: true,
    sprite: {
      pixels: [
        '....aaaaaa....',
        '...abaaaaba...',
        '..aba....aba..',
        '..ab.akga.ba..',
        '.aRRaRRrraRRa.',
        '.aRrdRrrdRrda.',
        'aaaaaaaaaaaaaa',
        'aBBBBBBBBBBBBa',
        'abwbwbwbwbwbwa',
        '.abbbbbbbbbba.',
        '.awbwbwbwbwba.',
        '..aaaaaaaaaa..',
      ],
      colors: { a: '#4a2f22', b: '#c4893a', B: '#e0aa5a', w: '#8a5a2e', r: '#e04848', R: '#ff8a7a', d: '#a82828', g: '#5aa84a', k: '#6e4630' },
    },
  },
  {
    id: 'deco-fountain-print',
    name: 'Gravure de fontaine',
    price: 0,
    reward: true,
    sprite: framed(
      ['ssssUUssss', 'ssUuuuuUss', 'sUsGGGGsUs', 'usseggessu', 'usssggsssu', 'GGGGGGGGGG', 'eUuuUuuuUe', 'eeeeeeeeee'],
      { s: '#f6e3c4', g: '#9a9aa8', G: '#c8c8d4', e: '#6e6e80', u: '#5ab4e8', U: '#bfe6fb' },
    ),
  },
  {
    id: 'deco-bench-heart',
    name: 'Cœur gravé',
    price: 0,
    reward: true,
    sprite: {
      pixels: [
        'aaaaaaaaaaaaaaaa',
        'aWWWWWWWWWWWWWWa',
        'awgwwqqwqqwwgwda',
        'awwwqPpqppqgwwda',
        'awgwqPppppqwwwda',
        'awwwwqpppqwwgwda',
        'agwwwwqpqwwwwwda',
        'awwwwwwqwwwwwgda',
        'adddddddddddddda',
        'aaaaaaaaaaaaaaaa',
      ],
      colors: { a: '#4a2f22', w: '#a8743f', W: '#c99363', d: '#7f5434', g: '#946338', p: '#e0457b', P: '#ff8fb8', q: '#a82858' },
    },
  },
  {
    id: 'deco-autumn-garland',
    name: 'Guirlande d’automne',
    price: 0,
    animated: 'sway',
    reward: true,
    sprite: {
      pixels: [
        'k..............k',
        '.kk..........kk.',
        '..rkkk....kkkv..',
        '.rRr..kkkk..vVv.',
        '.rrd..o..y..vve.',
        '..d..oOoyYy..e..',
        '.....ooqyyz.....',
        '......q..z......',
      ],
      colors: {
        k: '#5a4a3a',
        r: '#e8322a', R: '#ff7a5a', d: '#b8221a',
        o: '#f09a3c', O: '#ffc070', q: '#c87020',
        y: '#ffd23f', Y: '#fff09a', z: '#d0a020',
        v: '#8e5ad8', V: '#c09af0', e: '#6a3aa8',
      },
    },
  },
  {
    id: 'deco-herbarium-book',
    name: 'Herbier relié',
    price: 0,
    reward: true,
    sprite: {
      pixels: [
        'aaaaaaaaaaaaa..',
        'aSaBBBBBBBBBaa.',
        'acabbbbbbbbbapa',
        'aSabaaaaaaabapa',
        'aSabappRppabapa',
        'aSabapRrrpabapa',
        'aSabapRrdpabapa',
        'aSabappkppabapa',
        'aSabapkpppabapa',
        'aSabaaaaaaabapa',
        'acabbbbbbbbbapa',
        'aSabbbbbbbbbapa',
        'aaaaaaaaaaaaapa',
        '.appppppppppppa',
        '..aaaaaaaaaaaaa',
      ],
      colors: { a: '#3e1e14', b: '#7a3e2a', B: '#9a5a3e', S: '#5a2a1a', c: '#d9a52a', p: '#fff3d6', r: '#e8322a', R: '#ff6a4a', d: '#b8221a', k: '#8a5a2a' },
    },
  },
  {
    id: 'deco-rainbow-leaf',
    name: 'Feuille arc-en-ciel encadrée',
    price: 0,
    reward: true,
    animated: 'twinkle',
    sprite: framed(
      ['cccccccccc', 'ccccccrrcc', 'cccccrroyc', 'ccccooyygc', 'cccoyyggbc', 'ccoyggbbcc', 'ccgbbvvccc', 'cckvvccccc', 'ckcccccccc', 'cccccccccc'],
      { c: '#fffaf0', r: '#ff5a5a', o: '#ffa64d', y: '#ffe14a', g: '#6fd17a', b: '#5ab4ff', v: '#a77bff', k: '#8a5a2a' },
      GOLD_FRAME,
    ),
  },
  {
    id: 'deco-treasure-shelf',
    name: 'Vitrine de trouvailles',
    price: 0,
    reward: true,
    sprite: {
      pixels: [
        '.aaaaaaaaaaaa.',
        'aWWWWWWWWWWWWa',
        'awaaaaaaaaaada',
        'awaGgggkgggada',
        'awagyYgRrBbada',
        'awagYygrdbbada',
        'awaWWWWWWWWada',
        'awaGgggggpgada',
        'awagOOggpPpada',
        'awagoohggngada',
        'awaaaaaaaaaada',
        'awwwwwwwwwwwda',
        'adddddddddddda',
        'aaaaaaaaaaaaaa',
      ],
      colors: {
        a: '#3e2418', w: '#8a5a3c', W: '#a8743f', d: '#6e4630',
        g: '#d8eef5', G: '#ffffff', h: '#b8d8e4',
        y: '#ffd23f', Y: '#fff09a', r: '#e04848', R: '#ff8a7a', k: '#6e4630',
        b: '#5ab4ff', B: '#c4e8ff', o: '#c98a4a', O: '#7a5030', p: '#ff7fae', P: '#ffd0e0', n: '#5aa84a',
      },
    },
  },
  {
    id: 'deco-critter-portrait',
    name: 'Portrait des petites bêtes',
    price: 0,
    reward: true,
    sprite: framed(
      ['SSSSSSSSSS', 'sosossbsbs', 'sOoossBbbs', 'seoessebes', 'sOOossBBbs', 'gooogggbbg', 'gGgggGgggG', 'GgGgGgGggg'],
      { S: '#e6f4ff', s: '#cfe8ff', o: '#e8763a', O: '#ffa86a', e: '#3b2a3f', b: '#8a6a4a', B: '#b08a68', g: '#7cc26a', G: '#5aa84a' },
    ),
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
