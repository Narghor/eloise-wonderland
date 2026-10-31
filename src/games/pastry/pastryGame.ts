import { el, topBar, type BackLink } from '../../dom';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { difficultyName } from '../../difficulty';
import { levelReward } from '../../companion/reward';
import { PASTRY_HELP, swatch } from './pastryHelp';
import { animateCut, drawCake } from './pastryDraw';
import { KINDS, clueText, starsFor, type KindId } from './pastryLogic';
import { savePastry, type CurrentCake, type PastrySave } from './pastrySave';

const BACK_PASTRY: BackLink = { href: '#/patisserie', label: 'Pâtisserie' };

export interface PastryGameActions {
  nextCake(): void;
}

export class PastryGame {
  private readonly total: number;
  private readonly modelCanvas = el('canvas', { class: 'pastry-canvas' });
  private readonly workCanvas = el('canvas', { class: 'pastry-canvas' });
  private readonly counter = el('p', { class: 'pastry-counter', role: 'status' });
  private readonly controls: HTMLElement;
  private readonly kindButtons: HTMLButtonElement[] = [];
  private readonly undoButton = el('button', { class: 'button button-secondary', type: 'button' }, 'Annuler');
  private stopCut: () => void = () => {};
  private finished = false;

  constructor(
    root: HTMLElement,
    private readonly save: PastrySave,
    private readonly current: CurrentCake,
    private readonly actions: PastryGameActions,
  ) {
    this.total = current.layers.length;

    const kinds = el('div', { class: 'pastry-kinds', role: 'group', 'aria-label': 'Ingrédients' });
    for (const kind of current.pool) {
      const button = el('button', { class: 'pastry-kind-button', type: 'button' }, swatch(kind), el('span', { text: KINDS[kind].label }));
      button.addEventListener('click', () => this.place(kind));
      this.kindButtons.push(button);
      kinds.append(button);
    }
    this.undoButton.addEventListener('click', () => this.undo());
    this.controls = el('div', { class: 'pastry-controls' }, kinds, el('div', { class: 'button-row' }, this.undoButton));

    const clues = current.clues.length
      ? el('ul', { class: 'pastry-clues' }, ...current.clues.map((clue) => el('li', { text: clueText(clue, current.layers, current.hidden) })))
      : el('span');

    root.append(
      el(
        'div',
        { class: 'pastry-game' },
        topBar(
          `Gâteau n°${current.number} · ${current.challenge ? 'Défi du jour' : difficultyName(current.difficulty)}`,
          helpSlot(PASTRY_HELP),
          BACK_PASTRY,
        ),
        el(
          'div',
          { class: 'pastry-pair' },
          el('figure', { class: 'pastry-column' }, el('figcaption', { text: 'Modèle' }), this.modelCanvas),
          el('figure', { class: 'pastry-column' }, el('figcaption', { text: 'Ton gâteau' }), this.workCanvas),
        ),
        clues,
        this.counter,
        this.controls,
      ),
    );
    window.addEventListener('resize', this.refresh);
    this.refresh();
    openHelpOnFirstVisit(PASTRY_HELP);
  }

  dispose(): void {
    window.removeEventListener('resize', this.refresh);
    this.stopCut();
  }

  private columnWidth(): number {
    return Math.max(60, Math.floor(Math.min(220, (Math.min(window.innerWidth, 560) - 32 - 12) / 2)));
  }

  private get wrongOnTop(): boolean {
    const { placed, layers } = this.current;
    return placed.length > 0 && placed[placed.length - 1] !== layers[placed.length - 1];
  }

  // -----------------------------------------------
  // STACKING
  // -----------------------------------------------

  private place(kind: KindId): void {
    const { placed, layers } = this.current;
    if (this.finished || this.wrongOnTop || placed.length >= this.total) return;
    placed.push(kind);
    if (kind !== layers[placed.length - 1]) this.current.mistakes++;
    savePastry(this.save);
    this.refresh();
    if (placed.length === this.total && !this.wrongOnTop) this.win();
  }

  /** Takes the top layer off; a mistake it held stays counted. */
  private undo(): void {
    if (this.finished || this.current.placed.length === 0) return;
    this.current.placed.pop();
    savePastry(this.save);
    this.refresh();
  }

  private readonly refresh = (): void => {
    const width = this.columnWidth();
    const { placed, layers, hidden, mistakes } = this.current;
    drawCake(this.modelCanvas, layers.map((kind, i) => (hidden[i] ? null : kind)), width);
    if (this.finished) {
      drawCake(this.workCanvas, placed, width);
      return;
    }
    drawCake(this.workCanvas, placed, width, { slots: this.total, wrong: placed.map((kind, i) => kind !== layers[i]) });
    const blocked = this.wrongOnTop;
    this.counter.textContent = blocked
      ? 'Oups, cette couche n’est pas la bonne : annule-la.'
      : `Couche ${Math.min(placed.length + 1, this.total)} / ${this.total} · Erreurs : ${mistakes}`;
    this.kindButtons.forEach((button) => (button.disabled = blocked));
    this.undoButton.disabled = placed.length === 0;
  };

  private win(): void {
    this.finished = true;
    const stars = starsFor(this.current.mistakes);
    this.save.cakesDone = Math.max(this.save.cakesDone, this.current.number);
    this.save.showcase.push({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      number: this.current.number,
      layers: [...this.current.layers],
      stars,
      madeAt: new Date().toISOString(),
    });
    this.save.current = null;
    savePastry(this.save);
    const reward = levelReward(stars, this.current.difficulty, this.current.challenge);

    this.counter.textContent = 'On coupe le gâteau…';
    this.controls.replaceChildren();
    this.stopCut = animateCut(this.workCanvas, this.current.layers, this.columnWidth(), () => {
      this.counter.textContent = '';
      const next = el('button', { class: 'button', type: 'button' }, 'Gâteau suivant');
      next.addEventListener('click', () => this.actions.nextCake());
      const mistakes = this.current.mistakes;
      this.controls.replaceChildren(
        el(
          'p',
          { class: 'pastry-result' },
          el('strong', { text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }),
          mistakes === 0 ? ' Parfait, pas une seule erreur !' : ` Terminé avec ${mistakes} erreur${mistakes > 1 ? 's' : ''}.`,
        ),
        reward,
        el('div', { class: 'button-row' }, next, el('a', { class: 'button button-secondary', href: '#/patisserie' }, 'Ma vitrine')),
      );
    });
  }
}
