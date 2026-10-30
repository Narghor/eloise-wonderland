import type { Help } from '../../help';

export const GLASS_HELP: Help = {
  id: 'stainedGlass',
  title: 'Colorier un vitrail',
  steps: [
    ['Choisis une couleur, puis touche un morceau de verre pour le colorier. Touche-le à nouveau avec la même couleur pour l’effacer.'],
    ['La règle : deux morceaux qui se touchent par un côté n’ont jamais la même couleur. S’ils se ressemblent, ils se mettent à rayer.'],
    ['Le chiffre sur chaque couleur dit combien de morceaux il reste à poser avec elle.'],
    ['Les morceaux avec un rivet noir sont déjà posés pour t’aider : ils ne bougent pas.'],
    ['Astuce : commence par les morceaux entourés de beaucoup de couleurs, il leur reste peu de choix.'],
  ],
};
