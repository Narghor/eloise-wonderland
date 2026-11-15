import { el } from '../../dom';
import { person } from './data/people';
import type { PersonId } from './data/types';
import { faceSprite, spriteImage } from './farmArt';

// -----------------------------------------------
// THE GATE CALL: villagers wait at the gate while it is out of sight
// -----------------------------------------------
// A pill at the edge of the view, on the gate's side; touching it brings the gate into view.
// It says its sentence for a few seconds when someone arrives, then shrinks to a face, a count and an arrow:
// it sits on the map for as long as they wait, so it must not hide the farm.

/** The part of the map really seen, in pixels from the farm's top: between the top bar and the bottom bar. */
export interface Band {
  top: number;
  bottom: number;
}

const ARROWS = { up: '▲', down: '▼', left: '◀', right: '▶' } as const;
/** How long the whole sentence shows when a villager arrives. */
const ANNOUNCE_MS = 4000;

export class FarmGateCall {
  readonly el = el('button', { class: 'farm-gate-call farm-box is-compact', type: 'button' });
  private shown = '';
  /** Villagers waiting at the last frame, seen or not: one more is an arrival. */
  private lastCount = 0;
  private announceUntil = 0;

  constructor(onTap: () => void) {
    this.el.hidden = true;
    this.el.addEventListener('click', onTap);
  }

  /** Every frame: shown while someone waits and the gate (`gate`, on the screen) is outside the band. */
  follow(waiting: PersonId[], gate: { x: number; y: number }, band: Band, width: number, allowed: boolean): void {
    const now = performance.now();
    if (waiting.length > this.lastCount) this.announceUntil = now + ANNOUNCE_MS;
    this.lastCount = waiting.length;
    const above = gate.y < band.top;
    const below = gate.y > band.bottom;
    const aside = gate.x < 0 || gate.x > width;
    if (!allowed || waiting.length === 0 || !(above || below || aside)) {
      this.el.hidden = true;
      return;
    }
    const arrow = above ? ARROWS.up : below ? ARROWS.down : gate.x < 0 ? ARROWS.left : ARROWS.right;
    const key = `${waiting.join(',')}|${arrow}`;
    if (key !== this.shown) {
      this.shown = key;
      const name = person(waiting[0]).name;
      const text = waiting.length === 1 ? `${name} t’attend à l’entrée` : `${waiting.length} villageois t’attendent à l’entrée`;
      this.el.setAttribute('aria-label', text);
      this.el.title = text;
      this.el.replaceChildren(
        el('span', { class: 'farm-face' }, spriteImage(faceSprite(waiting[0]), 2, name)),
        el('span', { class: 'farm-count is-neutral', text: waiting.length > 1 ? `${waiting.length}` : '' }),
        el('span', { class: 'farm-gate-text', text }),
        el('b', { class: 'farm-gate-arrow', text: arrow, 'aria-hidden': 'true' }),
      );
    }
    this.el.classList.toggle('is-compact', now >= this.announceUntil);
    this.el.hidden = false;
    const half = this.el.offsetWidth / 2;
    this.el.classList.toggle('is-top', above);
    this.el.style.left = `${Math.round(Math.min(Math.max(gate.x, half + 8), width - half - 8))}px`;
    this.el.style.top = `${Math.round(above ? band.top : band.bottom)}px`;
  }
}
