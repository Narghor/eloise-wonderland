import { el } from '../../dom';
import type { Help } from '../../help';
import { KINDS, type KindId } from './pastryLogic';

/** A small square of an ingredient's colour, for buttons and the help. */
export function swatch(kind: KindId): HTMLElement {
  const span = el('span', { class: `pastry-swatch is-${KINDS[kind].family}` });
  span.style.backgroundColor =KINDS[kind].color;
  return span;
}

export const PASTRY_HELP: Help = {
  id: 'pastry',
  title: 'Monter un gâteau',
  steps: [
    ['Le modèle montre une part du gâteau, vue de côté. Refais le même gâteau en empilant les couches, de bas en haut : touche un ingrédient pour le poser.'],
    ['Un gâteau suit toujours les mêmes règles : une génoise tout en bas, un glaçage tout en haut (et nulle part ailleurs), et jamais deux couches pareilles collées.', el('br'), swatch('spongeVanilla'), ' génoise ', swatch('creamStrawberry'), ' crème ', swatch('jam'), ' confiture ', swatch('glazePink'), ' glaçage'],
    ['À partir de Moyen, certaines couches du modèle sont cachées par un « ? ». Les indices sous le modèle te permettent de les retrouver. En Expert, tout est caché : il n’y a que les indices.'],
    ['Les indices suffisent toujours, et il n’y a qu’un seul gâteau possible. « Juste sous » veut dire collé en dessous. « Une génoise » ou « une crème » parle de n’importe quel parfum. « Parmi les ? » ne compte que les couches cachées.'],
    ['Une couche fausse est barrée : retire-la avec « Annuler ». Elle reste comptée comme erreur. Zéro erreur = 3 étoiles. Astuce : réfléchis avant de poser !'],
    ['Une fois fini, le gâteau est coupé et rejoint ta vitrine.'],
  ],
};
