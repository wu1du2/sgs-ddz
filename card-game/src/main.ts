import './style.css'
import { INITIAL_DECK } from './initial-deck'
import { GeneralDeck } from './general-deck.ts'
import { mockGenerals } from './generals'
import type { General } from './general-types.ts'
import {
  createGameState,
  shuffleDeck,
  drawFromDeck,
  takeTopFromDeck,
  takeRandomFromHand,
  takeCardFromHand,
  moveToDiscard,
  moveToReveal,
  moveToDeckTop,
  moveToDeckBottom,
  takeTopFromDiscard,
  takeTopFromReveal,
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
      <div class="controls">
        <button id="deal-btn">发牌</button>
        <button id="next-turn-btn">下一回合</button>
      </div>
    </header>

    <main class="table">
      <div class="seat" data-seat="0">
        <div class="seat-header">
          <div class="seat-name">座位 1</div>
          <div class="role-tag" data-role="0"></div>
        </div>
        <details class="accordion" open>
          <summary class="accordion-title">手牌：<span class="hand-count" data-hand="0">0</span></summary>
          <div class="hand-zone" data-hand-zone="0"></div>
        </details>
        <div class="general" data-general="0">
          <div class="general-portrait" data-portrait="0">未选择</div>
          <div class="general-name">未选将</div>
          <div class="general-meta">
            <span class="hp" data-hp="0">HP 0/0</span>
          </div>
          <details class="accordion" open>
            <summary class="accordion-title">技能</summary>
            <div class="skills" data-skills="0"></div>
          </details>
          <div class="statuses" data-statuses="0"></div>
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
        <details class="accordion" open>
          <summary class="accordion-title">手牌：<span class="hand-count" data-hand="1">0</span></summary>
          <div class="hand-zone" data-hand-zone="1"></div>
        </details>
        <div class="general" data-general="1">
          <div class="general-portrait" data-portrait="1">未选择</div>
          <div class="general-name">未选将</div>
          <div class="general-meta">
            <span class="hp" data-hp="1">HP 0/0</span>
          </div>
          <details class="accordion" open>
            <summary class="accordion-title">技能</summary>
            <div class="skills" data-skills="1"></div>
          </details>
          <div class="statuses" data-statuses="1"></div>
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
        <details class="accordion" open>
          <summary class="accordion-title">手牌：<span class="hand-count" data-hand="2">0</span></summary>
          <div class="hand-zone" data-hand-zone="2"></div>
        </details>
        <div class="general" data-general="2">
          <div class="general-portrait" data-portrait="2">未选择</div>
          <div class="general-name">未选将</div>
          <div class="general-meta">
            <span class="hp" data-hp="2">HP 0/0</span>
          </div>
          <details class="accordion" open>
            <summary class="accordion-title">技能</summary>
            <div class="skills" data-skills="2"></div>
          </details>
          <div class="statuses" data-statuses="2"></div>
        </div>
        <div class="actions">
          <button class="call-btn" data-call="2">叫地主</button>
          <div class="general-offers" data-offers="2"></div>
        </div>
      </div>

      <div class="center-area">
        <div class="deck-area">
          <div class="zone-title">摸牌区</div>
          <div id="deck-top" class="card-tile back" draggable="true">牌堆顶</div>
          <div class="count" id="deck-count">0</div>
          <div class="deck-returns">
            <div class="card-slot" data-zone="deck-top">放回顶</div>
            <div class="card-slot" data-zone="deck-bottom">放回底</div>
          </div>
        </div>
        <div class="reveal-zone" data-zone="reveal">
          <div class="zone-title">明牌区</div>
          <div id="reveal-cards" class="zone-cards"></div>
        </div>
        <details class="accordion discard-zone" data-zone="discard" open>
          <summary class="accordion-title">弃牌区（<span id="discard-count">0</span>）</summary>
          <div id="discard-cards" class="zone-cards"></div>
        </details>
        <div class="phase" id="phase-display">阶段：未开始</div>
        <div id="card-display" class="card-display">等待操作</div>
        <button id="init-hands-btn" class="secondary">发 4 张初始手牌</button>
      </div>
    </main>
  </div>
`

let gameState: GameState = createGameState(INITIAL_DECK)
shuffleDeck(gameState)

let phase: Phase = 'call_lord'
let landlordSeat: number | null = null
let roles: Role[] = [null, null, null]

let generalDeck = new GeneralDeck(mockGenerals)
let generalOffers: General[][] = [[], [], []]
let playerGenerals: (General | null)[] = [null, null, null]
let activeSeat: number | null = null

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
  gameState: GameState
}) => {
  phase = snapshot.phase
  landlordSeat = snapshot.landlordSeat
  roles = snapshot.roles
  generalOffers = snapshot.generalOffers
  playerGenerals = snapshot.playerGenerals
  activeSeat = snapshot.activeSeat
  gameState = snapshot.gameState

  const seatIndex = snapshot.seats.findIndex((userId) => userId === identity.userId)
  currentSeat = seatIndex >= 0 ? seatIndex : null

  updateSeatPositions()
  updateRoles()
  playerGenerals.forEach((general, index) => updateGeneralUI(index, general))
  renderGeneralOffers()
  setPhase(phase)
  renderAll()
}

let currentSeat: number | null = null
const seatPositions: SeatPosition[] = ['bottom', 'left', 'right']

const updateSeatPositions = () => {
  const seats = Array.from(document.querySelectorAll<HTMLDivElement>('.seat'))
  seats.forEach((seat) => {
    const seatIndex = Number(seat.dataset.seat)
    const relativeIndex = currentSeat === null ? seatIndex : (seatIndex - currentSeat + 3) % 3
    const position = seatPositions[relativeIndex]

    seat.classList.remove('bottom', 'left', 'right', 'active')
    seat.classList.add(position)
    if (currentSeat === seatIndex) {
      seat.classList.add('active')
    }
  })
}

const cardDisplay = document.querySelector<HTMLDivElement>('#card-display')
const dealButton = document.querySelector<HTMLButtonElement>('#deal-btn')
const deckCount = document.querySelector<HTMLDivElement>('#deck-count')
const discardCount = document.querySelector<HTMLDivElement>('#discard-count')
const phaseDisplay = document.querySelector<HTMLDivElement>('#phase-display')
const initHandsButton = document.querySelector<HTMLButtonElement>('#init-hands-btn')
const nextTurnButton = document.querySelector<HTMLButtonElement>('#next-turn-btn')
const newGameButton = document.querySelector<HTMLButtonElement>('#new-game-btn')
const nicknameInput = document.querySelector<HTMLInputElement>('#nickname-input')
const roomInput = document.querySelector<HTMLInputElement>('#room-input')
const connectButton = document.querySelector<HTMLButtonElement>('#connect-btn')
const connectionStatus = document.querySelector<HTMLSpanElement>('#connection-status')
const deckTop = document.querySelector<HTMLDivElement>('#deck-top')
const revealCards = document.querySelector<HTMLDivElement>('#reveal-cards')
const discardCards = document.querySelector<HTMLDivElement>('#discard-cards')
const revealZone = document.querySelector<HTMLDivElement>('[data-zone="reveal"]')
const discardZone = document.querySelector<HTMLDivElement>('[data-zone="discard"]')
const deckTopSlot = document.querySelector<HTMLDivElement>('[data-zone="deck-top"]')
const deckBottomSlot = document.querySelector<HTMLDivElement>('[data-zone="deck-bottom"]')
const handZones = Array.from(document.querySelectorAll<HTMLDivElement>('.hand-zone'))
const handCounts = Array.from(document.querySelectorAll<HTMLSpanElement>('.hand-count'))
const roleTags = Array.from(document.querySelectorAll<HTMLDivElement>('.role-tag'))
const callButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.call-btn'))
const generalOfferAreas = Array.from(document.querySelectorAll<HTMLDivElement>('.general-offers'))
const generalAreas = Array.from(document.querySelectorAll<HTMLDivElement>('.general'))
const skillAreas = Array.from(document.querySelectorAll<HTMLDivElement>('.skills'))
const statusAreas = Array.from(document.querySelectorAll<HTMLDivElement>('.statuses'))
const hpAreas = Array.from(document.querySelectorAll<HTMLSpanElement>('[data-hp]'))

if (!cardDisplay || !dealButton || !deckCount || !discardCount || !phaseDisplay || !initHandsButton || !nextTurnButton || !newGameButton || !nicknameInput || !roomInput || !connectButton || !connectionStatus || !deckTop || !revealCards || !discardCards || !revealZone || !discardZone || !deckTopSlot || !deckBottomSlot) {
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
  source: 'deck-top' | 'hand' | 'hand-random' | 'discard' | 'reveal'
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
  element.className = `card-tile ${options.faceUp ? 'front' : 'back'}`
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
}

const renderReveal = () => {
  revealCards.innerHTML = ''
  gameState.reveal.forEach((card) => {
    const element = createCardElement({
      card,
      faceUp: true,
      payload: { source: 'reveal', cardId: card.id },
    })
    revealCards.appendChild(element)
  })
}

const renderDiscard = () => {
  discardCards.innerHTML = ''
  const topCard = gameState.discard[0]
  if (topCard) {
    const element = createCardElement({
      card: topCard,
      faceUp: true,
      payload: { source: 'discard', cardId: topCard.id },
    })
    discardCards.appendChild(element)
  } else {
    const placeholder = document.createElement('div')
    placeholder.className = 'card-slot empty'
    placeholder.textContent = '无牌'
    discardCards.appendChild(placeholder)
  }
}

const renderDeckTop = () => {
  deckTop.classList.toggle('disabled', gameState.deck.length === 0)
  deckTop.textContent = gameState.deck.length === 0 ? '空牌堆' : '牌堆顶'
  deckTop.draggable = gameState.deck.length > 0
}

const renderAll = () => {
  updateCounts()
  renderHands()
  renderReveal()
  renderDiscard()
  renderDeckTop()
}

const removeFromReveal = (cardId: string): CardInstance | null => {
  const index = gameState.reveal.findIndex((card) => card.id === cardId)
  if (index === -1) {
    return null
  }
  return gameState.reveal.splice(index, 1)[0]
}

const removeFromDiscardById = (cardId: string): CardInstance | null => {
  const index = gameState.discard.findIndex((card) => card.id === cardId)
  if (index === -1) {
    return null
  }
  return gameState.discard.splice(index, 1)[0]
}

type DropZone = 'hand' | 'discard' | 'reveal' | 'deck-top' | 'deck-bottom'

const placeCardToZone = (card: CardInstance, zone: DropZone, targetPlayer?: number) => {
  if (zone === 'hand' && targetPlayer !== undefined) {
    card.faceUp = targetPlayer === currentSeat
    gameState.hands[targetPlayer].push(card)
    return
  }
  if (zone === 'discard') {
    moveToDiscard(gameState, card)
    return
  }
  if (zone === 'reveal') {
    moveToReveal(gameState, card)
    return
  }
  if (zone === 'deck-top') {
    moveToDeckTop(gameState, card)
    return
  }
  if (zone === 'deck-bottom') {
    moveToDeckBottom(gameState, card)
  }
}

const handleDrop = (payload: DragPayload, zone: DropZone, targetPlayer?: number) => {
  let card: CardInstance | null = null

  if (ws && ws.readyState === WebSocket.OPEN) {
    sendMessage('action:move', {
      source: payload.source,
      sourceSeat: payload.owner,
      cardId: payload.cardId,
      targetZone: zone,
      targetSeat: targetPlayer,
    })
    return
  }

  if (payload.source === 'deck-top') {
    card = takeTopFromDeck(gameState)
    if (!card) {
      cardDisplay.textContent = '牌堆为空'
      return
    }
    placeCardToZone(card, zone, targetPlayer)
    renderAll()
    return
  }

  if (payload.source === 'hand') {
    if (payload.owner === undefined || !payload.cardId) {
      return
    }
    card = takeCardFromHand(gameState, payload.owner, payload.cardId)
  }

  if (payload.source === 'hand-random') {
    if (payload.owner === undefined) {
      return
    }
    card = takeRandomFromHand(gameState, payload.owner)
  }

  if (payload.source === 'discard') {
    if (!payload.cardId) {
      return
    }
    card = removeFromDiscardById(payload.cardId) ?? takeTopFromDiscard(gameState)
  }

  if (payload.source === 'reveal') {
    if (!payload.cardId) {
      return
    }
    card = removeFromReveal(payload.cardId) ?? takeTopFromReveal(gameState)
  }

  if (!card) {
    return
  }

  placeCardToZone(card, zone, targetPlayer)
  renderAll()
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
  const label =
    phase === 'call_lord'
      ? '叫地主'
      : phase === 'choose_generals'
        ? '选将'
        : phase === 'init_hands'
          ? '初始手牌'
          : '游戏中'
  phaseDisplay.textContent = `阶段：${label}`
  initHandsButton.disabled = phase !== 'init_hands'
  dealButton.disabled = phase !== 'in_game'
  nextTurnButton.disabled = phase !== 'in_game'
  callButtons.forEach((button) => {
    button.disabled = phase !== 'call_lord'
  })
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
      ? import.meta.env.VITE_WS_URL ?? 'ws://localhost:5174'
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

const updateGeneralUI = (seatIndex: number, general: General | null) => {
  const area = generalAreas[seatIndex]
  if (!area) {
    return
  }
  const portrait = area.querySelector<HTMLDivElement>('.general-portrait')
  if (portrait) {
    if (general?.portrait) {
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
    name.textContent = general ? general.name : '未选将'
  }
  const hp = hpAreas.find((item) => Number(item.dataset.hp) === seatIndex)
  if (hp) {
    const max = general ? general.hpMax : 0
    const current = general ? general.hp : 0
    hp.textContent = `HP ${current}/${max}`
  }
  const skills = skillAreas[seatIndex]
  if (skills) {
    skills.innerHTML = ''
    if (general) {
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
    if (general) {
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

const renderGeneralOffers = () => {
  generalOfferAreas.forEach((area, index) => {
    area.innerHTML = ''
    if (phase !== 'choose_generals') {
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
        if (playerGenerals[index]) {
          return
        }
        if (ws && ws.readyState === WebSocket.OPEN) {
          sendMessage('general:choose', { generalId: general.id })
          return
        }
        playerGenerals[index] = general
        updateGeneralUI(index, general)
        area.innerHTML = ''
        if (playerGenerals.every((item) => item)) {
          setPhase('init_hands')
        }
      })
      area.appendChild(btn)
    })
  })
}

const startNewGame = () => {
  gameState = createGameState(INITIAL_DECK)
  shuffleDeck(gameState)

  landlordSeat = null
  roles = [null, null, null]
  updateRoles()

  generalDeck = new GeneralDeck(mockGenerals)
  generalDeck.shuffle()
  generalOffers = [generalDeck.deal(3), generalDeck.deal(3), generalDeck.deal(3)]
  playerGenerals = [null, null, null]
  activeSeat = null

  generalAreas.forEach((_, index) => updateGeneralUI(index, null))
  renderGeneralOffers()

  cardDisplay.textContent = '等待操作'
  renderAll()
  setPhase('call_lord')
}

dealButton.addEventListener('click', () => {
  if (phase !== 'in_game') {
    return
  }
  const card = takeTopFromDeck(gameState)
  if (!card) {
    cardDisplay.textContent = '牌堆为空'
    return
  }
  moveToReveal(gameState, card)
  cardDisplay.textContent = `明牌：${card.card.name} ${suitSymbol(card.card.suit)} ${card.card.rank}`
  renderAll()
})

const seatButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.seat-picker button'))
seatButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const seatIndex = Number(button.dataset.seat)
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendMessage('seat:take', { seatIndex })
      return
    }
    currentSeat = seatIndex
    seatButtons.forEach((item) => item.setAttribute('disabled', 'true'))
    button.classList.add('selected')
    updateSeatPositions()
    renderAll()
  })
})

deckTop.addEventListener('dragstart', (event) => {
  event.dataTransfer?.setData('application/json', JSON.stringify({ source: 'deck-top' } satisfies DragPayload))
})

handZones.forEach((zone) => {
  const playerIndex = Number(zone.dataset.handZone)
  attachDropZone(zone, 'hand', playerIndex)
})
attachDropZone(revealZone, 'reveal')
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
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendMessage('role:callLord')
      return
    }
    if (landlordSeat !== null) {
      return
    }
    const seatIndex = Number(button.dataset.call)
    landlordSeat = seatIndex
    roles = [0, 1, 2].map((index) => (index === seatIndex ? 'landlord' : 'farmer'))
    updateRoles()

    if (landlordSeat !== null) {
      const extra = generalDeck.deal(2)
      generalOffers[landlordSeat].push(...extra)
    }
    setPhase('choose_generals')
    renderGeneralOffers()
    cardDisplay.textContent = `座位 ${seatIndex + 1} 成为地主，进入选将阶段`
  })
})

initHandsButton.addEventListener('click', () => {
  if (phase !== 'init_hands') {
    return
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendMessage('cards:initHands')
    return
  }
  for (let index = 0; index < 3; index += 1) {
    drawFromDeck(gameState, index, 4)
  }
  activeSeat = landlordSeat ?? 0
  setPhase('in_game')
  renderAll()
})

nextTurnButton.addEventListener('click', () => {
  if (phase !== 'in_game') {
    return
  }
  if (activeSeat === null) {
    activeSeat = landlordSeat ?? 0
  } else {
    activeSeat = (activeSeat + 1) % 3
  }
  cardDisplay.textContent = `轮到座位 ${activeSeat + 1}`
})

newGameButton.addEventListener('click', () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendMessage('room:reset')
    return
  }
  startNewGame()
})

startNewGame()
connectButton.addEventListener('click', connectToRoom)
