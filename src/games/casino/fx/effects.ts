import { el } from '../../../dom';
import { playBigWin, playCoinTick } from './sound';

// -----------------------------------------------
// CASINO VISUAL EFFECTS (DOM + CSS, see fx.css)
// -----------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';

/** True when the player asked the system for less motion. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** Haptic patterns, in milliseconds of buzz / pause. */
export const BUZZ = {
  bonus: [150, 80, 150, 80, 300],
  retrigger: [120, 60, 120],
  jackpot: [300, 100, 300, 100, 600],
};

/**
 * Keeps the screen awake (Screen Wake Lock) until the returned function is called,
 * for a bonus that plays on its own. Does nothing where the browser does not support it.
 */
export function keepScreenOn(): () => void {
  let lock: WakeLockSentinel | null = null;
  let active = true;
  const request = (): void => {
    if (!active || document.hidden || !('wakeLock' in navigator)) return;
    navigator.wakeLock.request('screen').then((l) => {
      if (active) lock = l;
      else void l.release();
    }).catch(() => {});
  };
  // The browser drops the lock when the page is hidden: take it again on return.
  const onVisibility = (): void => request();
  document.addEventListener('visibilitychange', onVisibility);
  request();
  return () => {
    active = false;
    document.removeEventListener('visibilitychange', onVisibility);
    void lock?.release();
    lock = null;
  };
}

/** Buzzes the phone where allowed (Android); does nothing elsewhere. */
export function buzz(pattern: number[]): void {
  navigator.vibrate?.(pattern);
}

/** Shakes an element. `strength` 1 (bump) to 3 (earthquake); toned down for reduced motion. */
export function shake(target: HTMLElement, strength: 1 | 2 | 3 = 2): void {
  const level = prefersReducedMotion() ? 1 : strength;
  target.classList.remove('fx-shake-1', 'fx-shake-2', 'fx-shake-3');
  void target.offsetWidth;
  target.classList.add(`fx-shake-${level}`);
  window.setTimeout(() => target.classList.remove(`fx-shake-${level}`), 700);
}

// -----------------------------------------------
// MARQUEE BULBS
// -----------------------------------------------

export type MarqueeMode = 'idle' | 'spin' | 'win' | 'big';

export interface Marquee {
  /** idle = slow chase, spin = fast chase, win = blink, big = rainbow flash. */
  setMode(mode: MarqueeMode): void;
}

/** Must match the `inset` of .fx-marquee in fx.css. */
const MARQUEE_INSET = 4;

/**
 * Puts a ring of light bulbs around `host` (which becomes position: relative).
 * The bulbs follow the host's border-radius and are re-spaced when it resizes.
 */
export function marquee(host: HTMLElement, perSide = 9): Marquee {
  host.classList.add('fx-marquee-host');
  const frame = el('div', { class: 'fx-marquee fx-marquee-idle', 'aria-hidden': 'true' });
  const bulbs: HTMLElement[] = [];
  for (let i = 0; i < perSide * 4; i++) {
    const bulb = el('span', { class: 'fx-bulb' });
    bulb.style.setProperty('--i', String(i % 3));
    bulbs.push(bulb);
    frame.append(bulb);
  }
  host.append(frame);

  const layout = (): void => {
    const width = host.clientWidth - 2 * MARQUEE_INSET;
    const height = host.clientHeight - 2 * MARQUEE_INSET;
    if (width <= 0 || height <= 0) return;
    const points = roundedRectOutline(width, height, cornerRadii(host, width, height));
    bulbs.forEach((bulb, i) => {
      const [x, y] = pointAlong(points, i / bulbs.length);
      bulb.style.left = `${x}px`;
      bulb.style.top = `${y}px`;
    });
  };
  layout();
  new ResizeObserver(layout).observe(host);

  return {
    setMode(mode) {
      frame.className = `fx-marquee fx-marquee-${mode}`;
    },
  };
}

type Radius = [number, number];

/** Corner radii (horizontal, vertical) of `host`, shrunk by the marquee inset; order TL, TR, BR, BL. */
function cornerRadii(host: HTMLElement, width: number, height: number): Radius[] {
  const style = getComputedStyle(host);
  const corners = [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius];
  return corners.map((value) => {
    const parts = value.split(' ');
    const resolve = (part: string, size: number) =>
      part.endsWith('%') ? (parseFloat(part) / 100) * (size + 2 * MARQUEE_INSET) : parseFloat(part) || 0;
    const rx = Math.max(0, resolve(parts[0], width) - MARQUEE_INSET);
    const ry = Math.max(0, resolve(parts[1] ?? parts[0], height) - MARQUEE_INSET);
    return [Math.min(rx, width / 2), Math.min(ry, height / 2)];
  });
}

/** Closed polyline of a rounded rectangle, clockwise from the top-left corner's end. */
function roundedRectOutline(width: number, height: number, radii: Radius[]): [number, number][] {
  const [tl, tr, br, bl] = radii;
  const points: [number, number][] = [];
  const arc = (cx: number, cy: number, [rx, ry]: Radius, from: number) => {
    for (let s = 0; s <= 12; s++) {
      const angle = from + (s / 12) * (Math.PI / 2);
      points.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
    }
  };
  arc(width - tr[0], tr[1], tr, -Math.PI / 2);
  arc(width - br[0], height - br[1], br, 0);
  arc(bl[0], height - bl[1], bl, Math.PI / 2);
  arc(tl[0], tl[1], tl, Math.PI);
  points.push(points[0]);
  return points;
}

/** Point at fraction `t` (0..1) of the polyline's total length. */
function pointAlong(points: [number, number][], t: number): [number, number] {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let remaining = t * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] && lengths[i] > 0) {
      const k = remaining / lengths[i];
      return [points[i][0] + (points[i + 1][0] - points[i][0]) * k, points[i][1] + (points[i + 1][1] - points[i][1]) * k];
    }
    remaining -= lengths[i];
  }
  return points[0];
}

// -----------------------------------------------
// WIN LINES
// -----------------------------------------------

export interface WinPath {
  /** Cells of the win as [reel, row]; for a payline, the matching cells from the left. */
  cells: [number, number][];
  /** Full payline (row per reel) to trace across the reels; omit for cluster / scatter wins. */
  path?: number[];
  /** Line colour; a palette colour is chosen when omitted. */
  color?: string;
}

const LINE_COLORS = ['#ffd23f', '#ff4fa3', '#3fe0ff', '#7dff6a', '#ff8a3d', '#b98bff', '#ff5a5a', '#5affc8', '#fff36b', '#6b9dff'];

/** More winning lines than this and drawWinLines only highlights the cells. */
const MAX_DRAWN_LINES = 3;

export interface WinLinesHandle {
  /** Removes the drawing and the cell highlights. */
  clear(): void;
}

/**
 * Traces the wins over a grid. `host` contains the cells and is the drawing area;
 * `cells[reel][row]` are the cell elements. All wins are shown together, then each one
 * in turn (looping) while `onShow(index)` lets the caller caption it.
 */
export function drawWinLines(host: HTMLElement, cells: HTMLElement[][], wins: WinPath[], onShow?: (index: number) => void): WinLinesHandle {
  // Beyond a few lines the drawing is a tangle: only the cells are highlighted.
  const drawn = wins.length <= MAX_DRAWN_LINES;
  host.classList.add('fx-lines-host');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'fx-lines');
  const box = host.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  const center = (reel: number, row: number): [number, number] => {
    const r = cells[reel][row].getBoundingClientRect();
    return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2];
  };
  const groups = wins.map((win, i) => {
    const color = win.color ?? LINE_COLORS[i % LINE_COLORS.length];
    const g = document.createElementNS(SVG_NS, 'g');
    g.style.setProperty('--fx-line', color);
    if (!drawn) {
      svg.append(g);
      return g;
    }
    if (win.path) {
      const points = win.path.map((row, reel) => center(reel, row));
      const first = cells[0][win.path[0]].getBoundingClientRect();
      points.unshift([points[0][0] - first.width / 2, points[0][1]]);
      points.push([points[points.length - 1][0] + first.width / 2, points[points.length - 1][1]]);
      const line = document.createElementNS(SVG_NS, 'polyline');
      line.setAttribute('points', points.map((p) => p.join(',')).join(' '));
      line.setAttribute('class', 'fx-line');
      g.append(line);
    }
    for (const [reel, row] of win.cells) {
      const [x, y] = center(reel, row);
      const r = cells[reel][row].getBoundingClientRect();
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(x - r.width / 2 + 2));
      rect.setAttribute('y', String(y - r.height / 2 + 2));
      rect.setAttribute('width', String(r.width - 4));
      rect.setAttribute('height', String(r.height - 4));
      rect.setAttribute('rx', '10');
      rect.setAttribute('class', 'fx-line-box');
      g.append(rect);
    }
    svg.append(g);
    return g;
  });
  host.append(svg);

  const lit = new Set<HTMLElement>();
  const light = (only: number | null): void => {
    lit.forEach((c) => c.classList.remove('fx-cell-win'));
    lit.clear();
    wins.forEach((win, i) => {
      const on = only === null || only === i;
      groups[i].style.display = on ? '' : 'none';
      if (!on) return;
      for (const [reel, row] of win.cells) {
        cells[reel][row].classList.add('fx-cell-win');
        lit.add(cells[reel][row]);
      }
    });
  };
  light(null);
  let timer = 0;
  if (wins.length > 1) {
    let step = -1;
    const next = (): void => {
      step = (step + 1) % wins.length;
      light(step);
      onShow?.(step);
      timer = window.setTimeout(next, 1300);
    };
    timer = window.setTimeout(next, 1500);
  } else if (wins.length === 1) {
    onShow?.(0);
  }
  return {
    clear() {
      window.clearTimeout(timer);
      svg.remove();
      lit.forEach((c) => c.classList.remove('fx-cell-win'));
    },
  };
}

// -----------------------------------------------
// COINS / CONFETTI
// -----------------------------------------------

/** Throws coins (or confetti) out of the middle of `host`. Particles clean themselves up. */
export function burst(host: HTMLElement, count = 24, kind: 'coins' | 'confetti' = 'coins'): void {
  const amount = prefersReducedMotion() ? Math.min(count, 8) : count;
  host.classList.add('fx-burst-host');
  for (let i = 0; i < amount; i++) {
    // Coins are drawn in CSS: the coin emoji is missing on Windows 10 and shows as an empty box.
    const p = el('span', { class: `fx-particle fx-${kind}`, 'aria-hidden': 'true' });
    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 160;
    p.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * distance - 60}px`);
    p.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
    p.style.setProperty('--hue', String(Math.floor(Math.random() * 360)));
    p.style.animationDelay = `${Math.random() * 0.15}s`;
    p.addEventListener('animationend', () => p.remove());
    host.append(p);
  }
}

/** Lets coins (or confetti) drift down across `host` from the top. Particles clean themselves up. */
export function rain(host: HTMLElement, count = 12, kind: 'coins' | 'confetti' = 'confetti'): void {
  const amount = prefersReducedMotion() ? Math.min(count, 4) : count;
  for (let i = 0; i < amount; i++) {
    const p = el('span', { class: `fx-fall fx-${kind}`, 'aria-hidden': 'true' });
    p.style.setProperty('--x', `${Math.random() * 100}%`);
    p.style.setProperty('--drift', `${Math.random() * 80 - 40}px`);
    p.style.setProperty('--rot', `${Math.random() * 360 - 180}deg`);
    p.style.setProperty('--dur', `${3.5 + Math.random() * 2.5}s`);
    p.style.setProperty('--hue', String(Math.floor(Math.random() * 360)));
    p.style.animationDelay = `${Math.random() * 1.2}s`;
    p.addEventListener('animationend', () => p.remove());
    host.append(p);
  }
}

// -----------------------------------------------
// COUNTERS AND BIG WIN
// -----------------------------------------------

/** Win tier from the payout/bet ratio: 0 normal, 1 GROS GAIN (x10), 2 ÉNORME (x25), 3 MÉGA (x50). */
export function winTier(amount: number, stake: number): 0 | 1 | 2 | 3 {
  const ratio = amount / Math.max(1, stake);
  return ratio >= 50 ? 3 : ratio >= 25 ? 2 : ratio >= 10 ? 1 : 0;
}

const TIER_TITLES = ['', 'GROS GAIN !', 'ÉNORME GAIN !', 'MÉGA GAIN !'];

/** Animates `target.textContent` from 0 to `to` with coin ticks. Returns a function that jumps to the end. */
export function countUp(target: HTMLElement, to: number, ms: number, format: (n: number) => string = String, onDone?: () => void): () => void {
  const start = performance.now();
  let lastTick = 0;
  let lastWrite = -Infinity;
  let done = false;
  let frame = 0;
  const finish = (): void => {
    if (done) return;
    done = true;
    cancelAnimationFrame(frame);
    target.textContent = format(to);
    onDone?.();
  };
  const step = (now: number): void => {
    // rAF timestamps can precede performance.now() taken before the request.
    const t = Math.max(0, Math.min(1, (now - start) / ms));
    const eased = 1 - Math.pow(1 - t, 2);
    const shown = Math.round(to * eased);
    // 25 writes a second read as a smooth count, and each write re-lays out a big glowing number: a phone lags at 60.
    if (now - lastWrite >= 40) {
      target.textContent = format(shown);
      lastWrite = now;
    }
    if (now - lastTick > 70) {
      playCoinTick();
      lastTick = now;
    }
    // Stop as soon as the final value shows: the eased tail would otherwise hang on the last units.
    if (t >= 1 || shown >= to) finish();
    else frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return finish;
}

/**
 * Full-screen big win celebration over `host`: tiered title, counter climbing to `amount`,
 * coins and fanfare. A tap skips the count, a second tap (or a few seconds) closes it.
 * `title` overrides the tier title (e.g. "JACKPOT !"); `themeClass` lets a machine restyle it;
 * `counted` shows the amount at once, for a win the player just watched being counted.
 * Resolves once closed.
 */
export interface BigWinOptions {
  themeClass?: string;
  counted?: boolean;
}

export function showBigWin(host: HTMLElement, amount: number, stake: number, title?: string, { themeClass = '', counted: alreadyCounted = false }: BigWinOptions = {}): Promise<void> {
  const tier = Math.max(1, winTier(amount, stake)) as 1 | 2 | 3;
  const value = el('strong', { class: 'fx-bigwin-amount', text: '0' });
  const overlay = el(
    'div',
    { class: `fx-bigwin fx-bigwin-${tier}${themeClass ? ` ${themeClass}` : ''}`, role: 'dialog', 'aria-live': 'assertive' },
    el('div', { class: 'fx-bigwin-halo', 'aria-hidden': 'true' }),
    el('p', { class: 'fx-bigwin-title', text: title ?? TIER_TITLES[tier] }),
    value,
    el('span', { class: 'fx-bigwin-unit', text: 'jetons' }),
    el('span', { class: 'fx-bigwin-mult', text: `×${stakeMultiple(amount, stake)} la mise` }),
    el('span', { class: 'fx-bigwin-hint', text: 'Touche pour continuer' }),
  );
  host.append(overlay);
  // What lies behind the veil freezes (fx.css): its bulbs repaint their glow every frame.
  host.classList.add('fx-bigwin-open');
  playBigWin(tier);
  rain(overlay, 10 + tier * 6, 'coins');
  const confetti = window.setInterval(() => rain(overlay, 6, 'confetti'), 1200);
  return new Promise((resolve) => {
    let closeTimer = 0;
    let counted = false;
    const close = (): void => {
      window.clearInterval(confetti);
      window.clearTimeout(closeTimer);
      overlay.classList.add('fx-bigwin-out');
      window.setTimeout(() => {
        overlay.remove();
        if (!host.querySelector(':scope > .fx-bigwin')) host.classList.remove('fx-bigwin-open');
        resolve();
      }, 250);
    };
    const done = (): void => {
      counted = true;
      closeTimer = window.setTimeout(close, 2500);
    };
    let skip = (): void => {};
    if (alreadyCounted) {
      value.textContent = amount.toLocaleString('fr-FR');
      done();
    } else skip = countUp(value, amount, 1500 + tier * 800, (n) => n.toLocaleString('fr-FR'), done);
    overlay.addEventListener('click', () => (counted ? close() : skip()));
  });
}


/** "12,5" under 10 times the stake, "340" above: how many times the bet a win is worth. */
export function stakeMultiple(amount: number, stake: number): string {
  const x = stake > 0 ? amount / stake : 0;
  return x < 10 ? x.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : Math.round(x).toLocaleString('fr-FR');
}

/**
 * Tapping `area` presses `spinButton`, so the player can spam the machine itself.
 * Uses `click` only (one per tap, no pointer duplicate) and the button's own guards.
 */
export function tapToSpin(area: HTMLElement, spinButton: HTMLButtonElement): void {
  area.dataset.spinTap = '';
  area.style.cursor = 'pointer';
  area.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('button, a, .casino-test-bar')) return;
    if (!spinButton.disabled) spinButton.click();
  });
}
// -----------------------------------------------
// OVER-THE-REELS MESSAGES (themed per machine with --fx-pop-* variables)
// -----------------------------------------------

/** From this many times the stake, the win pop counts up instead of showing the amount at once. */
const COUNTED_WIN_X = 3;

export interface WinPopOptions {
  /** A line above the amount. */
  label?: string;
  durationMs?: number;
  /** Given, a win of COUNTED_WIN_X stakes or more climbs with coin ticks under a tier title. */
  stake?: number;
}

/** A spin's win, big in the middle of `host` (position: relative) for a moment. */
export function winPop(host: HTMLElement, amount: number, { label = '', durationMs = 1600, stake }: WinPopOptions = {}): void {
  host.querySelector(':scope > .fx-winpop')?.remove();
  const ratio = stake ? amount / stake : 0;
  const counted = ratio >= COUNTED_WIN_X;
  const duration = counted ? durationMs + 900 : durationMs;
  const pop = el('div', { class: `fx-winpop${counted ? ' fx-winpop-counted' : ''}`, 'aria-hidden': 'true' });
  pop.style.animationDuration = `${duration}ms`;
  const title = label || (counted ? (ratio >= 10 ? 'GROS GAIN' : 'BEAU GAIN') : '');
  if (title) pop.append(el('span', { class: 'fx-winpop-label', text: title }));
  const value = el('b', { text: `+${amount.toLocaleString('fr-FR')}` });
  pop.append(value);
  host.append(pop);
  if (counted) countUp(value, amount, Math.min(1400, 500 + ratio * 60), (n) => `+${n.toLocaleString('fr-FR')}`);
  window.setTimeout(() => pop.remove(), duration);
}

/** A big stamp ("+10" / "TOURS GRATUITS") over `host` with turning rays; a tap or `durationMs` closes it. */
export function stampBanner(host: HTMLElement, big: string, label: string, durationMs = 2200): Promise<void> {
  const banner = el(
    'div',
    { class: 'fx-stamp', role: 'status' },
    el('div', { class: 'fx-rays', 'aria-hidden': 'true' }),
    el('p', { class: 'fx-stamp-big', text: big }),
    el('p', { class: 'fx-stamp-label', text: label }),
  );
  host.append(banner);
  burst(host, 18, 'confetti');
  return new Promise((resolve) => {
    let done = false;
    const close = (): void => {
      if (done) return;
      done = true;
      banner.classList.add('fx-stamp-out');
      window.setTimeout(() => {
        banner.remove();
        resolve();
      }, 250);
    };
    banner.addEventListener('click', close);
    window.setTimeout(close, durationMs);
  });
}

/**
 * The cells that triggered a bonus blow up one by one, then a golden blast with rays covers `host`.
 * Resolves when the blast is over; the cells keep no class afterwards.
 */
export async function igniteCells(host: HTMLElement, lit: HTMLElement[], onEach?: () => void): Promise<void> {
  const pause = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
  host.querySelector(':scope > .fx-winpop')?.remove();
  for (const cell of lit) {
    cell.classList.add('fx-ignite');
    onEach?.();
    await pause(260);
  }
  const blast = el('div', { class: 'fx-blast', 'aria-hidden': 'true' }, el('div', { class: 'fx-rays' }));
  host.append(blast);
  burst(host, 26, 'coins');
  await pause(1300);
  blast.remove();
  lit.forEach((cell) => cell.classList.remove('fx-ignite'));
}