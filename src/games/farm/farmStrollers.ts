import { charmOf, charmStep } from './data/charm';
import { MAP_SIZE } from './data/land';
import { PERSON_IDS } from './data/people';
import { placeable } from './data/placeables';
import type { PersonId } from './data/types';
import { TILE, heartSprite } from './farmArt';
import { footprint, gateTile } from './farmMap';
import { averageOrderNuts, canDeliver } from './farmOrders';
import { WalkMap, isWalkable, type Tile } from './farmPaths';
import { isChild, placedKey, villagerSprite, type PersonView, type Placed } from './farmPeopleArt';
import { doingPlaced, drawEffects, drawOnDecoration, isMirrored, isOnSwing, onGround, spotsOf, type Activity, type Doing, type Point, type Spot } from './farmStrollerActs';
import { charm } from './farmProgress';
import type { FarmSave, PlacedObject } from './farmSave';
import type { VillagePainter } from './farmVillage';

// -----------------------------------------------
// THE STROLLERS: villagers who visit the farm, stop before its decorations, and leave a tip when touched (docs/ferme.md 22)
// -----------------------------------------------
// How many at once follows the charm step (CharmStep.strollers). They come up the road, walk the farm tile by tile
// (farmPaths: the paths first), stop at two or three decorations, and go home. Nothing here is saved. At a decoration
// with activities (farmStrollerActs) they sit, sip or smell the flowers; at the others they stand and look.
// A villager whose order can be served is never a stroller: the village takes them back (release) for the gate.

/** A tip is this share of an average order of the farm's level, at least one Eloisette. */
export const STROLLER_TIP_PERCENT = 3;
const STROLL_PX_PER_MS = 0.02;
const STEP_MS = 190;
const ARRIVAL_MS = { min: 20_000, max: 40_000 };
/** When nobody is free to come, look again this much later. */
const RETRY_MS = 5_000;
/** Long stops: a visit lasts about six minutes, so the tips stay a small share of the farm's income (MESURE in docs/ferme.md 22). */
const STOP_MS = { min: 110_000, max: 140_000 };
/** Decorations looked at in one visit. */
const STOPS_PER_VISIT = 3;
/** A heart rises over a stroller's head this long. */
const HEART_MS = 1_400;
/** Wandering a farm without decorations: how far from the gate, in step costs (farmPaths). */
const WANDER_REACH = 12;
/** Where everyone comes from and goes back to: down the road, as in farmVillage. */
const ROAD_END_Y = (MAP_SIZE + 6) * TILE;
/** Decorations along a line are not looked at: one stops before a well, not a fence. */
const NOT_LOOKED_AT = new Set(['fence', 'hedge', 'wall']);
const STORAGE_KEY = 'farm-strollers';

export type { Point };

interface Stop {
  /** The decoration looked at; null on a farm without any, where the stroller just stands a moment. */
  uid: number | null;
  tile: Tile;
  point: Point;
  view: PersonView;
  face: 1 | -1;
  heart: boolean;
  /** Where the decoration stood when the stop was planned: moved or put away, the stop is dropped. */
  where: string | null;
  /** A place of a decoration with activities; null: standing before it, looking. */
  spot: Spot | null;
  /** What is done there alone: one activity, or two one after the other. */
  acts: Activity[];
}

interface Stroller {
  who: PersonId;
  x: number;
  y: number;
  route: Point[];
  /** Where the current walk leads: a stop, or home. */
  heading: Stop | 'home';
  stops: Stop[];
  /** Standing before this stop, for `pause` more milliseconds out of `stay`. */
  at: Stop | null;
  pause: number;
  stay: number;
  /** The activity under way at the stop, and since when (milliseconds). */
  doing: Activity | null;
  since: number;
  /** The decoration just left, whose tile the first steps may still cross (stepping down from a seat). */
  from: number | null;
  view: PersonView;
  face: 1 | -1;
  clock: number;
  /** Already gave a tip: touching again only brings a heart. */
  tipped: boolean;
  /** Milliseconds left of the heart over the head. */
  heart: number;
}

/** The tip a stroller leaves when touched, by the farm's level. */
export function strollerTip(level: number): number {
  return Math.max(1, Math.round((averageOrderNuts(level) * STROLLER_TIP_PERCENT) / 100));
}

/** How many strollers visit at once on this farm. */
export function strollerCap(save: FarmSave): number {
  return charmStep(charm(save)).step.strollers;
}

/** The player's choice in the farm's menu, kept on this device like the music volume. */
export function strollersEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** Feet position on a tile, as the village stands its walkers. */
export function tilePoint([x, y]: Tile): Point {
  return { x: (x + 0.5) * TILE, y: y * TILE + 12 };
}

export function tileOf(p: Point): Tile {
  return [Math.floor(p.x / TILE), Math.floor(p.y / TILE)];
}

/** The way from a point on the farm to a tile, as feet positions; empty when there is none. */
export function pathPoints(save: FarmSave, from: Point, to: Tile): Point[] {
  return new WalkMap(save, tileOf(from)).routeTo(to).slice(1).map(tilePoint);
}

export class FarmStrollers {
  private readonly save: FarmSave;
  private readonly reduced: boolean;
  /** Whether the village has this villager on the map already (at the gate, on the road). */
  private readonly isBusy: (who: PersonId) => boolean;
  private readonly random: () => number;
  private strollers: Stroller[] = [];
  private arriveIn = 0;
  private started = false;
  /** Milliseconds since the farm opened: two strollers at the same decoration keep time on it. */
  private clock = 0;
  private enabled = strollersEnabled();

  constructor(save: FarmSave, reduced: boolean, isBusy: (who: PersonId) => boolean, random: () => number = Math.random) {
    this.save = save;
    this.reduced = reduced;
    this.isBusy = isBusy;
    this.random = random;
  }

/**
   * Who is on the farm and where (feet, world pixels); `leaving` once on the way home; `on`: the decorations whose
   * tiles they may stand on (the one they sit on or step onto, the one they step down from); `at`: the decoration
   * they stopped at, `doing`: their activity there.
   */
  get people(): { who: PersonId; x: number; y: number; leaving: boolean; on: number[]; at: number | null; doing: Activity | null }[] {
    return this.strollers.map((s) => {
      const target = s.at ?? (s.heading === 'home' ? null : s.heading);
      const on = [target?.spot ? target.uid : null, s.from].filter((uid): uid is number => uid !== null);
      return { who: s.who, x: s.x, y: s.y, leaving: s.heading === 'home', on, at: s.at?.uid ?? null, doing: s.doing };
    });
  }

  /** Someone sits on this swing: the scene draws it without its seat, which moves with them (farmStrollerActs). */
  isSwinging(uid: number): boolean {
    return !this.reduced && this.strollers.some((s) => s.at?.uid === uid && s.doing !== null && isOnSwing(s.doing));
  }

  isStrolling(who: PersonId): boolean {
    return this.strollers.some((s) => s.who === who);
  }

  /** Someone is walking: the scene follows each of their steps (stepKey). */
  get isMoving(): boolean {
    return this.strollers.some((s) => s.route.length > 0);
  }

  /** Changes exactly when a stroller's image moves by a pixel or takes its next step. */
  get stepKey(): string {
    return this.strollers.map((s) => placedKey(this.placed(s))).join(';');
  }

  /** `away`: the player has not touched anything for a while; nobody new comes, the others finish their visit. */
  update(dt: number, away: boolean): void {
    if (!this.started) {
      this.started = true;
      // Opening the farm finds half of them already before a decoration.
      if (this.enabled) for (let i = 0; i < Math.ceil(strollerCap(this.save) / 2); i++) this.arrive(true);
      this.arriveIn = this.between(ARRIVAL_MS);
    }
    this.clock += dt;
    this.arriveIn -= dt;
    if (this.arriveIn <= 0) {
      const room = this.enabled && !away && this.strollers.filter((s) => s.heading !== 'home').length < strollerCap(this.save);
      this.arriveIn = room && !this.arrive(false) ? RETRY_MS : this.between(ARRIVAL_MS);
    }
    for (const s of this.strollers) this.move(s, dt);
    this.strollers = this.strollers.filter((s) => !(s.heading === 'home' && s.route.length === 0));
  }

  /** Turned off in the menu: everyone goes home; turned on: the next one comes soon. */
  setEnabled(on: boolean): void {
    this.enabled = on;
    try {
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    } catch {
      // Private browsing: the choice lasts until the farm closes.
    }
    if (on) this.arriveIn = Math.min(this.arriveIn, RETRY_MS);
    else for (const s of this.strollers) if (s.heading !== 'home') this.goHome(s);
  }

  /** The village needs this villager at the gate (their order can be served): they stop strolling, here. */
  release(who: PersonId): Point | null {
    const s = this.strollers.find((v) => v.who === who);
    if (!s) return null;
    this.strollers = this.strollers.filter((v) => v !== s);
    // Off a seat or a flower bed first: the village walks them from a tile that can be walked.
    return s.at?.spot ? tilePoint(s.at.spot.tile) : { x: s.x, y: s.y };
  }

  /** The stroller under a world point, if any. */
  private at(wx: number, wy: number): Stroller | null {
    for (const s of this.strollers) {
      const lift = s.at?.spot?.lift ?? 0;
      if (Math.abs(wx - s.x) <= 7 && wy >= s.y - lift - 32 && wy <= s.y - lift + 2) return s;
    }
    return null;
  }

  isAt(wx: number, wy: number): boolean {
    return this.at(wx, wy) !== null;
  }

  /** A touch: a heart over the stroller; `first` the first time (the screen pays the tip); null when nobody is there. */
  touch(wx: number, wy: number): { first: boolean; head: Point } | null {
    const s = this.at(wx, wy);
    if (!s) return null;
    const first = !s.tipped;
    s.tipped = true;
    s.heart = HEART_MS;
    return { first, head: { x: s.x, y: s.y - (s.at?.spot?.lift ?? 0) - 30 } };
  }

  // -----------------------------------------------
  // DRAWING
  // -----------------------------------------------

  /**
   * The strollers among the scene's drawables, sorted with everything else by their feet (in front of the decoration
   * they work at, when their spot says so); what they make happen in a decoration comes right after its drawing.
   */
  queue(list: { base: number; draw: () => void }[], paint: VillagePainter, ctx: CanvasRenderingContext2D): void {
    for (const s of this.strollers) {
      const { sprite, x, y } = this.placed(s);
      const doing = this.doingOf(s);
      if (doing) list.push({ base: doing.spot.depth + 0.01, draw: () => drawOnDecoration(ctx, doing) });
      list.push({
        base: (doing?.spot.inFront ? Math.max(s.y, doing.spot.depth) : s.y) + 0.5,
        draw: () => {
          if (!doing) paint.shadow(x + 2, y + sprite.height - 2, sprite.width - 4);
          else if (onGround(doing)) paint.shadow(Math.round(s.x) - 4, y + sprite.height - 2, 8);
          paint.stamp(sprite, x, y, doing ? isMirrored(doing) : s.view === 'side' && s.face < 0);
        },
      });
    }
  }

  /** Over everything: what goes with the activities (speech, petals, a butterfly), then the hearts, rising and fading. */
  drawHearts(ctx: CanvasRenderingContext2D): void {
    for (const s of this.strollers) {
      const doing = this.doingOf(s);
      if (doing) drawEffects(ctx, doing, this.placed(s));
    }
    const heart = heartSprite();
    for (const s of this.strollers) {
      if (s.heart <= 0) continue;
      const done = 1 - s.heart / HEART_MS;
      const top = this.doingOf(s) ? this.placed(s).y + 1 : s.y - villagerSprite(s.who, 'front', 0).height;
      ctx.globalAlpha = Math.min(1, (1 - done) * 3);
      ctx.drawImage(heart, Math.round(s.x - heart.width / 2), Math.round(top - heart.height - 1 - done * 6));
    }
    ctx.globalAlpha = 1;
  }

  /** What a stroller is doing at a decoration with activities, or null (walking, or standing before a plain one). */
  private doingOf(s: Stroller): Doing | null {
    if (!s.at?.spot || !s.doing) return null;
    return { who: s.who, spot: s.at.spot, activity: s.doing, since: s.since, clock: this.clock, reduced: this.reduced };
  }

  /** A stroller's image this frame and where it is stamped, in whole pixels. */
  private placed(s: Stroller): Placed {
    const doing = this.doingOf(s);
    if (doing) return doingPlaced(doing, s.x, s.y);
    const frame = (s.route.length > 0 ? Math.floor(s.clock / STEP_MS) % 2 : 0) as 0 | 1;
    const sprite = villagerSprite(s.who, s.view, frame);
    return { sprite, x: Math.round(s.x - sprite.width / 2), y: Math.round(s.y - sprite.height + 1), pose: `${s.view}${frame}${s.face}` };
  }

  /** The activity now: together when someone else is at the decoration's other spot, else their own. */
  private activityOf(s: Stroller): Activity | null {
    const stop = s.at;
    if (!stop?.spot) return null;
    const together = stop.spot.together;
    if (together && this.strollers.some((o) => o !== s && o.at?.spot && o.at.uid === stop.uid)) return together;
    return (stop.acts.length > 1 && s.pause < s.stay / 2 ? stop.acts[1] : stop.acts[0]) ?? null;
  }

  // -----------------------------------------------
  // VISITS
  // -----------------------------------------------

  /** Someone else is at, or on the way to, another spot of the same decoration. */
  private partnerComing(s: Stroller): boolean {
    const uid = s.at?.uid;
    return this.strollers.some((o) => {
      if (o === s) return false;
      const stop = o.at ?? (o.heading === 'home' ? null : o.heading);
      return !!stop?.spot && stop.uid === uid;
    });
  }

  /** A free villager comes: up the road, or already before their first decoration. False when nobody can come. */
  private arrive(already: boolean): boolean {
    const free = PERSON_IDS.filter((who) => who !== 'gaston' && !this.isBusy(who) && !this.isStrolling(who) && !this.save.orders.some((o) => o.who === who && canDeliver(this.save, o)));
    if (free.length === 0) return false;
    const who = free[Math.floor(this.random() * free.length)];
    const gate = gateTile(this.save);
    const stops = this.planStops(gate, who);
    if (stops.length === 0) return false;
    const start = tilePoint(gate);
    const s: Stroller = { who, x: start.x, y: ROAD_END_Y, route: [start], heading: stops[0], stops, at: null, pause: 0, stay: 0, doing: null, since: 0, from: null, view: 'back', face: 1, clock: 0, tipped: false, heart: 0 };
    if (already || this.reduced) {
      s.route = [];
      s.x = stops[0].point.x;
      s.y = stops[0].point.y;
      this.standAt(s, stops.shift()!);
      if (already) s.pause = s.stay * this.random();
    }
    this.strollers.push(s);
    return true;
  }

  /**
   * Three decorations to visit (fewer on a farm that has fewer), the more charming the likelier, nearest first; or two
   * spots to stand on. A decoration is one stroller's, except the second spot of one where two do something together.
   * At a decoration whose places cannot be reached, the stroller stands before it, as at a plain one. The spot that
   * pushes the swing is a grown-up's, and only while a child has (or is coming to) the seat.
   */
  private planStops(from: Tile, who: PersonId): Stop[] {
    const walk = new WalkMap(this.save, from);
    const planned = this.strollers.flatMap((s) => [...s.stops, ...(s.at ? [s.at] : []), ...(s.heading !== 'home' ? [s.heading] : [])].map((stop) => ({ stop, who: s.who })));
    const taken = new Set(planned.map(({ stop }) => stop.uid));
    const takenSpots = new Set(planned.filter(({ stop }) => stop.spot).map(({ stop }) => `${stop.uid}:${stop.spot!.index}`));
    const childAt = new Set(planned.filter(({ stop, who: other }) => stop.spot && isChild(other)).map(({ stop }) => stop.uid));
    const looks: { stop: Stop; weight: number }[] = [];
    for (const o of this.save.objects) {
      const p = placeable(o.type);
      if (o.on !== undefined || p.kind !== 'deco' || p.flat || NOT_LOOKED_AT.has(p.joins ?? '')) continue;
      const free = spotsOf(o, walk).filter((spot) => {
        const open = !takenSpots.has(`${o.uid}:${spot.index}`);
        if (spot.withChild) return open && childAt.has(o.uid) && !isChild(who);
        return !taken.has(o.uid) || (spot.together !== null && open);
      });
      const heart = this.random() < charmOf(o.type) / (charmOf(o.type) + 10);
      const weight = Math.max(0.5, charmOf(o.type));
      if (free.length > 0) {
        const spot = free[Math.floor(this.random() * free.length)];
        looks.push({ stop: { uid: o.uid, tile: spot.tile, point: spot.point, view: spot.view, face: spot.face, heart, where: whereOf(o), spot, acts: this.pickActs(spot) }, weight });
        continue;
      }
      if (taken.has(o.uid)) continue;
      const stop = standBefore(o, walk);
      if (stop) looks.push({ stop: { ...stop, heart, where: whereOf(o), spot: null, acts: [] }, weight });
    }
    const chosen: Stop[] = [];
    const wanted = STOPS_PER_VISIT;
    while (chosen.length < wanted && looks.length > 0) {
      let roll = this.random() * looks.reduce((sum, l) => sum + l.weight, 0);
      const i = Math.max(0, looks.findIndex((l) => (roll -= l.weight) < 0));
      chosen.push(looks.splice(i, 1)[0].stop);
    }
    if (chosen.length === 0) return this.wander(walk, from);
    // Nearest first, then the nearest to that one: no zigzag across the farm.
    const ordered: Stop[] = [];
    let here = from;
    while (chosen.length > 0) {
      chosen.sort((a, b) => distance(here, a.tile) - distance(here, b.tile));
      const next = chosen.shift()!;
      ordered.push(next);
      here = next.tile;
    }
    return ordered;
  }

  /** No decoration on the farm: two reachable spots near the gate, on a path when there is one. */
  private wander(walk: WalkMap, from: Tile): Stop[] {
    const near: Tile[] = [];
    for (let y = 0; y <= MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        if ((x !== from[0] || y !== from[1]) && walk.costTo([x, y]) <= WANDER_REACH) near.push([x, y]);
      }
    }
    const paths = near.filter(([x, y]) => walk.costTo([x, y]) > 0 && onPath(this.save, x, y));
    const pool = paths.length >= 2 ? paths : near;
    const stops: Stop[] = [];
    for (let i = 0; i < 2 && pool.length > 0; i++) {
      const tile = pool.splice(Math.floor(this.random() * pool.length), 1)[0];
      stops.push({ uid: null, tile, point: tilePoint(tile), view: 'front', face: 1, heart: false, where: null, spot: null, acts: [] });
    }
    return stops;
  }

  /** One activity, or (half the time, when there are more) two different ones, one after the other. */
  private pickActs(spot: Spot): Activity[] {
    const pool = [...spot.alone];
    if (pool.length === 0) return [];
    const first = pool.splice(Math.floor(this.random() * pool.length), 1)[0];
    if (pool.length === 0 || this.random() < 0.5) return [first];
    return [first, pool[Math.floor(this.random() * pool.length)]];
  }

  private standAt(s: Stroller, stop: Stop): void {
    s.stops = s.stops.filter((other) => other !== stop);
    s.at = stop;
    s.heading = stop;
    s.stay = this.between(STOP_MS);
    s.pause = s.stay;
    s.doing = null;
    s.view = stop.view;
    s.face = stop.face;
    if (stop.heart) s.heart = HEART_MS;
  }

  /** Where the way on starts: off a seat or a flower bed, from the tile walked to before stepping onto it. */
  private leave(s: Stroller): { start: Tile; first: Point[] } {
    const spot = s.at?.spot;
    s.from = spot ? s.at!.uid : null;
    s.at = null;
    s.doing = null;
    return spot ? { start: spot.tile, first: [tilePoint(spot.tile)] } : { start: tileOf(s), first: [] };
  }

  /** On to the next stop that can still be reached, or home. */
  private walkOn(s: Stroller): void {
    const { start, first } = this.leave(s);
    const walk = new WalkMap(this.save, start);
    while (s.stops.length > 0) {
      const stop = s.stops.shift()!;
      if (!this.stillThere(stop)) continue;
      const route = walk.routeTo(stop.tile).slice(1).map(tilePoint);
      if (route.length === 0 && !sameTile(start, stop.tile)) continue;
      s.route = [...first, ...route, stop.point];
      s.heading = stop;
      return;
    }
    this.goHome(s, start, first);
  }

  private goHome(s: Stroller, start?: Tile, first: Point[] = []): void {
    if (!start) ({ start, first } = this.leave(s));
    s.stops = [];
    s.heading = 'home';
    const gate = gateTile(this.save);
    const route = new WalkMap(this.save, start).routeTo(gate).slice(1).map(tilePoint);
    s.route = [...first, ...route, tilePoint(gate), { x: tilePoint(gate).x, y: ROAD_END_Y }];
  }

  /** The decoration of a stop is still where it was when the stop was planned. */
  private stillThere(stop: Stop): boolean {
    if (stop.uid === null) return true;
    const o = this.save.objects.find((other) => other.uid === stop.uid);
    return !!o && whereOf(o) === stop.where;
  }

  private move(s: Stroller, dt: number): void {
    if (s.heart > 0) s.heart -= dt;
    if (s.at) {
      s.pause -= dt;
      if (s.pause <= 0 || !this.stillThere(s.at)) {
        this.walkOn(s);
        return;
      }
      const now = this.activityOf(s);
      if (!now && s.at.spot?.withChild && !this.partnerComing(s)) {
        // The child left the swing: nothing more to push.
        this.walkOn(s);
        return;
      }
      if (now !== s.doing) {
        s.doing = now;
        s.since = 0;
      } else s.since += dt;
      return;
    }
    if (s.heading !== 'home' && !this.stillThere(s.heading)) {
      // Its decoration was moved or put away on the way: on to the next one, from where they are.
      this.walkOn(s);
      return;
    }
    if (this.reduced && s.route.length > 0) {
      const end = s.route.at(-1)!;
      s.x = end.x;
      s.y = end.y;
      s.route = [];
    }
    const target = s.route[0];
    if (!target) {
      // Up the road to the gate, or at the end of a walk: stand there if it is the stop, else walk on to it.
      if (s.heading === 'home') return;
      if (Math.hypot(s.x - s.heading.point.x, s.y - s.heading.point.y) <= 0.5) this.standAt(s, s.heading);
      else this.walkOn(s);
      return;
    }
    s.clock += dt;
    const dx = target.x - s.x;
    const dy = target.y - s.y;
    const length = Math.hypot(dx, dy);
    const step = dt * STROLL_PX_PER_MS;
    if (length > 0.5) {
      if (Math.abs(dy) > Math.abs(dx)) s.view = dy > 0 ? 'front' : 'back';
      else {
        s.view = 'side';
        s.face = dx > 0 ? 1 : -1;
      }
    }
    if (length > step) {
      s.x += (dx / length) * step;
      s.y += (dy / length) * step;
      return;
    }
    s.x = target.x;
    s.y = target.y;
    s.route.shift();
    s.from = null;
    // Something was placed across the way meanwhile: find another way to the same stop.
    const next = s.route[0];
    if (next && s.heading !== 'home' && next !== s.heading.point && !isWalkable(this.save, ...tileOf(next))) {
      s.stops.unshift(s.heading);
      this.walkOn(s);
    }
  }

  private between(range: { min: number; max: number }): number {
    return range.min + this.random() * (range.max - range.min);
  }
}

/** Where an object stands and how it is turned, to notice it was moved. */
function whereOf(o: PlacedObject): string {
  return `${o.x},${o.y},${o.rot}`;
}

/**
 * Where to stand to look at a decoration: in front of it (south, our back to the camera) when that side can be
 * reached, centred under it when the whole side is free; else beside it, facing it; else behind it.
 */
function standBefore(o: PlacedObject, walk: WalkMap): Pick<Stop, 'uid' | 'tile' | 'point' | 'view' | 'face'> | null {
  const [w, h] = footprint(o);
  const south: Tile[] = Array.from({ length: w }, (_, i) => [o.x + i, o.y + h]);
  const free = south.filter((t) => walk.canReach(t));
  if (free.length === w) {
    const tile = south[Math.floor((w - 1) / 2)];
    return { uid: o.uid, tile, point: { x: (o.x + w / 2) * TILE, y: tilePoint(tile).y }, view: 'back', face: 1 };
  }
  if (free.length > 0) return { uid: o.uid, tile: free[0], point: tilePoint(free[0]), view: 'back', face: 1 };
  const west: Tile = [o.x - 1, o.y + h - 1];
  if (walk.canReach(west)) return { uid: o.uid, tile: west, point: tilePoint(west), view: 'side', face: 1 };
  const east: Tile = [o.x + w, o.y + h - 1];
  if (walk.canReach(east)) return { uid: o.uid, tile: east, point: tilePoint(east), view: 'side', face: -1 };
  const north: Tile = [o.x + Math.floor((w - 1) / 2), o.y - 1];
  if (walk.canReach(north)) return { uid: o.uid, tile: north, point: tilePoint(north), view: 'front', face: 1 };
  return null;
}

function onPath(save: FarmSave, x: number, y: number): boolean {
  return save.objects.some((o) => o.x === x && o.y === y && placeable(o.type).flat);
}

function distance(a: Tile, b: Tile): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function sameTile(a: Tile, b: Tile): boolean {
  return a[0] === b[0] && a[1] === b[1];
}
