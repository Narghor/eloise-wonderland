import { C, COOKIE, OUTLINE, RIDGES, type Painter, type PixelMap } from './farmPaint';

// -----------------------------------------------
// LOT 2 CROPS AND ITEM ICONS (docs/ferme.md 18)
// -----------------------------------------------
// Drawn like lot 1's (farmArt.ts: CROP_PAINT, ITEM_MAPS); farmArt merges these tables into its own.

export type Lot2Crop = 'beet' | 'blueberry' | 'lavender';

export type Lot2Item =
  | Lot2Crop
  | 'sheepFeed' | 'pigFeed' | 'beeFeed' | 'goatFeed' | 'duckFeed' | 'rabbitFeed'
  | 'wool' | 'truffle' | 'honey' | 'goatMilk' | 'feather' | 'angora'
  | 'sugar' | 'carrotJuice' | 'tomatoJuice' | 'strawberryJuice' | 'strawberryJam' | 'blueberryJam'
  | 'yarn' | 'angoraYarn' | 'honeyCandy' | 'lollipop' | 'nougat' | 'giftBasket'
  | 'goatCheese' | 'blueberryPie' | 'pizza' | 'layerCake'
  | 'scarf' | 'cushion' | 'sweater' | 'plushie'
  | 'strawberryIce' | 'honeyIce' | 'blueberryIce' | 'lavenderSoap' | 'honeyCandle'
  | 'crepe' | 'jamCrepe' | 'honeyCrepe' | 'truffleGalette'
  | 'apple' | 'cherry' | 'appleJuice' | 'applePie' | 'cherryJam' | 'cherryIce';

const BEET = { light: '#d45a84', base: '#a8325a', dark: '#7a2244', stem: '#c0406a' };
const BERRY = { light: '#8fb0ee', base: '#4f6fc0', dark: '#34488a' };
const LAVENDER = { light: '#c9b0f0', base: '#9b7fd0', dark: '#7458b0', stem: '#8fae7a', stemDark: '#6e8e5e' };
const HONEY = { light: '#ffe08a', base: '#f2b632', dark: '#c98a1a' };

/** The plants of a field at 'growing' (ripe false) and 'ripe' (ripe true); sprouts are shared. */
export const LOT2_CROP_PAINT: Record<Lot2Crop, (P: Painter, ripe: boolean) => void> = {
  beet(P, ripe) {
    for (const yc of RIDGES) for (const xc of [3, 10]) {
      P.foot?.(yc);
      P.px(xc, yc - 1, BEET.stem);
      P.px(xc - 1, yc - 2, C.leaf);
      P.px(xc + 1, yc - 2, C.leafDark);
      P.px(xc - 2, yc - 3, C.leafLight);
      P.px(xc, yc - 3, C.leaf);
      P.px(xc + 2, yc - 3, C.leaf);
      P.px(xc, yc - 4, C.leafPale);
      if (ripe) {
        P.px(xc - 1, yc - 4, C.leafLight);
        P.px(xc + 1, yc - 4, C.leaf);
        P.px(xc - 2, yc - 4, C.leaf);
        P.px(xc + 2, yc - 4, C.leafLight);
        P.rect(xc - 1, yc - 1, 3, 2, BEET.base);
        P.px(xc - 1, yc - 1, BEET.light);
        P.px(xc + 1, yc, BEET.dark);
      }
    }
  },
  blueberry(P, ripe) {
    for (const yc of [13, 20]) for (const xc of [3, 10]) {
      P.foot?.(yc);
      P.px(xc, yc, C.barkDark);
      P.ellipse(xc, yc - 3, 2, 2, C.leafDark);
      P.px(xc - 1, yc - 4, C.leaf);
      P.px(xc, yc - 5, C.leafLight);
      P.px(xc + 1, yc - 3, C.leaf);
      P.px(xc - 2, yc - 2, C.leaf);
      if (ripe) {
        P.px(xc - 1, yc - 2, BERRY.base);
        P.px(xc + 1, yc - 4, BERRY.base);
        P.px(xc + 2, yc - 2, BERRY.dark);
        P.px(xc, yc - 1, BERRY.base);
        P.px(xc - 2, yc - 4, BERRY.light);
      } else {
        P.px(xc - 1, yc - 2, C.white);
        P.px(xc + 1, yc - 4, '#d8ecb0');
      }
    }
  },
  lavender(P, ripe) {
    for (const yc of RIDGES) for (const xc of [2, 6, 10]) {
      P.foot?.(yc);
      P.px(xc, yc, LAVENDER.stemDark);
      P.px(xc + 1, yc, LAVENDER.stem);
      P.px(xc + 2, yc, LAVENDER.stemDark);
      const h = ripe ? 6 : 3;
      P.line(xc + 1, yc - 1, xc + 1, yc - h, LAVENDER.stem);
      P.px(xc, yc - 1, LAVENDER.stem);
      P.px(xc + 2, yc - 2, LAVENDER.stemDark);
      if (ripe) {
        P.px(xc + 1, yc - 7, LAVENDER.light);
        P.px(xc + 1, yc - 6, LAVENDER.base);
        P.px(xc + 1, yc - 5, LAVENDER.light);
        P.px(xc + 1, yc - 4, LAVENDER.dark);
        P.px(xc, yc - 5, LAVENDER.base);
        P.px(xc + 2, yc - 4, LAVENDER.base);
      } else {
        P.px(xc + 1, yc - 4, '#b8cfa8');
      }
    }
  },
};

/** Colours of the grains that burst out of a field when it is picked (farmScene). */
export const LOT2_CROP_COLOURS: Record<Lot2Crop, string[]> = {
  beet: [BEET.base, BEET.light, '#7cc456'],
  blueberry: [BERRY.base, BERRY.light, '#7cc456'],
  lavender: [LAVENDER.base, LAVENDER.light, '#a6c48f'],
};

// -----------------------------------------------
// SHARED SHAPES
// -----------------------------------------------

/** A round cookie with its animal's head iced on it, like lot 1's chickenFeed. */
const COOKIE_PAL = { a: COOKIE.dark, b: COOKIE.base, c: COOKIE.chip, w: '#ffffff', k: OUTLINE };

/** A glass bottle of juice with a label showing its fruit (f) and a leaf (e). */
function juice(base: string, dark: string, fruit: string): PixelMap {
  return {
    rows: ['..ccc..', '..gjg..', '.gjjjg.', 'ghjjjjg', 'gjwewjg', 'gjwfwdg', 'gjwwwdg', 'gjjjjdg', '.ggggg.'],
    pal: { c: '#c38a55', g: '#d4e6ef', h: '#ffffff', j: base, d: dark, w: '#fffaf2', f: fruit, e: '#5aa54a' },
  };
}

/** A jar of jam under a gingham cloth (m, l) tied with a string. */
function jam(base: string, light: string, dark: string, check: string): PixelMap {
  return {
    rows: ['.mlmlmlm.', 'mlmlmlmlm', '.sssssss.', '.jhjjjjd.', '.jhwwwjd.', '.jhwfwjd.', '.jjwwwjd.', '.jjjjjdd.', '..ddddd..'],
    pal: { m: check, l: '#fffaf2', s: '#c38a55', j: base, h: light, d: dark, w: '#fffaf2', f: base },
  };
}

const CONE = ['.cwcwc.', '.wcwcw.', '..cwc..', '..wcw..', '...c...'];
const CONE_PAL = { c: '#ecbd78', w: '#c98a3f' };

/** An ice cream cone: `scoop` rows above the waffle cone. */
function ice(scoop: string[], pal: Record<string, string>): PixelMap {
  return { rows: [...scoop, ...CONE], pal: { ...CONE_PAL, ...pal } };
}

/** A crepe folded in four (a fan) on a plate; `topping` pixels [x, y, letter] are laid over it. */
function foldedCrepe(topping: [number, number, string][], pal: Record<string, string>): PixelMap {
  const rows = ['eee.......', 'eccce.....', 'ecccce....', 'eccccce...', 'ecccccce..', 'ecccccce..', 'eccccccce.'].map((r) => [...r]);
  for (const [x, y, ch] of topping) rows[y][x] = ch;
  return {
    rows: [...rows.map((r) => r.join('')), 'pppppppppp', '.qqqqqqqq.'],
    pal: { e: '#d9963f', c: '#f5cf88', p: '#e8eef4', q: '#b9c8d6', ...pal },
  };
}

export const LOT2_ITEM_MAPS: Record<Lot2Item, PixelMap> = {
  // Crops
  beet: {
    rows: ['.l..a..l.', '..l.a.l..', '...aaa...', '...sss...', '.cdcccce.', '.cdcccce.', '..cccee..', '...cee...', '....e....'],
    pal: { a: C.leaf, l: C.leafLight, s: BEET.stem, c: BEET.base, d: BEET.light, e: BEET.dark },
  },
  blueberry: {
    rows: ['......al.', '.....aa..', '.bb...bb.', 'bcbb.bcbb', 'bbkd.bbkd', '.dd...dd.', '...bbb...', '..bcbbb..', '..bbkbd..', '...ddd...'],
    pal: { a: C.leaf, l: C.leafLight, b: BERRY.base, c: BERRY.light, d: BERRY.dark, k: '#2a3870' },
  },
  lavender: {
    rows: ['....q....', '.q..qp.q.', '.qp.pr.qp', '.pr.qp.pr', '.qp.pr.qp', '.pr.qp.pr', '..g.g..g.', '...ggg...', '....g....', '....g....'],
    pal: { q: LAVENDER.light, p: LAVENDER.base, r: LAVENDER.dark, g: LAVENDER.stemDark },
  },

  // Feeds
  sheepFeed: {
    rows: ['..aaaaa..', '.awvwvwa.', 'awwvwvwwa', 'aewfffwea', 'abwkfkwba', 'abbfffbba', 'abcbbbcba', '.abbcbba.', '..aaaaa..'],
    pal: { ...COOKIE_PAL, v: '#e8e0d2', f: '#8a7a78', e: '#6e5c5a' },
  },
  pigFeed: {
    rows: ['..aaaaa..', '.apbbbpa.', 'abpppppba', 'abpkpkpba', 'abpnsnpba', 'abbpppbba', 'abcbbbcba', '.abbcbba.', '..aaaaa..'],
    pal: { ...COOKIE_PAL, p: '#f5b3b8', s: '#e88a96', n: '#b45a6a' },
  },
  beeFeed: {
    rows: ['..aaaaa..', '.abwwbba.', 'abbwwbbba', 'abykykyba', 'akykykyka', 'abbbbbbba', 'abcbbbcba', '.abbcbba.', '..aaaaa..'],
    pal: { ...COOKIE_PAL, y: '#f5c518', w: '#e8f4ff' },
  },
  goatFeed: {
    rows: ['..aaaaa..', '.ahbbbha.', 'abbhwhbba', 'aewwwwwea', 'abwkwkwba', 'abbwwwbba', 'abcbsbcba', '.abbgbba.', '..aaaaa..'],
    pal: { ...COOKIE_PAL, h: '#7d6b68', e: '#c9a77c', s: '#f5b3b8', g: '#e3dccd' },
  },
  duckFeed: {
    rows: ['..aaaaa..', '.abbybba.', 'abbyyybba', 'abyykyyba', 'abyyyoooa', 'abbyyybba', 'abcbbbcba', '.abbcbba.', '..aaaaa..'],
    pal: { ...COOKIE_PAL, y: '#fbe38a', o: '#f08a2b' },
  },
  rabbitFeed: {
    rows: ['..aaaaa..', '.awpbpwa.', 'abwpbpwba', 'abwwwwwba', 'abwkwkwba', 'abwwpwwba', 'abcwwwcba', '.abbcbba.', '..aaaaa..'],
    pal: { ...COOKIE_PAL, p: '#f5b3b8' },
  },

  // Animal products
  wool: {
    rows: ['..bb.bb..', '.bccbccb.', 'bccdccdcb', 'bcdccdccb', 'bccccdcbb', '.bbccbbb.', '..bbbbb..'],
    pal: { b: '#e3d8c4', c: '#fffaf0', d: '#d4c6ad' },
  },
  truffle: {
    rows: ['..b.b.b....', '.babbabb...', 'bsbabbbab..', '.abbabbbc..', 'babbbabcc..', '.bbabcRRRR.', '..cbcRmvmmR', '..c.cRvmmvR', '.....RmmvmR', '......RRRR.'],
    pal: { b: '#3d3040', a: '#6e6488', s: '#a59cc4', c: '#241a26', R: '#3d3040', m: '#8a6a5c', v: '#f3e8dc' },
  },
  honey: {
    rows: ['..hhyhh..', '.rrrrrrr.', '..phhpp..', '.pphpphpq', 'pwwhwwwwq', 'pwwwhwwqq', 'ppppppqqq', '.ppppqqq.', '..qqqqq..'],
    pal: { h: HONEY.base, y: HONEY.light, r: '#8a5a3b', p: '#c38a55', w: '#fff3d6', q: '#9a6639' },
  },
  goatMilk: {
    rows: ['.aaaaaa...', 'aawwwwwa..', '..bbbbb.h.', '..bbbbbhh.', '.bbfbbbb.h', '.bbbbfbb.h', '.bfbbbbbhh', '.bbbbbbs..', '..bssss...'],
    pal: { a: '#d8cfc2', w: '#ffffff', b: '#f6efe4', f: '#86acd6', h: '#e3d8c8', s: '#d8ccbb' },
  },
  feather: {
    rows: ['.......aa.', '......aaab', '.....aaacb', '....aaacbb', '...aaacbb.', '..aa.cbb..', '..aacbb...', '...cbb....', '..c.......', '.c........'],
    pal: { a: '#ffffff', b: '#cfd9ea', c: '#b49a76' },
  },
  angora: {
    rows: ['.c..c..c.', '..bbbbb..', 'cbaabaabc', '.babaabb.', 'cbaaabaac', '.bbababb.', '..bbbbb..', '.c..c..c.'],
    pal: { a: '#fff1f5', b: '#f7c6d6', c: '#f0a8c0' },
  },

  // Made goods
  sugar: {
    rows: ['...wwwg..', '...wlwg..', '...sssg..', 'wwwgwwwg.', 'wlwgwlwg.', 'wwwgwwwg.', 'sssgsssg.'],
    pal: { w: '#ffffff', l: '#e8f4ff', s: '#e3dccd', g: '#c9c0b4' },
  },
  carrotJuice: juice('#f59a3b', '#d46a1f', '#f08a4b'),
  tomatoJuice: juice('#d8343f', '#a9233a', '#e0475b'),
  strawberryJuice: juice('#f47a9a', '#d4587a', '#e0475b'),
  appleJuice: juice('#f0cf4c', '#d9a339', '#e0475b'),
  strawberryJam: jam('#e0475b', '#ff8a96', '#b4353f', '#f7a1b5'),
  blueberryJam: jam('#4f5aa8', '#8b96e0', '#353e80', '#86acd6'),
  cherryJam: jam('#9e1f3a', '#d04a68', '#6e1428', '#7cc456'),
  yarn: { rows: ['...bbdb...', '..bbdbbd..', '.bcdbbdbb.', '.bcdbbdbb.', '.bbdbbdbb.', '.bbbdbbdb.', '..bbbdbbt.', '...bbbb..t', '.......tt.'], pal: { b: '#e86a5a', c: '#ff9a8a', d: '#c04a3e', t: '#e86a5a' } },
  angoraYarn: { rows: ['..fbbdbf..', '..bbdbbd..', 'fbcdbbdbb.', '.bcdbbdbbf', '.bbdbbdbb.', 'fbbbdbbdb.', '..bbbdbbt.', '..fbbbbf.t', '.......tt.'], pal: { b: '#f7c6d6', c: '#ffffff', d: '#e8a3bc', f: '#fbe0ea', t: '#f7c6d6' } },
  honeyCandy: {
    rows: ['w...ccc...w', 'ww.clccc.ww', 'wwwccccdwww', 'ww.cccdd.ww', 'w...ddd...w'],
    pal: { w: '#fff3c4', c: HONEY.base, l: HONEY.light, d: HONEY.dark },
  },
  lollipop: {
    rows: ['..ppp..', '.pwwwp.', 'pwpppwp', 'pwpwpwp', 'pwppwwp', '.pwppp.', '..ppp..', '...s...', '...s...', '...s...'],
    pal: { p: '#f06a8a', w: '#fff1f5', s: '#f5e7bf' },
  },
  nougat: {
    rows: ['..wwwwwwww', '.wwwwwwwwd', 'nnganngnad', 'nannnganad', 'ngnnanngnd', 'nnnnnnnnd.'],
    pal: { w: '#fffaf2', n: '#f3e6cf', g: '#7cc456', a: '#c98a3f', d: '#d8c6a6' },
  },
  giftBasket: {
    rows: ['...hhhhh...', '..h..b..h..', '.h.rrbjj.h.', '.hrrrbjjjh.', 'kkkkkkkkkkk', '.wvwvwvwvw.', '.vwvwvwvwv.', '.wvwvwvwvw.', '..vvvvvvv..'],
    pal: { h: '#9a6639', b: '#5aa54a', r: '#e0475b', j: '#f2b632', k: '#c38a55', w: '#dcaa72', v: '#b07a4a' },
  },
  goatCheese: {
    rows: ['...hh......', '..lhllllee.', '.gggsgggewwe', '.ggsggsgewwe', '.gsggggsewwe', '..sssssssee.'],
    pal: { h: '#5aa54a', l: '#ffffff', g: '#ece6dc', s: '#cfc6b8', e: '#d8d2c6', w: '#fffdf8' },
  },
  blueberryPie: {
    rows: ['..aaaaaa..', '.abcbkbca.', 'abkbcbbkba', 'aaaaaaaaaa', '.dddddddd.'],
    pal: { a: '#e6b06a', b: '#4f5aa8', c: '#9aa6ee', k: '#2f3870', d: '#9a5f2c' },
  },
  applePie: {
    rows: ['..aaaaaa..', '.absbsbsa.', 'absbsbsbsa', 'aaaaaaaaaa', '.dddddddd.'],
    pal: { a: '#d9944f', b: '#fbe29a', s: '#e8a04a', d: '#9a5f2c' },
  },
  pizza: {
    rows: ['ccccccccc', 'ddddddddd', '.yyrryyy.', '.yrryygy.', '..yyyyy..', '..yyrry..', '...yrr...', '...yy....', '....y....'],
    pal: { c: '#e6a85a', d: '#c9813f', y: '#fbd65a', r: '#d64545', g: '#5aa54a' },
  },
  layerCake: {
    rows: ['....rr....', '....r.....', '...wwww...', '...pppp...', '..wwwwww..', '..yyyyyy..', '.wwwwwwww.', '.pppppppp.', '.pppppppp.', 'gggggggggg'],
    pal: { r: '#e0475b', w: '#fff4e8', p: '#f7a1b5', y: '#f6d48a', g: '#dcd3e6' },
  },
  scarf: {
    rows: ['fffrrrwwrrr.', '...rrrwwrrrd', 'fffdddeedddd', '.........ddd', '.rrwwrrrrwwd', 'drrwwrrrrwwd', 'dddeeddddee.', 'ddd.........', 'drrrrwwrrfff', 'drrrrwwrr...', '.ddddeeddfff'],
    pal: { r: '#e0475b', d: '#b4353f', w: '#fffaf2', e: '#e8dcc8', f: '#ff8a96' },
  },
  cushion: {
    rows: ['q.......q', '.lpppppp.', '.phhphhp.', '.phhhhhp.', '.pphhhpd.', '.ppphpdd.', '.ppppddd.', 'q.......q'],
    pal: { p: '#a8dcc8', l: '#d4f0e4', d: '#7cbca6', h: '#ff8fb8', q: '#f2c94c' },
  },
  sweater: {
    rows: ['...sk.ks...', '.sssssssss.', 'sssssssssss', 'ss.wwwww.ss', 'ss.sssss.ss', 'ss.wwwww.ss', 'kk.sssss.kk', '...kkkkk...'],
    pal: { s: '#5aa54a', k: '#468a3b', w: '#fffaf2' },
  },
  plushie: {
    rows: ['..ww.ww..', '..wp.pw..', '..wp.pw..', '.wwwwwww.', 'wwkwwwkww', 'wwwwpwwww', '.wwwwwww.', '..bbwbb..', '.wwwwwww.', '.wwwwwww.', '.ww...ww.'],
    pal: { w: '#f5c2d0', p: '#fff1f4', k: OUTLINE, b: '#5b86b8' },
  },
  strawberryIce: ice(['..sss..', '.slsrs.', 'srssssd', 'ssssrsd', 'dsdsdsd'], { s: '#f7a1b5', l: '#ffd6e0', r: '#e0475b', d: '#e8789e' }),
  honeyIce: ice(['..sss..', '.slsss.', 'slssssd', 'shsshsd', 'dhdsdhd'], { s: '#fbd65a', l: '#fff1b0', h: HONEY.dark, d: '#e9b93f' }),
  blueberryIce: ice(['..sss..', '.slsbs.', 'sbssssd', 'sssbssd', 'dsdsdsd'], { s: '#a9b4ee', l: '#d8defb', b: '#34488a', d: '#8a96d8' }),
  cherryIce: ice(['....g..', '...g...', '..rr...', '.srrss.', 'slssssd', 'sssssdd', 'dsdsdsd'], { g: '#5aa54a', r: '#ff4a5a', s: '#c23050', l: '#e86a84', d: '#9a2040' }),
  lavenderSoap: {
    rows: ['......q.o.', '.....qpq..', '.lllgpqlll', 'llgglllllm', 'dddddddddm', 'dddddddddm'],
    pal: { o: '#c8e2f2', l: '#e4d8f8', q: LAVENDER.light, p: LAVENDER.dark, g: LAVENDER.stemDark, d: '#c3abea', m: '#a68ad8' },
  },
  honeyCandle: {
    rows: ['....f....', '...fyf...', '...fyf...', '....k....', '..lllll..', '..lhghh..', '..hhhgh..', '..hghhh..', '..hhhgh..', '.ppppppp.', 'qqqqqqqqq'],
    pal: { f: '#f08a2b', y: '#fff1b0', k: OUTLINE, l: HONEY.light, h: HONEY.base, g: HONEY.dark, p: '#e9c45a', q: '#c9a03a' },
  },
  crepe: foldedCrepe([[2, 2, 'w'], [4, 3, 'w'], [2, 5, 'w'], [5, 5, 'w'], [6, 4, 'w']], { w: '#ffffff' }),
  jamCrepe: foldedCrepe([[3, 3, 'j'], [4, 3, 'r'], [5, 3, 'r'], [2, 4, 'r'], [3, 4, 'r'], [4, 4, 'r'], [5, 4, 'd'], [3, 5, 'r'], [4, 5, 'd'], [0, 4, 'r'], [0, 5, 'r'], [0, 6, 'd']], { r: '#e0475b', j: '#ff8a96', d: '#b4353f' }),
  honeyCrepe: foldedCrepe([[1, 3, 'y'], [2, 3, 'h'], [3, 3, 'h'], [4, 3, 'h'], [5, 3, 'h'], [1, 5, 'y'], [2, 5, 'h'], [3, 5, 'h'], [4, 5, 'h'], [5, 5, 'h'], [6, 5, 'h'], [6, 6, 'h']], { h: '#e0901a', y: '#ffd25a' }),
  truffleGalette: {
    rows: ['.ggggggg.', 'gbbbbbbbg', 'gbtfftfbg', 'gbfyoofbg', 'gbtooofbg', 'gbfftftbg', 'gbbbbbbbg', '.ggggggg.', 'ppppppppp', '.qqqqqqq.'],
    pal: { g: '#8a5a3b', b: '#b5763f', f: '#fffaf2', y: '#ffd25a', o: '#f5a623', t: '#4a3028', p: '#e8eef4', q: '#b9c8d6' },
  },
  apple: {
    rows: ['....s.ll', '....sll.', '.rrrsrr.', 'rlrrrrrr', 'rlrrrrrr', 'rrrrrrrd', 'rrrrrrdd', '.rrrrdd.', '..rrrd..'],
    pal: { s: '#8a5a3b', l: '#5aa54a', r: '#e0475b', d: '#b4353f' },
  },
  cherry: {
    rows: ['......sll', '.....ss..', '....s.s..', '...s...s.', '..s....s.', '.rr...rr.', 'rhrr.rhrr', 'rrrd.rrrd', '.dd...dd.'],
    pal: { s: '#6b8a3a', l: '#5aa54a', r: '#e0475b', h: '#ff8a96', d: '#a9233a' },
  },
};
