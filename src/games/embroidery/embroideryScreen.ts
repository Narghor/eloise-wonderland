import './embroidery.css';
import { el, topBar } from '../../dom';
import { difficultyName, difficultyPicker, type Difficulty } from '../../difficulty';
import { CHALLENGE_DIFFICULTY } from '../../daily/daily';
import { navigate } from '../../navigation';
import { EmbroideryGame, pieceTitle } from './embroideryGame';
import { paintBack, paintFront, prepareCanvas } from './embroideryPainter';
import { createPattern, EMBROIDERY_LEVELS, encodeStitched, NO_STITCH, targetColors } from './embroideryPattern';
import { loadEmbroidery, readPaths, saveEmbroidery, type EmbroiderySave, type FinishedPiece } from './embroiderySave';

const PLAY_ROUTE = '#/broderie/jouer';

/** `#/broderie` shows the menu and the finished pieces, `#/broderie/jouer` the piece in progress. */
export function renderEmbroidery(root: HTMLElement, params: string[]): () => void {
  const save = loadEmbroidery();
  if (params[0] === 'jouer' && save.current) {
    const game = new EmbroideryGame(root, save, save.current, { nextPiece: () => startPiece(loadEmbroidery()) });
    return () => game.dispose();
  }
  renderMenu(root, save);
  return () => {};
}

export function startEmbroideryChallenge(day: string): void {
  const save = loadEmbroidery();
  if (save.current && !confirm('Le défi remplace ton ouvrage en cours. On y va ?')) return;
  startPiece(save, day);
}

function startPiece(save: EmbroiderySave, challenge?: string): void {
  const difficulty: Difficulty = challenge ? CHALLENGE_DIFFICULTY : save.difficulty;
  const pattern = createPattern(EMBROIDERY_LEVELS[difficulty]);
  save.current = {
    number: save.piecesDone + 1,
    difficulty,
    pattern,
    stitched: encodeStitched(targetColors(pattern).map(() => NO_STITCH)),
    paths: pattern.palette.map(() => ''),
    mistakes: 0,
    ...(challenge ? { challenge } : {}),
  };
  saveEmbroidery(save);
  navigate(PLAY_ROUTE);
}

function renderMenu(root: HTMLElement, save: EmbroiderySave): void {
  const menu = el('main', { class: 'embroidery-menu' });
  if (save.current) {
    menu.append(menuCard('Reprendre mon ouvrage', pieceTitle(save.current), () => (location.hash = PLAY_ROUTE)));
  }
  const size = EMBROIDERY_LEVELS[save.difficulty];
  menu.append(
    difficultyPicker(save.difficulty, (difficulty) => {
      save.difficulty = difficulty;
      saveEmbroidery(save);
      root.replaceChildren();
      renderMenu(root, save);
    }),
    menuCard(`Ouvrage n°${save.piecesDone + 1}`, `${difficultyName(save.difficulty)} · motif de ${size}×${size}`, () => {
      if (!save.current || confirm('Abandonner l’ouvrage en cours ?')) startPiece(save);
    }),
    gallerySection(save.gallery),
  );
  root.append(el('div', { class: 'embroidery' }, topBar('Broderie'), menu));
}

function menuCard(title: string, hint: string, onClick: () => void): HTMLButtonElement {
  const card = el(
    'button',
    { class: 'menu-card', type: 'button' },
    el('span', { class: 'embroidery-icon', 'aria-hidden': 'true' }),
    el('span', { class: 'menu-card-text' }, el('strong', { text: title }), el('span', { class: 'menu-card-hint', text: hint })),
  );
  card.addEventListener('click', onClick);
  return card;
}

// -----------------------------------------------
// GALLERY
// -----------------------------------------------

function gallerySection(gallery: FinishedPiece[]): HTMLElement {
  const section = el('section', { class: 'embroidery-gallery' }, el('h2', { text: `Mes ouvrages (${gallery.length})` }));
  if (gallery.length === 0) {
    section.append(el('p', { class: 'embroidery-gallery-empty', text: 'Tes broderies terminées viendront s’exposer ici.' }));
    return section;
  }
  const dialog = pieceDialog();
  const grid = el('div', { class: 'embroidery-gallery-grid' });
  for (const entry of [...gallery].reverse()) {
    const tile = el('button', { class: 'embroidery-tile', type: 'button', 'aria-label': `Ouvrage n°${entry.number}` }, frontCanvas(entry, 72));
    tile.addEventListener('click', () => dialog.show(entry));
    grid.append(tile);
  }
  section.append(grid, dialog.element);
  return section;
}

function frontCanvas(entry: FinishedPiece, cssSize: number): HTMLCanvasElement {
  const canvas = el('canvas', { class: 'embroidery-canvas' });
  paintFront(prepareCanvas(canvas, cssSize), entry.pattern, cssSize);
  return canvas;
}

function backCanvas(entry: FinishedPiece, cssSize: number): HTMLCanvasElement {
  const canvas = el('canvas', { class: 'embroidery-canvas is-back' });
  paintBack(prepareCanvas(canvas, cssSize), entry.pattern, readPaths(entry.pattern, entry.paths) ?? [], cssSize);
  return canvas;
}

function pieceDialog(): { element: HTMLDialogElement; show(entry: FinishedPiece): void } {
  const sides = el('div', { class: 'embroidery-sides' });
  const title = el('h2');
  const stars = el('p', { class: 'embroidery-stars' });
  const details = el('p', { class: 'embroidery-details' });
  const close = el('button', { class: 'button button-secondary', type: 'button' }, 'Fermer');
  const element = el('dialog', { class: 'detail-dialog' }, sides, title, stars, details, close);
  close.addEventListener('click', () => element.close());
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  return {
    element,
    show(entry: FinishedPiece) {
      sides.replaceChildren(
        el('figure', {}, frontCanvas(entry, 130), el('figcaption', { text: "L'endroit" })),
        el('figure', {}, backCanvas(entry, 130), el('figcaption', { text: "L'envers" })),
      );
      title.textContent = `Ouvrage n°${entry.number} · ${entry.pattern.name}`;
      stars.textContent = '★'.repeat(entry.stars) + '☆'.repeat(3 - entry.stars);
      const mistakes = entry.mistakes === 1 ? '1 erreur' : `${entry.mistakes} erreurs`;
      const jumps = entry.jumps === 1 ? '1 saut' : `${entry.jumps} sauts`;
      details.textContent = `${difficultyName(entry.difficulty)} · ${mistakes} · ${jumps} · fini le ${new Date(entry.madeAt).toLocaleDateString('fr-FR')}`;
      element.showModal();
    },
  };
}
