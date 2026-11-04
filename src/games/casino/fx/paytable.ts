import { el } from '../../../dom';
import { formatChips } from '../chips';

// -----------------------------------------------
// PAYTABLE / RULES HELPERS (shapes, not percentages)
// -----------------------------------------------

/** Mini grids, one per payline, with the line's cells lit. `paylines[i][reel]` = row. */
export function paylineDiagrams(paylines: number[][], rows: number): HTMLElement {
  const list = el('div', { class: 'fx-paylines' });
  paylines.forEach((line, index) => {
    const grid = el('div', { class: 'fx-payline-grid', 'aria-hidden': 'true' });
    grid.style.gridTemplateColumns = `repeat(${line.length}, 1fr)`;
    for (let row = 0; row < rows; row++) {
      for (let reel = 0; reel < line.length; reel++) {
        grid.append(el('span', { class: line[reel] === row ? 'fx-payline-on' : '' }));
      }
    }
    list.append(el('figure', { class: 'fx-payline' }, grid, el('figcaption', { text: `Ligne ${index + 1}` })));
  });
  return list;
}

/** Diagram of an arbitrary shape (e.g. "8 anywhere", a cluster). `on` lists [reel, row] cells. */
export function shapeDiagram(reels: number, rows: number, on: [number, number][], caption: string): HTMLElement {
  const grid = el('div', { class: 'fx-payline-grid', 'aria-hidden': 'true' });
  grid.style.gridTemplateColumns = `repeat(${reels}, 1fr)`;
  const lit = new Set(on.map(([r, w]) => `${r},${w}`));
  for (let row = 0; row < rows; row++) {
    for (let reel = 0; reel < reels; reel++) grid.append(el('span', { class: lit.has(`${reel},${row}`) ? 'fx-payline-on' : '' }));
  }
  return el('figure', { class: 'fx-payline' }, grid, el('figcaption', { text: caption }));
}

export interface PayoutEntry {
  glyph: string;
  name: string;
  /** Payout for each count, as a multiple of the TOTAL bet. */
  multipliers: number[];
  /** Symbol counts matching `multipliers`, e.g. [3, 4, 5]. */
  counts: number[];
}

function formatMultiplier(m: number): string {
  return m.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

/** One card per symbol: "×3 = 0,5 × mise (5 jetons)". `stake` adds the chip amount at the current bet. */
export function payoutTable(entries: PayoutEntry[], stake?: number): HTMLElement {
  const list = el('div', { class: 'fx-payouts' });
  for (const entry of entries) {
    const lines = entry.counts.map((count, i) => {
      const m = entry.multipliers[i];
      const chips = stake !== undefined ? ` = ${formatChips(Math.floor(m * stake))} jetons` : '';
      return el('li', {}, el('b', { text: `${count} ${entry.glyph}` }), ` → ${formatMultiplier(m)} × mise`, el('span', { class: 'fx-payout-chips', text: chips }));
    });
    list.append(el('div', { class: 'fx-payout' }, el('p', { class: 'fx-payout-name', text: `${entry.glyph} ${entry.name}` }), el('ul', {}, ...lines)));
  }
  return list;
}

/** A titled rules block: short sentences, each one a rule. */
export function rulesBlock(title: string, ...items: (string | Node)[]): HTMLElement {
  return el('section', { class: 'fx-rules' }, el('h3', { text: title }), el('ul', {}, ...items.map((item) => el('li', {}, item))));
}
