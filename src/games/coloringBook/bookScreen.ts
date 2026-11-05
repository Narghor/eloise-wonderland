import './book.css';
import { el, topBar } from '../../dom';
import { difficultyPicker } from '../../difficulty';
import { helpSlot } from '../../help';
import { drawingCanvas } from './bookCanvas';
import { BOOK_DRAWINGS, findDrawing } from './drawings';
import type { BookDrawing } from './bookDrawing';
import { BookPage, BOOK_TIERS } from './bookGame';
import { BOOK_HELP } from './bookHelp';
import { FREE_PALETTE, modelPalette } from './bookPalette';
import { loadBook, saveBook, type BookMode, type BookSave, type PageInProgress } from './bookSave';

const MODE_NAMES: Record<BookMode, string> = { model: 'Avec modèle', free: 'Libre' };

/** `#/coloriage` lists the drawings, `#/coloriage/<id>` colours one in the chosen mode. */
export function renderColoringBook(root: HTMLElement, params: string[]): () => void {
  const save = loadBook();
  const drawing = params[0] ? findDrawing(params[0]) : undefined;
  if (!drawing) {
    renderPicker(root, save);
    return () => {};
  }
  const page = new BookPage(root, drawing, save.mode, pageFor(save, drawing), save);
  return () => page.dispose();
}

/** The page in progress for this drawing, or a blank one with today's pencils. */
function pageFor(save: BookSave, drawing: BookDrawing): PageInProgress {
  const current = save.pages[save.mode];
  if (current?.drawingId === drawing.id) return current;
  return {
    drawingId: drawing.id,
    difficulty: save.difficulty,
    palette: save.mode === 'model' ? modelPalette(drawing, BOOK_TIERS[save.difficulty].decoys) : [...FREE_PALETTE],
    paint: '',
  };
}

// -----------------------------------------------
// PICKER
// -----------------------------------------------

function renderPicker(root: HTMLElement, save: BookSave): void {
  const refresh = () => {
    root.replaceChildren();
    renderPicker(root, save);
  };

  const modes = el('div', { class: 'tool-toggle book-modes', role: 'group', 'aria-label': 'Mode' });
  for (const mode of ['model', 'free'] as const) {
    const button = el('button', { class: `tool-button${save.mode === mode ? ' is-active' : ''}`, type: 'button' }, MODE_NAMES[mode]);
    button.addEventListener('click', () => {
      save.mode = mode;
      saveBook(save);
      refresh();
    });
    modes.append(button);
  }

  const current = save.pages[save.mode];
  const currentDrawing = current ? findDrawing(current.drawingId) : undefined;
  const tiles = BOOK_DRAWINGS.map((drawing) => {
    const best = save.best[drawing.id];
    const tile = el(
      'a',
      { class: 'book-tile', href: `#/coloriage/${drawing.id}` },
      drawingCanvas(drawing, 96, false),
      el('span', { class: 'book-tile-name', text: drawing.name }),
      el('span', { class: 'book-tile-stars', text: save.mode === 'model' && best !== undefined ? '★'.repeat(best) + '☆'.repeat(3 - best) : '' }),
    );
    if (drawing === currentDrawing) tile.append(el('span', { class: 'book-tile-tag', text: 'En cours' }));
    tile.addEventListener('click', (event) => {
      if (!currentDrawing || drawing === currentDrawing) return;
      if (!confirm(`Abandonner ton coloriage en cours (${currentDrawing.name}) ?`)) event.preventDefault();
    });
    return tile;
  });

  root.append(
    el(
      'div',
      { class: 'book' },
      topBar('Coloriage', helpSlot(BOOK_HELP)),
      el(
        'main',
        { class: 'book-picker' },
        modes,
        save.mode === 'model'
          ? difficultyPicker(save.difficulty, (difficulty) => {
              save.difficulty = difficulty;
              saveBook(save);
            })
          : el('p', { class: 'book-free-hint', text: 'Toutes les couleurs, un seau pour remplir, et tu enregistres ton image à la fin.' }),
        el('div', { class: 'book-grid' }, ...tiles),
      ),
    ),
  );
}
