import { darken } from '../../color';
import { el, topBar } from '../../dom';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { difficultyButton, difficultyName } from '../../difficulty';
import { UNGRADED_STARS, earnCoins } from '../../companion/companionSave';
import { rewardBanner } from '../../companion/reward';
import {
  BUBBLE_HEX,
  BUBBLE_LEVELS,
  BubbleBoard,
  COLS,
  MAX_ROWS,
  PRIMARIES,
  ROW_HEIGHT,
  componentsOf,
  generateLevel,
  isPrimary,
  mixOf,
  type BubbleColor,
  type Cell,
} from './bubbleBoard';
import { BUBBLES_HELP } from './bubbleHelp';
import { saveBubbles, type BubbleSave } from './bubbleSave';

// -----------------------------------------------
// TUNING (world units: one bubble = 1)
// -----------------------------------------------

const WORLD_HEIGHT = 14.4;
const SHOOTER: Point = { x: COLS / 2, y: 13.5 };
const NEXT_SLOT: Point = { x: COLS / 2 - 2.2, y: 13.75 };
/** A bubble whose centre passes this line ends the game. */
const DANGER_Y = 12.3;
const SHOT_SPEED = 24;
const STEP = 0.1;
/** Slightly under one diameter: a shot grazing a bubble slips past instead of sticking. */
const HIT_DISTANCE = 0.85;
const MIN_AIM_SLOPE = 0.15;
const POP_SECONDS = 0.28;
const GRAVITY = 40;

interface Point {
  x: number;
  y: number;
}

interface Flash {
  x: number;
  y: number;
  color: number;
  age: number;
}

interface Faller {
  x: number;
  y: number;
  vy: number;
  color: number;
}

export class BubbleGame {
  /** Generator level of the chosen difficulty. */
  private readonly level: number;
  private readonly board: BubbleBoard;
  private readonly canvas = el('canvas', { class: 'bubble-canvas' });
  private readonly context: CanvasRenderingContext2D;
  private readonly status = el('p', { class: 'bubble-status', role: 'status' });
  private readonly dropMeter = el('span', { class: 'drop-meter' });
  private readonly controls: HTMLElement;
  private sprites = new Map<number, HTMLCanvasElement>();
  private unit = 30;
  private ceilingY = 0;
  private shotsBeforeDrop: number;
  private current: BubbleColor;
  private next: BubbleColor;
  private aim: Point | null = null;
  private aimPointer: number | null = null;
  private shot: (Point & { vx: number; vy: number; color: BubbleColor }) | null = null;
  private flashes: Flash[] = [];
  private fallers: Faller[] = [];
  private over = false;
  private frameId = 0;
  private lastTime = 0;

  constructor(
    root: HTMLElement,
    private readonly save: BubbleSave,
    private readonly actions: { replay(): void },
  ) {
    this.level = BUBBLE_LEVELS[save.difficulty];
    this.board = generateLevel(this.level);
    this.shotsBeforeDrop = this.dropEvery();
    this.current = this.randomShotColor();
    this.next = this.randomShotColor();
    this.context = this.canvas.getContext('2d')!;

    const restart = el('button', { class: 'button button-secondary', type: 'button' }, 'Recommencer');
    restart.addEventListener('click', () => {
      if (this.over || confirm('Recommencer ce niveau ?')) this.actions.replay();
    });
    const zen = el('button', { class: 'button button-secondary', type: 'button' }, save.zen ? 'Mode normal' : 'Mode zen');
    zen.addEventListener('click', () => {
      if (!this.over && !confirm(save.zen ? 'Revenir au mode normal ? Le niveau recommence.' : 'Passer en mode zen ? Le niveau recommence.')) return;
      this.save.zen = !this.save.zen;
      saveBubbles(this.save);
      this.actions.replay();
    });
    const difficulty = difficultyButton(save.difficulty, (chosen) => {
      if (!this.over && !confirm('Changer de difficulté ? Le niveau recommence.')) return false;
      this.save.difficulty = chosen;
      saveBubbles(this.save);
      this.actions.replay();
    });
    this.controls = el('div', { class: 'bubble-controls' }, this.dropMeter, el('div', { class: 'button-row' }, restart, zen, difficulty));

    root.append(
      el(
        'div',
        { class: 'bubble-game' },
        topBar(`Bulles · ${difficultyName(save.difficulty)}${save.zen ? ' · zen' : ''}`, helpSlot(BUBBLES_HELP)),
        el('div', { class: 'bubble-stage' }, this.canvas),
        this.status,
        this.controls,
      ),
    );

    this.status.textContent = 'Vise avec le doigt, relâche pour tirer. Touche la petite bulle pour l’échanger.';
    this.refreshDropMeter();
    this.fit();
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    window.addEventListener('resize', this.fit);
    this.frameId = requestAnimationFrame(this.frame);
    openHelpOnFirstVisit(BUBBLES_HELP);
  }

  dispose(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.fit);
  }

  // -----------------------------------------------
  // LAYOUT
  // -----------------------------------------------

  private readonly fit = (): void => {
    const width = Math.min(window.innerWidth - 24, 480);
    const height = Math.max(300, window.innerHeight - 200);
    this.unit = Math.min(width / COLS, height / WORLD_HEIGHT);
    const ratio = window.devicePixelRatio || 1;
    this.canvas.style.width = `${Math.floor(COLS * this.unit)}px`;
    this.canvas.style.height = `${Math.floor(WORLD_HEIGHT * this.unit)}px`;
    this.canvas.width = Math.floor(COLS * this.unit * ratio);
    this.canvas.height = Math.floor(WORLD_HEIGHT * this.unit * ratio);
    this.sprites = new Map();
  };

  private toWorld(event: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * COLS,
      y: ((event.clientY - rect.top) / rect.height) * WORLD_HEIGHT,
    };
  }

  // -----------------------------------------------
  // INPUT
  // -----------------------------------------------

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.over || this.aimPointer !== null) return;
    const point = this.toWorld(event);
    if (Math.hypot(point.x - NEXT_SLOT.x, point.y - NEXT_SLOT.y) < 0.8) {
      [this.current, this.next] = [this.next, this.current];
      return;
    }
    this.canvas.setPointerCapture(event.pointerId);
    this.aimPointer = event.pointerId;
    this.aim = point;
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    // A mouse aims while hovering; a finger only while touching.
    if (event.pointerId === this.aimPointer || (event.pointerType === 'mouse' && this.aimPointer === null)) {
      this.aim = this.toWorld(event);
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.aimPointer) return;
    this.aimPointer = null;
    const direction = this.aimDirection();
    if (direction && !this.shot && !this.over) this.fire(direction);
    if (event.pointerType !== 'mouse') this.aim = null;
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (event.pointerId !== this.aimPointer) return;
    this.aimPointer = null;
    this.aim = null;
  };

  private readonly onPointerLeave = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && this.aimPointer === null) this.aim = null;
  };

  /** Unit vector from the shooter towards the aim, or null when aiming down or too flat. */
  private aimDirection(): Point | null {
    if (!this.aim) return null;
    const dx = this.aim.x - SHOOTER.x;
    const dy = this.aim.y - SHOOTER.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.5 || -dy / length < MIN_AIM_SLOPE) return null;
    return { x: dx / length, y: dy / length };
  }

  // -----------------------------------------------
  // SHOOTING
  // -----------------------------------------------

  private fire(direction: Point): void {
    this.shot = { x: SHOOTER.x, y: SHOOTER.y, vx: direction.x * SHOT_SPEED, vy: direction.y * SHOT_SPEED, color: this.current };
    this.current = this.next;
    this.next = this.randomShotColor();
  }

  /** Moves the shot along its path; returns what stopped it, if anything. */
  private advance(point: Point & { vx: number; vy: number }, distance: number): { cell: Cell | null } | null {
    const steps = Math.ceil(distance / STEP);
    const speed = Math.hypot(point.vx, point.vy);
    for (let i = 0; i < steps; i++) {
      point.x += (point.vx / speed) * (distance / steps);
      point.y += (point.vy / speed) * (distance / steps);
      if (point.x < 0.5) {
        point.x = 1 - point.x;
        point.vx = Math.abs(point.vx);
      } else if (point.x > COLS - 0.5) {
        point.x = 2 * (COLS - 0.5) - point.x;
        point.vx = -Math.abs(point.vx);
      }
      if (point.y - 0.5 <= this.ceilingY) return { cell: null };
      const hit = this.touchingBubble(point);
      if (hit) return { cell: hit };
    }
    return null;
  }

  private touchingBubble(point: Point): Cell | null {
    let best: Cell | null = null;
    let bestDistance = HIT_DISTANCE;
    for (const [row, col] of this.board.occupied()) {
      const distance = Math.hypot(BubbleBoard.x(row, col) - point.x, this.ceilingY + BubbleBoard.y(row) - point.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = [row, col];
      }
    }
    return best;
  }

  /** The shot stopped: it mixes into the bubble it hit, or sticks in the nearest free cell. */
  private land(color: BubbleColor, at: Point, hit: Cell | null): void {
    let changed: Cell | null = null;
    const mixed = hit ? mixOf(color, this.board.get(hit[0], hit[1])) : null;
    if (hit && mixed !== null) {
      this.board.set(hit[0], hit[1], mixed);
      this.flash(hit, mixed);
      changed = hit;
    } else {
      changed = this.nearestFreeCell(at, hit);
      if (changed) this.board.set(changed[0], changed[1], color);
    }
    if (!changed) {
      this.lose();
      return;
    }

    const group = this.board.sameColorGroup(changed[0], changed[1]);
    if (group.length >= 3) {
      for (const cell of group) this.removeWithFlash(cell);
      for (const cell of this.board.floating()) this.removeFalling(cell);
    }

    if (!this.save.zen) {
      this.shotsBeforeDrop--;
      if (this.shotsBeforeDrop === 0) {
        this.ceilingY += ROW_HEIGHT;
        this.shotsBeforeDrop = this.dropEvery();
      }
      this.refreshDropMeter();
    }

    if (this.board.isEmpty()) this.win();
    else if (this.lowestBubbleY() > DANGER_Y) this.lose();
    else {
      // A colour that no longer matches anything on the board would be a wasted shot.
      if (!this.isUseful(this.current)) this.current = this.randomShotColor();
      if (!this.isUseful(this.next)) this.next = this.randomShotColor();
    }
  }

  private nearestFreeCell(at: Point, hit: Cell | null): Cell | null {
    const candidates: Cell[] = hit
      ? this.board.neighbours(hit[0], hit[1])
      : [...Array(COLS).keys()].map((col): Cell => [0, col]);
    let best: Cell | null = null;
    let bestDistance = Infinity;
    for (const [row, col] of candidates) {
      if (this.board.get(row, col) !== 0 || row >= MAX_ROWS) continue;
      const distance = Math.hypot(BubbleBoard.x(row, col) - at.x, this.ceilingY + BubbleBoard.y(row) - at.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = [row, col];
      }
    }
    return best;
  }

  private dropEvery(): number {
    return Math.max(5, 9 - Math.floor(this.level / 2));
  }

  private lowestBubbleY(): number {
    return Math.max(0, ...this.board.occupied().map(([row]) => this.ceilingY + BubbleBoard.y(row)));
  }

  /** Primaries that can still do something: those on the board, or those that make a mix on the board. */
  private usefulColors(): BubbleColor[] {
    const useful = new Set<BubbleColor>();
    for (const [row, col] of this.board.occupied()) {
      for (const part of componentsOf(this.board.get(row, col) as BubbleColor)) useful.add(part);
    }
    return PRIMARIES.filter((color) => useful.has(color));
  }

  private isUseful(color: BubbleColor): boolean {
    return this.usefulColors().includes(color);
  }

  private randomShotColor(): BubbleColor {
    const pool = this.usefulColors();
    const choices = pool.length > 0 ? pool : PRIMARIES;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  // -----------------------------------------------
  // EFFECTS
  // -----------------------------------------------

  private flash([row, col]: Cell, color: number): void {
    this.flashes.push({ x: BubbleBoard.x(row, col), y: this.ceilingY + BubbleBoard.y(row), color, age: 0 });
  }

  private removeWithFlash(cell: Cell): void {
    this.flash(cell, this.board.get(cell[0], cell[1]));
    this.board.set(cell[0], cell[1], 0);
  }

  private removeFalling([row, col]: Cell): void {
    this.fallers.push({ x: BubbleBoard.x(row, col), y: this.ceilingY + BubbleBoard.y(row), vy: 0, color: this.board.get(row, col) });
    this.board.set(row, col, 0);
  }

  // -----------------------------------------------
  // END OF LEVEL
  // -----------------------------------------------

  private win(): void {
    this.over = true;
    this.save.cleared++;
    saveBubbles(this.save);
    // Zen mode has no ceiling to fear: it pays half.
    const coins = earnCoins(this.save.zen ? UNGRADED_STARS / 2 : UNGRADED_STARS, this.save.difficulty);
    const next = el('button', { class: 'button', type: 'button' }, 'Niveau suivant');
    next.addEventListener('click', () => this.actions.replay());
    this.status.textContent = '';
    this.controls.replaceChildren(
      el('p', { class: 'bubble-result' }, el('strong', { text: 'Bravo !' }), ' Toutes les bulles ont éclaté.'),
      rewardBanner(coins),
      el('div', { class: 'button-row' }, next),
    );
  }

  private lose(): void {
    this.over = true;
    const again = el('button', { class: 'button', type: 'button' }, 'Réessayer');
    again.addEventListener('click', () => this.actions.replay());
    this.status.textContent = '';
    this.controls.replaceChildren(
      el('p', { class: 'bubble-result' }, 'Les bulles sont arrivées en bas… ', el('strong', { text: 'On recommence ?' })),
      el('div', { class: 'button-row' }, again),
    );
  }

  private refreshDropMeter(): void {
    if (this.save.zen) {
      this.dropMeter.replaceChildren(el('span', { text: 'Mode zen : le plafond ne descend pas.' }));
      return;
    }
    const total = this.dropEvery();
    this.dropMeter.replaceChildren(
      el('span', { text: 'Le plafond descend dans ' }),
      ...Array.from({ length: total }, (_, i) => el('span', { class: i < this.shotsBeforeDrop ? 'drop-dot is-left' : 'drop-dot' })),
    );
  }

  // -----------------------------------------------
  // FRAME
  // -----------------------------------------------

  private readonly frame = (time: number): void => {
    this.frameId = requestAnimationFrame(this.frame);
    const dt = this.lastTime === 0 ? 0 : Math.min(1 / 30, (time - this.lastTime) / 1000);
    this.lastTime = time;

    if (this.shot) {
      const shot = this.shot;
      const stop = this.advance(shot, SHOT_SPEED * dt);
      if (stop) {
        this.shot = null;
        this.land(shot.color, shot, stop.cell);
      }
    }
    for (const flash of this.flashes) flash.age += dt;
    this.flashes = this.flashes.filter((flash) => flash.age < POP_SECONDS);
    for (const faller of this.fallers) {
      faller.vy += GRAVITY * dt;
      faller.y += faller.vy * dt;
    }
    this.fallers = this.fallers.filter((faller) => faller.y < WORLD_HEIGHT + 1);
    this.draw();
  };

  private draw(): void {
    const context = this.context;
    const scale = this.canvas.width / COLS;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.setTransform(scale, 0, 0, scale, 0, 0);

    // The ceiling coming down.
    context.fillStyle = '#e6d4de';
    context.fillRect(0, 0, COLS, this.ceilingY);
    context.fillStyle = '#c9a9ba';
    context.fillRect(0, this.ceilingY - 0.08, COLS, 0.08);

    // Danger line: a bubble below it ends the game.
    context.strokeStyle = 'rgba(217, 96, 140, 0.45)';
    context.lineWidth = 0.05;
    context.setLineDash([0.25, 0.2]);
    context.beginPath();
    context.moveTo(0, DANGER_Y + 0.5);
    context.lineTo(COLS, DANGER_Y + 0.5);
    context.stroke();
    context.setLineDash([]);

    for (const [row, col] of this.board.occupied()) {
      this.drawBubble(this.board.get(row, col), BubbleBoard.x(row, col), this.ceilingY + BubbleBoard.y(row), 1);
    }
    for (const faller of this.fallers) this.drawBubble(faller.color, faller.x, faller.y, 1);
    for (const flash of this.flashes) {
      const progress = flash.age / POP_SECONDS;
      context.globalAlpha = 1 - progress;
      this.drawBubble(flash.color, flash.x, flash.y, 1 + progress * 0.6);
      context.globalAlpha = 1;
    }

    if (!this.shot && !this.over) this.drawAimLine();
    if (this.shot) this.drawBubble(this.shot.color, this.shot.x, this.shot.y, 1);
    else if (!this.over) this.drawBubble(this.current, SHOOTER.x, SHOOTER.y, 1);
    if (!this.over) this.drawBubble(this.next, NEXT_SLOT.x, NEXT_SLOT.y, 0.6);
  }

  private drawAimLine(): void {
    const direction = this.aimDirection();
    if (!direction) return;
    const probe = { x: SHOOTER.x, y: SHOOTER.y, vx: direction.x, vy: direction.y };
    const context = this.context;
    context.fillStyle = BUBBLE_HEX[this.current];
    for (let travelled = 0; travelled < 26; travelled += 0.5) {
      if (this.advance(probe, 0.5)) break;
      if (travelled > 0.5) {
        context.beginPath();
        context.arc(probe.x, probe.y, 0.07, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  private drawBubble(color: number, x: number, y: number, size: number): void {
    const sprite = this.sprite(color);
    this.context.drawImage(sprite, x - size / 2, y - size / 2, size, size);
  }

  /** One pre-drawn bubble per colour; mixed colours carry a white ring so they read as mixes. */
  private sprite(color: number): HTMLCanvasElement {
    const existing = this.sprites.get(color);
    if (existing) return existing;
    const pixels = Math.max(8, Math.ceil(this.canvas.width / COLS));
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = pixels;
    const context = sprite.getContext('2d')!;
    const r = pixels / 2;
    const gradient = context.createRadialGradient(r * 0.7, r * 0.6, r * 0.1, r, r, r);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.25, BUBBLE_HEX[color as BubbleColor]);
    gradient.addColorStop(1, darken(BUBBLE_HEX[color as BubbleColor], 0.75));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(r, r, r * 0.94, 0, Math.PI * 2);
    context.fill();
    if (!isPrimary(color)) {
      context.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      context.lineWidth = pixels * 0.07;
      context.beginPath();
      context.arc(r, r, r * 0.55, 0, Math.PI * 2);
      context.stroke();
    }
    this.sprites.set(color, sprite);
    return sprite;
  }
}
