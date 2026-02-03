import { describe, expect, it } from 'vitest'
import { applyMove, callLord, chooseGeneral, createRoom, initHands, resetRoom, takeSeat } from '../server/room'

describe('server room logic', () => {
  it('handles seat take and call lord', () => {
    const room = createRoom('room-1')
    room.players.set('u1', { userId: 'u1', nickname: 'A', seatIndex: null, online: true })
    expect(takeSeat(room, 'u1', 0)).toBe(true)
    expect(callLord(room, 'u1')).toBe(true)
    expect(room.landlordSeat).toBe(0)
    expect(room.phase).toBe('choose_generals')
  })

  it('advances to init hands after all generals chosen', () => {
    const room = createRoom('room-2')
    room.players.set('u1', { userId: 'u1', nickname: 'A', seatIndex: 0, online: true })
    room.players.set('u2', { userId: 'u2', nickname: 'B', seatIndex: 1, online: true })
    room.players.set('u3', { userId: 'u3', nickname: 'C', seatIndex: 2, online: true })
    callLord(room, 'u1')
    const g0 = room.generalOffers[0][0]?.id ?? ''
    const g1 = room.generalOffers[1][0]?.id ?? ''
    const g2 = room.generalOffers[2][0]?.id ?? ''
    expect(chooseGeneral(room, 'u1', g0)).toBe(true)
    expect(chooseGeneral(room, 'u2', g1)).toBe(true)
    expect(chooseGeneral(room, 'u3', g2)).toBe(true)
    expect(room.phase).toBe('init_hands')
  })

  it('deals initial hands and applies a move', () => {
    const room = createRoom('room-3')
    room.players.set('u1', { userId: 'u1', nickname: 'A', seatIndex: 0, online: true })
    room.players.set('u2', { userId: 'u2', nickname: 'B', seatIndex: 1, online: true })
    room.players.set('u3', { userId: 'u3', nickname: 'C', seatIndex: 2, online: true })
    resetRoom(room)
    room.landlordSeat = 0
    room.phase = 'init_hands'
    expect(initHands(room)).toBe(true)
    expect(room.gameState.hands[0]).toHaveLength(4)

    const moved = applyMove(room, { source: 'deck-top', targetZone: 'reveal' })
    expect(moved).toBe(true)
    expect(room.gameState.reveal.length).toBe(1)
  })
})