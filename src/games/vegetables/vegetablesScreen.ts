import './vegetables.css';
import { el, topBar } from '../../dom';
import { difficultyName, difficultyPicker, type Difficulty } from '../../difficulty';
import { CHALLENGE_DIFFICULTY } from '../../daily/daily';
import { navigate } from '../../navigation';
import { newSeed } from '../../random';
import { VegetableGame, stars } from './vegetablesGame';
import { KINDS, VEGETABLE_TIERS, copyField, generateGarden, newField, type Garden } from './vegetablesLogic';
import { loadVegetables, saveVegetables, type CellarSeason, type VegetableSave } from './vegetablesSave';

const PLAY_ROUTE = '#/potager/jouer';

const TIER_HINTS = ['3 sortes de graines, beaucoup de pluie', 'un arbre fait de l’ombre', 'plus de graines', 'objectifs exigeants', 'gel et objectifs exigeants'];

/** `#/potager` shows the menu and the cellar, `#/potager/jouer` the season in progress. */
export function renderVegetables(root: HTMLElement, params: string[]): () => void {
  const save = loadVegetables();
  const current = save.current;
  if (params[0] === 'jouer' && current) {
    const garden = current.garden;
    const { number, difficulty, challenge } = current;
    const game = new VegetableGame(root, save, current, {
      nextSeason: () => startSeason(save),
      replaySeason: () => playGarden(save, garden, number, difficulty, challenge),
    });
    return () => game.dispose();
  }
  renderMenu(root, save);
  return () => {};
}

/** The same seed on every device: everyone gets the same daily garden. */
function daySeed(day: string): number {
  let hash = 2166136261;
  for (const char of `potager-${day}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function startSeason(save: VegetableSave, challenge?: string): void {
  const difficulty: Difficulty = challenge ? CHALLENGE_DIFFICULTY : save.difficulty;
  const garden = generateGarden(VEGETABLE_TIERS[difficulty], challenge ? daySeed(challenge) : newSeed());
  playGarden(save, garden, save.seasonsDone + 1, difficulty, challenge);
}

function playGarden(save: VegetableSave, garden: Garden, number: number, difficulty: Difficulty, challenge?: string): void {
  const field = newField(garden);
  save.current = { garden, field, morning: copyField(field), number, difficulty, challenge };
  saveVegetables(save);
  navigate(PLAY_ROUTE);
}

export function startVegetablesChallenge(day: string): void {
  const save = loadVegetables();
  if (save.current && !confirm('Le défi remplace ta saison en cours. On y va ?')) return;
  startSeason(save, day);
}

function renderMenu(root: HTMLElement, save: VegetableSave): void {
  const menu = el('main', { class: 'veg-menu' });
  if (save.current) {
    menu.append(menuCard('Reprendre ma saison', `Potager n°${save.current.number} · jour ${Math.min(save.current.field.day, save.current.garden.days)}`, () => (location.hash = PLAY_ROUTE)));
  }
  const tier = VEGETABLE_TIERS[save.difficulty];
  menu.append(
    difficultyPicker(save.difficulty, (difficulty) => {
      save.difficulty = difficulty;
      saveVegetables(save);
      root.replaceChildren();
      renderMenu(root, save);
    }),
    menuCard(
      `Potager n°${save.seasonsDone + 1}`,
      `${difficultyName(save.difficulty)} · ${tier.width}×${tier.height} cases, ${tier.days} jours, ${TIER_HINTS[save.difficulty]}`,
      () => {
        if (!save.current || confirm('Abandonner la saison en cours ?')) startSeason(save);
      },
    ),
    cellarSection(save.cellar),
  );
  root.append(el('div', { class: 'veg' }, topBar('Potager'), menu));
}

function menuCard(title: string, hint: string, onClick: () => void): HTMLButtonElement {
  const card = el(
    'button',
    { class: 'menu-card', type: 'button' },
    el('span', { class: 'veg-icon', 'aria-hidden': 'true', text: '🥕' }),
    el('span', { class: 'menu-card-text' }, el('strong', { text: title }), el('span', { class: 'menu-card-hint', text: hint })),
  );
  card.addEventListener('click', onClick);
  return card;
}

// -----------------------------------------------
// THE CELLAR OF PAST HARVESTS
// -----------------------------------------------

function cellarSection(cellar: CellarSeason[]): HTMLElement {
  const section = el('section', { class: 'veg-cellar' }, el('h2', { text: `Mon cellier (${cellar.length})` }));
  if (cellar.length === 0) {
    section.append(el('p', { class: 'veg-cellar-empty', text: 'Tes récoltes réussies viendront se ranger ici.' }));
    return section;
  }
  const dialog = seasonDialog();
  const grid = el('div', { class: 'veg-cellar-grid' });
  for (const entry of [...cellar].reverse()) {
    const top = [...entry.crops].sort((a, b) => b.count - a.count).slice(0, 3);
    const tile = el(
      'button',
      { class: 'veg-crate', type: 'button', 'aria-label': `Potager n°${entry.number}` },
      el('span', { class: 'veg-crate-crops', text: top.map((crop) => KINDS[crop.kind].emoji).join('') }),
      el('span', { class: 'veg-crate-score', text: `🧺 ${entry.score}` }),
      el('span', { class: 'veg-crate-stars', text: stars(entry.stars) }),
    );
    tile.addEventListener('click', () => dialog.show(entry));
    grid.append(tile);
  }
  section.append(grid, dialog.element);
  return section;
}

function seasonDialog(): { element: HTMLDialogElement; show(entry: CellarSeason): void } {
  const crops = el('p', { class: 'veg-dialog-crops' });
  const title = el('h2');
  const details = el('p', { class: 'veg-details' });
  const close = el('button', { class: 'button button-secondary', type: 'button' }, 'Fermer');
  const element = el('dialog', { class: 'detail-dialog' }, title, crops, details, close);
  close.addEventListener('click', () => element.close());
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  return {
    element,
    show(entry: CellarSeason) {
      title.textContent = `Potager n°${entry.number}`;
      crops.replaceChildren(
        ...entry.crops.map((crop) => el('span', { class: 'veg-dialog-crop' }, el('span', { text: KINDS[crop.kind].emoji }), `× ${crop.count}`)),
      );
      details.textContent = `${stars(entry.stars)} · récolte ${entry.score} · finie le ${new Date(entry.madeAt).toLocaleDateString('fr-FR')}`;
      element.showModal();
    },
  };
}
