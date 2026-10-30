import { el, topBar, type BackLink } from '../../dom';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { difficultyName } from '../../difficulty';
import { levelReward } from '../../companion/reward';
import { BRACELET_HELP } from './braceletHelp';
import { drawBracelet } from './braceletDraw';
import { KNOTS, knotCount, knotPlaces, showsLeft, starsFor, swaps, weave, type Knot } from './braceletLogic';
import { saveBracelets, type BraceletSave, type CurrentBracelet } from './braceletSave';

const BACK_BRACELETS: BackLink = { href: '#/bracelets', label: 'Bracelets' };

const KNOT_LOOKS: Record<Knot, { arrow: string; hint: string }> = {
  FF: { arrow: '↘', hint: 'croisés' },
  BB: { arrow: '↙', hint: 'croisés' },
  FB: { arrow: '↘↙', hint: 'restent' },
  BF: { arrow: '↙↘', hint: 'restent' },
};

export interface BraceletGameActions {
  nextBracelet(): void;
}

export class BraceletGame {
  private readonly target: number[];
  private readonly total: number;
  private readonly modelCanvas = el('canvas', { class: 'bracelet-canvas' });
  private readonly workCanvas = el('canvas', { class: 'bracelet-canvas' });
  private readonly counter = el('p', { class: 'bracelet-counter', role: 'status' });
  private readonly controls: HTMLElement;
  private readonly knotButtons = new Map<Knot, { button: HTMLButtonElement; swatch: HTMLElement }>();
  private readonly undoButton = el('button', { class: 'button button-secondary', type: 'button' }, 'Annuler');

  constructor(
    root: HTMLElement,
    private readonly save: BraceletSave,
    private readonly current: CurrentBracelet,
    private readonly actions: BraceletGameActions,
  ) {
    this.target = weave(current, current.model).colors;
    this.total = knotCount(current);

    const knots = el('div', { class: 'bracelet-knots', role: 'group', 'aria-label': 'Nœuds' });
    for (const knot of KNOTS) {
      const look = KNOT_LOOKS[knot];
      const swatch = el('span', { class: 'bracelet-knot-swatch' });
      const button = el(
        'button',
        { class: 'bracelet-knot-button', type: 'button', 'aria-label': `Nœud ${look.arrow}, fils ${look.hint}` },
        el('span', { class: 'bracelet-knot-arrow', text: look.arrow }),
        swatch,
        el('span', { class: 'bracelet-knot-hint', text: look.hint }),
      );
      button.addEventListener('click', () => this.tie(knot));
      this.knotButtons.set(knot, { button, swatch });
      knots.append(button);
    }
    this.undoButton.addEventListener('click', () => this.undo());
    this.controls = el('div', { class: 'bracelet-controls' }, knots, el('div', { class: 'button-row' }, this.undoButton));

    root.append(
      el(
        'div',
        { class: 'bracelet-game' },
        topBar(
          `Bracelet n°${current.number} · ${current.challenge ? 'Défi du jour' : difficultyName(current.difficulty)}`,
          helpSlot(BRACELET_HELP),
          BACK_BRACELETS,
        ),
        el(
          'div',
          { class: 'bracelet-pair' },
          el('figure', { class: 'bracelet-column' }, el('figcaption', { text: 'Modèle' }), this.modelCanvas),
          el('figure', { class: 'bracelet-column' }, el('figcaption', { text: 'Ton bracelet' }), this.workCanvas),
        ),
        this.counter,
        this.controls,
      ),
    );
    window.addEventListener('resize', this.refresh);
    this.refresh();
    openHelpOnFirstVisit(BRACELET_HELP);
  }

  dispose(): void {
    window.removeEventListener('resize', this.refresh);
  }

  private columnWidth(): number {
    // A window being resized can report a width near 0 for a frame: never draw at a negative size.
    return Math.max(40, Math.floor(Math.min(200, (Math.min(window.innerWidth, 560) - 32 - 12) / 2)));
  }

  // -----------------------------------------------
  // KNOTTING
  // -----------------------------------------------

  private tie(knot: Knot): void {
    const index = this.current.knots.length;
    if (index >= this.total) return;
    this.current.knots.push(knot);
    if (weave(this.current, this.current.knots).colors[index] !== this.target[index]) this.current.mistakes++;
    if (this.current.knots.length === this.total) this.win();
    else saveBracelets(this.save);
    this.refresh();
  }

  /** Takes the last knot back; a mistake it held stays counted. */
  private undo(): void {
    if (this.current.knots.length === 0) return;
    this.current.knots.pop();
    saveBracelets(this.save);
    this.refresh();
  }

  private readonly refresh = (): void => {
    const width = this.columnWidth();
    const { knots, mistakes, palette } = this.current;
    drawBracelet(this.modelCanvas, this.current, this.current.model, width);
    drawBracelet(this.workCanvas, this.current, knots, width, { target: this.target, live: true });
    this.counter.textContent = `Nœud ${Math.min(knots.length + 1, this.total)} / ${this.total} · Erreurs : ${mistakes}`;
    this.undoButton.disabled = knots.length === 0;

    if (knots.length >= this.total) return;
    const { left } = knotPlaces(this.current)[knots.length];
    const strings = weave(this.current, knots).strings;
    for (const [knot, { swatch }] of this.knotButtons) {
      swatch.style.setProperty('--knot-color', palette[showsLeft(knot) ? strings[left] : strings[left + 1]]);
      swatch.classList.toggle('is-crossing', swaps(knot));
    }
  };

  private win(): void {
    const stars = starsFor(this.current.mistakes, this.total);
    this.save.braceletsDone = Math.max(this.save.braceletsDone, this.current.number);
    this.save.box.push({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      number: this.current.number,
      palette: this.current.palette,
      strings: this.current.strings,
      rows: this.current.rows,
      knots: [...this.current.knots],
      stars,
      madeAt: new Date().toISOString(),
    });
    this.save.current = null;
    saveBracelets(this.save);
    const reward = levelReward(stars, this.current.difficulty, this.current.challenge);

    const next = el('button', { class: 'button', type: 'button' }, 'Bracelet suivant');
    next.addEventListener('click', () => this.actions.nextBracelet());
    const mistakes = this.current.mistakes;
    this.controls.replaceChildren(
      el(
        'p',
        { class: 'bracelet-result' },
        el('strong', { text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }),
        mistakes === 0 ? ' Parfait, pas une seule erreur !' : ` Terminé avec ${mistakes} erreur${mistakes > 1 ? 's' : ''}.`,
      ),
      reward,
      el('div', { class: 'button-row' }, next, el('a', { class: 'button button-secondary', href: '#/bracelets' }, 'Ma boîte')),
    );
  }
}
