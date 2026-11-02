import { loadCompanion, saveCompanion } from '../companion/companionSave';
import { DISHES, FURNITURE, PLANTS, dish, furniture, ingredient, type DishId, type FurnitureId, type IngredientId } from './houseData';
import { befriend, character, dishStars, sowBlock } from './houseLogic';
import type { FriendRequest, HouseSave } from './houseSave';

// -----------------------------------------------
// WHAT FRIENDS DO TOGETHER: requests, lost things, pair photos, the snack
// -----------------------------------------------

const REQUEST_CHANCE = 0.6;
const REQUEST_STARS = 3;
const REQUEST_COINS = 12;
const LOST_CHANCE = 0.4;
const LOST_STARS = 4;
const LOST_COINS = 15;
const SNACK_BONUS_STARS = 1;

function pay(amount: number): void {
  const companion = loadCompanion();
  companion.coins += amount;
  companion.earned += amount;
  saveCompanion(companion);
}

// -----------------------------------------------
// REQUESTS
// -----------------------------------------------

/** Rolls new requests for the visitors who just arrived; the one with a dish order asks nothing more. */
export function rollRequests(save: HouseSave, now: number, random = Math.random): void {
  save.requests = [];
  for (const visitor of save.visitors) {
    if (save.order?.visitor === visitor || random() >= REQUEST_CHANCE) continue;
    const request = random() < 0.6 ? ingredientRequest(save, visitor, now, random) : decorRequest(save, visitor, random);
    if (request) save.requests.push(request);
  }
}

function ingredientRequest(save: HouseSave, visitor: string, now: number, random: () => number): FriendRequest | null {
  const growable = PLANTS.filter((p) => !p.rare && sowBlock(save, p.id, now) === null);
  if (growable.length === 0) return null;
  const pick = growable[Math.floor(random() * growable.length)];
  return { visitor, kind: 'ingredient', target: pick.id, count: 1 + Math.floor(random() * 2) };
}

function decorRequest(save: HouseSave, visitor: string, random: () => number): FriendRequest | null {
  const placed = new Set(save.rooms.flatMap((room) => save.placed[room]));
  const options = FURNITURE.filter((f) => save.rooms.includes(f.room) && !placed.has(f.id));
  if (options.length === 0) return null;
  return { visitor, kind: 'decor', target: options[Math.floor(random() * options.length)].id, count: 1 };
}

/** The request in words, from the friend's mouth. */
export function requestText(request: FriendRequest): string {
  if (request.kind === 'ingredient') {
    const name = ingredient(request.target as IngredientId).name.toLowerCase();
    return request.count > 1 ? `J’aimerais ${request.count} × ${name}, s’il te plaît !` : `Tu aurais un peu de ${name} pour moi ?`;
  }
  const piece = furniture(request.target as FurnitureId);
  return `Ce serait joli, ${piece.name.toLowerCase()} dans la pièce « ${roomLabel(piece.room)} » !`;
}

function roomLabel(room: string): string {
  return { living: 'Salon', kitchen: 'Cuisine', cafe: 'Café', garden: 'Jardin', bedroom: 'Chambre', library: 'Bibliothèque', greenhouse: 'Serre' }[room] ?? room;
}

export function canFulfil(save: HouseSave, request: FriendRequest): boolean {
  if (request.kind === 'ingredient') return (save.pantry[request.target as IngredientId] ?? 0) >= request.count;
  const piece = furniture(request.target as FurnitureId);
  return save.placed[piece.room].includes(piece.id);
}

/** Gives what was asked; false when it is not there yet. */
export function fulfil(save: HouseSave, request: FriendRequest): { newChapter: number | null } | null {
  if (!save.visitors.includes(request.visitor) || !canFulfil(save, request)) return null;
  if (request.kind === 'ingredient') save.pantry[request.target as IngredientId]! -= request.count;
  save.requests = save.requests.filter((r) => r !== request);
  pay(REQUEST_COINS);
  return befriend(save, request.visitor, REQUEST_STARS);
}

export const REQUEST_REWARD = { stars: REQUEST_STARS, coins: REQUEST_COINS };

// -----------------------------------------------
// LOST THINGS (hidden behind furniture, hot / cold hints)
// -----------------------------------------------

const LOST_THINGS: Record<string, string> = {
  noisette: 'une carte postale',
  biscotte: 'son fouet porte-bonheur',
  plume: 'son carnet de poèmes',
  mirabelle: 'son petit sécateur',
  brindille: 'l’archet de son violon',
  flocon: 'ses gants blancs',
  comete: 'sa veilleuse',
  brume: 'une perle de son collier',
  butine: 'une abeille endormie',
  bambou: 'sa tasse préférée',
  opaline: 'sa baguette magique',
  givrette: 'son flocon de verre',
};

export function lostThing(visitor: string): string {
  return LOST_THINGS[visitor] ?? 'quelque chose';
}

/** Sometimes a visitor loses something behind a piece of furniture of an open room. */
export function rollLost(save: HouseSave, random = Math.random): void {
  save.lost = null;
  if (save.visitors.length === 0 || random() >= LOST_CHANCE) return;
  const spots = save.rooms.flatMap((room) => save.placed[room].flatMap((piece, spot) => (piece ? [{ room, spot }] : [])));
  if (spots.length < 3) return;
  const visitor = save.visitors[Math.floor(random() * save.visitors.length)];
  save.lost = { visitor, ...spots[Math.floor(random() * spots.length)] };
}

export type SearchResult = 'found' | 'warm' | 'cold';

/** Looks behind one piece of furniture. */
export function search(save: HouseSave, room: string, spot: number): { result: SearchResult; newChapter?: number | null } | null {
  const lost = save.lost;
  if (!lost || !save.visitors.includes(lost.visitor)) return null;
  if (lost.room !== room) return { result: 'cold' };
  if (lost.spot !== spot) return { result: 'warm' };
  save.lost = null;
  pay(LOST_COINS);
  return { result: 'found', ...befriend(save, lost.visitor, LOST_STARS) };
}

export const LOST_REWARD = { stars: LOST_STARS, coins: LOST_COINS };

// -----------------------------------------------
// PAIRS: friends whose stories cross pose together
// -----------------------------------------------

export interface Pair {
  id: string;
  friends: [string, string];
  /** Their little exchange when photographed together. */
  lines: [string, string];
}

export const PAIRS: Pair[] = [
  { id: 'plume-biscotte', friends: ['plume', 'biscotte'], lines: ['Tu ne m’en veux vraiment pas ?', 'Tu plaisantes ? Goûte-moi cette confiture.'] },
  { id: 'comete-givrette', friends: ['comete', 'givrette'], lines: ['Tu as encore allumé la fenêtre cette nuit ?', 'Toutes les nuits. Pour toi.'] },
  { id: 'brindille-opaline', friends: ['brindille', 'opaline'], lines: ['Tu me rechantes la chanson de la grenouille ?', 'Seulement si tu joues faux avec moi !'] },
  { id: 'noisette-flocon', friends: ['noisette', 'flocon'], lines: ['Merci pour le registre, Flocon.', 'Mademoiselle, ce fut un honneur.'] },
  { id: 'brume-bambou', friends: ['brume', 'bambou'], lines: ['Une tasse ? Juste pour la vapeur.', 'Ooooh… Comme au premier jour.'] },
  { id: 'mirabelle-brume', friends: ['mirabelle', 'brume'], lines: ['Le noyau a germé, regarde !', 'Ta mamie serait fière de toi.'] },
  { id: 'butine-givrette', friends: ['butine', 'givrette'], lines: ['Tes fleurs de givre font un miel incroyable !', 'Et tu n’as même pas éternué !'] },
];

/** Pairs whose two friends are both at home right now. */
export function pairsHome(save: HouseSave): Pair[] {
  return PAIRS.filter((pair) => pair.friends.every((id) => save.visitors.includes(id)));
}

/** A pair photo: friendship for both, and the best stars kept for the album. */
export function notePairPhoto(save: HouseSave, pair: Pair, stars: number): { best: boolean } {
  const best = stars > (save.duos[pair.id] ?? 0);
  if (best) save.duos[pair.id] = stars;
  for (const id of pair.friends) befriend(save, id, stars);
  return { best };
}

// -----------------------------------------------
// THE SNACK: one dish for everyone at home, once per visit
// -----------------------------------------------

export function canHaveSnack(save: HouseSave): boolean {
  return save.visitors.length >= 2 && save.snackVisit !== save.visitUntil;
}

/** Dishes with a plate for everyone at home. */
export function snackDishes(save: HouseSave): DishId[] {
  return DISHES.filter((d) => (save.dishes[d.id] ?? 0) >= save.visitors.length).map((d) => d.id);
}

export interface SnackReaction {
  visitor: string;
  line: string;
  stars: number;
}

/** Everyone eats together: their favourite pleases most, and sharing adds a little. */
export function haveSnack(save: HouseSave, id: DishId): SnackReaction[] | null {
  if (!canHaveSnack(save) || !snackDishes(save).includes(id)) return null;
  save.dishes[id]! -= save.visitors.length;
  save.snackVisit = save.visitUntil;
  const served = dish(id);
  return save.visitors.map((visitor) => {
    const favourite = character(visitor).favourite === id;
    const stars = (favourite ? dishStars(served) + 3 : dishStars(served)) + SNACK_BONUS_STARS;
    befriend(save, visitor, stars);
    const line = favourite ? 'MON PLAT PRÉFÉRÉ ! Tu y as pensé !' : dishStars(served) > 2 ? 'Délicieux, vraiment !' : 'Miam, merci !';
    return { visitor, line, stars };
  });
}
