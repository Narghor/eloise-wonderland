import { MAP_SIZE } from './data/land';
import type { ItemId, PersonId } from './data/types';
import { TILE, heartSprite, itemIcon, readyBubble, type Sprite } from './farmArt';
import { gateTile } from './farmMap';
import { canDeliver } from './farmOrders';
import { basketSprite, bikeSprite, villagerSprite, type PersonView } from './farmPeopleArt';
import type { FarmSave, Order } from './farmSave';

// -----------------------------------------------
// THE VILLAGE ON THE MAP: villagers come to the gate for the orders that can be served, Gaston rides to the mailbox
// -----------------------------------------------
// Only what the player can act on comes to the farm: a villager waits at the gate while their order can be
// delivered, and goes home when it is served (with a basket) or can no longer be (empty-handed).
// Nothing here is saved: the walkers are rebuilt from the orders each time the farm opens.

/** Villagers waiting at the gate at once; the other orders wait on the board only. */
const MAX_WAITING = 3;
/** Where they wait: in the middle of the gate's yard, then on its left, then on its right (pixels from the road). */
const WAITING_OFFSETS = [0, -18, 18];
const WALK_PX_PER_MS = 0.028;
const BIKE_PX_PER_MS = 0.075;
const STEP_MS = 170;
/** Gaston's stop at the mailbox. */
const DROP_MS = 1400;
/** How often the queue is checked against the orders and the barn. */
const SYNC_MS = 400;
/** Where everyone comes from and goes back to: down the road, in the forest south of the map. */
const ROAD_END_Y = (MAP_SIZE + 6) * TILE;

interface Point {
  x: number;
  y: number;
}

interface Walker {
  who: PersonId;
  /** The order they come for; null for Gaston. */
  order: number | null;
  bike: boolean;
  /** Feet position, in world pixels. */
  x: number;
  y: number;
  route: Point[];
  state: 'coming' | 'waiting' | 'dropping' | 'leaving';
  basket: boolean;
  view: PersonView;
  /** Seen from the side: 1 walking right, -1 walking left (the drawing is mirrored). */
  face: 1 | -1;
  clock: number;
  pause: number;
}

/** How the scene draws: the village only says what, where, and how deep. */
export interface VillagePainter {
  stamp(sprite: Sprite, x: number, y: number, mirrored: boolean): void;
  shadow(x: number, y: number, width: number): void;
}

export class FarmVillage {
  private readonly save: FarmSave;
  private readonly reduced: boolean;
  private walkers: Walker[] = [];
  private syncIn = 0;
  private started = false;

  constructor(save: FarmSave, reduced: boolean) {
    this.save = save;
    this.reduced = reduced;
  }

  /** The villagers standing at the gate for their order, first arrived first. */
  get waiting(): PersonId[] {
    return this.walkers.filter((w) => w.order !== null && w.state === 'waiting').map((w) => w.who);
  }

  /** Someone is on the move: the scene keeps a steady frame rate meanwhile. */
  get isMoving(): boolean {
    return this.walkers.some((w) => w.route.length > 0 || w.state === 'dropping');
  }

  update(dt: number): void {
    this.syncIn -= dt;
    if (this.syncIn <= 0) {
      this.sync();
      this.syncIn = SYNC_MS;
    }
    for (const w of this.walkers) this.move(w, dt);
    this.walkers = this.walkers.filter((w) => !(w.state === 'leaving' && w.route.length === 0));
  }

  /** An order was delivered: its villager takes the basket home. */
  served(orderId: number): void {
    const w = this.walkers.find((v) => v.order === orderId && v.state !== 'leaving');
    if (!w) return;
    w.basket = true;
    this.sendHome(w);
  }

  /** Gaston has just left a parcel: he rides up to the mailbox and back. */
  ride(): void {
    if (this.reduced || this.walkers.some((w) => w.bike)) return;
    const mailbox = this.save.objects.find((o) => o.type === 'mailbox');
    if (!mailbox) return;
    const gate = this.gatePoint();
    // He stops just left of the box, his front wheel against it.
    const stop = { x: mailbox.x * TILE - 4, y: (mailbox.y + 1) * TILE - 1 };
    this.walkers.push(this.walker('gaston', null, { x: gate.x, y: ROAD_END_Y }, [gate, stop], true));
  }

  /** The order of the villager under a world point, if one is there for it. */
  hit(wx: number, wy: number): number | null {
    for (const w of this.walkers) {
      if (w.order === null || w.state === 'leaving') continue;
      if (Math.abs(wx - w.x) <= 7 && wy >= w.y - 32 && wy <= w.y + 2) return w.order;
    }
    return null;
  }

  /** The walkers among the scene's drawables, sorted with everything else by their feet. */
  queue(list: { base: number; draw: () => void }[], paint: VillagePainter): void {
    for (const w of this.walkers) {
      const moving = w.route.length > 0;
      const frame = (moving ? Math.floor(w.clock / (w.bike ? STEP_MS * 0.6 : STEP_MS)) % 2 : 0) as 0 | 1;
      const sprite = w.bike ? bikeSprite(w.view, frame) : villagerSprite(w.who, w.view, frame);
      const x = Math.round(w.x - sprite.width / 2);
      const y = Math.round(w.y - sprite.height + 1);
      const mirrored = w.view === 'side' && w.face < 0;
      list.push({
        base: w.y + 0.5,
        draw: () => {
          const basket = w.basket ? basketSprite() : null;
          // Seen from the back, the basket is in front of them, so behind the drawing.
          if (basket && w.view === 'back') paint.stamp(basket, x + Math.round((sprite.width - basket.width) / 2), y + 11, false);
          paint.shadow(x + 2, y + sprite.height - 2, sprite.width - 4);
          paint.stamp(sprite, x, y, mirrored);
          if (!basket || w.view === 'back') return;
          const bx = w.view === 'front' ? x + Math.round((sprite.width - basket.width) / 2) : w.face > 0 ? x + sprite.width - 5 : x + 5 - basket.width;
          paint.stamp(basket, bx, y + 13, false);
        },
      });
    }
  }

  /** Above the villagers who wait: a bubble with what they came for, a heart for a "coup de cœur". */
  drawBubbles(ctx: CanvasRenderingContext2D, now: number): void {
    for (const w of this.walkers) {
      if (w.state !== 'waiting' || w.order === null) continue;
      const order = this.save.orders.find((o) => o.id === w.order);
      if (!order) continue;
      const first = Object.keys(order.items)[0] as ItemId;
      const bubble = readyBubble();
      const icon = itemIcon(first);
      const height = villagerSprite(w.who, 'front', 0).height;
      const bob = this.reduced ? 0 : Math.round(Math.sin(now / 300 + w.x / 9) * 1.2);
      const bx = Math.round(w.x - bubble.width / 2);
      const by = Math.round(w.y - height - bubble.height + 3 + bob);
      ctx.drawImage(bubble, bx, by);
      ctx.drawImage(icon, Math.round(bx + bubble.width / 2 - icon.width / 2), Math.round(by + (bubble.height - 2) / 2 - icon.height / 2));
      if (order.special) ctx.drawImage(heartSprite(), bx + bubble.width - 5, by - 2);
    }
  }

  // -----------------------------------------------
  // THE QUEUE
  // -----------------------------------------------

  /** Matches the walkers to the orders that can be served now, oldest first, one per villager. */
  private sync(): void {
    const wanted: Order[] = [];
    for (const o of this.save.orders) {
      if (wanted.length < MAX_WAITING && canDeliver(this.save, o) && !wanted.some((w) => w.who === o.who)) wanted.push(o);
    }
    for (const w of this.walkers) {
      if (w.order !== null && w.state !== 'leaving' && !wanted.some((o) => o.id === w.order)) this.sendHome(w);
    }
    const gate = this.gatePoint();
    wanted.forEach((order, slot) => {
      const spot = { x: gate.x + WAITING_OFFSETS[slot], y: gate.y };
      const w = this.walkers.find((v) => v.order === order.id && v.state !== 'leaving');
      if (!w) {
        // Opening the farm finds them already waiting; later ones walk up the road.
        const already = !this.started || this.reduced;
        const walker = this.walker(order.who, order.id, already ? spot : { x: gate.x, y: ROAD_END_Y }, already ? [] : [gate, spot], false);
        if (already) walker.state = 'waiting';
        this.walkers.push(walker);
        return;
      }
      const goal = w.route.at(-1) ?? w;
      if (Math.abs(goal.x - spot.x) > 0.5 || Math.abs(goal.y - spot.y) > 0.5) {
        // The one in the middle has gone, or the gate has moved with a new parcel: take the new place.
        w.route = [spot];
        w.state = 'coming';
      }
    });
    this.started = true;
  }

  private walker(who: PersonId, order: number | null, at: Point, route: Point[], bike: boolean): Walker {
    return { who, order, bike, x: at.x, y: at.y, route, state: 'coming', basket: false, view: route.length > 0 ? 'back' : 'front', face: 1, clock: 0, pause: 0 };
  }

  private sendHome(w: Walker): void {
    const gate = this.gatePoint();
    w.state = 'leaving';
    w.route = this.reduced ? [] : [gate, { x: gate.x, y: ROAD_END_Y }];
  }

  private move(w: Walker, dt: number): void {
    if (w.state === 'dropping') {
      w.pause -= dt;
      if (w.pause <= 0) this.sendHome(w);
      return;
    }
    const target = w.route[0];
    if (!target) return;
    w.clock += dt;
    const dx = target.x - w.x;
    const dy = target.y - w.y;
    const distance = Math.hypot(dx, dy);
    const step = dt * (w.bike ? BIKE_PX_PER_MS : WALK_PX_PER_MS);
    if (distance > 0.5) {
      if (Math.abs(dy) > Math.abs(dx)) w.view = dy > 0 ? 'front' : 'back';
      else {
        w.view = 'side';
        w.face = dx > 0 ? 1 : -1;
      }
    }
    if (distance > step) {
      w.x += (dx / distance) * step;
      w.y += (dy / distance) * step;
      return;
    }
    w.x = target.x;
    w.y = target.y;
    w.route.shift();
    if (w.route.length > 0 || w.state === 'leaving') return;
    if (w.bike) {
      // At the mailbox, turned toward it.
      w.state = 'dropping';
      w.pause = DROP_MS;
      w.view = 'side';
      w.face = 1;
    } else {
      w.state = 'waiting';
      w.view = 'front';
    }
  }

  /** The middle of the gate's yard, where the road ends, in world pixels. */
  gatePoint(): Point {
    const [gx, gy] = gateTile(this.save);
    return { x: (gx + 0.5) * TILE, y: gy * TILE + 12 };
  }
}
