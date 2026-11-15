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
  | 'thread' | 'fabric';

export type CropId = 'wheat' | 'corn' | 'carrot' | 'tomato' | 'strawberry' | 'sunflower' | 'pumpkin' | 'cotton';

export type AnimalId = 'chicken' | 'cow';

export type MachineId = 'mill' | 'bakery' | 'dairy' | 'spinning';
export type PenId = 'coop' | 'cowshed';
export type TreeId = 'hazel';
export type DecorId =
  | 'fence' | 'hedge' | 'flowersPink' | 'flowersYellow' | 'flowersWhite' | 'pathStone' | 'pathDirt'
  | 'bench' | 'well' | 'scarecrow' | 'lantern' | 'wheelbarrow' | 'appleTree' | 'logPile' | 'birdhouse' | 'pond';
export type ObstacleId = 'bush' | 'stump' | 'rock' | 'bigRock';

/** Everything that stands on the map. */
export type PlaceableId = 'field' | MachineId | PenId | TreeId | DecorId | ObstacleId;

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
