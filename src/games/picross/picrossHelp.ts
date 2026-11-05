import { lineDiagram, type Help } from '../../help';

export const PICROSS_HELP: Help = {
  id: 'picross',
  title: 'Comment jouer au Picross',
  steps: [
    ['Le but : noircir les bonnes cases pour faire apparaître le dessin caché dans la grille : une petite bête pour ton jardin, ou un modèle pour ton carnet de Pixel art.'],
    [
      'Les chiffres devant une ligne (et au-dessus d’une colonne) donnent la longueur des blocs de cases noires, dans l’ordre. « 3 1 » veut dire : un bloc de 3, au moins une case vide, puis un bloc de 1.',
      lineDiagram('3 1', '###.#.'),
    ],
    [
      'Commence par les lignes faciles : un chiffre égal à la largeur remplit tout, un « 0 » veut dire que tout est vide.',
      lineDiagram('5', '#####'),
    ],
    [
      'L’astuce qui débloque tout : un « 4 » dans une ligne de 5 noircit forcément les 3 cases du milieu, qu’il commence tout à gauche ou une case plus loin.',
      lineDiagram('4', '?###?'),
    ],
    [
      'Quand tu es sûre qu’une case est vide, pose une croix (bouton « Croix », ou clic droit sur PC). Les croix aident à déduire la suite.',
      lineDiagram('2', 'xx##x'),
    ],
    ['Glisse le doigt pour remplir plusieurs cases d’un coup. Les chiffres d’une ligne terminée pâlissent.'],
    ['Pas besoin de deviner : chaque grille se résout par la logique, en passant des lignes aux colonnes et inversement.'],
  ],
};
