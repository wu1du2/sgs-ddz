import { WebSocketServer, WebSocket } from 'ws'
import { applyMove, buildSnapshot, callLord, chooseGeneral, createRoom, ensurePlayer, initHands, resetRoom, takeSeat, type MovePayload, type Room } from './room'

type ClientContext = {
  roomId: string
  userId: string
}

type MessagePayload = {
  type: string
  payload?: Record<string, unknown>
}

const rooms = new Map<string, Room>()
const clientMap = new Map<WebSocket, ClientContext>()

const getRoom = (roomId: string) => {
  const existing = rooms.get(roomId)
  if (existing) {
    return existing
  }
  const room = createRoom(roomId)
  rooms.set(roomId, room)
  return room
}

const broadcast = (roomId: string, message: MessagePayload) => {
  const data = JSON.stringify(message)
  clientMap.forEach((context, client) => {
    if (context.roomId === roomId && client.readyState === client.OPEN) {
      client.send(data)
    }
  })
}

const sendSnapshot = (roomId: string) => {
  const room = rooms.get(roomId)
  if (!room) {
    return
  }
  broadcast(roomId, { type: 'room:snapshot', payload: buildSnapshot(room) })
}

const server = new WebSocketServer({ port: 5174 })

server.on('connection', (socket) => {
  socket.on('message', (raw) => {
    const message = JSON.parse(raw.toString()) as MessagePayload
    const { type, payload } = message

    if (type === 'connect') {
      const roomId = String(payload?.roomId ?? 'default')
      const userId = String(payload?.userId ?? '')
      const nickname = String(payload?.nickname ?? '玩家')
      if (!userId) {
        return
      }
      const room = getRoom(roomId)
      ensurePlayer(room, userId, nickname)
      clientMap.set(socket, { roomId, userId })
      sendSnapshot(roomId)
      return
    }

    const context = clientMap.get(socket)
    if (!context) {
      return
    }
    const room = rooms.get(context.roomId)
    if (!room) {
      return
    }

    if (type === 'room:reset') {
      resetRoom(room)
      sendSnapshot(room.roomId)
      return
    }

    if (type === 'seat:take') {
      const seatIndex = Number(payload?.seatIndex)
      takeSeat(room, context.userId, seatIndex)
      sendSnapshot(room.roomId)
      return
    }

    if (type === 'role:callLord') {
      callLord(room, context.userId)
      sendSnapshot(room.roomId)
      return
    }

    if (type === 'general:choose') {
      const generalId = String(payload?.generalId ?? '')
      chooseGeneral(room, context.userId, generalId)
      sendSnapshot(room.roomId)
      return
    }

    if (type === 'cards:initHands') {
      initHands(room)
      sendSnapshot(room.roomId)
      return
    }

    if (type === 'action:move') {
      const move = payload as MovePayload
      applyMove(room, move)
      sendSnapshot(room.roomId)
    }
  })

  socket.on('close', () => {
    const context = clientMap.get(socket)
    if (!context) {
      return
    }
    const room = rooms.get(context.roomId)
    const player = room?.players.get(context.userId)
    if (player) {
      player.online = false
    }
    clientMap.delete(socket)
    sendSnapshot(context.roomId)
  })
})

console.log('Server listening on ws://localhost:5174')