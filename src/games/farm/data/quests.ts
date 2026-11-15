import { atLevel, type Objective, type PersonId, type QuestId, type Reward, type Unlock } from './types';

// -----------------------------------------------
// THE VILLAGE STORY (docs/ferme.md 4.7 and 7.8)
// -----------------------------------------------
// Played in list order, two open at most: a quest opens once the one before it is done and its unlock is met.
// The first ones are the tutorial: their text says the gesture.

export interface Quest {
  id: QuestId;
  who: PersonId;
  title: string;
  /** What the villager says when the quest opens. */
  intro: string;
  /** What the villager says when it is handed in. */
  thanks: string;
  unlock: Unlock;
  /** The quest before it in the story; none for the first. */
  after?: QuestId;
  objectives: Objective[];
  reward: Reward;
}

export const QUESTS: readonly Quest[] = [
  {
    id: 'firstHarvest', who: 'marthe', title: 'Bienvenue à la ferme',
    intro: 'Bienvenue, voisine ! Ton blé est déjà mûr : touche un champ doré pour le récolter, ou glisse le doigt sur plusieurs champs d’un coup.',
    thanks: 'Voilà des bras qui savent travailler ! Tiens, un peu d’engrais pour la suite.',
    unlock: atLevel(1),
    objectives: [{ key: 'harvest:wheat', count: 6, text: 'Récolter 6 blés' }],
    reward: { nuts: 20, xp: 5, boosters: { fertilizer: 1 } },
  },
  {
    id: 'firstSowing', who: 'marthe', title: 'Ce qui se sème…',
    intro: 'Un champ vide, ça ne rapporte rien. Touche-le et choisis le blé. Astuce : fais glisser la graine sur les autres champs vides.',
    thanks: 'Deux minutes, et ce sera prêt. Le blé, c’est la base de tout ici.',
    unlock: atLevel(1), after: 'firstHarvest',
    objectives: [{ key: 'sow:wheat', count: 6, text: 'Semer 6 blés' }],
    reward: { nuts: 20, xp: 5 },
  },
  {
    id: 'firstOrder', who: 'marthe', title: 'Le tableau des commandes',
    intro: 'Les gens du village passent commande au tableau. Ouvre « Commandes » en bas : quand tout est coché, livre !',
    thanks: 'Les commandes paient bien mieux que le marchand. Elles n’expirent jamais, prends ton temps.',
    unlock: atLevel(1), after: 'firstSowing',
    objectives: [{ key: 'order', count: 1, text: 'Servir 1 commande' }],
    reward: { nuts: 30, xp: 5 },
  },
  {
    id: 'mill', who: 'leon', title: 'Le moulin de Léon',
    intro: 'Bonjour ! Je suis Léon, le meunier. Un moulin à toi t’attend à la Boutique : pose-le où tu veux, puis fais-lui moudre de l’aliment pour poules.',
    thanks: 'Ah, ça tourne ! Rien ne vaut le bruit des ailes d’un moulin.',
    unlock: atLevel(2), after: 'firstOrder',
    objectives: [
      { own: 'mill', count: 1, text: 'Construire le Moulin' },
      { key: 'produce:chickenFeed', count: 3, text: 'Fabriquer 3 aliments pour poules' },
    ],
    reward: { nuts: 40, xp: 8 },
  },
  {
    id: 'coop', who: 'marthe', title: 'Des poules !',
    intro: 'Avec cet aliment, tu peux avoir des poules. Construis un poulailler, adopte deux poules, nourris-les d’un tap et ramasse leurs œufs.',
    thanks: 'Elles ont l’air bien chez toi. Un sablier, pour les jours où tu es pressée.',
    unlock: atLevel(2), after: 'mill',
    objectives: [
      { own: 'coop', count: 1, text: 'Construire le Poulailler' },
      { own: 'chicken', count: 2, text: 'Avoir 2 poules' },
      { key: 'collect:egg', count: 2, text: 'Ramasser 2 œufs' },
    ],
    reward: { nuts: 50, xp: 10, boosters: { hourglass: 1 } },
  },
  {
    id: 'clearing', who: 'basile', title: 'Un peu de place',
    intro: 'Salut, moi c’est Basile, charpentier. Ta ferme est pleine de broussailles ! Touche un buisson, une souche ou un rocher pour le dégager.',
    thanks: 'Du bon travail. Il y a parfois une surprise sous les cailloux, garde l’œil ouvert.',
    unlock: atLevel(2), after: 'firstOrder',
    objectives: [{ key: 'clear', count: 3, text: 'Dégager 3 obstacles' }],
    reward: { nuts: 40, xp: 8 },
  },
  {
    id: 'decor', who: 'rosalie', title: 'Une ferme jolie',
    intro: 'Coucou, c’est Rosalie, la fleuriste ! Une ferme, ça se décore. Achète trois décos à la Boutique et pose-les où tu veux.',
    thanks: 'Que c’est joli ! Tiens, un parterre de roses de ma boutique, pour toi.',
    unlock: atLevel(3), after: 'clearing',
    objectives: [{ key: 'place:deco', count: 3, text: 'Placer 3 décos' }],
    reward: { xp: 8, decor: { flowersPink: 1 } },
  },
  {
    id: 'flour', who: 'leon', title: 'De la farine',
    intro: 'Mon moulin sait maintenant moudre la farine. Trois blés font une farine : il m’en faut deux.',
    thanks: 'Parfait. Avec ça, on va pouvoir parler pain…',
    unlock: atLevel(4), after: 'coop',
    objectives: [{ key: 'produce:flour', count: 2, text: 'Fabriquer 2 farines' }],
    reward: { nuts: 50, xp: 10 },
  },
  {
    id: 'corn', who: 'marthe', title: 'Le maïs de l’été',
    intro: 'Les poules adorent le maïs. Il pousse en cinq minutes : sème-en un bon carré.',
    thanks: 'Voilà de quoi tenir le poulailler !',
    unlock: atLevel(3), after: 'coop',
    objectives: [{ key: 'harvest:corn', count: 10, text: 'Récolter 10 maïs' }],
    reward: { nuts: 40, xp: 8 },
  },
  {
    id: 'carrots', who: 'marthe', title: 'Des carottes pour le marché',
    intro: 'Les carottes se vendent bien au marché du samedi. Récolte-en quelques-unes.',
    thanks: 'Elles sont belles ! Les gens vont en redemander.',
    unlock: atLevel(3), after: 'corn',
    objectives: [{ key: 'harvest:carrot', count: 8, text: 'Récolter 8 carottes' }],
    reward: { nuts: 45, xp: 8 },
  },
  {
    id: 'parcel', who: 'basile', title: 'Pousser les murs',
    intro: 'Tu vas finir par manquer de place. Les panneaux autour de ta ferme montrent les terrains à vendre : achètes-en un.',
    thanks: 'Une ferme qui grandit, c’est une ferme qui vit. Il faudra la dégager, bien sûr…',
    unlock: atLevel(3), after: 'decor',
    objectives: [{ key: 'buy:parcel', count: 1, text: 'Acheter un terrain' }],
    reward: { nuts: 60, xp: 10 },
  },
  {
    id: 'bakery', who: 'leon', title: 'Le fournil',
    intro: 'De la farine, un four, et le village aura du bon pain. Construis le fournil et cuis deux pains.',
    thanks: 'Ça sent bon jusqu’au moulin ! Un sablier, pour ne pas laisser refroidir.',
    unlock: atLevel(4), after: 'flour',
    objectives: [
      { own: 'bakery', count: 1, text: 'Construire le Fournil' },
      { key: 'produce:bread', count: 2, text: 'Cuire 2 pains' },
    ],
    reward: { nuts: 80, xp: 15, boosters: { hourglass: 1 } },
  },
  {
    id: 'carrotPie', who: 'marthe', title: 'Le marché de samedi',
    intro: 'Le marché rouvre samedi et je n’ai plus une seule tarte. Tu me cuis deux tartes aux carottes ?',
    thanks: 'Tu me sauves ! Mes clients ne verront pas la différence… enfin, ils diront que c’est meilleur.',
    unlock: atLevel(5), after: 'bakery',
    objectives: [{ key: 'produce:carrotPie', count: 2, text: 'Cuire 2 tartes aux carottes' }],
    reward: { nuts: 90, xp: 15 },
  },
  {
    id: 'hazel', who: 'basile', title: 'Un arbre qui donne',
    intro: 'Un noisetier donne des Éloisettes toutes les quatre heures, sans qu’on y touche. Plantes-en un, tu me remercieras.',
    thanks: 'Patience : il donnera pendant que tu dors.',
    unlock: atLevel(5), after: 'parcel',
    objectives: [{ own: 'hazel', count: 1, text: 'Planter un Noisetier' }],
    reward: { nuts: 60, xp: 10 },
  },
  {
    id: 'tomatoes', who: 'rosalie', title: 'Rouge tomate',
    intro: 'J’ai promis des tomates à ma sœur. Elles mettent une demi-heure à mûrir : sème-les avant de partir !',
    thanks: 'Qu’elles sont rouges ! Merci mille fois.',
    unlock: atLevel(5), after: 'hazel',
    objectives: [{ key: 'harvest:tomato', count: 10, text: 'Récolter 10 tomates' }],
    reward: { nuts: 70, xp: 12 },
  },
  {
    id: 'orders10', who: 'marthe', title: 'Une fermière qu’on connaît',
    intro: 'On parle de toi au village ! Continue de servir les commandes, tout le monde en profite.',
    thanks: 'Dix commandes ! Voilà un coup de main, pour une commande qui ne te plaît pas.',
    unlock: atLevel(5), after: 'carrotPie',
    objectives: [{ key: 'order', count: 10, text: 'Servir 10 commandes' }],
    reward: { nuts: 100, xp: 15, boosters: { helpingHand: 1 } },
  },
  {
    id: 'cowshed', who: 'marthe', title: 'Une vache, deux vaches',
    intro: 'Mes vaches ont eu des petites, je t’en laisse à bon prix. Construis une étable, prends-en deux, et trais-les.',
    thanks: 'Du bon lait frais ! Léon va vouloir t’en parler, je parie.',
    unlock: atLevel(6), after: 'orders10',
    objectives: [
      { own: 'cowshed', count: 1, text: 'Construire l’Étable' },
      { own: 'cow', count: 2, text: 'Avoir 2 vaches' },
      { key: 'collect:milk', count: 3, text: 'Ramasser 3 laits' },
    ],
    reward: { nuts: 150, xp: 20, boosters: { hourglass: 1 } },
  },
  {
    id: 'dairy', who: 'leon', title: 'Crème et beurre',
    intro: 'Avec ton lait, une laiterie ferait merveille : crème, beurre… Construis-la et fais-moi goûter ça.',
    thanks: 'Du vrai beurre de ferme. Mon pain n’a jamais été aussi bon.',
    unlock: atLevel(7), after: 'cowshed',
    objectives: [
      { own: 'dairy', count: 1, text: 'Construire la Laiterie' },
      { key: 'produce:cream', count: 2, text: 'Faire 2 crèmes' },
      { key: 'produce:butter', count: 2, text: 'Faire 2 beurres' },
    ],
    reward: { nuts: 150, xp: 20 },
  },
  {
    id: 'strawberries', who: 'rosalie', title: 'La saison des fraises',
    intro: 'Les premières fraises ! Elles mettent une heure à mûrir, mais quel parfum…',
    thanks: 'J’en ai mangé deux en route, chut.',
    unlock: atLevel(7), after: 'tomatoes',
    objectives: [{ key: 'harvest:strawberry', count: 10, text: 'Récolter 10 fraises' }],
    reward: { nuts: 120, xp: 15 },
  },
  {
    id: 'decor2', who: 'rosalie', title: 'La plus jolie ferme du canton',
    intro: 'Le concours de la plus jolie ferme approche ! Place dix décos de plus, à ta façon.',
    thanks: 'Tu as l’œil ! Une lanterne de ma vitrine, pour les soirs d’été.',
    unlock: atLevel(8), after: 'strawberries',
    objectives: [{ key: 'place:deco', count: 10, text: 'Placer 10 décos' }],
    reward: { xp: 20, decor: { lantern: 1 } },
  },
  {
    id: 'orders25', who: 'marthe', title: 'Le grand marché',
    intro: 'Tout le canton vient au grand marché. Il va falloir servir du monde !',
    thanks: 'Vingt-cinq commandes ! Un arrosoir, pour tes champs les plus lents.',
    unlock: atLevel(8), after: 'dairy',
    objectives: [{ key: 'order', count: 25, text: 'Servir 25 commandes' }],
    reward: { nuts: 200, xp: 25, boosters: { wateringCan: 1 } },
  },
  {
    id: 'sunflowers', who: 'rosalie', title: 'Des soleils dans les champs',
    intro: 'Des tournesols pour mes bouquets ! Ils poussent en deux heures.',
    thanks: 'Ma boutique est toute jaune ! Merci !',
    unlock: atLevel(9), after: 'decor2',
    objectives: [{ key: 'harvest:sunflower', count: 12, text: 'Récolter 12 tournesols' }],
    reward: { nuts: 180, xp: 20 },
  },
  {
    id: 'cake', who: 'leon', title: 'Le gâteau d’anniversaire',
    intro: 'C’est l’anniversaire de Marthe, chut ! Il faut des gâteaux aux fraises. Il faut de la crème, des œufs, des fraises…',
    thanks: 'Elle a pleuré de joie. Bon, et un peu à cause des bougies.',
    unlock: atLevel(9), after: 'orders25',
    objectives: [{ key: 'produce:strawberryCake', count: 2, text: 'Cuire 2 gâteaux aux fraises' }],
    reward: { nuts: 220, xp: 25 },
  },
  {
    id: 'bridge', who: 'basile', title: 'Le vieux pont',
    intro: 'Tu vois le pont cassé, à l’est ? De l’autre côté, il y a la rive. Aide-moi à le réparer : ouvre le grand projet dans « Quêtes ».',
    thanks: 'La première étape est faite ! Le pont tiendra, foi de charpentier.',
    unlock: atLevel(10), after: 'cake',
    objectives: [{ key: 'project:bridge', count: 1, text: 'Finir une étape du vieux pont' }],
    reward: { nuts: 200, xp: 25 },
  },
  {
    id: 'pumpkins', who: 'marthe', title: 'La fête des citrouilles',
    intro: 'La fête des citrouilles approche ! Il me faut des citrouilles, et une tarte pour le concours.',
    thanks: 'Premier prix ! Enfin, deuxième. Mais le jury s’est trompé.',
    unlock: atLevel(11), after: 'bridge',
    objectives: [
      { key: 'harvest:pumpkin', count: 10, text: 'Récolter 10 citrouilles' },
      { key: 'produce:pumpkinPie', count: 1, text: 'Cuire 1 tarte à la citrouille' },
    ],
    reward: { nuts: 300, xp: 30 },
  },
  {
    id: 'cheese', who: 'leon', title: 'Le fromage de Léon',
    intro: 'Ma grand-mère faisait un fromage… Avec ta laiterie, on peut retrouver le goût. Trois fromages, s’il te plaît.',
    thanks: 'C’est lui ! C’est le goût de mon enfance.',
    unlock: atLevel(12), after: 'pumpkins',
    objectives: [{ key: 'produce:cheese', count: 3, text: 'Faire 3 fromages' }],
    reward: { nuts: 300, xp: 30 },
  },
  {
    id: 'cotton', who: 'rosalie', title: 'Doux comme le coton',
    intro: 'Du coton ! Ça pousse lentement, huit heures, mais on en fait de si jolies choses.',
    thanks: 'Tout doux ! Basile a une idée pour la suite, je crois.',
    unlock: atLevel(13), after: 'sunflowers',
    objectives: [{ key: 'harvest:cotton', count: 10, text: 'Récolter 10 cotons' }],
    reward: { nuts: 350, xp: 35 },
  },
  {
    id: 'spinning', who: 'basile', title: 'La filature',
    intro: 'Le coton, ça se file. Je t’ai dessiné une filature : construis-la et file trois bobines.',
    thanks: 'Une vraie filature ! Ma femme veut déjà un pull.',
    unlock: atLevel(14), after: 'cotton',
    objectives: [
      { own: 'spinning', count: 1, text: 'Construire la Filature' },
      { key: 'produce:thread', count: 3, text: 'Filer 3 fils' },
    ],
    reward: { nuts: 400, xp: 40 },
  },
  {
    id: 'fabric', who: 'rosalie', title: 'Un tissu pour la fête',
    intro: 'Pour la fête du village, il faudrait des tissus : des nappes, des fanions…',
    thanks: 'Le village n’a jamais été aussi beau. Merci, voisine.',
    unlock: atLevel(15), after: 'spinning',
    objectives: [{ key: 'produce:fabric', count: 2, text: 'Tisser 2 tissus' }],
    reward: { nuts: 500, xp: 50 },
  },
  {
    id: 'riverBank', who: 'basile', title: 'La rive',
    intro: 'Le pont est réparé ! La rive est à toi, il n’y a plus qu’à acheter le terrain.',
    thanks: 'Une nouvelle terre ! Qui sait ce qu’on y trouvera…',
    unlock: { project: 'bridge' }, after: 'bridge',
    objectives: [{ key: 'buy:river', count: 1, text: 'Acheter un terrain de la rive' }],
    reward: { nuts: 300, xp: 30 },
  },
];

export const MAX_OPEN_QUESTS = 2;

export function quest(id: QuestId): Quest | undefined {
  return QUESTS.find((q) => q.id === id);
}
