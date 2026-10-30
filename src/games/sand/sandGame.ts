import { el, topBar, type BackLink } from '../../dom';
import { JAR_WIDTH, SandJar, cellsFromColors, spoutColumn } from './jar';
import { JarPainter } from './jarPainter';
import { GRAINS_PER_FRAME, STEPS_PER_FRAME } from './levels';
import { similarity, starsFor } from './score';
import { decodeColors, encodeColors, saveSand, type CurrentBottle, type SandSave } from './sandSave';

const BACK_SAND: BackLink = { href: '#/sable', label: 'Sable' };
const MAX_UNDO = 15;
const SAVE_DELAY_MS = 1500;
const MIN_FILL_TO_FINISH = 0.05;

export interface SandGameActions {
  nextModel(): void;
  newFree(): void;
}

export class SandGame {
  private readonly jar: SandJar;
  private readonly painter: JarPainter;
  private readonly target: Uint8Array | null;
  private readonly stage: HTMLElement;
  private readonly spout = el('div', { class: 'spout' });
  private readonly status = el('p', { class: 'sand-status', role: 'status' });
  private readonly controls: HTMLElement;
  private readonly undoButton: HTMLButtonElement;
  private readonly swatches: HTMLButtonElement[] = [];
  private readonly undoStack: Uint8Array[] = [];
  private selected = 0;
  private pouringPointer: number | null = null;
  private spoutX = JAR_WIDTH / 2;
  private settling = false;
  private frameId = 0;
  private saveTimer = 0;
  private finished = false;

  constructor(
    root: HTMLElement,
    private readonly save: SandSave,
    private readonly bottle: CurrentBottle,
    private readonly actions: SandGameActions,
  ) {
    this.jar = new SandJar(cellsFromColors(decodeColors(bottle.cells)!));
    this.target = bottle.target === null ? null : decodeColors(bottle.target);
    this.painter = new JarPainter(bottle.palette);

    this.stage = el('div', { class: 'sand-stage' }, this.spout, this.painter.canvas);
    if (this.target) this.stage.append(this.modelThumbnail(this.target));

    this.undoButton = el('button', { class: 'button button-secondary', type: 'button' }, '↶ Annuler');
    this.undoButton.addEventListener('click', () => this.undo());
    const clearButton = el('button', { class: 'button button-secondary', type: 'button' }, 'Vider');
    clearButton.addEventListener('click', () => this.clear());
    const finishButton = el('button', { class: 'button', type: 'button' }, "J'ai fini !");
    finishButton.addEventListener('click', () => this.finish());
    this.controls = el(
      'div',
      { class: 'sand-controls' },
      this.buildPalette(),
      el('div', { class: 'button-row' }, this.undoButton, clearButton, finishButton),
    );

    const title = bottle.level === null ? 'Création libre' : `Bouteille n°${bottle.level}`;
    root.append(
      el('div', { class: 'sand-game' }, topBar(title, undefined, BACK_SAND), this.stage, this.status, this.controls),
    );

    this.status.textContent = 'Maintiens le doigt sur la bouteille et glisse pour verser.';
    this.refreshUndo();
    this.fitStage();
    this.painter.paint(this.jar.cells);
    this.settling = true;

    this.stage.addEventListener('pointerdown', this.onPointerDown);
    this.stage.addEventListener('pointermove', this.onPointerMove);
    this.stage.addEventListener('pointerup', this.stopPouring);
    this.stage.addEventListener('pointercancel', this.stopPouring);
    this.stage.addEventListener('lostpointercapture', this.stopPouring);
    this.stage.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('resize', this.fitStage);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.frameId = requestAnimationFrame(this.frame);
  }

  dispose(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.fitStage);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.saveNow();
  }

  // -----------------------------------------------
  // BUILDING
  // -----------------------------------------------

  private buildPalette(): HTMLElement {
    const palette = el('div', { class: 'palette', role: 'group', 'aria-label': 'Couleurs' });
    this.bottle.palette.forEach((color, index) => {
      const swatch = el('button', { class: 'swatch sand-swatch', type: 'button', 'aria-label': `Couleur ${index + 1}` });
      swatch.style.setProperty('--swatch', color);
      swatch.addEventListener('click', () => this.select(index));
      this.swatches.push(swatch);
      palette.append(swatch);
    });
    this.select(0);
    return palette;
  }

  private modelThumbnail(target: Uint8Array): HTMLElement {
    const painter = new JarPainter(this.bottle.palette);
    painter.paint(cellsFromColors(target));
    return el('div', { class: 'sand-model' }, painter.canvas, el('span', { text: 'Modèle' }));
  }

  /** The jar takes the room left between the top bar and the controls, keeping its proportions. */
  private readonly fitStage = (): void => {
    const canvas = this.painter.canvas;
    const maxWidth = Math.min(window.innerWidth - 32, 420);
    const maxHeight = Math.max(200, window.innerHeight - 250);
    const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    canvas.style.width = `${Math.floor(canvas.width * scale)}px`;
    canvas.style.height = `${Math.floor(canvas.height * scale)}px`;
    this.placeSpout();
  };

  // -----------------------------------------------
  // POURING
  // -----------------------------------------------

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.finished || this.pouringPointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    this.stage.setPointerCapture(event.pointerId);
    this.pushUndo();
    this.pouringPointer = event.pointerId;
    this.moveSpout(event.clientX);
    this.spout.classList.add('is-pouring');
    this.status.textContent = '';
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId === this.pouringPointer) this.moveSpout(event.clientX);
  };

  private readonly stopPouring = (event: PointerEvent): void => {
    if (event.pointerId !== this.pouringPointer) return;
    this.pouringPointer = null;
    this.spout.classList.remove('is-pouring');
    this.scheduleSave();
  };

  private moveSpout(clientX: number): void {
    const canvasRect = this.painter.canvas.getBoundingClientRect();
    this.spoutX = spoutColumn((clientX - canvasRect.left) / canvasRect.width);
    this.placeSpout();
  }

  private placeSpout(): void {
    const canvasRect = this.painter.canvas.getBoundingClientRect();
    const stageRect = this.stage.getBoundingClientRect();
    const left = canvasRect.left - stageRect.left + ((this.spoutX + 0.5) / JAR_WIDTH) * canvasRect.width;
    this.spout.style.left = `${left}px`;
    this.spout.style.top = `${canvasRect.top - stageRect.top}px`;
  }

  private readonly frame = (): void => {
    this.frameId = requestAnimationFrame(this.frame);
    let changed = false;
    if (this.pouringPointer !== null) {
      const poured = this.jar.pour(this.spoutX, this.selected, GRAINS_PER_FRAME);
      if (poured === 0) this.status.textContent = 'Plus de place ici !';
      changed = poured > 0;
      this.settling = true;
    }
    if (this.settling) {
      let moved = false;
      for (let s = 0; s < STEPS_PER_FRAME; s++) moved = this.jar.step() || moved;
      this.settling = moved || this.pouringPointer !== null;
      changed ||= moved;
    }
    if (changed) this.painter.paint(this.jar.cells);
  };

  private select(index: number): void {
    this.selected = index;
    this.spout.style.setProperty('--sand', this.bottle.palette[index]);
    this.swatches.forEach((swatch, i) => {
      swatch.classList.toggle('is-active', i === index);
      swatch.setAttribute('aria-pressed', String(i === index));
    });
  }

  // -----------------------------------------------
  // UNDO / CLEAR
  // -----------------------------------------------

  private pushUndo(): void {
    this.undoStack.push(this.jar.cells.slice());
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
    this.refreshUndo();
  }

  private undo(): void {
    const snapshot = this.undoStack.pop();
    if (!snapshot || this.finished) return;
    this.jar.cells.set(snapshot);
    this.settling = true;
    this.painter.paint(this.jar.cells);
    this.refreshUndo();
    this.scheduleSave();
  }

  private clear(): void {
    if (this.finished || this.jar.fillRatio() === 0 || !confirm('Vider la bouteille ?')) return;
    this.pushUndo();
    this.jar.cells.fill(0);
    this.painter.paint(this.jar.cells);
    this.scheduleSave();
  }

  private refreshUndo(): void {
    this.undoButton.disabled = this.undoStack.length === 0;
  }

  // -----------------------------------------------
  // SAVING
  // -----------------------------------------------

  private scheduleSave(): void {
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.saveNow(), SAVE_DELAY_MS);
  }

  private saveNow(): void {
    window.clearTimeout(this.saveTimer);
    if (this.finished) return;
    this.bottle.cells = encodeColors(this.jar.colors());
    this.save.current = this.bottle;
    saveSand(this.save);
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.saveNow();
  };

  // -----------------------------------------------
  // FINISHING
  // -----------------------------------------------

  private finish(): void {
    if (this.finished) return;
    if (this.jar.fillRatio() < MIN_FILL_TO_FINISH) {
      this.status.textContent = "Verse un peu de sable d'abord !";
      return;
    }
    this.jar.settle();
    this.painter.paint(this.jar.cells);
    this.finished = true;
    this.pouringPointer = null;
    this.spout.classList.remove('is-pouring');

    const colors = this.jar.colors();
    const score = this.target ? similarity(colors, this.target) : null;
    const stars = score === null ? null : starsFor(score);
    if (this.bottle.level !== null) this.save.modelsDone = Math.max(this.save.modelsDone, this.bottle.level);
    this.save.shelf.push({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      level: this.bottle.level,
      palette: this.bottle.palette,
      cells: encodeColors(colors),
      stars,
      madeAt: new Date().toISOString(),
    });
    this.save.current = null;
    saveSand(this.save);

    const next = el('button', { class: 'button', type: 'button' }, score === null ? 'Nouvelle création' : 'Bouteille suivante');
    next.addEventListener('click', () => (score === null ? this.actions.newFree() : this.actions.nextModel()));
    this.status.textContent = '';
    this.controls.replaceChildren(
      score === null || stars === null
        ? el('p', { class: 'sand-result' }, 'Rangée sur ton étagère !')
        : el(
            'p',
            { class: 'sand-result' },
            el('span', { class: 'sand-stars', text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }),
            ` Ressemblance : ${Math.round(score * 100)} %`,
          ),
      el('div', { class: 'button-row' }, next, el('a', { class: 'button button-secondary', href: '#/sable' }, 'Mon étagère')),
    );
  }
}
