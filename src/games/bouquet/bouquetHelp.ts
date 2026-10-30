import type { Help } from '../../help';

export const BOUQUET_HELP: Help = {
  id: 'bouquet',
  title: 'Composer un bouquet',
  steps: [
    ['Lis la commande : chaque ligne est un souhait du client.'],
    ['Touche un emplacement du vase, puis une fleur de l’étal pour l’y mettre. Touche une fleur déjà posée pour la remplacer ou la retirer.'],
    ['Les grandes fleurs se dressent plus haut que les petites. Le centre est l’emplacement du milieu.'],
    ['Quand tous les emplacements sont pleins, « Livrer le bouquet ». Attention : une seule livraison par commande !'],
    ['Chaque souhait raté coûte une étoile. Ton bouquet rejoint ensuite ta galerie.'],
  ],
};
