import { el, topBar, type BackLink } from '../../dom';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { difficultyName } from '../../difficulty';
import { levelReward } from '../../companion/reward';
import { describe, generateOrder, judge, starsFor, type Order } from './bouquetOrder';
import { BOUQUET_HELP } from './bouquetHelp';
import { HEAD_SIZE, paintBouquet, paintStallFlower, slotPosition } from './bouquetPainter';
import { saveBouquet, type BouquetSave, type CurrentOrder } from './bouquetSave';
import { flowerName, type FlowerKey } from './flowers';

const BACK_BOUQUET: BackLink = { href: '#/bouquet', label: 'Bouquets' };
const STALL_ICON = 40;

export interface BouquetGameActions {
  nextOrder(): void;
}

export class BouquetGame {
  private readonly order: Order;
  private readonly canvas = el('canvas', { class: 'bouquet-canvas' });
  private readonly wishes: HTMLLIElement[];
  private readonly status = el('p', { class: 'bouquet-status', role: 'status' });
  private readonly controls: HTMLElement;
  private readonly removeButton: HTMLButtonElement;
  private selected = 0;
  private delivered = false;

  constructor(
    root: HTMLElement,
    private readonly save: BouquetSave,
    private readonly current: CurrentOrder,
    private readonly actions: BouquetGameActions,
  ) {
    this.order = generateOrder(current.seed, current.level);
    if (current.slots.length !== this.order.slots) current.slots = Array(this.order.slots).fill(null);
    this.selected = this.firstEmpty() ?? 0;

    this.wishes = this.order.constraints.map((c) => el('li', { text: describe(c) }));
    this.removeButton = el('button', { class: 'button button-secondary', type: 'button' }, 'Retirer');
    this.removeButton.addEventListener('click', () => this.place(null));
    const deliver = el('button', { class: 'button', type: 'button' }, 'Livrer le bouquet');
    deliver.addEventListener('click', () => this.deliver());
    this.controls = el('div', { class: 'bouquet-controls' }, this.buildStall(), el('div', { class: 'button-row' }, this.removeButton, deliver));

    root.append(
      el(
        'div',
        { class: 'bouquet-game' },
        topBar(
          `Commande n°${current.number} · ${current.challenge ? 'Défi du jour' : difficultyName(current.difficulty)}`,
          helpSlot(BOUQUET_HELP),
          BACK_BOUQUET,
        ),
        el('section', { class: 'bouquet-order' }, el('h2', { text: 'La commande' }), el('ul', {}, ...this.wishes)),
        el('div', { class: 'bouquet-stage' }, this.canvas),
        this.status,
        this.controls,
      ),
    );

    this.status.textContent = 'Touche un emplacement, puis une fleur.';
    this.canvas.addEventListener('click', this.onCanvasClick);
    window.addEventListener('resize', this.fit);
    this.fit();
    openHelpOnFirstVisit(BOUQUET_HELP);
  }

  dispose(): void {
    window.removeEventListener('resize', this.fit);
  }

  private buildStall(): HTMLElement {
    const stall = el('div', { class: 'bouquet-stall', role: 'group', 'aria-label': 'L’étal' });
    const scale = Math.min(2, window.devicePixelRatio || 1);
    for (const key of this.order.stall) {
      const icon = el('canvas', { class: 'bouquet-stall-icon' });
      icon.width = icon.height = Math.round(STALL_ICON * scale);
      icon.style.width = icon.style.height = `${STALL_ICON}px`;
      paintStallFlower(icon, key);
      const button = el('button', { class: 'bouquet-stall-flower', type: 'button', 'aria-label': flowerName(key), title: flowerName(key) }, icon);
      button.addEventListener('click', () => this.place(key));
      stall.append(button);
    }
    return stall;
  }

  private readonly fit = (): void => {
    const size = Math.floor(Math.max(240, Math.min(window.innerWidth - 32, 360)));
    this.canvas.style.width = this.canvas.style.height = `${size}px`;
    this.canvas.width = this.canvas.height = Math.floor(size * (window.devicePixelRatio || 1));
    this.repaint();
  };

  private repaint(): void {
    paintBouquet(this.canvas, this.current.slots, { selected: this.delivered ? undefined : this.selected });
    this.removeButton.disabled = this.current.slots[this.selected] === null;
  }

  private firstEmpty(after = -1): number | null {
    const slots = this.current.slots;
    for (let step = 1; step <= slots.length; step++) {
      const i = (after + step + slots.length) % slots.length;
      if (slots[i] === null) return i;
    }
    return null;
  }

  // -----------------------------------------------
  // PICKING
  // -----------------------------------------------

  private readonly onCanvasClick = (event: MouseEvent): void => {
    if (this.delivered) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    let best = -1;
    let bestDistance = HEAD_SIZE * 0.9;
    this.current.slots.forEach((key, i) => {
      const head = slotPosition(i, this.current.slots.length, key);
      const distance = Math.hypot(head.x - x, head.y - y);
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    });
    if (best < 0) return;
    this.selected = best;
    const key = this.current.slots[best];
    this.status.textContent = key ? `Ici : ${flowerName(key)}. Choisis une fleur pour la remplacer.` : 'Choisis une fleur dans l’étal.';
    this.repaint();
  };

  private place(key: FlowerKey | null): void {
    if (this.delivered) return;
    this.current.slots[this.selected] = key;
    if (key) this.selected = this.firstEmpty(this.selected) ?? this.selected;
    saveBouquet(this.save);
    this.status.textContent = this.firstEmpty() === null ? 'Le vase est plein. Prête à livrer ?' : 'Touche un emplacement, puis une fleur.';
    this.repaint();
  }

  // -----------------------------------------------
  // DELIVERY
  // -----------------------------------------------

  private deliver(): void {
    if (this.delivered) return;
    if (this.firstEmpty() !== null) {
      this.status.textContent = 'Il reste des emplacements vides !';
      return;
    }
    if (!confirm('Livrer ce bouquet ? Une seule livraison par commande.')) return;
    const flowers = this.current.slots as FlowerKey[];
    const results = judge(this.order, flowers);
    const stars = starsFor(results);
    this.delivered = true;
    this.save.ordersDone = Math.max(this.save.ordersDone, this.current.number);
    this.save.gallery.push({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      number: this.current.number,
      level: this.current.level,
      seed: this.current.seed,
      flowers: [...flowers],
      results,
      stars,
      deliveredAt: new Date().toISOString(),
    });
    this.save.current = null;
    saveBouquet(this.save);
    const reward = levelReward(stars, this.current.difficulty, this.current.challenge);

    results.forEach((met, i) => this.wishes[i].classList.add(met ? 'is-met' : 'is-missed'));
    this.repaint();
    this.canvas.classList.add('is-done');
    const next = el('button', { class: 'button', type: 'button' }, 'Commande suivante');
    next.addEventListener('click', () => this.actions.nextOrder());
    const missed = results.filter((met) => !met).length;
    this.status.textContent = missed === 0 ? 'Le client est ravi !' : `${missed} souhait${missed > 1 ? 's' : ''} oublié${missed > 1 ? 's' : ''}…`;
    this.controls.replaceChildren(
      el('p', { class: 'bouquet-result' }, el('span', { class: 'bouquet-stars', text: '★'.repeat(stars) + '☆'.repeat(3 - stars) })),
      reward,
      ...(missed > 0 ? [solutionHint(this.order)] : []),
      el('div', { class: 'button-row' }, next, el('a', { class: 'button button-secondary', href: '#/bouquet' }, 'Mes bouquets')),
    );
  }
}

/** After a miss: a bouquet that met every wish, so the player sees one was possible. */
function solutionHint(order: Order): HTMLElement {
  const canvas = el('canvas', { class: 'bouquet-canvas' });
  canvas.width = canvas.height = Math.round(150 * Math.min(2, window.devicePixelRatio || 1));
  canvas.style.width = canvas.style.height = '150px';
  paintBouquet(canvas, order.solution);
  return el('details', { class: 'bouquet-solution' }, el('summary', { text: 'Voir un bouquet qui convenait' }), canvas);
}
