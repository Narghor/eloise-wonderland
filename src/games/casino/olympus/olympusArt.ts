// Inline SVG art for Foudre de l'Olympe: Zeus's head and the temple scatter.
// Gradients live once in OLYMPUS_DEFS (mounted at the screen root, never display:none).

export const OLYMPUS_DEFS = `<svg class="oly-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute"><defs>
<radialGradient id="oz-sky" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#e6f3ff"/><stop offset="0.65" stop-color="#8ec3ff"/><stop offset="1" stop-color="#3f7ad8"/></radialGradient>
<linearGradient id="oz-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset="0.5" stop-color="#f2c230"/><stop offset="1" stop-color="#b8820c"/></linearGradient>
<linearGradient id="oz-hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfd8e6"/></linearGradient>
<radialGradient id="oz-skin" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#ffe3c8"/><stop offset="1" stop-color="#eab48c"/></radialGradient>
<linearGradient id="ot-marble" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e2dccd"/></linearGradient>
<radialGradient id="ot-glow" cx="50%" cy="55%" r="55%"><stop offset="0" stop-color="#ffe9a0" stop-opacity="0.9"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient>
</defs></svg>`;

const LEAF = (x: number, y: number, a: number) =>
  `<ellipse cx="${x}" cy="${y}" rx="6" ry="3" transform="rotate(${a} ${x} ${y})" fill="url(#oz-gold)" stroke="#8a5f00" stroke-width="0.8"/>`;

/** Zeus's head: white hair and beard, gold laurel, a gold bolt on the brow, sky-blue disc. */
export const ZEUS_HEAD = `<svg viewBox="0 0 100 100" class="oly-art oly-zeus-art" aria-hidden="true">
<circle cx="50" cy="50" r="48" fill="url(#oz-sky)" stroke="url(#oz-gold)" stroke-width="3"/>
<path d="M24 72C12 62 13 40 21 28C26 14 40 8 50 8C60 8 74 14 79 28C87 40 88 62 76 72C72 64 28 64 24 72Z" fill="url(#oz-hair)" stroke="#9fb0c8" stroke-width="1.2"/>
<ellipse cx="50" cy="44" rx="17" ry="19" fill="url(#oz-skin)" stroke="#b9805a" stroke-width="1"/>
<path d="M30 46C27 60 28 74 34 84Q38 92 44 90Q50 98 56 90Q62 92 66 84C72 74 73 60 70 46C66 56 60 60 50 60C40 60 34 56 30 46Z" fill="url(#oz-hair)" stroke="#9fb0c8" stroke-width="1.2"/>
<path d="M38 68q4 6 0 12M50 66q2 8 0 16M62 68q-4 6 0 12" stroke="#b7c3d6" stroke-width="1.4" fill="none" stroke-linecap="round"/>
<path d="M50 54C44 52 38 54 35 59C40 58 45 58 50 57C55 58 60 58 65 59C62 54 56 52 50 54Z" fill="#ffffff" stroke="#9fb0c8" stroke-width="1"/>
<path d="M36 38l10 3M64 38l-10 3" stroke="#e8edf5" stroke-width="4" stroke-linecap="round"/>
<path d="M36 38l10 3M64 38l-10 3" stroke="#8d9bb0" stroke-width="1" stroke-linecap="round" fill="none"/>
<ellipse cx="43" cy="45" rx="2.6" ry="3" fill="#1d2b55"/><ellipse cx="57" cy="45" rx="2.6" ry="3" fill="#1d2b55"/>
<circle cx="44" cy="44" r="0.9" fill="#fff"/><circle cx="58" cy="44" r="0.9" fill="#fff"/>
<path d="M50 46q-2 5 1 6" stroke="#b9805a" stroke-width="1.3" fill="none" stroke-linecap="round"/>
<ellipse cx="38" cy="51" rx="3" ry="1.8" fill="#f19a8a" opacity="0.5"/><ellipse cx="62" cy="51" rx="3" ry="1.8" fill="#f19a8a" opacity="0.5"/>
${LEAF(26, 32, -60)}${LEAF(31, 24, -40)}${LEAF(38, 19, -20)}${LEAF(74, 32, 60)}${LEAF(69, 24, 40)}${LEAF(62, 19, 20)}
<path d="M54 3L46 15H51L47 27L59 12H53L57 3Z" fill="url(#oz-gold)" stroke="#8a5f00" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`;

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
