import { spriteCanvas, type Sprite } from './houseArt';
import type { IngredientId } from './houseData';

// -----------------------------------------------
// INGREDIENT ICONS
// -----------------------------------------------
// 9 by 9 pixel art, same convention as the furniture: '.' is transparent.

const FOOD_ART: Record<IngredientId, Sprite> = {
  carrot: {
    pixels: ['....g.g..', '.....g...', '...ooo...', '...ooo...', '...odo...', '....oo...', '....o....', '....o....', '.........'],
    colors: { g: '#5f9e57', o: '#f08a4b', d: '#d9772f' },
  },
  wheat: {
    pixels: ['....y....', '...yyy...', '..y.y.y..', '...yyy...', '..y.y.y..', '...yyy...', '....b....', '....b....', '....b....'],
    colors: { y: '#e8c56a', b: '#b8964a' },
  },
  mint: {
    pixels: ['...g.g...', '..ggggg..', '.gglglgg.', '..ggggg..', '.gglglgg.', '..ggggg..', '....b....', '....b....', '.........'],
    colors: { g: '#5fc58f', l: '#a8e8c5', b: '#3f8a5c' },
  },
  basil: {
    pixels: ['....g....', '...ggg...', '..ggggg..', '.gggggggg', '.ggglggg.', '..ggggg..', '...gbg...', '....b....', '....b....'],
    colors: { g: '#3fa34d', l: '#8fd39a', b: '#2f6e3a' },
  },
  thyme: {
    pixels: ['.g..g..g.', 'ggg.g.ggg', '.g.ggg.g.', '.gg.g.gg.', '..ggggg..', '...ggg...', '....b....', '....b....', '.........'],
    colors: { g: '#8fae6b', b: '#5f7a45' },
  },
  tomato: {
    pixels: ['...ggg...', '..gg.gg..', '.rrrrrrr.', 'rrwrrrrrr', 'rrrrrrrrr', 'rrrrrrrdr', '.rrrrrdr.', '..rrrrr..', '.........'],
    colors: { g: '#5f9e57', r: '#e0475b', w: '#ffb3bd', d: '#b8303f' },
  },
  strawberry: {
    pixels: ['..ggggg..', '.rrrrrrr.', 'rryrrryrr', 'rrrrrrrrr', '.ryrrryr.', '.rrrrrrr.', '..ryrrr..', '...rrr...', '....r....'],
    colors: { g: '#5f9e57', r: '#ff5d8f', y: '#ffe08a' },
  },
  blackberry: {
    pixels: ['....g....', '...ggg...', '..ppppp..', '.ppppppp.', '.plppppp.', '.ppppppp.', '..ppppp..', '...ppp...', '.........'],
    colors: { g: '#5f9e57', p: '#5b3a78', l: '#9a7ab8' },
  },
  lemon: {
    pixels: ['.....g...', '....gg...', '..yyyyy..', '.yywyyyy.', 'yyyyyyyyy', '.yyyyyyy.', '..yyyyy..', '.........', '.........'],
    colors: { g: '#5f9e57', y: '#ffd23f', w: '#fff3b0' },
  },
  pumpkin: {
    pixels: ['....b....', '....b....', '..ooooo..', '.odooodo.', 'oodoooodo', 'oodoooodo', '.odooodo.', '..ooooo..', '.........'],
    colors: { b: '#5f9e57', o: '#f6923a', d: '#d9772f' },
  },
  mandarin: {
    pixels: ['....gg...', '...g.....', '..ooooo..', '.oowoooo.', 'ooooooooo', 'ooooooooo', '.ooooooo.', '..ooooo..', '.........'],
    colors: { g: '#5f9e57', o: '#ff9f2e', w: '#ffd6a0' },
  },
  moonflower: {
    pixels: ['...lll...', '..lwwwl..', '.lwwywwl.', '.lwyyywl.', '.lwwywwl.', '..lwwwl..', '...lll...', '....g....', '...ggg...'],
    colors: { l: '#c9c3ff', w: '#f1efff', y: '#ffe08a', g: '#5f9e57' },
  },
  goldenApple: {
    pixels: ['....b.g..', '....bgg..', '..yyyyy..', '.yywyyyy.', 'yyyyyyyyy', 'yyyyyyyoy', '.yyyyyoy.', '..yyyyy..', '.........'],
    colors: { b: '#8b5e4a', g: '#5f9e57', y: '#f2c94c', w: '#fff3b0', o: '#d9a020' },
  },
  sugar: {
    pixels: ['.........', '.kkkkkkk.', '.kwwwwwk.', '.kwswwwk.', '.kwwwwwk.', '.kwwwswk.', '.kwwwwwk.', '.kkkkkkk.', '.........'],
    colors: { w: '#ffffff', k: '#b9aea2', s: '#e4dbd1' },
  },
  eggs: {
    pixels: ['.........', '...ww....', '..wwww...', '..wwwww..', '.wwwwww..', '.wwwwwwe.', '..wwwwee.', '....eeee.', '.........'],
    colors: { w: '#f6dfae', e: '#fff3dc' },
  },
  milk: {
    pixels: ['...bbb...', '...bbb...', '..wwwww..', '..wbbbw..', '..wbbbw..', '..wwwww..', '..wwwww..', '..wwwww..', '.........'],
    colors: { w: '#f4f8fb', b: '#8fb8f0' },
  },
  butter: {
    pixels: ['.........', '.........', '..yyyyyy.', '.yyyyyyy.', '.ylyyyyy.', '.yyyyyyy.', '.ddddddd.', '.........', '.........'],
    colors: { y: '#f7e27a', l: '#fff6b8', d: '#d9b84a' },
  },
  pasta: {
    pixels: ['.........', 'y.y.y.y.y', 'yyyyyyyyy', '.y.y.y.y.', 'yyyyyyyyy', 'y.y.y.y.y', 'yyyyyyyyy', '.y.y.y.y.', '.........'],
    colors: { y: '#eccb7c' },
  },
  rice: {
    pixels: ['.........', '.........', '..w.ww.w.', '.wwwwwwww', 'bwwwwwwwb', 'bbbbbbbbb', '.bbbbbbb.', '..bbbbb..', '.........'],
    colors: { w: '#f2efe4', b: '#e07a9a' },
  },
  cheese: {
    pixels: ['.........', '......yy.', '....yyyy.', '..yyyyyy.', 'yyyoyyyy.', 'yyyyyyoy.', 'yoyyyyyy.', 'yyyyyyyy.', '.........'],
    colors: { y: '#f5c542', o: '#d9a020' },
  },
  chocolate: {
    pixels: ['.........', '.bbbbbbb.', '.bcbcbcb.', '.bbbbbbb.', '.bcbcbcb.', '.bbbbbbb.', '.bcbcbcb.', '.bbbbbbb.', '.........'],
    colors: { b: '#6b3e26', c: '#8a5a3b' },
  },
  vanilla: {
    pixels: ['.......w.', '......ww.', '.....bw..', '....bb...', '...bb....', '..bb.....', '.bb......', '.b.......', '.........'],
    colors: { b: '#4a2e1f', w: '#f4f1d8' },
  },
  spice: {
    pixels: ['...ccc...', '..c.c.c..', '...ccc...', '.........', '.rrr..rr.', 'rrrrrrrr.', '.rr.rrrr.', '..rrr.r..', '.........'],
    colors: { c: '#8b5e4a', r: '#c8642d' },
  },
  honey: {
    pixels: ['..bbbbb..', '...bbb...', '..yyyyy..', '.yyyyyyy.', '.yylyyyy.', '.yyyyyyy.', '.yyyyyyy.', '..yyyyy..', '.........'],
    colors: { b: '#a8743f', y: '#f2a516', l: '#ffe08a' },
  },
  mushroom: {
    pixels: ['.........', '..rrrrr..', '.rrwrrwr.', 'rrrrrrrrr', 'rwrrrrwrr', '...www...', '...www...', '...www...', '.........'],
    colors: { r: '#a1774f', w: '#f4ead8' },
  },
  hazelnut: {
    pixels: ['....b....', '...ggg...', '..bbbbb..', '.bblbbbb.', '.bbbbbbb.', '.bbbbbbb.', '..bbbbb..', '...bbb...', '.........'],
    colors: { b: '#9c6b3c', l: '#c99a6a', g: '#c8b98a' },
  },
  frostflower: {
    pixels: ['....w....', '.w..b..w.', '..wbbbw..', '..bbwbb..', 'wbbwwwbbw', '..bbwbb..', '..wbbbw..', '.w..b..w.', '....w....'],
    colors: { w: '#ffffff', b: '#a8dcf0' },
  },
};

/** A pixel icon for an ingredient, `size` CSS pixels wide. */
export function foodIcon(id: IngredientId, size = 32): HTMLCanvasElement {
  const canvas = spriteCanvas(FOOD_ART[id], size / 9);
  canvas.classList.add('house-food');
  return canvas;
}
