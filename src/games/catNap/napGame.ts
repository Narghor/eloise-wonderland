import { el, topBar } from '../../dom';
import { difficultyName } from '../../difficulty';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { levelReward } from '../../companion/reward';
import { PAW, fabricOf, sleepingCat } from './napArt';
import { NAP_HELP } from './napHelp';
import { Mark, saveNap, type CurrentNap, type NapSave } from './napSave';

// -----------------------------------------------
// ONE ROOM OF SLEEPING CATS
// -----------------------------------------------

const MAX_UNDO = 200;

interface Change {
  cell: number;
  before: Mark;
}

/** A finger (or button) down on the board: a tap uses the tool, a slide draws crosses. */
interface Press {
  pointer: number;
  start: number;
  /** What a tap on the start cell does. */
  tapTool: Mark;
  lastPoint: { x: number; y: number };
  /** Set once the finger leaves the start cell: every cell it crosses then gets the same change. */
  stroke: { from: Mark; to: Mark; changes: Change[] } | null;
}

interface NapActions {
  nextRoom(): void;
  /** Plays the same room again from scratch. */
  restartRoom(): void;
}

/** The third mistake wakes the cats up: the room starts over. */
export const LIVES = 3;

/** Zero mistakes is 3 stars, then one star less per mistake. */
export function starsForMistakes(mistakes: number): number {
  return Math.max(0, 3 - mistakes);
}

export class NapGame {
  private readonly size: number;
  private readonly board = el('div', { class: 'nap-board' });
  private readonly cells: HTMLElement[] = [];
  private readonly livesEl = el('span', { class: 'nap-lives', 'aria-label': 'Vies' });
  private readonly controls = el('div', { class: 'nap-controls' });
  private readonly undoButton = el('button', { class: 'button button-secondary', type: 'button' }, '↶ Annuler');
  private readonly toolButtons = new Map<Mark, HTMLButtonElement>();
  private readonly undoStack: Change[][] = [];
  private tool: Mark = Mark.Cat;
  private press: Press | null = null;
  /** Won, or lost on the last life: the board takes no more input. */
  private over = false;

  constructor(
    root: HTMLElement,
    private readonly save: NapSave,
    private readonly nap: CurrentNap,
    private readonly actions: NapActions,
  ) {
    this.size = nap.size;
    this.buildBoard();
    this.buildControls();
    root.append(
      el(
        'div',
        { class: 'nap-screen' },
        topBar(`Salon n°${nap.number} · ${difficultyName(nap.difficulty)}`, helpSlot(NAP_HELP, this.livesEl)),
        el('div', { class: 'nap-board-wrap' }, el('div', { class: 'nap-frame' }, this.board)),
        this.controls,
        el('p', { class: 'hint-mouse', text: 'Clic droit : poser une croix.' }),
      ),
    );
    this.refreshLives();
    this.fitBoard();

    this.board.addEventListener('pointerdown', this.onPointerDown);
    this.board.addEventListener('pointermove', this.onPointerMove);
    this.board.addEventListener('pointerup', this.onPointerUp);
    this.board.addEventListener('pointercancel', this.cancelPress);
    this.board.addEventListener('lostpointercapture', this.cancelPress);
    this.board.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('resize', this.fitBoard);
    openHelpOnFirstVisit(NAP_HELP);
  }

  dispose(): void {
    window.removeEventListener('resize', this.fitBoard);
  }

  // -----------------------------------------------
  // BUILDING
  // -----------------------------------------------

  private buildBoard(): void {
    const { size, regions } = this.nap;
    this.board.style.setProperty('--size', String(size));
    regions.forEach((region, cell) => {
      const row = Math.floor(cell / size);
      const col = cell % size;
      const element = el('div', { class: 'nap-cell' });
      const fabric = fabricOf(region);
      element.style.setProperty('--fabric-base', fabric.base);
      element.style.setProperty('--fabric', fabric.image);
      element.style.setProperty('--fabric-tile', fabric.tile);
      // The pattern runs on from cell to cell across the whole cushion.
      element.style.setProperty('--col', String(col));
      element.style.setProperty('--row', String(row));
      // A thick edge wherever the cushion changes, so every cushion reads as one shape.
      if (row === 0 || regions[cell - size] !== region) element.classList.add('edge-top');
      if (row === size - 1 || regions[cell + size] !== region) element.classList.add('edge-bottom');
      if (col === 0 || regions[cell - 1] !== region) element.classList.add('edge-left');
      if (col === size - 1 || regions[cell + 1] !== region) element.classList.add('edge-right');
      this.cells.push(element);
      this.board.append(element);
      this.paintCell(cell);
    });
  }

  private buildControls(): void {
    const tools = el('div', { class: 'tool-toggle', role: 'group', 'aria-label': 'Outil' });
    for (const [mark, label] of [
      [Mark.Cat, '🐱 Chat'],
      [Mark.Cross, '🐾 Croix'],
    ] as const) {
      const button = el('button', { class: 'tool-button', type: 'button' }, label);
      button.addEventListener('click', () => this.selectTool(mark));
      this.toolButtons.set(mark, button);
      tools.append(button);
    }
    this.selectTool(Mark.Cat);
    this.undoButton.addEventListener('click', () => this.undo());
    const clearCrosses = el('button', { class: 'button button-secondary', type: 'button' }, 'Effacer les croix');
    clearCrosses.addEventListener('click', () => this.clearCrosses());
    this.refreshUndo();
    this.controls.replaceChildren(tools, el('div', { class: 'button-row' }, this.undoButton, clearCrosses));
  }

  private selectTool(mark: Mark): void {
    this.tool = mark;
    for (const [toolMark, button] of this.toolButtons) {
      button.classList.toggle('is-active', toolMark === mark);
      button.setAttribute('aria-pressed', String(toolMark === mark));
    }
  }

  private readonly fitBoard = (): void => {
    const width = Math.min(window.innerWidth - 56, 600);
    const height = window.innerHeight - 250;
    const cell = Math.floor(Math.max(30, Math.min(72, width / this.size, height / this.size)));
    this.board.style.setProperty('--cell', `${cell}px`);
  };

  // -----------------------------------------------
  // INPUT
  // -----------------------------------------------

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.over || this.press || (event.button !== 0 && event.button !== 2)) return;
    const cell = this.cellAt(event.clientX, event.clientY);
    if (cell < 0) return;
    event.preventDefault();
    this.board.setPointerCapture(event.pointerId);
    this.press = {
      pointer: event.pointerId,
      start: cell,
      tapTool: event.button === 2 ? Mark.Cross : this.tool,
      lastPoint: { x: event.clientX, y: event.clientY },
      stroke: null,
    };
  };

  /** Follows the finger in small steps, so a fast slide still marks every cell it crosses. */
  private readonly onPointerMove = (event: PointerEvent): void => {
    const press = this.press;
    if (!press || event.pointerId !== press.pointer) return;
    const from = press.lastPoint;
    const step = this.board.getBoundingClientRect().width / this.size / 3;
    const steps = Math.max(1, Math.ceil(Math.hypot(event.clientX - from.x, event.clientY - from.y) / step));
    for (let i = 1; i <= steps; i++) {
      const cell = this.cellAt(from.x + ((event.clientX - from.x) * i) / steps, from.y + ((event.clientY - from.y) * i) / steps);
      if (cell >= 0 && (press.stroke || cell !== press.start)) this.slideOver(press, cell);
    }
    press.lastPoint = { x: event.clientX, y: event.clientY };
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const press = this.press;
    if (!press || event.pointerId !== press.pointer) return;
    this.press = null;
    if (press.stroke) this.commit(press.stroke.changes);
    else if (press.tapTool === Mark.Cat) this.tryCat(press.start);
    else this.toggleCross(press.start);
  };

  /** A cancelled press keeps the crosses it drew but never counts as a tap. */
  private readonly cancelPress = (event: PointerEvent): void => {
    const press = this.press;
    if (!press || event.pointerId !== press.pointer) return;
    this.press = null;
    if (press.stroke) this.commit(press.stroke.changes);
  };

  /**
   * The first cell left turns the press into a stroke: it adds crosses, or clears them when it
   * starts on a cross. Cats are never touched.
   */
  private slideOver(press: Press, cell: number): void {
    if (!press.stroke) {
      const startMark = this.nap.marks[press.start];
      const from = startMark !== Mark.Cat ? startMark : this.nap.marks[cell] === Mark.Cross ? Mark.Cross : Mark.None;
      press.stroke = { from, to: from === Mark.Cross ? Mark.None : Mark.Cross, changes: [] };
      this.applyStroke(press.stroke, press.start);
    }
    this.applyStroke(press.stroke, cell);
  }

  private applyStroke(stroke: NonNullable<Press['stroke']>, cell: number): void {
    if (this.nap.marks[cell] !== stroke.from) return;
    stroke.changes.push({ cell, before: stroke.from });
    this.setMark(cell, stroke.to);
  }

  private toggleCross(cell: number): void {
    const before = this.nap.marks[cell];
    if (before === Mark.Cat) return;
    this.setMark(cell, before === Mark.Cross ? Mark.None : Mark.Cross);
    this.commit([{ cell, before }]);
  }

  /** A cat only stays where one sleeps; anywhere else it is a mistake, and the cell gets its cross. */
  private tryCat(cell: number): void {
    const before = this.nap.marks[cell];
    if (before === Mark.Cat) return;
    const right = this.nap.cats[Math.floor(cell / this.size)] === cell % this.size;
    if (right) {
      this.setMark(cell, Mark.Cat);
      this.cells[cell].classList.add('just-placed');
    } else {
      this.nap.mistakes++;
      this.refreshLives();
      this.flashMistake(cell);
      this.setMark(cell, Mark.Cross);
    }
    this.commit([{ cell, before }]);
    if (right && this.catsPlaced() === this.size) this.win();
    else if (this.nap.mistakes >= LIVES) this.lose();
  }

  private flashMistake(cell: number): void {
    const element = this.cells[cell];
    const ghost = el('span', { class: 'nap-ghost' });
    ghost.innerHTML = sleepingCat(Math.floor(cell / this.size));
    element.append(ghost);
    window.setTimeout(() => ghost.remove(), 700);
  }

  private cellAt(x: number, y: number): number {
    const rect = this.board.getBoundingClientRect();
    const col = Math.floor(((x - rect.left) / rect.width) * this.size);
    const row = Math.floor(((y - rect.top) / rect.height) * this.size);
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) return -1;
    return row * this.size + col;
  }

  // -----------------------------------------------
  // STATE
  // -----------------------------------------------

  private commit(changes: Change[]): void {
    if (changes.length === 0) return;
    this.undoStack.push(changes);
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
    this.refreshUndo();
    saveNap(this.save);
  }

  /** Takes marks back; a mistake stays counted. */
  private undo(): void {
    const changes = this.undoStack.pop();
    if (!changes || this.over) return;
    for (let i = changes.length - 1; i >= 0; i--) this.setMark(changes[i].cell, changes[i].before);
    this.refreshUndo();
    saveNap(this.save);
  }

  private clearCrosses(): void {
    if (this.over) return;
    const changes: Change[] = [];
    this.nap.marks.forEach((mark, cell) => {
      if (mark !== Mark.Cross) return;
      changes.push({ cell, before: mark });
      this.setMark(cell, Mark.None);
    });
    this.commit(changes);
  }

  private setMark(cell: number, mark: Mark): void {
    this.nap.marks[cell] = mark;
    this.paintCell(cell);
  }

  private paintCell(cell: number): void {
    const element = this.cells[cell];
    const mark = this.nap.marks[cell];
    element.classList.toggle('has-cat', mark === Mark.Cat);
    element.classList.toggle('has-cross', mark === Mark.Cross);
    element.classList.remove('just-placed');
    if (mark === Mark.Cat) element.innerHTML = sleepingCat(Math.floor(cell / this.size));
    else if (mark === Mark.Cross) element.innerHTML = PAW;
    else element.textContent = '';
  }

  private catsPlaced(): number {
    return this.nap.marks.filter((mark) => mark === Mark.Cat).length;
  }

  private refreshUndo(): void {
    this.undoButton.disabled = this.undoStack.length === 0;
  }

  /** One heart per life, the lost ones greyed. */
  private refreshLives(): void {
    const left = Math.max(0, LIVES - this.nap.mistakes);
    this.livesEl.replaceChildren(...Array.from({ length: LIVES }, (_, i) => el('span', { class: i < left ? 'nap-heart' : 'nap-heart is-gone', text: '♥' })));
    this.livesEl.setAttribute('aria-label', `${left} vie${left > 1 ? 's' : ''}`);
  }

  /** The room is saved back to its start at once: leaving the page does not dodge the restart. */
  private lose(): void {
    this.over = true;
    this.board.classList.add('is-lost');
    this.nap.marks.fill(Mark.None);
    this.nap.mistakes = 0;
    saveNap(this.save);
    const again = el('button', { class: 'button', type: 'button' }, 'Recommencer le salon');
    again.addEventListener('click', () => this.actions.restartRoom());
    this.controls.replaceChildren(
      el('p', { class: 'nap-win', text: 'Oh non, les chats se sont réveillés !' }),
      el('p', { class: 'nap-lost-hint', text: `${LIVES} erreurs : le salon recommence à zéro.` }),
      el('div', { class: 'button-row' }, again, el('a', { class: 'button button-secondary', href: '#/elomew' }, 'Menu')),
    );
  }

  private win(): void {
    this.over = true;
    this.board.classList.add('is-solved');
    const stars = starsForMistakes(this.nap.mistakes);
    const difficulty = this.nap.difficulty;
    this.save.roomsDone++;
    this.save.bestStars[difficulty] = Math.max(this.save.bestStars[difficulty], stars);
    this.save.current = null;
    saveNap(this.save);
    const reward = levelReward(stars, difficulty);
    const next = el('button', { class: 'button', type: 'button' }, 'Salon suivant');
    next.addEventListener('click', () => this.actions.nextRoom());
    this.controls.replaceChildren(
      el('p', { class: 'nap-stars', text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }),
      el('p', { class: 'nap-win', text: 'Tous les chats dorment, chut !' }),
      reward,
      el('div', { class: 'button-row' }, next, el('a', { class: 'button button-secondary', href: '#/elomew' }, 'Menu')),
    );
  }
}
