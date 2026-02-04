export type GeneralStatus = {
  turnedOver: boolean
  chained: boolean
  dead: boolean
}

export type General = {
  id: string
  name: string
  hpMax: number
  hp: number
  skills: string[]
  skills_description?: string[]
  portrait: string
  enable?: boolean
  status: GeneralStatus
}