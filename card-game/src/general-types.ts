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
  portrait: string
  status: GeneralStatus
}