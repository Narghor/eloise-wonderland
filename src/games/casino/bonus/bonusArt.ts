// -----------------------------------------------
// DOOR MACHINE ART: the treasure door
// -----------------------------------------------
// Gradients live once in BONUS_DEFS (mounted at the screen root, never display:none),
// so every door on the reels shares them instead of repeating ids.

export const BONUS_DEFS = `<svg class="bonus-defs fx-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute"><defs>
<linearGradient id="bd-wood" x1="0" x2="1"><stop offset="0" stop-color="#7a2a10"/><stop offset=".5" stop-color="#a8451c"/><stop offset="1" stop-color="#6a220c"/></linearGradient>
<linearGradient id="bd-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a8"/><stop offset=".5" stop-color="#f2b81c"/><stop offset="1" stop-color="#b87a00"/></linearGradient>
<radialGradient id="bd-light"><stop offset="0" stop-color="#fffbe0"/><stop offset="1" stop-color="#ffd23f" stop-opacity="0"/></radialGradient>
</defs></svg>`;

/** An arched wooden door with gold bands, a glowing keyhole and a sparkle. */
export const TREASURE_DOOR = `<svg viewBox="0 3 100 100" class="bonus-door-art" aria-hidden="true">
<path d="M18 96 V42 A32 32 0 0 1 82 42 V96 Z" fill="url(#bd-gold)"/>
<path d="M25 96 V43 A25 25 0 0 1 75 43 V96 Z" fill="url(#bd-wood)"/>
<g stroke="#5a1a06" stroke-width="1.6"><line x1="37" y1="22" x2="37" y2="96"/><line x1="50" y1="18" x2="50" y2="96"/><line x1="63" y1="22" x2="63" y2="96"/></g>
<rect x="25" y="50" width="50" height="5" fill="url(#bd-gold)"/><rect x="25" y="78" width="50" height="5" fill="url(#bd-gold)"/>
<g fill="#ffe27a"><circle cx="31" cy="52.5" r="1.8"/><circle cx="69" cy="52.5" r="1.8"/><circle cx="31" cy="80.5" r="1.8"/><circle cx="69" cy="80.5" r="1.8"/></g>
<circle cx="50" cy="66" r="11" fill="url(#bd-light)"/>
<path d="M50 60 a4 4 0 0 1 2.6 7 l2 8 h-9.2 l2-8 a4 4 0 0 1 2.6 -7 z" fill="#2a0c02" stroke="url(#bd-gold)" stroke-width="2"/>
<path d="M50 63.5 l1.2 3 -1.2 6 -1.2 -6 z" fill="#fff3a8"/>
<path d="M44 12 l2 -6 2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 z" fill="#fff" opacity=".9"/>
</svg>`;
