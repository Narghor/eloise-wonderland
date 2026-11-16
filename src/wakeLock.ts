// -----------------------------------------------
// THE SCREEN STAYS ON WHILE PLAYING
// -----------------------------------------------
// A game screen asks the browser to keep the screen on (Screen Wake Lock), as long as someone is playing: after
// PLAYER_AWAY_MS without a touch or a key, the lock is let go and the phone may sleep as usual; the next touch takes
// it back. The browser drops the lock by itself when the page is hidden; it is taken back on return. Browsers
// without the API simply sleep as before.

/** Without a touch or a key for this long, the player is away: the screen may sleep and the games slow down. */
export const PLAYER_AWAY_MS = 3 * 60_000;

let wanted = false;
let lock: WakeLockSentinel | null = null;
let asking = false;
let lastActivity = 0;
let awayTimer = 0;

/** On for a game screen, off for the home page. */
export function keepScreenOn(on: boolean): void {
  wanted = on;
  if (on) activity();
  else letGo();
}

/** True while nobody touched the page for PLAYER_AWAY_MS. */
export function isPlayerAway(now = performance.now()): boolean {
  return now - lastActivity > PLAYER_AWAY_MS;
}

function activity(): void {
  lastActivity = performance.now();
  if (!wanted) return;
  window.clearTimeout(awayTimer);
  awayTimer = window.setTimeout(letGo, PLAYER_AWAY_MS);
  void take();
}

async function take(): Promise<void> {
  if (!wanted || lock || asking || document.hidden || !('wakeLock' in navigator)) return;
  asking = true;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => (lock = null));
  } catch {
    // Refused (battery saver, no permission): the phone sleeps as usual.
  } finally {
    asking = false;
  }
}

function letGo(): void {
  window.clearTimeout(awayTimer);
  void lock?.release();
  lock = null;
}

for (const type of ['pointerdown', 'keydown'] as const) window.addEventListener(type, activity, { passive: true, capture: true });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && wanted && !isPlayerAway()) void take();
});
