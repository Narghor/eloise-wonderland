import type { Help } from '../../help';

export const BEAD_HELP: Help = {
  id: 'beads',
  title: 'Perles à repasser',
  steps: [
    ['Recopie le modèle sur ta plaque : chaque rond du modèle est une perle à poser sur le picot au même endroit.'],
    ['Choisis une couleur en bas, puis touche un picot pour y poser une perle. Tu peux aussi glisser le doigt pour en poser plusieurs d’un coup.'],
    ['Touche une perle déjà posée pour la retirer : elle retourne dans la boîte. Glisser en partant d’une perle en retire plusieurs.'],
    ['Attention : la boîte contient EXACTEMENT les perles du modèle. Le chiffre sur chaque couleur dit combien il en reste. Une perle mal placée te manquera ailleurs !'],
    ['Une perle posée au mauvais endroit compte comme une erreur, même si tu la retires ensuite. Zéro erreur = 3 étoiles.'],
  ],
};
