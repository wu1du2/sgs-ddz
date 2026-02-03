import { Card } from './card'

export type CardInstance = {
  id: string
  card: Card
  faceUp: boolean
}

export type GameState = {
  deck: CardInstance[]
  discard: CardInstance[]
  reveal: CardInstance[]
  hands: CardInstance[][]
}

const createCardInstances = (cards: ReadonlyArray<Card>): CardInstance[] =>
  cards.map((card, index) => ({
    id: `card-${index + 1}`,
    card,
    faceUp: false,
  }))

export const createGameState = (cards: ReadonlyArray<Card>, playerCount = 3): GameState => ({
  deck: createCardInstances(cards),
  discard: [],
  reveal: [],
  hands: Array.from({ length: playerCount }, () => [] as CardInstance[]),
})

export const shuffleDeck = (state: GameState): void => {
  for (let index = state.deck.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const temp = state.deck[index]
    state.deck[index] = state.deck[randomIndex]
    state.deck[randomIndex] = temp
  }
}

const refillDeckFromDiscard = (state: GameState) => {
  if (state.deck.length === 0 && state.discard.length > 0) {
    state.deck.push(...state.discard.splice(0))
    shuffleDeck(state)
  }
}

export const drawFromDeck = (state: GameState, playerIndex: number, count = 1): CardInstance[] => {
  if (count <= 0) {
    return []
  }
  refillDeckFromDiscard(state)
  if (count > state.deck.length) {
    throw new Error('Not enough cards in deck')
  }
  const drawn = state.deck.splice(0, count)
  state.hands[playerIndex].push(...drawn)
  return drawn
}

export const takeCardFromHand = (state: GameState, playerIndex: number, cardId: string): CardInstance | null => {
  const hand = state.hands[playerIndex]
  const index = hand.findIndex((item) => item.id === cardId)
  if (index === -1) {
    return null
  }
  return hand.splice(index, 1)[0]
}

export const takeRandomFromHand = (state: GameState, playerIndex: number): CardInstance | null => {
  const hand = state.hands[playerIndex]
  if (hand.length === 0) {
    return null
  }
  const randomIndex = Math.floor(Math.random() * hand.length)
  return hand.splice(randomIndex, 1)[0]
}

export const moveToDiscard = (state: GameState, card: CardInstance): void => {
  card.faceUp = true
  state.discard.unshift(card)
}

export const moveToReveal = (state: GameState, card: CardInstance): void => {
  card.faceUp = true
  state.reveal.unshift(card)
}

export const moveToDeckTop = (state: GameState, card: CardInstance): void => {
  card.faceUp = false
  state.deck.unshift(card)
}

export const moveToDeckBottom = (state: GameState, card: CardInstance): void => {
  card.faceUp = false
  state.deck.push(card)
}

export const takeTopFromDeck = (state: GameState): CardInstance | null => {
  refillDeckFromDiscard(state)
  return state.deck.shift() ?? null
}

export const takeTopFromDiscard = (state: GameState): CardInstance | null =>
  state.discard.shift() ?? null

export const takeTopFromReveal = (state: GameState): CardInstance | null =>
  state.reveal.shift() ?? null