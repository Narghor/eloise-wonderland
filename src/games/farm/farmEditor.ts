import { el } from '../../dom';
import { playThunk } from '../casino/fx/sound';
import { placeable } from './data/placeables';
import { skin } from './data/skins';
import { chosenSkin, lockedSkin, nextSkin, restyleRun, skinOf } from './farmJoins';
import { unlockText } from './farmProgress';
import type { PlaceableId } from './data/types';
import { spriteImage, uiIcon } from './farmArt';
import type { FarmHud } from './farmHud';
import { buyAndPlace, buyRefusal, canMove, canStand, canStore, footprint, freeSpotNear, moveObject, storeObject } from './farmMap';
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
    this.showBanner(`Aménager : touche un objet pour le déplacer, le tourner ou le ranger. ${charmLine(host.save)}`, 'Fini', () => this.exit());
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
    this.renderTools();
  }

  /** A touch on the map while editing: placing moves the ghost there, editing picks the object touched. */
  tap(target: PlacedObject | { parcel: number } | null, tile: [number, number]): void {
    const ghost = this.host.scene.ghost;
    if (this.placing && ghost) {
      const [w, h] = footprint(ghost);
      ghost.x = Math.max(0, tile[0] - Math.floor(w / 2));
      ghost.y = Math.max(0, tile[1] - Math.floor(h / 2));
      this.renderTools();
      return;
    }
    if (target && 'uid' in target) this.select(target);
    else this.applySelection();
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
    host.scene.ghost = { type: id, x: spot[0], y: spot[1], rot: 0, ...(p.joins ? { skin: chosenSkin(host.save, p.joins) } : {}) };
    host.scene.editMode = true;
    host.hud.setEditing(true);
    this.placedInRow = 0;
    // The way out sits with the ghost's buttons, where the thumb already is.
    this.showBanner(`Fais glisser : ${p.name.toLowerCase()}, ou touche l’endroit choisi.`);
    this.renderTools();
  }

  ghostFits(ghost: Ghost): boolean {
    const { save } = this.host;
    const [w, h] = footprint(ghost);
    const self = ghost.uid !== undefined ? save.objects.find((o) => o.uid === ghost.uid) : undefined;
    return canStand(save, ghost.x, ghost.y, w, h, self);
  }

  /** Every frame: the tool buttons follow the ghost. */
  follow(box: DOMRect): void {
    const ghost = this.host.scene.ghost;
    if (!this.tools || !ghost) return;
    const a = this.host.scene.anchorOf(ghost);
    const w = this.tools.offsetWidth;
    const x = Math.min(Math.max(a.x, w / 2 + 8), box.width - w / 2 - 8);
    const y = Math.min(a.bottom, box.height - 150);
    this.tools.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, 12px)`;
  }

  /** The buttons under the ghost: turn (or change style), store, buy or OK. */
  renderTools(): void {
    const { host } = this;
    this.tools?.remove();
    this.tools = null;
    const ghost = host.scene.ghost;
    if (!ghost) return;
    const buttons: HTMLElement[] = [placeable(ghost.type).joins ? this.styleButton(ghost) : this.turnButton(ghost)];
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
          storeObject(host.save, object);
          playThunk();
          host.toast(`${placeable(object.type).name} : rangé, à reposer depuis la Boutique.`);
          this.renderTools();
          host.commit();
        });
        buttons.push(store);
      }
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
    const current = ghost.skin ?? chosenSkin(host.save, family);
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

  /** The hint at the top; with a button only when nothing under the map offers the way out. */
  private showBanner(text: string, done?: string, onDone?: () => void): void {
    this.banner?.remove();
    const parts: HTMLElement[] = [el('p', { text })];
    if (done && onDone) {
      const b = el('button', { class: 'farm-btn', type: 'button', text: done });
      b.addEventListener('click', onDone);
      parts.push(b);
    }
    this.banner = el('div', { class: 'farm-edit-banner farm-box' }, ...parts);
    this.host.overlay.append(this.banner);
  }

  private select(object: PlacedObject): void {
    const { scene } = this.host;
    this.applySelection();
    if (!canMove(object)) return this.host.toast('Un obstacle ne se déplace pas : il se dégage (touche-le hors du mode Aménager).');
    const worn = skinOf(object);
    scene.ghost = { type: object.type, x: object.x, y: object.y, rot: object.rot, uid: object.uid, ...(worn ? { skin: worn } : {}) };
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
    if (object && (ghost.x !== object.x || ghost.y !== object.y || ghost.rot !== object.rot)) {
      if (moveObject(host.save, object, ghost.x, ghost.y, ghost.rot)) {
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
    const placed = buyAndPlace(host.save, id, ghost.x, ghost.y, ghost.rot, Date.now());
    if (!placed) return host.toast('Pas assez d’Éloisettes.');
    playThunk();
    this.placedInRow++;
    host.commit();
    // Fields and decorations often come in rows: offer the next one right beside.
    const p = placeable(id);
    const again = (p.kind === 'field' || p.kind === 'deco') && ((p.kind === 'deco' && this.storedCount(id) > 0) || buyRefusal(host.save, p) === null);
    const [w, h] = footprint(ghost);
    const next = again ? freeSpotNear(host.save, ghost.x + w + w / 2, ghost.y + h / 2, w, h) : null;
    if (next) {
      ghost.x = next[0];
      ghost.y = next[1];
      this.renderTools();
    } else this.exit();
  }

  /** Decorations put away (or found in a parcel) waiting to be placed again. */
  private storedCount(id: PlaceableId): number {
    return placeable(id).kind === 'deco' ? this.host.save.decorStore[id as keyof FarmSave['decorStore']] ?? 0 : 0;
  }
}
