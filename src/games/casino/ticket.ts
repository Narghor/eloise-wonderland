import './ticket.css';
import { el } from '../../dom';
import { type Difficulty, difficultyName } from '../../difficulty';
import { pay } from './chips';
import { CASINO_TEST_BUTTONS } from './fx/testMode'; // TEST-BUTTONS

// -----------------------------------------------
// CASINO TICKET (a scratch card that sometimes falls at the end of a mini game)
// -----------------------------------------------

/** One finished level in TICKET_ODDS drops a ticket. */
const TICKET_ODDS = 5;

/** [min, max] chips per difficulty, Decouverte to Expert. */
const TICKET_RANGES: readonly (readonly [number, number])[] = [
  [500, 1000],
  [500, 1500],
  [1000, 2500],
  [1500, 4000],
  [2500, 5000],
];

const TICKET_STEP = 50;

/** Share of the cover to scratch off before the rest falls away by itself. */
const REVEAL_SHARE = 0.45;

/**
 * Rolls for a ticket. When one drops, its chips are paid at once (leaving the screen never
 * loses them) and the scratch card is returned; otherwise null.
 */
export function rollCasinoTicket(difficulty: Difficulty, random: () => number = Math.random): HTMLElement | null {
  if (!CASINO_TEST_BUTTONS && random() * TICKET_ODDS >= 1) return null; // TEST-BUTTONS: every win drops one
  const amount = ticketAmount(difficulty, random);
  pay(amount);
  return scratchCard(amount, difficulty);
}

/** A random amount in the difficulty's range, on a round step. */
export function ticketAmount(difficulty: Difficulty, random: () => number = Math.random): number {
  const [min, max] = TICKET_RANGES[difficulty];
  const steps = (max - min) / TICKET_STEP;
  return min + Math.floor(random() * (steps + 1)) * TICKET_STEP;
}

function scratchCard(amount: number, difficulty: Difficulty): HTMLElement {
  const zone = el(
    'div',
    { class: 'ticket-zone' },
    el('b', { class: 'ticket-amount', text: `+${amount.toLocaleString('fr-FR')} jetons` }),
  );
  const canvas = document.createElement('canvas');
  canvas.className = 'ticket-cover';
  zone.append(canvas);
  const skip = el('button', { class: 'ticket-skip', type: 'button', text: 'Ignorer' });
  const card = el(
    'div',
    { class: 'ticket', role: 'group', 'aria-label': `Ticket casino : ${amount} jetons` },
    el('small', { class: 'ticket-title', text: `TICKET CASINO · ${difficultyName(difficulty).toUpperCase()}` }),
    zone,
    el('a', { class: 'ticket-link', href: '#/casino', text: 'Jetons ajoutés à ton solde du casino' }),
    skip,
  );

  const reveal = (): void => {
    zone.classList.add('is-open');
    skip.hidden = true;
  };
  skip.addEventListener('click', reveal);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    reveal();
    return card;
  }
  // The card is not in the page yet: the cover is painted once it has a size.
  requestAnimationFrame(() => paintCover(canvas, ctx));

  let scratching = false;
  const scrape = (event: PointerEvent): void => {
    if (!scratching) return;
    const box = canvas.getBoundingClientRect();
    const scale = canvas.width / Math.max(1, box.width);
    ctx.beginPath();
    ctx.arc((event.clientX - box.left) * scale, (event.clientY - box.top) * scale, 16 * scale, 0, Math.PI * 2);
    ctx.fill();
  };
  canvas.addEventListener('pointerdown', (event) => {
    scratching = true;
    canvas.setPointerCapture(event.pointerId);
    scrape(event);
  });
  canvas.addEventListener('pointermove', scrape);
  const stop = (): void => {
    if (!scratching) return;
    scratching = false;
    if (clearedShare(canvas, ctx) >= REVEAL_SHARE) reveal();
  };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  return card;
}

/** Silver foil with its hint; afterwards every stroke erases it. */
function paintCover(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
  // Layout size, not getBoundingClientRect: the card is still shrunk by its drop animation.
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(canvas.offsetWidth * ratio));
  canvas.height = Math.max(1, Math.round(canvas.offsetHeight * ratio));
  const foil = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  foil.addColorStop(0, '#d4d4e0');
  foil.addColorStop(0.5, '#a9a9bb');
  foil.addColorStop(1, '#c9c9d6');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = foil;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#5a5a6a';
  ctx.font = `800 ${14 * ratio}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✨ Gratte ici ✨', canvas.width / 2, canvas.height / 2);
  ctx.globalCompositeOperation = 'destination-out';
}

/** Share of the cover already scratched off, sampled on one pixel in sixteen. */
function clearedShare(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): number {
  const alpha = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let cleared = 0;
  let sampled = 0;
  for (let i = 3; i < alpha.length; i += 64) {
    sampled++;
    if (alpha[i] === 0) cleared++;
  }
  return sampled === 0 ? 1 : cleared / sampled;
}
