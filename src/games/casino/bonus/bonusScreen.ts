import './bonus.css';
import { el, topBar, type BackLink } from '../../../dom';
import { bet, chips, feedJackpot, jackpot, pay, winJackpot } from '../chips';
import {
  BET_LEVELS,
  CELLS,
  COLS,
  DOOR,
  DOOR_REELS,
  GRAND_MIN_BETS,
  JACKPOT_FEED,
  JACKPOT_MULTS,
  JACKPOT_NAMES,
  LINES,
  MACHINE_ID,
  RESPINS,
  ROWS,
  SYMBOLS,
  basePayout,
  coinChips,
  grandPrize,
  hasDoor,
  lineWins,
  playBonus,
  spinGrid,
  triggersBonus,
  type BetLevel,
  type BonusResult,
  type Coin,
  type Grid,
} from './bonusLogic';

const BACK_CASINO: BackLink = { href: '#/casino', label: 'Casino' };
const REEL_MS = 650;
const REEL_STAGGER = 140;
const TENSION_MS = 1300;
const STEP_MS = 900;
const LAST_DOOR_REEL = DOOR_REELS[DOOR_REELS.length - 1];

export function renderBonusSlot(root: HTMLElement): () => void {
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

  let levelIndex = 0;
  let busy = false;

  const balance = el('span', { class: 'bonus-balance' });
  const grandLabel = el('div', { class: 'bonus-grand' });
  const cellViews: HTMLElement[] = [];
  for (let i = 0; i < CELLS; i++) cellViews.push(el('div', { class: 'bonus-cell' }, randomGlyph(i % COLS)));
  const grid = el('div', { class: 'bonus-grid' }, ...cellViews);
  const message = el('div', { class: 'bonus-message', text: 'Une porte 🚪 sur les rouleaux 1, 3 et 5 ouvre le bonus !' });
  const respinsView = el('div', { class: 'bonus-respins' });

  const betLabel = el('span', { class: 'bonus-bet-value' });
  const minus = el('button', { class: 'button button-secondary bonus-bet-step', type: 'button', text: '−' });
  const plus = el('button', { class: 'button button-secondary bonus-bet-step', type: 'button', text: '+' });
  const jackpotsView = el('div', { class: 'bonus-jackpots' });
  const spinButton = el('button', { class: 'button bonus-spin', type: 'button', text: 'Tourner' });
  const rulesButton = el('button', { class: 'button button-secondary', type: 'button', text: 'Règles' });

  const screen = el(
    'main',
    { class: 'bonus-screen' },
    grandLabel,
    el('div', { class: 'bonus-machine' }, grid, respinsView),
    message,
    el('div', { class: 'bonus-bet' }, minus, el('div', {}, el('div', { class: 'bonus-small', text: 'Mise' }), betLabel), plus),
    jackpotsView,
    el('div', { class: 'button-row' }, spinButton, rulesButton),
  );
  root.replaceChildren(topBar('Machine à porte', balance, BACK_CASINO), screen);

  const level = () => BET_LEVELS[levelIndex];
  const cellAt = (col: number, row: number) => cellViews[row * COLS + col];

  function refresh(): void {
    const lv = level();
    balance.textContent = `${chips()} jetons`;
    const grandBet = BET_LEVELS[BET_LEVELS.length - 1].bet;
    grandLabel.textContent = `GRAND : ${grandPrize(jackpot(MACHINE_ID), grandBet)} jetons`;
    grandLabel.classList.toggle('bonus-locked', lv.jackpotTier < 3);
    betLabel.textContent = `${lv.bet} jetons`;
    jackpotsView.replaceChildren(
      el('span', { class: 'bonus-small', text: 'Jackpots débloqués : ' }),
      ...JACKPOT_NAMES.map((name, tier) =>
        el('span', { class: `bonus-jp-chip${tier <= lv.jackpotTier ? ' bonus-jp-on' : ''}`, text: name }),
      ),
    );
    minus.disabled = busy || levelIndex === 0;
    plus.disabled = busy || levelIndex === BET_LEVELS.length - 1;
    spinButton.disabled = busy || chips() < lv.bet;
  }

  minus.addEventListener('click', () => {
    levelIndex = Math.max(0, levelIndex - 1);
    refresh();
  });
  plus.addEventListener('click', () => {
    levelIndex = Math.min(BET_LEVELS.length - 1, levelIndex + 1);
    refresh();
  });
  rulesButton.addEventListener('click', () => openRules(root));
  spinButton.addEventListener('click', () => void spin());

  async function spin(): Promise<void> {
    const lv = level();
    if (busy || !bet(lv.bet)) return;
    feedJackpot(MACHINE_ID, lv.bet * JACKPOT_FEED);
    busy = true;
    message.textContent = '';
    message.className = 'bonus-message';
    respinsView.replaceChildren();
    refresh();

    const result = spinGrid(Math.random);
    await animateReels(result);
    if (disposed) return;

    const wins = lineWins(result);
    const won = basePayout(wins, lv.bet);
    const triggered = triggersBonus(result);
    if (won > 0) {
      pay(won);
      for (const w of wins) {
        for (let c = 0; c < w.count; c++) cellAt(c, LINES[w.line][c]).classList.add('bonus-win');
      }
      message.textContent = `Gagné : ${won} jetons`;
    } else if (!triggered) {
      message.textContent = 'Pas de chance…';
    }
    refresh();

    if (triggered) {
      await wait(won > 0 ? 900 : 300);
      await runBonus(playBonus(Math.random, lv), lv);
    }
    busy = false;
    refresh();
  }

  async function animateReels(result: Grid): Promise<void> {
    cellViews.forEach((v) => (v.className = 'bonus-cell bonus-rolling'));
    const roll = window.setInterval(() => {
      cellViews.forEach((v, i) => {
        if (v.classList.contains('bonus-rolling')) v.textContent = randomGlyph(i % COLS);
      });
    }, 70);
    timers.add(roll);
    let doorsShown = 0;
    for (let c = 0; c < COLS; c++) {
      // Anticipation: two doors are up, the reels up to the last door reel slow down.
      const tense = doorsShown === DOOR_REELS.length - 1 && c <= LAST_DOOR_REEL;
      if (tense) {
        for (let r = 0; r < ROWS; r++) cellAt(c, r).classList.add('bonus-tension');
        message.textContent = 'Encore une porte…';
        message.className = 'bonus-message bonus-tension-text';
      }
      await wait(c === 0 ? REEL_MS : tense ? TENSION_MS : REEL_STAGGER);
      for (let r = 0; r < ROWS; r++) {
        const symbol = result[c][r];
        const v = cellAt(c, r);
        v.className = `bonus-cell bonus-landed${symbol === DOOR ? ' bonus-door' : ''}`;
        v.textContent = SYMBOLS[symbol].glyph;
      }
      if (DOOR_REELS.includes(c) && hasDoor(result, c)) doorsShown++;
    }
    message.textContent = '';
    message.className = 'bonus-message';
    window.clearInterval(roll);
    timers.delete(roll);
  }

  async function runBonus(bonus: BonusResult, lv: BetLevel): Promise<void> {
    message.textContent = 'Les portes s’ouvrent !';
    message.className = 'bonus-message bonus-big';
    cellViews.forEach((v) => {
      if (v.classList.contains('bonus-door')) v.classList.add('bonus-door-open');
    });
    await wait(1200);

    const banner = el(
      'div',
      { class: 'bonus-celebrate' },
      el('div', { class: 'bonus-celebrate-text', text: 'BONUS !' }),
      el('div', { text: `Hold & Spin : pièces de ${lv.bet * 4} à ${lv.bet * 30} jetons` }),
    );
    screen.append(banner);
    await wait(2000);
    banner.remove();

    screen.classList.add('bonus-in-feature');
    message.className = 'bonus-message';
    cellViews.forEach((v) => {
      v.className = 'bonus-cell bonus-empty';
      v.textContent = '';
    });
    let running = 0;
    for (const step of bonus.steps) {
      for (const i of step.fresh) {
        const coin = step.cells[i] as Coin;
        const v = cellViews[i];
        v.className = `bonus-cell bonus-coin bonus-pop${coin.kind === 'jackpot' ? ' bonus-coin-jp' : ''}`;
        v.textContent = coin.kind === 'value' ? `${coinChips(coin, lv.bet)}` : JACKPOT_NAMES[coin.tier];
        running += coinChips(coin, lv.bet);
      }
      respinsView.replaceChildren(
        ...Array.from({ length: RESPINS }, (_, k) => el('span', { class: `bonus-dot${k < step.respinsLeft ? ' bonus-dot-on' : ''}` })),
      );
      message.textContent = `Bonus : ${running} jetons`;
      await wait(STEP_MS);
    }

    pay(bonus.chips);
    let text = `Bonus terminé : ${bonus.chips} jetons (${Math.round(bonus.chips / lv.bet)}× la mise) !`;
    if (bonus.grand) {
      const pool = winJackpot(MACHINE_ID);
      const prize = grandPrize(pool, lv.bet);
      pay(prize - pool);
      text = `GRAND JACKPOT ! +${prize} jetons, plus ${bonus.chips} jetons de pièces !`;
    }
    message.textContent = text;
    message.className = 'bonus-message bonus-big';
    refresh();
    await wait(1500);
    screen.classList.remove('bonus-in-feature');
  }

  refresh();
  return () => {
    disposed = true;
    for (const id of timers) {
      window.clearTimeout(id);
      window.clearInterval(id);
    }
    timers.clear();
  };
}

/** A random glyph for a spinning reel; doors only flash on the reels that carry them. */
function randomGlyph(column: number): string {
  const count = DOOR_REELS.includes(column) ? SYMBOLS.length : DOOR;
  return SYMBOLS[Math.floor(Math.random() * count)].glyph;
}

function openRules(root: HTMLElement): void {
  const close = el('button', { class: 'button', type: 'button', text: 'Fermer' });
  const payRows = SYMBOLS.slice(0, DOOR)
    .reverse()
    .map((s) => el('tr', {}, el('td', { text: s.glyph }), ...s.pays.map((m) => el('td', { text: `${m}×` }))));
  const levelRows = BET_LEVELS.map((l) =>
    el(
      'tr',
      {},
      el('td', { text: `${l.bet}` }),
      el('td', { text: JACKPOT_NAMES.slice(0, l.jackpotTier + 1).join(', ') }),
      el('td', { text: `${l.rtp.toFixed(1)} %` }),
    ),
  );
  const panel = el(
    'div',
    { class: 'bonus-rules' },
    el('h2', { text: 'Règles' }),
    el('p', { text: '10 lignes, de gauche à droite, 3 symboles identiques ou plus. Gains en fois la mise :' }),
    el('table', {}, el('tr', {}, el('th', { text: '' }), el('th', { text: '×3' }), el('th', { text: '×4' }), el('th', { text: '×5' })), ...payRows),
    el('h3', { text: 'La porte 🚪' }),
    el('p', {
      text: `Une porte sur les rouleaux 1, 3 et 5 en même temps ouvre le bonus Hold & Spin (environ 1 tirage sur 105, quelle que soit la mise). Tu commences avec 6 pièces et ${RESPINS} relances ; chaque nouvelle pièce bloque sa case et remet les relances à ${RESPINS}. Les pièces valent de 4 à 30 fois ta mise : plus tu mises, plus le bonus rapporte.`,
    }),
    el('p', {
      text: `Jackpots : Mini ${JACKPOT_MULTS[0]}×, Minor ${JACKPOT_MULTS[1]}×, Major ${JACKPOT_MULTS[2]}× la mise. Remplir les ${CELLS} cases à la mise maximale gagne le GRAND : le jackpot progressif (1 % de chaque mise l’alimente), au moins ${GRAND_MIN_BETS} fois la mise.`,
    }),
    el('table', {}, el('tr', {}, el('th', { text: 'Mise' }), el('th', { text: 'Jackpots' }), el('th', { text: 'Retour' })), ...levelRows),
    el('p', { class: 'bonus-small', text: 'Retour = part des mises rendue en moyenne sur un très grand nombre de tirages.' }),
    close,
  );
  const overlay = el('div', { class: 'bonus-overlay' }, panel);
  close.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  root.append(overlay);
}
