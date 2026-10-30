import type { Help } from '../../help';

export const POTION_HELP: Help = {
  id: 'potions',
  title: 'Trier les fioles',
  steps: [
    ['Le but : que chaque fiole ne contienne plus qu’une seule couleur (ou soit vide).'],
    ['Touche une fiole pour la soulever, puis touche celle où verser.'],
    ['On ne verse que sur la même couleur, ou dans une fiole vide, et seulement s’il reste de la place. Tout le liquide de la même couleur coule d’un coup.'],
    ['Chaque niveau a un objectif de coups : c’est le minimum possible. L’atteindre donne 3 étoiles.'],
    ['« Annuler » revient en arrière mais ne rend pas le coup : réfléchis avant de verser !'],
  ],
};
