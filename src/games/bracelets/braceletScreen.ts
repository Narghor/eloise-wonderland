import './bracelets.css';
import { el, topBar } from '../../dom';
import { difficultyName, difficultyPicker, type Difficulty } from '../../difficulty';
import { CHALLENGE_DIFFICULTY } from '../../daily/daily';
import { navigate } from '../../navigation';
import { BraceletGame } from './braceletGame';
import { drawBracelet } from './braceletDraw';
import { BRACELET_TIERS, generateModel, knotCount } from './braceletLogic';
import { loadBracelets, saveBracelets, type BoxedBracelet, type BraceletSave } from './braceletSave';

const PLAY_ROUTE = '#/bracelets/jouer';

/** `#/bracelets` shows the menu and the box, `#/bracelets/jouer` the bracelet in progress. */
export function renderBracelets(root: HTMLElement, params: string[]): () => void {
  const save = loadBracelets();
  const current = save.current;
  if (params[0] === 'jouer' && current) {
    const game = new BraceletGame(root, save, current, { nextBracelet: () => startBracelet(save) });
    return () => game.dispose();
  }
  renderMenu(root, save);
  return () => {};
}

function startBracelet(save: BraceletSave, challenge?: string): void {
  const difficulty: Difficulty = challenge ? CHALLENGE_DIFFICULTY : save.difficulty;
  const { model, ...pattern } = generateModel(BRACELET_TIERS[difficulty]);
  save.current = { ...pattern, number: save.braceletsDone + 1, difficulty, model, knots: [], mistakes: 0, challenge };
  saveBracelets(save);
  navigate(PLAY_ROUTE);
}

export function startBraceletChallenge(day: string): void {
  const save = loadBracelets();
  if (save.current && !confirm('Le défi remplace ton bracelet en cours. On y va ?')) return;
  startBracelet(save, day);
}

function renderMenu(root: HTMLElement, save: BraceletSave): void {
  const menu = el('main', { class: 'bracelet-menu' });
  if (save.current) {
    menu.append(menuCard('Reprendre mon bracelet', `Bracelet n°${save.current.number}`, () => (location.hash = PLAY_ROUTE)));
  }
  const tier = BRACELET_TIERS[save.difficulty];
  menu.append(
    difficultyPicker(save.difficulty, (difficulty) => {
      save.difficulty = difficulty;
      saveBracelets(save);
      root.replaceChildren();
      renderMenu(root, save);
    }),
    menuCard(`Bracelet n°${save.braceletsDone + 1}`, `${difficultyName(save.difficulty)} · ${tier.strings} fils, ${tier.colors} couleurs`, () => {
      if (!save.current || confirm('Abandonner le bracelet en cours ?')) startBracelet(save);
    }),
    boxSection(save.box),
  );
  root.append(el('div', { class: 'bracelets' }, topBar('Bracelets brésiliens'), menu));
}

function menuCard(title: string, hint: string, onClick: () => void): HTMLButtonElement {
  const card = el(
    'button',
    { class: 'menu-card', type: 'button' },
    el('span', { class: 'bracelet-icon', 'aria-hidden': 'true' }),
    el('span', { class: 'menu-card-text' }, el('strong', { text: title }), el('span', { class: 'menu-card-hint', text: hint })),
  );
  card.addEventListener('click', onClick);
  return card;
}

// -----------------------------------------------
// THE BOX OF FINISHED BRACELETS
// -----------------------------------------------

function boxSection(box: BoxedBracelet[]): HTMLElement {
  const section = el('section', { class: 'bracelet-box' }, el('h2', { text: `Ma boîte à bracelets (${box.length})` }));
  if (box.length === 0) {
    section.append(el('p', { class: 'bracelet-box-empty', text: 'Tes bracelets terminés viendront se ranger ici.' }));
    return section;
  }
  const dialog = braceletDialog();
  const grid = el('div', { class: 'bracelet-box-grid' });
  for (const entry of [...box].reverse()) {
    const canvas = el('canvas', { class: 'bracelet-canvas' });
    drawBracelet(canvas, entry, entry.knots, 48);
    const tile = el('button', { class: 'bracelet-box-tile', type: 'button', 'aria-label': `Bracelet n°${entry.number}` }, canvas);
    tile.addEventListener('click', () => dialog.show(entry));
    grid.append(tile);
  }
  section.append(grid, dialog.element);
  return section;
}

function braceletDialog(): { element: HTMLDialogElement; show(entry: BoxedBracelet): void } {
  const portrait = el('div', { class: 'bracelet-portrait' });
  const title = el('h2');
  const details = el('p', { class: 'bracelet-details' });
  const close = el('button', { class: 'button button-secondary', type: 'button' }, 'Fermer');
  const element = el('dialog', { class: 'detail-dialog' }, portrait, title, details, close);
  close.addEventListener('click', () => element.close());
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  return {
    element,
    show(entry: BoxedBracelet) {
      const canvas = el('canvas', { class: 'bracelet-canvas' });
      drawBracelet(canvas, entry, entry.knots, entry.strings.length * 22);
      portrait.replaceChildren(canvas);
      title.textContent = `Bracelet n°${entry.number}`;
      const stars = '★'.repeat(entry.stars) + '☆'.repeat(3 - entry.stars);
      details.textContent = `${stars} · ${knotCount(entry)} nœuds · fini le ${new Date(entry.madeAt).toLocaleDateString('fr-FR')}`;
      element.showModal();
    },
  };
}
