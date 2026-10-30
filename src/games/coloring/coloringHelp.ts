import type { Help } from '../../help';

export const COLORING_HELP: Help = {
  // A new id when the rules change: the help opens once more for someone who saw the old one.
  id: 'coloring-v2',
  title: 'Colorier ta petite bête',
  steps: [
    ['Choisis un numéro dans la palette en bas : les cases qui portent ce numéro s’assombrissent un peu.'],
    ['Touche ces cases, ou glisse le doigt dessus, pour les colorier.'],
    ['Attention à ne pas dépasser ! Une case de la mauvaise couleur, ou toucher en dehors de la bête, compte une erreur. Une case ratée garde son numéro : repasse dessus avec la bonne couleur pour la corriger.'],
    ['La bête rejoint le jardin quand toutes les cases sont justes, avec des étoiles selon tes erreurs.'],
  ],
};
