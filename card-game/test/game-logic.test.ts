import { describe, expect, it } from 'vitest'
import { Card } from '../src/card'
import {
  createGameState,
  drawFromDeck,
  moveToDiscard,
  moveToReveal,
  takeRandomFromHand,
  takeTopFromDeck,
} from '../src/game-logic'

const makeCard = (name: string) => new Card({ name, suit: 'spade', rank: 1, type: 'basic' })

describe('game-logic', () => {
  it('draws from deck and updates hand', () => {
    const state = createGameState([makeCard('A'), makeCard('B')])
    const drawn = drawFromDeck(state, 0, 1)
    expect(drawn).toHaveLength(1)
    expect(state.hands[0]).toHaveLength(1)
    expect(state.deck).toHaveLength(1)
  })

  it('moves cards to discard and reveal', () => {
    const state = createGameState([makeCard('A'), makeCard('B')])
    const [card] = drawFromDeck(state, 0, 1)
    moveToDiscard(state, card)
    expect(state.discard).toHaveLength(1)
    expect(state.discard[0].faceUp).toBe(true)

    const [card2] = drawFromDeck(state, 0, 1)
    moveToReveal(state, card2)
    expect(state.reveal).toHaveLength(1)
    expect(state.reveal[0].faceUp).toBe(true)
  })

  it('takes top from deck and handles empty deck', () => {
    const state = createGameState([makeCard('A')])
    const card = takeTopFromDeck(state)
    expect(card).not.toBeNull()
    expect(state.deck).toHaveLength(0)
    const empty = takeTopFromDeck(state)
    expect(empty).toBeNull()
  })

  it('takes random from hand', () => {
    const state = createGameState([makeCard('A'), makeCard('B')])
    drawFromDeck(state, 0, 2)
    const taken = takeRandomFromHand(state, 0)
    expect(taken).not.toBeNull()
    expect(state.hands[0]).toHaveLength(1)
  })
})