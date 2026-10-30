import { el, topBar } from '../../dom';
import { isDarkColor } from '../../color';
import { difficultyName } from '../../difficulty';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { levelReward } from '../../companion/reward';
import { EMBROIDERY_HELP } from './embroideryHelp';
import { paintBack, paintFront, prepareCanvas } from './embroideryPainter';
import { decodeStitched, encodePath, starsForScore, unavoidableJumps, Work } from './embroideryPattern';
import { readPaths, saveEmbroidery, storeWork, type CurrentPiece, type EmbroiderySave } from './embroiderySave';

const FLASH_MS = 450;
const MENU_BACK = { href: '#/broderie', label: 'Broderie' };

export function pieceTitle(piece: CurrentPiece): string {
  return `Ouvrage n°${piece.number} · ${piece.challenge ? 'Défi du jour' : difficultyName(piece.difficulty)}`;
}

export class EmbroideryGame {
  private readonly work: Work;
  private readonly canvas = el('canvas', { class: 'embroidery-canvas' });
  private readonly progressEl = el('span', { class: 'embroidery-progress' });
  private readonly countsEl = el('p', { class: 'embroidery-counts' });
  private readonly footer: HTMLElement;
  private readonly swatches: { button: HTMLButtonElement; count: HTMLElement }[] = [];
  private context: CanvasRenderingContext2D;
  private cssSize = 0;
  private selected = 0;
  private mistakes: number;
  private strokePointer: number | null = null;
  private lastPoint: { x: number; y: number } | null = null;
  /** Cells already counted as a mistake during the current stroke: dragging over one costs once. */
  private strokeMistakes = new Set<number>();
  private readonly flashes = new Map<number, number>();
  private flashFrame = 0;
  private dirty = false;

  constructor(
    root: HTMLElement,
    private readonly save: EmbroiderySave,
    private readonly piece: CurrentPiece,
    private readonly actions: { nextPiece: () => void },
  ) {
    const { pattern } = piece;
    const stitched = decodeStitched(piece.stitched, pattern.size ** 2, pattern.palette.length) ?? undefined;
    this.work = new Work(pattern, stitched, readPaths(pattern, piece.paths) ?? undefined);
    this.mistakes = piece.mistakes;
    this.context = this.canvas.getContext('2d')!;

    this.footer = el('div', { class: 'embroidery-footer' }, this.buildPalette(), this.countsEl);
    root.append(
      el(
        'div',
        { class: 'embroidery' },
        topBar(pieceTitle(piece), helpSlot(EMBROIDERY_HELP, this.progressEl), MENU_BACK),
        el('div', { class: 'embroidery-board-wrap' }, this.canvas),
        this.footer,
      ),
    );

    this.fitBoard();
    this.refresh();
    if (this.work.isFinished()) this.finish();
    else this.select(this.nextColor(0));

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.endStroke);
    this.canvas.addEventListener('pointercancel', this.endStroke);
    this.canvas.addEventListener('lostpointercapture', this.endStroke);
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('resize', this.fitBoard);
    openHelpOnFirstVisit(EMBROIDERY_HELP);
  }

  dispose(): void {
    window.removeEventListener('resize', this.fitBoard);
    cancelAnimationFrame(this.flashFrame);
    this.store();
  }

  // -----------------------------------------------
  // BUILDING
  // -----------------------------------------------

  private buildPalette(): HTMLElement {
    const palette = el('div', { class: 'palette', role: 'group', 'aria-label': 'Fils' });
    this.piece.pattern.palette.forEach((color, index) => {
      const count = el('span', { class: 'embroidery-swatch-count' });
      const button = el('button', { class: 'swatch embroidery-swatch', type: 'button', 'aria-label': `Fil ${index + 1}` }, String(index + 1), count);
      button.style.setProperty('--swatch', color);
      if (isDarkColor(color)) button.classList.add('is-dark');
      button.addEventListener('click', () => this.select(index));
      this.swatches.push({ button, count });
      palette.append(button);
    });
    return palette;
  }

  private readonly fitBoard = (): void => {
    const size = this.piece.pattern.size;
    const width = Math.min(window.innerWidth - 32, 560);
    const height = window.innerHeight - 270;
    const cell = Math.floor(Math.max(14, Math.min(48, width / size, height / size)));
    this.cssSize = cell * size;
    this.context = prepareCanvas(this.canvas, this.cssSize);
    this.draw();
  };

  private draw(): void {
    paintFront(this.context, this.piece.pattern, this.cssSize, {
      stitched: this.work.stitched,
      selected: this.work.isFinished() ? undefined : this.selected,
      flashes: this.flashStrengths(),
    });
  }

  // -----------------------------------------------
  // INPUT
  // -----------------------------------------------

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.strokePointer !== null || this.work.isFinished() || (event.button !== 0 && event.pointerType === 'mouse')) return;
    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.strokePointer = event.pointerId;
    this.strokeMistakes = new Set();
    this.lastPoint = { x: event.clientX, y: event.clientY };
    this.stitchAt(event.clientX, event.clientY);
    this.afterChange();
  };

  /** Stitches along the segment since the last event, so a fast swipe does not skip cells. */
  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.strokePointer || !this.lastPoint) return;
    const from = this.lastPoint;
    const step = this.cssSize / this.piece.pattern.size / 3;
    const steps = Math.max(1, Math.ceil(Math.hypot(event.clientX - from.x, event.clientY - from.y) / step));
    for (let i = 1; i <= steps; i++) {
      this.stitchAt(from.x + ((event.clientX - from.x) * i) / steps, from.y + ((event.clientY - from.y) * i) / steps);
    }
    this.lastPoint = { x: event.clientX, y: event.clientY };
    this.afterChange();
  };

  private readonly endStroke = (event: PointerEvent): void => {
    if (event.pointerId !== this.strokePointer) return;
    this.strokePointer = null;
    this.lastPoint = null;
    this.store();
    if (this.work.isFinished()) this.finish();
    else if (this.work.remaining(this.selected) === 0) this.select(this.nextColor(this.selected));
  };

  private stitchAt(x: number, y: number): void {
    const size = this.piece.pattern.size;
    const rect = this.canvas.getBoundingClientRect();
    const col = Math.floor(((x - rect.left) / rect.width) * size);
    const row = Math.floor(((y - rect.top) / rect.height) * size);
    if (row < 0 || row >= size || col < 0 || col >= size) return;
    const cell = row * size + col;
    const { result } = this.work.stitch(cell, this.selected);
    if (result === 'unchanged') return;
    this.dirty = true;
    if (result === 'outside' || result === 'wrong') this.countMistake(cell);
  }

  private countMistake(cell: number): void {
    this.flashes.set(cell, performance.now());
    if (!this.flashFrame) this.flashFrame = requestAnimationFrame(this.animateFlashes);
    if (this.strokeMistakes.has(cell)) return;
    this.strokeMistakes.add(cell);
    this.mistakes++;
  }

  private readonly animateFlashes = (): void => {
    this.flashFrame = 0;
    this.draw();
    if (this.flashes.size > 0) this.flashFrame = requestAnimationFrame(this.animateFlashes);
  };

  private flashStrengths(): Map<number, number> {
    const now = performance.now();
    const strengths = new Map<number, number>();
    for (const [cell, start] of this.flashes) {
      const strength = 1 - (now - start) / FLASH_MS;
      if (strength > 0) strengths.set(cell, strength);
      else this.flashes.delete(cell);
    }
    return strengths;
  }

  // -----------------------------------------------
  // STATE
  // -----------------------------------------------

  private afterChange(): void {
    this.refresh();
    this.draw();
  }

  private select(index: number): void {
    this.selected = index;
    this.refresh();
    this.draw();
  }

  /** First colour with cells left, starting at `from` and wrapping around. */
  private nextColor(from: number): number {
    const count = this.piece.pattern.palette.length;
    for (let i = 0; i < count; i++) {
      const index = (from + i) % count;
      if (this.work.remaining(index) > 0) return index;
    }
    return from;
  }

  private refresh(): void {
    this.swatches.forEach(({ button, count }, index) => {
      const remaining = this.work.remaining(index);
      button.classList.toggle('is-active', index === this.selected);
      button.classList.toggle('is-complete', remaining === 0);
      button.setAttribute('aria-pressed', String(index === this.selected));
      count.textContent = remaining === 0 ? '' : String(remaining);
    });
    this.progressEl.textContent = `${Math.round((this.work.rightCount() / this.work.cellCount) * 100)} %`;
    this.countsEl.replaceChildren(
      el('span', { class: this.mistakes > 0 ? 'has-mistakes' : '', text: plural(this.mistakes, 'erreur', 'Aucune erreur') }),
      ' · ',
      el('span', { class: this.work.jumps > 0 ? 'has-jumps' : '', text: plural(this.work.jumps, 'saut de fil', 'Aucun saut de fil') }),
    );
  }

  private store(): void {
    if (!this.dirty) return;
    this.dirty = false;
    storeWork(this.piece, this.work, this.mistakes);
    saveEmbroidery(this.save);
  }

  private finish(): void {
    this.canvas.classList.add('is-finished');
    const stars = starsForScore(this.mistakes, this.work.jumps, this.work.cellCount, unavoidableJumps(this.piece.pattern));
    const { piece, save } = this;
    save.gallery.push({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      number: piece.number,
      difficulty: piece.difficulty,
      pattern: piece.pattern,
      paths: this.work.paths.map(encodePath),
      mistakes: this.mistakes,
      jumps: this.work.jumps,
      stars,
      madeAt: new Date().toISOString(),
    });
    save.piecesDone = Math.max(save.piecesDone, piece.number);
    save.current = null;
    saveEmbroidery(save);
    this.draw();

    const back = el('canvas', { class: 'embroidery-canvas is-back' });
    const backSize = Math.min(this.cssSize, 240);
    paintBack(prepareCanvas(back, backSize), piece.pattern, this.work.paths, backSize);
    const next = el('button', { class: 'button', type: 'button' }, 'Nouvel ouvrage');
    next.addEventListener('click', () => this.actions.nextPiece());
    this.footer.replaceChildren(
      el('p', { class: 'embroidery-stars', text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }),
      el('p', { class: 'embroidery-done' }, el('strong', { text: piece.pattern.name }), ' est brodé !', ` (${this.countsEl.textContent?.toLowerCase()})`),
      levelReward(stars, piece.difficulty, piece.challenge),
      el('section', { class: 'embroidery-back' }, el('h2', { text: "L'envers" }), back),
      el('div', { class: 'button-row' }, next, el('a', { class: 'button button-secondary', href: '#/broderie' }, 'Mes ouvrages')),
    );
  }
}

function plural(count: number, word: string, none: string): string {
  if (count === 0) return none;
  return count === 1 ? `1 ${word}` : `${count} ${word.replace(/^(\S+)/, '$1s')}`;
}
