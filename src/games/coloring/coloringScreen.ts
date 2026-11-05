import './coloring.css';
import { BACK_GARDEN, el, topBar } from '../../dom';
import { findCreature, updateCreature } from '../../creatures/garden';
import { ColoringGame } from './coloringGame';

/** `#/colorier/<id>`: colours a creature of the garden. */
export function renderColoring(root: HTMLElement, params: string[]): () => void {
  const creature = findCreature(params[0] ?? '');
  if (!creature) {
    root.append(
      el(
        'div',
        { class: 'coloring' },
        topBar('Coloriage', undefined, BACK_GARDEN),
        el('p', { class: 'empty-message', text: "Cette petite bête n'est pas dans ton jardin." }),
      ),
    );
    return () => {};
  }
  const game = new ColoringGame(root, creature, {
    back: BACK_GARDEN,
    save: updateCreature,
    doneText: (justNow) => (justNow ? ' a rejoint le jardin !' : ' vit dans ton jardin.'),
    doneLinks: () => [
      el('a', { class: 'button', href: '#/jardin' }, 'Voir le jardin'),
      el('a', { class: 'button button-secondary', href: '#/picross' }, 'Nouvelle grille'),
    ],
  });
  return () => game.dispose();
}
