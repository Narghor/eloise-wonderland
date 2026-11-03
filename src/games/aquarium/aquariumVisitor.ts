import type { Caught } from '../fishing/fishingSave';
import { FISH } from '../fishing/fishingData';
import { DECORATIONS, SCHOOL_AT, TANKS } from './aquariumData';
import type { AquariumSave } from './aquariumSave';

// -----------------------------------------------
// THE VISITOR OF THE DAY: someone drops by with a wish the tanks can answer
// -----------------------------------------------

export interface Visitor {
  name: string;
  icon: string;
  /** What they ask for, as they say it. */
  wish: string;
  /** Coins left when the wish is met. */
  coins: number;
  isMet(save: AquariumSave): boolean;
}

/** Chance that a happy visitor also leaves a decoration not owned yet. */
export const VISITOR_GIFT_CHANCE = 0.25;

const PEOPLE = [
  { name: 'Mamie Rose', icon: '👵' },
  { name: 'Léo', icon: '👦' },
  { name: 'Madame Lune', icon: '🧙‍♀️' },
  { name: 'Le facteur', icon: '📮' },
  { name: 'La voisine', icon: '👩‍🦰' },
  { name: 'Un petit chat curieux', icon: '🐈' },
];

/** A random number from the day, the same all day long. */
function seeded(day: string): () => number {
  let s = 0;
  for (const c of day) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const fishIn = (save: AquariumSave) => Object.values(save.tanks).flatMap((t) => t.fish);

/** Today's visitor; only wishes the player can already meet with what was caught and owned. */
export function visitorOf(day: string, caught: Record<string, Caught>, save: AquariumSave): Visitor | null {
  const rng = seeded(day);
  const pick = <T,>(list: T[]) => list[Math.floor(rng() * list.length)];
  const person = pick(PEOPLE);
  const species = FISH.filter((f) => caught[f.id]);
  if (species.length === 0) return null;
  const wishes: Omit<Visitor, 'name' | 'icon'>[] = [];

  const star = pick(species);
  wishes.push({ wish: `J’aimerais tant voir ce poisson-là : ${star.name.toLowerCase()} ! Il nage dans tes bacs ?`, coins: 20, isMet: (s) => fishIn(s).includes(star.id) });

  const crowd = Math.min(6, Math.max(3, Math.floor(species.length / 2)));
  if (species.length >= 3) {
    wishes.push({ wish: `Montre-moi un bac bien vivant, avec au moins ${crowd} espèces ensemble.`, coins: 25, isMet: (s) => Object.values(s.tanks).some((t) => t.fish.length >= crowd) });
  }

  const schools = species.filter((f) => (caught[f.id]?.count ?? 0) >= SCHOOL_AT);
  if (schools.length > 0) wishes.push({ wish: 'Un banc de poissons qui nagent ensemble, ça doit être joli…', coins: 25, isMet: (s) => fishIn(s).some((id) => (caught[id]?.count ?? 0) >= SCHOOL_AT) });

  const biggest = species.reduce((a, b) => ((caught[b.id]?.best ?? 0) > (caught[a.id]?.best ?? 0) ? b : a));
  wishes.push({ wish: `On m’a parlé de ton record : ${biggest.name.toLowerCase()}, ${caught[biggest.id].best} cm ! Je peux le voir ?`, coins: 30, isMet: (s) => fishIn(s).includes(biggest.id) });

  const nightOwls = species.filter((f) => f.times?.includes('night'));
  if (nightOwls.length >= 2) {
    wishes.push({ wish: 'J’adore les poissons de la nuit. Il m’en faudrait deux dans le même bac !', coins: 30, isMet: (s) => Object.values(s.tanks).some((t) => t.fish.filter((id) => nightOwls.some((f) => f.id === id)).length >= 2) });
  }

  const opened = TANKS.filter((t) => save.tanks[t.id]);
  wishes.push({ wish: 'Un bac avec un joli décor et au moins trois habitants, s’il te plaît !', coins: 20, isMet: (s) => Object.values(s.tanks).some((t) => t.fish.length >= 3 && t.spots.some(Boolean)) });
  if (opened.length >= 2 && species.length >= 2) {
    wishes.push({ wish: 'Tu as plusieurs aquariums ? J’aimerais en voir deux qui ont des habitants.', coins: 35, isMet: (s) => Object.values(s.tanks).filter((t) => t.fish.length > 0).length >= 2 });
  }

  return { ...person, ...pick(wishes) };
}

/** A decoration for sale the player does not own yet, or null when they have them all. */
export function visitorGift(save: AquariumSave, random = Math.random): string | null {
  const missing = DECORATIONS.filter((d) => d.price > 0 && !save.decorations.includes(d.id));
  return missing.length > 0 ? missing[Math.floor(random() * missing.length)].id : null;
}
