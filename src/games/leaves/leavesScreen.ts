import './leaves.css';
import { el, freeCanvas, topBar } from '../../dom';
import { addCoins, loadCompanion } from '../../companion/companionSave';
import { loadHouse, saveHouse } from '../../house/houseSave';
import { WALL_DECOS } from '../../house/houseStyle';
import { armSoundUnlock, muteButton, playBigWin, playChime, playCompost, playRustle, playSmallWin, playTallyNote } from '../casino/fx/sound';
import { timeOfDay } from '../fishing/fishingLogic';
import { GROUND_TOP, H, LEAF_SIZE, SCALE, SHAPE_COUNT, W, drawBack, drawFront, leafSprite, sharpCanvas } from './leavesArt';
import { thingSprite } from './leavesThings';
import {
  BASKET_SIZE,
  CARPET,
  CARPETS,
  LAST_LEAVES,
  PILE_SIZE,
  CRITTERS,
  DAILY_COINS,
  DECO_CHANCE,
  FALL_RATE,
  GOLDEN_CHANCE,
  GOLDEN_GAUGE,
  STAR_CHANCE,
  MEGA_STAR_CHANCE,
  THIEF_CHANCE,
  THIEF_SPEED,
  THIEF_MIN_MS,
  TEST_THIEF_EVERY_6S,
  BUTTERFLY_MS,
  BUTTERFLY_GAUGE_SHARE,
  RAINBOW_CHANCE,
  RARE_CRITTER_CHANCE,
  CRITTER_GAUGE_SHARE,
  RARE_CRITTER_GAUGE_SHARE,
  COLLECTION_REWARDS,
  STAR_GAUGE_SHARE,
  GOLDEN_VALUE,
  GOLD_PER_COIN,
  LEAF_VALUE,
  LEVEL_GOAL,
  LEVEL_VALUE,
  LUCK,
  MAX_TREASURES,
  OPEN_AT_LEVEL,
  SPOTLESS_LEVEL,
  ORNAMENTS,
  ORNAMENT_VALUE,
  GRAB,
  GRAB_REACH,
  TOUCH_REACH,
  RARE_CHANCE,
  RARE_LEAVES,
  TREASURES,
  TREASURES_PER_ZONE,
  UPGRADES,
  ZONES,
  ornamentPrice,
  type CritterId,
  type RareLeaf,
  type Treasure,
  type Zone,
} from './leavesData';
import { loadLeaves, saveLeaves, type BuriedThing } from './leavesSave';

// -----------------------------------------------
// LES FEUILLES: rake the places clean while the trees keep dropping leaves
// -----------------------------------------------

interface Leaf {
  x: number;
  y: number;
  cos: number;
  sin: number;
  sprite: HTMLCanvasElement;
  shape: number;
  color: string;
  golden: boolean;
  rare: RareLeaf | null;
  /** While a new carpet falls: when this leaf starts falling (ms), and how far left or right it drifts. */
  /** `seen`: drawn while it falls; the others land unseen, under the falling ones. */
  fall?: { at: number; drift: number; seen: boolean };
}

/** A new carpet comes down from the trees, left to right with the wind, in this long. */
const CARPET_FALL_MS = 1600;
const LEAF_FALL_MS = 650;
/** Only the top leaves of a carpet are drawn falling (about two layers): the ones under them would not show. */
const SEEN_FALLING = 1200;

interface Falling {
  leaf: Leaf;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  landY: number;
}

interface Hidden {
  x: number;
  y: number;
  icon: string;
  kind: 'treasure' | 'deco' | 'hedgehog' | 'star' | 'megastar';
  treasure?: Treasure;
  decoId?: string;
}

interface Flyer {
  x: number;
  y: number;
  color: string;
  t: number;
}

type Collection = 'herbarium' | 'herbarium2' | 'treasures' | 'critters';

export function renderLeaves(root: HTMLElement): () => void {
  armSoundUnlock();
  const save = loadLeaves();
  const time = timeOfDay();
  let zone = ZONES.find((z) => z.id === save.zone)!;
  let leaves: Leaf[] = [];
  let falling: Falling[] = [];
  let hidden: Hidden[] = [];
  let flyers: Flyer[] = [];
  let back = document.createElement('canvas');
  let front = document.createElement('canvas');
  const [layer, layerCtx] = sharpCanvas(W, H);
  let layerDirty = true;
  /** Only this part of the ground changed (the leaves a tap took): redrawn alone, not the whole carpet. */
  let dirtyArea: { x0: number; y0: number; x1: number; y1: number } | null = null;
  let frame = 0;
  let lastTime = performance.now();
  let fallDebt = 0;
  /** Falling pauses for a breath after a place is cleaned. */
  let calmUntil = 0;
  /** A new carpet is still coming down: no picking, the leaves are drawn one by one. */
  let fallingUntil = 0;
  let nextGust = 0;
  let nextEvent = 0;
  let sparks: { x: number; y: number; t: number }[] = [];
  let lastRustle = 0;
  let openCollection: Collection | null = null;
  const timers = new Set<number>();
  const later = (ms: number, action: () => void) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      action();
    }, ms);
    timers.add(id);
  };

  // -----------------------------------------------
  // PAGE
  // -----------------------------------------------

  const canvas = el('canvas', { class: 'leaves-canvas', width: `${W * SCALE}`, height: `${H * SCALE}` });
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  const banner = el('div', { class: 'leaves-banner' });
  const sky = el('div', { class: `leaves-sky is-${time}` });
  const critterLayer = el('div', { class: 'leaves-critters' });
  const lootBubble = el('div', { class: 'leaves-loot', 'aria-live': 'polite' });
  const stage = el('div', { class: 'leaves-stage' }, canvas, sky, critterLayer, banner, lootBubble);
  const goldView = el('span', { class: 'leaves-gold' });
  const coinsView = el('span', { class: 'coin-pill' });
  const basketFill = el('span', {});
  const basketText = el('span', { class: 'leaves-basket-text' });
  const goldenFill = el('span', {});
  const goldenText = el('span', { class: 'leaves-golden-text' });
  const compost = el('button', { class: 'button', type: 'button', text: '🍂 Au compost' });
  const zoneTitle = el('strong', { class: 'leaves-zone-title' });
  const zoneLevel = el('select', { class: 'leaves-zone-level', 'aria-label': 'Niveau joué' });
  const ornamentsView = el('div', { class: 'leaves-upgrades' });
  const cleanFill = el('span', {});
  const cleanText = el('small', {});
  const status = el('p', { class: 'leaves-status', role: 'status' });
  const zoneTabs = el('div', { class: 'leaves-zones' });
  const upgradesView = el('div', { class: 'leaves-upgrades' });
  const collectionTabs = el('div', { class: 'leaves-collection-tabs' });
  const collectionView = el('div', { class: 'leaves-collection' });
  const exchange = el('button', { class: 'button button-secondary', type: 'button' });

  root.append(
    topBar('Les feuilles', el('span', { class: 'leaves-top-right' }, goldView, coinsView, muteButton())),
    el(
      'main',
      { class: 'leaves-screen' },
      el('div', { class: 'leaves-head' }, el('div', { class: 'leaves-title-row' }, zoneTitle, zoneLevel), el('div', { class: 'leaves-clean' }, el('span', { class: 'leaves-clean-bar' }, cleanFill), cleanText)),
      stage,
      el('div', { class: 'leaves-basket' }, el('span', { class: 'leaves-basket-bar' }, basketFill), basketText, compost),
      el('div', { class: 'leaves-golden', title: 'Chaque feuille dorée remplit la jauge, une feuille étoile cachée la fait bondir : pleine, le prochain tapis tombe tout doré.' }, el('span', { class: 'leaves-golden-bar' }, goldenFill), goldenText),
      status,
      zoneTabs,
      el('h2', { class: 'leaves-section', text: 'Améliorations' }),
      upgradesView,
      el('h2', { class: 'leaves-section', text: 'Embellir ce lieu' }),
      el('p', { class: 'leaves-note', text: `Chaque ornement décore le lieu et y rend les feuilles ${Math.round(ORNAMENT_VALUE * 100)} % plus précieuses.` }),
      ornamentsView,
      el('h2', { class: 'leaves-section', text: 'Collections' }),
      collectionTabs,
      collectionView,
      el('h2', { class: 'leaves-section', text: 'Feuilles d’or contre pièces' }),
      el('p', { class: 'leaves-note', text: `${GOLD_PER_COIN} feuilles d’or = 1 pièce pour la maison et Pompon, jusqu’à ${DAILY_COINS} pièces par jour.` }),
      exchange,
    ),
  );

  // -----------------------------------------------
  // A PLACE
  // -----------------------------------------------

  const state = () => save.zones[zone.id];
  const replaying = () => state().replay > 0;
  const level = () => state().replay || state().cleared + 1;
  const luck = () => LUCK(save.levels.luck);
  const goal = () => LEVEL_GOAL(zone.leaves, level());
  const carpet = () => CARPET(zone.leaves, level());
  const progress = () => Math.max(0, state().carpets * carpet() + carpet() - leaves.length);
  const isOpen = (i: number) => i === 0 || save.zones[ZONES[i - 1].id].cleared >= OPEN_AT_LEVEL;

  function makeLeaf(x: number, y: number, allGolden = false): Leaf {
    const roll = Math.random();
    const rare = !allGolden && roll < RARE_CHANCE * luck() ? pickRare() : null;
    const golden = allGolden || (!rare && roll < (RARE_CHANCE + GOLDEN_CHANCE) * luck());
    const shape = Math.floor(Math.random() * SHAPE_COUNT);
    const color = rare?.color ?? (golden ? '#ffd700' : zone.palette[Math.floor(Math.random() * zone.palette.length)]);
    const angle = Math.random() * Math.PI * 2;
    return { x, y, cos: Math.cos(angle), sin: Math.sin(angle), sprite: leafSprite(shape, color), shape, color, golden, rare };
  }

  function pickRare(): RareLeaf {
    const here = { time, zone: zone.id, level: level() };
    const available = RARE_LEAVES.filter((r) => (r.when ? r.when(here) : !r.page));
    return available[Math.floor(Math.random() * available.length)];
  }

  const randomSpot = () => ({ x: 8 + Math.random() * (W - 16), y: GROUND_TOP + 6 + Math.random() * (H - GROUND_TOP - 14) });

  function openZone(next: Zone): void {
    zone = next;
    save.zone = zone.id;
    const state = save.zones[zone.id];
    freeCanvas(back, front);
    back = drawBack(zone);
    front = drawFront(zone);
    falling = [];
    flyers = [];
    critterLayer.replaceChildren();
    // An empty saved ground means the last carpet was cleared: a fresh one waits.
    if (state.left > 0) spreadCarpet(Math.min(carpet(), state.left), state.hidden);
    else spreadCarpet(carpet());
    state.at = Date.now();
    banner.className = 'leaves-banner';
    paintLevels();
    paint();
  }

  /**
   * Lays a carpet: the whole ground covered evenly, plus small piles a pass or two can clear.
   * `buried`: what was left under the carpet before, put back instead of burying a fresh set.
   */
  function spreadCarpet(count: number, buried: BuriedThing[] | null = null): void {
    leaves = [];
    hidden = [];
    const fresh = !buried;
    if (fresh && save.goldenNext) {
      save.goldenNext = false;
      state().golden = true;
      announceGoldenCarpet();
    }
    const allGolden = state().golden;
    const piles = Math.floor((count * 0.15) / PILE_SIZE);
    const even = count - piles * PILE_SIZE;
    // A jittered grid covers the ground with no bare patches.
    const top = GROUND_TOP + 4;
    const cell = Math.sqrt((W * (H - 8 - top)) / even);
    const cols = Math.ceil(W / cell);
    const cells: { x: number; y: number }[] = [];
    for (let y = top; y < H - 8; y += cell) for (let c = 0; c < cols; c++) cells.push({ x: c * cell, y });
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    for (const c of cells.slice(0, even)) leaves.push(makeLeaf(Math.min(W - 4, c.x + Math.random() * cell), Math.min(H - 8, c.y + Math.random() * cell), allGolden));
    for (let p = 0; p < piles; p++) {
      const c = randomSpot();
      for (let i = 0; i < PILE_SIZE; i++) leaves.push(makeLeaf(c.x + (Math.random() - 0.5) * 16, Math.min(H - 8, Math.max(top, c.y + (Math.random() - 0.5) * 12)), allGolden));
      if (p === 0 && !buried && Math.random() < 0.45) hidden.push({ x: c.x, y: c.y, icon: '🦔', kind: 'hedgehog' });
    }
    if (allGolden && fresh && leaves.length > 0) {
      const gold = RARE_LEAVES.find((r) => r.id === 'goldbar')!;
      const leaf = leaves[Math.floor(Math.random() * leaves.length)];
      leaf.rare = gold;
      leaf.color = gold.color;
      leaf.sprite = leafSprite(leaf.shape, gold.color);
    }
    if (buried) restoreBuried(buried);
    else {
      hideTreasures();
      letCarpetFall();
    }
    save.zones[zone.id].left = leaves.length;
    storeHidden();
    saveLeaves(save);
    layerDirty = true;
  }

  function storeHidden(): void {
    state().hidden = hidden.map((h) => ({ x: h.x, y: h.y, kind: h.kind, ...(h.treasure ? { id: h.treasure.id } : h.decoId ? { id: h.decoId } : {}) }));
  }

  /** Puts back what was still buried, each under a few leaves moved onto it (the carpet was spread anew). */
  function restoreBuried(buried: BuriedThing[]): void {
    hidden = [];
    for (const b of buried) {
      const treasure = b.kind === 'treasure' ? TREASURES.find((t) => t.id === b.id) : undefined;
      if (b.kind === 'treasure' && !treasure) continue;
      if (b.kind === 'deco' && !WALL_DECOS.some((d) => d.id === b.id)) continue;
      hidden.push({ x: b.x, y: b.y, icon: treasure?.icon ?? (b.kind === 'deco' ? '🎁' : b.kind === 'star' ? '🌟' : b.kind === 'megastar' ? '🌟✨' : '🦔'), kind: b.kind, treasure, decoId: b.kind === 'deco' ? b.id : undefined });
    }
    const covered = (h: Hidden) => leaves.some((l) => Math.abs(l.x - h.x) < 9 && Math.abs(l.y - h.y) < 9);
    const spare = leaves.filter((l) => !hidden.some((h) => Math.abs(l.x - h.x) < 9 && Math.abs(l.y - h.y) < 9));
    for (const h of hidden) {
      for (let k = 0; k < 3 && !covered(h) && spare.length > 0; k++) {
        const leaf = spare.splice(Math.floor(Math.random() * spare.length), 1)[0];
        leaf.x = h.x + (Math.random() - 0.5) * 8;
        leaf.y = h.y + (Math.random() - 0.5) * 8;
      }
    }
    // Too few leaves left to hide them all: what stays bare is simply found.
    for (const h of hidden.filter((x) => !covered(x))) {
      hidden.splice(hidden.indexOf(h), 1);
      find(h);
    }
  }

  /** The carpet just spread comes down from the trees, swept left to right by the wind. */
  function letCarpetFall(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const start = now();
    const firstSeen = leaves.length - SEEN_FALLING;
    leaves.forEach((leaf, i) => {
      leaf.fall = { at: start + (leaf.x / W) * (CARPET_FALL_MS - LEAF_FALL_MS) * (0.75 + Math.random() * 0.25), drift: (Math.random() - 0.3) * 40, seen: i >= firstSeen };
    });
    fallingUntil = start + CARPET_FALL_MS;
    layerCtx.clearRect(0, 0, W, H);
    dirtyArea = null;
    for (let i = 0; i < 4; i++) later(i * 350, () => playRustle());
  }

  /** Buries the treasures of this level under the leaves. */
  function hideTreasures(): void {
    hidden = hidden.filter((h) => h.kind === 'hedgehog');
    const count = Math.min(MAX_TREASURES, TREASURES_PER_ZONE + level() - 1);
    const owned = new Set(loadHouse().ownedStyles);
    const buried = TREASURES.filter((t) => (t.minLevel ?? 1) <= level());
    for (let i = 0; i < count; i++) {
      const s = randomSpot();
      const missingDecos = WALL_DECOS.filter((d) => !d.reward && !owned.has(d.id));
      if (missingDecos.length > 0 && Math.random() < DECO_CHANCE * luck()) {
        const deco = missingDecos[Math.floor(Math.random() * missingDecos.length)];
        hidden.push({ ...s, icon: '🎁', kind: 'deco', decoId: deco.id });
        continue;
      }
      const total = buried.reduce((sum, t) => sum + t.weight * (t.gold >= 30 ? luck() : 1), 0);
      let roll = Math.random() * total;
      const treasure = buried.find((t) => (roll -= t.weight * (t.gold >= 30 ? luck() : 1)) < 0) ?? buried[0];
      hidden.push({ ...s, icon: treasure.icon, kind: 'treasure', treasure });
    }
    if (!state().golden && Math.random() < STAR_CHANCE) hidden.push({ ...randomSpot(), icon: '🌟', kind: 'star' });
    if (!state().golden && Math.random() < MEGA_STAR_CHANCE) hidden.push({ ...randomSpot(), icon: '🌟✨', kind: 'megastar' });
  }

  // -----------------------------------------------
  // RAKING
  // -----------------------------------------------

  function point(event: PointerEvent): { x: number; y: number } {
    const box = canvas.getBoundingClientRect();
    return { x: ((event.clientX - box.left) * W) / box.width, y: ((event.clientY - box.top) * H) / box.height };
  }

  /** A tap picks the leaf under the finger, then its nearest neighbours; a tap beside every leaf does nothing. */
  function pick(at: { x: number; y: number }): void {
    const dist = (leaf: Leaf) => Math.hypot(leaf.x - at.x, leaf.y - at.y);
    let touched: Leaf | null = null;
    for (const leaf of leaves) if (dist(leaf) <= TOUCH_REACH && (!touched || dist(leaf) < dist(touched))) touched = leaf;
    if (!touched) return;
    const room = BASKET_SIZE(save.levels.basket) - save.basket;
    if (room <= 0) {
      status.textContent = 'Le panier est plein ! Vide-le au compost pour continuer.';
      return;
    }
    const target = touched;
    const reach = GRAB_REACH(save.levels.rake);
    const near = leaves
      .filter((leaf) => leaf !== target && Math.hypot(leaf.x - target.x, leaf.y - target.y) <= reach)
      .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y));
    const taken = [target, ...near].slice(0, Math.min(room, GRAB(save.levels.rake)));
    const gone = new Set(taken);
    leaves = leaves.filter((leaf) => !gone.has(leaf));
    for (const leaf of taken) {
      collect(leaf);
      reveal(leaf.x, leaf.y, 8);
    }
    sparks.push({ x: target.x, y: target.y, t: 0 });
    if (taken.length > 1) pop(target.x, target.y - 10, `+${taken.length}`, 'is-gold');
    const t = performance.now();
    if (t - lastRustle > 60) {
      playRustle();
      lastRustle = t;
    }
    navigator.vibrate?.(8);
    markDirty(taken);
    if (leaves.length === 0) carpetCleared();
    paint();
  }

  function collect(leaf: Leaf): void {
    save.basket++;
    const zoneValue = 1 + LEVEL_VALUE * (level() - 1) + ORNAMENT_VALUE * state().ornaments.length;
    save.basketGold += (leaf.golden ? GOLDEN_VALUE : 1) * zoneValue;
    flyers.push({ x: leaf.x, y: leaf.y, color: leaf.color, t: 0 });
    if (leaf.golden && !state().golden) {
      pop(leaf.x, leaf.y, `+${GOLDEN_VALUE}`, 'is-gold');
      fillGoldenGauge();
    }
    if (leaf.rare) {
      const isNew = !save.herbarium[leaf.rare.id];
      save.herbarium[leaf.rare.id] = (save.herbarium[leaf.rare.id] ?? 0) + 1;
      pop(leaf.x, leaf.y, '✨', 'is-rare');
      loot(leafSwatch(leaf.rare.color), leaf.rare.name, isNew ? 'new' : '');
      status.textContent = isNew ? `✨ Nouvelle feuille pour l’herbier : ${leaf.rare.name} ! ${leaf.rare.note}` : `✨ ${leaf.rare.name} ! (×${save.herbarium[leaf.rare.id]})`;
      refreshCollection();
    }
  }

  /** A hidden thing whose leaves are all gone is found. */
  function reveal(x: number, y: number, radius: number): void {
    for (let i = hidden.length - 1; i >= 0; i--) {
      const h = hidden[i];
      if (Math.hypot(h.x - x, h.y - y) > radius + 6) continue;
      if (leaves.some((l) => Math.abs(l.x - h.x) < 9 && Math.abs(l.y - h.y) < 9)) continue;
      hidden.splice(i, 1);
      find(h);
    }
  }

  function find(h: Hidden): void {
    storeHidden();
    if (h.treasure && Math.random() < THIEF_CHANCE) {
      thief(h.treasure, h.x, h.y);
      saveLeaves(save);
      return;
    }
    pop(h.x, h.y, h.icon, 'is-find');
    if (h.kind === 'megastar') {
      loot(spriteIcon('megastar', h.icon), 'Méga feuille étoile', 'big');
      status.textContent = '🌟✨ Une MÉGA feuille étoile ! La jauge dorée est pleine d’un coup !';
      fillGoldenGauge(Math.max(0, goldenTarget() - save.goldenGauge));
      grantRare('crystal');
    } else if (h.kind === 'star') {
      loot(spriteIcon('star', h.icon), 'Feuille étoile');
      status.textContent = '🌟 Une feuille étoile ! La jauge dorée fait un bond.';
      fillGoldenGauge(Math.ceil(goldenTarget() * STAR_GAUGE_SHARE));
    } else if (h.kind === 'hedgehog') {
      loot(spriteIcon('hedgehog', h.icon), 'Hérisson', save.critters.hedgehog ? '' : 'new');
      meet('hedgehog');
      status.textContent = `🦔 Un hérisson dormait sous le tas ! ${rewardShare(CRITTER_GAUGE_SHARE)}`;
    } else if (h.kind === 'deco' && h.decoId) {
      const house = loadHouse();
      const deco = WALL_DECOS.find((d) => d.id === h.decoId)!;
      if (!house.ownedStyles.includes(deco.id)) house.ownedStyles.push(deco.id);
      saveHouse(house);
      loot('🎁', deco.name, 'new');
      status.textContent = `🎁 Une déco pour la maison : ${deco.name} ! Elle t’attend dans « Décos murales ».`;
    } else if (h.treasure) {
      creditTreasure(h.treasure, 1);
    }
    saveLeaves(save);
    refreshCollection();
    paint();
  }

  /** A golden leaf picked on an ordinary carpet: the gauge fills, and once full the next carpet is golden. */
  const goldenTarget = () => GOLDEN_GAUGE(carpet());

  function fillGoldenGauge(amount = 1): void {
    if (save.goldenNext) return;
    save.goldenGauge += amount;
    if (save.goldenGauge >= goldenTarget()) {
      save.goldenGauge = 0;
      save.goldenNext = true;
      banner.textContent = '🌟 Le prochain tapis sera doré ! 🌟';
      banner.className = 'leaves-banner is-on is-gold';
      later(3000, () => (banner.className = 'leaves-banner'));
      playSmallWin();
    }
    paintGoldenGauge();
  }

  function announceGoldenCarpet(): void {
    banner.textContent = '🌟 Tapis doré ! 🌟';
    banner.className = 'leaves-banner is-on is-gold';
    later(3500, () => (banner.className = 'leaves-banner'));
    playBigWin(1);
    for (let i = 0; i < 12; i++) sparks.push({ x: Math.random() * W, y: GROUND_TOP + Math.random() * (H - GROUND_TOP), t: Math.random() * 0.5 });
  }

  function paintGoldenGauge(): void {
    goldenFill.style.width = `${save.goldenNext ? 100 : Math.min(100, (save.goldenGauge / goldenTarget()) * 100)}%`;
    goldenText.textContent = state().golden ? '🌟 Tapis doré !' : save.goldenNext ? '🌟 Prochain tapis doré' : `🌟 ${Math.min(save.goldenGauge, goldenTarget())}/${goldenTarget()}`;
  }

  /** The ground is spotless: a small win, then the wind lays the next carpet (or the level is done). */
  function carpetCleared(): void {
    const s = state();
    s.golden = false;
    s.carpets++;
    if (s.carpets >= CARPETS(level())) {
      s.carpets = 0;
      cleaned();
    } else {
      playSmallWin();
      banner.textContent = `✨ Tout propre ! ${s.carpets}/${CARPETS(level())} ✨`;
      banner.className = 'leaves-banner is-on is-clean';
      later(2200, () => (banner.className = 'leaves-banner'));
      saveLeaves(save);
    }
    nextCarpet();
  }

  /** A gust of leaves drifts down, then the new carpet is there. */
  function nextCarpet(): void {
    later(1600, () => {
      for (let i = 0; i < 30; i++) dropLeaf(true);
      later(700, () => {
        if (leaves.length === 0) spreadCarpet(carpet());
        paint();
      });
    });
  }

  function cleaned(): void {
    const s = state();
    const finished = level();
    save.gold += zone.levelReward * finished;
    calmUntil = now() + 9000;
    playSmallWin();
    banner.className = 'leaves-banner is-on is-clean';
    later(4000, () => (banner.className = 'leaves-banner'));
    if (replaying()) {
      banner.textContent = `✨ Niveau ${finished} réussi ! ✨`;
      status.textContent = `Niveau ${finished} réussi encore une fois : +${(zone.levelReward * finished).toLocaleString('fr-FR')} feuilles d’or. Les trésors sont de nouveau cachés.`;
    } else {
      s.cleared++;
      const next = ZONES[ZONES.indexOf(zone) + 1];
      const opened = s.cleared === OPEN_AT_LEVEL && next;
      if (s.cleared === SPOTLESS_LEVEL) {
        const house = loadHouse();
        const deco = WALL_DECOS.find((d) => d.id === zone.spotlessDeco)!;
        if (!house.ownedStyles.includes(deco.id)) house.ownedStyles.push(deco.id);
        saveHouse(house);
        banner.textContent = '🏆 Lieu impeccable ! 🏆';
        status.textContent = `${zone.name} est impeccable ! Cadeau pour la maison : ${deco.name} (dans « Décos murales »). Et ça continue : niveau ${level()}, encore plus de feuilles !`;
      } else {
        banner.textContent = `✨ Niveau ${level()} ! ✨`;
        status.textContent = `${zone.name} passe au niveau ${level()} : plus de feuilles, plus de trésors, et chaque feuille vaut plus !${opened ? ` Nouveau lieu : ${next.name} !` : ''}`;
      }
    }
    paintLevels();
    if (Math.random() < 0.6) later(1500, () => critter('cat'));
    saveLeaves(save);
    paintZones();
  }

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (now() < fallingUntil) return;
    pick(point(event));
    save.zones[zone.id].left = leaves.length;
    save.zones[zone.id].at = Date.now();
    saveLeaves(save);
  });

  compost.addEventListener('click', () => {
    if (save.basket === 0) return;
    const gained = Math.round(save.basketGold * LEAF_VALUE(save.levels.value));
    save.gold += gained;
    save.basket = 0;
    save.basketGold = 0;
    saveLeaves(save);
    playCompost();
    status.textContent = `Le compost te rend ${gained} feuilles d’or !`;
    paint();
  });

  exchange.addEventListener('click', () => {
    const today = new Date().toISOString().slice(0, 10);
    if (save.coinsDay !== today) {
      save.coinsDay = today;
      save.coinsTaken = 0;
    }
    const coins = Math.min(DAILY_COINS - save.coinsTaken, Math.floor(save.gold / GOLD_PER_COIN));
    if (coins <= 0) return;
    save.gold -= coins * GOLD_PER_COIN;
    save.coinsTaken += coins;
    saveLeaves(save);
    addCoins(coins);
    playCompost();
    status.textContent = `+${coins} pièces pour la maison !`;
    paint();
  });

  // -----------------------------------------------
  // THE TREES, THE WIND, THE VISITORS
  // -----------------------------------------------

  const now = () => performance.now();

  function dropLeaf(gust: boolean): void {
    const spot = randomSpot();
    const leaf = makeLeaf(Math.random() * W, 20 + Math.random() * 50);
    const vx = gust ? 60 + Math.random() * 80 : (Math.random() - 0.5) * 20;
    falling.push({ leaf, vx, vy: 30 + Math.random() * 25, spin: (Math.random() - 0.5) * 4, angle: Math.random() * 6, landY: spot.y });
  }

  function update(dt: number, t: number): void {
    if (t > calmUntil) {
      fallDebt += dt * FALL_RATE;
      while (fallDebt >= 1) {
        fallDebt--;
        dropLeaf(false);
      }
    }
    if (t > nextGust) {
      nextGust = t + 25000 + Math.random() * 20000;
      for (let i = 0; i < 8; i++) dropLeaf(true);
    }
    if (t > nextEvent) {
      nextEvent = t + 20000 + Math.random() * 25000;
      randomEvent();
    }
    for (let i = falling.length - 1; i >= 0; i--) {
      const f = falling[i];
      f.angle += f.spin * dt;
      f.leaf.x += (f.vx + Math.sin(t / 300 + i) * 18) * dt;
      f.leaf.y += f.vy * dt;
      if (f.leaf.x < 0) f.leaf.x += W;
      if (f.leaf.x > W) f.leaf.x -= W;
      if (f.leaf.y >= f.landY) falling.splice(i, 1);
    }
    if (flyers.length > 0) flyers = flyers.filter((f) => (f.t += dt * 2.4) < 1);
    if (sparks.length > 0) sparks = sparks.filter((s) => (s.t += dt * 3) < 1);
  }

  function randomEvent(): void {
    if (Math.random() < RARE_CRITTER_CHANCE) {
      rareCritter()?.();
      return;
    }
    const options: (() => void)[] = [() => critter('squirrel'), () => critter('robin'), () => critter('ladybug'), butterfly, butterfly];
    if (zone.snails) options.push(() => critter('snail'));
    if (time === 'dusk') options.push(() => critter('fox'));
    if (time === 'night') options.push(() => critter('firefly'), () => critter('firefly'));
    options[Math.floor(Math.random() * options.length)]();
  }

  /** A little creature shows up; touching it before it leaves adds it to the album. */
  function critter(id: CritterId): void {
    const info = CRITTERS.find((c) => c.id === id)!;
    const rare = id === 'owl' || id === 'deer';
    const spot = randomSpot();
    const running = id === 'squirrel' || id === 'fox' || id === 'deer';
    const node = el('button', {
      class: `leaves-critter is-${id}${running ? ' is-running' : ''}${id === 'deer' ? ' is-fast' : ''}`,
      type: 'button',
      'aria-label': info.name,
      text: info.icon,
      style: `left:${(spot.x / W) * 100}%;top:${(spot.y / H) * 100}%`,
    });
    node.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      node.remove();
      loot(info.icon, info.name, save.critters[id] ? (rare ? 'big' : '') : 'new');
      meet(id);
      status.textContent = `${info.icon} ${info.name} ! ${info.note} ${rewardShare(rare ? RARE_CRITTER_GAUGE_SHARE : CRITTER_GAUGE_SHARE)}`;
      saveLeaves(save);
      paint();
    });
    critterLayer.append(node);
    playChime();
    later(id === 'deer' ? 2000 : id === 'owl' ? 2200 : running ? 3500 : 4000, () => node.remove());
  }

  /** A treasure is worth its gold times the compost, so it keeps its value as the player grows. */
  function creditTreasure(t: Treasure, times: number): void {
    const isNew = !save.treasures[t.id];
    save.treasures[t.id] = (save.treasures[t.id] ?? 0) + 1;
    const gold = Math.round(t.gold * LEAF_VALUE(save.levels.value)) * times;
    save.gold += gold;
    loot(spriteIcon(t.id, t.icon), `${t.name} +${gold.toLocaleString('fr-FR')}`, isNew ? 'new' : times > 1 ? 'big' : '');
    const what = times > 1
      ? `${t.icon} ${t.name} rattrapé : +${gold.toLocaleString('fr-FR')} feuilles d’or (×${times}) !`
      : `${t.icon} ${isNew ? 'Nouvelle trouvaille' : 'Trouvé'} : ${t.name} ! +${gold.toLocaleString('fr-FR')} feuilles d’or.`;
    status.textContent = `${what} ${isNew ? t.note : ''}`;
  }

  /** A squirrel snatches the treasure just found and runs for the nearest edge: caught in time, it pays twice. */
  function thief(t: Treasure, x: number, y: number): void {
    // Toward the far edge: a squirrel found near a side would otherwise vanish at once.
    const toLeft = x > W / 2;
    const node = el(
      'button',
      { class: `leaves-critter leaves-thief${toLeft ? '' : ' is-right'}`, type: 'button', 'aria-label': `Écureuil qui file avec ${t.name}`, style: `left:${(x / W) * 100}%;top:${(y / H) * 100}%` },
      el('span', { class: 'leaves-thief-body', text: '🐿️' }),
      el('span', { class: 'leaves-thief-loot', text: t.icon }),
    );
    status.textContent = `🐿️ Un écureuil file avec ${t.icon} ${t.name} ! Attrape-le vite !`;
    loot('🐿️', `Un écureuil file avec ${t.name} !`, 'alert');
    playChime();
    node.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      node.remove();
      meet('squirrel');
      creditTreasure(t, 2);
      pop(x, y, '🐿️✨', 'is-find');
      saveLeaves(save);
      refreshCollection();
      paint();
    });
    critterLayer.append(node);
    // Zigzags across the ground at a steady, fast speed; the run lasts at least THIEF_MIN_MS.
    const endX = toLeft ? -0.12 * W : 1.12 * W;
    const path = [{ x, y }];
    for (let i = 1; i <= 4; i++) {
      const swing = (i % 2 ? -1 : 1) * (40 + Math.random() * 30);
      path.push({ x: x + ((endX - x) * i) / 5, y: Math.min(H - 14, Math.max(GROUND_TOP + 10, y + swing)) });
    }
    path.push({ x: endX, y: path[path.length - 1].y });
    let length = 0;
    for (let i = 1; i < path.length; i++) length += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    node
      .animate(
        path.map((p) => ({ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` })),
        { duration: Math.max(THIEF_MIN_MS, (length / THIEF_SPEED) * 1000), easing: 'linear' },
      )
      .finished.then(() => {
        if (!node.isConnected) return;
        node.remove();
        status.textContent = `L’écureuil s’est enfui avec ${t.icon} ${t.name}… Plus vite la prochaine fois !`;
      })
      .catch(() => {});
  }

  /** The golden butterfly zigzags across the place: touch it before it is gone. */
  function butterfly(): void {
    const info = CRITTERS.find((c) => c.id === 'butterfly')!;
    zigzag('butterfly', BUTTERFLY_MS, 'leaves-butterfly', () => {
      status.textContent = `🦋 ${info.name} attrapé ! ${rewardShare(BUTTERFLY_GAUGE_SHARE)}`;
      if (Math.random() < RAINBOW_CHANCE) grantRare('rainbow');
    });
  }

  /** A creature crossing the place in zigzags; touched in time, it is met and `onCatch` rewards it. */
  function zigzag(id: CritterId, ms: number, className: string, onCatch: () => void): void {
    const info = CRITTERS.find((c) => c.id === id)!;
    const fromLeft = Math.random() < 0.5;
    const points = [{ x: fromLeft ? -0.08 : 1.08, y: 0.35 + Math.random() * 0.4 }];
    for (let i = 1; i <= 5; i++) points.push({ x: fromLeft ? i / 6 : 1 - i / 6, y: 0.25 + Math.random() * 0.6 });
    points.push({ x: fromLeft ? 1.08 : -0.08, y: 0.3 + Math.random() * 0.4 });
    const node = el('button', { class: `leaves-critter ${className}`, type: 'button', 'aria-label': info.name, text: info.icon });
    node.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      const box = node.getBoundingClientRect();
      const stageBox = critterLayer.getBoundingClientRect();
      node.remove();
      loot(info.icon, info.name, save.critters[id] ? (id === 'rabbit' ? 'big' : '') : 'new');
      meet(id);
      pop(((box.left + box.width / 2 - stageBox.left) / stageBox.width) * W, ((box.top - stageBox.top) / stageBox.height) * H, `${info.icon}✨`, 'is-find');
      onCatch();
      saveLeaves(save);
      paint();
    });
    critterLayer.append(node);
    playChime();
    node
      .animate(points.map((p) => ({ left: `${p.x * 100}%`, top: `${p.y * 100}%` })), { duration: ms, easing: 'ease-in-out' })
      .finished.then(() => node.remove())
      .catch(() => {});
  }

  // -----------------------------------------------
  // THE LOOT BUBBLE: what one tap found, gathered where it can be seen
  // -----------------------------------------------

  let lootHide = 0;
  let lootNotes = 0;

  /** Adds a find to the bubble over the place; finds close together pile up in the same bubble. */
  function loot(icon: Node | string, name: string, mark: '' | 'new' | 'big' | 'alert' = ''): void {
    if (!lootBubble.classList.contains('is-on')) {
      lootBubble.replaceChildren();
      lootNotes = 0;
    }
    const item = el('div', { class: `leaves-loot-item${mark ? ` is-${mark}` : ''}` }, typeof icon === 'string' ? el('span', { class: 'leaves-loot-icon', text: icon }) : icon, el('span', { class: 'leaves-loot-name', text: name }));
    if (mark === 'new') item.append(el('b', { class: 'leaves-loot-new', text: 'NOUVEAU !' }));
    lootBubble.append(item);
    while (lootBubble.childElementCount > 5) lootBubble.firstElementChild!.remove();
    lootBubble.classList.add('is-on');
    playTallyNote(lootNotes++);
    if (mark === 'big' || mark === 'new') playSmallWin();
    window.clearTimeout(lootHide);
    timers.delete(lootHide);
    lootHide = window.setTimeout(() => lootBubble.classList.remove('is-on'), 2800);
    timers.add(lootHide);
  }

  /** A drawn thing (treasure, star, hedgehog) as a small icon for the bubble. */
  function spriteIcon(id: string, fallback: string): HTMLCanvasElement {
    const sprite = thingSprite(id, fallback);
    const icon = document.createElement('canvas');
    icon.width = sprite.width;
    icon.height = sprite.height;
    icon.className = 'leaves-loot-icon';
    icon.getContext('2d')!.drawImage(sprite, 0, 0);
    return icon;
  }

  function leafSwatch(color: string): HTMLElement {
    return el('span', { class: 'leaves-page-leaf leaves-loot-icon', style: `background:${color}` });
  }

  /** Gold a whole carpet is worth here, for rewards that must keep their value as the player grows. */
  function carpetGold(): number {
    const zoneValue = 1 + LEVEL_VALUE * (level() - 1) + ORNAMENT_VALUE * state().ornaments.length;
    return carpet() * zoneValue * LEAF_VALUE(save.levels.value);
  }

  /** A creature's reward: this share of the golden gauge, or of a carpet's gold when the gauge is already full. */
  function rewardShare(share: number): string {
    if (save.goldenNext) {
      const gold = Math.round(carpetGold() * share);
      save.gold += gold;
      return `+${gold.toLocaleString('fr-FR')} feuilles d’or.`;
    }
    fillGoldenGauge(Math.ceil(goldenTarget() * share));
    return 'La jauge dorée monte !';
  }

  /** A rare leaf given by an event rather than picked on the ground. */
  function grantRare(id: string): void {
    const r = RARE_LEAVES.find((x) => x.id === id)!;
    const isNew = !save.herbarium[id];
    save.herbarium[id] = (save.herbarium[id] ?? 0) + 1;
    loot(leafSwatch(r.color), r.name, isNew ? 'new' : 'big');
    status.textContent += isNew ? ` ✨ Nouvelle feuille pour l’herbier : ${r.name} !` : ` ✨ ${r.name} (×${save.herbarium[id]})`;
    saveLeaves(save);
    refreshCollection();
  }

  /** A rare creature of this time of day, or none. */
  function rareCritter(): (() => void) | null {
    if (time === 'night') return () => critter('owl');
    if (time === 'dawn' || time === 'dusk') return () => critter('deer');
    return rabbit;
  }

  /** The white rabbit hops across in zigzags, fast. */
  function rabbit(): void {
    zigzag('rabbit', 2200, 'leaves-rabbit', () => {
      status.textContent = `🐇 Lapin blanc attrapé ! Toujours pressé… ${rewardShare(RARE_CRITTER_GAUGE_SHARE)}`;
    });
  }

  function meet(id: CritterId): void {
    save.critters[id] = (save.critters[id] ?? 0) + 1;
    refreshCollection();
  }

  function pop(x: number, y: number, text: string, kind: string): void {
    const node = el('span', { class: `leaves-pop ${kind}`, text, style: `left:${(x / W) * 100}%;top:${(y / H) * 100}%` });
    critterLayer.append(node);
    later(1100, () => node.remove());
  }

  // -----------------------------------------------
  // DRAWING
  // -----------------------------------------------

  /**
   * Draws a sprite of `size` units centred on (x, y), turned by the rotation (cos, sin).
   * setTransform, not save/restore: thousands of leaves are drawn at once, and it is much cheaper.
   */
  function drawTurned(g: CanvasRenderingContext2D, sprite: HTMLCanvasElement, x: number, y: number, cos: number, sin: number, size: number): void {
    g.setTransform(SCALE * cos, SCALE * sin, -SCALE * sin, SCALE * cos, SCALE * x, SCALE * y);
    g.drawImage(sprite, -size / 2, -size / 2, size, size);
    g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  }

  function markDirty(taken: Leaf[]): void {
    const pad = LEAF_SIZE;
    for (const leaf of taken) {
      const a = dirtyArea ?? { x0: leaf.x, y0: leaf.y, x1: leaf.x, y1: leaf.y };
      dirtyArea = { x0: Math.min(a.x0, leaf.x - pad), y0: Math.min(a.y0, leaf.y - pad), x1: Math.max(a.x1, leaf.x + pad), y1: Math.max(a.y1, leaf.y + pad) };
    }
  }

  /** Clears the changed part of the ground and draws back only the leaves that reach into it. */
  function redrawArea(area: { x0: number; y0: number; x1: number; y1: number }): void {
    const w = area.x1 - area.x0;
    const h = area.y1 - area.y0;
    layerCtx.save();
    layerCtx.beginPath();
    layerCtx.rect(area.x0, area.y0, w, h);
    layerCtx.clip();
    layerCtx.clearRect(area.x0, area.y0, w, h);
    const reach = LEAF_SIZE;
    for (const leaf of leaves) {
      if (leaf.x < area.x0 - reach || leaf.x > area.x1 + reach || leaf.y < area.y0 - reach || leaf.y > area.y1 + reach) continue;
      stamp(leaf);
    }
    layerCtx.restore();
  }

  function stamp(leaf: Leaf): void {
    drawTurned(layerCtx, leaf.sprite, leaf.x, leaf.y, leaf.cos, leaf.sin, LEAF_SIZE);
  }

  /** Each leaf drops from above the trees to its spot, drifting a little, and fades in; landed, it joins the ground layer. */
  function drawFallingCarpet(t: number): void {
    for (const leaf of leaves) {
      if (!leaf.fall) continue;
      const p = Math.min(1, Math.max(0, (t - leaf.fall.at) / LEAF_FALL_MS));
      if (p <= 0) continue;
      if (p >= 1) {
        leaf.fall = undefined;
        stamp(leaf);
        continue;
      }
      if (!leaf.fall.seen) continue;
      const ease = 1 - (1 - p) * (1 - p);
      const from = -20 - leaf.y * 0.15;
      const x = leaf.x + (leaf.fall?.drift ?? 0) * (1 - ease);
      const y = from + (leaf.y - from) * ease;
      ctx.globalAlpha = Math.min(1, p * 2.5);
      drawTurned(ctx, leaf.sprite, x, y, leaf.cos, leaf.sin, LEAF_SIZE * (1 + (1 - ease) * 0.4));
    }
    ctx.globalAlpha = 1;
  }

  function redrawLayer(): void {
    layerCtx.clearRect(0, 0, W, H);
    for (const leaf of leaves) stamp(leaf);
    layerDirty = false;
  }

  const tick = (t: number) => {
    const dt = Math.min(0.05, (t - lastTime) / 1000);
    lastTime = t;
    update(dt, t);
    const carpetFalling = t < fallingUntil;
    if (!carpetFalling && fallingUntil > 0) {
      fallingUntil = 0;
      for (const leaf of leaves) leaf.fall = undefined;
      layerDirty = true;
    }
    if (layerDirty && !carpetFalling) {
      redrawLayer();
      dirtyArea = null;
    } else if (dirtyArea && !carpetFalling) {
      redrawArea(dirtyArea);
      dirtyArea = null;
    }
    ctx.drawImage(back, 0, 0, W, H);
    if (carpetFalling) {
      ctx.drawImage(layer, 0, 0, W, H);
      drawFallingCarpet(t);
    } else {
      for (const h of hidden) ctx.drawImage(thingSprite(h.treasure?.id ?? h.kind, h.icon), h.x - 12, h.y - 12, 24, 24);
      ctx.drawImage(layer, 0, 0, W, H);
    }
    for (const o of ORNAMENTS) if (state().ornaments.includes(o.id)) ctx.drawImage(thingSprite(o.id, o.icon, 36), o.x - 18, o.y - 18, 36, 36);
    // Falling leaves: a shadow where they will land, and bigger the higher they are.
    for (const f of falling) {
      const height = Math.max(0, f.landY - f.leaf.y);
      const lift = Math.min(1, height / 220);
      ctx.fillStyle = `rgb(40 30 20 / ${0.12 * Math.min(1, height / 40)})`;
      ctx.beginPath();
      ctx.ellipse(f.leaf.x, f.landY, 6 + lift * 4, 2.5 + lift * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const f of falling) {
      const lift = Math.min(1, Math.max(0, f.landY - f.leaf.y) / 220);
      // Scenery only: bigger the higher they are, and they fade out before touching the ground.
      ctx.globalAlpha = Math.min(0.85, (f.landY - f.leaf.y) / 40);
      drawTurned(ctx, f.leaf.sprite, f.leaf.x, f.leaf.y, Math.cos(f.angle), Math.sin(f.angle), LEAF_SIZE * (1.2 + lift * 0.8));
    }
    ctx.globalAlpha = 1;
    for (const f of flyers) {
      const x = f.x + (W * 0.1 - f.x) * f.t;
      const y = f.y + (H + 40 - f.y) * f.t * f.t;
      ctx.globalAlpha = 1 - f.t;
      ctx.fillStyle = f.color;
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }
    ctx.globalAlpha = 1;
    // Rare and golden leaves glint (on a golden carpet, one leaf in eight is enough).
    const glint = 0.5 + 0.5 * Math.sin(t / 180);
    const allGolden = state().golden;
    for (let i = 0; i < leaves.length && !carpetFalling; i++) {
      const leaf = leaves[i];
      if (!leaf.rare && !leaf.golden) continue;
      if (allGolden && i % 8 !== 0) continue;
      ctx.fillStyle = `rgb(255 255 220 / ${0.35 + glint * 0.5})`;
      ctx.fillRect(leaf.x - 1, leaf.y - 7, 2, 2);
      ctx.fillRect(leaf.x + 5, leaf.y - 1, 2, 2);
    }
    // The last few leaves of a carpet shine, so nobody hunts for them.
    if (leaves.length > 0 && leaves.length <= LAST_LEAVES) {
      ctx.strokeStyle = `rgb(255 255 255 / ${0.5 + glint * 0.5})`;
      ctx.lineWidth = 2;
      for (const leaf of leaves) {
        ctx.beginPath();
        ctx.arc(leaf.x, leaf.y, 9 + glint * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.drawImage(front, 0, 0, W, H);
    // A small ring where a tap picked something.
    for (const s of sparks) {
      ctx.strokeStyle = `rgb(255 250 220 / ${1 - s.t})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4 + s.t * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (Math.floor(t / 250) !== Math.floor((t - dt * 1000) / 250)) paintClean();
    frame = requestAnimationFrame(tick);
  };

  // -----------------------------------------------
  // PANELS
  // -----------------------------------------------

  /** The level bar counts every carpet's leaves; beside it, the carpet being cleaned. */
  function paintClean(): void {
    const s = state();
    const total = CARPETS(level());
    cleanFill.style.width = `${Math.min(100, (progress() / goal()) * 100)}%`;
    cleanText.textContent = `Tapis ${Math.min(total, s.carpets + 1)}/${total} · ${Math.floor((1 - leaves.length / carpet()) * 100)} % propre`;
  }

  function paint(): void {
    const size = BASKET_SIZE(save.levels.basket);
    goldView.textContent = `🍂 ${Math.floor(save.gold).toLocaleString('fr-FR')}`;
    coinsView.textContent = `${loadCompanion().coins} 🪙`;
    basketFill.style.width = `${Math.min(100, (save.basket / size) * 100)}%`;
    basketText.textContent = `🧺 ${save.basket}/${size}`;
    compost.disabled = save.basket === 0;
    zoneTitle.textContent = zone.name;
    paintClean();
    paintGoldenGauge();
    const today = new Date().toISOString().slice(0, 10);
    const taken = save.coinsDay === today ? save.coinsTaken : 0;
    const possible = Math.min(DAILY_COINS - taken, Math.floor(save.gold / GOLD_PER_COIN));
    exchange.textContent =
      possible > 0 ? `Échanger contre ${possible} pièce${possible > 1 ? 's' : ''}` : taken >= DAILY_COINS ? 'Limite du jour atteinte, reviens demain' : `Encore ${Math.ceil(GOLD_PER_COIN - (save.gold % GOLD_PER_COIN))} feuilles d’or pour 1 pièce`;
    exchange.disabled = possible <= 0;
    paintUpgrades();
    paintOrnaments();
  }

  /** The level being played: the next one, or a finished one played again. */
  function paintLevels(): void {
    const s = state();
    const options: HTMLOptionElement[] = [];
    options.push(el('option', { value: '0', text: `Niveau ${s.cleared + 1} · à découvrir` }));
    for (let l = s.cleared; l >= 1; l--) options.push(el('option', { value: `${l}`, text: `Rejouer le niveau ${l} · ${LEVEL_GOAL(zone.leaves, l).toLocaleString('fr-FR')} feuilles` }));
    zoneLevel.replaceChildren(...options);
    zoneLevel.value = `${s.replay}`;
  }

  zoneLevel.addEventListener('change', () => {
    const s = state();
    s.replay = Number(zoneLevel.value);
    s.left = -1;
    s.carpets = 0;
    status.textContent = s.replay ? `Niveau ${s.replay} : ${goal().toLocaleString('fr-FR')} feuilles à ramasser.` : `Retour au niveau ${level()} : un tas tout neuf t’attend.`;
    openZone(zone);
  });

  function paintOrnaments(): void {
    const place = ZONES.indexOf(zone);
    ornamentsView.replaceChildren(
      ...ORNAMENTS.map((o) => {
        const owned = state().ornaments.includes(o.id);
        const price = ornamentPrice(o, place);
        const button = el(
          'button',
          { class: 'leaves-upgrade', type: 'button' },
          el('span', { class: 'leaves-upgrade-icon', text: o.icon }),
          el('strong', { text: o.name }),
          el('small', { text: owned ? 'Installé dans ce lieu' : `+${Math.round(ORNAMENT_VALUE * 100)} % de valeur ici` }),
          el('span', { class: 'leaves-upgrade-cost', text: owned ? '✓' : `🍂 ${price.toLocaleString('fr-FR')}` }),
        );
        button.disabled = owned || save.gold < price;
        button.addEventListener('click', () => {
          if (owned || save.gold < price) return;
          save.gold -= price;
          state().ornaments.push(o.id);
          saveLeaves(save);
          playSmallWin();
          status.textContent = `${o.icon} ${o.name} : le lieu est encore plus joli !`;
          paint();
        });
        return button;
      }),
    );
  }

  function paintZones(): void {
    zoneTabs.replaceChildren(
      ...ZONES.map((z, i) => {
        const open = isOpen(i);
        const done = save.zones[z.id].cleared;
        const button = el('button', { class: `leaves-zone${z === zone ? ' is-on' : ''}`, type: 'button' }, open ? `${z.name} · ${done >= SPOTLESS_LEVEL ? '🏆 ' : ''}${done + 1}` : `🔒 ${z.name}`);
        button.disabled = !open;
        button.title = open ? `${done >= SPOTLESS_LEVEL ? 'Lieu impeccable, ' : ''}Niveau ${done + 1}` : `${ZONES[i - 1].name} au niveau ${OPEN_AT_LEVEL} pour l’ouvrir`;
        button.addEventListener('click', () => {
          save.zones[zone.id].left = leaves.length;
          save.zones[zone.id].at = Date.now();
          status.textContent = '';
          openZone(z);
          paintZones();
        });
        return button;
      }),
    );
  }

  function paintUpgrades(): void {
    upgradesView.replaceChildren(
      ...UPGRADES.map((u) => {
        const lvl = save.levels[u.id];
        const maxed = !u.endless && lvl >= u.max;
        const cost = u.cost(lvl);
        const past = u.endless && lvl >= u.max ? u.endless : null;
        // A renamed endless upgrade (the blower) counts its own levels from 1.
        const shownLevel = past && past.name !== u.name ? lvl - u.max + 1 : lvl + 1;
        const button = el(
          'button',
          { class: 'leaves-upgrade', type: 'button' },
          el('span', { class: 'leaves-upgrade-icon', text: past?.icon ?? u.icon }),
          el('strong', { text: `${past?.name ?? u.name} · niv. ${shownLevel}` }),
          el('small', { text: maxed ? `${u.describe(lvl)} · au maximum` : `${u.describe(lvl)} → ${u.describe(lvl + 1)}` }),
          el('span', { class: 'leaves-upgrade-cost', text: maxed ? '✓' : `🍂 ${cost.toLocaleString('fr-FR')}` }),
        );
        button.disabled = maxed || save.gold < cost;
        button.addEventListener('click', () => {
          if (save.gold < cost || maxed) return;
          save.gold -= cost;
          save.levels[u.id]++;
          saveLeaves(save);
          playCompost();
          paint();
        });
        return button;
      }),
    );
  }

  const herbariumCount = (page: 2 | undefined): string => {
    const pageLeaves = RARE_LEAVES.filter((r) => r.page === page);
    return `${pageLeaves.filter((r) => save.herbarium[r.id]).length}/${pageLeaves.length}`;
  };

  const COLLECTIONS: { id: Collection; label: string; total: () => string }[] = [
    { id: 'herbarium', label: '🍁 Herbier', total: () => herbariumCount(undefined) },
    { id: 'herbarium2', label: '🌈 Herbier II', total: () => herbariumCount(2) },
    { id: 'treasures', label: '🧭 Trouvailles', total: () => `${Object.keys(save.treasures).length}/${TREASURES.length}` },
    { id: 'critters', label: '🦔 Petites bêtes', total: () => `${Object.keys(save.critters).length}/${CRITTERS.length}` },
  ];

  const collectionDone: Record<Collection, () => boolean> = {
    herbarium: () => RARE_LEAVES.filter((r) => !r.page).every((r) => save.herbarium[r.id]),
    herbarium2: () => RARE_LEAVES.filter((r) => r.page === 2).every((r) => save.herbarium[r.id]),
    treasures: () => TREASURES.every((t) => save.treasures[t.id]),
    critters: () => CRITTERS.every((c) => save.critters[c.id]),
  };

  /** A finished collection gives its decoration for the house, once. */
  function rewardFinishedCollections(): void {
    const house = loadHouse();
    for (const c of Object.keys(COLLECTION_REWARDS) as Collection[]) {
      const decoId = COLLECTION_REWARDS[c];
      if (house.ownedStyles.includes(decoId) || !collectionDone[c]()) continue;
      house.ownedStyles.push(decoId);
      saveHouse(house);
      const deco = WALL_DECOS.find((x) => x.id === decoId)!;
      banner.textContent = '🏆 Collection complète ! 🏆';
      banner.className = 'leaves-banner is-on is-clean';
      later(4000, () => (banner.className = 'leaves-banner'));
      playSmallWin();
      status.textContent = `🏆 Collection complète ! Cadeau pour la maison : ${deco.name} (dans « Décos murales »).`;
    }
  }

  function refreshCollection(): void {
    rewardFinishedCollections();
    collectionTabs.replaceChildren(
      ...COLLECTIONS.map((c) => {
        const button = el('button', { class: `leaves-zone${openCollection === c.id ? ' is-on' : ''}`, type: 'button', text: `${c.label} ${c.total()}` });
        button.addEventListener('click', () => {
          openCollection = openCollection === c.id ? null : c.id;
          refreshCollection();
        });
        return button;
      }),
    );
    const card = (known: boolean, icon: HTMLElement | string, name: string, detail: string) =>
      el('div', { class: `leaves-page${known ? '' : ' is-unknown'}` }, typeof icon === 'string' ? el('span', { class: 'leaves-page-icon', text: icon }) : icon, el('strong', { text: known ? name : '???' }), el('small', { text: detail }));
    if (openCollection === 'herbarium' || openCollection === 'herbarium2') {
      const page = openCollection === 'herbarium2' ? 2 : undefined;
      collectionView.replaceChildren(
        ...RARE_LEAVES.filter((r) => r.page === page).map((r) => {
          const n = save.herbarium[r.id] ?? 0;
          return card(n > 0, el('span', { class: 'leaves-page-leaf', style: `background:${n ? r.color : '#d9d2c4'}` }), r.name, n ? `${r.note} ×${n}` : r.hint ?? (r.id === 'night' ? 'Seulement la nuit' : 'Encore à trouver'));
        }),
      );
    } else if (openCollection === 'treasures') {
      collectionView.replaceChildren(...TREASURES.map((t) => card(!!save.treasures[t.id], save.treasures[t.id] ? t.icon : '❔', t.name, save.treasures[t.id] ? `${t.note} ×${save.treasures[t.id]}` : t.minLevel ? `Caché plus profond (niveau ${t.minLevel} et plus)` : 'Caché sous les feuilles')));
    } else if (openCollection === 'critters') {
      collectionView.replaceChildren(...CRITTERS.map((c) => card(!!save.critters[c.id], save.critters[c.id] ? c.icon : '❔', c.name, save.critters[c.id] ? c.note : c.hint)));
    } else collectionView.replaceChildren();
  }

  if (time === 'night') {
    for (let i = 0; i < 6; i++) sky.append(el('span', { class: 'leaves-firefly', style: `left:${10 + i * 15}%;top:${30 + ((i * 37) % 55)}%;animation-delay:-${i * 0.7}s` }));
  }

  // TEST: never in the published site (import.meta.env.DEV is false in a build).
  if (import.meta.env.DEV && TEST_THIEF_EVERY_6S) {
    const testThief = window.setInterval(() => {
      const t = TREASURES[Math.floor(Math.random() * TREASURES.length)];
      const spot = randomSpot();
      thief(t, spot.x, spot.y);
    }, 6000 + Math.random() * 1500);
    timers.add(testThief);
  }

  nextGust = now() + 15000;
  nextEvent = now() + 12000;
  openZone(zone);
  paintZones();
  refreshCollection();
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    timers.forEach((id) => window.clearTimeout(id));
    save.zones[zone.id].left = leaves.length;
    save.zones[zone.id].at = Date.now();
    saveLeaves(save);
    freeCanvas(canvas, layer, back, front);
  };
}
