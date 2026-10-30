import './bouquet.css';
import { el, topBar } from '../../dom';
import { difficultyName, difficultyPicker } from '../../difficulty';
import { CHALLENGE_DIFFICULTY } from '../../daily/daily';
import { navigate } from '../../navigation';
import { newSeed } from '../../random';
import { BOUQUET_LEVELS, describe, generateOrder, levelParams } from './bouquetOrder';
import { BouquetGame } from './bouquetGame';
import { paintBouquet } from './bouquetPainter';
import { loadBouquet, saveBouquet, type BouquetSave, type DeliveredBouquet } from './bouquetSave';

const PLAY_ROUTE = '#/bouquet/jouer';

/** `#/bouquet` shows the menu and the gallery, `#/bouquet/jouer` the order in progress. */
export function renderBouquet(root: HTMLElement, params: string[]): () => void {
  const save = loadBouquet();
  if (params[0] === 'jouer' && save.current) {
    const game = new BouquetGame(root, save, save.current, { nextOrder: () => startOrder(save) });
    return () => game.dispose();
  }
  renderMenu(root, save);
  return () => {};
}

export function startBouquetChallenge(day: string): void {
  const save = loadBouquet();
  if (save.current && !confirm('Le défi remplace ta commande en cours. On y va ?')) return;
  startOrder(save, day);
}

function startOrder(save: BouquetSave, challenge?: string): void {
  const difficulty = challenge ? CHALLENGE_DIFFICULTY : save.difficulty;
  const level = BOUQUET_LEVELS[difficulty];
  save.current = {
    number: save.ordersDone + 1,
    difficulty,
    level,
    seed: newSeed(),
    slots: Array(levelParams(level).slots).fill(null),
    challenge,
  };
  saveBouquet(save);
  navigate(PLAY_ROUTE);
}

function renderMenu(root: HTMLElement, save: BouquetSave): void {
  const menu = el('main', { class: 'bouquet-menu' });
  if (save.current) {
    menu.append(menuCard('Reprendre ma commande', `Commande n°${save.current.number}`, () => (location.hash = PLAY_ROUTE)));
  }
  const params = levelParams(BOUQUET_LEVELS[save.difficulty]);
  menu.append(
    difficultyPicker(save.difficulty, (difficulty) => {
      save.difficulty = difficulty;
      saveBouquet(save);
      root.replaceChildren();
      renderMenu(root, save);
    }),
    menuCard(
      `Commande n°${save.ordersDone + 1}`,
      `${difficultyName(save.difficulty)} · ${params.slots} fleurs, ${params.constraints} souhaits`,
      () => {
        if (!save.current || confirm('Abandonner la commande en cours ?')) startOrder(save);
      },
    ),
    gallerySection(save.gallery),
  );
  root.append(el('div', { class: 'bouquet' }, topBar('Bouquets'), menu));
}

function menuCard(title: string, hint: string, onClick: () => void): HTMLButtonElement {
  const card = el(
    'button',
    { class: 'menu-card', type: 'button' },
    el('span', { class: 'bouquet-icon', 'aria-hidden': 'true' }),
    el('span', { class: 'menu-card-text' }, el('strong', { text: title }), el('span', { class: 'menu-card-hint', text: hint })),
  );
  card.addEventListener('click', onClick);
  return card;
}

// -----------------------------------------------
// GALLERY
// -----------------------------------------------

function gallerySection(gallery: DeliveredBouquet[]): HTMLElement {
  const section = el('section', { class: 'bouquet-gallery' }, el('h2', { text: `Mes bouquets (${gallery.length})` }));
  if (gallery.length === 0) {
    section.append(el('p', { class: 'bouquet-gallery-empty', text: 'Tes bouquets livrés viendront se ranger ici.' }));
    return section;
  }
  const dialog = bouquetDialog();
  const grid = el('div', { class: 'bouquet-gallery-grid' });
  for (const entry of [...gallery].reverse()) {
    const tile = el(
      'button',
      { class: 'bouquet-gallery-tile', type: 'button' },
      bouquetCanvas(entry, 88),
      el('span', { class: 'bouquet-tile-stars', text: starsText(entry.stars) }),
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

function bouquetCanvas(entry: DeliveredBouquet, size: number): HTMLCanvasElement {
  const canvas = el('canvas', { class: 'bouquet-canvas' });
  canvas.width = canvas.height = Math.round(size * Math.min(2, window.devicePixelRatio || 1));
  canvas.style.width = canvas.style.height = `${size}px`;
  paintBouquet(canvas, entry.flowers);
  return canvas;
}

function bouquetDialog(): { element: HTMLDialogElement; show(entry: DeliveredBouquet): void } {
  const portrait = el('div', { class: 'bouquet-portrait' });
  const title = el('h2');
  const wishes = el('ul', { class: 'bouquet-order-list' });
  const details = el('p', { class: 'bouquet-details' });
  const close = el('button', { class: 'button button-secondary', type: 'button' }, 'Fermer');
  const element = el('dialog', { class: 'detail-dialog' }, portrait, title, wishes, details, close);
  close.addEventListener('click', () => element.close());
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  return {
    element,
    show(entry: DeliveredBouquet) {
      portrait.replaceChildren(bouquetCanvas(entry, 220));
      title.textContent = `Commande n°${entry.number}`;
      const order = generateOrder(entry.seed, entry.level);
      wishes.replaceChildren(
        ...order.constraints.map((c, i) => el('li', { class: entry.results[i] ? 'is-met' : 'is-missed', text: describe(c) })),
      );
      details.textContent = `${starsText(entry.stars)} · livré le ${new Date(entry.deliveredAt).toLocaleDateString('fr-FR')}`;
      element.showModal();
    },
  };
}
