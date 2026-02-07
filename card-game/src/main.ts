import './style.css'
import { INITIAL_DECK } from './initial-deck'
import type { General } from './general-types.ts'
import { mockGenerals } from './generals'
import {
  createGameState,
  drawFromDeck,
  shuffleDeck,
  type CardInstance,
  type GameState,
} from './game-logic'

type SeatPosition = 'bottom' | 'left' | 'right'
type Role = 'landlord' | 'farmer' | null
type Phase = 'lobby' | 'call_lord' | 'choose_generals' | 'init_hands' | 'in_game'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('App root not found')
}

const loadIdentity = () => {
  const raw = localStorage.getItem('sgs_user')
  if (raw) {
    return JSON.parse(raw) as { userId: string; nickname: string }
  }
  const identity = { userId: '', nickname: '玩家' }
  localStorage.setItem('sgs_user', JSON.stringify(identity))
  return identity
}

const identity = loadIdentity()

app.innerHTML = `
  <div class="game-root">
    <div class="screen-size" data-screen-size></div>
    <header class="toolbar">
      <div class="connection">
        <label>
          用户 ID
          <input id="user-id-input" value="" />
        </label>
        <input id="nickname-input" type="hidden" value="${identity.nickname}" />
        <label>
          房间
          <input id="room-input" placeholder="room-id" value="default" />
        </label>
        <button id="connect-btn" class="primary">连接</button>
        <span id="connection-status" class="connection-status">未连接</span>
      </div>
      <button id="new-game-btn" class="primary">新开局</button>
      <div class="seat-picker">
        <span class="label">选择座位：</span>
        <button data-seat="0">座位 1</button>
        <div id="seat-status" class="seat-status"></div>
      </div>
    </header>

    <main class="table">
      <button id="debug-deal-btn" class="primary debug-deal-btn">发牌(调试)</button>
      <div class="seat" data-seat="0">
        <div class="seat-header">
          <div class="seat-name">座位 1</div>
          <div class="role-tag" data-role="0"></div>
        </div>
        <div class="seat-body">
          <div class="general" data-general="0" data-size-target="general">
            <div class="portrait-stack" data-size-target="portrait-stack">
              <div class="general-portrait" data-portrait="0" data-size-target="portrait">未选择</div>
              <div class="general-meta" data-size-target="hp-area">
                <span class="hp" data-hp="0">HP 0/0</span>
                <div class="hp-controls" data-hp-controls="0">
                  <button class="hp-btn" data-hp-action="hp-inc" data-seat="0">+</button>
                  <button class="hp-btn" data-hp-action="hp-dec" data-seat="0">-</button>
                  <button class="hp-btn" data-hp-action="max-inc" data-seat="0">➕</button>
                  <button class="hp-btn" data-hp-action="max-dec" data-seat="0">➖</button>
                </div>
              </div>
            </div>
            <div class="general-name">未选将</div>
            <div class="debug-stack" data-size-target="debug-stack">
              <div class="debug-card-area" data-debug-area="0" data-size-target="debug-cards"></div>
              <div class="side-panel" aria-hidden="true" data-size-target="skills">
                <div class="slot-grid">
                  <input class="slot-input" value="" />
                  <input class="slot-input" value="" />
                  <input class="slot-input" value="" />
                  <input class="slot-input" value="" />
                  <input class="slot-input" value="" />
                  <input class="slot-input" value="" />
                  <input class="slot-input" value="" />
                  <input class="slot-input" value="" />
                </div>
              </div>
            </div>
          </div>
          <div class="judge-zone" data-judge-zone="0" data-size-target="judge">
            <div class="judge-title">判定</div>
            <div class="zone-cards judge-cards" data-judge-cards="0"></div>
          </div>
        </div>
        <div class="notes" data-notes="0">
          <div class="note-block">
            <textarea class="note public" data-note-public="0" placeholder="公开备注"></textarea>
          </div>
          <div class="note-block note-private">
            <textarea class="note private" data-note-private="0" placeholder="私密备注"></textarea>
            <button class="note-toggle" data-note-toggle="0">show</button>
          </div>
        </div>
        <div class="actions">
          <button class="call-btn" data-call="0">叫地主</button>
          <div class="general-offers" data-offers="0"></div>
        </div>
      </div>


      <div class="center-area" data-size-target="center-area">
        <div class="center-board" data-size-target="center-board">
          <div class="center-core" data-size-target="center-core">
            <div class="zone-title">公共区域</div>
            <div class="deck-row" data-size-target="deck-row">
              <div class="deck-actions">
                <button id="reset-deck-btn" class="secondary">重置牌堆</button>
                <button id="shuffle-deck-btn" class="secondary">洗牌</button>
              </div>
              <div id="deck-top" class="card-tile back" draggable="true">牌堆顶</div>
              <button id="draw-btn" class="primary draw-btn">摸牌</button>
              <div class="card-slot" data-zone="deck-top">放回顶</div>
              <div class="card-slot" data-zone="deck-bottom">放回底</div>
              <details class="accordion discard-zone" data-zone="discard">
                <summary class="accordion-title">弃牌区（<span id="discard-count">0</span>）</summary>
                <ol id="discard-cards" class="discard-list"></ol>
              </details>
            </div>
            <div class="count">牌堆：<span id="deck-count">0</span></div>
          </div>
          <div class="play-zone center-play" data-play-zone="0" data-size-target="play-0">
            <div class="zone-cards play-cards" data-play-cards="0"></div>
          </div>
          <div class="play-zone center-play" data-play-zone="1" data-size-target="play-1">
            <div class="zone-cards play-cards" data-play-cards="1"></div>
          </div>
          <div class="play-zone center-play" data-play-zone="2" data-size-target="play-2">
            <div class="zone-cards play-cards" data-play-cards="2"></div>
          </div>
        </div>
        <div class="center-controls" data-size-target="center-controls">
          <div id="card-display" class="card-display" data-size-target="card-display">等待操作</div>
        </div>
      </div>
    </main>
  </div>
`

let gameState: GameState = createGameState(INITIAL_DECK)
shuffleDeck(gameState)

let phase: Phase = 'lobby'
let landlordSeat: number | null = null
let roles: Role[] = [null, null, null]
let roomSeats: Array<string | null> = [null, null, null]
let roomPlayers: Array<{ userId: string; nickname: string; seatIndex: number | null; online: boolean }> = []
let isConnected = false

let generalOffers: General[][] = [[], [], []]
let playerGenerals: (General | null)[] = [null, null, null]
let activeSeat: number | null = null
let publicNoteValues: string[] = ['', '', '']
let privateNoteValues: string[] = ['', '', '']
let privateVisible: boolean[] = [false, false, false]

let ws: WebSocket | null = null

const sendMessage = (type: string, payload?: Record<string, unknown>) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return
  }
  ws.send(JSON.stringify({ type, payload }))
}

const applySnapshot = (snapshot: {
  roomId: string
  phase: Phase
  landlordSeat: number | null
  roles: Role[]
  seats: Array<string | null>
  players: Array<{ userId: string; nickname: string; seatIndex: number | null; online: boolean }>
  generalOffers: General[][]
  playerGenerals: Array<General | null>
  activeSeat: number | null
  publicNotes: string[]
  privateNotes: string[]
  privateVisible: boolean[]
  gameState: GameState
}) => {
  phase = snapshot.phase
  landlordSeat = snapshot.landlordSeat
  roles = snapshot.roles
  roomSeats = snapshot.seats
  roomPlayers = snapshot.players
  generalOffers = snapshot.generalOffers
  playerGenerals = snapshot.playerGenerals
  activeSeat = snapshot.activeSeat
  publicNoteValues = snapshot.publicNotes
  privateNoteValues = snapshot.privateNotes
  privateVisible = snapshot.privateVisible
  gameState = snapshot.gameState

  const seatIndex = snapshot.seats.findIndex((userId) => userId === identity.userId)
  currentSeat = seatIndex >= 0 ? seatIndex : null

  updateSeatPositions()
  updateSeatStatus()
  updateRoles()
  playerGenerals.forEach((general, index) => updateGeneralUI(index, general))
  renderGeneralOffers()
  setPhase(phase)
  updateCallButtons()
  updateUIStage()
  renderAll()
  updateNotesUI()
  applyLocalCardDisplay()
}

const sizeTargets = Array.from(document.querySelectorAll<HTMLElement>('[data-size-target]'))
const screenSize = document.querySelector<HTMLDivElement>('[data-screen-size]')

const ensureSizeLabel = (element: HTMLElement) => {
  let label = element.querySelector<HTMLDivElement>(':scope > .size-label')
  if (!label) {
    label = document.createElement('div')
    label.className = 'size-label'
    element.appendChild(label)
  }
  return label
}

const updateScreenLabel = () => {
  if (!screenSize) return
  screenSize.textContent = `页面 ${Math.round(window.innerWidth)}×${Math.round(window.innerHeight)}`
}

const updateSizeLabel = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect()
  const label = ensureSizeLabel(element)
  label.textContent = `${Math.round(rect.width)}×${Math.round(rect.height)}`
}

const updateAllSizeLabels = () => {
  sizeTargets.forEach((element) => updateSizeLabel(element))
  updateScreenLabel()
}

const sizeObserver = new ResizeObserver((entries) => {
  entries.forEach((entry) => updateSizeLabel(entry.target as HTMLElement))
  updateScreenLabel()
})

sizeTargets.forEach((element) => sizeObserver.observe(element))
window.addEventListener('resize', updateAllSizeLabels)
updateAllSizeLabels()

let currentSeat: number | null = null
const seatPositions: SeatPosition[] = ['bottom', 'left', 'right']

const updateSeatPositions = () => {
  const seats = Array.from(document.querySelectorAll<HTMLDivElement>('.seat'))
  const centerPlayZones = Array.from(document.querySelectorAll<HTMLDivElement>('.center-play'))
  const focusSeat = currentSeat ?? 0
  seats.forEach((seat) => {
    const seatIndex = Number(seat.dataset.seat)
    const relativeIndex = (seatIndex - focusSeat + 3) % 3
    const position = seatPositions[relativeIndex]

    seat.classList.remove('bottom', 'left', 'right', 'active', 'current-seat')
    seat.classList.add(position)
    if (focusSeat === seatIndex) {
      seat.classList.add('current-seat')
    }
    if (currentSeat === seatIndex) {
      seat.classList.add('active')
    }
  })
  centerPlayZones.forEach((zone) => {
    const seatIndex = Number(zone.dataset.playZone)
    const relativeIndex = (seatIndex - focusSeat + 3) % 3
    const position = seatPositions[relativeIndex]
    zone.classList.remove('bottom', 'left', 'right')
    zone.classList.add(position)
  })
}

const getPlayerUserId = (userId: string | null) => {
  if (!userId) {
    return null
  }
  return roomPlayers.find((player) => player.userId === userId)?.userId ?? userId
}

const updateSeatStatus = () => {
  if (!seatStatus) {
    return
  }
  const seats = Array.from(document.querySelectorAll<HTMLDivElement>('.seat'))
  seats.forEach((seat) => {
    const seatIndex = Number(seat.dataset.seat)
    const seatUserId = roomSeats[seatIndex]
    const displayId = getPlayerUserId(seatUserId)
    const name = seat.querySelector<HTMLDivElement>('.seat-name')
    if (name) {
      name.textContent = seatUserId ? `${displayId ?? '玩家'}（已占用）` : `座位 ${seatIndex + 1}（空闲）`
    }
  })

  seatButtons.forEach((button) => {
    const seatIndex = Number(button.dataset.seat)
    const seatUserId = roomSeats[seatIndex]
    button.style.display = seatUserId ? 'none' : ''
    button.textContent = `座位 ${seatIndex + 1}`
  })

  seatStatus.innerHTML = ''
  roomSeats.forEach((seatUserId, index) => {
    if (!seatUserId) {
      return
    }
    const displayId = getPlayerUserId(seatUserId)
    const line = document.createElement('div')
    line.textContent = `座位 ${index + 1}：${displayId ?? '玩家'}（已占用）`
    seatStatus.appendChild(line)
  })
}

const updateUIStage = () => {
  const root = document.querySelector<HTMLDivElement>('.game-root')
  if (!root) {
    return
  }
  const seatsFilled = roomSeats.every((seat) => seat)
  let stage = 'preconnect'
  if (isConnected) {
    stage = seatsFilled ? 'call' : 'seat'
    if (seatsFilled) {
      if (phase === 'choose_generals') {
        stage = 'choose'
      } else if (phase === 'in_game' || phase === 'init_hands') {
        stage = 'in_game'
      }
    }
  }
  root.dataset.stage = stage
}

const applyDebugSelectedGenerals = () => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('debug') !== 'selected-generals') {
    return
  }
  const selected = mockGenerals.slice(0, 3)
  playerGenerals = [selected[0] ?? null, selected[1] ?? null, selected[2] ?? null]
  generalOffers = [[], [], []]
  roles = ['landlord', 'farmer', 'farmer']
  roomSeats = ['debug-1', 'debug-2', 'debug-3']
  roomPlayers = [
    { userId: 'debug-1', nickname: 'debug-1', seatIndex: 0, online: true },
    { userId: 'debug-2', nickname: 'debug-2', seatIndex: 1, online: true },
    { userId: 'debug-3', nickname: 'debug-3', seatIndex: 2, online: true },
  ]
  for (const index of [1, 2]) {
    drawFromDeck(gameState, index, 4)
    const hand = gameState.hands[index] ?? []
    debugCardsBySeat[index] = hand.slice(-4)
  }
  isConnected = true
  currentSeat = 0
  updateSeatPositions()
  updateSeatStatus()
  playerGenerals.forEach((general, index) => updateGeneralUI(index, general))
  renderGeneralOffers()
  setPhase('in_game')
  renderAll()
  updateNotesUI()
  applyLocalCardDisplay()
}

const cardDisplay = document.querySelector<HTMLDivElement>('#card-display')
const deckCount = document.querySelector<HTMLDivElement>('#deck-count')
const discardCount = document.querySelector<HTMLDivElement>('#discard-count')
const resetDeckButton = document.querySelector<HTMLButtonElement>('#reset-deck-btn')
const shuffleDeckButton = document.querySelector<HTMLButtonElement>('#shuffle-deck-btn')
const drawButton = document.querySelector<HTMLButtonElement>('#draw-btn')
const newGameButton = document.querySelector<HTMLButtonElement>('#new-game-btn')
const debugDealButton = document.querySelector<HTMLButtonElement>('#debug-deal-btn')
const nicknameInput = document.querySelector<HTMLInputElement>('#nickname-input')
const userIdInput = document.querySelector<HTMLInputElement>('#user-id-input')
const roomInput = document.querySelector<HTMLInputElement>('#room-input')
const connectButton = document.querySelector<HTMLButtonElement>('#connect-btn')
const connectionStatus = document.querySelector<HTMLSpanElement>('#connection-status')
const seatStatus = document.querySelector<HTMLDivElement>('#seat-status')
const deckTop = document.querySelector<HTMLDivElement>('#deck-top')
const discardCards = document.querySelector<HTMLOListElement>('#discard-cards')
const discardZone = document.querySelector<HTMLDivElement>('[data-zone="discard"]')
const deckTopSlot = document.querySelector<HTMLDivElement>('[data-zone="deck-top"]')
const deckBottomSlot = document.querySelector<HTMLDivElement>('[data-zone="deck-bottom"]')
const handZones = Array.from(document.querySelectorAll<HTMLDivElement>('.hand-zone'))
const playZones = Array.from(document.querySelectorAll<HTMLDivElement>('[data-play-zone]'))
const judgeZones = Array.from(document.querySelectorAll<HTMLDivElement>('[data-judge-zone]'))
const judgeCards = Array.from(document.querySelectorAll<HTMLDivElement>('[data-judge-cards]'))
const playCards = Array.from(document.querySelectorAll<HTMLDivElement>('[data-play-cards]'))
const roleTags = Array.from(document.querySelectorAll<HTMLDivElement>('.role-tag'))
const callButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.call-btn'))
const generalOfferAreas = Array.from(document.querySelectorAll<HTMLDivElement>('.general-offers'))
const generalAreas = Array.from(document.querySelectorAll<HTMLDivElement>('.general'))
const hpButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-hp-action]'))
const hpAreas = Array.from(document.querySelectorAll<HTMLSpanElement>('[data-hp]'))
const hpControls = Array.from(document.querySelectorAll<HTMLDivElement>('[data-hp-controls]'))
const debugCardAreas = Array.from(document.querySelectorAll<HTMLDivElement>('[data-debug-area]'))
const publicNotes = Array.from(document.querySelectorAll<HTMLTextAreaElement>('[data-note-public]'))
const privateNotes = Array.from(document.querySelectorAll<HTMLTextAreaElement>('[data-note-private]'))
const noteToggles = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-note-toggle]'))

const debugCardsBySeat: CardInstance[][] = [[], [], []]
const debugCardSeeds: CardInstance[] = INITIAL_DECK.slice(0, 20).map((card, index) => ({
  id: `debug-seed-${index + 1}`,
  card,
  faceUp: true,
  visible: true,
}))

const createDebugCardElement = (card: CardInstance, index: number) => {
  const element = document.createElement('div')
  element.className = `debug-card ${card.card.suit}`
  const rankText = rankLabel(card.card.rank)
    .split('')
    .join('\n')
  element.innerHTML = `
    <div class="debug-card-name">${card.card.name}</div>
    <div class="debug-card-suit">${suitSymbol(card.card.suit)}\n${rankText}</div>
  `
  element.style.setProperty('--stack-index', `${index}`)
  element.addEventListener('click', () => {
    element.classList.toggle('selected')
  })
  return element
}

const renderDebugArea = (seatIndex: number) => {
  const area = debugCardAreas.find((item) => Number(item.dataset.debugArea) === seatIndex)
  if (!area) {
    return
  }
  area.innerHTML = ''
  const cards = debugCardsBySeat[seatIndex] ?? []
  const style = window.getComputedStyle(area)
  const cardWidth = Number.parseFloat(style.getPropertyValue('--debug-card-width')) || 70
  const paddingLeft = Number.parseFloat(style.paddingLeft) || 0
  const paddingRight = Number.parseFloat(style.paddingRight) || 0
  const availableWidth = Math.max(0, area.clientWidth - paddingLeft - paddingRight)
  const gap = Number.parseFloat(style.columnGap || style.gap) || 0
  const totalWidth = Math.max(0, cards.length * cardWidth + Math.max(0, cards.length - 1) * gap)
  const stacked = cards.length > 6 || totalWidth > availableWidth
  area.classList.toggle('stacked', stacked)
  if (stacked) {
    const baseGap = cards.length > 0 ? (cardWidth * (cards.length - 1)) / cards.length : 0
    const maxGap = cards.length > 1 ? (availableWidth - cardWidth) / (cards.length - 1) : 0
    const overlapGap = Math.max(0, Math.min(baseGap, maxGap))
    area.style.setProperty('--stack-gap', `${overlapGap}px`)
  } else {
    area.style.removeProperty('--stack-gap')
  }
  cards.forEach((card, index) => {
    const element = createDebugCardElement(card, index)
    area.appendChild(element)
  })
}

const renderDebugAreas = () => {
  debugCardAreas.forEach((area) => {
    const seatIndex = Number(area.dataset.debugArea)
    renderDebugArea(seatIndex)
  })
}

if (!cardDisplay || !deckCount || !discardCount || !resetDeckButton || !shuffleDeckButton || !drawButton || !newGameButton || !debugDealButton || !nicknameInput || !userIdInput || !roomInput || !connectButton || !connectionStatus || !deckTop || !discardCards || !discardZone || !deckTopSlot || !deckBottomSlot || !seatStatus) {
  throw new Error('UI elements missing')
}

const updateCounts = () => {
  deckCount.textContent = `${gameState.deck.length}`
  discardCount.textContent = `${gameState.discard.length}`
}

const suitSymbol = (suit: CardInstance['card']['suit']) => {
  switch (suit) {
    case 'spade':
      return '♠'
    case 'heart':
      return '♥'
    case 'club':
      return '♣'
    default:
      return '♦'
  }
}

const rankLabel = (rank: number) => {
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  return String(rank)
}

type DragPayload = {
  source: 'deck-top' | 'hand' | 'hand-random' | 'discard' | 'reveal' | 'play-area' | 'equipment' | 'judge'
  owner?: number
  cardId?: string
}

const createCardElement = (options: {
  card: CardInstance | null
  faceUp: boolean
  payload: DragPayload
  label?: string
}): HTMLDivElement => {
  const element = document.createElement('div')
  const suitClass = options.card?.card.suit ? ` ${options.card.card.suit}` : ''
  element.className = `card-tile ${options.faceUp ? 'front' : 'back'}${options.faceUp ? suitClass : ''}`
  element.draggable = true
  if (options.faceUp && options.card) {
    const { card } = options.card
    element.innerHTML = `
      <div class="card-corner">${suitSymbol(card.suit)} ${rankLabel(card.rank)}</div>
      <div class="card-name">${card.name}</div>
    `
  } else {
    element.textContent = options.label ?? '背面'
  }
  element.addEventListener('dragstart', (event) => {
    event.dataTransfer?.setData('application/json', JSON.stringify(options.payload))
  })
  return element
}

const renderHands = () => {
  handZones.forEach((zone) => {
    const index = Number(zone.dataset.handZone)
    zone.innerHTML = ''
    const hand = gameState.hands[index] ?? []
    if (currentSeat !== null && currentSeat === index) {
      hand.forEach((card) => {
        const canSee = card.faceUp || card.visible
        const cardElement = createCardElement({
          card,
          faceUp: canSee,
          payload: { source: 'hand', owner: index, cardId: card.id },
        })
        zone.appendChild(cardElement)
      })
    } else {
      hand.forEach(() => {
        const cardElement = createCardElement({
          card: null,
          faceUp: false,
          payload: { source: 'hand-random', owner: index },
          label: '手牌',
        })
        zone.appendChild(cardElement)
      })
    }
  })

}

const renderPlayAreas = () => {
  playCards.forEach((area) => {
    const index = Number(area.dataset.playCards)
    area.innerHTML = ''
    const cards = gameState.playAreas[index] ?? []
    cards.forEach((card) => {
      const element = createCardElement({
        card,
        faceUp: true,
        payload: { source: 'play-area', owner: index, cardId: card.id },
      })
      area.appendChild(element)
    })
  })
}

const renderJudgeAreas = () => {
  judgeCards.forEach((area) => {
    const index = Number(area.dataset.judgeCards)
    area.innerHTML = ''
    const cards = gameState.judgeAreas[index] ?? []
    cards.forEach((card) => {
      const element = createCardElement({
        card,
        faceUp: true,
        payload: { source: 'judge', owner: index, cardId: card.id },
      })
      area.appendChild(element)
    })
  })
}

const renderDiscard = () => {
  discardCards.innerHTML = ''
  const cards = [...gameState.discard].reverse()
  if (cards.length === 0) {
    const placeholder = document.createElement('li')
    placeholder.className = 'discard-empty'
    placeholder.textContent = '无牌'
    discardCards.appendChild(placeholder)
    return
  }
  cards.forEach((card, index) => {
    const item = document.createElement('li')
    item.textContent = `${index + 1}. ${card.card.name} ${suitSymbol(card.card.suit)} ${rankLabel(card.card.rank)}`
    discardCards.appendChild(item)
  })
}

const renderDeckTop = () => {
  deckTop.classList.toggle('disabled', gameState.deck.length === 0)
  deckTop.textContent = gameState.deck.length === 0 ? '空牌堆' : '牌堆顶'
  deckTop.draggable = gameState.deck.length > 0
}

const renderAll = () => {
  updateCounts()
  renderHands()
  renderPlayAreas()
  renderJudgeAreas()
  renderDiscard()
  renderDeckTop()
  renderDebugAreas()
}

type DropZone = 'hand' | 'discard' | 'reveal' | 'deck-top' | 'deck-bottom' | 'play-area' | 'equipment' | 'judge'

const handleDrop = (payload: DragPayload, zone: DropZone, targetPlayer?: number) => {
  if (!ensureConnected()) {
    return
  }
  sendMessage('action:move', {
    source: payload.source,
    sourceSeat: payload.owner,
    cardId: payload.cardId,
    targetZone: zone,
    targetSeat: targetPlayer,
  })
}

const attachDropZone = (element: HTMLElement, zone: DropZone, playerIndex?: number) => {
  element.addEventListener('dragover', (event) => {
    event.preventDefault()
    element.classList.add('drop-target')
  })
  element.addEventListener('dragleave', () => {
    element.classList.remove('drop-target')
  })
  element.addEventListener('drop', (event) => {
    event.preventDefault()
    element.classList.remove('drop-target')
    const raw = event.dataTransfer?.getData('application/json')
    if (!raw) {
      return
    }
    const payload = JSON.parse(raw) as DragPayload
    handleDrop(payload, zone, playerIndex)
  })
}

const setPhase = (next: Phase) => {
  phase = next
  callButtons.forEach((button) => {
    button.disabled = phase !== 'call_lord'
  })
  updateCallButtons()
  updateUIStage()
}

const connectToRoom = () => {
  const nickname = nicknameInput.value.trim() || identity.nickname
  identity.nickname = nickname
  const userId = userIdInput.value.trim()
  if (!userId) {
    connectionStatus.textContent = '请填写用户 ID'
    return
  }
  identity.userId = userId
  localStorage.setItem('sgs_user', JSON.stringify(identity))
  const roomId = roomInput.value.trim() || 'default'

  if (ws) {
    ws.close()
  }
  const wsUrl =
    import.meta.env.DEV
      ? import.meta.env.VITE_WS_URL ?? 'ws://localhost:5175'
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
  ws = new WebSocket(wsUrl)
  connectionStatus.textContent = '连接中...'

  ws.addEventListener('open', () => {
    isConnected = true
    connectionStatus.textContent = `已连接 ${roomId}`
    sendMessage('connect', { userId: identity.userId, nickname, roomId })
    updateUIStage()
  })

  ws.addEventListener('close', () => {
    isConnected = false
    connectionStatus.textContent = '未连接'
    roomSeats = [null, null, null]
    roomPlayers = []
    updateSeatStatus()
    updateUIStage()
  })

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data) as { type: string; payload?: unknown }
    if (message.type === 'room:snapshot') {
      applySnapshot(message.payload as Parameters<typeof applySnapshot>[0])
    }
  })
}

const updateRoles = () => {
  roleTags.forEach((tag, index) => {
    const role = roles[index]
    tag.textContent = role === 'landlord' ? '地主' : role === 'farmer' ? '农民' : ''
    tag.classList.remove('landlord', 'farmer')
    if (role === 'landlord') {
      tag.classList.add('landlord')
    }
    if (role === 'farmer') {
      tag.classList.add('farmer')
    }
  })
}

const updateCallButtons = () => {
  callButtons.forEach((button) => {
    const seatIndex = Number(button.dataset.call)
    const shouldShow =
      phase === 'call_lord' && landlordSeat === null && currentSeat === seatIndex && roomSeats.every((seat) => seat)
    button.style.display = shouldShow ? '' : 'none'
  })
}

const updateGeneralUI = (seatIndex: number, general: General | null) => {
  const area = generalAreas[seatIndex]
  if (!area) {
    return
  }
  const revealAll = playerGenerals.every((item) => item)
  const isSelf = currentSeat !== null && seatIndex === currentSeat
  const shouldHide = general && !revealAll && !isSelf
  const portrait = area.querySelector<HTMLDivElement>('.general-portrait')
  if (portrait) {
    if (shouldHide) {
      portrait.style.backgroundImage = ''
      portrait.textContent = '已选将'
      portrait.classList.add('empty')
    } else if (general?.portrait) {
      portrait.style.backgroundImage = `url(${general.portrait})`
      portrait.textContent = ''
      portrait.classList.remove('empty')
    } else {
      portrait.style.backgroundImage = ''
      portrait.textContent = '未选择'
      portrait.classList.add('empty')
    }
  }
  const name = area.querySelector<HTMLDivElement>('.general-name')
  if (name) {
    if (shouldHide) {
      name.textContent = '已选将'
    } else {
      name.textContent = general ? general.name : '未选将'
    }
  }
  const hp = hpAreas.find((item) => Number(item.dataset.hp) === seatIndex)
  if (hp) {
    const max = general ? general.hpMax : 0
    const current = general ? general.hp : 0
    hp.textContent = `${current}\n/\n${max}`
  }
  const controls = hpControls.find((item) => Number(item.dataset.hpControls) === seatIndex)
  if (controls) {
    controls.querySelectorAll<HTMLButtonElement>('.hp-btn').forEach((btn) => {
      btn.disabled = !general
    })
  }
}

const adjustHp = (general: General, delta: number) => {
  general.hp = Math.max(0, Math.min(general.hpMax, general.hp + delta))
}

const adjustHpMax = (general: General, delta: number) => {
  general.hpMax = Math.max(0, general.hpMax + delta)
  if (general.hp > general.hpMax) {
    general.hp = general.hpMax
  }
}

const renderGeneralOffers = () => {
  generalOfferAreas.forEach((area, index) => {
    area.innerHTML = ''
    if (phase !== 'choose_generals' && phase !== 'call_lord') {
      return
    }
    if (currentSeat === null || index !== currentSeat) {
      return
    }
    generalOffers[index].forEach((general) => {
      const btn = document.createElement('button')
      btn.className = 'offer-btn offer-card'
      btn.innerHTML = `
        <div class="offer-portrait" style="background-image: url('${general.portrait || ''}')"></div>
        <div class="offer-name">${general.name}</div>
      `
      btn.addEventListener('click', () => {
        if (phase !== 'choose_generals') {
          return
        }
        if (playerGenerals[index]) {
          return
        }
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          cardDisplay.textContent = '请先连接房间'
          return
        }
        sendMessage('general:choose', { generalId: general.id })
      })
      area.appendChild(btn)
    })
  })
}

const ensureConnected = () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    cardDisplay.textContent = '请先连接房间'
    return false
  }
  return true
}

const applyLocalCardDisplay = () => {
  if (phase === 'in_game' && activeSeat !== null) {
    cardDisplay.textContent = `轮到座位 ${activeSeat + 1}`
  }
}

const updateNotesUI = () => {
  publicNotes.forEach((note, index) => {
    note.value = publicNoteValues[index] ?? ''
    note.readOnly = currentSeat === null || currentSeat !== index
  })
  privateNotes.forEach((note, index) => {
    const isOwner = currentSeat !== null && currentSeat === index
    const isVisible = privateVisible[index]
    note.readOnly = !isOwner
    if (isOwner || isVisible) {
      note.value = privateNoteValues[index] ?? ''
    } else {
      note.value = ''
      note.placeholder = '私密内容（未公开）'
    }
  })
  noteToggles.forEach((button, index) => {
    const isOwner = currentSeat !== null && currentSeat === index
    button.disabled = !isOwner
    button.textContent = privateVisible[index] ? 'hide' : 'show'
  })
}

const seatButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.seat-picker button'))
seatButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const seatIndex = Number(button.dataset.seat)
    if (!ensureConnected()) {
      return
    }
    sendMessage('seat:take', { seatIndex })
  })
})

drawButton.addEventListener('click', () => {
  if (!ensureConnected()) {
    return
  }
  if (currentSeat === null) {
    cardDisplay.textContent = '请先选择座位'
    return
  }
  sendMessage('action:move', { source: 'deck-top', targetZone: 'hand', targetSeat: currentSeat })
})

publicNotes.forEach((note) => {
  note.addEventListener('input', () => {
    if (!ensureConnected()) {
      return
    }
    const seatIndex = Number(note.dataset.notePublic)
    if (currentSeat === null || currentSeat !== seatIndex) {
      return
    }
    sendMessage('notes:update', { scope: 'public', value: note.value })
  })
})

privateNotes.forEach((note) => {
  note.addEventListener('input', () => {
    if (!ensureConnected()) {
      return
    }
    const seatIndex = Number(note.dataset.notePrivate)
    if (currentSeat === null || currentSeat !== seatIndex) {
      return
    }
    sendMessage('notes:update', { scope: 'private', value: note.value })
  })
})

noteToggles.forEach((button) => {
  button.addEventListener('click', () => {
    if (!ensureConnected()) {
      return
    }
    const seatIndex = Number(button.dataset.noteToggle)
    if (currentSeat === null || currentSeat !== seatIndex) {
      return
    }
    sendMessage('notes:toggle')
  })
})

hpButtons.forEach((button) => {
  const action = button.dataset.hpAction
  const seatIndex = Number(button.dataset.seat)
  button.addEventListener('click', () => {
    const general = playerGenerals[seatIndex]
    if (!general) {
      return
    }
    if (action === 'hp-inc') {
      adjustHp(general, 1)
    }
    if (action === 'hp-dec') {
      adjustHp(general, -1)
    }
    if (action === 'max-inc') {
      adjustHpMax(general, 1)
    }
    if (action === 'max-dec') {
      adjustHpMax(general, -1)
    }
    updateGeneralUI(seatIndex, general)
  })
})

deckTop.addEventListener('dragstart', (event) => {
  event.dataTransfer?.setData('application/json', JSON.stringify({ source: 'deck-top' } satisfies DragPayload))
})

handZones.forEach((zone) => {
  const playerIndex = Number(zone.dataset.handZone)
  attachDropZone(zone, 'hand', playerIndex)
})
playZones.forEach((zone) => {
  const playerIndex = Number(zone.dataset.playZone)
  attachDropZone(zone, 'play-area', playerIndex)
})
judgeZones.forEach((zone) => {
  const playerIndex = Number(zone.dataset.judgeZone)
  attachDropZone(zone, 'judge', playerIndex)
})
attachDropZone(discardZone, 'discard')
attachDropZone(deckTopSlot, 'deck-top')
attachDropZone(deckBottomSlot, 'deck-bottom')

updateSeatPositions()
updateSeatStatus()
renderAll()
setPhase('lobby')
updateUIStage()
applyDebugSelectedGenerals()

callButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (phase !== 'call_lord') {
      return
    }
    if (!ensureConnected()) {
      return
    }
    sendMessage('role:callLord')
  })
})

resetDeckButton.addEventListener('click', () => {
  if (!ensureConnected()) {
    return
  }
  sendMessage('deck:reset')
})

shuffleDeckButton.addEventListener('click', () => {
  if (!ensureConnected()) {
    return
  }
  sendMessage('deck:shuffle')
})

newGameButton.addEventListener('click', () => {
  if (!ensureConnected()) {
    return
  }
  sendMessage('room:reset')
})

debugDealButton.addEventListener('click', () => {
  const seatIndex = currentSeat ?? 0
  const target = debugCardsBySeat[seatIndex]
  const seed = debugCardSeeds[target.length % debugCardSeeds.length]
  target.push({
    ...seed,
    id: `${seed.id}-debug-${Date.now()}-${Math.random()}`,
  })
  renderDebugArea(seatIndex)
})

connectButton.addEventListener('click', connectToRoom)
