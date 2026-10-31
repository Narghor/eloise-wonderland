import { el, topBar, type BackLink } from '../../dom';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { difficultyName } from '../../difficulty';
import { levelReward } from '../../companion/reward';
import { BOX_HELP } from './boxHelp';
import { BOX_TIERS, PIECE_COLORS, canPlace, deadHole, isSolved, shapeOf, starsFor, type Piece } from './boxLogic';
import { saveBox, type BoxSave, type CurrentBox } from './boxSave';

const BACK_BOX: BackLink = { href: '#/rangement', label: 'Boîte à trésors' };
/** Pixels a finger must travel before a touch becomes a drag rather than a tap. */
const DRAG_THRESHOLD = 8;
const HOLE_FLASH_MS = 1200;

export interface BoxGameActions {
  nextBox(): void;
}

interface Drag {
  index: number;
  source: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  /** Grab point inside the piece, in board pixels. */
  offsetX: number;
  offsetY: number;
  ghost: HTMLElement | null;
}

export class BoxGame {
  private readonly board = el('div', { class: 'box-board' });
  private readonly tray = el('div', { class: 'box-tray' });
  private readonly counter = el('p', { class: 'box-counter', role: 'status' });
  private readonly controls: HTMLElement;
  private readonly rotateButton = el('button', { class: 'button button-secondary', type: 'button' }, '↻ Tourner');
  private readonly flipButton = el('button', { class: 'button button-secondary', type: 'button' }, '⇋ Retourner');
  private selected = -1;
  private drag: Drag | null = null;
  private hole: number[] = [];
  private holeTimer = 0;
  private finished = false;

  constructor(
    root: HTMLElement,
    private readonly save: BoxSave,
    private readonly current: CurrentBox,
    private readonly actions: BoxGameActions,
  ) {
    this.rotateButton.addEventListener('click', () => this.turnSelected(false));
    this.flipButton.addEventListener('click', () => this.turnSelected(true));
    const buttons = el('div', { class: 'button-row' }, this.rotateButton);
    if (BOX_TIERS[current.difficulty].flip) buttons.append(this.flipButton);
    this.controls = el('div', { class: 'box-controls' }, buttons);

    root.append(
      el(
        'div',
        { class: 'box-game' },
        topBar(
          `Boîte n°${current.number} · ${current.challenge ? 'Défi du jour' : difficultyName(current.difficulty)}`,
          helpSlot(BOX_HELP),
          BACK_BOX,
        ),
        this.counter,
        el('div', { class: 'box-board-frame' }, this.board),
        this.tray,
        this.controls,
      ),
    );
    window.addEventListener('resize', this.render);
    this.render();
    openHelpOnFirstVisit(BOX_HELP);
  }

  dispose(): void {
    window.removeEventListener('resize', this.render);
    window.clearTimeout(this.holeTimer);
    this.drag?.ghost?.remove();
  }

  private cellSize(): number {
    // A window being resized can report a width near 0 for a frame: never draw at a tiny size.
    return Math.max(20, Math.floor(Math.min(52, (Math.min(window.innerWidth, 560) - 40) / this.current.cols)));
  }

  // -----------------------------------------------
  // DRAWING
  // -----------------------------------------------

  private readonly render = (): void => {
    const { rows, cols, blocked, pieces } = this.current;
    const cell = this.cellSize();
    this.board.style.setProperty('--cell', `${cell}px`);
    this.board.style.width = `${cols * cell}px`;
    this.board.style.height = `${rows * cell}px`;

    const slots: HTMLElement[] = [];
    for (let index = 0; index < rows * cols; index++) {
      const slot = el('span', { class: 'box-slot' });
      if (blocked.includes(index)) slot.classList.add('is-blocked');
      if (this.hole.includes(index)) slot.classList.add('is-hole');
      slot.style.left = `${(index % cols) * cell}px`;
      slot.style.top = `${Math.floor(index / cols) * cell}px`;
      slots.push(slot);
    }
    this.board.replaceChildren(...slots);

    const trayCell = Math.max(16, Math.round(cell * 0.6));
    this.tray.replaceChildren();
    pieces.forEach((piece, index) => {
      if (piece.at) {
        const element = this.pieceElement(piece, cell, index);
        element.style.left = `${piece.at.col * cell}px`;
        element.style.top = `${piece.at.row * cell}px`;
        this.board.append(element);
      } else {
        this.tray.append(el('div', { class: 'box-tray-slot' }, this.pieceElement(piece, trayCell, index)));
      }
    });
    if (!this.finished && this.tray.childElementCount === 0) this.tray.append(el('p', { class: 'box-tray-empty', text: 'Plus rien à ranger !' }));

    const left = pieces.filter((piece) => !piece.at).length;
    this.counter.textContent = `Trésors à ranger : ${left} · Erreurs : ${this.current.mistakes}`;
    const canTurn = this.selected >= 0 && !this.finished;
    this.rotateButton.disabled = !canTurn;
    this.flipButton.disabled = !canTurn;
  };

  /** The piece's cells, with a border only on the sides that face outside the piece. */
  private pieceElement(piece: Piece, cell: number, index: number): HTMLElement {
    const shape = shapeOf(piece);
    const width = Math.max(...shape.map(([, c]) => c)) + 1;
    const height = Math.max(...shape.map(([r]) => r)) + 1;
    const element = el('div', { class: `box-piece motif-${piece.motif}`, 'aria-label': `Trésor de ${shape.length} cases` });
    element.style.width = `${width * cell}px`;
    element.style.height = `${height * cell}px`;
    element.style.setProperty('--piece', PIECE_COLORS[piece.color]);
    element.style.setProperty('--cell', `${cell}px`);
    if (index === this.selected) element.classList.add('is-selected');
    const has = (r: number, c: number) => shape.some(([sr, sc]) => sr === r && sc === c);
    for (const [r, c] of shape) {
      const square = el('span', { class: 'box-piece-cell' });
      square.style.left = `${c * cell}px`;
      square.style.top = `${r * cell}px`;
      square.style.borderTopWidth = has(r - 1, c) ? '0' : '';
      square.style.borderBottomWidth = has(r + 1, c) ? '0' : '';
      square.style.borderLeftWidth = has(r, c - 1) ? '0' : '';
      square.style.borderRightWidth = has(r, c + 1) ? '0' : '';
      element.append(square);
    }
    element.addEventListener('pointerdown', (event) => this.grab(event, index, element));
    return element;
  }

  // -----------------------------------------------
  // TOUCH AND DRAG
  // -----------------------------------------------

  private grab(event: PointerEvent, index: number, source: HTMLElement): void {
    if (this.finished || this.drag || !event.isPrimary) return;
    event.preventDefault();
    const rect = source.getBoundingClientRect();
    const scale = this.cellSize() / parseFloat(source.style.getPropertyValue('--cell'));
    this.drag = {
      index,
      source,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: (event.clientX - rect.left) * scale,
      offsetY: (event.clientY - rect.top) * scale,
      ghost: null,
    };
    source.setPointerCapture(event.pointerId);
    source.addEventListener('pointermove', this.move);
    source.addEventListener('pointerup', this.release);
    source.addEventListener('pointercancel', this.cancel);
  }

  private readonly move = (event: PointerEvent): void => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.ghost) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_THRESHOLD) return;
      drag.ghost = this.pieceElement(this.current.pieces[drag.index], this.cellSize(), -1);
      drag.ghost.classList.add('is-dragging');
      // Lift the piece above a finger so the finger does not hide it.
      if (event.pointerType === 'touch') drag.offsetY += this.cellSize() * 0.8;
      document.body.append(drag.ghost);
      drag.source.classList.add('is-lifted');
    }
    drag.ghost.style.left = `${event.clientX - drag.offsetX}px`;
    drag.ghost.style.top = `${event.clientY - drag.offsetY}px`;
    const spot = this.spotUnder(drag.ghost);
    drag.ghost.classList.toggle('is-fitting', spot !== null && canPlace(this.current, drag.index, spot.row, spot.col));
  };

  private readonly release = (event: PointerEvent): void => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.endDrag();
    const piece = this.current.pieces[drag.index];
    this.selected = drag.index;
    if (!drag.ghost) {
      // A tap turns a piece of the tray, and sends a placed piece back to the tray.
      if (piece.at) piece.at = null;
      else piece.rot = (piece.rot + 1) % 4;
      saveBox(this.save);
      this.render();
      return;
    }
    const spot = this.spotUnder(drag.ghost);
    drag.ghost.remove();
    if (spot && canPlace(this.current, drag.index, spot.row, spot.col)) {
      this.place(drag.index, spot.row, spot.col);
      return;
    }
    if (!this.isOverBoard(event)) piece.at = null;
    saveBox(this.save);
    this.render();
  };

  private readonly cancel = (): void => {
    this.drag?.ghost?.remove();
    this.endDrag();
    this.render();
  };

  private endDrag(): void {
    const drag = this.drag;
    if (!drag) return;
    drag.source.removeEventListener('pointermove', this.move);
    drag.source.removeEventListener('pointerup', this.release);
    drag.source.removeEventListener('pointercancel', this.cancel);
    drag.source.classList.remove('is-lifted');
    this.drag = null;
  }

  /** The box cell under the ghost's top-left corner, rounded to the nearest one. */
  private spotUnder(ghost: HTMLElement): { row: number; col: number } | null {
    const board = this.board.getBoundingClientRect();
    const piece = ghost.getBoundingClientRect();
    const cell = this.cellSize();
    const col = Math.round((piece.left - board.left) / cell);
    const row = Math.round((piece.top - board.top) / cell);
    return row > -1 && col > -1 && row < this.current.rows && col < this.current.cols ? { row, col } : null;
  }

  private isOverBoard(event: PointerEvent): boolean {
    const board = this.board.getBoundingClientRect();
    return event.clientX >= board.left && event.clientX <= board.right && event.clientY >= board.top && event.clientY <= board.bottom;
  }

  private turnSelected(flip: boolean): void {
    const piece = this.current.pieces[this.selected];
    if (!piece || this.finished) return;
    piece.at = null;
    if (flip) piece.flip = !piece.flip;
    else piece.rot = (piece.rot + 1) % 4;
    saveBox(this.save);
    this.render();
  }

  // -----------------------------------------------
  // PLACING
  // -----------------------------------------------

  /** A drop that turns a fillable box into a lost one is a mistake, and shows the hole. */
  private place(index: number, row: number, col: number): void {
    const wasLost = deadHole(this.current) !== null;
    this.current.pieces[index].at = { row, col };
    const hole = deadHole(this.current);
    if (hole && !wasLost) {
      this.current.mistakes++;
      this.flashHole(hole);
    }
    if (isSolved(this.current)) this.win();
    else saveBox(this.save);
    this.render();
  }

  private flashHole(hole: number[]): void {
    window.clearTimeout(this.holeTimer);
    this.hole = hole;
    navigator.vibrate?.(120);
    this.holeTimer = window.setTimeout(() => {
      this.hole = [];
      this.render();
    }, HOLE_FLASH_MS);
  }

  private win(): void {
    this.finished = true;
    this.selected = -1;
    const { mistakes, difficulty, challenge, number } = this.current;
    const stars = starsFor(mistakes);
    this.save.boxesDone = Math.max(this.save.boxesDone, number);
    this.save.bestStars[difficulty] = Math.max(this.save.bestStars[difficulty], stars);
    this.save.current = null;
    saveBox(this.save);
    this.board.classList.add('is-done');
    const reward = levelReward(stars, difficulty, challenge);

    const next = el('button', { class: 'button', type: 'button' }, 'Boîte suivante');
    next.addEventListener('click', () => this.actions.nextBox());
    this.controls.replaceChildren(
      el(
        'p',
        { class: 'box-result' },
        el('strong', { text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }),
        mistakes === 0 ? ' Tout est rangé, sans une seule erreur !' : ` Tout est rangé, avec ${mistakes} erreur${mistakes > 1 ? 's' : ''}.`,
      ),
      reward,
      el('div', { class: 'button-row' }, next, el('a', { class: 'button button-secondary', href: '#/rangement' }, 'Menu')),
    );
  }
}
