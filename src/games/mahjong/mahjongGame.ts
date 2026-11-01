import { el, topBar, type BackLink } from '../../dom';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { difficultyName } from '../../difficulty';
import { levelReward } from '../../companion/reward';
import { MAHJONG_HELP } from './mahjongHelp';
import type { Layout } from './mahjongLayouts';
import {
  FACES,
  MAHJONG_TIERS,
  availablePairs,
  geometryOf,
  isFree,
  matchKey,
  reshuffle,
  solve,
  starsFor,
  type Geometry,
} from './mahjongLogic';
import { saveMahjong, statsKey, type MahjongCurrent, type MahjongSave } from './mahjongSave';

const BACK_MAHJONG: BackLink = { href: '#/mahjong', label: 'Mahjong' };

/** Face height over face width. */
const TILE_RATIO = 1.3;
/** Thickness of a tile (and offset of each layer) relative to its width. */
const DEPTH_RATIO = 0.13;
const MAX_TILE_WIDTH = 64;
/** Tile width reached by the zoom on small screens. */
const ZOOM_TILE_WIDTH = 44;
const GONE_MS = 380;

export interface MahjongGameActions {
  newGame(): void;
  restart(): void;
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export class MahjongGame {
  private readonly geometry: Geometry;
  private readonly present: boolean[];
  private readonly tiles: HTMLButtonElement[] = [];
  private readonly board = el('div', { class: 'mj-board' });
  private readonly frame = el('div', { class: 'mj-frame' }, this.board);
  private readonly clock = el('strong', { class: 'mj-clock' });
  private readonly info = el('span', { class: 'mj-info', role: 'status' });
  private readonly notice = el('div', { class: 'mj-notice' });
  private readonly result = el('section', { class: 'mj-result' });
  private readonly undoButton = el('button', { class: 'button button-secondary', type: 'button' }, 'Annuler');
  private readonly hintButton = el('button', { class: 'button button-secondary', type: 'button' });
  private readonly shuffleButton = el('button', { class: 'button button-secondary', type: 'button' });
  private readonly zoomButton = el('button', { class: 'button button-secondary', type: 'button' });
  private readonly tools = el('div', { class: 'mj-tools' });
  private zoomed = false;
  private readonly tier;
  private readonly dim: boolean;
  private selected: number | null = null;
  private hinted: number[] = [];
  private finished = false;
  private timer = 0;
  private tileWidth = 0;
  private readonly resizeObserver: ResizeObserver;

  constructor(
    root: HTMLElement,
    private readonly save: MahjongSave,
    private readonly layout: Layout,
    private readonly state: MahjongCurrent,
    private readonly actions: MahjongGameActions,
  ) {
    this.tier = MAHJONG_TIERS[state.tier];
    this.dim = save.dim === 'auto' ? this.tier.dimBlocked : save.dim === 'on';
    this.geometry = geometryOf(layout.spots);
    this.present = layout.spots.map(() => true);
    for (const [a, b] of state.removed) this.present[a] = this.present[b] = false;

    this.board.classList.toggle('is-dim', this.dim);
    layout.spots.forEach((spot, index) => {
      const face = el('span', { class: 'mj-face' });
      const tile = el('button', { class: 'mj-tile', type: 'button' }, face);
      tile.style.zIndex = String(spot.z * 1000 + spot.y * 30 + spot.x);
      tile.style.setProperty('--z', String(spot.z));
      tile.addEventListener('click', () => this.tap(index));
      this.board.append(tile);
      this.tiles.push(tile);
    });
    this.paintFaces();

    this.undoButton.addEventListener('click', () => this.undo());
    this.hintButton.addEventListener('click', () => this.hint());
    this.shuffleButton.addEventListener('click', () => this.shuffle());
    this.zoomButton.addEventListener('click', () => this.toggleZoom());
    this.tools.append(this.undoButton, this.hintButton, this.shuffleButton, this.zoomButton);
    this.enableMousePan();

    const title = state.challenge ? 'Défi du jour' : layout.name;
    root.append(
      el(
        'div',
        { class: 'mj-game' },
        topBar(title, helpSlot(MAHJONG_HELP), BACK_MAHJONG),
        el('div', { class: 'mj-hud' }, this.clock, this.info),
        this.frame,
        this.notice,
        this.tools,
        this.result,
      ),
    );
    this.resizeObserver = new ResizeObserver(() => this.layoutBoard());
    this.resizeObserver.observe(this.frame);
    window.addEventListener('resize', this.onResize);
    this.layoutBoard();
    this.render();
    openHelpOnFirstVisit(MAHJONG_HELP);
    this.timer = window.setInterval(this.tick, 1000);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  dispose(): void {
    window.clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.onResize);
    this.persist();
  }

  // -----------------------------------------------
  // CLOCK AND SAVE
  // -----------------------------------------------

  private readonly tick = (): void => {
    if (this.finished || document.hidden || document.querySelector('dialog[open]')) return;
    this.state.elapsed++;
    this.clock.textContent = formatTime(this.state.elapsed);
    if (this.state.elapsed % 10 === 0) this.persist();
  };

  private readonly onVisibility = (): void => {
    if (document.hidden) this.persist();
  };

  private persist(): void {
    if (this.finished) return;
    this.save.current = this.state;
    saveMahjong(this.save);
  }

  // -----------------------------------------------
  // DRAWING
  // -----------------------------------------------

  private paintFaces(): void {
    this.tiles.forEach((tile, index) => {
      const face = FACES[this.state.faces[index]];
      tile.dataset.suit = face.suit;
      tile.firstElementChild!.textContent = face.emoji;
      tile.setAttribute('aria-label', face.emoji);
    });
  }

  private readonly onResize = (): void => this.layoutBoard();

  private toggleZoom(): void {
    this.zoomed = !this.zoomed;
    this.layoutBoard();
    if (this.zoomed) this.frame.scrollTo({ left: (this.frame.scrollWidth - this.frame.clientWidth) / 2, top: 0 });
  }

  /** Drag with the mouse pans the zoomed board (touch pans natively); a drag does not count as a tap. */
  private enableMousePan(): void {
    let start: { x: number; y: number; left: number; top: number } | null = null;
    let dragged = false;
    this.frame.addEventListener('pointerdown', (event) => {
      if (!this.zoomed || event.pointerType !== 'mouse') return;
      start = { x: event.clientX, y: event.clientY, left: this.frame.scrollLeft, top: this.frame.scrollTop };
      dragged = false;
    });
    this.frame.addEventListener('pointermove', (event) => {
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (!dragged && Math.abs(dx) + Math.abs(dy) > 6) {
        dragged = true;
        this.frame.setPointerCapture(event.pointerId);
      }
      if (dragged) this.frame.scrollTo(start.left - dx, start.top - dy);
    });
    this.frame.addEventListener('pointerup', () => (start = null));
    this.frame.addEventListener(
      'click',
      (event) => {
        if (!dragged) return;
        dragged = false;
        event.stopPropagation();
      },
      true,
    );
  }

  /** Height left for the board between its top and the tool row, so the page does not scroll. */
  private availableHeight(): number {
    const top = this.frame.getBoundingClientRect().top + window.scrollY;
    const below = this.tools.offsetHeight + this.notice.offsetHeight + 8;
    return Math.max(240, window.innerHeight - top - below);
  }

  /** Fits the board to the frame's width and the screen's remaining height; the zoom overrides the fit. */
  private layoutBoard(): void {
    const spots = this.layout.spots;
    const minX = Math.min(...spots.map((s) => s.x));
    const minY = Math.min(...spots.map((s) => s.y));
    const columns = (Math.max(...spots.map((s) => s.x)) + 2 - minX) / 2;
    const rows = (Math.max(...spots.map((s) => s.y)) + 2 - minY) / 2;
    const layers = Math.max(...spots.map((s) => s.z)) + 1;
    const height = this.availableHeight();
    const byWidth = (this.frame.clientWidth - 12) / (columns + DEPTH_RATIO * (layers + 1.5));
    const byHeight = (height - 16) / (rows * TILE_RATIO + DEPTH_RATIO * (layers + 1.5));
    const fit = Math.floor(Math.min(byWidth, byHeight, MAX_TILE_WIDTH));
    const canZoom = fit < ZOOM_TILE_WIDTH - 4;
    if (!canZoom) this.zoomed = false;
    // .button sets a display that beats the hidden attribute.
    this.zoomButton.style.display = canZoom ? '' : 'none';
    this.zoomButton.textContent = this.zoomed ? 'Vue entière' : 'Zoom';
    this.frame.classList.toggle('is-zoomed', this.zoomed);
    this.frame.style.height = this.zoomed ? `${height}px` : '';
    const tileWidth = this.zoomed ? ZOOM_TILE_WIDTH : fit;
    if (tileWidth === this.tileWidth || tileWidth <= 0) return;
    this.tileWidth = tileWidth;
    const tileHeight = Math.round(tileWidth * TILE_RATIO);
    const depth = Math.max(3, Math.round(tileWidth * DEPTH_RATIO));
    const lift = depth * (layers - 1);
    this.board.style.setProperty('--w', `${tileWidth}px`);
    this.board.style.setProperty('--h', `${tileHeight}px`);
    this.board.style.setProperty('--d', `${depth}px`);
    this.board.style.width = `${columns * tileWidth + lift + depth * 2}px`;
    this.board.style.height = `${rows * tileHeight + lift + depth * 2}px`;
    spots.forEach((spot, index) => {
      const tile = this.tiles[index];
      tile.style.left = `${((spot.x - minX) / 2) * tileWidth + lift - spot.z * depth}px`;
      tile.style.top = `${((spot.y - minY) / 2) * tileHeight + lift - spot.z * depth}px`;
    });
  }

  private render(): void {
    this.tiles.forEach((tile, index) => {
      const here = this.present[index];
      tile.hidden = !here && !tile.classList.contains('is-gone');
      tile.disabled = !here;
      tile.classList.toggle('is-blocked', here && !isFree(this.geometry, this.present, index));
      tile.classList.toggle('is-selected', index === this.selected);
      tile.classList.toggle('is-hint', this.hinted.includes(index));
    });
    const left = this.present.filter(Boolean).length;
    const pairs = new Set(availablePairs(this.geometry, this.present, this.state.faces).map(([a]) => matchKey(this.state.faces[a]))).size;
    this.clock.textContent = formatTime(this.state.elapsed);
    const shown = this.tier.dimBlocked ? ` · ${pairs} motif${pairs > 1 ? 's' : ''} à jouer` : '';
    this.info.textContent = `${difficultyName(this.state.tier)} · ${left} tuiles${shown}`;
    const hintsLeft = this.tier.hints - this.state.hints;
    this.hintButton.textContent = `Indice (${hintsLeft})`;
    this.hintButton.disabled = this.finished || hintsLeft <= 0 || pairs === 0;
    const shufflesLeft = this.tier.shuffles - this.state.shuffles;
    this.shuffleButton.textContent = Number.isFinite(shufflesLeft) ? `Mélanger (${shufflesLeft})` : 'Mélanger';
    this.shuffleButton.disabled = this.finished || shufflesLeft <= 0 || left === 0;
    this.undoButton.disabled = this.finished || this.state.removed.length === 0;
    this.renderNotice(left, pairs, shufflesLeft);
  }

  private renderNotice(left: number, pairs: number, shufflesLeft: number): void {
    if (this.finished || left === 0 || pairs > 0) {
      this.notice.replaceChildren();
      return;
    }
    const restart = el('button', { class: 'button button-secondary', type: 'button' }, 'Recommencer');
    restart.addEventListener('click', () => this.actions.restart());
    if (shufflesLeft > 0) {
      const shuffle = el('button', { class: 'button', type: 'button' }, 'Mélanger (−1 ★)');
      shuffle.addEventListener('click', () => this.shuffle());
      this.notice.replaceChildren(el('p', { text: 'Plus aucune paire !' }), el('div', { class: 'button-row' }, shuffle, restart));
    } else {
      this.notice.replaceChildren(
        el('p', { text: 'Plus aucune paire, et plus de mélange… Annule quelques coups ou recommence.' }),
        el('div', { class: 'button-row' }, restart),
      );
    }
  }

  // -----------------------------------------------
  // MOVES
  // -----------------------------------------------

  private tap(index: number): void {
    if (this.finished || !this.present[index]) return;
    if (!isFree(this.geometry, this.present, index)) {
      this.bump(this.tiles[index]);
      return;
    }
    if (this.selected === index) {
      this.selected = null;
    } else if (this.selected !== null && matchKey(this.state.faces[this.selected]) === matchKey(this.state.faces[index])) {
      this.remove(this.selected, index);
      return;
    } else {
      this.selected = index;
    }
    this.render();
  }

  private remove(a: number, b: number): void {
    this.present[a] = this.present[b] = false;
    this.state.removed.push([a, b]);
    this.selected = null;
    this.hinted = [];
    for (const index of [a, b]) {
      const tile = this.tiles[index];
      tile.classList.add('is-gone');
      this.sparkle(tile);
      window.setTimeout(() => {
        tile.classList.remove('is-gone');
        tile.hidden = !this.present[index];
      }, GONE_MS);
    }
    buzz(12);
    this.render();
    if (!this.present.includes(true)) this.win();
    else this.persist();
  }

  private undo(): void {
    const last = this.state.removed.pop();
    if (!last || this.finished) return;
    for (const index of last) {
      this.present[index] = true;
      this.tiles[index].classList.remove('is-gone');
    }
    this.selected = null;
    this.hinted = [];
    this.render();
    this.persist();
  }

  private hint(): void {
    if (this.finished || this.state.hints >= this.tier.hints) return;
    // A pair that keeps the game winnable when the solver finds one in time.
    const plan = solve(this.geometry, this.present, this.state.faces, 15000);
    const pair = plan?.[0] ?? availablePairs(this.geometry, this.present, this.state.faces)[0];
    if (!pair) return;
    this.state.hints++;
    this.hinted = [...pair];
    this.selected = null;
    this.render();
    this.persist();
  }

  private shuffle(): void {
    if (this.finished || this.state.shuffles >= this.tier.shuffles) return;
    this.state.shuffles++;
    this.state.faces = reshuffle(this.geometry, this.present, this.state.faces, this.state.seed + this.state.shuffles * 7919);
    this.selected = null;
    this.hinted = [];
    this.paintFaces();
    this.board.classList.remove('is-shuffling');
    void this.board.offsetWidth;
    this.board.classList.add('is-shuffling');
    this.render();
    this.persist();
  }

  private bump(tile: HTMLElement): void {
    tile.classList.remove('is-bumped');
    void tile.offsetWidth;
    tile.classList.add('is-bumped');
  }

  private sparkle(tile: HTMLElement): void {
    const spark = el('span', { class: 'mj-sparkle', 'aria-hidden': 'true', text: '✨' });
    spark.style.left = tile.style.left;
    spark.style.top = tile.style.top;
    this.board.append(spark);
    window.setTimeout(() => spark.remove(), 700);
  }

  // -----------------------------------------------
  // WIN
  // -----------------------------------------------

  private win(): void {
    this.finished = true;
    const { hints, shuffles, elapsed, challenge } = this.state;
    const stars = starsFor(hints, shuffles);
    const key = statsKey(this.layout.id, this.state.tier);
    const previous = this.save.stats[key] ?? { wins: 0, best: 0 };
    const record = previous.best === 0 || elapsed < previous.best;
    this.save.stats[key] = { wins: previous.wins + 1, best: record ? elapsed : previous.best };
    this.save.gamesWon++;
    this.save.current = undefined;
    if (challenge) this.save.challenge = undefined;
    saveMahjong(this.save);

    this.board.classList.add('is-won');
    this.confetti();
    const again = el('button', { class: 'button', type: 'button' }, 'Nouvelle partie');
    again.addEventListener('click', () => this.actions.newGame());
    const penalties = hints + shuffles === 0 ? 'sans aide' : `${hints} indice${hints > 1 ? 's' : ''}, ${shuffles} mélange${shuffles > 1 ? 's' : ''}`;
    this.result.replaceChildren(
      el('h2', { text: 'Plateau vidé !' }),
      el('p', { class: 'mj-result-line' }, el('strong', { text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }), ` ${formatTime(elapsed)}, ${penalties}.`),
      el('p', { class: 'mj-result-line', text: record ? 'Nouveau record sur cette disposition !' : `Record : ${formatTime(previous.best)}` }),
      levelReward(stars, this.state.tier, challenge),
      el('div', { class: 'button-row' }, again, el('a', { class: 'button button-secondary', href: '#/mahjong' }, 'Menu')),
    );
    this.render();
    window.setTimeout(() => this.result.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
    buzz([30, 60, 30]);
  }

  private confetti(): void {
    const emojis = this.layout.spots.map((_, index) => FACES[this.state.faces[index]].emoji);
    for (let k = 0; k < 24; k++) {
      const bit = el('span', { class: 'mj-confetti', 'aria-hidden': 'true', text: emojis[(k * 7) % emojis.length] });
      bit.style.left = `${(k * 37) % 100}%`;
      bit.style.animationDelay = `${(k % 8) * 80}ms`;
      this.frame.append(bit);
      window.setTimeout(() => bit.remove(), 2200);
    }
  }
}

function buzz(pattern: number | number[]): void {
  if (typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
}
