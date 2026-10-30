import { el } from '../../dom';
import type { Help } from '../../help';

/** A tiny knot: two strings arrive, the knot shows one colour, the strings leave crossed or not. */
function knotDiagram(arrow: string, shown: 'left' | 'right', crossed: boolean): HTMLElement {
  const left = 'is-pink';
  const right = 'is-blue';
  const knot = shown === 'left' ? left : right;
  return el(
    'span',
    { class: 'bracelet-help-knot' },
    el('span', { class: 'bracelet-help-arrow', text: arrow }),
    el('span', { class: `bracelet-help-dot ${left}` }),
    el('span', { class: `bracelet-help-dot ${right}` }),
    el('span', { class: `bracelet-help-diamond ${knot}` }),
    el('span', { class: `bracelet-help-dot ${crossed ? right : left}` }),
    el('span', { class: `bracelet-help-dot ${crossed ? left : right}` }),
  );
}

export const BRACELET_HELP: Help = {
  id: 'bracelets',
  title: 'Nouer un bracelet',
  steps: [
    ['Tu noues les fils deux par deux, nœud après nœud, ligne après ligne. Le nœud entouré est celui à faire, et les deux fils qui y arrivent sont montrés en haut.'],
    ['Chaque nœud prend la couleur d’un des deux fils. Ton but : refaire le modèle, couleur pour couleur.'],
    ['↘ et ↙ : le nœud prend la couleur du fil de gauche (↘) ou de droite (↙), et les deux fils se croisent.', knotDiagram('↘', 'left', true), knotDiagram('↙', 'right', true)],
    ['↘↙ et ↙↘ : même chose, mais les fils restent à leur place.', knotDiagram('↘↙', 'left', false), knotDiagram('↙↘', 'right', false)],
    ['Croiser ou pas décide quelles couleurs arrivent aux nœuds suivants : regarde la ligne d’après dans le modèle avant de choisir !'],
    ['Un nœud de la mauvaise couleur reste compté comme erreur, même si tu l’annules. Zéro erreur = 3 étoiles.'],
  ],
};
