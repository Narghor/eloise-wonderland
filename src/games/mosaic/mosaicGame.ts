import { el, topBar, type BackLink } from '../../dom';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { difficultyFromLevel, difficultyName, type Difficulty } from '../../difficulty';
import { levelReward } from '../../companion/reward';
import { MOSAIC_HELP } from './mosaicHelp';
import { paintBoard, paintTile, type PaintOptions } from './mosaicPainter';
import {
  MOSAIC_LEVELS,
  checkPlacement,
  generateBoard,
  isComplete,
  placedCells,
  shapeCentre,
  starsFor,
  tileShape,
  type Board,
  type Placement,
} from './mosaicBoard';
import { saveMosaic, type CurrentMosaic, type MosaicSave } from './mosaicSave';

const BACK_MOSAIC: BackLink = { href: '#/mosaique', label: 'Mosaïques' };
const TRAY_CELL = 18;
const DRAG_THRESHOLD = 8;
const FLASH_MS = 700;

export interface MosaicGameActions {
  nextMosaic(): void;
}

interface Drag {
  pointerId: number;
  /** Tile being moved, null when the press only aims at a placed tile. */
  tile: number | null;
  /** Placed tile under the press: a tap without moving sends it back to the tray. */
  pressedPlaced: number | null;
  fromTray: boolean;
  wasSelected: boolean;
  startX: number;
  startY: number;
  moved: boolean;
  touch: boolean;
}

export class MosaicGame {
  private readonly board: Board;
  private readonly difficulty: Difficulty;
  private readonly placements: (Placement | null)[];
  private readonly trayRotations: number[];
  private readonly canvas = el('canvas', { class: 'mosaic-board' });
  private readonly stage = el('div', { class: 'mosaic-stage' });
  private readonly tray = el('div', { class: 'mosaic-tray', role: 'list', 'aria-label': 'Tesselles à poser' });
  private readonly status = el('p', { class: 'mosaic-status', role: 'status' });
  private readonly controls: HTMLElement;
  private selected: number | null = null;
  private drag: Drag | null = null;
  private ghost: PaintOptions['ghost'];
  private flash: PaintOptions['flash'];
  private flashTimer = 0;
  private boardSize = 300;
  private finished = false;

  constructor(
    root: HTMLElement,
    private readonly save: MosaicSave,
    private readonly current: CurrentMosaic,
    private readonly actions: MosaicGameActions,
  ) {
    this.difficulty = difficultyFromLevel(MOSAIC_LEVELS, current.level);
    this.board = generateBoard(current.seed, current.level);
    this.placements = this.validPlacements();
    current.placements = this.placements;
    this.trayRotations = [...this.board.trayRotations];

    const rotate = el('button', { class: 'button button-secondary', type: 'button' }, '↻ Tourner');
    rotate.addEventListener('click', () => this.rotateSelected());
    this.controls = el('div', { class: 'mosaic-controls' }, this.tray, el('div', { class: 'button-row' }, rotate));
    this.stage.append(this.canvas);

    root.append(
      el(
        'div',
        { class: 'mosaic-game' },
        topBar(
          `Mosaïque n°${current.number} · ${current.challenge ? 'Défi du jour' : difficultyName(this.difficulty)}`,
          helpSlot(MOSAIC_HELP),
          BACK_MOSAIC,
        ),
        this.stage,
        this.status,
        this.controls,
      ),
    );

    this.canvas.addEventListener('pointerdown', this.onBoardDown);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointercancel', this.onCancel);
    window.addEventListener('resize', this.fit);
    this.selected = this.trayTiles()[0] ?? null;
    this.fit();
    this.renderTray();
    openHelpOnFirstVisit(MOSAIC_HELP);
    if (isComplete(this.board, this.placements)) this.win();
  }

  dispose(): void {
    window.removeEventListener('resize', this.fit);
    clearTimeout(this.flashTimer);
  }

  /** Placements from the save, minus any that no longer fit the regenerated board. */
  private validPlacements(): (Placement | null)[] {
    const saved = this.current.placements;
    const placements: (Placement | null)[] = this.board.tiles.map(() => null);
    if (saved.length !== placements.length) return placements;
    saved.forEach((placement, tile) => {
      if (placement && checkPlacement(this.board, placements, tile, placement).kind === 'ok') placements[tile] = placement;
    });
    return placements;
  }

  private readonly fit = (): void => {
    this.boardSize = Math.floor(Math.max(220, Math.min(window.innerWidth - 32, 440, window.innerHeight - 300)));
    this.paint();
  };

  private paint(): void {
    paintBoard(this.canvas, this.board, this.placements, this.boardSize, {
      ghost: this.ghost,
      flash: this.flash,
      finished: this.finished,
    });
  }

  // -----------------------------------------------
  // TRAY
  // -----------------------------------------------

  private trayTiles(): number[] {
    return this.board.trayOrder.filter((tile) => this.placements[tile] === null);
  }

  private renderTray(): void {
    const tiles = this.trayTiles();
    this.tray.replaceChildren(
      ...tiles.map((tile) => {
        const canvas = el('canvas');
        const color = this.board.palette[this.board.tiles[tile].color];
        paintTile(canvas, this.board.tiles[tile], this.trayRotations[tile], color, TRAY_CELL);
        const item = el(
          'button',
          { class: `mosaic-tray-tile${tile === this.selected ? ' is-selected' : ''}`, type: 'button', role: 'listitem' },
          canvas,
        );
        item.addEventListener('pointerdown', (event) => this.onTrayDown(event, item, tile));
        item.addEventListener('pointermove', this.onMove);
        item.addEventListener('pointerup', this.onUp);
        item.addEventListener('pointercancel', this.onCancel);
        return item;
      }),
    );
    this.tray.querySelector('.is-selected')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const left = tiles.length;
    this.status.textContent = `Erreurs : ${this.current.mistakes} · ${left} tesselle${left > 1 ? 's' : ''} à poser`;
  }

  private rotateSelected(): void {
    if (this.selected === null || this.finished) return;
    this.trayRotations[this.selected] = (this.trayRotations[this.selected] + 1) % 4;
    this.renderTray();
  }

  // -----------------------------------------------
  // POINTER
  // -----------------------------------------------

  private onTrayDown(event: PointerEvent, item: HTMLElement, tile: number): void {
    if (this.finished || this.drag) return;
    const wasSelected = this.selected === tile;
    this.drag = this.newDrag(event, tile, null, true, wasSelected);
    item.setPointerCapture(event.pointerId);
    if (!wasSelected) {
      this.selected = tile;
      this.tray.querySelectorAll('.mosaic-tray-tile').forEach((other) => other.classList.toggle('is-selected', other === item));
    }
  }

  private readonly onBoardDown = (event: PointerEvent): void => {
    if (this.finished || this.drag) return;
    const cell = this.cellAt(event.clientX, event.clientY, 0);
    const placed = cell ? this.placedAt(cell[0], cell[1]) : -1;
    this.drag = this.newDrag(event, this.selected, placed >= 0 ? placed : null, false, true);
    this.canvas.setPointerCapture(event.pointerId);
    if (placed < 0 && this.drag.tile !== null) this.updateGhost(event);
  };

  private newDrag(event: PointerEvent, tile: number | null, pressedPlaced: number | null, fromTray: boolean, wasSelected: boolean): Drag {
    return {
      pointerId: event.pointerId,
      tile,
      pressedPlaced,
      fromTray,
      wasSelected,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      touch: event.pointerType !== 'mouse',
    };
  }

  private readonly onMove = (event: PointerEvent): void => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > DRAG_THRESHOLD) {
      drag.moved = true;
      drag.pressedPlaced = null;
    }
    if (drag.tile !== null && (drag.moved || !drag.fromTray)) this.updateGhost(event);
  };

  private readonly onUp = (event: PointerEvent): void => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.drag = null;
    const ghost = this.ghost;
    this.ghost = undefined;
    if (drag.pressedPlaced !== null) {
      this.returnToTray(drag.pressedPlaced);
    } else if (drag.fromTray && !drag.moved) {
      if (drag.wasSelected) this.rotateSelected();
      this.paint();
    } else if (drag.tile !== null && ghost && (drag.moved || !drag.touch)) {
      this.tryPlace(drag.tile, this.anchorFor(drag.tile, ghost.cells));
    } else {
      if (drag.touch && drag.tile !== null && !drag.moved) this.status.textContent = 'Glisse ton doigt sur le plateau pour poser la tesselle.';
      this.paint();
    }
  };

  private readonly onCancel = (event: PointerEvent): void => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    this.drag = null;
    this.ghost = undefined;
    this.paint();
  };

  /** The board cell under a point, `lift` CSS pixels higher; null outside the board. */
  private cellAt(clientX: number, clientY: number, lift: number): [number, number] | null {
    const rect = this.canvas.getBoundingClientRect();
    const size = this.board.size;
    const x = Math.floor(((clientX - rect.left) / rect.width) * size);
    const y = Math.floor(((clientY - lift - rect.top) / rect.height) * size);
    return x >= 0 && y >= 0 && x < size && y < size ? [x, y] : null;
  }

  private updateGhost(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.tile === null) return;
    // On a phone the finger hides the tile: hold it a little above.
    const lift = drag.touch ? Math.max(28, (this.boardSize / this.board.size) * 1.2) : 0;
    const cell = this.cellAt(event.clientX, event.clientY, lift);
    if (!cell) {
      this.ghost = undefined;
    } else {
      const tile = this.board.tiles[drag.tile];
      const rotation = this.trayRotations[drag.tile];
      const [cx, cy] = shapeCentre(tileShape(tile, rotation));
      const placement = { x: cell[0] - cx, y: cell[1] - cy, rotation };
      const check = checkPlacement(this.board, this.placements, drag.tile, placement).kind;
      this.ghost = { tile: drag.tile, cells: placedCells(tile, placement), fits: check !== 'outside' && check !== 'overlap' };
    }
    this.paint();
  }

  private anchorFor(tile: number, cells: readonly (readonly [number, number])[]): Placement {
    return {
      x: Math.min(...cells.map(([x]) => x)),
      y: Math.min(...cells.map(([, y]) => y)),
      rotation: this.trayRotations[tile],
    };
  }

  private placedAt(x: number, y: number): number {
    return this.placements.findIndex((placement, tile) =>
      placement ? placedCells(this.board.tiles[tile], placement).some(([px, py]) => px === x && py === y) : false,
    );
  }

  // -----------------------------------------------
  // RULES
  // -----------------------------------------------

  private tryPlace(tile: number, placement: Placement): void {
    const check = checkPlacement(this.board, this.placements, tile, placement);
    if (check.kind === 'outside' || check.kind === 'overlap') {
      this.shake();
      this.paint();
      return;
    }
    if (check.kind === 'wrong') {
      this.current.mistakes++;
      saveMosaic(this.save);
      this.flash = check.cells;
      clearTimeout(this.flashTimer);
      this.flashTimer = window.setTimeout(() => {
        this.flash = undefined;
        this.paint();
      }, FLASH_MS);
      this.shake();
      this.paint();
      this.renderTray();
      this.status.textContent = `Pas la bonne couleur ici ! Erreurs : ${this.current.mistakes}`;
      return;
    }
    this.placements[tile] = placement;
    saveMosaic(this.save);
    this.selected = this.trayTiles()[0] ?? null;
    if (isComplete(this.board, this.placements)) {
      this.win();
      return;
    }
    this.paint();
    this.renderTray();
  }

  private returnToTray(tile: number): void {
    const placement = this.placements[tile];
    if (!placement) return;
    this.trayRotations[tile] = placement.rotation;
    this.placements[tile] = null;
    this.selected = tile;
    saveMosaic(this.save);
    this.paint();
    this.renderTray();
  }

  private shake(): void {
    this.stage.classList.remove('is-shaking');
    void this.stage.offsetWidth;
    this.stage.classList.add('is-shaking');
  }

  private win(): void {
    this.finished = true;
    this.ghost = undefined;
    const stars = starsFor(this.current.mistakes, this.board.tiles.length);
    this.save.mosaicsDone = Math.max(this.save.mosaicsDone, this.current.number);
    this.save.gallery.push({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      number: this.current.number,
      seed: this.current.seed,
      level: this.current.level,
      placements: this.placements.filter((placement): placement is Placement => placement !== null),
      stars,
      madeAt: new Date().toISOString(),
    });
    this.save.current = null;
    saveMosaic(this.save);
    const reward = levelReward(stars, this.difficulty, this.current.challenge);

    this.paint();
    this.stage.classList.add('is-finished');
    const next = el('button', { class: 'button', type: 'button' }, 'Mosaïque suivante');
    next.addEventListener('click', () => this.actions.nextMosaic());
    const mistakes = this.current.mistakes;
    this.status.textContent = '';
    this.controls.replaceChildren(
      el('p', { class: 'mosaic-result' }, el('strong', { text: 'Splendide !' }), ` ${mistakes === 0 ? 'Sans une seule erreur.' : `${mistakes} erreur${mistakes > 1 ? 's' : ''}.`}`),
      el('p', { class: 'mosaic-stars', text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }),
      reward,
      el('div', { class: 'button-row' }, next, el('a', { class: 'button button-secondary', href: '#/mosaique' }, 'Mes mosaïques')),
    );
  }
}
