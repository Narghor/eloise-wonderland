import './luna.css';
import { el, topBar, type BackLink } from '../../../dom';
import { bet, chips, noteWin, pay, formatChips } from '../chips';
import {
  armSoundUnlock, burst, countUp, drawWinLines, marquee, muteButton, payoutTable, paylineDiagrams, playBigWin,
  playBonusTrigger, playBookOpen, playGambleLose, playGambleWin, playLose, playReelStop, playSmallWin, playSuspense, playSuspenseHit, playSuspenseMiss, playSpinLoop, rulesBlock, shake, shapeDiagram, showBigWin,
  tapToSpin, winTier, winPop, stampBanner, igniteCells, type WinLinesHandle,
  keepScreenOn,
} from '../fx';
import { BUZZ, buzz } from '../fx';
import { CASINO_TEST_BUTTONS, takeForced, testBar } from '../fx'; // TEST-BUTTONS
import { LUNA_DEFS, OPEN_BOOK, SYMBOL_ART } from './lunaArt';
import {
  BETS, BOOK, BOOK_PAYS, FREE_SPINS, GAMBLE_CAP_X, GAMBLE_MAX_STEPS, LUNA, FREE_SPINS_MIN_X, MIN_BOOKS, PAYLINES, PAY_SCALE, RETRIGGER_BOOKS, RETRIGGER_SPINS, REELS, ROWS, SYMBOLS,
  baseSpin, canGamble, chipsFor, playFreeSpins, type FreeSpinsResult, type Grid, type LineWin, type LunaForce,
} from './lunaLogic';

const BACK_CASINO: BackLink = { href: '#/casino', label: 'Casino' };
/** This machine's key in the casino lobby, which shows its best win. */
const LOBBY_ID = 'eloise';
const REEL_MS = 600;
const REEL_STAGGER = 170;
const TENSION_MS = 1200;
const FREE_REEL_MS = 550;
const FREE_STAGGER = 140;
/** Pause after a free spin, so its result can be read before the next one rolls. */
const FREE_PAUSE_MS = 900;
const FREE_WIN_PAUSE_MS = 1700;
/** A win of 3 stakes or more climbs in its pop: the pause waits for it. */
const FREE_COUNTED_PAUSE_MS = 2500;
const HELP_GLYPHS = ['10', 'J', 'Q', 'K', 'A', '🧪', '🔮', '🦉', '👸'];

/** How long the gamble card keeps everyone waiting before it turns over. */
const GAMBLE_SUSPENSE_MS = 800;

export function renderLuna(root: HTMLElement): () => void {
  armSoundUnlock();
  const timers = new Set<number>();
  let disposed = false;
  /** Set while a bonus plays: lets the screen sleep again. */
  let releaseScreen: (() => void) | null = null;
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (!disposed) resolve();
      }, ms);
      timers.add(id);
    });

  let betIndex = 0;
  let busy = false;
  /** The gamble card is turning over: no new guess until it shows. */
  let revealing = false;
  let lines: WinLinesHandle | null = null;
  let gamble: { amount: number; stake: number; steps: number } | null = null;

  const balance = el('span', { class: 'luna-balance' });
  const cells: HTMLElement[][] = [];
  const reels = el('div', { class: 'luna-reels' });
  const expandLayer = el('div', { class: 'luna-expand-layer', 'aria-hidden': 'true' });
  for (let r = 0; r < REELS; r++) {
    const column = el('div', { class: 'luna-reel' });
    cells.push([]);
    for (let row = 0; row < ROWS; row++) {
      const cell = el('div', { class: 'luna-cell' });
      setArt(cell, randomSymbol() % BOOK);
      cells[r].push(cell);
      column.append(cell);
    }
    reels.append(column);
  }
  reels.append(expandLayer);
  const featureBar = el('div', { class: 'luna-feature-bar' });
  const machine = el(
    'div',
    { class: 'luna-machine' },
    el('div', { class: 'luna-sky', 'aria-hidden': 'true' }),
    el('div', { class: 'luna-marquee-title' }, headerPortrait(), el('span', { text: 'Eloise’s Book' }), el('span', { class: 'luna-moon', 'aria-hidden': 'true' })),
    featureBar,
    reels,
    el('div', { class: 'casino-guarantee', text: `Tours gratuits : au moins ×${FREE_SPINS_MIN_X} ta mise` }),
  );
  const lights = marquee(machine, 10);
  const message = el('div', { class: 'luna-message', role: 'status', text: '3 livres ou plus ouvrent les tours gratuits !' });

  const betLabel = el('span', { class: 'luna-bet-value' });
  const minus = el('button', { class: 'button button-secondary luna-bet-step', type: 'button', text: '−' });
  const plus = el('button', { class: 'button button-secondary luna-bet-step', type: 'button', text: '+' });
  const spinButton = el('button', { class: 'button luna-spin', type: 'button', text: 'Tourner' });
  const tableButton = el('button', { class: 'button button-secondary', type: 'button', text: 'Comment on gagne ?' });
  const tableHost = el('div', { class: 'luna-paytable' });
  tableHost.hidden = true;

  // Gamble panel (hidden until a win).
  const gambleAmount = el('b', { class: 'luna-gamble-amount' });
  const gambleCard = el('div', { class: 'luna-card luna-card-back', 'aria-hidden': 'true' });
  const gambleInfo = el('p', { class: 'luna-gamble-info' });
  const redButton = el('button', { class: 'button luna-red', type: 'button', text: 'Rouge ♥♦' });
  const blackButton = el('button', { class: 'button luna-black', type: 'button', text: 'Noir ♠♣' });
  const collectButton = el('button', { class: 'button button-secondary', type: 'button', text: 'Encaisser' });
  const gamblePanel = el(
    'section',
    { class: 'luna-gamble' },
    el('div', { class: 'luna-gamble-head' }, el('span', { text: 'Doubler' }), gambleAmount),
    gambleCard,
    gambleInfo,
    el('div', { class: 'luna-gamble-buttons' }, redButton, blackButton),
    collectButton,
  );
  gamblePanel.hidden = true;
  const doubleButton = el('button', { class: 'button luna-double', type: 'button', text: 'Doubler le gain ?' });
  doubleButton.hidden = true;

  const screen = el(
    'main',
    { class: 'luna-screen' },
    machine,
    message,
    doubleButton,
    gamblePanel,
    el('div', { class: 'luna-bet' }, minus, el('div', {}, el('div', { class: 'luna-small', text: 'Mise (10 lignes)' }), betLabel), plus),
    spinButton,
    tableButton,
    tableHost,
  );
  screen.insertAdjacentHTML('afterbegin', LUNA_DEFS);
  if (CASINO_TEST_BUTTONS) tableButton.after(testBar([{ label: '3 livres', outcome: 'books' }, { label: 'Symbole spécial Eloise', outcome: 'luna' }, { label: 'Gros gain', outcome: 'big' }])); // TEST-BUTTONS
  tapToSpin(machine, spinButton);
  root.replaceChildren(topBar('Eloise’s Book', el('span', { class: 'luna-top-right' }, balance, muteButton()), BACK_CASINO), screen);

  const currentBet = () => BETS[betIndex];

  function refresh(): void {
    balance.textContent = `${chips().toLocaleString('fr-FR')} jetons`;
    betLabel.textContent = `${formatChips(currentBet())} jetons`;
    const locked = busy || gamble !== null && !gamblePanel.hidden;
    minus.disabled = locked || betIndex === 0;
    plus.disabled = locked || betIndex === BETS.length - 1;
    spinButton.disabled = locked || chips() < currentBet();
    if (!tableHost.hidden) tableHost.replaceChildren(...paytable(currentBet()));
  }

  function setMessage(text: string, extra = ''): void {
    message.textContent = text;
    message.className = `luna-message${extra ? ` ${extra}` : ''}`;
  }

  minus.addEventListener('click', () => { betIndex = Math.max(0, betIndex - 1); refresh(); });
  plus.addEventListener('click', () => { betIndex = Math.min(BETS.length - 1, betIndex + 1); refresh(); });
  tableButton.addEventListener('click', () => { tableHost.hidden = !tableHost.hidden; refresh(); });
  spinButton.addEventListener('click', () => void spin());

  // -----------------------------------------------
  // BASE GAME
  // -----------------------------------------------

  async function spin(): Promise<void> {
    const stake = currentBet();
    if (busy || !bet(stake)) return;
    endGamble();
    busy = true;
    clearBoard();
    setMessage('');
    lights.setMode('spin');
    refresh();

    const force = CASINO_TEST_BUTTONS ? takeForced<LunaForce>() : null; // TEST-BUTTONS
    const result = baseSpin(Math.random, force ?? undefined);
    await animateReels(result.grid, false, new Set());
    if (disposed) return;

    const won = chipsFor(result.mult, stake);
    const triggered = result.books >= MIN_BOOKS;
    if (won > 0) {
      pay(won);
      noteWin(LOBBY_ID, won, stake);
      showLines(result.wins);
      if (result.bookMult > 0) markBooks(result.grid);
      lights.setMode('win');
      if (winTier(won, stake) > 0) {
        shake(machine, 2);
        winPop(reels, won);
        refresh();
        await showBigWin(document.body, won, stake);
      } else {
        playSmallWin();
        burst(reels, Math.min(24, 6 + Math.round((won / stake) * 4)), 'coins');
        winPop(reels, won, { stake });
      }
    } else if (!triggered) {
      lights.setMode('idle');
      playLose();
      setMessage('La lune se cache… relance !');
    }
    refresh();

    if (triggered) {
      const feature = playFreeSpins(Math.random, force === 'luna' ? LUNA : undefined);
      // Decided now, paid now: a reload or leaving the screen never loses it.
      pay(chipsFor(feature.mult, stake));
      const pending: PendingFeature = { feature, stake, next: 0 };
      savePending(pending);
      await wait(won > 0 ? 1000 : 400);
      await runFreeSpins(pending, true);
      if (disposed) return;
    }
    busy = false;
    // The free spins win is banked: only a plain win can be doubled.
    if (!triggered) offerGamble(won, stake);
    timers.add(window.setTimeout(() => { if (!busy) lights.setMode('idle'); }, 4000));
    refresh();
  }

  function clearBoard(): void {
    lines?.clear();
    lines = null;
    expandLayer.replaceChildren();
    cells.flat().forEach((c) => c.classList.remove('luna-book-pay', 'luna-dim'));
  }

  function showLines(wins: LineWin[]): void {
    lines?.clear();
    lines = null;
    if (wins.length === 0) return;
    lines = drawWinLines(
      reels,
      cells,
      wins.map((w) => ({ cells: PAYLINES[w.line].slice(0, w.count).map((row, reel) => [reel, row] as [number, number]), path: PAYLINES[w.line] })),
    );
  }

  function markBooks(grid: Grid): void {
    grid.forEach((col, reel) => col.forEach((s, row) => { if (s === BOOK) cells[reel][row].classList.add('luna-book-pay'); }));
  }

  async function animateReels(grid: Grid, fast: boolean, sticky: Set<string>): Promise<void> {
    const rolling = new Set<HTMLElement>();
    cells.forEach((col, reel) => col.forEach((cell, row) => {
      if (sticky.has(`${reel},${row}`)) return;
      cell.classList.add('luna-rolling');
      cell.classList.remove('luna-landed', 'luna-sticky', 'luna-tension');
      rolling.add(cell);
    }));
    // The streak runs only down the next reel to stop: the eye follows the one that matters.
    const strips = [...reels.querySelectorAll<HTMLElement>(':scope > .luna-reel')];
    const roll = window.setInterval(() => rolling.forEach((cell) => setArt(cell, randomSymbol())), 110);
    timers.add(roll);
    const stopLoop = playSpinLoop('book');
    let booksShown = 0;
    for (let reel = 0; reel < REELS; reel++) {
      strips[reel].classList.add('fx-streak');
      const tense = !fast && booksShown === MIN_BOOKS - 1;
      if (tense) {
        cells[reel].forEach((c) => c.classList.add('luna-tension'));
        setMessage('Encore un livre…', 'luna-tension-text');
      }
      const stopSuspense = tense ? playSuspense(TENSION_MS) : undefined;
      await wait(reel === 0 ? (fast ? FREE_REEL_MS : REEL_MS) : tense ? TENSION_MS : fast ? FREE_STAGGER : REEL_STAGGER);
      stopSuspense?.();
      playReelStop(reel);
      strips[reel].classList.remove('fx-streak');
      cells[reel].forEach((cell, row) => {
        if (!rolling.has(cell)) return;
        rolling.delete(cell);
        const s = grid[reel][row];
        cell.classList.remove('luna-rolling', 'luna-tension');
        cell.classList.add('luna-landed');
        cell.classList.toggle('luna-is-book', s === BOOK);
        setArt(cell, s);
      });
      const landed = grid[reel].filter((s) => s === BOOK).length;
      booksShown += landed;
      // Resolve the suspense when the book lands, or when the last tense reel misses.
      if (tense && landed > 0) playSuspenseHit();
      else if (tense && reel === REELS - 1) playSuspenseMiss();
    }
    stopLoop();
    if (message.classList.contains('luna-tension-text')) setMessage('');
    window.clearInterval(roll);
    timers.delete(roll);
  }

  // -----------------------------------------------
  // FREE SPINS
  // -----------------------------------------------

  async function runFreeSpins(pending: PendingFeature, fresh: boolean): Promise<void> {
    const { feature, stake } = pending;
    lights.setMode('big');
    if (fresh) {
      playBonusTrigger();
      buzz(BUZZ.bonus);
      clearBoard();
      setMessage('Le livre s’ouvre…', 'luna-big');
      const books = cells.flat().filter((c) => c.classList.contains('luna-is-book'));
      wait(books.length * 260).then(() => {
        playBookOpen(0);
        shake(machine, 3);
      });
      await igniteCells(reels, books, () => playReelStop(4));
      await showIntro(feature.special);
      if (disposed) return;
    }
    clearBoard();
    screen.classList.add('luna-in-feature');
    releaseScreen = keepScreenOn();
    setMessage(fresh ? '' : 'Les tours gratuits reprennent !', fresh ? '' : 'luna-big');

    const played = feature.spins.slice(0, pending.next);
    let total = played.reduce((s, x) => s + chipsFor(x.mult, stake), 0);
    const last = played[played.length - 1];
    const spinsValue = el('b', { text: `${last ? last.spinsLeft : FREE_SPINS}` });
    const totalValue = el('b', { text: `${total}` });
    const specialBox = el('div', { class: 'luna-fs-special' });
    setArt(specialBox, feature.special);
    featureBar.replaceChildren(
      el('div', { class: 'luna-fs-box' }, el('span', { text: 'Tours' }), spinsValue),
      el('div', { class: 'luna-fs-box' }, el('span', { text: 'Symbole' }), specialBox),
      el('div', { class: 'luna-fs-box' }, el('span', { text: 'Gain' }), totalValue),
      el('p', { class: 'luna-fs-hint', text: `📖 ${RETRIGGER_BOOKS} nouveaux livres d’un coup = +${RETRIGGER_SPINS} tours gratuits` }),
    );
    let sticky = new Set<string>(last && last.added === 0 ? last.sticky : []);
    paintSticky(sticky);

    for (let i = pending.next; i < feature.spins.length; i++) {
      const step = feature.spins[i];
      clearBoard();
      setMessage('');
      lights.setMode('spin');
      spinsValue.textContent = `${step.spinsLeft - step.added}`;
      await animateReels(step.grid, true, sticky);
      if (disposed) return;
      const fresh = step.sticky.filter((k) => !sticky.has(k));
      sticky = new Set(step.sticky);
      paintSticky(sticky);
      if (fresh.length > 0) {
        setMessage(fresh.length > 1 ? `${fresh.length} livres restent collés !` : 'Un livre reste collé !', 'luna-big');
        await wait(700);
      }
      const won = chipsFor(step.mult, stake);
      showLines(step.wins);
      if (won > 0 && !step.expand) winPop(reels, won, { stake });
      if (step.expand) {
        // The plain lines first, then the expansion takes over the reels.
        if (step.wins.length > 0) await wait(900);
        lines?.clear();
        lines = null;
        await playExpansion(step.expand.reels, feature.special);
        winPop(reels, chipsFor(step.expand.mult, stake), { label: `${SYMBOLS[feature.special].name} se déploie`, stake });
        await wait(1300);
      }
      if (step.added > 0) {
        playBonusTrigger();
        buzz(BUZZ.retrigger);
        setMessage('Nouveau chapitre : les livres collés s’envolent.', 'luna-big');
        await stampBanner(reels, `+${step.added}`, 'TOURS GRATUITS');
        // The logic clears the sticky books on a retrigger.
        sticky = new Set();
        paintSticky(sticky);
      }
      if (won > 0) {
        lights.setMode('win');
        const from = total;
        total += won;
        countUp(totalValue, won, 600, (n) => `${from + n}`);
        if (won >= stake * 10) burst(machine, 16, 'coins');
      }
      await wait(won >= stake * 3 ? FREE_COUNTED_PAUSE_MS : won > 0 ? FREE_WIN_PAUSE_MS : FREE_PAUSE_MS);
      pending.next = i + 1;
      savePending(pending);
    }

    clearBoard();
    savePending(null);
    cells.flat().forEach((c) => c.classList.remove('luna-sticky'));
    const totalChips = chipsFor(feature.mult, stake);
    // Sessions saved before the floor existed have no topUp field.
    if ((feature.topUp ?? 0) > 0 && totalChips > total) {
      setMessage(`Minimum garanti : +${formatChips(totalChips - total)} jetons`, 'luna-win-text');
      const from = total;
      countUp(totalValue, totalChips - total, 800, (n) => `${from + n}`);
      await wait(1600);
      if (disposed) return;
    }
    noteWin(LOBBY_ID, totalChips, stake);
    refresh();
    setMessage(`Tours gratuits : ${formatChips(totalChips)} jetons`, 'luna-win-text');
    await showBigWin(document.body, totalChips, stake, totalChips >= stake * 20 ? 'ELOISE RAYONNE !' : 'TOURS GRATUITS');
    featureBar.replaceChildren();
    screen.classList.remove('luna-in-feature');
    releaseScreen?.();
    releaseScreen = null;
  }

  function paintSticky(sticky: Set<string>): void {
    cells.forEach((col, reel) => col.forEach((cell, row) => {
      const on = sticky.has(`${reel},${row}`);
      cell.classList.toggle('luna-sticky', on);
      if (on) setArt(cell, BOOK);
    }));
  }

  /** Each listed reel is covered by one tall symbol that grows from its middle. */
  async function playExpansion(reelList: number[], special: number): Promise<void> {
    expandLayer.replaceChildren();
    cells.flat().forEach((c) => c.classList.add('luna-dim'));
    playBigWin(1);
    for (const reel of reelList) {
      const panel = el('div', { class: 'luna-expand' });
      const strip = reels.children[reel] as HTMLElement;
      panel.style.left = `${strip.offsetLeft - 6}px`;
      panel.style.width = `${strip.offsetWidth}px`;
      const art = el('div', { class: 'luna-expand-art' });
      setArt(art, special);
      panel.append(art);
      expandLayer.append(panel);
      await wait(260);
    }
  }

  /** The book opens, three pages turn slowly, the chosen symbol rises. A tap closes it at the end. */
  function showIntro(special: number): Promise<void> {
    const reveal = el('div', { class: 'luna-intro-symbol' });
    setArt(reveal, special);
    const book = el('div', { class: 'luna-intro-book' });
    book.innerHTML = OPEN_BOOK;
    const pages = [0, 1, 2].map((i) => {
      const page = el('div', { class: 'luna-page' });
      page.style.animationDelay = `${0.9 + i * 0.75}s`;
      setArt(page, i === 2 ? special : randomSymbol());
      return page;
    });
    book.append(...pages, reveal);
    const name = el('p', { class: 'luna-intro-name', text: SYMBOLS[special].name });
    const overlay = el(
      'div',
      { class: 'luna-intro', role: 'dialog', 'aria-live': 'assertive' },
      el('p', { class: 'luna-intro-title', text: `${FREE_SPINS} TOURS GRATUITS` }),
      book,
      el('p', { class: 'luna-intro-text', text: 'Symbole spécial :' }),
      name,
      el('p', { class: 'luna-intro-text', text: 'Il se déploie sur tout le rouleau et paie sur les 10 lignes !' }),
      el('span', { class: 'luna-intro-hint', text: 'Touche pour commencer' }),
    );
    overlay.insertAdjacentHTML('afterbegin', LUNA_DEFS);
    document.body.append(overlay);
    return new Promise((resolve) => {
      let done = false;
      const close = (): void => {
        if (done) return;
        done = true;
        overlay.remove();
        resolve();
      };
      wait(3600).then(() => {
        overlay.classList.add('luna-intro-ready');
        overlay.addEventListener('click', close);
        wait(3000).then(close);
      });
    });
  }

  // -----------------------------------------------
  // GAMBLE (the win is already paid; doubling re-stakes it)
  // -----------------------------------------------

  function offerGamble(amount: number, stake: number): void {
    if (!canGamble(amount, stake, 0)) return;
    gamble = { amount, stake, steps: 0 };
    doubleButton.textContent = `Doubler ${formatChips(amount)} jetons ?`;
    doubleButton.hidden = false;
  }

  function endGamble(): void {
    gamble = null;
    revealing = false;
    collectButton.disabled = false;
    doubleButton.hidden = true;
    gamblePanel.hidden = true;
    gambleCard.className = 'luna-card luna-card-back';
    gambleCard.textContent = '';
  }

  doubleButton.addEventListener('click', () => {
    if (!gamble || busy) return;
    doubleButton.hidden = true;
    gamblePanel.hidden = false;
    lines?.clear();
    lines = null;
    paintGamble('Rouge ou noir ? Devine la couleur de la carte.');
  });

  function paintGamble(info: string): void {
    if (!gamble) return;
    gambleAmount.textContent = `${formatChips(gamble.amount)} jetons`;
    gambleInfo.textContent = info;
    const can = canGamble(gamble.amount, gamble.stake, gamble.steps);
    redButton.disabled = !can;
    blackButton.disabled = !can;
    refresh();
  }

  function guess(red: boolean): void {
    if (!gamble || revealing || !canGamble(gamble.amount, gamble.stake, gamble.steps)) return;
    if (!bet(gamble.amount)) return;
    gamble.steps++;
    const suits = ['♥', '♦', '♠', '♣'];
    const suit = suits[Math.floor(Math.random() * 4)];
    const isRed = suit === '♥' || suit === '♦';
    const won = isRed === red;
    // The chips are settled now, so leaving mid-reveal loses nothing; only the show waits.
    if (won) {
      gamble.amount *= 2;
      pay(gamble.amount);
    }
    revealing = true;
    redButton.disabled = true;
    blackButton.disabled = true;
    collectButton.disabled = true;
    gambleInfo.textContent = 'La carte se retourne…';
    gambleCard.className = 'luna-card luna-card-back luna-card-tense';
    const stopSuspense = playSuspense(GAMBLE_SUSPENSE_MS);
    timers.add(window.setTimeout(() => {
      stopSuspense();
      revealing = false;
      collectButton.disabled = false;
      gambleCard.className = `luna-card luna-card-face ${isRed ? 'luna-card-red' : 'luna-card-black'} ${won ? 'luna-card-win' : 'luna-card-lose'}`;
      gambleCard.textContent = suit;
      showGuess(won);
    }, GAMBLE_SUSPENSE_MS));
  }

  function showGuess(won: boolean): void {
    if (!gamble) return;
    if (won) {
      playGambleWin();
      burst(gamblePanel, 18, 'coins');
      gambleAmount.classList.remove('luna-gamble-pop');
      void gambleAmount.offsetWidth;
      gambleAmount.classList.add('luna-gamble-pop');
      const left = GAMBLE_MAX_STEPS - gamble.steps;
      paintGamble(canGamble(gamble.amount, gamble.stake, gamble.steps)
        ? `Gagné ! Encore ${left} essai${left > 1 ? 's' : ''} possible${left > 1 ? 's' : ''}.`
        : 'Gagné ! Plafond atteint, encaisse.');
      setMessage(`Doublé : ${formatChips(gamble.amount)} jetons`, 'luna-win-text');
    } else {
      playGambleLose();
      shake(gamblePanel, 1);
      setMessage('Perdu… la carte était de l’autre couleur.');
      gamble.amount = 0;
      gambleInfo.textContent = 'Perdu ! Le gain est parti.';
      redButton.disabled = true;
      collectButton.disabled = true;
      blackButton.disabled = true;
      timers.add(window.setTimeout(() => { endGamble(); refresh(); }, 1400));
    }
  }

  redButton.addEventListener('click', () => guess(true));
  blackButton.addEventListener('click', () => guess(false));
  collectButton.addEventListener('click', () => {
    if (gamble && gamble.amount > 0) setMessage(`Encaissé : ${formatChips(gamble.amount)} jetons`, 'luna-win-text');
    endGamble();
    refresh();
  });

  refresh();
  const unfinished = loadPending();
  if (unfinished) void resume(unfinished);

  async function resume(pending: PendingFeature): Promise<void> {
    busy = true;
    refresh();
    await runFreeSpins(pending, false);
    if (disposed) return;
    busy = false;
    lights.setMode('idle');
    refresh();
  }

  return () => {
    disposed = true;
    releaseScreen?.();
    lines?.clear();
    document.querySelectorAll('.luna-intro').forEach((n) => n.remove());
    for (const id of timers) {
      window.clearTimeout(id);
      window.clearInterval(id);
    }
    timers.clear();
  };
}

function headerPortrait(): HTMLElement {
  const node = el('span', { class: 'luna-header-portrait', 'aria-hidden': 'true' });
  setArt(node, LUNA);
  return node;
}

/** Each symbol's SVG parsed once; the rolling reels clone it instead of re-parsing markup every tick. */
const parsedArt = new Map<number, DocumentFragment>();

function setArt(node: HTMLElement, symbol: number): void {
  let art = parsedArt.get(symbol);
  if (!art) {
    const template = document.createElement('template');
    template.innerHTML = SYMBOL_ART[symbol];
    art = template.content;
    parsedArt.set(symbol, art);
  }
  node.replaceChildren(art.cloneNode(true));
  node.dataset.symbol = SYMBOLS[symbol].key;
}

function randomSymbol(): number {
  return Math.floor(Math.random() * SYMBOLS.length);
}

// -----------------------------------------------
// UNFINISHED FEATURE (survives a reload or leaving the screen)
// -----------------------------------------------

interface PendingFeature {
  feature: FreeSpinsResult;
  stake: number;
  /** Index of the next spin to show. The whole round is already paid. */
  next: number;
}

const PENDING_KEY = 'casino-luna-pending-feature';

function savePending(pending: PendingFeature | null): void {
  try {
    if (pending) sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage blocked: the chips are already paid, only the replay is lost.
  }
}

function loadPending(): PendingFeature | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PendingFeature;
    if (!Array.isArray(data?.feature?.spins) || !Number.isInteger(data.next) || data.next >= data.feature.spins.length) {
      sessionStorage.removeItem(PENDING_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

// -----------------------------------------------
// HELP
// -----------------------------------------------

function paytable(stake: number): HTMLElement[] {
  const entries = SYMBOLS.slice(0, BOOK)
    .map((s, i) => {
      const counts = s.pays[0] > 0 ? [2, 3, 4, 5] : [3, 4, 5];
      return { glyph: HELP_GLYPHS[i], name: s.name, counts, multipliers: counts.map((c) => (s.pays[c - 2] * PAY_SCALE) / PAYLINES.length) };
    })
    .reverse();
  const books: [number, number][] = [[0, 1], [2, 0], [4, 2]];
  const expand: [number, number][] = [0, 1, 2].flatMap((row) => [[0, row], [2, row], [3, row]] as [number, number][]);
  return [
    rulesBlock(
      'Les tours gratuits : il faut des LIVRES',
      `📖 ${MIN_BOOKS} livres n’importe où sur l’écran = ${FREE_SPINS} tours gratuits. Seul le livre déclenche les tours gratuits : 3 Eloise ne le font pas, elles paient juste une grosse ligne.`,
      'Au début des tours, le livre s’ouvre et tire au hasard un symbole spécial (Eloise, hibou, lettre…).',
      'Pendant les tours, si le symbole spécial tombe sur assez de rouleaux (2 pour 👸 🦉 🔮 🧪, 3 pour les lettres), il remplit ces rouleaux de haut en bas et paie sur les 10 lignes, même si les rouleaux ne se touchent pas.',
      'Un livre qui tombe pendant les tours reste collé à sa place jusqu’à la fin du chapitre et sert de joker.',
      `Les gains des tours gratuits sont plus gros que d’habitude, et les tours paient toujours au moins ${FREE_SPINS_MIN_X} fois ta mise.`,
      `${RETRIGGER_BOOKS} nouveaux livres sur un même tour = +${RETRIGGER_SPINS} tours, et un nouveau chapitre : les livres collés s’envolent. Ça peut arriver plusieurs fois !`,
    ),
    el('div', { class: 'fx-paylines' },
      shapeDiagram(REELS, ROWS, books, '📖 3 livres, n’importe où'),
      shapeDiagram(REELS, ROWS, expand, 'Le symbole spécial remplit ses rouleaux'),
    ),
    rulesBlock(
      'Les gains normaux',
      `Il y a ${PAYLINES.length} lignes (dessins plus bas), toutes jouées à chaque tirage.`,
      'Une ligne gagne avec des symboles identiques à la suite, en partant du rouleau de GAUCHE : 2 suffisent pour 👸 🦉 🔮 🧪, il en faut 3 pour les lettres.',
      '📖 Le livre remplace n’importe quel symbole sur une ligne.',
      `📖 Les livres paient aussi où qu’ils soient : 3 = ${BOOK_PAYS[3]} × mise, 4 = ${BOOK_PAYS[4]} × mise, 5 = ${BOOK_PAYS[5]} × mise.`,
      `Après un gain normal, tu peux le DOUBLER : devine rouge ou noir. Juste = ×2, faux = tout est perdu. Encaisse quand tu veux (${GAMBLE_MAX_STEPS} fois de suite au plus, jamais plus de ${GAMBLE_CAP_X} × la mise). Le gain des tours gratuits, lui, est toujours encaissé.`,
    ),
    el('h3', { class: 'luna-paytable-title', text: `Les ${PAYLINES.length} lignes` }),
    paylineDiagrams(PAYLINES, ROWS),
    el('h3', { class: 'luna-paytable-title', text: `Gains d’une ligne (mise ${stake})` }),
    payoutTable(entries, stake),
    el('p', { class: 'luna-small', text: 'Machine inspirée de Luna’s Book (Novomatic). Dessins originaux.' }),
  ];
}
