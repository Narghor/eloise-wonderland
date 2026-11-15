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
import { totalCharm } from '../src/games/farm/data/charm';
import { PITY } from '../src/games/farm/data/parcels';
import { ITEMS } from '../src/games/farm/data/items';
import {
  buyAndPlace, canPerch, canStand, ensureMailbox, footprint, freePerchNear, freeSpotNear, gateTile, isOwned, isRoad, moveObject, newFarm, objectAt, storeObject,
} from '../src/games/farm/farmMap';
import { orderable, rollOrder } from '../src/games/farm/farmOrders';
import { deliverMail, openParcel } from '../src/games/farm/farmParcels';
import { breedsOf, buyAnimal, collectMachine, collectPen, feedPen, harvest, queueRecipe, sow } from '../src/games/farm/farmProduction';
import { loadFarm, saveFarm, type FarmSave } from '../src/games/farm/farmSave';
import { joinIndex, joinMask, nextSkin, restyleRun, skinOf } from '../src/games/farm/farmJoins';
import { JOIN_EAST, JOIN_WEST } from '../src/games/farm/data/skins';
import { MINUTE_MS } from '../src/games/farm/farmTime';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ` - ${detail}` : ''}`);
  if (!ok) failures++;
}

const now = Date.UTC(2026, 10, 15, 12);

/** Buys and places a placeable on the first free spot near the middle. */
function placeAnywhere(farm: FarmSave, id: 'mill' | 'coop') {
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
}

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
  const ids = ['field', 'mill', 'bakery', 'coop', 'cowshed', 'fence', 'bench', 'well', 'pond'] as const;
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
  const mill = placeAnywhere(farm, 'mill');
  farm.stock = { wheat: 20, corn: 10 };
  const queued = mill !== null && queueRecipe(farm, mill, 'chickenFeed', now) && queueRecipe(farm, mill, 'chickenFeed', now);
  check('a machine takes two recipes, not a third', queued && !queueRecipe(farm, mill!, 'chickenFeed', now));
  const made = collectMachine(farm, mill!, now + 10 * MINUTE_MS);
  check('the tray gives what was made', made.length === 1 && made[0].count === 6);
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
  check('the album only holds treasures, once each', new Set(farm.album).size === farm.album.length && farm.album.length <= 9);

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

console.log(failures === 0 ? '\nTout est bon.' : `\n${failures} vérification(s) en échec.`);
if (failures > 0) process.exitCode = 1;
