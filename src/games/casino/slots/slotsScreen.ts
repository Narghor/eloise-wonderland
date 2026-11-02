import './slots.css';
import { el, topBar } from '../../../dom';
import { bet, chips, feedJackpot, jackpot, noteWin, pay, winJackpot } from '../chips';

/** This machine's key in the casino lobby, which shows its best win. */
const LOBBY_ID = 'sous';
import {
  armSoundUnlock, burst, countUp, drawWinLines, marquee, muteButton, payoutTable, paylineDiagrams, playBonusTrigger,
  playLose, playReelStop, playSmallWin, playSpinLoop, rulesBlock, shake, showBigWin, tapToSpin, winTier,
  type WinLinesHandle, type WinPath,
} from '../fx';
import { BUZZ, buzz } from '../fx';
import { CASINO_TEST_BUTTONS, takeForced, testBar } from '../fx'; // TEST-BUTTONS
import { BET_LEVELS, DIAMOND, JACKPOT_MIN_X, JACKPOT_SHARE, jackpotFor, MACHINE_ID, PAY_SCALE, PAYLINES, REELS, ROWS, STRIPS, SYMBOLS, WILD, spin, type SlotsForce, type SpinResult } from './slotsLogic';

const SPIN_MS = 1400;
const REEL_GAP_MS = 260;
const TICK_MS = 60;

export function renderSlots(root: HTMLElement): () => void {
  armSoundUnlock();
  const timers: number[] = [];
  let betIndex = 0;
  let spinning = false;
  let lines: WinLinesHandle | null = null;
  let skipCount: (() => void) | null = null;

  const balance = el('span', { class: 'slots-balance' });
  const pool = el('div', { class: 'slots-jackpot' });
  const message = el('p', { class: 'slots-message', role: 'status', text: 'Bonne chance !' });
  const detail = el('p', { class: 'slots-detail' });
  const cells: HTMLElement[][] = [];
  const reels = el('div', { class: 'slots-reels' });
  for (let r = 0; r < REELS; r++) {
    const column = el('div', { class: 'slots-reel' });
    cells.push([]);
    for (let row = 0; row < ROWS; row++) {
      const cell = el('div', { class: 'slots-cell', text: SYMBOLS[STRIPS[r][row]].glyph });
      cells[r].push(cell);
      column.append(cell);
    }
    reels.append(column);
  }
  const machine = el('div', { class: 'slots-machine' }, pool, reels);
  const lights = marquee(machine, 10);

  const betLabel = el('span', { class: 'slots-bet' });
  const minus = el('button', { class: 'button button-secondary slots-step', type: 'button', text: '−' });
  const plus = el('button', { class: 'button button-secondary slots-step', type: 'button', text: '+' });
  const spinButton = el('button', { class: 'button slots-spin', type: 'button', text: 'LANCER' });
  const tableButton = el('button', { class: 'button button-secondary', type: 'button', text: 'Comment on gagne ?' });
  const tableHost = el('div', { class: 'slots-paytable' });
  tableHost.hidden = true;

  minus.addEventListener('click', () => { betIndex = Math.max(0, betIndex - 1); refresh(); });
  plus.addEventListener('click', () => { betIndex = Math.min(BET_LEVELS.length - 1, betIndex + 1); refresh(); });
  tableButton.addEventListener('click', () => {
    tableHost.hidden = !tableHost.hidden;
    if (!tableHost.hidden) tableHost.replaceChildren(...paytable(BET_LEVELS[betIndex]));
  });
  spinButton.addEventListener('click', play);
  tapToSpin(machine, spinButton);

  const right = el('span', { class: 'slots-top-right' }, balance, muteButton());
  root.append(
    topBar('Machine à sous', right, { href: '#/casino', label: 'Casino' }),
    el('main', { class: 'slots-screen' },
      machine,
      message,
      detail,
      el('div', { class: 'slots-controls' }, minus, betLabel, plus),
      spinButton,
      tableButton,
      tableHost,
    ),
  );
  if (CASINO_TEST_BUTTONS) tableButton.after(testBar([{ label: 'Gros gain', outcome: 'big' }, { label: 'Méga gain', outcome: 'mega' }, { label: 'Jackpot', outcome: 'jackpot' }])); // TEST-BUTTONS
  let shownPool = 0;
  let poolFrame = 0;
  refresh();

  /** Rolls the jackpot counter up to its new value, so each spin visibly feeds it. */
  function showPool(target: number): void {
    cancelAnimationFrame(poolFrame);
    const from = shownPool || target;
    if (target > from) {
      pool.classList.remove('is-growing');
      void pool.offsetWidth;
      pool.classList.add('is-growing');
    }
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 500);
      shownPool = Math.round(from + (target - from) * k);
      pool.textContent = `💎 JACKPOT ${shownPool.toLocaleString('fr-FR')} 💎`;
      if (k < 1) poolFrame = requestAnimationFrame(step);
    };
    step(start);
  }

  function refresh(): void {
    const stake = BET_LEVELS[betIndex];
    balance.textContent = `${chips().toLocaleString('fr-FR')} jetons`;
    showPool(jackpotFor(jackpot(MACHINE_ID), stake));
    betLabel.textContent = `Mise : ${stake}`;
    minus.disabled = spinning || betIndex === 0;
    plus.disabled = spinning || betIndex === BET_LEVELS.length - 1;
    spinButton.disabled = spinning || chips() < stake;
    if (!tableHost.hidden) tableHost.replaceChildren(...paytable(stake));
  }

  function play(): void {
    const stake = BET_LEVELS[betIndex];
    if (spinning || !bet(stake)) return;
    skipCount?.();
    feedJackpot(MACHINE_ID, stake * JACKPOT_SHARE);
    const result = spin(stake, Math.random, (CASINO_TEST_BUTTONS && takeForced<SlotsForce>()) || undefined); // TEST-BUTTONS
    spinning = true;
    lines?.clear();
    lines = null;
    message.textContent = '…';
    message.className = 'slots-message';
    detail.textContent = '';
    lights.setMode('spin');
    refresh();

    const stopLoop = playSpinLoop();
    const stopped = new Array<boolean>(REELS).fill(false);
    const ticker = window.setInterval(() => {
      for (let r = 0; r < REELS; r++) {
        if (stopped[r]) continue;
        for (let row = 0; row < ROWS; row++) {
          cells[r][row].textContent = SYMBOLS[STRIPS[r][Math.floor(Math.random() * STRIPS[r].length)]].glyph;
        }
      }
    }, TICK_MS);
    timers.push(ticker);
    cells.flat().forEach((cell) => cell.classList.add('slots-blur'));
    for (let r = 0; r < REELS; r++) {
      timers.push(window.setTimeout(() => {
        stopped[r] = true;
        playReelStop(r);
        cells[r].forEach((cell, row) => {
          cell.classList.remove('slots-blur');
          cell.classList.add('slots-land');
          cell.textContent = SYMBOLS[result.grid[r][row]].glyph;
        });
        timers.push(window.setTimeout(() => cells[r].forEach((cell) => cell.classList.remove('slots-land')), 300));
        if (r === REELS - 1) {
          window.clearInterval(ticker);
          stopLoop();
          void finish(result, stake);
        }
      }, SPIN_MS - (REELS - 1 - r) * REEL_GAP_MS));
    }
  }

  async function finish(result: SpinResult, stake: number): Promise<void> {
    if (result.jackpot) {
      lines = drawWinLines(reels, cells, [{ cells: PAYLINES[0].map((row, reel) => [reel, row] as [number, number]), path: PAYLINES[0], color: '#3fe0ff' }]);
      lights.setMode('big');
      playBonusTrigger();
      buzz(BUZZ.jackpot);
      shake(machine, 3);
      const won = winJackpot(MACHINE_ID, jackpotFor(jackpot(MACHINE_ID), stake));
      noteWin(LOBBY_ID, won, stake);
      message.textContent = `💎 JACKPOT : ${won.toLocaleString('fr-FR')} jetons ! 💎`;
      message.className = 'slots-message slots-message-big';
      refresh();
      await showBigWin(document.body, won, stake, 'JACKPOT !');
    } else if (result.total > 0) {
      pay(result.total);
      noteWin(LOBBY_ID, result.total, stake);
      const tier = winTier(result.total, stake);
      const paths: WinPath[] = result.wins.map((win) => ({
        cells: PAYLINES[win.line].slice(0, win.count).map((row, reel) => [reel, row] as [number, number]),
        path: PAYLINES[win.line],
      }));
      lines = drawWinLines(reels, cells, paths, (i) => {
        const win = result.wins[i];
        detail.textContent = `Ligne ${win.line + 1} : ${SYMBOLS[win.symbol].glyph.repeat(win.count)} = ${win.amount} jetons`;
      });
      if (result.wins.length > 1) detail.textContent = `${result.wins.length} lignes gagnantes !`;
      message.className = `slots-message slots-message-win${tier > 0 ? ' slots-message-big' : ''}`;
      const multiple = result.total / stake;
      const suffix = multiple >= 1 ? ` (×${multiple.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ta mise)` : '';
      refresh();
      if (tier > 0) {
        lights.setMode('big');
        shake(machine, tier >= 2 ? 3 : 2);
        message.textContent = `+${result.total} jetons${suffix}`;
        await showBigWin(document.body, result.total, stake);
      } else {
        lights.setMode('win');
        playSmallWin();
        if (multiple >= 2) shake(machine, 1);
        burst(machine, Math.min(30, 6 + Math.round(multiple * 4)), 'coins');
        skipCount = countUp(message, result.total, Math.min(1500, 400 + multiple * 200), (n) => `+${n} jetons${n === result.total ? suffix : ''}`);
      }
    } else {
      lights.setMode('idle');
      playLose();
      message.textContent = nearMiss(result) ? 'Presque ! Relance !' : 'Pas de chance, relance !';
    }
    spinning = false;
    timers.push(window.setTimeout(() => { if (!spinning) lights.setMode('idle'); }, 4000));
    refresh();
  }

  return () => {
    timers.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
    skipCount?.();
    lines?.clear();
  };
}

/** Two matching (or wild) symbols at the start of a payline: worth a "so close". */
function nearMiss(result: SpinResult): boolean {
  return PAYLINES.some((line) => {
    const a = result.grid[0][line[0]];
    const b = result.grid[1][line[1]];
    return a !== DIAMOND && (a === b || a === WILD || b === WILD) && SYMBOLS[a].pays[0] >= 7;
  });
}

function paytable(stake: number): HTMLElement[] {
  const lineBet = stake / PAYLINES.length;
  const entries = SYMBOLS.filter((s) => s.pays[0] > 0).reverse().map((s) => ({
    glyph: s.glyph,
    name: s.name,
    counts: [3, 4, 5],
    multipliers: s.pays.map((p) => (Math.round(p * PAY_SCALE * lineBet)) / stake),
  }));
  const example = el('div', { class: 'slots-example' },
    el('span', { text: '🍒🍒🍒🍋🔔' }), el('b', { text: ' ✔ 3 cerises' }),
    el('br'),
    el('span', { text: '🍒👑🍒🍒🍋' }), el('b', { text: ' ✔ 4 cerises (👑 remplace)' }),
    el('br'),
    el('span', { text: '🍋🍒🍒🍒🍒' }), el('b', { text: ' ✘ ne part pas de la gauche' }),
  );
  return [
    rulesBlock(
      'Comment on gagne',
      `Il y a ${PAYLINES.length} lignes (dessins ci-dessous). Chaque ligne est jouée à chaque lancer.`,
      'Une ligne gagne avec au moins 3 symboles identiques, collés, en partant du rouleau de GAUCHE.',
      `${SYMBOLS[WILD].glyph} remplace n'importe quel symbole (sauf 💎).`,
      'Plusieurs lignes peuvent gagner en même temps : les gains s’additionnent.',
      'Un écran plein de symboles ne gagne que si ces symboles tombent SUR une ligne.',
      example,
    ),
    el('h3', { class: 'slots-paytable-title', text: 'Les 10 lignes' }),
    paylineDiagrams(PAYLINES, ROWS),
    el('h3', { class: 'slots-paytable-title', text: `Gains par ligne (mise ${stake})` }),
    payoutTable(entries, stake),
    rulesBlock('💎 Jackpot progressif', '💎💎💎💎💎 sur la ligne du milieu = tout le jackpot !', `Il vaut ${JACKPOT_MIN_X} fois ta mise, plus la cagnotte : ${Math.round(JACKPOT_SHARE * 100)} % de chaque mise la fait grossir. Plus ta mise est haute, plus tu as de chances de le décrocher.`),
  ];
}
