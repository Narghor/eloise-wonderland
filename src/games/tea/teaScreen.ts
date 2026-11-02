import './tea.css';
import { el, topBar } from '../../dom';
import { difficultyName, difficultyPicker, type Difficulty } from '../../difficulty';
import { CHALLENGE_DIFFICULTY } from '../../daily/daily';
import { navigate } from '../../navigation';
import { newSeed } from '../../random';
import { cafeLevel, openCafe } from '../../house/houseCafe';
import { TeaGame } from './teaGame';
import { SERVICE_SECONDS, TEA_TIERS, makeSchedule, seedFromDay } from './teaLogic';
import { loadTea, saveTea, type TeaSave } from './teaSave';

const PLAY_ROUTE = '#/salon/jouer';

/** Which service `#/salon/jouer` opens: never saved, so a reload goes back to the menu. */
let pending: { challenge?: string; cafe?: boolean } | null = null;

const TIER_HINTS = ['2 thés, rien d’autre', 'des suppléments et des gâteaux', '3 suppléments, clients pressés', '4 thés, 4 tables', 'clients très pressés'];

/** `#/salon` shows the menu, `#/salon/jouer` a service in progress. */
export function renderTea(root: HTMLElement, params: string[]): () => void {
  const save = loadTea();
  if (params[0] === 'jouer' && pending) {
    const { challenge, cafe } = pending;
    pending = null;
    if (cafe) {
      const level = cafeLevel();
      const schedule = makeSchedule(TEA_TIERS[level], newSeed());
      const game = new TeaGame(root, save, level, schedule, undefined, { nextService: startCafe }, openCafe(schedule));
      return () => game.dispose();
    }
    const difficulty: Difficulty = challenge ? CHALLENGE_DIFFICULTY : save.difficulty;
    const game = new TeaGame(root, save, difficulty, makeSchedule(TEA_TIERS[difficulty], challenge ? seedFromDay(challenge) : newSeed()), challenge, {
      nextService: () => startService(challenge && loadTea().challenge === challenge ? challenge : undefined),
    });
    return () => game.dispose();
  }
  if (params[0] === 'jouer') history.replaceState(null, '', '#/salon');
  renderMenu(root, save);
  return () => {};
}

function startService(challenge?: string): void {
  pending = { challenge };
  navigate(PLAY_ROUTE);
}

/** The same service, opened from the house: its characters come as customers. */
export function startCafe(): void {
  pending = { cafe: true };
  navigate(PLAY_ROUTE);
}

export function startTeaChallenge(day: string): void {
  const save = loadTea();
  save.challenge = day;
  saveTea(save);
  startService(day);
}

function renderMenu(root: HTMLElement, save: TeaSave): void {
  const menu = el('main', { class: 'tea-menu' });
  if (save.challenge) {
    const day = save.challenge;
    menu.append(menuCard('Défi du jour', 'Un service à rejouer jusqu’à la première étoile', () => startService(day)));
  }
  const tier = TEA_TIERS[save.difficulty];
  const best = save.best[save.difficulty];
  menu.append(
    difficultyPicker(save.difficulty, (difficulty) => {
      save.difficulty = difficulty;
      saveTea(save);
      root.replaceChildren();
      renderMenu(root, save);
    }),
    menuCard(
      'Ouvrir le salon',
      `${difficultyName(save.difficulty)} · ${SERVICE_SECONDS} s, ${tier.spots} tables, ${TIER_HINTS[save.difficulty]}${best ? ` · record ${best}` : ''}`,
      () => startService(),
    ),
    el('p', { class: 'tea-menu-note', text: `Services terminés : ${save.servicesDone}` }),
  );
  root.append(el('div', { class: 'tea' }, topBar('Salon de thé'), menu));
}

function menuCard(title: string, hint: string, onClick: () => void): HTMLButtonElement {
  const card = el(
    'button',
    { class: 'menu-card', type: 'button' },
    el('span', { class: 'tea-icon', 'aria-hidden': 'true', text: '🫖' }),
    el('span', { class: 'menu-card-text' }, el('strong', { text: title }), el('span', { class: 'menu-card-hint', text: hint })),
  );
  card.addEventListener('click', onClick);
  return card;
}
