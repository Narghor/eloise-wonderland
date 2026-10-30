// -----------------------------------------------
// THE FLOWER CATALOGUE
// -----------------------------------------------

export type Family = 'chaud' | 'froid' | 'pastel' | 'blanc';
export type ColourId = 'rouge' | 'orange' | 'jaune' | 'rose' | 'peche' | 'violet' | 'bleu' | 'blanc';
export type SpeciesId =
  | 'rose'
  | 'tulipe'
  | 'marguerite'
  | 'tournesol'
  | 'lavande'
  | 'pivoine'
  | 'muguet'
  | 'coquelicot'
  | 'iris'
  | 'myosotis';

export interface Colour {
  id: ColourId;
  family: Family;
  hex: string;
  /** Agrees with "fleur": "rouge" / "rouges". */
  singular: string;
  plural: string;
}

export interface Species {
  id: SpeciesId;
  tall: boolean;
  colours: ColourId[];
  /** With its article: "une rose", "un iris". */
  one: string;
  plural: string;
}

export const COLOURS: Record<ColourId, Colour> = {
  rouge: { id: 'rouge', family: 'chaud', hex: '#e0393e', singular: 'rouge', plural: 'rouges' },
  orange: { id: 'orange', family: 'chaud', hex: '#f08a2c', singular: 'orange', plural: 'orange' },
  jaune: { id: 'jaune', family: 'chaud', hex: '#f5c518', singular: 'jaune', plural: 'jaunes' },
  rose: { id: 'rose', family: 'pastel', hex: '#f49ac1', singular: 'rose', plural: 'roses' },
  peche: { id: 'peche', family: 'pastel', hex: '#f7b994', singular: 'pêche', plural: 'pêche' },
  violet: { id: 'violet', family: 'froid', hex: '#8e5cc4', singular: 'violette', plural: 'violettes' },
  bleu: { id: 'bleu', family: 'froid', hex: '#4a7fd6', singular: 'bleue', plural: 'bleues' },
  blanc: { id: 'blanc', family: 'blanc', hex: '#fbfaf3', singular: 'blanche', plural: 'blanches' },
};

export const FAMILY_NAMES: Record<Family, { plural: string; detail: string }> = {
  chaud: { plural: 'de couleur chaude', detail: 'rouge, orange, jaune' },
  froid: { plural: 'de couleur froide', detail: 'violet, bleu' },
  pastel: { plural: 'de couleur pastel', detail: 'rose, pêche' },
  blanc: { plural: 'blanches', detail: 'blanc' },
};

export const SPECIES: Record<SpeciesId, Species> = {
  rose: { id: 'rose', tall: true, colours: ['rouge', 'rose', 'blanc', 'jaune', 'peche'], one: 'une rose', plural: 'roses' },
  tulipe: { id: 'tulipe', tall: true, colours: ['rouge', 'orange', 'jaune', 'rose', 'violet', 'blanc'], one: 'une tulipe', plural: 'tulipes' },
  marguerite: { id: 'marguerite', tall: false, colours: ['blanc', 'rose'], one: 'une marguerite', plural: 'marguerites' },
  tournesol: { id: 'tournesol', tall: true, colours: ['jaune'], one: 'un tournesol', plural: 'tournesols' },
  lavande: { id: 'lavande', tall: true, colours: ['violet'], one: 'un brin de lavande', plural: 'brins de lavande' },
  pivoine: { id: 'pivoine', tall: false, colours: ['rose', 'peche', 'blanc', 'rouge'], one: 'une pivoine', plural: 'pivoines' },
  muguet: { id: 'muguet', tall: false, colours: ['blanc'], one: 'un brin de muguet', plural: 'brins de muguet' },
  coquelicot: { id: 'coquelicot', tall: false, colours: ['rouge'], one: 'un coquelicot', plural: 'coquelicots' },
  iris: { id: 'iris', tall: true, colours: ['bleu', 'violet'], one: 'un iris', plural: 'iris' },
  myosotis: { id: 'myosotis', tall: false, colours: ['bleu'], one: 'un myosotis', plural: 'myosotis' },
};

export const SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];

/** A flower of the stall, saved as "species/colour". */
export type FlowerKey = `${SpeciesId}/${ColourId}`;

export interface Flower {
  species: Species;
  colour: Colour;
}

export const ALL_FLOWERS: FlowerKey[] = SPECIES_IDS.flatMap((id) => SPECIES[id].colours.map((colour): FlowerKey => `${id}/${colour}`));

export function isFlowerKey(value: unknown): value is FlowerKey {
  return typeof value === 'string' && (ALL_FLOWERS as string[]).includes(value);
}

const FLOWERS = new Map(
  ALL_FLOWERS.map((key) => {
    const [species, colour] = key.split('/') as [SpeciesId, ColourId];
    return [key, { species: SPECIES[species], colour: COLOURS[colour] }];
  }),
);

export function flower(key: FlowerKey): Flower {
  return FLOWERS.get(key)!;
}

/** "une rose rouge", "un iris bleu" (the colour agrees with the species' gender). */
export function flowerName(key: FlowerKey): string {
  const { species, colour } = flower(key);
  const masculine = species.one.startsWith('un ') && !species.one.includes('brin');
  const adjective = masculine ? MASCULINE[colour.id] : colour.singular;
  const one = species.one;
  // A single-colour species needs no colour in its name.
  return species.colours.length === 1 ? one : `${one} ${adjective}`;
}

const MASCULINE: Record<ColourId, string> = {
  rouge: 'rouge',
  orange: 'orange',
  jaune: 'jaune',
  rose: 'rose',
  peche: 'pêche',
  violet: 'violet',
  bleu: 'bleu',
  blanc: 'blanc',
};
