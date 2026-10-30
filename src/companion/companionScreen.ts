import './companion.css';
import { el, topBar } from '../dom';
import { SLOTS, SLOT_NAMES, findItem, itemsOf, type Item, type Slot } from './catalog';
import { companionPortrait } from './companionArt';
import { isOwned, loadCompanion, saveCompanion, type CompanionSave, type Look } from './companionSave';
import { challengesDone } from '../daily/daily';

const NAME_MAX_LENGTH = 16;

/** `#/compagnon/<slot>`: the companion, and the shop open on one slot. */
export function renderCompanion(root: HTMLElement, params: string[]): () => void {
  let slot: Slot = SLOTS.includes(params[0] as Slot) ? (params[0] as Slot) : 'species';
  const status = el('p', { class: 'shop-status', role: 'status' });

  const render = () => {
    const save = loadCompanion();
    const coinsEl = el('span', { class: 'coin-pill', text: `${save.coins} 🪙` });

    const rename = el('button', { class: 'companion-name', type: 'button', 'aria-label': 'Changer le nom' }, `${save.name} ✎`);
    rename.addEventListener('click', () => {
      const name = prompt('Comment s’appelle ton compagnon ?', save.name)?.trim().slice(0, NAME_MAX_LENGTH);
      if (!name) return;
      save.name = name;
      saveCompanion(save);
      render();
    });

    const tabs = el('div', { class: 'shop-tabs', role: 'tablist' });
    for (const tabSlot of SLOTS) {
      const tab = el('button', { class: 'shop-tab', type: 'button', role: 'tab' }, SLOT_NAMES[tabSlot]);
      tab.classList.toggle('is-active', tabSlot === slot);
      tab.setAttribute('aria-selected', String(tabSlot === slot));
      tab.addEventListener('click', () => {
        slot = tabSlot;
        status.textContent = '';
        render();
      });
      tabs.append(tab);
    }

    root.replaceChildren(
      el(
        'div',
        { class: 'companion' },
        topBar('Mon compagnon', coinsEl),
        el('section', { class: 'companion-stage' }, companionPortrait(save.look, 200), rename),
        tabs,
        status,
        el('div', { class: 'shop-grid' }, ...shopCards(save, slot, render, status)),
      ),
    );
  };

  render();
  return () => {};
}

// -----------------------------------------------
// SHOP
// -----------------------------------------------

/** Every item of the slot, shown on the companion; slots other than species also get "none". */
function shopCards(save: CompanionSave, slot: Slot, refresh: () => void, status: HTMLElement): HTMLElement[] {
  const cards: HTMLElement[] = [];
  if (slot !== 'species') {
    const none = card(withItem(save.look, slot, null), slot === 'color' ? 'Naturel' : 'Aucun', save.look[slot] === null ? 'Porté' : '');
    none.classList.toggle('is-worn', save.look[slot] === null);
    none.addEventListener('click', () => {
      wear(save, slot, null);
      refresh();
    });
    cards.push(none);
  }

  const challenges = challengesDone();
  for (const item of itemsOf(slot)) {
    const owned = isOwned(save, item, challenges);
    const worn = currentId(save.look, slot) === item.id;
    const price = item.challenges === undefined ? `${item.price} 🪙` : `🏅 ${item.challenges} défis`;
    const tag = worn ? 'Porté' : owned ? 'À toi' : price;
    const element = card(withItem(save.look, slot, item.id), item.name, tag);
    element.classList.toggle('is-worn', worn);
    element.classList.toggle('is-locked', !owned);
    element.addEventListener('click', () => {
      if (owned) {
        // Tapping a worn accessory takes it off; a species always stays on.
        wear(save, slot, worn && slot !== 'species' ? null : item.id);
        status.textContent = '';
      } else if (!buy(save, item, status)) {
        return;
      }
      refresh();
    });
    cards.push(element);
  }
  return cards;
}

function card(look: Look, name: string, tag: string): HTMLButtonElement {
  return el(
    'button',
    { class: 'shop-card', type: 'button' },
    companionPortrait(look, 92),
    el('strong', { text: name }),
    el('span', { class: 'shop-card-tag', text: tag }),
  );
}

function buy(save: CompanionSave, item: Item, status: HTMLElement): boolean {
  if (item.challenges !== undefined) {
    status.textContent = `${item.name} ne s'achète pas : réussis ${item.challenges} défis du jour pour l'avoir (${challengesDone()} pour l'instant).`;
    return false;
  }
  if (save.coins < item.price) {
    const missing = item.price - save.coins;
    status.textContent = `Il te manque ${missing} pièce${missing > 1 ? 's' : ''} pour ${item.name.toLowerCase()}.`;
    return false;
  }
  if (!confirm(`Acheter « ${item.name} » pour ${item.price} pièces ?`)) return false;
  save.coins -= item.price;
  save.owned.push(item.id);
  wear(save, item.slot, item.id);
  status.textContent = `${item.name} : c'est à toi !`;
  return true;
}

function wear(save: CompanionSave, slot: Slot, id: string | null): void {
  save.look = withItem(save.look, slot, id);
  saveCompanion(save);
}

function currentId(look: Look, slot: Slot): string | null {
  return slot === 'species' ? look.species : look[slot];
}

/** The look with one slot changed: the shop shows every item already worn. */
function withItem(look: Look, slot: Slot, id: string | null): Look {
  if (slot === 'species') return { ...look, species: id ?? look.species };
  return { ...look, [slot]: findItem(id) ? id : null };
}
