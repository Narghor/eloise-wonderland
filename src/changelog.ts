import { el } from './dom';
import { openReading } from './help';
import { readGame, writeGame } from './save';

// -----------------------------------------------
// WHAT'S NEW: the updates told to the players
// -----------------------------------------------
// Add the new update at the top of UPDATES when publishing: its id changing lights the button up.

const SEEN_ID = 'changelogSeen';

interface Update {
  /** Unique, never reused: the last one read is remembered by it. */
  id: string;
  date: string;
  news: string[];
}

const UPDATES: Update[] = [
  {
    id: '2026-11-07',
    date: '7 novembre',
    news: [
      '🍂 Les feuilles : les niveaux continuent après le 10, sans fin, avec de plus en plus de feuilles.',
      '🍂 Les feuilles : elles ne disparaissent plus après une longue partie.',
      '🦢 Origami : 12 nouveaux modèles, du Lapin à l’Avion.',
      '🎨 Coloriage : écarte deux doigts pour zoomer sur les petits détails.',
      '🎂 Pâtisserie : chaque gâteau se trouve avec les indices, sans jamais deviner.',
      '🎰 Casino : une pièce donne maintenant 100 jetons.',
      '📖 Eloise’s Book : plus le symbole spécial est rare, plus les tours gratuits rapportent.',
    ],
  },
  {
    id: '2026-11-06',
    date: '6 novembre',
    news: [
      '🏡 La maison : nouveaux meubles et nouvelles décorations, tout redessinés.',
      '🃏 Blackjack : les conseils de pro restent visibles pendant la partie.',
      '🎰 Casino : chaque machine se souvient de ta dernière mise.',
    ],
  },
  {
    id: '2026-11-05',
    date: '5 novembre',
    news: ['🐱 Nouveau jeu : Elomew, les chats et leurs coussins.', '🎨 Nouveaux jeux : le Coloriage et le carnet de pixel art.'],
  },
  {
    id: '2026-11-04',
    date: '4 novembre',
    news: ['🍂 Les feuilles : un deuxième herbier, des trésors plus rares et des animaux à croiser.'],
  },
];

/** The home button; it shines while the latest update has not been read. */
export function changelogButton(): HTMLElement {
  const button = el('button', { class: 'changelog-button', type: 'button' }, '✨ Nouveautés');
  button.classList.toggle('is-new', readGame(SEEN_ID) !== UPDATES[0].id);
  button.addEventListener('click', () => {
    writeGame(SEEN_ID, UPDATES[0].id);
    button.classList.remove('is-new');
    openReading(
      'Les nouveautés',
      UPDATES.map((update) => el('section', { class: 'changelog-update' }, el('h3', { text: update.date }), el('ul', {}, ...update.news.map((line) => el('li', { text: line }))))),
      'Merci !',
    );
  });
  return button;
}
