import { Card } from './card'

export class Deck {
  private readonly cards: Card[]

  constructor(initialCards: Card[] = []) {
    this.cards = [...initialCards]
  }

  get total(): number {
    return this.cards.length
  }

  shuffle(): void {
    for (let index = this.cards.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1))
      const temp = this.cards[index]
      this.cards[index] = this.cards[randomIndex]
      this.cards[randomIndex] = temp
    }
  }

  deal(count = 1): Card[] {
    if (count <= 0) {
      return []
    }
    if (count > this.cards.length) {
      throw new Error('Not enough cards to deal')
    }
    return this.cards.splice(0, count)
  }

  set_bottom(cards: Card | Card[]): void {
    if (Array.isArray(cards)) {
      this.cards.push(...cards)
      return
    }
    this.cards.push(cards)
  }

  set_peak(cards: Card | Card[]): void {
    if (Array.isArray(cards)) {
      this.cards.unshift(...cards)
      return
    }
    this.cards.unshift(cards)
  }

  show_top_K(count: number): Card[] {
    if (count <= 0) {
      return []
    }
    return this.cards.slice(0, Math.min(count, this.cards.length))
  }
}