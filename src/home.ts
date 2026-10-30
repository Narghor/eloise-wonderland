import { el } from './dom';
import { exportSave, importSave } from './save';
import { isColored } from './creatures/creature';
import { creatureCanvas } from './creatures/creatureCanvas';
import { loadGarden } from './creatures/garden';
import { companionPortrait } from './companion/companionArt';
import { loadCompanion } from './companion/companionSave';

export function renderHome(root: HTMLElement): () => void {
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
      el(
        'a',
        { class: 'game-card', href: '#/picross' },
        picrossIcon(),
        el(
          'span',
          { class: 'game-card-text' },
          el('strong', { text: 'Picross' }),
          el('span', { text: 'Retrouver la petite bête cachée grâce aux chiffres' }),
        ),
      ),
      gardenCard(),
      el(
        'a',
        { class: 'game-card', href: '#/sable' },
        el('span', { class: 'game-card-icon is-sand', 'aria-hidden': 'true' }),
        el(
          'span',
          { class: 'game-card-text' },
          el('strong', { text: 'Bouteilles de sable' }),
          el('span', { text: 'Verser le sable en couches pour reproduire le modèle' }),
        ),
      ),
      el(
        'a',
        { class: 'game-card', href: '#/vitrail' },
        el('span', { class: 'game-card-icon is-glass', 'aria-hidden': 'true' }),
        el(
          'span',
          { class: 'game-card-text' },
          el('strong', { text: 'Vitraux' }),
          el('span', { text: 'Colorier le verre sans que deux voisins se ressemblent' }),
        ),
      ),
      el(
        'a',
        { class: 'game-card', href: '#/bulles' },
        el('span', { class: 'game-card-icon is-bubbles', 'aria-hidden': 'true' }),
        el(
          'span',
          { class: 'game-card-text' },
          el('strong', { text: 'Bulles mélangées' }),
          el('span', { text: 'Mélanger les couleurs pour faire éclater les bulles' }),
        ),
      ),
      el(
        'a',
        { class: 'game-card', href: '#/glacage' },
        el('span', { class: 'game-card-icon is-icing', 'aria-hidden': 'true' }),
        el(
          'span',
          { class: 'game-card-text' },
          el('strong', { text: 'Glaçage' }),
          el('span', { text: 'Décorer des biscuits en suivant les pointillés' }),
        ),
      ),
      el(
        'a',
        { class: 'game-card', href: '#/fioles' },
        el('span', { class: 'game-card-icon is-potions', 'aria-hidden': 'true' }),
        el(
          'span',
          { class: 'game-card-text' },
          el('strong', { text: 'Fioles' }),
          el('span', { text: 'Trier les couleurs, une seule par fiole' }),
        ),
      ),
      savePanel(),
    ),
  );
  return () => {};
}

function picrossIcon(): HTMLElement {
  return pixelIcon(['01010', '11111', '11111', '01110', '00100']);
}

function pixelIcon(rows: string[], extraClass = ''): HTMLElement {
  const icon = el('span', { class: `game-card-icon ${extraClass}`, 'aria-hidden': 'true' });
  for (const row of rows) {
    for (const cell of row) icon.append(el('span', { class: cell === '1' ? 'is-on' : '' }));
  }
  return icon;
}

function gardenCard(): HTMLElement {
  const creatures = loadGarden();
  const pending = creatures.filter((creature) => !isColored(creature)).length;
  const lastColored = creatures.filter(isColored).at(-1);

  const icon = lastColored
    ? el('span', { class: 'game-card-icon is-creature', 'aria-hidden': 'true' }, creatureCanvas(lastColored, 53))
    : pixelIcon(['00100', '01110', '10101', '01110', '01010'], 'is-garden');

  let summary = 'Tes petites bêtes apparaîtront ici';
  if (creatures.length > 0) {
    summary = creatures.length === 1 ? '1 petite bête' : `${creatures.length} petites bêtes`;
    if (pending > 0) summary += ` · ${pending} à colorier`;
  }

  return el(
    'a',
    { class: 'game-card', href: '#/jardin' },
    icon,
    el('span', { class: 'game-card-text' }, el('strong', { text: 'Le Jardin' }), el('span', { text: summary })),
  );
}

function companionCard(): HTMLElement {
  const companion = loadCompanion();
  return el(
    'a',
    { class: 'home-companion', href: '#/compagnon' },
    companionPortrait(companion.look, 80),
    el(
      'span',
      { class: 'home-companion-text' },
      el('strong', { text: companion.name }),
      el('span', { class: 'coin-pill', text: `${companion.coins} 🪙` }),
      el('span', { text: 'Gagne des pièces en jouant pour l’habiller' }),
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
