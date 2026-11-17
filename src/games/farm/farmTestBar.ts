import { el } from '../../dom';
import { xpToNext } from './data/levels';
import { ANIMALS } from './data/animals';
import { ITEM_IDS } from './data/items';
import type { BoosterId } from './data/types';
import { CRIES } from './farmCries';
import { gainXp, have } from './farmProgress';
import type { FarmSave } from './farmSave';
import type { FarmScene } from './farmScene';
import { MINUTE_MS } from './farmTime';

// -----------------------------------------------
// TEST-BUTTONS: shortcuts to check the farm without waiting (MINUTE_MS is a second)
// -----------------------------------------------
// Shown only while CASINO_TEST_BUTTONS is true, never in a published build.

export interface TestBarHost {
  readonly save: FarmSave;
  readonly scene: FarmScene;
  act(action: () => void): void;
  toast(text: string): void;
}

export function testBar(host: TestBarHost): HTMLElement {
  const { save } = host;
  const button = (label: string, action: () => void) => {
    const b = el('button', { type: 'button', text: label });
    b.addEventListener('click', () => host.act(action));
    return b;
  };
  return el(
    'div',
    { class: 'farm-test' },
    el('b', { text: `TEST · 1 min = ${MINUTE_MS / 1000} s` }),
    button('+500 Éloisettes', () => (save.nuts += 500)),
    button('+1 niveau', () => gainXp(save, Math.max(0, (xpToNext(save.level) ?? 0) - save.xp))),
    button('+3 boosters', () => {
      for (const id of Object.keys(save.boosters) as BoosterId[]) save.boosters[id] += 3;
    }),
    button('Tout est prêt', () => {
      const now = Date.now();
      for (const o of save.objects) {
        if (o.readyAt !== undefined) o.readyAt = Math.min(o.readyAt, now);
        if (o.queue) for (const j of o.queue) j.readyAt = Math.min(j.readyAt, now);
      }
      save.orderWaits = save.orderWaits.map(() => now);
      save.cart.nextAt = Math.min(save.cart.nextAt, now);
    }),
    button('+5 colis', () => (save.mail.waiting += 5)),
    button('Heure +3 h', () => {
      host.scene.hourOffset = (host.scene.hourOffset + 3) % 24;
      host.toast(`Heure affichée : ${(new Date().getHours() + host.scene.hourOffset) % 24} h`);
    }),
    button('+10 de chaque produit', () => {
      for (const id of ITEM_IDS) save.stock[id] = have(save, id) + 10;
    }),
    // To hear every animal once, one after the other.
    button('Cris des animaux', () => {
      ANIMALS.forEach((a, i) => window.setTimeout(() => {
        CRIES[a.id]();
        host.toast(a.name);
      }, i * 1100));
    }),
  );
}
