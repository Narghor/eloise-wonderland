import { readGame, writeGame } from '../../save';
import { FISH } from '../fishing/fishingData';
import { DECORATIONS, FOODS, NAME_MAX, SPOTS, TANKS } from './aquariumData';

const GAME_ID = 'aquarium';

export interface TankState {
  /** Species living here, in the order they came. */
  fish: string[];
  /** Decoration id per floor spot, or null. */
  spots: (string | null)[];
}

export interface Baby {
  fish: string;
  /** The tank it lives in, or '' while its family waits in the garden pond. */
  tank: string;
  /** Day of birth (YYYY-MM-DD). */
  born: string;
}

export interface AquariumSave {
  /** Tanks opened, by id; the first one is always open. */
  tanks: Record<string, TankState>;
  /** Decorations bought or won. */
  decorations: string[];
  /** Themes already celebrated, so the reward is given once. */
  themes: string[];
  /** Last day the fish were fed (YYYY-MM-DD). */
  fedDay: string;
  /** Pinches of food used on fedDay. */
  pinches: number;
  /** Last day the glass was wiped clean. */
  cleanDay: string;
  /** Favourite food found for each species. */
  favorites: Record<string, string>;
  /** Last day the visitor's wish was met. */
  visitedDay: string;
  /** Pet names given to species. */
  names: Record<string, string>;
  /** Fry born in the tanks; they grow up over a few days and stay with their species. */
  babies: Baby[];
  /** Last day fry were born, so it happens at most once a day. */
  bredDay: string;
  /** Little finds picked up on the sand today. */
  finds: { day: string; count: number };
  /** Tank shown last. */
  tank: string;
}

export function loadAquarium(): AquariumSave {
  const data = rec(readGame(GAME_ID));
  const fishIds = new Set(FISH.map((f) => f.id));
  const tanks: Record<string, TankState> = {};
  const housed = new Set<string>();
  for (const tank of TANKS) {
    const raw = rec(rec(data.tanks)[tank.id]);
    if (tank.price > 0 && !rec(data.tanks)[tank.id]) continue;
    // A species lives in one tank only, and a tank keeps to its places.
    const fish = (Array.isArray(raw.fish) ? raw.fish : []).filter((id): id is string => typeof id === 'string' && fishIds.has(id) && !housed.has(id)).slice(0, tank.places);
    fish.forEach((id) => housed.add(id));
    const spots = SPOTS.map((_, i) => {
      const id = Array.isArray(raw.spots) ? raw.spots[i] : null;
      return typeof id === 'string' && DECORATIONS.some((d) => d.id === id) ? id : null;
    });
    tanks[tank.id] = { fish, spots };
  }
  const decorations = (Array.isArray(data.decorations) ? data.decorations : []).filter((id): id is string => typeof id === 'string' && DECORATIONS.some((d) => d.id === id));
  return {
    tanks,
    decorations,
    themes: (Array.isArray(data.themes) ? data.themes : []).filter((id): id is string => typeof id === 'string' && TANKS.some((t) => t.id === id)),
    fedDay: typeof data.fedDay === 'string' ? data.fedDay : '',
    pinches: Number.isInteger(data.pinches) ? (data.pinches as number) : 0,
    cleanDay: typeof data.cleanDay === 'string' ? data.cleanDay : '',
    visitedDay: typeof data.visitedDay === 'string' ? data.visitedDay : '',
    names: Object.fromEntries(Object.entries(rec(data.names)).filter((e): e is [string, string] => fishIds.has(e[0]) && typeof e[1] === 'string' && e[1].trim() !== '').map(([id, n]) => [id, n.slice(0, NAME_MAX)])),
    babies: (Array.isArray(data.babies) ? data.babies : [])
      .map(rec)
      // A fry lives with its family, or waits with it in the garden pond (tank '').
      .filter((b) => typeof b.fish === 'string' && typeof b.tank === 'string' && typeof b.born === 'string' && (b.tank === '' ? fishIds.has(b.fish) : tanks[b.tank]?.fish.includes(b.fish)))
      .map((b) => ({ fish: b.fish as string, tank: b.tank as string, born: b.born as string })),
    bredDay: typeof data.bredDay === 'string' ? data.bredDay : '',
    favorites: Object.fromEntries(
      Object.entries(rec(data.favorites)).filter((e): e is [string, string] => fishIds.has(e[0]) && typeof e[1] === 'string' && FOODS.some((f) => f.id === e[1])),
    ),
    finds: { day: typeof rec(data.finds).day === 'string' ? (rec(data.finds).day as string) : '', count: Number.isInteger(rec(data.finds).count) ? (rec(data.finds).count as number) : 0 },
    tank: typeof data.tank === 'string' && tanks[data.tank] ? data.tank : TANKS[0].id,
  };
}

export function saveAquarium(save: AquariumSave): void {
  writeGame(GAME_ID, save);
}

function rec(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}
