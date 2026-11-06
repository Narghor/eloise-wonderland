import './casino.css';
import { el, topBar } from '../../dom';
import { loadCompanion } from '../../companion/companionSave';
import { CHIPS_PER_COIN, DAILY_GIFT, bestWin, buyChips, claimDailyGift, claimOneTimeGift, hideSentGift, loadCasino, pay, redeemGift, sendGift, formatChips } from './chips';
import { decodeGift } from './giftCode';
import { burst, playBonusTrigger } from './fx';
import { renderSlots } from './slots/slotsScreen';
import { renderBonusSlot } from './bonus/bonusScreen';
import { renderOlympus } from './olympus/olympusScreen';
import { renderLuna } from './luna/lunaScreen';
import { ELOISE_ICON } from './luna/lunaArt';
import { MEDUSA_ICON } from './olympus/olympusArt';
import { DOOR_ICON } from './bonus/bonusArt';
import { BONUS_EVERY, BONUS_MIN_X } from './bonus/bonusLogic';
import { FREE_SPINS_EVERY as MEDUSA_EVERY, FREE_SPINS_MIN_X as MEDUSA_MIN_X } from './olympus/olympusLogic';
import { FREE_SPINS_EVERY as BOOK_EVERY, FREE_SPINS_MIN_X as BOOK_MIN_X } from './luna/lunaLogic';
import { renderBlackjack } from './blackjack/blackjackScreen';
import { renderRoulette } from './roulette/rouletteScreen';

/**
 * How a machine plays, as measured by tools/casino-stats.mjs on 06/11/2026: measure again after
 * changing a machine's numbers.
 */
interface MachineProfile {
  /** 1-5: how often the bonus comes. */
  bonus: number;
  /** 1-5: how rare and how big the big wins are. */
  swings: number;
  /** "Bonus : 1 tour sur 105". */
  bonusEvery: string;
}

/**
 * Shown once for the whole casino, never per machine: a per-machine figure would rank them and
 * send everyone to the highest. Ours give back 102 to 110 for 100 bet (rescue included, see
 * rescue.ts); a French casino's slots
 * about 92 on average (85 is the legal floor).
 */
const OUR_PAYBACK = 105;
const REAL_CASINO_PAYBACK = 92;

/** `iconSvg` (trusted inline SVG) replaces the emoji `icon` in the lobby. */
const GAMES: Record<string, { render: (root: HTMLElement) => () => void; icon: string; iconSvg?: string; title: string; hint: string; profile?: MachineProfile }> = {
  sous: {
    render: renderSlots, icon: '🍒', title: 'Machine à sous',
    hint: 'Des petits gains très souvent. Le jackpot diamants est très rare, mais énorme.',
    profile: { bonus: 1, swings: 1, bonusEvery: 'Jackpot : 1 tour sur 20 000' },
  },
  porte: {
    render: renderBonusSlot, icon: '🚪', iconSvg: DOOR_ICON, title: 'Machine à porte',
    hint: 'Le bonus le plus fréquent, mais moins explosif.',
    profile: { bonus: 5, swings: 2, bonusEvery: `Bonus : 1 tour sur ${BONUS_EVERY} · toujours au moins ×${BONUS_MIN_X} ta mise` },
  },
  olympe: {
    render: renderOlympus, icon: '🐍', iconSvg: MEDUSA_ICON, title: 'Le Regard de Medusa',
    hint: 'Des rouleaux avares : tout se joue dans les tours gratuits. La plus explosive.',
    profile: { bonus: 4, swings: 5, bonusEvery: `Bonus : 1 tour sur ${MEDUSA_EVERY} · toujours au moins ×${MEDUSA_MIN_X} ta mise` },
  },
  eloise: {
    render: renderLuna, icon: '🌙', iconSvg: ELOISE_ICON, title: 'Eloise’s Book',
    hint: 'Les rouleaux paient souvent. Le bonus est plus rare, mais peut grimper haut.',
    profile: { bonus: 3, swings: 3, bonusEvery: `Bonus : 1 tour sur ${BOOK_EVERY} · toujours au moins ×${BOOK_MIN_X} ta mise` },
  },
  blackjack: { render: renderBlackjack, icon: '🃏', title: 'Blackjack', hint: 'Bats le croupier sans dépasser 21' },
  roulette: { render: renderRoulette, icon: '🎡', title: 'Roulette', hint: 'Européenne, un seul zéro' },
};

const COIN_PACKS = [1, 10, 50, 100];

/** `#/casino` shows the lobby, `#/casino/<game>` a table. */
export function renderCasino(root: HTMLElement, params: string[]): () => void {
  grantCasinoGifts();
  const game = GAMES[params[0] ?? ''];
  if (game) return game.render(root);
  renderLobby(root);
  return () => {};
}

/** Two gauges and how often the bonus comes: the machine's style, never its payback. */
function profileLines(profile: MachineProfile): HTMLElement[] {
  const gauge = (label: string, level: number) =>
    el('span', { class: 'casino-gauge' }, `${label} `, el('b', { text: '●'.repeat(level) }), el('i', { text: '●'.repeat(5 - level) }));
  return [
    el('span', { class: 'casino-gauges' }, gauge('Bonus', profile.bonus), gauge('Gros coups', profile.swings)),
    el('span', { class: 'casino-profile', text: profile.bonusEvery }),
  ];
}

/** "Ton record : ×312 ta mise" under a machine that has already paid; nothing otherwise. */
function bestWinLine(id: string): HTMLElement[] {
  const times = bestWin(id);
  if (times <= 0) return [];
  return [el('span', { class: 'casino-best-win', text: `🏆 Ton record : ×${times.toLocaleString('fr-FR')} ta mise` })];
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

  const record = el('span', { class: 'casino-record', text: `Record : ${formatChips(save.record)} jetons` });
  const bank = el(
    'section',
    { class: 'casino-bank' },
    el('strong', { class: 'casino-balance', text: `${formatChips(save.chips)} jetons` }),
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
        el(
          'span',
          { class: 'menu-card-text' },
          el('strong', { text: game.title }),
          el('span', { class: 'menu-card-hint', text: game.hint }),
          ...(game.profile ? profileLines(game.profile) : []),
          ...bestWinLine(id),
        ),
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
        el(
          'p',
          { class: 'casino-kindness' },
          `🎰 Ici, toutes les machines rendent environ ${OUR_PAYBACK} jetons pour 100 misés. `,
          el('em', { text: `Dans un vrai casino : ≈ ${REAL_CASINO_PAYBACK}.` }),
        ),
        tables,
        el(
          'section',
          { class: 'casino-cashier' },
          el('h2', { text: 'Guichet' }),
          el('p', {
            text: `Tu as ${coins} 🪙. Une pièce donne ${formatChips(CHIPS_PER_COIN)} jetons. Les jetons ne redeviennent jamais des pièces.`,
          }),
          packs,
          el('p', {
            class: 'casino-note',
            text: `Chaque jour, ta première visite t’offre ${DAILY_GIFT.toLocaleString('fr-FR')} jetons.`,
          }),
        ),
        giftSection(root, save.chips, save.sentGifts),
      ),
    ),
  );
}

/** Give chips as a code, or cash a friend's code. */
function giftSection(root: HTMLElement, balance: number, sentGifts: string[]): HTMLElement {
  const refresh = (): void => {
    root.replaceChildren();
    renderLobby(root);
  };

  const amountInput = el('input', { class: 'casino-input', type: 'number', min: '1', step: '1', inputmode: 'numeric', placeholder: 'Montant' });
  const send = el('button', { class: 'button button-secondary', type: 'button', text: 'Créer un code' });
  const sendMessage = el('p', { class: 'casino-note' });
  send.addEventListener('click', () => {
    const amount = Math.floor(Number(amountInput.value));
    if (!(amount > 0)) {
      sendMessage.textContent = 'Indique combien de jetons donner.';
      return;
    }
    if (amount > balance) {
      sendMessage.textContent = `Tu n’as que ${balance.toLocaleString('fr-FR')} jetons.`;
      return;
    }
    if (!confirm(`Retirer ${amount.toLocaleString('fr-FR')} jetons de ton solde pour en faire un code ?`)) return;
    if (sendGift(amount)) refresh();
  });

  const codeInput = el('input', { class: 'casino-input casino-code-input', type: 'text', autocomplete: 'off', placeholder: 'XXXX-XXXX-XXXX-XXXX' });
  const redeem = el('button', { class: 'button button-secondary', type: 'button', text: 'Utiliser le code' });
  const redeemMessage = el('p', { class: 'casino-note' });
  redeem.addEventListener('click', () => {
    const result = redeemGift(codeInput.value);
    if (!result.ok) {
      redeemMessage.textContent = result.reason === 'used' ? 'Ce code a déjà servi ici.' : 'Ce code n’est pas valide, vérifie-le.';
      return;
    }
    refresh();
    showGiftToast(`Code accepté : +${result.amount.toLocaleString('fr-FR')} jetons`);
  });

  const sent = sentGifts.map((code) => {
    const amount = decodeGift(code)?.amount ?? 0;
    const copy = el('button', { class: 'casino-sent-code', type: 'button', title: 'Copier' }, el('code', { text: code }), el('span', { text: `${amount.toLocaleString('fr-FR')} jetons · copier` }));
    copy.addEventListener('click', () => {
      void navigator.clipboard?.writeText(code).then(() => {
        copy.lastElementChild!.textContent = 'copié !';
      });
    });
    const hide = el('button', { class: 'casino-hide-code', type: 'button', 'aria-label': 'Masquer ce code', title: 'Masquer', text: '✕' });
    hide.addEventListener('click', () => {
      hideSentGift(code);
      refresh();
    });
    return el('div', { class: 'casino-sent-row' }, copy, hide);
  });

  return el(
    'section',
    { class: 'casino-cashier casino-gifts' },
    el('h2', { text: 'Partager des jetons' }),
    el('p', { text: 'Crée un code avec tes jetons et envoie-le à un ami : il le colle ici et les reçoit.' }),
    el('div', { class: 'casino-gift-row' }, amountInput, send),
    sendMessage,
    ...(sent.length > 0 ? [el('p', { class: 'casino-note', text: 'Tes derniers codes :' }), ...sent] : []),
    el('div', { class: 'casino-gift-row' }, codeInput, redeem),
    redeemMessage,
    el('p', { class: 'casino-note', text: 'Chaque code ne sert qu’une fois.' }),
  );
}

function showGiftToast(...messages: string[]): void {
  const toast = el(
    'div',
    { class: 'casino-gift-toast', role: 'status' },
    el('span', { 'aria-hidden': 'true', text: '🎁' }),
    el('span', { class: 'casino-gift-lines' }, ...messages.map((message) => el('strong', { text: message }))),
  );
  document.body.append(toast);
  burst(toast, 28, 'coins');
  playBonusTrigger();
  window.setTimeout(() => toast.classList.add('is-leaving'), 3500);
  window.setTimeout(() => toast.remove(), 4000);
}

/** Grants the one-time gift and the daily gift when they are due, and celebrates them in one toast. */
export function grantCasinoGifts(): void {
  const messages: string[] = [];
  const welcome = claimOneTimeGift();
  if (welcome > 0) messages.push(`Cadeau de bienvenue : +${formatChips(welcome)} jetons !`);
  const daily = claimDailyGift();
  if (daily > 0) messages.push(`Cadeau du jour : +${formatChips(daily)} jetons`);
  if (messages.length > 0) showGiftToast(...messages);
}
