# La Ferme — document de conception

> État : **lot 1 CODÉ le 15/11/2026** (`src/games/farm/`, route `#/ferme`), **non publié, jamais joué sur téléphone**.
> Ce qui a été tranché en le codant : section 12. L'économie est mesurée par `tools/farm-sim.mjs` (section 8bis),
> qui lit désormais les vraies données du jeu.
> Ce document est la source de vérité du chantier : une décision prise en conversation s'écrit ici.
> Les chiffres sont des **points de départ**, à remesurer avec l'outil de simulation (section 9) avant d'être crus.

---

## 1. La vision

Un jeu de ferme complet, à la Farmville : une ferme qu'on agrandit, des cultures, des animaux, des machines,
des commandes à servir, et de la **décoration qu'on place où on veut**. Chacun organise sa ferme à sa façon.

On y joue par petites visites tout au long de la journée, comme sur mobile, **sans jamais être puni d'être parti**.
Le jeu doit être assez riche pour qu'on y joue « à fond », Flo compris : du contenu qui arrive par vagues, des buts
à toutes les échelles, et une interface soignée.

Décisions prises (15/11) :
- un jeu **séparé** : la Maison et son potager ne changent pas (tant qu'Eloise ne demande rien) ;
- une monnaie **propre** au jeu : les **Éloisettes 🌰** ;
- des **boosters** qu'on achète avec les pièces du site et qu'on gagne en jouant ;
- une **vue de dessus « penchée »** : grille de cases carrées, objets dessinés debout sur leur case (choix B) ;
- des **quêtes et des objectifs** qui débloquent le contenu.

On ne reprend ni les noms, ni les dessins, ni les textes des jeux du commerce : seulement les mécaniques du genre.

---

## 2. Les règles anti-frustration (non négociables)

1. **Rien ne se perd.** Une récolte mûre, un œuf, un pain attendent indéfiniment. Aucun animal ne meurt, aucune
   plante ne fane. (C'est l'inverse du jeu Potager, qui est un puzzle et le reste.)
2. **Pas d'énergie.** On peut toujours jouer ; ce qui limite, c'est le temps de production, pas une jauge.
3. **Pas de grange qui déborde.** Le stock est illimité.
4. **Les commandes n'expirent pas.** Les tâches du jour se renouvellent mais rater un jour ne coûte rien
   (pas de série à perdre).
5. **Toujours quelque chose à faire en 2 minutes**, et toujours quelque chose de long à lancer avant de partir.
6. **L'absence rapporte** : au retour, tout est prêt à ramasser, les noisetiers ont donné, de nouvelles commandes
   sont arrivées.
7. **Chaque minuteur se lit** : jamais une barre seule. Un champ qui pousse montre une barre **et le temps restant**
   (« Encore 1 min 58 », choix de Flo du 15/11 au premier test). **Jamais une heure de la journée** : machines,
   enclos, noisetier, Gaston et nouvelles commandes disent le temps restant (« dans 4 min 05 »), qui défile tout
   seul (`timeLeft` / `refreshTimesLeft`, farmPanels) ; le joueur ne calcule pas une heure (Flo, 15/11, redemandé).
8. **Accélérer se gagne en jouant** (boosters), et ne devient jamais nécessaire pour avancer.

---

## 3. Les boucles de jeu

| échelle | ce qu'on fait |
|---|---|
| **la minute** | glisser le doigt sur les champs pour récolter et ressemer, ramasser les œufs, relancer le Moulin |
| **la visite (5-15 min)** | servir 2-3 commandes, lancer une fabrication longue, dégager un bout de friche, placer une déco |
| **la journée** | les 3 petites tâches, une ou deux quêtes de l'histoire, un niveau de temps en temps |
| **la semaine** | un grand projet du village qui ouvre une nouvelle zone, une nouvelle machine, une médaille |

---

## 4. Les systèmes

### 4.1 Le terrain

- La carte est une grille de cases. **Lot 1 : 24 × 24 cases**, découpées en **16 parcelles de 6 × 6**.
- Au départ, les **4 parcelles du centre** sont à nous (12 × 12 cases).
- Une parcelle **voisine** d'une parcelle possédée s'achète en Éloisettes, avec un niveau minimum.
- Certaines parcelles ne s'ouvrent que par un **grand projet** (exemple : le pont mène à la rive, à l'est).
- Les parcelles achetées sont en **friche** : buissons, souches, rochers. On les dégage un par un contre des
  Éloisettes ; chacun donne de l'XP, et parfois des Éloisettes ou un booster en surprise.
- Plus tard, la carte grandira (la même logique de parcelles, sans rien changer au code).

### 4.2 Les objets qu'on pose

Tout ce qui est sur la carte est un **objet posé** : un type, une position, une taille (1 × 1, 2 × 2, 3 × 3…).
Champs, enclos, machines, arbres et décos partagent **le même code** pour être achetés, posés, déplacés, rangés.

- **Mode « Aménager »** : on déplace tout librement (fantôme vert si la place est libre, rouge sinon).
  Un objet en cours de production se déplace sans rien perdre.
- **Ranger** une déco la met dans l'inventaire de déco, pour la reposer plus tard.
- **Tourner** : tout objet se tourne d'un quart de tour (décidé le 15/11). Sa taille s'échange (un objet 2 × 3
  devient 3 × 2). Chaque objet a **2 dessins**, de face et de profil ; le profil retourné en miroir donne le
  troisième côté, et le dos reprend la face sauf exception. C'est ce qui garde le coût des dessins raisonnable.

### 4.3 La production : un seul moteur

Une culture, un animal, une machine, un arbre sont tous une **source de production** :
des **entrées**, des **sorties**, une **durée**. Un seul moteur de minuteurs pour tout le jeu.

- **Champ** (1 × 1) : on sème une culture (graine payée en Éloisettes), elle pousse, on récolte.
  **Glisser le doigt** sur plusieurs champs sème ou récolte tout le trajet d'un coup.
- **Enclos** (3 × 3) : il accueille quelques animaux. Chaque animal mange 1 aliment, produit après un temps,
  puis attend qu'on ramasse. On le nourrit à nouveau d'un tap (ou du doigt glissé).
- **Machine** (2 × 2) : une **file d'attente** de recettes (2 places au départ, on en achète jusqu'à 6) ;
  ce qui sort attend sur un plateau.
- **Arbre** (2 × 2) : redonne tout seul, sans être replanté (le noisetier donne des Éloisettes).

### 4.4 La grange

Le stock de tout ce qu'on produit, **illimité**. On peut y **vendre** un produit au marchand, à **la moitié de sa
valeur** : c'est le débouché de secours, les commandes paient 3 fois mieux. (Mesuré : au prix plein, « semer du blé
et le revendre » devenait la meilleure stratégie et les machines ne servaient plus à rien.)

### 4.5 Les commandes

- Un **tableau de commandes** : 3 places au départ, 6 au niveau 8.
- Une commande = 1 à 3 produits débloqués, en quantités qui suivent le niveau.
- Elle paie **≈ 1,6 × la valeur des produits** en Éloisettes, plus l'XP des produits.
- Une commande servie est remplacée **1 minute** après ; une commande refusée, **15 minutes** après
  (ou tout de suite avec un booster « Coup de main »).
- Les commandes n'expirent jamais.

### 4.6 Niveaux et XP

L'XP vient surtout de ce qui **transforme et livre** : les commandes (~45 %), les tâches du jour, les machines et
les animaux. Les cultures en donnent peu, et le blé et le maïs n'en donnent pas : sinon, rester planté devant 20
champs de blé à 2 minutes battait tout le reste (mesuré : 62 % de l'XP d'une joueuse très active venait des champs).

Chaque niveau débloque **au moins une chose** et donne des boosters. Lot 1 : niveaux 1 à 15.

La table d'XP est écrite à la main, pas par une formule : les 5 premiers niveaux tombent le premier jour (l'accroche),
puis chaque niveau prend de plus en plus de temps, sans qu'aucun ne s'éternise.

| du niveau | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| XP pour passer au suivant | 15 | 30 | 50 | 80 | 200 | 320 | 480 | 680 | 950 | 1 600 | 2 900 | 3 700 | 4 500 | 5 300 |

### 4.7 Objectifs et quêtes (ce qui débloque le contenu)

| couche | rôle |
|---|---|
| **Niveaux** | la colonne vertébrale : ils ouvrent cultures, machines, décos, parcelles |
| **L'histoire du village** | une suite de quêtes de 1 à 3 objectifs, racontées par des villageois. Sert de tuto au début. Certaines débloquent du contenu (un animal, une recette) |
| **Les grands projets** | de gros objectifs à plusieurs livraisons pour restaurer un lieu du village ; ils ouvrent des **zones** |
| **Les petites tâches du jour** | 3 tâches courtes, renouvelées chaque jour ; rapportent Éloisettes + booster, un coffre si les 3 sont faites |
| **Les médailles** | pour les complétionnistes : bronze / argent / or (exemple : 10 / 100 / 1 000 vaches traites) |

### 4.8 Les boosters

| booster | effet | prix (pièces du site) |
|---|---|---|
| **Engrais** | un champ est mûr tout de suite | 5 |
| **Arrosoir** | tous les champs : temps restant divisé par 2 | 25 |
| **Sablier** | une machine ou un animal : −1 h sur ce qui est en cours | 15 |
| **Coup de main** | une commande refusée est remplacée tout de suite | 10 |

Sources : la **boutique** (pièces du site), les **niveaux**, les **quêtes**, les **tâches du jour**, la friche (rare),
et **les jeux du site** : en finissant un niveau de n'importe quel jeu, une chance de gagner un booster
(même mécanisme que le ticket de casino).

**La boutique a un stock par jour**, et c'est ce qui empêche d'acheter sa progression avec les pièces :
**5 Engrais, 1 Arrosoir, 3 Sabliers, 2 Coups de main** par jour, et **2 boosters au plus** gagnés par jour dans les
autres jeux. Les boosters gagnés dans la ferme (niveaux, quêtes, tâches) ne sont pas plafonnés : ils sont rares par
nature. Mesure en section 8bis : avec ce plafond, tout acheter chaque jour fait gagner **0 à 10 %** de temps ;
sans plafond, une joueuse qui achète tout irait **2 fois plus vite** (et dépenserait ~17 000 Engrais).

### 4.9 La déco

Purement décorative au début (décidé le 15/11) ; un score de « Charme » pourra venir plus tard.
Chaque déco a un prix, une taille, un niveau de déblocage. Beaucoup de décos = beaucoup de dessins : c'est là que
le contenu grossira le plus.

---

## 5. Le modèle de données (la base qui accepte beaucoup de contenu)

Trois principes :

1. **Tout le contenu est une ligne de données.** Ajouter une culture, une machine, une déco, une quête, c'est ajouter
   une ligne, pas du code.
2. **Une seule règle de déblocage.** Chaque ligne dit ce qui l'ouvre ; une seule fonction (`isUnlocked`) décide.
3. **Les quêtes écoutent des événements.** La logique annonce ce qui se passe ; une quête est une liste d'objectifs
   écrits avec ces événements.

Et deux règles de sauvegarde :
- **les identifiants sont stables et jamais réutilisés** (on ajoute en fin de liste, on ne renomme pas un id) ;
- **la sauvegarde a un numéro de version** et une migration pour chaque changement de forme.

Esquisse des types (indicative, les noms sont à valider) :

```ts
type Unlock = { level: number } | { quest: QuestId } | { project: ProjectId };

interface Item {            // tout ce qui va dans la grange
  id: ItemId;
  name: string;
  value: number;            // prix de vente au marchand, base des commandes
  xp: number;
}

interface Recipe {          // ce qu'une source de production sait faire
  id: RecipeId;
  inputs: Partial<Record<ItemId, number>>;
  outputs: Partial<Record<ItemId, number>>;
  minutes: number;
  unlock: Unlock;
}

interface Placeable {       // tout ce qui se pose sur la carte
  id: PlaceableId;
  name: string;
  kind: 'field' | 'pen' | 'machine' | 'tree' | 'deco';
  size: [number, number];
  price: number;
  unlock: Unlock;
  recipes?: RecipeId[];     // champ, enclos, machine, arbre
  maxCount?: number;        // par exemple 3 noisetiers
}

type FarmEvent =
  | { type: 'harvest' | 'collect' | 'produce' | 'deliver' | 'sell'; item: ItemId; count: number }
  | { type: 'place' | 'buy'; placeable: PlaceableId }
  | { type: 'clear'; obstacle: ObstacleId }
  | { type: 'order' }
  | { type: 'level'; level: number };

interface Objective { event: FarmEvent['type']; target?: string; count: number; text: string }
```

Le temps : toutes les fonctions de logique prennent l'heure `now` en paramètre. Rien ne tourne en arrière-plan :
une production est un `readyAt`, l'état se lit à l'ouverture. `MINUTE_MS` passe à 1 seconde en mode test
(comme la Maison), pour vérifier les minuteurs en quelques secondes.

Les **compteurs** (combien de blés récoltés, de vaches traites…) sont tenus une fois, à partir des événements :
les médailles et les statistiques les lisent, sans rien sauvegarder de plus.

---

## 6. L'interface

L'écran est la ferme en plein écran, avec un bandeau en haut et une barre en bas.

- **En haut** : le niveau et sa barre d'XP, les Éloisettes, les boosters.
- **En bas** : Grange · Commandes · Quêtes · Boutique · Aménager.
- **La carte** : on la fait glisser au doigt ; deux niveaux de zoom (pincer, ou un bouton sur PC).
- **Toucher un objet** ouvre une petite bulle à côté : les graines à semer, la file de la machine, le temps restant.
- **Glisser le doigt** depuis une graine (ou la faucille) sur les champs : semer / récolter en un geste.
- **Ce qui est prêt se voit** : une petite icône qui sautille au-dessus (sans animer d'ombres ni de filtres :
  sur téléphone, seulement des déplacements et de la transparence).
- **Le retour** : les produits ramassés volent jusqu'au bouton Grange, l'XP monte en petits chiffres,
  un passage de niveau montre tout ce qui vient de s'ouvrir.
- **Les tutos** : les premières quêtes de l'histoire montrent chaque geste ; plus un `?` comme tous les jeux du site.

Le rendu est un **canvas** (des centaines de cases et d'objets restent fluides sur téléphone) : les dessins sont
préparés une fois en images, puis posés ; on redessine seulement ce qui bouge.

**Direction artistique** : le style de la Maison (contour sombre, 3 tons, cosy, que préfère Eloise).

**Maquette jouable (15/11)** : https://claude.ai/artifact/HxYizKZdfMd3xedpfZQKqV (privée, à partager depuis son
menu Partager). Une ferme au niveau 6 dessinée en pixel art (tuiles de 16 px, contour sombre ajouté automatiquement
autour de chaque dessin), et trois habillages d'interface : **A · Bonbon** (les couleurs du site), **B · Bois et
papier**, **C · Autocollant** (le contour des dessins reporté sur l'interface). **Choisi par Flo le 15/11 : B · Bois et
papier** (barre du bas en planches, fiches et panneaux en papier kraft, vert pour les actions, police ronde Fredoka).
Le code de dessin de la maquette (sprites dessinés par programme, puis contour) est la base prévue pour `farmArt.ts`.

---

## 7. Le contenu du lot 1

Toutes les valeurs sont des points de départ.

### 7.1 Les cultures

Plus une culture est longue, moins elle rapporte **par minute**, mais plus elle rapporte **par visite** :
les courtes récompensent qui joue souvent, les longues se lancent avant de partir.

| culture | niveau | durée | graine | récolte | valeur | XP par récolte |
|---|---|---|---|---|---|---|
| Blé | 1 | 2 min | 1 🌰 | 2 | 1 | 0 |
| Maïs | 2 | 5 min | 2 🌰 | 2 | 3 | 0 |
| Carotte | 3 | 10 min | 3 🌰 | 2 | 4 | 1 |
| Tomate | 5 | 30 min | 5 🌰 | 2 | 8 | 1 |
| Fraise | 7 | 1 h | 8 🌰 | 2 | 12 | 2 |
| Tournesol | 9 | 2 h | 10 🌰 | 2 | 18 | 2 |
| Citrouille | 11 | 4 h | 15 🌰 | 2 | 28 | 3 |
| Coton | 13 | 8 h | 20 🌰 | 2 | 40 | 4 |

Les graines se paient en Éloisettes (décidé le 15/11).
Champs : 6 au départ, puis 6 + 1,3 par niveau gagné (24 au niveau 15) ; un champ coûte 15 🌰, puis 10 de plus
à chaque champ acheté.

### 7.2 Les animaux

| animal | niveau | enclos (3 × 3) | places | prix animal | mange | durée | donne |
|---|---|---|---|---|---|---|---|
| Poule | 2 | Poulailler, 60 🌰 | 6 | 20 🌰 | aliment pour poules | 20 min | Œuf (6) |
| Vache | 6 | Étable, 250 🌰 | 5 | 60 🌰 | aliment pour vaches | 1 h | Lait (14) |

### 7.3 Les machines

| machine (2 × 2) | niveau | prix | recettes |
|---|---|---|---|
| **Moulin** | 2 | 40 🌰 | aliment pour poules (2 blés + 1 maïs → 3, 5 min) · farine (3 blés → 1, 10 min, niv. 4) · aliment pour vaches (2 maïs + 1 carotte → 3, 10 min, niv. 6) |
| **Fournil** | 4 | 120 🌰 | pain (2 farines → 1, 30 min) · tarte aux carottes (1 farine + 2 carottes + 1 œuf, 45 min, niv. 5) · gâteau aux fraises (1 farine + 2 œufs + 3 fraises + 1 crème, 2 h, niv. 9) · tarte à la citrouille (1 farine + 1 citrouille + 1 œuf + 1 beurre, 3 h, niv. 11) |
| **Laiterie** | 7 | 200 🌰 | crème (1 lait, 20 min) · beurre (2 laits, 30 min) · fromage (3 laits, 2 h, niv. 12) |
| **Filature** | 14 | 400 🌰 | fil (2 cotons → 1, 1 h) · tissu (3 fils → 1, 3 h, niv. 15) |

La valeur d'un produit fabriqué = la valeur de ses entrées + 20 à 40 % ; les longues fabrications gagnent plus.

### 7.4 Les arbres

| arbre (2 × 2) | niveau | prix | donne |
|---|---|---|---|
| **Noisetier** (3 au plus) | 5 | 150 🌰 | ~35 % d'une commande moyenne de son niveau (±25 %), toutes les 4 h : ~35 au niv. 5, ~63 au niv. 10, ~175 au niv. 30 (16/11 ; avant : 5 à 10) |

### 7.5 La friche

| obstacle | taille | coût | XP | surprise |
|---|---|---|---|---|
| Buisson | 1 × 1 | 5 🌰 | 2 | parfois quelques Éloisettes |
| Souche | 1 × 1 | 15 🌰 | 4 | parfois un booster |
| Rocher | 1 × 1 | 25 🌰 | 5 | parfois un booster |
| Gros rocher | 2 × 2 | 60 🌰 | 12 | un booster |

Parcelles : 100, 200, 350, 550, 800… 🌰, chacune avec un niveau minimum.

### 7.6 Les décos (environ 15)

Barrière en bois, haie, parterres de fleurs (3 couleurs), chemin pavé, chemin de terre, banc, puits (2 × 2),
épouvantail, lanterne, brouette, pommier décoratif (2 × 2), tas de bûches, nichoir, petite mare (2 × 2).

### 7.7 Les villageois de l'histoire

De nouveaux personnages, propres à la ferme :
- **Marthe**, la fermière voisine, qui guide les débuts ;
- **Léon**, le meunier ;
- **Rosalie**, la fleuriste, pour les décos ;
- **Basile**, le charpentier, pour les grands projets.

### 7.8 Les premières quêtes (le tuto)

| # | qui | objectifs | récompense |
|---|---|---|---|
| 1 | Marthe | Récolter 6 blés | 20 🌰, 1 Engrais |
| 2 | Marthe | Semer 6 blés | 20 🌰 |
| 3 | Marthe | Servir 1 commande | 30 🌰 |
| 4 | Léon | Construire le Moulin · fabriquer 3 aliments pour poules | 40 🌰 |
| 5 | Marthe | Construire le Poulailler · acheter 2 poules · ramasser 2 œufs | 50 🌰, 1 Sablier |
| 6 | Basile | Dégager 3 obstacles | 40 🌰 |
| 7 | Rosalie | Placer 3 décos | 1 déco offerte (parterre de fleurs) |
| 8 | Léon | Fabriquer 2 farines | 50 🌰 |

Puis une vingtaine de quêtes jusqu'au niveau 15, une ou deux ouvertes à la fois, chacune annoncée par son villageois.

### 7.9 Le premier grand projet

**Le vieux pont** (Basile), ouvert au niveau 10 :
4 étapes de livraison (exemple : 15 pains, 10 beurres, 20 fraises, 5 tissus, plus des Éloisettes pour le bois).
Il ouvre **la rive**, à l'est : de nouvelles parcelles. Ce qui vivra sur la rive (étang, canards…) vient au lot 2.

### 7.10 Les tâches du jour

Tirées parmi des modèles débloqués : « récolter 20 cultures », « fabriquer 5 produits », « servir 3 commandes »,
« dégager 2 obstacles », « ramasser 6 produits d'animaux »… Chacune rapporte des Éloisettes et un booster ;
les 3 faites ouvrent un coffre.

---

## 8. Les lots

| lot | contenu |
|---|---|
| **1** | le moteur entier (terrain, objets posés, production, grange, commandes, niveaux, quêtes, projets, tâches du jour, médailles, boosters), le contenu de la section 7 |
| **2** | la rive : étang, canards, moutons et laine, arbres fruitiers, confiturerie, nouvelles décos, niveaux 16-25 |
| **3** | ruche et miel, verger, saisons et événements du calendrier, races rares à collectionner |
| **4+** | nouvelles zones et projets, beaucoup de décos, niveaux jusqu'à 50 |

Le lot 1 est gros parce qu'il contient **tout le moteur** : les lots suivants ne devraient presque ajouter que des
données et des dessins.

---

## 8bis. La durée de jeu (MESURE du 15/11, `node tools/farm-sim.mjs 120 <graine>`)

Le simulateur fait jouer une joueuse raisonnable (elle ramasse, sert les commandes, nourrit, lance les machines,
sème pour sa prochaine visite, achète ce qui s'ouvre, dégage la friche), avec le contenu de la section 7.
Moyenne de 4 tirages ; « j10 » = le dixième jour.

| profil | temps de jeu par jour | niveau 5 | niveau 10 | niveau 15 | pont terminé | heures de jeu jusqu'au niv. 15 |
|---|---|---|---|---|---|---|
| Posée (2 visites) | 25 min | j3 | j12 | **j44** | j47 | ~18 h |
| Régulière (4 visites) | 45 min | j2 | j9 | **j30** | j32 | ~22 h |
| Accro (11 visites) | 2 h 45 | j2 | j5 | **j15** | j19 | ~41 h |
| Accro + tous les boosters du plafond | 2 h 45 | j2 | j5 | **j15** | j19 | ~41 h |
| Accro + boosters **sans plafond** (pour comparer) | 2 h 45 | j1,5 | j2,6 | **j8** | j8 | ~22 h |

Ce que ça dit :
- **Le lot 1 dure environ un mois** en jouant 4 fois par jour, un mois et demi en jouant 2 fois.
- **Jouer plus va plus vite, mais rapporte moins par minute** : l'accro joue 3,7 fois plus longtemps chaque jour,
  mais ne va que 2 fois plus vite. C'est le rythme des commandes (la moitié de l'XP) qui freine, et on ne peut pas
  l'acheter.
- **Le plafond quotidien des boosters suffit** : tout acheter chaque jour ne change presque rien.
- Le premier jour, on atteint le niveau 4 ou 5 : de quoi avoir le Moulin, les poules et le Fournil.

À remesurer **après tout changement de contenu ou de prix**. Depuis le lot 1, le simulateur lit les tables de
`src/games/farm/data/` et les prix des commandes du jeu (son joueur modèle reste le sien). MESURE du 15/11 au soir,
graines 1 à 4, avec le contenu codé (le coffre du jour rapporte aussi 10 × niveau Éloisettes) : niveau 15 à j43-44
(posée), j28-29 (régulière), j14-16 (accro), j14-15 (accro + plafond), j7 (sans plafond). Ce qui n'est pas modélisé : les achats de
déco (ils ralentiront les joueuses qui décorent beaucoup), les quêtes de l'histoire (petites récompenses).

### La joueuse qui décore (MESURE du 15/11 au soir : niveaux sur les graines 1 à 4, paliers de Charme sur 1 et 2)

Le simulateur compte maintenant les **coups de cœur** (1 commande sur 8 dès le niveau 2 : Éloisettes doublées et un
colis), le **Charme** (commandes mieux payées, Gaston plus souvent), les **trésors** des colis posés dès qu'ils
arrivent (ils sont gratuits), et des profils qui mettent une part de ce qu'ils gagnent dans la déco : « mélange »
achète chaque déco à tour de rôle (on décore pour le joli), « chemins » achète le plus de charme par Éloisette.
Les décos ne prennent jamais plus de 40 % des terres.

| profil | niveau 15 | Charme 300 (« Ferme de rêve ») atteint |
|---|---|---|
| Posée | j41-44 | j9-11, **sans rien acheter** |
| Posée, 30 % en déco | j44-45 | j11 |
| Régulière | j29 | j9-12, **sans rien acheter** |
| Régulière, 15 % en déco | j27-30 | j5-7 |
| Régulière, 30 % en déco | j28-29 | j4-8 |
| Régulière, 50 % en déco | j31-32 | j9-10 |
| Accro | j14-15 | j7 |

Ce que ça dit :
- **Décorer ne coûte presque rien en durée** : jusqu'à 30 % des gains dans la déco, aucune différence mesurable ;
  à 50 %, 2 à 3 jours de plus sur un mois. Le Charme ne fait presque pas avancer non plus : il paie des Éloisettes,
  et c'est l'XP (le rythme des commandes) qui freine. Les coups de cœur, idem.
- **PROBLÈME (corrigé, voir plus bas) : le Charme ne récompensait pas la déco.** Toutes les joueuses finissaient « Ferme de rêve » en une à deux
  semaines sans acheter une seule déco (charme 700 à 1 900 en fin de lot, pour un dernier palier à 300) : chaque
  trésor compte, **doublons compris** (un nain 15, une arche 30, une fontaine 60), et il en tombe un tous les 4 colis
  environ. Second défaut : un chemin à 2 🌰 donne 1 de charme comme une barrière à 5 (plancher de 1), cinq fois plus
  rentable qu'une mare.
- **DÉCIDÉ par Flo le 15/11 et codé** (`totalCharm`, `data/charm.ts`) : un trésor ne compte que pour son premier
  exemplaire, une déco achetée rapporte exactement un dixième de son prix (un chemin 0,2, une mare 15 ; le total est
  arrondi en dessous). MESURE après, graines 1 à 4 : sans rien acheter, charme 105-165 (« Ferme charmante » au mieux,
  les trésors seuls) ; avec 15 à 30 % en déco, « Ferme de rêve » vers j8-11 (j11-15 pour une posée) ; à 50 %, j16-22 ;
  les chemins seuls n'y arrivent plus. Niveau 15 : j42-44 (posée), j28-30 (régulière, avec ou sans 30 % de déco),
  j31-32 (50 % de déco), j14-16 (accro). Dans la Boutique, un trésor déjà posé affiche « +0 : déjà sur la ferme ».

---

## 9. Les outils

- **Simulation de progression** (`node tools/farm-sim.mjs [jours] [graine]`, FAIT le 15/11) : 10 profils de
  joueuse (dont 5 qui décorent) et le jour où chacune atteint chaque niveau et chaque palier de Charme.
  `FARM_DETAIL=1` détaille d'où viennent l'XP et les Éloisettes, `ALL_LEVELS=1` montre tous les niveaux,
  `XP_TABLE="15,30,..."` essaie une autre table d'XP. Le Charme y suit la règle du jeu (`totalCharm`).
- **Planche des dessins** (extension de `tools/preview.mjs`) : tous les sprites de la ferme sur une image,
  pour les relire d'un coup.
- **Mode test** : `MINUTE_MS` à 1 seconde, et des boutons de triche locaux (comme le casino), à `false` avant
  chaque publication.

---

## 10. La structure du code (telle que codée le 15/11)

```
src/games/farm/
  data/            le contenu, un fichier par famille (ids stables, ajout en fin de liste)
    types.ts       ids, Unlock, Reward, FarmEvent, Objective
    items.ts  crops.ts  animals.ts  machines.ts  placeables.ts (bâtiments, arbres, décos, friche)
    land.ts  levels.ts  people.ts  quests.ts  projects.ts  daily.ts  medals.ts  boosters.ts
  fonts/           Fredoka (OFL, licence à côté), embarquée pour le hors-ligne
  farmSave.ts      le bloc 'farm' de la sauvegarde, sa version, ses migrations
  farmTime.ts      MINUTE_MS et les heures lisibles
  farmProduction.ts  le moteur des sources de production (semer, nourrir, file, ramasser)
  farmMap.ts       la grille, les parcelles, la friche, poser / déplacer / ranger
  farmOrders.ts    le tableau de commandes
  farmProgress.ts  XP, niveaux, isUnlocked, événements -> quêtes, projets, tâches, médailles
  farmBoosters.ts  boosters : stock, achat, effets
  farmJoins.ts     les pièces qui se raccordent (barrière, portillon) : skins, voisins, tronçon (section 16)
  farmScene.ts     le canvas : caméra, dessin, toucher et glisser
  farmVillage.ts   les villageois et Gaston sur la route (section 15), dessinés par la scène
  farmPaths.ts     les cases où l'on marche et le chemin le moins cher entre deux cases (section 22)
  farmStrollers.ts les promeneurs : visites, arrêts devant les décos, pourboire, option (section 22)
  farmArt.ts       les dessins (et son moteur de sprites, exporté)
  farmPeopleArt.ts les villageois en pied (côté, face, dos) et le vélo de Gaston
  farmHud.ts       bandeau et barre du bas
  farmPanels.ts    grange, commandes, quêtes, boutique, bulles
  farmScreen.ts    l'écran #/ferme : aiguille les touchers, fiches, bulles, et chaque action du joueur
  farmFeedback.ts  chiffres qui flottent, produits qui volent à la grange, pluie d'Éloisettes, bandeaux
  farmDialogs.ts   les cartes au milieu de l'écran, une à la fois (niveau, quêtes, aide, absence, colis)
  farmEditor.ts    le mode Aménager et la pose d'un objet acheté
  farmSeedSwipe.ts semer en glissant une graine de la rangée
  farmGateCall.ts  la pastille « X t'attend à l'entrée » quand la cour est hors de l'écran
  farmTestBar.ts   la barre TEST (seulement si CASINO_TEST_BUTTONS)
  farmHelp.ts      le tuto
```

`farmScreen.ts` a été découpé le 15/11 au soir (1 176 lignes -> 670) : ce qui se montre est sorti dans les fichiers
`farmFeedback`, `farmDialogs`, `farmEditor`, `farmSeedSwipe`, `farmTestBar` ; l'écran garde l'aiguillage et les
actions. Restent gros : `farmArt.ts` (~2 400 lignes de dessins) et `farmScene.ts` (~1 200).

La logique (`farmProduction`, `farmMap`, `farmOrders`, `farmProgress`, `farmBoosters`) ne touche jamais à l'écran :
elle se teste et se simule seule.

---

## 11. Décisions du 15/11 (anciennes questions ouvertes)

1. **La déco** est purement décorative au début ; le « Charme » pourra venir plus tard.
2. **Les graines** se paient en Éloisettes.
3. **On peut tourner les objets** (section 4.2).
4. **Des sons dès le lot 1** (récolte, pièces, niveau…, avec le kit du casino), à enrichir ensuite.
5. **Une grande tuile à part sur l'accueil**, comme la Maison.
6. **Le jeu doit durer, pas se finir en payant** : plafond quotidien de la boutique de boosters (4.8), durée mesurée
   en 8bis.

---

## 12. Ce que le lot 1 a tranché en le codant (15/11)

- **Le terrain** : la carte de 24 × 24, les 4 parcelles du centre au départ. Le ruisseau descend la colonne 18
  entre les lignes 5 et 18 puis repart vers l'est en haut et en bas : il entoure **la rive** (parcelles 7 et 11),
  que le vieux pont (cases 18,11 et 18,12) ouvre ; ses deux terrains coûtent 1 000 🌰 chacun, sans niveau.
  Les autres terrains : le prix et le niveau suivent le **nombre déjà acheté** (100 niv. 3, 200 niv. 4…), pas la
  parcelle. Un panneau sur chaque terrain voisin à vendre.
- **La friche de départ** : 20 obstacles tirés toujours pareil (graine 77) hors du centre ; 10 par terrain acheté.
  Le gros rocher donne toujours un booster ; un buisson parfois 2 à 6 🌰.
- **La ferme neuve** : 50 🌰 et 6 champs de blé **déjà mûrs** : la première quête commence par récolter.
- **Les machines** : la file ne compte que ce qui est en cours ; ce qui est fini attend sur le plateau sans limite
  et ne bloque rien. Toucher une machine dont le plateau est plein ramasse ; sinon sa bulle s'ouvre.
- **Les enclos** : toucher ramasse ce qui est prêt, sinon nourrit tous ceux qui ont faim (s'il y a de l'aliment),
  sinon ouvre la bulle. Un nouvel animal arrive affamé. Un enclos de chaque sorte au lot 1 (`maxCount` 1).
- **Le sablier** : sur une machine, toute la file avance d'une heure ; sur un enclos, **chaque animal occupé**
  gagne une heure (le simulateur ne le compte que par animal : plus généreux en vrai, plafonné à 3 par jour).
- **Les décos** : seule une déco **achetée** compte pour les quêtes et la médaille « Décoratrice » (ranger puis
  reposer ne compte pas). Poser un champ ou une déco propose aussitôt le suivant juste à côté.
- **Les quêtes** : 30 quêtes jusqu'au niveau 15 (+ la rive), deux ouvertes au plus, dans l'ordre de
  `data/quests.ts` ; une quête d'objets se compte **à partir de son ouverture**, une quête « avoir » (`own`) lit la
  ferme telle qu'elle est.
- **Les tâches du jour** : tirées par la date (les mêmes toute la journée), parmi celles que la ferme peut faire ;
  payées d'elles-mêmes, le coffre s'ouvre d'un bouton.
- **Les médailles** : 9 (cultures, œufs, lait, fabrications, commandes, friche, décos, noisetiers, Éloisettes
  gagnées), payées d'elles-mêmes à chaque palier.
- **Les boosters gagnés ailleurs** : un niveau fini dans un autre jeu donne une chance sur 3, deux par jour au plus,
  seulement si la ferme a déjà été ouverte (`rollGameBooster`, appelé par `companion/reward.ts`).
- **Les villageois** : les 4 de l'histoire + Jules, Capucine, Gaston, Mme Pivoine, qui passent commande.
- **La police** : Fredoka (SIL OFL 1.1, Google Fonts), le seul sous-ensemble latin, embarquée dans le projet avec sa
  licence (`src/games/farm/fonts/OFL.txt`).

À regarder au premier vrai test (non vérifié sur téléphone) : la lisibilité des pousses (« sprout » se voit peu sur
la terre), le pincement à deux doigts, la place des bulles sur un petit écran, le son.

### Premier test de Flo sur téléphone (15/11 au soir)

- **Les graines** : plus de bulle au-dessus du champ (elle cachait les champs). Une rangée de graines s'ouvre en bas,
  au-dessus de la barre : par l'onglet « Graines », ou en touchant un champ vide (qui devient le champ choisi).
  On fait glisser une graine sur les champs vides ; toucher une graine sème le champ choisi.
- **Pas d'étiquettes sur la carte** (« Terrain » partout cassait le côté mignon) : seuls les panneaux en bois
  dessinés, qu'on touche pour leur prix ; le vieux pont se touche directement.
- **Passe graphique** (critique de Claude validée par Flo) : sol plus chaud et varié, lisière organique de la ferme,
  forêt dense tout autour de la carte (marge `GROUND_MARGIN` de 6 cases), fougères dehors et ronces sur les buissons
  à dégager, ombre sous tout objet posé, champs voisins raccordés en une parcelle labourée, papillons, ombre
  d'oiseau, blé mûr qui ondule, fumée des cheminées qui travaillent, reflets du ruisseau (tout se coupe avec
  « réduire les animations »), boutons latéraux plus petits, noisette peinte sur les panneaux.
- **Sortir de l'achat d'une déco** (retour de Flo) : le bouton n'est plus dans le bandeau du haut, loin du pouce et
  vert comme « Acheter », mais dans la rangée sous l'objet, à gauche : « Annuler », puis « Fini » dès qu'un objet
  est posé (on pose souvent en rangée). Le bandeau ne garde que la consigne.

---

## 13. Le côté « ça pète » et les colis de Gaston (15/11 au soir, demande de Flo : gacha, envie d'y retourner)

**Les effets** (plan A) : grains qui jaillissent à la récolte, compteur « ×N ! » qui grandit pendant un glissé de
récolte (avec la note qui monte), pluie d'Éloisettes vers la bourse quand on livre une commande, confettis au passage
de niveau et sur les colis épiques/légendaires, un cœur quand on touche un enclos, « bientôt : … » sous la barre d'XP
(ce que le niveau suivant ouvre). Rien ne clignote ; seulement des déplacements et de la transparence.

**Les colis** (plan B, `data/parcels.ts`, `farmParcels.ts`) :
- Gaston passe toutes les **4 h** ; la boîte aux lettres garde **3 colis** au plus de ses tournées (il revient une
  tournée après qu'elle a de la place). Chaque **niveau** et le **coffre du jour** donnent aussi un colis (ceux-là
  rentrent toujours). Une ferme neuve, ou d'avant les colis, reçoit **un colis de bienvenue**.
- Ouvrir : le colis tremble au toucher, puis s'ouvre dans la couleur de sa rareté. Raretés : commun 62 %, rare 28 %,
  épique 8,5 %, légendaire 1,5 % ; **jamais 10 colis de suite sans un rare au moins** (`PITY`).
- Contenu : commun = Éloisettes (20 + 10 × niveau) ou petits boosters ; rare = arrosoir, lot de boosters, ou une déco
  rare (nain de jardin, bottes de foin, table à thé) ; épique = arche fleurie, balançoire, poule rousse, vache à
  taches roses ; légendaire = fontaine dorée, poule dorée.
- **Les trésors** (décos et animaux rares) se trouvent d'abord dans un colis : ils remplissent l'**album** (onglet des
  Quêtes), qui montre en silhouette ce qui manque. **Une déco-trésor trouvée s'achète ensuite** dans la Boutique,
  autant de fois qu'on veut, en Éloisettes (demande de Flo, 16/11 : la déco est faite pour être posée en plusieurs
  exemplaires) : rare 60, épique 150, légendaire 400 (`data/placeables.ts`) ; les copies ne rapportent pas de charme
  (règle du premier exemplaire). Avant, un trésor posé laissait un « Acheter » à 0 🌰 sur le fantôme suivant (copies
  gratuites à l'infini). Les animaux rares restent introuvables ailleurs que dans les colis. Un animal rare va dans l'enclos de son espèce s'il y a de la place, sinon
  il attend dans la Boutique (onglet Animaux) ; il donne parfois un produit de plus (30 %, 50 % pour la poule dorée).
- **Les colis ne s'achètent pas** avec les pièces du site : la ferme ne doit pas s'acheter.
- MESURE (simulateur, graines 1 à 4, colis ouverts à chaque visite) : la durée ne bouge presque pas (niveau 15 à
  j43-44, j28-30, j14-16) : les colis font plaisir sans raccourcir le jeu.

Prochaines idées notées, non faites : récoltes dorées rares (album), cadeau de première visite du jour (calendrier
de 7 cases qui ne se perd pas), visiteurs spéciaux, musique (Flo peut en générer avec Suno).

### Musique et volumes (15/11 au soir)

Quatre morceaux générés par Flo avec Suno (offre payante) : deux pour le jour (7 h à 19 h), deux pour le soir,
joués l'un après l'autre avec un fondu de 2,5 s (`farmMusic.ts`, provenance dans `src/games/farm/music/CREDITS.md`).
Convertis des WAV d'origine (20 Mo) en MP3 96 kb/s (1,3 Mo chacun) avec lamejs, hors du projet. La musique passe par
Web Audio : sur iPhone, Safari ignore le volume d'un élément audio. Elle démarre au premier toucher (règle des
navigateurs) et se met en pause quand l'onglet est caché. Le menu « ⋯ » a deux curseurs : **Musique** (propre à la
ferme) et **Effets** (le volume du kit de sons, valable pour tout le site ; 0 = coupé).

### Zoom continu (15/11 au soir, demande de Flo)

Le zoom n'est plus à deux crans : le pincement suit les doigts (le point entre eux reste sous eux, on zoome et on se
déplace d'un même geste), la molette zoome autour du curseur, et le bouton du menu glisse en douceur entre vue
proche (12 cases) et vue d'ensemble (22). Les pixels ne sont plus à l'échelle entière : sur téléphone (2 à 3 pixels
d'écran par point) ça ne se voit pas. La forêt autour de la carte passe à 12 cases (`GROUND_MARGIN`) et le dézoom
s'arrête avant d'en sortir.

---

## 14. Deuxième autocritique, tout validé par Flo (15/11 au soir)

- **Batterie** : la carte ne se redessine plus 60 fois par seconde quand rien ne bouge. Pleine vitesse pendant un
  geste et 3 s après, ou tant qu'une particule vole ou que le zoom glisse ; 20 images/s quand la ferme vit seule
  (animaux, papillons) ; 8 après une minute sans toucher ; 1 page cachée (`farmScene.schedule`). Toute action
  (`commit`) réveille la carte.
- **Netteté** : après un pincement, la molette ou le bouton, le zoom se pose sur l'échelle la plus proche où un
  pixel du dessin couvre un nombre entier de pixels d'écran : fluide pendant le geste, net au repos.
- **PC** : barre de niveau limitée en largeur, onglets resserrés au centre, main au survol de ce qui se touche,
  clavier : flèches, ZQSD ou WASD pour se déplacer (Maj = plus loin), + et - pour zoomer, Échap ferme ce qui est
  ouvert (bulle, graines, fiche, Aménager).
- **Commandes** : plus variées (panier de 0,45 à 1,55 fois la taille habituelle, même moyenne ; un plafond tiré de
  4 à 12 par produit), chaque villageois dit un petit mot (`people.ts`), et dès le niveau 2, **une commande sur 8
  environ est un « coup de cœur »** : Éloisettes doublées et un colis de Gaston.
- **Gaston se présente** au premier colis, avant qu'on l'ouvre.
- **« Pendant ton absence… »** : après 20 min d'absence, une carte dit ce qui a mûri, produit, été fabriqué,
  donné, les colis déposés, les nouvelles commandes et les nouvelles tâches du jour.
- **Le Charme** (`data/charm.ts`) : chaque déco posée ajoute du charme (un dixième de son prix depuis le 15/11 au
  soir, voir 8bis ; trésors : rare 15, épique 30, légendaire 60, **le premier exemplaire seulement** ; les décos
  rangées ne comptent pas). Six paliers, de « Ferme toute
  simple » à « Ferme de rêve » (0, 20, 50, 100, 180, 300) : Gaston passe toutes les 4 h puis jusqu'à 2 h 45, et les
  commandes paient jusqu'à +15 %. Affiché dans la Boutique (onglet Déco, « +N de charme » sur chaque carte) et dans
  le bandeau d'Aménager.
- **Le soir à l'écran** : lumière dorée vers 18 h 30, bleutée la nuit (21 h 30 à 5 h), rose à l'aube ; les
  lanternes brillent la nuit et les papillons deviennent des lucioles. L'interface n'est pas teintée. TEST : bouton
  « Heure +3 h ».
- **Album** : médaille « Collectionneuse » à 3, 6 et 9 trésors (l'or à l'album complet).
- Non modélisé dans le simulateur : coups de cœur et Charme (ils accélèrent un peu une joueuse qui décore).

### Troisième autocritique (15/11 au soir)

- **La nuit suit la saison** : lever et coucher du soleil calculés au jour de l'année (environ 17 h 15 en décembre,
  21 h 50 en juin, `sunHours` dans `farmScene.ts`) ; doré juste avant le coucher, bleu nuit 1 h 30 après ; nuit
  plus marquée qu'avant.
- **La boîte aux lettres est garantie** : une ferme sans case libre la reçoit à l'entrée, juste hors de ses terres.
- **Premier lancement** : l'aide prend le style de la ferme (plus le rose du site), plus courte, puis Marthe.
- **`node tools/farm-check.mjs`** : 17 vérifications (19 depuis le village, section 15) de la logique sans écran (sauvegarde et migration des vieilles
  fermes, boîte aux lettres d'une ferme pleine, rien ne se chevauche, champ / machine / enclos, règle de pitié,
  raretés, races alignées, album, boîte qui ne dépasse pas 3, commandes). À lancer après chaque changement de logique.

---

## 15. Le village sur la carte (15/11 au soir)

- **La route du village** monte de la forêt, au sud, par la colonne 12 (`ROAD_COLUMN`, `data/land.ts`) et s'arrête au
  bord sud de la ferme, où elle s'élargit en une petite cour (`gateTile`, `farmMap.ts`). Au sud parce qu'un téléphone
  tenu droit montre toujours le bord sud de la ferme ; à l'ouest, l'entrée tombait juste hors de l'écran. Quand on
  achète le terrain du sud, l'entrée descend avec le bord. Rien de sauvage ne pousse sur la route ni dans la cour.
- **Les villageois viennent chercher leur commande** (`farmVillage.ts`) : seulement quand elle **peut être livrée**
  (on a tout dans la grange), trois au plus à la fois, une seule fois chacun (deux commandes ne viennent jamais du
  même villageois : `rollOrder` tire parmi ceux qui n'en ont pas). Ils attendent dans la cour, face à nous, avec la
  bulle de ce qu'ils veulent (un cœur pour un coup de cœur). Les toucher ouvre les Commandes. Livrés, ils repartent
  par la route avec un panier ; si la commande ne peut plus être livrée (on a vendu ou utilisé ce qu'il fallait), ou
  qu'on la change, ils repartent les mains vides. À l'ouverture de la ferme, ceux qui peuvent être servis sont déjà
  là ; les suivants montent la route.
- **Gaston à vélo** : quand il dépose un colis pendant qu'on joue, il monte la route jusqu'à la boîte aux lettres
  (là où on l'a mise), s'arrête un instant tourné vers elle, et redescend.
- **Les dessins** (`farmPeopleArt.ts`) : les 8 villageois en pied, vus de côté, de face et de dos, deux pas de marche
  chacun, avec les mêmes cheveux, chapeaux et couleurs que leurs visages ; le vélo jaune de Gaston dans les trois vues.
- Rien n'est sauvegardé : les marcheurs se recalculent à partir des commandes. Avec « réduire les animations », ils
  apparaissent directement à leur place et Gaston ne passe pas. Un marcheur garde la carte à 20 images/s (pas de
  ralenti à 8 tant que quelqu'un marche).
- `farm-check` : 20 vérifications (+ l'entrée qui suit le bord sud, une commande par villageois, la règle du Charme).
- **La cour hors de l'écran** (sur PC, ou une fois le terrain du sud acheté) : tant que des villageois y attendent, une
  pastille au bord de la carte le dit (« Marthe t'attend à l'entrée ▼ », `farmGateCall.ts`) ; la toucher fait glisser
  la carte jusqu'à la cour (`FarmScene.glideTo`). Un doigt sur la carte reprend la main. Pour ne pas cacher la ferme
  tant qu'ils attendent, elle ne dit sa phrase que 4 s à l'arrivée d'un villageois, puis se réduit au visage, au
  nombre et à la flèche (environ 70 px) ; cachée aussi pendant une fiche, la rangée de graines et Aménager.
- **Les bulles des objets** (moulin, enclos, champ) se posent dans la carte vraiment visible, entre le bandeau du haut
  (et la quête) et la barre du bas (`visibleBand` dans `farmScreen.ts`) : au-dessus de l'objet si elles y tiennent, sinon en dessous, sinon
  du côté le plus grand, en défilant à l'intérieur. Avant, une bulle haute pouvait passer sous le bandeau.

---

## 16. Les décos qui vont ensemble (VALIDÉ par Flo le 15/11, à faire dans une conversation dédiée)

Retour de Flo : « les barrières sont moches et ne se clipsent pas ensemble » ; il veut des décos qui interagissent bien,
par exemple une torche posée SUR une barrière. MESURE du 15/11 : chaque déco est un dessin seul qui ignore ses voisines ;
la barrière n'a que deux dessins (face, profil, `fence()` dans `farmArt.ts`) qui ne se raccordent pas ; une case ne porte
qu'un objet, rien ne se pose sur un autre.

Plan validé, dans cet ordre :
1. **Raccord automatique** de la barrière, de la haie et des chemins : chaque case regarde ses 4 voisines de la même
   famille et choisit sa forme (bout, ligne, angle, T, croisement : 16 cas par masque de voisins, dessinés par code,
   poteaux aux angles et aux bouts), plus un **portillon**. La rotation manuelle n'a plus de sens pour ces familles.
2. **Décos posées sur d'autres** : un emplacement « dessus » pour de petites décos (lanterne ou torche sur un poteau
   de barrière, pot de fleurs sur un banc ou le puits, nichoir sur un poteau). Touche la donnée (une déco dit ce qu'elle
   porte et où elle se pose), la sauvegarde (un objet porté par un autre) et Aménager (déplacer le support emporte ce
   qu'il porte). Le plus gros morceau.
3. **Une passe de style commune** : mêmes bois, mêmes contours, même échelle pour barrière, banc, nichoir, brouette.

Méthode : rendu de goût, donc d'abord une planche de 2 ou 3 styles de clôtures assemblées, que Flo choisit à l'œil
(`artBoard()` de `farmArt.ts`), puis le code.

**Planche du 15/11 au soir, choix de Flo : LES TROIS, en skins.** A barrière de ranch (un poteau par case, deux
lisses), B piquets blancs « cottage » (poteau à boule aux angles et aux bouts seulement), C plessis tressé (rondins
aux angles et aux bouts). Raccord par masque de voisins (N 1, E 2, S 4, O 8) ; chaque case est un dessin de 16 x 24
sans marge, dont le bas est celui de la case ; une voisine au nord donne une lisse qui monte vers son poteau ; le
portillon a ses deux poteaux et se raccorde à l'est et à l'ouest.

**Les skins, modèle validé par Flo et codé (15/11 au soir, non joué sur téléphone).**
- Une seule « Barrière en bois » en boutique, plus un **Portillon** (15 Éloisettes, niveau 1) de la même famille.
  Chaque pièce posée garde son skin (`PlacedObject.skin`) ; sans skin = le premier de la famille (Ranch) : les
  vieilles barrières deviennent des ranchs, et leur rotation est remise à zéro au chargement.
- Les skins (`data/skins.ts`) : Ranch au niveau 1, **Piquets blancs au niveau 4, Plessis tressé au niveau 8** (choix
  de Flo : par niveau, pas par les colis). L'annonce de niveau dit « Style de barrière : … ».
- **Ne se raccordent qu'entre même skin** (`farmJoins.ts` : `joinIndex`, `joinMask`).
- **Le bouton Style** remplace « Tourner » sous une barrière : il passe au style ouvert suivant. Sur une barrière
  posée (Aménager), tout le tronçon raccordé change d'un coup (`restyleRun`) ; à l'achat, les suivantes le prennent
  (`FarmSave.lastSkins`). Un seul style ouvert : le bouton dit lequel vient et à quel niveau.
- Le portillon dans une rangée nord-sud se voit de profil : un panneau plus large que la rangée, entre deux poteaux
  courts. La pièce juste au sud d'un portillon fait monter sa lisse seulement jusqu'à son pied (`JOIN_NORTH_GATE`),
  sinon elle le cachait.
- Vérifié : `farm-check` (7 vérifications de plus, 27 au total), captures de la carte, de la planche et du mode achat.
- Publié le 15/11 au soir (commit 033e2e7, sans entrée Nouveautés, choix de Flo).
- **Fin de l'étape 1 (15/11 au soir, non joué)** : la haie et les deux chemins se raccordent aussi, chacun avec son
  espèce (familles `hedge`, `pathDirt`, `pathStone`, sans skins : `joinKey` = le skin, ou la famille quand elle n'en a
  pas). Haie : le dessus feuillu continue chez les voisines, la face avant seulement là où la haie s'arrête au sud,
  bouts arrondis. Chemins : bord usé et coins arrondis là où aucun chemin de la même espèce ne continue ; un chemin
  (objet plat) est posé pile sur sa case, sans le pixel de décalage des objets debout. Pas de bouton Tourner ni Style
  pour eux. farm-check : 37.

**Étape 2 : les décos posées sur d'autres, modèle validé par Flo et codé (15/11 au soir, non joué sur téléphone).**
- **Qui se pose dessus** (`perches`) : la Lanterne et le Nichoir (par terre, ils gardent leur pied ; posés, seule la
  tête se dessine, `perchedSprite`), et le **Pot de fleurs** (nouveau, niveau 3, 15 Éloisettes).
- **Qui porte** (`carries`) : la barrière (pas le portillon), le banc, le puits, le tas de bûches. Un seul objet par
  support. Où il s'assoit : `seatOf` dans `farmArt.ts`, par support, vue et skin. Un piquet blanc ou un plessis qui
  porte quelque chose se dessine avec un poteau (`JOIN_CARRIES`).
- **Sauvegarde** : `PlacedObject.on` = l'uid du support ; l'objet posé garde la case du support (recopiée par
  `moveObject`, seul endroit qui déplace) et n'en occupe aucune (`objectAt` l'ignore). Au chargement, un objet dont
  le support a disparu, ne porte pas ou porte déjà autre chose part au rangement (`settlePerches`).
- **Pose** : le fantôme d'un objet posable s'accroche au support libre de la case survolée (vert sur la case du
  support), sinon il va par terre. Après une pose sur un support, le fantôme suivant va sur le support libre le plus
  proche (4 cases au plus), sinon par terre.
- **Aménager** : toucher le dessin de l'objet posé le choisit (avant son support) ; déplacer un support l'emporte ;
  ranger un support le range aussi (« Banc et pot de fleurs : rangés »).
- Vérifié : `farm-check` (7 de plus, 34 au total), captures de la carte et du fantôme accroché.
- **Reste** : l'étape 3 (passe de style commune) ; d'autres objets posables ou porteurs plus tard (torche, arrosoir,
  bottes de foin comme support...).
- **Retours de Flo, faits avec l'étape 2** : un **appui long** (450 ms) sur un objet hors d'Aménager ouvre Aménager avec
  cet objet choisi, et le même doigt le fait glisser (`SceneEvents.longPress`, `FarmEditor.arrange`). Sur un support
  qui porte quelque chose, l'appui long sur le dessin de l'objet posé prend l'objet posé. Le bouton **Fini**
  d'Aménager quitte le bandeau du haut pour le bas de l'écran, au-dessus des onglets ; le bandeau ne garde que la
  consigne, et les boutons d'un objet choisi s'arrêtent au-dessus de Fini.

**Étape 3 : l'overhaul graphique, validé par Flo et fait (15/11 au soir, non joué sur téléphone).** Retour d'Éloïse et
de Flo : « la fontaine ultra légendaire est un peu moche », puis « à appliquer sur TOUT ».
- **La fontaine** : la « royale » choisie sur planche (A, contre B en cœur) : grand bassin rond à panneaux bordé d'or,
  vasque haute, cygne doré dont le jet retombe dans la vasque, deux cascades, nénuphars et pièces.
- **L'eau ne prend plus de contour** : `sprite(..., glaze)` peint une couche après le contour (jets, cascades, reflets
  de la mare) ; sinon un filet d'eau d'un pixel devenait une chaîne de perles.
- **La recette commune** (« boîte à outils » en tête des bâtiments dans `farmArt.ts`) : une seule lumière en haut à
  gauche, 3 ou 4 tons par matière (`Tones`), toits en tuiles écailles (`tiledRoof`) avec un avant-toit épais et son
  ombre (`eave`), pignons à bordures claire / sombre (`tiledGable`), pierres chaudes taillées (`stones`), fenêtres en
  creux avec reflet et jardinière (`framedWindow`), portes en planches au haut arrondi (`plankDoor`).
- **Refaits** : les six bâtiments, face et profil (fournil à colombages, moulin à galerie, laiterie à clins blancs,
  filature, poulailler en planches, étable à foin dans le grenier et lanterne), la clôture des enclos au style ranch,
  le banc (fer forgé), le puits (toit en tuiles, seau cerclé, mousse), l'épouvantail (rapiécé, un corbeau), la brouette
  fleurie, le tas de bûches, la mare (pierres, grenouille, massettes), les parterres (bordure de cailloux), le nichoir,
  la haie (touffes, fleurs blanches), les obstacles sauvages (volume, mousse, champignon).
- **Gardés** : les trésors (dessinés avec soin dans une passe précédente), les arbres, la boîte aux lettres.
- Planches de choix : fontaines, puis fournil et moulin avant / après (validés à l'œil par Flo).

---

## 17. Le Moulin débordé : les aliments partent dans leur propre machine (GO de Flo le 16/11, à coder)

Retour de Flo et Eloise (16/11) : le Moulin est presque le seul goulot, il fait trop de choses et trop lentement.
Eloise ne veut rien de précis, « juste du contenu » : de la production, des machines, des animaux, des trucs à cliquer.

**Le calcul du 16/11** (vers le niveau 7, tout en continu) : 6 poules = 30 min de Moulin par heure, 5 vaches = 17,
le Fournil = 20 à 40 ; **70 à 90 min de travail pour 60**, avec une file de 2 places. Chaque animal du lot 2 ajouterait
son aliment au même Moulin.

**Décidé** :
- une **nouvelle machine des aliments, la Cookiterie** (nom choisi par Flo le 16/11) au **niveau 2**, avec les
  poules : **Cookie pour poules**, puis **Cookie pour vaches** (niv. 6), puis un cookie pour chaque animal à venir.
  Seuls les noms affichés et les icônes changent (un cookie rond avec la tête de l'animal dessus, simple : idée de Flo du 16/11) ; les ids `chickenFeed` / `cowFeed`
  restent (sauvegardes). La quête de Léon le meunier passe au Moulin (niv. 4) : qui présente la Cookiterie est à
  décider en codant ;
- le **Moulin passe au niveau 4** avec le Fournil et ne fait plus que la **farine** (plus tard : d'autres ingrédients) ;
- la quête « Le moulin de Léon » est à revoir (elle demande le Moulin puis 3 aliments pour poules) ;
- les vieilles sauvegardes gardent leur Moulin ; un aliment en cours dans le Moulin se termine ; la nouvelle machine
  s'achète ;
- **ne pas accélérer le jeu** : simulateur avant / après ; si le niveau 15 arrive nettement plus tôt (> ~10 %),
  compenser sur la table d'XP, jamais en remettant de l'attente ;
- ensuite, le **lot 2 refait autour de la production** (animaux, machines, arbres fruitiers, 2e et 3e exemplaires des
  machines, production glissée dans les niveaux 7 à 15, niveaux jusqu'à 30) : la rive passe après.

**CODÉ le 16/11 (non commité, vu en capture, pas joué sur téléphone)** :
- `cookiery` (id neuf en fin de `MachineId`), « Cookiterie », niv. 2, 40 🌰 ; Moulin niv. 4, 60 🌰, farine seule.
- Fournées de la section 18 : Cookie pour poules 4 blés + 2 maïs → 6 en 10 min ; Cookie pour vaches 3 maïs + 2 carottes
  → 5 en 15 min (1 XP la fournée). Icônes : un cookie rond, la tête de l'animal glacée dessus.
- Dessin : maisonnette au toit rose, grand cookie dans le toit, cheminée du four à gauche (fumée quand elle cuit) ; de
  profil, une enseigne-cookie pendue à une potence (sinon jumelle du Fournil).
- Quêtes : **Marthe présente la Cookiterie** (quête `cookiery`, niv. 2, après la 1re commande : la construire, faire 6
  cookies pour poules, 40 🌰 / 8 XP) ; « Des poules ! » vient après elle. **Léon arrive au niv. 4** : la quête `mill`
  (id gardé) = construire le Moulin + 2 farines (60 🌰 / 12 XP), elle absorbe l'ancienne quête « De la farine »
  (`flour`, supprimée : une sauvegarde qui l'avait l'oublie sans dommage) ; « Le fournil » vient après `mill`.
- Vieilles sauvegardes : leur Moulin reste ; un aliment en cours dedans se termine (il rend la fournée au nouveau
  compte) ; la quête de Marthe s'ouvre et les guide vers la Cookiterie, sa récompense rembourse l'achat. Cas laissé :
  une partie arrêtée au milieu de l'ancienne quête du Moulin (niv. 2-3) la voit devenir « Moulin + 2 farines » et
  attend le niv. 4.
- Tâche du jour « Fabriquer N produits » : demande la Cookiterie (plus le Moulin). Textes « se fabrique au Moulin »
  (enclos, toast, aide) → « se font à la Cookiterie ».
- **Rythme (MESURE du 16/11, graines 1 à 4, moyenne du niv. 15)** : avant posée j43,4 / régulière j29,0 / accro j15,4 ;
  Cookiterie seule j40,0 / j26,3 / j14,1 (8 à 10 % plus tôt) ; **+10 % d'XP du niv. 6 au 15** (`350 530 750 1050 1760
  3190 4070 4950 5830`) → j44,1 / j28,1 / j15,0. Écrit dans `levels.ts`. farm-check : 40.

---

## 18. Le lot 2 « production », chiffré (16/11, proposé à Flo, rien de codé)

Demande d'Eloise : « juste du contenu », de la production. MESURE du 16/11 : simulateur sur une COPIE du jeu
(toutes les tables, entrées des recettes comprises : [ferme-lot2-tables.mjs](ferme-lot2-tables.mjs), un script qui les écrit dans le `data/` d'une COPIE, jamais du jeu), graines 1 à 4, 200 jours.

### Ce qui arrive, niveau par niveau (le lot 1 en gris dans le jeu reste tel quel)

| niv. | nouveau |
|---|---|
| 2 | **Cookiterie** (40 🌰) : Cookie pour poules (4 blés + 2 maïs → 6, 10 min) |
| 4 | Moulin (60 🌰), farine seule |
| 6 | Cookie pour vaches (3 maïs + 2 carottes → 5, 15 min) |
| 8 | **Betterave** (20 min) · **Mouton** (Bergerie 350, 5 places, 2 h → laine) · cookie mouton |
| 9 | **Sucrerie** (250) : sucre (2 betteraves, 20 min) |
| 10 | **Cochon** (Porcherie 450, 3 h → truffe) · **Pressoir** (300) : jus de carotte, jus de tomate |
| 11 | **Confiturerie** (350) : confiture de fraises |
| 12 | **Abeilles** (Rucher 400, 4 colonies, 3 h → miel ; cookie abeille = 1 tournesol + 3 blés) |
| 13 | Filature avancée du 14 au 13 : pelote de laine (2 laines) |
| 14 | **Confiserie** (450) : bonbons au miel |
| 15 | sucette à la fraise, jus de fraise |
| 16 | **Chèvre** (Chèvrerie 600, 1 h 30 → lait de chèvre) · fromage de chèvre (Laiterie) |
| 17 | **Myrtille** (1 h 30) · confiture de myrtilles · tarte aux myrtilles |
| 18 | **Atelier de couture** (600) : écharpe |
| 19 | **Canard** (Mare aux canards 700, 6 places, 2 h 30 → plume) · coussin (tissu + 3 plumes) |
| 20 | **Glacier** (700) : glace à la fraise · pull |
| 21 | **Lavande** (6 h) · glace au miel |
| 22 | **Savonnerie** (800) : savon à la lavande · glace à la myrtille |
| 23 | **Lapin** (Clapier 850, 6 places, 4 h → laine angora) |
| 24 | pelote angora · nougat · bougie au miel |
| 25 | **Crêperie** (900) : crêpes |
| 26-30 | doudou lapin, crêpes à la confiture, crêpes au miel, pizza, galette aux truffes, gâteau à étages, panier gourmand |

En tout : **+6 animaux (8), +9 machines (13), +3 cultures (11), +36 recettes (48), niveaux jusqu'à 30.** Chaque
animal mange SON cookie (cookie rond à sa tête) ; **une fournée de cookies nourrit un enclos entier** (une fournée par
enclos et par visite). Valeurs : un produit vaut ses entrées + 30 % environ (`ferme-lot2-tables.mjs`).

### Le rythme (table d'XP proposée : niveaux 6 à 15 × 1,4, puis 7 500 + 250 par niveau)

`15 30 50 80 200 450 670 950 1330 2240 4060 5180 6300 7420 7500 7750 … 11000`

| profil | niv. 15 avant | niv. 15 après | niv. 20 | niv. 25 | niv. 30 |
|---|---|---|---|---|---|
| Posée (2 visites) | j43 | **j44** | j76 | j106 | **j144** |
| Régulière (4 visites) | j29 | **j27,5** | j46,5 | j65 | **j91** |
| Accro (11 visites) | j15 | **j13** | j23,5 | j33 | **j43** |

- Sans toucher à l'XP, le lot 2 accélérait le niveau 15 de 20 à 25 % (plus de choses à vendre) : la table le compense
  (l'accro reste 13 % plus rapide, la posée et la régulière au rythme d'aujourd'hui).
- **Aucune machine ne sature** (régulière et accro, 100 jours) : Cookiterie 23-24 % du temps avec les 8 animaux,
  Filature 31-35 %, Fournil 25-34 % ; Confiserie, Glacier, Savonnerie, Crêperie peu utilisées par le joueur modèle
  (2-6 %) : à surveiller.
- La Cookiterie SEULE (sans le reste du lot 2) accélérait le niveau 15 de 7 à 11 % ; + 10 % d'XP du niveau 6 au 15
  la ramenait au rythme d'aujourd'hui.

### Ce qui coûte (les dessins)

6 animaux (et leurs vues), 6 enclos, 9 machines de face et de profil, 3 cultures (étapes de pousse), ~45 icônes
d'objets dont 8 cookies. **Découpage proposé** : lot 2a = niveaux 2 à 15 (Cookiterie, mouton, cochon, abeilles,
betterave, Sucrerie, Pressoir, Confiturerie, Confiserie), lot 2b = niveaux 16 à 30.

### VALIDÉ par Flo le 16/11 : les lots 2a et 2b, plus quatre ajouts (à chiffrer en codant)

Le simulateur ne sait jouer ni les arbres fruitiers, ni les exemplaires multiples, ni la charrette : il faut lui
apprendre (dans `tools/farmSim.ts`) en même temps que le jeu, puis mesurer. Chiffres ci-dessous = point de départ.

1. **Arbres fruitiers productifs.** Le **Pommier déco disparaît** de la boutique (décision de Flo) : le Pommier devient
   un arbre qui produit, comme le Noisetier (on touche, on ramasse, jamais replanté, quelques exemplaires).
   Proposé : Pommier niv. 9 (pommes → jus de pomme au Pressoir, tarte aux pommes au Fournil, compote), Cerisier
   niv. 18 (confiture de cerises, glace à la cerise). Les pommiers déco déjà posés (id `appleTree` gardé, jamais
   réutilisé) : à trancher en codant, proposé = changés en vrais pommiers, offerts.
2. **2e et 3e exemplaire des machines**, ouverts avec les niveaux (proposé : 2e = niveau de la machine + 6, 3e = + 12,
   prix × 2 puis × 3). C'est ce qui accélère le plus : mesurer et compenser comme au 8bis.
3. **La charrette du marché** : une grosse commande de 6 à 9 produits (3 sortes), renouvelée toutes les quelques
   heures, mieux payée qu'une commande (Éloisettes, XP, parfois un colis). Niveau d'ouverture et paie à mesurer.
4. **Races rares pour chaque nouvel animal** (mouton noir, cochon tacheté, etc.) dans les colis de Gaston, avec le
   bonus de produit des races existantes. Attention : chaque prix ajouté dans une rareté dilue les autres (l'album se
   remplit moins vite) : remesurer les chances de chaque trésor.
5. **Plus tard** (Flo) : des skins de machines.

---

## 19. Le lot 2 CODÉ (16/11, non commité, pas joué sur téléphone)

Go de Flo le 16/11 (« go lot 2 »), avec les 2a + 2b + les quatre ajouts de la fin de section 18. Entrée Nouveautés
choisie par Flo : « Refonte et lot de contenu pour la ferme ».

**Contenu** (`data/`, chiffres de `ferme-lot2-tables.mjs`) : 3 cultures (betterave 8, myrtille 17, lavande 21),
6 animaux et leurs enclos (mouton/Bergerie 8, cochon/Porcherie 10, abeilles/Rucher 12, chèvre/Chèvrerie 16,
canard/Mare 19, lapin/Clapier 23), 8 machines (Sucrerie 9, Pressoir 10, Confiturerie 11, Confiserie 14, Atelier de
couture 18, Glacier 20, Savonnerie 22, Crêperie 25), la Filature au 13 (pelote de laine), 37 recettes de la table +
les fruits (jus de pomme, tarte aux pommes, confiture de cerises, glace à la cerise), niveaux jusqu'à 30.
**24 quêtes** à la suite de l'histoire, en chaînes parallèles : Marthe (animaux), Mme Pivoine (première fois
conteuse : sucre, confitures, confiserie, glacier, crêperie, gâteau à étages), Basile (pommier, pressoir, pelotes,
couture), Rosalie (rucher, myrtilles, cerisier, lavande, savonnerie), Jules (le doudou), Capucine (le panier gourmand,
la finale du niv. 30). Tâches du jour : laine, truffes, miel, cueillir des arbres.

**Les quatre ajouts** :
1. **Arbres fruitiers** : `TREE_YIELDS` (data/placeables) remplace `HAZEL` ; Pommier niv. 9 (120 🌰, 4 au plus, 4 pommes
   toutes les 3 h), Cerisier niv. 18 (300 🌰, 4 cerises toutes les 5 h). Le Pommier déco (`appleTree`) est `retired` :
   plus en boutique ; au chargement, un posé devient un vrai pommier mûr (offert), un rangé est remboursé 90 🌰.
2. **Exemplaires des machines** : `MACHINE_COPY_LEVELS` = [0, 6, 12] après le niveau de la machine, prix × rang ;
   la Boutique dit « 2e au niv. X » et « N sur ta ferme ».
3. **La charrette du marché** (niv. 7) : objet offert près de l'entrée (comme la boîte aux lettres, `kind: 'cart'`),
   une commande de 6 à 9 objets en 3 sortes au plus, payée 2,2 × la valeur (le tableau : 1,6), 0,45 en XP, un colis
   une fois sur trois environ ; revient 3 h après, 1 h si on la renvoie ; n'expire jamais (`farmOrders.ts`).
4. **Races rares** : mouton noir, cochon tacheté, chèvre des neiges, canard mandarin, lapin bélier (épiques), reine
   des abeilles (légendaire). **Une race n'est tirée qu'une fois son animal débloqué** (`isPrizeOpen`).

**Code** : le kit de dessin sort de farmArt dans `farmPaint.ts` (moteur, palette, kit de bâtiment et d'enclos) ; les
dessins du lot 2 vivent dans `farmArtItems.ts`, `farmArtMachines.ts`, `farmArtAnimals.ts`. Plus aucun `coop` /
`cowshed` écrit en dur : un enclos se reconnaît à `kind === 'pen'` ; chaque animal a son cri (`CRIES`, farmScreen),
son allure (`GAIT`, farmScene) et son genre (`feminine`, pour « ton nouveau mouton »).

**Rythme (MESURE du 16/11, simulateur qui joue maintenant arbres fruitiers, exemplaires — achetés seulement quand
toutes les files du type sont pleines — et charrette ; graines 1 à 4)** : table d'XP niv. 6-15 = lot 1 × 1,6, puis
10 300 + 350 par niveau. Niveau 15 : posée j45 / régulière j27 / accro j13 (lot 1 : j43 / j29 / j15) ; niveau 20 :
j84 / j51 / j24 ; niveau 30 : j148 / j88 / j44 (cible section 18 : j144 / j91 / j43). Sans compensation, la charrette
et les exemplaires avançaient le niveau 30 de 8 à 16 %.

**Vérifications** : farm-check = 55, dont la cohérence du contenu (chaque ingrédient disponible au niveau de sa
recette, chaque quête demande des choses qui existent à son niveau) et les règles du lot 2.

### Autocritique du lot 2, tout corrigé avant publication (16/11, demande de Flo)
- **Vieilles sauvegardes** : `FARM_VERSION` 2 ; une sauvegarde version 1 garde la même PART de sa barre d'XP avec la
  nouvelle table (`readXp`, farmSave : 900 / 950 au niv. 9 → 1 440 / 1 520).
- **Toute l'histoire se joue** : farm-check enchaîne les 50 quêtes du niv. 1 au niv. 30 sans blocage.
- **Abeilles qui volent** (battement d'ailes, flottement, au-dessus des ruches) et **canards sur la mare** (agrandie pour 6) :
  `LOT2_PEN_AREAS` (farmArtAnimals) lu par `farmScene.yard` via `penAreaOf` ; `GAIT.flies`.
- **Fumée** : les 8 machines du lot 2 ont une cheminée. Enseigne de la Savonnerie refaite (savonnette emballée) ;
  écharpe et truffe redessinées.
- **Charrette** : si la ferme est pleine, elle se gare juste dehors, au plus près de l'entrée (`gateSpot(w, h)`, la boîte
  aux lettres en profite).
- **Bug du lot 1 trouvé en capture** : la vignette de quête restait affichée vide (et en Aménager) car son
  `display: flex` écrasait `hidden` → `.farm-quest-pill[hidden]`.
- **Sons** : `farmCries.ts` (les cris, partagés) ; bouton « Cris des animaux » dans la barre TEST ; **banc d'écoute**
  `tools/sound-bench.html` (servi par le serveur de dev seulement : http://localhost:5199/tools/sound-bench.html),
  qui joue les vrais sons du site, avec Bien / À revoir / note et « Copier mes retours ».
- farm-check = 58.

### Check UI, bugs et progression (16/11, demande de Flo)
- **UI (captures téléphone, ferme niv. 30)** : une machine à plus de 4 recettes (Cookiterie : 8, Fournil : 8 au niv. 29)
  les montre en **grille de deux colonnes** (`COMPACT_RECIPES`, farmPanels ; bouton « + » sur la ligne des
  ingrédients) : la bulle reste entière même avec deux fournées en cours. Boutique Animaux : « mange des cookies pour
  … » (l'article manquait), l'abeille agrandie. Papillons jaunes → blancs (pris pour des abeilles échappées).
  Vus corrects : Fournil, Commandes, Album (15 trésors), Graines (11), Déco (plus de Pommier déco), charrette.
- **Bugs** : l'annonce de niveau rangeait la charrette dans les « Bâtiments » → « Offerte : … » ; elle annonce aussi
  les 2e / 3e exemplaires. **Quête `cart`** (Marthe, niv. 7, après la Laiterie) : servir la charrette une fois.
  **Pommes et cerises n'étaient jamais commandées** : `orderable` ajoute le fruit des arbres possédés (jeu et simulateur).
- **Progression (MESURE du 16/11, simulateur à demande récursive : il prépare toute la chaîne d'ingrédients ; colis,
  album et races alignés sur le jeu ; graines 1 à 4)** : niv. 15 j44 / j27 / j13, niv. 30 j142 / j86 / j45 (posée /
  régulière / accro) : pas de nouvelle table d'XP. Album complet (médiane, 20 graines) : posée j120, régulière j74, accro
  j48 ; c'est le niveau du lapin (23) qui fixe la fin, pas la dilution ; poids uniformes gardés.
- **Ouvert, à trancher par Flo** :
  1. **Les Éloisettes s'entassent** (déjà vrai au lot 1, amplifié) : ~78 000 au niv. 15, ~710 000 au niv. 30 ; plus rien
     d'important à acheter après le niv. 12 environ.
  2. **Le lait est le goulot** (première cause de commandes refusées) : une seule Étable de 5 vaches pour crème, beurre,
     fromage et 3 crêpes.
  3. Les machines du lot 2 tournent peu (Crêperie 3 %, Confiserie 5-9 %) : les 2e / 3e exemplaires ne servent qu'aux
     joueuses qui produisent beaucoup.

### Décisions de Flo (16/11, après le check)
- **Plus long** : le lot 2 doit durer plus. Table d'XP refaite : niv. 6-15 = lot 1 × 1,68, niv. 16-30 = 16 300 + 550 par
  niveau. MESURE (graines 1 à 4) : niv. 15 j44 / j27 / j13 (inchangé), niv. 20 j102 / j62 / j29, **niv. 30 j196 /
  j119 / j54** (posée / régulière / accro). Après le niv. 15 : environ un niveau par semaine pour la régulière.
- **Enclos en plus** (validé, « avec limite ») : les enclos suivent la règle des machines (`COPY_LEVELS` [0, 6, 12],
  `hasCopies`, `copyLevel` ; ex-`MACHINE_COPY_LEVELS`) : Étable 2e au niv. 12, 3e au niv. 18, prix × rang, 3 au plus.
  Règle le goulot du lait.
- **Éloisettes qui s'entassent** : à traiter après quelques semaines de tests, avec des décos ou de grosses
  améliorations **extrêmement chères** (idée de Flo).

## 20. Batterie et anti-veille (16/11, demande de Flo, non commité)

- **Anti-veille sur tout le site** (`src/wakeLock.ts`, branché dans le routeur de `main.ts`) : chaque écran de jeu (tout
  sauf l'accueil) garde l'écran allumé (Screen Wake Lock) tant qu'on joue ; après **3 minutes sans toucher ni touche**
  (`PLAYER_AWAY_MS`), le verrou est rendu et le téléphone se met en veille comme d'habitude ; le premier toucher le
  reprend. Navigateur sans l'API : rien ne change. iPhone : Safari 16.4+ (en application installée, iOS 18.4+).
- **Rythme d'images de la ferme** (`farmScene`) : 60 i/s pendant 3 s après un toucher (inchangé), 15 au calme (avant
  20), 8 après 30 s (avant : après 1 min), **2 après 3 min** (le même seuil que l'anti-veille), **aucune** page cachée
  (avant 1 par seconde) ; la minuterie de la ferme (`tick`) se met en pause quand la page est cachée.
- **MESURE (ferme niv. 30, téléphone émulé)** : le calcul d'une image coûte ~0,6 ms sur PC, la vraie dépense est de
  repeindre tout l'écran ; images par seconde avant → après : calme 16 → 13, après 30 s 16 → 8, après 3 min 8 → 2,
  cachée 1 → 0. Sur 5 min sans toucher : ~35 % d'images en moins.
- Les autres jeux du site (casino, aquarium…) n'ont pas été revus : seul l'anti-veille les concerne.
## 21. Retours de test de Flo (16/11 au soir, non commité)

- **Graines au-delà de l'écran (fraises…) impossibles à faire défiler** : 1er essai (commit 9dd6618, `touch-action: pan-x` laissé au navigateur) RATÉ sur le téléphone de Flo ; en plus, la graine verrouillée et les graines trop chères étaient des boutons `disabled`, qui peuvent avaler le doigt. Refait : la rangée gère elle-même le glissé (`pressSeedRow`, farmSeedSwipe ; rangée et graines en `touch-action: none`, graines éteintes en `.is-off` + `aria-disabled`, jamais `disabled`) : le premier mouvement de plus de 8 px décide, de côté = la rangée défile (avec élan après un coup de doigt), vers le haut = la graine part semer, partout dans la rangée, graine verrouillée comprise. À la souris, glisser ou la molette. Vérifié en headless (doigt et souris, niveau 6, depuis la fraise verrouillée ; semis vers le haut intact).
- **Toucher une déco n'ouvre plus de bulle** (elle disait seulement « Aménager ») ; `decoBubble` supprimée. On la
  déplace toujours par Aménager ou un appui long.
- **La petite bulle « prêt » se touche** (cadeau de la boîte aux lettres, produit d'un enclos ou d'une machine, cookies
  à donner, commande de la charrette) : `readyBubbleAt` dans farmScene, testée avant l'objet lui-même ; le dessin et le
  toucher partagent `readyIcon` / `readyBubblePlace`. Les glissés de semis et de récolte l'ignorent (`objectAtWorld`).
- **Le Noisetier « un peu nul »** (5 à 10 Éloisettes toutes les 4 h = 4 à 7 % d'une commande ; MESURE : 0-1 % des
  Éloisettes gagnées) : il donne maintenant **35 % d'une commande moyenne de son niveau**, ±25 %
  (`TREE_YIELDS.hazel.gives.orderPercent`, `treeNuts` dans farmProduction, `orderBasket` / `averageOrderNuts` dans
  farmOrders = la seule formule de la taille d'une commande, simulateur compris). La bulle dit « environ N Éloisettes ».
  MESURE (simulateur, graine 1) : noisetiers 10-11 % des Éloisettes (posée, régulière), 5 % (accro) ; rythme des
  niveaux inchangé à un jour près ; Éloisettes en poche +10 à 15 %. Pommier et Cerisier inchangés. farm-check 60.
- **« bientôt : … » illisible dans le bandeau** (MESURE : 95 px de texte sur un téléphone de 360 px ; un niveau ouvre
  2 à 8 choses, le bandeau n'en montrait qu'une) : le bandeau dit seulement « X / Y XP » ; le TOUCHER ouvre la fiche
  « Au niveau N » (`FarmDialogs.nextLevel`) : XP restante, récompense, tout ce que le niveau ouvre (`unlocksAt`).
- **La Laiterie ne montrait pas qu'elle travaille** (pas de cheminée, donc pas de fumée) : cheminée de pierre en face et
  en profil, et sur la Filature de profil (`stoneStack` dans farmArt, `CHIMNEYS`). Toutes les machines fument
  maintenant en travaillant, le Moulin tourne ses ailes.
- **Boutique, Bâtiments** : dans l'ordre du niveau qui les ouvre (tri stable : l'ordre des données entre égaux).
- **Premiers niveaux trop rapides** (Flo niv. 8 en un jour, Eloise niv. 6 en une soirée : 2 à 3 fois plus vite que le
  profil accro du simulateur, qui SOUS-ESTIME donc le rythme réel ; la durée du lot 2 annoncée est sans doute trop
  optimiste) : XP des niveaux 5 à 10 DOUBLÉE (400, 1 100, 1 620, 2 280, 3 200 ; 1 à 4 inchangés = les premières
  minutes ; 10 et plus inchangés). MESURE (graines 1 à 4, posée / régulière / accro) : niv. 8 j8 → j12-14 / j6 → j8-9 /
  j3-4,5 → j4-6 ; niv. 10 j13 → j22 / j9,5 → j14,5 / j5 → j7,5 ; niv. 15 j43 → j52 / j27 → j32 / j13 → j15 ; niv. 30
  j194 → j206 / j118 → j124 / j55 → j56. Une partie en cours garde son XP : la barre s'allonge.

## 22. Les promeneurs (idée de Flo du 16/11, VALIDÉE et CODÉE le 16/11, non commité, pas joué sur téléphone)

Des villageois viennent visiter la ferme et s'y promènent, de préférence sur les chemins.

- **Pourquoi** : la ferme vit sans effort ; les chemins servent enfin ; surtout, le **Charme devient visible** (Eloise
  se fiche des décos parce qu'elles ne *font* rien) : une ferme plus charmante attire plus de promeneurs, qui s'arrêtent
  devant les décos.
- **Combien** (`CharmStep.strollers`, `data/charm.ts`) : 1 / 2 / 2 / 3 / 3 / 4 promeneurs à la fois, de « toute
  simple » à « de rêve ». Les trésors seuls mènent à « charmante » (3) ; le 4e se gagne en achetant des décos. Un
  nouveau arrive 20 à 40 s après le précédent, jusqu'au plafond ; à l'ouverture de la ferme, la moitié (arrondie au-dessus)
  est déjà devant une déco. Le Charme qui baisse ne renvoie personne : les suivants ne viennent pas.
- **Qui** : les 7 villageois sauf Gaston (il reste le facteur à vélo) ; jamais quelqu'un déjà sur la carte pour une
  commande, ni quelqu'un dont la commande peut être livrée. Si sa commande devient livrable pendant sa promenade, il
  rejoint la cour par les chemins et devient le villageois qui attend (`FarmVillage` le reprend : `release`).
- **Trajets** (`farmPaths.ts`) : case par case, en quatre directions (les trois vues des dessins) ; chemins, cour et
  pont coûtent 1, l'herbe 3 (un chemin est pris tant qu'il n'est pas trois fois plus long) ; bloqué : tout ce qui est
  posé au sol (bâtiments, champs, enclos, arbres, décos, friche, boîte aux lettres, charrette), l'eau, les terres pas
  achetées ; le portillon se traverse, le pont une fois construit. Quelque chose posé en travers du chemin pendant la
  marche : il recalcule.
- **Arrêts** : 3 décos par visite (moins si la ferme en a moins ; pas les chemins, barrières, haies), tirées au sort
  selon leur Charme (la mare et les trésors plus souvent qu'un parterre), la plus proche d'abord ; jamais deux promeneurs
  devant la même. Il se place au sud, de dos, face à la déco (centré sous une déco de 2 cases si tout le côté est
  libre) ; sinon à côté, de profil, tourné vers elle ; sinon derrière. **Arrêt de 15 à 25 s** ; un cœur monte au-dessus
  de sa tête avec la chance Charme ÷ (Charme + 10) du Charme de la déco (mare 60 %, trésor 86 %, parterre 11 %). Ferme
  sans déco : il va sur deux cases au hasard près de la cour (sur un chemin s'il y en a) et repart.
- **Toucher un promeneur** : un cœur et un petit bruit ; la première fois, **3 % d'une commande moyenne de son
  niveau** (`strollerTip` : 1 au niveau 1, 5 au niveau 10, 10 au niveau 20) qui flotte « +N » au-dessus de lui. Une
  seule fois par promeneur. Pas d'XP (le rythme des niveaux vient d'être ralenti, section 21). Les villageois de la cour
  passent avant, puis les promeneurs, puis les objets.
- **Option** (demande de Flo) : « Promeneurs » dans le menu ⋯ (case à cocher, cochée par défaut), gardée sur
  l'appareil comme le volume de la musique (`localStorage` `farm-strollers`). Décochée, ceux qui sont là rentrent.
- **Batterie** : les promeneurs ne retiennent pas la carte à 15 i/s (les villageois des commandes, si) : ils marchent
  à 8 i/s après 30 s sans toucher. Après 3 min sans toucher (`PLAYER_AWAY_MS`), personne de nouveau ; ceux qui sont là
  finissent leur visite. « Réduire les animations » : ils apparaissent devant leur déco et disparaissent.
- **MESURE (16/11, une heure de `FarmStrollers` sur la ferme de la maquette)** : avec des arrêts de 6 à 12 s et 2-3
  décos (la première version), une visite durait ~1 min et 3 ou 4 places donnaient le même nombre à l'écran (2,1 en
  moyenne) : le dernier palier ne se voyait pas. Avec 3 décos et 15-25 s : visite ~1 min 45, **1,0 / 2,0 / 2,9 / 3,3**
  promeneurs présents en moyenne pour 1 / 2 / 3 / 4 places, 35 / 72 / 102 / 120 visites par heure.
- **MESURE (simulateur, graine 1, elle touche TOUS les promeneurs qui passent pendant qu'elle joue = le maximum)** :
  promeneurs 6 % des Éloisettes (posée, régulière), 7 % (régulière qui décore à 30 %), 10 % (accro) : autant que les
  noisetiers. Rythme des niveaux inchangé à un ou deux jours près (le hasard des colis bouge). `STROLLER_TIPS=0` les
  retire du simulateur.
- **MESURE batterie (ferme niv. 10 de la maquette, téléphone émulé, sonde de la section 20)**, avant → après :
  images par seconde **identiques** (après un toucher 60 → 60, calme 13,1 → 13,0, après 30 s 7,9 → 7,9, après 3 min
  2,0 → 2,0, cachée 0,3 → 0,3) ; le calcul d'une image passe de ~0,6 à ~0,7 ms (un ou deux promeneurs de plus à
  dessiner, un trajet calculé de temps en temps), toujours négligeable devant le coût de repeindre l'écran.
- **Fichiers** : `farmPaths.ts` (cases praticables, `WalkMap`), `farmStrollers.ts` (les visites, le pourboire,
  l'option), branchés dans `farmScene` (mise à jour, dessin, toucher), `farmScreen` (`thankStroller`), `farmHud`
  (l'option) ; `charmLine` dit « N promeneurs » au palier suivant quand il en ajoute. `farm-check` : 14 vérifications
  (chemin préféré, rien traversé, champs / boîte / terres non achetées bloqués, nombre par palier, pourboire, jamais
  plus que le Charme, jamais Gaston ni un villageois déjà là ni deux fois le même, jamais debout sur un objet, pourboire
  une fois, reprise par le village, la moitié à l'ouverture et personne de nouveau quand elle est absente).
- **Maquette et captures** : `drive.mjs` sur une ferme niv. 10 (chemin pavé, puits, mare, banc, parterres) ; vu en jeu :
  Pivoine devant la mare à l'ouverture, Léon devant le puits, le toucher (+5, cœur), l'option dans le menu.
