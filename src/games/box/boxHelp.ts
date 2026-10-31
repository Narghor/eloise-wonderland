import type { Help } from '../../help';

export const BOX_HELP: Help = {
  id: 'box',
  title: 'Ranger la boîte à trésors',
  steps: [
    ['Tous les trésors du plateau doivent entrer dans la boîte, sans laisser une seule case vide. Il y a toujours une solution.'],
    ['Fais glisser un trésor du plateau jusque dans la boîte avec ton doigt. Il se cale tout seul sur les cases.'],
    ['Touche un trésor pour le faire tourner. Dans les niveaux difficiles, le bouton « Retourner » le met à l’envers, comme dans un miroir.'],
    ['Touche un trésor déjà rangé pour le remettre sur le plateau, ou fais-le glisser ailleurs.'],
    ['Attention aux trous ! Si tu ranges un trésor en laissant un creux que plus aucun trésor restant ne peut combler, il clignote en rouge et ça compte comme une erreur, même si tu corriges ensuite.'],
    ['Zéro erreur = 3 étoiles, une erreur = 2 étoiles.'],
  ],
};
