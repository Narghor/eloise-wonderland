// -----------------------------------------------
// FARM CHECK: the farm's logic, run end to end without a screen; every rule that must never break
// -----------------------------------------------
// node tools/farm-check.mjs   (prints each check, exits with an error when one fails)

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
};

import { mulberry32 } from '../src/random';
import { MAP_SIZE } from '../src/games/farm/data/land';
import { PLACEABLES, TREE_YIELDS, placeable } from '../src/games/farm/data/placeables';
import { ANIMALS } from '../src/games/farm/data/animals';
import { CROPS } from '../src/games/farm/data/crops';
import { RECIPES } from '../src/games/farm/data/machines';
import { QUESTS } from '../src/games/farm/data/quests';
import type { ItemId, PlaceableId, TreeId, Unlock } from '../src/games/farm/data/types';
import { CHARM_STEPS, totalCharm } from '../src/games/farm/data/charm';
import { WalkMap, isWalkable } from '../src/games/farm/farmPaths';
import { FarmStrollers, strollerCap, strollerTip } from '../src/games/farm/farmStrollers';
import { PITY, PRIZES, TREASURES } from '../src/games/farm/data/parcels';
import { ITEMS } from '../src/games/farm/data/items';
import {
  buyAndPlace, buyRefusal, capOf, ensureCart, priceOf, canPerch, canStand, ensureMailbox, footprint, freePerchNear, freeSpotNear, gateTile, isOwned, isRoad, moveObject, newFarm, objectAt, storeObject,
} from '../src/games/farm/farmMap';
import { CART_BACK_MINUTES, averageOrderNuts, deliverCart, orderable, refillCart, rollOrder } from '../src/games/farm/farmOrders';
import { deliverMail, isPrizeOpen, openParcel } from '../src/games/farm/farmParcels';
import { breedsOf, buyAnimal, collectMachine, collectPen, collectTree, feedPen, harvest, queueRecipe, sow } from '../src/games/farm/farmProduction';
import { loadFarm, saveFarm, type FarmSave } from '../src/games/farm/farmSave';
import { joinIndex, joinMask, nextSkin, restyleRun, skinOf } from '../src/games/farm/farmJoins';
import { JOIN_EAST, JOIN_WEST } from '../src/games/farm/data/skins';
import { MINUTE_MS } from '../src/games/farm/farmTime';
import { claimQuest, settle } from '../src/games/farm/farmProgress';
import { MAX_LEVEL, xpToNext } from '../src/games/farm/data/levels';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ` - ${detail}` : ''}`);
  if (!ok) failures++;
}

const now = Date.UTC(2026, 10, 15, 12);

/** Buys and places a placeable on the first free spot near the middle. */
function placeAnywhere(farm: FarmSave, id: 'cookiery' | 'mill' | 'coop') {
  const [w, h] = id === 'coop' ? [3, 3] : [2, 2];
  const spot = freeSpotNear(farm, MAP_SIZE / 2, MAP_SIZE / 2, w, h);
  return spot ? buyAndPlace(farm, id, spot[0], spot[1], 0, now) : null;
}

// -----------------------------------------------
// SAVE: a new farm survives a save and a load; an old one is migrated
// -----------------------------------------------
{
  const farm = newFarm(now);
  saveFarm(farm);
  const back = loadFarm()!;
  check('a new farm reloads the same', JSON.stringify(back) === JSON.stringify({ ...farm, nextUid: back.nextUid, nextOrderId: back.nextOrderId }));
  check('a new farm has its mailbox and a welcome parcel', back.objects.some((o) => o.type === 'mailbox') && back.mail.waiting === 1);

  // A farm from before the parcels: no mail, no album, no mailbox, pens without breeds.
  const old = JSON.parse(JSON.stringify(farm)) as Record<string, unknown>;
  delete old.mail;
  delete old.album;
  delete old.waitingBreeds;
  old.objects = (old.objects as { type: string }[]).filter((o) => o.type !== 'mailbox');
  store.set('mini-jeux.save', JSON.stringify({ app: 'mini-jeux', version: 1, games: { farm: old } }));
  const migrated = loadFarm()!;
  ensureMailbox(migrated);
  check('an old farm gets mail, an album and a mailbox', migrated.mail.waiting === 1 && Array.isArray(migrated.album) && migrated.objects.some((o) => o.type === 'mailbox'));
  // A version 1 farm at level 9 with 900 XP of 950 keeps the same share of the new bar.
  store.set('mini-jeux.save', JSON.stringify({ app: 'mini-jeux', version: 1, games: { farm: { ...old, version: 1, level: 9, xp: 900 } } }));
  const rescaled = loadFarm()!;
  check('an old save keeps its share of the XP bar', rescaled.xp === Math.round((900 / 950) * xpToNext(9)!), `${rescaled.xp} / ${xpToNext(9)}`);
  saveFarm(rescaled);
  check('the share is converted only once', loadFarm()!.xp === rescaled.xp);}

// -----------------------------------------------
// A FULL FARM still gets its mailbox, at the gate
// -----------------------------------------------
{
  const farm = newFarm(now);
  farm.objects = farm.objects.filter((o) => o.type !== 'mailbox');
  let uid = 10_000;
  for (let y = 0; y < MAP_SIZE; y++) for (let x = 0; x < MAP_SIZE; x++) if (canStand(farm, x, y, 1, 1)) farm.objects.push({ uid: uid++, type: 'fence', x, y, rot: 0 });
  ensureMailbox(farm);
  const box = farm.objects.find((o) => o.type === 'mailbox');
  check('a full farm gets its mailbox at the gate', !!box && !isOwned(farm, box.x, box.y));
}

// -----------------------------------------------
// NO TWO THINGS ON ONE TILE after placing many
// -----------------------------------------------
{
  const farm = newFarm(now);
  farm.nuts = 1e6;
  farm.level = 15;
  const random = mulberry32(3);
  const ids = ['field', 'cookiery', 'mill', 'bakery', 'coop', 'cowshed', 'fence', 'bench', 'well', 'pond'] as const;
  for (let i = 0; i < 400; i++) buyAndPlace(farm, ids[i % ids.length], Math.floor(random() * MAP_SIZE), Math.floor(random() * MAP_SIZE), (Math.floor(random() * 4) as 0 | 1 | 2 | 3), now);
  const taken = new Set<string>();
  let overlap = false;
  for (const o of farm.objects) {
    const [w, h] = footprint(o);
    for (let y = o.y; y < o.y + h; y++) for (let x = o.x; x < o.x + w; x++) {
      if (taken.has(`${x},${y}`)) overlap = true;
      taken.add(`${x},${y}`);
    }
  }
  check('nothing overlaps after 400 placements', !overlap, `${farm.objects.length} objects`);
}

// -----------------------------------------------
// PRODUCTION: a field, a machine, a pen, end to end
// -----------------------------------------------
{
  const farm = newFarm(now);
  farm.level = 6;
  farm.nuts = 5000;
  const field = farm.objects.find((o) => o.type === 'field')!;
  const gain = harvest(farm, field, now);
  check('a ripe field gives its yield', gain?.count === 2 && (farm.stock.wheat ?? 0) === 2);
  check('an empty field sows and grows', sow(farm, field, 'wheat', now) && harvest(farm, field, now) === null && harvest(farm, field, now + 2 * MINUTE_MS)?.count === 2);
  const cookiery = placeAnywhere(farm, 'cookiery');
  farm.stock = { wheat: 20, corn: 10 };
  const queued = cookiery !== null && queueRecipe(farm, cookiery, 'chickenFeed', now) && queueRecipe(farm, cookiery, 'chickenFeed', now);
  check('a machine takes two recipes, not a third', queued && !queueRecipe(farm, cookiery!, 'chickenFeed', now));
  const made = collectMachine(farm, cookiery!, now + 10 * MINUTE_MS);
  check('the tray gives what was made', made.length === 1 && made[0].count === 6);
  // Feeds left the mill (docs/ferme.md 17): it refuses them, but a feed already in an old save's mill still finishes.
  const mill = placeAnywhere(farm, 'mill')!;
  farm.stock = { wheat: 20, corn: 10 };
  check('the mill no longer makes feed', !queueRecipe(farm, mill, 'chickenFeed', now));
  mill.queue!.push({ item: 'chickenFeed', readyAt: now });
  const before = farm.stock.chickenFeed ?? 0;
  check('a feed already in the mill finishes', collectMachine(farm, mill, now).length === 1 && (farm.stock.chickenFeed ?? 0) === before + 6);
  const coop = placeAnywhere(farm, 'coop')!;
  buyAnimal(farm, coop);
  buyAnimal(farm, coop);
  check('animals and their breeds stay side by side', breedsOf(coop).length === coop.animals!.length && coop.breeds!.length === coop.animals!.length);
  const fed = feedPen(farm, coop, now);
  const eggs = collectPen(farm, coop, now + 20 * MINUTE_MS);
  check('hens eat, then lay', fed === 2 && eggs?.count === 2);
}

// -----------------------------------------------
// PARCELS: the pity rule holds, the rarities come out near their weights, breeds stay aligned
// -----------------------------------------------
{
  const farm: FarmSave = newFarm(now);
  farm.level = 8;
  farm.nuts = 100_000;
  placeAnywhere(farm, 'coop');
  farm.mail.waiting = 3000;
  const random = mulberry32(11);
  let plainRun = 0;
  let worstRun = 0;
  const seen: Record<string, number> = {};
  for (let i = 0; i < 3000; i++) {
    const opened = openParcel(farm, random)!;
    seen[opened.rarity] = (seen[opened.rarity] ?? 0) + 1;
    plainRun = opened.rarity === 'common' ? plainRun + 1 : 0;
    worstRun = Math.max(worstRun, plainRun);
  }
  check(`never more than ${PITY - 1} plain parcels in a row`, worstRun <= PITY - 1, `worst run ${worstRun}`);
  check('rarities near their weights', seen.common / 3000 > 0.5 && seen.common / 3000 < 0.66 && (seen.legendary ?? 0) > 20, JSON.stringify(seen));
  const pen = farm.objects.find((o) => o.type === 'coop')!;
  check('rare hens stay aligned with their breeds', breedsOf(pen).length === pen.animals!.length && pen.breeds!.length === pen.animals!.length);
  check('the album only holds treasures, once each', new Set(farm.album).size === farm.album.length && farm.album.length <= TREASURES.length);

  const box = newFarm(now);
  box.mail.waiting = 0;
  box.mail.nextAt = now;
  deliverMail(box, now + 7 * 24 * 60 * MINUTE_MS);
  check('a week away fills the mailbox to 3, no more', box.mail.waiting === 3);
}

// -----------------------------------------------
// ORDERS: always something the farm can make, in sane amounts
// -----------------------------------------------
{
  const random = mulberry32(5);
  let bad = '';
  for (let level = 1; level <= 15; level++) {
    const farm = newFarm(now);
    farm.level = level;
    const pool = new Set(orderable(farm));
    for (let i = 0; i < 300; i++) {
      const order = rollOrder(farm, random);
      for (const [id, n] of Object.entries(order.items)) {
        if (!pool.has(id as (typeof ITEMS)[number]['id']) || !n || n < 1 || n > 12) bad = `level ${level}: ${n} ${id}`;
      }
      if (order.nuts <= 0 || order.xp <= 0) bad = `level ${level}: pays nothing`;
    }
  }
  check('orders ask for makeable goods, 1 to 12 each, and pay', bad === '', bad);
}

// -----------------------------------------------
// THE VILLAGE: the road meets the farm wherever its south edge is; one order per villager on the board
// -----------------------------------------------
{
  const farm = newFarm(now);
  const start = gateTile(farm);
  farm.parcels.push(14);
  const after = gateTile(farm);
  const outside = !isOwned(farm, after[0], after[1]) && isOwned(farm, after[0], after[1] - 1);
  check('the gate is just south of the farm, and moves down with a parcel', start.join() === '12,18' && after.join() === '12,24' && outside && isRoad(farm, 12, 30), `${start} -> ${after}`);
  const board = newFarm(now);
  board.level = 8;
  board.orders = [];
  const random = mulberry32(9);
  for (let i = 0; i < 6; i++) board.orders.push(rollOrder(board, random));
  check('each villager has one order at a time', new Set(board.orders.map((o) => o.who)).size === board.orders.length, board.orders.map((o) => o.who).join(','));
}

// -----------------------------------------------
// CHARM: it rewards decorating; a treasure counts once, a cheap tile little
// -----------------------------------------------
{
  const twoGnomes = totalCharm(['gnome', 'gnome', 'fountain']);
  const paths = totalCharm(Array(10).fill('pathDirt'));
  check('a treasure counts once, ten paths make 2 charm', twoGnomes === 75 && paths === 2, `${twoGnomes}, ${paths}`);
}

// -----------------------------------------------
// TREASURES: found in a parcel first, then bought like any decoration
// -----------------------------------------------
{
  const farm = newFarm(now);
  farm.nuts = 1000;
  const gnome = placeable('gnome');
  const locked = buyRefusal(farm, gnome);
  farm.album.push('gnome');
  const [x, y] = freeSpotNear(farm, MAP_SIZE / 2, MAP_SIZE / 2, 1, 1)!;
  const bought = buyAndPlace(farm, 'gnome', x, y, 0, now);
  check('a treasure is locked until found, then costs its price', locked === 'locked' && !!bought && farm.nuts === 1000 - gnome.price && gnome.price > 0, `${locked}, ${farm.nuts}`);
}

// -----------------------------------------------
// FENCES: skins, joins, and the run that changes style together (docs/ferme.md 16)
// -----------------------------------------------
{
  const farm = newFarm(now);
  farm.nuts = 1000;
  // A row of three fences, and a lone one touching the row only by a corner.
  const [x, y] = freeSpotNear(farm, MAP_SIZE / 2, MAP_SIZE / 2, 5, 3)!;
  const row = [1, 2, 3].map((dx) => buyAndPlace(farm, 'fence', x + dx, y + 1, 0, now)!);
  const lone = buyAndPlace(farm, 'fence', x, y, 0, now)!;
  check('a new fence wears the first skin', row.every((f) => skinOf(f) === 'fenceRanch'));
  const index = joinIndex(farm.objects);
  check('the middle of a row joins east and west, the corner does not join', joinMask(index, x + 2, y + 1, 'fenceRanch') === (JOIN_EAST | JOIN_WEST) && joinMask(index, x, y, 'fenceRanch') === 0);

  check('no other style before level 4', nextSkin(farm, 'fence', 'fenceRanch') === null);
  farm.level = 8;
  const order = [nextSkin(farm, 'fence', 'fenceRanch'), nextSkin(farm, 'fence', 'fencePicket'), nextSkin(farm, 'fence', 'fenceWattle')];
  check('at level 8 the styles go round', order.join() === 'fencePicket,fenceWattle,fenceRanch', order.join());

  const changed = restyleRun(farm, row[1], 'fencePicket');
  check('a style change takes the whole run, not the piece beside it', changed === 3 && row.every((f) => f.skin === 'fencePicket') && skinOf(lone) === 'fenceRanch', `${changed} changed`);
  const next = buyAndPlace(farm, 'fenceGate', x + 4, y + 1, 0, now)!;
  check('the next piece bought wears the style just chosen, and joins the run', next.skin === 'fencePicket' && joinMask(joinIndex(farm.objects), x + 4, y + 1, 'fencePicket') === JOIN_WEST);

  // A fence from before the skins: turned by hand, no skin.
  saveFarm(farm);
  const raw = JSON.parse(store.get('mini-jeux.save')!) as { games: { farm: { objects: { uid: number; rot: number; skin?: string }[] } } };
  const old = raw.games.farm.objects.find((o) => o.uid === lone.uid)!;
  old.rot = 1;
  delete old.skin;
  store.set('mini-jeux.save', JSON.stringify(raw));
  const back = loadFarm()!.objects.find((o) => o.uid === lone.uid)!;
  check('an old turned fence comes back unturned, as a ranch', back.rot === 0 && skinOf(back) === 'fenceRanch');
}

// -----------------------------------------------
// HEDGES AND PATHS JOIN THEIR OWN KIND (docs/ferme.md 16)
// -----------------------------------------------
{
  const farm = newFarm(now);
  farm.nuts = 1000;
  farm.level = 5;
  const [x, y] = freeSpotNear(farm, MAP_SIZE / 2, MAP_SIZE / 2, 3, 2)!;
  buyAndPlace(farm, 'hedge', x, y, 0, now);
  buyAndPlace(farm, 'hedge', x + 1, y, 0, now);
  buyAndPlace(farm, 'fence', x + 2, y, 0, now);
  buyAndPlace(farm, 'pathDirt', x, y + 1, 0, now);
  const stone = buyAndPlace(farm, 'pathStone', x + 1, y + 1, 0, now)!;
  const index = joinIndex(farm.objects);
  check('a hedge joins a hedge, not a fence', joinMask(index, x + 1, y, 'hedge') === JOIN_WEST);
  check('a dirt path and a stone path do not join', joinMask(index, x, y + 1, 'pathDirt') === 0 && joinMask(index, x + 1, y + 1, 'pathStone') === 0);
  check('hedges and paths have no style and are never turned', stone.skin === undefined && stone.rot === 0 && skinOf(stone) === null);
}

// -----------------------------------------------
// DECORATIONS SITTING ON OTHERS (docs/ferme.md 16)
// -----------------------------------------------
{
  const farm = newFarm(now);
  farm.nuts = 5000;
  farm.level = 10;
  const [x, y] = freeSpotNear(farm, MAP_SIZE / 2, MAP_SIZE / 2, 4, 1)!;
  const fences = [0, 1, 2].map((dx) => buyAndPlace(farm, 'fence', x + dx, y, 0, now)!);
  const gate = buyAndPlace(farm, 'fenceGate', x + 3, y, 0, now)!;
  const lamp = buyAndPlace(farm, 'lantern', 0, 0, 0, now, fences[0]);
  check('a lantern sits on a fence and takes no tile', !!lamp && lamp.on === fences[0].uid && lamp.x === x && objectAt(farm, x, y) === fences[0]);
  check('one decoration per support, none on a gate, nothing on a decoration that sits',
    !canPerch(farm, 'flowerPot', fences[0]) && !canPerch(farm, 'flowerPot', gate) && !canPerch(farm, 'flowerPot', lamp!) && canPerch(farm, 'flowerPot', fences[1]));
  check('the next free post is found beside', freePerchNear(farm, 'flowerPot', x, y, 4) === fences[1]);

  const [gx, gy] = freeSpotNear(farm, MAP_SIZE / 2, MAP_SIZE / 2 + 4, 1, 1)!;
  check('a moved fence takes its lantern along', moveObject(farm, fences[0], gx, gy, 0) && lamp!.x === gx && lamp!.y === gy);
  check('the lantern moves to another post, then down to the ground',
    moveObject(farm, lamp!, 0, 0, 0, fences[2]) && lamp!.on === fences[2].uid
    && moveObject(farm, lamp!, x + 1, y + 1, 0) && lamp!.on === undefined && objectAt(farm, x + 1, y + 1) === lamp);

  const pot = buyAndPlace(farm, 'flowerPot', 0, 0, 0, now, fences[1])!;
  storeObject(farm, fences[1]);
  check('storing a support stores what sits on it', !farm.objects.includes(pot) && farm.decorStore.flowerPot === 1 && farm.decorStore.fence === 1);

  // A save where a pot sits on a support that is gone.
  const bird = buyAndPlace(farm, 'birdhouse', 0, 0, 0, now, fences[2])!;
  saveFarm(farm);
  const raw = JSON.parse(store.get('mini-jeux.save')!) as { games: { farm: { objects: { uid: number }[] } } };
  raw.games.farm.objects = raw.games.farm.objects.filter((o) => o.uid !== fences[2].uid);
  store.set('mini-jeux.save', JSON.stringify(raw));
  const back = loadFarm()!;
  check('a decoration whose support is gone goes back to the store', !back.objects.some((o) => o.uid === bird.uid) && back.decorStore.birdhouse === 1);
}

// -----------------------------------------------
// CONTENT: every recipe can be made when it opens, every quest asks for things that exist by then
// -----------------------------------------------
{
  const levelOf = (u: Unlock) => ('level' in u ? u.level : 0);
  /** The level from which an item can be had: its crop, its animal, its recipe (machine included) or its tree. */
  const itemLevel = new Map<string, number>();
  for (const c of CROPS) itemLevel.set(c.id, levelOf(c.unlock));
  for (const a of ANIMALS) itemLevel.set(a.product, Math.max(levelOf(a.unlock), levelOf(placeable(a.pen).unlock)));
  for (const [id, y] of Object.entries(TREE_YIELDS)) if ('item' in y.gives) itemLevel.set(y.gives.item, levelOf(placeable(id as TreeId).unlock));
  for (const r of RECIPES) itemLevel.set(r.item, Math.max(levelOf(r.unlock), levelOf(placeable(r.machine).unlock)));
  const late = RECIPES.flatMap((r) =>
    Object.keys(r.inputs).filter((i) => (itemLevel.get(i) ?? 99) > levelOf(r.unlock)).map((i) => `${r.item} niv ${levelOf(r.unlock)} <- ${i} niv ${itemLevel.get(i)}`),
  );
  check('every recipe input can be had by the recipe level', late.length === 0, late.join(', '));
  const unfed = ANIMALS.filter((a) => (itemLevel.get(a.feed) ?? 99) > levelOf(a.unlock)).map((a) => a.id);
  check('every animal can be fed from its level', unfed.length === 0, unfed.join(', '));
  check('every item has a value', ITEMS.every((i) => i.value > 0));

  const questIds = new Set(QUESTS.map((q) => q.id));
  const problems: string[] = [];
  for (const q of QUESTS) {
    const level = levelOf(q.unlock);
    if (q.after && !questIds.has(q.after)) problems.push(`${q.id}: after ${q.after}?`);
    for (const o of q.objectives) {
      if ('own' in o) {
        const known = PLACEABLES.some((p) => p.id === o.own) ? levelOf(placeable(o.own as PlaceableId).unlock) : ANIMALS.find((a) => a.id === o.own) ? levelOf(ANIMALS.find((a) => a.id === o.own)!.unlock) : null;
        if (known === null) problems.push(`${q.id}: own ${o.own}?`);
        else if (known > level) problems.push(`${q.id}: ${o.own} niv ${known} > ${level}`);
        continue;
      }
      const [type, target] = o.key.split(':');
      if (!target || ['deco', 'parcel', 'river', 'bridge'].includes(target)) continue;
      const at = itemLevel.get(target);
      if (['harvest', 'sow', 'produce', 'collect'].includes(type) && at === undefined) problems.push(`${q.id}: ${o.key}?`);
      else if (at !== undefined && at > level) problems.push(`${q.id}: ${o.key} niv ${at} > ${level}`);
    }
  }
  check('every quest asks for things that exist at its level', problems.length === 0, problems.join(', '));
}

// -----------------------------------------------
// LOT 2 RULES: machine copies, fruit trees, the old apple tree, rare animals by level, the market cart
// -----------------------------------------------
{
  const farm = newFarm(now);
  farm.nuts = 1e6;
  farm.level = 7;
  const cookiery = placeable('cookiery');
  check('one Cookiterie at level 7, a 2nd from level 8', capOf(farm, cookiery) === 1 && ((farm.level = 8), capOf(farm, cookiery) === 2));
  placeAnywhere(farm, 'cookiery');
  check('the 2nd copy costs twice the price', priceOf(farm, cookiery) === 2 * cookiery.price);
  const cowshed = placeable('cowshed');
  check('pens come in copies too: a 2nd Etable from level 12', ((farm.level = 11), capOf(farm, cowshed) === 1) && ((farm.level = 12), capOf(farm, cowshed) === 2));

  farm.level = 9;
  const spot = freeSpotNear(farm, MAP_SIZE / 2, MAP_SIZE / 2, 2, 2)!;
  const tree = buyAndPlace(farm, 'apple', spot[0], spot[1], 0, now)!;
  const early = collectTree(farm, tree, now);
  const ripe = collectTree(farm, tree, now + TREE_YIELDS.apple.minutes * MINUTE_MS);
  check('an apple tree gives apples when ripe, not before', early === null && ripe?.item === 'apple' && (farm.stock.apple ?? 0) === ripe.count);
  // The hazel keeps up with the farm: about a third of an average order, whatever the level.
  const hazelSpot = freeSpotNear(farm, MAP_SIZE / 2, MAP_SIZE / 2, 2, 2)!;
  const hazelTree = buyAndPlace(farm, 'hazel', hazelSpot[0], hazelSpot[1], 0, now)!;
  const hazelPick = (level: number) => {
    farm.level = level;
    hazelTree.readyAt = now;
    return collectTree(farm, hazelTree, now, () => 0.5)?.count ?? 0;
  };
  const picks = [5, 10, 30].map(hazelPick);
  check('a hazel gives about a third of an order at levels 5, 10 and 30', picks.every((n, i) => Math.abs(n / averageOrderNuts([5, 10, 30][i]) - 0.35) < 0.02));
  farm.level = 9;

  // An old save with a decorative apple tree on the map and one put away.
  const deco = buyAndPlace(farm, 'fence', spot[0] + 3, spot[1], 0, now)!;
  deco.type = 'appleTree';
  farm.decorStore.appleTree = 2;
  const nutsBefore = farm.nuts;
  saveFarm(farm);
  const back = loadFarm()!;
  const turned = back.objects.find((o) => o.uid === deco.uid);
  check('an old decorative apple tree becomes a ripe fruit tree, a stored one is paid back', turned?.type === 'apple' && turned.readyAt === 0 && !back.decorStore.appleTree && back.nuts === nutsBefore + 2 * placeable('appleTree').price);

  const duck = PRIZES.epic.find((p) => p.kind === 'breed' && p.breed === 'mandarinDuck')!;
  check('a rare duck only comes once ducks are unlocked', !isPrizeOpen(back, duck) && ((back.level = 19), isPrizeOpen(back, duck)));
}
{
  const farm = newFarm(now);
  farm.level = 6;
  ensureCart(farm, now);
  check('no market cart before its level', !farm.objects.some((o) => o.type === 'marketCart'));
  farm.level = 7;
  ensureCart(farm, now);
  check('the market cart parks on the farm at its level', farm.objects.filter((o) => o.type === 'marketCart').length === 1);
  const random = mulberry32(5);
  check('the cart brings an order of 6 to 9 items', refillCart(farm, now, random) && (() => {
    const n = Object.values(farm.cart.order!.items).reduce((s, k) => s + (k ?? 0), 0);
    return n >= 6 && n <= 9 && Object.keys(farm.cart.order!.items).length <= 3;
  })());
  const order = farm.cart.order!;
  check('the cart refuses an empty barn', deliverCart(farm, now) === null);
  for (const [id, n] of Object.entries(order.items)) farm.stock[id as ItemId] = n;
  const nuts = farm.nuts;
  check('the cart pays and leaves for three hours', deliverCart(farm, now) !== null && farm.nuts === nuts + order.nuts && farm.cart.order === null && !refillCart(farm, now + MINUTE_MS, random));
  check('the cart comes back with a new order', refillCart(farm, now + CART_BACK_MINUTES * MINUTE_MS, random));
}
// -----------------------------------------------
// THE WHOLE STORY: a player climbing from level 1 to 30 who does what each open quest asks ends every quest
// -----------------------------------------------
{
  const farm = newFarm(now);
  const stuck: string[] = [];
  for (let level = 1; level <= MAX_LEVEL; level++) {
    farm.level = level;
    if (level >= 10 && !farm.projectsDone.includes('bridge')) farm.projectsDone.push('bridge');
    for (let round = 0; round < 40; round++) {
      settle(farm, now);
      const open = QUESTS.filter((q) => q.id in farm.questStarts);
      if (open.length === 0) break;
      for (const q of open) {
        for (const o of q.objectives) {
          if ('key' in o) {
            farm.counters[o.key] = (farm.counters[o.key] ?? 0) + o.count;
            continue;
          }
          const kind = ANIMALS.find((a) => a.id === o.own);
          if (kind) {
            let pen = farm.objects.find((x) => x.type === kind.pen);
            if (!pen) farm.objects.push((pen = { uid: farm.nextUid++, type: kind.pen, x: 0, y: 0, rot: 0, animals: [], breeds: [] }));
            while ((pen.animals?.length ?? 0) < o.count) pen.animals!.push(-1);
          } else if (!farm.objects.some((x) => x.type === o.own)) {
            const pen = placeable(o.own as PlaceableId).kind === 'pen';
            farm.objects.push({ uid: farm.nextUid++, type: o.own as PlaceableId, x: 0, y: 0, rot: 0, ...(pen ? { animals: [], breeds: [] } : { queue: [], slots: 2 }) });
          }
        }
        if (!claimQuest(farm, q.id)) stuck.push(`${q.id} niv ${level}`);
      }
    }
  }
  const missing = QUESTS.filter((q) => !farm.questsDone.includes(q.id)).map((q) => q.id);
  check('the whole story can be played to its end', missing.length === 0 && stuck.length === 0, [...missing, ...stuck].join(', '));
}
// -----------------------------------------------
// THE STROLLERS: they walk the paths, never through anything, as many as the charm says, and tip once (docs/ferme.md 22)
// -----------------------------------------------
{
  const farm = newFarm(now);
  farm.level = 10;
  farm.nuts = 100000;
  farm.objects = farm.objects.filter((o) => placeable(o.type).kind !== 'obstacle');
  const [gx, gy] = gateTile(farm);
  // A stone path up from the gate, then east along row 14; a well between the gate and (15,16).
  for (let y = gy - 1; y >= 14; y--) buyAndPlace(farm, 'pathStone', gx, y, 0, now);
  for (let x = gx + 1; x <= gx + 3; x++) buyAndPlace(farm, 'pathStone', x, 14, 0, now);
  const well = buyAndPlace(farm, 'well', gx + 2, 15, 0, now);
  const walk = new WalkMap(farm, [gx, gy]);
  const toEast = walk.routeTo([gx + 3, 14]);
  check('a stroller takes the path when it is not more than three times longer', toEast.length > 0 && toEast.slice(1).every(([x, y]) => objectAt(farm, x, y)?.type === 'pathStone'), JSON.stringify(toEast));
  const behindWell = walk.routeTo([gx + 3, 17]);
  check('a route never crosses anything standing', !!well && behindWell.length > 0 && behindWell.every(([x, y]) => isWalkable(farm, x, y) && objectAt(farm, x, y) !== well));
  check('the fields, the mailbox and land not bought cannot be walked', !isWalkable(farm, 10, 10) && !isWalkable(farm, 9, 9) && !isWalkable(farm, 2, 2));
  check('the strollers by charm step are 1, 2, 2, 3, 3, 4', CHARM_STEPS.map((s) => s.strollers).join() === '1,2,2,3,3,4');
  check('a tip is 3 % of an average order, at least 1', strollerTip(1) === 1 && strollerTip(10) === 5 && strollerTip(20) === Math.round(averageOrderNuts(20) * 0.03));

  for (const id of ['flowersPink', 'flowersYellow', 'scarecrow', 'bench', 'pond', 'lantern'] as const) {
    const [w, h] = placeable(id).size;
    const spot = freeSpotNear(farm, 14, 12, w, h);
    if (spot) buyAndPlace(farm, id, spot[0], spot[1], 0, now);
  }
  const busy = new Set<string>(['marthe']);
  const strollers = new FarmStrollers(farm, false, (who) => busy.has(who), mulberry32(7));
  const cap = strollerCap(farm);
  let tooMany = 0;
  let twice = 0;
  let wrongPerson = 0;
  let blocked = 0;
  let seen = 0;
  for (let t = 0; t < 20 * 60_000; t += 100) {
    strollers.update(100, false);
    const people = strollers.people;
    seen = Math.max(seen, people.length);
    if (people.filter((p) => !p.leaving).length > cap) tooMany++;
    if (new Set(people.map((p) => p.who)).size !== people.length) twice++;
    if (people.some((p) => p.who === 'gaston' || busy.has(p.who))) wrongPerson++;
    for (const p of people) if (p.y < gy * 16 && !isWalkable(farm, Math.floor(p.x / 16), Math.floor(p.y / 16))) blocked++;
  }
  check('never more strollers than the charm allows, and some come', tooMany === 0 && seen > 0, `places ${cap}, vus ${seen}`);
  check('a stroller is never someone already on the map, nor Gaston, nor twice', twice === 0 && wrongPerson === 0);
  check('a stroller never stands on anything', blocked === 0, `${blocked} images`);
  const one = strollers.people[0];
  const first = one && strollers.touch(one.x, one.y - 10);
  const again = one && strollers.touch(one.x, one.y - 10);
  check('touching a stroller tips once, then only a heart', !!first && first.first && !!again && !again.first);
  const released = one && strollers.release(one.who);
  check('a stroller whose order can be served is handed to the village', !!released && !strollers.isStrolling(one.who));

  const quiet = new FarmStrollers(farm, false, () => false, mulberry32(3));
  quiet.update(100, false);
  const atOpening = quiet.people.length;
  let arrivedWhileAway = 0;
  let last = atOpening;
  for (let t = 0; t < 10 * 60_000; t += 100) {
    quiet.update(100, true);
    if (quiet.people.length > last) arrivedWhileAway++;
    last = quiet.people.length;
  }
  check('half of them are there at opening; nobody new comes while the player is away', atOpening === Math.ceil(strollerCap(farm) / 2) && arrivedWhileAway === 0 && last === 0, `${atOpening} à l'ouverture, ${last} restants`);
}
console.log(failures === 0 ? '\nTout est bon.' : `\n${failures} vérification(s) en échec.`);
if (failures > 0) process.exitCode = 1;
