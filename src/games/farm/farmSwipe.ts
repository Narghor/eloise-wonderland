// -----------------------------------------------
// SWIPE DOWN TO CLOSE: the sheets and the seed row follow the finger and leave when pulled down
// -----------------------------------------------
// Touch events, not pointer events: a sheet's body scrolls, and only touch events can take the gesture back from
// the browser (preventDefault) once the list is at its top and the finger keeps pulling down.

/** Pulled further than this, or quickly enough, the panel closes. */
const CLOSE_PX = 90;
const FLICK_PX_PER_MS = 0.5;
const DECIDE_PX = 6;
const OUT_MS = 180;

/**
 * Lets `panel` be pulled down to close. `scroller` is its scrolling part, if any: pulling there only starts once it
 * is scrolled to the top. Horizontal drags (the seed row) are left alone.
 */
export function swipeToClose(panel: HTMLElement, scroller: HTMLElement | null, close: () => void): void {
  let start: { x: number; y: number; at: number } | null = null;
  let dragging = false;
  let decided = false;
  let dy = 0;

  panel.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    start = { x: e.touches[0].clientX, y: e.touches[0].clientY, at: performance.now() };
    dragging = false;
    decided = false;
    dy = 0;
  }, { passive: true });

  panel.addEventListener('touchmove', (e) => {
    if (!start) return;
    const t = e.touches[0];
    dy = t.clientY - start.y;
    const dx = t.clientX - start.x;
    if (!decided) {
      if (Math.abs(dy) < DECIDE_PX && Math.abs(dx) < DECIDE_PX) return;
      decided = true;
      const insideList = scroller !== null && scroller.contains(e.target as Node);
      dragging = Math.abs(dy) > Math.abs(dx) && dy > 0 && (!insideList || scroller!.scrollTop <= 0);
      if (dragging) panel.style.transition = 'none';
    }
    if (!dragging) return;
    e.preventDefault();
    panel.style.transform = `translateY(${Math.max(0, dy)}px)`;
  }, { passive: false });

  const end = () => {
    if (!start) return;
    const speed = dy / Math.max(1, performance.now() - start.at);
    start = null;
    if (!dragging) return;
    panel.style.transition = `transform ${OUT_MS}ms ease-out`;
    if (dy > CLOSE_PX || (dy > 30 && speed > FLICK_PX_PER_MS)) {
      panel.style.transform = 'translateY(110%)';
      window.setTimeout(close, OUT_MS);
    } else panel.style.transform = '';
  };
  panel.addEventListener('touchend', end);
  panel.addEventListener('touchcancel', end);
}
