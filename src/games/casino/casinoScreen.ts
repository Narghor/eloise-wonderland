import './casino.css';
import { el, topBar } from '../../dom';
import { loadCompanion } from '../../companion/companionSave';
import { CHIPS_PER_COIN, DAILY_GIFT, buyChips, claimDailyGift, loadCasino, pay } from './chips';
import { burst, playBonusTrigger } from './fx';
import { renderSlots } from './slots/slotsScreen';
import { renderBonusSlot } from './bonus/bonusScreen';
import { renderOlympus } from './olympus/olympusScreen';
import { renderLuna } from './luna/lunaScreen';
import { ELOISE_ICON } from './luna/lunaArt';
import { renderBlackjack } from './blackjack/blackjackScreen';
import { renderRoulette } from './roulette/rouletteScreen';

/** `iconSvg` (trusted inline SVG) replaces the emoji `icon` in the lobby. */
const GAMES: Record<string, { render: (root: HTMLElement) => () => void; icon: string; iconSvg?: string; title: string; hint: string }> = {
  sous: { render: renderSlots, icon: '🍒', title: 'Machine à sous', hint: '5 rouleaux, jackpot progressif' },
  porte: { render: renderBonusSlot, icon: '🚪', title: 'Machine à porte', hint: 'Décroche le bonus, plus la mise est haute, mieux il paie' },
  olympe: { render: renderOlympus, icon: '⚡', title: 'Foudre de l’Olympe', hint: 'Presque rien sans les temples, tout avec les tours gratuits' },
  eloise: { render: renderLuna, icon: '🌙', iconSvg: ELOISE_ICON, title: 'Eloise’s Book', hint: '3 livres = 10 tours gratuits avec un symbole qui remplit les rouleaux' },
  blackjack: { render: renderBlackjack, icon: '🃏', title: 'Blackjack', hint: 'Bats le croupier sans dépasser 21' },
  roulette: { render: renderRoulette, icon: '🎡', title: 'Roulette', hint: 'Européenne, un seul zéro' },
};

const COIN_PACKS = [1, 10, 50, 100];

/** `#/casino` shows the lobby, `#/casino/<game>` a table. */
export function renderCasino(root: HTMLElement, params: string[]): () => void {
  grantDailyGift();
  const game = GAMES[params[0] ?? ''];
  if (game) return game.render(root);
  renderLobby(root);
  return () => {};
}

function renderLobby(root: HTMLElement): void {
  const save = loadCasino();
  const coins = loadCompanion().coins;

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

  const record = el('span', { class: 'casino-record', text: `Record : ${save.record} jetons` });
  const bank = el(
    'section',
    { class: 'casino-bank' },
    el('strong', { class: 'casino-balance', text: `${save.chips} jetons` }),
    record,
  );
  // Secret: holding the record line for 3 s gives 1000 chips.
  let holdTimer = 0;
  const release = () => window.clearTimeout(holdTimer);
  record.addEventListener('pointerdown', () => {
    release();
    holdTimer = window.setTimeout(() => {
      pay(1000);
      root.replaceChildren();
      renderLobby(root);
    }, 3000);
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) record.addEventListener(type, release);
  record.addEventListener('contextmenu', (event) => event.preventDefault());
  record.style.userSelect = 'none';
  record.style.webkitUserSelect = 'none';

  const tables = el('div', { class: 'casino-tables' });
  for (const [id, game] of Object.entries(GAMES)) {
    const icon = el('span', { class: 'casino-table-icon', 'aria-hidden': 'true', text: game.iconSvg ? '' : game.icon });
    if (game.iconSvg) {
      icon.classList.add('is-svg');
      icon.innerHTML = game.iconSvg;
    }
    tables.append(
      el(
        'a',
        { class: 'menu-card', href: `#/casino/${id}` },
        icon,
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
            text: `Chaque jour, ta première visite t’offre ${DAILY_GIFT.toLocaleString('fr-FR')} jetons.`,
          }),
        ),
      ),
    ),
  );
}

/** Grants the daily gift on the first visit of the day and celebrates it with a toast. */
export function grantDailyGift(): void {
  const given = claimDailyGift();
  if (given === 0) return;
  const toast = el(
    'div',
    { class: 'casino-gift-toast', role: 'status' },
    el('span', { 'aria-hidden': 'true', text: '🎁' }),
    el('strong', { text: `Cadeau du jour : +${given.toLocaleString('fr-FR')} jetons` }),
  );
  document.body.append(toast);
  burst(toast, 28, 'coins');
  playBonusTrigger();
  window.setTimeout(() => toast.classList.add('is-leaving'), 3500);
  window.setTimeout(() => toast.remove(), 4000);
}
