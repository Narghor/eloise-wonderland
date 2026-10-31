import './blackjack.css';
import { el, topBar } from '../../../dom';
import { bet, chips, pay } from '../chips';
import { Round, Shoe, isBlackjack, totalLabel, type Card, type HandResult } from './blackjackLogic';

const CHIP_VALUES = [10, 25, 50, 100];
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R'];
const SUITS: Record<Card['suit'], string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const OUTCOME_TEXT: Record<HandResult['outcome'], string> = {
  blackjack: 'Blackjack !',
  win: 'Gagné',
  push: 'Égalité',
  lose: 'Perdu',
};

export function renderBlackjack(root: HTMLElement): () => void {
  const shoe = new Shoe();
  let round: Round | null = null;
  let pending = 0;
  let lastBet = 0;
  let shuffled = false;
  /** Cards already on screen, per row key: only newer ones get the deal animation. */
  const shown = new Map<string, number>();

  const balance = el('span', { class: 'bj-balance' });
  const table = el('main', { class: 'bj-table' });
  root.append(el('div', { class: 'bj' }, topBar('Blackjack', balance, { href: '#/casino', label: 'Casino' }), table));

  function cardView(card: Card | null, isNew: boolean): HTMLElement {
    if (!card) return el('div', { class: `bj-card bj-back${isNew ? ' bj-new' : ''}` });
    const red = card.suit === 'H' || card.suit === 'D';
    const label = `${RANKS[card.rank]}${SUITS[card.suit]}`;
    return el(
      'div',
      { class: `bj-card${red ? ' bj-red' : ''}${isNew ? ' bj-new' : ''}`, 'aria-label': label },
      el('span', { class: 'bj-rank', text: RANKS[card.rank] }),
      el('span', { class: 'bj-suit', text: SUITS[card.suit] }),
    );
  }

  function row(key: string, cards: (Card | null)[]): HTMLElement {
    const before = shown.get(key) ?? 0;
    shown.set(key, cards.length);
    return el('div', { class: 'bj-cards' }, ...cards.map((c, i) => cardView(c, i >= before)));
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
    settleIfOver();
    render();
  }

  function settleIfOver(): void {
    if (round?.phase !== 'over') return;
    for (const r of round.results) pay(Math.floor(r.payout));
  }

  function act(fn: (r: Round) => void): void {
    if (!round) return;
    fn(round);
    settleIfOver();
    render();
  }

  function render(): void {
    balance.textContent = `${chips()} jetons`;
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
    const over = r.phase === 'over';
    const dealerCards = over ? r.dealer : [r.dealer[0], null];
    table.append(
      el(
        'section',
        { class: 'bj-zone' },
        el('h2', { class: 'bj-label', text: `Croupier · ${over ? totalLabel(r.dealer) : totalLabel([r.dealer[0]])}` }),
        row('dealer', dealerCards),
      ),
    );
    const hands = el('div', { class: 'bj-hands' });
    r.hands.forEach((h, i) => {
      const active = !over && i === r.active && r.hands.length > 1;
      const result = over ? r.results[i] : undefined;
      const bj = isBlackjack(h.cards) && !h.fromSplit;
      hands.append(
        el(
          'section',
          { class: `bj-zone${active ? ' bj-active' : ''}` },
          el('h2', { class: 'bj-label', text: `${r.hands.length > 1 ? `Main ${i + 1}` : 'Toi'} · ${bj ? 'Blackjack' : totalLabel(h.cards)} · mise ${h.stake}` }),
          row(`hand${i}`, h.cards),
          result ? el('p', { class: `bj-result bj-${result.outcome}`, text: resultText(result) }) : '',
        ),
      );
    });
    table.append(hands);

    if (!over) {
      const h = r.hand;
      table.append(
        el(
          'div',
          { class: 'button-row bj-actions' },
          button('Carte', () => act((x) => x.hit())),
          button('Rester', () => act((x) => x.stand())),
          button('Doubler', () => act((x) => bet(h.stake) && x.double()), r.canDouble() && chips() >= h.stake, true),
          button('Séparer', () => act((x) => bet(h.stake) && x.split()), r.canSplit() && chips() >= h.stake, true),
        ),
      );
    } else {
      table.append(
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

  function resultText(result: HandResult): string {
    const gain = Math.floor(result.payout);
    return gain > 0 ? `${OUTCOME_TEXT[result.outcome]} · +${gain}` : OUTCOME_TEXT[result.outcome];
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
          const b = el('button', { class: `bj-chip bj-chip-${v}`, type: 'button', text: String(v) });
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
      el('p', { class: 'bj-rules', text: 'Sabot de 6 jeux · le croupier reste sur 17 · blackjack payé 3 pour 2 · pas d’assurance' }),
    );
  }

  render();
  return () => {};
}
