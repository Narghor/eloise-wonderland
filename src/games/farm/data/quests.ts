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
    id: 'cookiery', who: 'marthe', title: 'La Cookiterie',
    intro: 'Les poules raffolent des cookies ! Une Cookiterie t’attend à la Boutique : pose-la où tu veux, puis fais-lui cuire une fournée de cookies pour poules.',
    thanks: 'Ça sent le biscuit jusque chez moi ! Une fournée, c’est de quoi nourrir tout un poulailler.',
    unlock: atLevel(2), after: 'firstOrder',
    objectives: [
      { own: 'cookiery', count: 1, text: 'Construire la Cookiterie' },
      { key: 'produce:chickenFeed', count: 6, text: 'Faire 6 cookies pour poules' },
    ],
    reward: { nuts: 40, xp: 8 },
  },
  {
    id: 'coop', who: 'marthe', title: 'Des poules !',
    intro: 'Avec ces cookies, tu peux avoir des poules. Construis un poulailler, adopte deux poules, nourris-les d’un tap et ramasse leurs œufs.',
    thanks: 'Elles ont l’air bien chez toi. Un sablier, pour les jours où tu es pressée.',
    unlock: atLevel(2), after: 'cookiery',
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
    id: 'mill', who: 'leon', title: 'Le moulin de Léon',
    intro: 'Bonjour ! Je suis Léon, le meunier. Un moulin à toi t’attend à la Boutique : pose-le où tu veux. Trois blés font une farine, et il m’en faut deux.',
    thanks: 'Ah, ça tourne ! Rien ne vaut le bruit des ailes d’un moulin. Avec cette farine, on va pouvoir parler pain…',
    unlock: atLevel(4), after: 'coop',
    objectives: [
      { own: 'mill', count: 1, text: 'Construire le Moulin' },
      { key: 'produce:flour', count: 2, text: 'Fabriquer 2 farines' },
    ],
    reward: { nuts: 60, xp: 12 },
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
    unlock: atLevel(4), after: 'mill',
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
    id: 'cart', who: 'marthe', title: 'La charrette du marché',
    intro: 'Une charrette vient prendre de grosses commandes pour le marché du bourg. Elle s’est garée près de ton entrée : touche-la pour voir ce qu’elle veut.',
    thanks: 'Bien payé, hein ? Elle repasse toutes les trois heures, et elle n’est jamais pressée.',
    unlock: atLevel(7), after: 'dairy',
    objectives: [{ key: 'order:cart', count: 1, text: 'Servir la charrette du marché' }],
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
  // -----------------------------------------------
  // LOT 2 (docs/ferme.md 18): Marthe's animals, Mme Pivoine's sweets, Basile's trees and workshops, Rosalie's flowers
  // -----------------------------------------------
  {
    id: 'beets', who: 'marthe', title: 'La betterave, c’est sucré',
    intro: 'Tu connais la betterave ? Les moutons en raffolent, et on en tire du sucre. Sèmes-en un bon carré.',
    thanks: 'Quelle couleur ! On dirait des rubis sous la terre.',
    unlock: atLevel(8), after: 'orders25',
    objectives: [{ key: 'harvest:beet', count: 10, text: 'Récolter 10 betteraves' }],
    reward: { nuts: 200, xp: 25 },
  },
  {
    id: 'sheep', who: 'marthe', title: 'Des moutons tout doux',
    intro: 'Un voisin vend ses moutons. Construis une bergerie, adopte-en deux, et tonds-les quand leur laine est prête.',
    thanks: 'Quelle laine ! Basile va vouloir t’en parler, je parie.',
    unlock: atLevel(8), after: 'beets',
    objectives: [
      { own: 'sheepfold', count: 1, text: 'Construire la Bergerie' },
      { own: 'sheep', count: 2, text: 'Avoir 2 moutons' },
      { key: 'collect:wool', count: 2, text: 'Ramasser 2 laines' },
    ],
    reward: { nuts: 260, xp: 30 },
  },
  {
    id: 'refinery', who: 'pivoine', title: 'Mme Pivoine et le sucre',
    intro: 'Bonjour, je suis Mme Pivoine, la pâtissière du bourg. Sans sucre, pas de douceurs ! Une sucrerie ferait de tes betteraves de l’or blanc.',
    thanks: 'Du sucre de ferme ! Mes clients vont sentir la différence.',
    unlock: atLevel(9), after: 'cake',
    objectives: [
      { own: 'refinery', count: 1, text: 'Construire la Sucrerie' },
      { key: 'produce:sugar', count: 3, text: 'Faire 3 sucres' },
    ],
    reward: { nuts: 280, xp: 30 },
  },
  {
    id: 'appleTree', who: 'basile', title: 'Un pommier qui donne',
    intro: 'Un pommier, ça donne des pommes toutes les trois heures, sans qu’on y touche. Plantes-en un près de la maison.',
    thanks: 'Croque, c’est de saison ! Garde-en pour le Fournil : une tarte aux pommes, ça ne se refuse pas.',
    unlock: atLevel(9), after: 'sunflowers',
    objectives: [
      { own: 'apple', count: 1, text: 'Planter un Pommier' },
      { key: 'collect:apple', count: 1, text: 'Cueillir les pommes' },
    ],
    reward: { nuts: 250, xp: 25 },
  },
  {
    id: 'pigs', who: 'marthe', title: 'Les cochons truffiers',
    intro: 'Un cochon, ça a un nez fin : il déniche des truffes ! Construis une porcherie et adopte-en deux.',
    thanks: 'Des truffes ! Les restaurants de la ville vont se battre pour elles.',
    unlock: atLevel(10), after: 'sheep',
    objectives: [
      { own: 'pigsty', count: 1, text: 'Construire la Porcherie' },
      { own: 'pig', count: 2, text: 'Avoir 2 cochons' },
      { key: 'collect:truffle', count: 2, text: 'Trouver 2 truffes' },
    ],
    reward: { nuts: 320, xp: 35 },
  },
  {
    id: 'press', who: 'basile', title: 'Le pressoir',
    intro: 'J’ai retrouvé les plans du vieux pressoir de mon père. Construis-le : jus de carotte, de tomate, de pomme…',
    thanks: 'À la tienne ! C’est meilleur que tout ce qu’on trouve en ville.',
    unlock: atLevel(10), after: 'appleTree',
    objectives: [
      { own: 'press', count: 1, text: 'Construire le Pressoir' },
      { key: 'produce:carrotJuice', count: 2, text: 'Presser 2 jus de carotte' },
    ],
    reward: { nuts: 320, xp: 35 },
  },
  {
    id: 'jam', who: 'pivoine', title: 'Les confitures de Mme Pivoine',
    intro: 'Des fraises, du sucre, et une confiturerie : il ne m’en faut pas plus pour mes tartines du dimanche.',
    thanks: 'Divine ! Je vais en mettre dans tous mes gâteaux.',
    unlock: atLevel(11), after: 'refinery',
    objectives: [
      { own: 'jamKitchen', count: 1, text: 'Construire la Confiturerie' },
      { key: 'produce:strawberryJam', count: 2, text: 'Faire 2 confitures de fraises' },
    ],
    reward: { nuts: 360, xp: 35 },
  },
  {
    id: 'bees', who: 'rosalie', title: 'Le rucher',
    intro: 'Les abeilles butinent mes fleurs depuis des années. Installe-leur un rucher : elles te le rendront en miel.',
    thanks: 'Ça bourdonne de bonheur ! Et quel miel…',
    unlock: atLevel(12), after: 'pigs',
    objectives: [
      { own: 'hive', count: 1, text: 'Construire le Rucher' },
      { own: 'bee', count: 2, text: 'Avoir 2 colonies' },
      { key: 'collect:honey', count: 2, text: 'Récolter 2 pots de miel' },
    ],
    reward: { nuts: 400, xp: 40 },
  },
  {
    id: 'yarn', who: 'basile', title: 'Des pelotes de laine',
    intro: 'Ta laine mérite mieux que le grenier. À la filature, deux laines font une belle pelote.',
    thanks: 'Ma femme a déjà commencé une écharpe. Elle te la réserve, je crois.',
    unlock: atLevel(13), after: 'press',
    objectives: [
      { own: 'spinning', count: 1, text: 'Construire la Filature' },
      { key: 'produce:yarn', count: 2, text: 'Filer 2 pelotes de laine' },
    ],
    reward: { nuts: 420, xp: 40 },
  },
  {
    id: 'candy', who: 'pivoine', title: 'La confiserie',
    intro: 'Les enfants du bourg réclament des bonbons au miel. Une confiserie, et ce sera la fête à la sortie de l’école !',
    thanks: 'Capucine m’a dit que la classe entière en parlait. Bravo !',
    unlock: atLevel(14), after: 'jam',
    objectives: [
      { own: 'candyShop', count: 1, text: 'Construire la Confiserie' },
      { key: 'produce:honeyCandy', count: 3, text: 'Faire 3 bonbons au miel' },
    ],
    reward: { nuts: 450, xp: 45 },
  },
  {
    id: 'goats', who: 'marthe', title: 'Des chèvres têtues',
    intro: 'Des chèvres ! Elles grimpent partout, mais leur lait fait un fromage délicieux. Construis une chèvrerie.',
    thanks: 'Elles ont déjà grimpé sur le toit. C’est bon signe !',
    unlock: atLevel(16), after: 'bees',
    objectives: [
      { own: 'goatShed', count: 1, text: 'Construire la Chèvrerie' },
      { own: 'goat', count: 2, text: 'Avoir 2 chèvres' },
      { key: 'produce:goatCheese', count: 1, text: 'Faire 1 fromage de chèvre' },
    ],
    reward: { nuts: 500, xp: 50 },
  },
  {
    id: 'blueberries', who: 'rosalie', title: 'Les myrtilles des bois',
    intro: 'Les myrtilles poussent en une heure et demie. Avec un peu de beurre, ça fait une tarte inoubliable !',
    thanks: 'Les doigts tout bleus, mais quel bonheur.',
    unlock: atLevel(17), after: 'yarn',
    objectives: [
      { key: 'harvest:blueberry', count: 10, text: 'Récolter 10 myrtilles' },
      { key: 'produce:blueberryPie', count: 1, text: 'Cuire 1 tarte aux myrtilles' },
    ],
    reward: { nuts: 520, xp: 50 },
  },
  {
    id: 'sewing', who: 'basile', title: 'L’atelier de couture',
    intro: 'Avec tes pelotes, on pourrait coudre de vraies écharpes. Je t’ai dessiné un atelier !',
    thanks: 'L’hiver peut venir, le village sera au chaud.',
    unlock: atLevel(18), after: 'blueberries',
    objectives: [
      { own: 'sewing', count: 1, text: 'Construire l’Atelier de couture' },
      { key: 'produce:scarf', count: 2, text: 'Coudre 2 écharpes' },
    ],
    reward: { nuts: 560, xp: 55 },
  },
  {
    id: 'cherryTree', who: 'rosalie', title: 'Le temps des cerises',
    intro: 'Un cerisier en fleurs, c’est la plus jolie chose du printemps. Et ses cerises font des confitures merveilleuses !',
    thanks: 'Des boucles d’oreilles en cerises, comme quand j’étais petite !',
    unlock: atLevel(18), after: 'sewing',
    objectives: [
      { own: 'cherry', count: 1, text: 'Planter un Cerisier' },
      { key: 'collect:cherry', count: 1, text: 'Cueillir les cerises' },
    ],
    reward: { nuts: 560, xp: 55 },
  },
  {
    id: 'ducks', who: 'marthe', title: 'Coin coin',
    intro: 'Une mare, des canards, et des plumes pour les coussins. Ça te dit ?',
    thanks: 'Ils barbotent déjà. Quelle joie de les entendre !',
    unlock: atLevel(19), after: 'goats',
    objectives: [
      { own: 'duckPond', count: 1, text: 'Creuser la Mare aux canards' },
      { own: 'duck', count: 2, text: 'Avoir 2 canards' },
      { key: 'collect:feather', count: 3, text: 'Ramasser 3 plumes' },
    ],
    reward: { nuts: 600, xp: 60 },
  },
  {
    id: 'iceCream', who: 'pivoine', title: 'Le glacier',
    intro: 'L’été arrive et tout le monde veut des glaces ! De la crème, du sucre, des fruits : construisons un glacier.',
    thanks: 'Une queue jusqu’à la place du village ! On a bien fait.',
    unlock: atLevel(20), after: 'candy',
    objectives: [
      { own: 'iceCream', count: 1, text: 'Construire le Glacier' },
      { key: 'produce:strawberryIce', count: 2, text: 'Faire 2 glaces à la fraise' },
    ],
    reward: { nuts: 640, xp: 60 },
  },
  {
    id: 'lavender', who: 'rosalie', title: 'Un champ de lavande',
    intro: 'La lavande met six heures à fleurir, mais quel parfum ! Mes clientes en veulent pour leurs armoires.',
    thanks: 'Toute ma boutique sent la Provence. Merci !',
    unlock: atLevel(21), after: 'cherryTree',
    objectives: [{ key: 'harvest:lavender', count: 10, text: 'Récolter 10 lavandes' }],
    reward: { nuts: 660, xp: 65 },
  },
  {
    id: 'soap', who: 'rosalie', title: 'La savonnerie',
    intro: 'Lavande et lait de chèvre : le savon le plus doux du monde. Il te faut une savonnerie !',
    thanks: 'Je vais en mettre un dans chaque bouquet.',
    unlock: atLevel(22), after: 'lavender',
    objectives: [
      { own: 'soapWorks', count: 1, text: 'Construire la Savonnerie' },
      { key: 'produce:lavenderSoap', count: 2, text: 'Faire 2 savons à la lavande' },
    ],
    reward: { nuts: 700, xp: 70 },
  },
  {
    id: 'rabbits', who: 'marthe', title: 'Les lapins angora',
    intro: 'Des lapins angora ! Leur laine est la plus douce qui soit. Construis-leur un clapier.',
    thanks: 'Ils sont tout ronds, on dirait des nuages.',
    unlock: atLevel(23), after: 'ducks',
    objectives: [
      { own: 'hutch', count: 1, text: 'Construire le Clapier' },
      { own: 'rabbit', count: 2, text: 'Avoir 2 lapins' },
      { key: 'collect:angora', count: 2, text: 'Ramasser 2 laines angora' },
    ],
    reward: { nuts: 750, xp: 75 },
  },
  {
    id: 'creperie', who: 'pivoine', title: 'La crêperie',
    intro: 'De la farine, des œufs, du lait… et une crêperie ! Le bourg n’attend que ça.',
    thanks: 'La première crêpe est toujours ratée, mais la deuxième était parfaite.',
    unlock: atLevel(25), after: 'iceCream',
    objectives: [
      { own: 'creperie', count: 1, text: 'Construire la Crêperie' },
      { key: 'produce:crepe', count: 3, text: 'Faire 3 crêpes' },
    ],
    reward: { nuts: 800, xp: 80 },
  },
  {
    id: 'plushie', who: 'jules', title: 'Le doudou de Jules',
    intro: 'J’ai perdu mon doudou… Tu pourrais m’en coudre un ? Un lapin, tout doux, s’il te plaît !',
    thanks: 'Il est encore plus doux que l’ancien ! Je l’appellerai Pompon.',
    unlock: atLevel(26), after: 'rabbits',
    objectives: [{ key: 'produce:plushie', count: 1, text: 'Coudre 1 doudou lapin' }],
    reward: { nuts: 850, xp: 85 },
  },
  {
    id: 'layerCake', who: 'pivoine', title: 'Le gâteau des mariés',
    intro: 'Il y a un mariage au bourg ! Il faut un gâteau à étages, le plus beau que le canton ait vu.',
    thanks: 'Les mariés en ont pleuré. Et moi aussi, un peu.',
    unlock: atLevel(29), after: 'creperie',
    objectives: [{ key: 'produce:layerCake', count: 1, text: 'Cuire 1 gâteau à étages' }],
    reward: { nuts: 950, xp: 95 },
  },
  {
    id: 'giftBasket', who: 'capucine', title: 'La grande kermesse',
    intro: 'Pour la grande kermesse de l’école, le premier prix sera un panier gourmand de ta ferme. Le plus beau de tous !',
    thanks: 'Toute l’école a applaudi. Ta ferme est la fierté du village !',
    unlock: atLevel(30), after: 'layerCake',
    objectives: [{ key: 'produce:giftBasket', count: 1, text: 'Préparer 1 panier gourmand' }],
    reward: { nuts: 1000, xp: 100 },
  },
];

export const MAX_OPEN_QUESTS = 2;

export function quest(id: QuestId): Quest | undefined {
  return QUESTS.find((q) => q.id === id);
}
