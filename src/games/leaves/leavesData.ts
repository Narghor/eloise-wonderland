// -----------------------------------------------
// THE PLACES, WHAT HIDES UNDER THE LEAVES, WHO WALKS BY, THE UPGRADES
// -----------------------------------------------

export type SceneKind = 'path' | 'deck' | 'orchard' | 'fountain' | 'bench' | 'bridge';

export interface Zone {
  id: string;
  name: string;
  scene: SceneKind;
  /** Leaves on the ground when fully covered, at level 1. */
  leaves: number;
  /** Leaf colours of this place's trees. */
  palette: string[];
  /** The snail shows up here (damp places). */
  snails: boolean;
  /** Gold leaves for each level cleared. */
  levelReward: number;
  /** House decoration won when the place is spotless (last level). */
  spotlessDeco: string;
}

export const ZONES: Zone[] = [
  { id: 'path', name: 'L’allée des ginkgos', scene: 'path', leaves: 650, palette: ['#ffd23f', '#f2c94c', '#e8b23a', '#f7dc6f', '#d9a22a'], snails: false, levelReward: 80, spotlessDeco: 'deco-ginkgo-frame' },
  { id: 'deck', name: 'La terrasse aux érables', scene: 'deck', leaves: 800, palette: ['#e8322a', '#c9402e', '#e06a3a', '#f09a3c', '#a83a2a'], snails: false, levelReward: 110, spotlessDeco: 'deco-maple-wreath' },
  { id: 'orchard', name: 'Le verger', scene: 'orchard', leaves: 950, palette: ['#e8a33a', '#d9772b', '#c4532a', '#f2c94c', '#9aa83a'], snails: false, levelReward: 150, spotlessDeco: 'deco-apple-basket' },
  { id: 'fountain', name: 'La fontaine', scene: 'fountain', leaves: 1100, palette: ['#d94f3a', '#e8763a', '#b8402e', '#f0a03c', '#ffd23f'], snails: true, levelReward: 200, spotlessDeco: 'deco-fountain-print' },
  { id: 'bench', name: 'Le banc des amoureux', scene: 'bench', leaves: 1250, palette: ['#e8b23a', '#d98a2c', '#b86a2a', '#f4d36a', '#c9402e'], snails: true, levelReward: 260, spotlessDeco: 'deco-bench-heart' },
  { id: 'bridge', name: 'Le petit pont', scene: 'bridge', leaves: 1400, palette: ['#c9402e', '#e06a3a', '#f09a3c', '#a83a2a', '#8e5ad8'], snails: true, levelReward: 340, spotlessDeco: 'deco-autumn-garland' },
];

/** Levels of a place; the last one makes it spotless. */
export const MAX_LEVEL = 10;
/** The next place opens when the previous one reaches this level. */
export const OPEN_AT_LEVEL = 3;

/** Each level adds this share of leaves on the ground and of leaf value. */
export const LEVEL_LEAVES = 0.1;
export const LEVEL_VALUE = 0.1;

/** A level is a run of carpets: clean the whole ground, the wind lays the next carpet. */
export const CARPET = (leaves: number, level: number) => Math.round(leaves * (1 + LEVEL_LEAVES * (level - 1)));
export const CARPETS = (level: number) => 1 + Math.ceil(level / 2);
export const LEVEL_GOAL = (leaves: number, level: number) => CARPET(leaves, level) * CARPETS(level);

export interface RareLeaf {
  id: string;
  name: string;
  color: string;
  note: string;
}

export const RARE_CHANCE = 1 / 180;
/** Golden leaves: rare, worth a lot, not for the herbarium. */
export const GOLDEN_CHANCE = 1 / 70;
export const GOLDEN_VALUE = 15;
/**
 * Golden leaves that fill the golden gauge (full, the next carpet falls all golden): this share of a carpet,
 * so the gauge takes the same number of carpets in a small place and a big one. The Clover speeds it up.
 */
export const GOLDEN_GAUGE = (carpet: number) => Math.max(10, Math.round(carpet / 14));
/** The star leaf, hidden under some carpets: finding it fills this share of the golden gauge. */
export const STAR_CHANCE = 0.5;
export const STAR_GAUGE_SHARE = 0.25;
/** The mega star, rarer: finding it fills the golden gauge at once. */
export const MEGA_STAR_CHANCE = 0.12;
/** Chance a squirrel snatches a treasure just found; caught in time, it pays the treasure twice. */
export const THIEF_CHANCE = 0.25;
export const THIEF_MS = 1800;
/** The golden butterfly zigzags across fast; touching it fills this share of the golden gauge. */
export const BUTTERFLY_MS = 3000;
export const BUTTERFLY_GAUGE_SHARE = 0.15;

export const RARE_LEAVES: RareLeaf[] = [
  { id: 'maple', name: 'Érable rouge', color: '#ff2a3a', note: 'Rouge comme une joue qui a froid.' },
  { id: 'ginkgo', name: 'Ginkgo d’or', color: '#ffe14a', note: 'Elle a la forme d’un petit éventail.' },
  { id: 'frost', name: 'Feuille de givre', color: '#d8f0ff', note: 'Elle fond presque quand on la touche.' },
  { id: 'heart', name: 'Feuille-cœur', color: '#ff7fae', note: 'Un cœur parfait, comme dessiné exprès.' },
  { id: 'violet', name: 'Liquidambar violet', color: '#9b5de5', note: 'Les plus belles couleurs de l’automne.' },
  { id: 'silver', name: 'Bouleau argenté', color: '#e4e8ee', note: 'Elle brille comme une pièce.' },
  { id: 'clover', name: 'Trèfle à quatre feuilles', color: '#3fbf5a', note: 'Égaré parmi les feuilles. Porte-bonheur !' },
  { id: 'sun', name: 'Feuille de soleil', color: '#ff9e2c', note: 'Elle garde la chaleur de l’été.' },
  { id: 'sakura', name: 'Pétale de cerisier', color: '#ffc4dd', note: 'Venu du printemps, on ne sait comment.' },
  { id: 'night', name: 'Feuille de nuit', color: '#3a4a8a', note: 'On ne la trouve qu’une fois le soleil couché.' },
];

// -----------------------------------------------
// TREASURES UNDER THE LEAVES
// -----------------------------------------------

export interface Treasure {
  id: string;
  name: string;
  icon: string;
  /** Relative chance among the treasures. */
  weight: number;
  /** Gold leaves it gives. */
  gold: number;
  note: string;
  /** Only buried from this level on. */
  minLevel?: number;
}

export const TREASURES: Treasure[] = [
  { id: 'acorn', name: 'Gland', icon: '🌰', weight: 30, gold: 5, note: 'Un écureuil l’a sûrement oublié.' },
  { id: 'mushroom', name: 'Champignon', icon: '🍄', weight: 18, gold: 8, note: 'Tout rond, tout rouge, à ne pas manger !' },
  { id: 'feather', name: 'Plume', icon: '🪶', weight: 14, gold: 10, note: 'Une plume douce comme un nuage.' },
  { id: 'pinecone', name: 'Pomme de pin', icon: '🌲', weight: 14, gold: 8, note: 'Parfaite pour décorer une table.' },
  { id: 'marble', name: 'Bille', icon: '🔮', weight: 8, gold: 20, note: 'Perdue par un enfant il y a longtemps.' },
  { id: 'coin', name: 'Vieille pièce', icon: '🪙', weight: 7, gold: 30, note: 'Elle date d’une autre époque.' },
  { id: 'key', name: 'Petite clé', icon: '🗝️', weight: 4, gold: 40, note: 'Elle ouvre sûrement quelque chose…' },
  { id: 'ring', name: 'Bague', icon: '💍', weight: 2, gold: 80, note: 'Quelqu’un doit la chercher partout.' },
  { id: 'gem', name: 'Pierre précieuse', icon: '💎', weight: 1, gold: 150, note: 'Elle scintille même sous les feuilles.' },
  { id: 'compass', name: 'Boussole', icon: '🧭', weight: 3, gold: 200, note: 'Elle indique toujours le plus gros tas.', minLevel: 4 },
  { id: 'letter', name: 'Vieille lettre', icon: '💌', weight: 3, gold: 220, note: 'Une lettre d’amour jamais envoyée.', minLevel: 5 },
  { id: 'musicbox', name: 'Boîte à musique', icon: '🎶', weight: 2, gold: 350, note: 'Elle joue encore une petite valse.', minLevel: 6 },
  { id: 'locket', name: 'Médaillon', icon: '📿', weight: 2, gold: 400, note: 'Il y a une minuscule photo dedans.', minLevel: 7 },
  { id: 'telescope', name: 'Longue-vue', icon: '🔭', weight: 1, gold: 600, note: 'Pour regarder les étoiles depuis le banc.', minLevel: 8 },
  { id: 'crown', name: 'Couronne de feuilles', icon: '👑', weight: 1, gold: 1000, note: 'La reine de l’automne l’a laissée là.', minLevel: 9 },
];

// -----------------------------------------------
// ORNAMENTS: bought with gold leaves, they decorate a place and make its leaves worth more
// -----------------------------------------------

export interface Ornament {
  id: string;
  name: string;
  icon: string;
  /** Where it stands in the scene, in canvas pixels. */
  x: number;
  y: number;
  /** Price in the first place; later places cost more. */
  price: number;
}

export const ORNAMENTS: Ornament[] = [
  { id: 'flowers', name: 'Pot de fleurs', icon: '🌻', x: 30, y: 452, price: 8000 },
  { id: 'lantern', name: 'Lanterne', icon: '🏮', x: 334, y: 140, price: 20000 },
  { id: 'pumpkin', name: 'Citrouille', icon: '🎃', x: 326, y: 458, price: 45000 },
  { id: 'birdhouse', name: 'Mangeoire à oiseaux', icon: '🐦', x: 26, y: 132, price: 90000 },
];
/** Each place costs this much more than the one before. */
export const ORNAMENT_PLACE_FACTOR = 1.5;
/** Leaf value bonus per ornament in its place. */
export const ORNAMENT_VALUE = 0.05;
export const ornamentPrice = (o: Ornament, placeIndex: number) => Math.round(o.price * ORNAMENT_PLACE_FACTOR ** placeIndex);

/** Hidden treasures per place: this many, plus one per level. */
export const TREASURES_PER_ZONE = 4;
/** Chance a hidden treasure is a decoration for the house instead. */
export const DECO_CHANCE = 0.06;

// -----------------------------------------------
// LITTLE CREATURES
// -----------------------------------------------

export type CritterId = 'squirrel' | 'hedgehog' | 'robin' | 'ladybug' | 'cat' | 'snail' | 'fox' | 'firefly' | 'butterfly';

export interface Critter {
  id: CritterId;
  name: string;
  icon: string;
  note: string;
  /** How to meet it, told in the album before it is met. */
  hint: string;
}

export const CRITTERS: Critter[] = [
  { id: 'squirrel', name: 'Écureuil', icon: '🐿️', note: 'Il file avec sa noisette… et la lâche si on le surprend.', hint: 'Il traverse le parc en courant.' },
  { id: 'hedgehog', name: 'Hérisson', icon: '🦔', note: 'Il dormait bien au chaud sous les feuilles.', hint: 'Il dort sous un gros tas de feuilles.' },
  { id: 'robin', name: 'Rouge-gorge', icon: '🐦', note: 'Il vient voir s’il y a des vers.', hint: 'Il se pose un instant pour picorer.' },
  { id: 'ladybug', name: 'Coccinelle', icon: '🐞', note: 'Sept points. Elle porte bonheur.', hint: 'Elle se promène sur les feuilles.' },
  { id: 'snail', name: 'Escargot', icon: '🐌', note: 'Il prend son temps. Lui aussi.', hint: 'Il vit près de l’eau et des endroits humides.' },
  { id: 'cat', name: 'Chat du voisin', icon: '🐈', note: 'Il vient toujours fêter les grands ménages.', hint: 'Il vient quand un lieu monte de niveau.' },
  { id: 'fox', name: 'Renardeau', icon: '🦊', note: 'Il saute dans les tas de feuilles. Comme nous.', hint: 'Il passe parfois au crépuscule.' },
  { id: 'firefly', name: 'Luciole', icon: '✨', note: 'Une petite lumière dans la nuit.', hint: 'Elle danse la nuit au-dessus des feuilles.' },
  { id: 'butterfly', name: 'Papillon doré', icon: '🦋', note: 'Il ne tient pas en place. L’attraper fait briller la jauge dorée.', hint: 'Il traverse le parc en zigzag, très vite.' },
];

// -----------------------------------------------
// UPGRADES
// -----------------------------------------------

export type UpgradeId = 'basket' | 'rake' | 'value' | 'luck';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  icon: string;
  max: number;
  cost(level: number): number;
  describe(level: number): string;
}

export const BASKET_SIZE = (level: number) => 250 + level * 150;
/** Leaves picked by one tap: the touched leaf, then its nearest neighbours. */
export const GRAB = (level: number) => [1, 3, 5, 8, 12, 16, 20, 25, 30][level];
/** How far from the finger a tap still finds a leaf, and how far its neighbours may be. */
export const TOUCH_REACH = 12;
export const GRAB_REACH = (level: number) => 18 + level * 6;
/** Below this many leaves left on a carpet, the last ones shine so nobody hunts for them. */
export const LAST_LEAVES = 25;
/** Leaves in each small pile of a carpet. */
export const PILE_SIZE = 20;
export const LEAF_VALUE = (level: number) => 1 + level * 0.25;
/** Multiplier on rare leaves, golden leaves and treasures. */
export const LUCK = (level: number) => 1 + level * 0.25;

export const UPGRADES: Upgrade[] = [
  { id: 'basket', name: 'Panier', icon: '🧺', max: 10, cost: (l) => Math.round(1200 * 1.85 ** l), describe: (l) => `${BASKET_SIZE(l)} feuilles` },
  // Kept as 'rake' in saves: it is the gloves now.
  { id: 'rake', name: 'Gants', icon: '🧤', max: 8, cost: (l) => (l === 0 ? 500 : Math.round(2100 * 2.08 ** l)), describe: (l) => `${GRAB(l)} feuille${GRAB(l) > 1 ? 's' : ''} par toucher` },
  { id: 'value', name: 'Compost', icon: '🌱', max: 8, cost: (l) => Math.round(4500 * 1.95 ** l), describe: (l) => `×${LEAF_VALUE(l).toLocaleString('fr-FR')} feuille d’or par feuille` },
  { id: 'luck', name: 'Trèfle', icon: '🍀', max: 6, cost: (l) => Math.round(9000 * 2.2 ** l), describe: (l) => `chance ×${LUCK(l).toLocaleString('fr-FR')} (raretés, trésors)` },
];

/** Leaves drifting down from the trees each second: scenery only, they never land on the heap. */
export const FALL_RATE = 0.6;
/** Gold leaves for one coin, and the coins a day can give. */
export const GOLD_PER_COIN = 80;
export const DAILY_COINS = 40;
