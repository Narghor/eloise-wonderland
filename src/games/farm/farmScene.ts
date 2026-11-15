import { prefersReducedMotion } from '../casino/fx/effects';
import { MAP_SIZE, PARCEL, PARCELS_PER_SIDE, isWater } from './data/land';
import { placeable } from './data/placeables';
import type { PlaceableId } from './data/types';
import {
  TILE,
  animalSprite,
  fieldSprite,
  hazelSprite,
  itemIcon,
  millHub,
  millSails,
  objectSprite,
  paintGround,
  readyBubble,
  signSprite,
  uiIcon,
  wildTreeSprite,
  type Sprite,
} from './farmArt';
import { footprint, isOwned, type ParcelOffer } from './farmMap';
import { fieldState, hungryAnimals, penAnimal, pendingJobs, readyOn } from './farmProduction';
import { have } from './farmProgress';
import type { FarmSave, PlacedObject, Rotation } from './farmSave';
import { mulberry32 } from '../../random';

// -----------------------------------------------
// THE FARM ON A CANVAS: camera, drawing, touch
// -----------------------------------------------
// Sprites are drawn once into small canvases (farmArt) then stamped at an integer scale, so the pixels stay
// crisp. The overlay (HUD, bubbles) is plain HTML placed with `toScreen`.

/** A thing being placed or moved: drawn see-through, green where it fits, red where it does not. */
export interface Ghost {
  type: PlaceableId;
  x: number;
  y: number;
  rot: Rotation;
  /** The object being moved, or undefined for a new one. */
  uid?: number;
}

export interface SceneEvents {
  /** A tap on an object, a sign, or bare ground. */
  tap(target: PlacedObject | { parcel: number } | null, tile: [number, number]): void;
  /** A ripe field under the finger of a harvest swipe. */
  harvest(field: PlacedObject): void;
  /** The ghost was dragged to a new tile. */
  ghostMoved(ghost: Ghost): void;
  /** Whether the ghost fits where it is. */
  ghostFits(ghost: Ghost): boolean;
}

interface Actor {
  x: number;
  y: number;
  tx: number;
  ty: number;
  wait: number;
  face: 1 | -1;
  peck: number;
}

interface WildThing {
  sprite: Sprite;
  x: number;
  y: number;
}

const DRAG_START_PX = 7;
/** World pixels shown along the short side of the screen, close and far. */
const VIEW_TILES = [12, 19];
const WALK_SPEED = 0.012;

export class FarmScene {
  readonly canvas = document.createElement('canvas');
  editMode = false;
  ghost: Ghost | null = null;
  /** The object chosen in edit mode. */
  selected: number | null = null;
  /** Called after each frame: the HTML overlay follows the camera. */
  onFrame: (() => void) | null = null;

  private readonly ctx: CanvasRenderingContext2D;
  private readonly host: HTMLElement;
  private readonly save: FarmSave;
  private readonly events: SceneEvents;
  private readonly reduced = prefersReducedMotion();
  private ground: HTMLCanvasElement | null = null;
  private wild: WildThing[] = [];
  private signs: { parcel: number; x: number; y: number }[] = [];
  private readonly actors = new Map<number, Actor[]>();
  private cam = { x: 0, y: 0 };
  private zoom = 0;
  private dpr = 1;
  private scale = 2;
  private pixel = 2;
  private width = 0;
  private height = 0;
  private frameId = 0;
  private last = performance.now();
  private readonly resizer: ResizeObserver;
  private pointers = new Map<number, { x: number; y: number }>();
  private gesture:
    | { mode: 'pending' | 'pan' | 'harvest' | 'ghost'; x: number; y: number; last: { x: number; y: number }; camX: number; camY: number; target: PlacedObject | { parcel: number } | null; grab: [number, number] }
    | { mode: 'pinch'; distance: number; done: boolean }
    | null = null;
  private centred = false;

  constructor(host: HTMLElement, save: FarmSave, events: SceneEvents) {
    this.host = host;
    this.save = save;
    this.events = events;
    this.canvas.className = 'farm-canvas';
    this.canvas.setAttribute('aria-label', 'La ferme, vue de dessus');
    this.ctx = this.canvas.getContext('2d')!;
    host.prepend(this.canvas);
    this.resizer = new ResizeObserver(() => this.resize());
    this.resizer.observe(host);
    this.listen();
    this.frameId = requestAnimationFrame((t) => this.frame(t));
  }

  dispose(): void {
    cancelAnimationFrame(this.frameId);
    this.resizer.disconnect();
    this.canvas.width = this.canvas.height = 0;
  }

  // -----------------------------------------------
  // LAND: ground, the wild outside the farm, the signs of parcels for sale
  // -----------------------------------------------

  refreshLand(offers: ParcelOffer[]): void {
    this.ground = paintGround((x, y) => isOwned(this.save, x, y), this.save.projectsDone.includes('bridge'));
    this.signs = offers.map((o) => {
      const px = (o.parcel % PARCELS_PER_SIDE) * PARCEL;
      const py = Math.floor(o.parcel / PARCELS_PER_SIDE) * PARCEL;
      // On the parcel's side facing the farm, so it can be seen from the farm.
      const x = px + (isOwned(this.save, px + PARCEL, py + 2) ? PARCEL - 2 : isOwned(this.save, px - 1, py + 2) ? 1 : 2);
      const y = py + (isOwned(this.save, px + 2, py + PARCEL) ? PARCEL - 1 : isOwned(this.save, px + 2, py - 1) ? 1 : 3);
      return { parcel: o.parcel, x: isWater(x, y) ? x + 1 : x, y };
    });
    this.wild = [];
    const random = mulberry32(77);
    const free = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < MAP_SIZE && y < MAP_SIZE && !isOwned(this.save, x, y) && !isWater(x, y) && !this.signs.some((s) => Math.abs(s.x - x) <= 1 && Math.abs(s.y - y) <= 1);
    const taken = new Set<string>();
    for (let y = -2; y < MAP_SIZE + 2; y++) {
      for (let x = -2; x < MAP_SIZE + 2; x++) {
        const roll = random();
        const outside = x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE;
        if (!outside && !free(x, y)) continue;
        if (taken.has(`${x},${y}`)) continue;
        if (roll < 0.17 && x % 2 === 0 && y % 2 === 1 && (outside || (free(x + 1, y) && free(x, y - 1) && free(x + 1, y - 1)))) {
          for (const [dx, dy] of [[0, 0], [1, 0], [0, -1], [1, -1]]) taken.add(`${x + dx},${y + dy}`);
          this.wild.push(this.placeWild(wildTreeSprite(Math.floor(random() * 3)), x, y - 1, 2, 2));
        } else if (!outside && roll < 0.3) this.wild.push(this.placeWild(objectSprite('bush', 'face'), x, y, 1, 1));
        else if (!outside && roll < 0.35) this.wild.push(this.placeWild(objectSprite('rock', 'face'), x, y, 1, 1));
      }
    }
  }

  private placeWild(sprite: Sprite, x: number, y: number, w: number, h: number): WildThing {
    return { sprite, x: x * TILE + Math.floor((w * TILE - sprite.width) / 2), y: (y + h) * TILE - sprite.height + 1 };
  }

  // -----------------------------------------------
  // CAMERA
  // -----------------------------------------------

  private resize(): void {
    const box = this.host.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    this.dpr = window.devicePixelRatio || 1;
    this.width = box.width;
    this.height = box.height;
    this.canvas.width = Math.round(box.width * this.dpr);
    this.canvas.height = Math.round(box.height * this.dpr);
    this.applyZoom();
    if (!this.centred) {
      this.centreOn(MAP_SIZE / 2, MAP_SIZE / 2);
      this.centred = true;
    }
  }

  private applyZoom(): void {
    const short = Math.min(this.width, this.height);
    this.pixel = Math.max(1, Math.round((short / (VIEW_TILES[this.zoom] * TILE)) * this.dpr));
    this.scale = this.pixel / this.dpr;
    this.clampCamera();
  }

  /** Close or far view; keeps the centre of the screen where it is. */
  toggleZoom(): void {
    const [cx, cy] = this.viewCentre();
    this.zoom = 1 - this.zoom;
    this.applyZoom();
    this.centreOn(cx, cy);
  }

  get isFar(): boolean {
    return this.zoom === 1;
  }

  /** The tile at the middle of the screen. */
  viewCentre(): [number, number] {
    return [(this.cam.x + this.width / this.scale / 2) / TILE, (this.cam.y + this.height / this.scale / 2) / TILE];
  }

  centreOn(tx: number, ty: number): void {
    this.cam.x = tx * TILE - this.width / this.scale / 2;
    this.cam.y = ty * TILE - this.height / this.scale / 2;
    this.clampCamera();
  }

  private clampCamera(): void {
    const margin = 3 * TILE;
    const vw = this.width / this.scale;
    const vh = this.height / this.scale;
    const size = MAP_SIZE * TILE;
    this.cam.x = vw >= size + 2 * margin ? (size - vw) / 2 : Math.min(Math.max(this.cam.x, -margin), size + margin - vw);
    this.cam.y = vh >= size + 2 * margin ? (size - vh) / 2 : Math.min(Math.max(this.cam.y, -margin - 2 * TILE), size + margin - vh);
  }

  /** A world pixel on the screen, in CSS pixels from the host's corner. */
  toScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: (wx - this.cam.x) * this.scale, y: (wy - this.cam.y) * this.scale };
  }

  private toWorld(clientX: number, clientY: number): { x: number; y: number } {
    const box = this.canvas.getBoundingClientRect();
    return { x: this.cam.x + (clientX - box.left) / this.scale, y: this.cam.y + (clientY - box.top) / this.scale };
  }

  /** Screen points of an object: the top of its drawing and the bottom of its footprint, both centred. */
  anchorOf(o: { type: PlaceableId; x: number; y: number; rot: Rotation }): { x: number; top: number; bottom: number } {
    const [w, h] = footprint(o);
    const sprite = this.spriteOf(o as PlacedObject, performance.now());
    const bottom = (o.y + h) * TILE;
    const top = this.toScreen(0, bottom - sprite.height + 2).y;
    const p = this.toScreen((o.x + w / 2) * TILE, bottom);
    return { x: p.x, top, bottom: p.y };
  }

  signAnchor(parcel: number): { x: number; y: number } | null {
    const sign = this.signs.find((s) => s.parcel === parcel);
    return sign ? this.toScreen((sign.x + 0.5) * TILE, sign.y * TILE - 6) : null;
  }

  // -----------------------------------------------
  // DRAWING
  // -----------------------------------------------

  private frame(now: number): void {
    const dt = Math.min(100, now - this.last);
    this.last = now;
    if (this.width > 0) {
      this.walk(dt);
      this.draw(now);
      this.onFrame?.();
    }
    this.frameId = requestAnimationFrame((t) => this.frame(t));
  }

  private spriteOf(o: PlacedObject, now: number): Sprite {
    if (o.type === 'field') {
      const state = fieldState(o, Date.now());
      return fieldSprite(state === 'empty' ? null : o.crop!, state);
    }
    if (o.type === 'hazel') return hazelSprite(readyOn(o, Date.now()) !== null);
    void now;
    return objectSprite(o.type, o.rot % 2 === 1 ? 'profile' : 'face');
  }

  /** Top-left world pixel of an object's drawing: centred on its footprint, standing on its bottom edge. */
  private origin(o: { x: number; y: number; type: PlaceableId; rot: Rotation }, sprite: Sprite): { x: number; y: number } {
    const [w, h] = footprint(o);
    return { x: o.x * TILE + Math.floor((w * TILE - sprite.width) / 2), y: (o.y + h) * TILE - sprite.height + 1 };
  }

  private stamp(sprite: Sprite, x: number, y: number, mirrored: boolean): void {
    if (!mirrored) {
      this.ctx.drawImage(sprite, x, y);
      return;
    }
    this.ctx.save();
    this.ctx.translate(x + sprite.width, y);
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(sprite, 0, 0);
    this.ctx.restore();
  }

  private draw(now: number): void {
    const ctx = this.ctx;
    const camX = Math.round(this.cam.x * this.pixel) / this.pixel;
    const camY = Math.round(this.cam.y * this.pixel) / this.pixel;
    ctx.setTransform(this.pixel, 0, 0, this.pixel, -camX * this.pixel, -camY * this.pixel);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#6ea957';
    ctx.fillRect(camX - 2, camY - 2, this.width / this.scale + 4, this.height / this.scale + 4);
    if (this.ground) ctx.drawImage(this.ground, 0, 0);
    if (this.editMode || this.ghost) this.drawGrid();

    const clock = Date.now();
    const view = { x0: camX - 3 * TILE, y0: camY - 3 * TILE, x1: camX + this.width / this.scale + 3 * TILE, y1: camY + this.height / this.scale + 5 * TILE };
    const visible = (x: number, y: number, w: number, h: number) => x + w > view.x0 && x < view.x1 && y + h > view.y0 && y < view.y1;

    type Drawable = { base: number; draw: () => void };
    const flat: (() => void)[] = [];
    const list: Drawable[] = [];
    for (const w of this.wild) if (visible(w.x, w.y, w.sprite.width, w.sprite.height)) list.push({ base: w.y + w.sprite.height, draw: () => ctx.drawImage(w.sprite, w.x, w.y) });
    const sign = signSprite();
    for (const s of this.signs) {
      const x = s.x * TILE + Math.floor((TILE - sign.width) / 2);
      const y = (s.y + 1) * TILE - sign.height + 1;
      list.push({ base: y + sign.height, draw: () => ctx.drawImage(sign, x, y) });
    }
    for (const o of this.save.objects) {
      if (this.ghost?.uid === o.uid) continue;
      const sprite = this.spriteOf(o, now);
      const at = this.origin(o, sprite);
      if (!visible(at.x, at.y, sprite.width, sprite.height)) continue;
      const kind = placeable(o.type).kind;
      const paint = () => {
        const chosen = this.selected === o.uid;
        if (chosen) ctx.globalAlpha = 0.75 + 0.2 * Math.sin(now / 180);
        if (kind === 'machine' || kind === 'pen' || kind === 'tree' || o.type === 'well' || o.type === 'appleTree') this.shadow(at.x + 3, at.y + sprite.height - 2, sprite.width - 6);
        this.stamp(sprite, at.x, at.y, o.rot === 3);
        if (o.type === 'mill') this.drawSails(o, at, now);
        ctx.globalAlpha = 1;
        if (chosen) this.outline(o, '#fff6c8');
      };
      if (placeable(o.type).flat) flat.push(paint);
      else list.push({ base: at.y + sprite.height, draw: paint });
      if (kind === 'pen') this.queueAnimals(o, list, at.y + sprite.height);
    }
    if (this.ghost) list.push({ base: Infinity, draw: () => this.drawGhost(this.ghost!) });
    for (const paint of flat) paint();
    list.sort((a, b) => a.base - b.base);
    for (const d of list) d.draw();

    // On top of everything: what is ready, and the ripe fields' sparkles.
    if (!this.editMode) {
      for (const o of this.save.objects) this.drawReady(o, clock, now);
    }
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    const line = 1 / this.pixel;
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        if (!isOwned(this.save, x, y) || isWater(x, y)) continue;
        ctx.fillRect(x * TILE, y * TILE, TILE, line);
        ctx.fillRect(x * TILE, y * TILE, line, TILE);
      }
    }
  }

  private shadow(x: number, y: number, w: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(52, 70, 40, 0.22)';
    const rx = w / 2;
    for (let dy = -2; dy <= 2; dy++) {
      const half = Math.round(rx * Math.sqrt(1 - (dy * dy) / 9));
      ctx.fillRect(Math.round(x + rx - half), y + dy, half * 2, 1);
    }
  }

  private outline(o: PlacedObject | Ghost, color: string): void {
    const [w, h] = footprint(o);
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 / this.pixel;
    ctx.strokeRect(o.x * TILE + 0.5, o.y * TILE + 0.5, w * TILE - 1, h * TILE - 1);
  }

  private drawSails(mill: PlacedObject, at: { x: number; y: number }, now: number): void {
    const view = mill.rot % 2 === 1 ? 'profile' : 'face';
    const working = pendingJobs(mill, Date.now()) > 0 && !this.reduced;
    const sails = millSails(view, working ? (Math.floor(now / 380) % 2 as 0 | 1) : 0);
    const hub = millHub(view);
    const body = objectSprite('mill', view);
    const hubX = mill.rot === 3 ? body.width - hub.x : hub.x;
    this.ctx.drawImage(sails, Math.round(at.x + hubX - sails.width / 2), Math.round(at.y + hub.y - sails.height / 2));
  }

  private drawGhost(ghost: Ghost): void {
    const ctx = this.ctx;
    const fits = this.events.ghostFits(ghost);
    const [w, h] = footprint(ghost);
    const sprite = ghost.type === 'field' ? fieldSprite(null, 'empty') : ghost.type === 'hazel' ? hazelSprite(false) : objectSprite(ghost.type, ghost.rot % 2 === 1 ? 'profile' : 'face');
    const at = this.origin(ghost, sprite);
    ctx.globalAlpha = 0.8;
    this.stamp(sprite, at.x, at.y, ghost.rot === 3);
    ctx.globalAlpha = 1;
    // The tint goes over the drawing, so a red footprint shows even under a tall building.
    ctx.fillStyle = fits ? 'rgba(120, 220, 110, 0.35)' : 'rgba(235, 70, 70, 0.5)';
    ctx.fillRect(ghost.x * TILE, ghost.y * TILE, w * TILE, h * TILE);
    this.outline(ghost, fits ? '#e9ffd9' : '#ffd6d6');
  }

  private drawReady(o: PlacedObject, clock: number, now: number): void {
    const ctx = this.ctx;
    if (o.type === 'field') {
      if (this.reduced || fieldState(o, clock) !== 'ripe') return;
      const phase = (now / 900 + o.x * 0.37 + o.y * 0.61) % 1;
      if (phase >= 0.35) return;
      const x = o.x * TILE + 3 + ((o.x * 7 + o.y * 3) % 10);
      const y = o.y * TILE + 1 + ((o.x * 5) % 6);
      ctx.fillStyle = '#fffbe0';
      ctx.fillRect(x, y - 1, 1, 3);
      ctx.fillRect(x - 1, y, 3, 1);
      return;
    }
    const ready = readyOn(o, clock);
    let icon: Sprite | null = null;
    let alpha = 1;
    if (ready === 'nuts') icon = uiIcon('nut');
    else if (ready) icon = itemIcon(ready);
    else if (o.type === 'coop' || o.type === 'cowshed') {
      const animal = penAnimal(o);
      if (hungryAnimals(o) > 0 && have(this.save, animal.feed) > 0) {
        icon = itemIcon(animal.feed);
        alpha = 0.8;
      }
    }
    if (!icon) return;
    const sprite = this.spriteOf(o, now);
    const at = this.origin(o, sprite);
    const bubble = readyBubble();
    const bob = this.reduced ? 0 : Math.round(Math.sin(now / 260 + o.x) * 1.5);
    const bx = Math.round(at.x + sprite.width / 2 - bubble.width / 2);
    const by = at.y - bubble.height + 4 + bob;
    ctx.globalAlpha = alpha;
    ctx.drawImage(bubble, bx, by);
    ctx.drawImage(icon, Math.round(bx + bubble.width / 2 - icon.width / 2), Math.round(by + (bubble.height - 2) / 2 - icon.height / 2));
    ctx.globalAlpha = 1;
  }

  // -----------------------------------------------
  // ANIMALS: wander in their pen's yard
  // -----------------------------------------------

  private yard(pen: PlacedObject): { x0: number; y0: number; x1: number; y1: number } {
    const [w, h] = footprint(pen);
    const sprite = animalSprite(penAnimal(pen).id, 0);
    return { x0: pen.x * TILE + 5, y0: pen.y * TILE + Math.round(h * TILE * 0.5), x1: (pen.x + w) * TILE - 5 - sprite.width, y1: (pen.y + h) * TILE - 6 - sprite.height };
  }

  private actorsOf(pen: PlacedObject): Actor[] {
    let actors = this.actors.get(pen.uid);
    const count = pen.animals?.length ?? 0;
    if (!actors) this.actors.set(pen.uid, (actors = []));
    const yard = this.yard(pen);
    while (actors.length < count) {
      const x = yard.x0 + Math.random() * (yard.x1 - yard.x0);
      const y = yard.y0 + Math.random() * (yard.y1 - yard.y0);
      actors.push({ x, y, tx: x, ty: y, wait: Math.random() * 2000, face: Math.random() < 0.5 ? 1 : -1, peck: 0 });
    }
    actors.length = count;
    // A moved pen takes its animals along.
    for (const a of actors) {
      if (a.x < yard.x0 - 2 || a.x > yard.x1 + 2 || a.y < yard.y0 - 2 || a.y > yard.y1 + 2) {
        a.x = a.tx = yard.x0 + Math.random() * (yard.x1 - yard.x0);
        a.y = a.ty = yard.y0 + Math.random() * (yard.y1 - yard.y0);
      }
    }
    return actors;
  }

  /** Animals stand in the yard, so they are drawn right after their pen, front ones last. */
  private queueAnimals(pen: PlacedObject, list: { base: number; draw: () => void }[], penBase: number): void {
    const id = penAnimal(pen).id;
    for (const a of this.actorsOf(pen)) {
      const sprite = animalSprite(id, a.peck > 0 ? 1 : 0);
      list.push({ base: penBase + 0.01 + a.y / 10000, draw: () => this.stamp(sprite, Math.round(a.x), Math.round(a.y), a.face < 0) });
    }
  }

  private walk(dt: number): void {
    if (this.reduced) return;
    for (const pen of this.save.objects) {
      if (pen.type !== 'coop' && pen.type !== 'cowshed') continue;
      const yard = this.yard(pen);
      const slow = pen.type === 'cowshed' ? 0.5 : 1;
      for (const a of this.actorsOf(pen)) {
        if (a.peck > 0) a.peck -= dt;
        if (a.wait > 0) {
          a.wait -= dt;
          if (a.wait <= 0) {
            a.tx = yard.x0 + Math.random() * (yard.x1 - yard.x0);
            a.ty = yard.y0 + Math.random() * (yard.y1 - yard.y0);
          }
          continue;
        }
        const dx = a.tx - a.x;
        const dy = a.ty - a.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 1) {
          a.wait = 800 + Math.random() * 2600;
          if (Math.random() < 0.6) a.peck = pen.type === 'cowshed' ? 1400 : 500;
          continue;
        }
        const step = Math.min(distance, dt * WALK_SPEED * slow);
        a.x += (dx / distance) * step;
        a.y += (dy / distance) * step;
        a.face = dx >= 0 ? 1 : -1;
      }
    }
  }

  // -----------------------------------------------
  // TOUCH: tap, drag to look around, swipe to harvest, drag the ghost, pinch to zoom
  // -----------------------------------------------

  /** What stands under a screen point: an object (its footprint first, then its drawing), or a sign. */
  targetAtClient(clientX: number, clientY: number): PlacedObject | { parcel: number } | null {
    const w = this.toWorld(clientX, clientY);
    const tx = Math.floor(w.x / TILE);
    const ty = Math.floor(w.y / TILE);
    const sign = this.signs.find((s) => s.x === tx && (s.y === ty || s.y - 1 === ty));
    if (sign) return { parcel: sign.parcel };
    const byDepth = [...this.save.objects].sort((a, b) => footprintBottom(b) - footprintBottom(a));
    for (const o of byDepth) {
      const [fw, fh] = footprint(o);
      if (tx >= o.x && tx < o.x + fw && ty >= o.y && ty < o.y + fh) return o;
    }
    for (const o of byDepth) {
      const kind = placeable(o.type).kind;
      if (kind !== 'machine' && kind !== 'pen' && kind !== 'tree') continue;
      const sprite = this.spriteOf(o, 0);
      const at = this.origin(o, sprite);
      if (w.x >= at.x + 2 && w.x < at.x + sprite.width - 2 && w.y >= at.y + 2 && w.y < at.y + sprite.height) return o;
    }
    return null;
  }

  fieldAtClient(clientX: number, clientY: number): PlacedObject | null {
    const target = this.targetAtClient(clientX, clientY);
    return target && 'uid' in target && target.type === 'field' ? target : null;
  }

  /** Fields under a finger's path between two events: a quick swipe skips none. */
  fieldsAlong(from: { x: number; y: number }, to: { x: number; y: number }): PlacedObject[] {
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 5));
    const found: PlacedObject[] = [];
    for (let i = 1; i <= steps; i++) {
      const field = this.fieldAtClient(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
      if (field && !found.includes(field)) found.push(field);
    }
    return found;
  }

  private isOnGhost(clientX: number, clientY: number): boolean {
    if (!this.ghost) return false;
    const w = this.toWorld(clientX, clientY);
    const [gw, gh] = footprint(this.ghost);
    return w.x >= this.ghost.x * TILE - 4 && w.x < (this.ghost.x + gw) * TILE + 4 && w.y >= this.ghost.y * TILE - 20 && w.y < (this.ghost.y + gh) * TILE + 4;
  }

  private listen(): void {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.gesture = { mode: 'pinch', distance: Math.hypot(a.x - b.x, a.y - b.y), done: false };
        return;
      }
      if (this.pointers.size > 2) return;
      const target = this.targetAtClient(e.clientX, e.clientY);
      const onGhost = this.isOnGhost(e.clientX, e.clientY);
      const w = this.toWorld(e.clientX, e.clientY);
      const grab: [number, number] = this.ghost ? [Math.floor(w.x / TILE) - this.ghost.x, Math.floor(w.y / TILE) - this.ghost.y] : [0, 0];
      this.gesture = { mode: onGhost ? 'ghost' : 'pending', x: e.clientX, y: e.clientY, last: { x: e.clientX, y: e.clientY }, camX: this.cam.x, camY: this.cam.y, target, grab };
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = this.gesture;
      if (!g) return;
      if (g.mode === 'pinch') {
        const [a, b] = [...this.pointers.values()];
        if (!a || !b || g.done) return;
        const ratio = Math.hypot(a.x - b.x, a.y - b.y) / g.distance;
        if ((ratio > 1.25 && this.isFar) || (ratio < 0.8 && !this.isFar)) {
          this.toggleZoom();
          g.done = true;
        }
        return;
      }
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (g.mode === 'pending') {
        if (Math.hypot(dx, dy) < DRAG_START_PX) return;
        const ripe = g.target && 'uid' in g.target && g.target.type === 'field' && fieldState(g.target, Date.now()) === 'ripe';
        g.mode = ripe && !this.editMode && !this.ghost ? 'harvest' : 'pan';
        if (g.mode === 'harvest') this.events.harvest(g.target as PlacedObject);
      }
      if (g.mode === 'pan') {
        this.cam.x = g.camX - dx / this.scale;
        this.cam.y = g.camY - dy / this.scale;
        this.clampCamera();
      } else if (g.mode === 'harvest') {
        for (const field of this.fieldsAlong(g.last, { x: e.clientX, y: e.clientY })) if (fieldState(field, Date.now()) === 'ripe') this.events.harvest(field);
        g.last = { x: e.clientX, y: e.clientY };
      } else if (g.mode === 'ghost' && this.ghost) {
        const w = this.toWorld(e.clientX, e.clientY);
        const x = Math.floor(w.x / TILE) - g.grab[0];
        const y = Math.floor(w.y / TILE) - g.grab[1];
        const [gw, gh] = footprint(this.ghost);
        const nx = Math.min(Math.max(x, 0), MAP_SIZE - gw);
        const ny = Math.min(Math.max(y, 0), MAP_SIZE - gh);
        if (nx !== this.ghost.x || ny !== this.ghost.y) {
          this.ghost.x = nx;
          this.ghost.y = ny;
          this.events.ghostMoved(this.ghost);
        }
      }
    });
    const end = (e: PointerEvent) => {
      if (!this.pointers.delete(e.pointerId)) return;
      const g = this.gesture;
      if (this.pointers.size > 0) return;
      this.gesture = null;
      if (g && g.mode === 'pending' && e.type === 'pointerup') {
        const w = this.toWorld(g.x, g.y);
        this.events.tap(g.target, [Math.floor(w.x / TILE), Math.floor(w.y / TILE)]);
      }
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if ((e.deltaY < 0 && this.isFar) || (e.deltaY > 0 && !this.isFar)) this.toggleZoom();
      },
      { passive: false },
    );
  }
}

function footprintBottom(o: PlacedObject): number {
  return o.y + footprint(o)[1];
}
