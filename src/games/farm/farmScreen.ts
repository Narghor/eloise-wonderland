import './farm.css';
import { el } from '../../dom';
import { openHelp, openHelpOnFirstVisit } from '../../help';
import { armSoundUnlock, playClack, playCluck, playCoinLand, playFanfare, playMoo, playPluck, playPop, playRustle, playSeed, playThunk } from '../casino/fx/sound';
import { CASINO_TEST_BUTTONS } from '../casino/fx/testMode'; // TEST-BUTTONS
import { booster } from './data/boosters';
import { crop } from './data/crops';
import { BRIDGE_TILES } from './data/land';
import { xpToNext } from './data/levels';
import { person } from './data/people';
import { placeable } from './data/placeables';
import { project } from './data/projects';
import { item, itemCount } from './data/items';
import type { BoosterId, CropId, ItemId, PlaceableId } from './data/types';
import { boosterIcon, faceSprite, itemIcon, spriteImage, uiIcon, type Sprite } from './farmArt';
import { buyBooster, fertilize, hurry, water } from './farmBoosters';
import { FARM_HELP } from './farmHelp';
import { FarmHud, type SheetId } from './farmHud';
import { buyAndPlace, buyParcel, buyRefusal, canMove, canStand, canStore, clearObstacle, footprint, freeSpotNear, moveObject, newFarm, parcelOffers, storeObject } from './farmMap';
import { deliver, refillOrders, refuse } from './farmOrders';
import {
  buyAnimal,
  buySlot,
  collectMachine,
  collectPen,
  collectTree,
  feedPen,
  fieldState,
  harvest,
  hungryAnimals,
  penAnimal,
  queueRecipe,
  readyAnimals,
  readyCount,
  sell,
  sow,
  trayJobs,
  type Gain,
} from './farmProduction';
import { claimQuest, finishStage, gainXp, giveToProject, have, openChest, settle, type Notice } from './farmProgress';
import {
  decoBubble,
  fieldBubble,
  machineBubble,
  obstacleBubble,
  offerOf,
  parcelBubble,
  penBubble,
  rewardLine,
  sheetContent,
  treeBubble,
  type FarmUi,
} from './farmPanels';
import { FarmScene, type Ghost } from './farmScene';
import { loadFarm, saveFarm, type FarmSave, type PlacedObject } from './farmSave';
import { MINUTE_MS } from './farmTime';

// -----------------------------------------------
// #/ferme: the farm in full screen
// -----------------------------------------------

/** Away longer than this, the farm says what waits. */
const WELCOME_AFTER_MS = 15 * 60 * 1000;

export function renderFarm(root: HTMLElement): () => void {
  armSoundUnlock();
  const now = Date.now();
  const saved = loadFarm();
  const save = saved ?? newFarm(now);
  const screen = new FarmScreen(root, save);
  screen.commit();
  openHelpOnFirstVisit(FARM_HELP);
  if (saved && now - saved.lastVisit > WELCOME_AFTER_MS) {
    const ready = readyCount(save, now);
    if (ready > 0) screen.toast(`Bon retour ! ${ready} chose${ready > 1 ? 's' : ''} t’attend${ready > 1 ? 'ent' : ''}.`);
  }
  return () => screen.dispose();
}

type Target = PlacedObject | { parcel: number };

class FarmScreen implements FarmUi {
  readonly save: FarmSave;
  readonly sheetState: FarmUi['sheetState'] = { barnItem: null };
  private readonly root: HTMLElement;
  private readonly overlay = el('div', { class: 'farm-overlay' });
  private readonly scene: FarmScene;
  private readonly hud: FarmHud;
  private readonly toasts = el('div', { class: 'farm-toasts', role: 'status' });
  private readonly tags: { el: HTMLElement; anchor: () => { x: number; y: number } | null }[] = [];
  private bubble: { el: HTMLElement; target: Target } | null = null;
  private sheet: { el: HTMLElement; id: SheetId; tab: string } | null = null;
  private editing = false;
  private placing: PlaceableId | null = null;
  private banner: HTMLElement | null = null;
  private tools: HTMLElement | null = null;
  private dialogs: (() => HTMLElement)[] = [];
  private dialogOpen = false;
  private landKey = '';
  private readonly timer: number;
  private commitTimer = 0;
  private pluckStep = 0;
  private pluckAt = 0;

  constructor(root: HTMLElement, save: FarmSave) {
    this.save = save;
    this.root = el('div', { class: 'farm' });
    root.append(this.root);
    this.scene = new FarmScene(this.root, save, {
      tap: (target, tile) => this.tap(target, tile),
      harvest: (field) => this.harvestField(field),
      ghostMoved: () => this.renderTools(),
      ghostFits: (ghost) => this.ghostFits(ghost),
    });
    this.hud = new FarmHud({
      sheet: (id, tab) => this.openSheet(id, tab, true),
      edit: () => (this.editing || this.placing ? this.exitEdit() : this.enterEdit()),
      zoom: () => {
        this.scene.toggleZoom();
        this.hud.setZoom(this.scene.isFar);
      },
      help: () => openHelp(FARM_HELP),
    });
    this.overlay.append(this.hud.top, this.hud.quest, this.hud.side, this.toasts, this.hud.bar);
    if (CASINO_TEST_BUTTONS) this.overlay.append(this.testBar()); // TEST-BUTTONS
    this.root.append(this.overlay);
    this.scene.onFrame = () => this.follow();
    this.timer = window.setInterval(() => this.tick(), 1000);
  }

  dispose(): void {
    window.clearInterval(this.timer);
    window.clearTimeout(this.commitTimer);
    this.save.lastVisit = Date.now();
    saveFarm(this.save);
    this.scene.dispose();
  }

  now(): number {
    return Date.now();
  }

  // -----------------------------------------------
  // ONE ACTION AT A TIME: act, settle, save, show
  // -----------------------------------------------

  act(action: () => void): void {
    action();
    this.commit();
  }

  commit(): void {
    window.clearTimeout(this.commitTimer);
    const now = Date.now();
    refillOrders(this.save, now);
    const notices = settle(this.save, now);
    this.save.lastVisit = now;
    saveFarm(this.save);
    const land = `${this.save.parcels.join(',')}|${this.save.projectsDone.join(',')}|${this.save.parcelsBought}|${this.save.level}`;
    if (land !== this.landKey) {
      this.landKey = land;
      this.refreshLand();
    }
    this.hud.refresh(this.save);
    this.refreshPanels();
    this.tell(notices);
  }

  /** Swipes save once the finger rests: one write instead of twenty. */
  private commitSoon(): void {
    this.hud.refresh(this.save);
    window.clearTimeout(this.commitTimer);
    this.commitTimer = window.setTimeout(() => this.commit(), 350);
  }

  private tick(): void {
    const now = Date.now();
    if (refillOrders(this.save, now) > 0) {
      saveFarm(this.save);
      if (this.sheet?.id === 'orders') this.renderSheet();
    }
    this.hud.refresh(this.save);
  }

  // -----------------------------------------------
  // THE MAP
  // -----------------------------------------------

  private refreshLand(): void {
    const offers = parcelOffers(this.save);
    this.scene.refreshLand(offers);
    for (const tag of this.tags) tag.el.remove();
    this.tags.length = 0;
    for (const offer of offers) {
      const locked = this.save.level < offer.level;
      const tag = el('button', { class: `farm-tag${locked ? ' is-locked' : ''}`, type: 'button' }, offer.river ? 'La rive' : 'Terrain', ' · ', String(offer.price), spriteImage(uiIcon('nut'), 1), ...(locked ? [' · ', spriteImage(uiIcon('lock'), 1), `niv. ${offer.level}`] : []));
      tag.addEventListener('click', () => this.tap({ parcel: offer.parcel }, [0, 0]));
      this.tags.push({ el: tag, anchor: () => this.scene.signAnchor(offer.parcel) });
    }
    if (!this.save.projectsDone.includes('bridge')) {
      const [bx, by] = BRIDGE_TILES[0];
      const tag = el('button', { class: 'farm-tag', type: 'button' }, spriteImage(uiIcon('bridge'), 1), 'Le vieux pont');
      tag.addEventListener('click', () => {
        if (this.save.level < 10) this.toast('Basile dit que le vieux pont se répare à partir du niveau 10.');
        else this.openSheet('quests', 'project', true);
      });
      this.tags.push({ el: tag, anchor: () => this.scene.toScreen((bx + 0.5) * 16, by * 16 - 2) });
    }
    this.overlay.prepend(...this.tags.map((t) => t.el));
  }

  /** Every frame: the HTML that sits on the map follows the camera. */
  private follow(): void {
    const box = this.root.getBoundingClientRect();
    for (const tag of this.tags) {
      const p = tag.anchor();
      tag.el.hidden = !p || p.x < -60 || p.y < -20 || p.x > box.width + 60 || p.y > box.height + 40;
      if (p && !tag.el.hidden) tag.el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
    }
    if (this.bubble) this.placeBubble(box);
    if (this.tools && this.scene.ghost) {
      const a = this.scene.anchorOf(this.scene.ghost);
      const w = this.tools.offsetWidth;
      const x = Math.min(Math.max(a.x, w / 2 + 8), box.width - w / 2 - 8);
      const y = Math.min(a.bottom, box.height - 150);
      this.tools.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, 12px)`;
    }
  }

  private tap(target: Target | null, tile: [number, number]): void {
    if (this.placing && this.scene.ghost) {
      const [w, h] = footprint(this.scene.ghost);
      this.scene.ghost.x = Math.max(0, tile[0] - Math.floor(w / 2));
      this.scene.ghost.y = Math.max(0, tile[1] - Math.floor(h / 2));
      this.renderTools();
      return;
    }
    if (this.editing) {
      if (target && 'uid' in target) this.select(target);
      else this.applySelection();
      return;
    }
    if (this.sheet) this.closeSheet();
    if (!target) return this.closeBubble();
    if ('parcel' in target) return this.openBubble(target);
    const kind = placeable(target.type).kind;
    const now = Date.now();
    if (kind === 'field') {
      if (fieldState(target, now) === 'ripe') return this.harvestField(target);
      return this.openBubble(target);
    }
    if (kind === 'pen') {
      if (readyAnimals(target, now) > 0) return this.collect(target);
      if (hungryAnimals(target) > 0 && have(this.save, penAnimal(target).feed) > 0 && this.bubble?.target !== target) return this.feed(target);
      return this.openBubble(target);
    }
    if (kind === 'machine' && trayJobs(target, now) > 0 && this.bubble?.target !== target) return this.collect(target);
    if (kind === 'tree' && target.readyAt !== undefined && target.readyAt <= now) return this.collect(target);
    this.openBubble(target);
  }

  // -----------------------------------------------
  // BUBBLES
  // -----------------------------------------------

  private openBubble(target: Target): void {
    this.closeBubble();
    const content = this.bubbleContent(target);
    if (!content) return;
    const bubble = el('div', { class: 'farm-bubble farm-box', role: 'dialog' }, ...content);
    bubble.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.overlay.append(bubble);
    this.bubble = { el: bubble, target };
    this.placeBubble(this.root.getBoundingClientRect());
  }

  private bubbleContent(target: Target): Node[] | null {
    if ('parcel' in target) {
      const offer = offerOf(this.save, target.parcel);
      return offer ? parcelBubble(this, offer) : null;
    }
    if (!this.save.objects.includes(target)) return null;
    const kind = placeable(target.type).kind;
    if (kind === 'field') return fieldBubble(this, target);
    if (kind === 'pen') return penBubble(this, target);
    if (kind === 'machine') return machineBubble(this, target);
    if (kind === 'tree') return treeBubble(this, target);
    if (kind === 'obstacle') return obstacleBubble(this, target);
    return decoBubble(target);
  }

  private placeBubble(box: DOMRect): void {
    const { el: bubble, target } = this.bubble!;
    let anchor: { x: number; y: number; bottom: number } | null;
    if ('parcel' in target) {
      const sign = this.scene.signAnchor(target.parcel);
      anchor = sign && { ...sign, bottom: sign.y + 20 };
    } else {
      const a = this.scene.anchorOf(target);
      anchor = { x: a.x, y: a.top, bottom: a.bottom };
    }
    if (!anchor) return;
    const w = bubble.offsetWidth;
    const h = bubble.offsetHeight;
    const below = anchor.y - h - 14 < 70;
    const x = Math.min(Math.max(anchor.x, w / 2 + 8), box.width - w / 2 - 8);
    const y = below ? anchor.bottom : anchor.y;
    bubble.classList.toggle('is-below', below);
    bubble.style.left = `${Math.round(x)}px`;
    bubble.style.top = `${Math.round(y)}px`;
  }

  closeBubble(): void {
    this.bubble?.el.remove();
    this.bubble = null;
  }

  // -----------------------------------------------
  // SHEETS
  // -----------------------------------------------

  openSheet(id: SheetId, tab?: string, fromButton = false): void {
    this.closeBubble();
    if (this.editing || this.placing) this.exitEdit();
    if (fromButton && this.sheet?.id === id && (tab === undefined || tab === this.sheet.tab)) return this.closeSheet();
    const keep = this.sheet?.id === id ? this.sheet.el.querySelector('.farm-sheet-body')?.scrollTop ?? 0 : 0;
    this.sheet?.el.remove();
    this.sheet = { el: el('section'), id, tab: tab ?? (this.sheet?.id === id ? this.sheet.tab : '') };
    this.renderSheet();
    const body = this.sheet.el.querySelector('.farm-sheet-body');
    if (body && !fromButton) body.scrollTop = keep;
    this.hud.setPressed(id);
  }

  private renderSheet(): void {
    if (!this.sheet) return;
    const old = this.sheet.el;
    const scroll = old.querySelector('.farm-sheet-body')?.scrollTop ?? 0;
    const content = sheetContent(this, this.sheet.id, this.sheet.tab || undefined);
    this.sheet.tab = content.tab;
    const close = el('button', { class: 'farm-close', type: 'button', 'aria-label': 'Fermer', text: '×' });
    close.addEventListener('click', () => this.closeSheet());
    const tabs = el(
      'div',
      { class: 'farm-tabs' },
      ...content.tabs.map(([id, label, news]) => {
        const b = el('button', { type: 'button', 'aria-pressed': String(id === content.tab) }, label, ...(news ? [el('span', { class: 'farm-count', text: '!' })] : []));
        b.addEventListener('click', () => {
          this.sheet!.tab = id;
          this.renderSheet();
        });
        return b;
      }),
    );
    const body = el('div', { class: 'farm-sheet-body' }, ...content.body);
    const sheet = el('section', { class: 'farm-sheet', role: 'dialog', 'aria-label': content.title }, el('header', {}, el('h2', { text: content.title }), close), tabs, body);
    sheet.addEventListener('pointerdown', (e) => e.stopPropagation());
    if (old.isConnected) old.replaceWith(sheet);
    else this.overlay.append(sheet);
    this.sheet.el = sheet;
    body.scrollTop = scroll;
  }

  closeSheet(): void {
    this.sheet?.el.remove();
    this.sheet = null;
    this.hud.setPressed(this.editing ? 'build' : null);
  }

  private refreshPanels(): void {
    if (this.sheet) this.renderSheet();
    if (this.bubble) {
      const content = this.bubbleContent(this.bubble.target);
      if (content) this.bubble.el.replaceChildren(...content);
      else this.closeBubble();
    }
  }

  // -----------------------------------------------
  // FEEDBACK: floating numbers, products flying to the barn, toasts, dialogs
  // -----------------------------------------------

  private screenOf(o: PlacedObject): { x: number; y: number } {
    const a = this.scene.anchorOf(o);
    return { x: a.x, y: (a.top + a.bottom) / 2 };
  }

  private float(at: { x: number; y: number }, text: string, icon?: Sprite): void {
    const node = el('div', { class: 'farm-float' }, ...(icon ? [spriteImage(icon, 2)] : []), text);
    node.style.left = `${at.x}px`;
    node.style.top = `${at.y}px`;
    this.overlay.append(node);
    window.setTimeout(() => node.remove(), 1150);
  }

  private fly(at: { x: number; y: number }, icon: Sprite): void {
    const box = this.root.getBoundingClientRect();
    const target = this.hud.barnTarget();
    const node = spriteImage(icon, 3);
    node.classList.add('farm-fly');
    node.style.transform = `translate(${at.x - 12}px, ${at.y - 12}px)`;
    this.overlay.append(node);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        node.style.transform = `translate(${target.left - box.left + target.width / 2 - 12}px, ${target.top - box.top + target.height / 2 - 12}px) scale(0.6)`;
        node.style.opacity = '0.2';
      }),
    );
    window.setTimeout(() => node.remove(), 700);
  }

  private showGain(o: PlacedObject, gain: Gain): void {
    const at = this.screenOf(o);
    const icon = gain.item === 'nuts' ? uiIcon('nut') : itemIcon(gain.item);
    this.float(at, `+${gain.count}`, icon);
    if (gain.xp > 0) window.setTimeout(() => this.float({ x: at.x, y: at.y - 18 }, `+${gain.xp} XP`, uiIcon('star')), 220);
    if (gain.item !== 'nuts') this.fly(at, icon);
  }

  /** A short message under the top band; the same one twice replaces itself, three at most on screen. */
  toast(text: string): void {
    for (const old of this.toasts.children) if (old.textContent === text) old.remove();
    while (this.toasts.children.length >= 3) this.toasts.firstElementChild!.remove();
    const node = el('div', { class: 'farm-toast farm-box', text });
    this.toasts.append(node);
    window.setTimeout(() => node.remove(), 3300);
  }

  private tell(notices: Notice[]): void {
    for (const n of notices) {
      if (n.kind === 'task') this.toast(`Tâche du jour faite : ${n.text} ✓`);
      else if (n.kind === 'medal') this.toast(`Médaille ${['de bronze', 'd’argent', 'd’or'][n.tier]} : ${n.name} !`);
      else if (n.kind === 'level') this.queueDialog(() => this.levelDialog(n));
      else this.queueDialog(() => this.speech(n.quest.who, n.quest.title, n.quest.intro, 'D’accord !'));
    }
  }

  private queueDialog(make: () => HTMLElement): void {
    this.dialogs.push(make);
    if (!this.dialogOpen) this.nextDialog();
  }

  private nextDialog(): void {
    const make = this.dialogs.shift();
    this.dialogOpen = !!make;
    if (!make) return;
    const dialog = el('div', { class: 'farm-dialog' }, make());
    dialog.addEventListener('pointerdown', (e) => e.stopPropagation());
    dialog.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.farm-btn')) {
        dialog.remove();
        this.nextDialog();
      }
    });
    this.overlay.append(dialog);
  }

  private levelDialog(n: Extract<Notice, { kind: 'level' }>): HTMLElement {
    playFanfare();
    return el(
      'div',
      { class: 'farm-dialog-box farm-box' },
      el('div', { class: 'farm-big-level', text: String(n.level) }),
      el('h2', { text: `Niveau ${n.level} !` }),
      el('div', { class: 'farm-pay' }, ...rewardLine(n.reward)),
      ...(n.unlocks.length > 0 ? [el('p', { class: 'farm-note', text: 'Nouveau à la ferme :' }), el('ul', {}, ...n.unlocks.map((u) => el('li', { text: u })))] : []),
      el('button', { class: 'farm-btn is-wide', type: 'button', text: 'Super !' }),
    );
  }

  private speech(who: Parameters<typeof faceSprite>[0], title: string, text: string, ok: string, extra: Node[] = []): HTMLElement {
    return el(
      'div',
      { class: 'farm-dialog-box farm-box' },
      el('div', { class: 'farm-speech' }, el('span', { class: 'farm-face' }, spriteImage(faceSprite(who), 3, person(who).name)), el('p', {}, el('strong', { text: `${person(who).name} · ${title}` }), text)),
      ...extra,
      el('button', { class: 'farm-btn is-wide', type: 'button', text: ok }),
    );
  }

  private choose(title: string, text: string, choices: { label: string; act: () => void; ghost?: boolean }[]): void {
    this.queueDialog(() => {
      const box = el('div', { class: 'farm-dialog-box farm-box' }, el('h2', { text: title }), el('p', { class: 'farm-note', text }));
      for (const c of choices) {
        const b = el('button', { class: `farm-btn is-wide${c.ghost ? ' is-ghost' : ''}`, type: 'button', text: c.label });
        b.addEventListener('click', c.act);
        box.append(b);
      }
      return box;
    });
  }

  // -----------------------------------------------
  // PLAYER ACTIONS
  // -----------------------------------------------

  private harvestField(field: PlacedObject): void {
    const gain = harvest(this.save, field, Date.now());
    if (!gain) return;
    const t = performance.now();
    this.pluckStep = t - this.pluckAt < 900 ? this.pluckStep + 1 : 0;
    this.pluckAt = t;
    playPluck(this.pluckStep);
    this.showGain(field, gain);
    if (this.bubble?.target === field) this.closeBubble();
    this.commitSoon();
  }

  sow(field: PlacedObject, id: CropId): void {
    if (!sow(this.save, field, id, Date.now())) return;
    playSeed();
    this.closeBubble();
    this.float(this.screenOf(field), `−${crop(id).seed}`, uiIcon('nut'));
    this.commit();
  }

  seedSwipe(id: CropId, first: PlacedObject, event: PointerEvent): void {
    // The bubble hides during the swipe: the finger is followed on the window, not on its button.
    const pointer = event.pointerId;
    (event.target as Element).releasePointerCapture?.(pointer);
    const start = { x: event.clientX, y: event.clientY };
    let swiping = false;
    let last = start;
    let step = 0;
    let spent = 0;
    let broke = false;
    const sowOne = (field: PlacedObject) => {
      if (fieldState(field, Date.now()) !== 'empty') return;
      if (!sow(this.save, field, id, Date.now())) {
        broke = this.save.nuts < crop(id).seed;
        return;
      }
      spent += crop(id).seed;
      playSeed(step++);
      this.hud.refresh(this.save);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      if (!swiping && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) {
        swiping = true;
        if (this.bubble) this.bubble.el.style.visibility = 'hidden';
        sowOne(first);
      }
      if (!swiping) return;
      for (const field of this.scene.fieldsAlong(last, { x: e.clientX, y: e.clientY })) sowOne(field);
      last = { x: e.clientX, y: e.clientY };
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!swiping) sowOne(first);
      this.closeBubble();
      if (spent > 0) this.float(this.screenOf(first), `−${spent}`, uiIcon('nut'));
      if (broke) this.toast('Plus assez d’Éloisettes pour semer.');
      this.commit();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  collect(object: PlacedObject): void {
    const now = Date.now();
    const kind = placeable(object.type).kind;
    let gains: Gain[] = [];
    if (kind === 'pen') {
      const g = collectPen(this.save, object, now);
      if (g) gains = [g];
      if (g) (object.type === 'cowshed' ? playMoo : playCluck)();
    } else if (kind === 'machine') gains = collectMachine(this.save, object, now);
    else if (kind === 'tree') {
      const g = collectTree(this.save, object, now);
      if (g) gains = [g];
    }
    if (gains.length === 0) return;
    playPop();
    gains.forEach((g, i) => window.setTimeout(() => this.showGain(object, g), i * 250));
    this.commit();
  }

  feed(pen: PlacedObject): void {
    const a = penAnimal(pen);
    const fed = feedPen(this.save, pen, Date.now());
    if (fed === 0) {
      this.toast(`Plus d’${item(a.feed).name.toLowerCase()} : il se fabrique au Moulin.`);
      return;
    }
    (pen.type === 'cowshed' ? playMoo : playCluck)();
    this.float(this.screenOf(pen), `−${fed}`, itemIcon(a.feed));
    this.commit();
  }

  buyAnimal(pen: PlacedObject): void {
    if (!buyAnimal(this.save, pen)) return this.toast('Pas assez d’Éloisettes.');
    (pen.type === 'cowshed' ? playMoo : playCluck)();
    this.toast(`Bienvenue à ta nouvelle ${penAnimal(pen).name.toLowerCase()} ! Elle a faim.`);
    this.commit();
  }

  queue(machine: PlacedObject, id: ItemId): void {
    if (!queueRecipe(this.save, machine, id, Date.now())) return;
    playClack();
    this.commit();
  }

  buySlot(machine: PlacedObject): void {
    if (!buySlot(this.save, machine)) return;
    playThunk();
    this.commit();
  }

  clear(object: PlacedObject): void {
    const at = this.screenOf(object);
    const result = clearObstacle(this.save, object);
    if (!result) return;
    playRustle();
    this.closeBubble();
    this.float(at, `+${result.xp} XP`, uiIcon('star'));
    const s = result.surprise;
    if (s.nuts > 0) this.toast(`Surprise : ${s.nuts} Éloisettes cachées dessous !`);
    if (s.booster) this.toast(`Surprise : un ${booster(s.booster).name} !`);
    this.commit();
  }

  buyParcel(parcel: number): void {
    if (!buyParcel(this.save, parcel)) return;
    playFanfare();
    this.closeBubble();
    this.toast('Nouveau terrain ! Dégage la friche pour y construire.');
    this.commit();
  }

  useBooster(id: BoosterId, target?: PlacedObject): void {
    const now = Date.now();
    let done = false;
    if (id === 'fertilizer' && target) done = fertilize(this.save, target, now);
    else if (id === 'hourglass' && target) done = hurry(this.save, target, now);
    else if (id === 'wateringCan') {
      const n = water(this.save, now);
      done = n > 0;
      if (done) this.toast(`Arrosé : ${n} champ${n > 1 ? 's poussent' : ' pousse'} deux fois plus vite.`);
    }
    if (!done) return;
    playPop();
    if (target) this.float(this.screenOf(target), booster(id).name, boosterIcon(id));
    this.commit();
  }

  deliver(id: number): void {
    const order = deliver(this.save, id, Date.now());
    if (!order) return;
    playCoinLand('small');
    this.toast(`${person(order.who).name} te remercie : +${order.nuts} Éloisettes, +${order.xp} XP`);
    this.commit();
  }

  refuse(id: number): void {
    const hands = this.save.boosters.helpingHand;
    this.choose('Changer de commande ?', 'Une autre commande la remplace dans 15 minutes, ou tout de suite avec un Coup de main.', [
      ...(hands > 0 ? [{ label: `Tout de suite (Coup de main, ${hands})`, act: () => this.act(() => refuse(this.save, id, Date.now(), true)) }] : []),
      { label: 'Dans 15 minutes', act: () => this.act(() => refuse(this.save, id, Date.now(), false)), ghost: hands > 0 },
      { label: 'Garder', act: () => {}, ghost: true },
    ]);
  }

  claimQuest(id: string): void {
    const q = claimQuest(this.save, id);
    if (!q) return;
    playFanfare();
    this.queueDialog(() => this.speech(q.who, q.title, q.thanks, 'Merci !', [el('div', { class: 'farm-pay' }, ...rewardLine(q.reward))]));
    this.commit();
  }

  openChest(): void {
    if (!openChest(this.save)) return;
    playFanfare();
    this.toast('Coffre ouvert ! À demain pour de nouvelles tâches.');
    this.commit();
  }

  give(id: ItemId): void {
    const n = giveToProject(this.save, 'bridge', id);
    if (n === 0) return;
    playThunk();
    this.toast(`Donné : ${itemCount(id, n)}`);
    this.commit();
  }

  finishStage(): void {
    if (!finishStage(this.save, 'bridge')) return;
    playFanfare();
    if (this.save.projectsDone.includes('bridge')) this.queueDialog(() => this.speech('basile', project('bridge').name, project('bridge').done, 'Allons voir !'));
    else this.toast('Étape terminée ! Basile prépare la suivante.');
    this.commit();
  }

  sell(id: ItemId, count: number): void {
    const nuts = sell(this.save, id, count);
    if (nuts === 0) return;
    playCoinLand('small');
    this.toast(`Vendu : ${itemCount(id, count)} pour ${nuts} Éloisettes`);
    this.commit();
  }

  buyBooster(id: BoosterId): void {
    if (!buyBooster(this.save, id, Date.now())) return this.toast('Pas assez de pièces, ou plus de stock aujourd’hui.');
    playPop();
    this.commit();
  }

  // -----------------------------------------------
  // EDIT MODE AND PLACING
  // -----------------------------------------------

  private enterEdit(): void {
    this.closeSheet();
    this.closeBubble();
    this.editing = true;
    this.scene.editMode = true;
    this.hud.setEditing(true);
    this.hud.setPressed('build');
    this.showBanner('Aménager : touche un objet pour le déplacer, le tourner ou le ranger.', 'Fini', () => this.exitEdit());
  }

  private exitEdit(): void {
    this.applySelection();
    this.placing = null;
    this.editing = false;
    this.scene.ghost = null;
    this.scene.editMode = false;
    this.hud.setEditing(false);
    this.hud.setPressed(null);
    this.banner?.remove();
    this.banner = null;
    this.renderTools();
  }

  private showBanner(text: string, done: string, onDone: () => void): void {
    this.banner?.remove();
    const b = el('button', { class: 'farm-btn', type: 'button', text: done });
    b.addEventListener('click', onDone);
    this.banner = el('div', { class: 'farm-edit-banner farm-box' }, el('p', { text }), b);
    this.overlay.append(this.banner);
  }

  private ghostFits(ghost: Ghost): boolean {
    const [w, h] = footprint(ghost);
    const self = ghost.uid !== undefined ? this.save.objects.find((o) => o.uid === ghost.uid) : undefined;
    return canStand(this.save, ghost.x, ghost.y, w, h, self);
  }

  private select(object: PlacedObject): void {
    this.applySelection();
    if (!canMove(object)) return this.toast('Un obstacle ne se déplace pas : il se dégage (touche-le hors du mode Aménager).');
    this.scene.ghost = { type: object.type, x: object.x, y: object.y, rot: object.rot, uid: object.uid };
    this.scene.selected = object.uid;
    this.renderTools();
  }

  /** Puts the moved object where its ghost is, when it fits; otherwise it stays where it was. */
  private applySelection(): void {
    const ghost = this.scene.ghost;
    if (!ghost || ghost.uid === undefined) return;
    const object = this.save.objects.find((o) => o.uid === ghost.uid);
    this.scene.ghost = null;
    this.scene.selected = null;
    if (object && (ghost.x !== object.x || ghost.y !== object.y || ghost.rot !== object.rot)) {
      if (moveObject(this.save, object, ghost.x, ghost.y, ghost.rot)) {
        playThunk();
        this.commit();
      } else this.toast('Pas la place ici : il reste où il était.');
    }
    this.renderTools();
  }

  startPlacing(id: PlaceableId): void {
    this.closeSheet();
    this.closeBubble();
    this.applySelection();
    const p = placeable(id);
    const [cx, cy] = this.scene.viewCentre();
    const spot = freeSpotNear(this.save, cx, cy, p.size[0], p.size[1]);
    if (!spot) return this.toast('Plus de place libre : dégage la friche ou achète un terrain.');
    this.placing = id;
    this.scene.ghost = { type: id, x: spot[0], y: spot[1], rot: 0 };
    this.scene.editMode = true;
    this.hud.setEditing(true);
    this.showBanner(`Fais glisser : ${p.name.toLowerCase()}, ou touche l’endroit choisi.`, 'Annuler', () => this.exitEdit());
    this.renderTools();
  }

  private place(): void {
    const ghost = this.scene.ghost;
    const id = this.placing;
    if (!ghost || !id) return;
    if (!this.ghostFits(ghost)) return this.toast('Pas la place ici.');
    const placed = buyAndPlace(this.save, id, ghost.x, ghost.y, ghost.rot, Date.now());
    if (!placed) return this.toast('Pas assez d’Éloisettes.');
    playThunk();
    this.commit();
    // Fields and decorations often come in rows: offer the next one right beside.
    const p = placeable(id);
    const again = (p.kind === 'field' || p.kind === 'deco') && ((p.kind === 'deco' && (this.save.decorStore[id as keyof FarmSave['decorStore']] ?? 0) > 0) || buyRefusal(this.save, p) === null);
    const [w, h] = footprint(ghost);
    const next = again ? freeSpotNear(this.save, ghost.x + w + w / 2, ghost.y + h / 2, w, h) : null;
    if (next) {
      ghost.x = next[0];
      ghost.y = next[1];
      this.renderTools();
    } else this.exitEdit();
  }

  private renderTools(): void {
    this.tools?.remove();
    this.tools = null;
    const ghost = this.scene.ghost;
    if (!ghost) return;
    const turn = el('button', { class: 'farm-btn is-ghost', type: 'button' }, spriteImage(uiIcon('rotate'), 2), 'Tourner');
    turn.addEventListener('click', () => {
      ghost.rot = ((ghost.rot + 1) % 4) as Ghost['rot'];
      this.renderTools();
    });
    const buttons: HTMLElement[] = [turn];
    if (this.placing) {
      const p = placeable(this.placing);
      const stored = p.kind === 'deco' && (this.save.decorStore[this.placing as keyof FarmSave['decorStore']] ?? 0) > 0;
      const ok = el('button', { class: 'farm-btn', type: 'button', ...(this.ghostFits(ghost) ? {} : { disabled: '' }) }, spriteImage(uiIcon('check'), 2), stored ? 'Poser' : 'Acheter');
      ok.addEventListener('click', () => this.place());
      buttons.push(ok);
    } else {
      const object = this.save.objects.find((o) => o.uid === ghost.uid);
      if (object && canStore(object)) {
        const store = el('button', { class: 'farm-btn is-ghost', type: 'button' }, spriteImage(uiIcon('store'), 2), 'Ranger');
        store.addEventListener('click', () => {
          this.scene.ghost = null;
          this.scene.selected = null;
          storeObject(this.save, object);
          playThunk();
          this.toast(`${placeable(object.type).name} : rangé, à reposer depuis la Boutique.`);
          this.renderTools();
          this.commit();
        });
        buttons.push(store);
      }
      const ok = el('button', { class: 'farm-btn', type: 'button' }, spriteImage(uiIcon('check'), 2), 'OK');
      ok.addEventListener('click', () => this.applySelection());
      buttons.push(ok);
    }
    this.tools = el('div', { class: 'farm-edit-tools farm-box' }, ...buttons);
    this.tools.style.left = '0';
    this.tools.style.top = '0';
    this.tools.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.overlay.append(this.tools);
  }

  // -----------------------------------------------
  // TEST-BUTTONS: shortcuts to check the farm without waiting (MINUTE_MS is a second)
  // -----------------------------------------------

  private testBar(): HTMLElement {
    const button = (label: string, action: () => void) => {
      const b = el('button', { type: 'button', text: label });
      b.addEventListener('click', () => this.act(action));
      return b;
    };
    return el(
      'div',
      { class: 'farm-test' },
      el('b', { text: `TEST · 1 min = ${MINUTE_MS / 1000} s` }),
      button('+500 Éloisettes', () => (this.save.nuts += 500)),
      button('+1 niveau', () => gainXp(this.save, Math.max(0, (xpToNext(this.save.level) ?? 0) - this.save.xp))),
      button('+3 boosters', () => {
        for (const id of Object.keys(this.save.boosters) as BoosterId[]) this.save.boosters[id] += 3;
      }),
      button('Tout est prêt', () => {
        const now = Date.now();
        for (const o of this.save.objects) {
          if (o.readyAt !== undefined) o.readyAt = Math.min(o.readyAt, now);
          if (o.animals) o.animals = o.animals.map((t) => (t >= 0 ? Math.min(t, now) : t));
          if (o.queue) for (const j of o.queue) j.readyAt = Math.min(j.readyAt, now);
        }
        this.save.orderWaits = this.save.orderWaits.map(() => now);
      }),
      button('+10 de chaque produit', () => {
        for (const id of ['wheat', 'corn', 'carrot', 'egg', 'milk', 'flour', 'chickenFeed', 'cowFeed'] as ItemId[]) this.save.stock[id] = have(this.save, id) + 10;
      }),
    );
  }
}
