import './aquarium.css';
import { el, topBar } from '../../dom';
import { loadCompanion, saveCompanion } from '../../companion/companionSave';
import { armSoundUnlock, muteButton, playChime, playCoinLand, playGulp, playShine, playSmallWin, playSprinkle, playWipe } from '../casino/fx/sound';
import { fishCanvas } from '../fishing/fishingArt';
import { FISH, RARITY_NAMES, SEASON_NAMES, TIME_NAMES, type Fish } from '../fishing/fishingData';
import { timeOfDay } from '../fishing/fishingLogic';
import { loadFishing } from '../fishing/fishingSave';
import { SCALE, sharpCanvas } from '../leaves/leavesArt';
import { FLOOR, TH, TW, decorationSprite, drawGlass, drawTank } from './aquariumArt';
import {
  BABIES_PER_TANK,
  BREED_CHANCE,
  DECORATIONS,
  GROW_DAYS,
  NAME_MAX,
  FAVORITE_COINS,
  FEED_COINS_PER_FISH,
  FEED_MAX,
  FIND_COINS,
  FINDS_PER_DAY,
  FOODS,
  PINCHES_PER_DAY,
  SCHOOL_AT,
  SPOTS,
  TANKS,
  favoriteFood,
  type Food,
  type Tank,
} from './aquariumData';
import { loadAquarium, saveAquarium, type Baby } from './aquariumSave';
import { VISITOR_GIFT_CHANCE, visitorGift, visitorOf } from './aquariumVisitor';

interface Swimmer {
  fish: Fish;
  sprite: HTMLCanvasElement;
  /** Body length in tank units. */
  length: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  target: { x: number; y: number };
  /** Units per second when cruising. */
  speed: number;
  facing: 1 | -1;
  /** A fry born in the tank. */
  baby: boolean;
}

interface Flake {
  x: number;
  y: number;
  vy: number;
  food: Food;
}

/** A little treasure a happy tank leaves on the sand. */
interface Find {
  x: number;
  y: number;
}

/** Cruising speed and height band per body shape: long fish dart, round ones dawdle, flat ones keep low. */
const STYLE = {
  long: { speed: 46, top: 30, bottom: FLOOR - 20 },
  round: { speed: 20, top: 40, bottom: FLOOR - 24 },
  flat: { speed: 28, top: FLOOR - 90, bottom: FLOOR - 12 },
};

const today = () => new Date().toISOString().slice(0, 10);

export function renderAquarium(root: HTMLElement): () => void {
  armSoundUnlock();
  const save = loadAquarium();
  const caught = loadFishing().caught;
  const night = timeOfDay() === 'night' || timeOfDay() === 'dusk';
  let tankIndex = Math.max(0, TANKS.findIndex((t) => t.id === save.tank));
  let swimmers: Swimmer[] = [];
  let flakes: Flake[] = [];
  let sparkles: { x: number; y: number; t: number }[] = [];
  let back = drawTank(TANKS[tankIndex].ambiance);
  const glass = drawGlass();
  let frame = 0;
  let lastTime = performance.now();
  let selected: Fish | null = null;
  /** The food in hand: taps drop a pinch of it. */
  let food: Food | null = null;
  let finds: Find[] = [];
  let hearts: { x: number; y: number; t: number }[] = [];
  let danceUntil = 0;
  let nextSurprise = performance.now() + 20000;
  let wiping = false;
  let lastGulp = 0;
  /** When the glass was just wiped clean: a gleam sweeps across it. */
  let shineAt = -Infinity;
  let lastWipe = 0;
  // The algae: a layer wiped away with the finger, back every day.
  const [algae, algaeCtx] = sharpCanvas(TW, TH);
  const ALGAE_GRID = 12;
  let dirty: boolean[] = [];
  const timers = new Set<number>();
  const later = (ms: number, action: () => void) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      action();
    }, ms);
    timers.add(id);
  };

  const tank = (): Tank => TANKS[tankIndex];
  const state = () => save.tanks[tank().id];
  const housedIn = (id: string) => TANKS.find((t) => save.tanks[t.id]?.fish.includes(id));
  const themeDone = (t: Tank) => !!save.tanks[t.id] && t.theme.fish.every((id) => save.tanks[t.id].fish.includes(id));

  // -----------------------------------------------
  // PAGE
  // -----------------------------------------------

  const coinsView = el('span', { class: 'coin-pill' });
  const canvas = el('canvas', { class: 'aqua-canvas', width: `${TW * SCALE}`, height: `${TH * SCALE}` });
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  const banner = el('div', { class: 'aqua-banner' });
  const locked = el('div', { class: 'aqua-locked' });
  const stage = el('div', { class: 'aqua-stage' }, canvas, locked, banner);
  const prev = el('button', { class: 'aqua-arrow', type: 'button', 'aria-label': 'Aquarium précédent', text: '‹' });
  const next = el('button', { class: 'aqua-arrow', type: 'button', 'aria-label': 'Aquarium suivant', text: '›' });
  const title = el('h2', { class: 'aqua-title' });
  const dots = el('div', { class: 'aqua-dots' });
  const status = el('p', { class: 'aqua-status' });
  const feed = el('div', { class: 'aqua-foods' });
  const themeView = el('div', { class: 'aqua-theme' });
  const visitorView = el('div', { class: 'aqua-visitor' });
  const visitor = visitorOf(today(), caught, save);
  const card = el('div', { class: 'aqua-card' });
  const residents = el('div', { class: 'aqua-list' });
  const guests = el('div', { class: 'aqua-list' });
  const spotsView = el('div', { class: 'aqua-spots' });
  const shop = el('div', { class: 'aqua-list' });
  const body = el('div', { class: 'aqua-body' });

  root.append(
    el(
      'main',
      { class: 'aqua-screen' },
      topBar('L’aquarium', el('span', { class: 'aqua-top-right' }, coinsView, muteButton())),
      el('div', { class: 'aqua-nav' }, prev, el('div', { class: 'aqua-nav-mid' }, title, dots), next),
      stage,
      el('div', { class: 'aqua-actions' }, feed),
      status,
      card,
      body,
    ),
  );

  // -----------------------------------------------
  // THE FISH IN THE WATER
  // -----------------------------------------------

  /** Body length of a grown fish of this species, from Eloise's record. */
  function adultLength(fish: Fish): number {
    const record = caught[fish.id]?.best ?? fish.size[0];
    // Bigger records swim bigger, within what a phone tank can hold.
    return Math.max(26, Math.min(78, 22 + record * 0.7));
  }

  const ageInDays = (born: string) => Math.max(0, Math.round((Date.parse(today()) - Date.parse(born)) / 86_400_000));

  /** A fry is born at a quarter of its parents' size and stops at a little over half of it, after GROW_DAYS days. */
  function addBaby(baby: Baby): void {
    const fish = FISH.find((f) => f.id === baby.fish)!;
    const parent = swimmers.find((s) => s.fish.id === fish.id && !s.baby);
    const growth = Math.min(1, ageInDays(baby.born) / GROW_DAYS);
    swimmers.push({
      fish,
      sprite: fishCanvas(fish, 4),
      length: (parent?.length ?? adultLength(fish)) * (0.25 + 0.3 * growth),
      x: (parent?.x ?? TW / 2) + (Math.random() - 0.5) * 20,
      y: (parent?.y ?? FLOOR / 2) + (Math.random() - 0.5) * 20,
      vx: 0,
      vy: 0,
      target: { x: parent?.x ?? TW / 2, y: parent?.y ?? FLOOR / 2 },
      speed: STYLE[fish.shape].speed * 1.2,
      facing: 1,
      baby: true,
    });
  }

  function spawn(): void {
    swimmers = [];
    if (!save.tanks[tank().id]) return;
    for (const id of state().fish) {
      const fish = FISH.find((f) => f.id === id)!;
      const length = adultLength(fish);
      const school = (caught[id]?.count ?? 0) >= SCHOOL_AT ? 3 : 1;
      const style = STYLE[fish.shape];
      const home = { x: 40 + Math.random() * (TW - 80), y: style.top + Math.random() * (style.bottom - style.top) };
      for (let n = 0; n < school; n++) {
        swimmers.push({
          fish,
          sprite: fishCanvas(fish, 4),
          length: school > 1 ? length * 0.75 : length,
          x: home.x + n * 18,
          y: home.y + n * 10,
          vx: 0,
          vy: 0,
          target: { ...home },
          speed: style.speed * (0.85 + Math.random() * 0.3),
          facing: Math.random() < 0.5 ? 1 : -1,
          baby: false,
        });
      }
    }
    for (const baby of save.babies) if (baby.tank === tank().id) addBaby(baby);
  }

  /** A school fed its favourite food in a clean tank may lay eggs: fry are born, once a day at most. */
  function maybeBreed(fish: Fish): void {
    const here = tank().id;
    if ((caught[fish.id]?.count ?? 0) < SCHOOL_AT || save.cleanDay !== today() || save.bredDay === today()) return;
    if (save.babies.filter((b) => b.tank === here).length >= BABIES_PER_TANK || Math.random() >= BREED_CHANCE) return;
    const born = Math.min(2, BABIES_PER_TANK - save.babies.filter((b) => b.tank === here).length);
    for (let i = 0; i < born; i++) {
      const baby = { fish: fish.id, tank: here, born: today() };
      save.babies.push(baby);
      addBaby(baby);
    }
    save.bredDay = today();
    saveAquarium(save);
    playChime();
    banner.textContent = `🐣 Des alevins de ${fishName(fish)} sont nés !`;
    banner.className = 'aqua-banner is-on';
    later(3500, () => (banner.className = 'aqua-banner'));
    status.textContent = `🐣 ${born > 1 ? `${born} bébés` : 'Un bébé'} ${fishName(fish)} ! Ils grandiront en ${GROW_DAYS} jours, bien nourris dans un bac propre.`;
  }

  /** The species' name, with its pet name first when Eloise gave one. */
  const fishName = (fish: Fish) => (save.names[fish.id] ? `${save.names[fish.id]} (${fish.name.toLowerCase()})` : fish.name.toLowerCase());

  function wander(s: Swimmer): void {
    const style = STYLE[s.fish.shape];
    s.target = { x: 20 + Math.random() * (TW - 40), y: style.top + Math.random() * (style.bottom - style.top) };
  }

  function eat(s: Swimmer, flake: Flake): void {
    flakes = flakes.filter((f) => f !== flake);
    const loved = favoriteFood(s.fish.id) === flake.food.id;
    const now = performance.now();
    if (now - lastGulp > 120) {
      playGulp(loved);
      lastGulp = now;
    }
    if (!loved) return;
    hearts.push({ x: s.x, y: s.y - 10, t: 0 });
    if (!s.baby) maybeBreed(s.fish);
    if (save.favorites[s.fish.id]) return;
    // First time: the favourite is learnt for good, and celebrated.
    save.favorites[s.fish.id] = flake.food.id;
    earn(FAVORITE_COINS);
    saveAquarium(save);
    playSmallWin();
    status.textContent = `💖 ${s.fish.name} adore les ${flake.food.name.toLowerCase()} ! C’est noté dans sa fiche. +${FAVORITE_COINS} 🪙`;
    paint();
  }

  function update(dt: number, t: number): void {
    for (const f of flakes) f.y = Math.min(FLOOR + 4, f.y + f.vy * dt);
    const dancing = t < danceUntil;
    swimmers.forEach((s, i) => {
      // Food first: the nearest flake pulls every fish.
      let goal = s.target;
      let hurry = 1;
      let nearest: Flake | null = null;
      for (const f of flakes) if (!nearest || Math.hypot(f.x - s.x, f.y - s.y) < Math.hypot(nearest.x - s.x, nearest.y - s.y)) nearest = f;
      if (nearest) {
        goal = nearest;
        hurry = 2.2;
        if (Math.hypot(nearest.x - s.x, nearest.y - s.y) < s.length * 0.4) eat(s, nearest);
      } else if (dancing) {
        // A happy tank: everybody swims one big round together.
        const a = t / 900 + (i / swimmers.length) * Math.PI * 2;
        goal = { x: TW / 2 + Math.cos(a) * 110, y: FLOOR / 2 + 10 + Math.sin(a) * 60 };
        hurry = 1.8;
      } else if (Math.hypot(s.target.x - s.x, s.target.y - s.y) < 10) wander(s);
      const dx = goal.x - s.x;
      const dy = goal.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      const speed = s.speed * hurry;
      s.vx += ((dx / d) * speed - s.vx) * Math.min(1, dt * 1.6);
      s.vy += ((dy / d) * speed * 0.6 - s.vy) * Math.min(1, dt * 1.6);
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (Math.abs(s.vx) > 3) s.facing = s.vx > 0 ? 1 : -1;
    });
    if (sparkles.length > 0) sparkles = sparkles.filter((p) => (p.t += dt * 0.6) < 1);
    if (hearts.length > 0) hearts = hearts.filter((h) => (h.t += dt * 0.7) < 1);
    if (themeDone(tank()) && Math.random() < dt * 3) sparkles.push({ x: Math.random() * TW, y: FLOOR - Math.random() * 40, t: 0 });
    if (t > nextSurprise) surprise(t);
  }

  /** A clean, fed tank is a happy one: now and then a dance, or a little find on the sand. */
  function surprise(t: number): void {
    nextSurprise = t + 25000 + Math.random() * 25000;
    if (save.cleanDay !== today() || save.fedDay !== today() || swimmers.length === 0) return;
    const findsToday = save.finds.day === today() ? save.finds.count : 0;
    if (findsToday < FINDS_PER_DAY && finds.length === 0 && Math.random() < 0.6) {
      finds.push({ x: 30 + Math.random() * (TW - 60), y: FLOOR + 12 + Math.random() * 20 });
      playChime();
      status.textContent = '✨ Un poisson a déposé quelque chose de brillant sur le sable… touche-le !';
      return;
    }
    danceUntil = t + 6000;
    playChime();
    status.textContent = '🎶 Tes poissons sont heureux : ils font la ronde !';
  }

  function earn(coins: number): void {
    const companion = loadCompanion();
    companion.coins += coins;
    companion.earned += coins;
    saveCompanion(companion);
    coinsView.textContent = `${companion.coins} 🪙`;
  }

  // -----------------------------------------------
  // THE ALGAE
  // -----------------------------------------------

  /** Today's algae: soft green patches on the glass, unless it was already wiped today. */
  function growAlgae(): void {
    algaeCtx.clearRect(0, 0, TW, TH);
    dirty = [];
    if (save.cleanDay === today()) return;
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * TW;
      const y = Math.random() * TH;
      const r = 14 + Math.random() * 26;
      const blob = algaeCtx.createRadialGradient(x, y, 1, x, y, r);
      blob.addColorStop(0, 'rgb(90 140 60 / 0.55)');
      blob.addColorStop(1, 'rgb(90 140 60 / 0)');
      algaeCtx.fillStyle = blob;
      algaeCtx.beginPath();
      algaeCtx.arc(x, y, r, 0, Math.PI * 2);
      algaeCtx.fill();
    }
    algaeCtx.fillStyle = 'rgb(110 150 70 / 0.28)';
    algaeCtx.fillRect(0, 0, TW, TH);
    dirty = Array.from({ length: ALGAE_GRID * ALGAE_GRID }, () => true);
  }

  function wipe(at: { x: number; y: number }): void {
    const now = performance.now();
    if (now - lastWipe > 140) {
      playWipe();
      lastWipe = now;
    }
    algaeCtx.save();
    algaeCtx.globalCompositeOperation = 'destination-out';
    const sponge = algaeCtx.createRadialGradient(at.x, at.y, 4, at.x, at.y, 22);
    sponge.addColorStop(0, 'rgb(0 0 0 / 1)');
    sponge.addColorStop(1, 'rgb(0 0 0 / 0)');
    algaeCtx.fillStyle = sponge;
    algaeCtx.beginPath();
    algaeCtx.arc(at.x, at.y, 22, 0, Math.PI * 2);
    algaeCtx.fill();
    algaeCtx.restore();
    const cw = TW / ALGAE_GRID;
    const ch = TH / ALGAE_GRID;
    for (let gy = 0; gy < ALGAE_GRID; gy++) {
      for (let gx = 0; gx < ALGAE_GRID; gx++) {
        if (Math.hypot((gx + 0.5) * cw - at.x, (gy + 0.5) * ch - at.y) < 18) dirty[gy * ALGAE_GRID + gx] = false;
      }
    }
    if (dirty.filter(Boolean).length <= dirty.length * 0.04) {
      algaeCtx.clearRect(0, 0, TW, TH);
      dirty = [];
      wiping = false;
      save.cleanDay = today();
      saveAquarium(save);
      playShine();
      shineAt = performance.now();
      for (let i = 0; i < 24; i++) sparkles.push({ x: Math.random() * TW, y: Math.random() * FLOOR, t: Math.random() * 0.3 });
      status.textContent = '🧽 La vitre brille ! Tes poissons te voient enfin bien.';
      paint();
    }
  }

  const tick = (t: number) => {
    const dt = Math.min(0.05, (t - lastTime) / 1000);
    lastTime = t;
    update(dt, t);
    ctx.drawImage(back, 0, 0, TW, TH);
    if (save.tanks[tank().id]) {
      SPOTS.forEach((spot, i) => {
        const id = state().spots[i];
        if (id) ctx.drawImage(decorationSprite(id), spot.x - 32, spot.y - 68, 64, 72);
      });
    }
    const bubbler = save.tanks[tank().id]?.spots.indexOf('bubbler') ?? -1;
    if (bubbler >= 0) {
      for (let i = 0; i < 6; i++) {
        const y = SPOTS[bubbler].y - 14 - ((t / 14 + i * 40) % 240);
        ctx.strokeStyle = 'rgb(255 255 255 / 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(SPOTS[bubbler].x + Math.sin(t / 300 + i) * 3, y, 2 + (i % 3), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    for (const f of flakes) drawFood(f, t);
    for (const f of finds) {
      const shine = 0.5 + 0.5 * Math.sin(t / 200);
      ctx.fillStyle = `rgb(255 245 180 / ${0.3 + shine * 0.4})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(decorationSprite('shell'), f.x - 10, f.y - 14, 20, 22);
    }
    ctx.imageSmoothingEnabled = false;
    for (const s of swimmers) {
      const h = (s.length * 11) / 18;
      const wiggle = Math.sin(t / (90 + s.speed) + s.x) * 0.06;
      if (s.fish.pattern === 'glow' && (night || tank().ambiance === 'night')) {
        const glow = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, s.length);
        glow.addColorStop(0, 'rgb(255 250 180 / 0.45)');
        glow.addColorStop(1, 'rgb(255 250 180 / 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.length, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(s.facing, 1);
      ctx.rotate(wiggle);
      ctx.drawImage(s.sprite, -s.length / 2, -h / 2, s.length, h);
      ctx.restore();
    }
    ctx.imageSmoothingEnabled = true;
    for (const p of sparkles) {
      ctx.fillStyle = `rgb(255 250 200 / ${1 - p.t})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y - p.t * 60, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    for (const h of hearts) {
      ctx.globalAlpha = 1 - h.t;
      ctx.fillText('💖', h.x, h.y - h.t * 30);
    }
    ctx.globalAlpha = 1;
    if (dirty.length > 0) ctx.drawImage(algae, 0, 0, TW, TH);
    ctx.drawImage(glass, 0, 0, TW, TH);
    // The clean glass gleams: a bright diagonal band crosses it once.
    const gleam = (t - shineAt) / 1400;
    if (gleam >= 0 && gleam <= 1) {
      const x = -80 + gleam * (TW + 240);
      ctx.save();
      // Slanted like light on glass: x shifts left as y goes down.
      ctx.transform(1, 0, -0.4, 1, 0, 0);
      const band = ctx.createLinearGradient(x - 70, 0, x + 70, 0);
      band.addColorStop(0, 'rgb(255 255 255 / 0)');
      band.addColorStop(0.5, 'rgb(255 255 255 / 0.75)');
      band.addColorStop(1, 'rgb(255 255 255 / 0)');
      ctx.fillStyle = band;
      ctx.fillRect(x - 70, 0, 140, TH);
      ctx.restore();
    }
    frame = requestAnimationFrame(tick);
  };

  /** Each food has its own look: thin flakes that flutter, wriggling worms, round pellets, shiny peas. */
  function drawFood(f: Flake, t: number): void {
    const seed = f.x * 7 + f.vy;
    ctx.save();
    ctx.translate(f.x, f.y);
    if (f.food.id === 'flakes') {
      ctx.rotate(Math.sin(t / 250 + seed) * 1.2);
      ctx.fillStyle = f.food.color;
      ctx.beginPath();
      ctx.moveTo(-3, -1);
      ctx.lineTo(2, -2);
      ctx.lineTo(3, 1);
      ctx.lineTo(-2, 2);
      ctx.fill();
      ctx.fillStyle = 'rgb(255 230 160 / 0.8)';
      ctx.fillRect(-1, -1, 2, 1);
    } else if (f.food.id === 'worms') {
      ctx.strokeStyle = f.food.color;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const x = -4 + i * 1.4;
        const y = Math.sin(t / 120 + seed + i) * 1.4;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else if (f.food.id === 'pellets') {
      const ball = ctx.createRadialGradient(-0.8, -0.8, 0.3, 0, 0, 2.4);
      ball.addColorStop(0, '#c48a55');
      ball.addColorStop(1, f.food.color);
      ctx.fillStyle = ball;
      ctx.beginPath();
      ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const pea = ctx.createRadialGradient(-1, -1, 0.4, 0, 0, 3);
      pea.addColorStop(0, '#c8f0a0');
      pea.addColorStop(1, f.food.color);
      ctx.fillStyle = pea;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgb(255 255 255 / 0.7)';
      ctx.beginPath();
      ctx.arc(-1, -1.2, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function point(event: PointerEvent): { x: number; y: number } {
    const box = canvas.getBoundingClientRect();
    return { x: ((event.clientX - box.left) * TW) / box.width, y: ((event.clientY - box.top) * TH) / box.height };
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (!save.tanks[tank().id]) return;
    const at = point(event);
    // The glass first: while algae cover it, the finger wipes.
    if (dirty.length > 0) {
      wiping = true;
      canvas.setPointerCapture(event.pointerId);
      wipe(at);
      return;
    }
    const found = finds.find((f) => Math.hypot(f.x - at.x, f.y - at.y) < 18);
    if (found) {
      finds = finds.filter((f) => f !== found);
      const coins = FIND_COINS[0] + Math.floor(Math.random() * (FIND_COINS[1] - FIND_COINS[0] + 1));
      save.finds = { day: today(), count: (save.finds.day === today() ? save.finds.count : 0) + 1 };
      saveAquarium(save);
      earn(coins);
      playCoinLand('small');
      status.textContent = `🐚 Un joli coquillage avec une pièce dedans : +${coins} 🪙`;
      return;
    }
    if (food) {
      drop(at);
      return;
    }
    const hit = swimmers.find((s) => Math.abs(s.x - at.x) < s.length / 2 + 6 && Math.abs(s.y - at.y) < s.length / 3 + 6);
    if (hit) {
      openCard(hit.fish);
      return;
    }
    // A tap on the glass: the fish come and look.
    for (const s of swimmers) s.target = { x: at.x + (Math.random() - 0.5) * 50, y: Math.min(FLOOR - 12, at.y + (Math.random() - 0.5) * 30) };
  });
  canvas.addEventListener('pointermove', (event) => {
    if (wiping && dirty.length > 0) wipe(point(event));
  });
  const stopWiping = () => (wiping = false);
  canvas.addEventListener('pointerup', stopWiping);
  canvas.addEventListener('pointercancel', stopWiping);

  /** A pinch of the food in hand, dropped where the finger is. */
  function drop(at: { x: number; y: number }): void {
    if (!food) return;
    if (save.fedDay !== today()) {
      save.fedDay = today();
      save.pinches = 0;
      const residentsCount = TANKS.reduce((n, t) => n + (save.tanks[t.id]?.fish.length ?? 0), 0);
      const gift = Math.min(FEED_MAX, residentsCount * FEED_COINS_PER_FISH);
      earn(gift);
      playCoinLand('small');
      status.textContent = `Miam ! Tes poissons te remercient : +${gift} 🪙. Trouve le plat préféré de chacun !`;
    }
    if (save.pinches >= PINCHES_PER_DAY) return;
    save.pinches++;
    saveAquarium(save);
    playSprinkle();
    for (let i = 0; i < 4; i++) flakes.push({ x: at.x + (Math.random() - 0.5) * 16, y: Math.min(at.y, FLOOR - 20) + (Math.random() - 0.5) * 6, vy: 18 + Math.random() * 12, food });
    if (save.pinches >= PINCHES_PER_DAY) {
      food = null;
      status.textContent = 'Plus de nourriture pour aujourd’hui, ils ont le ventre plein !';
    }
    paintFoods();
  }

  let swipeX: number | null = null;
  stage.addEventListener('touchstart', (e) => (swipeX = e.touches[0].clientX), { passive: true });
  stage.addEventListener('touchend', (e) => {
    // Wiping the glass or dropping food is not a swipe to the next tank.
    if (swipeX === null || dirty.length > 0 || food) return;
    const dx = e.changedTouches[0].clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 60) goTo(tankIndex + (dx < 0 ? 1 : -1));
  });

  // -----------------------------------------------
  // ACTIONS
  // -----------------------------------------------

  function goTo(index: number): void {
    if (index < 0 || index >= TANKS.length) return;
    tankIndex = index;
    save.tank = tank().id;
    if (save.tanks[tank().id]) saveAquarium(save);
    back = drawTank(tank().ambiance);
    flakes = [];
    sparkles = [];
    selected = null;
    spawn();
    paint();
  }

  function spend(price: number): boolean {
    const companion = loadCompanion();
    if (companion.coins < price) return false;
    companion.coins -= price;
    saveCompanion(companion);
    return true;
  }

  function openTank(): void {
    if (!spend(tank().price)) return;
    save.tanks[tank().id] = { fish: [], spots: SPOTS.map(() => null) };
    save.tank = tank().id;
    saveAquarium(save);
    playSmallWin();
    status.textContent = `${tank().name} est à toi ! Accueille tes premiers poissons.`;
    paint();
  }

  function welcome(id: string): void {
    const s = state();
    if (s.fish.length >= tank().places) return;
    const from = housedIn(id);
    if (from) save.tanks[from.id].fish = save.tanks[from.id].fish.filter((f) => f !== id);
    s.fish.push(id);
    // The fry move with their family.
    for (const baby of save.babies) if (baby.fish === id) baby.tank = tank().id;
    afterChange(`${FISH.find((f) => f.id === id)!.name} arrive dans ${tank().name.toLowerCase()} !`);
  }

  function release(id: string): void {
    state().fish = state().fish.filter((f) => f !== id);
    // The fry wait with their family in the holding pond (no tank) until they come back.
    for (const baby of save.babies) if (baby.fish === id) baby.tank = '';
    if (selected?.id === id) selected = null;
    const fry = save.babies.some((b) => b.fish === id);
    afterChange(`${FISH.find((f) => f.id === id)!.name} rejoint le vivier${fry ? ', avec ses petits' : ''}. Tu peux l’accueillir à nouveau quand tu veux.`);
  }

  function afterChange(message: string): void {
    status.textContent = message;
    const t = tank();
    if (themeDone(t) && !save.themes.includes(t.id)) {
      save.themes.push(t.id);
      if (!save.decorations.includes(t.theme.reward)) save.decorations.push(t.theme.reward);
      const free = state().spots.indexOf(null);
      if (free >= 0) state().spots[free] = t.theme.reward;
      const reward = DECORATIONS.find((d) => d.id === t.theme.reward)!;
      banner.textContent = `✨ ${t.theme.name} au complet ! ✨`;
      banner.className = 'aqua-banner is-on';
      later(3500, () => (banner.className = 'aqua-banner'));
      status.textContent = `${t.theme.name} : le thème est complet ! Cadeau pour le bac : ${reward.name}.`;
      playSmallWin();
    }
    saveAquarium(save);
    spawn();
    paint();
  }

  /** The visitor of the day: their wish, whether the tanks meet it, and the button to show them. */
  function paintVisitor(): void {
    if (!visitor) {
      visitorView.replaceChildren();
      return;
    }
    const done = save.visitedDay === today();
    const met = visitor.isMet(save);
    const show = el('button', { class: 'aqua-small', type: 'button', text: done ? 'Merci, à demain !' : met ? `Lui montrer · +${visitor.coins} 🪙` : 'Pas encore…' });
    show.disabled = done || !met;
    show.addEventListener('click', () => {
      save.visitedDay = today();
      earn(visitor.coins);
      const gift = Math.random() < VISITOR_GIFT_CHANCE ? visitorGift(save) : null;
      if (gift) save.decorations.push(gift);
      saveAquarium(save);
      playChime();
      status.textContent = gift
        ? `${visitor.icon} « C’est magnifique, merci ! » +${visitor.coins} 🪙, et un cadeau pour tes bacs : ${DECORATIONS.find((d) => d.id === gift)!.name} !`
        : `${visitor.icon} « C’est magnifique, merci ! » +${visitor.coins} 🪙. Reviens demain, quelqu’un d’autre passera.`;
      paint();
    });
    visitorView.replaceChildren(
      el('span', { class: 'aqua-visitor-icon', text: visitor.icon }),
      el('div', {}, el('strong', { text: `Le visiteur du jour : ${visitor.name}` }), el('span', { text: `« ${visitor.wish} »` })),
      show,
    );
  }

  /** The food chips: pick one, then each tap in the tank drops a pinch of it. */
  function paintFoods(): void {
    const left = save.fedDay === today() ? PINCHES_PER_DAY - save.pinches : PINCHES_PER_DAY;
    feed.replaceChildren(
      ...FOODS.map((f) => {
        const chip = el('button', { class: `aqua-food${food === f ? ' is-on' : ''}`, type: 'button', text: `${f.icon} ${f.name}` });
        chip.disabled = left <= 0 || swimmers.length === 0;
        chip.addEventListener('click', () => {
          food = food === f ? null : f;
          if (food) status.textContent = `${f.icon} Touche l’eau pour lâcher une pincée de ${f.name.toLowerCase()}.`;
          paintFoods();
        });
        return chip;
      }),
      el('small', { class: 'aqua-pinches', text: left > 0 ? `${left} pincée${left > 1 ? 's' : ''} pour aujourd’hui` : 'Rassasiés jusqu’à demain' }),
    );
  }

  function setSpot(index: number, id: string | null): void {
    state().spots[index] = id;
    saveAquarium(save);
    paint();
  }

  function buy(id: string): void {
    const deco = DECORATIONS.find((d) => d.id === id)!;
    if (!spend(deco.price)) return;
    save.decorations.push(id);
    const free = state().spots.indexOf(null);
    if (free >= 0) state().spots[free] = id;
    saveAquarium(save);
    playSmallWin();
    status.textContent = `${deco.name} est installé${free >= 0 ? ' dans le bac' : ' : choisis où le poser'} !`;
    paint();
  }

  prev.addEventListener('click', () => goTo(tankIndex - 1));
  next.addEventListener('click', () => goTo(tankIndex + 1));

  // -----------------------------------------------
  // PANELS
  // -----------------------------------------------

  const fishIcon = (fish: Fish) => {
    const art = fishCanvas(fish, 2);
    art.classList.add('aqua-fish-icon');
    return art;
  };

  /** A list row that opens the fish's card when touched anywhere but its button. */
  function cardRow(fish: Fish, row: HTMLElement): HTMLElement {
    row.classList.add('is-clickable');
    row.addEventListener('click', (event) => {
      if (!(event.target as Element).closest('button')) openCard(fish);
    });
    return row;
  }

  /** Shows a fish's card and brings it into view. */
  function openCard(fish: Fish): void {
    selected = fish;
    paintCard();
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function paintCard(): void {
    if (!selected) {
      card.replaceChildren();
      return;
    }
    const fish = selected;
    const c = caught[fish.id];
    const favorite = FOODS.find((f) => f.id === save.favorites[fish.id]);
    const babies = save.babies.filter((b) => b.fish === fish.id);
    const theme = TANKS.find((t) => t.theme.fish.includes(fish.id));
    const grown = babies.filter((b) => ageInDays(b.born) >= GROW_DAYS).length;
    // Naming happens in the card itself: the viewer's frame refuses prompt().
    const input = el('input', { class: 'aqua-name-input', type: 'text', maxlength: `${NAME_MAX}`, placeholder: 'Lui donner un nom…', value: save.names[fish.id] ?? '' });
    const saveName = el('button', { class: 'aqua-small', type: 'button', text: 'OK' });
    saveName.addEventListener('click', () => {
      const name = input.value.trim().slice(0, NAME_MAX);
      if (name) save.names[fish.id] = name;
      else delete save.names[fish.id];
      saveAquarium(save);
      status.textContent = name ? `${fish.name} s’appelle maintenant ${name} 💕` : `${fish.name} n’a plus de petit nom.`;
      paint();
    });
    card.replaceChildren(
      fishIcon(fish),
      el(
        'div',
        {},
        el('strong', { text: save.names[fish.id] ? `${save.names[fish.id]} · ${fish.name}` : fish.name }),
        el('span', { text: `Record ${c?.best ?? '?'} cm · attrapé ${c?.count ?? 0} fois` }),
        el('span', { text: `${RARITY_NAMES[fish.rarity]} · ${fish.times ? `se pêche ${fish.times.map((t) => TIME_NAMES[t]).join(', ')}` : 'se pêche à toute heure'}${fish.season ? `, ${SEASON_NAMES[fish.season]}` : ''}` }),
        ...(theme ? [el('span', { text: `Thème : ${theme.theme.name} (${theme.name.toLowerCase()})` })] : []),
        el('span', { text: favorite ? `Plat préféré : ${favorite.icon} ${favorite.name}` : 'Plat préféré : ❔ à découvrir' }),
        ...(babies.length > 0 ? [el('span', { text: `🐣 ${babies.length} alevin${babies.length > 1 ? 's' : ''} né${babies.length > 1 ? 's' : ''} ici${grown > 0 ? `, dont ${grown} déjà grand${grown > 1 ? 's' : ''}` : ''}` })] : []),
        el('small', { text: fish.note }),
        el('span', { class: 'aqua-name' }, input, saveName),
      ),
    );
  }

  function paint(): void {
    const t = tank();
    const coins = loadCompanion().coins;
    coinsView.textContent = `${coins} 🪙`;
    title.textContent = t.name;
    dots.replaceChildren(...TANKS.map((other, i) => el('span', { class: `aqua-dot${i === tankIndex ? ' is-on' : ''}${save.tanks[other.id] ? '' : ' is-locked'}` })));
    prev.disabled = tankIndex === 0;
    next.disabled = tankIndex === TANKS.length - 1;
    paintCard();
    const s = save.tanks[t.id];
    if (!s) {
      const button = el('button', { class: 'button', type: 'button', text: `Ouvrir pour ${t.price} 🪙` });
      button.disabled = coins < t.price;
      button.addEventListener('click', openTank);
      locked.replaceChildren(el('strong', { text: `🔒 ${t.name}` }), el('span', { text: `Thème : ${t.theme.name}` }), button);
      locked.hidden = false;
      feed.hidden = true;
      body.replaceChildren();
      return;
    }
    locked.hidden = true;
    feed.hidden = false;
    paintFoods();

    // The theme, species by species.
    themeView.replaceChildren(
      el('strong', { text: `${themeDone(t) ? '✨ ' : ''}Thème : ${t.theme.name} · ${t.theme.fish.filter((id) => s.fish.includes(id)).length}/${t.theme.fish.length}` }),
      el(
        'div',
        { class: 'aqua-chips' },
        ...t.theme.fish.map((id) => {
          const fish = FISH.find((f) => f.id === id)!;
          const here = s.fish.includes(id);
          return el('span', { class: `aqua-chip${here ? ' is-here' : ''}`, text: caught[id] ? `${here ? '✓ ' : ''}${fish.name}` : '❔ Pas encore pêché' });
        }),
      ),
    );

    // Who lives here.
    residents.replaceChildren(
      ...s.fish.map((id) => {
        const fish = FISH.find((f) => f.id === id)!;
        const out = el('button', { class: 'aqua-small', type: 'button', text: 'Sortir du bac' });
        out.addEventListener('click', () => release(id));
        const row = el('div', { class: 'aqua-row' }, fishIcon(fish), el('span', { text: `${save.names[id] ? `${save.names[id]} · ` : ''}${fish.name}${(caught[id]?.count ?? 0) >= SCHOOL_AT ? ' (banc)' : ''}${save.babies.some((b) => b.fish === id) ? ' 🐣' : ''}` }), out);
        return cardRow(fish, row);
      }),
    );
    if (s.fish.length === 0) residents.replaceChildren(el('p', { class: 'aqua-note', text: 'Personne pour l’instant : accueille un poisson ci-dessous.' }));

    // Who could come: every species caught, the theme first.
    const candidates = FISH.filter((f) => caught[f.id] && !s.fish.includes(f.id)).sort((a, b) => Number(t.theme.fish.includes(b.id)) - Number(t.theme.fish.includes(a.id)));
    const full = s.fish.length >= t.places;
    guests.replaceChildren(
      ...candidates.map((fish) => {
        const elsewhere = housedIn(fish.id);
        const add = el('button', { class: 'aqua-small', type: 'button', text: elsewhere ? 'Déménager ici' : 'Accueillir' });
        add.disabled = full;
        add.addEventListener('click', () => welcome(fish.id));
        return cardRow(fish, el('div', { class: 'aqua-row' }, fishIcon(fish), el('span', { text: `${fish.name}${t.theme.fish.includes(fish.id) ? ' ✨' : ''}${elsewhere ? ` · dans ${elsewhere.name.toLowerCase()}` : ''}` }), add));
      }),
    );
    if (candidates.length === 0) guests.replaceChildren(el('p', { class: 'aqua-note', text: 'Va pêcher de nouvelles espèces pour les accueillir ici !' }));

    // Decorations: one choice per spot, then the shop.
    spotsView.replaceChildren(
      ...SPOTS.map((_, i) => {
        const select = el('select', { class: 'aqua-select', 'aria-label': `Emplacement ${i + 1}` });
        select.append(el('option', { value: '', text: `Emplacement ${i + 1} : vide` }), ...save.decorations.map((id) => el('option', { value: id, text: DECORATIONS.find((d) => d.id === id)!.name })));
        select.value = s.spots[i] ?? '';
        select.addEventListener('change', () => setSpot(i, select.value || null));
        return select;
      }),
    );
    shop.replaceChildren(
      ...DECORATIONS.filter((d) => d.price > 0 && !save.decorations.includes(d.id)).map((d) => {
        const button = el('button', { class: 'aqua-small', type: 'button', text: `${d.price} 🪙` });
        button.disabled = coins < d.price;
        button.addEventListener('click', () => buy(d.id));
        const art = decorationSprite(d.id).cloneNode() as HTMLCanvasElement;
        art.getContext('2d')!.drawImage(decorationSprite(d.id), 0, 0);
        art.className = 'aqua-deco-icon';
        return el('div', { class: 'aqua-row' }, art, el('span', { text: d.name }), button);
      }),
    );

    paintVisitor();
    body.replaceChildren(
      visitorView,
      themeView,
      el('h3', { class: 'aqua-section', text: `Les habitants · ${s.fish.length}/${t.places}` }),
      residents,
      el('h3', { class: 'aqua-section', text: 'Le vivier' }),
      el('p', { class: 'aqua-note', text: `Tous les poissons déjà pêchés attendent ici. Une espèce pêchée ${SCHOOL_AT} fois arrive en petit banc.` }),
      guests,
      el('h3', { class: 'aqua-section', text: 'Décorer' }),
      spotsView,
      shop,
    );
  }

  spawn();
  growAlgae();
  paint();
  if (!status.textContent) {
    status.textContent =
      save.cleanDay !== today() ? '🧽 Des algues ont poussé sur la vitre : frotte-la du doigt !' : save.fedDay !== today() ? 'Tes poissons ont faim : choisis une nourriture et touche l’eau.' : 'Tes poissons nagent tranquillement.';
  }
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    timers.forEach((id) => window.clearTimeout(id));
  };
}
