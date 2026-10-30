# Eloise's Wonderland Games

Petits jeux pour téléphone et PC : un site statique, installable sur Android, sauvegarde dans le navigateur
(exportable / importable en `.json` depuis l'accueil).

## Tester en local

Double-cliquer sur **`Lancer.cmd`** : le serveur démarre et le site s'ouvre dans le navigateur.
Ouvrir `index.html` directement ne marche pas (page blanche) : le site a besoin d'un serveur.

```
npm install        # une fois (Lancer.cmd le fait tout seul)
npm run dev        # serveur local ; l'adresse "Network" s'ouvre aussi depuis un téléphone sur le même wifi
npm run build      # vérification TypeScript + site final dans dist/
```

## Mise en ligne (GitHub Pages)

1. Pousser le dossier sur la branche `main` du dépôt GitHub.
2. Sur GitHub : **Settings > Pages > Build and deployment > Source : GitHub Actions** (une seule fois).
3. Chaque push sur `main` reconstruit et publie le site (`.github/workflows/deploy.yml`).

## Installer sur Android

Ouvrir le site dans Chrome, menu ⋮ > **Installer l'application** (ou "Ajouter à l'écran d'accueil").
Le jeu marche ensuite hors ligne.

## Structure

| fichier | rôle |
|---|---|
| `src/main.ts` | routes (`#/picross`...) : un écran par jeu |
| `src/save.ts` | la sauvegarde unique du site, export / import |
| `src/home.ts` | l'accueil |
| `src/games/<jeu>/` | un dossier par jeu, qui stocke son bloc dans la sauvegarde |
| `src/creatures/` | les petites bêtes : silhouette (aussi la grille du Picross), couleurs, noms, l'album (`garden.ts`) |
| `src/games/sand/` | les bouteilles de sable : les formes de verre (`containers.ts`), le moteur (`jar.ts`), les modèles (`levels.ts`), la note (`score.ts`) |
| `src/games/icing/` | le glaçage : biscuits et pointillés (`cookie.ts`), la note (`icingScore.ts`), le rendu (`icingPainter.ts`) |
| `src/games/stainedGlass/` | les vitraux : découpage et voisins (`glassWindow.ts`, un vitrail = un numéro + un niveau), rendu (`glassPainter.ts`) |
| `src/games/potions/` | les fioles : règles, solveur du nombre minimal de coups et niveaux (`potionBoard.ts`), écran (`potionScreen.ts`) |
| `src/games/bubbles/` | les bulles mélangées : grille et mélanges (`bubbleBoard.ts`), tir et rendu (`bubbleGame.ts`) |
| `src/help.ts` | le bouton « ? » et le tuto ouvert tout seul à la première partie ; le texte de chaque jeu est dans son `*Help.ts` |
| `src/color.ts`, `src/random.ts`, `src/navigation.ts` | petits outils partagés : couleurs, hasard reproductible, navigation |
| `public/sw.js` | le service worker (hors ligne) |

Ajouter un jeu : un dossier sous `src/games/`, une entrée dans `routes` (`main.ts`), une carte dans `home.ts`.
