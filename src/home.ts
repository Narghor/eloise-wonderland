import { el } from './dom';
import { exportSave, importSave, readGame } from './save';
import { isColored } from './creatures/creature';
import { creatureCanvas } from './creatures/creatureCanvas';
import { loadGarden } from './creatures/garden';
import { companionPortrait } from './companion/companionArt';
import { loadCompanion } from './companion/companionSave';
import { loadCasino, formatChips } from './games/casino/chips';
import { loadHouse } from './house/houseSave';
import { FISH } from './games/fishing/fishingData';
import { loadFishing } from './games/fishing/fishingSave';
import { ZONES } from './games/leaves/leavesData';
import { loadLeaves } from './games/leaves/leavesSave';
import { loadAquarium } from './games/aquarium/aquariumSave';
import { loadOrigami } from './games/origami/origamiSave';
import { grantDailyGift } from './games/casino/casinoScreen';
import { challengeGameOn, loadDaily, streak, todayKey, type ChallengeGame } from './daily/daily';

// -----------------------------------------------
// THE GAMES, BY FAMILY
// -----------------------------------------------

interface GameEntry {
  id: ChallengeGame;
  href: string;
  name: string;
  iconClass: string;
  /** Block of the site save; read raw here so the home page stays light. */
  saveId: string;
  /** Field counting finished levels, and the word for one. */
  doneField: string;
  unit: [string, string];
}

const GAMES: Record<ChallengeGame, GameEntry> = {
  picross: { id: 'picross', href: '#/picross', name: 'Picross', iconClass: '', saveId: 'picross', doneField: 'solvedBySize', unit: ['grille', 'grilles'] },
  potions: { id: 'potions', href: '#/fioles', name: 'Fioles', iconClass: 'is-potions', saveId: 'potions', doneField: 'done', unit: ['niveau', 'niveaux'] },
  mahjong: { id: 'mahjong', href: '#/mahjong', name: 'Mahjong', iconClass: 'is-mahjong', saveId: 'mahjong', doneField: 'gamesWon', unit: ['partie', 'parties'] },
  box: { id: 'box', href: '#/rangement', name: 'Boîte à trésors', iconClass: 'is-box', saveId: 'box', doneField: 'boxesDone', unit: ['boîte', 'boîtes'] },
  pastry: { id: 'pastry', href: '#/patisserie', name: 'Pâtisserie', iconClass: 'is-pastry', saveId: 'pastry', doneField: 'cakesDone', unit: ['gâteau', 'gâteaux'] },
  glass: { id: 'glass', href: '#/vitrail', name: 'Vitraux', iconClass: 'is-glass', saveId: 'stainedGlass', doneField: 'windowsDone', unit: ['vitrail', 'vitraux'] },
  bouquet: { id: 'bouquet', href: '#/bouquet', name: 'Bouquets', iconClass: 'is-bouquet', saveId: 'bouquet', doneField: 'ordersDone', unit: ['bouquet', 'bouquets'] },
  vegetables: { id: 'vegetables', href: '#/potager', name: 'Potager', iconClass: 'is-vegetables', saveId: 'vegetables', doneField: 'seasonsDone', unit: ['saison', 'saisons'] },
  sand: { id: 'sand', href: '#/sable', name: 'Bouteilles de sable', iconClass: 'is-sand', saveId: 'sand', doneField: 'modelsDone', unit: ['bouteille', 'bouteilles'] },
  bracelets: { id: 'bracelets', href: '#/bracelets', name: 'Bracelets', iconClass: 'is-bracelets', saveId: 'bracelets', doneField: 'braceletsDone', unit: ['bracelet', 'bracelets'] },
  embroidery: { id: 'embroidery', href: '#/broderie', name: 'Broderie', iconClass: 'is-embroidery', saveId: 'embroidery', doneField: 'piecesDone', unit: ['ouvrage', 'ouvrages'] },
  mosaic: { id: 'mosaic', href: '#/mosaique', name: 'Mosaïque', iconClass: 'is-mosaic', saveId: 'mosaic', doneField: 'mosaicsDone', unit: ['mosaïque', 'mosaïques'] },
  beads: { id: 'beads', href: '#/perles', name: 'Perles à repasser', iconClass: 'is-beads', saveId: 'beads', doneField: 'piecesDone', unit: ['motif', 'motifs'] },
  bubbles: { id: 'bubbles', href: '#/bulles', name: 'Bulles mélangées', iconClass: 'is-bubbles', saveId: 'bubbles', doneField: 'cleared', unit: ['niveau', 'niveaux'] },
  icing: { id: 'icing', href: '#/glacage', name: 'Glaçage', iconClass: 'is-icing', saveId: 'icing', doneField: 'cookiesDone', unit: ['biscuit', 'biscuits'] },
  tea: { id: 'tea', href: '#/salon', name: 'Salon de thé', iconClass: 'is-tea', saveId: 'tea', doneField: 'servicesDone', unit: ['service', 'services'] },
};

const SECTIONS: { title: string; games: ChallengeGame[] }[] = [
  { title: 'Réflexion', games: ['picross', 'potions', 'mahjong', 'box', 'pastry', 'glass', 'bouquet', 'vegetables'] },
  { title: 'Création', games: ['sand', 'bracelets', 'embroidery', 'mosaic', 'beads'] },
  { title: 'Adresse et rapidité', games: ['bubbles', 'icing'] },
];

function readBlock(entry: GameEntry): Record<string, unknown> {
  const raw = readGame(entry.saveId);
  return typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
}

function doneCount(entry: GameEntry): number {
  const value = readBlock(entry)[entry.doneField];
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).reduce<number>((sum, count) => sum + (typeof count === 'number' ? count : 0), 0);
  }
  return 0;
}

/** The level left unfinished, or null; challenge levels are resumed from the daily card. */
function levelInProgress(entry: GameEntry): { number: number | null } | null {
  const current = readBlock(entry).current;
  if (typeof current !== 'object' || current === null) return null;
  const fields = current as Record<string, unknown>;
  if (typeof fields.challenge === 'string') return null;
  const number = typeof fields.number === 'number' ? fields.number : typeof fields.level === 'number' ? fields.level : null;
  return { number };
}

// -----------------------------------------------
// PAGE
// -----------------------------------------------

export function renderHome(root: HTMLElement): () => void {
  grantDailyGift();
  const sections = SECTIONS.map(({ title, games }) =>
    homeSection(title, games.map((id) => gameTile(GAMES[id])), title === 'Création' ? [gardenTile(), origamiTile()] : []),
  );
  root.append(
    el(
      'header',
      { class: 'home-header' },
      el('h1', {}, el('span', { class: 'home-title-owner', text: "Eloise's" }), 'Wonderland Games'),
    ),
    el(
      'main',
      { class: 'home' },
      companionCard(),
      houseBlock(),
      casinoCard(),
      dailyCard(),
      ...resumeRow(),
      ...sections,
      savePanel(),
    ),
  );
  return () => {};
}

function homeSection(title: string, tiles: HTMLElement[], leading: HTMLElement[]): HTMLElement {
  return el(
    'section',
    { class: 'home-section' },
    el('h2', { class: 'home-section-title', text: title }),
    el('div', { class: 'home-grid' }, ...leading, ...tiles),
  );
}

function gameIcon(entry: GameEntry): HTMLElement {
  if (entry.id === 'picross') return pixelIcon(['01010', '11111', '11111', '01110', '00100']);
  return el('span', { class: `game-card-icon ${entry.iconClass}`, 'aria-hidden': 'true' });
}

function pixelIcon(rows: string[], extraClass = ''): HTMLElement {
  const icon = el('span', { class: `game-card-icon ${extraClass}`, 'aria-hidden': 'true' });
  for (const row of rows) {
    for (const cell of row) icon.append(el('span', { class: cell === '1' ? 'is-on' : '' }));
  }
  return icon;
}

function tile(href: string, icon: HTMLElement, name: string, progress: string, extraClass = ''): HTMLElement {
  return el(
    'a',
    { class: `game-tile ${extraClass}`, href },
    icon,
    el('strong', { class: 'game-tile-name', text: name }),
    el('span', { class: 'game-tile-progress', text: progress }),
  );
}

function gameTile(entry: GameEntry): HTMLElement {
  const done = doneCount(entry);
  const progress = done === 0 ? 'À découvrir' : `${done} ${done === 1 ? entry.unit[0] : entry.unit[1]}`;
  return tile(entry.href, gameIcon(entry), entry.name, progress);
}

function gardenTile(): HTMLElement {
  const creatures = loadGarden();
  const pending = creatures.filter((creature) => !isColored(creature)).length;
  const lastColored = creatures.filter(isColored).at(-1);
  const icon = lastColored
    ? el('span', { class: 'game-card-icon is-creature', 'aria-hidden': 'true' }, creatureCanvas(lastColored, 53))
    : pixelIcon(['00100', '01110', '10101', '01110', '01010'], 'is-garden');
  let progress = 'Coloriage';
  if (pending > 0) progress = `${pending} à colorier`;
  else if (creatures.length > 0) progress = creatures.length === 1 ? '1 petite bête' : `${creatures.length} petites bêtes`;
  return tile('#/jardin', icon, 'Le Jardin', progress);
}

function origamiTile(): HTMLElement {
  const folded = Object.values(loadOrigami().folded).reduce((sum, n) => sum + n, 0);
  const icon = pixelIcon(['10001', '11011', '11111', '01110', '00100'], 'is-origami');
  return tile('#/origami', icon, 'Origami', folded === 0 ? 'À découvrir' : folded === 1 ? '1 pliage' : `${folded} pliages`);
}

function resumeRow(): HTMLElement[] {
  const chips: HTMLElement[] = [];
  for (const { games } of SECTIONS) {
    for (const id of games) {
      const entry = GAMES[id];
      const level = levelInProgress(entry);
      if (!level) continue;
      chips.push(
        el(
          'a',
          { class: 'resume-chip', href: entry.href },
          gameIcon(entry),
          el(
            'span',
            { class: 'resume-chip-text' },
            el('strong', { text: entry.name }),
            el('span', { text: level.number !== null ? `n° ${level.number} en cours` : 'En cours' }),
          ),
        ),
      );
    }
  }
  if (chips.length === 0) return [];
  return [
    el(
      'section',
      { class: 'home-section' },
      el('h2', { class: 'home-section-title', text: 'Reprendre' }),
      el('div', { class: 'resume-row' }, ...chips),
    ),
  ];
}

function casinoCard(): HTMLElement {
  return el(
    'a',
    { class: 'game-card casino-card', href: '#/casino' },
    el('span', { class: 'game-card-icon is-casino', 'aria-hidden': 'true', text: '🎰' }),
    el(
      'span',
      { class: 'game-card-text' },
      el('strong', { text: 'Casino' }),
      el('span', { class: 'chip-pill', text: `${formatChips(loadCasino().chips)} jetons` }),
    ),
  );
}

function companionCard(): HTMLElement {
  const companion = loadCompanion();
  return el(
    'a',
    { class: 'home-companion', href: '#/compagnon' },
    companionPortrait(companion.look, 56),
    el(
      'span',
      { class: 'home-companion-text' },
      el('strong', { text: companion.name }),
      el('span', { text: 'L’habiller avec tes pièces' }),
    ),
    el('span', { class: 'coin-pill', text: `${companion.coins} 🪙` }),
  );
}

function houseCard(): HTMLElement {
  const house = loadHouse();
  const visiting = Date.now() < house.visitUntil ? house.visitors.length : 0;
  const hint = house.visitUntil === 0 ? 'Des visiteurs t’attendent !' : visiting > 0 ? `${visiting} visiteur${visiting > 1 ? 's' : ''} à la maison` : 'De nouveaux visiteurs sont arrivés !';
  return el(
    'a',
    { class: 'home-companion home-house', href: '#/maison' },
    el('span', { class: 'home-house-icon', 'aria-hidden': 'true', text: '🏠' }),
    el('span', { class: 'home-companion-text' }, el('strong', { text: 'Ma maison' }), el('span', { text: hint })),
  );
}

/** The house, with the games around it attached underneath: the tea room and the pond. */
function houseBlock(): HTMLElement {
  const caught = Object.keys(loadFishing().caught).length;
  const cleanedZones = Object.values(loadLeaves().zones).filter((z) => z.cleared > 0).length;
  const residents = Object.values(loadAquarium().tanks).reduce((n, t) => n + t.fish.length, 0);
  const tea = GAMES.tea;
  const services = doneCount(tea);
  const annex = (href: string, icon: string, name: string, progress: string) =>
    el('a', { class: 'home-annex', href }, el('span', { class: 'home-annex-icon', 'aria-hidden': 'true', text: icon }), el('span', { class: 'home-companion-text' }, el('strong', { text: name }), el('span', { text: progress })));
  return el(
    'section',
    { class: 'home-house-block' },
    houseCard(),
    el(
      'div',
      { class: 'home-annexes' },
      annex(tea.href, '☕', tea.name, services === 0 ? 'À découvrir' : `${services} ${services === 1 ? tea.unit[0] : tea.unit[1]}`),
      annex('#/peche', '🎣', 'La pêche', caught === 0 ? 'L’étang du jardin' : `${caught}/${FISH.length} poissons`),
      annex('#/feuilles', '🍂', 'Les feuilles', cleanedZones === 0 ? 'Le parc à nettoyer' : `${cleanedZones}/${ZONES.length} lieux propres`),
      annex('#/aquarium', '🐠', 'L’aquarium', residents === 0 ? (caught === 0 ? 'Pêche d’abord un poisson' : 'Tes poissons t’attendent') : `${residents} espèce${residents > 1 ? 's' : ''} à l’abri`),
    ),
  );
}

function dailyCard(): HTMLElement {
  const save = loadDaily();
  const today = todayKey();
  const stars = save.days[today];
  const run = streak(save, today);
  const game = GAMES[challengeGameOn(today)];
  const done = stars !== undefined;
  return el(
    'a',
    { class: `daily-hero${done ? ' is-done' : ''}`, href: '#/defi' },
    el(
      'span',
      { class: 'daily-hero-text' },
      el('span', { class: 'daily-hero-label', text: done ? 'Défi du jour réussi !' : 'Défi du jour' }),
      el('strong', { text: game.name }),
      el('span', { class: 'daily-hero-hint', text: done ? `${'★'.repeat(stars)} · reviens demain` : 'Une partie pour gagner des pièces' }),
    ),
    el(
      'span',
      { class: 'daily-hero-side' },
      gameIcon(game),
      el('span', { class: 'streak-pill', text: run > 0 ? `🔥 ${run} jour${run > 1 ? 's' : ''}` : '🔥 0' }),
    ),
  );
}

function savePanel(): HTMLElement {
  const status = el('p', { class: 'save-status', role: 'status' });

  const fileInput = el('input', { type: 'file', accept: 'application/json,.json', hidden: '' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    if (!confirm('Remplacer la progression actuelle par celle de ce fichier ?')) return;
    try {
      await importSave(file);
      status.textContent = 'Sauvegarde importée.';
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : String(error);
    }
  });

  const exportButton = el('button', { class: 'button', type: 'button' }, 'Exporter ma sauvegarde');
  exportButton.addEventListener('click', () => {
    exportSave();
    status.textContent = 'Fichier téléchargé.';
  });

  const importButton = el('button', { class: 'button button-secondary', type: 'button' }, 'Importer une sauvegarde');
  importButton.addEventListener('click', () => fileInput.click());

  return el(
    'section',
    { class: 'save-panel' },
    el('h2', { text: 'Sauvegarde' }),
    el('p', {
      text: 'Ta progression reste sur cet appareil. Exporte-la en fichier pour la garder de côté ou la reprendre ailleurs.',
    }),
    el('div', { class: 'button-row' }, exportButton, importButton),
    status,
    fileInput,
  );
}
