import { playSeed } from '../casino/fx/sound';
import { crop } from './data/crops';
import type { CropId } from './data/types';
import { itemIcon, spriteImage, uiIcon } from './farmArt';
import type { FarmFeedback } from './farmFeedback';
import type { FarmHud } from './farmHud';
import { fieldState, sow } from './farmProduction';
import type { FarmSave, PlacedObject } from './farmSave';
import type { FarmScene } from './farmScene';

// -----------------------------------------------
// SOWING FROM THE SEED ROW: a tap sows the chosen field, a drag sows every empty field the finger crosses
// -----------------------------------------------

/** What a seed swipe needs from the screen. */
export interface SeedSwipeHost {
  readonly save: FarmSave;
  readonly root: HTMLElement;
  readonly overlay: HTMLElement;
  readonly scene: FarmScene;
  readonly hud: FarmHud;
  readonly feedback: FarmFeedback;
  /** The empty field touched to open the seed row, if any. */
  chosenField(): PlacedObject | null;
  commit(): void;
}

/** Follows the finger from a seed pressed in the row until it is lifted, then saves once. */
export function seedSwipe(host: SeedSwipeHost, id: CropId, event: PointerEvent): void {
  const { save, feedback } = host;
  const pointer = event.pointerId;
  (event.target as Element).releasePointerCapture?.(pointer);
  const start = { x: event.clientX, y: event.clientY };
  const held = spriteImage(itemIcon(id), 3);
  held.classList.add('farm-held');
  let swiping = false;
  let last = start;
  let step = 0;
  let spent = 0;
  let broke = false;
  let where: PlacedObject | null = null;
  const sowOne = (field: PlacedObject) => {
    if (fieldState(field, Date.now()) !== 'empty') return;
    if (!sow(save, field, id, Date.now())) {
      broke = save.nuts < crop(id).seed;
      return;
    }
    where = field;
    spent += crop(id).seed;
    playSeed(step++);
    host.hud.refresh(save);
  };
  const move = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    if (!swiping && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) {
      swiping = true;
      host.overlay.append(held);
    }
    if (!swiping) return;
    // The seed rides just above the finger, so the finger never hides it.
    const box = host.root.getBoundingClientRect();
    held.style.transform = `translate(${e.clientX - box.left - 18}px, ${e.clientY - box.top - 48}px)`;
    for (const field of host.scene.fieldsAlong(last, { x: e.clientX, y: e.clientY })) sowOne(field);
    last = { x: e.clientX, y: e.clientY };
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    held.remove();
    const chosen = host.chosenField();
    if (!swiping) {
      if (chosen) sowOne(chosen);
      else feedback.toast('Fais glisser la graine sur un champ vide.');
    }
    if (where && spent > 0) feedback.float(feedback.screenOf(where), `−${spent}`, uiIcon('nut'));
    if (broke) feedback.toast('Plus assez d’Éloisettes pour semer.');
    host.commit();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}
