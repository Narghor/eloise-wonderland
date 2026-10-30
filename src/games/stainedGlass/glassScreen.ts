import './glass.css';
import { el, topBar } from '../../dom';
import { navigate } from '../../navigation';
import { newSeed } from '../../random';
import { GlassGame } from './glassGame';
import { paintWindow } from './glassPainter';
import { pieceCountFor, rasterize, WINDOW_ASPECT } from './glassWindow';
import { loadGlass, saveGlass, type ChapelWindow, type GlassSave } from './glassSave';

const PLAY_ROUTE = '#/vitrail/jouer';

/** `#/vitrail` shows the menu and the chapel, `#/vitrail/jouer` the window in progress. */
export function renderGlass(root: HTMLElement, params: string[]): () => void {
  const save = loadGlass();
  const current = save.current;
  if (params[0] === 'jouer' && current && current.colors.length === pieceCountFor(current.level)) {
    const game = new GlassGame(root, save, current, { nextWindow: () => startWindow(save) });
    return () => game.dispose();
  }
  renderMenu(root, save);
  return () => {};
}

function startWindow(save: GlassSave): void {
  const level = save.windowsDone + 1;
  save.current = { level, seed: newSeed(), colors: new Array(pieceCountFor(level)).fill(-1) };
  saveGlass(save);
  navigate(PLAY_ROUTE);
}

function renderMenu(root: HTMLElement, save: GlassSave): void {
  const menu = el('main', { class: 'glass-menu' });
  if (save.current) {
    const level = save.current.level;
    menu.append(menuCard('Reprendre mon vitrail', `Vitrail n°${level}`, () => (location.hash = PLAY_ROUTE)));
  }
  menu.append(
    menuCard(`Vitrail n°${save.windowsDone + 1}`, `${pieceCountFor(save.windowsDone + 1)} morceaux de verre`, () => {
      if (!save.current || confirm('Abandonner le vitrail en cours ?')) startWindow(save);
    }),
    chapelSection(save.chapel),
  );
  root.append(el('div', { class: 'glass' }, topBar('Vitraux'), menu));
}

function menuCard(title: string, hint: string, onClick: () => void): HTMLButtonElement {
  const card = el(
    'button',
    { class: 'menu-card', type: 'button' },
    el('span', { class: 'glass-icon', 'aria-hidden': 'true' }),
    el('span', { class: 'menu-card-text' }, el('strong', { text: title }), el('span', { class: 'menu-card-hint', text: hint })),
  );
  card.addEventListener('click', onClick);
  return card;
}

// -----------------------------------------------
// CHAPEL
// -----------------------------------------------

function chapelSection(chapel: ChapelWindow[]): HTMLElement {
  const section = el('section', { class: 'chapel' }, el('h2', { text: `Ma chapelle (${chapel.length})` }));
  if (chapel.length === 0) {
    section.append(el('p', { class: 'chapel-empty', text: 'Tes vitraux terminés viendront briller ici.' }));
    return section;
  }
  const dialog = windowDialog();
  const grid = el('div', { class: 'chapel-grid' });
  for (const entry of [...chapel].reverse()) {
    const tile = el('button', { class: 'chapel-tile', type: 'button' }, windowCanvas(entry, 72));
    tile.addEventListener('click', () => dialog.show(entry));
    grid.append(tile);
  }
  section.append(grid, dialog.element);
  return section;
}

function windowCanvas(entry: ChapelWindow, width: number): HTMLCanvasElement {
  const canvas = el('canvas', { class: 'glass-canvas is-lit' });
  const resolution = Math.round(width * Math.min(2, window.devicePixelRatio || 1));
  paintWindow(canvas, rasterize(entry.seeds, resolution, resolution >= 200), entry.colors, entry.palette);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${Math.round(width * WINDOW_ASPECT)}px`;
  return canvas;
}

function windowDialog(): { element: HTMLDialogElement; show(entry: ChapelWindow): void } {
  const portrait = el('div', { class: 'glass-portrait' });
  const title = el('h2');
  const details = el('p', { class: 'glass-details' });
  const close = el('button', { class: 'button button-secondary', type: 'button' }, 'Fermer');
  const element = el('dialog', { class: 'detail-dialog' }, portrait, title, details, close);
  close.addEventListener('click', () => element.close());
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  return {
    element,
    show(entry: ChapelWindow) {
      portrait.replaceChildren(windowCanvas(entry, 200));
      title.textContent = `Vitrail n°${entry.level}`;
      details.textContent = `${entry.seeds.length} morceaux · fini le ${new Date(entry.madeAt).toLocaleDateString('fr-FR')}`;
      element.showModal();
    },
  };
}
