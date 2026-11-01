import './olympus.css';
import { el, topBar, type BackLink } from '../../../dom';
import { bet, chips, pay } from '../chips';
import {
  armSoundUnlock, burst, countUp, drawWinLines, marquee, muteButton, payoutTable, paylineDiagrams, playBigWin,
  playBonusTrigger, playLose, playReelStop, playSmallWin, playSpinLoop, rulesBlock, shake, shapeDiagram, showBigWin,
  tapToSpin, winTier, type WinLinesHandle,
} from '../fx';
import { CASINO_TEST_BUTTONS, takeForced, testBar } from '../fx'; // TEST-BUTTONS
import {
  BETS,
  CELLS,
  COLS,
  FREE_SPINS_BY_SCATTERS,
  LINES,
  MIN_SCATTERS,
  ROWS,
  SCATTER,
  SYMBOLS,
  WILD,
  WILD_REELS,
  ZEUS,
  chipsFor,
  freeSpinsFor,
  lineWins,
  playFreeSpins,
  scatterCount,
  spinGrid,
  stackedReels,
  winMult,
  type FreeSpinsResult,
  type OlympusForce,
  type Grid,
  type LineWin,
} from './olympusLogic';

const BACK_CASINO: BackLink = { href: '#/casino', label: 'Casino' };
const REEL_MS = 650;
const REEL_STAGGER = 140;
const TENSION_MS = 1300;
const FREE_REEL_MS = 380;
const FREE_STAGGER = 90;
const SYMBOL_NAMES = ['Valet', 'Dame', 'Roi', 'As', 'Amphore', 'Bouclier', 'Chouette', 'Trident', 'Zeus'];

export function renderOlympus(root: HTMLElement): () => void {
  armSoundUnlock();
  const timers = new Set<number>();
  let disposed = false;
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
  let skipCount: (() => void) | null = null;

  const balance = el('span', { class: 'oly-balance' });
  const cellViews: HTMLElement[] = [];
  for (let i = 0; i < CELLS; i++) cellViews.push(el('div', { class: 'oly-cell' }, randomGlyph()));
  const grid = el('div', { class: 'oly-grid' }, ...cellViews);
  /** cells[col][row], the layout drawWinLines expects. */
  const cells: HTMLElement[][] = [];
  for (let c = 0; c < COLS; c++) {
    cells.push([]);
    for (let r = 0; r < ROWS; r++) cells[c].push(cellViews[r * COLS + c]);
  }
  const featureBar = el('div', { class: 'oly-feature-bar' });
  const machine = el('div', { class: 'oly-machine' }, featureBar, grid);
  const lights = marquee(machine, 10);
  const message = el('div', { class: 'oly-message', role: 'status', text: '3 temples 🏛️ ou plus déclenchent les tours gratuits !' });

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
    el('div', { class: 'oly-title', text: '⚡ Foudre de l’Olympe ⚡' }),
    machine,
    message,
    el('div', { class: 'oly-bet' }, minus, el('div', {}, el('div', { class: 'oly-small', text: 'Mise (30 lignes)' }), betLabel), plus),
    spinButton,
    tableButton,
    tableHost,
  );
  if (CASINO_TEST_BUTTONS) tableButton.after(testBar([{ label: '3 scatters', outcome: 'free3' }, { label: '5 scatters (100 tours)', outcome: 'free5' }, { label: 'Rouleaux pleins', outcome: 'stacks' }])); // TEST-BUTTONS
  tapToSpin(machine, spinButton);
  root.replaceChildren(topBar('Foudre de l’Olympe', el('span', { class: 'oly-top-right' }, balance, muteButton()), BACK_CASINO), screen);

  const currentBet = () => BETS[betIndex];
  const cellAt = (col: number, row: number) => cells[col][row];

  function refresh(): void {
    balance.textContent = `${chips().toLocaleString('fr-FR')} jetons`;
    betLabel.textContent = `${currentBet()} jetons`;
    minus.disabled = busy || betIndex === 0;
    plus.disabled = busy || betIndex === BETS.length - 1;
    spinButton.disabled = busy || chips() < currentBet();
    if (!tableHost.hidden) tableHost.replaceChildren(...paytable(currentBet()));
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
    skipCount?.();
    clearLines();
    setMessage('');
    lights.setMode('spin');
    refresh();

    const force = CASINO_TEST_BUTTONS ? takeForced<OlympusForce>() : null; // TEST-BUTTONS
    const result = spinGrid(Math.random, false, force === 'stacks' ? 'free3' : force ?? undefined); // TEST-BUTTONS
    await animateReels(result, false);
    if (disposed) return;

    const wins = lineWins(result);
    const won = chipsFor(winMult(wins), stake);
    const scatters = scatterCount(result);
    if (won > 0) {
      pay(won);
      showLines(wins);
      lights.setMode('win');
      if (winTier(won, stake) > 0) {
        shake(machine, 2);
        setMessage(`+${won} jetons`, 'oly-win-text');
        refresh();
        await showBigWin(document.body, won, stake);
      } else {
        playSmallWin();
        burst(machine, Math.min(24, 6 + Math.round((won / stake) * 4)), 'coins');
        skipCount = countUp(message, won, Math.min(1500, 400 + (won / stake) * 200), (n) => `+${n} jetons`);
        message.className = 'oly-message oly-win-text';
      }
    } else if (scatters < MIN_SCATTERS) {
      lights.setMode('idle');
      playLose();
      setMessage('Rien cette fois…');
    }
    refresh();

    if (scatters >= MIN_SCATTERS) {
      const startSpins = freeSpinsFor(scatters);
      const feature = playFreeSpins(Math.random, startSpins, force === 'stacks' ? 2 : 0); // TEST-BUTTONS
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
    cellViews.forEach((v) => (v.className = 'oly-cell oly-rolling'));
    const roll = window.setInterval(() => {
      cellViews.forEach((v) => {
        if (v.classList.contains('oly-rolling')) v.textContent = randomGlyph();
      });
    }, 70);
    timers.add(roll);
    const stopLoop = playSpinLoop();
    let scattersShown = 0;
    const stacks = stackedReels(result);
    let struck = false;
    for (let c = 0; c < COLS; c++) {
      // Anticipation: two temples are up, every remaining reel slows down.
      const tense = scattersShown === MIN_SCATTERS - 1;
      if (tense) {
        for (let r = 0; r < ROWS; r++) cellAt(c, r).classList.add('oly-tension');
        setMessage('Encore un temple…', 'oly-tension-text');
      }
      const first = fast ? FREE_REEL_MS : REEL_MS;
      await wait(c === 0 ? first : tense ? TENSION_MS : fast ? FREE_STAGGER : REEL_STAGGER);
      playReelStop(c);
      const stacked = stacks.includes(c);
      for (let r = 0; r < ROWS; r++) {
        const symbol = result[c][r];
        const v = cellAt(c, r);
        v.className = `oly-cell oly-landed${symbol === SCATTER ? ' oly-scatter' : ''}${symbol === WILD ? ' oly-wild' : ''}${symbol === ZEUS ? ' oly-zeus' : ''}${stacked ? ` oly-stack oly-stack-${r}` : ''}`;
        v.textContent = SYMBOLS[symbol].glyph;
      }
      if (stacked && !struck) {
        struck = true;
        strike();
      }
      scattersShown += result[c].filter((s) => s === SCATTER).length;
    }
    stopLoop();
    if (message.classList.contains('oly-tension-text')) setMessage('');
    window.clearInterval(roll);
    timers.delete(roll);
  }

  /** A lightning glow around the machine; never drawn over the reels. */
  function strike(): void {
    machine.classList.remove('oly-struck');
    void machine.offsetWidth;
    machine.classList.add('oly-struck');
  }

  /** Plays the feature from `pending.next` (0 = fresh, with the intro). The chips are already paid. */
  async function runFreeSpins(pending: PendingFeature, fresh: boolean): Promise<void> {
    const { feature, startSpins, stake } = pending;
    lights.setMode('big');
    if (fresh) {
      playBonusTrigger();
      strike();
      shake(machine, 3);
      setMessage('Les temples s’illuminent !', 'oly-big');
      await wait(1200);
      await showIntro(startSpins);
      if (disposed) return;
    }

    clearLines();
    screen.classList.add('oly-in-feature');
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
      lights.setMode('spin');
      spinsValue.textContent = `${step.spinsLeft - step.added}`;
      await animateReels(step.grid, true);
      if (disposed) return;
      spinsValue.textContent = `${step.spinsLeft}`;
      const stackCount = stackedReels(step.grid).length;
      if (stackCount >= 3) {
        shake(machine, stackCount >= 4 ? 3 : 2);
        playBigWin(1);
      }
      const won = chipsFor(step.mult, stake);
      showLines(step.wins);
      if (step.added > 0) {
        playBonusTrigger();
        strike();
        setMessage(`+${step.added} tours gratuits !`, 'oly-big');
        await wait(1400);
      } else if (won > 0) {
        setMessage(stackCount >= 3 ? `${stackCount} rouleaux pleins : +${won} jetons !` : `+${won} jetons`, 'oly-win-text');
      } else {
        setMessage('');
      }
      if (won > 0) {
        lights.setMode('win');
        const from = total;
        total += won;
        countUp(totalValue, won, 600, (n) => `${from + n}`);
        if (won >= stake * 10) burst(machine, 16, 'coins');
      }
      await wait(won > 0 ? 1000 : 450);
      pending.next = i + 1;
      savePending(pending);
    }

    clearLines();
    savePending(null);
    const totalChips = chipsFor(feature.mult, stake);
    refresh();
    setMessage(`Tours gratuits : ${totalChips} jetons`, 'oly-win-text');
    await showBigWin(document.body, totalChips, stake, totalChips >= stake * 10 ? 'ZEUS PAIE !' : 'TOURS GRATUITS');
    featureBar.replaceChildren();
    screen.classList.remove('oly-in-feature');
  }

  /** Full-screen bonus intro; a tap or a few seconds closes it. */
  function showIntro(spins: number): Promise<void> {
    const overlay = el(
      'div',
      { class: 'oly-intro', role: 'dialog', 'aria-live': 'assertive' },
      el('div', { class: 'oly-intro-bolt', text: '⚡' }),
      el('p', { class: 'oly-intro-count', text: `${spins}` }),
      el('p', { class: 'oly-intro-title', text: 'TOURS GRATUITS' }),
      el('p', { class: 'oly-intro-text', text: 'L’orage se lève : Zeus 👑 et la foudre ⚡ tombent en rouleaux entiers !' }),
      el('p', { class: 'oly-intro-text', text: 'Les temples 🏛️ redonnent des tours, sans limite.' }),
      el('span', { class: 'oly-intro-hint', text: 'Touche pour commencer' }),
    );
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
    skipCount?.();
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

function randomGlyph(): string {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].glyph;
}

function paytable(stake: number): HTMLElement[] {
  const entries = SYMBOLS.slice(0, WILD)
    .map((s, i) => ({ glyph: s.glyph, name: SYMBOL_NAMES[i], counts: [3, 4, 5], multipliers: s.pays }))
    .reverse();
  const reels = WILD_REELS.map((c) => c + 1).join(', ');
  const fullReels: [number, number][] = [0, 1, 2].flatMap((r): [number, number][] => [[0, r], [2, r], [3, r]]);
  const temples: [number, number][] = [[0, 2], [2, 0], [4, 1]];
  return [
    rulesBlock(
      'Comment on gagne',
      `Il y a ${LINES.length} lignes (dessins ci-dessous), toutes jouées à chaque tirage.`,
      'Une ligne gagne avec au moins 3 symboles identiques, collés, en partant du rouleau de GAUCHE.',
      'Plusieurs lignes peuvent gagner en même temps : les gains s’additionnent.',
      'Le jeu normal est souvent sec : c’est dans les tours gratuits que tout s’enchaîne.',
    ),
    el('h3', { class: 'oly-paytable-title', text: 'La foudre ⚡, Zeus 👑 et le temple 🏛️' }),
    el('div', { class: 'fx-paylines' },
      shapeDiagram(COLS, ROWS, temples, '🏛️ 3 n’importe où'),
      shapeDiagram(COLS, ROWS, fullReels, '👑 ⚡ rouleaux pleins (tours gratuits)'),
    ),
    rulesBlock(
      'Tours gratuits',
      `La foudre ⚡ remplace tous les symboles sauf le temple. Elle tombe sur les rouleaux ${reels}.`,
      `${MIN_SCATTERS} temples ou plus, n’importe où : ${FREE_SPINS_BY_SCATTERS[3]} tours pour 3, ${FREE_SPINS_BY_SCATTERS[4]} pour 4, ${FREE_SPINS_BY_SCATTERS[5]} pour 5.`,
      'Pendant les tours gratuits, les rouleaux changent : Zeus 👑 et la foudre ⚡ peuvent couvrir un rouleau entier.',
      'Les temples redonnent des tours pendant les tours gratuits (même barème), sans limite.',
    ),
    el('h3', { class: 'oly-paytable-title', text: `Les ${LINES.length} lignes` }),
    paylineDiagrams(LINES, ROWS),
    el('h3', { class: 'oly-paytable-title', text: `Gains d’une ligne (mise ${stake})` }),
    payoutTable(entries, stake),
  ];
}
