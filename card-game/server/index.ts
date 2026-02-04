import { createReadStream, existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer, WebSocket } from 'ws'
import { applyMove, buildSnapshot, callLord, chooseGeneral, clearPlayArea, createRoom, ensurePlayer, initHands, nextTurn, resetDeck, resetRoom, shuffleDeckOnly, takeSeat, togglePrivateNote, updateNotes, type MovePayload, type Room } from './room'

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

const port = Number(process.env.PORT ?? 5175)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const distDir = join(__dirname, '../dist')
const indexFile = join(distDir, 'index.html')

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8'
}

const httpServer = createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400)
    res.end('Bad Request')
    return
  }

  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
  const normalizedPath = url.pathname === '/' ? indexFile : join(distDir, url.pathname)
  const filePath = existsSync(normalizedPath) ? normalizedPath : indexFile

  if (!existsSync(filePath)) {
    res.writeHead(404)
    res.end('Not Found')
    return
  }

  const ext = extname(filePath)
  res.writeHead(200, { 'Content-Type': contentTypes[ext] ?? 'application/octet-stream' })
  createReadStream(filePath).pipe(res)
})

const server = new WebSocketServer({ noServer: true })

httpServer.on('upgrade', (request, socket, head) => {
  server.handleUpgrade(request, socket, head, (client) => {
    server.emit('connection', client, request)
  })
})

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

    if (type === 'play:clear') {
      clearPlayArea(room, context.userId)
      sendSnapshot(room.roomId)
      return
    }

    if (type === 'notes:update') {
      const scope = String(payload?.scope ?? '') as 'public' | 'private'
      const value = String(payload?.value ?? '')
      if (scope === 'public' || scope === 'private') {
        updateNotes(room, context.userId, scope, value)
        sendSnapshot(room.roomId)
      }
      return
    }

    if (type === 'notes:toggle') {
      togglePrivateNote(room, context.userId)
      sendSnapshot(room.roomId)
      return
    }

    if (type === 'turn:next') {
      nextTurn(room)
      sendSnapshot(room.roomId)
      return
    }

    if (type === 'deck:reset') {
      resetDeck(room)
      sendSnapshot(room.roomId)
      return
    }

    if (type === 'deck:shuffle') {
      shuffleDeckOnly(room)
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

httpServer.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})