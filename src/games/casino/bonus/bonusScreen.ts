import './bonus.css';
import { el, topBar, type BackLink } from '../../../dom';
import { bet, chips, feedJackpot, jackpot, pay, winJackpot } from '../chips';
import {
  armSoundUnlock, burst, countUp, drawWinLines, marquee, muteButton, payoutTable, paylineDiagrams, playBonusTrigger,
  playCoinTick, playDoorOpen, playLose, playReelStop, playSmallWin, playSuspense, playSuspenseHit, playSuspenseMiss, playSpinLoop, rulesBlock, shake, showBigWin, tapToSpin, winTier,
  type WinLinesHandle, type WinPath,
} from '../fx';
import { CASINO_TEST_BUTTONS, takeForced, testBar } from '../fx'; // TEST-BUTTONS
import {
  BET_LEVELS,
  CELLS,
  COIN_VALUES,
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
  START_COINS,
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
const REEL_MS = 700;
const REEL_STAGGER = 220;
const TENSION_MS = 2200;
const STEP_MS = 900;
const COIN_GAP_MS = 220;
const LAST_DOOR_REEL = DOOR_REELS[DOOR_REELS.length - 1];
const MIN_COIN = COIN_VALUES[0][0];
const MAX_COIN = COIN_VALUES[COIN_VALUES.length - 1][0];

export function renderBonusSlot(root: HTMLElement): () => void {
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

  let levelIndex = 0;
  let busy = false;
  let lines: WinLinesHandle | null = null;
  let skipCount: (() => void) | null = null;

  const balance = el('span', { class: 'bonus-balance' });
  const jackpotValues = JACKPOT_NAMES.map(() => el('span', { class: 'bonus-jp-value' }));
  const jackpotBoxes = JACKPOT_NAMES.map((name, tier) =>
    el('div', { class: `bonus-jp bonus-jp-${tier}` }, el('span', { class: 'bonus-jp-name', text: name }), jackpotValues[tier]),
  );
  const jackpotsView = el('div', { class: 'bonus-jackpots' }, ...jackpotBoxes);
  const cellViews: HTMLElement[] = [];
  for (let i = 0; i < CELLS; i++) cellViews.push(el('div', { class: 'bonus-cell' }, randomGlyph(i % COLS)));
  const grid = el('div', { class: 'bonus-grid' }, ...cellViews);
  /** cells[col][row], the layout the fx kit expects. */
  const cells: HTMLElement[][] = Array.from({ length: COLS }, (_, c) => Array.from({ length: ROWS }, (_, r) => cellViews[r * COLS + c]));
  const respinsView = el('div', { class: 'bonus-respins' });
  const machine = el(
    'div',
    { class: 'bonus-machine' },
    el('div', { class: 'bonus-plaque', text: '🚪 Porte aux Jackpots 🚪' }),
    jackpotsView,
    el('div', { class: 'bonus-window' }, grid),
    respinsView,
  );
  const lights = marquee(machine, 10);
  const message = el('div', { class: 'bonus-message', role: 'status', text: '🚪 sur les rouleaux 1, 3 et 5 = bonus !' });
  const detail = el('div', { class: 'bonus-detail' });

  const betLabel = el('span', { class: 'bonus-bet-value' });
  const minus = el('button', { class: 'button button-secondary bonus-bet-step', type: 'button', text: '−' });
  const plus = el('button', { class: 'button button-secondary bonus-bet-step', type: 'button', text: '+' });
  const spinButton = el('button', { class: 'button bonus-spin', type: 'button', text: 'LANCER' });
  const rulesButton = el('button', { class: 'button button-secondary', type: 'button', text: 'Comment on gagne ?' });
  const rulesHost = el('div', { class: 'bonus-paytable' });
  rulesHost.hidden = true;

  const screen = el(
    'main',
    { class: 'bonus-screen' },
    machine,
    message,
    detail,
    el('div', { class: 'bonus-bet' }, minus, el('div', {}, el('div', { class: 'bonus-small', text: 'Mise' }), betLabel), plus),
    spinButton,
    rulesButton,
    rulesHost,
  );
  if (CASINO_TEST_BUTTONS) rulesButton.after(testBar([ // TEST-BUTTONS
    { label: 'Porte (bonus)', outcome: 'door' }, // TEST-BUTTONS
    ...JACKPOT_NAMES.map((name, tier) => ({ label: `Bonus + ${name}`, outcome: `${tier}` })), // TEST-BUTTONS
  ])); // TEST-BUTTONS
  tapToSpin(machine, spinButton);
  const right = el('span', { class: 'bonus-top-right' }, balance, muteButton());
  root.replaceChildren(topBar('Machine à porte', right, BACK_CASINO), screen);

  const level = () => BET_LEVELS[levelIndex];

  function refresh(): void {
    const lv = level();
    balance.textContent = `${chips().toLocaleString('fr-FR')} jetons`;
    betLabel.textContent = `${lv.bet} jetons`;
    JACKPOT_NAMES.forEach((_, tier) => {
      const locked = tier > lv.jackpotTier;
      const value = tier < 3 ? JACKPOT_MULTS[tier] * lv.bet : grandPrize(jackpot(MACHINE_ID), lv.bet);
      jackpotValues[tier].textContent = `${locked ? '🔒' : ''}${compact(value)}`;
      jackpotBoxes[tier].classList.toggle('bonus-jp-locked', locked);
      jackpotBoxes[tier].title = locked ? `Débloqué dès la mise ${BET_LEVELS.find((l) => l.jackpotTier >= tier)?.bet}` : '';
    });
    minus.disabled = busy || levelIndex === 0;
    plus.disabled = busy || levelIndex === BET_LEVELS.length - 1;
    spinButton.disabled = busy || chips() < lv.bet;
    if (!rulesHost.hidden) rulesHost.replaceChildren(...rules(lv));
  }

  minus.addEventListener('click', () => {
    levelIndex = Math.max(0, levelIndex - 1);
    refresh();
  });
  plus.addEventListener('click', () => {
    levelIndex = Math.min(BET_LEVELS.length - 1, levelIndex + 1);
    refresh();
  });
  rulesButton.addEventListener('click', () => {
    rulesHost.hidden = !rulesHost.hidden;
    refresh();
  });
  spinButton.addEventListener('click', () => void spin());

  async function spin(): Promise<void> {
    const lv = level();
    if (busy || !bet(lv.bet)) return;
    skipCount?.();
    skipCount = null;
    lines?.clear();
    lines = null;
    feedJackpot(MACHINE_ID, lv.bet * JACKPOT_FEED);
    busy = true;
    message.textContent = '…';
    message.className = 'bonus-message';
    detail.textContent = '';
    respinsView.replaceChildren();
    lights.setMode('spin');
    refresh();

    const force = CASINO_TEST_BUTTONS ? takeForced<string>() : null; // TEST-BUTTONS
    const forceTier = force !== null && force !== 'door' ? Number(force) : undefined; // TEST-BUTTONS
    const result = spinGrid(Math.random, force === null ? undefined : 'door'); // TEST-BUTTONS
    await animateReels(result);
    if (disposed) return;

    const wins = lineWins(result);
    const won = basePayout(wins, lv.bet);
    const triggered = triggersBonus(result);
    if (won > 0) {
      pay(won);
      refresh();
      await celebrateBase(wins, won, lv.bet, triggered);
    } else if (!triggered) {
      lights.setMode('idle');
      playLose();
      message.textContent = nearMiss(result) ? 'Presque ! Relance !' : 'Pas de chance, relance !';
    }

    if (triggered) {
      await wait(won > 0 ? 1200 : 300);
      await runBonus(playBonus(Math.random, lv, forceTier), lv); // TEST-BUTTONS
    }
    busy = false;
    const id = window.setTimeout(() => {
      if (!busy) lights.setMode('idle');
    }, 4000);
    timers.add(id);
    refresh();
  }

  async function celebrateBase(wins: ReturnType<typeof lineWins>, won: number, stake: number, triggered: boolean): Promise<void> {
    const paths: WinPath[] = wins.map((w) => ({
      cells: LINES[w.line].slice(0, w.count).map((row, col) => [col, row] as [number, number]),
      path: LINES[w.line],
    }));
    lines = drawWinLines(grid, cells, paths, (i) => {
      const w = wins[i];
      detail.textContent = `Ligne ${w.line + 1} : ${SYMBOLS[w.symbol].glyph.repeat(w.count)} = ${Math.round(w.mult * stake)} jetons`;
    });
    if (wins.length > 1) detail.textContent = `${wins.length} lignes gagnantes !`;
    const multiple = won / stake;
    const suffix = multiple >= 1 ? ` (×${multiple.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ta mise)` : '';
    const tier = winTier(won, stake);
    message.className = `bonus-message bonus-win-text${tier > 0 ? ' bonus-big' : ''}`;
    if (tier > 0 && !triggered) {
      lights.setMode('big');
      shake(machine, tier >= 2 ? 3 : 2);
      message.textContent = `+${won} jetons${suffix}`;
      await showBigWin(document.body, won, stake);
    } else {
      lights.setMode('win');
      playSmallWin();
      if (multiple >= 2) shake(machine, 1);
      burst(machine, Math.min(30, 6 + Math.round(multiple * 4)), 'coins');
      skipCount = countUp(message, won, Math.min(1500, 400 + multiple * 200), (n) => `+${n} jetons${n === won ? suffix : ''}`);
    }
  }

  async function animateReels(result: Grid): Promise<void> {
    cellViews.forEach((v) => (v.className = 'bonus-cell bonus-rolling'));
    const stopLoop = playSpinLoop();
    const roll = window.setInterval(() => {
      cellViews.forEach((v, i) => {
        if (v.classList.contains('bonus-rolling')) v.textContent = randomGlyph(i % COLS);
      });
    }, 70);
    timers.add(roll);
    let doorsShown = 0;
    for (let c = 0; c < COLS; c++) {
      // Anticipation: two doors are up, the last door reel slows down and the machine trembles.
      const tense = doorsShown === DOOR_REELS.length - 1 && c === LAST_DOOR_REEL;
      if (tense) {
        cells[c].forEach((v) => v.classList.add('bonus-tension'));
        machine.classList.add('bonus-machine-tense');
        lights.setMode('big');
        message.textContent = 'Encore une porte…';
        message.className = 'bonus-message bonus-tension-text';
        shake(machine, 1);
        const stopSuspense = playSuspense(TENSION_MS);
        await wait(TENSION_MS);
        stopSuspense();
        machine.classList.remove('bonus-machine-tense');
      } else {
        await wait(c === 0 ? REEL_MS : REEL_STAGGER);
      }
      if (disposed) return;
      playReelStop(c);
      cells[c].forEach((v, r) => {
        const symbol = result[c][r];
        v.className = `bonus-cell bonus-landed${symbol === DOOR ? ' bonus-door' : ''}`;
        v.textContent = SYMBOLS[symbol].glyph;
      });
      if (tense) (hasDoor(result, c) ? playSuspenseHit : playSuspenseMiss)();
      if (DOOR_REELS.includes(c) && hasDoor(result, c)) doorsShown++;
    }
    stopLoop();
    message.textContent = '';
    message.className = 'bonus-message';
    window.clearInterval(roll);
    timers.delete(roll);
  }

  async function intro(lv: BetLevel): Promise<void> {
    const banner = el(
      'div',
      { class: 'bonus-celebrate', role: 'dialog' },
      el('div', { class: 'bonus-celebrate-door', text: '🚪' }),
      el('div', { class: 'bonus-celebrate-text', text: 'BONUS !' }),
      el('div', { class: 'bonus-celebrate-sub', text: 'HOLD & SPIN' }),
      el('div', { text: `${START_COINS} pièces de départ, ${RESPINS} relances` }),
      el('div', { text: `Pièces de ${lv.bet * MIN_COIN} à ${lv.bet * MAX_COIN} jetons` }),
      el('div', { class: 'bonus-small-light', text: `Jackpots : ${JACKPOT_NAMES.slice(0, lv.jackpotTier + 1).join(', ')}` }),
    );
    document.body.append(banner);
    burst(banner, 30, 'confetti');
    await Promise.race([wait(3000), new Promise<void>((r) => banner.addEventListener('click', () => r(), { once: true }))]);
    banner.remove();
  }

  async function runBonus(bonus: BonusResult, lv: BetLevel): Promise<void> {
    lines?.clear();
    lines = null;
    skipCount?.();
    playBonusTrigger();
    lights.setMode('big');
    shake(machine, 3);
    message.textContent = 'Les portes s’ouvrent !';
    message.className = 'bonus-message bonus-big';
    detail.textContent = '';
    cellViews.forEach((v) => {
      if (v.classList.contains('bonus-door')) v.classList.add('bonus-door-open');
    });
    playDoorOpen(0.35);
    await wait(1300);
    await intro(lv);
    if (disposed) return;

    screen.classList.add('bonus-in-feature');
    message.className = 'bonus-message';
    cellViews.forEach((v) => {
      v.className = 'bonus-cell bonus-empty';
      v.textContent = '';
    });
    let running = 0;
    for (const step of bonus.steps) {
      respinsView.replaceChildren(
        ...Array.from({ length: RESPINS }, (_, k) => el('span', { class: `bonus-dot${k < step.respinsLeft ? ' bonus-dot-on' : ''}` })),
      );
      if (step.fresh.length === 0) {
        lights.setMode('spin');
        playLose();
      }
      for (const i of step.fresh) {
        const coin = step.cells[i] as Coin;
        const v = cellViews[i];
        const value = coinChips(coin, lv.bet);
        v.className = `bonus-cell bonus-coin bonus-pop${coin.kind === 'jackpot' ? ' bonus-coin-jp' : ''}`;
        v.textContent = coin.kind === 'value' ? `${value}` : JACKPOT_NAMES[coin.tier];
        running += value;
        message.textContent = `Bonus : ${running.toLocaleString('fr-FR')} jetons`;
        playReelStop(i % COLS);
        playCoinTick();
        if (coin.kind === 'jackpot') {
          lights.setMode('big');
          shake(machine, 2);
          jackpotBoxes[coin.tier].classList.add('bonus-jp-hit');
          await wait(400);
          await showBigWin(document.body, value, lv.bet, `JACKPOT ${JACKPOT_NAMES[coin.tier].toUpperCase()} !`);
        } else {
          if (coin.mult >= 15) shake(machine, 1);
          await wait(COIN_GAP_MS);
        }
        if (disposed) return;
      }
      if (step.fresh.length > 0 && step !== bonus.steps[0]) {
        lights.setMode('win');
        message.className = 'bonus-message bonus-big';
      }
      await wait(STEP_MS);
      message.className = 'bonus-message';
    }

    pay(bonus.chips);
    refresh();
    lights.setMode('big');
    shake(machine, 3);
    burst(machine, 40, 'coins');
    message.className = 'bonus-message bonus-big';
    const ratio = Math.round(bonus.chips / lv.bet);
    await new Promise<void>((resolve) => {
      skipCount = countUp(message, bonus.chips, 1800, (n) => `Bonus : ${n.toLocaleString('fr-FR')} jetons`, resolve);
    });
    await showBigWin(document.body, bonus.chips, lv.bet, 'BONUS TERMINÉ !');
    message.textContent = `Bonus : ${bonus.chips.toLocaleString('fr-FR')} jetons (×${ratio} ta mise) !`;
    if (bonus.grand) {
      jackpotBoxes[3].classList.add('bonus-jp-hit');
      const pool = winJackpot(MACHINE_ID);
      const prize = grandPrize(pool, lv.bet);
      pay(prize - pool);
      refresh();
      shake(machine, 3);
      await showBigWin(document.body, prize, lv.bet, 'JACKPOT GRAND !');
      message.textContent = `GRAND JACKPOT ! +${prize.toLocaleString('fr-FR')} jetons, plus ${bonus.chips.toLocaleString('fr-FR')} de pièces !`;
    }
    refresh();
    await wait(1200);
    respinsView.replaceChildren();
    jackpotBoxes.forEach((box) => box.classList.remove('bonus-jp-hit'));
    screen.classList.remove('bonus-in-feature');
  }

  refresh();
  return () => {
    disposed = true;
    skipCount?.();
    lines?.clear();
    for (const id of timers) {
      window.clearTimeout(id);
      window.clearInterval(id);
    }
    timers.clear();
  };
}

/** Short amount for the jackpot header: 1 500, 25 k, 1,2 M. */
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`;
  if (n >= 100_000) return `${Math.floor(n / 1000).toLocaleString('fr-FR')} k`;
  return Math.floor(n).toLocaleString('fr-FR');
}

/** A random glyph for a spinning reel; doors only flash on the reels that carry them. */
function randomGlyph(column: number): string {
  const count = DOOR_REELS.includes(column) ? SYMBOLS.length : DOOR;
  return SYMBOLS[Math.floor(Math.random() * count)].glyph;
}

/** Two high symbols at the start of a line, or two doors out of three: worth a "so close". */
function nearMiss(grid: Grid): boolean {
  const doors = DOOR_REELS.filter((c) => hasDoor(grid, c)).length;
  if (doors === DOOR_REELS.length - 1) return true;
  return LINES.some((line) => {
    const a = grid[0][line[0]];
    return a !== DOOR && a === grid[1][line[1]] && SYMBOLS[a].pays[0] >= 1;
  });
}

const SYMBOL_NAMES: Record<string, string> = {
  cherry: 'Cerise', lemon: 'Citron', bell: 'Cloche', star: 'Étoile', gem: 'Diamant', seven: 'Sept',
};

function rules(lv: BetLevel): HTMLElement[] {
  const entries = SYMBOLS.slice(0, DOOR).reverse().map((s) => ({
    glyph: s.glyph,
    name: SYMBOL_NAMES[s.id] ?? s.id,
    counts: [3, 4, 5],
    multipliers: [...s.pays],
  }));
  const jackpotRows = BET_LEVELS.map((l) =>
    el('tr', { class: l === lv ? 'bonus-row-on' : '' }, el('td', { text: `${l.bet}` }), el('td', { text: JACKPOT_NAMES.slice(0, l.jackpotTier + 1).join(', ') })),
  );
  return [
    rulesBlock(
      'Comment on gagne',
      `Il y a ${LINES.length} lignes (dessins ci-dessous), toutes jouées à chaque lancer.`,
      'Une ligne gagne avec au moins 3 symboles identiques, collés, en partant du rouleau de GAUCHE.',
      'Plusieurs lignes peuvent gagner en même temps : les gains s’additionnent.',
    ),
    el('h3', { class: 'bonus-paytable-title', text: `Les ${LINES.length} lignes` }),
    paylineDiagrams(LINES, ROWS),
    el('h3', { class: 'bonus-paytable-title', text: `Gains par ligne (mise ${lv.bet})` }),
    payoutTable(entries, lv.bet),
    rulesBlock(
      'La porte 🚪',
      'Une porte sur les rouleaux 1, 3 ET 5 en même temps ouvre le bonus Hold & Spin (environ 1 lancer sur 106, quelle que soit la mise).',
      `Tu commences avec ${START_COINS} pièces et ${RESPINS} relances. Chaque nouvelle pièce reste bloquée et remet les relances à ${RESPINS}.`,
      `Une pièce vaut de ${MIN_COIN} à ${MAX_COIN} × ta mise (de ${MIN_COIN * lv.bet} à ${MAX_COIN * lv.bet} jetons à cette mise).`,
      'Un bonus rapporte en moyenne environ 65 × ta mise : plus tu mises, plus il paie.',
    ),
    rulesBlock(
      'Les jackpots',
      `Mini = ${JACKPOT_MULTS[0]} × la mise, Minor = ${JACKPOT_MULTS[1]} ×, Major = ${JACKPOT_MULTS[2]} ×.`,
      `GRAND : remplir les ${CELLS} cases. C’est le jackpot progressif (1 % de chaque mise le fait monter), au moins ${GRAND_MIN_BETS} × la mise.`,
      'Les grosses mises débloquent les gros jackpots :',
    ),
    el('table', { class: 'bonus-jp-table' }, el('tr', {}, el('th', { text: 'Mise' }), el('th', { text: 'Jackpots possibles' })), ...jackpotRows),
  ];
}
