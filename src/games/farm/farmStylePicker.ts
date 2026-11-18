import { el } from '../../dom';
import { playCoinLand, playPop } from '../casino/fx/sound';
import { rarityName, TREASURES } from './data/parcels';
import { isBuilding, placeable } from './data/placeables';
import { decorStyle, isDecorStyle, style, stylePrice } from './data/styles';
import type { BuildingId, DecorStyleId, ObjectStyleId } from './data/types';
import { objectSprite, spriteImage, uiIcon } from './farmArt';
import { unlockText } from './farmProgress';
import type { FarmSave, PlacedObject } from './farmSave';
import { buyStyle, styleRefusal, stylesFor, wearStyle } from './farmStyles';

// -----------------------------------------------
// THE STYLE OF A BUILDING OR A DECORATION: look at each one on it, then wear it or buy it (docs/ferme.md 26, 27)
// -----------------------------------------------
// Touching a tile only shows the object in that style; the button under the tiles wears or buys it, and closes.

/** Where to find the styles, said in the parcel that brings one and in the shop. */
export const STYLE_HOW = 'Pour changer le style d’un bâtiment : Aménager, touche-le, puis Style.';

/** Where to wear a decoration style, said in the parcel that brings it. */
export function decorStyleHow(id: DecorStyleId): string {
  return `Pour l’essayer : Aménager, touche la déco « ${placeable(decorStyle(id).decor).name} », puis Style.`;
}

/** null: the object as drawn. */
type Choice = ObjectStyleId | null;
/** What wears a style: a machine, a pen or a decoration, as farmArt draws it. */
type Dressed = Parameters<typeof objectSprite>[0];

/** The level a shop style is sold from; null for the styles of the parcels. */
function shopUnlock(id: ObjectStyleId): string | null {
  if (isDecorStyle(id)) return null;
  const unlock = style(id).unlock;
  return unlock ? unlockText(unlock) : null;
}

/**
 * The card for `dialogs.show`: `changed` runs after the object was dressed or a style bought (save it, redraw).
 */
export function styleCard(save: FarmSave, object: PlacedObject, changed: () => void): HTMLElement {
  const box = el('div', { class: 'farm-dialog-box farm-box farm-style-picker' });
  const render = (chosen: Choice) => box.replaceChildren(...cardContent(save, object, chosen, render, changed));
  render(object.style ?? null);
  return box;
}

function cardContent(save: FarmSave, object: PlacedObject, chosen: Choice, render: (c: Choice) => void, changed: () => void): Node[] {
  const type = object.type as Dressed;
  const name = placeable(type).name;
  const preview = objectSprite(type, 'face', chosen ?? undefined);
  const tiles = [null, ...stylesFor(type)].map((id) => tile(save, object, id, id === chosen, () => render(id)));
  const note = isBuilding(type)
    ? 'Acheté, il habille chaque exemplaire de ce bâtiment. Trouvé dans un colis, il va sur tous les bâtiments.'
    : 'Trouvé dans un colis, il habille chaque exemplaire de cette déco.';
  return [
    el('h2', { text: `Style : ${name}` }),
    el('div', { class: 'farm-style-preview' }, spriteImage(preview, Math.max(1, Math.min(isBuilding(type) ? 2 : 4, Math.floor(110 / preview.height))), name)),
    el('div', { class: 'farm-style-tiles' }, ...tiles),
    el('p', { class: 'farm-note', text: note }),
    actionButton(save, object, chosen, changed),
    el('button', { class: 'farm-btn is-wide is-ghost', type: 'button', text: 'Fermer' }),
  ];
}

/** A style's own name on its tile: "Chalet" for a building, "Roses bleues" for a decoration. */
function tileName(id: ObjectStyleId): string {
  return isDecorStyle(id) ? decorStyle(id).name : style(id).name;
}

/** One style on this object: its little picture, its name, and where it stands (worn, owned, price, how to get it). */
function tile(save: FarmSave, object: PlacedObject, id: Choice, isChosen: boolean, choose: () => void): HTMLElement {
  const type = object.type as Dressed;
  const worn = object.style ?? null;
  const refusal = id === null ? null : styleRefusal(save, type, id);
  const status = id === worn ? 'Porté' : id === null ? '' : refusal === null ? 'À toi' : refusal === 'notBought' ? null : refusal === 'locked' ? shopUnlock(id) : rarityName(TREASURES.find((t) => t.id === id)!.rarity);
  const sprite = objectSprite(type, 'face', id ?? undefined);
  const button = el(
    'button',
    { class: `farm-item farm-style-tile${isChosen ? ' is-chosen' : ''}${refusal === 'locked' || refusal === 'missing' ? ' is-locked' : ''}`, type: 'button' },
    el('div', { class: 'farm-art' }, spriteImage(sprite, isBuilding(type) ? 1 : Math.max(1, Math.min(2, Math.floor(44 / sprite.height))))),
    el('span', { text: id === null ? 'D’origine' : tileName(id) }),
    status !== null ? el('small', { text: status }) : el('span', { class: 'farm-price' }, String(stylePrice(type as BuildingId)), spriteImage(uiIcon('nut'), 1, 'Éloisettes')),
  );
  button.addEventListener('click', () => {
    playPop();
    choose();
  });
  return button;
}

/** Wear it, buy it, or say why not; a disabled button never closes the card. */
function actionButton(save: FarmSave, object: PlacedObject, chosen: Choice, changed: () => void): HTMLElement {
  const make = (text: string, act?: () => void) => {
    const b = el('button', { class: 'farm-btn is-wide', type: 'button', text, ...(act ? {} : { disabled: '' }) });
    if (act) b.addEventListener('click', act);
    return b;
  };
  if (chosen === (object.style ?? null)) return make(isBuilding(object.type) ? 'Il porte déjà ce style' : 'Elle porte déjà ce style');
  const refusal = chosen === null ? null : styleRefusal(save, object.type, chosen);
  if (refusal === null) {
    return make('Porter ce style', () => {
      wearStyle(save, object, chosen);
      changed();
    });
  }
  if (refusal === 'locked') return make(`En vente au ${shopUnlock(chosen!)}`);
  if (refusal === 'missing' || chosen === null || isDecorStyle(chosen)) return make('À trouver dans les colis de Gaston');
  const building = object.type as BuildingId;
  const cost = stylePrice(building);
  if (save.nuts < cost) return make(`Il te manque ${cost - save.nuts} Éloisettes`);
  return make(`Acheter et porter · ${cost} Éloisettes`, () => {
    buyStyle(save, building, chosen);
    wearStyle(save, object, chosen);
    playCoinLand('big');
    changed();
  });
}
