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
import { PITY } from '../src/games/farm/data/parcels';
import { ITEMS } from '../src/games/farm/data/items';
import { buyAndPlace, canStand, ensureMailbox, footprint, freeSpotNear, isOwned, newFarm } from '../src/games/farm/farmMap';
import { orderable, rollOrder } from '../src/games/farm/farmOrders';
import { deliverMail, openParcel } from '../src/games/farm/farmParcels';
import { breedsOf, buyAnimal, collectMachine, collectPen, feedPen, harvest, queueRecipe, sow } from '../src/games/farm/farmProduction';
import { loadFarm, saveFarm, type FarmSave } from '../src/games/farm/farmSave';
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

console.log(failures === 0 ? '\nTout est bon.' : `\n${failures} vérification(s) en échec.`);
if (failures > 0) process.exitCode = 1;
