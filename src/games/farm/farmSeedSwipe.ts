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
// THE SEED ROW UNDER THE FINGER: sideways scrolls the row, up sows the fields crossed, a tap sows the chosen field
// -----------------------------------------------

/** Moved further than this, the press is a drag and its direction decides what it does. */
const DRAG_PX = 8;
/** The row keeps sliding after a flick, slower each frame, and stops below this speed (px per ms). */
const GLIDE_KEEP = 0.94;
const GLIDE_STOP = 0.02;

/** What a press in the seed row needs from the screen. */
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

/**
 * Follows a press in the seed row until it is lifted. `id` is the seed pressed when it can be sown, null on a locked
 * or too dear seed or between seeds: those can only scroll the row.
 */
export function pressSeedRow(host: SeedSwipeHost, row: HTMLElement, id: CropId | null, event: PointerEvent): void {
  const pointer = event.pointerId;
  (event.target as Element).releasePointerCapture?.(pointer);
  const start = { x: event.clientX, y: event.clientY };
  const startScroll = row.scrollLeft;
  let mode: 'press' | 'scroll' | 'sow' = 'press';
  let speed = 0;
  let lastMove = { x: start.x, at: event.timeStamp };
  const sowing = id ? sowingSwipe(host, id, start) : null;

  const move = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (mode === 'press') {
      if (Math.hypot(dx, dy) <= DRAG_PX) return;
      mode = Math.abs(dx) >= Math.abs(dy) || !sowing ? 'scroll' : 'sow';
    }
    if (mode === 'scroll') {
      row.scrollLeft = startScroll - dx;
      const dt = e.timeStamp - lastMove.at;
      if (dt > 0) speed = (e.clientX - lastMove.x) / dt;
      lastMove = { x: e.clientX, at: e.timeStamp };
    } else sowing!.move(e);
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    const cancelled = e.type === 'pointercancel';
    if (mode === 'scroll') {
      // A finger resting before it lifts leaves no flick.
      if (!cancelled && e.timeStamp - lastMove.at < 80) glide(row, speed);
    } else if (mode === 'sow') sowing!.end();
    else if (!cancelled && sowing) sowing.tap();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

/** Lets the row slide on after a flick, `speed` in px per ms. */
function glide(row: HTMLElement, speed: number): void {
  let v = speed;
  let last = performance.now();
  const step = (now: number) => {
    const dt = Math.min(50, now - last);
    last = now;
    const before = row.scrollLeft;
    row.scrollLeft -= v * dt;
    v *= Math.pow(GLIDE_KEEP, dt / 16);
    if (Math.abs(v) > GLIDE_STOP && row.scrollLeft !== before) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Sowing with seed `id`: a drag sows every empty field the finger crosses, a tap sows the chosen field. Saves once. */
function sowingSwipe(host: SeedSwipeHost, id: CropId, start: { x: number; y: number }) {
  const { save, feedback } = host;
  const held = spriteImage(itemIcon(id), 3);
  held.classList.add('farm-held');
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
  const finish = () => {
    if (where && spent > 0) feedback.float(feedback.screenOf(where), `−${spent}`, uiIcon('nut'));
    if (broke) feedback.toast('Plus assez d’Éloisettes pour semer.');
    host.commit();
  };
  return {
    move(e: PointerEvent): void {
      if (!held.isConnected) host.overlay.append(held);
      // The seed rides just above the finger, so the finger never hides it.
      const box = host.root.getBoundingClientRect();
      held.style.transform = `translate(${e.clientX - box.left - 18}px, ${e.clientY - box.top - 48}px)`;
      for (const field of host.scene.fieldsAlong(last, { x: e.clientX, y: e.clientY })) sowOne(field);
      last = { x: e.clientX, y: e.clientY };
    },
    end(): void {
      held.remove();
      finish();
    },
    tap(): void {
      const chosen = host.chosenField();
      if (chosen) sowOne(chosen);
      else feedback.toast('Fais glisser la graine sur un champ vide.');
      finish();
    },
  };
}
