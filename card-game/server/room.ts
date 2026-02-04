import { createGameState, drawFromDeck, moveToDeckBottom, moveToDeckTop, moveToDiscard, moveToEquipmentArea, moveToJudgeArea, moveToPlayArea, moveToReveal, takeCardFromHand, takeRandomFromHand, takeTopFromDeck, takeTopFromDiscard, takeTopFromReveal, shuffleDeck, type GameState, type CardInstance } from '../src/game-logic'
import { GeneralDeck } from '../src/general-deck'
import { mockGenerals } from '../src/generals'
import { INITIAL_DECK } from '../src/initial-deck'
import type { General } from '../src/general-types'

export type RoomPhase = 'call_lord' | 'choose_generals' | 'init_hands' | 'in_game'

export type PlayerInfo = {
  userId: string
  nickname: string
  seatIndex: number | null
  online: boolean
}

export type Room = {
  roomId: string
  phase: RoomPhase
  landlordSeat: number | null
  roles: Array<'landlord' | 'farmer' | null>
  seats: Array<string | null>
  players: Map<string, PlayerInfo>
  generalDeck: GeneralDeck
  generalOffers: General[][]
  playerGenerals: Array<General | null>
  activeSeat: number | null
  publicNotes: string[]
  privateNotes: string[]
  privateVisible: boolean[]
  gameState: GameState
}

export type MovePayload = {
  source: 'deck-top' | 'hand' | 'hand-random' | 'discard' | 'reveal' | 'play-area' | 'equipment' | 'judge'
  targetZone: 'hand' | 'discard' | 'reveal' | 'deck-top' | 'deck-bottom' | 'play-area' | 'equipment' | 'judge'
  sourceSeat?: number
  targetSeat?: number
  cardId?: string
}

export const createRoom = (roomId: string): Room => {
  const gameState = createGameState(INITIAL_DECK)
  shuffleDeck(gameState)
  const generalDeck = new GeneralDeck(mockGenerals)
  generalDeck.shuffle()
  return {
    roomId,
    phase: 'call_lord',
    landlordSeat: null,
    roles: [null, null, null],
    seats: [null, null, null],
    players: new Map(),
    generalDeck,
    generalOffers: [generalDeck.deal(3), generalDeck.deal(3), generalDeck.deal(3)],
    playerGenerals: [null, null, null],
    activeSeat: null,
    publicNotes: ['', '', ''],
    privateNotes: ['', '', ''],
    privateVisible: [false, false, false],
    gameState,
  }
}

export const resetRoom = (room: Room) => {
  room.phase = 'call_lord'
  room.landlordSeat = null
  room.roles = [null, null, null]
  room.generalDeck = new GeneralDeck(mockGenerals)
  room.generalDeck.shuffle()
  room.generalOffers = [room.generalDeck.deal(3), room.generalDeck.deal(3), room.generalDeck.deal(3)]
  room.playerGenerals = [null, null, null]
  room.activeSeat = null
  room.publicNotes = ['', '', '']
  room.privateNotes = ['', '', '']
  room.privateVisible = [false, false, false]
  room.gameState = createGameState(INITIAL_DECK)
  shuffleDeck(room.gameState)
}

export const ensurePlayer = (room: Room, userId: string, nickname: string) => {
  const existing = room.players.get(userId)
  if (existing) {
    existing.nickname = nickname
    existing.online = true
    return existing
  }
  const player: PlayerInfo = { userId, nickname, seatIndex: null, online: true }
  room.players.set(userId, player)
  return player
}

export const takeSeat = (room: Room, userId: string, seatIndex: number): boolean => {
  if (seatIndex < 0 || seatIndex > 2) {
    return false
  }
  if (room.seats[seatIndex] && room.seats[seatIndex] !== userId) {
    return false
  }
  const player = room.players.get(userId)
  if (!player) {
    return false
  }
  if (player.seatIndex !== null) {
    room.seats[player.seatIndex] = null
  }
  room.seats[seatIndex] = userId
  player.seatIndex = seatIndex
  return true
}

export const callLord = (room: Room, userId: string): boolean => {
  if (room.phase !== 'call_lord' || room.landlordSeat !== null) {
    return false
  }
  const player = room.players.get(userId)
  if (!player || player.seatIndex === null) {
    return false
  }
  const seatIndex = player.seatIndex
  room.landlordSeat = seatIndex
  room.roles = [0, 1, 2].map((index) => (index === seatIndex ? 'landlord' : 'farmer'))
  room.phase = 'choose_generals'
  if (room.generalOffers.every((offers) => offers.length === 0)) {
    room.generalDeck = new GeneralDeck(mockGenerals)
    room.generalDeck.shuffle()
    room.generalOffers = [room.generalDeck.deal(3), room.generalDeck.deal(3), room.generalDeck.deal(3)]
  }
  const extra = room.generalDeck.deal(2)
  room.generalOffers[seatIndex].push(...extra)
  return true
}

export const chooseGeneral = (room: Room, userId: string, generalId: string): boolean => {
  if (room.phase !== 'choose_generals') {
    return false
  }
  const player = room.players.get(userId)
  if (!player || player.seatIndex === null) {
    return false
  }
  const seatIndex = player.seatIndex
  if (room.playerGenerals[seatIndex]) {
    return false
  }
  const offers = room.generalOffers[seatIndex]
  const index = offers.findIndex((general) => general.id === generalId)
  if (index === -1) {
    return false
  }
  room.playerGenerals[seatIndex] = offers.splice(index, 1)[0]
  if (room.playerGenerals.every((general) => general)) {
    for (let index = 0; index < 3; index += 1) {
      drawFromDeck(room.gameState, index, 4)
    }
    room.activeSeat = room.landlordSeat ?? 0
    room.phase = 'in_game'
  }
  return true
}

export const initHands = (room: Room): boolean => {
  if (room.phase !== 'init_hands') {
    return false
  }
  for (let index = 0; index < 3; index += 1) {
    drawFromDeck(room.gameState, index, 4)
  }
  room.activeSeat = room.landlordSeat ?? 0
  room.phase = 'in_game'
  return true
}

export const clearPlayArea = (room: Room, userId: string): boolean => {
  const player = room.players.get(userId)
  if (!player || player.seatIndex === null) {
    return false
  }
  const seatIndex = player.seatIndex
  const area = room.gameState.playAreas[seatIndex]
  while (area.length > 0) {
    const card = area.shift()
    if (card) {
      moveToDiscard(room.gameState, card)
    }
  }
  return true
}

export const updateNotes = (room: Room, userId: string, scope: 'public' | 'private', value: string): boolean => {
  const player = room.players.get(userId)
  if (!player || player.seatIndex === null) {
    return false
  }
  const seatIndex = player.seatIndex
  if (scope === 'public') {
    room.publicNotes[seatIndex] = value
    return true
  }
  room.privateNotes[seatIndex] = value
  return true
}

export const togglePrivateNote = (room: Room, userId: string): boolean => {
  const player = room.players.get(userId)
  if (!player || player.seatIndex === null) {
    return false
  }
  const seatIndex = player.seatIndex
  room.privateVisible[seatIndex] = !room.privateVisible[seatIndex]
  return true
}

export const nextTurn = (room: Room): boolean => {
  if (room.phase !== 'in_game') {
    return false
  }
  if (room.activeSeat === null) {
    room.activeSeat = room.landlordSeat ?? 0
  } else {
    room.activeSeat = (room.activeSeat + 1) % 3
  }
  return true
}

export const resetDeck = (room: Room): boolean => {
  if (room.gameState.discard.length > 0) {
    room.gameState.deck.push(...room.gameState.discard.splice(0))
  }
  shuffleDeck(room.gameState)
  return true
}

export const shuffleDeckOnly = (room: Room): boolean => {
  shuffleDeck(room.gameState)
  return true
}

const removeFromReveal = (room: Room, cardId: string): CardInstance | null => {
  const index = room.gameState.reveal.findIndex((card) => card.id === cardId)
  if (index === -1) {
    return null
  }
  return room.gameState.reveal.splice(index, 1)[0]
}

const removeFromDiscardById = (room: Room, cardId: string): CardInstance | null => {
  const index = room.gameState.discard.findIndex((card) => card.id === cardId)
  if (index === -1) {
    return null
  }
  return room.gameState.discard.splice(index, 1)[0]
}

const removeFromPlayAreaById = (room: Room, playerIndex: number, cardId: string): CardInstance | null => {
  const area = room.gameState.playAreas[playerIndex]
  const index = area.findIndex((card) => card.id === cardId)
  if (index === -1) {
    return null
  }
  return area.splice(index, 1)[0]
}

const removeFromEquipmentById = (room: Room, playerIndex: number, cardId: string): CardInstance | null => {
  const area = room.gameState.equipmentAreas[playerIndex]
  const index = area.findIndex((card) => card.id === cardId)
  if (index === -1) {
    return null
  }
  return area.splice(index, 1)[0]
}

const removeFromJudgeById = (room: Room, playerIndex: number, cardId: string): CardInstance | null => {
  const area = room.gameState.judgeAreas[playerIndex]
  const index = area.findIndex((card) => card.id === cardId)
  if (index === -1) {
    return null
  }
  return area.splice(index, 1)[0]
}

const placeCard = (room: Room, card: CardInstance, targetZone: MovePayload['targetZone'], targetSeat?: number) => {
  if (targetZone === 'hand' && targetSeat !== undefined) {
    card.faceUp = false
    room.gameState.hands[targetSeat].push(card)
    return
  }
  if (targetZone === 'discard') {
    moveToDiscard(room.gameState, card)
    return
  }
  if (targetZone === 'reveal') {
    moveToReveal(room.gameState, card)
    return
  }
  if (targetZone === 'play-area' && targetSeat !== undefined) {
    moveToPlayArea(room.gameState, card, targetSeat)
    return
  }
  if (targetZone === 'equipment' && targetSeat !== undefined) {
    moveToEquipmentArea(room.gameState, card, targetSeat)
    return
  }
  if (targetZone === 'judge' && targetSeat !== undefined) {
    moveToJudgeArea(room.gameState, card, targetSeat)
    return
  }
  if (targetZone === 'deck-top') {
    moveToDeckTop(room.gameState, card)
    return
  }
  if (targetZone === 'deck-bottom') {
    moveToDeckBottom(room.gameState, card)
  }
}

export const applyMove = (room: Room, payload: MovePayload): boolean => {
  let card: CardInstance | null = null

  if (payload.source === 'deck-top') {
    card = takeTopFromDeck(room.gameState)
  }

  if (payload.source === 'hand' && payload.sourceSeat !== undefined && payload.cardId) {
    card = takeCardFromHand(room.gameState, payload.sourceSeat, payload.cardId)
  }

  if (payload.source === 'hand-random' && payload.sourceSeat !== undefined) {
    card = takeRandomFromHand(room.gameState, payload.sourceSeat)
  }

  if (payload.source === 'discard' && payload.cardId) {
    card = removeFromDiscardById(room, payload.cardId) ?? takeTopFromDiscard(room.gameState)
  }

  if (payload.source === 'reveal' && payload.cardId) {
    card = removeFromReveal(room, payload.cardId) ?? takeTopFromReveal(room.gameState)
  }

  if (payload.source === 'play-area' && payload.sourceSeat !== undefined && payload.cardId) {
    card = removeFromPlayAreaById(room, payload.sourceSeat, payload.cardId)
  }

  if (payload.source === 'equipment' && payload.sourceSeat !== undefined && payload.cardId) {
    card = removeFromEquipmentById(room, payload.sourceSeat, payload.cardId)
  }

  if (payload.source === 'judge' && payload.sourceSeat !== undefined && payload.cardId) {
    card = removeFromJudgeById(room, payload.sourceSeat, payload.cardId)
  }

  if (!card) {
    return false
  }
  placeCard(room, card, payload.targetZone, payload.targetSeat)
  return true
}

export const buildSnapshot = (room: Room) => ({
  roomId: room.roomId,
  phase: room.phase,
  landlordSeat: room.landlordSeat,
  roles: room.roles,
  seats: room.seats,
  players: Array.from(room.players.values()),
  generalOffers: room.generalOffers,
  playerGenerals: room.playerGenerals,
  activeSeat: room.activeSeat,
  publicNotes: room.publicNotes,
  privateNotes: room.privateNotes,
  privateVisible: room.privateVisible,
  gameState: room.gameState,
})