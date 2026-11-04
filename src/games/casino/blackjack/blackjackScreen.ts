import './blackjack.css';
import { el, topBar } from '../../../dom';
import { bet, chips, pay, formatChips } from '../chips';
import { Round, Shoe, isBlackjack, totalLabel, type Card, type HandResult } from './blackjackLogic';
import { openTips } from './blackjackTips';

const CHIP_VALUES = [10, 25, 50, 100, 1000, 10000];
/** "10k" fits on a chip, "10000" does not. */
const chipLabel = (value: number): string => (value >= 10000 ? `${value / 1000}k` : String(value));
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R'];
const SUITS: Record<Card['suit'], string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const OUTCOME_TEXT: Record<HandResult['outcome'], string> = {
  blackjack: 'Blackjack !',
  win: 'Gagné',
  push: 'Égalité',
  lose: 'Perdu',
};
/** Pause before each dealer card once the previous one is face up; the second one waits longer (suspense). */
const DEALER_STEP_MS = 250;
const DEALER_SUSPENSE_MS = 1100;
/** Time for a dealt card to land face up (matches bj-slide + bj-turn, and their suspense version). */
const CARD_FACE_MS = 750;
const SUSPENSE_FACE_MS = 1300;
const BANNER_DELAY_MS = 450;

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function renderBlackjack(root: HTMLElement): () => void {
  const shoe = new Shoe();
  let round: Round | null = null;
  let pending = 0;
  let lastBet = 0;
  let shuffled = false;
  /** Dealer cards currently revealed (the reveal runs after the round is resolved). */
  let dealerShown = 0;
  let settled = true;
  /** New cards are still flying in: totals and outcomes wait, or they would tell the result first. */
  let landing = false;
  let dealerTurn = false;
  let timer = 0;
  /** Cards already on screen, per row key: only newer ones get the deal animation. */
  const shown = new Map<string, number>();

  const balance = el('span', { class: 'bj-balance' });
  const table = el('main', { class: 'bj-table' });
  root.append(el('div', { class: 'bj' }, topBar('Blackjack', balance, { href: '#/casino', label: 'Casino' }), table));

  function cardView(card: Card, isNew: boolean, suspense: boolean): HTMLElement {
    const red = card.suit === 'H' || card.suit === 'D';
    const label = `${RANKS[card.rank]}${SUITS[card.suit]}`;
    const cls = `bj-card${isNew ? ' bj-new' : ''}${suspense ? ' bj-suspense' : ''}`;
    return el(
      'div',
      { class: cls, 'aria-label': label },
      el(
        'div',
        { class: 'bj-flip' },
        el(
          'div',
          { class: `bj-face${red ? ' bj-red' : ''}` },
          el('span', { class: 'bj-rank', text: RANKS[card.rank] }),
          el('span', { class: 'bj-suit', text: SUITS[card.suit] }),
        ),
        el('div', { class: 'bj-face bj-back' }),
      ),
    );
  }

  function row(key: string, cards: Card[], suspenseIndex = -1): HTMLElement {
    const before = shown.get(key) ?? 0;
    shown.set(key, cards.length);
    return el('div', { class: 'bj-cards' }, ...cards.map((c, i) => cardView(c, i >= before, i === suspenseIndex && i >= before)));
  }

  function button(text: string, onClick: () => void, enabled = true, secondary = false): HTMLButtonElement {
    const b = el('button', { class: `button${secondary ? ' button-secondary' : ''}`, type: 'button', text });
    b.disabled = !enabled;
    b.addEventListener('click', onClick);
    return b;
  }

  function deal(amount: number): void {
    if (!bet(amount)) return;
    if (shoe.needsShuffle) {
      shoe.shuffle();
      shuffled = true;
    }
    shown.clear();
    lastBet = amount;
    pending = 0;
    round = new Round(shoe, amount);
    dealerShown = 1;
    settled = false;
    dealerTurn = false;
    afterAction();
  }

  function act(fn: (r: Round) => void): void {
    if (!round || round.phase === 'over') return;
    fn(round);
    afterAction();
  }

  function afterAction(): void {
    land(CARD_FACE_MS, () => {
      if (round?.phase === 'over') {
        dealerTurn = true;
        render();
        revealDealer();
      } else render();
    });
  }

  /** Renders the new cards, then waits for them to be face up before `then`. */
  function land(ms: number, then: () => void): void {
    if (reducedMotion() || !hasNewCards()) {
      render();
      then();
      return;
    }
    landing = true;
    render();
    timer = window.setTimeout(() => {
      landing = false;
      then();
    }, ms);
  }

  function hasNewCards(): boolean {
    if (!round) return false;
    return dealerShown > (shown.get('dealer') ?? 0) || round.hands.some((h, i) => h.cards.length > (shown.get(`hand${i}`) ?? 0));
  }

  /** The cards whose value can be shown: the ones still flying in are left out. */
  function visible(key: string, cards: Card[]): Card[] {
    return landing ? cards.slice(0, shown.get(key) ?? 0) : cards;
  }

  const label = (cards: Card[]): string => (cards.length > 0 ? totalLabel(cards) : '…');

  /** Shows the dealer's drawn cards one by one, then pays and shows the banner. */
  function revealDealer(): void {
    const r = round;
    if (!r) return;
    if (reducedMotion()) {
      dealerShown = r.dealer.length;
      settle();
      return;
    }
    if (dealerShown < r.dealer.length) {
      const suspense = dealerShown === 1;
      timer = window.setTimeout(() => {
        dealerShown++;
        land(suspense ? SUSPENSE_FACE_MS : CARD_FACE_MS, () => {
          render();
          revealDealer();
        });
      }, suspense ? DEALER_SUSPENSE_MS : DEALER_STEP_MS);
      return;
    }
    timer = window.setTimeout(settle, BANNER_DELAY_MS);
  }

  function settle(): void {
    if (settled || !round) return;
    settled = true;
    for (const r of round.results) pay(Math.floor(r.payout));
    render();
  }

  function render(): void {
    balance.textContent = `${chips().toLocaleString('fr-FR')} jetons`;
    table.replaceChildren();
    if (shuffled) {
      table.append(el('p', { class: 'bj-shuffle', text: 'Mélange du sabot…' }));
      shuffled = false;
    }
    if (!round) {
      renderBetting();
      return;
    }
    const r = round;
    const dealerCards = r.dealer.slice(0, dealerShown);
    table.append(
      el(
        'section',
        { class: 'bj-zone' },
        el('h2', { class: 'bj-label', text: `Croupier · ${label(visible('dealer', dealerCards))}` }),
        row('dealer', dealerCards, 1),
      ),
    );
    const hands = el('div', { class: 'bj-hands' });
    r.hands.forEach((h, i) => {
      const active = r.phase === 'player' && i === r.active && r.hands.length > 1;
      const result = settled ? r.results[i] : undefined;
      const seen = visible(`hand${i}`, h.cards);
      const bj = isBlackjack(seen) && !h.fromSplit;
      hands.append(
        el(
          'section',
          { class: `bj-zone${active ? ' bj-active' : ''}` },
          el('h2', { class: 'bj-label', text: `${r.hands.length > 1 ? `Main ${i + 1}` : 'Toi'} · ${bj ? 'Blackjack' : label(seen)} · mise ${h.stake}` }),
          row(`hand${i}`, h.cards),
          result ? el('p', { class: `bj-result bj-${result.outcome}`, text: resultText(result) }) : '',
        ),
      );
    });
    table.append(hands);

    if (r.phase === 'player' || (landing && !dealerTurn)) {
      // While a card lands the buttons stay, greyed: their disappearing would give the outcome away.
      const playing = r.phase === 'player' && !landing;
      const h = r.hand;
      table.append(
        el(
          'div',
          { class: 'button-row bj-actions' },
          button('Carte', () => act((x) => x.hit()), playing),
          button('Rester', () => act((x) => x.stand()), playing),
          button('Doubler', () => act((x) => bet(h.stake) && x.double()), playing && r.canDouble() && chips() >= h.stake, true),
          button('Séparer', () => act((x) => bet(h.stake) && x.split()), playing && r.canSplit() && chips() >= h.stake, true),
        ),
      );
    } else if (!settled) {
      table.append(el('p', { class: 'bj-wait', text: 'Le croupier tire…' }));
    } else {
      table.append(
        banner(r),
        el(
          'div',
          { class: 'button-row bj-actions' },
          button(`Rejouer la même mise (${lastBet})`, () => deal(lastBet), chips() >= lastBet),
          button('Nouvelle mise', () => {
            round = null;
            render();
          }, true, true),
        ),
      );
    }
  }

  function banner(r: Round): HTMLElement {
    const staked = r.hands.reduce((s, h) => s + h.stake, 0);
    const back = r.results.reduce((s, x) => s + Math.floor(x.payout), 0);
    const net = back - staked;
    const dealerBj = isBlackjack(r.dealer);
    let title: string;
    if (r.results.some((x) => x.outcome === 'blackjack')) title = 'Blackjack !';
    else if (net > 0) title = 'Gagné !';
    else if (net === 0) title = 'Égalité';
    else title = dealerBj ? 'Blackjack du croupier' : 'Perdu';
    const kind = net > 0 ? 'bj-banner-win' : net === 0 ? 'bj-banner-push' : 'bj-banner-lose';
    const amount = net > 0 ? `+${formatChips(net)} jetons` : net === 0 ? 'Mise rendue' : `${formatChips(net)} jetons`;
    return el(
      'div',
      { class: `bj-banner ${kind}`, role: 'status' },
      el('strong', { class: 'bj-banner-title', text: title }),
      el('span', { class: 'bj-banner-amount', text: amount }),
    );
  }

  function resultText(result: HandResult): string {
    const gain = Math.floor(result.payout);
    return gain > 0 ? `${OUTCOME_TEXT[result.outcome]} · ${gain} rendus` : OUTCOME_TEXT[result.outcome];
  }

  function renderBetting(): void {
    const left = chips();
    table.append(
      el('p', { class: 'bj-hint', text: 'Choisis ta mise, puis distribue.' }),
      el('p', { class: 'bj-pending', text: `Mise : ${pending}` }),
      el(
        'div',
        { class: 'bj-chips' },
        ...CHIP_VALUES.map((v) => {
          const b = el('button', { class: `bj-chip bj-chip-${v}`, type: 'button', text: chipLabel(v), 'aria-label': `${formatChips(v)} jetons` });
          b.disabled = pending + v > left;
          b.addEventListener('click', () => {
            pending += v;
            render();
          });
          return b;
        }),
      ),
      el(
        'div',
        { class: 'button-row bj-actions' },
        button('Distribuer', () => deal(pending), pending > 0 && pending <= left),
        button('Effacer', () => {
          pending = 0;
          render();
        }, pending > 0, true),
        ...(lastBet > 0 ? [button(`Rejouer la même mise (${lastBet})`, () => deal(lastBet), lastBet <= left, true)] : []),
      ),
      el('div', { class: 'button-row' }, button('🎓 Conseils de pro', openTips, true, true)),
      el('p', {
        class: 'bj-rules',
        text: 'Sabot de 6 jeux · le croupier reçoit une seule carte et tire après toi · il reste sur 17 · blackjack payé 3 pour 2 · contre un blackjack du croupier, tu ne perds que ta mise de départ · pas d’assurance',
      }),
    );
  }

  render();
  return () => {
    window.clearTimeout(timer);
    // Leaving mid-reveal still pays what the round owes.
    if (!settled && round?.phase === 'over') {
      settled = true;
      for (const r of round.results) pay(Math.floor(r.payout));
    }
  };
}
