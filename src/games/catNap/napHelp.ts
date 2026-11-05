import type { Help } from '../../help';

export const NAP_HELP: Help = {
  id: 'cat-nap',
  title: 'Elomew, la sieste des chats',
  steps: [
    ['Le salon est découpé en coussins de couleur. Il faut coucher un chat sur chaque coussin.'],
    ['Un seul chat par ligne et un seul par colonne.'],
    ['Les chats veulent dormir tranquilles : deux chats ne se touchent jamais, même en diagonale.'],
    ['Avec l’outil « Croix », pose une empreinte de patte sur les cases où aucun chat ne peut dormir (glisse le doigt pour en poser plusieurs). Clic droit sur PC.'],
    ['Avec l’outil « Chat », couche un chat. S’il n’a rien à faire là, il repart, la case reçoit une croix et ça compte une erreur.'],
    ['Pas besoin de deviner : chaque salon se résout par la logique. Zéro erreur = 3 étoiles, puis une étoile de moins par erreur.'],
  ],
};
