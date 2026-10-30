import './mosaic.css';
import { el, topBar } from '../../dom';
import { difficultyFromLevel, difficultyName, difficultyPicker } from '../../difficulty';
import { CHALLENGE_DIFFICULTY } from '../../daily/daily';
import { navigate } from '../../navigation';
import { newSeed } from '../../random';
import { MosaicGame } from './mosaicGame';
import { paintBoard } from './mosaicPainter';
import { MOSAIC_LEVELS, boardSizeLabel, generateBoard } from './mosaicBoard';
import { loadMosaic, saveMosaic, type GalleryMosaic, type MosaicSave } from './mosaicSave';

const PLAY_ROUTE = '#/mosaique/jouer';

/** `#/mosaique` shows the menu and the gallery, `#/mosaique/jouer` the mosaic in progress. */
export function renderMosaic(root: HTMLElement, params: string[]): () => void {
  const save = loadMosaic();
  if (params[0] === 'jouer' && save.current) {
    const game = new MosaicGame(root, save, save.current, { nextMosaic: () => startMosaic(save) });
    return () => game.dispose();
  }
  renderMenu(root, save);
  return () => {};
}

function startMosaic(save: MosaicSave, challenge?: string): void {
  const level = MOSAIC_LEVELS[challenge ? CHALLENGE_DIFFICULTY : save.difficulty];
  save.current = { number: save.mosaicsDone + 1, seed: newSeed(), level, placements: [], mistakes: 0, challenge };
  saveMosaic(save);
  navigate(PLAY_ROUTE);
}

export function startMosaicChallenge(day: string): void {
  const save = loadMosaic();
  if (save.current && !confirm('Le défi remplace ta mosaïque en cours. On y va ?')) return;
  startMosaic(save, day);
}

function renderMenu(root: HTMLElement, save: MosaicSave): void {
  const menu = el('main', { class: 'mosaic-menu' });
  if (save.current) {
    menu.append(menuCard('Reprendre ma mosaïque', `Mosaïque n°${save.current.number}`, () => (location.hash = PLAY_ROUTE)));
  }
  const level = MOSAIC_LEVELS[save.difficulty];
  menu.append(
    difficultyPicker(save.difficulty, (difficulty) => {
      save.difficulty = difficulty;
      saveMosaic(save);
      root.replaceChildren();
      renderMenu(root, save);
    }),
    menuCard(`Mosaïque n°${save.mosaicsDone + 1}`, `${difficultyName(save.difficulty)} · plateau ${boardSizeLabel(level)}`, () => {
      if (!save.current || confirm('Abandonner la mosaïque en cours ?')) startMosaic(save);
    }),
    gallerySection(save.gallery),
  );
  root.append(el('div', { class: 'mosaic' }, topBar('Mosaïques'), menu));
}

function menuCard(title: string, hint: string, onClick: () => void): HTMLButtonElement {
  const card = el(
    'button',
    { class: 'menu-card', type: 'button' },
    el('span', { class: 'mosaic-icon', 'aria-hidden': 'true' }),
    el('span', { class: 'menu-card-text' }, el('strong', { text: title }), el('span', { class: 'menu-card-hint', text: hint })),
  );
  card.addEventListener('click', onClick);
  return card;
}

// -----------------------------------------------
// GALLERY
// -----------------------------------------------

function gallerySection(gallery: GalleryMosaic[]): HTMLElement {
  const section = el('section', { class: 'mosaic-gallery' }, el('h2', { text: `Mes mosaïques (${gallery.length})` }));
  if (gallery.length === 0) {
    section.append(el('p', { class: 'mosaic-gallery-empty', text: 'Tes mosaïques terminées seront exposées ici.' }));
    return section;
  }
  const dialog = mosaicDialog();
  const grid = el('div', { class: 'mosaic-gallery-grid' });
  for (const entry of [...gallery].reverse()) {
    const tile = el('button', { class: 'mosaic-gallery-tile', type: 'button' }, mosaicCanvas(entry, 76));
    tile.addEventListener('click', () => dialog.show(entry));
    grid.append(tile);
  }
  section.append(grid, dialog.element);
  return section;
}

function mosaicCanvas(entry: GalleryMosaic, size: number): HTMLCanvasElement {
  const canvas = el('canvas', { class: 'mosaic-thumb' });
  const board = generateBoard(entry.seed, entry.level);
  // A finished mosaic stores one placement per tile, in tile order.
  const placements = entry.placements.length === board.tiles.length ? entry.placements : board.tiles.map(() => null);
  paintBoard(canvas, board, placements, size, { finished: true });
  return canvas;
}

function mosaicDialog(): { element: HTMLDialogElement; show(entry: GalleryMosaic): void } {
  const portrait = el('div', { class: 'mosaic-portrait' });
  const title = el('h2');
  const details = el('p', { class: 'mosaic-details' });
  const close = el('button', { class: 'button button-secondary', type: 'button' }, 'Fermer');
  const element = el('dialog', { class: 'detail-dialog' }, portrait, title, details, close);
  close.addEventListener('click', () => element.close());
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  return {
    element,
    show(entry: GalleryMosaic) {
      portrait.replaceChildren(mosaicCanvas(entry, 220));
      title.textContent = `Mosaïque n°${entry.number}`;
      const stars = '★'.repeat(entry.stars) + '☆'.repeat(3 - entry.stars);
      const difficulty = difficultyName(difficultyFromLevel(MOSAIC_LEVELS, entry.level));
      details.textContent = `${stars} · ${difficulty} · finie le ${new Date(entry.madeAt).toLocaleDateString('fr-FR')}`;
      element.showModal();
    },
  };
}
