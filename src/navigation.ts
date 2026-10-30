/** Goes to a route, rendering it again even when it is already the current one (e.g. "next level"). */
export function navigate(hash: string): void {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
}
