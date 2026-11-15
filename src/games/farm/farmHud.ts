import { el } from '../../dom';
import { muteButton } from '../casino/fx/sound';
import { xpToNext } from './data/levels';
import { person } from './data/people';
import { faceSprite, spriteImage, uiIcon, type UiIcon } from './farmArt';
import { deliverableCount } from './farmOrders';
import { isChestReady, isQuestReady, objectiveProgress, openQuests } from './farmProgress';
import type { FarmSave } from './farmSave';

// -----------------------------------------------
// THE TOP BAND AND THE BOTTOM BAR
// -----------------------------------------------

export type SheetId = 'barn' | 'orders' | 'quests' | 'shop' | 'bag';

export interface HudActions {
  sheet(id: SheetId, tab?: string): void;
  edit(): void;
  zoom(): void;
  help(): void;
  seeds(): void;
}

const TABS: { id: SheetId | 'build' | 'seeds'; label: string; icon: UiIcon }[] = [
  { id: 'barn', label: 'Grange', icon: 'barn' },
  { id: 'orders', label: 'Commandes', icon: 'orders' },
  { id: 'quests', label: 'Quêtes', icon: 'quests' },
  { id: 'seeds', label: 'Graines', icon: 'seed' },
  { id: 'shop', label: 'Boutique', icon: 'shop' },
  { id: 'build', label: 'Aménager', icon: 'build' },
];

export class FarmHud {
  readonly top: HTMLElement;
  readonly quest: HTMLButtonElement;
  readonly bar: HTMLElement;
  readonly side: HTMLElement;
  private readonly levelBadge = el('span', { class: 'farm-level-badge' });
  private readonly levelText = el('span');
  private readonly xpFill = el('i');
  private readonly nuts = el('b');
  private readonly boosterCount = el('span', { class: 'farm-count is-neutral' });
  private readonly questFace = el('span', { class: 'farm-face' });
  private readonly questText = el('p');
  private readonly questBadge = el('span', { class: 'farm-count' });
  private readonly counts = new Map<string, HTMLElement>();
  private readonly tabs = new Map<string, HTMLButtonElement>();
  private readonly zoomIcon = el('span', { class: 'farm-side-icon' });
  private readonly zoomLabel = el('span');

  constructor(actions: HudActions) {
    const back = el('a', { class: 'farm-back', href: '#/', 'aria-label': 'Retour aux jeux' }, spriteImage(uiIcon('back'), 3));
    const boosters = el('button', { class: 'farm-round farm-box', type: 'button', 'aria-label': 'Mes boosters' }, spriteImage(uiIcon('sack'), 3), this.boosterCount);
    boosters.addEventListener('click', () => actions.sheet('bag'));
    this.top = el(
      'div',
      { class: 'farm-top' },
      back,
      el('div', { class: 'farm-level farm-box' }, this.levelBadge, el('div', { class: 'farm-level-meta' }, this.levelText, el('div', { class: 'farm-xp' }, this.xpFill))),
      el('div', { class: 'farm-money farm-box', title: 'Éloisettes' }, spriteImage(uiIcon('nut'), 2, 'Éloisettes'), this.nuts),
      boosters,
    );
    this.quest = el('button', { class: 'farm-quest-pill farm-box', type: 'button' }, this.questFace, this.questText, this.questBadge);
    this.quest.addEventListener('click', () => actions.sheet('quests', 'story'));

    this.bar = el('nav', { class: 'farm-bar', 'aria-label': 'Menu de la ferme' });
    for (const tab of TABS) {
      const count = el('span', { class: 'farm-count' });
      const button = el('button', { class: 'farm-tab', type: 'button', 'aria-pressed': 'false' }, el('span', { class: 'farm-tab-ico' }, spriteImage(uiIcon(tab.icon), 3), count), tab.label);
      button.addEventListener('click', () => (tab.id === 'build' ? actions.edit() : tab.id === 'seeds' ? actions.seeds() : actions.sheet(tab.id)));
      this.counts.set(tab.id, count);
      this.tabs.set(tab.id, button);
      this.bar.append(button);
    }

    // Help, zoom and sound fold behind one small button: on a phone the map needs the room.
    const menu = el('div', { class: 'farm-side-menu farm-box', hidden: '' });
    const toggle = el('button', { class: 'farm-side-toggle farm-box', type: 'button', 'aria-label': 'Options', 'aria-expanded': 'false', text: '⋯' });
    const close = () => {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    };
    toggle.addEventListener('click', () => {
      menu.hidden = !menu.hidden;
      toggle.setAttribute('aria-expanded', String(!menu.hidden));
    });
    const item = (icon: Node, label: string | HTMLElement, action: () => void) => {
      const b = el('button', { class: 'farm-side-item', type: 'button' }, icon, label);
      b.addEventListener('click', () => {
        action();
        close();
      });
      return b;
    };
    menu.append(
      item(el('b', { class: 'farm-side-icon', text: '?' }), 'Comment jouer', actions.help),
      item(this.zoomIcon, this.zoomLabel, actions.zoom),
      el('div', { class: 'farm-side-item is-sound' }, muteButton(), 'Son'),
    );
    this.side = el('div', { class: 'farm-side' }, menu, toggle);
    this.setZoom(false);
  }

  /** Where products fly to: the barn tab. */
  barnTarget(): DOMRect {
    return this.tabs.get('barn')!.querySelector('.farm-tab-ico')!.getBoundingClientRect();
  }

  setZoom(far: boolean): void {
    this.zoomIcon.replaceChildren(spriteImage(uiIcon(far ? 'zoomIn' : 'zoomOut'), 2));
    this.zoomLabel.textContent = far ? 'Vue proche' : 'Vue d’ensemble';
  }

  setPressed(id: string | null): void {
    for (const [tab, button] of this.tabs) button.setAttribute('aria-pressed', String(tab === id));
  }

  setEditing(editing: boolean): void {
    this.top.hidden = editing;
    this.quest.hidden = editing || this.quest.dataset.empty === 'true';
    this.side.hidden = editing;
  }

  refresh(save: FarmSave): void {
    const next = xpToNext(save.level);
    this.levelBadge.textContent = String(save.level);
    this.levelText.textContent = next === null ? 'Niveau maximum' : `${save.xp} / ${next} XP`;
    this.xpFill.style.transform = `scaleX(${next === null ? 1 : Math.min(1, save.xp / next)})`;
    this.nuts.textContent = save.nuts.toLocaleString('fr-FR');
    const boosters = Object.values(save.boosters).reduce((a, b) => a + b, 0);
    this.boosterCount.textContent = boosters > 0 ? String(boosters) : '';

    const deliverable = deliverableCount(save);
    this.counts.get('orders')!.textContent = deliverable > 0 ? String(deliverable) : '';
    const quests = openQuests(save);
    const ready = quests.filter((q) => isQuestReady(save, q));
    this.counts.get('quests')!.textContent = ready.length > 0 || isChestReady(save) ? '!' : '';

    const shown = ready[0] ?? quests[0];
    this.quest.dataset.empty = String(!shown);
    this.quest.hidden = !shown || this.top.hidden;
    if (!shown) return;
    this.quest.classList.toggle('is-ready', ready.length > 0);
    this.questFace.replaceChildren(spriteImage(faceSprite(shown.who), 2, person(shown.who).name));
    this.questBadge.textContent = ready.length > 0 ? '!' : '';
    const starts = save.questStarts[shown.id];
    const todo = shown.objectives.find((o) => objectiveProgress(save, o, starts) < o.count);
    this.questText.replaceChildren(
      document.createTextNode(ready.length > 0 ? `${shown.title} : terminé !` : todo?.text ?? shown.title),
      el('span', { text: ready.length > 0 ? `${person(shown.who).name} t’attend` : `${person(shown.who).name} · ${todo ? `${objectiveProgress(save, todo, starts)} / ${todo.count}` : ''}` }),
    );
  }
}
