import { el } from '../dom';
import { companionCanvas } from '../companion/companionArt';
import { loadCompanion } from '../companion/companionSave';
import { FURNITURE_ART, GROWTH_ART, coinIcon, spriteCanvas } from './houseArt';
import { FURNITURE, POSES, ROOMS, SPOT_X, dish, plant, type Character, type PoseId, type RoomId } from './houseData';
import { foodIcon } from './houseFoodArt';
import { MINUTE_MS, availablePoses, character } from './houseLogic';
import { pairsHome, type Pair, type SearchResult } from './houseFriends';
import type { HouseSave } from './houseSave';

// -----------------------------------------------
// THE HOUSE SEEN FROM THE FRONT, AND WHO WALKS IN IT
// -----------------------------------------------

const SPRITE_HEIGHT = 72;
/** Room widths per second. */
const WALK_SPEED = 0.16;
const POSE_GAP_MS: [number, number] = [8000, 15000];
/** Distance to the pose's peak (0 to 0.5) for 3 and 2 stars; anything else gives 1. */
const THREE_STARS = 0.045;
const TWO_STARS = 0.13;
/** Pixels around a posing visitor's centre that still count as touching it. */
const SNAP_RADIUS = 70;
const ROOM_CHANGE_CHANCE = 0.25;
/** Time a visitor waits on its spot, thought bubble up, before posing. */
const POSE_WARNING_MS = 5000;
/** Chance that a visitor about to pose calls a friend of its story to pose together instead. */
const PAIR_CHANCE = 0.4;
/** Two friends share one ring, so it does not follow either one's rhythm. */
const PAIR_POSE_MS = 1800;

export interface SceneEvents {
  photo(characterId: string, pose: PoseId, stars: number): void;
  openGifts(): void;
  /** A room was picked on the house front, or swiped to in the big view. */
  select(room: RoomId): void;
  /** A garden bed was touched in the big view. */
  plot(index: number): void;
  /** A piece of furniture was searched for a lost thing. */
  search(room: RoomId, spot: number): SearchResult | null;
  /** Two friends were photographed together. */
  pairPhoto(pair: Pair, stars: number): void;
}

interface Actor {
  character: Character | null;
  root: HTMLElement;
  body: HTMLElement;
  ring: HTMLElement;
  /** The fixed sight the ring closes onto: it lights up when tapping now gives stars. */
  sight: HTMLElement;
  icon: HTMLElement;
  room: RoomId;
  x: number;
  target: number;
  /** Room to walk into once the edge is reached. */
  nextRoom: RoomId | null;
  facing: 1 | -1;
  pending: { pose: PoseId; room: RoomId; x: number } | null;
  pose: PoseId | null;
  /** When the pose starts once the visitor waits on its spot; 0 while not waiting. */
  poseAt: number;
  poseStart: number;
  nextPoseAt: number;
  snapped: boolean;
  /** Posing with a friend: both wait for each other, then pose for one shared photo. */
  pair: { pair: Pair; partner: Actor } | null;
}

export class HouseScene {
  readonly element: HTMLElement;
  private readonly view: HTMLElement;
  private readonly map: HTMLElement;
  private readonly rooms = new Map<RoomId, HTMLElement>();
  private actors: Actor[] = [];
  private save: HouseSave;
  private frame = 0;
  private last = performance.now();
  private active: RoomId = 'living';
  private readonly mapKeys = new Map<RoomId, string>();
  private beds: HTMLElement[] = [];
  private bedKeys: string[] = [];
  private seedTarget = -1;
  private stove: HTMLElement | null = null;
  private stoveKey = '';
  private mapClock = 0;
  private scrolling = false;
  private scrollTimer = 0;
  private readonly resize: ResizeObserver;

  constructor(
    save: HouseSave,
    private readonly events: SceneEvents,
  ) {
    this.save = save;
    this.view = el('div', { class: 'house-view' });
    this.map = el('div', { class: 'house-front' });
    this.view.addEventListener('scroll', this.onScroll, { passive: true });
    // A width change (rotation, address bar) would leave the view between two rooms.
    this.resize = new ResizeObserver(() => this.scrollToActive());
    this.resize.observe(this.view);
    this.element = el('section', { class: 'house-scene' }, this.map, this.view);
    this.rebuild(save);
    this.frame = requestAnimationFrame(this.tick);
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.resize.disconnect();
  }

  /** Redraws the rooms and puts everyone back; call after furniture, rooms or visitors change. */
  rebuild(save: HouseSave): void {
    this.save = save;
    const scroll = this.view.scrollLeft;
    this.rooms.clear();
    this.view.replaceChildren();
    for (const room of ROOMS) {
      if (!save.rooms.includes(room.id)) continue;
      const element = this.roomElement(room.id);
      this.rooms.set(room.id, element);
      this.view.append(element);
    }
    this.view.scrollLeft = scroll;

    const now = performance.now();
    const companion = this.makeActor(null, loadCompanion().look, 'living', 0.5, now);
    this.actors = [companion, ...save.visitors.map((id, i) => this.makeActor(character(id), character(id).look, this.randomRoom(), 0.2 + Math.random() * 0.6, now + 2500 + i * 3000))];
    for (const actor of this.actors) this.rooms.get(actor.room)?.append(actor.root);
    this.renderMap();
    this.scrollToActive();
  }

  /** Sends a visitor to the kitchen table to eat: a pose to photograph. */
  eat(characterId: string): void {
    const actor = this.actors.find((a) => a.character?.id === characterId);
    if (!actor || actor.pose) return;
    const spot = this.save.placed.kitchen.indexOf('table');
    actor.pending = { pose: 'eat', room: 'kitchen', x: spot === -1 ? 0.5 : SPOT_X[spot] };
    this.headFor(actor, 'kitchen', actor.pending.x);
  }

  // -----------------------------------------------
  // ROOMS
  // -----------------------------------------------

  private roomElement(id: RoomId): HTMLElement {
    const room = ROOMS.find((r) => r.id === id)!;
    const element = el(
      'div',
      { class: `house-room is-${id}`, 'data-room': id },
      el('div', { class: 'house-room-wall', style: `background:${room.wall}` }),
      el('div', { class: 'house-room-ground', style: `background:${room.ground}` }),
      el('span', { class: 'house-room-name', text: room.name }),
    );
    if (id === 'living' || id === 'bedroom' || id === 'library') element.append(el('div', { class: 'house-window' }));
    this.save.placed[id].forEach((piece, spot) => {
      if (!piece) return;
      const holder = el('div', { class: `house-furniture is-${piece}${this.save.lost ? ' is-searchable' : ''}`, style: `left:${SPOT_X[spot] * 100}%` }, spriteCanvas(FURNITURE_ART[piece]));
      if (this.save.lost) {
        holder.addEventListener('pointerdown', (event) => {
          if (this.posingNear(id, event)) return;
          event.stopPropagation();
          this.searchBehind(id, spot, holder);
        });
      }
      if (piece === 'table') {
        this.save.table.forEach((_, i) => holder.append(el('span', { class: 'house-plate', style: `left:${30 + i * 30}%` })));
      }
      element.append(holder);
    });
    if (id === 'living' && this.save.gifts.length > 0) {
      const gifts = el('button', { class: 'house-gifts', type: 'button', 'aria-label': 'Ouvrir les cadeaux' });
      for (let i = 0; i < Math.min(3, this.save.gifts.length); i++) gifts.append(el('span', { class: 'house-gift' }));
      gifts.append(el('span', { class: 'house-gifts-label', text: 'Ouvre-moi !' }));
      gifts.addEventListener('click', (event) => {
        event.stopPropagation();
        this.events.openGifts();
      });
      element.append(gifts);
    }
    if (id === 'garden') element.append(this.gardenBeds());
    if (id === 'kitchen') {
      this.stove = el('div', { class: 'house-stove' });
      this.stoveKey = '';
      this.refreshStove(Date.now());
      element.append(this.stove);
    }
    element.addEventListener('pointerdown', (event) => this.tap(id, event));
    return element;
  }

  /** The vegetable patch along the front of the garden, one bed per plot. */
  private gardenBeds(): HTMLElement {
    this.bedKeys = [];
    this.beds = this.save.plots.map((_, index) => {
      const bed = el('button', { class: 'house-bed', type: 'button' });
      bed.addEventListener('pointerdown', (event) => event.stopPropagation());
      bed.addEventListener('click', () => this.events.plot(index));
      return bed;
    });
    this.refreshGarden(Date.now());
    return el('div', { class: 'house-beds' }, ...this.beds);
  }

  /** The pots on the stove: steam and time left while cooking, a bell when done. */
  private refreshStove(now: number): void {
    if (!this.stove) return;
    const pots = this.save.cooking.map((c) => ({ dish: dish(c.dish), left: c.readyAt - now }));
    const ready = Object.values(this.save.dishes).reduce((sum, n) => sum + (n ?? 0), 0);
    const key = `${pots.map((p) => `${p.dish.id}:${timeLeft(p.left)}`).join(',')}|${ready}`;
    if (key === this.stoveKey) return;
    this.stoveKey = key;
    this.stove.replaceChildren(
      ...pots.map((p) =>
        el(
          'div',
          { class: `house-pot-cooking${p.left <= 0 ? ' is-done' : ''}`, title: p.dish.name },
          el('span', { class: 'house-steam', 'aria-hidden': 'true' }),
          el('span', { class: 'house-pot-body', style: `--dish:${p.dish.color}` }),
          el('span', { class: 'house-pot-label', text: p.left <= 0 ? 'prêt !' : timeLeft(p.left) }),
        ),
      ),
      ...(ready > 0 ? [el('span', { class: 'house-ready-plates', text: `🍽️ ${ready} prêt${ready > 1 ? 's' : ''}` })] : []),
    );
  }

  /** Marks the empty bed the next seed goes into; -1 marks none. */
  markSeedTarget(index: number): void {
    this.seedTarget = index;
    this.beds.forEach((bed, i) => bed.classList.toggle('is-target', i === index));
  }

  /** Grows the plants on screen: sprout, leaves, then the ripe food bobbing. */
  private refreshGarden(now: number): void {
    this.save.plots.forEach((plot, index) => {
      const bed = this.beds[index];
      if (!bed) return;
      let stage = 'empty';
      if (plot) {
        const left = plot.readyAt - now;
        const total = plant(plot.plant).growMinutes * MINUTE_MS * (plot.watered ? 0.5 : 1);
        stage = left <= 0 ? 'ripe' : left > total * 0.5 ? 'sprout' : 'leaves';
      }
      const key = `${plot?.plant ?? ''}|${stage}|${plot?.watered ?? false}`;
      if (this.bedKeys[index] === key) {
        const time = bed.querySelector('.house-bed-time');
        if (time && plot) time.textContent = timeLeft(plot.readyAt - now);
        return;
      }
      this.bedKeys[index] = key;
      bed.className = `house-bed is-${stage}${plot?.watered ? ' is-watered' : ''}${index === this.seedTarget ? ' is-target' : ''}`;
      const name = plot ? plant(plot.plant).name : '';
      const thirsty = !!plot && stage !== 'ripe' && !plot.watered;
      bed.setAttribute('aria-label', !plot ? 'Parcelle vide : planter' : stage === 'ripe' ? `Récolter : ${name}` : thirsty ? `Arroser : ${name}` : `${name} en train de pousser`);
      const sprite = !plot ? el('span', { class: 'house-bed-plus' }, el('b', { text: '+' }), el('small', { text: 'ici' })) : stage === 'ripe' ? foodIcon(plot.plant, 40) : spriteCanvas(GROWTH_ART[stage as 'sprout' | 'leaves'], stage === 'sprout' ? 4 : 4.6);
      const time = plot && stage !== 'ripe' ? [el('span', { class: 'house-bed-time', text: timeLeft(plot.readyAt - now) })] : [];
      bed.replaceChildren(...(thirsty ? [el('span', { class: 'house-bed-thirst', text: '💧' })] : []), sprite, el('span', { class: 'house-bed-soil' }), ...time);
    });
  }

  /** The house front: every room as a small window, with who is inside and what waits there. */
  private renderMap(): void {
    const room = (id: RoomId) => {
      const info = ROOMS.find((r) => r.id === id)!;
      const open = this.save.rooms.includes(id);
      const button = el(
        'button',
        { class: `house-front-room is-${id}${open ? '' : ' is-locked'}${id === this.active ? ' is-active' : ''}`, type: 'button', 'data-map': id, 'aria-label': info.name },
        el('span', { class: 'house-front-wall', style: `background:${info.wall}` }),
        el('span', { class: 'house-front-ground', style: `background:${info.ground}` }),
        el('span', { class: 'house-front-name', text: info.name }),
        el('span', { class: 'house-front-who' }),
        el('span', { class: 'house-front-badges' }),
      );
      if (!open) button.append(el('span', { class: 'house-front-lock' }, el('span', { text: '🔒' }), el('span', { class: 'house-front-price' }, `${info.price}`, coinIcon())));
      button.addEventListener('click', () => this.events.select(id));
      return button;
    };
    this.mapKeys.clear();
    this.map.replaceChildren(
      el('div', { class: 'house-front-roof' }),
      el(
        'div',
        { class: 'house-front-body' },
        el('div', { class: 'house-front-building' }, el('div', { class: 'house-front-floor' }, room('bedroom'), room('library'), room('greenhouse')), el('div', { class: 'house-front-floor' }, room('living'), room('kitchen'), room('cafe'))),
        el('div', { class: 'house-front-outside' }, room('garden')),
      ),
      el('div', { class: 'house-front-soil' }),
    );
    this.refreshMap(Date.now());
  }

  /** Visitors and badges of each small room; only touches the rooms whose content changed. */
  private refreshMap(now: number): void {
    for (const button of this.map.querySelectorAll<HTMLElement>('[data-map]')) {
      const id = button.dataset.map as RoomId;
      if (!this.save.rooms.includes(id)) continue;
      const here = this.actors.filter((a) => a.room === id);
      const badges = this.badges(id, now);
      const key = `${here.map((a) => a.character?.id ?? 'me').join(',')}|${badges.join('')}`;
      if (this.mapKeys.get(id) === key) continue;
      this.mapKeys.set(id, key);
      button.querySelector('.house-front-who')!.replaceChildren(...here.slice(0, 3).map((a) => companionCanvas(a.character?.look ?? loadCompanion().look, 18)));
      button.querySelector('.house-front-badges')!.replaceChildren(...badges.map((badge) => el('span', { class: 'house-front-badge', text: badge })));
    }
  }

  /** What calls for the player in a room: a pose to shoot, a harvest, a dish, gifts, an order. */
  private badges(id: RoomId, now: number): string[] {
    const badges: string[] = [];
    const posingHere = (a: Actor) => (a.pose !== null && !a.snapped && a.room === id) || (a.pending !== null && a.pending.room === id);
    if (this.actors.some(posingHere)) badges.push('✨');
    if (id === 'garden' && this.save.plots.some((plot) => plot && plot.readyAt <= now)) badges.push('🌱');
    if (id === 'garden' && this.save.plots.some((plot) => plot && plot.readyAt > now && !plot.watered)) badges.push('💧');
    if (id === 'kitchen') {
      if (Object.values(this.save.dishes).some((n) => (n ?? 0) > 0) || this.save.cooking.some((c) => c.readyAt <= now)) badges.push('🍲');
      if (this.save.order && this.save.visitors.includes(this.save.order.visitor)) badges.push('📋');
    }
    if (id === 'living' && this.save.gifts.length > 0) badges.push('🎁');
    if (id === 'living' && (this.save.requests.length > 0 || this.save.lost)) badges.push('💬');
    return badges;
  }

  /** Marks the room shown below the house; null (the album) or a locked room hides the big view. */
  setActive(id: RoomId | null): void {
    this.element.classList.toggle('is-view-hidden', id === null || !this.rooms.has(id));
    if (id === null) {
      for (const button of this.map.querySelectorAll<HTMLElement>('[data-map]')) button.classList.remove('is-active');
      return;
    }
    this.active = id;
    for (const button of this.map.querySelectorAll<HTMLElement>('[data-map]')) button.classList.toggle('is-active', button.dataset.map === id);
    this.scrollToActive();
  }

  /** Jumps the big view to the active room; instant, so scroll snapping cannot stop it half-way. */
  private scrollToActive(): void {
    const index = [...this.rooms.keys()].indexOf(this.active);
    if (index === -1) return;
    this.scrolling = true;
    this.view.scrollLeft = index * this.view.clientWidth;
    window.setTimeout(() => (this.scrolling = false), 200);
  }

  /** A swipe in the big view picks the room it lands on. */
  private readonly onScroll = (): void => {
    window.clearTimeout(this.scrollTimer);
    this.scrollTimer = window.setTimeout(() => {
      if (this.scrolling) return;
      const index = Math.round(this.view.scrollLeft / Math.max(1, this.view.clientWidth));
      const id = [...this.rooms.keys()][index];
      if (id && id !== this.active) this.events.select(id);
    }, 140);
  };
  private randomRoom(): RoomId {
    return this.save.rooms[Math.floor(Math.random() * this.save.rooms.length)];
  }

  // -----------------------------------------------
  // PHOTO
  // -----------------------------------------------

  private posingNear(room: RoomId, event: PointerEvent): boolean {
    return this.actors.some((a) => a.room === room && a.pose !== null && !a.snapped && distanceTo(a, event) <= SNAP_RADIUS);
  }

  /** Wiggles the piece, then says how close the lost thing is. */
  private searchBehind(room: RoomId, spot: number, holder: HTMLElement): void {
    holder.classList.remove('is-wiggling');
    void holder.offsetWidth;
    holder.classList.add('is-wiggling');
    const result = this.events.search(room, spot);
    if (!result) return;
    if (result === 'found') {
      const found = el('span', { class: 'house-found', text: '✨' });
      holder.append(found);
      window.setTimeout(() => found.remove(), 1400);
      return;
    }
    this.toast(room, result === 'warm' ? '🔥 Tiède ! C’est dans cette pièce…' : '🥶 Froid… pas dans cette pièce.', 1800);
  }

  private tap(room: RoomId, event: PointerEvent): void {
    const posing = this.actors.find((a) => a.room === room && a.pose !== null && !a.snapped);
    if (posing && distanceTo(posing, event) <= SNAP_RADIUS) {
      this.snap(posing);
      return;
    }
    const touched = this.actors.find((a) => a.room === room && a.root.contains(event.target as Node));
    if (!touched) return;
    if (touched.character && touched.poseAt > 0) this.toast(room, `${touched.character.name} se prépare : attends le cercle doré !`);
    else if (touched.character) {
      const lines = touched.character.chatter;
      this.toast(room, `${touched.character.name} : « ${lines[Math.floor(Math.random() * lines.length)]} »`, 3500);
    }
    else this.heart(touched);
  }

  private snap(actor: Actor): void {
    actor.snapped = true;
    const t = (performance.now() - actor.poseStart) / poseDuration(actor);
    const distance = Math.abs(t - 0.5);
    const stars = distance <= THREE_STARS ? 3 : distance <= TWO_STARS ? 2 : 1;
    const room = this.rooms.get(actor.room)!;
    const flash = el('div', { class: 'house-flash' });
    room.append(flash);
    window.setTimeout(() => flash.remove(), 500);
    if (actor.pair) {
      actor.pair.partner.snapped = true;
      this.events.pairPhoto(actor.pair.pair, stars);
      return;
    }
    const card = photoCard(actor.character!, actor.pose!, stars);
    card.classList.add('is-flying');
    room.append(card);
    window.setTimeout(() => card.remove(), 1600);
    this.events.photo(actor.character!.id, actor.pose!, stars);
  }

  private toast(room: RoomId, text: string, ms = 1600): void {
    this.rooms.get(room)?.querySelector('.house-toast')?.remove();
    const note = el('div', { class: 'house-toast', text });
    this.rooms.get(room)?.append(note);
    window.setTimeout(() => note.remove(), ms);
  }

  private heart(actor: Actor): void {
    const heart = el('span', { class: 'house-heart', text: '♥' });
    actor.root.append(heart);
    window.setTimeout(() => heart.remove(), 900);
  }

  // -----------------------------------------------
  // ACTORS
  // -----------------------------------------------

  private makeActor(c: Character | null, look: Character['look'], room: RoomId, x: number, nextPoseAt: number): Actor {
    const body = el('div', { class: 'house-body' }, companionCanvas(look, SPRITE_HEIGHT));
    const ring = el('div', { class: 'house-ring' });
    const sight = el('div', { class: 'house-sight' });
    const icon = el('span', { class: 'house-pose-icon' });
    const name = c ? [el('span', { class: 'house-name', text: c.name })] : [];
    const root = el('div', { class: `house-actor${c ? ' is-visitor' : ''}` }, sight, ring, icon, body, ...name);
    return { character: c, root, body, ring, sight, icon, room, x, target: x, nextRoom: null, facing: 1, pending: null, pose: null, poseAt: 0, poseStart: 0, nextPoseAt, snapped: false, pair: null };
  }

  private readonly tick = (time: number): void => {
    const dt = Math.min(0.05, (time - this.last) / 1000);
    this.last = time;
    for (const actor of this.actors) this.update(actor, time, dt);
    if (time - this.mapClock > 400) {
      this.mapClock = time;
      this.refreshMap(Date.now());
      this.refreshGarden(Date.now());
      this.refreshStove(Date.now());
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(actor: Actor, time: number, dt: number): void {
    if (actor.pose !== null) {
      const t = (time - actor.poseStart) / poseDuration(actor);
      if (t >= 1) this.endPose(actor, time);
      else animatePose(actor, POSES[actor.pose].motion, t);
      return;
    }
    const gap = actor.target - actor.x;
    if (Math.abs(gap) < 0.01) {
      if (actor.nextRoom) this.enter(actor, actor.nextRoom);
      else if (actor.pending && actor.pending.room === actor.room) {
        // On the spot: a thought bubble first, so the player has time to come from another room.
        if (actor.poseAt === 0) {
          actor.icon.textContent = actor.pair ? '💭📸' : `💭${POSES[actor.pending.pose].icon}`;
          actor.root.classList.add('is-about-to-pose');
          // A pair waits for both friends to be on their spot, then they pose together.
          const partner = actor.pair?.partner;
          if (!partner) actor.poseAt = time + POSE_WARNING_MS;
          else if (partner.poseAt > 0) actor.poseAt = partner.poseAt = time + POSE_WARNING_MS;
          else actor.poseAt = Infinity;
        } else if (time >= actor.poseAt) this.startPose(actor, time);
      }
      else if (actor.character && !actor.pending && time >= actor.nextPoseAt) this.choosePose(actor, time);
      else if (!actor.pending && Math.random() < dt * 0.35) {
        if (Math.random() < ROOM_CHANGE_CHANCE) this.headFor(actor, this.randomRoom(), 0.15 + Math.random() * 0.7);
        else actor.target = 0.1 + Math.random() * 0.8;
      }
    } else {
      actor.facing = gap > 0 ? 1 : -1;
      actor.x += Math.sign(gap) * Math.min(Math.abs(gap), WALK_SPEED * dt);
    }
    const step = Math.abs(gap) >= 0.01 ? Math.abs(Math.sin(time / 110)) * -4 : 0;
    actor.body.style.transform = `translateY(${step}px) scaleX(${actor.facing})`;
    actor.root.style.left = `${actor.x * 100}%`;
  }

  /** Walks out of the current room, or straight to `x` when already there. */
  private headFor(actor: Actor, room: RoomId, x: number): void {
    if (room === actor.room) {
      actor.nextRoom = null;
      actor.target = x;
      return;
    }
    actor.nextRoom = room;
    actor.target = actor.x < 0.5 ? 0.02 : 0.98;
  }

  private enter(actor: Actor, room: RoomId): void {
    actor.nextRoom = null;
    actor.room = room;
    actor.x = actor.x < 0.5 ? 0.98 : 0.02;
    this.rooms.get(room)?.append(actor.root);
    actor.target = actor.pending?.room === room ? actor.pending.x : 0.2 + Math.random() * 0.6;
  }

  private choosePose(actor: Actor, time: number): void {
    const available = availablePoses(this.save);
    const busy = new Set(this.actors.filter((a) => a !== actor && (a.pose || a.pending)).map((a) => (a.pending ?? { room: a.room }).room));
    const pair = this.pairOf(actor);
    if (pair && Math.random() < PAIR_CHANCE) {
      // The friend is busy: wait for it rather than posing alone, so the two fall in step.
      if (pair.partner.pose || pair.partner.pending || busy.has('living')) {
        actor.nextPoseAt = time + 1500;
        return;
      }
      this.startPair(actor, pair);
      return;
    }
    const options = actor.character!.poses.filter((pose) => {
      const where = available.get(pose);
      return where && !busy.has(where.room) && pose !== 'eat';
    });
    if (options.length === 0) {
      actor.nextPoseAt = time + 3000;
      return;
    }
    const pose = options[Math.floor(Math.random() * options.length)];
    const where = available.get(pose)!;
    actor.pending = { pose, room: where.room, x: SPOT_X[where.spot] + (Math.random() < 0.5 ? -0.12 : 0.12) };
    this.headFor(actor, where.room, actor.pending.x);
  }

  /** A friend from this visitor's story who is at home too, if any. */
  private pairOf(actor: Actor): { pair: Pair; partner: Actor } | null {
    const id = actor.character?.id;
    const pair = pairsHome(this.save).find((p) => id && p.friends.includes(id));
    const partner = pair && this.actors.find((a) => a.character && a.character.id !== id && pair.friends.includes(a.character.id));
    return pair && partner ? { pair, partner } : null;
  }

  /** Sends this visitor and its friend to pose side by side in the living room. */
  private startPair(actor: Actor, { pair, partner }: { pair: Pair; partner: Actor }): void {
    [actor, partner].forEach((a, i) => {
      a.pair = { pair, partner: i === 0 ? partner : actor };
      a.pending = { pose: 'dance', room: 'living', x: i === 0 ? 0.4 : 0.6 };
      this.headFor(a, 'living', a.pending.x);
    });
  }

  private startPose(actor: Actor, time: number): void {
    const pose = actor.pending!.pose;
    actor.pending = null;
    actor.poseAt = 0;
    actor.root.classList.remove('is-about-to-pose');
    actor.pose = pose;
    actor.poseStart = time;
    actor.snapped = false;
    actor.icon.textContent = actor.pair ? '♥' : POSES[pose].icon;
    actor.root.classList.add('is-posing');
  }

  private endPose(actor: Actor, time: number): void {
    actor.pair = null;
    actor.root.classList.remove('is-posing');
    actor.pose = null;
    actor.ring.style.cssText = '';
    actor.ring.classList.remove('is-late');
    actor.sight.classList.remove('is-close', 'is-now');
    actor.icon.style.cssText = '';
    actor.body.style.transform = '';
    actor.nextPoseAt = time + POSE_GAP_MS[0] + Math.random() * (POSE_GAP_MS[1] - POSE_GAP_MS[0]);
  }
}

/** "45 s", "12 min", "1 h 30": short enough to sit under a garden bed. */
function timeLeft(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60}` : ''}`;
}

function poseDuration(actor: Actor): number {
  return actor.pair ? PAIR_POSE_MS : (actor.character?.rhythm ?? 900) * 2;
}

/** `t` runs 0 to 1; every pose peaks at 0.5, when the closing ring meets the visitor. */
function animatePose(actor: Actor, motion: string, t: number): void {
  const peak = 1 - Math.min(1, Math.abs(t - 0.5) * 2);
  // The ring closes onto the sight, meets it at the peak, then shrinks on in grey: too late.
  const distance = Math.abs(t - 0.5);
  actor.ring.style.transform = `translateX(-50%) scale(${Math.max(0.4, 1 + (0.5 - t) * 3)})`;
  actor.ring.style.opacity = t < 0.5 ? '1' : `${Math.max(0, 1 - (t - 0.5) * 3)}`;
  actor.ring.classList.toggle('is-late', t > 0.5 + TWO_STARS);
  actor.sight.classList.toggle('is-close', distance <= TWO_STARS);
  actor.sight.classList.toggle('is-now', distance <= THREE_STARS);
  actor.icon.style.opacity = `${peak}`;
  actor.icon.style.transform = `translate(-50%, ${-peak * 14}px)`;
  const face = `scaleX(${actor.facing})`;
  let move = '';
  if (motion === 'hop') move = `translateY(${-peak * peak * 42}px)`;
  else if (motion === 'squash') move = `translateY(${peak * 7}px) scaleY(${1 - peak * 0.16})`;
  else if (motion === 'lean') move = `rotate(${peak * 14 * actor.facing}deg)`;
  else if (motion === 'wiggle') move = `rotate(${Math.sin(t * Math.PI * 8) * 10 * peak}deg)`;
  else move = `translateX(${Math.sin(t * Math.PI * 2) * 14 * peak}px) rotate(${Math.sin(t * Math.PI * 2) * 12 * peak}deg)`;
  actor.body.style.transform = `${move} ${face}`;
}

function distanceTo(actor: Actor, event: PointerEvent): number {
  const box = actor.body.getBoundingClientRect();
  return Math.hypot(event.clientX - (box.left + box.width / 2), event.clientY - (box.top + box.height / 2));
}

/** A small polaroid: the visitor, the pose, the stars. Empty when `stars` is 0. */
export function photoCard(c: Character, pose: PoseId, stars: number): HTMLElement {
  const where = furnitureRoomOf(pose);
  return el(
    'div',
    { class: `house-photo${stars === 0 ? ' is-empty' : ''}` },
    el('div', { class: `house-photo-frame is-${where}` }, stars > 0 ? companionCanvas(c.look, 44) : el('span', { text: '?' })),
    el('small', { text: POSES[pose].name }),
    el('span', { class: 'house-stars', text: stars > 0 ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '☆☆☆' }),
  );
}

function furnitureRoomOf(pose: PoseId): RoomId {
  return FURNITURE.find((piece) => piece.pose === pose)?.room ?? 'living';
}
