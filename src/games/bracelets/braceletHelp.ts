import { el } from '../../dom';
import type { Help } from '../../help';
import { showsLeft, swaps, type Knot } from './braceletLogic';

/** Words under each knot button: which string gives its colour, and where the strings go. */
export const KNOT_WORDS: Record<Knot, string> = {
  FF: 'Gauche · croisés',
  BB: 'Droite · croisés',
  FB: 'Gauche · restent',
  BF: 'Droite · restent',
};

/** A tiny knot: the two strings arriving on top, the knot's colour, the two strings leaving below. */
export function knotDiagram(knot: Knot, left: string, right: string): HTMLElement {
  const dot = (color: string) => {
    const span = el('span', { class: 'bracelet-help-dot' });
    span.style.background = color;
    return span;
  };
  const diamond = el('span', { class: 'bracelet-help-diamond' });
  diamond.style.background = showsLeft(knot) ? left : right;
  const crossed = swaps(knot);
  return el(
    'span',
    { class: 'bracelet-help-knot' },
    dot(left),
    dot(right),
    diamond,
    dot(crossed ? right : left),
    dot(crossed ? left : right),
  );
}

const PINK = '#e8547a';
const BLUE = '#3fa7c9';

function example(knot: Knot): HTMLElement {
  return el('span', { class: 'bracelet-help-example' }, knotDiagram(knot, PINK, BLUE), el('small', { text: KNOT_WORDS[knot] }));
}

export const BRACELET_HELP: Help = {
  // A new id so the rewritten help opens again once for those who saw the first one.
  id: 'bracelets-v2',
  title: 'Nouer un bracelet',
  steps: [
    ['Le bracelet se noue de haut en bas. À chaque nœud, deux fils se rencontrent : celui de gauche et celui de droite. Le nœud à faire est entouré.'],
    ['Le nœud prend la couleur d’UN des deux fils, c’est toi qui choisis lequel. Il doit avoir la même couleur que le losange au même endroit sur le modèle.'],
    ['Ensuite les deux fils repartent vers le bas : soit ils se croisent (chacun passe de l’autre côté), soit ils restent chacun de leur côté.'],
    ['Chaque bouton te montre tout : en haut les deux fils qui arrivent, au milieu la couleur du nœud, en bas où les fils repartent.', example('FF'), example('BB'), example('FB'), example('BF')],
    ['Astuce : la couleur, tu la lis sur le modèle. Croiser ou pas, ça se décide en regardant le nœud juste en dessous : il faut que le fil dont il aura besoin arrive de son côté.'],
    ['Un nœud de la mauvaise couleur reste compté comme erreur, même si tu l’annules. Zéro erreur = 3 étoiles.'],
  ],
};
