import { el } from '../../dom';
import { playThunk } from '../casino/fx/sound';
import { placeable } from './data/placeables';
import { skin, skinsOf } from './data/skins';
import { chosenSkin, lockedSkin, nextSkin, restyleRun, skinOf } from './farmJoins';
import { unlockText } from './farmProgress';
import type { PlaceableId } from './data/types';
import { spriteImage, uiIcon } from './farmArt';
import type { FarmDialogs } from './farmDialogs';
import type { FarmHud } from './farmHud';
import { styleCard } from './farmStylePicker';
import { hasStyles } from './farmStyles';
import {
  buyAndPlace, buyRefusal, canMove, canPerch, canStand, canStore, carriedBy, footprint, freePerchNear, freeSpotNear, moveObject, perchAt, storeObject,
} from './farmMap';

/** After a decoration sat on a support, the next free support within this many tiles gets the next ghost. */
const NEXT_PERCH_REACH = 4;
import { charmLine } from './farmPanels';
import type { FarmSave, PlacedObject } from './farmSave';
import type { FarmScene, Ghost } from './farmScene';

// -----------------------------------------------
// AMENAGER: move, turn and store what stands on the map; place what was just bought
// -----------------------------------------------
// The object being moved or placed is a ghost drawn by the scene; it only lands on the map when it fits.

/** What the editor needs from the screen. */
export interface EditorHost {
  readonly save: FarmSave;
  readonly scene: FarmScene;
  readonly hud: FarmHud;
  readonly overlay: HTMLElement;
  readonly dialogs: FarmDialogs;
  toast(text: string): void;
  commit(): void;
  /** Closes the bubble, the seed row and the sheet: editing takes the whole screen. */
  closePanels(): void;
}

export class FarmEditor {
  private readonly host: EditorHost;
  private editing = false;
  private placing: PlaceableId | null = null;
  /** Bought or placed since the shop: the way out then says "Fini", not "Annuler". */
  private placedInRow = 0;
  private banner: HTMLElement | null = null;
  /** The way out of Amenager, at the bottom where the thumb is (the hint stays at the top). */
  private done: HTMLElement | null = null;
  private tools: HTMLElement | null = null;

  constructor(host: EditorHost) {
    this.host = host;
  }

  /** In the Amenager mode, or placing something. */
  get isActive(): boolean {
    return this.editing || this.placing !== null;
  }

  /** In the Amenager mode itself (its button stays pressed). */
  get isEditing(): boolean {
    return this.editing;
  }

  toggle(): void {
    if (this.isActive) this.exit();
    else this.enter();
  }

  enter(): void {
    const { host } = this;
    host.closePanels();
    this.editing = true;
    host.scene.editMode = true;
    host.hud.setEditing(true);
    host.hud.setPressed('build');
    this.showBanner(`Aménager : touche un objet pour le déplacer, le tourner ou le ranger. ${charmLine(host.save)}`);
    this.done?.remove();
    this.done = el('button', { class: 'farm-btn farm-edit-done', type: 'button' }, spriteImage(uiIcon('check'), 2), 'Fini');
    this.done.addEventListener('click', () => this.exit());
    this.done.addEventListener('pointerdown', (e) => e.stopPropagation());
    host.overlay.append(this.done);
  }

  /** A long press on an object outside Amenager: opens it with that object picked, ready to drag. */
  arrange(object: PlacedObject): boolean {
    if (this.isActive || !canMove(object)) return false;
    this.enter();
    this.select(object);
    return this.host.scene.ghost?.uid === object.uid;
  }

  exit(): void {
    const { scene, hud } = this.host;
    this.applySelection();
    this.placing = null;
    this.editing = false;
    scene.ghost = null;
    scene.editMode = false;
    hud.setEditing(false);
    hud.setPressed(null);
    this.banner?.remove();
    this.banner = null;
    this.done?.remove();
    this.done = null;
    this.renderTools();
  }

  /** A touch on the map while editing: placing moves the ghost there, editing picks the object touched. */
  tap(target: PlacedObject | { parcel: number } | null, tile: [number, number]): void {
    const ghost = this.host.scene.ghost;
    if (this.placing && ghost) {
      const [w, h] = footprint(ghost);
      ghost.x = Math.max(0, tile[0] - Math.floor(w / 2));
      ghost.y = Math.max(0, tile[1] - Math.floor(h / 2));
      this.ghostMoved();
      return;
    }
    if (target && 'uid' in target) this.select(target);
    else this.applySelection();
  }

  /** The ghost reached a new tile (dragged or tapped). */
  ghostMoved(): void {
    const ghost = this.host.scene.ghost;
    if (ghost) this.snap(ghost);
    this.renderTools();
  }

  /** A decoration that perches sits on the free support under its tile; anywhere else it stands on the ground. */
  private snap(ghost: Ghost): void {
    if (!placeable(ghost.type).perches) return;
    const support = perchAt(this.host.save, ghost.type, ghost.x, ghost.y, this.objectOf(ghost));
    if (support) ghost.on = support.uid;
    else delete ghost.on;
  }

  /** The object a ghost moves, or undefined for a new one. */
  private objectOf(ghost: Ghost): PlacedObject | undefined {
    return ghost.uid !== undefined ? this.host.save.objects.find((o) => o.uid === ghost.uid) : undefined;
  }

  /** The support a ghost sits on, if any. */
  private supportOf(ghost: Ghost): PlacedObject | undefined {
    return ghost.on !== undefined ? this.host.save.objects.find((o) => o.uid === ghost.on) : undefined;
  }

  startPlacing(id: PlaceableId): void {
    const { host } = this;
    host.closePanels();
    this.applySelection();
    const p = placeable(id);
    const [cx, cy] = host.scene.viewCentre();
    const spot = freeSpotNear(host.save, cx, cy, p.size[0], p.size[1]);
    if (!spot) return host.toast('Plus de place libre : dégage la friche ou achète un terrain.');
    this.placing = id;
    const skin = p.joins ? chosenSkin(host.save, p.joins) : null;
    host.scene.ghost = { type: id, x: spot[0], y: spot[1], rot: 0, ...(skin ? { skin } : {}) };
    host.scene.editMode = true;
    host.hud.setEditing(true);
    this.placedInRow = 0;
    // The way out sits with the ghost's buttons, where the thumb already is.
    this.showBanner(`Fais glisser : ${p.name.toLowerCase()}, ou touche l’endroit choisi.`);
    this.renderTools();
  }

  ghostFits(ghost: Ghost): boolean {
    const { save } = this.host;
    const self = this.objectOf(ghost);
    if (ghost.on !== undefined) {
      const support = this.supportOf(ghost);
      return !!support && canPerch(save, ghost.type, support, self);
    }
    const [w, h] = footprint(ghost);
    return canStand(save, ghost.x, ghost.y, w, h, self);
  }

  /** Every frame: the tool buttons follow the ghost. */
  follow(box: DOMRect): void {
    const ghost = this.host.scene.ghost;
    if (!this.tools || !ghost) return;
    const a = this.host.scene.anchorOf(ghost);
    const w = this.tools.offsetWidth;
    const x = Math.min(Math.max(a.x, w / 2 + 8), box.width - w / 2 - 8);
    // Never over the Fini button: the tools stop just above it.
    const floor = this.done ? this.done.offsetTop - this.tools.offsetHeight - 20 : box.height - 150;
    const y = Math.min(a.bottom, box.height - 150, floor);
    this.tools.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, 12px)`;
  }

  /** The buttons under the ghost: turn (or change style), store, buy or OK. */
  renderTools(): void {
    const { host } = this;
    this.tools?.remove();
    this.tools = null;
    const ghost = host.scene.ghost;
    if (!ghost) return;
    // A joined piece is never turned: its shape comes from its neighbours; it changes style when its family has some.
    const family = placeable(ghost.type).joins;
    const buttons: HTMLElement[] = !family ? [this.turnButton(ghost)] : skinsOf(family).length > 0 ? [this.styleButton(ghost)] : [];
    if (this.placing) {
      const leave = el('button', { class: 'farm-btn is-ghost', type: 'button' }, spriteImage(uiIcon('cross'), 2), this.placedInRow > 0 ? 'Fini' : 'Annuler');
      leave.addEventListener('click', () => this.exit());
      buttons.unshift(leave);
      const ok = el('button', { class: 'farm-btn', type: 'button', ...(this.ghostFits(ghost) ? {} : { disabled: '' }) }, spriteImage(uiIcon('check'), 2), this.storedCount(this.placing) > 0 ? 'Poser' : 'Acheter');
      ok.addEventListener('click', () => this.place());
      buttons.push(ok);
    } else {
      const object = host.save.objects.find((o) => o.uid === ghost.uid);
      if (object && canStore(object)) {
        const store = el('button', { class: 'farm-btn is-ghost', type: 'button' }, spriteImage(uiIcon('store'), 2), 'Ranger');
        store.addEventListener('click', () => {
          host.scene.ghost = null;
          host.scene.selected = null;
          const carried = carriedBy(host.save, object);
          storeObject(host.save, object);
          playThunk();
          const names = carried ? `${placeable(object.type).name} et ${placeable(carried.type).name.toLowerCase()} : rangés` : `${placeable(object.type).name} : rangé`;
          host.toast(`${names}, à reposer depuis la Boutique.`);
          this.renderTools();
          host.commit();
        });
        buttons.push(store);
      }
      if (object && hasStyles(object.type)) buttons.push(this.styleCardButton(object, ghost));
      const ok = el('button', { class: 'farm-btn', type: 'button' }, spriteImage(uiIcon('check'), 2), 'OK');
      ok.addEventListener('click', () => this.applySelection());
      buttons.push(ok);
    }
    this.tools = el('div', { class: 'farm-edit-tools farm-box' }, ...buttons);
    this.tools.style.left = '0';
    this.tools.style.top = '0';
    this.tools.addEventListener('pointerdown', (e) => e.stopPropagation());
    host.overlay.append(this.tools);
  }

  private turnButton(ghost: Ghost): HTMLElement {
    const turn = el('button', { class: 'farm-btn is-ghost', type: 'button' }, spriteImage(uiIcon('rotate'), 2), 'Tourner');
    turn.addEventListener('click', () => {
      ghost.rot = ((ghost.rot + 1) % 4) as Ghost['rot'];
      this.renderTools();
    });
    return turn;
  }

  /**
   * A piece that joins is never turned: its button shows its style and goes to the next open one. On a piece of
   * the map, the whole run it belongs to changes at once; on a new one, the pieces bought next wear it too.
   */
  private styleButton(ghost: Ghost): HTMLElement {
    const { host } = this;
    const family = placeable(ghost.type).joins!;
    const current = (ghost.skin ?? chosenSkin(host.save, family))!;
    const button = el('button', { class: 'farm-btn is-ghost', type: 'button' }, spriteImage(uiIcon('brush'), 2), skin(current).name);
    button.addEventListener('click', () => {
      const next = nextSkin(host.save, family, current);
      if (!next) {
        const locked = lockedSkin(host.save, family);
        return host.toast(locked ? `${locked.name} : ${unlockText(locked.unlock)}.` : 'Un seul style pour l’instant.');
      }
      ghost.skin = next;
      const object = ghost.uid !== undefined ? host.save.objects.find((o) => o.uid === ghost.uid) : undefined;
      if (object) restyleRun(host.save, object, next);
      else host.save.lastSkins[family] = next;
      host.commit();
      this.renderTools();
    });
    return button;
  }

  /** A machine, a pen or a decoration that has styles: its styles to look at, wear or buy (farmStylePicker). */
  private styleCardButton(object: PlacedObject, ghost: Ghost): HTMLElement {
    const { host } = this;
    const button = el('button', { class: 'farm-btn is-ghost', type: 'button' }, spriteImage(uiIcon('brush'), 2), 'Style');
    button.addEventListener('click', () => {
      host.dialogs.show(() =>
        styleCard(host.save, object, () => {
          if (object.style) ghost.style = object.style;
          else delete ghost.style;
          host.commit();
        }),
      );
    });
    return button;
  }

  /** The hint at the top; the ways out sit lower, by the thumb (the Fini button, the ghost's Annuler). */
  private showBanner(text: string): void {
    this.banner?.remove();
    this.banner = el('div', { class: 'farm-edit-banner farm-box' }, el('p', { text }));
    this.host.overlay.append(this.banner);
  }

  private select(object: PlacedObject): void {
    const { scene } = this.host;
    this.applySelection();
    if (!canMove(object)) return this.host.toast('Un obstacle ne se déplace pas : il se dégage (touche-le hors du mode Aménager).');
    const worn = skinOf(object);
    scene.ghost = {
      type: object.type, x: object.x, y: object.y, rot: object.rot, uid: object.uid,
      ...(worn ? { skin: worn } : {}),
      ...(object.style ? { style: object.style } : {}),
      ...(object.on !== undefined ? { on: object.on } : {}),
    };
    scene.selected = object.uid;
    this.renderTools();
  }

  /** Puts the moved object where its ghost is, when it fits; otherwise it stays where it was. */
  private applySelection(): void {
    const { host } = this;
    const ghost = host.scene.ghost;
    if (!ghost || ghost.uid === undefined) return;
    const object = host.save.objects.find((o) => o.uid === ghost.uid);
    host.scene.ghost = null;
    host.scene.selected = null;
    // On a support, the support says where it is: the ghost's own tile does not count.
    const moved = object && (ghost.on !== object.on || ghost.rot !== object.rot || (ghost.on === undefined && (ghost.x !== object.x || ghost.y !== object.y)));
    if (object && moved) {
      if (moveObject(host.save, object, ghost.x, ghost.y, ghost.rot, this.supportOf(ghost))) {
        playThunk();
        host.commit();
      } else host.toast('Pas la place ici : il reste où il était.');
    }
    this.renderTools();
  }

  private place(): void {
    const { host } = this;
    const ghost = host.scene.ghost;
    const id = this.placing;
    if (!ghost || !id) return;
    if (!this.ghostFits(ghost)) return host.toast('Pas la place ici.');
    const support = this.supportOf(ghost);
    const placed = buyAndPlace(host.save, id, ghost.x, ghost.y, ghost.rot, Date.now(), support);
    if (!placed) return host.toast('Pas assez d’Éloisettes.');
    playThunk();
    this.placedInRow++;
    host.commit();
    // Fields and decorations often come in rows: offer the next one right beside (on the next free post, for a
    // decoration that sat on one).
    const p = placeable(id);
    const again = (p.kind === 'field' || p.kind === 'deco') && ((p.kind === 'deco' && this.storedCount(id) > 0) || buyRefusal(host.save, p) === null);
    const [w, h] = footprint(ghost);
    const nextPerch = again && support ? freePerchNear(host.save, id, support.x, support.y, NEXT_PERCH_REACH) : null;
    const next = nextPerch ? [nextPerch.x, nextPerch.y] : again ? freeSpotNear(host.save, ghost.x + w + w / 2, ghost.y + h / 2, w, h) : null;
    if (next) {
      ghost.x = next[0];
      ghost.y = next[1];
      this.ghostMoved();
    } else this.exit();
  }

  /** Decorations put away (or found in a parcel) waiting to be placed again. */
  private storedCount(id: PlaceableId): number {
    return placeable(id).kind === 'deco' ? this.host.save.decorStore[id as keyof FarmSave['decorStore']] ?? 0 : 0;
  }
}
