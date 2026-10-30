import './icing.css';
import { el, topBar } from '../../dom';
import { difficultyName, difficultyPicker } from '../../difficulty';
import { CHALLENGE_DIFFICULTY } from '../../daily/daily';
import { navigate } from '../../navigation';
import { newSeed } from '../../random';
import { ICING_LEVELS, generateCookie } from './cookie';
import { IcingGame } from './icingGame';
import { paintCookie } from './icingPainter';
import { cookieNumber, loadIcing, saveIcing, type IcingSave, type ShowcaseCookie } from './icingSave';

const PLAY_ROUTE = '#/glacage/jouer';

/** `#/glacage` shows the menu and the showcase, `#/glacage/jouer` the cookie in progress. */
export function renderIcing(root: HTMLElement, params: string[]): () => void {
  const save = loadIcing();
  if (params[0] === 'jouer' && save.current) {
    const game = new IcingGame(root, save, save.current, { nextCookie: () => startCookie(save) });
    return () => game.dispose();
  }
  renderMenu(root, save);
  return () => {};
}

export function startIcingChallenge(day: string): void {
  const save = loadIcing();
  if (save.current && !confirm('Le défi remplace ton biscuit en cours. On y va ?')) return;
  startCookie(save, day);
}

function startCookie(save: IcingSave, challenge?: string): void {
  const difficulty = challenge ? CHALLENGE_DIFFICULTY : save.difficulty;
  save.current = {
    number: save.cookiesDone + 1,
    difficulty,
    level: ICING_LEVELS[difficulty],
    seed: newSeed(),
    strokes: [],
    challenge,
  };
  saveIcing(save);
  navigate(PLAY_ROUTE);
}

function renderMenu(root: HTMLElement, save: IcingSave): void {
  const menu = el('main', { class: 'icing-menu' });
  if (save.current) {
    menu.append(menuCard('Reprendre mon biscuit', `Biscuit n°${cookieNumber(save.current)}`, () => (location.hash = PLAY_ROUTE)));
  }
  menu.append(
    difficultyPicker(save.difficulty, (difficulty) => {
      save.difficulty = difficulty;
      saveIcing(save);
      root.replaceChildren();
      renderMenu(root, save);
    }),
    menuCard(`Biscuit n°${save.cookiesDone + 1}`, `${difficultyName(save.difficulty)} · suis les pointillés`, () => {
      if (!save.current || confirm('Abandonner le biscuit en cours ?')) startCookie(save);
    }),
    showcaseSection(save.showcase),
  );
  root.append(el('div', { class: 'icing' }, topBar('Glaçage'), menu));
}

function menuCard(title: string, hint: string, onClick: () => void): HTMLButtonElement {
  const card = el(
    'button',
    { class: 'menu-card', type: 'button' },
    el('span', { class: 'icing-icon', 'aria-hidden': 'true' }),
    el('span', { class: 'menu-card-text' }, el('strong', { text: title }), el('span', { class: 'menu-card-hint', text: hint })),
  );
  card.addEventListener('click', onClick);
  return card;
}

// -----------------------------------------------
// SHOWCASE
// -----------------------------------------------

function showcaseSection(showcase: ShowcaseCookie[]): HTMLElement {
  const section = el('section', { class: 'showcase' }, el('h2', { text: `Ma vitrine (${showcase.length})` }));
  if (showcase.length === 0) {
    section.append(el('p', { class: 'showcase-empty', text: 'Tes biscuits décorés viendront se ranger ici.' }));
    return section;
  }
  const dialog = cookieDialog();
  const grid = el('div', { class: 'showcase-grid' });
  for (const entry of [...showcase].reverse()) {
    const tile = el(
      'button',
      { class: 'showcase-tile', type: 'button' },
      cookieCanvas(entry, 84),
      el('span', { class: 'showcase-stars', text: starsText(entry.stars) }),
    );
    tile.addEventListener('click', () => dialog.show(entry));
    grid.append(tile);
  }
  section.append(grid, dialog.element);
  return section;
}

function starsText(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

function cookieCanvas(entry: ShowcaseCookie, size: number): HTMLCanvasElement {
  const canvas = el('canvas', { class: 'icing-canvas' });
  canvas.width = canvas.height = Math.round(size * Math.min(2, window.devicePixelRatio || 1));
  canvas.style.width = canvas.style.height = `${size}px`;
  paintCookie(canvas, generateCookie(entry.seed, entry.level), entry.strokes, { showGuides: false, sprinkles: entry.seed });
  return canvas;
}

function cookieDialog(): { element: HTMLDialogElement; show(entry: ShowcaseCookie): void } {
  const portrait = el('div', { class: 'cookie-portrait' });
  const title = el('h2');
  const details = el('p', { class: 'cookie-details' });
  const close = el('button', { class: 'button button-secondary', type: 'button' }, 'Fermer');
  const element = el('dialog', { class: 'detail-dialog' }, portrait, title, details, close);
  close.addEventListener('click', () => element.close());
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  return {
    element,
    show(entry: ShowcaseCookie) {
      portrait.replaceChildren(cookieCanvas(entry, 240));
      title.textContent = `Biscuit n°${cookieNumber(entry)}`;
      details.textContent = `${starsText(entry.stars)} · décoré le ${new Date(entry.madeAt).toLocaleDateString('fr-FR')}`;
      element.showModal();
    },
  };
}
