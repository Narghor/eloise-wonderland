import './beads.css';
import { el, topBar } from '../../dom';
import { difficultyName, difficultyPicker, type Difficulty } from '../../difficulty';
import { CHALLENGE_DIFFICULTY } from '../../daily/daily';
import { navigate } from '../../navigation';
import { BeadGame } from './beadGame';
import { drawBeads } from './beadDraw';
import { BEAD_TIERS, beadTotal, EMPTY, generateModel } from './beadLogic';
import { loadBeads, saveBeads, type BeadSave, type BoxedBeads } from './beadSave';

const PLAY_ROUTE = '#/perles/jouer';

/** `#/perles` shows the menu and the box, `#/perles/jouer` the piece in progress. */
export function renderBeads(root: HTMLElement, params: string[]): () => void {
  const save = loadBeads();
  const current = save.current;
  if (params[0] === 'jouer' && current) {
    const game = new BeadGame(root, save, current, { nextPiece: () => startPiece(save) });
    return () => game.dispose();
  }
  renderMenu(root, save);
  return () => {};
}

function startPiece(save: BeadSave, challenge?: string): void {
  const difficulty: Difficulty = challenge ? CHALLENGE_DIFFICULTY : save.difficulty;
  const pattern = generateModel(BEAD_TIERS[difficulty]);
  const placed = pattern.cells.map(() => EMPTY);
  save.current = { ...pattern, number: save.piecesDone + 1, difficulty, placed, mistakes: 0, challenge };
  saveBeads(save);
  navigate(PLAY_ROUTE);
}

export function startBeadsChallenge(day: string): void {
  const save = loadBeads();
  if (save.current && !confirm('Le défi remplace ton modèle en cours. On y va ?')) return;
  startPiece(save, day);
}

function renderMenu(root: HTMLElement, save: BeadSave): void {
  const menu = el('main', { class: 'beads-menu' });
  if (save.current) {
    menu.append(menuCard('Reprendre mon modèle', `Perles n°${save.current.number}`, () => (location.hash = PLAY_ROUTE)));
  }
  const tier = BEAD_TIERS[save.difficulty];
  menu.append(
    difficultyPicker(save.difficulty, (difficulty) => {
      save.difficulty = difficulty;
      saveBeads(save);
      root.replaceChildren();
      renderMenu(root, save);
    }),
    menuCard(`Perles n°${save.piecesDone + 1}`, `${difficultyName(save.difficulty)} · plaque ${tier.size}×${tier.size}, ${tier.colors} couleurs`, () => {
      if (!save.current || confirm('Abandonner le modèle en cours ?')) startPiece(save);
    }),
    boxSection(save.box),
  );
  root.append(el('div', { class: 'beads' }, topBar('Perles à repasser'), menu));
}

function menuCard(title: string, hint: string, onClick: () => void): HTMLButtonElement {
  const card = el(
    'button',
    { class: 'menu-card', type: 'button' },
    el('span', { class: 'beads-icon', 'aria-hidden': 'true' }),
    el('span', { class: 'menu-card-text' }, el('strong', { text: title }), el('span', { class: 'menu-card-hint', text: hint })),
  );
  card.addEventListener('click', onClick);
  return card;
}

// -----------------------------------------------
// THE BOX OF FINISHED PIECES
// -----------------------------------------------

function boxSection(box: BoxedBeads[]): HTMLElement {
  const section = el('section', { class: 'beads-box' }, el('h2', { text: `Ma boîte à perles (${box.length})` }));
  if (box.length === 0) {
    section.append(el('p', { class: 'beads-box-empty', text: 'Tes créations terminées viendront se ranger ici.' }));
    return section;
  }
  const dialog = piecesDialog();
  const grid = el('div', { class: 'beads-box-grid' });
  for (const entry of [...box].reverse()) {
    const canvas = el('canvas', { class: 'beads-canvas' });
    drawBeads(canvas, entry, entry.cells, 56);
    const tile = el('button', { class: 'beads-box-tile', type: 'button', 'aria-label': `Perles n°${entry.number}` }, canvas);
    tile.addEventListener('click', () => dialog.show(entry));
    grid.append(tile);
  }
  section.append(grid, dialog.element);
  return section;
}

function piecesDialog(): { element: HTMLDialogElement; show(entry: BoxedBeads): void } {
  const portrait = el('div', { class: 'beads-portrait' });
  const title = el('h2');
  const details = el('p', { class: 'beads-details' });
  const close = el('button', { class: 'button button-secondary', type: 'button' }, 'Fermer');
  const element = el('dialog', { class: 'detail-dialog' }, portrait, title, details, close);
  close.addEventListener('click', () => element.close());
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  return {
    element,
    show(entry: BoxedBeads) {
      const canvas = el('canvas', { class: 'beads-canvas' });
      drawBeads(canvas, entry, entry.cells, Math.min(260, window.innerWidth - 80));
      portrait.replaceChildren(canvas);
      title.textContent = `Perles n°${entry.number}`;
      const stars = '★'.repeat(entry.stars) + '☆'.repeat(3 - entry.stars);
      details.textContent = `${stars} · ${beadTotal(entry)} perles · fini le ${new Date(entry.madeAt).toLocaleDateString('fr-FR')}`;
      element.showModal();
    },
  };
}
