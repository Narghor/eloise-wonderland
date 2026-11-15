import { CASINO_TEST_BUTTONS } from '../casino/fx/testMode'; // TEST-BUTTONS

// -----------------------------------------------
// FARM TIME: nothing runs in the background, every production is a `readyAt` read when the page opens
// -----------------------------------------------

/** One game minute. TEST-BUTTONS: a second, so every timer can be checked in a few seconds. */
export const MINUTE_MS = CASINO_TEST_BUTTONS ? 1000 : 60_000;

/** "18 h 40", or "demain 6 h 05": every timer says when it ends, never a bar without an hour. */
export function clockAt(time: number, now: number): string {
  const date = new Date(time);
  const hour = `${date.getHours()} h ${String(date.getMinutes()).padStart(2, '0')}`;
  const today = new Date(now);
  const sameDay = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
  return sameDay ? hour : `demain ${hour}`;
}

/** "2 min", "1 h", "1 h 30". */
export function duration(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** What is left before `time`, short: "45 s", "12 min", "2 h 10". */
export function remaining(time: number, now: number): string {
  const ms = Math.max(0, time - now);
  if (ms < MINUTE_MS) return `${Math.ceil(ms / (MINUTE_MS / 60))} s`;
  return duration(ms / MINUTE_MS);
}
