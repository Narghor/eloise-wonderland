import './pastry.css';
import { el, topBar } from '../../dom';
import { difficultyName, difficultyPicker, type Difficulty } from '../../difficulty';
import { CHALLENGE_DIFFICULTY } from '../../daily/daily';
import { navigate } from '../../navigation';
import { PastryGame } from './pastryGame';
import { drawCake } from './pastryDraw';
import { PASTRY_TIERS, generatePuzzle } from './pastryLogic';
import { loadPastry, savePastry, type PastrySave, type ShowcaseCake } from './pastrySave';

const PLAY_ROUTE = '#/patisserie/jouer';

const TIER_HINTS = ['modèle entier', 'modèle entier', 'couches cachées et indices', 'presque tout caché', 'seulement des indices'];

/** `#/patisserie` shows the menu and the showcase, `#/patisserie/jouer` the cake in progress. */
export function renderPastry(root: HTMLElement, params: string[]): () => void {
  const save = loadPastry();
  const current = save.current;
  if (params[0] === 'jouer' && current) {
    const game = new PastryGame(root, save, current, { nextCake: () => startCake(save) });
    return () => game.dispose();
  }
  renderMenu(root, save);
  return () => {};
}

function startCake(save: PastrySave, challenge?: string): void {
  const difficulty: Difficulty = challenge ? CHALLENGE_DIFFICULTY : save.difficulty;
  const puzzle = generatePuzzle(PASTRY_TIERS[difficulty]);
  save.current = { ...puzzle, number: save.cakesDone + 1, difficulty, placed: [], mistakes: 0, challenge };
  savePastry(save);
  navigate(PLAY_ROUTE);
}

export function startPastryChallenge(day: string): void {
  const save = loadPastry();
  if (save.current && !confirm('Le défi remplace ton gâteau en cours. On y va ?')) return;
  startCake(save, day);
}

function renderMenu(root: HTMLElement, save: PastrySave): void {
  const menu = el('main', { class: 'pastry-menu' });
  if (save.current) {
    menu.append(menuCard('Reprendre mon gâteau', `Gâteau n°${save.current.number}`, () => (location.hash = PLAY_ROUTE)));
  }
  const tier = PASTRY_TIERS[save.difficulty];
  menu.append(
    difficultyPicker(save.difficulty, (difficulty) => {
      save.difficulty = difficulty;
      savePastry(save);
      root.replaceChildren();
      renderMenu(root, save);
    }),
    menuCard(`Gâteau n°${save.cakesDone + 1}`, `${difficultyName(save.difficulty)} · ${tier.layers} couches, ${TIER_HINTS[save.difficulty]}`, () => {
      if (!save.current || confirm('Abandonner le gâteau en cours ?')) startCake(save);
    }),
    showcaseSection(save.showcase),
  );
  root.append(el('div', { class: 'pastry' }, topBar('Pâtisserie'), menu));
}

function menuCard(title: string, hint: string, onClick: () => void): HTMLButtonElement {
  const card = el(
    'button',
    { class: 'menu-card', type: 'button' },
    el('span', { class: 'pastry-icon', 'aria-hidden': 'true' }),
    el('span', { class: 'menu-card-text' }, el('strong', { text: title }), el('span', { class: 'menu-card-hint', text: hint })),
  );
  card.addEventListener('click', onClick);
  return card;
}

// -----------------------------------------------
// THE SHOWCASE OF FINISHED CAKES
// -----------------------------------------------

function showcaseSection(showcase: ShowcaseCake[]): HTMLElement {
  const section = el('section', { class: 'pastry-showcase' }, el('h2', { text: `Ma vitrine (${showcase.length})` }));
  if (showcase.length === 0) {
    section.append(el('p', { class: 'pastry-showcase-empty', text: 'Tes gâteaux terminés viendront se ranger ici.' }));
    return section;
  }
  const dialog = cakeDialog();
  const grid = el('div', { class: 'pastry-showcase-grid' });
  for (const entry of [...showcase].reverse()) {
    const canvas = el('canvas', { class: 'pastry-canvas' });
    drawCake(canvas, entry.layers, 72);
    const tile = el('button', { class: 'pastry-showcase-tile', type: 'button', 'aria-label': `Gâteau n°${entry.number}` }, canvas);
    tile.addEventListener('click', () => dialog.show(entry));
    grid.append(tile);
  }
  section.append(grid, dialog.element);
  return section;
}

function cakeDialog(): { element: HTMLDialogElement; show(entry: ShowcaseCake): void } {
  const portrait = el('div', { class: 'pastry-portrait' });
  const title = el('h2');
  const details = el('p', { class: 'pastry-details' });
  const close = el('button', { class: 'button button-secondary', type: 'button' }, 'Fermer');
  const element = el('dialog', { class: 'detail-dialog' }, portrait, title, details, close);
  close.addEventListener('click', () => element.close());
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  return {
    element,
    show(entry: ShowcaseCake) {
      const canvas = el('canvas', { class: 'pastry-canvas' });
      drawCake(canvas, entry.layers, 220);
      portrait.replaceChildren(canvas);
      title.textContent = `Gâteau n°${entry.number}`;
      const stars = '★'.repeat(entry.stars) + '☆'.repeat(3 - entry.stars);
      details.textContent = `${stars} · ${entry.layers.length} couches · fini le ${new Date(entry.madeAt).toLocaleDateString('fr-FR')}`;
      element.showModal();
    },
  };
}
