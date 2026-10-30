import { isDarkColor } from '../../color';
import { el, topBar, type BackLink } from '../../dom';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { generateCookie, type Cookie, type Point } from './cookie';
import { ICING_HELP } from './icingHelp';
import { paintCookie } from './icingPainter';
import { compactStroke, cookieDifficulty, cookieNumber, saveIcing, type CurrentCookie, type IcingSave } from './icingSave';
import { scoreIcing, starsFor, toleranceFor, type Stroke } from './icingScore';
import { difficultyName } from '../../difficulty';
import { earnCoins } from '../../companion/companionSave';
import { rewardBanner } from '../../companion/reward';

const BACK_ICING: BackLink = { href: '#/glacage', label: 'Glaçage' };
/** A new point is kept once the finger moved this far (cookie units). */
const MIN_POINT_GAP = 0.003;
const MIN_ICING_POINTS = 10;

export interface IcingGameActions {
  nextCookie(): void;
}

export class IcingGame {
  private readonly cookie: Cookie;
  private readonly canvas = el('canvas', { class: 'icing-canvas' });
  private readonly status = el('p', { class: 'icing-status', role: 'status' });
  private readonly controls: HTMLElement;
  private readonly undoButton: HTMLButtonElement;
  private readonly swatches: HTMLButtonElement[] = [];
  private selected = 0;
  private drawing: { pointer: number; stroke: Stroke } | null = null;
  private finished = false;

  constructor(
    root: HTMLElement,
    private readonly save: IcingSave,
    private readonly current: CurrentCookie,
    private readonly actions: IcingGameActions,
  ) {
    this.cookie = generateCookie(current.seed, current.level);

    this.undoButton = el('button', { class: 'button button-secondary', type: 'button' }, '↶ Annuler');
    this.undoButton.addEventListener('click', () => this.undo());
    const restart = el('button', { class: 'button button-secondary', type: 'button' }, 'Recommencer');
    restart.addEventListener('click', () => this.restart());
    const finish = el('button', { class: 'button', type: 'button' }, "J'ai fini !");
    finish.addEventListener('click', () => this.finish());
    this.controls = el(
      'div',
      { class: 'icing-controls' },
      this.buildPalette(),
      el('div', { class: 'button-row' }, this.undoButton, restart, finish),
    );

    root.append(
      el(
        'div',
        { class: 'icing-game' },
        topBar(`Biscuit n°${cookieNumber(current)} · ${difficultyName(cookieDifficulty(current))}`, helpSlot(ICING_HELP), BACK_ICING),
        el('div', { class: 'icing-stage' }, this.canvas),
        this.status,
        this.controls,
      ),
    );

    this.status.textContent = 'Suis les pointillés avec le glaçage de la même couleur.';
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.endStroke);
    this.canvas.addEventListener('pointercancel', this.endStroke);
    this.canvas.addEventListener('lostpointercapture', this.endStroke);
    window.addEventListener('resize', this.fit);
    this.fit();
    openHelpOnFirstVisit(ICING_HELP);
  }

  dispose(): void {
    window.removeEventListener('resize', this.fit);
  }

  private buildPalette(): HTMLElement {
    const palette = el('div', { class: 'palette', role: 'group', 'aria-label': 'Glaçages' });
    this.cookie.palette.forEach((color, index) => {
      const swatch = el('button', { class: 'swatch', type: 'button', 'aria-label': `Glaçage ${index + 1}` });
      swatch.style.setProperty('--swatch', color);
      if (isDarkColor(color)) swatch.classList.add('is-dark');
      swatch.addEventListener('click', () => this.select(index));
      this.swatches.push(swatch);
      palette.append(swatch);
    });
    this.select(0);
    return palette;
  }

  private readonly fit = (): void => {
    const size = Math.floor(Math.max(220, Math.min(window.innerWidth - 32, window.innerHeight - 250, 560)));
    this.canvas.style.width = this.canvas.style.height = `${size}px`;
    this.canvas.width = this.canvas.height = Math.floor(size * (window.devicePixelRatio || 1));
    this.repaint();
  };

  private repaint(sprinkles?: number): void {
    const strokes = this.drawing ? [...this.current.strokes, this.drawing.stroke] : this.current.strokes;
    paintCookie(this.canvas, this.cookie, strokes, { showGuides: !this.finished, sprinkles });
    this.undoButton.disabled = this.current.strokes.length === 0;
  }

  private select(index: number): void {
    this.selected = index;
    this.swatches.forEach((swatch, i) => {
      swatch.classList.toggle('is-active', i === index);
      swatch.setAttribute('aria-pressed', String(i === index));
    });
  }

  // -----------------------------------------------
  // PIPING
  // -----------------------------------------------

  private toCookie(event: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height];
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.finished || this.drawing || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.drawing = { pointer: event.pointerId, stroke: { color: this.selected, points: [this.toCookie(event)] } };
    this.repaint();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.drawing || event.pointerId !== this.drawing.pointer) return;
    const points = this.drawing.stroke.points;
    const point = this.toCookie(event);
    const [lastX, lastY] = points[points.length - 1];
    if (Math.hypot(point[0] - lastX, point[1] - lastY) < MIN_POINT_GAP) return;
    points.push(point);
    this.repaint();
  };

  private readonly endStroke = (event: PointerEvent): void => {
    if (!this.drawing || event.pointerId !== this.drawing.pointer) return;
    this.current.strokes.push(compactStroke(this.drawing.stroke));
    this.drawing = null;
    saveIcing(this.save);
    this.repaint();
  };

  private undo(): void {
    if (this.finished) return;
    this.current.strokes.pop();
    saveIcing(this.save);
    this.repaint();
  }

  private restart(): void {
    if (this.finished || this.current.strokes.length === 0 || !confirm('Enlever tout le glaçage ?')) return;
    this.current.strokes = [];
    saveIcing(this.save);
    this.repaint();
  }

  // -----------------------------------------------
  // FINISHING
  // -----------------------------------------------

  private finish(): void {
    if (this.finished) return;
    const icingPoints = this.current.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);
    if (icingPoints < MIN_ICING_POINTS) {
      this.status.textContent = 'Pose un peu de glaçage d’abord !';
      return;
    }
    const difficulty = cookieDifficulty(this.current);
    const score = scoreIcing(this.cookie, this.current.strokes, toleranceFor(difficulty));
    const stars = starsFor(score.total);
    this.finished = true;
    this.save.cookiesDone = Math.max(this.save.cookiesDone, cookieNumber(this.current));
    this.save.showcase.push({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      number: cookieNumber(this.current),
      level: this.current.level,
      seed: this.current.seed,
      strokes: this.current.strokes,
      stars,
      madeAt: new Date().toISOString(),
    });
    this.save.current = null;
    saveIcing(this.save);
    const coins = earnCoins(stars, difficulty);

    // Sprinkles seeded by the cookie: the showcase throws exactly the same ones.
    this.repaint(this.current.seed);
    this.canvas.classList.add('is-done');
    const next = el('button', { class: 'button', type: 'button' }, 'Biscuit suivant');
    next.addEventListener('click', () => this.actions.nextCookie());
    this.status.textContent = '';
    this.controls.replaceChildren(
      el(
        'p',
        { class: 'icing-result' },
        el('span', { class: 'icing-stars', text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }),
        ` Précision : ${Math.round(score.total * 100)} %`,
      ),
      rewardBanner(coins),
      el('div', { class: 'button-row' }, next, el('a', { class: 'button button-secondary', href: '#/glacage' }, 'Ma vitrine')),
    );
  }
}
