// -----------------------------------------------
// "CONSEILS DE PRO": BASIC STRATEGY CHARTS
// -----------------------------------------------
// Basic strategy for this table: 6 decks, dealer stands on 17, double after split.

import { el } from '../../../dom';

type Move = 'R' | 'T' | 'D' | 'Ds' | 'S';

const DEALER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];
const MOVE_NAMES: Record<Move, string> = {
  R: 'Rester',
  T: 'Tirer',
  D: 'Doubler (sinon tirer)',
  Ds: 'Doubler (sinon rester)',
  S: 'Splitter',
};

const HARD: [string, string][] = [
  ['17+', 'R R R R R R R R R R'],
  ['16', 'R R R R R T T T T T'],
  ['15', 'R R R R R T T T T T'],
  ['14', 'R R R R R T T T T T'],
  ['13', 'R R R R R T T T T T'],
  ['12', 'T T R R R T T T T T'],
  ['11', 'D D D D D D D D D T'],
  ['10', 'D D D D D D D D T T'],
  ['9', 'T D D D D T T T T T'],
  ['5–8', 'T T T T T T T T T T'],
];
const SOFT: [string, string][] = [
  ['A+9', 'R R R R R R R R R R'],
  ['A+8', 'R R R R R R R R R R'],
  ['A+7', 'R Ds Ds Ds Ds R R T T T'],
  ['A+6', 'T D D D D T T T T T'],
  ['A+5', 'T T D D D T T T T T'],
  ['A+4', 'T T D D D T T T T T'],
  ['A+3', 'T T T D D T T T T T'],
  ['A+2', 'T T T D D T T T T T'],
];
const PAIRS: [string, string][] = [
  ['A-A', 'S S S S S S S S S S'],
  ['10-10', 'R R R R R R R R R R'],
  ['9-9', 'S S S S S R S S R R'],
  ['8-8', 'S S S S S S S S S S'],
  ['7-7', 'S S S S S S T T T T'],
  ['6-6', 'S S S S S T T T T T'],
  ['5-5', 'D D D D D D D D T T'],
  ['4-4', 'T T T S S T T T T T'],
  ['3-3', 'S S S S S S T T T T'],
  ['2-2', 'S S S S S S T T T T'],
];
const GOLDEN_RULES = [
  'Ne jamais rester sur 12 à 16 contre un 7 ou plus.',
  'Rester sur 13 à 16 contre 2 à 6 (12 : seulement contre 4, 5, 6).',
  'Doubler 11 (sauf contre un As), et 10 contre 9 ou moins.',
  'Toujours splitter les As et les 8, jamais les 10.',
  'Toujours rester sur 17 dur et plus.',
];

function chip(move: Move): HTMLElement {
  return el('span', { class: `bjt-cell bjt-${move}`, text: move });
}

function chart(rows: [string, string][]): HTMLElement {
  const head = el('tr', {}, el('th', { class: 'bjt-corner', text: 'toi \\ lui' }), ...DEALER.map((d) => el('th', { text: d })));
  const body = rows.map(([hand, moves]) =>
    el(
      'tr',
      {},
      el('th', { scope: 'row', text: hand }),
      ...moves.split(' ').map((m) => el('td', {}, chip(m as Move))),
    ),
  );
  return el('div', { class: 'bjt-chart' }, el('table', {}, el('thead', {}, head), el('tbody', {}, ...body)));
}

function part(title: string, note: string, rows: [string, string][]): HTMLElement[] {
  return [el('h3', { text: title }), el('p', { class: 'bjt-note', text: note }), chart(rows)];
}

export function openTips(): void {
  const close = el('button', { class: 'button', type: 'button' }, 'Compris !');
  const dialog = el(
    'dialog',
    { class: 'detail-dialog bjt' },
    el('h2', { text: 'Conseils de pro' }),
    el(
      'p',
      { class: 'bjt-note' },
      'Regarde la carte visible du croupier. ',
      el('strong', { text: 'De 2 à 6' }),
      ' il est faible : ne prends pas de risque, laisse-le sauter. ',
      el('strong', { text: 'De 7 à As' }),
      ' il est fort : améliore ta main.',
    ),
    el(
      'div',
      { class: 'bjt-legend' },
      ...(Object.keys(MOVE_NAMES) as Move[]).map((m) => el('span', {}, chip(m), MOVE_NAMES[m])),
    ),
    ...part('Mains dures', 'Sans As, ou avec un As qui ne peut compter que 1.', HARD),
    ...part('Mains souples', "Un As qui compte 11 : tirer ne peut pas te faire sauter.", SOFT),
    ...part('Les paires', 'Un seul split par manche.', PAIRS),
    el('h3', { text: "Les 5 règles d'or" }),
    el('ol', { class: 'bjt-rules' }, ...GOLDEN_RULES.map((r) => el('li', { text: r }))),
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
  dialog.scrollTop = 0;
}
