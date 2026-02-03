import { describe, expect, it } from 'vitest'
import { GeneralDeck } from '../src/general-deck'
import { mockGenerals } from '../src/generals'

describe('GeneralDeck', () => {
  it('should shuffle and deal generals', () => {
    const deck = new GeneralDeck(mockGenerals)
    expect(deck.total).toBe(20)

    deck.shuffle()
    expect(deck.total).toBe(20)

    const dealt = deck.deal(3)
    expect(dealt).toHaveLength(3)
    expect(deck.total).toBe(17)
  })

  it('should throw when dealing more than available', () => {
    const deck = new GeneralDeck(mockGenerals)
    expect(() => deck.deal(21)).toThrow('Not enough generals to deal')
  })
})