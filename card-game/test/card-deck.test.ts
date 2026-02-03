import { describe, expect, it } from 'vitest'
import { Card } from '../src/card'
import { Deck } from '../src/deck'

describe('Card', () => {
  it('should be immutable and keep properties', () => {
    const card = new Card({ name: '杀', suit: 'spade', rank: 7, type: 'basic' })

    expect(card.name).toBe('杀')
    expect(card.suit).toBe('spade')
    expect(card.rank).toBe(7)
    expect(card.type).toBe('basic')

    expect(() => {
      ;(card as { name: string }).name = '闪'
    }).toThrow()

    expect(card.name).toBe('杀')
  })
})

describe('Deck', () => {
  it('should manage cards correctly', () => {
    const cards = [
      new Card({ name: '杀', suit: 'spade', rank: 7, type: 'basic' }),
      new Card({ name: '闪', suit: 'heart', rank: 2, type: 'basic' }),
      new Card({ name: '桃', suit: 'heart', rank: 6, type: 'basic' }),
    ]

    const deck = new Deck(cards)
    expect(deck.total).toBe(3)

    const topTwo = deck.show_top_K(2)
    expect(topTwo).toHaveLength(2)
    expect(deck.total).toBe(3)

    const dealt = deck.deal(2)
    expect(dealt).toHaveLength(2)
    expect(deck.total).toBe(1)

    const bottomCard = new Card({ name: '酒', suit: 'club', rank: 3, type: 'basic' })
    deck.set_bottom(bottomCard)
    expect(deck.total).toBe(2)

    const topCard = new Card({ name: '无懈可击', suit: 'diamond', rank: 12, type: 'trick' })
    deck.set_peak(topCard)
    expect(deck.total).toBe(3)
    expect(deck.show_top_K(1)[0]).toBe(topCard)

    deck.shuffle()
    expect(deck.total).toBe(3)
  })

  it('should throw when dealing more than available', () => {
    const deck = new Deck([new Card({ name: '杀', suit: 'spade', rank: 7, type: 'basic' })])
    expect(() => deck.deal(2)).toThrow('Not enough cards to deal')
  })
})