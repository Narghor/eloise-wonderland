import { atLevel, type JoinFamily, type SkinId, type Unlock } from './types';

// -----------------------------------------------
// SKINS: the looks of the pieces that join (docs/ferme.md 16)
// -----------------------------------------------
// A joined piece wears one skin and joins only the neighbours wearing the same one. The first skin of a family
// is the one a piece wears when it has none (saves from before the skins).

export interface Skin {
  id: SkinId;
  family: JoinFamily;
  name: string;
  unlock: Unlock;
}

/** The sides a piece joins, as bits of its mask. */
export const JOIN_NORTH = 1;
export const JOIN_EAST = 2;
export const JOIN_SOUTH = 4;
export const JOIN_WEST = 8;
/** With JOIN_NORTH: the northern neighbour is a gate, whose own post comes down to this tile; no rail climbs to it. */
export const JOIN_NORTH_GATE = 16;
/** Something sits on this piece: a post stands there to carry it, whatever the run. */
export const JOIN_CARRIES = 32;

export const SKINS: readonly Skin[] = [
  { id: 'fenceRanch', family: 'fence', name: 'Ranch', unlock: atLevel(1) },
  { id: 'fencePicket', family: 'fence', name: 'Piquets blancs', unlock: atLevel(4) },
  { id: 'fenceWattle', family: 'fence', name: 'Plessis tressé', unlock: atLevel(8) },
];

export const SKIN_IDS = SKINS.map((s) => s.id);

/** The family's name inside a sentence: "Style de barrière : Ranch". */
export const FAMILY_NAMES: Record<JoinFamily, string> = { fence: 'barrière' };

export function skin(id: SkinId): Skin {
  return SKINS.find((s) => s.id === id)!;
}

export function skinsOf(family: JoinFamily): Skin[] {
  return SKINS.filter((s) => s.family === family);
}

export function defaultSkin(family: JoinFamily): SkinId {
  return skinsOf(family)[0].id;
}
