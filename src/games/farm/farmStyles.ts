import { STYLE_IDS, decorStylesOf, fitsStyle, isDecorStyle, isTreasureStyle, style, stylePrice } from './data/styles';
import { isBuilding } from './data/placeables';
import type { BuildingId, ObjectStyleId, PlaceableId, StyleId } from './data/types';
import { emit, isUnlocked, spend } from './farmProgress';
import type { FarmSave, PlacedObject } from './farmSave';

// -----------------------------------------------
// STYLES: which ones an object may wear, buying one, wearing one (docs/ferme.md 26 and 27)
// -----------------------------------------------
// A building wears the building styles: a shop style is bought once for a kind of building (every copy of the Mill
// then may wear it); a treasure style is owned as soon as it is in the album, by every building. A decoration wears
// its own decoration styles, owned once in the album, by every copy of it.

/** Why an object cannot wear a style yet; null when it may. */
export type StyleRefusal =
  /** A shop style not sold yet at this level. */
  | 'locked'
  /** A style from the parcels not found yet. */
  | 'missing'
  /** A shop style sold now, not bought for this building. */
  | 'notBought';

/** The styles an object may ever wear, in the order shown: the building styles, or its decoration's own. */
export function stylesFor(type: PlaceableId): ObjectStyleId[] {
  if (isBuilding(type)) return [...STYLE_IDS];
  return decorStylesOf(type).map((s) => s.id);
}

/** Whether this kind of object has any style to show (the Style button). */
export function hasStyles(type: PlaceableId): boolean {
  return stylesFor(type).length > 0;
}

/** `type` must be able to wear `id` (stylesFor): the refusal says only whether it is owned yet. */
export function styleRefusal(save: FarmSave, type: PlaceableId, id: ObjectStyleId): StyleRefusal | null {
  if (isDecorStyle(id)) return save.album.includes(id) ? null : 'missing';
  const s = style(id);
  if (isTreasureStyle(s)) return save.album.includes(id) ? null : 'missing';
  if (isBuilding(type) && save.boughtStyles[type]?.includes(id)) return null;
  return isUnlocked(save, s.unlock!) ? 'notBought' : 'locked';
}

/** Buys a shop style for a kind of building; false when it is not for sale, already bought, or too dear. */
export function buyStyle(save: FarmSave, building: BuildingId, id: StyleId): boolean {
  if (styleRefusal(save, building, id) !== 'notBought' || !spend(save, stylePrice(building))) return false;
  (save.boughtStyles[building] ??= []).push(id);
  emit(save, { type: 'buy', target: `style:${id}`, kind: 'style', count: 1 });
  return true;
}

/** Dresses an object in a style it owns, or back in its own look (null); false when it may not. */
export function wearStyle(save: FarmSave, object: PlacedObject, id: ObjectStyleId | null): boolean {
  if (!hasStyles(object.type)) return false;
  if (id === null) {
    delete object.style;
    return true;
  }
  if (!fitsStyle(object.type, id) || styleRefusal(save, object.type, id) !== null) return false;
  object.style = id;
  return true;
}
