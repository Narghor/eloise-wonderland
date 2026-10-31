import './slots.css';
import { el, topBar } from '../../../dom';
import { bet, chips, feedJackpot, jackpot, pay, winJackpot } from '../chips';
import { BET_LEVELS, JACKPOT_SHARE, MACHINE_ID, PAYLINES, REELS, ROWS, STRIPS, SYMBOLS, WILD, spin, type SpinResult } from './slotsLogic';

const SPIN_MS = 1500;
const REEL_GAP_MS = 220;
const TICK_MS = 70;

export function renderSlots(root: HTMLElement): () => void {
  const timers: number[] = [];
  let betIndex = 0;
  let spinning = false;

  const balance = el('span', { class: 'slots-balance' });
  const pool = el('div', { class: 'slots-jackpot' });
  const message = el('p', { class: 'slots-message', text: 'Bonne chance !' });
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

  const betLabel = el('span', { class: 'slots-bet' });
  const minus = el('button', { class: 'button button-secondary slots-step', type: 'button', text: '−' });
  const plus = el('button', { class: 'button button-secondary slots-step', type: 'button', text: '+' });
  const spinButton = el('button', { class: 'button slots-spin', type: 'button', text: 'Lancer' });
  const tableButton = el('button', { class: 'button button-secondary', type: 'button', text: 'Table des gains' });
  const table = paytable();
  table.hidden = true;

  minus.addEventListener('click', () => { betIndex = Math.max(0, betIndex - 1); refresh(); });
  plus.addEventListener('click', () => { betIndex = Math.min(BET_LEVELS.length - 1, betIndex + 1); refresh(); });
  tableButton.addEventListener('click', () => { table.hidden = !table.hidden; });
  spinButton.addEventListener('click', play);

  root.append(
    topBar('Machine à sous', balance, { href: '#/casino', label: 'Casino' }),
    el('main', { class: 'slots-screen' },
      pool,
      reels,
      message,
      el('div', { class: 'slots-controls' }, minus, betLabel, plus),
      spinButton,
      tableButton,
      table,
    ),
  );
  refresh();

  function refresh(): void {
    const stake = BET_LEVELS[betIndex];
    balance.textContent = `${chips()} jetons`;
    pool.textContent = `Jackpot : ${Math.floor(jackpot(MACHINE_ID))} jetons`;
    betLabel.textContent = `Mise : ${stake}`;
    minus.disabled = spinning || betIndex === 0;
    plus.disabled = spinning || betIndex === BET_LEVELS.length - 1;
    spinButton.disabled = spinning || chips() < stake;
  }

  function play(): void {
    const stake = BET_LEVELS[betIndex];
    if (spinning || !bet(stake)) return;
    feedJackpot(MACHINE_ID, stake * JACKPOT_SHARE);
    const result = spin(stake);
    spinning = true;
    message.textContent = '…';
    clearHighlights();
    refresh();

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
    for (let r = 0; r < REELS; r++) {
      cells[r].forEach((cell) => cell.classList.add('slots-blur'));
      timers.push(window.setTimeout(() => {
        stopped[r] = true;
        cells[r].forEach((cell, row) => {
          cell.classList.remove('slots-blur');
          cell.textContent = SYMBOLS[result.grid[r][row]].glyph;
        });
        if (r === REELS - 1) {
          window.clearInterval(ticker);
          finish(result);
        }
      }, SPIN_MS - (REELS - 1 - r) * REEL_GAP_MS));
    }
  }

  function finish(result: SpinResult): void {
    spinning = false;
    for (const win of result.wins) {
      PAYLINES[win.line].slice(0, win.count).forEach((row, reel) => cells[reel][row].classList.add('slots-win'));
    }
    if (result.jackpot) {
      const won = winJackpot(MACHINE_ID);
      message.textContent = `JACKPOT ! Tu gagnes ${won} jetons !`;
    } else if (result.total > 0) {
      pay(result.total);
      const lines = result.wins.length;
      message.textContent = `Tu gagnes ${result.total} jetons (${lines} ligne${lines > 1 ? 's' : ''})`;
    } else {
      message.textContent = 'Pas de chance, relance !';
    }
    refresh();
  }

  function clearHighlights(): void {
    cells.flat().forEach((cell) => cell.classList.remove('slots-win'));
  }

  return () => timers.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
}

function paytable(): HTMLElement {
  const rows = SYMBOLS.filter((s) => s.pays[0] > 0).reverse().map((s) =>
    el('tr', {},
      el('td', { class: 'slots-pay-glyph', text: s.glyph }),
      el('td', { text: s.name }),
      ...s.pays.map((p) => el('td', { text: `×${p}` })),
    ),
  );
  return el('section', { class: 'slots-paytable' },
    el('p', { text: `Gains multipliés par la mise par ligne (mise ÷ ${PAYLINES.length}), de gauche à droite sur ${PAYLINES.length} lignes.` }),
    el('table', {},
      el('thead', {}, el('tr', {}, el('th', {}), el('th', {}), el('th', { text: '3' }), el('th', { text: '4' }), el('th', { text: '5' }))),
      el('tbody', {}, ...rows),
    ),
    el('p', { text: `${SYMBOLS[WILD].glyph} remplace tous les symboles.` }),
    el('p', { text: '💎💎💎💎💎 : Jackpot progressif ! Plus ta mise est haute, plus tu as de chances de le décrocher.' }),
  );
}
