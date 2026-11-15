import './farm.css';
import { el } from '../../dom';
import { markHelpSeen } from '../../help';
import { armSoundUnlock, playClack, playCluck, playCoinLand, playFanfare, playMoo, playPluck, playPop, playRustle, playSeed, playThunk } from '../casino/fx/sound';
import { CASINO_TEST_BUTTONS } from '../casino/fx/testMode'; // TEST-BUTTONS
import { todayKey } from '../../daily/daily';
import { booster } from './data/boosters';
import { crop } from './data/crops';
import { item, itemCount } from './data/items';
import { BRIDGE_TILES } from './data/land';
import { breed } from './data/parcels';
import { person } from './data/people';
import { placeable } from './data/placeables';
import { project } from './data/projects';
import type { BoosterId, BreedId, CropId, ItemId, PlaceableId } from './data/types';
import { boosterIcon, itemIcon, uiIcon } from './farmArt';
import { buyBooster, fertilize, hurry, water } from './farmBoosters';
import { FarmDialogs } from './farmDialogs';
import { FarmEditor } from './farmEditor';
import { FarmFeedback } from './farmFeedback';
import { FarmGateCall, type Band } from './farmGateCall';
import { FARM_HELP } from './farmHelp';
import { FarmHud, type SheetId } from './farmHud';
import { buyParcel, clearObstacle, ensureMailbox, newFarm, parcelOffers } from './farmMap';
import { FarmMusic, musicVolume } from './farmMusic';
import { deliver, refillOrders, refuse } from './farmOrders';
import {
  decoBubble,
  fieldBubble,
  machineBubble,
  mailboxBubble,
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
import { deliverMail, placeWaitingBreed } from './farmParcels';
import {
  awayNews,
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
  sell,
  sow,
  trayJobs,
  type Gain,
} from './farmProduction';
import { claimQuest, finishStage, giveToProject, have, isUnlocked, openChest, settle, unlockText, type Notice } from './farmProgress';
import { loadFarm, saveFarm, type FarmSave, type PlacedObject } from './farmSave';
import { FarmScene } from './farmScene';
import { seedSwipe } from './farmSeedSwipe';
import { swipeToClose } from './farmSwipe';
import { testBar } from './farmTestBar';

// -----------------------------------------------
// #/ferme: the farm in full screen
// -----------------------------------------------
// This file routes: touches on the map, the bottom bar, the sheets and bubbles, and every player action
// (act, then commit). What the screen shows lives beside it: farmFeedback (floating numbers, toasts),
// farmDialogs (cards in the middle), farmEditor (Amenager), farmGateCall, farmSeedSwipe, farmTestBar.

/** Away longer than this, the farm tells what happened while the player was gone. */
const WELCOME_AFTER_MS = 20 * 60 * 1000;

/** Room kept between the bars and what the screen places on the map. */
const BAND_MARGIN = 8;
/** The bubble's distance from its object, above and below: the translate of .farm-bubble in farm.css. */
const BUBBLE_GAP_ABOVE = 10;
const BUBBLE_GAP_BELOW = 12;
/** Squeezed between an object and a bar, a bubble keeps this height and scrolls inside. */
const BUBBLE_MIN_HEIGHT = 140;

export function renderFarm(root: HTMLElement): () => void {
  armSoundUnlock();
  const now = Date.now();
  const saved = loadFarm();
  const save = saved ?? newFarm(now);
  ensureMailbox(save);
  const away = saved && now - saved.lastVisit > WELCOME_AFTER_MS;
  const news = away ? awayNews(save, saved.lastVisit, now) : null;
  const parcels = deliverMail(save, now);
  const orders = refillOrders(save, now);
  const newDay = !!saved?.daily && saved.daily.day !== todayKey(new Date(now));
  const screen = new FarmScreen(root, save);
  // The first time, the help comes first, in the farm's own look; Marthe's first quest follows it.
  if (markHelpSeen(FARM_HELP)) screen.dialogs.help();
  if (news) screen.dialogs.welcomeBack(news, parcels, orders, newDay);
  screen.commit();
  return () => screen.dispose();
}

type Target = PlacedObject | { parcel: number };

class FarmScreen implements FarmUi {
  readonly save: FarmSave;
  readonly sheetState: FarmUi['sheetState'] = { barnItem: null };
  readonly root: HTMLElement;
  readonly overlay = el('div', { class: 'farm-overlay' });
  readonly scene: FarmScene;
  readonly hud: FarmHud;
  readonly feedback: FarmFeedback;
  readonly dialogs: FarmDialogs;
  private readonly editor: FarmEditor;
  private readonly gateCall = new FarmGateCall(() => this.showGate());
  private bubble: { el: HTMLElement; target: Target } | null = null;
  private sheet: { el: HTMLElement; id: SheetId; tab: string } | null = null;
  /** The seed row, and the empty field touched to open it (a tapped seed sows that one). */
  private seeds: { el: HTMLElement; chosen: PlacedObject | null } | null = null;
  private landKey = '';
  private readonly timer: number;
  private commitTimer = 0;
  private pluckStep = 0;
  private pluckAt = 0;
  private shownFar = false;
  private readonly music = new FarmMusic();

  /** On a PC: Escape closes what is open, the arrows (or WASD) move the view, + and - zoom. */
  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.altKey || e.ctrlKey || e.metaKey) return;
    const step = e.shiftKey ? 4 : 2;
    const pans: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
      a: [-step, 0], d: [step, 0], w: [0, -step], s: [0, step], q: [-step, 0], z: [0, -step],
    };
    const pan = pans[e.key];
    if (pan) {
      e.preventDefault();
      this.scene.panBy(...pan);
    } else if (e.key === '+' || e.key === '=') this.scene.zoomStep(1);
    else if (e.key === '-' || e.key === '_') this.scene.zoomStep(-1);
    else if (e.key === 'Escape') this.closeTopmost();
  };

  constructor(root: HTMLElement, save: FarmSave) {
    this.save = save;
    this.root = el('div', { class: 'farm' });
    root.append(this.root);
    this.scene = new FarmScene(this.root, save, {
      tap: (target, tile) => this.tap(target, tile),
      harvest: (field) => this.harvestField(field),
      ghostMoved: () => this.editor.renderTools(),
      ghostFits: (ghost) => this.editor.ghostFits(ghost),
      visitor: () => this.openSheet('orders'),
    });
    this.hud = new FarmHud({
      sheet: (id, tab) => this.openSheet(id, tab, true),
      edit: () => this.editor.toggle(),
      zoom: () => {
        this.scene.toggleZoom();
        this.hud.setZoom(this.scene.isFar);
      },
      help: () => this.dialogs.help(),
      seeds: () => (this.seeds ? this.closeSeeds() : this.openSeeds(null)),
      musicVolume: () => musicVolume(),
      setMusicVolume: (v) => this.music.setVolume(v),
    });
    this.feedback = new FarmFeedback(this.root, this.overlay, this.scene, this.hud);
    this.dialogs = new FarmDialogs(this.overlay, save, () => this.commit());
    this.editor = new FarmEditor(this);
    this.overlay.append(this.hud.top, this.hud.quest, this.hud.side, this.feedback.toasts, this.gateCall.el, this.hud.bar);
    if (CASINO_TEST_BUTTONS) this.overlay.append(testBar(this)); // TEST-BUTTONS
    this.root.append(this.overlay);
    this.scene.onFrame = () => this.follow();
    this.timer = window.setInterval(() => this.tick(), 1000);
    window.addEventListener('keydown', this.onKey);
    // The music waits for a first touch (browsers forbid sound before one).
    this.root.addEventListener('pointerdown', () => this.music.start(), { once: true });
  }

  dispose(): void {
    window.clearInterval(this.timer);
    window.clearTimeout(this.commitTimer);
    this.save.lastVisit = Date.now();
    saveFarm(this.save);
    this.scene.dispose();
    this.music.dispose();
    window.removeEventListener('keydown', this.onKey);
  }

  now(): number {
    return Date.now();
  }

  toast(text: string): void {
    this.feedback.toast(text);
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
    this.scene.wake();
    const now = Date.now();
    refillOrders(this.save, now);
    const notices = settle(this.save, now);
    this.save.lastVisit = now;
    saveFarm(this.save);
    const land = `${this.save.parcels.join(',')}|${this.save.projectsDone.join(',')}|${this.save.parcelsBought}|${this.save.level}`;
    if (land !== this.landKey) {
      this.landKey = land;
      this.scene.refreshLand(parcelOffers(this.save));
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
    // A pinch can cross from close to far: the menu says the other view.
    if (this.scene.isFar !== this.shownFar) {
      this.shownFar = this.scene.isFar;
      this.hud.setZoom(this.shownFar);
    }
    if (deliverMail(this.save, now) > 0) {
      this.scene.village.ride();
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

  private tell(notices: Notice[]): void {
    for (const n of notices) {
      if (n.kind === 'task') this.toast(`Tâche du jour faite : ${n.text} ✓`);
      else if (n.kind === 'medal') this.toast(`Médaille ${['de bronze', 'd’argent', 'd’or'][n.tier]} : ${n.name} !`);
      else if (n.kind === 'level') this.dialogs.level(n);
      else this.dialogs.say(n.quest.who, n.quest.title, n.quest.intro, 'D’accord !');
    }
  }

  /** Escape: the last thing opened closes first. */
  private closeTopmost(): void {
    if (this.bubble) return this.closeBubble();
    if (this.seeds) return this.closeSeeds();
    if (this.sheet) return this.closeSheet();
    if (this.editor.isActive) return this.editor.exit();
  }

  /** Everything that sits over the map, before Amenager takes the screen. */
  closePanels(): void {
    this.closeSeeds();
    this.closeSheet();
    this.closeBubble();
  }

  // -----------------------------------------------
  // THE MAP
  // -----------------------------------------------

  /** The old bridge is part of the ground: touching it tells about the project. */
  private tapBridge(): void {
    if (!isUnlocked(this.save, project('bridge').unlock)) this.toast(`Le vieux pont est cassé. Basile le réparera avec toi ${unlockText(project('bridge').unlock)}.`);
    else this.openSheet('quests', 'project', true);
  }

  /** Every frame: the HTML that sits on the map follows the camera. */
  private follow(): void {
    const box = this.root.getBoundingClientRect();
    const band = this.visibleBand(box);
    if (this.bubble) this.placeBubble(box, band);
    const gate = this.scene.village.gatePoint();
    this.gateCall.follow(this.scene.village.waiting, this.scene.toScreen(gate.x, gate.y), band, box.width, !this.sheet && !this.seeds && !this.editor.isActive);
    this.editor.follow(box);
  }

  /** The map really seen: below the top bar and the quest, above the bottom bar. */
  private visibleBand(box: DOMRect): Band {
    const top = Math.max(this.hud.top.getBoundingClientRect().bottom, this.hud.quest.getBoundingClientRect().bottom);
    return { top: top - box.top + BAND_MARGIN, bottom: this.hud.bar.getBoundingClientRect().top - box.top - BAND_MARGIN };
  }

  /** Glides to the gate, two thirds down the seen map: the waiting villagers and the farm above them. */
  private showGate(): void {
    const box = this.root.getBoundingClientRect();
    const band = this.visibleBand(box);
    const gate = this.scene.village.gatePoint();
    this.scene.glideTo(gate.x, gate.y, box.width / 2, band.top + ((band.bottom - band.top) * 2) / 3);
  }

  private tap(target: Target | null, tile: [number, number]): void {
    if (this.editor.isActive) return this.editor.tap(target, tile);
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
    if (kind === 'mailbox') return this.save.mail.waiting > 0 ? this.dialogs.parcels() : this.openBubble(target);
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
    const box = this.root.getBoundingClientRect();
    this.placeBubble(box, this.visibleBand(box));
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

  /** Above its object when it fits, else below when it fits, else on the roomier side, scrolling inside: never under a bar. */
  private placeBubble(box: DOMRect, band: Band): void {
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
    // Its whole height, even while it scrolls: the content plus the borders.
    const h = bubble.scrollHeight + bubble.offsetHeight - bubble.clientHeight;
    const roomAbove = anchor.y - BUBBLE_GAP_ABOVE - band.top;
    const roomBelow = band.bottom - anchor.bottom - BUBBLE_GAP_BELOW;
    const below = h > roomAbove && (h <= roomBelow || roomBelow > roomAbove);
    const room = below ? roomBelow : roomAbove;
    bubble.style.maxHeight = h > room ? `${Math.max(BUBBLE_MIN_HEIGHT, Math.floor(room))}px` : '';
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
    if (this.editor.isActive) this.editor.exit();
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
    this.hud.setPressed(this.editor.isEditing ? 'build' : null);
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
    if (!this.editor.isEditing) this.scene.selected = null;
    this.root.classList.remove('has-seeds');
    this.hud.setPressed(this.sheet?.id ?? (this.editor.isEditing ? 'build' : null));
  }

  seedSwipe(id: CropId, event: PointerEvent): void {
    seedSwipe(this, id, event);
  }

  chosenField(): PlacedObject | null {
    return this.seeds?.chosen ?? null;
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
    this.feedback.gain(field, gain);
    if (this.pluckStep >= 2) this.feedback.combo(field, this.pluckStep + 1);
    if (this.bubble?.target === field) this.closeBubble();
    this.commitSoon();
  }

  sow(field: PlacedObject, id: CropId): void {
    if (!sow(this.save, field, id, Date.now())) return;
    playSeed();
    this.closeBubble();
    this.feedback.float(this.feedback.screenOf(field), `−${crop(id).seed}`, uiIcon('nut'));
    this.commit();
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
    gains.forEach((g, i) => window.setTimeout(() => this.feedback.gain(object, g), i * 250));
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
    this.feedback.float(this.feedback.screenOf(pen), `−${fed}`, itemIcon(a.feed));
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
    const at = this.feedback.screenOf(object);
    const result = clearObstacle(this.save, object);
    if (!result) return;
    playRustle();
    this.closeBubble();
    this.feedback.float(at, `+${result.xp} XP`, uiIcon('star'));
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
    if (target) this.feedback.float(this.feedback.screenOf(target), booster(id).name, boosterIcon(id));
    this.commit();
  }

  deliver(id: number): void {
    const order = deliver(this.save, id, Date.now());
    if (!order) return;
    playCoinLand('small');
    this.scene.village.served(id);
    this.feedback.rainNuts(Math.min(10, 3 + Math.floor(order.nuts / 20)));
    this.toast(`${person(order.who).name} te remercie : +${order.nuts} Éloisettes, +${order.xp} XP`);
    this.commit();
  }

  refuse(id: number): void {
    const hands = this.save.boosters.helpingHand;
    this.dialogs.choose('Changer de commande ?', 'Une autre commande la remplace dans 15 minutes, ou tout de suite avec un Coup de main.', [
      ...(hands > 0 ? [{ label: `Tout de suite (Coup de main, ${hands})`, act: () => this.act(() => refuse(this.save, id, Date.now(), true)) }] : []),
      { label: 'Dans 15 minutes', act: () => this.act(() => refuse(this.save, id, Date.now(), false)), ghost: hands > 0 },
      { label: 'Garder', act: () => {}, ghost: true },
    ]);
  }

  claimQuest(id: string): void {
    const q = claimQuest(this.save, id);
    if (!q) return;
    playFanfare();
    this.dialogs.say(q.who, q.title, q.thanks, 'Merci !', [el('div', { class: 'farm-pay' }, ...rewardLine(q.reward))]);
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
    if (this.save.projectsDone.includes('bridge')) this.dialogs.say('basile', project('bridge').name, project('bridge').done, 'Allons voir !');
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

  startPlacing(id: PlaceableId): void {
    this.editor.startPlacing(id);
  }

  /** A rare animal waiting for room goes into its pen. */
  placeBreed(id: BreedId): void {
    if (!placeWaitingBreed(this.save, id)) return this.toast('Pas encore de place pour elle.');
    playCluck();
    this.toast(`${breed(id).name} s’installe dans son enclos !`);
    this.commit();
  }
}
