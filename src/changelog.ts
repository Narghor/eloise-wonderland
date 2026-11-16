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
    id: '2026-11-16-promeneurs-jeux',
    date: '16 novembre',
    news: ['🦆 Les promeneurs s’amusent encore plus : ils nourrissent les canards, pêchent dans la mare, font un vœu à la fontaine, tirent l’eau du puits, montrent les oiseaux du nichoir et se balancent. Un grand vient même pousser Jules sur la balançoire !'],
  },
  {
    id: '2026-11-16-promeneurs-decos',
    date: '16 novembre',
    news: ['☕ Les promeneurs s’installent à la ferme : ils s’assoient sur les bancs, prennent le thé et respirent les fleurs. Et les villageois ont enfin un nez !'],
  },
  {
    id: '2026-11-16-promeneurs',
    date: '16 novembre',
    news: [
      '🚶 La ferme : des villageois viennent maintenant se promener chez toi, de préférence sur les chemins, et s’arrêtent pour admirer tes décos. Plus ta ferme a de charme, plus ils sont nombreux. Touche-les : ils te laissent un petit pourboire. Si tu préfères être tranquille, tu peux les désactiver dans le menu ⋯.',
    ],
  },
  {
    id: '2026-11-16-ferme',
    date: '16 novembre',
    news: ['🌻 Refonte et lot de contenu pour la ferme'],
  },
  {
    id: '2026-11-15-ferme',
    date: '15 novembre',
    news: [
      '🌻 Nouveau jeu : la Ferme ! Sème, récolte, élève tes animaux, fais tourner tes machines et prépare les commandes des villageois, qui viennent les chercher en personne. Agrandis ta ferme, décore-la comme tu veux, et guette le facteur Gaston : il dépose des colis surprises.',
      '🏡 La maison : les 18 décos murales sont redessinées, plus grandes et plus détaillées.',
    ],
  },
  {
    id: '2026-11-15',
    date: '15 novembre',
    news: [
      '🍳 La maison : le livre de recettes est refait. Trois onglets (Prêtes, À compléter, Plus tard), et chaque recette dit ce qui manque et où le trouver.',
      '🍳 La maison : 24 nouvelles recettes, 59 en tout.',
    ],
  },
  {
    id: '2026-11-12',
    date: '12 novembre',
    news: [
      '🐱 Elomew : les salons Expert demandent beaucoup plus de réflexion.',
      '🐍 Le Regard de Medusa : chaque colonne de Medusa s’ajoute maintenant au gain des lignes. Les tours gratuits arrivent un peu moins souvent, mais rapportent bien plus.',
    ],
  },
  {
    id: '2026-11-09',
    date: '9 novembre',
    news: [
      '🐍 Le Regard de Medusa : moins frustrante, et l’écran plein paie plus gros.',
    ],
  },
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
