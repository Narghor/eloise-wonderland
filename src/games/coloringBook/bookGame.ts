import { el, freeCanvas, topBar, type BackLink } from '../../dom';
import { hexToRgb, isDarkColor } from '../../color';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { levelReward } from '../../companion/reward';
import { type BookDrawing } from './bookDrawing';
import { OUTSIDE_ZONE, drawLineArt, drawingCanvas, lineMask, zoneMap } from './bookCanvas';
import { NO_PAINT, PageScore, decodePaint, encodePaint, starsFor, type Score } from './bookPaint';
import { saveBook, type BookMode, type BookSave, type PageInProgress } from './bookSave';
import { BOOK_HELP } from './bookHelp';

// -----------------------------------------------
// ONE COLOURING PAGE
// -----------------------------------------------

/** Paint grid side: the page is n x n paint pixels, whatever its size on screen. */
const GRID = 500;
const BOX = 100;
const BACK_BOOK: BackLink = { href: '#/coloriage', label: 'Dessins' };

/** Model mode, per difficulty: largest brush and line forgiveness (box units), decoy pencils. */
export const BOOK_TIERS: readonly { brush: number; band: number; decoys: number }[] = [
  { brush: 4.2, band: 2.4, decoys: 0 },
  { brush: 3.6, band: 1.8, decoys: 0 },
  { brush: 3, band: 1.3, decoys: 2 },
  { brush: 2.5, band: 0.8, decoys: 3 },
  { brush: 2.1, band: 0.4, decoys: 4 },
];
const FREE_BRUSH = 3.6;
/** The three brushes, as shares of the largest one. */
const BRUSH_SHARES = [1, 0.6, 0.35];
const BRUSH_NAMES = ['Gros', 'Moyen', 'Fin'];
/** Below this, finishing asks first: some white is left. */
const FILLED_TO_FINISH_QUIETLY = 0.85;
const MAX_UNDO = 30;
const MAX_ZOOM = 4;
/** A 2048 square already takes 16 MB on a phone: past this, the zoomed lines stop getting sharper. */
const MAX_LINE_PIXELS = 2048;

interface Point {
  x: number;
  y: number;
}

/** Two fingers on the page: `focus` is the page point (unzoomed board pixels) that stays under them. */
interface Pinch {
  distance: number;
  zoom: number;
  focus: Point;
}

interface Undo {
  pixels: number[];
  before: number[];
}

export class BookPage {
  private readonly zones: Int16Array;
  private readonly paint: Uint8Array;
  private readonly score: PageScore | null;
  private readonly rgb: [number, number, number][];
  private readonly paintCanvas = document.createElement('canvas');
  private readonly paintContext: CanvasRenderingContext2D;
  private readonly lineCanvas = document.createElement('canvas');
  private readonly board = el('div', { class: 'book-board' });
  /** The paint and the lines, moved and scaled together by the zoom. */
  private readonly sheet = el('div', { class: 'book-sheet' });
  private readonly zoomReset = el('button', { class: 'book-zoom-reset', type: 'button', 'aria-label': 'Revoir toute la page' }, '⤢');
  /** Holds the model and the board; carries --board, the board's side. */
  private readonly stage = el('div', { class: 'book-stage' });
  private readonly scoreEl = el('span', { class: 'book-score' });
  private readonly footer = el('div', { class: 'book-footer' });
  private readonly swatches: HTMLButtonElement[] = [];
  private readonly brushButtons: HTMLButtonElement[] = [];
  private readonly undoButton = el('button', { class: 'button button-secondary', type: 'button' }, '↶ Annuler');
  private readonly bucketButton = el('button', { class: 'tool-button', type: 'button' }, '🪣 Seau');
  private readonly maxBrush: number;
  private readonly undos: Undo[] = [];
  /** Stroke number that last touched each pixel: a pixel goes into an undo once per stroke. */
  private readonly touchedBy: Uint32Array;
  private strokeId = 0;
  private strokeUndo: Undo | null = null;
  private color = 0;
  private brush = 0;
  private bucket = false;
  private pointer: number | null = null;
  private last: Point | null = null;
  private finished = false;
  /** Every pointer down on the board, in board pixels. */
  private readonly touches = new Map<number, Point>();
  private pinch: Pinch | null = null;
  private boardSize = 0;
  private zoom = 1;
  private pan: Point = { x: 0, y: 0 };
  private linesTimer = 0;

  constructor(
    root: HTMLElement,
    private readonly drawing: BookDrawing,
    private readonly mode: BookMode,
    private readonly page: PageInProgress,
    private readonly save: BookSave,
  ) {
    const tier = BOOK_TIERS[page.difficulty];
    this.maxBrush = mode === 'model' ? tier.brush : FREE_BRUSH;
    this.rgb = page.palette.map(hexToRgb);
    this.zones = zoneMap(drawing, GRID);
    this.paint = decodePaint(page.paint, GRID, page.palette.length) ?? new Uint8Array(GRID * GRID).fill(NO_PAINT);
    this.touchedBy = new Uint32Array(GRID * GRID);
    this.score = mode === 'model' ? new PageScore(this.targets(), lineMask(drawing, GRID, tier.band), this.paint) : null;

    this.paintCanvas.width = this.paintCanvas.height = GRID;
    this.paintCanvas.className = 'book-paint';
    this.paintContext = this.paintCanvas.getContext('2d')!;
    this.lineCanvas.className = 'book-lines';
    this.sheet.append(this.paintCanvas, this.lineCanvas);
    this.zoomReset.hidden = true;
    this.zoomReset.addEventListener('click', () => this.setView(1, { x: 0, y: 0 }));
    this.board.append(this.sheet, this.zoomReset);
    if (mode === 'model') this.stage.append(el('div', { class: 'book-model-row' }, this.modelCorner(), this.scoreEl));
    this.stage.append(this.board);

    root.append(
      el(
        'div',
        { class: 'book-page' },
        topBar(drawing.name, helpSlot(BOOK_HELP), BACK_BOOK),
        this.stage,
        this.footer,
      ),
    );
    this.showTools();
    this.redrawPaint();
    this.fitBoard();
    this.refreshScore();

    this.board.addEventListener('pointerdown', this.onPointerDown);
    this.board.addEventListener('pointermove', this.onPointerMove);
    this.board.addEventListener('pointerup', this.onPointerUp);
    this.board.addEventListener('pointercancel', this.onPointerUp);
    this.board.addEventListener('lostpointercapture', this.onPointerUp);
    this.board.addEventListener('wheel', this.onWheel, { passive: false });
    this.board.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('resize', this.fitBoard);
    openHelpOnFirstVisit(BOOK_HELP);
  }

  dispose(): void {
    window.removeEventListener('resize', this.fitBoard);
    window.clearTimeout(this.linesTimer);
    freeCanvas(this.paintCanvas, this.lineCanvas);
  }

  // -----------------------------------------------
  // BUILDING
  // -----------------------------------------------

  /** Right palette index of each paint pixel, NO_PAINT where the page must stay white. */
  private targets(): Uint8Array {
    const zoneColors = this.drawing.zones.map((zone) => {
      const index = this.page.palette.indexOf(zone.color.toLowerCase());
      return index < 0 ? NO_PAINT : index;
    });
    return Uint8Array.from(this.zones, (zone) => (zone === OUTSIDE_ZONE ? NO_PAINT : zoneColors[zone]));
  }

  /** The coloured model, small in the corner; a tap shows it big. */
  private modelCorner(): HTMLElement {
    const big = el('dialog', { class: 'detail-dialog book-model-dialog' }, drawingCanvas(this.drawing, 300, true));
    big.addEventListener('click', () => big.close());
    const corner = el('button', { class: 'book-model', type: 'button', 'aria-label': 'Voir le modèle en grand' }, drawingCanvas(this.drawing, 76, true), el('span', { text: 'Modèle' }), big);
    corner.addEventListener('click', (event) => {
      if (event.target !== big && !big.contains(event.target as Node)) big.showModal();
    });
    return corner;
  }

  private showTools(): void {
    const palette = el('div', { class: 'book-palette', role: 'group', 'aria-label': 'Crayons' });
    this.page.palette.forEach((color, index) => {
      const swatch = el('button', { class: 'book-swatch', type: 'button', 'aria-label': `Crayon ${index + 1}` });
      swatch.style.setProperty('--swatch', color);
      if (isDarkColor(color)) swatch.classList.add('is-dark');
      swatch.addEventListener('click', () => this.selectColor(index));
      this.swatches.push(swatch);
      palette.append(swatch);
    });

    const brushes = el('div', { class: 'tool-toggle', role: 'group', 'aria-label': 'Pinceau' });
    BRUSH_NAMES.forEach((name, index) => {
      const button = el('button', { class: 'tool-button', type: 'button' }, el('span', { class: `book-dot is-${index}` }), name);
      button.addEventListener('click', () => this.selectBrush(index));
      this.brushButtons.push(button);
      brushes.append(button);
    });
    if (this.mode === 'free') {
      this.bucketButton.addEventListener('click', () => this.selectBucket(!this.bucket));
      brushes.append(this.bucketButton);
    }

    const finish = el('button', { class: 'button', type: 'button' }, this.mode === 'model' ? 'J’ai fini !' : 'Terminé');
    finish.addEventListener('click', () => this.finish());
    const clear = el('button', { class: 'button button-secondary', type: 'button' }, 'Tout effacer');
    clear.addEventListener('click', () => this.clearAll());
    this.undoButton.addEventListener('click', () => this.undo());
    const actions = this.mode === 'free' ? [this.undoButton, clear, finish] : [clear, finish];

    this.footer.replaceChildren(palette, brushes, el('div', { class: 'button-row' }, ...actions));
    this.selectColor(this.color);
    this.selectBrush(this.brush);
    this.refreshUndo();
  }

  private selectColor(index: number): void {
    this.color = index;
    this.swatches.forEach((swatch, i) => swatch.classList.toggle('is-active', i === index));
  }

  private selectBrush(index: number): void {
    this.brush = index;
    this.selectBucket(false);
  }

  private selectBucket(on: boolean): void {
    this.bucket = on;
    this.bucketButton.classList.toggle('is-active', on);
    this.brushButtons.forEach((button, i) => button.classList.toggle('is-active', !on && i === this.brush));
  }

  private readonly fitBoard = (): void => {
    const reserved = this.mode === 'model' ? 330 : 300;
    const size = Math.floor(Math.max(240, Math.min(window.innerWidth - 24, 560, window.innerHeight - reserved)));
    this.stage.style.setProperty('--board', `${size}px`);
    // A phone resizes the page when its address bar slides: the zoomed view follows instead of jumping.
    const ratio = this.boardSize > 0 ? size / this.boardSize : 1;
    this.boardSize = size;
    this.setView(this.zoom, { x: this.pan.x * ratio, y: this.pan.y * ratio });
  };

  /** The printed lines, redrawn sharp for the current zoom. */
  private renderLines(): void {
    const pixels = Math.min(MAX_LINE_PIXELS, Math.round(this.boardSize * window.devicePixelRatio * this.zoom));
    if (this.lineCanvas.width === pixels) return;
    this.lineCanvas.width = this.lineCanvas.height = pixels;
    drawLineArt(this.lineCanvas.getContext('2d')!, this.drawing, pixels / BOX);
  }

  // -----------------------------------------------
  // ZOOM
  // -----------------------------------------------

  /** Zooms and pans the page, always keeping it over the whole board. */
  private setView(zoom: number, pan: Point): void {
    this.zoom = Math.min(MAX_ZOOM, Math.max(1, zoom));
    const least = this.boardSize * (1 - this.zoom);
    this.pan = { x: Math.min(0, Math.max(least, pan.x)), y: Math.min(0, Math.max(least, pan.y)) };
    this.sheet.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
    this.zoomReset.hidden = this.zoom === 1;
    // Redrawing the lines is slow: once the fingers rest.
    window.clearTimeout(this.linesTimer);
    this.linesTimer = window.setTimeout(() => this.renderLines(), this.pinch ? 250 : 0);
  }

  /** Sets the zoom keeping the page point `focus` under `at` (board pixels). */
  private zoomAround(at: Point, zoom: number, focus = this.pagePoint(at)): void {
    const next = Math.min(MAX_ZOOM, Math.max(1, zoom));
    this.setView(next, { x: at.x - focus.x * next, y: at.y - focus.y * next });
  }

  private pagePoint(at: Point): Point {
    return { x: (at.x - this.pan.x) / this.zoom, y: (at.y - this.pan.y) / this.zoom };
  }

  private boardPoint(event: PointerEvent | WheelEvent): Point {
    const rect = this.board.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private startPinch(): void {
    const [a, b] = [...this.touches.values()];
    const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.pinch = { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom: this.zoom, focus: this.pagePoint(middle) };
  }

  private movePinch(pinch: Pinch): void {
    const [a, b] = [...this.touches.values()];
    const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.zoomAround(middle, (pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.distance, pinch.focus);
  }

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.zoomAround(this.boardPoint(event), this.zoom * Math.exp(-event.deltaY * 0.0015));
  };

  // -----------------------------------------------
  // PAINTING
  // -----------------------------------------------

  /** One finger paints; a second one turns the gesture into a zoom and takes back what the first had painted. */
  private readonly onPointerDown = (event: PointerEvent): void => {
    if ((event.pointerType === 'mouse' && event.button !== 0) || (event.target as Element).closest('.book-zoom-reset')) return;
    event.preventDefault();
    this.board.setPointerCapture(event.pointerId);
    this.touches.set(event.pointerId, this.boardPoint(event));
    if (this.touches.size === 2) {
      this.cancelStroke();
      this.startPinch();
      return;
    }
    if (this.finished || this.pointer !== null || this.touches.size > 1) return;
    this.pointer = event.pointerId;
    this.strokeId++;
    this.strokeUndo = { pixels: [], before: [] };
    const point = this.gridPoint(event);
    if (this.bucket) {
      this.fillZone(point.x, point.y);
      return;
    }
    this.last = point;
    this.stamp(point.x, point.y);
  };

  /** Stamps along the segment since the last event, so a fast swipe leaves no gap. */
  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.touches.has(event.pointerId)) this.touches.set(event.pointerId, this.boardPoint(event));
    if (this.pinch && this.touches.size === 2) {
      this.movePinch(this.pinch);
      return;
    }
    if (event.pointerId !== this.pointer || !this.last) return;
    const to = this.gridPoint(event);
    const from = this.last;
    const step = Math.max(1, this.radius() / 3);
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / step));
    for (let i = 1; i <= steps; i++) this.stamp(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    this.last = to;
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    this.touches.delete(event.pointerId);
    if (this.touches.size < 2 && this.pinch) {
      this.pinch = null;
      this.setView(this.zoom, this.pan);
    }
    if (event.pointerId === this.pointer) this.endStroke();
  };

  /** A stroke cut short by a second finger: its paint is taken back, as if never laid. */
  private cancelStroke(): void {
    const undo = this.strokeUndo;
    this.pointer = null;
    this.last = null;
    this.strokeUndo = null;
    if (!undo || undo.pixels.length === 0) return;
    this.restore(undo);
    this.refreshScore();
  }

  private endStroke(): void {
    this.pointer = null;
    this.last = null;
    const undo = this.strokeUndo;
    this.strokeUndo = null;
    if (!undo || undo.pixels.length === 0) return;
    if (this.mode === 'free') {
      this.undos.push(undo);
      if (this.undos.length > MAX_UNDO) this.undos.shift();
      this.refreshUndo();
    }
    this.refreshScore();
    this.store();
  };

  private gridPoint(event: PointerEvent): { x: number; y: number } {
    const rect = this.sheet.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * GRID, y: ((event.clientY - rect.top) / rect.height) * GRID };
  }

  private radius(): number {
    return (this.maxBrush * BRUSH_SHARES[this.brush] * GRID) / BOX;
  }

  private stamp(cx: number, cy: number): void {
    const r = this.radius();
    const top = Math.max(0, Math.floor(cy - r));
    const bottom = Math.min(GRID - 1, Math.ceil(cy + r));
    const left = Math.max(0, Math.floor(cx - r));
    const right = Math.min(GRID - 1, Math.ceil(cx + r));
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) this.setPixel(y * GRID + x, this.color);
      }
    }
    this.paintContext.fillStyle = this.page.palette[this.color];
    this.paintContext.beginPath();
    this.paintContext.arc(cx, cy, r, 0, Math.PI * 2);
    this.paintContext.fill();
  }

  /** Free mode's bucket: the whole zone under the finger (or all the background) in one colour. */
  private fillZone(cx: number, cy: number): void {
    const x = Math.min(GRID - 1, Math.max(0, Math.floor(cx)));
    const y = Math.min(GRID - 1, Math.max(0, Math.floor(cy)));
    const zone = this.zones[y * GRID + x];
    for (let i = 0; i < this.zones.length; i++) if (this.zones[i] === zone) this.setPixel(i, this.color);
    this.redrawPaint();
  }

  private setPixel(pixel: number, color: number): void {
    const before = this.paint[pixel];
    if (before === color) return;
    if (this.strokeUndo && this.touchedBy[pixel] !== this.strokeId) {
      this.touchedBy[pixel] = this.strokeId;
      this.strokeUndo.pixels.push(pixel);
      this.strokeUndo.before.push(before);
    }
    this.score?.change(pixel, before, color);
    this.paint[pixel] = color;
  }

  private redrawPaint(): void {
    const image = this.paintContext.createImageData(GRID, GRID);
    for (let i = 0; i < this.paint.length; i++) {
      const color = this.paint[i];
      if (color === NO_PAINT) continue;
      const [red, green, blue] = this.rgb[color];
      image.data.set([red, green, blue, 255], i * 4);
    }
    this.paintContext.putImageData(image, 0, 0);
  }

  private undo(): void {
    const undo = this.undos.pop();
    if (!undo || this.finished) return;
    this.restore(undo);
    this.refreshUndo();
    this.refreshScore();
    this.store();
  }

  private restore(undo: Undo): void {
    for (let i = undo.pixels.length - 1; i >= 0; i--) {
      this.score?.change(undo.pixels[i], this.paint[undo.pixels[i]], undo.before[i]);
      this.paint[undo.pixels[i]] = undo.before[i];
    }
    this.redrawPaint();
  }

  private clearAll(): void {
    if (this.finished || !confirm('Effacer tout ton coloriage ?')) return;
    for (let i = 0; i < this.paint.length; i++) {
      this.score?.change(i, this.paint[i], NO_PAINT);
      this.paint[i] = NO_PAINT;
    }
    this.undos.length = 0;
    this.redrawPaint();
    this.refreshUndo();
    this.refreshScore();
    this.store();
  }

  private refreshUndo(): void {
    this.undoButton.disabled = this.undos.length === 0;
  }

  private refreshScore(): void {
    if (!this.score) return;
    const { filled, overflow } = this.score.score;
    this.scoreEl.replaceChildren(el('span', { text: `Rempli ${percent(filled)}` }), el('span', { text: `Dépassé ${percent(overflow)}` }));
    this.scoreEl.classList.toggle('is-over', starsFor({ filled: 1, overflow }) < 3);
  }

  // -----------------------------------------------
  // SAVING AND FINISHING
  // -----------------------------------------------

  private store(): void {
    this.page.paint = encodePaint(this.paint);
    this.save.pages[this.mode] = this.page;
    saveBook(this.save);
  }

  private finish(): void {
    if (this.finished) return;
    const score = this.score?.score;
    if (score && score.filled < FILLED_TO_FINISH_QUIETLY && !confirm('Il reste du blanc à colorier. Terminer quand même ?')) return;
    this.finished = true;
    this.board.classList.add('is-finished');
    this.save.pages[this.mode] = null;
    if (score) this.finishModel(score);
    else this.finishFree();
    saveBook(this.save);
  }

  private finishModel(score: Score): void {
    const stars = starsFor(score);
    const id = this.drawing.id;
    this.save.best[id] = Math.max(stars, this.save.best[id] ?? 0);
    this.save.pagesDone++;
    this.footer.replaceChildren(
      el('p', { class: 'book-stars', text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }),
      el('p', { class: 'book-result', text: `Colorié à ${percent(score.filled)}, dépassé ${percent(score.overflow)}.` }),
      levelReward(stars, this.page.difficulty),
      this.endButtons(),
    );
  }

  private finishFree(): void {
    const download = el('button', { class: 'button', type: 'button' }, 'Enregistrer l’image');
    download.addEventListener('click', () => this.download());
    this.footer.replaceChildren(el('p', { class: 'book-result', text: 'Joli coloriage !' }), el('div', { class: 'button-row' }, download), this.endButtons());
  }

  private endButtons(): HTMLElement {
    return el('div', { class: 'button-row' }, el('a', { class: 'button button-secondary', href: '#/coloriage' }, 'Un autre dessin'));
  }

  /** The page as a PNG: white paper, the paint, the lines on top (drawn apart: they erase what they hide). */
  private download(): void {
    const size = 1000;
    const lines = document.createElement('canvas');
    lines.width = lines.height = size;
    drawLineArt(lines.getContext('2d')!, this.drawing, size / BOX);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(this.paintCanvas, 0, 0, size, size);
    ctx.drawImage(lines, 0, 0);
    const link = el('a', { href: canvas.toDataURL('image/png'), download: `coloriage-${this.drawing.id}.png` });
    link.click();
  }
}

function percent(share: number): string {
  return `${(Math.round(share * 1000) / 10).toLocaleString('fr-FR')} %`;
}
