import { el } from '../../dom';
import { ANIMALS, PEN_CAPACITY, animal } from './data/animals';
import { BREED_IDS, PITY, TREASURES, breed, rarityName, type TreasureId } from './data/parcels';
import { placeableBreeds } from './farmParcels';
import { BOOSTERS, booster } from './data/boosters';
import { CROPS, crop } from './data/crops';
import { DAILY_TASKS, dailyChestReward, dailyTaskReward } from './data/daily';
import { ITEMS, item, itemCount } from './data/items';
import { MEDALS, MEDAL_TIERS } from './data/medals';
import { PLACEABLES, TREE_YIELDS, copyLevel, hasCopies, isTree, placeable, type Placeable } from './data/placeables';
import { PROJECTS } from './data/projects';
import { QUESTS } from './data/quests';
import { obstacle } from './data/land';
import { orderLine, person } from './data/people';
import { charmOf, charmStep } from './data/charm';
import type { BoosterId, BreedId, CropId, DecorId, ItemId, ObstacleId, PenId, PlaceableId, Reward, TreeId } from './data/types';
import { animalSprite, boosterIcon, breedSprite, faceSprite, parcelSprite, fieldSprite, treeSprite, itemIcon, objectSprite, spriteImage, uiIcon, type Sprite } from './farmArt';
import type { SheetId } from './farmHud';
import { buyRefusal, capOf, parcelOffers, priceOf, type ParcelOffer } from './farmMap';
import { canDeliver } from './farmOrders';
import {
  fieldState,
  hungryAnimals,
  machineRecipes,
  nextAnimalAt,
  nextAnimalPrice,
  nextSlotPrice,
  penAnimal,
  pendingJobs,
  queueRefusal,
  readyAnimals,
  sellPrice,
  trayJobs,
} from './farmProduction';
import {
  charm,
  counter,
  have,
  isChestReady,
  isQuestReady,
  isStageFilled,
  isUnlocked,
  objectiveProgress,
  openQuests,
  ownCount,
  projectState,
  taskProgress,
  unlockText,
} from './farmProgress';
import { canHurry, growingFields, shopLeft, siteCoins } from './farmBoosters';
import { MINUTE_MS, countdown, duration } from './farmTime';
import type { FarmSave, PlacedObject } from './farmSave';

// -----------------------------------------------
// WHAT THE PANELS ASK THE SCREEN
// -----------------------------------------------

export interface FarmUi {
  readonly save: FarmSave;
  now(): number;
  /** Runs one player action: settles, saves, refreshes what is shown. */
  act(action: () => void): void;
  closeBubble(): void;
  openSheet(id: SheetId, tab?: string): void;
  toast(text: string): void;
  startPlacing(id: PlaceableId): void;
  /** Starts a seed swipe from a seed button of the field bubble. */
  seedSwipe(crop: CropId, event: PointerEvent): void;
  sow(field: PlacedObject, crop: CropId): void;
  collect(object: PlacedObject): void;
  queue(machine: PlacedObject, itemId: ItemId): void;
  feed(pen: PlacedObject): void;
  deliverCart(): void;
  sendCartAway(): void;
  buyAnimal(pen: PlacedObject): void;
  clear(object: PlacedObject): void;
  buyParcel(parcel: number): void;
  useBooster(id: BoosterId, target?: PlacedObject): void;
  buySlot(machine: PlacedObject): void;
  deliver(orderId: number): void;
  refuse(orderId: number): void;
  claimQuest(id: string): void;
  openChest(): void;
  give(itemId: ItemId): void;
  finishStage(): void;
  sell(itemId: ItemId, count: number): void;
  buyBooster(id: BoosterId): void;
  placeBreed(id: BreedId): void;
  /** Sheets remember a chosen item (the barn) between refreshes. */
  sheetState: { barnItem: ItemId | null };
}

// -----------------------------------------------
// SMALL PIECES
// -----------------------------------------------

const img = (sprite: Sprite, scale = 2, alt = '') => spriteImage(sprite, scale, alt);
const nut = (scale = 2) => img(uiIcon('nut'), scale, 'Éloisettes');

function button(label: (string | Node)[], onClick: () => void, { ghost = false, disabled = false, wide = false } = {}): HTMLButtonElement {
  const b = el('button', { class: `farm-btn${ghost ? ' is-ghost' : ''}${wide ? ' is-wide' : ''}`, type: 'button', ...(disabled ? { disabled: '' } : {}) }, ...label);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

function price(n: number, short = false): HTMLElement {
  return el('span', { class: `farm-price${short ? ' is-short' : ''}` }, String(n), nut(1));
}

function line(icon: Sprite | null, text: string, end: string | Node, state: '' | 'ok' | 'missing' = ''): HTMLElement {
  return el('div', { class: `farm-line${state ? ` is-${state}` : ''}` }, ...(icon ? [img(icon)] : []), text, el('span', { class: 'farm-end' }, end));
}

/** "dans 4 min 05": every timer says how long is left, never an hour of the day to work out. */
function timeLeftText(time: number, now: number): string {
  return `dans ${countdown(time, now)}`;
}

/** A time left that runs by itself: the screen ticks every [data-until] each second (refreshTimesLeft). */
function timeLeft(time: number, now: number): HTMLElement {
  return el('span', { class: 'farm-time-left', 'data-until': String(time), text: timeLeftText(time, now) });
}

/** Ticks every time left under `root`; true when one has run out: what it waited for is ready to show. */
export function refreshTimesLeft(root: HTMLElement, now: number): boolean {
  let ended = false;
  for (const node of root.querySelectorAll<HTMLElement>('[data-until]')) {
    const until = Number(node.dataset.until);
    if (until <= now) ended = true;
    node.textContent = timeLeftText(until, now);
  }
  return ended;
}

/** A reward, as icons and numbers. */
export function rewardLine(reward: Reward): HTMLElement[] {
  const parts: HTMLElement[] = [];
  if (reward.nuts) parts.push(el('span', {}, nut(), String(reward.nuts)));
  if (reward.xp) parts.push(el('span', {}, img(uiIcon('star')), `${reward.xp} XP`));
  for (const [id, n] of Object.entries(reward.boosters ?? {})) parts.push(el('span', {}, img(boosterIcon(id as BoosterId)), `${n} ${(n ?? 0) > 1 ? booster(id as BoosterId).plural : booster(id as BoosterId).name}`));
  for (const [id, n] of Object.entries(reward.decor ?? {})) parts.push(el('span', {}, `${n} × ${placeable(id as DecorId).name}`));
  if (reward.parcels) parts.push(el('span', {}, img(parcelSprite(null), 1), reward.parcels > 1 ? `${reward.parcels} colis` : '1 colis'));
  return parts;
}

function face(id: Parameters<typeof faceSprite>[0]): HTMLElement {
  return el('span', { class: 'farm-face' }, img(faceSprite(id), 2, person(id).name));
}

/** The drawing of a placeable for a shop card, scaled to fit its box. */
export function placeableArt(id: PlaceableId): HTMLElement {
  const sprite = id === 'field' ? fieldSprite('wheat', 'ripe') : isTree(id) ? treeSprite(id, true) : objectSprite(id, 'face');
  const scale = Math.max(1, Math.min(3, Math.floor(56 / sprite.height), Math.floor(84 / sprite.width)));
  return el('div', { class: 'farm-art' }, img(sprite, scale));
}

// -----------------------------------------------
// BUBBLES: the card next to a thing on the map
// -----------------------------------------------

/** A progress bar and the time left; the screen refreshes it every second while the bubble is open. */
function growth(readyAt: number, total: number, now: number): HTMLElement[] {
  const done = Math.min(1, Math.max(0, 1 - (readyAt - now) / total));
  return [
    el('div', { class: 'farm-progress is-big' }, el('i', { style: `width:${(100 * done).toFixed(1)}%` })),
    el('p', { class: 'farm-countdown', text: `Encore ${countdown(readyAt, now)}` }),
  ];
}

/** The seed row docked above the bottom bar: a seed is dragged onto the empty fields, or tapped for the chosen one. */
export function seedRow(ui: FarmUi, chosen: PlacedObject | null, close: () => void): Node[] {
  // The seeds already open and only the next one to unlock: the later ones are nothing to act on yet.
  const next = CROPS.find((c) => !isUnlocked(ui.save, c.unlock));
  const seeds = CROPS.filter((c) => c === next || isUnlocked(ui.save, c.unlock)).map((c) => {
    const open = c !== next;
    const affordable = ui.save.nuts >= c.seed;
    const b = el(
      'button',
      { class: `farm-seed${c.id === ui.save.lastSeed ? ' is-last' : ''}`, type: 'button', ...(open && affordable ? {} : { disabled: '' }) },
      open ? img(itemIcon(c.id), 2) : img(uiIcon('lock'), 2),
      item(c.id).name,
      ...(open
        ? [
            el('small', { text: duration(c.minutes) }),
            el('small', { class: 'farm-seed-money' }, `Achat ${c.seed}`, nut(1)),
            el('small', { class: 'farm-seed-money', title: `La récolte (${itemCount(c.id, c.yield)}) vendue au marchand` }, `Vente ${sellPrice(c.id, c.yield)}`, nut(1)),
          ]
        : [el('small', { text: unlockText(c.unlock) })]),
    );
    b.addEventListener('pointerdown', (e) => {
      if (!open || !affordable) return;
      e.preventDefault();
      ui.seedSwipe(c.id, e);
    });
    return b;
  });
  const shut = el('button', { class: 'farm-close', type: 'button', 'aria-label': 'Fermer les graines', text: '×' });
  shut.addEventListener('click', close);
  return [
    el('span', { class: 'farm-grip', 'aria-hidden': 'true' }),
    el('div', { class: 'farm-seedbar-head' }, el('p', { text: chosen ? 'Touche une graine pour ce champ, ou fais-la glisser sur les champs vides.' : 'Fais glisser une graine sur les champs vides.' }), shut),
    el('div', { class: 'farm-seedbar-row' }, ...seeds),
  ];
}

export function fieldBubble(ui: FarmUi, field: PlacedObject): Node[] {
  const now = ui.now();
  const state = fieldState(field, now);
  if (state === 'empty') return [el('h3', { text: 'Champ vide' }), el('p', { text: 'Ouvre les graines en bas pour le semer.' })];
  const c = crop(field.crop!);
  if (state === 'ripe') return [el('h3', { text: `${item(c.id).name} : c’est mûr !` }), el('p', { text: 'Touche le champ, ou glisse le doigt sur les champs mûrs.' })];
  const fertilizers = ui.save.boosters.fertilizer;
  return [
    el('h3', {}, img(itemIcon(c.id)), `${item(c.id).name} en train de pousser`),
    ...growth(field.readyAt!, c.minutes * MINUTE_MS, now),
    el(
      'div',
      { class: 'farm-row' },
      button([img(boosterIcon('fertilizer')), `Engrais (${fertilizers})`], () => ui.useBooster('fertilizer', field), { ghost: true, disabled: fertilizers === 0 }),
    ),
  ];
}

export function penBubble(ui: FarmUi, pen: PlacedObject): Node[] {
  const now = ui.now();
  const a = penAnimal(pen);
  const count = pen.animals!.length;
  const ready = readyAnimals(pen, now);
  const hungry = hungryAnimals(pen);
  const next = nextAnimalAt(pen, now);
  const feed = have(ui.save, a.feed);
  const capacity = PEN_CAPACITY[pen.type as PenId];
  const lines: HTMLElement[] = [];
  if (count === 0) lines.push(el('p', { text: `Pas encore de ${a.plural.toLowerCase()} ici : adoptes-en ${a.feminine ? 'une' : 'un'} !` }));
  if (ready > 0) lines.push(line(itemIcon(a.product), `${itemCount(a.product, ready)} à ramasser`, '', 'ok'));
  if (hungry > 0) lines.push(line(itemIcon(a.feed), `${hungry} ${hungry > 1 ? 'ont' : 'a'} faim`, `${feed} en grange`, feed > 0 ? 'ok' : 'missing'));
  if (next !== null) lines.push(line(itemIcon(a.product), item(a.product).name, timeLeft(next, now)));
  const room = capacity - count;
  const animalPrice = nextAnimalPrice(ui.save, pen);
  const actions = el('div', { class: 'farm-row' });
  if (ready > 0) actions.append(button(['Ramasser'], () => ui.collect(pen)));
  if (hungry > 0) actions.append(button([img(itemIcon(a.feed)), 'Nourrir'], () => ui.feed(pen), { disabled: feed === 0 }));
  if (room > 0) actions.append(button([`+ 1 ${a.name.toLowerCase()} · ${animalPrice}`, nut(1)], () => ui.buyAnimal(pen), { ghost: true, disabled: ui.save.nuts < animalPrice }));
  if (canHurry(pen, now)) actions.append(button([img(boosterIcon('hourglass')), `Sablier (${ui.save.boosters.hourglass})`], () => ui.useBooster('hourglass', pen), { ghost: true, disabled: ui.save.boosters.hourglass === 0 }));
  const recipe = feed === 0 && hungry > 0 ? el('p', { text: `Les ${item(a.feed).plural.toLowerCase()} se font à la Cookiterie.` }) : null;
  return [
    el('h3', { text: `${placeable(pen.type).name} · ${count} / ${capacity} ${a.plural.toLowerCase()}` }),
    el('div', { class: 'farm-lines' }, ...lines),
    ...(recipe ? [recipe] : []),
    actions,
  ];
}

/** Beyond this many recipes, a machine's bubble shows them in two columns. */
const COMPACT_RECIPES = 4;

export function machineBubble(ui: FarmUi, machine: PlacedObject): Node[] {
  const now = ui.now();
  const pending = pendingJobs(machine, now);
  const slots = machine.slots ?? 0;
  const queue = machine.queue!.filter((j) => j.readyAt > now);
  const tray = trayJobs(machine, now);
  const list = machineRecipes(machine.type as Parameters<typeof machineRecipes>[0]);
  // Many recipes (the Cookiterie, the Fournil late in the game) go in two columns, the time on the inputs' line,
  // so the bubble stays whole on a phone.
  const compact = list.length > COMPACT_RECIPES;
  const recipes = list.map((r) => {
    const refusal = queueRefusal(ui.save, machine, r, now);
    const open = refusal !== 'locked';
    const inputs = Object.entries(r.inputs).map(([id, n]) => {
      const short = have(ui.save, id as ItemId) < (n ?? 0);
      return el('span', { class: short ? 'is-missing' : '' }, img(itemIcon(id as ItemId), 1), `${have(ui.save, id as ItemId)}/${n}`);
    });
    const name = `${r.count > 1 ? `${r.count} × ` : ''}${item(r.item).name}`;
    const time = el('span', { class: 'farm-recipe-time', text: duration(r.minutes) });
    return el(
      'div',
      { class: `farm-recipe${open ? '' : ' is-locked'}` },
      img(open ? itemIcon(r.item) : uiIcon('lock'), 2),
      el('span', { class: 'farm-recipe-name', text: compact ? name : `${name} · ${duration(r.minutes)}` }),
      button(['+'], () => ui.queue(machine, r.item), { disabled: refusal !== null }),
      el('div', { class: 'farm-recipe-inputs' }, ...(open ? [...(compact ? [time] : []), ...inputs] : [el('span', { text: `S’ouvre ${unlockText(r.unlock)}` })])),
    );
  });
  const slotPrice = nextSlotPrice(machine);
  const actions = el('div', { class: 'farm-row' });
  if (tray > 0) actions.append(button(['Ramasser'], () => ui.collect(machine)));
  if (slotPrice !== null) actions.append(button([`+ 1 place · ${slotPrice}`, nut(1)], () => ui.buySlot(machine), { ghost: true, disabled: ui.save.nuts < slotPrice }));
  if (canHurry(machine, now)) actions.append(button([img(boosterIcon('hourglass')), `Sablier (${ui.save.boosters.hourglass})`], () => ui.useBooster('hourglass', machine), { ghost: true, disabled: ui.save.boosters.hourglass === 0 }));
  return [
    el('h3', { text: `${placeable(machine.type).name} · file ${pending} / ${slots}` }),
    ...(queue.length > 0 ? [el('div', { class: 'farm-lines' }, ...queue.map((j) => line(itemIcon(j.item), item(j.item).name, j.readyAt <= now ? 'prêt' : timeLeft(j.readyAt, now))))] : [el('p', { text: 'La file est vide : choisis une recette.' })]),
    ...(tray > 0 ? [el('p', { text: `${tray} fabrication${tray > 1 ? 's' : ''} terminée${tray > 1 ? 's' : ''}, sur le plateau.` })] : []),
    ...(compact ? [el('div', { class: 'farm-recipes is-grid' }, ...recipes)] : recipes),
    actions,
  ];
}

export function treeBubble(ui: FarmUi, tree: PlacedObject): Node[] {
  const y = TREE_YIELDS[tree.type as TreeId];
  const gives = 'nuts' in y.gives ? `${y.gives.nuts[0]} à ${y.gives.nuts[1]} Éloisettes` : itemCount(y.gives.item, y.gives.count);
  const hours = y.minutes / 60;
  return [
    el('h3', { text: placeable(tree.type).name }),
    el('p', {}, `Il donne ${gives} toutes les ${hours} heures, tout seul. Prochaine cueillette `, timeLeft(tree.readyAt ?? 0, ui.now()), '.'),
  ];
}

export function obstacleBubble(ui: FarmUi, object: PlacedObject): Node[] {
  const o = obstacle(object.type as ObstacleId);
  const short = ui.save.nuts < o.cost;
  return [
    el('h3', { text: placeable(o.id).name }),
    el('p', { text: `Dégager cette place donne ${o.xp} XP. Parfois, une surprise se cache dessous.` }),
    button(['Dégager · ', price(o.cost)], () => ui.clear(object), { disabled: short, wide: true }),
    ...(short ? [el('p', { text: `Il te manque ${o.cost - ui.save.nuts} Éloisettes.` })] : []),
  ];
}

export function mailboxBubble(ui: FarmUi): Node[] {
  const mail = ui.save.mail;
  return [
    el('h3', {}, img(parcelSprite(null), 2), 'La boîte aux lettres'),
    el('p', {}, 'Gaston repasse ', timeLeft(mail.nextAt, ui.now()), ' avec un colis. Les niveaux et le coffre du jour en donnent aussi.'),
    el('p', { text: `${mail.opened} colis ouvert${mail.opened > 1 ? 's' : ''} · ${ui.save.album.length} / ${TREASURES.length} trésors dans l’album.` }),
    button(['Voir l’album'], () => ui.openSheet('quests', 'album'), { ghost: true, wide: true }),
  ];
}

/** The market cart: its big order line by line, or when it comes back. */
export function cartBubble(ui: FarmUi): Node[] {
  const order = ui.save.cart.order;
  const title = el('h3', { text: 'La charrette du marché' });
  if (!order) return [title, el('p', {}, 'Elle est au marché. Elle revient ', timeLeft(ui.save.cart.nextAt, ui.now()), ' avec une grosse commande.')];
  const wanted = Object.entries(order.items) as [ItemId, number][];
  const lines = wanted.map(([id, n]) => line(itemIcon(id), itemCount(id, n), `${Math.min(have(ui.save, id), n)} / ${n}`, have(ui.save, id) >= n ? 'ok' : 'missing'));
  const ready = wanted.every(([id, n]) => have(ui.save, id) >= n);
  return [
    title,
    el('p', { text: 'Une grosse commande pour le marché du bourg, mieux payée que le tableau. Elle n’expire jamais.' }),
    el('div', { class: 'farm-lines' }, ...lines),
    el('p', { class: 'farm-note', text: `Paie ${order.nuts} Éloisettes et ${order.xp} XP${order.parcel ? ', plus un colis de Gaston' : ''}.` }),
    el(
      'div',
      { class: 'farm-row' },
      button(['Livrer'], () => ui.deliverCart(), { disabled: !ready }),
      button(['Renvoyer'], () => ui.sendCartAway(), { ghost: true }),
    ),
  ];
}
export function decoBubble(object: PlacedObject): Node[] {
  return [el('h3', { text: placeable(object.type).name }), el('p', { text: 'Pour la déplacer, la tourner ou la ranger : « Aménager », en bas.' })];
}

export function parcelBubble(ui: FarmUi, offer: ParcelOffer): Node[] {
  const tooLow = ui.save.level < offer.level;
  const short = ui.save.nuts < offer.price;
  return [
    el('h3', { text: offer.river ? 'Un terrain de la rive' : 'Terrain à vendre' }),
    el('p', { text: tooLow ? `Il s’achète à partir du niveau ${offer.level}.` : 'Il est en friche : il faudra le dégager, mais chaque obstacle rapporte de l’XP.' }),
    button(['Acheter · ', price(offer.price)], () => ui.buyParcel(offer.parcel), { disabled: tooLow || short, wide: true }),
  ];
}

export function offerOf(save: FarmSave, parcel: number): ParcelOffer | undefined {
  return parcelOffers(save).find((o) => o.parcel === parcel);
}

// -----------------------------------------------
// SHEETS
// -----------------------------------------------

export interface SheetContent {
  title: string;
  tabs: [string, string, boolean?][];
  tab: string;
  body: Node[];
}

export function sheetContent(ui: FarmUi, id: SheetId, tab?: string): SheetContent {
  if (id === 'barn') return { title: 'Grange', tabs: [], tab: '', body: barnSheet(ui) };
  if (id === 'orders') return { title: 'Commandes', tabs: [], tab: '', body: ordersSheet(ui) };
  if (id === 'bag') return { title: 'Mes boosters', tabs: [], tab: '', body: bagSheet(ui) };
  if (id === 'quests') {
    const t = tab ?? 'story';
    const storyNews = openQuests(ui.save).some((q) => isQuestReady(ui.save, q));
    return {
      title: 'Quêtes',
      tabs: [['story', 'Histoire', storyNews], ['daily', 'Tâches du jour', isChestReady(ui.save)], ['album', 'Album'], ['project', 'Grand projet'], ['medals', 'Médailles']],
      tab: t,
      body: t === 'album' ? albumSheet(ui) : t === 'daily' ? dailySheet(ui) : t === 'project' ? projectSheet(ui) : t === 'medals' ? medalsSheet(ui) : storySheet(ui),
    };
  }
  const t = tab ?? 'buildings';
  return {
    title: 'Boutique',
    tabs: [['buildings', 'Bâtiments'], ['animals', 'Animaux'], ['decor', 'Déco'], ['boosters', 'Boosters']],
    tab: t,
    body: t === 'animals' ? animalsShop(ui) : t === 'decor' ? decorShop(ui) : t === 'boosters' ? boostersShop(ui) : buildingsShop(ui),
  };
}

/** What the player owns, and where each one is used; buying them stays in the shop. */
function bagSheet(ui: FarmUi): Node[] {
  const save = ui.save;
  const now = ui.now();
  const cards = BOOSTERS.map((b) => {
    const count = save.boosters[b.id];
    const use = b.id === 'wateringCan' && count > 0 ? [button(['Arroser maintenant'], () => ui.useBooster('wateringCan'), { disabled: growingFields(save, now).length === 0 })] : [];
    return el(
      'div',
      { class: `farm-card${count === 0 ? ' is-locked' : ''}` },
      el('div', { class: 'farm-who' }, img(boosterIcon(b.id), 3), el('span', {}, `${b.name} × ${count}`, el('small', { text: b.effect }))),
      el('p', { class: 'farm-note', text: b.howTo }),
      ...use,
    );
  });
  return [
    ...cards,
    button(['En acheter à la Boutique'], () => ui.openSheet('shop', 'boosters'), { ghost: true, wide: true }),
    el('p', { class: 'farm-note', text: 'Ils se gagnent aussi en jouant : niveaux, quêtes, tâches du jour, et parfois en finissant un niveau d’un autre jeu.' }),
  ];
}

function barnSheet(ui: FarmUi): Node[] {
  const save = ui.save;
  const owned = ITEMS.filter((i) => have(save, i.id) > 0);
  if (owned.length === 0) return [el('p', { class: 'farm-note', text: 'La grange est vide. Récolte, ramasse, fabrique : tout arrive ici, sans limite de place.' })];
  const chosen = ui.sheetState.barnItem && have(save, ui.sheetState.barnItem) > 0 ? ui.sheetState.barnItem : null;
  const cards = owned.map((i) => {
    const card = el('button', { class: `farm-item${i.id === chosen ? ' is-chosen' : ''}`, type: 'button' }, img(itemIcon(i.id), 3), el('b', { text: String(have(save, i.id)) }), el('span', { text: i.name }));
    card.addEventListener('click', () => {
      ui.sheetState.barnItem = i.id === chosen ? null : i.id;
      ui.openSheet('barn');
    });
    return card;
  });
  const sellPanel: Node[] = [];
  if (chosen) {
    const n = have(save, chosen);
    const options = [1, 10, n].filter((k, i, all) => k <= n && all.indexOf(k) === i);
    sellPanel.push(
      el(
        'div',
        { class: 'farm-card' },
        el('div', { class: 'farm-who' }, img(itemIcon(chosen), 2), `Vendre au marchand : ${item(chosen).name}`),
        el('div', { class: 'farm-row' }, ...options.map((k) => button([k === n && k > 1 ? `Tout (${k})` : String(k), ' · ', price(sellPrice(chosen, k))], () => ui.sell(chosen, k), { ghost: true, disabled: sellPrice(chosen, k) === 0 }))),
        el('p', { class: 'farm-note', text: 'Le marchand paie la moitié du prix : les commandes paient bien mieux.' }),
      ),
    );
  }
  return [el('p', { class: 'farm-note', text: 'Pas de limite de place. Touche un produit pour le vendre au marchand.' }), ...sellPanel, el('div', { class: 'farm-items' }, ...cards)];
}

function ordersSheet(ui: FarmUi): Node[] {
  const save = ui.save;
  const now = ui.now();
  const cards: HTMLElement[] = save.orders.map((o) => {
    const ok = canDeliver(save, o);
    const needs = Object.entries(o.items).map(([id, n]) => {
      const got = have(save, id as ItemId);
      return line(itemIcon(id as ItemId), itemCount(id as ItemId, n ?? 0), got >= (n ?? 0) ? '✓' : `${got}/${n}`, got >= (n ?? 0) ? 'ok' : '');
    });
    const refuse = el('button', { class: 'farm-link', type: 'button', text: 'Changer de commande' });
    refuse.addEventListener('click', () => ui.refuse(o.id));
    return el(
      'div',
      { class: `farm-card${ok ? ' is-ready' : ''}${o.special ? ' is-special' : ''}` },
      ...(o.special ? [el('span', { class: 'farm-special', text: '♥ Coup de cœur' })] : []),
      el('div', { class: 'farm-who' }, face(o.who), el('span', {}, person(o.who).name, el('small', { text: person(o.who).role }))),
      el('p', { class: 'farm-quote', text: `« ${orderLine(o.who, o.id)} »` }),
      el('div', { class: 'farm-lines' }, ...needs),
      el('div', { class: 'farm-pay' }, ...rewardLine({ nuts: o.nuts, xp: o.xp, ...(o.special ? { parcels: 1 } : {}) })),
      button([ok ? 'Livrer' : 'Il en manque'], () => ui.deliver(o.id), { disabled: !ok, wide: true }),
      refuse,
    );
  });
  for (const at of [...save.orderWaits].sort((a, b) => a - b)) {
    cards.push(el('div', { class: 'farm-card farm-waiting' }, el('span', { text: 'Nouvelle commande' }), el('b', {}, at <= now ? 'tout de suite' : timeLeft(at, now))));
  }
  return [el('p', { class: 'farm-note', text: 'Les commandes n’expirent jamais. Une commande servie est remplacée une minute après.' }), el('div', { class: 'farm-orders' }, ...cards)];
}

function check(done: boolean, text: string, end: string): HTMLElement {
  return el('div', { class: `farm-check${done ? ' is-done' : ''}` }, el('span', { class: 'farm-check-box', text: done ? '✓' : '' }), text, el('span', { class: 'farm-end', text: end }));
}

function storySheet(ui: FarmUi): Node[] {
  const save = ui.save;
  const open = openQuests(save);
  const cards = open.map((q) => {
    const starts = save.questStarts[q.id];
    const ready = isQuestReady(save, q);
    return el(
      'div',
      { class: `farm-card${ready ? ' is-ready' : ''}` },
      el('div', { class: 'farm-who' }, face(q.who), el('span', {}, `${person(q.who).name} · ${q.title}`, el('small', { text: person(q.who).role }))),
      el('p', { class: 'farm-quote', text: `« ${q.intro} »` }),
      el('div', { class: 'farm-checks' }, ...q.objectives.map((o) => {
        const p = objectiveProgress(save, o, starts);
        return check(p >= o.count, o.text, `${p} / ${o.count}`);
      })),
      el('div', { class: 'farm-pay' }, 'Récompense :', ...rewardLine(q.reward)),
      ...(ready ? [button(['Récupérer'], () => ui.claimQuest(q.id), { wide: true })] : []),
    );
  });
  if (cards.length === 0) {
    const next = QUESTS.find((q) => !save.questsDone.includes(q.id));
    cards.push(el('p', { class: 'farm-note', text: next ? `La suite de l’histoire arrive ${unlockText(next.unlock)}.` : 'Tu as fini l’histoire du village, pour l’instant. La suite viendra avec la rive !' }));
  }
  return [...cards, el('p', { class: 'farm-note', text: `${save.questsDone.length} quête${save.questsDone.length > 1 ? 's' : ''} terminée${save.questsDone.length > 1 ? 's' : ''} sur ${QUESTS.length}.` })];
}

function dailySheet(ui: FarmUi): Node[] {
  const save = ui.save;
  const daily = save.daily;
  if (!daily || daily.tasks.length === 0) return [el('p', { class: 'farm-note', text: 'Les tâches du jour arrivent bientôt.' })];
  const tasks = daily.tasks.map((t) => {
    const p = taskProgress(save, t);
    return check(t.paid, t.text, t.paid ? 'fait' : `${p} / ${t.count}`);
  });
  const chestReady = isChestReady(save);
  return [
    el('div', { class: 'farm-card' }, el('div', { class: 'farm-checks' }, ...tasks), el('div', { class: 'farm-pay' }, 'Chacune :', ...rewardLine(dailyTaskReward(save.level)))),
    el(
      'div',
      { class: `farm-card${chestReady ? ' is-ready' : ''}` },
      el('div', { class: 'farm-who' }, img(uiIcon('chest'), 3), daily.chestOpened ? 'Coffre ouvert. À demain !' : `Le coffre s’ouvre quand les ${daily.tasks.length < DAILY_TASKS ? daily.tasks.length : DAILY_TASKS} tâches sont faites.`),
      el('div', { class: 'farm-pay' }, 'Dedans :', ...rewardLine(dailyChestReward(save.level))),
      ...(chestReady ? [button(['Ouvrir le coffre'], () => ui.openChest(), { wide: true })] : []),
    ),
    el('p', { class: 'farm-note', text: 'De nouvelles tâches chaque jour. Rien n’est perdu si tu ne les finis pas.' }),
  ];
}

function projectSheet(ui: FarmUi): Node[] {
  const save = ui.save;
  return PROJECTS.map((p) => {
    const header = el('div', { class: 'farm-who' }, face(p.who), el('span', {}, p.name, el('small', { text: `avec ${person(p.who).name}, ${person(p.who).role}` })));
    if (!isUnlocked(save, p.unlock)) return el('div', { class: 'farm-card is-locked' }, header, el('p', { class: 'farm-quote', text: p.intro }), el('p', { class: 'farm-note', text: `S’ouvre ${unlockText(p.unlock)}.` }));
    const state = projectState(save, p.id);
    const bar = el('div', { class: 'farm-progress' }, el('i', { style: `width:${(100 * state.stage) / p.stages.length}%` }));
    if (state.stage >= p.stages.length) return el('div', { class: 'farm-card is-ready' }, header, bar, el('p', { class: 'farm-quote', text: p.done }));
    const stage = p.stages[state.stage];
    const items = Object.entries(stage.items).map(([id, n]) => {
      const given = state.given[id as ItemId] ?? 0;
      const done = given >= (n ?? 0);
      const canGive = !done && have(save, id as ItemId) > 0;
      return el(
        'div',
        { class: `farm-line${done ? ' is-ok' : ''}` },
        img(itemIcon(id as ItemId)),
        `${item(id as ItemId).plural} : ${given} / ${n}`,
        el('span', { class: 'farm-end' }, done ? '✓' : button([`Donner (${Math.min(have(save, id as ItemId), (n ?? 0) - given)})`], () => ui.give(id as ItemId), { ghost: true, disabled: !canGive })),
      );
    });
    const filled = isStageFilled(save, p.id);
    return el(
      'div',
      { class: 'farm-card' },
      header,
      el('p', { class: 'farm-quote', text: p.intro }),
      bar,
      el('b', { text: `Étape ${state.stage + 1} / ${p.stages.length} : ${stage.text}` }),
      el('div', { class: 'farm-lines' }, ...items),
      el('div', { class: 'farm-pay' }, 'Pour finir l’étape :', ...(stage.nuts > 0 ? [price(stage.nuts, save.nuts < stage.nuts)] : [el('span', { text: 'rien de plus' })]), '· gagne', el('span', {}, img(uiIcon('star')), `${stage.xp} XP`)),
      button(['Finir l’étape'], () => ui.finishStage(), { disabled: !filled || save.nuts < stage.nuts, wide: true }),
    );
  });
}

/** Every treasure of the parcels: found ones in colour, the others as a dark silhouette to chase. */
function albumSheet(ui: FarmUi): Node[] {
  const cards = TREASURES.map((t) => {
    const found = ui.save.album.includes(t.id);
    const isBreed = (BREED_IDS as readonly string[]).includes(t.id);
    const sprite = isBreed ? breedSprite(t.id as BreedId, 0) : objectSprite(t.id as DecorId, 'face');
    const scale = Math.max(1, Math.min(isBreed ? 4 : 3, Math.floor(56 / sprite.height)));
    const name = isBreed ? breed(t.id as BreedId).name : placeable(t.id as DecorId).name;
    return el(
      'div',
      { class: `farm-item farm-treasure is-${t.rarity}${found ? '' : ' is-missing'}` },
      el('div', { class: 'farm-art' }, img(sprite, scale)),
      el('span', { text: found ? name : '???' }),
      el('small', { class: 'farm-rarity-tag', text: rarityName(t.rarity) }),
    );
  });
  return [
    el('p', { class: 'farm-note', text: `${ui.save.album.length} / ${TREASURES.length} trésors trouvés. Ils sortent des colis de Gaston : un rare au moins tous les ${PITY} colis.` }),
    el('div', { class: 'farm-items' }, ...cards),
  ];
}

function medalsSheet(ui: FarmUi): Node[] {
  const save = ui.save;
  return MEDALS.map((m) => {
    const paid = save.medals[m.id] ?? 0;
    const value = counter(save, m.key);
    const target = m.tiers[Math.min(paid, 2)];
    const tiers = el('span', { class: 'farm-medal-tiers' }, ...['is-bronze', 'is-silver', 'is-gold'].map((c, i) => el('i', { class: i < paid ? c : '', title: MEDAL_TIERS[i] })));
    return el(
      'div',
      { class: 'farm-card farm-medal' },
      img(uiIcon('medal'), 3),
      el('div', { class: 'farm-who' }, el('span', {}, m.name, el('small', { text: paid >= 3 ? `Or ! ${m.text(value)}` : `${MEDAL_TIERS[paid]} : ${m.text(target)} · ${value.toLocaleString('fr-FR')} / ${target.toLocaleString('fr-FR')}` })), tiers),
    );
  });
}

// -----------------------------------------------
// THE SHOP
// -----------------------------------------------

function shopCard(ui: FarmUi, p: Placeable, onBuy: () => void, extra?: string): HTMLElement {
  const refusal = buyRefusal(ui.save, p);
  const stored = p.kind === 'deco' ? ui.save.decorStore[p.id as DecorId] ?? 0 : 0;
  let foot: HTMLElement;
  if (stored > 0) foot = el('span', { class: 'farm-price', text: `${stored} rangée${stored > 1 ? 's' : ''}` });
  else if (refusal === 'locked') foot = el('span', { class: 'farm-price' }, img(uiIcon('lock'), 1), unlockText(p.unlock));
  // A machine's or a pen's next copy opens later (COPY_LEVELS): say when.
  const own = ownCount(ui.save, p.id);
  const nextCopy = hasCopies(p) ? copyLevel(p, own + 1) : null;
  if (stored > 0) foot = el('span', { class: 'farm-price', text: `${stored} rangée${stored > 1 ? 's' : ''}` });
  else if (refusal === 'locked') foot = el('span', { class: 'farm-price' }, img(uiIcon('lock'), 1), unlockText(p.unlock));
  else if (refusal === 'max') {
    const text = p.kind === 'field' ? `${capOf(ui.save, p)} max au niv. ${ui.save.level}` : nextCopy ? `${own + 1}e au niv. ${nextCopy}` : 'déjà là';
    foot = el('span', { class: 'farm-price', text });
  } else foot = price(priceOf(ui.save, p), refusal === 'nuts');
  const card = el('button', { class: `farm-item${refusal === 'locked' && stored === 0 ? ' is-locked' : ''}`, type: 'button' }, placeableArt(p.id), el('span', { text: p.name }), ...(extra ? [el('small', { class: 'farm-note', text: extra })] : []), foot);
  card.addEventListener('click', () => {
    if (stored > 0 || refusal === null) onBuy();
    else if (refusal === 'nuts') ui.toast(`Il te manque ${priceOf(ui.save, p) - ui.save.nuts} Éloisettes.`);
    else if (refusal === 'max' && p.kind === 'field') ui.toast('Plus de champs à ton niveau : il en vient en montant de niveau.');
    else if (refusal === 'max' && nextCopy) ui.toast(`Un ${own + 1}e exemplaire s’ouvre au niveau ${nextCopy}.`);
    else if (refusal === 'max') ui.toast(`${p.name} est déjà sur ta ferme.`);
    else ui.toast(`${p.name} s’ouvre ${unlockText(p.unlock)}.`);
  });
  return card;
}

function buildingsShop(ui: FarmUi): Node[] {
  const list = PLACEABLES.filter((p) => p.kind === 'field' || p.kind === 'machine' || p.kind === 'pen' || p.kind === 'tree');
  const fields = ownCount(ui.save, 'field');
  return [
    el('div', { class: 'farm-shop' }, ...list.map((p) => shopCard(ui, p, () => ui.startPlacing(p.id), p.kind === 'field' ? `${fields} / ${capOf(ui.save, p)}` : p.kind === 'tree' ? `${ownCount(ui.save, p.id)} / ${p.maxCount}` : hasCopies(p) && ownCount(ui.save, p.id) > 0 ? `${ownCount(ui.save, p.id)} sur ta ferme` : undefined))),
    el('p', { class: 'farm-note', text: 'Les terrains autour de la ferme s’achètent sur leur panneau.' }),
  ];
}

function animalsShop(ui: FarmUi): Node[] {
  const save = ui.save;
  const cards = ANIMALS.map((a) => {
    const pens = save.objects.filter((o) => o.type === a.pen);
    const pen = pens.find((o) => o.animals!.length < PEN_CAPACITY[a.pen]);
    const open = isUnlocked(save, a.unlock);
    const cost = pen ? nextAnimalPrice(save, pen) : a.price;
    let foot: HTMLElement;
    if (!open) foot = el('span', { class: 'farm-price' }, img(uiIcon('lock'), 1), unlockText(a.unlock));
    else if (pens.length === 0) foot = el('span', { class: 'farm-price', text: `il faut : ${placeable(a.pen).name}` });
    else if (!pen) foot = el('span', { class: 'farm-price', text: 'enclos plein' });
    else foot = price(cost, save.nuts < cost);
    const card = el(
      'button',
      { class: `farm-item${open ? '' : ' is-locked'}`, type: 'button' },
      // A tiny animal (the bee) is drawn bigger, so every card shows its animal about the same size.
      el('div', { class: 'farm-art' }, img(animalSprite(a.id, 0), Math.max(3, Math.floor(26 / animalSprite(a.id, 0).width)))),
      el('span', { text: a.name }),
      el('small', { class: 'farm-note', text: `${ownCount(save, a.id)} · mange des ${item(a.feed).plural.toLowerCase()} · ${duration(a.minutes)}` }),
      foot,
    );
    card.addEventListener('click', () => {
      if (!open) ui.toast(`${a.name} : ${unlockText(a.unlock)}.`);
      else if (pens.length === 0) ui.toast(`Construis d’abord : ${placeable(a.pen).name}.`);
      else if (!pen) ui.toast('L’enclos est plein.');
      else ui.buyAnimal(pen);
    });
    return card;
  });
  const waiting = [...new Set(ui.save.waitingBreeds)].map((id) => {
    const count = ui.save.waitingBreeds.filter((b) => b === id).length;
    const ready = placeableBreeds(ui.save).includes(id);
    return el(
      'div',
      { class: 'farm-card is-ready' },
      el('div', { class: 'farm-who' }, img(breedSprite(id, 0), 3), el('span', {}, `${breed(id).name}${count > 1 ? ` × ${count}` : ''}`, el('small', { text: ready ? `${animal(breed(id).animal).feminine ? 'Elle' : 'Il'} t’attend : il y a de la place.` : `Il faut de la place : ${placeable(animal(breed(id).animal).pen).name}.` }))),
      button(['L’installer'], () => ui.placeBreed(id), { disabled: !ready, wide: true }),
    );
  });
  return [
    ...(waiting.length > 0 ? [el('p', { class: 'farm-subtitle', text: 'Trouvées dans les colis' }), ...waiting] : []),
    el('div', { class: 'farm-shop' }, ...cards),
    el('p', { class: 'farm-note', text: 'Un nouvel animal arrive affamé : nourris-le d’un tap sur son enclos.' }),
  ];
}

/** The farm's charm, what it brings now and at the next step. */
export function charmLine(save: FarmSave): string {
  const value = charm(save);
  const { step, next } = charmStep(value);
  const now = `Charme ${value} · ${step.name}`;
  return next ? `${now}. À ${next.min} : Gaston toutes les ${duration(next.parcelMinutes)}, commandes +${next.orderBonusPercent} %.` : `${now}. Le plus haut palier !`;
}

/** What placing one more of a decoration adds: "+1,5 de charme", nothing for a second copy of a treasure. */
function charmAdded(save: FarmSave, id: PlaceableId): string {
  if (placeable(id).treasure && save.objects.some((o) => o.type === id)) return '+0 : déjà sur la ferme';
  return `+${charmOf(id).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} de charme`;
}

function decorShop(ui: FarmUi): Node[] {
  // A treasure shows once a parcel has brought it: the album keeps the surprise.
  const list = PLACEABLES.filter((p) => p.kind === 'deco' && !p.retired && (!p.treasure || ui.save.album.includes(p.id as TreasureId)));
  return [
    el('p', { class: 'farm-charm', text: charmLine(ui.save) }),
    el('div', { class: 'farm-shop' }, ...list.map((p) => shopCard(ui, p, () => ui.startPlacing(p.id), charmAdded(ui.save, p.id)))),
    el('p', { class: 'farm-note', text: 'Un trésor trouvé dans un colis s’achète ensuite autant de fois que tu veux. Chaque déco posée ajoute du charme (un trésor, une seule fois) : Gaston passe plus souvent et les commandes paient un peu mieux. Les décos se tournent et se rangent dans « Aménager ».' }),
  ];
}

function boostersShop(ui: FarmUi): Node[] {
  const save = ui.save;
  const now = ui.now();
  const coins = siteCoins();
  const cards = BOOSTERS.map((b) => {
    const left = shopLeft(save, b.id, now);
    const canBuy = left > 0 && coins >= b.price;
    return el(
      'div',
      { class: 'farm-card' },
      el('div', { class: 'farm-who' }, img(boosterIcon(b.id), 3), el('span', {}, `${b.name} · tu en as ${save.boosters[b.id]}`, el('small', { text: b.effect }))),
      el(
        'div',
        { class: 'farm-row' },
        button([`Acheter · ${b.price} 🪙`], () => ui.buyBooster(b.id), { disabled: !canBuy }),
        el('span', { class: 'farm-note', text: left > 0 ? `encore ${left} aujourd’hui` : 'plus de stock aujourd’hui' }),
      ),
    );
  });
  return [
    el('p', { class: 'farm-note', text: `Les boosters s’achètent avec les pièces du site (tu en as ${coins} 🪙), avec un stock par jour. Ils se gagnent aussi en jouant : niveaux, quêtes, tâches du jour, et parfois en finissant un niveau d’un autre jeu.` }),
    ...cards,
  ];
}
