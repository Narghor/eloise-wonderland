import type { Help } from '../../help';

export const NAP_HELP: Help = {
  // A new id when the rules change: the help opens once more.
  id: 'cat-nap-v3',
  title: 'Elomew, la sieste des chats',
  steps: [
    ['Le salon est découpé en coussins de couleur. Il faut coucher un chat sur chaque coussin.'],
    ['Un seul chat par ligne et un seul par colonne.'],
    ['Les chats veulent dormir tranquilles : deux chats ne se touchent jamais, même en diagonale.'],
    ['Marque d’une empreinte de patte les cases où aucun chat ne peut dormir : glisse le doigt sur la grille pour en poser plusieurs d’un coup (avec n’importe quel outil), ou touche une case avec l’outil « Croix ». Repasse sur des empreintes en partant d’une empreinte pour les effacer. Clic droit sur PC.'],
    ['Avec l’outil « Chat », couche un chat. S’il n’a rien à faire là, il repart, la case reçoit une empreinte et tu perds une vie ♥.'],
    ['Tu as 3 vies. À la 3e erreur, les chats se réveillent : le salon recommence à zéro.'],
    ['Pas besoin de deviner : chaque salon se résout par la logique. Zéro erreur = 3 étoiles, une erreur = 2 étoiles, deux erreurs = 1 étoile.'],
  ],
};
