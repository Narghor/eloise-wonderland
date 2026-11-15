import type { PersonId } from './types';

// -----------------------------------------------
// THE VILLAGE (docs/ferme.md 7.7)
// -----------------------------------------------
// The four of the story tell the quests; everyone may place an order.

export interface Person {
  id: PersonId;
  name: string;
  role: string;
}

export const PEOPLE: readonly Person[] = [
  { id: 'marthe', name: 'Marthe', role: 'la fermière voisine' },
  { id: 'leon', name: 'Léon', role: 'le meunier' },
  { id: 'rosalie', name: 'Rosalie', role: 'la fleuriste' },
  { id: 'basile', name: 'Basile', role: 'le charpentier' },
  { id: 'jules', name: 'Jules', role: 'le petit voisin' },
  { id: 'capucine', name: 'Capucine', role: 'l’institutrice' },
  { id: 'gaston', name: 'Gaston', role: 'le facteur' },
  { id: 'pivoine', name: 'Mme Pivoine', role: 'la pâtissière du bourg' },
];

export const PERSON_IDS = PEOPLE.map((p) => p.id);

export function person(id: PersonId): Person {
  return PEOPLE.find((p) => p.id === id)!;
}
