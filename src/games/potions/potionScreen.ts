import './potions.css';
import { el, topBar } from '../../dom';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { difficultyButton, difficultyName } from '../../difficulty';
import { earnCoins } from '../../companion/companionSave';
import { rewardBanner } from '../../companion/reward';
import { CAPACITY, POTION_COLORS, POTION_LEVELS, generateLevel, isSolved, pour, pourAmount, starsFor, type Vials } from './potionBoard';
import { POTION_HELP } from './potionHelp';
import { loadPotions, savePotions, type CurrentPotions, type PotionSave } from './potionSave';

export function renderPotions(root: HTMLElement): () => void {
  const start = () => {
    root.replaceChildren();
    const save = loadPotions();
    if (!save.current) {
      const { vials, par } = generateLevel(POTION_LEVELS[save.difficulty]);
      save.current = { initial: vials, vials, moves: 0, par };
      savePotions(save);
    }
    new PotionGame(root, save, save.current, start);
  };
  start();
  return () => {};
}

class PotionGame {
  private readonly vialsEl = el('div', { class: 'vials' });
  private readonly movesEl = el('span', { class: 'potion-moves' });
  private readonly status = el('p', { class: 'potion-status', role: 'status' });
  private readonly controls: HTMLElement;
  private readonly undoButton: HTMLButtonElement;
  private readonly history: Vials[] = [];
  private selected: number | null = null;
  private finished = false;

  constructor(
    root: HTMLElement,
    private readonly save: PotionSave,
    private readonly current: CurrentPotions,
    private readonly startNext: () => void,
  ) {
    this.undoButton = el('button', { class: 'button button-secondary', type: 'button' }, '↶ Annuler');
    this.undoButton.addEventListener('click', () => this.undo());
    const restart = el('button', { class: 'button button-secondary', type: 'button' }, 'Recommencer');
    restart.addEventListener('click', () => this.restart());
    const difficulty = difficultyButton(save.difficulty, (chosen) => {
      if (!this.finished && current.moves > 0 && !confirm('Changer de difficulté ? Ce niveau est abandonné.')) return false;
      this.save.difficulty = chosen;
      this.save.current = null;
      savePotions(this.save);
      this.startNext();
    });
    this.controls = el('div', { class: 'potion-controls' }, el('div', { class: 'button-row' }, this.undoButton, restart, difficulty));

    root.append(
      el(
        'div',
        { class: 'potion-game' },
        topBar(`Fioles · ${difficultyName(save.difficulty)}`, helpSlot(POTION_HELP, this.movesEl)),
        el('div', { class: 'vials-wrap' }, this.vialsEl),
        this.status,
        this.controls,
      ),
    );
    this.status.textContent = `Objectif : ${current.par} coups.`;
    this.render();
    openHelpOnFirstVisit(POTION_HELP);
  }

  // -----------------------------------------------
  // PLAYING
  // -----------------------------------------------

  private tap(index: number): void {
    if (this.finished) return;
    const vials = this.current.vials;
    if (this.selected === null) {
      if (vials[index].length > 0) this.selected = index;
      this.render();
      return;
    }
    if (this.selected === index) {
      this.selected = null;
      this.render();
      return;
    }
    const amount = pourAmount(vials, this.selected, index);
    if (amount === 0) {
      // Not allowed: pick that vial instead, or shake an empty one.
      if (vials[index].length > 0) this.selected = index;
      else this.shake(index);
      this.render();
      return;
    }
    this.history.push(vials);
    this.current.vials = pour(vials, this.selected, index);
    this.current.moves++;
    this.selected = null;
    savePotions(this.save);
    this.render(index, amount);
    if (isSolved(this.current.vials)) this.win();
  }

  /** Undo restores the vials, not the move count: trying every pour must not be free. */
  private undo(): void {
    const previous = this.history.pop();
    if (!previous || this.finished) return;
    this.current.vials = previous;
    this.selected = null;
    savePotions(this.save);
    this.render();
  }

  private restart(): void {
    if (this.finished || !confirm('Recommencer ce niveau ? Le compteur repart de zéro.')) return;
    this.current.vials = this.current.initial;
    this.current.moves = 0;
    this.history.length = 0;
    this.selected = null;
    savePotions(this.save);
    this.render();
  }

  private win(): void {
    this.finished = true;
    const stars = starsFor(this.current.moves, this.current.par);
    this.save.done++;
    this.save.current = null;
    savePotions(this.save);
    const coins = earnCoins(stars, this.save.difficulty);

    this.vialsEl.classList.add('is-done');
    const next = el('button', { class: 'button', type: 'button' }, 'Niveau suivant');
    next.addEventListener('click', () => this.startNext());
    this.status.textContent = '';
    this.controls.replaceChildren(
      el('p', { class: 'potion-stars', text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }),
      el('p', { class: 'potion-result' }, `Trié en ${this.current.moves} coups (objectif ${this.current.par}).`),
      rewardBanner(coins),
      el('div', { class: 'button-row' }, next),
    );
  }

  // -----------------------------------------------
  // DRAWING
  // -----------------------------------------------

  /** Redraws every vial; `pouredInto`/`amount` animate the units that just arrived. */
  private render(pouredInto?: number, amount = 0): void {
    const vials = this.current.vials;
    this.vialsEl.replaceChildren(
      ...vials.map((vial, index) => {
        const button = el('button', { class: 'vial', type: 'button', 'aria-label': `Fiole ${index + 1}` });
        if (index === this.selected) button.classList.add('is-selected');
        if (vial.length === CAPACITY && new Set(vial).size === 1) button.classList.add('is-full');
        [...vial].forEach((letter, unit) => {
          const liquid = el('span', { class: 'liquid' });
          liquid.style.setProperty('--liquid', POTION_COLORS[letter]);
          liquid.style.setProperty('--level', String(unit));
          if (index === pouredInto && unit >= vial.length - amount) liquid.classList.add('is-fresh');
          button.append(liquid);
        });
        button.addEventListener('click', () => this.tap(index));
        return button;
      }),
    );
    this.undoButton.disabled = this.history.length === 0 || this.finished;
    this.movesEl.textContent = `${this.current.moves} / ${this.current.par}`;
    this.movesEl.classList.toggle('is-over', this.current.moves > this.current.par);
  }

  private shake(index: number): void {
    requestAnimationFrame(() => {
      const vial = this.vialsEl.children[index];
      vial?.classList.add('is-refused');
    });
  }
}
