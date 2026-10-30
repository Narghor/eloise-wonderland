import { el } from './dom';

// -----------------------------------------------
// DIFFICULTY CHOSEN BY THE PLAYER
// -----------------------------------------------
// Every game keeps its own generator "level"; a difficulty picks one of five levels from a
// per-game table. The table's last entry is where the generator stops getting harder.

export type Difficulty = 0 | 1 | 2 | 3 | 4;

export const DIFFICULTY_NAMES = ['Découverte', 'Facile', 'Moyen', 'Difficile', 'Expert'] as const;

/** Generator level for each difficulty, easiest first. */
export type LevelTable = readonly [number, number, number, number, number];

export function isDifficulty(value: unknown): value is Difficulty {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 4;
}

/** For saves made before difficulties existed: the hardest one the old level had reached. */
export function difficultyFromLevel(table: LevelTable, level: number): Difficulty {
  let difficulty: Difficulty = 0;
  table.forEach((tableLevel, index) => {
    if (level >= tableLevel) difficulty = index as Difficulty;
  });
  return difficulty;
}

/** Reads a saved difficulty, or derives it from the old progression level. */
export function loadDifficulty(value: unknown, table: LevelTable, oldLevel: unknown): Difficulty {
  if (isDifficulty(value)) return value;
  return Number.isInteger(oldLevel) ? difficultyFromLevel(table, oldLevel as number) : 0;
}

export function difficultyName(difficulty: Difficulty): string {
  return DIFFICULTY_NAMES[difficulty];
}

/** Five buttons in a row; `onChange` returns false to refuse the change (e.g. a game in progress kept). */
export function difficultyPicker(selected: Difficulty, onChange: (difficulty: Difficulty) => boolean | void): HTMLElement {
  const picker = el('div', { class: 'difficulty-picker', role: 'group', 'aria-label': 'Difficulté' });
  const buttons = DIFFICULTY_NAMES.map((name, index) => {
    const button = el('button', { class: 'difficulty-button', type: 'button' }, name);
    button.addEventListener('click', () => {
      if (index === selected || onChange(index as Difficulty) === false) return;
      selected = index as Difficulty;
      refresh();
    });
    return button;
  });
  const refresh = () =>
    buttons.forEach((button, index) => {
      button.classList.toggle('is-active', index === selected);
      button.setAttribute('aria-pressed', String(index === selected));
    });
  refresh();
  picker.append(...buttons);
  return el(
    'section',
    { class: 'difficulty' },
    el('h2', { text: 'Difficulté' }),
    picker,
  );
}

/** For games without a menu: a button that opens the picker in a dialog. */
export function difficultyButton(selected: Difficulty, onChange: (difficulty: Difficulty) => boolean | void): HTMLElement {
  const close = el('button', { class: 'button', type: 'button' }, 'Fermer');
  const dialog = el(
    'dialog',
    { class: 'detail-dialog difficulty-dialog' },
    difficultyPicker(selected, (difficulty) => {
      const accepted = onChange(difficulty);
      if (accepted !== false) dialog.close();
      return accepted;
    }),
    el('p', { text: 'Plus c’est difficile, plus tu gagnes de pièces.' }),
    close,
  );
  close.addEventListener('click', () => dialog.close());
  const open = el('button', { class: 'button button-secondary', type: 'button' }, `Difficulté : ${difficultyName(selected)}`);
  open.addEventListener('click', () => dialog.showModal());
  return el('span', {}, open, dialog);
}
