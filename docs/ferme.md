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
   (« Encore 1 min 58 », choix de Flo du 15/11 au premier test) ; les files des machines et les enclos disent
   l'heure de fin (« prêt à 18 h 40 »).
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
- **Toucher un objet** ouvre une petite bulle à côté : les graines à semer, la file de la machine, l'heure de fin.
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
| **Noisetier** (3 au plus) | 5 | 150 🌰 | 5 à 10 Éloisettes toutes les 4 h |

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

---

## 9. Les outils

- **Simulation de progression** (`node tools/farm-sim.mjs [jours] [graine]`, FAIT le 15/11) : 5 profils de
  joueuse et le jour où chacune atteint chaque niveau. `FARM_DETAIL=1` détaille d'où viennent l'XP et les Éloisettes,
  `ALL_LEVELS=1` montre tous les niveaux, `XP_TABLE="15,30,..."` essaie une autre table d'XP.
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
  farmScene.ts     le canvas : caméra, dessin, toucher et glisser
  farmArt.ts       les dessins
  farmHud.ts       bandeau et barre du bas
  farmPanels.ts    grange, commandes, quêtes, boutique, bulles
  farmScreen.ts    l'écran #/ferme
  farmHelp.ts      le tuto
```

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
- **Les trésors** (décos et animaux rares) ne s'achètent nulle part : ils remplissent l'**album** (onglet des Quêtes),
  qui montre en silhouette ce qui manque. Un animal rare va dans l'enclos de son espèce s'il y a de la place, sinon
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
- **Le Charme** (`data/charm.ts`) : chaque déco posée ajoute du charme (environ 1 point par 10 Éloisettes de prix ;
  trésors : rare 15, épique 30, légendaire 60 ; les décos rangées ne comptent pas). Six paliers, de « Ferme toute
  simple » à « Ferme de rêve » (0, 20, 50, 100, 180, 300) : Gaston passe toutes les 4 h puis jusqu'à 2 h 45, et les
  commandes paient jusqu'à +15 %. Affiché dans la Boutique (onglet Déco, « +N de charme » sur chaque carte) et dans
  le bandeau d'Aménager.
- **Le soir à l'écran** : lumière dorée vers 18 h 30, bleutée la nuit (21 h 30 à 5 h), rose à l'aube ; les
  lanternes brillent la nuit et les papillons deviennent des lucioles. L'interface n'est pas teintée. TEST : bouton
  « Heure +3 h ».
- **Album** : médaille « Collectionneuse » à 3, 6 et 9 trésors (l'or à l'album complet).
- Non modélisé dans le simulateur : coups de cœur et Charme (ils accélèrent un peu une joueuse qui décore).
