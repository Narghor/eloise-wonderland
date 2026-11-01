import { el } from '../dom';
import type { Difficulty } from '../difficulty';
import { UNGRADED_CHALLENGE_STARS, completeChallenge } from '../daily/daily';
import { rollCasinoTicket } from '../games/casino/ticket';
import { companionCanvas } from './companionArt';
import { UNGRADED_STARS, addCoins, earnCoins, loadCompanion } from './companionSave';

/**
 * Pays a finished level and returns the banner of its win screen.
 * `stars` is null for games without a grade; `challenge` is the day of a daily challenge.
 */
export function levelReward(stars: number | null, difficulty: Difficulty, challenge?: string): HTMLElement {
  const banner = companionReward(stars, difficulty, challenge);
  const ticket = rollCasinoTicket(difficulty);
  return ticket ? el('div', { class: 'reward-stack' }, banner, ticket) : banner;
}

function companionReward(stars: number | null, difficulty: Difficulty, challenge?: string): HTMLElement {
  if (challenge) {
    const pay = completeChallenge(challenge, stars ?? UNGRADED_CHALLENGE_STARS);
    if (pay) {
      addCoins(pay.coins);
      const extra = pay.streakBonus > 0 ? ` Une semaine sans rater un défi : +${pay.streakBonus} en bonus !` : '';
      return rewardBanner(pay.coins, `Défi du jour réussi !${extra}`);
    }
  }
  return rewardBanner(earnCoins(stars ?? UNGRADED_STARS, difficulty));
}

/** The companion cheers, or sulks when the level paid nothing. */
export function rewardBanner(coins: number, message?: string): HTMLElement {
  const companion = loadCompanion();
  const text =
    message ??
    (coins === 0 ? `${companion.name} n'a rien gagné cette fois…` : `${companion.name} ramasse ${coins} pièce${coins > 1 ? 's' : ''} !`);
  return el(
    'a',
    { class: `reward-banner${coins === 0 ? ' is-empty' : ''}`, href: '#/compagnon' },
    companionCanvas(companion.look, 52),
    el('span', { class: 'reward-text' }, el('strong', { text: coins === 0 ? '0 🪙' : `+${coins} 🪙` }), el('span', { text })),
  );
}
