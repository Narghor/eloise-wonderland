import { PEN_CAPACITY, animal } from './data/animals';
import { MAILBOX_SIZE, PARCEL_EVERY_MINUTES, PITY, PRIZES, RARITIES, breed, type Prize } from './data/parcels';
import type { BreedId, Rarity } from './data/types';
import { MINUTE_MS } from './farmTime';
import { HUNGRY, type FarmSave } from './farmSave';
import { emit, isUnlocked, pay } from './farmProgress';

// -----------------------------------------------
// GASTON'S PARCELS: they arrive, they are opened, what they hold
// -----------------------------------------------

/** Gaston's rounds since the last look: the mailbox fills up to MAILBOX_SIZE, then he waits for room. */
export function deliverMail(save: FarmSave, now: number): number {
  const mail = save.mail;
  const every = PARCEL_EVERY_MINUTES * MINUTE_MS;
  let came = 0;
  while (now >= mail.nextAt) {
    if (mail.waiting >= MAILBOX_SIZE) {
      // A full mailbox does not pile up rounds: the next one comes a whole round after it has room again.
      mail.nextAt = now + every;
      break;
    }
    mail.waiting++;
    came++;
    mail.nextAt += every;
  }
  return came;
}

export interface Opened {
  rarity: Rarity;
  prize: Prize;
  /** What was actually given, ready to show. */
  nuts: number;
  /** A treasure never found before. */
  isNew: boolean;
  /** A rare animal that had no room: it waits for the player to place it. */
  waiting: boolean;
}

/** Opens one parcel: a rarity (at least rare after PITY - 1 plain ones), then a prize of that rarity, paid at once. */
export function openParcel(save: FarmSave, random: () => number = Math.random): Opened | null {
  const mail = save.mail;
  if (mail.waiting <= 0) return null;
  mail.waiting--;
  mail.opened++;
  const rarity = rollRarity(mail.sinceRare >= PITY - 1, random);
  mail.sinceRare = rarity === 'common' ? mail.sinceRare + 1 : 0;
  const prizes = PRIZES[rarity];
  const prize = prizes[Math.floor(random() * prizes.length)];
  const opened: Opened = { rarity, prize, nuts: 0, isNew: false, waiting: false };
  if (prize.kind === 'nuts') {
    opened.nuts = prize.base + prize.perLevel * save.level;
    pay(save, { nuts: opened.nuts });
  } else if (prize.kind === 'boosters') pay(save, { boosters: prize.boosters });
  else if (prize.kind === 'decor') {
    pay(save, { decor: { [prize.decor]: 1 } });
    opened.isNew = addToAlbum(save, prize.decor);
  } else {
    opened.waiting = !welcomeBreed(save, prize.breed);
    opened.isNew = addToAlbum(save, prize.breed);
  }
  emit(save, { type: 'collect', target: 'parcel', kind: rarity, count: 1 });
  return opened;
}

function rollRarity(atLeastRare: boolean, random: () => number): Rarity {
  const pool = atLeastRare ? RARITIES.filter((r) => r.id !== 'common') : RARITIES;
  let roll = random() * pool.reduce((s, r) => s + r.weight, 0);
  return (pool.find((r) => (roll -= r.weight) < 0) ?? pool[0]).id;
}

function addToAlbum(save: FarmSave, id: FarmSave['album'][number]): boolean {
  if (save.album.includes(id)) return false;
  save.album.push(id);
  return true;
}

// -----------------------------------------------
// RARE ANIMALS
// -----------------------------------------------

/** Puts a rare animal in a pen of its kind with room, hungry like any newcomer; false when it has to wait. */
export function welcomeBreed(save: FarmSave, id: BreedId): boolean {
  const kind = animal(breed(id).animal);
  const pen = isUnlocked(save, kind.unlock) ? save.objects.find((o) => o.type === kind.pen && (o.animals?.length ?? 0) < PEN_CAPACITY[kind.pen]) : undefined;
  if (!pen) {
    save.waitingBreeds.push(id);
    return false;
  }
  pen.animals!.push(HUNGRY);
  pen.breeds = [...(pen.breeds ?? pen.animals!.slice(0, -1).map(() => null)), id];
  return true;
}

/** Rare animals still waiting that a pen could take now. */
export function placeableBreeds(save: FarmSave): BreedId[] {
  return save.waitingBreeds.filter((id) => {
    const kind = animal(breed(id).animal);
    return isUnlocked(save, kind.unlock) && save.objects.some((o) => o.type === kind.pen && (o.animals?.length ?? 0) < PEN_CAPACITY[kind.pen]);
  });
}

/** Moves a waiting rare animal into its pen. */
export function placeWaitingBreed(save: FarmSave, id: BreedId): boolean {
  const index = save.waitingBreeds.indexOf(id);
  if (index < 0) return false;
  save.waitingBreeds.splice(index, 1);
  if (welcomeBreed(save, id)) return true;
  // welcomeBreed put it back at the end: keep the list as it was.
  save.waitingBreeds.pop();
  save.waitingBreeds.splice(index, 0, id);
  return false;
}
