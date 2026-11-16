import type { PersonId } from './data/types';
import { C, TILE, butterflySprite } from './farmArt';
import { footprint } from './farmMap';
import { cached, mapSprite } from './farmPaint';
import type { Tile, WalkMap } from './farmPaths';
import { POSED_MIDDLE, lapRow, posedSprite, type PersonView, type Placed, type Posture } from './farmPeopleArt';
import type { PlacedObject } from './farmSave';

// -----------------------------------------------
// WHAT A STROLLER DOES BEFORE A DECORATION: sit on the bench, drink a cup of tea, smell the flowers (docs/ferme.md 22)
// -----------------------------------------------
// Each decoration that has activities offers places (spots): on it (a seat) or beside it, each with what can be done
// there alone, and together when a second stroller takes the decoration's other spot. Decorations without spots keep
// the plain stop (farmStrollers: standing before it). Geometry here follows the decorations' drawings in farmArt.

export type Activity = 'swingFeet' | 'readPaper' | 'chat' | 'sipTea' | 'cheers' | 'sniff' | 'butterfly' | 'pickFlower';

export interface Point {
  x: number;
  y: number;
}

export interface Spot {
  /** Which place of the decoration: two strollers never take the same one. */
  index: number;
  /** The walkable tile walked to before the last step onto the spot. */
  tile: Tile;
  /** Where the stroller ends: the feet; on a seat, the decoration's bottom edge, so they are drawn after it. */
  point: Point;
  view: PersonView;
  face: 1 | -1;
  /** On a seat: the lap is this many pixels above `point`. */
  lift: number | null;
  alone: readonly Activity[];
  /** What two strollers do when both spots of the decoration are taken; null: one stroller at a time. */
  together: Activity | null;
  /** Over the decoration's middle, for what belongs to it (the sparkle of a toast). */
  over: Point;
}

const SEAT_ALONE: readonly Activity[] = ['swingFeet', 'readPaper'];

/** A spot before it is reached: the tiles it can be walked to from, best first. */
type Place = Omit<Spot, 'tile'> & { tiles: Tile[] };

/** The reachable spots of a decoration; empty when it has no activity or none of its spots can be reached. */
export function spotsOf(o: PlacedObject, walk: WalkMap): Spot[] {
  const spots: Spot[] = [];
  for (const { tiles, ...place } of places(o)) {
    const tile = tiles.find((t) => walk.canReach(t));
    if (tile) spots.push({ ...place, tile });
  }
  return spots;
}

function places(o: PlacedObject): Place[] {
  const [w, h] = footprint(o);
  const left = o.x * TILE;
  const bottom = (o.y + h) * TILE;
  const over = { x: left + (w * TILE) / 2, y: o.y * TILE - 4 };
  const profile = o.rot % 2 === 1;
  switch (o.type) {
    case 'bench':
      if (!profile) {
        // Two seats side by side, the bench's drawing 28 px wide on 32: seats 7 px either side of the middle.
        return [0, 1].map((i) => ({
          index: i,
          tiles: [[o.x + i, o.y + 1], [i ? o.x + 2 : o.x - 1, o.y], [o.x + i, o.y - 1]],
          point: { x: left + (i ? 23 : 9), y: bottom + 1 },
          view: 'front',
          face: 1,
          lift: 8,
          alone: SEAT_ALONE,
          together: 'chat',
          over,
        }));
      }
      // Seen from its end, the bench runs down two tiles: two seats one above the other, the back to the backrest.
      return [0, 1].map((i) => {
        const mirrored = o.rot === 3;
        const originY = bottom - 31;
        const front = mirrored ? o.x + 1 : o.x - 1;
        const back = mirrored ? o.x - 1 : o.x + 1;
        return {
          index: i,
          tiles: [[front, o.y + i], [back, o.y + i], [o.x, i ? o.y + 2 : o.y - 1]],
          point: { x: left + (mirrored ? 9 : 6), y: bottom + 1 + i * 0.25 },
          view: 'side',
          face: mirrored ? 1 : -1,
          lift: bottom + 1 + i * 0.25 - (originY + (i ? 23 : 12)),
          alone: SEAT_ALONE,
          together: 'chat',
          over,
        } satisfies Place;
      });
    case 'hayBales':
      // On top of the stack: the top bale of the front view, the upper roll of the side view.
      return [{
        index: 0,
        tiles: profile
          ? [[o.x - 1, o.y], [o.x + 1, o.y], [o.x - 1, o.y + 1], [o.x + 1, o.y + 1], [o.x, o.y + 2], [o.x, o.y - 1]]
          : [[o.x, o.y + 1], [o.x + 1, o.y + 1], [o.x - 1, o.y], [o.x + 2, o.y], [o.x, o.y - 1], [o.x + 1, o.y - 1]],
        point: profile ? { x: left + 7 + (o.rot === 3 ? -2 : 2), y: bottom + 1 } : { x: left + 15, y: bottom + 1 },
        view: profile ? 'side' : 'front',
        face: o.rot === 3 ? -1 : 1,
        lift: profile ? 25 : 16,
        alone: ['swingFeet'],
        together: null,
        over,
      }];
    case 'teaTable':
      return [0, 1].map((i) => ({
        index: i,
        tiles: [[i ? o.x + 1 : o.x - 1, o.y]],
        point: { x: i ? left + 22 : left - 6, y: o.y * TILE + 12 },
        view: 'side',
        face: i ? -1 : 1,
        lift: null,
        alone: ['sipTea'],
        together: 'cheers',
        over,
      }));
    case 'flowersPink':
    case 'flowersYellow':
    case 'flowersWhite':
      // Behind the bed, facing us, the flowers before the knees; or crouched beside it.
      return [
        { index: 0, tiles: [[o.x, o.y - 1]], point: { x: left + 8, y: o.y * TILE + 9 }, view: 'front', face: 1, lift: null, alone: ['sniff'], together: null, over },
        { index: 1, tiles: [[o.x - 1, o.y]], point: { x: left - 5, y: o.y * TILE + 12 }, view: 'side', face: 1, lift: null, alone: ['butterfly', 'pickFlower'], together: null, over },
        { index: 2, tiles: [[o.x + 1, o.y]], point: { x: left + TILE + 5, y: o.y * TILE + 12 }, view: 'side', face: -1, lift: null, alone: ['butterfly', 'pickFlower'], together: null, over },
      ];
    default:
      return [];
  }
}

// -----------------------------------------------
// DRAWING AN ACTIVITY
// -----------------------------------------------

export interface Doing {
  who: PersonId;
  spot: Spot;
  activity: Activity;
  /** Milliseconds since this activity began. */
  since: number;
  /** The strollers' shared clock: two at the same decoration keep time together. */
  clock: number;
  reduced: boolean;
}

const BODY_X = 2;
const ph = (t: number, period: number) => (t % period) / period;

function postureOf(d: Doing): Posture {
  const { spot, since, clock } = d;
  const view = spot.view;
  const swing = d.reduced ? 0 : 1;
  const seat = (frame: number): Posture =>
    view === 'front' ? { view, pose: 'sitFront', frame: (frame * swing) as 0 | 1 } : { view, pose: frame * swing ? 'sitKick' : 'sitSide' };
  switch (d.activity) {
    case 'swingFeet':
      return seat(Math.floor(since / (view === 'front' ? 450 : 900)) % 2);
    case 'readPaper':
      return { ...seat(0), held: !d.reduced && ph(since, 3600) > 0.88 ? 'paperTurning' : 'paper' };
    case 'chat':
      return seat(talking(d) ? Math.floor(since / 300) % 2 : 0);
    case 'sipTea': {
      const sip = !d.reduced && ph(since, 3600) > 0.66;
      return { view, pose: 'stand', hand: sip ? [BODY_X + 8, 7] : [BODY_X + 8, 12], held: 'cup' };
    }
    case 'cheers': {
      const p = ph(clock, 5200);
      const mine = spot.index === 0 ? p > 0.2 && p < 0.42 : p > 0.5 && p < 0.72;
      const hand: [number, number] = d.reduced ? [BODY_X + 8, 12] : p > 0.78 ? [BODY_X + 9, 8] : mine ? [BODY_X + 8, 7] : [BODY_X + 8, 12];
      return { view, pose: 'stand', hand, held: 'cup' };
    }
    case 'sniff':
      return { view, pose: 'crouchFront', head: [0, !d.reduced && ph(since, 1600) > 0.5 ? 1 : 0] };
    case 'butterfly':
      return { view, pose: 'crouchSide', head: [1, 0], hand: [BODY_X + 9, 12] };
    case 'pickFlower': {
      if (since < 2000 && !d.reduced) return { view, pose: 'crouchSide', head: [1, 0], hand: [BODY_X + 9 + (Math.floor(since / 400) % 2), 11] };
      const smell = !d.reduced && ph(since, 4000) < 0.3;
      return { view, pose: 'stand', hand: smell ? [BODY_X + 8, 8] : [BODY_X + 7, 12], held: 'flower' };
    }
  }
}

/** In a chat, the two take turns: the first spot talks, then the other. */
function talking(d: Doing): boolean {
  return !d.reduced && Math.floor(d.clock / 1700) % 2 === d.spot.index % 2;
}

/** The stroller's drawing for this activity and where it is stamped (whole pixels), `x`/`y` being their point. */
export function doingPlaced(d: Doing, x: number, y: number): Placed {
  const posture = postureOf(d);
  const sprite = posedSprite(d.who, posture);
  const top = d.spot.lift === null ? Math.round(y) - sprite.height + 1 : Math.round(y - d.spot.lift) - lapRow(d.who);
  const pose = `${d.activity}-${posture.pose}-${posture.frame ?? 0}-${posture.head ?? ''}-${posture.hand ?? ''}-${posture.held ?? ''}|${effectKey(d)}`;
  return { sprite, x: Math.round(x) - POSED_MIDDLE, y: top, pose };
}

/** Whether the drawing is turned to face left. */
export function isMirrored(d: Doing): boolean {
  return d.spot.view === 'side' && d.spot.face < 0;
}

/** Whether a shadow goes under the feet: standing or crouching on the ground, not on a seat. */
export function onGround(d: Doing): boolean {
  return d.spot.lift === null;
}

// -----------------------------------------------
// EFFECTS: a speech bubble, petals, a butterfly, a toast's sparkle
// -----------------------------------------------

const bubble = () => cached('stroller-bubble', () => mapSprite(['ggggggg', 'gkgkgkg', 'ggggggg', '.gg....', '.g.....'], { g: C.white, k: '#9c958d' }));
const PETALS = ['#ffb3cc', '#f06a96', '#ffffff'];

/** Where the butterfly is, relative to the head, through its eight seconds: coming, resting on the head, leaving. */
function butterflyAt(since: number, headX: number, headY: number): { x: number; y: number; resting: boolean } {
  const p = ph(since, 8000);
  if (p < 0.35) {
    const k = p / 0.35;
    return { x: headX - 30 * (1 - k) + Math.sin(k * 9) * 3, y: headY - 26 * (1 - k) + Math.cos(k * 7) * 3, resting: false };
  }
  if (p < 0.75) return { x: headX, y: headY, resting: true };
  const k = (p - 0.75) / 0.25;
  return { x: headX + 32 * k + Math.sin(k * 9) * 3, y: headY - 28 * k, resting: false };
}

/** Changes exactly when an effect moves by a pixel or changes its look (the scene redraws on it). */
function effectKey(d: Doing): string {
  if (d.reduced) return '';
  switch (d.activity) {
    case 'chat':
      return talking(d) && ph(d.clock, 1700) < 0.75 ? 'talk' : '';
    case 'cheers':
      return ph(d.clock, 5200) > 0.78 ? `toast${Math.floor(ph(d.clock, 5200) * 40)}` : '';
    case 'sniff':
      return `petals${Math.floor(d.since / 120)}`;
    case 'butterfly': {
      const b = butterflyAt(d.since, 0, 0);
      return `fly${Math.round(b.x)},${Math.round(b.y)},${b.resting ? Math.floor(d.since / 700) % 2 : Math.floor(d.since / 120) % 2}`;
    }
    default:
      return '';
  }
}

/** What goes with the activity, over everything (speech, petals, the butterfly, a toast). */
export function drawEffects(ctx: CanvasRenderingContext2D, d: Doing, placed: Placed): void {
  if (d.reduced) return;
  const mirrored = isMirrored(d);
  switch (d.activity) {
    case 'chat': {
      if (!talking(d) || ph(d.clock, 1700) >= 0.75) return;
      const b = bubble();
      // The bubble's tail points down at the talker's head, the bubble itself away from the other one.
      const toRight = d.spot.view === 'front' ? d.spot.index === 0 : !mirrored;
      stamp(ctx, b, toRight ? placed.x + 10 : placed.x + 3, placed.y - 6, !toRight);
      return;
    }
    case 'cheers': {
      const p = ph(d.clock, 5200);
      if (p <= 0.78 || d.spot.index !== 0) return;
      sparkle(ctx, Math.round(d.spot.over.x), Math.round(d.spot.over.y), (p - 0.78) / 0.22);
      return;
    }
    case 'sniff': {
      for (let i = 0; i < 3; i++) {
        const k = ph(d.since + i * 900, 2700);
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = PETALS[i];
        ctx.fillRect(Math.round(d.spot.over.x - 3 + i * 3 + Math.sin(k * 6 + i) * 2), Math.round(d.spot.over.y + 10 - k * 14), 1, 1);
      }
      ctx.globalAlpha = 1;
      return;
    }
    case 'butterfly': {
      const headX = placed.x + POSED_MIDDLE + (mirrored ? -1 : 1);
      const b = butterflyAt(d.since, headX, placed.y);
      const flap = b.resting ? Math.floor(d.since / 700) % 2 : Math.floor(d.since / 120) % 2;
      const s = butterflySprite(0, flap as 0 | 1);
      ctx.drawImage(s, Math.round(b.x - s.width / 2), Math.round(b.y - s.height + 1));
      return;
    }
    default:
  }
}

function stamp(ctx: CanvasRenderingContext2D, s: CanvasImageSource & { width: number }, x: number, y: number, mirrored: boolean): void {
  if (!mirrored) {
    ctx.drawImage(s, x, y);
    return;
  }
  ctx.save();
  ctx.translate(x + s.width, y);
  ctx.scale(-1, 1);
  ctx.drawImage(s, 0, 0);
  ctx.restore();
}

/** A little four-pointed glint that grows, turns gold and fades. */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, life: number): void {
  const r = life < 0.5 ? 1 : 2;
  ctx.globalAlpha = 1 - life * 0.6;
  ctx.fillStyle = life < 0.5 ? '#fff6c8' : C.gold;
  for (const [dx, dy] of [[0, 0], [-r, 0], [r, 0], [0, -r], [0, r]]) ctx.fillRect(x + dx, y + dy, 1, 1);
  ctx.globalAlpha = 1;
}
