import './nap.css';
import { el, topBar } from '../../dom';
import { difficultyName, difficultyPicker } from '../../difficulty';
import { navigate } from '../../navigation';
import { NapGame } from './napGame';
import { NAP_TIERS, generateNap } from './napLogic';
import { sleepingCat } from './napArt';
import { Mark, loadNap, saveNap, type NapSave } from './napSave';

const PLAY_ROUTE = '#/elomew/jouer';

/** `#/elomew` shows the menu, `#/elomew/jouer` the room in progress. */
export function renderCatNap(root: HTMLElement, params: string[]): () => void {
  const save = loadNap();
  const current = save.current;
  if (params[0] === 'jouer' && current) {
    const game = new NapGame(root, save, current, { nextRoom: () => startRoom(save) });
    return () => game.dispose();
  }
  renderMenu(root, save);
  return () => {};
}

function startRoom(save: NapSave): void {
  const difficulty = save.difficulty;
  const puzzle = generateNap(NAP_TIERS[difficulty]);
  save.current = {
    ...puzzle,
    number: save.roomsDone + 1,
    difficulty,
    marks: new Array<Mark>(puzzle.size * puzzle.size).fill(Mark.None),
    mistakes: 0,
  };
  saveNap(save);
  navigate(PLAY_ROUTE);
}

function renderMenu(root: HTMLElement, save: NapSave): void {
  const menu = el('main', { class: 'nap-menu' });
  if (save.current) {
    menu.append(menuCard('Reprendre ma sieste', `Salon n°${save.current.number}`, () => (location.hash = PLAY_ROUTE)));
  }
  const size = NAP_TIERS[save.difficulty].size;
  const best = save.bestStars[save.difficulty];
  menu.append(
    difficultyPicker(save.difficulty, (difficulty) => {
      save.difficulty = difficulty;
      saveNap(save);
      root.replaceChildren();
      renderMenu(root, save);
    }),
    menuCard(`Salon n°${save.roomsDone + 1}`, `${difficultyName(save.difficulty)} · ${size} × ${size} cases, ${size} chats`, () => {
      if (!save.current || confirm('Abandonner la sieste en cours ?')) startRoom(save);
    }),
    el('p', {
      class: 'nap-menu-note',
      text:
        save.roomsDone === 0
          ? 'Un chat par coussin, par ligne et par colonne, et jamais deux chats collés.'
          : `${save.roomsDone} salon${save.roomsDone > 1 ? 's' : ''} endormi${save.roomsDone > 1 ? 's' : ''}` +
            (best > 0 ? ` · meilleur score ici : ${'★'.repeat(best)}${'☆'.repeat(3 - best)}` : ''),
    }),
  );
  root.append(el('div', { class: 'nap-screen' }, topBar('Elomew'), menu));
}

function menuCard(title: string, hint: string, onClick: () => void): HTMLButtonElement {
  const icon = el('span', { class: 'nap-menu-icon', 'aria-hidden': 'true' });
  icon.innerHTML = sleepingCat(0);
  const card = el(
    'button',
    { class: 'menu-card', type: 'button' },
    icon,
    el('span', { class: 'menu-card-text' }, el('strong', { text: title }), el('span', { class: 'menu-card-hint', text: hint })),
  );
  card.addEventListener('click', onClick);
  return card;
}
