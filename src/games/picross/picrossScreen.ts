import './picross.css';
import { el, topBar } from '../../dom';
import { createCreature } from '../../creatures/creature';
import { difficultyForSize } from '../../pictures/pixelPicture';
import { addCreature } from '../../creatures/garden';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { difficultyName } from '../../difficulty';
import { levelReward } from '../../companion/reward';
import { navigate } from '../../navigation';
import { PICROSS_HELP } from './picrossHelp';
import { drawGrid, puzzleFrom, type Puzzle } from './generator';
import { findModel } from '../../pictures/pixelModels';
import { EMPTY_CELL, modelSize, type PixelModel } from '../../pictures/pixelModel';
import { addModelDrawing, discoveredModels } from '../../pictures/notebook';
import { clueOf, sameClue } from './lines';
import { Mark, emptyMarks, loadPicross, savePicross, type InProgress, type PicrossSave } from './picrossSave';

const SIZES = [
  { size: 5, label: 'Petit' },
  { size: 10, label: 'Moyen' },
  { size: 15, label: 'Grand' },
];

/** The challenge grid is the medium one. */
const CHALLENGE_SIZE = 10;

export function startPicrossChallenge(day: string): void {
  const save = loadPicross();
  if (save.current && save.current.marks.some((row) => row.some((mark) => mark !== Mark.None))) {
    if (!confirm('Le défi remplace ta grille de Picross en cours. On y va ?')) return;
  }
  save.current = { ...drawGrid(CHALLENGE_SIZE, discoveredModels()), marks: emptyMarks(CHALLENGE_SIZE), elapsedMs: 0, challenge: day };
  savePicross(save);
  navigate('#/picross');
}

export function renderPicross(root: HTMLElement): () => void {
  const save = loadPicross();
  let game: PicrossGame | null = null;

  const leaveGame = () => {
    game?.dispose();
    game = null;
  };
  const showPicker = () => {
    leaveGame();
    root.replaceChildren(sizePicker(save, startNew));
  };
  const startNew = (size: number) => {
    leaveGame();
    save.current = { ...drawGrid(size, discoveredModels()), marks: emptyMarks(size), elapsedMs: 0 };
    savePicross(save);
    showGame(save.current);
  };
  const showGame = (state: InProgress) => {
    root.replaceChildren();
    game = new PicrossGame(root, save, state, { newGrid: startNew, changeSize: showPicker });
  };

  if (save.current) showGame(save.current);
  else showPicker();
  return leaveGame;
}

// -----------------------------------------------
// SIZE PICKER
// -----------------------------------------------

function sizePicker(save: PicrossSave, onPick: (size: number) => void): HTMLElement {
  const cards = SIZES.map(({ size, label }) => {
    const solved = save.solvedBySize[size] ?? 0;
    const card = el(
      'button',
      { class: 'size-card', type: 'button' },
      el('strong', { text: label }),
      el('span', { text: `${size} × ${size} · ${difficultyName(difficultyForSize(size))}` }),
      el('span', { class: 'size-card-count', text: solvedText(solved) }),
    );
    card.addEventListener('click', () => onPick(size));
    return card;
  });
  return el(
    'div',
    { class: 'picross' },
    topBar('Picross'),
    el('main', { class: 'size-picker' }, el('h2', { text: 'Choisis une taille' }), ...cards),
  );
}

function solvedText(count: number): string {
  if (count === 0) return 'Aucune grille terminée';
  return count === 1 ? '1 grille terminée' : `${count} grilles terminées`;
}

// -----------------------------------------------
// GAME
// -----------------------------------------------

interface Change {
  row: number;
  col: number;
  before: Mark;
}

interface Stroke {
  pointerId: number;
  startRow: number;
  startCol: number;
  /** Mark of the first cell touched: erasing only removes this mark. */
  from: Mark;
  to: Mark;
  axis: 'row' | 'col' | null;
  lastIndex: number;
  changes: Change[];
}

interface GameActions {
  newGrid(size: number): void;
  changeSize(): void;
}

const MAX_UNDO = 200;

class PicrossGame {
  private readonly puzzle: Puzzle;
  private readonly size: number;
  private readonly board: HTMLElement;
  private readonly cells: HTMLElement[][] = [];
  private readonly rowClueEls: HTMLElement[] = [];
  private readonly colClueEls: HTMLElement[] = [];
  private readonly timerEl = el('span', { class: 'timer', text: '0:00' });
  private readonly controls: HTMLElement;
  private readonly undoButton: HTMLButtonElement;
  private readonly toolButtons = new Map<Mark, HTMLButtonElement>();
  private readonly undoStack: Change[][] = [];
  private tool: Mark = Mark.Fill;
  private stroke: Stroke | null = null;
  private runningSince: number | null = null;
  private timerId = 0;
  private solved = false;

  constructor(
    root: HTMLElement,
    private readonly save: PicrossSave,
    private readonly state: InProgress,
    private readonly actions: GameActions,
  ) {
    this.puzzle = puzzleFrom(state.solution);
    this.size = this.puzzle.size;
    this.board = this.buildBoard();
    this.undoButton = el('button', { class: 'button button-secondary', type: 'button' }, '↶ Annuler');
    this.undoButton.addEventListener('click', () => this.undo());
    this.controls = this.buildControls();

    root.append(
      el(
        'div',
        { class: 'picross' },
        topBar(
          `Picross ${this.size}×${this.size} · ${state.challenge ? 'Défi du jour' : difficultyName(difficultyForSize(this.size))}`,
          helpSlot(PICROSS_HELP, this.timerEl),
        ),
        el('div', { class: 'board-wrap' }, this.board),
        this.controls,
        el('p', { class: 'hint-mouse', text: 'Clic droit : poser une croix.' }),
      ),
    );

    for (let r = 0; r < this.size; r++) this.refreshRowClue(r);
    for (let c = 0; c < this.size; c++) this.refreshColClue(c);
    this.refreshUndo();
    this.fitBoard();

    this.board.addEventListener('pointerdown', this.onPointerDown);
    this.board.addEventListener('pointermove', this.onPointerMove);
    this.board.addEventListener('pointerup', this.endStroke);
    this.board.addEventListener('pointercancel', this.endStroke);
    this.board.addEventListener('lostpointercapture', this.endStroke);
    this.board.addEventListener('contextmenu', preventDefault);
    window.addEventListener('resize', this.fitBoard);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.resumeTimer();
    openHelpOnFirstVisit(PICROSS_HELP);
  }

  dispose(): void {
    this.pauseTimer();
    if (!this.solved) savePicross(this.save);
    window.removeEventListener('resize', this.fitBoard);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  // -----------------------------------------------
  // BUILDING
  // -----------------------------------------------

  private buildBoard(): HTMLElement {
    const board = el('div', { class: 'board' });
    board.style.setProperty('--size', String(this.size));
    board.append(el('div', { class: 'board-corner' }));

    for (const clue of this.puzzle.colClues) {
      const clueEl = el('div', { class: 'clue clue-col' }, ...clueNumbers(clue));
      this.colClueEls.push(clueEl);
      board.append(clueEl);
    }
    for (let r = 0; r < this.size; r++) {
      const clueEl = el('div', { class: 'clue clue-row' }, ...clueNumbers(this.puzzle.rowClues[r]));
      this.rowClueEls.push(clueEl);
      board.append(clueEl);

      const rowCells: HTMLElement[] = [];
      for (let c = 0; c < this.size; c++) {
        const cell = el('div', { class: 'cell' });
        if (r === 0) cell.classList.add('edge-top');
        if (c === 0) cell.classList.add('edge-left');
        if (c % 5 === 4 || c === this.size - 1) cell.classList.add('edge-right');
        if (r % 5 === 4 || r === this.size - 1) cell.classList.add('edge-bottom');
        rowCells.push(cell);
        board.append(cell);
        this.paintCell(r, c, cell);
      }
      this.cells.push(rowCells);
    }
    return board;
  }

  private buildControls(): HTMLElement {
    const toolRow = el('div', { class: 'tool-toggle', role: 'group', 'aria-label': 'Outil' });
    for (const [mark, label] of [
      [Mark.Fill, '■ Remplir'],
      [Mark.Cross, '✕ Croix'],
    ] as const) {
      const button = el('button', { class: 'tool-button', type: 'button' }, label);
      button.addEventListener('click', () => this.selectTool(mark));
      this.toolButtons.set(mark, button);
      toolRow.append(button);
    }
    this.selectTool(Mark.Fill);

    const newButton = el('button', { class: 'button button-secondary', type: 'button' }, 'Nouvelle grille');
    newButton.addEventListener('click', () => {
      if (this.hasProgress() && !confirm('Abandonner cette grille ?')) return;
      this.actions.newGrid(this.size);
    });

    return el('div', { class: 'controls' }, toolRow, el('div', { class: 'button-row' }, this.undoButton, newButton));
  }

  private selectTool(mark: Mark): void {
    this.tool = mark;
    for (const [toolMark, button] of this.toolButtons) {
      button.classList.toggle('is-active', toolMark === mark);
      button.setAttribute('aria-pressed', String(toolMark === mark));
    }
  }

  /** Cell size from the room left on screen, so the whole grid fits without scrolling. */
  private readonly fitBoard = (): void => {
    const longestRowClue = Math.max(1, ...this.puzzle.rowClues.map((clue) => clue.length));
    const longestColClue = Math.max(1, ...this.puzzle.colClues.map((clue) => clue.length));
    const width = Math.min(window.innerWidth - 24, 720);
    const height = window.innerHeight - 210;
    const byWidth = width / (this.size + longestRowClue * 0.6 + 0.6);
    const byHeight = height / (this.size + longestColClue * 0.75 + 0.6);
    const cell = Math.floor(Math.max(16, Math.min(44, byWidth, byHeight)));
    this.board.style.setProperty('--cell', `${cell}px`);
  };

  // -----------------------------------------------
  // INPUT
  // -----------------------------------------------

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.solved || this.stroke || (event.button !== 0 && event.button !== 2)) return;
    const hit = this.cellAt(event.clientX, event.clientY);
    if (!hit.inside) return;
    event.preventDefault();
    this.board.setPointerCapture(event.pointerId);

    const tool = event.button === 2 ? Mark.Cross : this.tool;
    const from = this.state.marks[hit.row][hit.col];
    this.stroke = {
      pointerId: event.pointerId,
      startRow: hit.row,
      startCol: hit.col,
      from,
      to: from === Mark.None ? tool : Mark.None,
      axis: null,
      lastIndex: 0,
      changes: [],
    };
    this.applyStroke(hit.row, hit.col);
  };

  /** The stroke locks onto the row or column it first moves along, like in Picross games. */
  private readonly onPointerMove = (event: PointerEvent): void => {
    const stroke = this.stroke;
    if (!stroke || event.pointerId !== stroke.pointerId) return;
    const hit = this.cellAt(event.clientX, event.clientY);

    if (stroke.axis === null) {
      const rowDelta = Math.abs(hit.row - stroke.startRow);
      const colDelta = Math.abs(hit.col - stroke.startCol);
      if (rowDelta === 0 && colDelta === 0) return;
      stroke.axis = colDelta >= rowDelta ? 'row' : 'col';
      stroke.lastIndex = stroke.axis === 'row' ? stroke.startCol : stroke.startRow;
    }

    const target = stroke.axis === 'row' ? hit.col : hit.row;
    const step = Math.sign(target - stroke.lastIndex);
    while (stroke.lastIndex !== target) {
      stroke.lastIndex += step;
      if (stroke.axis === 'row') this.applyStroke(stroke.startRow, stroke.lastIndex);
      else this.applyStroke(stroke.lastIndex, stroke.startCol);
    }
  };

  private readonly endStroke = (event: PointerEvent): void => {
    const stroke = this.stroke;
    if (!stroke || event.pointerId !== stroke.pointerId) return;
    this.stroke = null;
    if (stroke.changes.length === 0) return;

    this.undoStack.push(stroke.changes);
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
    this.refreshUndo();
    this.commitTime();
    savePicross(this.save);
    if (this.isComplete()) this.win();
  };

  private cellAt(x: number, y: number): { row: number; col: number; inside: boolean } {
    const first = this.cells[0][0].getBoundingClientRect();
    const last = this.cells[this.size - 1][this.size - 1].getBoundingClientRect();
    const col = Math.floor(((x - first.left) / (last.right - first.left)) * this.size);
    const row = Math.floor(((y - first.top) / (last.bottom - first.top)) * this.size);
    const inside = row >= 0 && row < this.size && col >= 0 && col < this.size;
    return { row: clamp(row, 0, this.size - 1), col: clamp(col, 0, this.size - 1), inside };
  }

  private applyStroke(row: number, col: number): void {
    const stroke = this.stroke!;
    const current = this.state.marks[row][col];
    const allowed = stroke.to === Mark.None ? current === stroke.from : current === Mark.None;
    if (!allowed || current === stroke.to) return;
    stroke.changes.push({ row, col, before: current });
    this.setMark(row, col, stroke.to);
  }

  private undo(): void {
    const changes = this.undoStack.pop();
    if (!changes || this.solved) return;
    for (let i = changes.length - 1; i >= 0; i--) this.setMark(changes[i].row, changes[i].col, changes[i].before);
    this.refreshUndo();
    savePicross(this.save);
  }

  // -----------------------------------------------
  // STATE
  // -----------------------------------------------

  private setMark(row: number, col: number, mark: Mark): void {
    this.state.marks[row][col] = mark;
    this.paintCell(row, col, this.cells[row][col]);
    this.refreshRowClue(row);
    this.refreshColClue(col);
  }

  private paintCell(row: number, col: number, cell: HTMLElement): void {
    const mark = this.state.marks[row][col];
    cell.classList.toggle('is-filled', mark === Mark.Fill);
    cell.classList.toggle('is-crossed', mark === Mark.Cross);
  }

  private refreshRowClue(row: number): void {
    const filled = this.state.marks[row].map((mark) => mark === Mark.Fill);
    this.rowClueEls[row].classList.toggle('is-done', sameClue(clueOf(filled), this.puzzle.rowClues[row]));
  }

  private refreshColClue(col: number): void {
    const filled = this.state.marks.map((row) => row[col] === Mark.Fill);
    this.colClueEls[col].classList.toggle('is-done', sameClue(clueOf(filled), this.puzzle.colClues[col]));
  }

  private refreshUndo(): void {
    this.undoButton.disabled = this.undoStack.length === 0;
  }

  private hasProgress(): boolean {
    return this.state.marks.some((row) => row.some((mark) => mark !== Mark.None));
  }

  /** Checked on the clues, not on the stored solution: any grid that matches them wins. */
  private isComplete(): boolean {
    return this.rowClueEls.every((clue) => clue.classList.contains('is-done'))
      && this.colClueEls.every((clue) => clue.classList.contains('is-done'));
  }

  private win(): void {
    this.solved = true;
    this.pauseTimer();
    const key = String(this.size);
    this.save.solvedBySize[key] = (this.save.solvedBySize[key] ?? 0) + 1;
    const time = formatTime(this.state.elapsedMs);
    const prize = this.claimPrize();
    this.save.current = null;
    savePicross(this.save);
    const reward = levelReward(null, difficultyForSize(this.size), this.state.challenge);
    this.board.classList.add('is-solved');

    const again = el('button', { class: 'button button-secondary', type: 'button' }, 'Nouvelle grille');
    again.addEventListener('click', () => this.actions.newGrid(this.size));
    const otherSize = el('button', { class: 'button button-secondary', type: 'button' }, 'Changer de taille');
    otherSize.addEventListener('click', () => this.actions.changeSize());
    this.controls.replaceChildren(
      el('p', { class: 'win-message' }, el('strong', { text: 'Bravo !' }), ` Grille terminée en ${time}.`),
      el('p', { class: 'win-creature' }, ...prize.message),
      reward,
      el('div', { class: 'button-row' }, prize.colorLink, again, otherSize),
    );
  }

  /** A model grid adds its drawing to the notebook; any other grid makes a creature for the garden. */
  private claimPrize(): { message: (string | Node)[]; colorLink: HTMLElement } {
    const model = this.state.modelId ? findModel(this.state.modelId) : undefined;
    if (model && modelSize(model) === this.size) {
      const drawing = addModelDrawing(model, 'picross');
      this.revealModel(model);
      return {
        message: ['Un dessin rejoint ton carnet : ', el('strong', { text: model.name })],
        colorLink: el('a', { class: 'button', href: `#/pixel/${drawing.id}` }, 'Le colorier'),
      };
    }
    const creature = createCreature(this.state.solution);
    addCreature(creature);
    this.board.style.setProperty('--reveal-color', creature.palette[0]);
    return {
      message: [creature.rarity ? '✨ Une bête RARE est apparue : ' : 'Une petite bête est apparue : ', el('strong', { text: creature.name })],
      colorLink: el('a', { class: 'button', href: `#/colorier/${creature.id}` }, 'La colorier'),
    };
  }

  /** Each filled cell takes its colour in the model; a cell of another solution takes the main colour. */
  private revealModel(model: PixelModel): void {
    this.board.style.setProperty('--reveal-color', model.colors[0]);
    model.rows.forEach((row, r) =>
      [...row].forEach((char, c) => {
        if (char !== EMPTY_CELL) this.cells[r][c].style.setProperty('--reveal-color', model.colors[Number(char)]);
      }),
    );
  }

  // -----------------------------------------------
  // TIMER
  // -----------------------------------------------

  private elapsedMs(): number {
    return this.state.elapsedMs + (this.runningSince === null ? 0 : performance.now() - this.runningSince);
  }

  private commitTime(): void {
    if (this.runningSince === null) return;
    const now = performance.now();
    this.state.elapsedMs += now - this.runningSince;
    this.runningSince = now;
  }

  private resumeTimer(): void {
    if (this.solved || this.runningSince !== null) return;
    this.runningSince = performance.now();
    this.timerEl.textContent = formatTime(this.elapsedMs());
    this.timerId = window.setInterval(() => (this.timerEl.textContent = formatTime(this.elapsedMs())), 1000);
  }

  private pauseTimer(): void {
    this.commitTime();
    this.runningSince = null;
    window.clearInterval(this.timerId);
    this.timerEl.textContent = formatTime(this.state.elapsedMs);
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.pauseTimer();
      if (!this.solved) savePicross(this.save);
    } else {
      this.resumeTimer();
    }
  };
}

// -----------------------------------------------
// HELPERS
// -----------------------------------------------

function clueNumbers(clue: readonly number[]): HTMLElement[] {
  const numbers = clue.length === 0 ? [0] : clue;
  return numbers.map((length) => el('span', { text: String(length) }));
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function preventDefault(event: Event): void {
  event.preventDefault();
}
