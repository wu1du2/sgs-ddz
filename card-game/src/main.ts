import './style.css'
import { INITIAL_DECK } from './initial-deck'
import type { General } from './general-types.ts'
import {
  createGameState,
  shuffleDeck,
  type CardInstance,
  type GameState,
} from './game-logic'

type SeatPosition = 'bottom' | 'left' | 'right'
type Role = 'landlord' | 'farmer' | null
type Phase = 'call_lord' | 'choose_generals' | 'init_hands' | 'in_game'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('App root not found')
}

const loadIdentity = () => {
  const raw = localStorage.getItem('sgs_user')
  if (raw) {
    return JSON.parse(raw) as { userId: string; nickname: string }
  }
  const userId = crypto.randomUUID()
  const nickname = `玩家${userId.slice(0, 4)}`
  const identity = { userId, nickname }
  localStorage.setItem('sgs_user', JSON.stringify(identity))
  return identity
}

const identity = loadIdentity()

app.innerHTML = `
  <div class="game-root">
    <header class="toolbar">
      <div class="connection">
        <label>
          昵称
          <input id="nickname-input" value="${identity.nickname}" />
        </label>
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
        <button data-seat="1">座位 2</button>
        <button data-seat="2">座位 3</button>
      </div>
    </header>

    <main class="table">
      <div class="seat" data-seat="0">
        <div class="seat-header">
          <div class="seat-name">座位 1</div>
          <div class="role-tag" data-role="0"></div>
        </div>
        <div class="seat-body">
          <div class="general" data-general="0">
            <div class="general-portrait" data-portrait="0">未选择</div>
            <div class="general-name">未选将</div>
            <div class="general-meta">
              <span class="hp" data-hp="0">HP 0/0</span>
              <div class="hp-controls" data-hp-controls="0">
                <button class="hp-btn" data-hp-action="hp-inc" data-seat="0">+血</button>
                <button class="hp-btn" data-hp-action="hp-dec" data-seat="0">-血</button>
                <button class="hp-btn" data-hp-action="max-inc" data-seat="0">+上限</button>
                <button class="hp-btn" data-hp-action="max-dec" data-seat="0">-上限</button>
              </div>
            </div>
          </div>
          <div class="equipment-zone" data-equipment-zone="0">
            <div class="equipment-slot card-slot" data-equipment-slot="0" data-seat="0" data-slot-label="武器">武器</div>
            <div class="equipment-slot card-slot" data-equipment-slot="1" data-seat="0" data-slot-label="防具">防具</div>
            <div class="equipment-slot card-slot" data-equipment-slot="2" data-seat="0" data-slot-label="+马">+马</div>
            <div class="equipment-slot card-slot" data-equipment-slot="3" data-seat="0" data-slot-label="-马">-马</div>
          </div>
          <div class="skill-status-zone">
            <details class="accordion" open>
              <summary class="accordion-title">技能</summary>
              <div class="skills" data-skills="0"></div>
            </details>
            <div class="statuses" data-statuses="0"></div>
          </div>
          <div class="hand-area">
            <div class="hand-summary" data-hand-summary="0"></div>
            <details class="accordion" open>
              <summary class="accordion-title">手牌：<span class="hand-count" data-hand="0">0</span></summary>
              <div class="hand-zone" data-hand-zone="0"></div>
            </details>
          </div>
          <div class="judge-zone" data-judge-zone="0">
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
      <div class="seat" data-seat="1">
        <div class="seat-header">
          <div class="seat-name">座位 2</div>
          <div class="role-tag" data-role="1"></div>
        </div>
        <div class="seat-body">
          <div class="general" data-general="1">
            <div class="general-portrait" data-portrait="1">未选择</div>
            <div class="general-name">未选将</div>
            <div class="general-meta">
              <span class="hp" data-hp="1">HP 0/0</span>
              <div class="hp-controls" data-hp-controls="1">
                <button class="hp-btn" data-hp-action="hp-inc" data-seat="1">+血</button>
                <button class="hp-btn" data-hp-action="hp-dec" data-seat="1">-血</button>
                <button class="hp-btn" data-hp-action="max-inc" data-seat="1">+上限</button>
                <button class="hp-btn" data-hp-action="max-dec" data-seat="1">-上限</button>
              </div>
            </div>
          </div>
          <div class="equipment-zone" data-equipment-zone="1">
            <div class="equipment-slot card-slot" data-equipment-slot="0" data-seat="1" data-slot-label="武器">武器</div>
            <div class="equipment-slot card-slot" data-equipment-slot="1" data-seat="1" data-slot-label="防具">防具</div>
            <div class="equipment-slot card-slot" data-equipment-slot="2" data-seat="1" data-slot-label="+马">+马</div>
            <div class="equipment-slot card-slot" data-equipment-slot="3" data-seat="1" data-slot-label="-马">-马</div>
          </div>
          <div class="skill-status-zone">
            <details class="accordion" open>
              <summary class="accordion-title">技能</summary>
              <div class="skills" data-skills="1"></div>
            </details>
            <div class="statuses" data-statuses="1"></div>
          </div>
          <div class="hand-area">
            <div class="hand-summary" data-hand-summary="1"></div>
            <details class="accordion" open>
              <summary class="accordion-title">手牌：<span class="hand-count" data-hand="1">0</span></summary>
              <div class="hand-zone" data-hand-zone="1"></div>
            </details>
          </div>
          <div class="judge-zone" data-judge-zone="1">
            <div class="judge-title">判定</div>
            <div class="zone-cards judge-cards" data-judge-cards="1"></div>
          </div>
        </div>
        <div class="notes" data-notes="1">
          <div class="note-block">
            <textarea class="note public" data-note-public="1" placeholder="公开备注"></textarea>
          </div>
          <div class="note-block note-private">
            <textarea class="note private" data-note-private="1" placeholder="私密备注"></textarea>
            <button class="note-toggle" data-note-toggle="1">show</button>
          </div>
        </div>
        <div class="actions">
          <button class="call-btn" data-call="1">叫地主</button>
          <div class="general-offers" data-offers="1"></div>
        </div>
      </div>
      <div class="seat" data-seat="2">
        <div class="seat-header">
          <div class="seat-name">座位 3</div>
          <div class="role-tag" data-role="2"></div>
        </div>
        <div class="seat-body">
          <div class="general" data-general="2">
            <div class="general-portrait" data-portrait="2">未选择</div>
            <div class="general-name">未选将</div>
            <div class="general-meta">
              <span class="hp" data-hp="2">HP 0/0</span>
              <div class="hp-controls" data-hp-controls="2">
                <button class="hp-btn" data-hp-action="hp-inc" data-seat="2">+血</button>
                <button class="hp-btn" data-hp-action="hp-dec" data-seat="2">-血</button>
                <button class="hp-btn" data-hp-action="max-inc" data-seat="2">+上限</button>
                <button class="hp-btn" data-hp-action="max-dec" data-seat="2">-上限</button>
              </div>
            </div>
          </div>
          <div class="equipment-zone" data-equipment-zone="2">
            <div class="equipment-slot card-slot" data-equipment-slot="0" data-seat="2" data-slot-label="武器">武器</div>
            <div class="equipment-slot card-slot" data-equipment-slot="1" data-seat="2" data-slot-label="防具">防具</div>
            <div class="equipment-slot card-slot" data-equipment-slot="2" data-seat="2" data-slot-label="+马">+马</div>
            <div class="equipment-slot card-slot" data-equipment-slot="3" data-seat="2" data-slot-label="-马">-马</div>
          </div>
          <div class="skill-status-zone">
            <details class="accordion" open>
              <summary class="accordion-title">技能</summary>
              <div class="skills" data-skills="2"></div>
            </details>
            <div class="statuses" data-statuses="2"></div>
          </div>
          <div class="hand-area">
            <div class="hand-summary" data-hand-summary="2"></div>
            <details class="accordion" open>
              <summary class="accordion-title">手牌：<span class="hand-count" data-hand="2">0</span></summary>
              <div class="hand-zone" data-hand-zone="2"></div>
            </details>
          </div>
          <div class="judge-zone" data-judge-zone="2">
            <div class="judge-title">判定</div>
            <div class="zone-cards judge-cards" data-judge-cards="2"></div>
          </div>
        </div>
        <div class="notes" data-notes="2">
          <div class="note-block">
            <textarea class="note public" data-note-public="2" placeholder="公开备注"></textarea>
          </div>
          <div class="note-block note-private">
            <textarea class="note private" data-note-private="2" placeholder="私密备注"></textarea>
            <button class="note-toggle" data-note-toggle="2">show</button>
          </div>
        </div>
        <div class="actions">
          <button class="call-btn" data-call="2">叫地主</button>
          <div class="general-offers" data-offers="2"></div>
        </div>
      </div>

      <div class="center-area">
        <div class="center-board">
          <div class="center-core">
            <div class="zone-title">公共区域</div>
            <div class="deck-row">
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
          <div class="play-zone center-play" data-play-zone="0">
            <div class="play-zone-title">
              <span>出牌区</span>
              <button class="play-clear" data-play-clear="0">垃圾桶</button>
            </div>
            <div class="zone-cards play-cards" data-play-cards="0"></div>
          </div>
          <div class="play-zone center-play" data-play-zone="1">
            <div class="play-zone-title">
              <span>出牌区</span>
              <button class="play-clear" data-play-clear="1">垃圾桶</button>
            </div>
            <div class="zone-cards play-cards" data-play-cards="1"></div>
          </div>
          <div class="play-zone center-play" data-play-zone="2">
            <div class="play-zone-title">
              <span>出牌区</span>
              <button class="play-clear" data-play-clear="2">垃圾桶</button>
            </div>
            <div class="zone-cards play-cards" data-play-cards="2"></div>
          </div>
        </div>
        <div class="center-controls">
          <div id="card-display" class="card-display">等待操作</div>
        </div>
      </div>
    </main>
  </div>
`

let gameState: GameState = createGameState(INITIAL_DECK)
shuffleDeck(gameState)

let phase: Phase = 'call_lord'
let landlordSeat: number | null = null
let roles: Role[] = [null, null, null]

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
  updateRoles()
  playerGenerals.forEach((general, index) => updateGeneralUI(index, general))
  renderGeneralOffers()
  setPhase(phase)
  updateCallButtons()
  renderAll()
  updateNotesUI()
  applyLocalCardDisplay()
}

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

const cardDisplay = document.querySelector<HTMLDivElement>('#card-display')
const deckCount = document.querySelector<HTMLDivElement>('#deck-count')
const discardCount = document.querySelector<HTMLDivElement>('#discard-count')
const resetDeckButton = document.querySelector<HTMLButtonElement>('#reset-deck-btn')
const shuffleDeckButton = document.querySelector<HTMLButtonElement>('#shuffle-deck-btn')
const drawButton = document.querySelector<HTMLButtonElement>('#draw-btn')
const newGameButton = document.querySelector<HTMLButtonElement>('#new-game-btn')
const nicknameInput = document.querySelector<HTMLInputElement>('#nickname-input')
const roomInput = document.querySelector<HTMLInputElement>('#room-input')
const connectButton = document.querySelector<HTMLButtonElement>('#connect-btn')
const connectionStatus = document.querySelector<HTMLSpanElement>('#connection-status')
const deckTop = document.querySelector<HTMLDivElement>('#deck-top')
const discardCards = document.querySelector<HTMLOListElement>('#discard-cards')
const discardZone = document.querySelector<HTMLDivElement>('[data-zone="discard"]')
const deckTopSlot = document.querySelector<HTMLDivElement>('[data-zone="deck-top"]')
const deckBottomSlot = document.querySelector<HTMLDivElement>('[data-zone="deck-bottom"]')
const handZones = Array.from(document.querySelectorAll<HTMLDivElement>('.hand-zone'))
const handSummaries = Array.from(document.querySelectorAll<HTMLDivElement>('[data-hand-summary]'))
const playZones = Array.from(document.querySelectorAll<HTMLDivElement>('[data-play-zone]'))
const equipmentZones = Array.from(document.querySelectorAll<HTMLDivElement>('[data-equipment-zone]'))
const equipmentSlots = Array.from(document.querySelectorAll<HTMLDivElement>('[data-equipment-slot]'))
const judgeZones = Array.from(document.querySelectorAll<HTMLDivElement>('[data-judge-zone]'))
const judgeCards = Array.from(document.querySelectorAll<HTMLDivElement>('[data-judge-cards]'))
const playCards = Array.from(document.querySelectorAll<HTMLDivElement>('[data-play-cards]'))
const playClearButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-play-clear]'))
const handCounts = Array.from(document.querySelectorAll<HTMLSpanElement>('.hand-count'))
const roleTags = Array.from(document.querySelectorAll<HTMLDivElement>('.role-tag'))
const callButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.call-btn'))
const generalOfferAreas = Array.from(document.querySelectorAll<HTMLDivElement>('.general-offers'))
const generalAreas = Array.from(document.querySelectorAll<HTMLDivElement>('.general'))
const skillAreas = Array.from(document.querySelectorAll<HTMLDivElement>('.skills'))
const statusAreas = Array.from(document.querySelectorAll<HTMLDivElement>('.statuses'))
const hpButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-hp-action]'))
const hpAreas = Array.from(document.querySelectorAll<HTMLSpanElement>('[data-hp]'))
const hpControls = Array.from(document.querySelectorAll<HTMLDivElement>('[data-hp-controls]'))
const publicNotes = Array.from(document.querySelectorAll<HTMLTextAreaElement>('[data-note-public]'))
const privateNotes = Array.from(document.querySelectorAll<HTMLTextAreaElement>('[data-note-private]'))
const noteToggles = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-note-toggle]'))

if (!cardDisplay || !deckCount || !discardCount || !resetDeckButton || !shuffleDeckButton || !drawButton || !newGameButton || !nicknameInput || !roomInput || !connectButton || !connectionStatus || !deckTop || !discardCards || !discardZone || !deckTopSlot || !deckBottomSlot) {
  throw new Error('UI elements missing')
}

const updateCounts = () => {
  deckCount.textContent = `${gameState.deck.length}`
  discardCount.textContent = `${gameState.discard.length}`
  handCounts.forEach((element) => {
    const index = Number(element.dataset.hand)
    element.textContent = `${gameState.hands[index]?.length ?? 0}`
  })
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
      <div class="card-corner">${suitSymbol(card.suit)} ${card.rank}</div>
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
        const cardElement = createCardElement({
          card,
          faceUp: true,
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

  handSummaries.forEach((summary) => {
    const index = Number(summary.dataset.handSummary)
    const handCount = gameState.hands[index]?.length ?? 0
    const playCount = gameState.playAreas[index]?.length ?? 0
    summary.textContent = `手牌 ${handCount} | 出牌 ${playCount}`
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

const renderEquipmentAreas = () => {
  const groupedSlots = new Map<number, HTMLDivElement[]>()
  equipmentSlots.forEach((slot) => {
    const seat = Number(slot.dataset.seat)
    if (!groupedSlots.has(seat)) {
      groupedSlots.set(seat, [])
    }
    groupedSlots.get(seat)?.push(slot)
  })
  groupedSlots.forEach((slots, seatIndex) => {
    slots.forEach((slot) => {
      const label = slot.dataset.slotLabel ?? ''
      slot.innerHTML = label
    })
    const cards = gameState.equipmentAreas[seatIndex] ?? []
    cards.slice(0, slots.length).forEach((card, slotIndex) => {
      const slot = slots[slotIndex]
      slot.innerHTML = ''
      const element = createCardElement({
        card,
        faceUp: true,
        payload: { source: 'equipment', owner: seatIndex, cardId: card.id },
      })
      slot.appendChild(element)
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
    item.textContent = `${index + 1}. ${card.card.name} ${suitSymbol(card.card.suit)} ${card.card.rank}`
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
  renderEquipmentAreas()
  renderJudgeAreas()
  renderDiscard()
  renderDeckTop()
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
}

const connectToRoom = () => {
  const nickname = nicknameInput.value.trim() || identity.nickname
  identity.nickname = nickname
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
    connectionStatus.textContent = `已连接 ${roomId}`
    sendMessage('connect', { userId: identity.userId, nickname, roomId })
  })

  ws.addEventListener('close', () => {
    connectionStatus.textContent = '未连接'
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
    const shouldShow = phase === 'call_lord' && landlordSeat === null && currentSeat === seatIndex
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
    hp.textContent = `HP ${current}/${max}`
  }
  const controls = hpControls.find((item) => Number(item.dataset.hpControls) === seatIndex)
  if (controls) {
    controls.querySelectorAll<HTMLButtonElement>('.hp-btn').forEach((btn) => {
      btn.disabled = !general
    })
  }
  const skills = skillAreas[seatIndex]
  if (skills) {
    skills.innerHTML = ''
    if (general && !shouldHide) {
      const viewBtn = document.createElement('button')
      viewBtn.className = 'skill-btn secondary'
      viewBtn.textContent = '[查看]'
      viewBtn.addEventListener('click', () => {
        const lines = (general.skills_description ?? []).filter(Boolean)
        if (lines.length === 0) {
          cardDisplay.textContent = `${general.name}：暂无技能描述`
          return
        }
        cardDisplay.textContent = lines.join('\n\n')
      })
      skills.appendChild(viewBtn)

      general.skills.forEach((skill: string) => {
        const btn = document.createElement('button')
        btn.className = 'skill-btn'
        btn.textContent = skill
        btn.addEventListener('click', () => {
          cardDisplay.textContent = `${general.name} 发动技能：${skill}`
        })
        skills.appendChild(btn)
      })
    }
  }
  const statuses = statusAreas[seatIndex]
  if (statuses) {
    statuses.innerHTML = ''
    if (general && !shouldHide) {
      const statusList = [
        { key: '翻面', value: general.status.turnedOver },
        { key: '连环', value: general.status.chained },
        { key: '死亡', value: general.status.dead },
      ]
      statusList.forEach((item) => {
        const btn = document.createElement('button')
        btn.className = item.value ? 'status active' : 'status'
        btn.textContent = item.key
        btn.addEventListener('click', () => {
          general.status[item.key === '翻面' ? 'turnedOver' : item.key === '连环' ? 'chained' : 'dead'] =
            !general.status[item.key === '翻面' ? 'turnedOver' : item.key === '连环' ? 'chained' : 'dead']
          updateGeneralUI(seatIndex, general)
        })
        statuses.appendChild(btn)
      })
    }
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

playClearButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (!ensureConnected()) {
      return
    }
    const seatIndex = Number(button.dataset.playClear)
    if (currentSeat === null || currentSeat !== seatIndex) {
      return
    }
    sendMessage('play:clear')
  })
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
equipmentZones.forEach((zone) => {
  const playerIndex = Number(zone.dataset.equipmentZone)
  attachDropZone(zone, 'equipment', playerIndex)
})
equipmentSlots.forEach((slot) => {
  const playerIndex = Number(slot.dataset.seat)
  attachDropZone(slot, 'equipment', playerIndex)
})
judgeZones.forEach((zone) => {
  const playerIndex = Number(zone.dataset.judgeZone)
  attachDropZone(zone, 'judge', playerIndex)
})
attachDropZone(discardZone, 'discard')
attachDropZone(deckTopSlot, 'deck-top')
attachDropZone(deckBottomSlot, 'deck-bottom')

updateSeatPositions()
renderAll()
setPhase('call_lord')

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

connectButton.addEventListener('click', connectToRoom)
