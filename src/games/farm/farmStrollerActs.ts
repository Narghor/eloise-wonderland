import type { PersonId } from './data/types';
import { C, OUTLINE, TILE, animalSprite, butterflySprite, swingSeatSprite, type Sprite } from './farmArt';
import { footprint } from './farmMap';
import { IRON, IRON_LIGHT, cached, mapSprite } from './farmPaint';
import type { Tile, WalkMap } from './farmPaths';
import { POSED_MIDDLE, lapRow, posedSprite, postureRows, type PersonView, type Placed, type Posture } from './farmPeopleArt';
import type { PlacedObject } from './farmSave';

// -----------------------------------------------
// WHAT A STROLLER DOES BEFORE A DECORATION: sit on the bench, drink a cup of tea, feed the ducks... (docs/ferme.md 22)
// -----------------------------------------------
// Each decoration that has activities offers places (spots): on it (a seat) or beside it, each with what can be done
// there alone, and together when a second stroller takes the decoration's other spot. Decorations without spots keep
// the plain stop (farmStrollers: standing before it). Geometry here follows the decorations' drawings in farmArt.

export type Activity =
  | 'swingFeet' | 'readPaper' | 'chat' | 'sipTea' | 'cheers' | 'sniff' | 'butterfly' | 'pickFlower'
  | 'pointBird' | 'feedBirds' | 'feedDucks' | 'fish' | 'wishCoin' | 'sitRim' | 'crankWell' | 'singWell'
  | 'swingFront' | 'swingSide' | 'swingPushed' | 'pushSwing';

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
  /** What the activity is aimed at in the decoration's drawing: the birdhouse's hole, the water, the well's crank. */
  aim: Point;
  /** The decoration's place in the drawing order (its bottom edge): what happens in it is drawn right after it. */
  depth: number;
  /** Drawn in front of the decoration whatever the feet: standing at its side, a hand on its crank. */
  inFront: boolean;
  /** Only taken beside a child at the decoration's other spot (pushing the swing), and left when they go. */
  withChild: boolean;
}

const SEAT_ALONE: readonly Activity[] = ['swingFeet', 'readPaper'];

/** A spot before it is reached: the tiles it can be walked to from, best first. */
type Place = Omit<Spot, 'tile' | 'aim' | 'depth' | 'inFront' | 'withChild'> & { tiles: Tile[]; aim?: Point; inFront?: boolean; withChild?: boolean };

/** The reachable spots of a decoration; empty when it has no activity or none of its spots can be reached. */
export function spotsOf(o: PlacedObject, walk: WalkMap): Spot[] {
  // A standing decoration's drawing ends one pixel under its tiles, on its outline (FarmScene.origin).
  const depth = (o.y + footprint(o)[1]) * TILE + 1;
  const spots: Spot[] = [];
  for (const { tiles, aim, inFront, withChild, ...place } of places(o)) {
    const tile = tiles.find((t) => walk.canReach(t));
    if (tile) spots.push({ ...place, tile, aim: aim ?? place.over, depth, inFront: inFront ?? false, withChild: withChild ?? false });
  }
  return spots;
}

function places(o: PlacedObject): Place[] {
  const [w, h] = footprint(o);
  const left = o.x * TILE;
  const bottom = (o.y + h) * TILE;
  const over = { x: left + (w * TILE) / 2, y: o.y * TILE - 4 };
  const profile = o.rot % 2 === 1;
  /** Standing beside the decoration's bottom row, facing it: west looking right, east looking left. */
  const beside = (index: number, east: boolean, gap: number, alone: readonly Activity[], aim: Point): Place => ({
    index,
    tiles: [east ? [o.x + w, o.y + h - 1] : [o.x - 1, o.y + h - 1]],
    point: { x: east ? left + w * TILE + gap : left - gap, y: bottom - 4 },
    view: 'side',
    face: east ? -1 : 1,
    lift: null,
    alone,
    together: null,
    over,
    aim,
  });
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
    case 'picnicTable':
      // At either end of the table seen from the front, a glass of lemonade; along it, its benches are in the way.
      if (profile) return [];
      return [0, 1].map((i) => ({
        index: i,
        tiles: [[i ? o.x + 2 : o.x - 1, o.y]],
        point: { x: i ? left + 2 * TILE + 6 : left - 6, y: o.y * TILE + 12 },
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
    case 'tulips':
    case 'lavender':
    case 'hydrangeas':
    case 'sunflowers': {
      // Behind the bed, facing us, the flowers before the knees; or crouched beside it. Sunflowers hide whoever
      // stands behind them: beside only.
      const all: Place[] = [
        { index: 0, tiles: [[o.x, o.y - 1]], point: { x: left + 8, y: o.y * TILE + 9 }, view: 'front', face: 1, lift: null, alone: ['sniff'], together: null, over },
        { index: 1, tiles: [[o.x - 1, o.y]], point: { x: left - 5, y: o.y * TILE + 12 }, view: 'side', face: 1, lift: null, alone: ['butterfly', 'pickFlower'], together: null, over },
        { index: 2, tiles: [[o.x + 1, o.y]], point: { x: left + TILE + 5, y: o.y * TILE + 12 }, view: 'side', face: -1, lift: null, alone: ['butterfly', 'pickFlower'], together: null, over },
      ];
      return o.type === 'sunflowers' ? all.slice(1) : all;
    }
    case 'birdBath': {
      // The water of the basin, where the robin bathes.
      const basin = { x: left + 8, y: bottom - 11 };
      return [0, 1].map((i) => beside(i, i === 1, 6, ['pointBird', 'feedBirds'], basin));
    }
    case 'lilyPond': {
      // The middle of the water: a line for the koi, or a coin for luck.
      const water = { x: left + 16, y: bottom - 9 };
      return [0, 1].map((i) => beside(i, i === 1, 5, ['fish', 'wishCoin'], water));
    }
    case 'birdhouse': {
      // The round hole of the little house, on its pole (a birdhouse sitting on a fence is never stopped at).
      const hole = { x: left + 8, y: bottom - 17 };
      return [0, 1].map((i) => beside(i, i === 1, 8, ['pointBird', 'feedBirds'], hole));
    }
    case 'pond': {
      // The middle of the water; the reeds on the right, on the left when the pond is mirrored.
      const water = { x: left + 16, y: bottom - 9 };
      return [0, 1].map((i) => beside(i, i === 1, 5, ['feedDucks', 'fish'], water));
    }
    case 'fountain': {
      // Sitting on the front of the basin's rim, the legs over its wall; or beside it, a coin for the water.
      const water = { x: left + 16, y: bottom - 10 };
      const rim = [0, 1].map((i): Place => ({
        index: i,
        tiles: i ? [[o.x + 1, o.y + 2], [o.x + 2, o.y + 1]] : [[o.x, o.y + 2], [o.x - 1, o.y + 1]],
        point: { x: left + (i ? 23 : 9), y: bottom + 1 },
        view: 'front',
        face: 1,
        lift: 6,
        alone: ['sitRim'],
        together: null,
        over,
        aim: water,
      }));
      return [...rim, beside(2, false, 5, ['wishCoin'], water), beside(3, true, 5, ['wishCoin'], water)];
    }
    case 'well': {
      // The crank: on the right of the drawing seen from the front, on the bar's end seen from the side (mirrored: left).
      // It is drawn high under the roof: standing beside the stones, the arm reaches up to it as far as it goes.
      const mirrored = o.rot === 3;
      const hubX = profile ? (mirrored ? 9 : 22) : 26;
      const hub = { x: left + hubX, y: bottom - 24 };
      const east = hubX > w * TILE / 2;
      const water = { x: left + (mirrored ? 15 : 16), y: bottom - 13 };
      const crank: Place = {
        index: 0,
        tiles: east ? [[o.x + 2, o.y + 1], [o.x + 2, o.y]] : [[o.x - 1, o.y + 1], [o.x - 1, o.y]],
        point: { x: hub.x + (east ? 6 : -6), y: bottom - 6 },
        view: 'side',
        face: east ? -1 : 1,
        lift: null,
        alone: ['crankWell'],
        together: null,
        over,
        aim: hub,
        inFront: true,
      };
      // Leaning over the rim from the front, the back to us.
      const lean = [0, 1].map((i): Place => ({
        index: 1 + i,
        tiles: [[o.x + i, o.y + 2]],
        point: { x: left + (i ? 20 : 12), y: bottom + 6 },
        view: 'back',
        face: 1,
        lift: null,
        alone: ['singWell'],
        together: null,
        over,
        aim: water,
      }));
      return [crank, ...lean];
    }
    case 'swing': {
      // The drawing's top-left (30 x 40 with its outline margin), where the moving seat is stamped (swingSeatSprite).
      const drawing = { x: left, y: bottom - 41 };
      const seatTiles: Tile[] = [[o.x, o.y + 2], [o.x + 1, o.y + 2], [o.x - 1, o.y + 1], [o.x + 2, o.y + 1]];
      if (!profile) {
        return [{ index: 0, tiles: seatTiles, point: { x: left + 16, y: bottom + 1 }, view: 'front', face: 1, lift: 16, alone: ['swingFront'], together: null, over, aim: drawing }];
      }
      // Seen from the side it swings forward and back; a grown-up may come and push a child from behind.
      const mirrored = o.rot === 3;
      const face = mirrored ? -1 : 1;
      return [
        { index: 0, tiles: seatTiles, point: { x: left + (mirrored ? 13 : 18), y: bottom + 1 }, view: 'side', face, lift: 16, alone: ['swingSide'], together: 'swingPushed', over, aim: drawing },
        {
          index: 1,
          tiles: [mirrored ? [o.x + 2, o.y + 1] : [o.x - 1, o.y + 1]],
          point: { x: mirrored ? left + 34 : left - 2, y: bottom - 2 },
          view: 'side',
          face,
          lift: null,
          alone: [],
          together: 'pushSwing',
          over,
          aim: drawing,
          withChild: true,
        },
      ];
    }
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
    case 'pointBird':
      return !d.reduced && between(ph(since, BIRD_POINT_MS), 0.2, 0.85) ? { view, pose: 'stand', hand: [BODY_X + 10, 4] } : { view, pose: 'stand' };
    case 'feedBirds': {
      const scatter = !d.reduced && ph(since, BIRD_FEED_MS) < 0.18 ? Math.floor(since / 250) % 2 : 0;
      return { view, pose: 'crouchSide', head: [1, 0], hand: [BODY_X + 9 + scatter, 11 - scatter * 2] };
    }
    case 'feedDucks':
      return { view, pose: 'stand', hand: d.reduced ? REST_HAND : throwHand(ph(since, DUCKS_MS), 0.22, THROW_DUCKS) };
    case 'fish':
      return { view, pose: 'stand', hand: ROD_HAND };
    case 'wishCoin':
      return { view, pose: 'stand', hand: d.reduced ? REST_HAND : throwHand(ph(since, COIN_MS), 0.24, THROW_COIN) };
    case 'sitRim':
      return seat(Math.floor(since / 520) % 2);
    case 'crankWell': {
      const p = ph(since, CRANK_MS);
      if (d.reduced || p < 0.65) return { view, pose: 'stand', hand: reachTo(d, d.reduced ? spot.aim : crankGrip(d)) };
      const sip = p > 0.72 && p < 0.92;
      return { view, pose: 'stand', hand: sip ? [BODY_X + 8, 7] : [BODY_X + 8, 12], held: 'waterCup' };
    }
    case 'singWell':
      return { view, pose: 'stand', head: [0, !d.reduced && between(ph(since, SING_MS), 0.1, 0.7) ? 1 : 0] };
    case 'swingFront':
      return seat(Math.sin(swingPhase(d)) > 0 ? 1 : 0);
    case 'swingSide':
    case 'swingPushed': {
      // Holding the rope; the legs out going forward, tucked coming back.
      const forward = !d.reduced && Math.cos(swingPhase(d)) > 0;
      return { view, pose: forward ? 'sitKick' : 'sitSide', hand: [BODY_X + 4, 6] };
    }
    case 'pushSwing':
      return { view, pose: 'stand', hand: !d.reduced && swingAngle(d) < -0.28 ? [BODY_X + 11, 9] : [BODY_X + 9, 10] };
  }
}

// -----------------------------------------------
// THE SWING: the seat moves, whoever sits on it moves with it
// -----------------------------------------------

/** Swinging alone, on one's own time; pushed (and pushing), on the shared clock, a little lower and slower. */
function swingPhase(d: Doing): number {
  if (d.activity === 'swingFront') return (d.since / 1800) * Math.PI * 2;
  return d.activity === 'swingSide' ? (d.since / 2000) * Math.PI * 2 : (d.clock / 2200) * Math.PI * 2;
}

/** The rope's angle from the vertical, toward the front positive. */
function swingAngle(d: Doing): number {
  return Math.sin(swingPhase(d)) * (d.activity === 'swingSide' ? 0.6 : 0.45);
}

const ROPE = 24;

/** Whether this activity sits on the swing's seat (the scene then draws the swing without its own). */
export function isOnSwing(activity: Activity): boolean {
  return activity === 'swingFront' || activity === 'swingSide' || activity === 'swingPushed';
}

/** How far the seat is from its rest, in the drawing's pixels (not mirrored): up and down from the front, on its rope from the side. */
function seatOffset(d: Doing): { dx: number; dy: number } {
  if (d.reduced || !isOnSwing(d.activity)) return { dx: 0, dy: 0 };
  if (d.activity === 'swingFront') return { dx: 0, dy: Math.round(Math.sin(swingPhase(d)) * 2) };
  const a = swingAngle(d);
  return { dx: Math.round(Math.sin(a) * ROPE), dy: Math.round(Math.cos(a) * ROPE) - ROPE };
}

const BIRD_POINT_MS = 7000;
const BIRD_FEED_MS = 8000;
const DUCKS_MS = 6000;
const FISH_MS = 7000;
const COIN_MS = 5200;
const CRANK_MS = 6000;
const SING_MS = 4200;
const REST_HAND: [number, number] = [BODY_X + 7, 12];
const ROD_HAND: [number, number] = [BODY_X + 9, 10];
const THROW_DUCKS: [number, number] = [BODY_X + 9, 7];
const THROW_COIN: [number, number] = [BODY_X + 9, 6];

const between = (p: number, from: number, to: number) => p >= from && p < to;

/** A throw: the hand drawn back, flung up to `up` until `until`, then down at the side. */
function throwHand(p: number, until: number, up: [number, number]): [number, number] {
  if (p < 0.12) return [BODY_X + 3, 12];
  return p < until ? up : REST_HAND;
}

/** Where a hand at posture pixel `hand` is on the farm, for a standing stroller (the pixel arithmetic of doingPlaced). */
function handAt(d: Doing, hand: readonly [number, number]): Point {
  const { point, face, view } = d.spot;
  return { x: point.x + (hand[0] - POSED_MIDDLE + 1) * face, y: point.y - postureRows(d.who, { view, pose: 'stand' }) + hand[1] };
}

/** The posture pixel a standing stroller's hand goes to, to reach `target` on the farm; as close as the arm allows. */
function reachTo(d: Doing, target: Point): [number, number] {
  const { point, face, view } = d.spot;
  const rows = postureRows(d.who, { view, pose: 'stand' });
  const x = POSED_MIDDLE - 1 + Math.round((target.x - point.x) * face);
  const y = Math.round(target.y - point.y) + rows;
  return [Math.min(14, Math.max(BODY_X + 6, x)), Math.min(rows - 1, Math.max(2, y))];
}

/** The well's crank handle, turning round its hub (one turn in 0.6 s). */
function crankGrip(d: Doing): Point {
  const a = (d.since / 600) * Math.PI * 2;
  return { x: d.spot.aim.x + Math.round(Math.cos(a) * 2), y: d.spot.aim.y + Math.round(Math.sin(a) * 2) };
}

/** In a chat, the two take turns: the first spot talks, then the other. */
function talking(d: Doing): boolean {
  return !d.reduced && Math.floor(d.clock / 1700) % 2 === d.spot.index % 2;
}

/** The stroller's drawing for this activity and where it is stamped (whole pixels), `x`/`y` being their point. */
export function doingPlaced(d: Doing, x: number, y: number): Placed {
  const posture = postureOf(d);
  const sprite = posedSprite(d.who, posture);
  // On the swing, the seat carries them: the drawing's offset, turned with the swing.
  const { dx, dy } = seatOffset(d);
  x += dx * d.spot.face;
  y += dy;
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
      return marksOf(d).map(markKey).join(';');
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
      for (const m of marksOf(d)) if (m.layer === 'air') drawMark(ctx, m);
  }
}

/** What happens in the decoration itself (ducks, a float, ripples, seeds and a pecking bird): drawn right after it. */
export function drawOnDecoration(ctx: CanvasRenderingContext2D, d: Doing): void {
  if (d.reduced) return;
  for (const m of marksOf(d)) if (m.layer === 'deco') drawMark(ctx, m);
}

// -----------------------------------------------
// MARKS: the birdhouse, the pond, the fountain and the well
// -----------------------------------------------
// Listed once per image: the same list says when to redraw (effectKey) and what to draw, so the two never disagree.
// 'air' marks go over everything (a bird in flight, a thrown coin, the fishing rod); 'deco' marks are in the
// decoration, drawn right after it and before whoever stands in front of it.

interface Mark {
  layer: 'air' | 'deco';
  /** Top-left of the sprite, or the pixel; whole pixels. */
  x: number;
  y: number;
  /** In fifths, so a fade redraws a few times, not every image. */
  alpha: number;
  colour?: string;
  sprite?: { name: string; image: Sprite; mirrored: boolean; rows?: number };
}

const BIRD = { b: '#9a6a4e', w: '#f2d3a8', o: C.orange, k: OUTLINE };
type BirdLook = 'sit' | 'peck' | 'fly0' | 'fly1';
const BIRD_ROWS: Record<BirdLook, string[]> = {
  sit: ['.bb..', 'bwwbo', '.bbb.', '..k..'],
  peck: ['.....', 'bb...', 'bwwb.', '.bbbo'],
  fly0: ['b.....b', '.b...b.', '..bwbo.', '.......'],
  fly1: ['.......', '..bwbo.', '.b...b.', 'b.....b'],
};
const NOTE = ['..bb', '..b.', '..b.', 'bbb.', 'bb..'];
const FISH = ['.oo.o', 'oooo.', '.oo.o'];
const BREAD = '#f6e5c8';
const SEED = '#d9a339';

const fade = (a: number) => Math.round(Math.max(0, Math.min(1, a)) * 5) / 5;
const lerp = (a: number, b: number, k: number) => a + (b - a) * Math.max(0, Math.min(1, k));

function dot(layer: Mark['layer'], x: number, y: number, colour: string, alpha = 1): Mark {
  return { layer, x: Math.round(x), y: Math.round(y), alpha: fade(alpha), colour };
}

function art(layer: Mark['layer'], name: string, image: Sprite, x: number, y: number, mirrored: boolean, alpha = 1, rows?: number): Mark {
  return { layer, x: Math.round(x), y: Math.round(y), alpha: fade(alpha), sprite: { name, image, mirrored, rows } };
}

/** A little bird, its feet (or its belly in flight) at x, y; it looks right unless mirrored. */
function bird(layer: Mark['layer'], look: BirdLook, x: number, y: number, mirrored: boolean): Mark {
  const image = cached(`stroller-bird-${look}`, () => mapSprite(BIRD_ROWS[look], BIRD));
  return art(layer, look, image, x - Math.floor(image.width / 2), y - image.height + 2, mirrored);
}

/** A point on a throw's arc, `lift` pixels over the straight line at its middle. */
function arc(x0: number, y0: number, x1: number, y1: number, k: number, lift: number): Point {
  return { x: lerp(x0, x1, k), y: lerp(y0, y1, k) - Math.sin(Math.PI * Math.max(0, Math.min(1, k))) * lift };
}

/** Rings that widen on the water and fade; `life` from 0 to 1, nothing outside it. */
function ripple(x: number, y: number, life: number): Mark[] {
  if (life < 0 || life > 1) return [];
  const rx = 1 + Math.round(life * 5);
  const ry = Math.max(1, Math.round(rx / 2.5));
  const seen = new Set<string>();
  const out: Mark[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const m = dot('deco', x + Math.cos(a) * rx, y + Math.sin(a) * ry, C.waterLight, 1 - life);
    if (!seen.has(`${m.x},${m.y}`)) out.push(m);
    seen.add(`${m.x},${m.y}`);
  }
  return out;
}

/** A glint that grows, turns gold and fades; `life` from 0 to 1. */
function glint(x: number, y: number, life: number): Mark[] {
  if (life < 0 || life > 1) return [];
  const r = life < 0.5 ? 1 : 2;
  const colour = life < 0.5 ? '#fff6c8' : C.gold;
  return [[0, 0], [-r, 0], [r, 0], [0, -r], [0, r]].map(([dx, dy]) => dot('air', x + dx, y + dy, colour, 1 - life * 0.6));
}

function marksOf(d: Doing): Mark[] {
  if (d.reduced) return [];
  const { point: at, face, aim } = d.spot;
  const t = d.since;
  const out: Mark[] = [];
  switch (d.activity) {
    case 'pointBird': {
      // The bird looks out of its hole, flies a round between the house and the one pointing at it, goes back in.
      const p = ph(t, BIRD_POINT_MS);
      if (between(p, 0.2, 0.3) || between(p, 0.8, 0.86)) out.push(bird('air', 'sit', aim.x, aim.y + 1, at.x < aim.x));
      else if (between(p, 0.3, 0.8)) {
        // A round over the house's side, never over the head of the one pointing.
        const a = ((p - 0.3) / 0.5) * Math.PI * 2;
        const dir = Math.sign(aim.x - at.x) || 1;
        const x = aim.x - dir * 5 + dir * 6 * Math.cos(a);
        out.push(bird('air', Math.floor(t / 140) % 2 ? 'fly1' : 'fly0', x, aim.y - 4 - Math.sin(a) * 9, -dir * Math.sin(a) < 0));
      }
      return out;
    }
    case 'feedBirds': {
      // Seeds scattered between the two; the bird comes down to peck them, then flies home.
      const p = ph(t, BIRD_FEED_MS);
      const seeds = { x: at.x + face * 8, y: at.y };
      if (p > 0.08) for (const [dx, dy] of [[-2, 0], [1, 1], [3, 0], [0, -1]]) out.push(dot('deco', seeds.x + dx, seeds.y + dy, SEED));
      const flap = Math.floor(t / 120) % 2 ? 'fly1' : 'fly0';
      if (between(p, 0.22, 0.38)) {
        const b = arc(aim.x, aim.y, seeds.x, seeds.y - 2, (p - 0.22) / 0.16, 6);
        out.push(bird('air', flap, b.x, b.y, seeds.x < aim.x));
      } else if (between(p, 0.38, 0.82)) {
        out.push(bird('deco', Math.floor(t / 260) % 3 === 0 ? 'peck' : 'sit', seeds.x, seeds.y, face > 0));
      } else if (between(p, 0.82, 0.97)) {
        const b = arc(seeds.x, seeds.y - 2, aim.x, aim.y, (p - 0.82) / 0.15, 6);
        out.push(bird('air', flap, b.x, b.y, aim.x < seeds.x));
      }
      return out;
    }
    case 'feedDucks': {
      // Crumbs fall on the water near the bank; two ducks swim over from the far side, dabble, and swim back.
      const p = ph(t, DUCKS_MS);
      const hand = handAt(d, THROW_DUCKS);
      const bread = { x: aim.x - face * 3, y: aim.y };
      if (between(p, 0.15, 0.38)) {
        for (let i = 0; i < 3; i++) {
          const c = arc(hand.x, hand.y, bread.x - 3 + i * 3, bread.y, (p - 0.15) / 0.23, 9 + i);
          out.push(dot('air', c.x, c.y, BREAD));
        }
      }
      out.push(...ripple(bread.x, bread.y, (p - 0.38) / 0.35));
      if (p >= 0.3) {
        const alpha = Math.min((p - 0.3) / 0.06, (1 - p) / 0.06);
        const homes = [{ x: aim.x + face * 8, y: aim.y - 2 }, { x: aim.x + face * 2, y: aim.y + 3 }];
        const meals = [{ x: bread.x + face * 6, y: bread.y - 2 }, { x: bread.x - face * 3, y: bread.y + 3 }];
        const dabbling = between(p, 0.6, 0.8);
        const frame = dabbling ? (Math.floor(t / 500) % 2 as 0 | 1) : 0;
        const going = p < 0.8;
        homes.forEach((home, i) => {
          const there = { x: lerp(home.x, meals[i].x, (p - 0.36) / 0.24), y: lerp(home.y, meals[i].y, (p - 0.36) / 0.24) };
          const x = lerp(there.x, home.x, (p - 0.8) / 0.14);
          const y = lerp(there.y, home.y, (p - 0.8) / 0.14);
          // Toward the bread, then back home: the drawing looks right.
          const mirrored = going ? meals[i].x < home.x : home.x < meals[i].x;
          // The feet are under the water: the drawing is cut above them.
          out.push(art('deco', `duck${frame}`, animalSprite('duck', frame), x - 5, y - 6, mirrored, alpha, 7));
        });
      }
      return out;
    }
    case 'fish': {
      // A rod over the water, a float that dips, a fish that jumps.
      const p = ph(t, FISH_MS);
      const hand = handAt(d, ROD_HAND);
      const tip = { x: hand.x + face * 15, y: hand.y - 14 };
      for (let i = 0; i <= 15; i++) out.push(dot('air', lerp(hand.x, tip.x, i / 15), lerp(hand.y, tip.y, i / 15), C.woodDark));
      const float = { x: aim.x - face * 2, y: aim.y - 1 + (between(p, 0.55, 0.62) ? 1 : 0) };
      for (let i = 1; i < 12; i++) {
        const k = i / 12;
        out.push(dot('air', lerp(tip.x, float.x, k) + face * Math.sin(k * Math.PI) * 2, lerp(tip.y, float.y - 1, k), C.white, 0.6));
      }
      out.push(dot('deco', float.x, float.y - 1, C.red), dot('deco', float.x, float.y, C.white));
      if (between(p, 0.62, 0.8)) {
        const f = arc(float.x, float.y, float.x + face * 6, float.y, (p - 0.62) / 0.18, 9);
        const image = cached('stroller-fish', () => mapSprite(FISH, { o: '#f08a2b' }));
        out.push(art('air', 'fish', image, f.x - 3, f.y - 2, face > 0));
      }
      out.push(...ripple(float.x, float.y + 1, (p - 0.6) / 0.3));
      return out;
    }
    case 'wishCoin': {
      // A coin flicked up over the rim: it lands in the basin, rings on the water, a glint.
      const p = ph(t, COIN_MS);
      const hand = handAt(d, THROW_COIN);
      const land = { x: aim.x - face * 4, y: aim.y };
      if (between(p, 0.16, 0.42)) {
        const c = arc(hand.x, hand.y, land.x, land.y, (p - 0.16) / 0.26, 16);
        out.push(dot('air', c.x, c.y, C.gold), dot('air', c.x, c.y - 1, C.goldLight));
      }
      out.push(...ripple(land.x, land.y, (p - 0.42) / 0.3), ...glint(land.x + 2, land.y - 3, (p - 0.42) / 0.25));
      return out;
    }
    case 'sitRim':
      // Drops leaping where the two falls meet the basin, beside the one sitting on its rim.
      for (const side of [-1, 1]) {
        const k = ph(t + (side > 0 ? 750 : 0), 1500);
        const drop = arc(aim.x + side * 10, aim.y - 1, aim.x + side * 12, aim.y + 1, k, 4);
        out.push(dot('deco', drop.x, drop.y, C.waterLight));
      }
      return out;
    case 'crankWell': {
      if (ph(t, CRANK_MS) >= 0.65) return out;
      const grip = crankGrip(d);
      out.push(dot('deco', aim.x, aim.y, IRON), dot('deco', grip.x, grip.y, IRON_LIGHT));
      return out;
    }
    case 'swingFront':
    case 'swingSide':
    case 'swingPushed': {
      // The ropes and the seat, where the swing's own drawing has none while someone swings.
      const { dx, dy } = seatOffset(d);
      const view = d.spot.view === 'front' ? 'face' : 'profile';
      out.push(art('deco', `seat${view}${dx},${dy}`, swingSeatSprite(view, dx, dy), aim.x, aim.y, d.spot.face < 0));
      return out;
    }
    case 'singWell': {
      // Notes rising out of the well, the song's echo.
      const p = ph(t, SING_MS);
      const note = cached('stroller-note', () => mapSprite(NOTE, { b: '#5c9fd6' }));
      for (let i = 0; i < 2; i++) {
        const k = (p - 0.25 - i * 0.18) / 0.5;
        if (k < 0 || k > 1) continue;
        out.push(art('air', 'note', note, aim.x - 6 + i * 6 + Math.sin(k * 6) * 2, aim.y - 2 - k * 16, false, 1 - k));
      }
      return out;
    }
    default:
      return out;
  }
}

function markKey(m: Mark): string {
  return `${m.layer[0]}${m.x},${m.y},${m.alpha},${m.colour ?? `${m.sprite!.name}${m.sprite!.mirrored ? 'm' : ''}`}`;
}

function drawMark(ctx: CanvasRenderingContext2D, m: Mark): void {
  if (m.alpha <= 0) return;
  ctx.globalAlpha = m.alpha;
  if (m.colour) {
    ctx.fillStyle = m.colour;
    ctx.fillRect(m.x, m.y, 1, 1);
  } else if (m.sprite) {
    const { image, mirrored, rows } = m.sprite;
    const h = rows ?? image.height;
    ctx.save();
    ctx.translate(mirrored ? m.x + image.width : m.x, m.y);
    if (mirrored) ctx.scale(-1, 1);
    ctx.drawImage(image, 0, 0, image.width, h, 0, 0, image.width, h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
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
