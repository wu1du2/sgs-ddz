import type { General } from '../general-types'
import rawGenerals from './generals.json'

type GeneralInput = Omit<General, 'status'>

export const mockGenerals: General[] = (rawGenerals as GeneralInput[]).map((general) => ({
  ...general,
  status: {
    turnedOver: false,
    chained: false,
    dead: false,
  },
}))