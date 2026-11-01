// -----------------------------------------------
// LUNA ART - original SVG symbols (no third-party artwork)
// -----------------------------------------------
// Gradients live once in LUNA_DEFS (mounted at the screen root, never display:none).

export const LUNA_DEFS = `<svg class="luna-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
<linearGradient id="lg-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".45" stop-color="#f2c75c"/><stop offset=".55" stop-color="#c8902a"/><stop offset="1" stop-color="#ffe7a0"/></linearGradient>
<linearGradient id="lg-silver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#b9c4e8"/><stop offset="1" stop-color="#eef2ff"/></linearGradient>
<linearGradient id="lg-rose" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd3f0"/><stop offset=".5" stop-color="#d266b4"/><stop offset="1" stop-color="#ffc2e6"/></linearGradient>
<linearGradient id="lg-cyan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9fbff"/><stop offset=".5" stop-color="#3fb7d8"/><stop offset="1" stop-color="#bff3ff"/></linearGradient>
<radialGradient id="rg-orb" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".25" stop-color="#c9b8ff"/><stop offset=".7" stop-color="#6a3fd0"/><stop offset="1" stop-color="#2a1260"/></radialGradient>
<linearGradient id="lg-potion" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cf5c4"/><stop offset="1" stop-color="#108a6a"/></linearGradient>
<linearGradient id="lg-cover" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a2a9a"/><stop offset="1" stop-color="#22104a"/></linearGradient>
<linearGradient id="lg-hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a5a32"/><stop offset="1" stop-color="#4e2a14"/></linearGradient>
<radialGradient id="rg-skin" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#ffe9dc"/><stop offset="1" stop-color="#f3c3ad"/></radialGradient>
<linearGradient id="lg-owl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c79a6a"/><stop offset="1" stop-color="#6b4528"/></linearGradient>
</defs></svg>`;

function royal(letter: string, fill: string, size = 62): string {
  return `<svg viewBox="0 0 100 100"><text x="50" y="72" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${size}" fill="url(#${fill})" stroke="#3b1d07" stroke-width="2.4" paint-order="stroke">${letter}</text><path d="M22 84 Q50 92 78 84" stroke="url(#lg-gold)" stroke-width="2" fill="none"/><circle cx="50" cy="88" r="2.4" fill="url(#lg-gold)"/></svg>`;
}

const POTION = `<svg viewBox="0 0 100 100"><rect x="42" y="10" width="16" height="10" rx="2" fill="#8a5a2b"/><path d="M40 20h20v14c14 6 22 18 22 32 0 18-14 28-32 28S18 84 18 66c0-14 8-26 22-32z" fill="url(#lg-silver)" opacity=".35" stroke="url(#lg-gold)" stroke-width="3"/><path d="M22 64c8-5 18 4 28 0s18-6 28 0c0 16-12 25-28 25S22 80 22 64z" fill="url(#lg-potion)"/><circle cx="42" cy="72" r="3" fill="#e6fff5"/><circle cx="55" cy="80" r="2" fill="#e6fff5"/><circle cx="60" cy="68" r="1.6" fill="#e6fff5"/><path d="M30 50q4-8 10-10" stroke="#fff" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/></svg>`;

const CRYSTAL = `<svg viewBox="0 0 100 100"><circle cx="50" cy="44" r="30" fill="url(#rg-orb)" stroke="url(#lg-gold)" stroke-width="2"/><path d="M50 30l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5z" fill="#fff"/><circle cx="38" cy="54" r="2" fill="#fff" opacity=".8"/><path d="M26 82h48l-6-12H32z" fill="url(#lg-gold)" stroke="#3b1d07" stroke-width="1.5"/><rect x="22" y="82" width="56" height="7" rx="3" fill="url(#lg-gold)" stroke="#3b1d07" stroke-width="1.5"/></svg>`;

const OWL = `<svg viewBox="0 0 100 100"><path d="M24 30 32 16 40 28Q50 24 60 28L68 16 76 30Q84 44 80 64 74 88 50 90 26 88 20 64 16 44 24 30z" fill="url(#lg-owl)" stroke="#2c1608" stroke-width="2"/><path d="M34 62q16 12 32 0" stroke="#e8cfa6" stroke-width="2" fill="none"/><path d="M36 72q14 9 28 0" stroke="#e8cfa6" stroke-width="2" fill="none"/><circle cx="38" cy="44" r="11" fill="url(#lg-gold)" stroke="#2c1608" stroke-width="2"/><circle cx="62" cy="44" r="11" fill="url(#lg-gold)" stroke="#2c1608" stroke-width="2"/><circle cx="38" cy="44" r="5" fill="#1a0d33"/><circle cx="62" cy="44" r="5" fill="#1a0d33"/><circle cx="40" cy="42" r="1.6" fill="#fff"/><circle cx="64" cy="42" r="1.6" fill="#fff"/><path d="M46 52l4 8 4-8z" fill="#f2a83a"/></svg>`;

/** Sun-ray crown: thin gold rays with a bead at each tip, fanned above the head. */
function crownRays(): string {
  let out = '';
  for (let k = 0; k <= 12; k++) {
    const a = Math.PI * (1.05 + (k / 12) * 0.9);
    const long = k % 2 === 0 ? 44 : 37;
    const x1 = 50 + Math.cos(a) * 20, y1 = 44 + Math.sin(a) * 20;
    const x2 = 50 + Math.cos(a) * long, y2 = 44 + Math.sin(a) * long;
    out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="url(#lg-gold)" stroke-width="2.2" stroke-linecap="round"/><circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="${k % 2 === 0 ? 2.8 : 2.1}" fill="#fff1b8" stroke="#c8902a" stroke-width=".8"/>`;
  }
  return out;
}

/** Eloise, celestial sorceress: chestnut waves, sun-ray crown, gold sequins. */
const ELOISE_PORTRAIT = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#1b1350"/><circle cx="50" cy="44" r="30" fill="#ffd36b" opacity=".18"/>${crownRays()}<path d="M18 104C22 82 34 76 50 76s28 6 32 28z" fill="url(#lg-gold)" stroke="#8a5a1a" stroke-width="1"/><g fill="#fff6c8" opacity=".9"><circle cx="30" cy="92" r="1.3"/><circle cx="38" cy="86" r="1.3"/><circle cx="46" cy="94" r="1.3"/><circle cx="56" cy="88" r="1.3"/><circle cx="64" cy="95" r="1.3"/><circle cx="70" cy="87" r="1.3"/><circle cx="35" cy="98" r="1.1"/><circle cx="60" cy="81" r="1.1"/></g><rect x="44" y="64" width="12" height="12" fill="#f3c3ad"/><path d="M50 26C32 26 26 40 27 54c1 10-4 18-2 24 6 2 10-4 12-10l26 0c2 6 6 12 12 10 2-6-3-14-2-24 1-14-5-28-23-28z" fill="url(#lg-hair)"/><ellipse cx="50" cy="52" rx="15" ry="18" fill="url(#rg-skin)"/><path d="M33 50C34 36 42 31 52 31c10 0 16 8 16 18-6-8-14-11-22-9-5 1-9 5-13 10z" fill="url(#lg-hair)"/><path d="M36 44q4-6 12-8" stroke="#a0683e" stroke-width="1.4" fill="none" opacity=".7"/><path d="M41 52q3-3 6 0M53 52q3-3 6 0" stroke="#3a2010" stroke-width="2" fill="none" stroke-linecap="round"/><g fill="#ffd36b"><circle cx="40" cy="49" r=".9"/><circle cx="43" cy="47.6" r=".8"/><circle cx="57" cy="47.6" r=".8"/><circle cx="60" cy="49" r=".9"/><circle cx="39" cy="53" r=".7"/><circle cx="61" cy="53" r=".7"/></g><circle cx="40" cy="59" r="3.4" fill="#ff8fab" opacity=".5"/><circle cx="60" cy="59" r="3.4" fill="#ff8fab" opacity=".5"/><path d="M44 62q6 5 12 0" stroke="#b03a52" stroke-width="2" fill="#fff" stroke-linecap="round"/><path d="M38 76q12 9 24 0" stroke="#ffe08a" stroke-width="1.2" fill="none"/><circle cx="50" cy="80.5" r="1.6" fill="#ffe08a"/></svg>`;
const BOOK_SVG = `<svg viewBox="0 0 100 100"><rect x="18" y="12" width="66" height="78" rx="6" fill="#e9dcb8"/><rect x="14" y="10" width="66" height="78" rx="6" fill="url(#lg-cover)" stroke="url(#lg-gold)" stroke-width="3"/><rect x="21" y="17" width="52" height="64" rx="3" fill="none" stroke="url(#lg-gold)" stroke-width="1.5"/><path d="M58 32a16 16 0 1 0 0 30a13 13 0 1 1 0-30z" fill="url(#lg-gold)"/><path d="M60 40l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" fill="#fff6c8"/><path d="M24 22l5 0 0 5M70 22l-5 0 0 5M24 76l5 0 0-5M70 76l-5 0 0-5" stroke="url(#lg-gold)" stroke-width="2" fill="none"/><rect x="10" y="40" width="6" height="18" rx="2" fill="url(#lg-gold)"/></svg>`;

export const SYMBOL_ART: string[] = [
  royal('10', 'lg-cyan', 50),
  royal('J', 'lg-rose'),
  royal('Q', 'lg-silver'),
  royal('K', 'lg-gold'),
  royal('A', 'lg-gold'),
  POTION,
  CRYSTAL,
  OWL,
  ELOISE_PORTRAIT,
  BOOK_SVG,
];

/** Large open book for the free-spins intro: two pages, the right one flips. */
export const OPEN_BOOK = `<svg viewBox="0 0 200 120" class="luna-open-book-svg"><path d="M100 18Q60 6 14 14v92q46-8 86 4z" fill="#f4e8c8" stroke="url(#lg-gold)" stroke-width="3"/><path d="M100 18Q140 6 186 14v92q-46-8-86 4z" fill="#f4e8c8" stroke="url(#lg-gold)" stroke-width="3"/><path d="M28 34q30-6 60 2M28 50q30-6 60 2M28 66q30-6 60 2M28 82q30-6 60 2" stroke="#c9b48a" stroke-width="2" fill="none"/><line x1="100" y1="18" x2="100" y2="110" stroke="#b38a3a" stroke-width="2"/></svg>`;
