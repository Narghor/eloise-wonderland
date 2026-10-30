import { el } from '../../dom';
import type { Help } from '../../help';
import { BUBBLE_HEX, Color, type BubbleColor } from './bubbleBoard';

function dot(color: BubbleColor): HTMLElement {
  const bubble = el('span', { class: 'help-bubble' });
  bubble.style.background = BUBBLE_HEX[color];
  return bubble;
}

function mixLine(a: BubbleColor, b: BubbleColor, result: BubbleColor, name: string): HTMLElement {
  return el('span', { class: 'help-mix' }, dot(a), ' + ', dot(b), ' = ', dot(result), ` ${name}`);
}

export const BUBBLES_HELP: Help = {
  id: 'bubbles',
  title: 'Jouer aux bulles',
  steps: [
    ['Vise avec le doigt (la ligne de points montre le trajet, rebonds compris) et relâche pour tirer.'],
    ['Trois bulles de la même couleur qui se touchent éclatent. Celles qui ne tiennent plus au plafond tombent avec.'],
    [
      'Tu ne tires que du rouge, du jaune et du bleu. Une bulle qui touche une autre de ces trois couleurs se mélange avec elle :',
      mixLine(Color.Red, Color.Yellow, Color.Orange, 'orange'),
      mixLine(Color.Yellow, Color.Blue, Color.Green, 'vert'),
      mixLine(Color.Red, Color.Blue, Color.Purple, 'violet'),
    ],
    ['Les bulles mélangées portent un petit anneau blanc. Pour les faire éclater, fabrique leur couleur juste à côté d’elles !'],
    ['Touche la petite bulle en bas à gauche pour échanger ta bulle avec la suivante.'],
    ['Le plafond descend après quelques tirs (les points en bas). Si une bulle passe la ligne pointillée, c’est perdu.'],
  ],
};
