import './farm.css';
import { el } from '../../dom';
import { openHelp, openHelpOnFirstVisit } from '../../help';
import { armSoundUnlock, playBigWin, playBonusTrigger, playClack, playCluck, playCoinLand, playFanfare, playMoo, playPluck, playPop, playRustle, playSeed, playThunk } from '../casino/fx/sound';
import { prefersReducedMotion } from '../casino/fx/effects';
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
import { boosterIcon, breedSprite, faceSprite, itemIcon, objectSprite, parcelSprite, spriteImage, uiIcon, type Sprite } from './farmArt';
import { breed, rarityName } from './data/parcels';
import { deliverMail, openParcel, placeWaitingBreed, type Opened } from './farmParcels';
import { buyBooster, fertilize, hurry, water } from './farmBoosters';
import { FARM_HELP } from './farmHelp';
import { FarmHud, type SheetId } from './farmHud';
import { buyAndPlace, buyParcel, buyRefusal, canMove, canStand, canStore, clearObstacle, ensureMailbox, footprint, freeSpotNear, moveObject, newFarm, parcelOffers, storeObject } from './farmMap';
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
import { claimQuest, finishStage, gainXp, giveToProject, have, isUnlocked, openChest, settle, unlockText, type Notice } from './farmProgress';
import {
  decoBubble,
  mailboxBubble,
  fieldBubble,
  machineBubble,
  obstacleBubble,
  offerOf,
  parcelBubble,
  penBubble,
  rewardLine,
  seedRow,
  sheetContent,
  treeBubble,
  type FarmUi,
} from './farmPanels';
import { FarmScene, type Ghost } from './farmScene';
import { swipeToClose } from './farmSwipe';
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
  ensureMailbox(save);
  deliverMail(save, now);
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
  private bubble: { el: HTMLElement; target: Target } | null = null;
  private sheet: { el: HTMLElement; id: SheetId; tab: string } | null = null;
  /** The seed row, and the empty field touched to open it (a tapped seed sows that one). */
  private seeds: { el: HTMLElement; chosen: PlacedObject | null } | null = null;
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
  private comboEl: HTMLElement | null = null;

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
      seeds: () => (this.seeds ? this.closeSeeds() : this.openSeeds(null)),
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
    if (deliverMail(this.save, now) > 0) {
      this.toast('Gaston est passé : un colis t’attend dans la boîte aux lettres !');
      saveFarm(this.save);
    }
    if (refillOrders(this.save, now) > 0) {
      saveFarm(this.save);
      if (this.sheet?.id === 'orders') this.renderSheet();
    }
    this.hud.refresh(this.save);
    const target = this.bubble?.target;
    if (target && 'uid' in target && target.type === 'field') {
      const state = fieldState(target, now);
      if (state === 'ripe') this.closeBubble();
      else if (state !== 'empty') this.bubble!.el.replaceChildren(...(this.bubbleContent(target) ?? []));
    }
  }

  // -----------------------------------------------
  // THE MAP
  // -----------------------------------------------

  /** The ground, the wild around the farm and the wooden signs of the land for sale (touched for their price). */
  private refreshLand(): void {
    this.scene.refreshLand(parcelOffers(this.save));
  }

  /** The old bridge is part of the ground: touching it tells about the project. */
  private tapBridge(): void {
    if (!isUnlocked(this.save, project('bridge').unlock)) this.toast(`Le vieux pont est cassé. Basile le réparera avec toi ${unlockText(project('bridge').unlock)}.`);
    else this.openSheet('quests', 'project', true);
  }

  /** Every frame: the HTML that sits on the map follows the camera. */
  private follow(): void {
    const box = this.root.getBoundingClientRect();
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
    const isField = !!target && 'uid' in target && target.type === 'field';
    const emptyField = isField && fieldState(target as PlacedObject, Date.now()) === 'empty';
    if (this.seeds && !isField) this.closeSeeds();
    if (!target && !this.save.projectsDone.includes('bridge') && BRIDGE_TILES.some(([x, y]) => x === tile[0] && y === tile[1])) return this.tapBridge();
    if (!target) return this.closeBubble();
    if ('parcel' in target) return this.openBubble(target);
    const kind = placeable(target.type).kind;
    const now = Date.now();
    if (kind === 'field') {
      if (fieldState(target, now) === 'ripe') return this.harvestField(target);
      if (emptyField) return this.openSeeds(target);
      return this.openBubble(target);
    }
    if (kind === 'mailbox') return this.openMailbox(target);
    if (kind === 'pen') {
      this.scene.cheer(target);
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
    if (kind === 'mailbox') return mailboxBubble(this);
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
    this.closeSeeds();
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
    const sheet = el('section', { class: 'farm-sheet', role: 'dialog', 'aria-label': content.title }, el('span', { class: 'farm-grip', 'aria-hidden': 'true' }), el('header', {}, el('h2', { text: content.title }), close), tabs, body);
    sheet.addEventListener('pointerdown', (e) => e.stopPropagation());
    swipeToClose(sheet, body, () => this.closeSheet());
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
    if (this.seeds) this.renderSeeds();
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
    const box = el(
      'div',
      { class: 'farm-dialog-box farm-box' },
      el('div', { class: 'farm-big-level', text: String(n.level) }),
      el('h2', { text: `Niveau ${n.level} !` }),
      el('div', { class: 'farm-pay' }, ...rewardLine(n.reward)),
      ...(n.unlocks.length > 0 ? [el('p', { class: 'farm-note', text: 'Nouveau à la ferme :' }), el('ul', {}, ...n.unlocks.map((u) => el('li', { text: u })))] : []),
      el('button', { class: 'farm-btn is-wide', type: 'button', text: 'Super !' }),
    );
    confetti(box, 30);
    return box;
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
    this.scene.burstCrop(field, gain.item as CropId);
    this.showGain(field, gain);
    if (this.pluckStep >= 2) this.combo(field, this.pluckStep + 1);
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

  // -----------------------------------------------
  // THE SEED ROW
  // -----------------------------------------------

  private openSeeds(chosen: PlacedObject | null): void {
    this.closeBubble();
    if (!this.seeds) {
      this.seeds = { el: el('div', { class: 'farm-seedbar farm-box' }), chosen };
      this.seeds.el.addEventListener('pointerdown', (e) => e.stopPropagation());
      swipeToClose(this.seeds.el, null, () => this.closeSeeds());
      this.overlay.append(this.seeds.el);
      this.root.classList.add('has-seeds');
    }
    this.seeds.chosen = chosen;
    this.hud.setPressed('seeds');
    this.renderSeeds();
  }

  private renderSeeds(): void {
    if (!this.seeds) return;
    const chosen = this.seeds.chosen && fieldState(this.seeds.chosen, Date.now()) === 'empty' ? this.seeds.chosen : null;
    this.seeds.chosen = chosen;
    this.scene.selected = chosen?.uid ?? null;
    const scroll = this.seeds.el.querySelector('.farm-seedbar-row')?.scrollLeft ?? 0;
    this.seeds.el.replaceChildren(...seedRow(this, chosen, () => this.closeSeeds()));
    const row = this.seeds.el.querySelector('.farm-seedbar-row');
    if (row) row.scrollLeft = scroll;
  }

  private closeSeeds(): void {
    if (!this.seeds) return;
    this.seeds.el.remove();
    this.seeds = null;
    if (!this.editing) this.scene.selected = null;
    this.root.classList.remove('has-seeds');
    this.hud.setPressed(this.sheet?.id ?? (this.editing ? 'build' : null));
  }

  /** A seed pressed in the row: a tap sows the chosen field, a drag sows every empty field the finger crosses. */
  seedSwipe(id: CropId, event: PointerEvent): void {
    const pointer = event.pointerId;
    (event.target as Element).releasePointerCapture?.(pointer);
    const start = { x: event.clientX, y: event.clientY };
    const held = spriteImage(itemIcon(id), 3);
    held.classList.add('farm-held');
    let swiping = false;
    let last = start;
    let step = 0;
    let spent = 0;
    let broke = false;
    let where: PlacedObject | null = null;
    const sowOne = (field: PlacedObject) => {
      if (fieldState(field, Date.now()) !== 'empty') return;
      if (!sow(this.save, field, id, Date.now())) {
        broke = this.save.nuts < crop(id).seed;
        return;
      }
      where = field;
      spent += crop(id).seed;
      playSeed(step++);
      this.hud.refresh(this.save);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      if (!swiping && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) {
        swiping = true;
        this.overlay.append(held);
      }
      if (!swiping) return;
      // The seed rides just above the finger, so the finger never hides it.
      const box = this.root.getBoundingClientRect();
      held.style.transform = `translate(${e.clientX - box.left - 18}px, ${e.clientY - box.top - 48}px)`;
      for (const field of this.scene.fieldsAlong(last, { x: e.clientX, y: e.clientY })) sowOne(field);
      last = { x: e.clientX, y: e.clientY };
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      held.remove();
      const chosen = this.seeds?.chosen ?? null;
      if (!swiping) {
        if (chosen) sowOne(chosen);
        else this.toast('Fais glisser la graine sur un champ vide.');
      }
      if (where && spent > 0) this.float(this.screenOf(where), `−${spent}`, uiIcon('nut'));
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
    this.rainNuts(Math.min(10, 3 + Math.floor(order.nuts / 20)));
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

  /** "×5 !" growing over a harvest swipe. */
  private combo(field: PlacedObject, count: number): void {
    const at = this.screenOf(field);
    this.comboEl?.remove();
    const node = el('div', { class: `farm-combo${count >= 10 ? ' is-big' : ''}`, text: `×${count} !` });
    node.style.left = `${at.x}px`;
    node.style.top = `${at.y - 26}px`;
    this.overlay.append(node);
    this.comboEl = node;
    window.setTimeout(() => node.remove(), 900);
  }

  /** Eloisettes falling into the purse at the top. */
  private rainNuts(count: number): void {
    if (prefersReducedMotion()) return;
    const box = this.root.getBoundingClientRect();
    const target = this.hud.nutsTarget();
    const tx = target.left - box.left + target.width / 2 - 12;
    const ty = target.top - box.top + target.height / 2 - 12;
    for (let i = 0; i < count; i++) {
      const node = spriteImage(uiIcon('nut'), 3);
      node.classList.add('farm-fly');
      const sx = box.width * (0.3 + Math.random() * 0.4);
      const sy = box.height * (0.45 + Math.random() * 0.15);
      node.style.transform = `translate(${sx}px, ${sy}px)`;
      node.style.transitionDelay = `${i * 60}ms`;
      this.overlay.append(node);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        node.style.transform = `translate(${tx}px, ${ty}px) scale(0.6)`;
        node.style.opacity = '0.3';
      }));
      window.setTimeout(() => node.remove(), 800 + i * 60);
    }
  }

  /** A rare animal waiting for room goes into its pen. */
  placeBreed(id: Parameters<typeof placeWaitingBreed>[1]): void {
    if (!placeWaitingBreed(this.save, id)) return this.toast('Pas encore de place pour elle.');
    playCluck();
    this.toast(`${breed(id).name} s’installe dans son enclos !`);
    this.commit();
  }

  // -----------------------------------------------
  // GASTON'S PARCELS
  // -----------------------------------------------

  /** Opens the mailbox: a parcel to unwrap, or when Gaston comes back. */
  private openMailbox(mailbox: PlacedObject): void {
    if (this.save.mail.waiting > 0) return this.queueDialog(() => this.parcelDialog());
    this.openBubble(mailbox);
  }

  /** The parcel shakes when touched, then bursts open in the colour of its rarity. */
  private parcelDialog(): HTMLElement {
    const box = el('div', { class: 'farm-dialog-box farm-box farm-parcel' });
    const stage = el('button', { class: 'farm-parcel-stage', type: 'button', 'aria-label': 'Ouvrir le colis' }, spriteImage(parcelSprite(null), 6));
    box.append(el('h2', { text: 'Un colis de Gaston !' }), stage, el('p', { class: 'farm-note', text: 'Touche le colis pour l’ouvrir.' }));
    let opening = false;
    stage.addEventListener('click', () => {
      if (opening) return;
      opening = true;
      playClack();
      stage.classList.add('is-shaking');
      window.setTimeout(() => this.revealParcel(box), prefersReducedMotion() ? 0 : 750);
    });
    return box;
  }

  private revealParcel(box: HTMLElement): void {
    const opened = openParcel(this.save);
    if (!opened) return;
    const { icon, scale, name } = prizeLook(opened);
    const rarity = opened.rarity;
    [playPop, () => playCoinLand('big'), playBonusTrigger, () => playBigWin(2)][['common', 'rare', 'epic', 'legendary'].indexOf(rarity)]();
    const more = this.save.mail.waiting;
    const next = el('button', { class: 'farm-btn is-wide', type: 'button', text: `Ouvrir le suivant (${more})` });
    next.addEventListener('click', () => this.queueDialog(() => this.parcelDialog()));
    box.className = `farm-dialog-box farm-box farm-parcel is-open is-${rarity}`;
    box.replaceChildren(
      el('span', { class: 'farm-rarity', text: rarityName(rarity) }),
      el('div', { class: 'farm-parcel-prize' }, el('span', { class: 'farm-rays', 'aria-hidden': 'true' }), spriteImage(icon, scale)),
      el('h2', { text: name }),
      ...(opened.isNew ? [el('span', { class: 'farm-new', text: 'Nouveau dans l’album !' })] : []),
      ...(opened.waiting ? [el('p', { class: 'farm-note', text: 'Il n’y a pas de place pour elle : elle t’attend dans la Boutique, onglet Animaux.' })] : []),
      ...(opened.prize.kind === 'decor' ? [el('p', { class: 'farm-note', text: 'Elle t’attend dans la Boutique, onglet Déco : pose-la où tu veux.' })] : []),
      ...(more > 0 ? [next] : []),
      el('button', { class: `farm-btn is-wide${more > 0 ? ' is-ghost' : ''}`, type: 'button', text: 'Super !' }),
    );
    if (rarity === 'epic' || rarity === 'legendary') confetti(box, rarity === 'legendary' ? 40 : 24);
    this.commit();
  }

  // -----------------------------------------------
  // EDIT MODE AND PLACING
  // -----------------------------------------------

  private enterEdit(): void {
    this.closeSeeds();
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
    this.closeSeeds();
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
      button('+5 colis', () => (this.save.mail.waiting += 5)),
      button('+10 de chaque produit', () => {
        for (const id of ['wheat', 'corn', 'carrot', 'egg', 'milk', 'flour', 'chickenFeed', 'cowFeed'] as ItemId[]) this.save.stock[id] = have(this.save, id) + 10;
      }),
    );
  }
}

/** The picture and the name of what a parcel held. */
function prizeLook(opened: Opened): { icon: Sprite; scale: number; name: string } {
  const prize = opened.prize;
  if (prize.kind === 'nuts') return { icon: uiIcon('nut'), scale: 5, name: `${opened.nuts} Éloisettes` };
  if (prize.kind === 'boosters') {
    const entries = Object.entries(prize.boosters) as [BoosterId, number][];
    return { icon: boosterIcon(entries[0][0]), scale: 5, name: entries.map(([id, n]) => `${n} ${n > 1 ? booster(id).plural : booster(id).name}`).join(' et ') };
  }
  if (prize.kind === 'decor') {
    const sprite = objectSprite(prize.decor, 'face');
    return { icon: sprite, scale: Math.max(2, Math.min(4, Math.floor(110 / sprite.height))), name: placeable(prize.decor).name };
  }
  return { icon: breedSprite(prize.breed, 0), scale: 6, name: breed(prize.breed).name };
}

/** Paper confetti falling over a box (transform and opacity only). */
function confetti(host: HTMLElement, count: number): void {
  if (prefersReducedMotion()) return;
  const colours = ['#f48fb1', '#ffd84a', '#7cc456', '#6a9fd8', '#b9a2ff', '#ff9f5a'];
  for (let i = 0; i < count; i++) {
    const bit = el('i', { class: 'farm-confetti', 'aria-hidden': 'true' });
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.background = colours[i % colours.length];
    bit.style.animationDelay = `${Math.random() * 300}ms`;
    bit.style.setProperty('--drift', `${(Math.random() - 0.5) * 80}px`);
    bit.style.setProperty('--spin', `${Math.round((Math.random() - 0.5) * 720)}deg`);
    host.append(bit);
    window.setTimeout(() => bit.remove(), 2000);
  }
}
