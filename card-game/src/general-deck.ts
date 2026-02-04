import type { General } from './general-types'

export class GeneralDeck {
  private readonly generals: General[]

  constructor(initialGenerals: General[]) {
    this.generals = initialGenerals.map((general) => ({
      ...general,
      skills: [...general.skills],
      skills_description: general.skills_description ? [...general.skills_description] : undefined,
      status: { ...general.status },
    }))
  }

  get total(): number {
    return this.generals.length
  }

  shuffle(): void {
    for (let index = this.generals.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1))
      const temp = this.generals[index]
      this.generals[index] = this.generals[randomIndex]
      this.generals[randomIndex] = temp
    }
  }

  deal(count = 1): General[] {
    if (count <= 0) {
      return []
    }
    if (count > this.generals.length) {
      throw new Error('Not enough generals to deal')
    }
    return this.generals.splice(0, count)
  }
}