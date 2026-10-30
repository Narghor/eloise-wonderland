import './sand.css';
import { el, topBar } from '../../dom';
import { JAR_HEIGHT, JAR_WIDTH, cellsFromColors } from './jar';
import { JarPainter } from './jarPainter';
import { SAND_COLORS, generateLevel } from './levels';
import { SandGame } from './sandGame';
import { decodeColors, encodeColors, loadSand, saveSand, type CurrentBottle, type SandSave, type ShelfBottle } from './sandSave';

const PLAY_ROUTE = '#/sable/jouer';

/** `#/sable` shows the menu and the shelf, `#/sable/jouer` the bottle in progress. */
export function renderSand(root: HTMLElement, params: string[]): () => void {
  const save = loadSand();
  if (params[0] === 'jouer' && save.current) {
    const game = new SandGame(root, save, save.current, {
      nextModel: () => startModel(save),
      newFree: () => startFree(save),
    });
    return () => game.dispose();
  }
  renderMenu(root, save);
  return () => {};
}

function startModel(save: SandSave): void {
  const level = save.modelsDone + 1;
  const { palette, target } = generateLevel(level);
  start(save, { level, palette, target: encodeColors(target), cells: emptyJar() });
}

function startFree(save: SandSave): void {
  start(save, { level: null, palette: [...SAND_COLORS], target: null, cells: emptyJar() });
}

function start(save: SandSave, bottle: CurrentBottle): void {
  save.current = bottle;
  saveSand(save);
  // Re-render even when the route does not change (next bottle from the play screen).
  if (location.hash === PLAY_ROUTE) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = PLAY_ROUTE;
}

function emptyJar(): string {
  return encodeColors(new Uint8Array(JAR_WIDTH * JAR_HEIGHT));
}

// -----------------------------------------------
// MENU
// -----------------------------------------------

function renderMenu(root: HTMLElement, save: SandSave): void {
  const menu = el('main', { class: 'sand-menu' });

  if (save.current) {
    const current = save.current;
    menu.append(
      menuCard(
        bottleCanvas(current.palette, current.cells, 56),
        'Reprendre ma bouteille',
        current.level === null ? 'Création libre' : `Bouteille n°${current.level}`,
        () => (location.hash = PLAY_ROUTE),
      ),
    );
  }

  const confirmReplace = () => !save.current || confirm('Abandonner la bouteille en cours ?');
  const modelCard = menuCard(null, `Bouteille n°${save.modelsDone + 1}`, 'Reproduis le modèle', () => {
    if (!confirmReplace()) return;
    modelCard.classList.add('is-loading');
    modelCard.querySelector('.menu-card-hint')!.textContent = 'Préparation…';
    // Let the browser show "Préparation…" before the generator holds the thread.
    setTimeout(() => startModel(save), 30);
  });
  const freeCard = menuCard(null, 'Création libre', 'Toutes les couleurs, aucun modèle', () => {
    if (confirmReplace()) startFree(save);
  });
  menu.append(modelCard, freeCard, shelfSection(save.shelf));

  root.append(el('div', { class: 'sand' }, topBar('Bouteilles de sable'), menu));
}

function menuCard(icon: HTMLElement | null, title: string, hint: string, onClick: () => void): HTMLButtonElement {
  const card = el(
    'button',
    { class: 'menu-card', type: 'button' },
    icon ?? el('span', { class: 'menu-card-icon', 'aria-hidden': 'true' }),
    el('span', { class: 'menu-card-text' }, el('strong', { text: title }), el('span', { class: 'menu-card-hint', text: hint })),
  );
  card.addEventListener('click', onClick);
  return card;
}

// -----------------------------------------------
// SHELF
// -----------------------------------------------

function shelfSection(shelf: ShelfBottle[]): HTMLElement {
  const section = el('section', { class: 'shelf' }, el('h2', { text: `Mon étagère (${shelf.length})` }));
  if (shelf.length === 0) {
    section.append(el('p', { class: 'shelf-empty', text: 'Tes bouteilles terminées viendront se ranger ici.' }));
    return section;
  }

  const dialog = bottleDialog();
  const grid = el('div', { class: 'shelf-grid' });
  for (const bottle of [...shelf].reverse()) {
    const tile = el(
      'button',
      { class: 'shelf-tile', type: 'button' },
      bottleCanvas(bottle.palette, bottle.cells, 70),
      el('span', { class: 'shelf-stars', text: starsText(bottle.stars) }),
    );
    tile.addEventListener('click', () => dialog.show(bottle));
    grid.append(tile);
  }
  section.append(grid, dialog.element);
  return section;
}

function starsText(stars: number | null): string {
  return stars === null ? 'Libre' : '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

function bottleCanvas(palette: string[], cells: string, height: number): HTMLCanvasElement {
  const painter = new JarPainter(palette);
  painter.paint(cellsFromColors(decodeColors(cells)!));
  painter.canvas.style.height = `${height}px`;
  painter.canvas.style.width = `${Math.round((height * JAR_WIDTH) / JAR_HEIGHT)}px`;
  return painter.canvas;
}

function bottleDialog(): { element: HTMLDialogElement; show(bottle: ShelfBottle): void } {
  const portrait = el('div', { class: 'bottle-portrait' });
  const title = el('h2');
  const details = el('p', { class: 'bottle-details' });
  const close = el('button', { class: 'button button-secondary', type: 'button' }, 'Fermer');
  const element = el('dialog', { class: 'detail-dialog' }, portrait, title, details, close);
  close.addEventListener('click', () => element.close());
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  return {
    element,
    show(bottle: ShelfBottle) {
      portrait.replaceChildren(bottleCanvas(bottle.palette, bottle.cells, 260));
      title.textContent = bottle.level === null ? 'Création libre' : `Bouteille n°${bottle.level}`;
      const date = new Date(bottle.madeAt).toLocaleDateString('fr-FR');
      details.textContent = bottle.stars === null ? `Faite le ${date}` : `${starsText(bottle.stars)} · faite le ${date}`;
      element.showModal();
    },
  };
}
