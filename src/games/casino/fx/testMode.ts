// -----------------------------------------------
// TEMPORARY TEST BUTTONS - force the next spin's outcome
// -----------------------------------------------
// To remove: set CASINO_TEST_BUTTONS to false, or delete this file and every
// line marked `// TEST-BUTTONS`. Forced outcomes never touch the normal odds.
import { el } from '../../../dom';

export const CASINO_TEST_BUTTONS = false;

let forced: string | null = null;

/** Reads and clears the outcome armed for the next spin. */
export function takeForced<T extends string>(): T | null {
  const value = forced as T | null;
  forced = null;
  if (stateView) stateView.textContent = 'rien d’armé';
  return value;
}

let stateView: HTMLElement | null = null;

/** A clearly marked bar; each button arms one outcome for the next spin. */
export function testBar(buttons: { label: string; outcome: string }[]): HTMLElement {
  const state = el('span', { class: 'casino-test-state', text: 'rien d’armé' });
  forced = null;
  stateView = state;
  const bar = el('div', { class: 'casino-test-bar' }, el('b', { text: 'TEST' }), state);
  for (const { label, outcome } of buttons) {
    const button = el('button', { class: 'casino-test-button', type: 'button', text: label });
    button.addEventListener('click', () => {
      forced = outcome;
      state.textContent = `armé : ${label} (lance !)`;
    });
    bar.append(button);
  }
  return bar;
}
