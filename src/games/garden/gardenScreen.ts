import './garden.css';
import { el, topBar } from '../../dom';
import { isColored, type Creature } from '../../creatures/creature';
import { creatureCanvas } from '../../creatures/creatureCanvas';
import { loadGarden } from '../../creatures/garden';

export function renderGarden(root: HTMLElement): () => void {
  const creatures = loadGarden();
  // Creatures waiting for colours first, then the newest.
  const ordered = [...creatures].sort(
    (a, b) => Number(isColored(a)) - Number(isColored(b)) || b.bornAt.localeCompare(a.bornAt),
  );
  const rares = creatures.filter((creature) => creature.rarity).length;
  const count = el('span', {
    class: 'garden-count',
    text: rares > 0 ? `${creatureCount(creatures.length)} · ${rares} ✨` : creatureCount(creatures.length),
  });
  const page = el('div', { class: 'garden' }, topBar('Le Jardin', count));
  root.append(page);

  if (ordered.length === 0) {
    page.append(
      el(
        'div',
        { class: 'garden-empty' },
        el('p', { text: 'Ton jardin est encore vide.' }),
        el('p', { text: 'Termine une grille de Picross pour faire apparaître ta première petite bête !' }),
        el('a', { class: 'button', href: '#/picross' }, 'Jouer au Picross'),
      ),
    );
    return () => {};
  }

  const dialog = creatureDialog();
  const grid = el('main', { class: 'garden-grid' });
  for (const creature of ordered) {
    const colored = isColored(creature);
    const tile = el(
      'button',
      { class: colored ? 'garden-tile' : 'garden-tile is-pending', type: 'button' },
      creatureCanvas(creature, 84),
      el('span', { class: 'garden-tile-name', text: creature.name }),
    );
    if (creature.rarity) {
      tile.classList.add(`is-${creature.rarity}`);
      tile.append(el('span', { class: 'garden-tile-rare', text: '✨ Rare' }));
    }
    if (!colored) tile.append(el('span', { class: 'garden-tile-tag', text: 'À colorier' }));
    else if (creature.stars !== undefined) tile.append(el('span', { class: 'garden-tile-stars', text: starsText(creature.stars) }));
    tile.addEventListener('click', () => {
      if (colored) dialog.show(creature);
      else location.hash = `#/colorier/${creature.id}`;
    });
    grid.append(tile);
  }
  page.append(grid, dialog.element);
  return () => dialog.element.close();
}

function starsText(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

function creatureCount(count: number): string {
  return count <= 1 ? `${count} bête` : `${count} bêtes`;
}

function creatureDialog(): { element: HTMLDialogElement; show(creature: Creature): void } {
  const portrait = el('div', { class: 'creature-portrait' });
  const name = el('h2');
  const born = el('p', { class: 'creature-born' });
  const close = el('button', { class: 'button button-secondary', type: 'button' }, 'Fermer');
  const element = el('dialog', { class: 'detail-dialog' }, portrait, name, born, close);
  close.addEventListener('click', () => element.close());
  // A click on the backdrop lands on the dialog element itself.
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  return {
    element,
    show(creature: Creature) {
      portrait.replaceChildren(creatureCanvas(creature, 200));
      name.textContent = creature.name;
      const date = `Apparue le ${new Date(creature.bornAt).toLocaleDateString('fr-FR')}`;
      born.textContent = creature.stars === undefined ? date : `${starsText(creature.stars)} · ${date}`;
      element.showModal();
    },
  };
}
