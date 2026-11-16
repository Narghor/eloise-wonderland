import type { PersonId } from './data/types';
import { C, OUTLINE, SKIN, cached, sprite, type Sprite } from './farmArt';

// -----------------------------------------------
// THE VILLAGERS ON THE MAP: from the side (walking right, mirrored to walk left), from the front, from the back
// -----------------------------------------------
// Same look as their faces (farmArt FACES): same hair, hats and colours. A drawing is a head of 8 rows over a body;
// two frames make the walk. The feet are always on the drawing's last row.

export type PersonView = 'side' | 'front' | 'back';
type Frame = 0 | 1;

/** A person's image this frame and where it is stamped, in whole art pixels; `pose` names the image (view, step, side). */
export interface Placed {
  sprite: Sprite;
  x: number;
  y: number;
  pose: string;
}

/** Changes exactly when what the screen shows of this person changes: the scene redraws on it (FarmScene.stepKey). */
export function placedKey(p: Placed): string {
  return `${p.x},${p.y},${p.pose}`;
}
type Body = 'trousers' | 'dress' | 'child';

interface Look {
  heads: Record<PersonView, readonly string[]>;
  body: Body;
  /** Long hair falling on the shoulders and the back. */
  longHair?: boolean;
  apron?: boolean;
  pal: Record<string, string>;
}

const SHARED = { s: SKIN, e: OUTLINE, c: '#f29aa6', l: SKIN };

/** Heads seen from the front and the back for the common hat-less, short-haired shape. */
const PLAIN_FRONT = ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '.hssssssh.', '.hsessesh.', '.hssssssh.', '..cssssc..', '...ssss...'];
const PLAIN_BACK = ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '.hhhhhhhh.', '.hhhhhhhh.', '.hhhhhhhh.', '..hhhhhh..', '...ssss...'];
const LONG_BACK = ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', 'hhhhhhhhhh', 'hhhhhhhhhh', 'hhhhhhhhhh', 'hhhhhhhhhh', 'hhhhsshhhh'];
/** A hat on top of a plain head: its three rows replace the head's first three. */
const hatted = (hat: readonly string[], head: readonly string[]) => [...hat, ...head.slice(3)];

const LOOKS: Record<PersonId, Look> = {
  marthe: {
    heads: {
      side: ['.hh.......', 'hhhhhhh...', '.hhhhhhh..', '.hhhsssss.', '.hhsssses.', '.hhssssss.', '..hsssscs.', '...ssss...'],
      front: ['....hh....', '..hhhhhh..', '.hhhhhhhh.', '.hhsssshh.', '.hsessesh.', '.hssssssh.', '..cssssc..', '...ssss...'],
      back: ['....hh....', ...PLAIN_BACK.slice(1)],
    },
    body: 'dress',
    apron: true,
    pal: { h: '#c9c3d0', t: '#7fae5a', T: '#678f48', b: '#7fae5a', a: C.white, f: C.door },
  },
  leon: {
    heads: {
      side: ['...wwww...', '..wwwwwww.', '..hhhhhh..', '.hhssssss.', '.hhsssses.', '.hhssssss.', '..hssmmms.', '...ssss...'],
      front: ['...wwww...', '..wwwwww..', '.hhhhhhhh.', '.hssssssh.', '.hsessesh.', '.hssssssh.', '..cmmmmc..', '...ssss...'],
      back: hatted(['...wwww...', '..wwwwww..', '.hhhhhhhh.'], PLAIN_BACK),
    },
    body: 'trousers',
    pal: { w: '#ffffff', h: C.bark, m: C.bark, t: '#f1ece4', T: '#d6cfc2', b: '#8a6a4a', f: '#5b4a48' },
  },
  rosalie: {
    heads: {
      side: ['...hhhhy..', '..hhhhhyy.', '.hhhhhhhh.', '.hhhsssss.', 'hhhsssses.', 'hhhssssss.', 'hhhsssscs.', 'hh.ssss...'],
      front: ['...hhhhy..', '..hhhhhhy.', '.hhhhhhhh.', 'hhsssssshh', 'hhsesseshh', 'hhsssssshh', 'hhcsssschh', 'hh.ssss.hh'],
      back: ['...hhhhy..', '..hhhhhhy.', ...LONG_BACK.slice(2)],
    },
    body: 'dress',
    longHair: true,
    pal: { h: '#e8789e', y: '#ffd84a', t: C.leafLight, T: C.leaf, b: '#f48fb1', f: C.brick },
  },
  basile: {
    heads: {
      side: ['..kkkk....', '.kkkkkk...', '.kkkkkkKKK', '.hhssssss.', '.hhsssses.', '.hhssssss.', '..hmmmmms.', '...mmmm...'],
      front: ['..kkkkkk..', '.kkkkkkkk.', '.KKKKKKKK.', '.hssssssh.', '.hsessesh.', '.hssssssh.', '..mmmmmm..', '...mmmm...'],
      back: hatted(['..kkkkkk..', '.kkkkkkkk.', '.kkkkkkkk.'], PLAIN_BACK),
    },
    body: 'trousers',
    pal: { k: '#3f6fb0', K: '#2f5590', h: C.barkDark, m: C.bark, t: '#d9606a', T: '#b4474f', b: C.blue, f: C.door },
  },
  jules: {
    heads: {
      side: ['..h.h.h...', '..hhhhhh..', '.hhhhhhhh.', '.hhhsssss.', '.hhsssses.', '.hhssssss.', '..hsssscs.', '...ssss...'],
      front: ['..h.hh.h..', ...PLAIN_FRONT.slice(1)],
      back: ['..h.hh.h..', ...PLAIN_BACK.slice(1)],
    },
    body: 'child',
    pal: { h: C.bark, t: '#f2a33a', T: '#d9862a', b: C.blue, f: C.red },
  },
  capucine: {
    heads: {
      side: ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '.hhhhhhhh.', 'hhhsseggs.', 'hhhssssss.', 'hhhsssscs.', 'hh.ssss...'],
      front: ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', 'hhhhhhhhhh', 'hhgesseghh', 'hhsssssshh', 'hhcsssschh', 'hh.ssss.hh'],
      back: LONG_BACK,
    },
    body: 'dress',
    longHair: true,
    pal: { h: '#3f2f3a', g: '#e8eef5', t: '#9b7bc4', T: '#7f62a8', b: '#4a3f5a', l: '#4a3f5a', f: '#3f2f3a' },
  },
  gaston: {
    heads: {
      side: ['..kkkk....', '.kkkkkk...', '.yyyyyyKK.', '.hhssssss.', '.hhsssses.', '.hhssssss.', '..hsssscs.', '...ssss...'],
      front: hatted(['..kkkkkk..', '.kkkkkkkk.', '.yyyyyyyy.'], PLAIN_FRONT),
      back: hatted(['..kkkkkk..', '.kkkkkkkk.', '.yyyyyyyy.'], PLAIN_BACK),
    },
    body: 'trousers',
    pal: { k: '#2f3f6b', K: '#1f2a4a', y: C.gold, h: C.barkDark, t: '#3f5a8f', T: '#2f3f6b', b: '#2f3f6b', f: '#3a2f2f' },
  },
  pivoine: {
    heads: {
      side: ['..ww.ww...', '.wwwwwww..', '..wwwww...', '.hhssssss.', '.hhsssses.', '.hhssssss.', '..hsssscs.', '...ssss...'],
      front: hatted(['..ww..ww..', '.wwwwwwww.', '..wwwwww..'], PLAIN_FRONT),
      back: hatted(['..ww..ww..', '.wwwwwwww.', '..wwwwww..'], PLAIN_BACK),
    },
    body: 'dress',
    apron: true,
    pal: { w: '#ffffff', h: '#a8693e', t: '#f27a8a', T: '#d95f70', b: '#f27a8a', a: C.white, f: C.bark },
  },
};

/** Bodies by view, two frames each. From the front and the back, the arms hang at the sides (the `s` hands). */
const BODIES: Record<Body, Record<PersonView, readonly [readonly string[], readonly string[]]>> = {
  trousers: {
    side: [
      ['...tttt...', '..ttTttt..', '..ttTttt..', '..ttTttt..', '..bbsbbb..', '...bbbb...', '....bb....', '....ff....'],
      ['...tttt...', '..ttTttt..', '..ttTttt..', '..ttTttt..', '..bbsbbb..', '...bbbb...', '..bb..bb..', '.ff....ff.'],
    ],
    front: [
      ['...tttt...', '..tttttt..', '.tttttttt.', '.tttttttt.', '.sbbbbbbs.', '..bbbbbb..', '..bb..bb..', '..ff..ff..'],
      ['...tttt...', '..tttttt..', '.tttttttt.', '.tttttttt.', '.sbbbbbbs.', '..bbbbbb..', '..bb..ff..', '..ff......'],
    ],
    back: [
      ['...tttt...', '..tttttt..', '.tTttttTt.', '.tTttttTt.', '.sbbbbbbs.', '..bbbbbb..', '..bb..bb..', '..ff..ff..'],
      ['...tttt...', '..tttttt..', '.tTttttTt.', '.tTttttTt.', '.sbbbbbbs.', '..bbbbbb..', '..ff..bb..', '......ff..'],
    ],
  },
  dress: {
    side: [
      ['...tttt...', '..ttTttt..', '..ttTttt..', '..bbsbbb..', '.bbbbbbbb.', '.bbbbbbbb.', '....ll....', '....ff....'],
      ['...tttt...', '..ttTttt..', '..ttTttt..', '..bbsbbb..', '.bbbbbbbb.', '.bbbbbbbb.', '...l..l...', '..ff..ff..'],
    ],
    front: [
      ['...tttt...', '..tttttt..', '.tttttttt.', '.sbbbbbbs.', '.bbbbbbbb.', 'bbbbbbbbbb', '...l..l...', '...f..f...'],
      ['...tttt...', '..tttttt..', '.tttttttt.', '.sbbbbbbs.', '.bbbbbbbb.', 'bbbbbbbbbb', '...l..f...', '...f......'],
    ],
    back: [
      ['...tttt...', '..tttttt..', '.tTttttTt.', '.sbbbbbbs.', '.bbbbbbbb.', 'bbbbbbbbbb', '...l..l...', '...f..f...'],
      ['...tttt...', '..tttttt..', '.tTttttTt.', '.sbbbbbbs.', '.bbbbbbbb.', 'bbbbbbbbbb', '...f..l...', '......f...'],
    ],
  },
  child: {
    side: [
      ['...tttt...', '..ttTttt..', '..bbsbbb..', '....ll....', '....ff....'],
      ['...tttt...', '..ttTttt..', '..bbsbbb..', '...l..l...', '..ff..ff..'],
    ],
    front: [
      ['...tttt...', '.stttttts.', '..bbbbbb..', '...l..l...', '...f..f...'],
      ['...tttt...', '.stttttts.', '..bbbbbb..', '...l..f...', '...f......'],
    ],
    back: [
      ['...tttt...', '.sTttttTs.', '..bbbbbb..', '...l..l...', '...f..f...'],
      ['...tttt...', '.sTttttTs.', '..bbbbbb..', '...f..l...', '......f...'],
    ],
  },
};

/** A villager seen from `view` ('side' walks right); `frame` 1 is the other step. */
export function villagerSprite(id: PersonId, view: PersonView, frame: Frame): Sprite {
  return cached(`villager-${id}-${view}-${frame}`, () => {
    const look = LOOKS[id];
    const body = BODIES[look.body][view][frame].map((row, i) => dress(row, i, look, view));
    const rows = [...look.heads[view], ...body];
    return sprite(10, rows.length, (P) => P.map(0, 0, rows, { ...SHARED, ...look.pal }));
  });
}

/** The apron over the front of the body, long hair over the shoulders. */
function dress(row: string, i: number, look: Look, view: PersonView): string {
  let r = row;
  if (look.apron && i >= 1 && i <= 5) {
    if (view === 'side') r = r.slice(0, 5) + r.slice(5, 8).replace(/[tTb]/g, 'a') + r.slice(8);
    else if (view === 'front') r = r.slice(0, 3) + r.slice(3, 7).replace(/[tTb]/g, 'a') + r.slice(7);
  }
  if (look.longHair && i <= 1) {
    if (view === 'side') r = '.h' + r.slice(2);
    else if (view === 'front') r = 'h' + r.slice(1, 9) + 'h';
    else r = r.slice(0, 2) + 'hhhhhh' + r.slice(8);
  }
  return r;
}

/** Gaston on his yellow bicycle, a parcel on the front rack; `frame` turns the pedals. */
export function bikeSprite(view: PersonView, frame: Frame): Sprite {
  return cached(`bike-${view}-${frame}`, () => (view === 'side' ? sideBike(frame) : view === 'front' ? frontBike(frame) : backBike(frame)));
}

const BIKE_PAL = { k: '#2f3f6b', y: C.gold, h: C.barkDark, t: '#3f5a8f', b: '#2f3f6b', f: '#3a2f2f', r: '#3a3540', o: '#3a3540', p: '#d9a46a', P: '#b5763f', g: C.gold, a: C.woodDark };

/** Coming down the road, toward the camera: the parcel rack and the front wheel ahead of him. */
function frontBike(frame: Frame): Sprite {
  const feet = frame ? ['...f.oo.....', '.....oo.....', '.....oo.f...'] : ['.....oo.f...', '.....oo.....', '...f.oo.....'];
  const rows = [
    '....kkkk....', '...kkkkkk...', '...yyyyyy...', '...ssssss...', '...sesses...', '...cssssc...', '....ssss....',
    '...tttttt...', '..tttttttt..', 'rrsttttttsrr', '...tttttt...', '....bbbb....', '...bb..bb...', '...bgppgb...',
    '....pPpp....', '....pppp....', ...feet, '.....oo.....',
  ];
  return sprite(12, rows.length, (P) => P.map(0, 0, rows, { ...SHARED, ...BIKE_PAL }));
}

/** Riding up the road, away from the camera: his satchel on his back, the rear wheel under him. */
function backBike(frame: Frame): Sprite {
  const feet = frame ? ['...f.oo.....', '.....oo.....', '.....oo.f...'] : ['.....oo.f...', '.....oo.....', '...f.oo.....'];
  const rows = [
    '....kkkk....', '...kkkkkk...', '...yyyyyy...', '...hhhhhh...', '...hhhhhh...', '....hhhh....', '....ssss....',
    '...tttttt...', '..ttaatttt..', 'rrtaaattttrr', '...tttttt...', '....bbbb....', '...bb..bb...', '...bgoogb...',
    '.....oo.....', '.....oo.....', ...feet, '.....oo.....',
  ];
  return sprite(12, rows.length, (P) => P.map(0, 0, rows, { ...SHARED, ...BIKE_PAL }));
}

function sideBike(frame: Frame): Sprite {
  return sprite(19, 23, (P) => {
    const navy = '#2f3f6b';
    const jacket = '#3f5a8f';
    const tyre = '#3a3540';
    const frameCol = C.gold;
    for (const cx of [4, 15]) {
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const d = Math.hypot(dx, dy);
          if (d >= 2.3 && d <= 3.5) P.px(cx + dx, 19 + dy, tyre);
        }
      }
      P.px(cx, 19, C.greyLight);
      const spoke = frame ? [1, -1] : [-1, -1];
      P.px(cx + spoke[0], 19 + spoke[1], C.grey);
      P.px(cx - spoke[0], 19 - spoke[1], C.grey);
    }
    P.line(4, 19, 8, 19, frameCol);
    P.line(8, 19, 7, 14, frameCol);
    P.line(7, 14, 13, 14, frameCol);
    P.line(8, 19, 13, 14, frameCol);
    P.line(13, 14, 15, 19, frameCol);
    P.line(13, 14, 13, 11, frameCol);
    P.rect(12, 10, 3, 1, tyre);
    P.rect(6, 13, 3, 1, '#3a2f2f');
    // The front rack and its parcel.
    P.rect(14, 12, 4, 1, C.woodDark);
    P.rect(14, 10, 4, 2, '#d9a46a');
    P.px(15, 10, '#b5763f');
    P.px(15, 11, '#b5763f');
    // Gaston: leg, satchel, body, arm, head and cap.
    if (frame) {
      P.line(7, 13, 10, 16, navy);
      P.line(10, 16, 8, 20, navy);
      P.px(9, 21, '#3a2f2f');
    } else {
      P.line(7, 13, 10, 14, navy);
      P.line(10, 14, 10, 18, navy);
      P.px(11, 18, '#3a2f2f');
    }
    P.rect(6, 7, 3, 6, jacket);
    P.px(7, 8, navy);
    P.line(8, 8, 12, 10, jacket);
    P.px(12, 10, SKIN);
    P.rect(4, 10, 3, 3, C.woodDark);
    P.px(5, 10, '#b5763f');
    P.ellipse(8, 4, 2, 2, SKIN);
    P.px(6, 4, C.barkDark);
    P.px(6, 5, C.barkDark);
    P.px(9, 4, OUTLINE);
    P.px(9, 5, '#f29aa6');
    P.rect(6, 1, 4, 2, navy);
    P.rect(6, 2, 4, 1, C.gold);
    P.px(10, 2, '#1f2a4a');
    P.px(11, 2, '#1f2a4a');
  });
}

/** The basket a villager carries home, full of the order. */
export function basketSprite(): Sprite {
  return cached('basket', () =>
    sprite(7, 4, (P) =>
      P.map(0, 0, ['.g.r.g.', 'aaaaaaa', 'abababa', '.aaaaa.'], { a: C.wood, b: C.woodDark, g: C.leafLight, r: C.red }),
    ),
  );
}
