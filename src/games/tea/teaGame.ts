import { el, topBar, type BackLink } from '../../dom';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { difficultyName, type Difficulty } from '../../difficulty';
import { levelReward } from '../../companion/reward';
import { TEA_HELP } from './teaHelp';
import {
  ADDONS,
  ADDON_IDS,
  PASTRIES,
  PASTRY_IDS,
  SERVICE_SECONDS,
  Service,
  TEAS,
  TEA_TIERS,
  makeSchedule,
  scoreOf,
  starsFor,
  type AddonId,
  type Order,
  type PastryId,
  type TeaEvent,
  type Tray,
} from './teaLogic';
import { saveTea, type TeaSave } from './teaSave';

const BACK_TEA: BackLink = { href: '#/salon', label: 'Salon' };

/** A frame longer than this (tab switch, slow phone) does not fast-forward the service. */
const MAX_STEP = 0.1;

export interface TeaGameActions {
  nextService(): void;
}

interface SpotView {
  button: HTMLButtonElement;
  look: HTMLElement;
  bubble: HTMLElement;
  bar: HTMLElement;
  /** Customer id shown, to rebuild the bubble only when someone new sits. */
  shown: number;
}

interface PotView {
  button: HTMLButtonElement;
  state: HTMLElement;
  fill: HTMLElement;
}

export class TeaGame {
  private readonly service: Service;
  private readonly clock = el('strong', { class: 'tea-clock' });
  private readonly stats = el('span', { class: 'tea-stats', role: 'status' });
  private readonly pauseNote = el('p', { class: 'tea-pause', text: 'Pause' });
  private readonly spotViews: SpotView[] = [];
  private readonly potViews: PotView[] = [];
  private readonly addonButtons = new Map<AddonId, HTMLButtonElement>();
  private readonly pastryButtons = new Map<PastryId, HTMLButtonElement>();
  private readonly trayView = el('div', { class: 'tea-tray-items' });
  private readonly board: HTMLElement;
  private readonly result = el('section', { class: 'tea-result' });
  private trayKey = '';
  private frame = 0;
  private last = 0;
  private finished = false;

  constructor(
    root: HTMLElement,
    private readonly save: TeaSave,
    private readonly difficulty: Difficulty,
    seed: number,
    private readonly challenge: string | undefined,
    private readonly actions: TeaGameActions,
  ) {
    const tier = TEA_TIERS[difficulty];
    this.service = new Service(tier, makeSchedule(tier, seed));

    const spots = el('div', { class: `tea-spots is-${tier.spots}` });
    this.service.spots.forEach((_, index) => {
      const look = el('span', { class: 'tea-look' });
      const bubble = el('span', { class: 'tea-bubble' });
      const bar = el('span', { class: 'tea-patience-fill' });
      const button = el('button', { class: 'tea-spot', type: 'button' }, bubble, look, el('span', { class: 'tea-patience' }, bar));
      button.addEventListener('click', () => this.serve(index));
      spots.append(button);
      this.spotViews.push({ button, look, bubble, bar, shown: -1 });
    });

    const pots = el('div', { class: 'tea-row', role: 'group', 'aria-label': 'Théières' });
    this.service.pots.forEach((pot, index) => {
      const state = el('span', { class: 'tea-pot-state' });
      const fill = el('span', { class: 'tea-pot-fill' });
      const button = el(
        'button',
        { class: 'tea-station tea-pot', type: 'button', style: `--tea:${TEAS[pot.tea].color};--tea-ink:${TEAS[pot.tea].ink}` },
        el('span', { class: 'tea-pot-badge', text: TEAS[pot.tea].emoji }),
        el('span', { class: 'tea-pot-name', text: TEAS[pot.tea].label }),
        state,
        el('span', { class: 'tea-pot-bar' }, fill),
      );
      button.addEventListener('click', () => this.act(() => this.service.usePot(index)));
      pots.append(button);
      this.potViews.push({ button, state, fill });
    });

    const extras = el('div', { class: 'tea-row', role: 'group', 'aria-label': 'Suppléments et pâtisseries' });
    for (const addon of ADDON_IDS.slice(0, tier.addonKinds)) {
      const button = stationButton(ADDONS[addon].emoji, ADDONS[addon].label);
      button.addEventListener('click', () => this.act(() => (this.service.toggleAddon(addon), true)));
      this.addonButtons.set(addon, button);
      extras.append(button);
    }
    for (const pastry of PASTRY_IDS.slice(0, tier.pastries)) {
      const button = stationButton(PASTRIES[pastry].emoji, PASTRIES[pastry].label);
      button.addEventListener('click', () => this.act(() => (this.service.togglePastry(pastry), true)));
      this.pastryButtons.set(pastry, button);
      extras.append(button);
    }

    const clear = el('button', { class: 'button button-secondary tea-clear', type: 'button' }, 'Vider');
    clear.addEventListener('click', () => this.act(() => (this.service.clearTray(), true)));
    const tray = el('div', { class: 'tea-tray' }, el('span', { class: 'tea-tray-label', text: 'Plateau' }), this.trayView, clear);

    this.board = el('div', { class: 'tea-board' }, spots, tray, pots, ...(extras.childElementCount ? [extras] : []));
    root.append(
      el(
        'div',
        { class: 'tea-game' },
        topBar(`Salon de thé · ${challenge ? 'Défi du jour' : difficultyName(difficulty)}`, helpSlot(TEA_HELP), BACK_TEA),
        el('div', { class: 'tea-hud' }, this.clock, this.stats),
        this.pauseNote,
        this.board,
        this.result,
      ),
    );
    this.render();
    openHelpOnFirstVisit(TEA_HELP);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.frame = requestAnimationFrame(this.tick);
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  // -----------------------------------------------
  // CLOCK
  // -----------------------------------------------

  /** Any open dialog (the help) or a hidden page stops time. */
  private get paused(): boolean {
    return document.hidden || document.querySelector('dialog[open]') !== null;
  }

  private readonly onVisibility = (): void => {
    this.last = 0;
  };

  private readonly tick = (now: number): void => {
    if (this.finished) return;
    this.frame = requestAnimationFrame(this.tick);
    const paused = this.paused;
    this.pauseNote.classList.toggle('is-visible', paused);
    if (paused || this.last === 0) {
      this.last = paused ? 0 : now;
      return;
    }
    const dt = Math.min(MAX_STEP, (now - this.last) / 1000);
    this.last = now;
    this.service.update(dt).forEach((event) => this.feedback(event));
    this.render();
    if (this.service.over) this.finish();
  };

  // -----------------------------------------------
  // ACTIONS
  // -----------------------------------------------

  private act(action: () => boolean): void {
    if (this.finished || this.paused) return;
    if (action()) buzz(8);
    this.render();
  }

  private serve(spot: number): void {
    if (this.finished || this.paused) return;
    const event = this.service.serve(spot);
    if (event) this.feedback(event);
    this.render();
  }

  private feedback(event: TeaEvent): void {
    if (event.type === 'served') {
      buzz(20);
      this.flash(event.spot, 'is-happy', event.tip > 0 ? `+${event.tip} 🪙` : '💖');
    } else if (event.type === 'wrong' || event.type === 'left') {
      buzz([40, 40, 40]);
      if (event.spot >= 0) this.flash(event.spot, 'is-sad', event.type === 'wrong' ? '😣' : '💢');
    } else if (event.type === 'ready') {
      buzz(10);
    }
  }

  /** A short mark floating over a spot after a customer leaves it. */
  private flash(spot: number, kind: string, text: string): void {
    const view = this.spotViews[spot];
    const mark = el('span', { class: `tea-flash ${kind}`, text });
    view.button.append(mark);
    mark.addEventListener('animationend', () => mark.remove());
  }

  // -----------------------------------------------
  // DRAWING (elements built once, only updated here)
  // -----------------------------------------------

  private render(): void {
    const { service } = this;
    const left = Math.max(0, SERVICE_SECONDS - service.time);
    this.clock.textContent = left > 0 ? `⏱ ${Math.ceil(left)} s` : 'Dernières commandes';
    const queue = service.queue;
    this.stats.textContent = `Servis ${service.served} · Partis ${service.mistakes} · ${service.tips} 🪙${queue ? ` · ${queue} à la porte` : ''}`;

    service.spots.forEach((customer, index) => {
      const view = this.spotViews[index];
      view.button.classList.toggle('is-empty', !customer);
      if (!customer) {
        if (view.shown !== -1) {
          view.shown = -1;
          view.look.textContent = '🪑';
          view.bubble.replaceChildren();
        }
        return;
      }
      if (view.shown !== customer.id) {
        view.shown = customer.id;
        view.look.textContent = customer.look;
        view.bubble.replaceChildren(...orderParts(customer.order));
        view.button.setAttribute('aria-label', `Servir : ${orderText(customer.order)}`);
      }
      const ratio = customer.patience / service.tier.patience;
      view.bar.style.width = `${Math.max(0, ratio * 100)}%`;
      view.bar.classList.toggle('is-low', ratio < 0.3);
    });

    service.pots.forEach((pot, index) => {
      const view = this.potViews[index];
      const steeping = pot.steeping > 0;
      view.state.textContent = steeping ? 'Infuse…' : pot.cups === 0 ? 'Vide' : `Prêt ×${pot.cups}`;
      view.fill.style.width = steeping ? `${(1 - pot.steeping / service.tier.steep) * 100}%` : pot.cups > 0 ? '100%' : '0%';
      view.button.classList.toggle('is-ready', !steeping && pot.cups > 0);
      view.button.classList.toggle('is-steeping', steeping);
    });

    const key = trayKey(service.tray);
    if (key !== this.trayKey) {
      this.trayKey = key;
      this.trayView.replaceChildren(...trayParts(service.tray));
      this.addonButtons.forEach((button, addon) => button.classList.toggle('is-on', service.tray.addons.includes(addon)));
      this.pastryButtons.forEach((button, pastry) => button.classList.toggle('is-on', service.tray.pastry === pastry));
    }
  }

  // -----------------------------------------------
  // END OF SERVICE
  // -----------------------------------------------

  private finish(): void {
    this.finished = true;
    const { served, total, tips } = this.service;
    const stars = starsFor(served, total);
    const score = scoreOf(served, tips);
    const record = score > this.save.best[this.difficulty];
    this.save.servicesDone++;
    if (record) this.save.best[this.difficulty] = score;
    if (this.challenge && stars > 0) this.save.challenge = undefined;
    saveTea(this.save);

    const again = el('button', { class: 'button', type: 'button' }, this.challenge && stars === 0 ? 'Retenter le défi' : 'Nouveau service');
    again.addEventListener('click', () => this.actions.nextService());
    this.board.classList.add('is-done');
    this.result.replaceChildren(
      el('h2', { text: stars === 0 ? 'Service difficile…' : 'Fin du service !' }),
      el(
        'p',
        { class: 'tea-result-line' },
        el('strong', { text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }),
        ` ${served} client${served > 1 ? 's' : ''} servi${served > 1 ? 's' : ''} sur ${total}, ${tips} 🪙 de pourboires.`,
      ),
      el('p', { class: 'tea-result-line', text: record ? `Score ${score} : nouveau record !` : `Score ${score} · record ${this.save.best[this.difficulty]}` }),
      ...(stars > 0 ? [levelReward(stars, this.difficulty, this.challenge)] : [el('p', { class: 'tea-result-line', text: 'Sers au moins la moitié des clients pour gagner une étoile.' })]),
      el('div', { class: 'button-row' }, again, el('a', { class: 'button button-secondary', href: '#/salon' }, 'Menu')),
    );
    this.result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    buzz(stars > 0 ? [30, 60, 30] : 60);
  }
}

// -----------------------------------------------
// HELPERS
// -----------------------------------------------

function stationButton(emoji: string, label: string): HTMLButtonElement {
  return el('button', { class: 'tea-station', type: 'button' }, el('span', { class: 'tea-emoji', text: emoji }), el('span', { text: label }));
}

function teaChip(tea: keyof typeof TEAS): HTMLElement {
  const { color, ink, emoji, label } = TEAS[tea];
  return el('span', { class: 'tea-chip', style: `background:${color};color:${ink}`, title: label }, `${emoji} ${label}`);
}

function orderParts(order: Order): (HTMLElement | string)[] {
  return [
    teaChip(order.tea),
    ...order.addons.map((addon) => el('span', { class: 'tea-emoji', title: ADDONS[addon].label, text: ADDONS[addon].emoji })),
    ...(order.pastry ? [el('span', { class: 'tea-emoji', title: PASTRIES[order.pastry].label, text: PASTRIES[order.pastry].emoji })] : []),
  ];
}

function orderText(order: Order): string {
  return [TEAS[order.tea].label, ...order.addons.map((addon) => ADDONS[addon].label), ...(order.pastry ? [PASTRIES[order.pastry].label] : [])].join(', ');
}

function trayKey(tray: Tray): string {
  return `${tray.tea}|${[...tray.addons].sort().join(',')}|${tray.pastry}`;
}

function trayParts(tray: Tray): (HTMLElement | string)[] {
  if (!tray.tea && tray.addons.length === 0 && !tray.pastry) return [el('span', { class: 'tea-tray-empty', text: 'vide' })];
  return [
    tray.tea ? teaChip(tray.tea) : el('span', { class: 'tea-chip is-missing', text: 'pas de thé' }),
    ...tray.addons.map((addon) => el('span', { class: 'tea-emoji', text: ADDONS[addon].emoji })),
    ...(tray.pastry ? [el('span', { class: 'tea-emoji', text: PASTRIES[tray.pastry].emoji })] : []),
  ];
}

function buzz(pattern: number | number[]): void {
  if (typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
}
