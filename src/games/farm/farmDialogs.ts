import { el } from '../../dom';
import { playBigWin, playBonusTrigger, playClack, playCoinLand, playFanfare, playPop } from '../casino/fx/sound';
import { prefersReducedMotion } from '../casino/fx/effects';
import { booster } from './data/boosters';
import { breed, rarityName } from './data/parcels';
import { person } from './data/people';
import { placeable } from './data/placeables';
import type { BoosterId, PersonId } from './data/types';
import { boosterIcon, breedSprite, faceSprite, itemIcon, objectSprite, parcelSprite, spriteImage, uiIcon, type Sprite } from './farmArt';
import { confetti } from './farmFeedback';
import { FARM_HELP } from './farmHelp';
import { rewardLine } from './farmPanels';
import { openParcel, waitingBreedHint, type Opened } from './farmParcels';
import type { AwayNews } from './farmProduction';
import { unlocksAt, type Notice } from './farmProgress';
import { levelReward, xpToNext } from './data/levels';
import type { FarmSave } from './farmSave';

// -----------------------------------------------
// DIALOGS: one card at a time in the middle of the screen, the next waits its turn
// -----------------------------------------------
// A card closes when one of its buttons is pressed; its own click handler runs first.

const GASTON_HELLO = 'Bonjour ! Gaston, le facteur du village. Je passerai te déposer un colis toutes les quatre heures, et il y en a parfois de très jolis dedans… Celui-ci, c’est pour te souhaiter la bienvenue !';

export interface Choice {
  label: string;
  act: () => void;
  ghost?: boolean;
}

export class FarmDialogs {
  private readonly overlay: HTMLElement;
  private readonly save: FarmSave;
  private readonly commit: () => void;
  private readonly waiting: (() => HTMLElement)[] = [];
  private open = false;

  constructor(overlay: HTMLElement, save: FarmSave, commit: () => void) {
    this.overlay = overlay;
    this.save = save;
    this.commit = commit;
  }

  /** Queues a card; `make` builds it only when its turn comes. */
  show(make: () => HTMLElement): void {
    this.waiting.push(make);
    if (!this.open) this.next();
  }

  /** A villager speaking, with their face. */
  say(who: PersonId, title: string, text: string, ok: string, extra: Node[] = []): void {
    this.show(() =>
      el(
        'div',
        { class: 'farm-dialog-box farm-box' },
        el('div', { class: 'farm-speech' }, el('span', { class: 'farm-face' }, spriteImage(faceSprite(who), 3, person(who).name)), el('p', {}, el('strong', { text: `${person(who).name} · ${title}` }), text)),
        ...extra,
        el('button', { class: 'farm-btn is-wide', type: 'button', text: ok }),
      ),
    );
  }

  choose(title: string, text: string, choices: Choice[]): void {
    this.show(() => {
      const box = el('div', { class: 'farm-dialog-box farm-box' }, el('h2', { text: title }), el('p', { class: 'farm-note', text }));
      for (const c of choices) {
        const b = el('button', { class: `farm-btn is-wide${c.ghost ? ' is-ghost' : ''}`, type: 'button', text: c.label });
        b.addEventListener('click', c.act);
        box.append(b);
      }
      return box;
    });
  }

  level(n: Extract<Notice, { kind: 'level' }>): void {
    this.show(() => {
      playFanfare();
      const box = el(
        'div',
        { class: 'farm-dialog-box farm-box' },
        el('div', { class: 'farm-big-level', text: String(n.level) }),
        el('h2', { text: `Niveau ${n.level} !` }),
        el('div', { class: 'farm-pay' }, ...rewardLine(n.reward)),
        ...(n.unlocks.length > 0 ? [el('p', { class: 'farm-note', text: 'Nouveau à la ferme :' }), el('ul', {}, ...n.unlocks.map((u) => el('li', { text: u })))] : []),
        el('button', { class: 'farm-btn is-wide', type: 'button', text: 'Super !' }),
      );
      confetti(box, 30);
      return box;
    });
  }

  /** What the next level opens, everything of it, and the XP still to earn. */
  nextLevel(): void {
    const next = xpToNext(this.save.level);
    const ok = () => el('button', { class: 'farm-btn is-wide', type: 'button', text: 'D’accord' });
    this.show(() => {
      if (next === null) {
        return el('div', { class: 'farm-dialog-box farm-box' }, el('h2', { text: `Niveau ${this.save.level}` }), el('p', { class: 'farm-note', text: 'C’est le niveau maximum : ta ferme a tout débloqué !' }), ok());
      }
      const level = this.save.level + 1;
      const unlocks = unlocksAt(level);
      return el(
        'div',
        { class: 'farm-dialog-box farm-box' },
        el('div', { class: 'farm-big-level', text: String(level) }),
        el('h2', { text: `Au niveau ${level}` }),
        el('p', { class: 'farm-note', text: `Encore ${(next - this.save.xp).toLocaleString('fr-FR')} XP.` }),
        el('div', { class: 'farm-pay' }, ...rewardLine(levelReward(level))),
        ...(unlocks.length > 0 ? [el('p', { class: 'farm-note', text: 'Nouveau à la ferme :' }), el('ul', {}, ...unlocks.map((u) => el('li', { text: u })))] : []),
        ok(),
      );
    });
  }

  /** How to play, in the farm's wood and paper rather than the site's pink. */
  help(): void {
    this.show(() =>
      el(
        'div',
        { class: 'farm-dialog-box farm-box farm-help' },
        el('h2', { text: FARM_HELP.title }),
        el('ol', {}, ...FARM_HELP.steps.map((parts) => el('li', {}, ...parts))),
        el('button', { class: 'farm-btn is-wide', type: 'button', text: 'C’est parti !' }),
      ),
    );
  }

  /** "While you were away": what grew, what came, told as one happy card. */
  welcomeBack(news: AwayNews, parcels: number, orders: number, newDay: boolean): void {
    const plural = (n: number, one: string, many: string) => (n > 1 ? many.replace('#', String(n)) : one);
    const lines: [Sprite, string][] = [];
    if (news.fields > 0) lines.push([itemIcon('wheat'), plural(news.fields, 'Un champ a mûri', '# champs ont mûri')]);
    if (news.animals > 0) lines.push([itemIcon('egg'), plural(news.animals, 'Un animal a produit', '# animaux ont produit')]);
    if (news.machines > 0) lines.push([itemIcon('flour'), plural(news.machines, 'Une fabrication est prête', '# fabrications sont prêtes')]);
    if (news.trees > 0) lines.push([uiIcon('nut'), plural(news.trees, 'Un noisetier a donné', '# noisetiers ont donné')]);
    if (parcels > 0) lines.push([parcelSprite(null), plural(parcels, 'Gaston a déposé un colis', 'Gaston a déposé # colis')]);
    if (orders > 0) lines.push([uiIcon('orders'), plural(orders, 'Une nouvelle commande', '# nouvelles commandes')]);
    if (newDay) lines.push([uiIcon('chest'), 'De nouvelles tâches du jour']);
    if (lines.length === 0) return;
    this.show(() =>
      el(
        'div',
        { class: 'farm-dialog-box farm-box' },
        el('h2', { text: 'Pendant ton absence…' }),
        el('ul', { class: 'farm-away' }, ...lines.map(([icon, text]) => el('li', {}, spriteImage(icon, 3), text))),
        el('button', { class: 'farm-btn is-wide', type: 'button', text: 'Allons voir !' }),
      ),
    );
  }

  /** The parcels waiting in the mailbox, one card each; the very first one, Gaston introduces himself. */
  parcels(): void {
    if (this.save.mail.opened === 0) this.say('gaston', 'Le facteur', GASTON_HELLO, 'Ouvrir le colis !');
    this.show(() => this.parcelCard());
  }

  private next(): void {
    const make = this.waiting.shift();
    this.open = !!make;
    if (!make) return;
    const dialog = el('div', { class: 'farm-dialog' }, make());
    dialog.addEventListener('pointerdown', (e) => e.stopPropagation());
    dialog.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.farm-btn')) {
        dialog.remove();
        this.next();
      }
    });
    this.overlay.append(dialog);
  }

  // -----------------------------------------------
  // GASTON'S PARCELS
  // -----------------------------------------------

  /** The parcel shakes when touched, then bursts open in the colour of its rarity. */
  private parcelCard(): HTMLElement {
    const box = el('div', { class: 'farm-dialog-box farm-box farm-parcel' });
    const stage = el('button', { class: 'farm-parcel-stage', type: 'button', 'aria-label': 'Ouvrir le colis' }, spriteImage(parcelSprite(null), 6));
    box.append(el('h2', { text: 'Un colis de Gaston !' }), stage, el('p', { class: 'farm-note', text: 'Touche le colis pour l’ouvrir.' }));
    let opening = false;
    stage.addEventListener('click', () => {
      if (opening) return;
      opening = true;
      playClack();
      stage.classList.add('is-shaking');
      window.setTimeout(() => this.reveal(box), prefersReducedMotion() ? 0 : 750);
    });
    return box;
  }

  private reveal(box: HTMLElement): void {
    const opened = openParcel(this.save);
    if (!opened) return;
    const { icon, scale, name } = prizeLook(opened);
    const rarity = opened.rarity;
    [playPop, () => playCoinLand('big'), playBonusTrigger, () => playBigWin(2)][['common', 'rare', 'epic', 'legendary'].indexOf(rarity)]();
    const more = this.save.mail.waiting;
    const next = el('button', { class: 'farm-btn is-wide', type: 'button', text: `Ouvrir le suivant (${more})` });
    next.addEventListener('click', () => this.show(() => this.parcelCard()));
    box.className = `farm-dialog-box farm-box farm-parcel is-open is-${rarity}`;
    box.replaceChildren(
      el('span', { class: 'farm-rarity', text: rarityName(rarity) }),
      el('div', { class: 'farm-parcel-prize' }, el('span', { class: 'farm-rays', 'aria-hidden': 'true' }), spriteImage(icon, scale)),
      el('h2', { text: name }),
      ...(opened.isNew ? [el('span', { class: 'farm-new', text: 'Nouveau dans l’album !' })] : []),
      ...(opened.waiting && opened.prize.kind === 'breed' ? [el('p', { class: 'farm-note', text: waitingBreedHint(this.save, opened.prize.breed) })] : []),
      ...(opened.prize.kind === 'decor' ? [el('p', { class: 'farm-note', text: 'Elle t’attend dans la Boutique, onglet Déco : pose-la où tu veux.' })] : []),
      ...(more > 0 ? [next] : []),
      el('button', { class: `farm-btn is-wide${more > 0 ? ' is-ghost' : ''}`, type: 'button', text: 'Super !' }),
    );
    if (rarity === 'epic' || rarity === 'legendary') confetti(box, rarity === 'legendary' ? 40 : 24);
    this.commit();
  }
}

/** The picture and the name of what a parcel held. */
function prizeLook(opened: Opened): { icon: Sprite; scale: number; name: string } {
  const prize = opened.prize;
  if (prize.kind === 'nuts') return { icon: uiIcon('nut'), scale: 5, name: `${opened.nuts} Éloisettes` };
  if (prize.kind === 'boosters') {
    const entries = Object.entries(prize.boosters) as [BoosterId, number][];
    return { icon: boosterIcon(entries[0][0]), scale: 5, name: entries.map(([id, n]) => `${n} ${n > 1 ? booster(id).plural : booster(id).name}`).join(' et ') };
  }
  if (prize.kind === 'decor') {
    const sprite = objectSprite(prize.decor, 'face');
    return { icon: sprite, scale: Math.max(2, Math.min(4, Math.floor(110 / sprite.height))), name: placeable(prize.decor).name };
  }
  return { icon: breedSprite(prize.breed, 0), scale: 6, name: breed(prize.breed).name };
}
