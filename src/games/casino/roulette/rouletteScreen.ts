import './roulette.css';
import { el, topBar } from '../../../dom';
import { bet, chips, pay } from '../chips';
import { WHEEL_ORDER, colorOf, drawNumber, payout, totalStake, type BetId, type Bets } from './rouletteLogic';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CHIP_VALUES = [1, 5, 25, 100];
const SPIN_MS = 4000;
const HISTORY_SIZE = 12;
const SLICE = 360 / 37;

let history: number[] = [];

export function renderRoulette(root: HTMLElement): () => void {
  const bets: Bets = new Map();
  let lastBets: Bets = new Map();
  let chipValue = 5;
  let spinning = false;
  let wheelAngle = 0;
  let ballAngle = 0;
  let timer: number | undefined;
  let settle: (() => void) | undefined;

  const balance = el('span', { class: 'rl-balance' });
  const message = el('p', { class: 'rl-message', text: 'Place tes jetons puis lance la bille.' });
  const historyRow = el('div', { class: 'rl-history' });
  const stakeLabel = el('span', { class: 'rl-stake' });

  // --- wheel
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '-110 -110 220 220');
  svg.setAttribute('class', 'rl-wheel');
  const wheel = document.createElementNS(SVG_NS, 'g');
  wheel.setAttribute('class', 'rl-wheel-rotor');
  WHEEL_ORDER.forEach((n, i) => {
    const a0 = ((i - 0.5) * SLICE - 90) * (Math.PI / 180);
    const a1 = ((i + 0.5) * SLICE - 90) * (Math.PI / 180);
    const path = document.createElementNS(SVG_NS, 'path');
    const r = 100;
    const ri = 55;
    path.setAttribute(
      'd',
      `M ${ri * Math.cos(a0)} ${ri * Math.sin(a0)} L ${r * Math.cos(a0)} ${r * Math.sin(a0)} ` +
        `A ${r} ${r} 0 0 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} L ${ri * Math.cos(a1)} ${ri * Math.sin(a1)} ` +
        `A ${ri} ${ri} 0 0 0 ${ri * Math.cos(a0)} ${ri * Math.sin(a0)} Z`,
    );
    path.setAttribute('class', `rl-pocket rl-${colorOf(n)}`);
    wheel.append(path);
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('class', 'rl-pocket-label');
    text.setAttribute('transform', `rotate(${i * SLICE}) translate(0 -86)`);
    text.textContent = String(n);
    wheel.append(text);
  });
  const hub = document.createElementNS(SVG_NS, 'circle');
  hub.setAttribute('r', '55');
  hub.setAttribute('class', 'rl-hub');
  wheel.append(hub);
  const ballGroup = document.createElementNS(SVG_NS, 'g');
  ballGroup.setAttribute('class', 'rl-ball-orbit');
  const ball = document.createElementNS(SVG_NS, 'circle');
  ball.setAttribute('r', '5');
  ball.setAttribute('cy', '-68');
  ball.setAttribute('class', 'rl-ball');
  ballGroup.append(ball);
  const pointer = document.createElementNS(SVG_NS, 'path');
  pointer.setAttribute('d', 'M -6 -110 L 6 -110 L 0 -100 Z');
  pointer.setAttribute('class', 'rl-pointer');
  svg.append(wheel, ballGroup, pointer);

  // --- betting table
  const cells = new Map<BetId, HTMLButtonElement>();
  const cell = (id: BetId, label: string, extra = ''): HTMLButtonElement => {
    const button = el('button', { class: `rl-cell ${extra}`, type: 'button', 'data-bet': id }, el('span', { text: label }));
    button.addEventListener('click', () => addBet(id));
    cells.set(id, button);
    return button;
  };
  const grid = el('div', { class: 'rl-grid' });
  grid.append(cell('n0', '0', 'rl-green rl-zero'));
  for (let n = 1; n <= 36; n++) grid.append(cell(`n${n}`, String(n), `rl-${colorOf(n)}`));
  for (let c = 1; c <= 3; c++) grid.append(cell(`col${c}`, '2:1', 'rl-outside'));
  const dozens = el('div', { class: 'rl-row3' }, cell('dz1', '1-12', 'rl-outside'), cell('dz2', '13-24', 'rl-outside'), cell('dz3', '25-36', 'rl-outside'));
  const simples = el(
    'div',
    { class: 'rl-row6' },
    cell('low', '1-18', 'rl-outside'),
    cell('even', 'Pair', 'rl-outside'),
    cell('red', 'Rouge', 'rl-outside rl-red'),
    cell('black', 'Noir', 'rl-outside rl-black'),
    cell('odd', 'Impair', 'rl-outside'),
    cell('high', '19-36', 'rl-outside'),
  );

  // --- controls
  const chipButtons = CHIP_VALUES.map((value) => {
    const b = el('button', { class: 'rl-chip', type: 'button', text: String(value) });
    b.addEventListener('click', () => {
      chipValue = value;
      refresh();
    });
    return b;
  });
  const clearButton = el('button', { class: 'button button-secondary', type: 'button', text: 'Effacer' });
  const repeatButton = el('button', { class: 'button button-secondary', type: 'button', text: 'Rejouer' });
  const spinButton = el('button', { class: 'button', type: 'button', text: 'Lancer' });
  clearButton.addEventListener('click', () => {
    bets.clear();
    refresh();
  });
  repeatButton.addEventListener('click', () => {
    bets.clear();
    for (const [id, amount] of lastBets) bets.set(id, amount);
    refresh();
  });
  spinButton.addEventListener('click', spin);

  root.append(
    topBar('Roulette', balance, { href: '#/casino', label: 'Casino' }),
    el(
      'main',
      { class: 'rl-screen' },
      el('div', { class: 'rl-wheel-box' }, svg),
      historyRow,
      message,
      el('div', { class: 'rl-chips' }, ...chipButtons),
      el('div', { class: 'rl-table' }, grid, dozens, simples),
      stakeLabel,
      el('div', { class: 'button-row rl-actions' }, clearButton, repeatButton, spinButton),
    ),
  );

  function addBet(id: BetId): void {
    if (spinning) return;
    if (totalStake(bets) + chipValue > chips()) {
      message.textContent = 'Pas assez de jetons pour cette mise.';
      return;
    }
    bets.set(id, (bets.get(id) ?? 0) + chipValue);
    refresh();
  }

  function spin(): void {
    const stake = totalStake(bets);
    if (spinning || stake === 0) return;
    if (!bet(stake)) {
      message.textContent = 'Pas assez de jetons.';
      return;
    }
    spinning = true;
    lastBets = new Map(bets);
    const n = drawNumber();
    const index = WHEEL_ORDER.indexOf(n);
    // Wheel turns clockwise, ball counter-clockwise; ball rests at the top, pocket brought under it.
    const pocketTarget = -index * SLICE;
    wheelAngle = wheelAngle - (wheelAngle % 360) + 720 + pocketTarget + 360;
    ballAngle = ballAngle - (ballAngle % 360) - 1440;
    wheel.style.transform = `rotate(${wheelAngle}deg)`;
    ballGroup.style.transform = `rotate(${ballAngle}deg)`;
    message.textContent = 'Les jeux sont faits, rien ne va plus...';
    refresh();
    settle = () => {
      settle = undefined;
      const won = payout(bets, n);
      pay(won);
      history = [n, ...history].slice(0, HISTORY_SIZE);
      const name = n === 0 ? 'zéro' : colorOf(n) === 'red' ? 'rouge' : 'noir';
      message.textContent = won > 0 ? `${n} ${name} : tu gagnes ${won} jetons !` : `${n} ${name} : perdu cette fois.`;
      bets.clear();
      spinning = false;
      refresh();
    };
    timer = window.setTimeout(() => {
      timer = undefined;
      settle?.();
    }, SPIN_MS);
  }

  function refresh(): void {
    balance.textContent = `${chips().toLocaleString('fr-FR')} jetons`;
    for (const [id, button] of cells) {
      const amount = bets.get(id);
      button.querySelector('.rl-stack')?.remove();
      if (amount) button.append(el('span', { class: 'rl-stack', text: String(amount) }));
    }
    chipButtons.forEach((b, i) => b.classList.toggle('rl-chip-active', CHIP_VALUES[i] === chipValue));
    const stake = totalStake(bets);
    stakeLabel.textContent = `Mise totale : ${stake} jetons`;
    spinButton.disabled = spinning || stake === 0;
    clearButton.disabled = spinning || stake === 0;
    repeatButton.disabled = spinning || lastBets.size === 0;
    historyRow.replaceChildren(
      ...history.map((h) => el('span', { class: `rl-hist rl-${colorOf(h)}`, text: String(h) })),
    );
  }

  refresh();
  return () => {
    if (timer !== undefined) window.clearTimeout(timer);
    // Leaving mid-spin still settles the chips already taken.
    settle?.();
  };
}
