// -----------------------------------------------
// THE FISH OF THE POND
// -----------------------------------------------

export type Rarity = 1 | 2 | 3 | 4 | 5;
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Pattern = 'plain' | 'stripes' | 'spots' | 'scales' | 'glow';

export interface Fish {
  id: string;
  name: string;
  rarity: Rarity;
  /** Size range in centimetres. */
  size: [number, number];
  /** Only bites at these times; any time when absent. */
  times?: TimeOfDay[];
  /** Only bites in this season; all year when absent. */
  season?: Season;
  /** Minimum cast distance, 0 (at the pier) to 1 (as far as possible). */
  far?: number;
  /** Drawing: body, belly, fins, pattern colour. */
  colors: [string, string, string, string];
  pattern: Pattern;
  /** Body proportions: 'long', 'round' or 'flat'. */
  shape: 'long' | 'round' | 'flat';
  /** One line for the notebook. */
  note: string;
  /** How a big fish fights on the line; a plain chase when absent. */
  fight?: FightStyle;
}

/** 'jump': leaps to the other side of the bar; 'vanish': hides for a moment; 'tug': yanks the line, costing progress. */
export type FightStyle = 'jump' | 'vanish' | 'tug';

export const FIGHT_HINTS: Record<FightStyle, string> = {
  jump: 'Il bondit d’un coup à l’autre bout !',
  vanish: 'Il disparaît sous l’eau… devine où il est !',
  tug: 'Il tire sur la ligne par à-coups !',
};

// -----------------------------------------------
// BAITS
// -----------------------------------------------

export type BaitId = 'worm' | 'bread' | 'fly' | 'firefly';

export interface Bait {
  id: BaitId;
  name: string;
  icon: string;
  /** Pack of 5; 0 for the worm, which never runs out. */
  price: number;
  effect: string;
}

export const BAIT_PACK = 5;

export const BAITS: Bait[] = [
  { id: 'worm', name: 'Ver', icon: '🪱', price: 0, effect: 'Gratuit, à volonté.' },
  { id: 'bread', name: 'Mie de pain', icon: '🍞', price: 6, effect: 'Attire les gros poissons.' },
  { id: 'fly', name: 'Mouche dorée', icon: '✨', price: 15, effect: 'Les poissons rares mordent bien plus.' },
  { id: 'firefly', name: 'Luciole', icon: '🌟', price: 10, effect: 'Attire les poissons du soir et de la nuit.' },
];

// -----------------------------------------------
// ODD FINDS (instead of a fish, now and then)
// -----------------------------------------------

export type FindId = 'boot' | 'bottle' | 'chest';

export interface Find {
  id: FindId;
  name: string;
  icon: string;
  note: string;
}

export const FINDS: Find[] = [
  { id: 'boot', name: 'Vieille botte', icon: '🥾', note: 'Elle sent l’étang. Personne n’en veut, même pas le Vieux Gardon.' },
  { id: 'bottle', name: 'Bouteille à la mer', icon: '🍾', note: 'Il y a un message dedans !' },
  { id: 'chest', name: 'Petit coffre', icon: '🧰', note: 'Lourd, rouillé… et plein de pièces !' },
];
/** Chance that a successful reel brings up a find instead of the fish. */
export const FIND_CHANCE = 0.07;

export const RARITY_NAMES: Record<Rarity, string> = { 1: 'Commun', 2: 'Peu commun', 3: 'Rare', 4: 'Très rare', 5: 'Légendaire' };
/** Chance weight of each rarity, before the fish's own conditions. */
export const RARITY_WEIGHTS: Record<Rarity, number> = { 1: 60, 2: 26, 3: 10, 4: 3.5, 5: 0.8 };
/** Coins for a fish of average size. */
export const RARITY_PRICES: Record<Rarity, number> = { 1: 1, 2: 1, 3: 3, 4: 6, 5: 15 };

export const TIME_NAMES: Record<TimeOfDay, string> = { dawn: 'à l’aube', day: 'en journée', dusk: 'au coucher du soleil', night: 'la nuit' };
export const SEASON_NAMES: Record<Season, string> = { spring: 'au printemps', summer: 'en été', autumn: 'en automne', winter: 'en hiver' };

export const FISH: Fish[] = [
  // Common
  { id: 'gardon', name: 'Gardon', rarity: 1, size: [10, 25], colors: ['#9fb3c2', '#e8eef2', '#d9534f', '#7d93a3'], pattern: 'scales', shape: 'flat', note: 'Le poisson le plus courant de l’étang. Toujours de bonne humeur.' },
  { id: 'ablette', name: 'Ablette', rarity: 1, size: [8, 18], colors: ['#c7d3dc', '#f5f8fa', '#b8c6d1', '#a9b9c6'], pattern: 'plain', shape: 'long', note: 'Petite et brillante, elle file en bancs.' },
  { id: 'perche', name: 'Perche', rarity: 1, size: [12, 35], colors: ['#8fa64a', '#eadf9a', '#e0663a', '#3f5223'], pattern: 'stripes', shape: 'round', note: 'Reconnaissable à ses rayures vertes.' },
  { id: 'goujon', name: 'Goujon', rarity: 1, size: [8, 15], colors: ['#a89574', '#e6dcc6', '#9c8762', '#5e4e33'], pattern: 'spots', shape: 'long', note: 'Il fouille le fond à la recherche de miettes.' },
  { id: 'rotengle', name: 'Rotengle', rarity: 1, size: [12, 30], colors: ['#b9a556', '#f0e6b0', '#e2493c', '#8f7f3c'], pattern: 'scales', shape: 'flat', note: 'Des nageoires rouges comme des petits drapeaux.' },
  { id: 'breme', name: 'Brème', rarity: 1, size: [25, 50], colors: ['#8a8c70', '#d9d6bd', '#6e705a', '#6b6d55'], pattern: 'scales', shape: 'flat', note: 'Plate comme une assiette, et presque aussi calme.' },
  { id: 'carassin', name: 'Carassin', rarity: 1, size: [10, 25], colors: ['#c4993f', '#f1dca0', '#a77c2a', '#9b7426'], pattern: 'scales', shape: 'round', note: 'Le cousin sauvage du poisson rouge.' },
  { id: 'vairon', name: 'Vairon', rarity: 1, size: [5, 10], times: ['dawn', 'day'], colors: ['#7d9b6a', '#e9d4b2', '#c4573a', '#3e5134'], pattern: 'spots', shape: 'long', note: 'Minuscule, il ne sort qu’à la lumière.' },
  { id: 'chevesne', name: 'Chevesne', rarity: 1, size: [20, 45], colors: ['#6f8597', '#e3e9ee', '#9c6a52', '#4c5f6e'], pattern: 'scales', shape: 'long', note: 'Gourmand, il mord à presque tout.' },

  // Uncommon
  { id: 'truite', name: 'Truite', rarity: 2, size: [20, 45], times: ['dawn', 'day'], colors: ['#7a8b5a', '#f1e6c8', '#8a9a68', '#c0392b'], pattern: 'spots', shape: 'long', note: 'Elle aime l’eau fraîche du matin.' },
  { id: 'tanche', name: 'Tanche', rarity: 2, size: [20, 45], times: ['dusk', 'night'], colors: ['#4f6b2e', '#b9c27a', '#3c5222', '#3a5020'], pattern: 'plain', shape: 'round', note: 'Une peau toute douce et des yeux rouges.' },
  { id: 'blackbass', name: 'Black-bass', rarity: 2, size: [25, 50], season: 'summer', colors: ['#5c7a3a', '#e3e2b0', '#4a6430', '#2f4220'], pattern: 'stripes', shape: 'round', note: 'Il saute hors de l’eau quand il fait chaud.' },
  { id: 'sandre', name: 'Sandre', rarity: 2, size: [35, 70], times: ['dusk', 'night'], colors: ['#8d9a8a', '#e7ebe4', '#76826f', '#4f5a4b'], pattern: 'stripes', shape: 'long', note: 'Ses grands yeux voient dans le noir.' },
  { id: 'carpe', name: 'Carpe', rarity: 2, size: [35, 80], colors: ['#a07a3e', '#ead7a8', '#8a6630', '#7a5a28'], pattern: 'scales', shape: 'round', note: 'Rusée et patiente. Elle teste l’appât avant de mordre.' },
  { id: 'ecrevisse', name: 'Écrevisse', rarity: 2, size: [8, 15], times: ['night'], colors: ['#a2472f', '#d98a6a', '#7e3220', '#5e2416'], pattern: 'stripes', shape: 'flat', note: 'Ce n’est pas un poisson, mais elle mord quand même !' },
  { id: 'poissonchat', name: 'Poisson-chat', rarity: 2, size: [20, 40], times: ['night'], colors: ['#4d4a45', '#b9b2a6', '#3b3834', '#2a2825'], pattern: 'plain', shape: 'long', note: 'Il a des moustaches. Évidemment.' },
  { id: 'brochet', name: 'Brochet', rarity: 2, size: [50, 100], season: 'autumn', far: 0.4, colors: ['#5f7a3d', '#e6e6b8', '#6f8a4a', '#c9d48a'], pattern: 'spots', shape: 'long', note: 'Le roi de l’étang en automne. Attention aux dents.', fight: 'tug' },
  { id: 'gremille', name: 'Grémille', rarity: 2, size: [10, 20], season: 'winter', colors: ['#8a8150', '#e6dfb4', '#6d653d', '#3e3a22'], pattern: 'spots', shape: 'round', note: 'Une petite perche qui ne craint pas le froid.' },

  // Rare
  { id: 'saumon', name: 'Saumon', rarity: 3, size: [50, 90], season: 'autumn', far: 0.3, colors: ['#8a97a6', '#f2c4b0', '#6f7c8b', '#3d4651'], pattern: 'spots', shape: 'long', note: 'Il remonte l’étang en automne pour rentrer chez lui.', fight: 'jump' },
  { id: 'anguille', name: 'Anguille', rarity: 3, size: [40, 100], times: ['night'], colors: ['#4b5a2e', '#c2bf86', '#3a4622', '#2c341a'], pattern: 'plain', shape: 'long', note: 'Elle glisse comme du savon.' },
  { id: 'arcenciel', name: 'Truite arc-en-ciel', rarity: 3, size: [25, 60], season: 'spring', colors: ['#7e9a8a', '#f4e4d4', '#d97a8a', '#e05a7a'], pattern: 'stripes', shape: 'long', note: 'Une bande rose sur le flanc, comme un arc-en-ciel.' },
  { id: 'koi', name: 'Carpe koï', rarity: 3, size: [30, 70], times: ['day'], colors: ['#f6f1ea', '#ffffff', '#e8562e', '#e8562e'], pattern: 'spots', shape: 'round', note: 'Quelqu’un a dû la relâcher ici il y a longtemps.' },
  { id: 'bulle', name: 'Poisson-bulle', rarity: 3, size: [10, 20], season: 'summer', colors: ['#7fc4e8', '#e6f6ff', '#5aa6d0', '#ffffff'], pattern: 'spots', shape: 'round', note: 'Il gonfle comme un ballon quand on le surprend.' },
  { id: 'esturgeon', name: 'Esturgeon', rarity: 3, size: [80, 150], far: 0.6, colors: ['#6b7280', '#c9ccd2', '#565c67', '#e2e4e8'], pattern: 'spots', shape: 'long', note: 'Un poisson très ancien, plus vieux que les dinosaures.', fight: 'tug' },
  { id: 'ombre', name: 'Ombre commun', rarity: 3, size: [25, 50], times: ['dawn'], colors: ['#7f8aa0', '#e2e2ea', '#9a6aa8', '#5a4a6a'], pattern: 'scales', shape: 'long', note: 'Sa grande nageoire violette brille au lever du jour.' },

  // Very rare
  { id: 'doree', name: 'Carpe dorée', rarity: 4, size: [40, 80], times: ['dusk'], colors: ['#f2c230', '#fff0a8', '#e09b10', '#fff7d0'], pattern: 'glow', shape: 'round', note: 'Elle n’apparaît qu’au coucher du soleil, quand l’eau devient dorée.', fight: 'vanish' },
  { id: 'neige', name: 'Truite des neiges', rarity: 4, size: [30, 60], season: 'winter', colors: ['#e8f2fa', '#ffffff', '#a8c8e0', '#9cc0dc'], pattern: 'spots', shape: 'long', note: 'Presque transparente. Elle nage sous la glace.', fight: 'vanish' },
  { id: 'fleur', name: 'Poisson-fleur', rarity: 4, size: [15, 30], season: 'spring', colors: ['#f6a8c8', '#fff0f6', '#e872a8', '#ffd84a'], pattern: 'spots', shape: 'round', note: 'Ses nageoires ressemblent à des pétales.' },
  { id: 'luciole', name: 'Poisson-luciole', rarity: 4, size: [8, 15], season: 'summer', times: ['night'], colors: ['#3a4a2a', '#f8f4a0', '#c8e860', '#f8ff70'], pattern: 'glow', shape: 'long', note: 'Les nuits d’été, son ventre s’allume.' },
  { id: 'geant', name: 'Brochet géant', rarity: 4, size: [100, 160], times: ['night'], far: 0.7, colors: ['#3f5a2a', '#d0d6a0', '#4f6a32', '#a8b86a'], pattern: 'spots', shape: 'long', note: 'Les anciens disent qu’il a avalé une botte.', fight: 'tug' },

  // Legendary
  { id: 'lune', name: 'Poisson-lune', rarity: 5, size: [50, 90], times: ['night'], far: 0.75, colors: ['#c8d0f0', '#f4f6ff', '#8e9ae0', '#ffffff'], pattern: 'glow', shape: 'round', note: 'Il reflète la lune. Certains disent qu’il EST la lune.', fight: 'vanish' },
  { id: 'dragon', name: 'Dragon d’eau', rarity: 5, size: [120, 200], far: 0.85, colors: ['#2fa07a', '#bff0d8', '#e8c040', '#1e6a50'], pattern: 'scales', shape: 'long', note: 'Personne n’y croyait. Et pourtant.', fight: 'jump' },
  { id: 'koiarc', name: 'Koï arc-en-ciel', rarity: 5, size: [50, 90], times: ['dawn'], far: 0.6, colors: ['#f6a8d0', '#ffffff', '#7fd0f0', '#ffe066'], pattern: 'glow', shape: 'round', note: 'Ses écailles changent de couleur à chaque lever de soleil.', fight: 'jump' },
  { id: 'ancetre', name: 'Le Vieux Gardon', rarity: 5, size: [60, 80], far: 0.5, colors: ['#8f9aa3', '#d6dbe0', '#b0b8bf', '#5d666e'], pattern: 'scales', shape: 'flat', note: 'Le plus vieux poisson de l’étang. Il a l’air de connaître tout le monde.', fight: 'tug' },
];

export function fishById(id: string): Fish | undefined {
  return FISH.find((f) => f.id === id);
}
