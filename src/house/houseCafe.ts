import { companionCanvas } from '../companion/companionArt';
import type { Difficulty } from '../difficulty';
import type { TeaCafe } from '../games/tea/teaGame';
import type { Arrival } from '../games/tea/teaLogic';
import { CAFE_GUEST_SHARE, CAFE_LEVELS, CAFE_STARS } from './houseData';
import { befriend, character } from './houseLogic';
import { loadHouse, saveHouse } from './houseSave';

/** The café's reputation, used as its difficulty: it only grows. */
export function cafeLevel(): Difficulty {
  return loadHouse().cafeLevel as Difficulty;
}

/** "★★☆☆☆" for a reputation level. */
export function reputationStars(level: number): string {
  return '★'.repeat(level + 1) + '☆'.repeat(CAFE_LEVELS - level - 1);
}

/** Seats the characters already met among the café customers, and turns each one served into friendship. */
export function openCafe(schedule: Arrival[], random = Math.random): TeaCafe {
  const save = loadHouse();
  const met = Object.keys(save.friends).filter((id) => save.friends[id].met);
  if (met.length > 0) {
    // The first customer is always a friend, so the café shows at once who comes.
    schedule.forEach((arrival, index) => {
      if (index === 0 || random() < CAFE_GUEST_SHARE) arrival.guest = met[Math.floor(random() * met.length)];
    });
  }

  const gained = new Map<string, number>();
  const chapters: string[] = [];
  return {
    back: { href: '#/maison/cafe', label: 'Maison' },
    title: `Café de la maison · ${reputationStars(save.cafeLevel)}`,
    portrait: (guest) => companionCanvas(character(guest).look, 44),
    served(guest) {
      const house = loadHouse();
      const { newChapter } = befriend(house, guest, CAFE_STARS);
      saveHouse(house);
      gained.set(guest, (gained.get(guest) ?? 0) + CAFE_STARS);
      if (newChapter) chapters.push(`${character(guest).name} : chapitre ${newChapter} à lire dans l’album !`);
    },
    finish(stars) {
      const lines: string[] = [];
      if (gained.size > 0) lines.push(`Amitié : ${[...gained].map(([id, n]) => `${character(id).name} +${n} ♥`).join(', ')}`);
      lines.push(...chapters);
      const house = loadHouse();
      if (stars === 3 && house.cafeLevel < CAFE_LEVELS - 1) {
        house.cafeLevel++;
        saveHouse(house);
        lines.push(`Ton café devient célèbre ! Réputation ${reputationStars(house.cafeLevel)} : plus de thés, plus de clients.`);
      } else if (house.cafeLevel < CAFE_LEVELS - 1) {
        lines.push('Un service à 3 étoiles fera grandir la réputation du café.');
      }
      return lines;
    },
  };
}
