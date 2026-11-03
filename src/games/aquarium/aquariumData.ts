// -----------------------------------------------
// THE TANKS, THEIR THEMES, THE DECORATIONS
// -----------------------------------------------

export type Ambiance = 'pond' | 'river' | 'night' | 'seasons' | 'wonders';

export interface Tank {
  id: string;
  name: string;
  ambiance: Ambiance;
  /** Species living here at most; a school of three counts as one. */
  places: number;
  /** Coins to open it; 0 for the first one. */
  price: number;
  /** The theme: these species together in this tank make it shine. */
  theme: { name: string; fish: string[]; reward: string };
}

export const TANKS: Tank[] = [
  { id: 'pond', name: 'L’étang', ambiance: 'pond', places: 6, price: 0, theme: { name: 'Les habitants de l’étang', fish: ['gardon', 'ablette', 'perche', 'goujon', 'rotengle', 'breme'], reward: 'lily' } },
  { id: 'river', name: 'La rivière', ambiance: 'river', places: 6, price: 150, theme: { name: 'La rivière vive', fish: ['vairon', 'chevesne', 'truite', 'ombre', 'saumon', 'arcenciel'], reward: 'mill' } },
  { id: 'night', name: 'La nuit', ambiance: 'night', places: 7, price: 300, theme: { name: 'Les poissons de la nuit', fish: ['tanche', 'sandre', 'ecrevisse', 'poissonchat', 'anguille', 'luciole', 'lune'], reward: 'moon' } },
  { id: 'seasons', name: 'Les saisons', ambiance: 'seasons', places: 7, price: 500, theme: { name: 'Les quatre saisons', fish: ['fleur', 'blackbass', 'bulle', 'brochet', 'gremille', 'neige'], reward: 'lantern' } },
  { id: 'wonders', name: 'Le bassin des merveilles', ambiance: 'wonders', places: 8, price: 800, theme: { name: 'Les merveilles', fish: ['carpe', 'koi', 'doree', 'koiarc', 'esturgeon', 'geant', 'dragon', 'ancetre'], reward: 'pagoda' } },
];

/** Catching this many of a species lets it come as a little school of three. */
export const SCHOOL_AT = 5;

/** Spots on the tank floor where a decoration can stand, in tank units. */
export const SPOTS = [
  { x: 52, y: 262 },
  { x: 140, y: 270 },
  { x: 230, y: 266 },
  { x: 312, y: 260 },
];

export interface Decoration {
  id: string;
  name: string;
  /** 0 for a theme reward, which cannot be bought. */
  price: number;
}

export const DECORATIONS: Decoration[] = [
  { id: 'weeds', name: 'Herbes d’eau', price: 15 },
  { id: 'pebbles', name: 'Galets', price: 15 },
  { id: 'rock', name: 'Rocher creux', price: 30 },
  { id: 'shell', name: 'Coquillage', price: 30 },
  { id: 'amphora', name: 'Amphore', price: 50 },
  { id: 'chest', name: 'Coffre au trésor', price: 80 },
  { id: 'bubbler', name: 'Bulleur', price: 60 },
  { id: 'castle', name: 'Petit château', price: 120 },
  { id: 'lily', name: 'Nénuphar en fleur', price: 0 },
  { id: 'mill', name: 'Moulin à eau', price: 0 },
  { id: 'moon', name: 'Lune de verre', price: 0 },
  { id: 'lantern', name: 'Lanterne des saisons', price: 0 },
  { id: 'pagoda', name: 'Pagode', price: 0 },
];

/** Feeding once a day: this many coins per fish living in the tanks, at most FEED_MAX. */
export const FEED_COINS_PER_FISH = 1;
export const FEED_MAX = 15;

// -----------------------------------------------
// DAILY CARE: the food, the algae, the little finds
// -----------------------------------------------

export interface Food {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const FOODS: Food[] = [
  { id: 'flakes', name: 'Paillettes', icon: '🟠', color: '#e8903a' },
  { id: 'worms', name: 'Vers de vase', icon: '🪱', color: '#c0504a' },
  { id: 'pellets', name: 'Granulés', icon: '🟤', color: '#8a5a34' },
  { id: 'peas', name: 'Petits pois', icon: '🟢', color: '#6ab84a' },
];

/** Pinches of food a day; feeding ends when they are used. */
export const PINCHES_PER_DAY = 12;
/** A fish given its favourite food dances and shows a heart. */
export const FAVORITE_COINS = 2;
/** Little finds a happy tank leaves on the sand each day, and what one is worth. */
export const FINDS_PER_DAY = 3;
export const FIND_COINS: [number, number] = [3, 8];

/** Longest pet name. */
export const NAME_MAX = 16;
/** Fry: a school fed its favourite food in a clean tank may lay eggs, at most once a day. */
export const BREED_CHANCE = 0.35;
export const BABIES_PER_TANK = 4;
/** Days for a fry to reach its full size. */
export const GROW_DAYS = 3;

/** Each species' favourite food, the same every day so it can be learnt. */
export function favoriteFood(fishId: string): string {
  let hash = 0;
  for (const c of fishId) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return FOODS[hash % FOODS.length].id;
}
