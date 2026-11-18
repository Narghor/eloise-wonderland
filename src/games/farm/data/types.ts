// -----------------------------------------------
// SHARED SHAPES OF THE FARM CONTENT
// -----------------------------------------------
// Every id below is stored in the save: ids are never renamed nor reused, new ones go at the end of their list.

export type ItemId =
  | 'wheat' | 'corn' | 'carrot' | 'tomato' | 'strawberry' | 'sunflower' | 'pumpkin' | 'cotton'
  | 'egg' | 'milk'
  | 'chickenFeed' | 'cowFeed' | 'flour'
  | 'bread' | 'carrotPie' | 'strawberryCake' | 'pumpkinPie'
  | 'cream' | 'butter' | 'cheese'
  | 'thread' | 'fabric'
  // Lot 2 (docs/ferme.md 18).
  | 'beet' | 'blueberry' | 'lavender'
  | 'sheepFeed' | 'pigFeed' | 'beeFeed' | 'goatFeed' | 'duckFeed' | 'rabbitFeed'
  | 'wool' | 'truffle' | 'honey' | 'goatMilk' | 'feather' | 'angora'
  | 'sugar' | 'carrotJuice' | 'tomatoJuice' | 'strawberryJuice' | 'strawberryJam' | 'blueberryJam'
  | 'yarn' | 'angoraYarn' | 'honeyCandy' | 'lollipop' | 'nougat' | 'giftBasket'
  | 'goatCheese' | 'blueberryPie' | 'pizza' | 'layerCake'
  | 'scarf' | 'cushion' | 'sweater' | 'plushie'
  | 'strawberryIce' | 'honeyIce' | 'blueberryIce' | 'lavenderSoap' | 'honeyCandle'
  | 'crepe' | 'jamCrepe' | 'honeyCrepe' | 'truffleGalette'
  // Fruit trees.
  | 'apple' | 'cherry' | 'appleJuice' | 'applePie' | 'cherryJam' | 'cherryIce';

export type CropId = 'wheat' | 'corn' | 'carrot' | 'tomato' | 'strawberry' | 'sunflower' | 'pumpkin' | 'cotton' | 'beet' | 'blueberry' | 'lavender';

export type AnimalId = 'chicken' | 'cow' | 'sheep' | 'pig' | 'bee' | 'goat' | 'duck' | 'rabbit';

export type MachineId =
  | 'mill' | 'bakery' | 'dairy' | 'spinning' | 'cookiery'
  | 'refinery' | 'press' | 'jamKitchen' | 'candyShop' | 'sewing' | 'iceCream' | 'soapWorks' | 'creperie';
export type PenId = 'coop' | 'cowshed' | 'sheepfold' | 'pigsty' | 'hive' | 'goatShed' | 'duckPond' | 'hutch';
/** `appleTree` is the old decorative apple tree's id (a DecorId): the fruit tree is `apple`. */
export type TreeId = 'hazel' | 'apple' | 'cherry';
export type DecorId =
  | 'fence' | 'hedge' | 'flowersPink' | 'flowersYellow' | 'flowersWhite' | 'pathStone' | 'pathDirt'
  | 'bench' | 'well' | 'scarecrow' | 'lantern' | 'wheelbarrow' | 'appleTree' | 'logPile' | 'birdhouse' | 'pond'
  | 'fenceGate' | 'flowerPot'
  // The big decoration lot of 16/11 (docs/ferme.md 23).
  | 'tulips' | 'lavender' | 'sunflowers' | 'hydrangeas' | 'climbingRose' | 'planter'
  | 'pathFlag' | 'pathGravel' | 'pathPlank'
  | 'wateringCan' | 'picnicTable' | 'deckChair' | 'parasol' | 'hammock' | 'porchSwing'
  | 'birdBath' | 'lilyPond' | 'gardenBridge'
  | 'candleJar' | 'lamppost' | 'stringLights'
  | 'flowerBarrel' | 'weathervane' | 'flowerCart'
  // Showpieces: one of each, very dear (data/placeables.ts).
  | 'pergola' | 'bandstand' | 'greenhouse' | 'treehouse' | 'dovecote' | 'carousel' | 'hedgeMaze'
  // Treasures: found first in Gaston's parcels, then bought in the shop.
  | 'gnome' | 'hayBales' | 'teaTable' | 'flowerArch' | 'swing' | 'fountain'
  // Lot 3 (docs/ferme.md 27): now, then the late game.
  | 'torch' | 'steppingStones' | 'stoneWall' | 'topiaryBall' | 'hopscotch' | 'fireflyJar' | 'sundial' | 'wickerSet' | 'sandbox'
  | 'topiaryRabbit' | 'paperLanterns' | 'columnUrn' | 'doeStatue' | 'slide' | 'topiaryHeart' | 'toolShed' | 'tipi'
  | 'moonGate' | 'rockery' | 'roulotte' | 'carriage';

/** Pieces that join their neighbours of the same family: a fence and its gate, a hedge, each kind of path, a wall. */
export type JoinFamily = 'fence' | 'hedge' | 'pathDirt' | 'pathStone' | 'pathFlag' | 'pathGravel' | 'pathPlank' | 'wall';

/** The looks a joined piece can wear (data/skins.ts). */
export type SkinId = 'fenceRanch' | 'fencePicket' | 'fenceWattle';

/** What wears a building style: the machines and the pens. */
export type BuildingId = MachineId | PenId;
/** The looks a building can wear (data/styles.ts). */
export type StyleId = 'thatch' | 'provence' | 'seaside' | 'forest' | 'chalet' | 'cherry' | 'icing' | 'winter' | 'golden';
/** The rare looks of one decoration, found in parcels (data/styles.ts DECOR_STYLES). */
export type DecorStyleId =
  | 'blueRoses' | 'faiencePot' | 'parrotTulips' | 'gingerbreadBirdhouse' | 'moonHydrangeas' | 'rainbowParasol'
  | 'lovebirdBench' | 'fairyLantern' | 'pinkMarbleBirdBath' | 'flowerSwing'
  | 'wishingWell' | 'lotusPond';
/** What an object may wear: a building style on a machine or a pen, a decoration style on its decoration. */
export type ObjectStyleId = StyleId | DecorStyleId;
export type ObstacleId = 'bush' | 'stump' | 'rock' | 'bigRock';

/** Everything that stands on the map. The mailbox is Gaston's: one per farm, given, moved like the rest. */
export type PlaceableId = 'field' | MachineId | PenId | TreeId | DecorId | ObstacleId | 'mailbox' | 'marketCart';

/** Rare animals, found in parcels: they live in their kind's pen and sometimes give one product more. */
export type BreedId =
  | 'redHen' | 'goldenHen' | 'pinkCow'
  | 'blackSheep' | 'spottedPig' | 'queenBee' | 'snowGoat' | 'mandarinDuck' | 'lopRabbit';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type BoosterId = 'fertilizer' | 'wateringCan' | 'hourglass' | 'helpingHand';

export type PersonId = 'marthe' | 'leon' | 'rosalie' | 'basile' | 'jules' | 'capucine' | 'gaston' | 'pivoine';

export type QuestId = string;
export type ProjectId = 'bridge';

/** What opens a content line: the one rule read by `isUnlocked`. */
export type Unlock = { level: number } | { quest: QuestId } | { project: ProjectId };

export const atLevel = (level: number): Unlock => ({ level });

/** What the player gets: always a plain list of amounts, so one function pays every reward. */
export interface Reward {
  nuts?: number;
  xp?: number;
  boosters?: Partial<Record<BoosterId, number>>;
  decor?: Partial<Record<DecorId, number>>;
  /** Gaston's parcels, straight to the mailbox. */
  parcels?: number;
}

/**
 * What the logic announces. Counters are kept per `type`, `type:target` and `type:kind`:
 * quests, daily tasks and medals are written with those keys.
 */
export type EventType =
  | 'sow' | 'harvest' | 'feed' | 'collect' | 'produce' | 'order' | 'deliver' | 'sell'
  | 'clear' | 'place' | 'buy' | 'project' | 'earn';

export interface FarmEvent {
  type: EventType;
  /** An item, a placeable, an animal, 'parcel'... */
  target?: string;
  /** A family: 'crop', 'animal', 'deco', 'machine'... */
  kind?: string;
  count: number;
}

/** One line of a quest or a daily task. */
export type Objective =
  /** Counted from the moment the quest opens. `key` is a counter key: 'harvest', 'harvest:wheat', 'place:deco'... */
  | { key: string; count: number; text: string }
  /** A state checked at any time: placeables on the map, or animals in their pens. */
  | { own: PlaceableId | AnimalId; count: number; text: string };
