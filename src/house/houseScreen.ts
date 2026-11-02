import './house.css';
import { el, topBar } from '../dom';
import { companionCanvas } from '../companion/companionArt';
import { loadCompanion, saveCompanion } from '../companion/companionSave';
import { findItem } from '../companion/catalog';
import { CASINO_TEST_BUTTONS } from '../games/casino/fx/testMode'; // TEST-BUTTONS
import { coinIcon } from './houseArt';
import { CHARACTERS, POSES, ROOMS, ingredient, type Character } from './houseData';
import { befriend, chaptersUnlocked, coins, collectCooked, notePhoto, openGifts, refreshVisits, type VisitNews } from './houseLogic';
import { panel as roomPanel, touchPlot, type PanelContext, type PanelId } from './housePanels';
import { HouseScene } from './houseScene';
import { loadHouse, saveHouse } from './houseSave';

/** `#/maison/<room>`: the house front, the big view of one room, and that room's panel. */
export function renderHouse(root: HTMLElement, params: string[]): () => void {
  const save = loadHouse();
  collectCooked(save, Date.now());
  const firstNews = refreshVisits(save, Date.now());
  saveHouse(save);

  let shown: PanelId = params[0] === 'album' || ROOMS.some((r) => r.id === params[0]) ? (params[0] as PanelId) : 'living';
  const coinCount = el('span', {});
  const coinPill = el('span', { class: 'coin-pill house-coin-pill' }, coinCount, coinIcon());
  const albumButton = el('button', { class: 'house-album-button', type: 'button' }, '📖 Album');
  albumButton.addEventListener('click', () => show('album'));
  const panel = el('section', { class: 'house-panel', 'aria-live': 'polite' });

  const ctx: PanelContext = {
    save,
    commit(scene = false) {
      saveHouse(save);
      if (scene) houseScene.rebuild(save);
      renderPanel();
    },
    say,
    readChapter: (c, chapter) => openChapter(c, chapter),
    eat: (id) => houseScene.eat(id),
  };

  const houseScene = new HouseScene(save, {
    photo(id, pose, stars) {
      const c = CHARACTERS.find((x) => x.id === id)!;
      const result = notePhoto(save, id, pose, stars);
      say(`${c.name} · ${POSES[pose].name} : +${stars} ♥${result.bestPhoto ? ' · nouvelle photo dans l’album !' : ''}`);
      if (result.newChapter) say(`Nouveau chapitre avec ${c.name} ! Ouvre l’album pour le lire.`);
      ctx.commit();
    },
    openGifts() {
      const { coins: total, ingredients, seeds } = openGifts(save);
      const rares = [...new Set(ingredients)].map((id) => `un ingrédient rare (${ingredient(id).name.toLowerCase()})`);
      const rareSeeds = [...new Set(seeds)].map((id) => `une graine rare (${ingredient(id).name.toLowerCase()})`);
      say(`Tes visiteurs t’ont laissé ${[...(total > 0 ? [`${total} pièces`] : []), ...rares, ...rareSeeds].join(' et ')} !`);
      ctx.commit(true);
    },
    select: (room) => show(room),
    plot(index) {
      if (shown !== 'garden') show('garden');
      if (touchPlot(ctx, index) === 'choose') panel.querySelector('.house-seeds')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
  });

  function show(id: PanelId): void {
    shown = id;
    if (id !== 'album') houseScene.setActive(id);
    history.replaceState(null, '', `#/maison/${id}`);
    renderPanel();
  }

  function renderPanel(): void {
    coinCount.textContent = `${coins()}`;
    albumButton.classList.toggle('is-active', shown === 'album');
    albumButton.classList.toggle('has-news', hasUnreadChapter());
    panel.replaceChildren(...roomPanel(ctx, shown, Date.now()));
  }

  function hasUnreadChapter(): boolean {
    return CHARACTERS.some((c) => {
      const friend = save.friends[c.id];
      return friend.met && friend.chaptersRead < chaptersUnlocked(friend.stars);
    });
  }

  function openChapter(c: Character, chapter: number): void {
    const lines = c.chapters[chapter - 1];
    let index = 0;
    const text = el('p', { text: lines[0] });
    const counter = el('small', {});
    const showCounter = () => (counter.textContent = index < lines.length - 1 ? `Touche pour continuer · ${index + 1}/${lines.length}` : 'Touche pour fermer');
    showCounter();
    const dialog = el(
      'div',
      { class: 'house-dialog', role: 'dialog', 'aria-label': `${c.name}, chapitre ${chapter}` },
      el('div', { class: 'house-dialog-box' }, companionCanvas(c.look, 80), el('div', {}, el('strong', { text: `${c.name} · Chapitre ${chapter}` }), text, counter)),
    );
    dialog.addEventListener('click', () => {
      index++;
      if (index < lines.length) {
        text.textContent = lines[index];
        showCounter();
        return;
      }
      dialog.remove();
      const friend = save.friends[c.id];
      friend.chaptersRead = Math.max(friend.chaptersRead, chapter);
      if (chapter === 3) {
        const gift = findItem(c.gift);
        if (gift) say(`${gift.name} t’attend dans la garde-robe de ton compagnon !`);
      }
      ctx.commit();
    });
    document.body.append(dialog);
  }

  const timer = window.setInterval(() => {
    const now = Date.now();
    const cooked = collectCooked(save, now);
    if (cooked > 0) say(cooked > 1 ? `${cooked} plats sont prêts !` : 'Un plat est prêt !');
    const news = refreshVisits(save, now);
    if (news) {
      houseScene.rebuild(save);
      showNews(news);
    }
    if (cooked > 0 || news) saveHouse(save);
    if (shown === 'garden' || shown === 'kitchen' || cooked > 0 || news) renderPanel();
  }, 1000);

  const testBar = CASINO_TEST_BUTTONS ? [houseTestBar(save, ctx)] : []; // TEST-BUTTONS
  root.append(
    el(
      'div',
      { class: 'house' },
      topBar('Ma maison', el('span', { class: 'house-top-right' }, albumButton, coinPill)),
      el('main', { class: 'house-main' }, houseScene.element, panel, ...testBar),
    ),
  );
  show(shown);
  if (firstNews) showNews(firstNews);

  return () => {
    window.clearInterval(timer);
    houseScene.dispose();
    document.querySelectorAll('.house-dialog, .house-say').forEach((node) => node.remove());
  };
}

/** Who left, who came, who ate: shown when the page opens on a new visit. */
function showNews(news: VisitNews): void {
  const lines = [
    ...(news.left.length > 0 ? [`Partis en laissant un cadeau : ${news.left.join(', ')}`] : []),
    ...(news.arrived.length > 0 ? [`À la maison : ${news.arrived.join(', ')}`] : []),
    ...news.meals,
    ...news.orders.map((line) => `Commande · ${line}`),
    ...news.chapters.map((line) => `Nouveau chapitre · ${line}`),
  ];
  if (lines.length === 0) return;
  const close = el('button', { class: 'button', type: 'button', text: 'Allons voir !' });
  const dialog = el(
    'div',
    { class: 'house-dialog' },
    el('div', { class: 'house-news' }, el('strong', { text: 'Pendant ton absence…' }), el('ul', {}, ...lines.map((line) => el('li', { text: line }))), close),
  );
  close.addEventListener('click', () => dialog.remove());
  document.body.append(dialog);
}

let sayStack: HTMLElement | null = null;

function say(text: string): void {
  if (!sayStack || !sayStack.isConnected) {
    sayStack = el('div', { class: 'house-say', role: 'status' });
    document.body.append(sayStack);
  }
  const line = el('div', { class: 'house-say-line', text });
  sayStack.append(line);
  window.setTimeout(() => line.remove(), 3200);
}

// TEST-BUTTONS: shortcuts to check the house without waiting.
function houseTestBar(save: ReturnType<typeof loadHouse>, ctx: PanelContext): HTMLElement {
  const button = (label: string, action: () => void) => {
    const b = el('button', { class: 'casino-test-button', type: 'button', text: label });
    b.addEventListener('click', action);
    return b;
  };
  return el(
    'div',
    { class: 'casino-test-bar' },
    el('b', { text: 'TEST' }),
    button('+500 pièces', () => {
      const companion = loadCompanion();
      companion.coins += 500;
      saveCompanion(companion);
      ctx.commit();
    }),
    button('Visite suivante', () => {
      save.visitUntil = 1;
      ctx.commit();
    }),
    button('+10 ♥ à tous', () => {
      for (const c of CHARACTERS) if (save.friends[c.id].met) befriend(save, c.id, 10);
      ctx.commit();
    }),
  );
}
