import './olympus.css';
import { el, topBar, type BackLink } from '../../../dom';
import { bet, chips, pay } from '../chips';
import {
  BETS,
  CELLS,
  COLS,
  FREE_SPINS_BY_SCATTERS,
  LINES,
  MAX_MULTIPLIER,
  MIN_SCATTERS,
  RETRIGGER_SPINS,
  ROWS,
  RTP,
  SCATTER,
  SYMBOLS,
  WILD,
  WILD_REELS,
  chipsFor,
  freeSpinsFor,
  lineWins,
  playFreeSpins,
  scatterCount,
  spinGrid,
  winMult,
  type FreeSpinsResult,
  type Grid,
  type LineWin,
} from './olympusLogic';

const BACK_CASINO: BackLink = { href: '#/casino', label: 'Casino' };
const REEL_MS = 650;
const REEL_STAGGER = 140;
const TENSION_MS = 1300;
const FREE_REEL_MS = 380;
const FREE_STAGGER = 90;

export function renderOlympus(root: HTMLElement): () => void {
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

  const balance = el('span', { class: 'oly-balance' });
  const cellViews: HTMLElement[] = [];
  for (let i = 0; i < CELLS; i++) cellViews.push(el('div', { class: 'oly-cell' }, randomGlyph()));
  const grid = el('div', { class: 'oly-grid' }, ...cellViews);
  const featureBar = el('div', { class: 'oly-feature-bar' });
  const message = el('div', { class: 'oly-message', text: '3 temples 🏛️ ou plus déclenchent les tours gratuits !' });

  const betLabel = el('span', { class: 'oly-bet-value' });
  const minus = el('button', { class: 'button button-secondary oly-bet-step', type: 'button', text: '−' });
  const plus = el('button', { class: 'button button-secondary oly-bet-step', type: 'button', text: '+' });
  const spinButton = el('button', { class: 'button oly-spin', type: 'button', text: 'Tourner' });
  const rulesButton = el('button', { class: 'button button-secondary', type: 'button', text: 'Règles' });

  const screen = el(
    'main',
    { class: 'oly-screen' },
    el('div', { class: 'oly-title', text: '⚡ Foudre de l’Olympe ⚡' }),
    el('div', { class: 'oly-machine' }, featureBar, grid),
    message,
    el('div', { class: 'oly-bet' }, minus, el('div', {}, el('div', { class: 'oly-small', text: 'Mise (30 lignes)' }), betLabel), plus),
    el('div', { class: 'button-row' }, spinButton, rulesButton),
  );
  root.replaceChildren(topBar('Foudre de l’Olympe', balance, BACK_CASINO), screen);

  const currentBet = () => BETS[betIndex];
  const cellAt = (col: number, row: number) => cellViews[row * COLS + col];

  function refresh(): void {
    balance.textContent = `${chips()} jetons`;
    betLabel.textContent = `${currentBet()} jetons`;
    minus.disabled = busy || betIndex === 0;
    plus.disabled = busy || betIndex === BETS.length - 1;
    spinButton.disabled = busy || chips() < currentBet();
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
  rulesButton.addEventListener('click', () => openRules(root));
  spinButton.addEventListener('click', () => void spin());

  async function spin(): Promise<void> {
    const stake = currentBet();
    if (busy || !bet(stake)) return;
    busy = true;
    setMessage('');
    refresh();

    const result = spinGrid(Math.random, false);
    await animateReels(result, false);
    if (disposed) return;

    const wins = lineWins(result);
    const won = chipsFor(winMult(wins), stake);
    const scatters = scatterCount(result);
    if (won > 0) {
      pay(won);
      highlight(wins);
      setMessage(`Gagné : ${won} jetons`);
    } else if (scatters < MIN_SCATTERS) {
      setMessage('Rien cette fois…');
    }
    refresh();

    if (scatters >= MIN_SCATTERS) {
      await wait(won > 0 ? 900 : 300);
      await runFreeSpins(playFreeSpins(Math.random, freeSpinsFor(scatters)), freeSpinsFor(scatters), stake);
    }
    busy = false;
    refresh();
  }

  function highlight(wins: LineWin[]): void {
    for (const w of wins) {
      for (let c = 0; c < w.count; c++) cellAt(c, LINES[w.line][c]).classList.add('oly-win');
    }
  }

  async function animateReels(result: Grid, fast: boolean): Promise<void> {
    cellViews.forEach((v) => (v.className = 'oly-cell oly-rolling'));
    const roll = window.setInterval(() => {
      cellViews.forEach((v) => {
        if (v.classList.contains('oly-rolling')) v.textContent = randomGlyph();
      });
    }, 70);
    timers.add(roll);
    let scattersShown = 0;
    for (let c = 0; c < COLS; c++) {
      // Anticipation: two temples are up, every remaining reel slows down.
      const tense = scattersShown === MIN_SCATTERS - 1;
      if (tense) {
        for (let r = 0; r < ROWS; r++) cellAt(c, r).classList.add('oly-tension');
        setMessage('Encore un temple…', 'oly-tension-text');
      }
      const first = fast ? FREE_REEL_MS : REEL_MS;
      await wait(c === 0 ? first : tense ? TENSION_MS : fast ? FREE_STAGGER : REEL_STAGGER);
      for (let r = 0; r < ROWS; r++) {
        const symbol = result[c][r];
        const v = cellAt(c, r);
        v.className = `oly-cell oly-landed${symbol === SCATTER ? ' oly-scatter' : ''}${symbol === WILD ? ' oly-wild' : ''}`;
        v.textContent = SYMBOLS[symbol].glyph;
      }
      scattersShown += result[c].filter((s) => s === SCATTER).length;
    }
    if (message.classList.contains('oly-tension-text')) setMessage('');
    window.clearInterval(roll);
    timers.delete(roll);
  }

  async function runFreeSpins(feature: FreeSpinsResult, startSpins: number, stake: number): Promise<void> {
    setMessage('Les temples s’illuminent !', 'oly-big');
    await wait(1200);

    const banner = el(
      'div',
      { class: 'oly-celebrate' },
      el('div', { class: 'oly-celebrate-bolt', text: '⚡' }),
      el('div', { class: 'oly-celebrate-text', text: `${startSpins} TOURS GRATUITS !` }),
      el('div', { text: 'Chaque rouleau de foudre ajoute +1 au multiplicateur' }),
    );
    screen.append(banner);
    await wait(2600);
    banner.remove();

    screen.classList.add('oly-in-feature');
    setMessage('');
    let total = 0;
    let multiplier = 1;
    const showBar = (left: number) =>
      featureBar.replaceChildren(
        el('span', {}, 'Tours ', el('b', { text: `${left}` })),
        el('span', { class: 'oly-mult' }, '×', el('b', { text: `${multiplier}` })),
        el('span', {}, 'Total ', el('b', { text: `${total}` })),
      );
    showBar(startSpins);

    for (const step of feature.spins) {
      await animateReels(step.grid, true);
      if (disposed) return;
      if (step.multiplier > multiplier) {
        multiplier = step.multiplier;
        screen.classList.remove('oly-flash');
        void screen.offsetWidth;
        screen.classList.add('oly-flash');
      }
      const won = chipsFor(step.mult, stake);
      total += won;
      highlight(step.wins);
      showBar(step.spinsLeft);
      if (step.added > 0) {
        setMessage(`+${step.added} tours gratuits !`, 'oly-big');
        await wait(1400);
      } else if (won > 0) {
        setMessage(`+${won} jetons (×${step.multiplier})`);
      } else {
        setMessage('');
      }
      await wait(won > 0 ? 900 : 450);
    }

    const totalChips = chipsFor(feature.mult, stake);
    pay(totalChips);
    const x = Math.round(totalChips / stake);
    setMessage(
      x >= 300 ? `GAIN ÉNORME ! ${totalChips} jetons (${x}× la mise) !` : `Tours gratuits terminés : ${totalChips} jetons (${x}× la mise)`,
      'oly-big',
    );
    refresh();
    await wait(1800);
    featureBar.replaceChildren();
    screen.classList.remove('oly-in-feature', 'oly-flash');
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

function randomGlyph(): string {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].glyph;
}

function openRules(root: HTMLElement): void {
  const close = el('button', { class: 'button', type: 'button', text: 'Fermer' });
  const payRows = SYMBOLS.slice(0, WILD)
    .reverse()
    .map((s) => el('tr', {}, el('td', { text: s.glyph }), ...s.pays.map((m) => el('td', { text: `${m}×` }))));
  const reels = WILD_REELS.map((c) => c + 1).join(', ');
  const panel = el(
    'div',
    { class: 'oly-rules' },
    el('h2', { text: 'Règles' }),
    el('p', { text: '30 lignes, de gauche à droite, 3 symboles identiques ou plus. Gains en fois la mise totale :' }),
    el('table', {}, el('tr', {}, el('th', { text: '' }), el('th', { text: '×3' }), el('th', { text: '×4' }), el('th', { text: '×5' })), ...payRows),
    el('h3', { text: 'La foudre ⚡' }),
    el('p', { text: `La foudre tombe en rouleau entier sur les rouleaux ${reels} et remplace tous les symboles sauf le temple.` }),
    el('h3', { text: 'Le temple 🏛️' }),
    el('p', {
      text: `${MIN_SCATTERS} temples ou plus, n’importe où, offrent des tours gratuits : ${FREE_SPINS_BY_SCATTERS[3]} pour 3, ${FREE_SPINS_BY_SCATTERS[4]} pour 4, ${FREE_SPINS_BY_SCATTERS[5]} pour 5 (environ 1 tirage sur 140).`,
    }),
    el('h3', { text: 'Tours gratuits' }),
    el('p', {
      text: `La foudre tombe bien plus souvent. Le multiplicateur commence à ×1 et chaque rouleau de foudre lui ajoute +1, pour le tour en cours et tous les suivants, jusqu’à ×${MAX_MULTIPLIER}. ${MIN_SCATTERS} temples pendant les tours gratuits en ajoutent ${RETRIGGER_SPINS}.`,
    }),
    el('p', {
      text: `Retour : ${RTP.toFixed(1)} % à toutes les mises. Volatilité très haute : l’essentiel des gains vient des tours gratuits.`,
    }),
    el('p', { class: 'oly-small', text: 'Retour = part des mises rendue en moyenne sur un très grand nombre de tirages.' }),
    close,
  );
  const overlay = el('div', { class: 'oly-overlay' }, panel);
  close.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  root.append(overlay);
}
