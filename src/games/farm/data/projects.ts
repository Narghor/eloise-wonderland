import { atLevel, type ItemId, type PersonId, type ProjectId, type Unlock } from './types';

// -----------------------------------------------
// GREAT PROJECTS (docs/ferme.md 7.9)
// -----------------------------------------------
// Several deliveries to restore a place of the village; each one opens a zone. Items are given a few at a time,
// the Eloisettes when the stage is complete.

export interface ProjectStage {
  text: string;
  items: Partial<Record<ItemId, number>>;
  nuts: number;
  xp: number;
}

export interface Project {
  id: ProjectId;
  who: PersonId;
  name: string;
  intro: string;
  done: string;
  unlock: Unlock;
  stages: ProjectStage[];
}

export const PROJECTS: readonly Project[] = [
  {
    id: 'bridge', who: 'basile', name: 'Le vieux pont',
    intro: 'Réparer le vieux pont ouvre la rive, à l’est de la ferme.',
    done: 'Le pont est réparé : la rive est ouverte !',
    unlock: atLevel(10),
    stages: [
      { text: 'Nourrir les ouvriers', items: { bread: 15 }, nuts: 0, xp: 150 },
      { text: 'Graisser les vieilles poulies', items: { butter: 10 }, nuts: 500, xp: 200 },
      { text: 'La fête de mi-chantier', items: { strawberry: 20, cheese: 5 }, nuts: 0, xp: 250 },
      { text: 'Les fanions du pont', items: { fabric: 5 }, nuts: 1000, xp: 400 },
    ],
  },
];

export function project(id: ProjectId): Project {
  return PROJECTS.find((p) => p.id === id)!;
}
