import { el, topBar, type BackLink } from '../../dom';
import { isDarkColor } from '../../color';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { difficultyFromLevel, difficultyName, type Difficulty } from '../../difficulty';
import { levelReward } from '../../companion/reward';
import { GLASS_HELP } from './glassHelp';
import { paintWindow } from './glassPainter';
import { GAME_WIDTH, GLASS_LEVELS, generateLayout, rasterize, type Layout, type Raster } from './glassWindow';
import { saveGlass, windowNumber, type CurrentWindow, type GlassSave } from './glassSave';

const BACK_GLASS: BackLink = { href: '#/vitrail', label: 'Vitraux' };
const RULE = 'Deux morceaux qui se touchent ne doivent jamais avoir la même couleur. Le chiffre de chaque couleur dit combien il en reste à poser.';

export interface GlassGameActions {
  nextWindow(): void;
}

export class GlassGame {
  private readonly layout: Layout;
  private readonly raster: Raster;
  private readonly difficulty: Difficulty;
  private readonly canvas = el('canvas', { class: 'glass-canvas' });
  private readonly status = el('p', { class: 'glass-status', role: 'status' });
  private readonly controls: HTMLElement;
  private readonly swatches: HTMLButtonElement[] = [];
  private selected = 0;
  private finished = false;

  constructor(
    root: HTMLElement,
    private readonly save: GlassSave,
    private readonly current: CurrentWindow,
    private readonly actions: GlassGameActions,
  ) {
    this.difficulty = difficultyFromLevel(GLASS_LEVELS, current.level);
    this.layout = generateLayout(current.seed, current.level, current.shape);
    this.raster = rasterize(this.layout.seeds, GAME_WIDTH, current.shape, true);
    for (const piece of this.layout.hints) this.current.colors[piece] = this.layout.solution[piece];

    const restart = el('button', { class: 'button button-secondary', type: 'button' }, 'Recommencer');
    restart.addEventListener('click', () => this.restart());
    this.controls = el('div', { class: 'glass-controls' }, this.buildPalette(), el('div', { class: 'button-row' }, restart));

    root.append(
      el(
        'div',
        { class: 'glass-game' },
        topBar(
          `Vitrail n°${windowNumber(current)} · ${current.challenge ? 'Défi du jour' : difficultyName(this.difficulty)}`,
          helpSlot(GLASS_HELP),
          BACK_GLASS,
        ),
        el('div', { class: 'glass-stage' }, this.canvas),
        this.status,
        this.controls,
      ),
    );

    this.canvas.addEventListener('click', this.onClick);
    window.addEventListener('resize', this.fit);
    this.fit();
    this.refresh();
    openHelpOnFirstVisit(GLASS_HELP);
  }

  dispose(): void {
    window.removeEventListener('resize', this.fit);
  }

  private buildPalette(): HTMLElement {
    const palette = el('div', { class: 'palette', role: 'group', 'aria-label': 'Couleurs' });
    this.layout.palette.forEach((color, index) => {
      const swatch = el('button', { class: 'swatch', type: 'button', 'aria-label': `Couleur ${index + 1}` });
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
    const height = Math.max(240, Math.min(window.innerHeight - 260, 720));
    const width = Math.min(window.innerWidth - 32, height / 1.5);
    this.canvas.style.width = `${Math.floor(width)}px`;
    this.canvas.style.height = `${Math.floor(width * 1.5)}px`;
  };

  // -----------------------------------------------
  // PLAYING
  // -----------------------------------------------

  private readonly onClick = (event: MouseEvent): void => {
    if (this.finished) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * this.raster.width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * this.raster.height);
    const piece = this.raster.region[y * this.raster.width + x] ?? -1;
    if (piece < 0) return;
    if (this.layout.hints.has(piece)) {
      this.status.textContent = 'Ce morceau est déjà posé : il te guide.';
      return;
    }
    const colors = this.current.colors;
    colors[piece] = colors[piece] === this.selected ? -1 : this.selected;
    saveGlass(this.save);
    this.refresh();
  };

  private select(index: number): void {
    this.selected = index;
    this.swatches.forEach((swatch, i) => {
      swatch.classList.toggle('is-active', i === index);
      swatch.setAttribute('aria-pressed', String(i === index));
    });
  }

  private restart(): void {
    if (this.finished || !confirm('Effacer les couleurs posées ?')) return;
    this.current.colors = this.current.colors.map((color, piece) => (this.layout.hints.has(piece) ? color : -1));
    saveGlass(this.save);
    this.refresh();
  }

  /** Repaints, updates the counts on the palette, and checks for a finished window. */
  private refresh(): void {
    const colors = this.current.colors;
    const conflicts = new Set<number>();
    colors.forEach((color, piece) => {
      if (color >= 0 && this.layout.neighbours[piece].some((other) => colors[other] === color)) conflicts.add(piece);
    });
    paintWindow(this.canvas, this.raster, colors, this.layout.palette, { hints: this.layout.hints, conflicts });

    const remaining = this.layout.quotas.map((quota, color) => quota - colors.filter((c) => c === color).length);
    this.swatches.forEach((swatch, color) => {
      swatch.textContent = String(remaining[color]);
      swatch.classList.toggle('is-complete', remaining[color] === 0);
      swatch.classList.toggle('is-over', remaining[color] < 0);
    });

    const uncolored = colors.filter((color) => color < 0).length;
    if (conflicts.size > 0) this.status.textContent = 'Deux morceaux voisins ont la même couleur (rayés).';
    else if (remaining.some((count) => count < 0)) this.status.textContent = 'Une couleur est posée trop de fois.';
    else if (uncolored === 0) this.win();
    else this.status.textContent = RULE;
  }

  private win(): void {
    this.finished = true;
    this.save.windowsDone = Math.max(this.save.windowsDone, windowNumber(this.current));
    this.save.chapel.push({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      number: windowNumber(this.current),
      level: this.current.level,
      shape: this.current.shape,
      seeds: this.layout.seeds.map(([u, v]) => [round(u), round(v)]),
      palette: this.layout.palette,
      colors: [...this.current.colors],
      madeAt: new Date().toISOString(),
    });
    this.save.current = null;
    saveGlass(this.save);
    const reward = levelReward(null, this.difficulty, this.current.challenge);

    this.canvas.classList.add('is-lit');
    const next = el('button', { class: 'button', type: 'button' }, 'Vitrail suivant');
    next.addEventListener('click', () => this.actions.nextWindow());
    this.status.textContent = '';
    this.controls.replaceChildren(
      el('p', { class: 'glass-result' }, el('strong', { text: 'Magnifique !' }), ' La lumière traverse ton vitrail.'),
      reward,
      el('div', { class: 'button-row' }, next, el('a', { class: 'button button-secondary', href: '#/vitrail' }, 'Ma chapelle')),
    );
  }
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}
