// -----------------------------------------------
// BLACKJACK RULES (no DOM)
// -----------------------------------------------
// 6 decks, dealer stands on soft 17, blackjack pays 3:2, European no-hole-card:
// the dealer gets one card at the deal and draws the rest after the player.
// Against a dealer blackjack only the original bet is lost (extra double/split stakes come back).
// Double on any first two cards (also after split), one split, split aces get one card.

export type Suit = 'S' | 'H' | 'D' | 'C';
export interface Card {
  rank: number; // 1 = ace, 11-13 = J Q K
  suit: Suit;
}

export const DECKS = 6;
const RESHUFFLE_AT = 0.75;

export class Shoe {
  private cards: Card[] = [];
  private dealt = 0;

  private readonly random: () => number;

  constructor(random: () => number = Math.random) {
    this.random = random;
    this.shuffle();
  }

  get needsShuffle(): boolean {
    return this.dealt >= this.cards.length * RESHUFFLE_AT;
  }

  shuffle(): void {
    const cards: Card[] = [];
    for (let d = 0; d < DECKS; d++)
      for (const suit of ['S', 'H', 'D', 'C'] as Suit[]) for (let rank = 1; rank <= 13; rank++) cards.push({ rank, suit });
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    this.cards = cards;
    this.dealt = 0;
  }

  draw(): Card {
    if (this.dealt >= this.cards.length) this.shuffle();
    return this.cards[this.dealt++];
  }
}

export function cardValue(card: Card): number {
  return card.rank === 1 ? 1 : Math.min(card.rank, 10);
}

export interface Total {
  hard: number;
  /** Best total (ace counted 11 when it does not bust). */
  best: number;
  soft: boolean;
}

export function totalOf(cards: Card[]): Total {
  let hard = 0;
  let aces = false;
  for (const c of cards) {
    hard += cardValue(c);
    if (c.rank === 1) aces = true;
  }
  const soft = aces && hard + 10 <= 21;
  return { hard, best: soft ? hard + 10 : hard, soft };
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && totalOf(cards).best === 21;
}

export interface Hand {
  cards: Card[];
  stake: number;
  fromSplit: boolean;
  splitAces: boolean;
  done: boolean;
  doubled: boolean;
}

export type Phase = 'player' | 'over';

export interface HandResult {
  outcome: 'blackjack' | 'win' | 'push' | 'lose';
  /** Chips returned to the player, stake included. */
  payout: number;
}

export class Round {
  readonly dealer: Card[] = [];
  readonly hands: Hand[] = [];
  active = 0;
  phase: Phase = 'player';
  results: HandResult[] = [];

  private readonly shoe: Shoe;
  private readonly originalStake: number;

  constructor(shoe: Shoe, stake: number) {
    this.shoe = shoe;
    this.originalStake = stake;
    const player: Card[] = [];
    player.push(shoe.draw());
    this.dealer.push(shoe.draw());
    player.push(shoe.draw());
    this.hands.push({ cards: player, stake, fromSplit: false, splitAces: false, done: false, doubled: false });
    if (isBlackjack(player)) this.finish();
  }

  get hand(): Hand {
    return this.hands[this.active];
  }

  canDouble(): boolean {
    return this.phase === 'player' && this.hand.cards.length === 2 && !this.hand.splitAces;
  }

  canSplit(): boolean {
    const c = this.hand.cards;
    return this.phase === 'player' && this.hands.length === 1 && c.length === 2 && cardValue(c[0]) === cardValue(c[1]);
  }

  hit(): void {
    if (this.phase !== 'player') return;
    this.hand.cards.push(this.shoe.draw());
    if (totalOf(this.hand.cards).best >= 21) this.endHand();
  }

  stand(): void {
    if (this.phase === 'player') this.endHand();
  }

  /** Caller must have taken a second stake equal to the hand's stake. */
  double(): void {
    if (!this.canDouble()) return;
    this.hand.stake *= 2;
    this.hand.doubled = true;
    this.hand.cards.push(this.shoe.draw());
    this.endHand();
  }

  /** Caller must have taken a second stake equal to the hand's stake. */
  split(): void {
    if (!this.canSplit()) return;
    const [a, b] = this.hand.cards;
    const aces = a.rank === 1;
    const stake = this.hand.stake;
    this.hands.length = 0;
    for (const card of [a, b])
      this.hands.push({ cards: [card, this.shoe.draw()], stake, fromSplit: true, splitAces: aces, done: aces, doubled: false });
    if (aces) this.finish();
    else if (totalOf(this.hand.cards).best === 21) this.endHand();
  }

  private endHand(): void {
    this.hand.done = true;
    while (this.active < this.hands.length && this.hands[this.active].done) this.active++;
    if (this.active >= this.hands.length) this.finish();
    else if (totalOf(this.hand.cards).best === 21) this.endHand();
  }

  private finish(): void {
    this.phase = 'over';
    this.active = Math.min(this.active, this.hands.length - 1);
    // The second dealer card is always drawn, so a dealer blackjack is known before anything else.
    this.dealer.push(this.shoe.draw());
    const dealerBj = isBlackjack(this.dealer);
    const first = this.hands[0];
    if (this.hands.length === 1 && isBlackjack(first.cards)) {
      this.results = [dealerBj ? { outcome: 'push', payout: first.stake } : { outcome: 'blackjack', payout: first.stake * 2.5 }];
      return;
    }
    if (dealerBj) {
      // Original bet only: hand 0 carries the original stake, every extra stake is refunded.
      this.results = this.hands.map((h, i) => ({ outcome: 'lose', payout: h.stake - (i === 0 ? this.originalStake : 0) }));
      return;
    }
    if (this.hands.some((h) => totalOf(h.cards).best <= 21)) {
      while (totalOf(this.dealer).best < 17) this.dealer.push(this.shoe.draw());
    }
    const dealer = totalOf(this.dealer).best;
    this.results = this.hands.map((h): HandResult => {
      const mine = totalOf(h.cards).best;
      if (mine > 21) return { outcome: 'lose', payout: 0 };
      if (dealer > 21 || mine > dealer) return { outcome: 'win', payout: h.stake * 2 };
      if (mine === dealer) return { outcome: 'push', payout: h.stake };
      return { outcome: 'lose', payout: 0 };
    });
  }
}

/** Display text: "7/17" for a soft hand, "17" otherwise. */
export function totalLabel(cards: Card[]): string {
  const t = totalOf(cards);
  return t.soft && t.best !== 21 ? `${t.hard}/${t.best}` : `${t.best}`;
}
