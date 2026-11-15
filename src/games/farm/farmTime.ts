import { CASINO_TEST_BUTTONS } from '../casino/fx/testMode'; // TEST-BUTTONS

// -----------------------------------------------
// FARM TIME: nothing runs in the background, every production is a `readyAt` read when the page opens
// -----------------------------------------------

/** One game minute. TEST-BUTTONS: a second, so every timer can be checked in a few seconds. */
export const MINUTE_MS = CASINO_TEST_BUTTONS ? 1000 : 60_000;

/** "2 min", "1 h", "1 h 30". */
export function duration(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** Time left, to the second under an hour: "45 s", "1 min 05", "2 h 10". */
export function countdown(time: number, now: number): string {
  const seconds = Math.max(0, Math.ceil(((time - now) / MINUTE_MS) * 60));
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')}`;
  return duration(seconds / 60);
}
