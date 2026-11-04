import './olympus.css';
import { el, topBar, type BackLink } from '../../../dom';
import { bet, chips, noteWin, pay } from '../chips';
import {
  armSoundUnlock, burst, countUp, drawWinLines, marquee, muteButton, payoutTable, paylineDiagrams, playBigWin,
  playBonusTrigger, playLose, playReelStop, playMedusaAwake, playSmallWin, playSuspense, playSuspenseHit, playSuspenseMiss, playSpinLoop, rulesBlock, shake, shapeDiagram, showBigWin,
  tapToSpin, winTier, winPop, stampBanner, igniteCells, type WinLinesHandle,
  keepScreenOn,
} from '../fx';
import { BUZZ, buzz } from '../fx';
import { CASINO_TEST_BUTTONS, takeForced, testBar } from '../fx'; // TEST-BUTTONS
import {
  BETS,
  COLS,
  FREE_SPINS_BY_SCATTERS,
  FREE_SPINS_MIN_X,
  FREE_RETRIGGER_SPINS,
  LINES,
  MIN_SCATTERS,
  PAY_SCALE,
  ROWS,
  SCATTER,
  SYMBOLS,
  MEDUSA,
  chipsFor,
  freeSpinsFor,
  lineWins,
  playFreeSpins,
  scatterCount,
  spinGrid,
  winMult,
  medusaReels,
  type FreeSpinsResult,
  type OlympusForce,
  type Grid,
  type LineWin,
} from './olympusLogic';
import { OLYMPUS_DEFS, TEMPLE, MEDUSA_HEAD } from './olympusArt';

const BACK_CASINO: BackLink = { href: '#/casino', label: 'Casino' };
/** This machine's key in the casino lobby, which shows its best win. */
const LOBBY_ID = 'olympe';
const REEL_MS = 650;
const REEL_STAGGER = 140;
const TENSION_MS = 1300;
const FREE_REEL_MS = 550;
const FREE_STAGGER = 140;
/** Pause after a free spin, so its result can be read before the next one rolls. */
const FREE_PAUSE_MS = 900;
const FREE_WIN_PAUSE_MS = 1700;
/** A win of 3 stakes or more climbs in its pop: the pause waits for it. */
const FREE_COUNTED_PAUSE_MS = 2500;
const SYMBOL_NAMES = ['Valet', 'Dame', 'Roi', 'As', 'Amphore', 'Bouclier', 'Chouette', 'Trident', 'Medusa'];

export function renderOlympus(root: HTMLElement): () => void {
  armSoundUnlock();
  const timers = new Set<number>();
  let disposed = false;
  /** Set while a bonus plays: lets the screen sleep again. */
  let releaseScreen: (() => void) | null = null;
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (!disposed) resolve();
      }, ms);
      timers.add(id);
    });

  let betIndex = 0;
  let busy = false;
  let lines: WinLinesHandle | null = null;

  const balance = el('span', { class: 'oly-balance' });
  /** cells[col][row], the layout drawWinLines expects. */
  const cells: HTMLElement[][] = [];
  const reels: HTMLElement[] = [];
  for (let c = 0; c < COLS; c++) {
    cells.push([]);
    for (let r = 0; r < ROWS; r++) {
      const cell = el('div', { class: 'oly-cell' });
      paintCell(cell, randomSymbol());
      cells[c].push(cell);
    }
    // The tall figure belongs to the reel: shown instead of the five cells when the reel is one stack.
    reels.push(el('div', { class: 'oly-reel' }, ...cells[c], el('div', { class: 'oly-tall', 'aria-hidden': 'true' })));
  }
  const cellViews = cells.flat();
  const grid = el('div', { class: 'oly-grid' }, ...reels);
  const featureBar = el('div', { class: 'oly-feature-bar' });
  const sky = el('div', { class: 'oly-sky' }, grid);
  const temple = el(
    'div',
    { class: 'oly-temple' },
    el('div', { class: 'oly-pediment' }, el('span', { text: 'LE REGARD DE MEDUSA' })),
    el('div', { class: 'oly-colonnade' }, el('div', { class: 'oly-column', 'aria-hidden': 'true' }), sky, el('div', { class: 'oly-column', 'aria-hidden': 'true' })),
    el('div', { class: 'oly-stylobate' }),
  );
  const machine = el('div', { class: 'oly-machine' }, featureBar, temple);
  const lights = marquee(machine, 12);
  const message = el('div', { class: 'oly-message', role: 'status' });
  const intro = (): void => {
    message.textContent = '3 temples 🏛️ ou plus déclenchent les tours gratuits !';
    artify(message);
  };
  intro();

  const betLabel = el('span', { class: 'oly-bet-value' });
  const minus = el('button', { class: 'button button-secondary oly-bet-step', type: 'button', text: '−' });
  const plus = el('button', { class: 'button button-secondary oly-bet-step', type: 'button', text: '+' });
  const spinButton = el('button', { class: 'button oly-spin', type: 'button', text: 'Tourner' });
  const tableButton = el('button', { class: 'button button-secondary', type: 'button', text: 'Comment on gagne ?' });
  const tableHost = el('div', { class: 'oly-paytable' });
  tableHost.hidden = true;

  const screen = el(
    'main',
    { class: 'oly-screen' },
    machine,
    message,
    el('div', { class: 'oly-bet' }, minus, el('div', {}, el('div', { class: 'oly-small', text: `Mise (${LINES.length} lignes)` }), betLabel), plus),
    spinButton,
    tableButton,
    tableHost,
  );
  if (CASINO_TEST_BUTTONS) tableButton.after(testBar([{ label: '3 scatters', outcome: 'free3' }, { label: '5 scatters (100 tours)', outcome: 'free5' }, { label: 'Écran rempli de Medusa', outcome: 'flood' }])); // TEST-BUTTONS
  tapToSpin(machine, spinButton);
  root.replaceChildren(topBar('Le Regard de Medusa', el('span', { class: 'oly-top-right' }, balance, muteButton()), BACK_CASINO), screen);
  screen.insertAdjacentHTML('afterbegin', OLYMPUS_DEFS);

  const currentBet = () => BETS[betIndex];
  const cellAt = (col: number, row: number) => cells[col][row];

  function refresh(): void {
    balance.textContent = `${chips().toLocaleString('fr-FR')} jetons`;
    betLabel.textContent = `${currentBet()} jetons`;
    minus.disabled = busy || betIndex === 0;
    plus.disabled = busy || betIndex === BETS.length - 1;
    spinButton.disabled = busy || chips() < currentBet();
    if (!tableHost.hidden) {
      tableHost.replaceChildren(...paytable(currentBet()));
      artify(tableHost);
    }
  }

  function setMessage(text: string, extra = ''): void {
    message.textContent = text;
    message.className = `oly-message${extra ? ` ${extra}` : ''}`;
  }

  minus.addEventListener('click', () => {
    betIndex = Math.max(0, betIndex - 1);
    refresh();
  });
  plus.addEventListener('click', () => {
    betIndex = Math.min(BETS.length - 1, betIndex + 1);
    refresh();
  });
  tableButton.addEventListener('click', () => {
    tableHost.hidden = !tableHost.hidden;
    refresh();
  });
  spinButton.addEventListener('click', () => void spin());

  async function spin(): Promise<void> {
    const stake = currentBet();
    if (busy || !bet(stake)) return;
    busy = true;
    clearLines();
    setMessage('');
    lights.setMode('spin');
    refresh();

    const force = CASINO_TEST_BUTTONS ? takeForced<OlympusForce>() : null; // TEST-BUTTONS
    const result = spinGrid(Math.random, false, force === 'flood' ? 'free3' : force ?? undefined); // TEST-BUTTONS
    await animateReels(result, false);
    if (disposed) return;

    const wins = lineWins(result);
    const won = chipsFor(winMult(wins), stake);
    const scatters = scatterCount(result);
    if (won > 0) {
      pay(won);
      noteWin(LOBBY_ID, won, stake);
      showLines(wins);
      lights.setMode('win');
      if (winTier(won, stake) > 0) {
        shake(machine, 2);
        winPop(sky, won);
        refresh();
        await showBigWin(document.body, won, stake);
      } else {
        playSmallWin();
        burst(sky, Math.min(24, 6 + Math.round((won / stake) * 4)), 'coins');
        winPop(sky, won, { stake });
      }
    } else if (scatters < MIN_SCATTERS) {
      lights.setMode('idle');
      playLose();
      setMessage('Rien cette fois…');
    }
    refresh();

    if (scatters >= MIN_SCATTERS) {
      const startSpins = freeSpinsFor(scatters);
      const feature = playFreeSpins(Math.random, startSpins, force === 'flood' ? 2 : 0); // TEST-BUTTONS
      // The outcome is decided now: pay it now, so a reload or leaving the screen never loses it.
      pay(chipsFor(feature.mult, stake));
      const pending: PendingFeature = { feature, startSpins, stake, next: 0 };
      savePending(pending);
      await wait(won > 0 ? 900 : 300);
      await runFreeSpins(pending, true);
    }
    busy = false;
    timers.add(window.setTimeout(() => { if (!busy) lights.setMode('idle'); }, 4000));
    refresh();
  }

  function clearLines(): void {
    lines?.clear();
    lines = null;
  }

  function showLines(wins: LineWin[]): void {
    clearLines();
    if (wins.length === 0) return;
    lines = drawWinLines(
      grid,
      cells,
      wins.map((w) => ({ cells: LINES[w.line].slice(0, w.count).map((row, col) => [col, row] as [number, number]), path: LINES[w.line] })),
    );
  }

  async function animateReels(result: Grid, fast: boolean): Promise<void> {
    cellViews.forEach((v) => (v.className = 'oly-cell oly-rolling fx-streak'));
    reels.forEach((reel) => (reel.className = 'oly-reel'));
    machine.classList.remove('oly-flooded');
    const roll = window.setInterval(() => {
      cellViews.forEach((v) => {
        // Plain glyphs while rolling: re-parsing the SVG art 30 times per tick froze phones.
        if (v.classList.contains('oly-rolling')) v.textContent = SYMBOLS[randomSymbol()].glyph;
      });
    }, 90);
    timers.add(roll);
    const stopLoop = playSpinLoop('medusa');
    let scattersShown = 0;
    const stacks = medusaReels(result);
    let struck = false;
    for (let c = 0; c < COLS; c++) {
      // Anticipation: two temples are up, every remaining reel slows down.
      const tense = scattersShown === MIN_SCATTERS - 1;
      if (tense) {
        for (let cc = c; cc < COLS; cc++) for (let r = 0; r < ROWS; r++) cellAt(cc, r).classList.add('oly-tension');
        setMessage('Encore un temple…', 'oly-tension-text');
      }
      const first = fast ? FREE_REEL_MS : REEL_MS;
      const stopSuspense = tense ? playSuspense(TENSION_MS) : undefined;
      await wait(c === 0 ? first : tense ? TENSION_MS : fast ? FREE_STAGGER : REEL_STAGGER);
      stopSuspense?.();
      playReelStop(c);
      const stacked = stacks.includes(c);
      for (let r = 0; r < ROWS; r++) {
        const symbol = result[c][r];
        const v = cellAt(c, r);
        v.className = `oly-cell oly-landed${symbol === SCATTER ? ' oly-scatter' : ''}${symbol === MEDUSA ? ' oly-medusa' : ''}`;
        paintCell(v, symbol);
      }
      if (stacked) {
        reels[c].className = 'oly-reel oly-reel-full oly-reel-medusa';
        reels[c].lastElementChild!.innerHTML = `<span>🐍</span>${MEDUSA_HEAD}<span>MEDUSA</span>`;
      }
      if (stacked && !struck) {
        struck = true;
        strike();
      }
      const landed = result[c].filter((s) => s === SCATTER).length;
      scattersShown += landed;
      // Resolve the suspense when the temple lands, or when the last tense reel misses.
      if (tense && landed > 0) playSuspenseHit();
      else if (tense && c === COLS - 1) playSuspenseMiss();
    }
    stopLoop();
    if (message.classList.contains('oly-tension-text')) setMessage('');
    window.clearInterval(roll);
    timers.delete(roll);
  }

  /** A lightning glow around the machine; never drawn over the reels. */
  function strike(): void {
    machine.classList.remove('oly-struck');
    sky.classList.remove('oly-gaze');
    void machine.offsetWidth;
    machine.classList.add('oly-struck');
    sky.classList.add('oly-gaze');
  }

  /** Plays the feature from `pending.next` (0 = fresh, with the intro). The chips are already paid. */
  async function runFreeSpins(pending: PendingFeature, fresh: boolean): Promise<void> {
    const { feature, startSpins, stake } = pending;
    lights.setMode('big');
    if (fresh) {
      playBonusTrigger();
      buzz(BUZZ.bonus);
      playMedusaAwake(0.3);
      clearLines();
      setMessage('Les temples s’illuminent !', 'oly-big');
      await igniteTemples();
      await showIntro(startSpins);
      if (disposed) return;
    }

    clearLines();
    screen.classList.add('oly-in-feature');
    releaseScreen = keepScreenOn();
    setMessage(fresh ? '' : 'Les tours gratuits reprennent !', fresh ? '' : 'oly-big');
    const played = feature.spins.slice(0, pending.next);
    let total = played.reduce((sum, s) => sum + chipsFor(s.mult, stake), 0);
    const spinsValue = el('b', { class: 'oly-fs-spins', text: `${played.length > 0 ? played[played.length - 1].spinsLeft : startSpins}` });
    const totalValue = el('b', { class: 'oly-fs-total', text: `${total}` });
    featureBar.replaceChildren(
      el('div', { class: 'oly-fs-box' }, el('span', { text: 'Tours' }), spinsValue),
      el('div', { class: 'oly-fs-box oly-fs-totalbox' }, el('span', { text: 'Gain' }), totalValue),
    );

    for (let i = pending.next; i < feature.spins.length; i++) {
      const step = feature.spins[i];
      clearLines();
      lights.setMode('spin');
      spinsValue.textContent = `${step.spinsLeft - step.added}`;
      await animateReels(step.grid, true);
      if (disposed) return;
      spinsValue.textContent = `${step.spinsLeft}`;
      const medusaCount = medusaReels(step.grid).length;
      if (medusaCount >= 4) machine.classList.add('oly-flooded');
      if (medusaCount >= 3) playBigWin(1);
      const won = chipsFor(step.mult, stake);
      // A flooded screen pays almost every line: the tall Medusa figures say it better than twenty drawn lines.
      if (medusaCount < 4) showLines(step.wins);
      if (step.added > 0) {
        playBonusTrigger();
        buzz(BUZZ.retrigger);
        strike();
        setMessage('');
        await stampBanner(sky, `+${step.added}`, 'TOURS GRATUITS');
      } else if (won > 0) {
        winPop(sky, won, { label: medusaCount === COLS ? 'Medusa partout !' : medusaCount >= 2 ? `${medusaCount} colonnes de Medusa` : '', stake });
      }
      if (won > 0) {
        lights.setMode('win');
        const from = total;
        total += won;
        countUp(totalValue, won, 600, (n) => `${from + n}`);
        if (won >= stake * 10) burst(machine, 16, 'coins');
      }
      await wait(won >= stake * 3 ? FREE_COUNTED_PAUSE_MS : won > 0 ? FREE_WIN_PAUSE_MS : FREE_PAUSE_MS);
      pending.next = i + 1;
      savePending(pending);
    }

    clearLines();
    const totalChips = chipsFor(feature.mult, stake);
    // Sessions saved before the floor existed have no topUp field.
    if ((feature.topUp ?? 0) > 0 && totalChips > total) {
      setMessage(`Minimum garanti : +${totalChips - total} jetons`, 'oly-big');
      const from = total;
      countUp(totalValue, totalChips - total, 800, (n) => `${from + n}`);
      await wait(1600);
      if (disposed) return;
    }
    savePending(null);
    noteWin(LOBBY_ID, totalChips, stake);
    refresh();
    setMessage(`Tours gratuits : ${totalChips} jetons`, 'oly-win-text');
    await showBigWin(document.body, totalChips, stake, totalChips >= stake * 10 ? 'MEDUSA PAIE !' : 'TOURS GRATUITS', { themeClass: 'oly-bigwin' });
    featureBar.replaceChildren();
    machine.classList.remove('oly-flooded');
    screen.classList.remove('oly-in-feature');
    releaseScreen?.();
    releaseScreen = null;
  }

  /** The temples that triggered the feature blow up one by one, then the whole lair blazes gold. */
  async function igniteTemples(): Promise<void> {
    const lit = cellViews.filter((v) => v.classList.contains('oly-scatter'));
    wait(lit.length * 260).then(() => {
      strike();
      shake(machine, 3);
    });
    await igniteCells(sky, lit, () => playReelStop(4));
  }

  /** Full-screen bonus intro; a tap or a few seconds closes it. */
  function showIntro(spins: number): Promise<void> {
    const overlay = el(
      'div',
      { class: 'oly-intro', role: 'dialog', 'aria-live': 'assertive' },
      el('div', { class: 'oly-intro-bolt', text: '🐍' }),
      el('p', { class: 'oly-intro-count', text: `${spins}` }),
      el('p', { class: 'oly-intro-title', text: 'TOURS GRATUITS' }),
      el('p', { class: 'oly-intro-text', text: 'Ne croise pas son regard : Medusa 🐍 envahit l’écran, colonne après colonne !' }),
      el('p', { class: 'oly-intro-text', text: 'Les temples 🏛️ redonnent des tours, sans limite.' }),
      el('span', { class: 'oly-intro-hint', text: 'Touche pour commencer' }),
    );
    overlay.insertAdjacentHTML('afterbegin', OLYMPUS_DEFS);
    artify(overlay);
    document.body.append(overlay);
    burst(overlay, 20, 'confetti');
    return new Promise((resolve) => {
      let done = false;
      const close = (): void => {
        if (done) return;
        done = true;
        overlay.remove();
        resolve();
      };
      overlay.addEventListener('click', close);
      wait(3500).then(close);
    });
  }

  refresh();
  const unfinished = loadPending();
  if (unfinished) void resume(unfinished);

  async function resume(pending: PendingFeature): Promise<void> {
    busy = true;
    refresh();
    await runFreeSpins(pending, false);
    if (disposed) return;
    busy = false;
    lights.setMode('idle');
    refresh();
  }

  return () => {
    disposed = true;
    releaseScreen?.();
    clearLines();
    document.querySelectorAll('.oly-intro').forEach((n) => n.remove());
    for (const id of timers) {
      window.clearTimeout(id);
      window.clearInterval(id);
    }
    timers.clear();
  };
}

// -----------------------------------------------
// UNFINISHED FEATURE (survives a reload or leaving the screen)
// -----------------------------------------------

interface PendingFeature {
  feature: FreeSpinsResult;
  startSpins: number;
  stake: number;
  /** Index of the next spin to show. */
  next: number;
}

const PENDING_KEY = 'casino-olympus-pending-feature';

function savePending(pending: PendingFeature | null): void {
  try {
    if (pending) sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage blocked: the chips are already paid, only the replay is lost.
  }
}

function loadPending(): PendingFeature | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PendingFeature;
    if (!Array.isArray(data?.feature?.spins) || !Number.isInteger(data.next) || data.next >= data.feature.spins.length) {
      sessionStorage.removeItem(PENDING_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function randomSymbol(): number {
  return Math.floor(Math.random() * SYMBOLS.length);
}

function paintCell(cell: HTMLElement, symbol: number): void {
  if (symbol === MEDUSA) cell.innerHTML = MEDUSA_HEAD;
  else if (symbol === SCATTER) cell.innerHTML = TEMPLE;
  else cell.textContent = SYMBOLS[symbol].glyph;
}

const INLINE_ART: [string, string][] = [['🐍', MEDUSA_HEAD], ['🏛️', TEMPLE], ['🏛', TEMPLE]];

/** Replaces the Medusa and temple emoji in every text under `root` by their inline SVG. */
function artify(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  for (const text of texts) {
    const value = text.data;
    if (!INLINE_ART.some(([g]) => value.includes(g))) continue;
    const parts = value.split(/(🐍|🏛️|🏛)/u);
    const nodes = parts.filter((p) => p !== '').map((p) => {
      const art = INLINE_ART.find(([g]) => g === p);
      if (!art) return document.createTextNode(p);
      const span = el('span', { class: 'oly-inline-art' });
      span.innerHTML = art[1];
      return span;
    });
    text.replaceWith(...nodes);
  }
}

function paytable(stake: number): HTMLElement[] {
  const entries = SYMBOLS.slice(0, SCATTER)
    .map((s, i) => ({ glyph: s.glyph, name: SYMBOL_NAMES[i], counts: [3, 4, 5, 6], multipliers: s.pays.map((p) => p * PAY_SCALE) }))
    .reverse();
  const fullReels: [number, number][] = [0, 1, 2, 3, 4].flatMap((r): [number, number][] => [[0, r], [1, r], [2, r], [4, r]]);
  const temples: [number, number][] = [[0, 3], [2, 0], [5, 1]];
  return [
    rulesBlock(
      'Comment on gagne',
      `Il y a ${LINES.length} lignes (dessins ci-dessous), toutes jouées à chaque tirage.`,
      'Une ligne gagne avec au moins 3 symboles identiques, collés, en partant du rouleau de GAUCHE.',
      'Plusieurs lignes peuvent gagner en même temps : les gains s’additionnent.',
      'Le jeu normal est souvent sec : c’est dans les tours gratuits que tout s’enchaîne.',
    ),
    el('h3', { class: 'oly-paytable-title', text: 'Medusa 🐍 et le temple 🏛️' }),
    el('div', { class: 'fx-paylines' },
      shapeDiagram(COLS, ROWS, temples, '🏛️ 3 n’importe où'),
      shapeDiagram(COLS, ROWS, fullReels, '🐍 colonnes de Medusa (tours gratuits)'),
    ),
    rulesBlock(
      'Tours gratuits',
      'Medusa 🐍 remplace tous les symboles sauf le temple : son regard change tout en pierre. Elle paie aussi ses propres lignes, les plus grosses.',
      `${MIN_SCATTERS} temples ou plus, n’importe où : ${FREE_SPINS_BY_SCATTERS[3]} tours pour 3, ${FREE_SPINS_BY_SCATTERS[4]} pour 4, ${FREE_SPINS_BY_SCATTERS[5]} pour 5.`,
      'Pendant les tours gratuits, Medusa 🐍 tombe en colonnes entières, souvent plusieurs à la fois, et peut remplir tout l’écran.',
      'Plus il y a de colonnes de Medusa collées depuis la gauche, plus les lignes paient : 6 colonnes = les 20 lignes à 6 Medusa.',
      `Pendant les tours gratuits, les temples tombent bien plus souvent : 3 temples = +${FREE_RETRIGGER_SPINS} tours, sans limite. Un bonus sur quatre repart, parfois plusieurs fois !`,
      `Les tours gratuits paient toujours au moins ${FREE_SPINS_MIN_X} fois ta mise.`,
    ),
    el('h3', { class: 'oly-paytable-title', text: `Les ${LINES.length} lignes` }),
    paylineDiagrams(LINES, ROWS),
    el('h3', { class: 'oly-paytable-title', text: `Gains d’une ligne (mise ${stake})` }),
    payoutTable(entries, stake),
  ];
}
