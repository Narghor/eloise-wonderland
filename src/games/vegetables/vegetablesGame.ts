import { el, topBar, type BackLink } from '../../dom';
import { helpSlot, openHelpOnFirstVisit } from '../../help';
import { difficultyName } from '../../difficulty';
import { levelReward } from '../../companion/reward';
import { VEGETABLES_HELP } from './vegetablesHelp';
import {
  KINDS,
  canPlant,
  canWater,
  clear,
  copyField,
  endDay,
  harvest,
  isOver,
  isRipe,
  moodAt,
  nightsToRipe,
  sow,
  starsFor,
  water,
  type KindId,
} from './vegetablesLogic';
import { saveVegetables, type CurrentSeason, type VegetableSave } from './vegetablesSave';

const BACK_VEGETABLES: BackLink = { href: '#/potager', label: 'Potager' };
const WEATHER_ICONS = { sun: '☀️', rain: '🌧️', frost: '❄️' } as const;
const LIGHT_WORDS = { sun: 'soleil', shade: 'ombre', any: 'soleil ou ombre' } as const;

export interface VegetableGameActions {
  nextSeason(): void;
  replaySeason(): void;
}

export function stars(count: number): string {
  return '★'.repeat(count) + '☆'.repeat(3 - count);
}

export function kindLine(kind: KindId): string {
  const info = KINDS[kind];
  const names = (list: KindId[]) => list.map((other) => KINDS[other].emoji).join(' ');
  const parts = [
    `mûre en ${info.grow} nuits`,
    info.thirst === 1 ? 'à arroser chaque jour' : `eau pour ${info.thirst} nuits`,
    LIGHT_WORDS[info.light],
    `vaut ${info.value}${info.regrow ? ', repousse' : ''}`,
  ];
  if (info.likes.length) parts.push(`aime ${names(info.likes)}`);
  if (info.dislikes.length) parts.push(`déteste ${names(info.dislikes)}`);
  if (info.tender) parts.push('frileuse');
  return parts.join(' · ');
}

export class VegetableGame {
  private readonly status = el('p', { class: 'veg-status' });
  private readonly goal = el('div', { class: 'veg-goal' });
  private readonly forecast = el('ol', { class: 'veg-forecast', 'aria-label': 'Météo de la saison' });
  private readonly plot: HTMLElement;
  private readonly cellButtons: HTMLButtonElement[] = [];
  private readonly message = el('p', { class: 'veg-message', role: 'status' });
  private readonly packet = el('div', { class: 'veg-packet', role: 'group', 'aria-label': 'Sachet de graines' });
  private readonly seedInfo = el('p', { class: 'veg-seed-info' });
  private readonly controls: HTMLElement;
  private readonly nextButton = el('button', { class: 'button', type: 'button' }, 'Journée suivante');
  private readonly restartButton = el('button', { class: 'button button-secondary', type: 'button' }, 'Recommencer la journée');
  private selected = 0;

  constructor(
    root: HTMLElement,
    private readonly save: VegetableSave,
    private readonly current: CurrentSeason,
    private readonly actions: VegetableGameActions,
  ) {
    const { garden } = current;
    this.plot = el('div', { class: `veg-plot is-tree-${garden.tree}`, role: 'grid', 'aria-label': 'Potager' });
    this.plot.style.setProperty('--columns', String(garden.width));
    garden.shade.forEach((shaded, index) => {
      const button = el('button', { class: `veg-cell${shaded ? ' is-shade' : ''}`, type: 'button' });
      button.addEventListener('click', () => this.tap(index));
      this.cellButtons.push(button);
      this.plot.append(button);
    });
    this.selected = Math.max(0, current.field.seeds.findIndex((count) => count > 0));
    this.nextButton.addEventListener('click', () => this.nextDay());
    this.restartButton.addEventListener('click', () => this.restartDay());
    this.controls = el(
      'div',
      { class: 'veg-controls' },
      this.packet,
      this.seedInfo,
      el('div', { class: 'button-row' }, this.restartButton, this.nextButton),
    );

    root.append(
      el(
        'div',
        { class: 'veg-game' },
        topBar(
          `Potager n°${current.number} · ${current.challenge ? 'Défi du jour' : difficultyName(current.difficulty)}`,
          helpSlot(VEGETABLES_HELP),
          BACK_VEGETABLES,
        ),
        el('div', { class: 'veg-board' }, this.status, this.goal, this.forecast, el('div', { class: 'veg-plot-frame' }, el('span', { class: 'veg-tree', 'aria-hidden': 'true', text: '🌳' }), this.plot), this.message),
        this.controls,
      ),
    );
    if (isOver(garden, current.field)) this.finish();
    else this.refresh();
    openHelpOnFirstVisit(VEGETABLES_HELP);
  }

  dispose(): void {}

  private get field() {
    return this.current.field;
  }

  // -----------------------------------------------
  // ONE TAP ON THE PLOT
  // -----------------------------------------------

  private tap(index: number): void {
    const { garden } = this.current;
    const field = this.field;
    if (isOver(garden, field)) return;
    const plant = field.cells[index];
    if (plant?.dead) {
      clear(field, index);
      this.say('Plante arrachée. La case est libre.');
    } else if (plant && isRipe(plant)) {
      const value = harvest(garden, field, index);
      this.say(`${KINDS[plant.kind].emoji} récoltée : +${value} !`);
    } else if (plant) {
      if (canWater(field, index)) {
        water(field, index);
        this.say(`${KINDS[plant.kind].emoji} arrosée.`);
      } else this.say(this.plantNews(index));
    } else if (canPlant(field, index, this.selected)) {
      sow(garden, field, index, this.selected);
      const kind = garden.kinds[this.selected];
      const nights = nightsToRipe(garden, field, index);
      this.say(`${KINDS[kind].emoji} plantée. ${nights === Infinity ? 'Elle ne pousse pas ici !' : `Mûre dans ${nights} nuit${nights > 1 ? 's' : ''}.`}`);
      if (field.seeds[this.selected] === 0) this.selected = Math.max(0, field.seeds.findIndex((count) => count > 0));
    } else if (field.actionsLeft === 0) {
      this.say('Plus d’action aujourd’hui : passe à la journée suivante.');
    } else {
      this.say('Plus de graines de cette sorte.');
    }
    saveVegetables(this.save);
    this.refresh();
  }

  private plantNews(index: number): string {
    const { garden } = this.current;
    const field = this.field;
    const plant = field.cells[index]!;
    if (field.actionsLeft === 0) return 'Plus d’action aujourd’hui : passe à la journée suivante.';
    const nights = nightsToRipe(garden, field, index);
    const mood = moodAt(garden, field, index, plant.kind);
    const notes = [`${KINDS[plant.kind].emoji} déjà arrosée`, nights === Infinity ? 'elle ne pousse plus' : `mûre dans ${nights} nuit${nights > 1 ? 's' : ''}`];
    if (mood.wrongLight) notes.push(`elle voudrait ${LIGHT_WORDS[KINDS[plant.kind].light]}`);
    if (mood.enemies) notes.push('une voisine la gêne');
    return `${notes.join(', ')}.`;
  }

  private say(text: string): void {
    this.message.textContent = text;
  }

  private nextDay(): void {
    const { garden } = this.current;
    const ripe = this.field.cells.filter((plant) => plant && isRipe(plant)).length;
    const last = this.field.day === garden.days;
    if (last && ripe > 0 && !confirm('Il reste des plantes mûres à récolter. Finir la saison quand même ?')) return;
    const report = endDay(garden, this.field);
    this.current.morning = copyField(this.field);
    saveVegetables(this.save);
    if (isOver(garden, this.field)) {
      this.finish();
      return;
    }
    const news: string[] = [];
    const weather = garden.weather[this.field.day - 1];
    if (weather === 'rain') news.push('Il a plu : tout est arrosé.');
    if (report.frozen) news.push(`Le gel a tué ${report.frozen} plante${report.frozen > 1 ? 's' : ''}.`);
    if (report.dried) news.push(`${report.dried} plante${report.dried > 1 ? 's sont mortes' : ' est morte'} de soif.`);
    if (report.rotted) news.push(`${report.rotted} plante${report.rotted > 1 ? 's ont' : ' a'} pourri.`);
    this.say(news.join(' ') || 'Nouvelle journée au potager.');
    this.refresh();
  }

  private restartDay(): void {
    this.current.field = copyField(this.current.morning);
    saveVegetables(this.save);
    this.say('La journée recommence.');
    this.refresh();
  }

  // -----------------------------------------------
  // DRAWING
  // -----------------------------------------------

  private refresh(): void {
    const { garden } = this.current;
    const field = this.field;
    const last = field.day === garden.days;
    this.status.replaceChildren(
      el('strong', { text: `Jour ${field.day} / ${garden.days}` }),
      ` · ${field.actionsLeft} action${field.actionsLeft > 1 ? 's' : ''} · 🧺 ${field.score}`,
    );
    this.drawGoal();
    this.forecast.replaceChildren(
      ...garden.weather.map((weather, day) =>
        el('li', { class: day + 1 === field.day ? 'is-today' : day + 1 < field.day ? 'is-past' : '', title: `Jour ${day + 1}` }, WEATHER_ICONS[weather]),
      ),
    );
    field.cells.forEach((plant, index) => this.drawCell(index, plant === null ? null : plant.kind));
    this.packet.replaceChildren(
      ...garden.kinds.map((kind, kindIndex) => {
        const count = field.seeds[kindIndex];
        const button = el(
          'button',
          { class: `veg-seed${kindIndex === this.selected ? ' is-selected' : ''}`, type: 'button', 'aria-pressed': String(kindIndex === this.selected) },
          el('span', { class: 'veg-seed-emoji', text: KINDS[kind].emoji }),
          el('span', { text: KINDS[kind].label }),
          el('small', { text: `× ${count}` }),
        );
        button.disabled = count === 0;
        button.addEventListener('click', () => {
          this.selected = kindIndex;
          this.refresh();
        });
        return button;
      }),
    );
    const kind = garden.kinds[this.selected];
    this.seedInfo.textContent = `${KINDS[kind].emoji} ${KINDS[kind].label} : ${kindLine(kind)}`;
    this.nextButton.textContent = last ? 'Finir la saison' : 'Journée suivante';
  }

  private drawGoal(): void {
    const { targets } = this.current.garden;
    const top = Math.max(1, targets[2]);
    const fill = el('span', { class: 'veg-goal-fill' });
    fill.style.width = `${Math.min(100, (this.field.score / top) * 100)}%`;
    const marks = targets.map((target, i) => {
      const mark = el('span', { class: `veg-goal-mark${this.field.score >= target ? ' is-reached' : ''}`, text: '★'.repeat(i + 1) });
      mark.style.left = `${(target / top) * 100}%`;
      return mark;
    });
    this.goal.replaceChildren(
      el('span', { class: 'veg-goal-bar' }, fill, ...marks),
      el('span', { class: 'veg-goal-text', text: `Objectif ${targets[0]} · ${targets[1]} · ${targets[2]}` }),
    );
  }

  private drawCell(index: number, kind: KindId | null): void {
    const { garden } = this.current;
    const button = this.cellButtons[index];
    const plant = this.field.cells[index];
    const classes = ['veg-cell'];
    if (garden.shade[index]) classes.push('is-shade');
    if (!plant || !kind) {
      button.className = classes.join(' ');
      button.replaceChildren();
      button.setAttribute('aria-label', garden.shade[index] ? 'Case vide, à l’ombre' : 'Case vide, au soleil');
      return;
    }
    const info = KINDS[kind];
    const ripe = isRipe(plant);
    const progress = plant.growth / (info.grow * 2);
    if (plant.dead) classes.push('is-dead');
    else if (ripe) classes.push('is-ripe');
    else if (plant.dryNights > 0) classes.push('is-wilted');
    else if (plant.moisture === 0) classes.push('is-thirsty');
    button.className = classes.join(' ');

    const sprite = el('span', { class: 'veg-sprite', text: plant.dead ? '🥀' : progress < 0.5 ? '🌱' : info.emoji });
    sprite.style.setProperty('--grow', String(plant.dead ? 0.8 : 0.55 + 0.45 * progress));
    const children: Node[] = [sprite];
    if (!plant.dead) {
      const mood = moodAt(garden, this.field, index, kind);
      if (mood.friends) children.push(el('span', { class: 'veg-badge is-friend', text: '💚' }));
      if (mood.enemies || mood.wrongLight) children.push(el('span', { class: 'veg-badge is-enemy', text: '💢' }));
      if (!ripe) {
        children.push(el('span', { class: 'veg-drops', text: plant.moisture ? '💧'.repeat(plant.moisture) : 'soif !' }));
        const nights = nightsToRipe(garden, this.field, index);
        children.push(el('span', { class: 'veg-days', text: nights === Infinity ? '–' : `${nights}j` }));
      }
    }
    button.replaceChildren(...children);
    const state = plant.dead ? 'morte, touche pour arracher' : ripe ? 'mûre, touche pour récolter' : `${plant.moisture} nuit d’eau`;
    button.setAttribute('aria-label', `${info.label}, ${state}`);
  }

  // -----------------------------------------------
  // END OF THE SEASON
  // -----------------------------------------------

  private finish(): void {
    const { garden, field } = this.current;
    const earned = starsFor(field.score, garden.targets);
    this.drawGoal();
    this.status.replaceChildren(el('strong', { text: 'Fin de la saison' }), ` · 🧺 ${field.score}`);
    field.cells.forEach((plant, index) => this.drawCell(index, plant === null ? null : plant.kind));
    this.message.textContent = '';
    const again = el('button', { class: 'button button-secondary', type: 'button' }, 'Rejouer cette saison');
    again.addEventListener('click', () => this.actions.replaySeason());

    if (earned === 0) {
      this.controls.replaceChildren(
        el('p', { class: 'veg-result' }, `Récolte : ${field.score}. Il fallait ${garden.targets[0]} pour l’objectif… Essaie une autre organisation !`),
        el('div', { class: 'button-row' }, again, el('a', { class: 'button button-secondary', href: '#/potager' }, 'Mon cellier')),
      );
      return;
    }
    const crops = garden.kinds.map((kind, i) => ({ kind, count: field.harvested[i] })).filter((crop) => crop.count > 0);
    this.save.seasonsDone = Math.max(this.save.seasonsDone, this.current.number);
    this.save.cellar.push({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      number: this.current.number,
      score: field.score,
      stars: earned,
      crops,
      madeAt: new Date().toISOString(),
    });
    const { difficulty, challenge } = this.current;
    this.save.current = null;
    saveVegetables(this.save);
    const next = el('button', { class: 'button', type: 'button' }, 'Saison suivante');
    next.addEventListener('click', () => this.actions.nextSeason());
    this.controls.replaceChildren(
      el('p', { class: 'veg-result' }, el('strong', { text: stars(earned) }), ` Belle récolte : ${field.score} !`),
      el('p', { class: 'veg-crops', text: crops.map((crop) => `${KINDS[crop.kind].emoji} × ${crop.count}`).join('   ') }),
      levelReward(earned, difficulty, challenge),
      el('div', { class: 'button-row' }, next, el('a', { class: 'button button-secondary', href: '#/potager' }, 'Mon cellier')),
    );
  }
}
