import './casino.css';
import { el, topBar } from '../../dom';
import { loadCompanion } from '../../companion/companionSave';
import { CHIPS_PER_COIN, buyChips, canRefillToday, claimDailyRefill, loadCasino, pay } from './chips';
import { renderSlots } from './slots/slotsScreen';
import { renderBonusSlot } from './bonus/bonusScreen';
import { renderOlympus } from './olympus/olympusScreen';
import { renderBlackjack } from './blackjack/blackjackScreen';
import { renderRoulette } from './roulette/rouletteScreen';

const GAMES: Record<string, { render: (root: HTMLElement) => () => void; icon: string; title: string; hint: string }> = {
  sous: { render: renderSlots, icon: '🍒', title: 'Machine à sous', hint: '5 rouleaux, jackpot progressif' },
  porte: { render: renderBonusSlot, icon: '🚪', title: 'Machine à porte', hint: 'Décroche le bonus, plus la mise est haute, mieux il paie' },
  olympe: { render: renderOlympus, icon: '⚡', title: 'Foudre de l’Olympe', hint: 'Presque rien sans les temples, tout avec les tours gratuits' },
  blackjack: { render: renderBlackjack, icon: '🃏', title: 'Blackjack', hint: 'Bats le croupier sans dépasser 21' },
  roulette: { render: renderRoulette, icon: '🎡', title: 'Roulette', hint: 'Européenne, un seul zéro' },
};

const COIN_PACKS = [1, 10, 50, 100];

/** `#/casino` shows the lobby, `#/casino/<game>` a table. */
export function renderCasino(root: HTMLElement, params: string[]): () => void {
  const game = GAMES[params[0] ?? ''];
  if (game) return game.render(root);
  renderLobby(root);
  return () => {};
}

function renderLobby(root: HTMLElement): void {
  const refill = claimDailyRefill();
  const save = loadCasino();
  const coins = loadCompanion().coins;

  const status = el('p', { class: 'casino-status', role: 'status' });
  if (refill > 0) status.textContent = `Recharge du jour : +${refill} jetons`;

  const packs = el('div', { class: 'casino-packs' });
  for (const pack of COIN_PACKS) {
    const button = el('button', { class: 'button button-secondary', type: 'button', text: `${pack} 🪙 → ${pack * CHIPS_PER_COIN}` });
    button.disabled = coins < pack;
    button.addEventListener('click', () => {
      if (!buyChips(pack)) return;
      root.replaceChildren();
      renderLobby(root);
    });
    packs.append(button);
  }

  const bank = el(
    'section',
    { class: 'casino-bank' },
    el('strong', { class: 'casino-balance', text: `${save.chips} jetons` }),
    el('span', { class: 'casino-record', text: `Record : ${save.record} jetons` }),
    status,
  );
  // Secret: five quick taps on the balance give 100 chips.
  let taps = 0;
  let lastTap = 0;
  bank.addEventListener('click', () => {
    const now = Date.now();
    taps = now - lastTap < 600 ? taps + 1 : 1;
    lastTap = now;
    if (taps < 5) return;
    pay(100);
    root.replaceChildren();
    renderLobby(root);
  });

  const tables = el('div', { class: 'casino-tables' });
  for (const [id, game] of Object.entries(GAMES)) {
    tables.append(
      el(
        'a',
        { class: 'menu-card', href: `#/casino/${id}` },
        el('span', { class: 'casino-table-icon', 'aria-hidden': 'true', text: game.icon }),
        el('span', { class: 'menu-card-text' }, el('strong', { text: game.title }), el('span', { class: 'menu-card-hint', text: game.hint })),
      ),
    );
  }

  root.append(
    el(
      'div',
      { class: 'casino' },
      topBar('Casino'),
      el(
        'main',
        { class: 'casino-lobby' },
        bank,
        tables,
        el(
          'section',
          { class: 'casino-cashier' },
          el('h2', { text: 'Guichet' }),
          el('p', {
            text: `Tu as ${coins} 🪙. Une pièce donne ${CHIPS_PER_COIN} jetons. Les jetons ne redeviennent jamais des pièces.`,
          }),
          packs,
          el('p', {
            class: 'casino-note',
            text: canRefillToday()
              ? 'Reviens sur cet écran pour toucher ta recharge du jour.'
              : 'Sous 200 jetons, le casino te recharge à 200 une fois par jour.',
          }),
        ),
      ),
    ),
  );
}
