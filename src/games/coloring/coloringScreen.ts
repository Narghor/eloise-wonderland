import './coloring.css';
import { BACK_GARDEN, el, topBar } from '../../dom';
import { isDarkColor } from '../../color';
import { colorIndexAt, isPaintedAt, type Creature } from '../../creatures/creature';
import { findCreature, updateCreature } from '../../creatures/garden';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { COLORING_HELP } from './coloringHelp';

export function renderColoring(root: HTMLElement, params: string[]): () => void {
  const creature = findCreature(params[0] ?? '');
  if (!creature) {
    root.append(
      el(
        'div',
        { class: 'coloring' },
        topBar('Coloriage', undefined, BACK_GARDEN),
        el('p', { class: 'empty-message', text: "Cette petite bête n'est pas dans ton jardin." }),
      ),
    );
    return () => {};
  }
  const game = new ColoringGame(root, creature);
  return () => game.dispose();
}

class ColoringGame {
  private readonly size: number;
  private readonly colorIndex: number[][];
  private readonly painted: boolean[][];
  private readonly remaining: number[];
  private readonly cells: HTMLElement[][] = [];
  private readonly swatches: HTMLButtonElement[] = [];
  private readonly board = el('div', { class: 'coloring-board' });
  private readonly progressEl = el('span', { class: 'coloring-progress' });
  private readonly footer: HTMLElement;
  private selected = 0;
  private strokePointer: number | null = null;
  private lastPoint: { x: number; y: number } | null = null;
  private dirty = false;

  constructor(
    root: HTMLElement,
    private readonly creature: Creature,
  ) {
    this.size = creature.size;
    this.colorIndex = creature.pixels.map((_, r) => [...Array(this.size)].map((__, c) => colorIndexAt(creature, r, c)));
    this.painted = creature.pixels.map((_, r) => [...Array(this.size)].map((__, c) => isPaintedAt(creature, r, c)));
    this.remaining = creature.palette.map(() => 0);
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const index = this.colorIndex[r][c];
        if (index >= 0 && !this.painted[r][c]) this.remaining[index]++;
      }
    }

    this.buildBoard();
    this.footer = el('div', { class: 'coloring-footer' }, this.buildPalette());
    root.append(
      el(
        'div',
        { class: 'coloring' },
        topBar(creature.name, helpSlot(COLORING_HELP, this.progressEl), BACK_GARDEN),
        el('div', { class: 'coloring-board-wrap' }, this.board),
        this.footer,
      ),
    );

    this.refreshProgress();
    this.fitBoard();
    if (this.isFinished()) this.finish(false);
    else this.select(this.nextColor(0));

    this.board.addEventListener('pointerdown', this.onPointerDown);
    this.board.addEventListener('pointermove', this.onPointerMove);
    this.board.addEventListener('pointerup', this.endStroke);
    this.board.addEventListener('pointercancel', this.endStroke);
    this.board.addEventListener('lostpointercapture', this.endStroke);
    this.board.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('resize', this.fitBoard);
    openHelpOnFirstVisit(COLORING_HELP);
  }

  dispose(): void {
    window.removeEventListener('resize', this.fitBoard);
    this.save();
  }

  // -----------------------------------------------
  // BUILDING
  // -----------------------------------------------

  private buildBoard(): void {
    this.board.style.setProperty('--size', String(this.size));
    for (let r = 0; r < this.size; r++) {
      const row: HTMLElement[] = [];
      for (let c = 0; c < this.size; c++) {
        const cell = el('div', { class: 'pixel' });
        if (this.colorIndex[r][c] < 0) cell.classList.add('is-outside');
        row.push(cell);
        this.board.append(cell);
      }
      this.cells.push(row);
    }
    for (let r = 0; r < this.size; r++) for (let c = 0; c < this.size; c++) this.paintCell(r, c);
  }

  private buildPalette(): HTMLElement {
    const palette = el('div', { class: 'palette', role: 'group', 'aria-label': 'Couleurs' });
    this.creature.palette.forEach((color, index) => {
      const swatch = el('button', { class: 'swatch', type: 'button', 'aria-label': `Couleur ${index + 1}` }, String(index + 1));
      swatch.style.setProperty('--swatch', color);
      if (isDarkColor(color)) swatch.classList.add('is-dark');
      swatch.addEventListener('click', () => this.select(index));
      this.swatches.push(swatch);
      palette.append(swatch);
    });
    this.refreshSwatches();
    return palette;
  }

  private readonly fitBoard = (): void => {
    const width = Math.min(window.innerWidth - 32, 560);
    const height = window.innerHeight - 220;
    const cell = Math.floor(Math.max(14, Math.min(48, width / this.size, height / this.size)));
    this.board.style.setProperty('--cell', `${cell}px`);
  };

  // -----------------------------------------------
  // INPUT
  // -----------------------------------------------

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.strokePointer !== null || this.isFinished() || (event.button !== 0 && event.pointerType === 'mouse')) return;
    event.preventDefault();
    this.board.setPointerCapture(event.pointerId);
    this.strokePointer = event.pointerId;
    this.lastPoint = { x: event.clientX, y: event.clientY };
    this.paintAt(event.clientX, event.clientY);
  };

  /** Paints along the segment since the last event, so a fast swipe does not skip pixels. */
  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.strokePointer || !this.lastPoint) return;
    const from = this.lastPoint;
    const step = this.cellSize() / 3;
    const steps = Math.max(1, Math.ceil(Math.hypot(event.clientX - from.x, event.clientY - from.y) / step));
    for (let i = 1; i <= steps; i++) {
      this.paintAt(from.x + ((event.clientX - from.x) * i) / steps, from.y + ((event.clientY - from.y) * i) / steps);
    }
    this.lastPoint = { x: event.clientX, y: event.clientY };
  };

  private readonly endStroke = (event: PointerEvent): void => {
    if (event.pointerId !== this.strokePointer) return;
    this.strokePointer = null;
    this.lastPoint = null;
    this.save();
    if (this.isFinished()) this.finish(true);
    else if (this.remaining[this.selected] === 0) this.select(this.nextColor(this.selected));
  };

  private paintAt(x: number, y: number): void {
    const rect = this.board.getBoundingClientRect();
    const col = Math.floor(((x - rect.left) / rect.width) * this.size);
    const row = Math.floor(((y - rect.top) / rect.height) * this.size);
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) return;
    if (this.painted[row][col] || this.colorIndex[row][col] !== this.selected) return;

    this.painted[row][col] = true;
    this.remaining[this.selected]--;
    this.dirty = true;
    this.paintCell(row, col);
    this.cells[row][col].classList.add('just-painted');
    this.refreshProgress();
    if (this.remaining[this.selected] === 0) this.refreshSwatches();
  }

  private cellSize(): number {
    return this.board.getBoundingClientRect().width / this.size;
  }

  // -----------------------------------------------
  // STATE
  // -----------------------------------------------

  private select(index: number): void {
    this.selected = index;
    this.refreshSwatches();
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        this.cells[r][c].classList.toggle('is-target', !this.painted[r][c] && this.colorIndex[r][c] === index);
      }
    }
  }

  /** First colour with pixels left, starting at `from` and wrapping around. */
  private nextColor(from: number): number {
    const count = this.remaining.length;
    for (let i = 0; i < count; i++) {
      const index = (from + i) % count;
      if (this.remaining[index] > 0) return index;
    }
    return from;
  }

  private paintCell(row: number, col: number): void {
    const cell = this.cells[row][col];
    const index = this.colorIndex[row][col];
    if (index < 0) return;
    if (this.painted[row][col]) {
      cell.style.background = this.creature.palette[index];
      cell.textContent = '';
      cell.classList.remove('is-target');
      cell.classList.add('is-painted');
    } else {
      cell.textContent = String(index + 1);
    }
  }

  private refreshSwatches(): void {
    this.swatches.forEach((swatch, index) => {
      swatch.classList.toggle('is-active', index === this.selected);
      swatch.classList.toggle('is-complete', this.remaining[index] === 0);
      swatch.setAttribute('aria-pressed', String(index === this.selected));
    });
  }

  private refreshProgress(): void {
    const total = this.colorIndex.flat().filter((index) => index >= 0).length;
    const left = this.remaining.reduce((sum, count) => sum + count, 0);
    this.progressEl.textContent = `${Math.round(((total - left) / total) * 100)} %`;
  }

  private isFinished(): boolean {
    return this.remaining.every((count) => count === 0);
  }

  private save(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.creature.painted = this.painted.map((row) => row.map((done) => (done ? '1' : '0')).join(''));
    updateCreature(this.creature);
  }

  private finish(justNow: boolean): void {
    this.board.classList.add('is-finished');
    if (justNow) this.board.classList.add('celebrate');
    this.footer.replaceChildren(
      el(
        'p',
        { class: 'coloring-done' },
        el('strong', { text: this.creature.name }),
        justNow ? ' a rejoint le jardin !' : ' vit dans ton jardin.',
      ),
      el(
        'div',
        { class: 'button-row' },
        el('a', { class: 'button', href: '#/jardin' }, 'Voir le jardin'),
        el('a', { class: 'button button-secondary', href: '#/picross' }, 'Nouvelle grille'),
      ),
    );
  }
}
