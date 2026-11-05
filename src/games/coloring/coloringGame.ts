import './coloring.css';
import { el, topBar, type BackLink } from '../../dom';
import { isDarkColor } from '../../color';
import { colorIndexAt, difficultyForSize, paintedChar, paintedColorAt, type PixelPicture } from '../../pictures/pixelPicture';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { earnCoins } from '../../companion/companionSave';
import { rewardBanner } from '../../companion/reward';
import { COLORING_HELP } from './coloringHelp';

// -----------------------------------------------
// COLOURING A PIXEL PICTURE BY NUMBERS
// -----------------------------------------------

/** Mistakes allowed for three stars, as a share of the picture's pixels; two and one star allow 3x and 6x that. */
const MISTAKE_SHARE_FOR_THREE_STARS = 0.02;

/** Where the picture lives: the garden for a creature, the notebook for a drawing. */
export interface ColoringHost<T extends PixelPicture> {
  back: BackLink;
  save(picture: T): void;
  /** Follows the picture's name on the win screen: " a rejoint le jardin !". */
  doneText(justNow: boolean): string;
  doneLinks(): HTMLElement[];
}

export function starsForMistakes(mistakes: number, pixelCount: number): number {
  const allowed = Math.max(1, Math.round(pixelCount * MISTAKE_SHARE_FOR_THREE_STARS));
  if (mistakes <= allowed) return 3;
  if (mistakes <= allowed * 3) return 2;
  return mistakes <= allowed * 6 ? 1 : 0;
}

export class ColoringGame<T extends PixelPicture> {
  private readonly size: number;
  private readonly pixelCount: number;
  /** Right palette index per pixel, -1 outside the picture. */
  private readonly colorIndex: number[][];
  /** Palette index painted per pixel, -1 when unpainted. */
  private readonly painted: number[][];
  private readonly cells: HTMLElement[][] = [];
  private readonly swatches: HTMLButtonElement[] = [];
  private readonly board = el('div', { class: 'coloring-board' });
  private readonly progressEl = el('span', { class: 'coloring-progress' });
  private readonly mistakesEl = el('p', { class: 'coloring-mistakes' });
  private readonly footer: HTMLElement;
  private selected = 0;
  private mistakes: number;
  private strokePointer: number | null = null;
  private lastPoint: { x: number; y: number } | null = null;
  /** Cells already counted as a mistake during the current stroke: dragging over one costs once. */
  private strokeMistakes = new Set<number>();
  private dirty = false;

  constructor(
    root: HTMLElement,
    private readonly picture: T,
    private readonly host: ColoringHost<T>,
  ) {
    this.size = picture.size;
    this.colorIndex = picture.pixels.map((_, r) => [...Array(this.size)].map((__, c) => colorIndexAt(picture, r, c)));
    this.painted = picture.pixels.map((_, r) => [...Array(this.size)].map((__, c) => paintedColorAt(picture, r, c)));
    this.pixelCount = this.colorIndex.flat().filter((index) => index >= 0).length;
    this.mistakes = picture.mistakes ?? 0;

    this.buildBoard();
    this.footer = el('div', { class: 'coloring-footer' }, this.buildPalette(), this.mistakesEl);
    root.append(
      el(
        'div',
        { class: 'coloring' },
        topBar(picture.name, helpSlot(COLORING_HELP, this.progressEl), host.back),
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
    this.picture.palette.forEach((color, index) => {
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
    const height = window.innerHeight - 250;
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
    this.strokeMistakes = new Set();
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
    else if (this.remaining(this.selected) === 0) this.select(this.nextColor(this.selected));
  };

  /** Paints whatever is under the finger: the wrong colour sticks too, and counts as a mistake. */
  private paintAt(x: number, y: number): void {
    const rect = this.board.getBoundingClientRect();
    const col = Math.floor(((x - rect.left) / rect.width) * this.size);
    const row = Math.floor(((y - rect.top) / rect.height) * this.size);
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) return;

    const right = this.colorIndex[row][col];
    if (right < 0) {
      this.countMistake(row, col);
      return;
    }
    if (this.painted[row][col] === this.selected) return;

    this.painted[row][col] = this.selected;
    if (this.selected !== right) this.countMistake(row, col);
    this.dirty = true;
    this.paintCell(row, col);
    this.cells[row][col].classList.add('just-painted');
    this.refreshProgress();
    this.refreshSwatches();
  }

  private countMistake(row: number, col: number): void {
    const key = row * this.size + col;
    const cell = this.cells[row][col];
    cell.classList.remove('oops');
    void cell.offsetWidth; // restarts the animation on a cell flashed a moment ago
    cell.classList.add('oops');
    if (this.strokeMistakes.has(key)) return;
    this.strokeMistakes.add(key);
    this.mistakes++;
    this.dirty = true;
    this.refreshProgress();
  }

  private cellSize(): number {
    return this.board.getBoundingClientRect().width / this.size;
  }

  // -----------------------------------------------
  // STATE
  // -----------------------------------------------

  private isRight(row: number, col: number): boolean {
    return this.painted[row][col] === this.colorIndex[row][col];
  }

  /** Pixels of this colour not painted right yet. */
  private remaining(color: number): number {
    let count = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) if (this.colorIndex[r][c] === color && !this.isRight(r, c)) count++;
    }
    return count;
  }

  private select(index: number): void {
    this.selected = index;
    this.refreshSwatches();
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        this.cells[r][c].classList.toggle('is-target', !this.isRight(r, c) && this.colorIndex[r][c] === index);
      }
    }
  }

  /** First colour with pixels left, starting at `from` and wrapping around. */
  private nextColor(from: number): number {
    const count = this.picture.palette.length;
    for (let i = 0; i < count; i++) {
      const index = (from + i) % count;
      if (this.remaining(index) > 0) return index;
    }
    return from;
  }

  private paintCell(row: number, col: number): void {
    const cell = this.cells[row][col];
    const right = this.colorIndex[row][col];
    if (right < 0) return;
    const painted = this.painted[row][col];
    cell.classList.toggle('is-painted', painted >= 0);
    cell.classList.toggle('is-wrong', painted >= 0 && painted !== right);
    cell.classList.toggle('is-dark', painted >= 0 && isDarkColor(this.picture.palette[painted]));
    cell.style.background = painted >= 0 ? this.picture.palette[painted] : '';
    // A wrong cell keeps its number so she can see what it should be.
    cell.textContent = painted === right ? '' : String(right + 1);
    if (painted === right) cell.classList.remove('is-target');
    else cell.classList.toggle('is-target', right === this.selected);
  }

  private refreshSwatches(): void {
    this.swatches.forEach((swatch, index) => {
      swatch.classList.toggle('is-active', index === this.selected);
      swatch.classList.toggle('is-complete', this.remaining(index) === 0);
      swatch.setAttribute('aria-pressed', String(index === this.selected));
    });
  }

  private refreshProgress(): void {
    let right = 0;
    for (let r = 0; r < this.size; r++) for (let c = 0; c < this.size; c++) if (this.colorIndex[r][c] >= 0 && this.isRight(r, c)) right++;
    this.progressEl.textContent = `${Math.round((right / this.pixelCount) * 100)} %`;
    this.mistakesEl.textContent = this.mistakes === 0 ? 'Aucune erreur' : this.mistakes === 1 ? '1 erreur' : `${this.mistakes} erreurs`;
    this.mistakesEl.classList.toggle('has-mistakes', this.mistakes > 0);
  }

  private isFinished(): boolean {
    return this.picture.palette.every((_, color) => this.remaining(color) === 0);
  }

  private save(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.picture.painted = this.painted.map((row, r) => row.map((painted, c) => paintedChar(this.colorIndex[r][c], painted)).join(''));
    this.picture.mistakes = this.mistakes;
    this.host.save(this.picture);
  }

  private finish(justNow: boolean): void {
    this.board.classList.add('is-finished');
    let coins: number | null = null;
    if (justNow) {
      this.board.classList.add('celebrate');
      this.picture.stars = starsForMistakes(this.mistakes, this.pixelCount);
      this.dirty = true;
      this.save();
      coins = earnCoins(this.picture.stars, difficultyForSize(this.size));
    }
    const stars = this.picture.stars ?? starsForMistakes(this.mistakes, this.pixelCount);
    this.footer.replaceChildren(
      el('p', { class: 'coloring-stars', text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }),
      el(
        'p',
        { class: 'coloring-done' },
        el('strong', { text: this.picture.name }),
        this.host.doneText(justNow),
        ` (${this.mistakesEl.textContent?.toLowerCase()})`,
      ),
      coins === null ? '' : rewardBanner(coins),
      el('div', { class: 'button-row' }, ...this.host.doneLinks()),
    );
  }
}
