import type { Look } from '../companion/companionSave';

// -----------------------------------------------
// ROOMS
// -----------------------------------------------
// The house is a doll's house seen from the front: two floors, the garden beside them.

export type RoomId = 'living' | 'kitchen' | 'cafe' | 'garden' | 'bedroom' | 'library' | 'greenhouse';

export interface Room {
  id: RoomId;
  name: string;
  /** 0 for the ground floor. */
  floor: number;
  /** Coins to open it; 0 for the rooms given at the start. */
  price: number;
  wall: string;
  ground: string;
}

export const ROOMS: Room[] = [
  { id: 'living', name: 'Salon', floor: 0, price: 0, wall: 'repeating-linear-gradient(90deg, #fde8ef 0 22px, #fbdde8 22px 44px)', ground: '#e9c9a3' },
  { id: 'kitchen', name: 'Cuisine', floor: 0, price: 0, wall: 'repeating-linear-gradient(0deg, #fff6e0 0 18px, #f6ead0 18px 20px)', ground: '#d9b48a' },
  { id: 'cafe', name: 'Café', floor: 0, price: 0, wall: 'repeating-linear-gradient(90deg, #fbe3d0 0 26px, #f6d6bf 26px 28px)', ground: '#9a6a48' },
  { id: 'garden', name: 'Jardin', floor: 0, price: 0, wall: 'linear-gradient(#cdefff, #e8f8ff)', ground: '#9ed98a' },
  { id: 'bedroom', name: 'Chambre', floor: 1, price: 250, wall: 'repeating-linear-gradient(90deg, #e6e0ff 0 30px, #ddd5fb 30px 32px)', ground: '#c9a68a' },
  { id: 'library', name: 'Bibliothèque', floor: 1, price: 500, wall: 'linear-gradient(#e7f3e4, #d6ead1)', ground: '#b88f6e' },
  { id: 'greenhouse', name: 'Serre', floor: 1, price: 350, wall: 'repeating-linear-gradient(90deg, #e9fbf0 0 26px, #cdeedd 26px 28px)', ground: '#a7cf8f' },
];

/** Furniture spots per room: each holds one piece. */
export const SPOTS_PER_ROOM = 2;

/** Where each spot stands across the room, 0 to 1. */
export const SPOT_X = [0.27, 0.73];

// -----------------------------------------------
// POSES
// -----------------------------------------------

/** How a pose moves the body; the icon floats above it. */
export type PoseMotion = 'hop' | 'squash' | 'lean' | 'wiggle' | 'sway';

export type PoseId = 'nap' | 'read' | 'dance' | 'music' | 'eat' | 'taste' | 'sniff' | 'swing' | 'splash' | 'sleep' | 'mirror' | 'study' | 'stars' | 'tend' | 'sunbathe' | 'sip' | 'treat';

export interface Pose {
  name: string;
  motion: PoseMotion;
  icon: string;
}

export const POSES: Record<PoseId, Pose> = {
  nap: { name: 'Petite sieste', motion: 'squash', icon: 'z' },
  read: { name: 'Plongé dans un livre', motion: 'lean', icon: '¶' },
  dance: { name: 'Pas de danse', motion: 'wiggle', icon: '♫' },
  music: { name: 'Au piano', motion: 'wiggle', icon: '♪' },
  eat: { name: 'Bon appétit', motion: 'hop', icon: '♥' },
  taste: { name: 'Une petite cuillère', motion: 'lean', icon: '♥' },
  sniff: { name: 'Le parfum des fleurs', motion: 'lean', icon: '✿' },
  swing: { name: 'Balançoire', motion: 'sway', icon: '★' },
  splash: { name: 'Plouf !', motion: 'hop', icon: '○' },
  sleep: { name: 'Gros dodo', motion: 'squash', icon: 'z' },
  mirror: { name: 'Devant le miroir', motion: 'wiggle', icon: '✦' },
  study: { name: 'Studieux', motion: 'lean', icon: '✎' },
  stars: { name: 'Tête dans les étoiles', motion: 'hop', icon: '★' },
  tend: { name: 'Main verte', motion: 'lean', icon: '✿' },
  sunbathe: { name: 'Bain de soleil', motion: 'sway', icon: '☀' },
  sip: { name: 'Une tasse de thé', motion: 'lean', icon: '♨' },
  treat: { name: 'Petite douceur', motion: 'hop', icon: '♥' },
};

// -----------------------------------------------
// FURNITURE
// -----------------------------------------------

export type FurnitureId =
  | 'cushion'
  | 'armchair'
  | 'rug'
  | 'piano'
  | 'table'
  | 'pot'
  | 'flowerbed'
  | 'swing'
  | 'pond'
  | 'bed'
  | 'mirror'
  | 'desk'
  | 'telescope'
  | 'wateringCan'
  | 'hammock'
  | 'teaTable'
  | 'cakeStand';

export interface Furniture {
  id: FurnitureId;
  name: string;
  room: RoomId;
  price: number;
  pose: PoseId;
}

export const FURNITURE: Furniture[] = [
  { id: 'cushion', name: 'Coussin', room: 'living', price: 0, pose: 'nap' },
  { id: 'armchair', name: 'Fauteuil', room: 'living', price: 60, pose: 'read' },
  { id: 'rug', name: 'Tapis de danse', room: 'living', price: 90, pose: 'dance' },
  { id: 'piano', name: 'Piano', room: 'living', price: 200, pose: 'music' },
  { id: 'table', name: 'Table', room: 'kitchen', price: 0, pose: 'eat' },
  { id: 'pot', name: 'Marmite', room: 'kitchen', price: 80, pose: 'taste' },
  { id: 'flowerbed', name: 'Parterre de fleurs', room: 'garden', price: 0, pose: 'sniff' },
  { id: 'swing', name: 'Balançoire', room: 'garden', price: 120, pose: 'swing' },
  { id: 'pond', name: 'Petit bassin', room: 'garden', price: 150, pose: 'splash' },
  { id: 'bed', name: 'Lit douillet', room: 'bedroom', price: 0, pose: 'sleep' },
  { id: 'mirror', name: 'Miroir', room: 'bedroom', price: 100, pose: 'mirror' },
  { id: 'desk', name: 'Bureau', room: 'library', price: 0, pose: 'study' },
  { id: 'telescope', name: 'Télescope', room: 'library', price: 250, pose: 'stars' },
  { id: 'wateringCan', name: 'Arrosoir', room: 'greenhouse', price: 0, pose: 'tend' },
  { id: 'hammock', name: 'Hamac', room: 'greenhouse', price: 180, pose: 'sunbathe' },
  { id: 'teaTable', name: 'Table à thé', room: 'cafe', price: 0, pose: 'sip' },
  { id: 'cakeStand', name: 'Présentoir à gâteaux', room: 'cafe', price: 140, pose: 'treat' },
];

export function furniture(id: FurnitureId): Furniture {
  return FURNITURE.find((item) => item.id === id)!;
}

/** The free piece a room comes with, already placed on its first spot. */
export function starterFurniture(room: RoomId): FurnitureId | null {
  return FURNITURE.find((item) => item.room === room && item.price === 0)?.id ?? null;
}

// -----------------------------------------------
// GARDEN
// -----------------------------------------------

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const SEASON_NAMES: Record<Season, string> = { spring: 'Printemps', summer: 'Été', autumn: 'Automne', winter: 'Hiver' };

/** "au printemps", "en hiver"... */
export const IN_SEASON: Record<Season, string> = { spring: 'au printemps', summer: 'en été', autumn: 'en automne', winter: 'en hiver' };

/** The real season, northern hemisphere. */
export function currentSeason(date = new Date()): Season {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

export type PlantId =
  | 'carrot'
  | 'wheat'
  | 'mint'
  | 'basil'
  | 'thyme'
  | 'tomato'
  | 'strawberry'
  | 'blackberry'
  | 'lemon'
  | 'pumpkin'
  | 'mandarin'
  | 'moonflower'
  | 'goldenApple';

export interface Plant {
  id: PlantId;
  name: string;
  /** Seed price in coins. */
  price: number;
  growMinutes: number;
  harvest: number;
  color: string;
  /** Seasons it grows in outdoors; absent means all year. The greenhouse ignores seasons. */
  seasons?: Season[];
  /** Only grows from a seed a visitor left: never sold. */
  rare?: boolean;
}

export const PLANTS: Plant[] = [
  { id: 'carrot', name: 'Carotte', price: 2, growMinutes: 5, harvest: 3, color: '#f08a4b' },
  { id: 'wheat', name: 'Blé', price: 2, growMinutes: 10, harvest: 4, color: '#e8c56a' },
  { id: 'mint', name: 'Menthe', price: 3, growMinutes: 8, harvest: 3, color: '#5fc58f' },
  { id: 'basil', name: 'Basilic', price: 3, growMinutes: 12, harvest: 3, color: '#3fa34d' },
  { id: 'thyme', name: 'Thym', price: 3, growMinutes: 15, harvest: 3, color: '#8fae6b' },
  { id: 'tomato', name: 'Tomate', price: 4, growMinutes: 20, harvest: 3, color: '#e0475b', seasons: ['spring', 'summer'] },
  { id: 'strawberry', name: 'Fraise', price: 5, growMinutes: 30, harvest: 3, color: '#ff5d8f', seasons: ['spring', 'summer'] },
  { id: 'blackberry', name: 'Mûre', price: 5, growMinutes: 45, harvest: 3, color: '#5b3a78', seasons: ['summer', 'autumn'] },
  { id: 'lemon', name: 'Citron', price: 6, growMinutes: 60, harvest: 2, color: '#ffd23f', seasons: ['winter', 'spring'] },
  { id: 'pumpkin', name: 'Citrouille', price: 8, growMinutes: 120, harvest: 2, color: '#f6923a', seasons: ['autumn', 'winter'] },
  { id: 'mandarin', name: 'Mandarine', price: 6, growMinutes: 60, harvest: 3, color: '#ff9f2e', seasons: ['winter'] },
  { id: 'moonflower', name: 'Fleur de lune', price: 0, growMinutes: 90, harvest: 2, color: '#c9c3ff', rare: true },
  { id: 'goldenApple', name: 'Pomme dorée', price: 0, growMinutes: 90, harvest: 2, color: '#f2c94c', rare: true },
];

export function plant(id: PlantId): Plant {
  return PLANTS.find((item) => item.id === id)!;
}

export const STARTING_PLOTS = 3;
export const MAX_PLOTS = 6;
/** Price of the 4th, 5th and 6th plots. */
export const PLOT_PRICES = [60, 120, 200];

/** Watering takes this share off the time left, once per sowing. */
export const WATERING_SHARE = 0.5;

// -----------------------------------------------
// GROCERY AND RARE INGREDIENTS
// -----------------------------------------------
// The garden grows the fresh food; the grocery sells the rest; rare ones only come as visitors' gifts.

export type StapleId = 'sugar' | 'eggs' | 'milk' | 'butter' | 'pasta' | 'rice' | 'cheese' | 'chocolate' | 'vanilla' | 'spice';

export interface Staple {
  id: StapleId;
  name: string;
  /** Coins for a pack of STAPLE_PACK. */
  price: number;
  /** Kitchen level index that opens this shelf. */
  level: number;
  color: string;
}

export const STAPLE_PACK = 3;

export const STAPLES: Staple[] = [
  { id: 'sugar', name: 'Sucre', price: 3, level: 0, color: '#f4eee6' },
  { id: 'eggs', name: 'Œufs', price: 3, level: 0, color: '#f6dfae' },
  { id: 'milk', name: 'Lait', price: 3, level: 0, color: '#eaf2f8' },
  { id: 'butter', name: 'Beurre', price: 5, level: 0, color: '#f7e27a' },
  { id: 'pasta', name: 'Pâtes', price: 5, level: 0, color: '#eccb7c' },
  { id: 'rice', name: 'Riz', price: 5, level: 0, color: '#f2efe4' },
  { id: 'cheese', name: 'Fromage', price: 8, level: 1, color: '#f5c542' },
  { id: 'chocolate', name: 'Chocolat', price: 8, level: 1, color: '#6b3e26' },
  { id: 'vanilla', name: 'Vanille', price: 12, level: 2, color: '#e9d8a6' },
  { id: 'spice', name: 'Épices', price: 12, level: 2, color: '#c8642d' },
];

export type RareId = 'honey' | 'mushroom' | 'hazelnut' | 'frostflower';

export const RARES: { id: RareId; name: string; color: string }[] = [
  { id: 'honey', name: 'Miel', color: '#f2a516' },
  { id: 'mushroom', name: 'Champignon des bois', color: '#a1774f' },
  { id: 'hazelnut', name: 'Noisettes', color: '#9c6b3c' },
  { id: 'frostflower', name: 'Fleur de givre', color: '#a8dcf0' },
];

/** Chance that a departing visitor leaves a rare seed instead of coins. */
export const RARE_SEED_CHANCE = 0.12;

/** A rare gift is that many pieces, and replaces the coins of a departing visitor this often. */
export const RARE_GIFT_AMOUNT = 2;
export const RARE_GIFT_CHANCE = 0.35;

export type IngredientId = PlantId | StapleId | RareId;
export type IngredientKind = 'garden' | 'grocery' | 'rare';

export interface Ingredient {
  id: IngredientId;
  name: string;
  color: string;
  kind: IngredientKind;
}

export const INGREDIENTS: Ingredient[] = [
  ...PLANTS.map((p) => ({ id: p.id, name: p.name, color: p.color, kind: p.rare ? ('rare' as const) : ('garden' as const) })),
  ...STAPLES.map((s) => ({ id: s.id, name: s.name, color: s.color, kind: 'grocery' as const })),
  ...RARES.map((r) => ({ id: r.id, name: r.name, color: r.color, kind: 'rare' as const })),
];

export function ingredient(id: IngredientId): Ingredient {
  return INGREDIENTS.find((item) => item.id === id)!;
}

// -----------------------------------------------
// KITCHEN
// -----------------------------------------------

export type DishId =
  | 'carrotSoup'
  | 'carrotSalad'
  | 'mintLemonade'
  | 'pumpkinSoup'
  | 'gazpacho'
  | 'jam'
  | 'bread'
  | 'strawberryTart'
  | 'blackberryTart'
  | 'lemonTart'
  | 'pumpkinCake'
  | 'pizza'
  | 'strawberryCake'
  | 'gardenFeast'
  | 'fruitCharlotte'
  | 'basilPasta'
  | 'herbOmelette'
  | 'ricePudding'
  | 'sugaredStrawberries'
  | 'crepes'
  | 'pumpkinGratin'
  | 'margherita'
  | 'brioche'
  | 'cookies'
  | 'lasagna'
  | 'thymeRisotto'
  | 'honeyTart'
  | 'mushroomRisotto'
  | 'hazelnutSpread'
  | 'cremeBrulee'
  | 'spicedCarrotCake'
  | 'frostSorbet'
  | 'mandarinChocolate'
  | 'moonInfusion'
  | 'goldenTurnover';

export interface Dish {
  id: DishId;
  name: string;
  /** The same ingredient may appear twice. */
  ingredients: IngredientId[];
  /** Kitchen level needed: 1 the pan, 2 the oven, 3 the big stove. */
  level: number;
  cookMinutes: number;
  color: string;
}

export const DISHES: Dish[] = [
  { id: 'carrotSoup', name: 'Soupe de carottes', ingredients: ['carrot', 'carrot'], level: 1, cookMinutes: 2, color: '#f6a35a' },
  { id: 'carrotSalad', name: 'Salade de carottes', ingredients: ['carrot', 'mint'], level: 1, cookMinutes: 2, color: '#f08a4b' },
  { id: 'mintLemonade', name: 'Limonade à la menthe', ingredients: ['lemon', 'mint'], level: 1, cookMinutes: 2, color: '#d8f0a8' },
  { id: 'pumpkinSoup', name: 'Soupe à la citrouille', ingredients: ['carrot', 'pumpkin'], level: 1, cookMinutes: 3, color: '#f6923a' },
  { id: 'gazpacho', name: 'Gaspacho', ingredients: ['mint', 'tomato'], level: 1, cookMinutes: 2, color: '#e0475b' },
  { id: 'jam', name: 'Confiture de mûres', ingredients: ['blackberry', 'blackberry'], level: 1, cookMinutes: 3, color: '#5b3a78' },
  { id: 'bread', name: 'Pain doré', ingredients: ['wheat', 'wheat'], level: 2, cookMinutes: 8, color: '#d9a066' },
  { id: 'strawberryTart', name: 'Tarte aux fraises', ingredients: ['strawberry', 'wheat'], level: 2, cookMinutes: 10, color: '#ff5d8f' },
  { id: 'blackberryTart', name: 'Tarte aux mûres', ingredients: ['blackberry', 'wheat'], level: 2, cookMinutes: 10, color: '#7a4f9e' },
  { id: 'lemonTart', name: 'Tarte au citron', ingredients: ['lemon', 'wheat'], level: 2, cookMinutes: 10, color: '#ffe36e' },
  { id: 'pumpkinCake', name: 'Gâteau à la citrouille', ingredients: ['pumpkin', 'wheat'], level: 2, cookMinutes: 12, color: '#e8873a' },
  { id: 'pizza', name: 'Pizza du jardin', ingredients: ['tomato', 'wheat'], level: 2, cookMinutes: 10, color: '#e0605e' },
  { id: 'strawberryCake', name: 'Fraisier', ingredients: ['strawberry', 'strawberry', 'wheat'], level: 3, cookMinutes: 25, color: '#ff9ec7' },
  { id: 'gardenFeast', name: 'Festin du potager', ingredients: ['carrot', 'pumpkin', 'tomato'], level: 3, cookMinutes: 25, color: '#9ed98a' },
  { id: 'fruitCharlotte', name: 'Charlotte aux fruits', ingredients: ['blackberry', 'lemon', 'strawberry'], level: 3, cookMinutes: 30, color: '#c3a6f0' },
  { id: 'basilPasta', name: 'Pâtes au basilic', ingredients: ['pasta', 'basil'], level: 1, cookMinutes: 3, color: '#9bc46a' },
  { id: 'herbOmelette', name: 'Omelette aux herbes', ingredients: ['eggs', 'thyme'], level: 1, cookMinutes: 3, color: '#f2d36b' },
  { id: 'ricePudding', name: 'Riz au lait', ingredients: ['rice', 'milk'], level: 1, cookMinutes: 4, color: '#f6efdc' },
  { id: 'sugaredStrawberries', name: 'Fraises au sucre', ingredients: ['strawberry', 'sugar'], level: 1, cookMinutes: 2, color: '#ff7aa2' },
  { id: 'crepes', name: 'Crêpes aux fraises', ingredients: ['eggs', 'milk', 'strawberry'], level: 2, cookMinutes: 10, color: '#f3c27a' },
  { id: 'pumpkinGratin', name: 'Gratin de citrouille', ingredients: ['pumpkin', 'cheese', 'milk'], level: 2, cookMinutes: 14, color: '#f0a14a' },
  { id: 'margherita', name: 'Pizza margherita', ingredients: ['tomato', 'wheat', 'cheese'], level: 2, cookMinutes: 12, color: '#ef6b57' },
  { id: 'brioche', name: 'Brioche dorée', ingredients: ['wheat', 'butter', 'eggs'], level: 2, cookMinutes: 12, color: '#e3a857' },
  { id: 'cookies', name: 'Cookies au chocolat', ingredients: ['wheat', 'chocolate', 'butter'], level: 2, cookMinutes: 10, color: '#8a5a3b' },
  { id: 'lasagna', name: 'Lasagnes', ingredients: ['pasta', 'tomato', 'cheese'], level: 2, cookMinutes: 15, color: '#d9583f' },
  { id: 'thymeRisotto', name: 'Risotto au thym', ingredients: ['rice', 'thyme', 'cheese'], level: 2, cookMinutes: 14, color: '#e6d9a6' },
  { id: 'honeyTart', name: 'Tarte au miel', ingredients: ['honey', 'wheat', 'butter'], level: 2, cookMinutes: 14, color: '#f2a516' },
  { id: 'mushroomRisotto', name: 'Risotto aux champignons', ingredients: ['rice', 'mushroom', 'cheese'], level: 2, cookMinutes: 16, color: '#b08a62' },
  { id: 'hazelnutSpread', name: 'Pâte à tartiner maison', ingredients: ['hazelnut', 'chocolate', 'sugar'], level: 2, cookMinutes: 12, color: '#7a4a2a' },
  { id: 'cremeBrulee', name: 'Crème brûlée', ingredients: ['eggs', 'milk', 'vanilla', 'sugar'], level: 3, cookMinutes: 30, color: '#e9c46a' },
  { id: 'spicedCarrotCake', name: 'Gâteau aux carottes épicé', ingredients: ['carrot', 'wheat', 'spice', 'sugar'], level: 3, cookMinutes: 30, color: '#d9853b' },
  { id: 'frostSorbet', name: 'Sorbet de givre', ingredients: ['frostflower', 'lemon', 'sugar'], level: 3, cookMinutes: 25, color: '#bfe8f7' },
  { id: 'mandarinChocolate', name: 'Chocolat chaud à la mandarine', ingredients: ['mandarin', 'chocolate', 'milk'], level: 2, cookMinutes: 8, color: '#8a4b2a' },
  { id: 'moonInfusion', name: 'Infusion de fleur de lune', ingredients: ['moonflower', 'mint'], level: 1, cookMinutes: 4, color: '#c9c3ff' },
  { id: 'goldenTurnover', name: 'Chausson aux pommes dorées', ingredients: ['goldenApple', 'wheat', 'butter'], level: 2, cookMinutes: 14, color: '#f2c94c' },
];

export function dish(id: DishId): Dish {
  return DISHES.find((item) => item.id === id)!;
}

export interface KitchenLevel {
  name: string;
  /** Dishes cooking at the same time. */
  burners: number;
  /** Ingredients per recipe at most. */
  ingredients: number;
  /** Coins to reach this level; 0 for the first. */
  price: number;
}

export const KITCHEN_LEVELS: KitchenLevel[] = [
  { name: 'Petite casserole', burners: 1, ingredients: 2, price: 0 },
  { name: 'Four', burners: 2, ingredients: 3, price: 150 },
  { name: 'Grand fourneau', burners: 3, ingredients: 4, price: 400 },
];

/** Plates the kitchen table holds. */
export const TABLE_PLATES = 2;

// -----------------------------------------------
// CHARACTERS
// -----------------------------------------------

/** Total friendship stars that open chapters 1, 2 and 3; the last one also gives the gift. */
export const CHAPTER_STARS = [8, 24, 50];

/** Friendship stars for eating a dish, and for eating one's favourite. */
export const MEAL_STARS = 2;
export const FAVOURITE_STARS = 5;

/** Chance that a visit brings an order, and the friendship added when it is served. */
export const ORDER_CHANCE = 0.6;
export const ORDER_STARS = 3;

/** Share of café customers who are house characters, and the friendship one served gives. */
export const CAFE_GUEST_SHARE = 0.4;
export const CAFE_STARS = 1;

/** Reputation levels of the café, one per tea service difficulty. */
export const CAFE_LEVELS = 5;

export interface Character {
  id: string;
  name: string;
  look: Look;
  /** One line, shown in the album. */
  tagline: string;
  poses: PoseId[];
  favourite: DishId;
  /** Milliseconds for the ring to close: the shorter, the harder the 3-star photo. */
  rhythm: number;
  /** Rooms that must be open before this character can visit. */
  needs: RoomId[];
  /** Catalog item given at the last chapter. */
  gift: string;
  /** Rare ingredient this character sometimes leaves instead of coins. */
  rare?: RareId;
  /** Only visits during this real season. */
  season?: Season;
  chapters: [string[], string[], string[]];
}

const look = (species: string, worn: Partial<Look> = {}): Look => ({
  species,
  color: null,
  hat: null,
  glasses: null,
  neck: null,
  background: null,
  ...worn,
});

export const CHARACTERS: Character[] = [
  {
    id: 'noisette',
    name: 'Noisette',
    look: look('fox', { neck: 'neck-scarf' }),
    tagline: 'Une voyageuse qui ne reste jamais longtemps',
    poses: ['sniff', 'swing', 'stars', 'read', 'sunbathe'],
    favourite: 'pumpkinSoup',
    rhythm: 700,
    needs: [],
    gift: 'coat-autumn',
    rare: 'hazelnut',
    chapters: [
      [
        'Oh ! Bonjour… Je ne fais que passer, promis.',
        'Je voyage depuis longtemps. Dans mon sac, j’ai une carte postale de chaque endroit où j’ai dormi.',
        'Ici, les fleurs sentent comme chez ma grand-mère. Ça m’a donné envie de rester un peu.',
      ],
      [
        'Tu sais pourquoi je ne reste jamais nulle part ?',
        'Quand j’étais petite, on déménageait tout le temps. Je n’avais jamais le temps de me faire des amis.',
        'Alors j’ai décidé que partir, ce serait MON choix. C’est plus facile comme ça.',
        '… Enfin, je crois.',
      ],
      [
        'J’ai réfléchi, cette nuit, en regardant les étoiles depuis ton jardin.',
        'Je crois que j’avais peur de m’attacher. Mais ici, je reviens toujours.',
        'Tiens. C’est la couleur des forêts en octobre, ma saison préférée. Je veux que tu l’aies.',
        'Ce n’est pas un adieu, hein. C’est un « à demain ».',
      ],
    ],
  },
  {
    id: 'biscotte',
    name: 'Biscotte',
    look: look('bear', { hat: 'hat-chef' }),
    tagline: 'Un pâtissier qui a perdu sa boutique',
    poses: ['nap', 'eat', 'taste', 'treat'],
    favourite: 'blackberryTart',
    rhythm: 1000,
    needs: [],
    gift: 'hat-star-chef',
    chapters: [
      [
        'Mmmh… ça sent le gâteau ici, non ? Non ? Ah. Tant pis.',
        'Je suis pâtissier. Enfin, je l’étais, avant que ma boutique ferme.',
        'Si un jour tu as une belle cuisine, je t’apprendrai ma tarte aux mûres. Juré.',
      ],
      [
        'Ma boutique s’appelait « Le Petit Four ». Les gens faisaient la queue jusqu’au coin de la rue.',
        'Et puis j’ai voulu faire des gâteaux de plus en plus compliqués. J’ai oublié de faire des gâteaux qui rendent heureux.',
        'Ta cuisine me rappelle mes débuts. Juste de la farine, des fruits, et l’envie de faire plaisir.',
      ],
      [
        'J’ai une nouvelle ! Je vais rouvrir une toute petite boutique. Rien de compliqué.',
        'C’est grâce à toi, tu sais. Tu m’as rappelé pourquoi j’aimais ce métier.',
        'Voilà ma toque des grands jours. Elle porte bonheur aux cuisiniers. Prends-en soin !',
      ],
    ],
  },
  {
    id: 'plume',
    name: 'Plume',
    look: look('chick', { glasses: 'glasses-round' }),
    tagline: 'Une poétesse trop timide pour lire ses poèmes',
    poses: ['read', 'study', 'sniff', 'nap', 'sip'],
    favourite: 'bread',
    rhythm: 850,
    needs: [],
    gift: 'bg-library',
    chapters: [
      [
        'Ah ! Pardon, je ne t’avais pas vu… Je lisais.',
        'J’écris des poèmes. Mais personne ne les a jamais lus. Ils sont dans mon carnet, bien cachés.',
      ],
      [
        'J’ai écrit un poème sur ton jardin. Il parle d’une graine qui a peur de pousser.',
        'Tu veux l’entendre ? Non, attends… Pas aujourd’hui. Bientôt. Peut-être.',
      ],
      [
        '« Petite graine dans le noir, tu crois que tu n’as rien à voir. Mais un matin, sans prévenir, le monde entier te voit fleurir. »',
        '… Voilà. Je l’ai lu à voix haute. Pour la première fois.',
        'Pour te remercier, je t’offre le décor de ma bibliothèque préférée. On y lit en silence, et c’est très bien comme ça.',
      ],
    ],
  },
  {
    id: 'mirabelle',
    name: 'Mirabelle',
    look: look('rabbit', { hat: 'hat-flowers' }),
    tagline: 'Une jardinière qui parle à ses plantes',
    poses: ['sniff', 'splash', 'dance', 'eat', 'tend'],
    favourite: 'carrotSalad',
    rhythm: 800,
    needs: [],
    gift: 'neck-plums',
    chapters: [
      [
        'Bonjour bonjour ! Oh, tes carottes ont l’air en pleine forme. Tu leur parles ?',
        'Moi, je parle à toutes mes plantes. Elles poussent deux fois plus vite. Bon, c’est pas prouvé.',
      ],
      [
        'Chez moi, il y avait un vieux mirabellier. C’est ma mamie qui l’avait planté le jour de ma naissance.',
        'Il a été coupé quand on a vendu la maison. Depuis, je cherche un jardin où en planter un nouveau.',
      ],
      [
        'J’ai trouvé une graine de mirabellier ! Et j’ai pensé à toi tout de suite.',
        'Tu veux bien qu’on la plante ensemble, un jour ? En attendant, voilà un collier de mirabelles. Pour qu’on se souvienne.',
      ],
    ],
  },
  {
    id: 'brindille',
    name: 'Brindille',
    look: look('frog', { hat: 'hat-straw' }),
    tagline: 'Une musicienne qui cherche la mélodie parfaite',
    poses: ['music', 'dance', 'splash', 'swing'],
    favourite: 'mintLemonade',
    rhythm: 650,
    needs: [],
    gift: 'hat-lily',
    rare: 'mushroom',
    chapters: [
      [
        'Tu entends ça ? Le bruit de l’eau, le vent dans les feuilles… C’est presque une chanson.',
        'Il lui manque juste une note. Je la cherche depuis des années.',
      ],
      [
        'J’ai joué dans un orchestre, avant. Tout était parfait, réglé, répété cent fois.',
        'Et je m’ennuyais. La musique, ça doit surprendre, sinon c’est juste du bruit bien rangé.',
      ],
      [
        'JE L’AI TROUVÉE ! La note qui manquait ! C’était le rire de ton compagnon quand il saute dans le bassin !',
        'Ma chanson est finie. Elle s’appelle « Chez toi ».',
        'Tiens, mon nénuphar porte-bonheur. Je l’avais sur la tête le jour de mon premier concert.',
      ],
    ],
  },
  {
    id: 'flocon',
    name: 'Flocon',
    look: look('penguin', { neck: 'neck-bowtie' }),
    tagline: 'Un majordome très poli, ancien de grand hôtel',
    poses: ['eat', 'mirror', 'read', 'taste'],
    favourite: 'lemonTart',
    rhythm: 750,
    needs: ['bedroom'],
    gift: 'hat-bowler',
    rare: 'frostflower',
    chapters: [
      [
        'Mes hommages. Flocon, pour vous servir. Votre demeure est fort charmante.',
        'J’ai servi trente ans au Grand Hôtel des Glaces. Je reconnais une maison bien tenue.',
      ],
      [
        'L’hôtel a fermé l’hiver dernier. Trente ans à accueillir des voyageurs, et plus personne à accueillir.',
        'C’est étrange, de ne plus être utile à personne. Je ne savais pas que ça pouvait faire si froid. Même pour un pingouin.',
      ],
      [
        'Puis-je vous confier une idée ? Votre maison accueille tant de monde… Elle ferait un merveilleux petit hôtel.',
        'Si un jour vous ouvrez des chambres pour vos amis, je serais honoré de m’en occuper.',
        'En attendant, acceptez mon chapeau melon. Un hôte digne de ce nom se doit d’être élégant.',
      ],
    ],
  },
  {
    id: 'comete',
    name: 'Comète',
    look: look('dragon', { hat: 'hat-beanie' }),
    tagline: 'Un petit dragon qui a peur du noir',
    poses: ['stars', 'sleep', 'swing', 'dance'],
    favourite: 'pumpkinCake',
    rhythm: 550,
    needs: ['library'],
    gift: 'coat-nebula',
    chapters: [
      [
        'Chut ! Ne le dis à personne… Mais j’ai peur du noir.',
        'Un dragon qui a peur du noir. C’est ridicule, hein ? Je ne crache même pas de feu. Juste des étincelles.',
      ],
      [
        'Avec ton télescope, j’ai compris un truc. Le noir, la nuit, il est plein d’étoiles.',
        'Elles sont là tout le temps, en fait. Même quand on ne les voit pas.',
      ],
      [
        'Cette nuit, j’ai dormi sans veilleuse ! Pour la première fois !',
        'J’ai regardé le ciel jusqu’à m’endormir. Je n’avais plus peur du tout.',
        'Tiens : la couleur de la nuit, avec toutes ses étoiles. Comme ça, toi non plus tu n’auras jamais peur du noir.',
      ],
    ],
  },
  {
    id: 'brume',
    name: 'Brume',
    look: look('ghost', { neck: 'neck-pearls' }),
    tagline: 'Un fantôme qui a oublié qui il était',
    poses: ['sleep', 'mirror', 'stars', 'music'],
    favourite: 'fruitCharlotte',
    rhythm: 600,
    needs: ['bedroom', 'library'],
    gift: 'bg-mist',
    chapters: [
      [
        'Ooooh… Pardon. Je ne voulais pas te faire peur. Je cherche quelque chose.',
        'Je ne sais plus quoi. Je ne sais plus qui je suis, d’ailleurs. Juste que j’aime les perles.',
      ],
      [
        'Dans ton miroir, j’ai vu un souvenir. Une grande maison, un piano, et quelqu’un qui riait.',
        'Je crois que j’habitais une maison comme la tienne. Je crois que j’étais heureux.',
      ],
      [
        'Je me souviens de tout, maintenant. Je m’appelais Brume parce que je suis né un matin de brouillard.',
        'Je ne cherchais pas quelque chose. Je cherchais un endroit où me sentir chez moi.',
        'Je l’ai trouvé. Garde ce brouillard du matin, c’est tout ce que j’ai de plus précieux.',
      ],
    ],
  },
  {
    id: 'butine',
    name: 'Butine',
    look: look('cat', { hat: 'hat-flower' }),
    tagline: 'Une apicultrice qui parle à ses abeilles',
    poses: ['sniff', 'tend', 'swing', 'taste', 'sip'],
    favourite: 'honeyTart',
    rhythm: 800,
    needs: [],
    gift: 'coat-honey',
    rare: 'honey',
    chapters: [
      [
        'Bzz… Pardon, c’est l’habitude. Je parle souvent à mes abeilles.',
        'Je les ai suivies jusqu’ici : elles adorent ton jardin.',
        'Si tu leur gardes quelques fleurs, elles te le rendront en miel. Promis.',
      ],
      [
        'Tu sais, au début, j’avais peur des abeilles.',
        'Une piqûre quand j’étais petite, et je courais dès que j’entendais un bourdonnement.',
        'Puis une vieille dame m’a appris à les écouter. Elles ne piquent que quand on a peur d’elles.',
        'Depuis, j’essaie d’écouter tout le monde comme ça.',
      ],
      [
        'Mes abeilles ont fait une ruche près de ta maison. Elles ont décidé que c’était chez elles.',
        'Moi aussi, un peu, je crois.',
        'Tiens : c’est la couleur du miel au soleil du matin. Pour toi.',
      ],
    ],
  },
  {
    id: 'bambou',
    name: 'Bambou',
    look: look('panda', { neck: 'neck-bandana' }),
    tagline: 'Un maître de thé qui ne se presse jamais',
    poses: ['nap', 'sunbathe', 'tend', 'read', 'sip'],
    favourite: 'thymeRisotto',
    rhythm: 950,
    needs: ['greenhouse'],
    gift: 'coat-jade',
    chapters: [
      [
        'Bonjour. Ta serre est magnifique… On y entend presque les feuilles pousser.',
        'Je cultive du thé, là-haut dans les montagnes. Il faut beaucoup de patience.',
        'Ta maison est calme. J’aime les endroits calmes.',
      ],
      [
        'Avant, j’étais toujours pressé. Je voulais tout finir, tout de suite.',
        'Un jour, j’ai laissé infuser mon thé trop longtemps parce que je regardais un nuage. C’était le meilleur thé de ma vie.',
        'Depuis, je regarde plus souvent les nuages.',
      ],
      [
        'J’ai rapporté des graines de mes montagnes. Elles poussent bien chez toi.',
        'Je crois que les plantes sentent quand on prend soin d’elles. Les gens aussi.',
        'Voici la couleur du jade, celle de mes feuilles de thé. Garde-la, et prends ton temps.',
      ],
    ],
  },
  {
    id: 'opaline',
    name: 'Opaline',
    look: look('unicorn', { glasses: 'glasses-stars' }),
    tagline: 'Une magicienne qui n’a jamais osé monter sur scène',
    poses: ['mirror', 'dance', 'music', 'stars'],
    favourite: 'cremeBrulee',
    rhythm: 650,
    needs: ['bedroom'],
    gift: 'coat-opal',
    chapters: [
      [
        'Ta-daaa ! … Bon, d’habitude, il y a des paillettes. Elles sont restées dans ma valise.',
        'Je suis magicienne. Enfin, j’apprends. Mes tours ratent un peu, parfois.',
        'Ton miroir est parfait pour répéter. Je peux revenir ?',
      ],
      [
        'Tu veux savoir un secret ? Je n’ai jamais fait un tour devant un vrai public.',
        'J’ai trop peur que tout le monde voie que je rate.',
        'Mais ici, quand je rate, personne ne se moque. Alors je recommence. Et parfois, ça marche !',
      ],
      [
        'J’ai fait mon premier spectacle ! Devant tes visiteurs, dans ton salon.',
        'Le lapin n’est pas sorti du chapeau, mais tout le monde a applaudi quand même.',
        'Tiens : c’est la couleur des paillettes que j’avais oubliées. Ma vraie magie, c’était d’oser.',
      ],
    ],
  },
  {
    id: 'givrette',
    name: 'Givrette',
    look: look('fox', { color: 'coat-snow', hat: 'hat-beanie' }),
    tagline: 'Une renarde des neiges qui ne vient qu’en hiver',
    poses: ['nap', 'read', 'stars', 'sniff'],
    favourite: 'mandarinChocolate',
    rhythm: 750,
    needs: [],
    season: 'winter',
    gift: 'coat-frost',
    chapters: [
      [
        'Brrr ! Enfin un endroit chaud. Je peux m’asseoir près de toi ?',
        'Je ne viens qu’en hiver. Le reste de l’année, je dors tout là-haut, sous la neige.',
        'Ton chocolat chaud sent bon jusqu’à la forêt, tu sais.',
      ],
      [
        'Chaque hiver, je descends voir si les maisons sont encore éclairées.',
        'Certaines années, il n’y avait plus personne. Juste des fenêtres noires.',
        'Cette année, il y avait ta lumière. Alors je suis entrée.',
      ],
      [
        'Bientôt le printemps. Il faudra que je reparte.',
        'Mais maintenant, je sais où revenir. Je compterai les jours.',
        'Tiens : c’est la couleur du givre au lever du jour. Quand tu la verras, pense à l’hiver prochain.',
      ],
    ],
  },
];

export function character(id: string): Character | undefined {
  return CHARACTERS.find((item) => item.id === id);
}

// -----------------------------------------------
// VISITS
// -----------------------------------------------

/** Visitors stay this long, then leave a gift and others come. */
export const VISIT_MINUTES = 60;
/** Visitors at once: this many, plus one per room opened beyond the starting ones. */
export const BASE_VISITORS = 2;
