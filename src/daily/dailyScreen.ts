import './daily.css';
import { el, topBar } from '../dom';
import { SLOT_NAMES, ITEMS } from '../companion/catalog';
import { companionPortrait } from '../companion/companionArt';
import { loadCompanion } from '../companion/companionSave';
import { startBubbleChallenge } from '../games/bubbles/bubbleScreen';
import { startGlassChallenge } from '../games/stainedGlass/glassScreen';
import { startIcingChallenge } from '../games/icing/icingScreen';
import { startPicrossChallenge } from '../games/picross/picrossScreen';
import { startPotionChallenge } from '../games/potions/potionScreen';
import { startSandChallenge } from '../games/sand/sandScreen';
import { startBraceletChallenge } from '../games/bracelets/braceletScreen';
import { startEmbroideryChallenge } from '../games/embroidery/embroideryScreen';
import { startMosaicChallenge } from '../games/mosaic/mosaicScreen';
import { startBouquetChallenge } from '../games/bouquet/bouquetScreen';
import { startBeadsChallenge } from '../games/beads/beadScreen';
import { startBoxChallenge } from '../games/box/boxScreen';
import { startPastryChallenge } from '../games/pastry/pastryScreen';
import {
  CHALLENGE_GAME_NAMES,
  challengeGameOn,
  challengesDone,
  loadDaily,
  shiftDay,
  streak,
  todayKey,
  type ChallengeGame,
} from './daily';

const START: Record<ChallengeGame, (day: string) => void> = {
  picross: startPicrossChallenge,
  sand: startSandChallenge,
  glass: startGlassChallenge,
  bubbles: startBubbleChallenge,
  icing: startIcingChallenge,
  potions: startPotionChallenge,
  bracelets: startBraceletChallenge,
  embroidery: startEmbroideryChallenge,
  mosaic: startMosaicChallenge,
  bouquet: startBouquetChallenge,
  beads: startBeadsChallenge,
  box: startBoxChallenge,
  pastry: startPastryChallenge,
};

const WEEKDAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export function renderDaily(root: HTMLElement): () => void {
  const save = loadDaily();
  const today = todayKey();
  const game = challengeGameOn(today);
  const stars = save.days[today];
  const done = challengesDone(save);

  const play = el('button', { class: 'button daily-play', type: 'button' }, `Jouer : ${CHALLENGE_GAME_NAMES[game]}`);
  play.addEventListener('click', () => START[game](today));

  const todayCard = el(
    'section',
    { class: `daily-today${stars !== undefined ? ' is-done' : ''}` },
    el('p', { class: 'daily-label', text: "Aujourd'hui" }),
    el('h2', { text: CHALLENGE_GAME_NAMES[game] }),
    stars !== undefined
      ? el('p', { class: 'daily-stars', text: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · réussi, reviens demain !` })
      : el('p', { text: 'Difficulté Moyen. 10 pièces par étoile, la première fois que tu le finis aujourd’hui.' }),
    stars !== undefined ? '' : play,
  );

  root.append(
    el(
      'div',
      { class: 'daily' },
      topBar('Défi du jour'),
      el('main', { class: 'daily-main' }, todayCard, weekSection(today, save.days), rewardsSection(done)),
    ),
  );
  return () => {};
}

/** The last seven days, today on the right. */
function weekSection(today: string, days: Record<string, number>): HTMLElement {
  const strip = el('div', { class: 'daily-week' });
  for (let back = 6; back >= 0; back--) {
    const day = shiftDay(today, -back);
    const [year, month, date] = day.split('-').map(Number);
    const weekday = WEEKDAYS[new Date(year, month - 1, date).getDay()];
    const cell = el('span', { class: `daily-day${days[day] !== undefined ? ' is-done' : ''}${back === 0 ? ' is-today' : ''}` });
    cell.append(el('span', { text: weekday }), el('strong', { text: days[day] !== undefined ? '✓' : '·' }));
    strip.append(cell);
  }
  const run = streak(undefined, today);
  return el(
    'section',
    { class: 'daily-panel' },
    el('h2', { text: run > 1 ? `Série : ${run} jours d'affilée` : 'Ma semaine' }),
    strip,
    el('p', { class: 'daily-hint', text: '7 jours d’affilée : 50 pièces en bonus, et encore tous les 7 jours.' }),
  );
}

/** What the challenges unlock, and how far she is. */
function rewardsSection(done: number): HTMLElement {
  const look = loadCompanion().look;
  const rewards = ITEMS.filter((item) => item.challenges !== undefined).sort((a, b) => a.challenges! - b.challenges!);
  const list = el('div', { class: 'daily-rewards' });
  for (const item of rewards) {
    const unlocked = done >= item.challenges!;
    const preview = item.slot === 'species' ? { ...look, species: item.id } : { ...look, [item.slot]: item.id };
    list.append(
      el(
        'div',
        { class: `daily-reward${unlocked ? ' is-unlocked' : ''}` },
        companionPortrait(preview, 64),
        el(
          'span',
          { class: 'daily-reward-text' },
          el('strong', { text: item.name }),
          el('span', { text: `${SLOT_NAMES[item.slot]} · ${unlocked ? 'débloqué !' : `${done} / ${item.challenges} défis`}` }),
        ),
      ),
    );
  }
  return el(
    'section',
    { class: 'daily-panel' },
    el('h2', { text: `Récompenses de défis (${done} réussi${done > 1 ? 's' : ''})` }),
    el('p', { class: 'daily-hint', text: 'Ces objets ne s’achètent pas : ils viennent tout seuls avec les défis.' }),
    list,
  );
}
