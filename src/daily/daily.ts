import { readGame, writeGame } from '../save';
import type { Difficulty } from '../difficulty';

// -----------------------------------------------
// DAILY CHALLENGE
// -----------------------------------------------
// One game per day, in rotation, at a fixed difficulty. The first finish of a day pays big;
// a run of days in a row pays a bonus, and the count of challenges unlocks items in the shop.

const GAME_ID = 'daily';
const DAY_MS = 24 * 60 * 60 * 1000;

export const CHALLENGE_DIFFICULTY: Difficulty = 2;
const COINS_PER_STAR = 10;
const STREAK_LENGTH = 7;
const STREAK_BONUS = 50;
/** Games without a star grade: finishing the challenge is a perfect score. */
export const UNGRADED_CHALLENGE_STARS = 3;

export type ChallengeGame = 'picross' | 'sand' | 'glass' | 'bubbles' | 'icing' | 'potions';

const ROTATION: readonly ChallengeGame[] = ['picross', 'sand', 'glass', 'bubbles', 'icing', 'potions'];

export const CHALLENGE_GAME_NAMES: Record<ChallengeGame, string> = {
  picross: 'Picross',
  sand: 'Bouteilles de sable',
  glass: 'Vitraux',
  bubbles: 'Bulles mélangées',
  icing: 'Glaçage',
  potions: 'Fioles',
};

export interface DailySave {
  /** Stars won, by day ("2026-10-30"). */
  days: Record<string, number>;
}

export function loadDaily(): DailySave {
  const raw = readGame(GAME_ID);
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const days: Record<string, number> = {};
  if (typeof data.days === 'object' && data.days !== null) {
    for (const [day, stars] of Object.entries(data.days)) if (isDayKey(day) && Number.isInteger(stars)) days[day] = stars as number;
  }
  return { days };
}

function saveDaily(save: DailySave): void {
  writeGame(GAME_ID, save);
}

/** The local calendar day: a challenge changes at midnight where she is, not in UTC. */
export function todayKey(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isDayKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dayNumber(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function shiftDay(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  return todayKey(new Date(year, month - 1, day + days));
}

export function challengeGameOn(key: string): ChallengeGame {
  return ROTATION[dayNumber(key) % ROTATION.length];
}

export function challengesDone(save: DailySave = loadDaily()): number {
  return Object.keys(save.days).length;
}

/** Days in a row up to today, or up to yesterday while today's is still to play. */
export function streak(save: DailySave = loadDaily(), today = todayKey()): number {
  let day = save.days[today] !== undefined ? today : shiftDay(today, -1);
  let count = 0;
  while (save.days[day] !== undefined) {
    count++;
    day = shiftDay(day, -1);
  }
  return count;
}

export interface ChallengePay {
  coins: number;
  /** Part of `coins` paid for a full week in a row. */
  streakBonus: number;
}

/** Records a finished challenge; null when that day was already done (a replay pays like a normal level). */
export function completeChallenge(day: string, stars: number): ChallengePay | null {
  const save = loadDaily();
  if (save.days[day] !== undefined) return null;
  save.days[day] = stars;
  saveDaily(save);
  const run = streak(save, day);
  const streakBonus = run > 0 && run % STREAK_LENGTH === 0 ? STREAK_BONUS : 0;
  return { coins: stars * COINS_PER_STAR + streakBonus, streakBonus };
}
