// Inline SVG art for Le Regard de Medusa: Medusa's head and the temple scatter.
// Gradients live once in OLYMPUS_DEFS (mounted at the screen root, never display:none).

export const OLYMPUS_DEFS = `<svg class="oly-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute"><defs>
<radialGradient id="oz-sky" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#e6f3ff"/><stop offset="0.65" stop-color="#8ec3ff"/><stop offset="1" stop-color="#3f7ad8"/></radialGradient>
<linearGradient id="oz-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset="0.5" stop-color="#f2c230"/><stop offset="1" stop-color="#b8820c"/></linearGradient>
<radialGradient id="om-disc" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#e6fff0"/><stop offset="0.65" stop-color="#7fd6a0"/><stop offset="1" stop-color="#1f7a4a"/></radialGradient>
<linearGradient id="om-snake" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9be36a"/><stop offset="1" stop-color="#2f8f3e"/></linearGradient>
<radialGradient id="om-skin" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#e8f7dc"/><stop offset="1" stop-color="#a9d39a"/></radialGradient>
<linearGradient id="ot-marble" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e2dccd"/></linearGradient>
<radialGradient id="ot-glow" cx="50%" cy="55%" r="55%"><stop offset="0" stop-color="#ffe9a0" stop-opacity="0.9"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient>
</defs></svg>`;

/** One hair snake: a wavy body from (x, y) along angle `a`, ending in a small head with a red tongue. */
const SNAKE = (x: number, y: number, a: number) =>
  `<g transform="rotate(${a} ${x} ${y})">` +
  `<path d="M${x} ${y}q-4 -5 0 -9t0 -9" stroke="#1e5a2a" stroke-width="7" fill="none" stroke-linecap="round"/>` +
  `<path d="M${x} ${y}q-4 -5 0 -9t0 -9" stroke="url(#om-snake)" stroke-width="5" fill="none" stroke-linecap="round"/>` +
  `<ellipse cx="${x}" cy="${y - 20}" rx="4.2" ry="3.4" fill="url(#om-snake)" stroke="#1e5a2a" stroke-width="1"/>` +
  `<circle cx="${x - 1.5}" cy="${y - 21}" r="0.9" fill="#ffd400"/><circle cx="${x + 1.5}" cy="${y - 21}" r="0.9" fill="#ffd400"/>` +
  `<path d="M${x} ${y - 23}v-2.5l-1 -1.2M${x} ${y - 25.5}l1 -1.2" stroke="#e0283c" stroke-width="0.8" fill="none"/>` +
  `</g>`;

/** Medusa's head: hair of green snakes, pale green skin, gold diadem with an emerald, glowing gold eyes, emerald disc. */
export const MEDUSA_HEAD = `<svg viewBox="0 0 100 100" class="oly-art oly-medusa-art" aria-hidden="true">
<circle cx="50" cy="50" r="48" fill="url(#om-disc)" stroke="url(#oz-gold)" stroke-width="3"/>
${SNAKE(32, 44, -70)}${SNAKE(34, 36, -40)}${SNAKE(43, 32, -12)}${SNAKE(57, 32, 12)}${SNAKE(66, 36, 40)}${SNAKE(68, 44, 70)}
<path d="M28 44C24 58 26 72 30 80C34 74 33 62 34 54ZM72 44C76 58 74 72 70 80C66 74 67 62 66 54Z" fill="url(#om-snake)" stroke="#1e5a2a" stroke-width="1"/>
<path d="M50 84C39 84 31 72 31 54C31 40 39 30 50 30C61 30 69 40 69 54C69 72 61 84 50 84Z" fill="url(#om-skin)" stroke="#4f7d4a" stroke-width="1.2"/>
<path d="M33 40C37 32 44 28 50 28C56 28 63 32 67 40C60 36 40 36 33 40Z" fill="#2f7d3c" stroke="#1e5a2a" stroke-width="1"/>
<path d="M34 38Q50 30 66 38L64 42Q50 35 36 42Z" fill="url(#oz-gold)" stroke="#8a5f00" stroke-width="1"/>
<path d="M50 31l3.5 4.5L50 40l-3.5 -4.5Z" fill="#18a35a" stroke="#8a5f00" stroke-width="1"/>
<path d="M38 50q5 -3 9 0M53 50q4 -3 9 0" stroke="#2c4a2a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<ellipse cx="42.5" cy="55" rx="4" ry="2.8" fill="#fff6b0"/><ellipse cx="57.5" cy="55" rx="4" ry="2.8" fill="#fff6b0"/>
<ellipse cx="42.5" cy="55" rx="1.2" ry="2.6" fill="#7a5200"/><ellipse cx="57.5" cy="55" rx="1.2" ry="2.6" fill="#7a5200"/>
<path d="M50 58q-2 6 1 7" stroke="#4f7d4a" stroke-width="1.2" fill="none" stroke-linecap="round"/>
<path d="M44 72q6 4 12 0q-6 2 -12 0Z" fill="#9c2a4a" stroke="#6e1a33" stroke-width="1"/>
<ellipse cx="37" cy="64" rx="3" ry="1.8" fill="#7fc98a" opacity="0.6"/><ellipse cx="63" cy="64" rx="3" ry="1.8" fill="#7fc98a" opacity="0.6"/>
</svg>`;

/** Lobby icon: the head with its own gradients (the lobby has no OLYMPUS_DEFS). */
export const MEDUSA_ICON = OLYMPUS_DEFS + MEDUSA_HEAD;

/** The temple scatter: marble temple with a gold pediment on a warm glow. */
export const TEMPLE = `<svg viewBox="0 0 100 100" class="oly-art oly-temple-art" aria-hidden="true">
<circle cx="50" cy="55" r="46" fill="url(#ot-glow)"/>
<path d="M12 36L50 12L88 36Z" fill="url(#oz-gold)" stroke="#7a5200" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M44 20L38 30H44L41 34L52 25H46L49 20Z" fill="#fff6d0"/>
<rect x="14" y="36" width="72" height="8" rx="1.5" fill="url(#ot-marble)" stroke="#7a5200" stroke-width="2"/>
<g fill="url(#ot-marble)" stroke="#7a5200" stroke-width="2"><rect x="19" y="44" width="10" height="34"/><rect x="35" y="44" width="10" height="34"/><rect x="55" y="44" width="10" height="34"/><rect x="71" y="44" width="10" height="34"/></g>
<path d="M24 48v26M40 48v26M60 48v26M76 48v26" stroke="#c9bfa8" stroke-width="2"/>
<rect x="12" y="78" width="76" height="6" rx="1.5" fill="url(#ot-marble)" stroke="#7a5200" stroke-width="2"/>
<rect x="8" y="84" width="84" height="7" rx="2" fill="url(#oz-gold)" stroke="#7a5200" stroke-width="2"/>
</svg>`;
