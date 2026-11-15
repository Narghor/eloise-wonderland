import { placeable } from './data/placeables';
import { JOIN_EAST, JOIN_NORTH, JOIN_NORTH_GATE, JOIN_SOUTH, JOIN_WEST, defaultSkin, skinsOf, type Skin } from './data/skins';
import type { JoinFamily, PlaceableId, SkinId } from './data/types';
import { isUnlocked } from './farmProgress';
import type { FarmSave, PlacedObject } from './farmSave';

// -----------------------------------------------
// PIECES THAT JOIN: a fence and its gate (docs/ferme.md 16)
// -----------------------------------------------
// Each piece looks at its four neighbours: those of its family wearing its skin join it. The mask says which
// sides join; the art draws one shape per mask.

type Piece = { type: PlaceableId; x: number; y: number; skin?: SkinId; uid?: number };

/** The skin a piece wears, or null for anything that does not join. */
export function skinOf(o: { type: PlaceableId; skin?: SkinId }): SkinId | null {
  const family = placeable(o.type).joins;
  return family ? o.skin ?? defaultSkin(family) : null;
}

export interface JoinCell {
  skin: SkinId;
  gate: boolean;
}

export function isGate(type: PlaceableId): boolean {
  return type === 'fenceGate';
}

/** Every joined piece by "x,y"; a ghost stands where it is, in place of the object it moves. */
export function joinIndex(objects: readonly PlacedObject[], ghost?: Piece | null): Map<string, JoinCell> {
  const index = new Map<string, JoinCell>();
  const add = (o: Piece) => {
    const skin = skinOf(o);
    if (skin) index.set(`${o.x},${o.y}`, { skin, gate: isGate(o.type) });
  };
  for (const o of objects) if (o.uid !== ghost?.uid) add(o);
  if (ghost) add(ghost);
  return index;
}

export function joinMask(index: ReadonlyMap<string, JoinCell>, x: number, y: number, skin: SkinId): number {
  const at = (dx: number, dy: number) => {
    const cell = index.get(`${x + dx},${y + dy}`);
    return cell?.skin === skin ? cell : null;
  };
  const north = at(0, -1);
  return (north ? JOIN_NORTH | (north.gate ? JOIN_NORTH_GATE : 0) : 0)
    | (at(1, 0) ? JOIN_EAST : 0) | (at(0, 1) ? JOIN_SOUTH : 0) | (at(-1, 0) ? JOIN_WEST : 0);
}

/** What a new piece of the family wears: the last skin chosen. */
export function chosenSkin(save: FarmSave, family: JoinFamily): SkinId {
  return save.lastSkins[family] ?? defaultSkin(family);
}

/** The next open skin after `current`, round the list; null when no other one is open. */
export function nextSkin(save: FarmSave, family: JoinFamily, current: SkinId): SkinId | null {
  const open = skinsOf(family).filter((s) => isUnlocked(save, s.unlock));
  const next = open[(open.findIndex((s) => s.id === current) + 1) % open.length];
  return next && next.id !== current ? next.id : null;
}

/** The first skin of the family still locked: the hint when nothing else is open. */
export function lockedSkin(save: FarmSave, family: JoinFamily): Skin | null {
  return skinsOf(family).find((s) => !isUnlocked(save, s.unlock)) ?? null;
}

/**
 * Gives `to` to the run `start` belongs to: the pieces reached from it through neighbours of the same family
 * and skin. It becomes the family's chosen skin. Returns how many pieces changed.
 */
export function restyleRun(save: FarmSave, start: PlacedObject, to: SkinId): number {
  const family = placeable(start.type).joins;
  const from = skinOf(start);
  if (!family || !from) return 0;
  save.lastSkins[family] = to;
  const at = new Map<string, PlacedObject>();
  for (const o of save.objects) if (placeable(o.type).joins === family && skinOf(o) === from) at.set(`${o.x},${o.y}`, o);
  const todo = [start];
  const seen = new Set<PlacedObject>([start]);
  while (todo.length > 0) {
    const o = todo.pop()!;
    o.skin = to;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const next = at.get(`${o.x + dx},${o.y + dy}`);
      if (next && !seen.has(next)) {
        seen.add(next);
        todo.push(next);
      }
    }
  }
  return seen.size;
}
