import { PEN_CAPACITY, animal, animalOfPen } from './data/animals';
import { BREEDS, MAILBOX_SIZE, PITY, PRIZES, RARITIES, breed, type Prize } from './data/parcels';
import { charmStep } from './data/charm';
import type { BreedId, PenId, Rarity } from './data/types';
import { MINUTE_MS } from './farmTime';
import type { FarmSave, PlacedObject } from './farmSave';
import { charm, emit, isUnlocked, pay } from './farmProgress';

// -----------------------------------------------
// GASTON'S PARCELS: they arrive, they are opened, what they hold
// -----------------------------------------------

/** Gaston's rounds since the last look: the mailbox fills up to MAILBOX_SIZE, then he waits for room. */
export function deliverMail(save: FarmSave, now: number): number {
  const mail = save.mail;
  // A charming farm sees Gaston more often.
  const every = charmStep(charm(save)).step.parcelMinutes * MINUTE_MS;
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
  const prizes = PRIZES[rarity].filter((p) => isPrizeOpen(save, p));
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

/** A rare animal only comes once its kind is unlocked: a duck at level 3 would wait for months. */
export function isPrizeOpen(save: FarmSave, prize: Prize): boolean {
  return prize.kind !== 'breed' || isUnlocked(save, animal(breed(prize.breed).animal).unlock);
}

function rollRarity(atLeastRare: boolean, random: () => number): Rarity {
  const pool = atLeastRare ? RARITIES.filter((r) => r.id !== 'common') : RARITIES;
  let roll = random() * pool.reduce((s, r) => s + r.weight, 0);
  return (pool.find((r) => (roll -= r.weight) < 0) ?? pool[0]).id;
}

function addToAlbum(save: FarmSave, id: FarmSave['album'][number]): boolean {
  if (save.album.includes(id)) return false;
  save.album.push(id);
  emit(save, { type: 'collect', target: 'treasure', count: 1 });
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
  pen.animals!.push(id);
  return true;
}

/** Rare animals still waiting that a pen could take now. */
export function placeableBreeds(save: FarmSave): BreedId[] {
  return save.waitingBreeds.filter((id) => {
    const kind = animal(breed(id).animal);
    return isUnlocked(save, kind.unlock) && save.objects.some((o) => o.type === kind.pen && (o.animals?.length ?? 0) < PEN_CAPACITY[kind.pen]);
  });
}

/** Whether the pen's animals have looks to choose: a rare breed of their kind worn here or waiting to be worn. */
export function hasRareLooks(save: FarmSave, pen: PlacedObject): boolean {
  const kind = animalOfPen(pen.type as PenId).id;
  return [...save.waitingBreeds, ...(pen.animals ?? [])].some((b) => b !== null && breed(b).animal === kind);
}

/**
 * Dresses an animal of the pen in its next look: plain, then each rare breed of its kind still waiting (found in a
 * parcel, worn by no animal). The look it wore goes back to the waiting ones; a breed found once dresses one animal.
 * Returns the new look, or undefined when there is no other look to wear.
 */
export function restyleAnimal(save: FarmSave, pen: PlacedObject, index: number): BreedId | null | undefined {
  const animals = pen.animals!;
  if (index < 0 || index >= animals.length) return undefined;
  const kind = animalOfPen(pen.type as PenId).id;
  const worn = animals[index];
  const looks: (BreedId | null)[] = [null, ...BREEDS.filter((b) => b.animal === kind && (b.id === worn || save.waitingBreeds.includes(b.id))).map((b) => b.id)];
  if (looks.length === 1) return undefined;
  const next = looks[(looks.indexOf(worn) + 1) % looks.length];
  if (next !== null) save.waitingBreeds.splice(save.waitingBreeds.indexOf(next), 1);
  if (worn !== null) save.waitingBreeds.push(worn);
  animals[index] = next;
  return next;
}

/** What to do with a rare animal waiting: settle it where there is room, else dress an animal of its kind, else build. */
export function waitingBreedHint(save: FarmSave, id: BreedId): string {
  const kind = animal(breed(id).animal);
  const she = kind.feminine ? 'Elle' : 'Il';
  if (placeableBreeds(save).includes(id)) return `${she} t’attend : il y a de la place.`;
  if (!save.objects.some((o) => o.type === kind.pen && (o.animals?.length ?? 0) > 0)) return `${she} t’attend : il faut d’abord des ${kind.plural.toLowerCase()} sur la ferme.`;
  return `Pour habiller ${kind.feminine ? 'une' : 'un'} de tes ${kind.plural.toLowerCase()}, touche son enclos.`;
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
