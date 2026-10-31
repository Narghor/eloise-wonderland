import './box.css';
import { el, topBar } from '../../dom';
import { difficultyName, difficultyPicker, type Difficulty } from '../../difficulty';
import { CHALLENGE_DIFFICULTY } from '../../daily/daily';
import { navigate } from '../../navigation';
import { BoxGame } from './boxGame';
import { BOX_TIERS, generatePuzzle } from './boxLogic';
import { loadBox, saveBox, type BoxSave } from './boxSave';

const PLAY_ROUTE = '#/rangement/jouer';

/** `#/rangement` shows the menu, `#/rangement/jouer` the box in progress. */
export function renderBox(root: HTMLElement, params: string[]): () => void {
  const save = loadBox();
  const current = save.current;
  if (params[0] === 'jouer' && current) {
    const game = new BoxGame(root, save, current, { nextBox: () => startBox(save) });
    return () => game.dispose();
  }
  renderMenu(root, save);
  return () => {};
}

function startBox(save: BoxSave, challenge?: string): void {
  const difficulty: Difficulty = challenge ? CHALLENGE_DIFFICULTY : save.difficulty;
  save.current = { ...generatePuzzle(BOX_TIERS[difficulty]), number: save.boxesDone + 1, difficulty, mistakes: 0, challenge };
  saveBox(save);
  navigate(PLAY_ROUTE);
}

export function startBoxChallenge(day: string): void {
  const save = loadBox();
  if (save.current && !confirm('Le défi remplace ta boîte en cours. On y va ?')) return;
  startBox(save, day);
}

function renderMenu(root: HTMLElement, save: BoxSave): void {
  const menu = el('main', { class: 'box-menu' });
  if (save.current) {
    menu.append(menuCard('Reprendre ma boîte', `Boîte n°${save.current.number}`, () => (location.hash = PLAY_ROUTE)));
  }
  const tier = BOX_TIERS[save.difficulty];
  const best = save.bestStars[save.difficulty];
  menu.append(
    difficultyPicker(save.difficulty, (difficulty) => {
      save.difficulty = difficulty;
      saveBox(save);
      root.replaceChildren();
      renderMenu(root, save);
    }),
    menuCard(`Boîte n°${save.boxesDone + 1}`, `${difficultyName(save.difficulty)} · ${tier.cols} × ${tier.rows} cases`, () => {
      if (!save.current || confirm('Abandonner la boîte en cours ?')) startBox(save);
    }),
    el('p', {
      class: 'box-menu-note',
      text:
        save.boxesDone === 0
          ? 'Range tous les trésors dans la boîte, sans laisser de trou.'
          : `${save.boxesDone} boîte${save.boxesDone > 1 ? 's' : ''} rangée${save.boxesDone > 1 ? 's' : ''}` +
            (best > 0 ? ` · meilleur score ici : ${'★'.repeat(best)}${'☆'.repeat(3 - best)}` : ''),
    }),
  );
  root.append(el('div', { class: 'box-screen' }, topBar('Boîte à trésors'), menu));
}

function menuCard(title: string, hint: string, onClick: () => void): HTMLButtonElement {
  const card = el(
    'button',
    { class: 'menu-card', type: 'button' },
    el('span', { class: 'box-icon', 'aria-hidden': 'true' }),
    el('span', { class: 'menu-card-text' }, el('strong', { text: title }), el('span', { class: 'menu-card-hint', text: hint })),
  );
  card.addEventListener('click', onClick);
  return card;
}
