import type { General } from '../general-types'
import rawGenerals from './generals.generated.json'

type GeneralInput = Omit<General, 'status'>

const generated = rawGenerals as { results: GeneralInput[] }

export const mockGenerals: General[] = generated.results
  .map((general) => ({
    ...general,
    enable: general.enable ?? true,
    status: {
      turnedOver: false,
      chained: false,
      dead: false,
    },
  }))
  .filter((general) => general.enable !== false)