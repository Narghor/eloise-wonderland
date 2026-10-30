import type { Help } from '../../help';

export const EMBROIDERY_HELP: Help = {
  id: 'embroidery',
  title: 'Broder au point de croix',
  steps: [
    ['Choisis un fil, puis touche ou glisse sur les cases de la toile : chaque case reçoit une petite croix.'],
    ['Le chiffre d’une case dit quel fil y va. Le nombre sur chaque fil dit combien de croix il te reste à faire.'],
    ['Une croix de la mauvaise couleur reste (avec un point rouge) et compte une erreur, tout comme piquer hors du motif. Repasse dessus avec le bon fil pour la corriger.'],
    ['Attention à l’envers ! Si ta croix ne touche pas la précédente du même fil, même par un coin, le fil fait un long saut derrière la toile.'],
    ['Brode en rangées bien suivies : peu d’erreurs et peu de sauts, c’est trois étoiles.'],
  ],
};
