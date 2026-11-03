import './leaves.css';
import { el, topBar } from '../../dom';
import { addCoins, loadCompanion } from '../../companion/companionSave';
import { loadHouse, saveHouse } from '../../house/houseSave';
import { WALL_DECOS } from '../../house/houseStyle';
import { armSoundUnlock, muteButton, playCompost, playRustle, playSmallWin } from '../casino/fx/sound';
import { timeOfDay } from '../fishing/fishingLogic';
import { GROUND_TOP, H, LEAF_SIZE, SHAPE_COUNT, W, drawBack, drawFront, leafSprite } from './leavesArt';
import {
  AWAY_REFILL,
  BASKET_SIZE,
  CRITTERS,
  DAILY_COINS,
  DECO_CHANCE,
  FALL_RATE,
  GOLDEN_CHANCE,
  GOLDEN_VALUE,
  GOLDEN_WIND_SECONDS,
  GOLD_PER_COIN,
  LEAF_VALUE,
  LEVEL_FALL,
  LEVEL_GOAL,
  LEVEL_LEAVES,
  LEVEL_VALUE,
  LUCK,
  MAX_LEVEL,
  OPEN_AT_LEVEL,
  ORNAMENTS,
  ORNAMENT_VALUE,
  RAKE_RADIUS,
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
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const layerCtx = layer.getContext('2d')!;
  let layerDirty = true;
  let frame = 0;
  let lastTime = performance.now();
  let fallDebt = 0;
  /** Falling pauses for a breath after a place is cleaned. */
  let calmUntil = 0;
  let goldenUntil = 0;
  let nextGust = 0;
  let nextEvent = 0;
  let raking = false;
  let last: { x: number; y: number } | null = null;
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

  const canvas = el('canvas', { class: 'leaves-canvas', width: `${W}`, height: `${H}` });
  const ctx = canvas.getContext('2d')!;
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
  const progress = () => (replaying() ? state().replayProgress : state().progress);
  const capacity = () => Math.round(zone.leaves * (1 + LEVEL_LEAVES * (level() - 1)));
  const luck = () => LUCK(save.levels.luck);
  const goal = () => LEVEL_GOAL(zone.leaves, level());
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
    const cap = capacity();
    const hours = (Date.now() - state.at) / 3_600_000;
    const left = state.left < 0 ? cap : Math.min(cap, Math.round(state.left + cap * AWAY_REFILL * hours));
    back = drawBack(zone);
    front = drawFront(zone);
    leaves = [];
    falling = [];
    flyers = [];
    hidden = [];
    critterLayer.replaceChildren();
    // Some leaves gather in piles; a hedgehog may sleep under one.
    const piles = Math.min(4, Math.floor(left / 90));
    let placed = 0;
    for (let p = 0; p < piles; p++) {
      const c = randomSpot();
      for (let i = 0; i < 26 && placed < left; i++, placed++) leaves.push(makeLeaf(c.x + (Math.random() - 0.5) * 34, Math.min(H - 8, Math.max(GROUND_TOP + 4, c.y + (Math.random() - 0.5) * 26))));
      if (p === 0 && Math.random() < 0.45 && !hidden.some((h) => h.kind === 'hedgehog')) hidden.push({ x: c.x, y: c.y, icon: '🦔', kind: 'hedgehog' });
    }
    while (placed++ < left) {
      const s = randomSpot();
      leaves.push(makeLeaf(s.x, s.y));
    }
    hideTreasures();
    state.left = leaves.length;
    state.at = Date.now();
    saveLeaves(save);
    layerDirty = true;
    banner.className = 'leaves-banner';
    paintLevels();
    paint();
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

  function rake(at: { x: number; y: number }): void {
    const from = last ?? at;
    const radius = RAKE_RADIUS(save.levels.rake);
    const steps = Math.max(1, Math.ceil(Math.hypot(at.x - from.x, at.y - from.y) / (radius / 2)));
    let room = BASKET_SIZE(save.levels.basket) - save.basket;
    let taken = 0;
    for (let s = 1; s <= steps; s++) {
      const x = from.x + ((at.x - from.x) * s) / steps;
      const y = from.y + ((at.y - from.y) * s) / steps;
      for (let i = leaves.length - 1; i >= 0; i--) {
        const leaf = leaves[i];
        if (Math.abs(leaf.x - x) > radius || Math.abs(leaf.y - y) > radius || Math.hypot(leaf.x - x, leaf.y - y) > radius) continue;
        if (leaf.wet) {
          // First pass: the leaf dries and loosens.
          leaf.wet = false;
          leaf.sprite = leafSprite(leaf.shape, leaf.color, false);
          layerDirty = true;
          continue;
        }
        if (room <= 0) continue;
        leaves.splice(i, 1);
        room--;
        taken++;
        collect(leaf);
      }
      reveal(x, y, radius);
    }
    last = at;
    if (taken === 0 && room <= 0) status.textContent = 'Le panier est plein ! Vide-le au compost pour continuer.';
    if (taken > 0) {
      const t = performance.now();
      if (t - lastRustle > 90) {
        playRustle();
        lastRustle = t;
      }
      layerDirty = true;
      if (progress() >= goal()) cleaned();
      paint();
    }
  }

  function collect(leaf: Leaf): void {
    save.basket++;
    if (replaying()) state().replayProgress++;
    else state().progress++;
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

  function cleaned(): void {
    const s = state();
    const finished = level();
    save.gold += zone.levelReward * finished;
    calmUntil = now() + 9000;
    playSmallWin();
    banner.className = 'leaves-banner is-on is-clean';
    later(4000, () => (banner.className = 'leaves-banner'));
    if (replaying()) {
      s.replayProgress = 0;
      banner.textContent = `✨ Niveau ${finished} réussi ! ✨`;
      status.textContent = `Niveau ${finished} réussi encore une fois : +${(zone.levelReward * finished).toLocaleString('fr-FR')} feuilles d’or. Les trésors sont de nouveau cachés.`;
    } else {
      s.cleared++;
      s.progress = 0;
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
    hideTreasures();
    paintLevels();
    if (Math.random() < 0.6) later(1500, () => critter('cat'));
    saveLeaves(save);
    paintZones();
  }

  const down = (event: PointerEvent) => {
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    raking = true;
    last = null;
    rake(point(event));
  };
  const move = (event: PointerEvent) => {
    if (raking) rake(point(event));
  };
  const up = () => {
    raking = false;
    last = null;
    save.zones[zone.id].left = leaves.length;
    save.zones[zone.id].at = Date.now();
    saveLeaves(save);
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

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
    const cap = capacity();
    if (t > calmUntil && leaves.length + falling.length < cap) {
      fallDebt += dt * (FALL_RATE + ZONES.indexOf(zone) * 0.4) * (1 + LEVEL_FALL * (level() - 1)) * (t < goldenUntil ? 2 : 1);
      while (fallDebt >= 1) {
        fallDebt--;
        dropLeaf(false);
      }
    }
    if (t > nextGust) {
      nextGust = t + 25000 + Math.random() * 20000;
      if (leaves.length < cap * 0.9) {
        for (let i = 0; i < 26; i++) dropLeaf(true);
        if (leaves.length > 0) status.textContent = '🌬️ Un coup de vent ! Des feuilles tombent des arbres.';
      }
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
      if (f.leaf.y >= f.landY) {
        f.leaf.cos = Math.cos(f.angle);
        f.leaf.sin = Math.sin(f.angle);
        leaves.push(f.leaf);
        stamp(f.leaf);
        falling.splice(i, 1);
      }
    }
    if (flyers.length > 0) flyers = flyers.filter((f) => (f.t += dt * 2.4) < 1);
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
    for (let i = 0; i < 20; i++) dropLeaf(true);
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

  function stamp(leaf: Leaf): void {
    layerCtx.setTransform(leaf.cos, leaf.sin, -leaf.sin, leaf.cos, leaf.x, leaf.y);
    layerCtx.drawImage(leaf.sprite, -LEAF_SIZE / 2, -LEAF_SIZE / 2);
    layerCtx.setTransform(1, 0, 0, 1, 0, 0);
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
    ctx.drawImage(back, 0, 0);
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const h of hidden) ctx.fillText(h.icon, h.x, h.y);
    ctx.drawImage(layer, 0, 0);
    ctx.font = '24px sans-serif';
    for (const o of ORNAMENTS) if (state().ornaments.includes(o.id)) ctx.fillText(o.icon, o.x, o.y);
    // Falling leaves: a shadow where they will land, and bigger the higher they are.
    for (const f of falling) {
      const height = Math.max(0, f.landY - f.leaf.y);
      const lift = Math.min(1, height / 220);
      ctx.fillStyle = `rgb(40 30 20 / ${0.12 + 0.18 * (1 - lift)})`;
      ctx.beginPath();
      ctx.ellipse(f.leaf.x, f.landY, 6 + lift * 4, 2.5 + lift * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const f of falling) {
      const lift = Math.min(1, Math.max(0, f.landY - f.leaf.y) / 220);
      const scale = 1 + lift * 0.8;
      const c = Math.cos(f.angle) * scale;
      const s = Math.sin(f.angle) * scale;
      ctx.setTransform(c, s, -s, c, f.leaf.x, f.leaf.y);
      ctx.drawImage(f.leaf.sprite, -LEAF_SIZE / 2, -LEAF_SIZE / 2);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
    ctx.drawImage(front, 0, 0);
    if (raking && last) {
      // The rake's reach under the finger.
      const radius = RAKE_RADIUS(save.levels.rake);
      ctx.strokeStyle = 'rgb(255 250 235 / 0.8)';
      ctx.fillStyle = 'rgb(255 250 235 / 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(last.x, last.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = '22px sans-serif';
      ctx.fillText('🧹', last.x + radius * 0.7, last.y - radius * 0.7);
    }
    if (Math.floor(t / 250) !== Math.floor((t - dt * 1000) / 250)) paintClean();
    frame = requestAnimationFrame(tick);
  };

  // -----------------------------------------------
  // PANELS
  // -----------------------------------------------

  /** The level bar counts raked leaves; how clean the place looks is said beside it. */
  function paintClean(): void {
    const clean = Math.max(0, Math.round((1 - leaves.length / capacity()) * 100));
    const done = progress();
    cleanFill.style.width = `${Math.min(100, (done / goal()) * 100)}%`;
    cleanText.textContent = `${done.toLocaleString('fr-FR')}/${goal().toLocaleString('fr-FR')} feuilles · ${clean} % propre`;
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
    s.replayProgress = 0;
    s.left = -1;
    status.textContent = s.replay ? `Niveau ${s.replay} : ${goal().toLocaleString('fr-FR')} feuilles à ramasser.` : `Retour au niveau ${level()}, ta progression t’attendait.`;
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
