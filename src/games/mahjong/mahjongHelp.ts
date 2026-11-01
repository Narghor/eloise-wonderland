import type { Help } from '../../help';

export const MAHJONG_HELP: Help = {
  id: 'mahjong',
  title: 'Jouer au Mahjong',
  steps: [
    ['Les tuiles sont empilées en couches. Touche deux tuiles identiques et libres pour les retirer. Le but : vider tout le plateau.'],
    ['Une tuile est libre quand rien n’est posé dessus, même à moitié, et que son côté gauche ou son côté droit est dégagé.'],
    ['Les saisons (🌱 ☀️ 🍂 ❄️) vont ensemble entre elles, comme les fleurs (🌷 🌹 🌼 🌸) : deux saisons différentes forment une paire.'],
    ['Chaque motif existe en 4 exemplaires : quand trois sont libres, réfléchis avant de choisir lequel retirer ! Toutes les donnes ont une solution.'],
    ['Plus aucune paire ? Tu peux mélanger (ça coûte une étoile) ou annuler tes derniers coups, gratuitement. Un indice coûte aussi une étoile.'],
    ['La partie est sauvegardée à chaque coup : tu peux la reprendre plus tard. Aux niveaux faciles, les tuiles bloquées sont grisées (réglable dans le menu).'],
  ],
};
