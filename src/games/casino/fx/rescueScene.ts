import './rescue.css';
import { el } from '../../../dom';
import { BUZZ, buzz, burst, countUp, prefersReducedMotion, rain } from './effects';
import { playBigWin, playSuspenseHit, playTallyNote } from './sound';
import { RESCUE_MAX_PERCENT, RESCUE_MIN_PERCENT } from '../rescue';

// -----------------------------------------------
// RESCUE SCENE: the help after a long wait, themed per machine
// -----------------------------------------------

export type RescueTheme = 'door' | 'medusa' | 'book';

export interface RescueScene {
  theme: RescueTheme;
  /** Trusted inline SVG of the machine's emblem (its gradients must already be on the page). */
  art: string;
  title: string;
  /** The words before the percent: "Elle te rend". */
  gives: string;
  /** The words after it: "de ce que tu as perdu depuis ta dernière porte". */
  of: string;
  percent: number;
  amount: number;
  /** The machine's own sound as its emblem appears. */
  sound: () => void;
}

/** How long a machine lets the losing spin sink in before the scene starts. */
export const RESCUE_PAUSE_MS = 1500;
/** When, within that pause, playRescueHint announces that something is coming. */
export const RESCUE_HINT_MS = 600;
const ROLL_STEPS = 18;
const AUTO_CLOSE_MS = 5000;

/**
 * Full-screen scene over `host`: the emblem, the title, a percent that rolls and stops, then the
 * amount counting up. A tap rushes to the end, a second tap (or a few seconds) closes it.
 */
export function showRescue(host: HTMLElement, scene: RescueScene): Promise<void> {
  const rolled = el('b', { text: String(RESCUE_MIN_PERCENT) });
  const amount = el('strong', { class: 'fx-rescue-amount', text: '+0' });
  const overlay = el(
    'div',
    { class: `fx-bigwin fx-rescue fx-rescue-${scene.theme}`, role: 'dialog', 'aria-live': 'assertive' },
    el('div', { class: 'fx-rescue-glow', 'aria-hidden': 'true' }),
    el('div', { class: 'fx-rays', 'aria-hidden': 'true' }),
    el('div', { class: 'fx-rescue-art', 'aria-hidden': 'true' }),
    el('p', { class: 'fx-rescue-title', text: scene.title }),
    el('p', { class: 'fx-rescue-line fx-rescue-gives', text: scene.gives }),
    el('div', { class: 'fx-rescue-percent' }, rolled, el('span', { text: ' %' })),
    el('p', { class: 'fx-rescue-line fx-rescue-of', text: scene.of }),
    amount,
    el('span', { class: 'fx-rescue-unit', text: 'jetons' }),
    el('span', { class: 'fx-bigwin-hint', text: 'Touche pour continuer' }),
  );
  overlay.querySelector('.fx-rescue-art')!.innerHTML = scene.art;
  host.append(overlay);
  host.classList.add('fx-bigwin-open');

  let rushed = prefersReducedMotion();
  let wake: (() => void) | null = null;
  let finishCount: (() => void) | null = null;
  let finished = false;
  let close = (): void => {};
  const pause = (ms: number) =>
    rushed
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          const id = window.setTimeout(() => {
            wake = null;
            resolve();
          }, ms);
          wake = () => {
            window.clearTimeout(id);
            wake = null;
            resolve();
          };
        });

  overlay.addEventListener('click', () => {
    if (finished) {
      close();
      return;
    }
    rushed = true;
    wake?.();
    finishCount?.();
  });

  const stage = (name: string) => overlay.classList.add(name);

  const play = async (): Promise<void> => {
    buzz(BUZZ.bonus);
    scene.sound();
    await pause(1100);
    stage('is-title');
    burst(overlay, 24, scene.theme === 'book' ? 'confetti' : 'coins');
    await pause(800);
    stage('is-percent');
    let shown = RESCUE_MIN_PERCENT;
    for (let step = 0; step < ROLL_STEPS && !rushed; step++) {
      // Never the same number twice in a row, so each tick visibly moves.
      let next = shown;
      while (next === shown) next = RESCUE_MIN_PERCENT + Math.floor(Math.random() * (RESCUE_MAX_PERCENT - RESCUE_MIN_PERCENT + 1));
      shown = next;
      rolled.textContent = String(shown);
      playTallyNote(step);
      await pause(45 + step * step * 1.4);
    }
    rolled.textContent = String(scene.percent);
    stage('is-landed');
    playSuspenseHit();
    await pause(900);
    stage('is-amount');
    playBigWin(1);
    rain(overlay, 18, 'coins');
    await new Promise<void>((resolve) => {
      const format = (n: number) => `+${n.toLocaleString('fr-FR')}`;
      if (rushed) {
        amount.textContent = format(scene.amount);
        resolve();
        return;
      }
      finishCount = countUp(amount, scene.amount, 1800, format, resolve);
    });
    finishCount = null;
    stage('is-done');
    finished = true;
  };

  return new Promise((resolve) => {
    let closeTimer = 0;
    let closing = false;
    close = (): void => {
      if (closing) return;
      closing = true;
      window.clearTimeout(closeTimer);
      overlay.classList.add('fx-bigwin-out');
      window.setTimeout(() => {
        overlay.remove();
        if (!host.querySelector(':scope > .fx-bigwin')) host.classList.remove('fx-bigwin-open');
        resolve();
      }, 250);
    };
    void play().then(() => {
      closeTimer = window.setTimeout(close, AUTO_CLOSE_MS);
    });
  });
}
