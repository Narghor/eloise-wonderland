import './pixel.css';
import { el, topBar, type BackLink } from '../../dom';
import { difficultyName } from '../../difficulty';
import { PIXEL_MODELS } from '../../pictures/pixelModels';
import { modelSize } from '../../pictures/pixelModel';
import { modelSizes } from '../../pictures/modelPicker';
import { difficultyForSize, isColored } from '../../pictures/pixelPicture';
import { pictureCanvas } from '../../pictures/pictureCanvas';
import {
  discoveredModels, findNotebookDrawing, loadNotebook, startNotebookDrawing, updateNotebookDrawing, type NotebookDrawing,
} from '../../pictures/notebook';
import { ColoringGame } from '../coloring/coloringGame';

const BACK_NOTEBOOK: BackLink = { href: '#/pixel', label: 'Carnet' };
/** A 5x5 drawing is over in a few taps: Pixel art starts at 10x10 (the Picross still gives small ones). */
const MIN_PIXEL_ART_SIZE = 10;
const SIZE_LABELS: Record<number, string> = { 5: 'Petit', 10: 'Moyen', 15: 'Grand' };

/** `#/pixel` shows the notebook, `#/pixel/<id>` colours one of its drawings. */
export function renderPixelArt(root: HTMLElement, params: string[]): () => void {
  return params[0] ? renderDrawing(root, params[0]) : renderNotebook(root);
}

function openNewDrawing(size: number, avoid?: string): void {
  const drawing = startNotebookDrawing(size, avoid);
  if (drawing) location.hash = `#/pixel/${drawing.id}`;
}

// -----------------------------------------------
// COLOURING ONE DRAWING
// -----------------------------------------------

function renderDrawing(root: HTMLElement, id: string): () => void {
  const drawing = findNotebookDrawing(id);
  if (!drawing) {
    root.append(
      el(
        'div',
        { class: 'coloring' },
        topBar('Pixel art', undefined, BACK_NOTEBOOK),
        el('p', { class: 'empty-message', text: "Ce dessin n'est pas dans ton carnet." }),
      ),
    );
    return () => {};
  }
  const game = new ColoringGame(root, drawing, {
    back: BACK_NOTEBOOK,
    save: updateNotebookDrawing,
    doneText: (justNow) => (justNow ? ' rejoint ton carnet !' : ' est dans ton carnet.'),
    doneLinks: () => {
      const again = el('button', { class: 'button', type: 'button' }, 'Nouveau dessin');
      again.addEventListener('click', () => openNewDrawing(Math.max(MIN_PIXEL_ART_SIZE, drawing.size), drawing.modelId));
      return [again, el('a', { class: 'button button-secondary', href: '#/pixel' }, 'Voir le carnet')];
    },
  });
  return () => game.dispose();
}

// -----------------------------------------------
// THE NOTEBOOK
// -----------------------------------------------

function renderNotebook(root: HTMLElement): () => void {
  const drawings = loadNotebook();
  const discovered = discoveredModels(drawings);
  const dialog = drawingDialog();
  const count = el('span', { class: 'notebook-count', text: `${discovered.size} / ${PIXEL_MODELS.length} modèles` });
  const page = el('div', { class: 'notebook' }, topBar('Pixel art', count), el('main', { class: 'notebook-main' }, newDrawingSection(discovered), ...gallery(drawings, dialog.show)), dialog.element);
  root.append(page);
  return () => dialog.element.close();
}

function newDrawingSection(discovered: ReadonlySet<string>): HTMLElement {
  const cards = modelSizes()
    .filter((size) => size >= MIN_PIXEL_ART_SIZE)
    .map((size) => {
      const ofSize = PIXEL_MODELS.filter((model) => modelSize(model) === size);
      const found = ofSize.filter((model) => discovered.has(model.id)).length;
      const card = el(
        'button',
        { class: 'notebook-size', type: 'button' },
        el('strong', { text: SIZE_LABELS[size] ?? `${size} × ${size}` }),
        el('span', { text: `${size} × ${size} · ${difficultyName(difficultyForSize(size))}` }),
        el('span', { class: 'notebook-size-count', text: `${found} / ${ofSize.length} découverts` }),
      );
      card.addEventListener('click', () => openNewDrawing(size));
      return card;
    });
  return el('section', { class: 'notebook-new' }, el('h2', { text: 'Nouveau dessin' }), el('div', { class: 'notebook-sizes' }, ...cards));
}

function gallery(drawings: NotebookDrawing[], showColored: (drawing: NotebookDrawing) => void): HTMLElement[] {
  if (drawings.length === 0) {
    return [el('p', { class: 'notebook-empty', text: 'Ton carnet est vide : choisis une taille pour ton premier dessin, ou gagne-en au Picross !' })];
  }
  // Drawings waiting for colours first, then the newest.
  const ordered = [...drawings].sort((a, b) => Number(isColored(a)) - Number(isColored(b)) || b.addedAt.localeCompare(a.addedAt));
  const grid = el('div', { class: 'notebook-grid' });
  for (const drawing of ordered) {
    const colored = isColored(drawing);
    const tile = el(
      'button',
      { class: colored ? 'notebook-tile' : 'notebook-tile is-pending', type: 'button' },
      pictureCanvas(drawing, 84),
      el('span', { class: 'notebook-tile-name', text: drawing.name }),
    );
    if (!colored) tile.append(el('span', { class: 'notebook-tile-tag', text: 'À colorier' }));
    else if (drawing.stars !== undefined) tile.append(el('span', { class: 'notebook-tile-stars', text: starsText(drawing.stars) }));
    tile.addEventListener('click', () => {
      if (colored) showColored(drawing);
      else location.hash = `#/pixel/${drawing.id}`;
    });
    grid.append(tile);
  }
  return [el('h2', { class: 'notebook-title', text: 'Mon carnet' }), grid];
}

function starsText(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

function drawingDialog(): { element: HTMLDialogElement; show(drawing: NotebookDrawing): void } {
  const portrait = el('div', { class: 'notebook-portrait' });
  const name = el('h2');
  const added = el('p', { class: 'notebook-added' });
  const close = el('button', { class: 'button button-secondary', type: 'button' }, 'Fermer');
  const element = el('dialog', { class: 'detail-dialog' }, portrait, name, added, close);
  close.addEventListener('click', () => element.close());
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  return {
    element,
    show(drawing: NotebookDrawing) {
      portrait.replaceChildren(pictureCanvas(drawing, 200));
      name.textContent = drawing.name;
      const origin = drawing.source === 'picross' ? 'Gagné au Picross' : 'Dessiné';
      const date = `${origin} le ${new Date(drawing.addedAt).toLocaleDateString('fr-FR')}`;
      added.textContent = drawing.stars === undefined ? date : `${starsText(drawing.stars)} · ${date}`;
      element.showModal();
    },
  };
}
