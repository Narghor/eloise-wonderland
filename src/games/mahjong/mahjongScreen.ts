import './mahjong.css';
import { el, topBar } from '../../dom';
import { difficultyName, difficultyPicker, type Difficulty } from '../../difficulty';
import { CHALLENGE_DIFFICULTY } from '../../daily/daily';
import { navigate } from '../../navigation';
import { newSeed } from '../../random';
import { MahjongGame, formatTime } from './mahjongGame';
import { LAYOUTS, SURPRISE_ID, layoutById, surpriseLayout, type Layout } from './mahjongLayouts';
import { MAHJONG_TIERS, deal, geometryOf, seedFromDay } from './mahjongLogic';
import { loadMahjong, saveMahjong, statsKey, type DimSetting, type MahjongCurrent, type MahjongSave } from './mahjongSave';

const PLAY_ROUTE = '#/mahjong/jouer';

const DIM_LABELS: Record<DimSetting, string> = {
  auto: 'Griser les tuiles bloquées : selon la difficulté',
  on: 'Griser les tuiles bloquées : toujours',
  off: 'Griser les tuiles bloquées : jamais',
};
const NEXT_DIM: Record<DimSetting, DimSetting> = { auto: 'on', on: 'off', off: 'auto' };

/** `#/mahjong` shows the menu, `#/mahjong/jouer` the saved game in progress. */
export function renderMahjong(root: HTMLElement, params: string[]): () => void {
  const save = loadMahjong();
  const current = save.current;
  const layout = current && layoutById(current.layoutId, current.tier, current.seed);
  if (params[0] === 'jouer' && current && layout && current.faces.length === layout.spots.length) {
    const game = new MahjongGame(root, save, layout, current, {
      newGame: () => startRandom(current.tier),
      restart: () => startGame(layout, current.tier, current.seed, current.challenge),
    });
    return () => game.dispose();
  }
  if (params[0] === 'jouer') history.replaceState(null, '', '#/mahjong');
  renderMenu(root, save);
  return () => {};
}

function pickLayout(tier: Difficulty, seed: number): Layout {
  const pool = LAYOUTS.filter((layout) => layout.tier === tier);
  const index = seed % (pool.length + 1);
  return index === pool.length ? surpriseLayout(tier, seed) : pool[index];
}

function startRandom(tier: Difficulty): void {
  const seed = newSeed();
  startGame(pickLayout(tier, seed), tier, seed);
}

/** Deals a new board, saves it as the game in progress and opens it. */
function startGame(layout: Layout, tier: Difficulty, seed = newSeed(), challenge?: string): void {
  const save = loadMahjong();
  const { faces } = deal(geometryOf(layout.spots), MAHJONG_TIERS[tier], seed);
  const current: MahjongCurrent = { layoutId: layout.id, tier, seed, faces, removed: [], hints: 0, shuffles: 0, elapsed: 0, challenge };
  save.current = current;
  saveMahjong(save);
  // Already on the play route (restart, new game): re-render through the router.
  if (location.hash === PLAY_ROUTE) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else navigate(PLAY_ROUTE);
}

export function startMahjongChallenge(day: string): void {
  const save = loadMahjong();
  if (save.current?.challenge === day) {
    navigate(PLAY_ROUTE);
    return;
  }
  save.challenge = day;
  saveMahjong(save);
  const seed = seedFromDay(day);
  startGame(pickLayout(CHALLENGE_DIFFICULTY, seed), CHALLENGE_DIFFICULTY, seed, day);
}

/** A game in progress is lost when another starts: ask first. */
function confirmAbandon(save: MahjongSave): boolean {
  return !save.current || confirm('Abandonner la partie en cours ?');
}

function renderMenu(root: HTMLElement, save: MahjongSave): void {
  const menu = el('main', { class: 'mj-menu' });
  const current = save.current;
  if (current) {
    const layout = layoutById(current.layoutId, current.tier, current.seed);
    const left = (layout?.spots.length ?? 0) - current.removed.length * 2;
    menu.append(
      menuCard('Reprendre la partie', `${layout?.name ?? ''} · ${difficultyName(current.tier)} · ${left} tuiles, ${formatTime(current.elapsed)}`, () =>
        navigate(PLAY_ROUTE),
      ),
    );
  }
  if (save.challenge && save.current?.challenge !== save.challenge) {
    const day = save.challenge;
    menu.append(menuCard('Défi du jour', 'Une disposition du jour, difficulté Moyen', () => confirmAbandon(save) && startMahjongChallenge(day)));
  }
  const tier = save.difficulty;
  const dimButton = el('button', { class: 'button button-secondary mj-dim', type: 'button' }, DIM_LABELS[save.dim]);
  dimButton.addEventListener('click', () => {
    save.dim = NEXT_DIM[save.dim];
    saveMahjong(save);
    dimButton.textContent = DIM_LABELS[save.dim];
  });
  menu.append(
    difficultyPicker(tier, (difficulty) => {
      save.difficulty = difficulty;
      saveMahjong(save);
      root.replaceChildren();
      renderMenu(root, save);
    }),
    menuCard('Partie au hasard', `${difficultyName(tier)} · une disposition tirée au sort`, () => confirmAbandon(save) && startRandom(tier)),
    gallery(save, tier),
    dimButton,
    el('p', { class: 'mj-menu-note', text: `Plateaux vidés : ${save.gamesWon}` }),
  );
  root.append(el('div', { class: 'mj' }, topBar('Mahjong'), menu));
}

function gallery(save: MahjongSave, tier: Difficulty): HTMLElement {
  const grid = el('div', { class: 'mj-gallery' });
  const layouts = [...LAYOUTS.filter((layout) => layout.tier === tier), surpriseLayout(tier, 1)];
  for (const layout of layouts) {
    const stats = save.stats[statsKey(layout.id, tier)];
    const count = layout.id === SURPRISE_ID ? 'nouvelle forme à chaque fois' : `${layout.spots.length} tuiles`;
    const card = el(
      'button',
      { class: `mj-layout${stats ? ' is-done' : ''}`, type: 'button' },
      layoutPreview(layout),
      el('strong', { text: `${stats ? '✓ ' : ''}${layout.name}` }),
      el('span', { class: 'mj-layout-hint', text: count }),
      el('span', { class: 'mj-layout-hint', text: stats ? `${stats.wins} victoire${stats.wins > 1 ? 's' : ''} · record ${formatTime(stats.best)}` : 'pas encore réussi' }),
    );
    card.addEventListener('click', () => {
      if (!confirmAbandon(save)) return;
      const seed = newSeed();
      startGame(layout.id === SURPRISE_ID ? surpriseLayout(tier, seed) : layout, tier, seed);
    });
    grid.append(card);
  }
  const done = layouts.filter((layout) => save.stats[statsKey(layout.id, tier)]).length;
  return el('section', { class: 'mj-gallery-section' }, el('h2', { text: `Dispositions (${done} / ${layouts.length} réussies)` }), grid);
}

/** A small top view, higher layers lighter. */
function layoutPreview(layout: Layout): HTMLCanvasElement {
  const canvas = el('canvas', { class: 'mj-preview', width: '240', height: '152', 'aria-hidden': 'true' });
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  context.scale(2, 2);
  const spots = [...layout.spots].sort((a, b) => a.z - b.z);
  const columns = (Math.max(...spots.map((s) => s.x)) + 2) / 2;
  const rows = (Math.max(...spots.map((s) => s.y)) + 2) / 2;
  const unit = Math.min(112 / columns, 68 / (rows * 1.3));
  const offsetX = (120 - columns * unit) / 2;
  const offsetY = (76 - rows * unit * 1.3) / 2;
  const colors = ['#f7c6d9', '#f3a6c3', '#e981a9', '#d9608c', '#b8466f', '#93345a', '#702443'];
  for (const spot of spots) {
    const x = offsetX + (spot.x / 2) * unit - spot.z * 1.2;
    const y = offsetY + (spot.y / 2) * unit * 1.3 - spot.z * 1.2;
    context.fillStyle = colors[Math.min(spot.z, colors.length - 1)];
    context.strokeStyle = '#fff';
    context.lineWidth = 1;
    context.fillRect(x, y, unit, unit * 1.3);
    context.strokeRect(x + 0.5, y + 0.5, unit - 1, unit * 1.3 - 1);
  }
  return canvas;
}

function menuCard(title: string, hint: string, onClick: () => void): HTMLButtonElement {
  const card = el(
    'button',
    { class: 'menu-card', type: 'button' },
    el('span', { class: 'mj-icon', 'aria-hidden': 'true', text: '🀄' }),
    el('span', { class: 'menu-card-text' }, el('strong', { text: title }), el('span', { class: 'menu-card-hint', text: hint })),
  );
  card.addEventListener('click', onClick);
  return card;
}
