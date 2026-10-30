import { el } from '../dom';
import { companionCanvas } from './companionArt';
import { loadCompanion } from './companionSave';

/** Shown on a win screen: the companion cheers, or sulks when the level paid nothing. */
export function rewardBanner(coins: number): HTMLElement {
  const companion = loadCompanion();
  const text =
    coins === 0
      ? `${companion.name} n'a rien gagné cette fois…`
      : `${companion.name} ramasse ${coins} pièce${coins > 1 ? 's' : ''} !`;
  return el(
    'a',
    { class: `reward-banner${coins === 0 ? ' is-empty' : ''}`, href: '#/compagnon' },
    companionCanvas(companion.look, 52),
    el('span', { class: 'reward-text' }, el('strong', { text: coins === 0 ? '0 🪙' : `+${coins} 🪙` }), el('span', { text })),
  );
}
