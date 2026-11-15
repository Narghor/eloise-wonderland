import type { PersonId } from './types';

// -----------------------------------------------
// THE VILLAGE (docs/ferme.md 7.7)
// -----------------------------------------------
// The four of the story tell the quests; everyone may place an order, with a word of their own.

export interface Person {
  id: PersonId;
  name: string;
  role: string;
  /** What they say on an order card, one picked per order. */
  lines: string[];
}

export const PEOPLE: readonly Person[] = [
  { id: 'marthe', name: 'Marthe', role: 'la fermière voisine', lines: ['Pour le marché de samedi !', 'Mes clients en redemandent.', 'Tu me sauves la mise, voisine.'] },
  { id: 'leon', name: 'Léon', role: 'le meunier', lines: ['Le moulin a faim !', 'Pour une fournée spéciale.', 'Rien ne presse, mais ce serait gentil.'] },
  { id: 'rosalie', name: 'Rosalie', role: 'la fleuriste', lines: ['Pour décorer ma vitrine !', 'C’est pour une surprise, chut.', 'J’ai une idée de bouquet…'] },
  { id: 'basile', name: 'Basile', role: 'le charpentier', lines: ['Pour les gars du chantier.', 'Ça donne des forces, ça !', 'Je te revaudrai ça.'] },
  { id: 'jules', name: 'Jules', role: 'le petit voisin', lines: ['Maman m’envoie, c’est pour le goûter !', 'Je peux venir voir les poules après ?', 'J’ai cassé ma tirelire pour ça !'] },
  { id: 'capucine', name: 'Capucine', role: 'l’institutrice', lines: ['Pour la kermesse de l’école.', 'Les enfants vont adorer !', 'Une leçon sur la ferme, en vrai.'] },
  { id: 'gaston', name: 'Gaston', role: 'le facteur', lines: ['Entre deux tournées !', 'Ça creuse, le vélo.', 'J’ai un colis pour toi, à l’occasion.'] },
  { id: 'pivoine', name: 'Mme Pivoine', role: 'la pâtissière du bourg', lines: ['Pour mes gâteaux du dimanche.', 'Que du bon, pour mes clients.', 'Une recette de ma grand-mère.'] },
];

export const PERSON_IDS = PEOPLE.map((p) => p.id);

export function person(id: PersonId): Person {
  return PEOPLE.find((p) => p.id === id)!;
}

/** The order's word, the same each time the card is drawn. */
export function orderLine(id: PersonId, orderId: number): string {
  const lines = person(id).lines;
  return lines[orderId % lines.length];
}
