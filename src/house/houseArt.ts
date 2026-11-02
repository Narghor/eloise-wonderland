import { el } from '../dom';
import type { FurnitureId } from './houseData';

// -----------------------------------------------
// FURNITURE PIXEL ART
// -----------------------------------------------
// Same convention as the companion catalog: one character per pixel, '.' is transparent.

export interface Sprite {
  pixels: string[];
  colors: Record<string, string>;
}

/** CSS pixels per sprite pixel: the companion's scale, so furniture and visitors match. */
export const PIXEL = 3.6;

export const FURNITURE_ART: Record<FurnitureId, Sprite> = {
  cushion: {
    pixels: ['...pppppppppp...', '.pppppppppppppp.', 'ppplpppppppplppp', 'pppppppppppppppp', '.dddddddddddddd.'],
    colors: { p: '#f7a6c1', l: '#ffd6e4', d: '#e0809f' },
  },
  armchair: {
    pixels: [
      '..rrrrrrrrrrrr..',
      '.rrrrrrrrrrrrrr.',
      '.rrlllllllllllr.',
      '.rrlllllllllllr.',
      '.rrlllllllllllr.',
      'rrrrrrrrrrrrrrrr',
      'rrllllllllllllrr',
      'rrllllllllllllrr',
      'rrrrrrrrrrrrrrrr',
      '.d............d.',
      '.d............d.',
    ],
    colors: { r: '#7a5cb8', l: '#a98be0', d: '#6b4e3d' },
  },
  rug: {
    pixels: ['....yyyyyyyyyyyyyyyy....', '..yyppyyppyyppyyppyyyy..', '.yppyyppyyppyyppyyppyyy.', '..yyppyyppyyppyyppyyyy..', '....yyyyyyyyyyyyyyyy....'],
    colors: { y: '#ffe08a', p: '#ff9ec7' },
  },
  piano: {
    pixels: [
      'kkkkkkkkkkkkkkkkkkkk',
      'kkkkkkkkkkkkkkkkkkkk',
      'kkyykkkkkkkkkkkkyykk',
      'kkkkkkkkkkkkkkkkkkkk',
      'kkkkkkkkkkkkkkkkkkkk',
      'kkkkkkkkkkkkkkkkkkkk',
      'wkwkwwkwkwkwwkwkwkww',
      'wkwkwwkwkwkwwkwkwkww',
      'wwwwwwwwwwwwwwwwwwww',
      'kkkkkkkkkkkkkkkkkkkk',
      'kkkkkkkkkkkkkkkkkkkk',
      'kk..............kk..',
      'kk..............kk..',
      'kk..............kk..',
    ],
    colors: { k: '#3b2a3f', w: '#ffffff', y: '#f6cd4c' },
  },
  table: {
    pixels: [
      'wwwwwwwwwwwwwwwwwwww',
      'wpwwwpwwwpwwwpwwwpww',
      'wwwwwwwwwwwwwwwwwwww',
      'pwppwpwppwpwppwpwppw',
      '.bb..............bb.',
      '.bb..............bb.',
      '.bb..............bb.',
      '.bb..............bb.',
    ],
    colors: { w: '#ffffff', p: '#f7a6c1', b: '#a8743f' },
  },
  pot: {
    pixels: [
      '..s.s.s..s.s..',
      '.s.s.s..s.s...',
      '..kkkkkkkkkk..',
      'kkrrrrrrrrrrkk',
      '.krrrrrrrrrrk.',
      '.krrrrrrrrrrk.',
      '..kkkkkkkkkk..',
      'gggggggggggggg',
      'googgggggggoog',
      'gggggggggggggg',
      'g............g',
    ],
    colors: { k: '#4a4a52', r: '#e0605e', s: '#d9d9e3', g: '#8a8a96', o: '#f6923a' },
  },
  flowerbed: {
    pixels: [
      '.p...y....p...y...p...',
      'pyp.yry..pyp.yry.pyp..',
      '.p...y....p...y...p...',
      '.g...g....g...g...g...',
      '.g..gg...gg...g..gg...',
      'gggggggggggggggggggggg',
      'bbbbbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbb',
    ],
    colors: { p: '#ff9ec7', y: '#ffe08a', r: '#e0605e', g: '#5f9e57', b: '#8b5e4a' },
  },
  swing: {
    pixels: [
      'bbbbbbbbbbbbbbbb',
      'b..r........r..b',
      'b..r........r..b',
      'b..r........r..b',
      'b..r........r..b',
      'b..r........r..b',
      'b..r........r..b',
      'b..r........r..b',
      'b..r........r..b',
      'b.yyyyyyyyyyyy.b',
      'b..............b',
      'b..............b',
      'b..............b',
      'b..............b',
    ],
    colors: { b: '#a8743f', r: '#d9b48a', y: '#e0605e' },
  },
  pond: {
    pixels: ['.....ssssssssssssss.....', '..sswwbbbbbbbbbbbbwwss..', '.sbbbbbbgbbbbbbbbbbbbbs.', '..ssbbbbbbbbbbbbbbbbss..', '.....ssssssssssssss.....'],
    colors: { s: '#b9b0a0', b: '#5fb3e4', w: '#cfeaff', g: '#5f9e57' },
  },
  bed: {
    pixels: [
      'bb......................',
      'bbww....................',
      'bbwwwwpppppppppppppppppp',
      'bbwwwwpppppppppppppppppp',
      'bbllllpplpppplpppplppppb',
      'bbpppppppppppppppppppppb',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'bb....................bb',
    ],
    colors: { b: '#a8743f', w: '#ffffff', p: '#c3a6f0', l: '#e6dcff' },
  },
  mirror: {
    pixels: [
      '...yyyy...',
      '.yyccccyy.',
      'yccwccccy.',
      'ycwccccccy',
      'yccccccccy',
      'yccccccccy',
      'yccccccccy',
      'yccccccwcy',
      '.yccccccy.',
      '..yyyyyy..',
      '....yy....',
      '....yy....',
      '..yyyyyy..',
    ],
    colors: { y: '#d9b44a', c: '#cfe9ff', w: '#ffffff' },
  },
  desk: {
    pixels: [
      '..........rrrb......',
      '..........rrrb..ll..',
      '....ggggg.rrrb..ll..',
      'bbbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbb',
      'b.dddd...........d.b',
      'b.dddd...........d.b',
      'b..................b',
      'b..................b',
    ],
    colors: { b: '#8b5e4a', d: '#a8743f', r: '#c25b7a', g: '#f6f4fb', l: '#ffe36e' },
  },
  telescope: {
    pixels: [
      '..........kk..',
      '........kkbk..',
      '......kkbbk...',
      '....kkbbbk....',
      '..kkbbbk......',
      '.kbbbk........',
      '..kkk.........',
      '.....k........',
      '....k.k.......',
      '...k...k......',
      '..k.....k.....',
    ],
    colors: { k: '#3b2a3f', b: '#5b6fb8' },
  },
  wateringCan: {
    pixels: [
      '.....ggg......',
      '....g...g.....',
      '..ggggggggg..s',
      '..gllllllgg.s.',
      '..gllllllggs..',
      '..gggggggggs..',
      '..ggggggggg...',
      '..ggggggggg...',
      '...ggggggg....',
    ],
    colors: { g: '#5fa8d3', l: '#9fd1ee', s: '#4a8bb4' },
  },
  hammock: {
    pixels: [
      'b......................b',
      'b......................b',
      'br....................rb',
      'b.r..................r.b',
      'b..ppppppppppppppppppp.b',
      'b...pyyppyyppyyppyypp..b',
      'b....ppppppppppppppp...b',
      'b......................b',
      'b......................b',
      'bb....................bb',
    ],
    colors: { b: '#a8743f', r: '#d9b48a', p: '#ff9ec7', y: '#ffe08a' },
  },
  teaTable: {
    pixels: [
      '......ww..........',
      '.....wwww.........',
      '....pwwwwp..cc....',
      '.....wwww...cc....',
      'tttttttttttttttttt',
      'tpttptttpttptttptt',
      '........bb........',
      '........bb........',
      '........bb........',
      '......bbbbbb......',
    ],
    colors: { w: '#ffffff', p: '#f48fb1', c: '#f6dfae', t: '#fff4f8', b: '#a8743f' },
  },
  cakeStand: {
    pixels: [
      '....ppppp....',
      '...pwwwwwp...',
      '...pppppppp..',
      '......g......',
      '..yyyyyyyyy..',
      '.yrryyrryyry.',
      '.yyyyyyyyyyy.',
      '......g......',
      '......g......',
      '.ggggggggggg.',
      '......g......',
      '......g......',
      '....ggggg....',
    ],
    colors: { p: '#ff9ec7', w: '#ffffff', y: '#f6dfae', r: '#e0605e', g: '#d9b44a' },
  },
};

/** A plant on its way up: a sprout first, then leaves; the ripe plant shows its food icon. */
export const GROWTH_ART: Record<'sprout' | 'leaves', Sprite> = {
  sprout: {
    pixels: ['.g...g.', 'ggg.ggg', '.g.g.g.', '...g...', '...g...'],
    colors: { g: '#6dbf5a' },
  },
  leaves: {
    pixels: ['...g.....', '..ggg.g..', '.gglggggg', 'ggggglgg.', '.gglggg..', '..gggg...', '...gg....', '....g....', '....g....'],
    colors: { g: '#5fa84f', l: '#9fd88a' },
  },
};

/** A drawn coin: the coin emoji shows as an empty box on some computers. */
export function coinIcon(): HTMLElement {
  return el('span', { class: 'house-coin', 'aria-label': 'pièces' });
}

export function spriteCanvas(sprite: Sprite, pixel = PIXEL): HTMLCanvasElement {
  const width = Math.max(...sprite.pixels.map((row) => row.length));
  const canvas = el('canvas', { class: 'house-sprite' });
  canvas.width = width;
  canvas.height = sprite.pixels.length;
  canvas.style.width = `${width * pixel}px`;
  canvas.style.height = `${sprite.pixels.length * pixel}px`;
  const context = canvas.getContext('2d')!;
  sprite.pixels.forEach((row, y) => {
    [...row].forEach((char, x) => {
      const color = sprite.colors[char];
      if (!color) return;
      context.fillStyle = color;
      context.fillRect(x, y, 1, 1);
    });
  });
  return canvas;
}
