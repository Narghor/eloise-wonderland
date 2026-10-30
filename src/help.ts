// -----------------------------------------------
// "HOW TO PLAY" FOR EACH GAME
// -----------------------------------------------
// A "?" button in the top bar, and the same help opened by itself the first time a game is played.

import { el } from './dom';
import { readGame, writeGame } from './save';

const SEEN_ID = 'helpSeen';

export interface Help {
  /** Remembers that this help was already shown once. */
  id: string;
  title: string;
  steps: (string | Node)[][];
}

/** The top bar's right slot: the "?" button, then whatever the screen already shows there. */
export function helpSlot(help: Help, right?: HTMLElement): HTMLElement {
  const button = el('button', { class: 'help-button', type: 'button', 'aria-label': 'Comment jouer ?' }, '?');
  button.addEventListener('click', () => openHelp(help));
  return el('span', { class: 'top-bar-right' }, button, ...(right ? [right] : []));
}

export function openHelpOnFirstVisit(help: Help): void {
  const seen = readSeen();
  if (seen.includes(help.id)) return;
  writeGame(SEEN_ID, [...seen, help.id]);
  openHelp(help);
}

function openHelp(help: Help): void {
  const close = el('button', { class: 'button', type: 'button' }, "C'est parti !");
  const dialog = el(
    'dialog',
    { class: 'detail-dialog help-dialog' },
    el('h2', { text: help.title }),
    el('ol', { class: 'help-steps' }, ...help.steps.map((parts) => el('li', {}, ...parts))),
    close,
  );
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  // The dialog lives outside the screen's root: it must leave with the screen (Android back button).
  const closeOnLeave = () => dialog.close();
  window.addEventListener('hashchange', closeOnLeave);
  dialog.addEventListener('close', () => {
    window.removeEventListener('hashchange', closeOnLeave);
    dialog.remove();
  });
  document.body.append(dialog);
  dialog.showModal();
  // showModal focuses the button at the bottom and scrolls to it: start reading from the top.
  dialog.scrollTop = 0;
}

function readSeen(): string[] {
  const raw = readGame(SEEN_ID);
  return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : [];
}

// -----------------------------------------------
// SMALL PICROSS DIAGRAMS
// -----------------------------------------------

/** One line of a Picross: its clue, then its cells ('#' filled, 'x' cross, '.' empty, '?' unknown). */
export function lineDiagram(clue: string, cells: string): HTMLElement {
  const line = el('span', { class: 'help-line' }, el('span', { class: 'help-line-clue', text: clue }));
  for (const cell of cells) {
    const kind = cell === '#' ? 'is-filled' : cell === 'x' ? 'is-crossed' : cell === '?' ? 'is-unknown' : '';
    line.append(el('span', { class: `help-cell ${kind}` }));
  }
  return line;
}
