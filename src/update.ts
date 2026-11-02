import { el } from './dom';

// -----------------------------------------------
// NEW VERSION CHECK: an installed app can stay open for days on one version
// -----------------------------------------------

const CHECK_EVERY_MS = 5 * 60 * 1000;

/** The hashed bundle name in a page, e.g. "assets/index-B30PABaj.js". */
function bundleOf(html: string): string | null {
  return html.match(/assets\/index-[\w-]+\.js/)?.[0] ?? null;
}

const running = bundleOf(document.documentElement.outerHTML);
let shown = false;

async function check(): Promise<void> {
  if (shown || !running || document.visibilityState !== 'visible') return;
  try {
    const response = await fetch('./', { cache: 'no-store' });
    const latest = bundleOf(await response.text());
    if (latest && latest !== running) showBanner();
  } catch {
    // Offline: try again later.
  }
}

function showBanner(): void {
  shown = true;
  const banner = el('button', { class: 'update-banner', type: 'button' }, '✨ Nouvelle version ! Touche ici pour la charger');
  banner.addEventListener('click', () => location.reload());
  document.body.append(banner);
}

/** Watches for a newer published version; offers a reload when one exists. */
export function watchForUpdates(): void {
  if (!running) return;
  document.addEventListener('visibilitychange', () => void check());
  window.setInterval(() => void check(), CHECK_EVERY_MS);
}
