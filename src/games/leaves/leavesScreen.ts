import './leaves.css';
import { el, topBar } from '../../dom';
import { addCoins, loadCompanion } from '../../companion/companionSave';
import { loadHouse, saveHouse } from '../../house/houseSave';
import { WALL_DECOS } from '../../house/houseStyle';
import { armSoundUnlock, muteButton, playCompost, playRustle, playSmallWin } from '../casino/fx/sound';
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
  GOLDEN_VALUE,
  GOLDEN_WIND_SECONDS,
  GOLD_PER_COIN,
  LEAF_VALUE,
  LEVEL_GOAL,
  LEVEL_VALUE,
  LUCK,
  MAX_LEVEL,
  OPEN_AT_LEVEL,
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
import { loadLeaves, saveLeaves } from './leavesSave';

// -----------------------------------------------
// LES FEUILLES: rake the places clean while the trees keep dropping leaves
// -----------------------------------------------

interface Leaf {
  x: number;
  y: number;
  cos: number;
  sin: number;
  sprite: HTMLCanvasElement;
  /** Wet leaves need two passes; the first one dries them. */
  wet: boolean;
  shape: number;
  color: string;
  golden: boolean;
  rare: RareLeaf | null;
}

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
  kind: 'treasure' | 'deco' | 'hedgehog';
  treasure?: Treasure;
  decoId?: string;
}

interface Flyer {
  x: number;
  y: number;
  color: string;
  t: number;
}

type Collection = 'herbarium' | 'treasures' | 'critters';

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
  let frame = 0;
  let lastTime = performance.now();
  let fallDebt = 0;
  /** Falling pauses for a breath after a place is cleaned. */
  let calmUntil = 0;
  let goldenUntil = 0;
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
  const stage = el('div', { class: 'leaves-stage' }, canvas, sky, critterLayer, banner);
  const goldView = el('span', { class: 'leaves-gold' });
  const coinsView = el('span', { class: 'coin-pill' });
  const basketFill = el('span', {});
  const basketText = el('span', { class: 'leaves-basket-text' });
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
  /** A spotless place can only be replayed. */
  const replaying = () => state().replay > 0 || state().cleared >= MAX_LEVEL;
  const level = () => state().replay || Math.min(MAX_LEVEL, state().cleared + 1);
  const luck = () => LUCK(save.levels.luck);
  const goal = () => LEVEL_GOAL(zone.leaves, level());
  const carpet = () => CARPET(zone.leaves, level());
  const progress = () => Math.max(0, state().carpets * carpet() + carpet() - leaves.length);
  const isOpen = (i: number) => i === 0 || save.zones[ZONES[i - 1].id].cleared >= OPEN_AT_LEVEL;

  function makeLeaf(x: number, y: number): Leaf {
    const roll = Math.random();
    const rare = roll < RARE_CHANCE * luck() ? pickRare() : null;
    const golden = !rare && (roll < (RARE_CHANCE + GOLDEN_CHANCE) * luck() || now() < goldenUntil);
    const wet = !rare && !golden && Math.random() < zone.wet;
    const shape = Math.floor(Math.random() * SHAPE_COUNT);
    const color = rare?.color ?? (golden ? '#ffd700' : zone.palette[Math.floor(Math.random() * zone.palette.length)]);
    const angle = Math.random() * Math.PI * 2;
    return { x, y, cos: Math.cos(angle), sin: Math.sin(angle), sprite: leafSprite(shape, color, wet), wet, shape, color, golden, rare };
  }

  function pickRare(): RareLeaf {
    const available = RARE_LEAVES.filter((r) => r.id !== 'night' || time === 'night');
    return available[Math.floor(Math.random() * available.length)];
  }

  const randomSpot = () => ({ x: 8 + Math.random() * (W - 16), y: GROUND_TOP + 6 + Math.random() * (H - GROUND_TOP - 14) });

  function openZone(next: Zone): void {
    zone = next;
    save.zone = zone.id;
    const state = save.zones[zone.id];
    back = drawBack(zone);
    front = drawFront(zone);
    falling = [];
    flyers = [];
    critterLayer.replaceChildren();
    // An empty saved ground means the last carpet was cleared: a fresh one waits.
    spreadCarpet(state.left > 0 ? Math.min(carpet(), state.left) : carpet());
    state.at = Date.now();
    banner.className = 'leaves-banner';
    paintLevels();
    paint();
  }

  /** Lays a carpet: the whole ground covered evenly, plus small piles a pass or two can clear. */
  function spreadCarpet(count: number): void {
    leaves = [];
    hidden = [];
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
    for (const c of cells.slice(0, even)) leaves.push(makeLeaf(Math.min(W - 4, c.x + Math.random() * cell), Math.min(H - 8, c.y + Math.random() * cell)));
    for (let p = 0; p < piles; p++) {
      const c = randomSpot();
      for (let i = 0; i < PILE_SIZE; i++) leaves.push(makeLeaf(c.x + (Math.random() - 0.5) * 16, Math.min(H - 8, Math.max(top, c.y + (Math.random() - 0.5) * 12))));
      if (p === 0 && Math.random() < 0.45) hidden.push({ x: c.x, y: c.y, icon: '🦔', kind: 'hedgehog' });
    }
    hideTreasures();
    save.zones[zone.id].left = leaves.length;
    saveLeaves(save);
    layerDirty = true;
  }

  /** Buries the treasures of this level under the leaves. */
  function hideTreasures(): void {
    hidden = hidden.filter((h) => h.kind === 'hedgehog');
    const count = TREASURES_PER_ZONE + level() - 1;
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
    if (touched.wet) {
      // A wet leaf sticks: the first tap only loosens it.
      touched.wet = false;
      touched.sprite = leafSprite(touched.shape, touched.color, false);
      layerDirty = true;
      sparks.push({ x: touched.x, y: touched.y, t: 0 });
      return;
    }
    const room = BASKET_SIZE(save.levels.basket) - save.basket;
    if (room <= 0) {
      status.textContent = 'Le panier est plein ! Vide-le au compost pour continuer.';
      return;
    }
    const target = touched;
    const reach = GRAB_REACH(save.levels.rake);
    const near = leaves
      .filter((leaf) => leaf !== target && !leaf.wet && Math.hypot(leaf.x - target.x, leaf.y - target.y) <= reach)
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
    layerDirty = true;
    if (leaves.length === 0) carpetCleared();
    paint();
  }

  function collect(leaf: Leaf): void {
    save.basket++;
    const zoneValue = 1 + LEVEL_VALUE * (level() - 1) + ORNAMENT_VALUE * state().ornaments.length;
    const golden = now() < goldenUntil ? 2 : 1;
    save.basketGold += (leaf.golden ? GOLDEN_VALUE : 1) * zoneValue * golden;
    flyers.push({ x: leaf.x, y: leaf.y, color: leaf.color, t: 0 });
    if (leaf.golden) pop(leaf.x, leaf.y, `+${GOLDEN_VALUE}`, 'is-gold');
    if (leaf.rare) {
      const isNew = !save.herbarium[leaf.rare.id];
      save.herbarium[leaf.rare.id] = (save.herbarium[leaf.rare.id] ?? 0) + 1;
      playSmallWin();
      pop(leaf.x, leaf.y, '✨', 'is-rare');
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
    playSmallWin();
    pop(h.x, h.y, h.icon, 'is-find');
    if (h.kind === 'hedgehog') {
      meet('hedgehog');
      save.gold += 25;
      status.textContent = '🦔 Un hérisson dormait sous le tas ! Il te remercie de l’avoir découvert : +25 feuilles d’or.';
    } else if (h.kind === 'deco' && h.decoId) {
      const house = loadHouse();
      const deco = WALL_DECOS.find((d) => d.id === h.decoId)!;
      if (!house.ownedStyles.includes(deco.id)) house.ownedStyles.push(deco.id);
      saveHouse(house);
      status.textContent = `🎁 Une déco pour la maison : ${deco.name} ! Elle t’attend dans « Décos murales ».`;
    } else if (h.treasure) {
      const t = h.treasure;
      const isNew = !save.treasures[t.id];
      save.treasures[t.id] = (save.treasures[t.id] ?? 0) + 1;
      save.gold += t.gold;
      status.textContent = `${t.icon} ${isNew ? 'Nouvelle trouvaille' : 'Trouvé'} : ${t.name} ! +${t.gold} feuilles d’or. ${isNew ? t.note : ''}`;
    }
    saveLeaves(save);
    refreshCollection();
    paint();
  }

  /** The ground is spotless: a small win, then the wind lays the next carpet (or the level is done). */
  function carpetCleared(): void {
    const s = state();
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
      later(1400, () => {
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
      if (s.cleared >= MAX_LEVEL) {
        const house = loadHouse();
        const deco = WALL_DECOS.find((d) => d.id === zone.spotlessDeco)!;
        if (!house.ownedStyles.includes(deco.id)) house.ownedStyles.push(deco.id);
        saveHouse(house);
        banner.textContent = '🏆 Lieu impeccable ! 🏆';
        status.textContent = `${zone.name} est impeccable ! Cadeau pour la maison : ${deco.name} (dans « Décos murales »). Tu peux rejouer tous ses niveaux.`;
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
      fallDebt += dt * FALL_RATE * (t < goldenUntil ? 3 : 1);
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
    if (t > goldenUntil && banner.classList.contains('is-gold')) banner.className = 'leaves-banner';
  }

  function randomEvent(): void {
    const options: (() => void)[] = [() => critter('squirrel'), () => critter('robin'), () => critter('ladybug'), goldenWind];
    if (zone.wet >= 0.1) options.push(() => critter('snail'));
    if (time === 'dusk') options.push(() => critter('fox'));
    if (time === 'night') options.push(() => critter('firefly'), () => critter('firefly'));
    options[Math.floor(Math.random() * options.length)]();
  }

  function goldenWind(): void {
    goldenUntil = now() + GOLDEN_WIND_SECONDS * 1000;
    banner.textContent = '🌟 Vent doré ! Les feuilles valent double';
    banner.className = 'leaves-banner is-on is-gold';
    for (let i = 0; i < 10; i++) dropLeaf(true);
  }

  /** A little creature shows up; touching it before it leaves adds it to the album. */
  function critter(id: CritterId): void {
    const info = CRITTERS.find((c) => c.id === id)!;
    const spot = randomSpot();
    const running = id === 'squirrel' || id === 'fox';
    const node = el('button', {
      class: `leaves-critter is-${id}${running ? ' is-running' : ''}`,
      type: 'button',
      'aria-label': info.name,
      text: info.icon,
      style: `left:${(spot.x / W) * 100}%;top:${(spot.y / H) * 100}%`,
    });
    node.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      node.remove();
      meet(id);
      const bonus = id === 'squirrel' ? 30 : id === 'fox' ? 40 : 10;
      save.gold += bonus;
      saveLeaves(save);
      playSmallWin();
      status.textContent = `${info.icon} ${info.name} ! ${info.note} +${bonus} feuilles d’or.`;
      paint();
    });
    critterLayer.append(node);
    later(running ? 5000 : 7000, () => node.remove());
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

  /** Draws a sprite of `size` units centred on (x, y), turned by the rotation (cos, sin) and scaled. */
  function drawTurned(g: CanvasRenderingContext2D, sprite: HTMLCanvasElement, x: number, y: number, cos: number, sin: number, size: number): void {
    g.save();
    g.transform(cos, sin, -sin, cos, x, y);
    g.drawImage(sprite, -size / 2, -size / 2, size, size);
    g.restore();
  }

  function stamp(leaf: Leaf): void {
    drawTurned(layerCtx, leaf.sprite, leaf.x, leaf.y, leaf.cos, leaf.sin, LEAF_SIZE);
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
    if (layerDirty) redrawLayer();
    ctx.drawImage(back, 0, 0, W, H);
    for (const h of hidden) ctx.drawImage(thingSprite(h.treasure?.id ?? h.kind, h.icon), h.x - 12, h.y - 12, 24, 24);
    ctx.drawImage(layer, 0, 0, W, H);
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
    // Rare and golden leaves glint.
    const glint = 0.5 + 0.5 * Math.sin(t / 180);
    for (const leaf of leaves) {
      if (!leaf.rare && !leaf.golden) continue;
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
    if (s.cleared < MAX_LEVEL) options.push(el('option', { value: '0', text: `Niveau ${s.cleared + 1} · à découvrir` }));
    for (let l = s.cleared; l >= 1; l--) options.push(el('option', { value: `${l}`, text: `Rejouer le niveau ${l} · ${LEVEL_GOAL(zone.leaves, l).toLocaleString('fr-FR')} feuilles` }));
    zoneLevel.replaceChildren(...options);
    zoneLevel.value = `${s.cleared >= MAX_LEVEL ? s.replay || MAX_LEVEL : s.replay}`;
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
        const button = el('button', { class: `leaves-zone${z === zone ? ' is-on' : ''}`, type: 'button' }, open ? `${z.name} · ${done >= MAX_LEVEL ? '🏆' : done + 1}` : `🔒 ${z.name}`);
        button.disabled = !open;
        button.title = open ? (done >= MAX_LEVEL ? 'Lieu impeccable' : `Niveau ${done + 1}`) : `${ZONES[i - 1].name} au niveau ${OPEN_AT_LEVEL} pour l’ouvrir`;
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
        const maxed = lvl >= u.max;
        const cost = u.cost(lvl);
        const button = el(
          'button',
          { class: 'leaves-upgrade', type: 'button' },
          el('span', { class: 'leaves-upgrade-icon', text: u.icon }),
          el('strong', { text: `${u.name} · niv. ${lvl + 1}` }),
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

  const COLLECTIONS: { id: Collection; label: string; total: () => string }[] = [
    { id: 'herbarium', label: '🍁 Herbier', total: () => `${Object.keys(save.herbarium).length}/${RARE_LEAVES.length}` },
    { id: 'treasures', label: '🧭 Trouvailles', total: () => `${Object.keys(save.treasures).length}/${TREASURES.length}` },
    { id: 'critters', label: '🦔 Petites bêtes', total: () => `${Object.keys(save.critters).length}/${CRITTERS.length}` },
  ];

  function refreshCollection(): void {
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
    if (openCollection === 'herbarium') {
      collectionView.replaceChildren(
        ...RARE_LEAVES.map((r) => {
          const n = save.herbarium[r.id] ?? 0;
          return card(n > 0, el('span', { class: 'leaves-page-leaf', style: `background:${n ? r.color : '#d9d2c4'}` }), r.name, n ? `${r.note} ×${n}` : r.id === 'night' ? 'Seulement la nuit' : 'Encore à trouver');
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
  };
}
