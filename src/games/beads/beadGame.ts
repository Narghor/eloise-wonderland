import { el, topBar, type BackLink } from '../../dom';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { difficultyName } from '../../difficulty';
import { levelReward } from '../../companion/reward';
import { BEAD_HELP } from './beadHelp';
import { cellAt, drawBeads } from './beadDraw';
import { beadsLeft, beadTotal, EMPTY, isFinished, starsFor } from './beadLogic';
import { saveBeads, type BeadSave, type CurrentBeads } from './beadSave';

const BACK_BEADS: BackLink = { href: '#/perles', label: 'Perles' };

export interface BeadGameActions {
  nextPiece(): void;
}

/** What a finger drag does, decided by the peg it started on. */
type Stroke = 'place' | 'remove';

export class BeadGame {
  private readonly total: number;
  private readonly modelCanvas = el('canvas', { class: 'beads-canvas' });
  private readonly boardCanvas = el('canvas', { class: 'beads-canvas beads-board' });
  private readonly counter = el('p', { class: 'beads-counter', role: 'status' });
  private readonly controls: HTMLElement;
  private readonly colorButtons: { button: HTMLButtonElement; count: HTMLElement }[] = [];
  private selected = 0;
  private stroke: Stroke | null = null;
  private lastCell = -1;
  private finished = false;

  constructor(
    root: HTMLElement,
    private readonly save: BeadSave,
    private readonly current: CurrentBeads,
    private readonly actions: BeadGameActions,
  ) {
    this.total = beadTotal(current);

    const colors = el('div', { class: 'beads-colors', role: 'group', 'aria-label': 'Couleurs' });
    current.palette.forEach((color, index) => {
      const swatch = el('span', { class: 'beads-swatch' });
      swatch.style.background = color;
      const count = el('span', { class: 'beads-count' });
      const button = el('button', { class: 'beads-color-button', type: 'button' }, swatch, count);
      button.addEventListener('click', () => {
        this.selected = index;
        this.refresh();
      });
      this.colorButtons.push({ button, count });
      colors.append(button);
    });
    this.controls = el('div', { class: 'beads-controls' }, colors);

    this.boardCanvas.addEventListener('pointerdown', this.onDown);
    this.boardCanvas.addEventListener('pointermove', this.onMove);
    this.boardCanvas.addEventListener('pointerup', this.onUp);
    this.boardCanvas.addEventListener('pointercancel', this.onUp);

    root.append(
      el(
        'div',
        { class: 'beads-game' },
        topBar(
          `Perles n°${current.number} · ${current.challenge ? 'Défi du jour' : difficultyName(current.difficulty)}`,
          helpSlot(BEAD_HELP),
          BACK_BEADS,
        ),
        el('figure', { class: 'beads-model' }, el('figcaption', { text: 'Modèle' }), this.modelCanvas),
        this.counter,
        el('div', { class: 'beads-board-wrap' }, this.boardCanvas),
        this.controls,
      ),
    );
    window.addEventListener('resize', this.refresh);
    this.refresh();
    openHelpOnFirstVisit(BEAD_HELP);
  }

  dispose(): void {
    window.removeEventListener('resize', this.refresh);
  }

  private boardWidth(): number {
    // A window being resized can report a width near 0 for a frame: never draw at a negative size.
    return Math.max(80, Math.min(window.innerWidth, 560) - 32);
  }

  // -----------------------------------------------
  // PLACING BEADS
  // -----------------------------------------------

  private readonly onDown = (event: PointerEvent): void => {
    if (this.finished) return;
    const cell = cellAt(this.boardCanvas, this.current, event.clientX, event.clientY);
    if (cell < 0) return;
    this.boardCanvas.setPointerCapture(event.pointerId);
    this.stroke = this.current.placed[cell] === EMPTY ? 'place' : 'remove';
    this.lastCell = -1;
    this.paint(cell);
  };

  private readonly onMove = (event: PointerEvent): void => {
    if (!this.stroke) return;
    const cell = cellAt(this.boardCanvas, this.current, event.clientX, event.clientY);
    if (cell >= 0) this.paint(cell);
  };

  private readonly onUp = (): void => {
    if (!this.stroke) return;
    this.stroke = null;
    if (!this.finished) saveBeads(this.save);
  };

  private paint(cell: number): void {
    if (cell === this.lastCell) return;
    this.lastCell = cell;
    const { placed, cells } = this.current;
    if (this.stroke === 'remove') {
      if (placed[cell] === EMPTY) return;
      placed[cell] = EMPTY;
    } else {
      if (placed[cell] !== EMPTY || beadsLeft(this.current, placed)[this.selected] <= 0) return;
      placed[cell] = this.selected;
      if (cells[cell] !== this.selected) this.current.mistakes++;
    }
    if (isFinished(this.current, placed)) this.win();
    this.refresh();
  }

  private readonly refresh = (): void => {
    const width = this.boardWidth();
    const { placed, cells, mistakes } = this.current;
    drawBeads(this.modelCanvas, this.current, cells, Math.round(Math.min(width * 0.5, 180)), { pegs: true });
    drawBeads(this.boardCanvas, this.current, placed, width, { target: cells, pegs: true });
    const done = placed.filter((cell, index) => cell !== EMPTY && cell === cells[index]).length;
    this.counter.textContent = `Perles ${done} / ${this.total} · Erreurs : ${mistakes}`;
    const left = beadsLeft(this.current, placed);
    this.colorButtons.forEach(({ button, count }, index) => {
      count.textContent = `×${left[index]}`;
      button.classList.toggle('is-active', index === this.selected);
      button.classList.toggle('is-empty', left[index] === 0);
      button.setAttribute('aria-pressed', String(index === this.selected));
      button.setAttribute('aria-label', `Couleur ${index + 1}, ${left[index]} perle${left[index] > 1 ? 's' : ''} dans la boîte`);
    });
  };

  private win(): void {
    this.finished = true;
    this.stroke = null;
    const stars = starsFor(this.current.mistakes, this.total);
    this.save.piecesDone = Math.max(this.save.piecesDone, this.current.number);
    const { palette, width, height, cells } = this.current;
    this.save.box.push({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      number: this.current.number,
      palette,
      width,
      height,
      cells,
      stars,
      madeAt: new Date().toISOString(),
    });
    this.save.current = null;
    saveBeads(this.save);
    const reward = levelReward(stars, this.current.difficulty, this.current.challenge);

    const next = el('button', { class: 'button', type: 'button' }, 'Modèle suivant');
    next.addEventListener('click', () => this.actions.nextPiece());
    const mistakes = this.current.mistakes;
    this.controls.replaceChildren(
      el(
        'p',
        { class: 'beads-result' },
        el('strong', { text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }),
        mistakes === 0 ? ' Parfait, pas une seule erreur !' : ` Terminé avec ${mistakes} erreur${mistakes > 1 ? 's' : ''}.`,
      ),
      reward,
      el('div', { class: 'button-row' }, next, el('a', { class: 'button button-secondary', href: '#/perles' }, 'Ma boîte')),
    );
  }
}
