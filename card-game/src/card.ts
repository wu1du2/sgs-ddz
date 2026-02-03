export type Suit = 'spade' | 'heart' | 'club' | 'diamond'

export type CardType = 'basic' | 'equipment' | 'trick'

export class Card {
  readonly name: string
  readonly suit: Suit
  readonly rank: number
  readonly type: CardType

  constructor(options: { name: string; suit: Suit; rank: number; type: CardType }) {
    this.name = options.name
    this.suit = options.suit
    this.rank = options.rank
    this.type = options.type
    Object.freeze(this)
  }
}