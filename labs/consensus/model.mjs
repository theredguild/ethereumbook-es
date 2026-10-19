export const VALIDATORS = Object.freeze([
  { id: 'V1', weight: 2 }, { id: 'V2', weight: 2 },
  { id: 'V3', weight: 1 }, { id: 'V4', weight: 1 },
].map(Object.freeze))
export const OBSERVERS = Object.freeze(['O1', 'O2'])
export const BLOCKS = Object.freeze({
  G: Object.freeze({ parent: null, epoch: 0 }),
  A1: Object.freeze({ parent: 'G', epoch: 1 }),
  A2: Object.freeze({ parent: 'A1', epoch: 2 }),
  B1: Object.freeze({ parent: 'G', epoch: 1 }),
  B2: Object.freeze({ parent: 'B1', epoch: 2 }),
})
export const TOTAL_STAKE = 6
export const QUORUM = 4
export const MAX_EVENTS = 40
export const MAX_SLOT = 99
export const PRESETS = Object.freeze([
  { id: 'partition', label: 'Partición de O2', description: 'O2 comienza desconectado. Los mensajes se entregan a O1; reconectar no entrega la cola.' },
  { id: 'heavy', label: 'Validadores pesados frente a ligeros', description: 'V1 y V2 apoyan A2; V3 y V4 apoyan B2. Mismo número de validadores, distinto stake.' },
  { id: 'offline', label: 'Pérdida de quórum por desconexión', description: 'V1 y V2 están fuera de línea. V3 y V4 solo reúnen 2 de 6 unidades de stake.' },
  { id: 'replay', label: 'Duplicado y mensaje antiguo', description: 'V1 envía A2 en slot 2 dos veces y luego B2 en slot 1. Solo cuenta su mensaje más reciente.' },
  { id: 'convergence', label: 'Mensajes demorados y convergencia', description: 'Ambos observadores están conectados, pero O2 solo recibe primero los votos ligeros. Entrega los pendientes para comparar.' },
].map(Object.freeze))

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

function validator(id) {
  const found = VALIDATORS.find((entry) => entry.id === id)
  if (!found) throw new Error('Selecciona un validador V1, V2, V3 o V4.')
  return found
}

function block(id) {
  if (!Object.hasOwn(BLOCKS, id)) throw new Error('El bloque debe ser G, A1, A2, B1 o B2.')
  return BLOCKS[id]
}

function observerId(id) {
  if (!OBSERVERS.includes(id)) throw new Error('Selecciona el observador O1 u O2.')
  return id
}

export function isDescendant(descendant, ancestor) {
  block(descendant)
  block(ancestor)
  let current = descendant
  while (current !== null) {
    if (current === ancestor) return true
    current = BLOCKS[current].parent
  }
  return false
}

export function createConfig(preset = 'partition') {
  if (!PRESETS.some(({ id }) => id === preset)) throw new Error('Selecciona un escenario disponible.')
  return freeze({
    preset,
    connected: { O1: true, O2: preset !== 'partition' },
    online: Object.fromEntries(VALIDATORS.map(({ id }) => [id, preset !== 'offline' || id === 'V3' || id === 'V4'])),
  })
}

export function createConsensus(config = createConfig(), runId = 'recorrido-1') {
  if (typeof runId !== 'string' || !runId.length || runId.length > 80) throw new Error('Identidad de recorrido inválida.')
  if (!PRESETS.some(({ id }) => id === config?.preset)) throw new Error('Selecciona un escenario disponible.')
  const connected = {}
  const online = {}
  for (const id of OBSERVERS) {
    if (typeof config.connected?.[id] !== 'boolean') throw new Error(`Falta la conectividad de ${id}.`)
    connected[id] = config.connected[id]
  }
  for (const { id } of VALIDATORS) {
    if (typeof config.online?.[id] !== 'boolean') throw new Error(`Falta la disponibilidad de ${id}.`)
    online[id] = config.online[id]
  }
  return freeze({
    runId, preset: config.preset, event: 0, connected, online,
    observers: Object.fromEntries(OBSERVERS.map((id) => [id, {
      latest: {}, checkpointVotes: {}, justified: ['G'], finalized: 'G',
    }])),
    messages: [], history: [],
  })
}

/** Only latest locally visible head votes count. Offline status never changes weights. */
export function view(state, id) {
  observerId(id)
  const local = state.observers[id]
  const anchor = [...local.justified].reverse().find((entry) => isDescendant(entry, local.finalized)) || local.finalized
  const weights = Object.fromEntries(Object.keys(BLOCKS).map((candidate) => [candidate,
    VALIDATORS.reduce((sum, entry) => {
      const vote = local.latest[entry.id]
      return sum + (vote && isDescendant(vote.block, candidate) ? entry.weight : 0)
    }, 0),
  ]))
  const path = [anchor]
  let head = anchor
  while (true) {
    const children = Object.keys(BLOCKS).filter((candidate) => BLOCKS[candidate].parent === head)
    if (!children.length) break
    // Educational tie policy: ascending block identifier, including a 0–0 tie.
    children.sort((left, right) => weights[right] - weights[left] || (left < right ? -1 : left > right ? 1 : 0))
    head = children[0]
    path.push(head)
  }
  const links = {}
  for (const vote of Object.values(local.checkpointVotes)) {
    const key = `${vote.source}->${vote.target}`
    if (!links[key]) links[key] = { source: vote.source, target: vote.target, weight: 0, validators: [] }
    links[key].weight += validator(vote.validator).weight
    links[key].validators.push(vote.validator)
  }
  return freeze({ head, anchor, finalized: local.finalized, justified: [...local.justified], weights, path, links: Object.values(links), totalStake: TOTAL_STAKE, quorum: QUORUM })
}

function enqueue(state, action) {
  validator(action.validator)
  if (!state.online[action.validator]) throw new Error(`${action.validator} está fuera de línea. Reconecta el validador antes de crear un mensaje; sus mensajes conocidos no se borran.`)
  let message
  if (action.type === 'sendHead') {
    block(action.block)
    if (!Number.isSafeInteger(action.slot) || action.slot < 0 || action.slot > MAX_SLOT) throw new Error(`El slot educativo debe ser un entero entre 0 y ${MAX_SLOT}.`)
    const conflict = state.messages.some((entry) => entry.kind === 'head' && entry.validator === action.validator && entry.slot === action.slot && entry.block !== action.block)
    if (conflict) throw new Error('Conflicto de cabeza en el mismo slot: mensaje rechazado, sin cambiar votos ni cola. No se implementa slashing.')
    message = { kind: 'head', validator: action.validator, slot: action.slot, block: action.block }
  } else {
    const source = block(action.source)
    const target = block(action.target)
    if (!isDescendant(action.target, action.source) || source.epoch >= target.epoch) throw new Error('El destino debe ser descendiente estricto del origen.')
    if (target.epoch !== source.epoch + 1) throw new Error('Este modelo solo admite enlaces entre épocas consecutivas: 0→1 o 1→2.')
    const conflict = state.messages.some((entry) => entry.kind === 'checkpoint' && entry.validator === action.validator && entry.targetEpoch === target.epoch && (entry.source !== action.source || entry.target !== action.target))
    if (conflict) throw new Error('Voto conflictivo para la misma época de destino: rechazado sin sumar stake. No se implementa slashing.')
    message = { kind: 'checkpoint', validator: action.validator, source: action.source, target: action.target, targetEpoch: target.epoch }
  }
  message = { ...message, id: `m${state.messages.length + 1}`, delivered: [] }
  return { state: { ...state, messages: [...state.messages, message] }, note: `${message.id} creado y en cola. Todavía no es visible para ningún observador.` }
}

function receiveCheckpoint(local, message) {
  if (!isDescendant(message.target, local.finalized)) throw new Error(`El enlace ${message.source}→${message.target} compite con el punto finalizado ${local.finalized}. No cambia el ancla.`)
  const key = `${message.validator}:${message.targetEpoch}`
  const previous = local.checkpointVotes[key]
  if (previous) {
    if (previous.source !== message.source || previous.target !== message.target) throw new Error('Voto conflictivo para la misma época de destino: entrega rechazada.')
    return { local, note: 'Voto de punto de control duplicado: 0 stake adicional.' }
  }
  if (!local.justified.includes(message.source)) throw new Error(`El origen ${message.source} no está justificado en este observador. Entrega primero el enlace anterior; la cola y el estado aceptado se conservan.`)
  const checkpointVotes = { ...local.checkpointVotes, [key]: message }
  const weight = Object.values(checkpointVotes).reduce((sum, vote) => sum + (vote.source === message.source && vote.target === message.target ? validator(vote.validator).weight : 0), 0)
  let justified = local.justified
  let finalized = local.finalized
  let note = `Enlace ${message.source}→${message.target}: ${weight}/${TOTAL_STAKE}. Falta alcanzar ${QUORUM}/${TOTAL_STAKE}.`
  if (weight >= QUORUM) {
    if (!justified.includes(message.target)) justified = [...justified, message.target]
    if (BLOCKS[message.source].epoch > BLOCKS[finalized].epoch) finalized = message.source
    note = `Enlace ${message.source}→${message.target}: ${weight}/${TOTAL_STAKE}. Destino ${message.target} justificado; origen ${message.source} finalizado. ${message.target} no se finaliza por este enlace.`
  }
  return { local: { ...local, checkpointVotes, justified, finalized }, note }
}

function receive(state, id, messageId) {
  observerId(id)
  if (!state.connected[id]) throw new Error(`${id} está desconectado. Reconecta el observador y luego entrega los mensajes pendientes.`)
  const message = state.messages.find((entry) => entry.id === messageId)
  if (!message) throw new Error('Selecciona un mensaje existente en este recorrido.')
  if (message.delivered.includes(id)) return { state, note: `${message.id} ya fue entregado a ${id}: 0 stake adicional.` }
  let local = state.observers[id]
  let note
  if (message.kind === 'head') {
    const previous = local.latest[message.validator]
    if (previous && previous.slot > message.slot) note = 'Mensaje antiguo ignorado: el slot visible más reciente no cambia.'
    else if (previous && previous.slot === message.slot) {
      if (previous.block !== message.block) throw new Error('Conflicto de cabeza en el mismo slot: entrega rechazada.')
      note = 'Mensaje de cabeza duplicado: 0 stake adicional.'
    } else {
      local = { ...local, latest: { ...local.latest, [message.validator]: message } }
      note = `Última cabeza de ${message.validator}: ${message.block}, slot ${message.slot}.`
    }
  } else {
    const received = receiveCheckpoint(local, message)
    local = received.local
    note = received.note
  }
  return {
    state: {
      ...state,
      observers: { ...state.observers, [id]: local },
      messages: state.messages.map((entry) => entry.id === message.id ? { ...entry, delivered: [...entry.delivered, id] } : entry),
    },
    note: `${id} recibió ${message.id}. ${note}`,
  }
}

/** Failed commands throw before publishing any state. All successful events have frozen snapshots. */
export function transition(state, action) {
  if (!action || action.runId !== state.runId) throw new Error('La acción pertenece a otro recorrido. Usa el estado actual.')
  if (state.event >= MAX_EVENTS) throw new Error(`Límite de ${MAX_EVENTS} eventos alcanzado. Reinicia para continuar.`)
  let next
  let note
  if (action.type === 'sendHead' || action.type === 'sendCheckpoint') {
    const result = enqueue(state, action)
    next = result.state
    note = result.note
  } else if (action.type === 'deliver') {
    const result = receive(state, action.observer, action.messageId)
    next = result.state
    note = result.note
  } else if (action.type === 'deliverAll') {
    observerId(action.observer)
    if (!['head', 'checkpoint', 'all'].includes(action.kind)) throw new Error('Selecciona el tipo de mensajes que se entregará.')
    const pending = state.messages.filter((entry) => !entry.delivered.includes(action.observer) && (action.kind === 'all' || entry.kind === action.kind))
    if (!pending.length) throw new Error('No hay mensajes pendientes de este tipo para el observador.')
    next = state
    const notes = []
    for (const message of pending) {
      const result = receive(next, action.observer, message.id)
      next = result.state
      notes.push(result.note)
    }
    note = notes.join('\n')
  } else if (action.type === 'setObserver' || action.type === 'setValidator') {
    if (typeof action.enabled !== 'boolean') throw new Error('La conectividad debe ser verdadera o falsa.')
    const isObserver = action.type === 'setObserver'
    if (isObserver) observerId(action.id)
    else validator(action.id)
    const field = isObserver ? 'connected' : 'online'
    next = { ...state, [field]: { ...state[field], [action.id]: action.enabled } }
    note = `${action.id} ${action.enabled ? 'conectado' : 'desconectado'}. No se entregan ni se borran mensajes; el denominador sigue siendo ${TOTAL_STAKE}.`
  } else throw new Error('Acción no admitida por este modelo.')
  const event = state.event + 1
  const frame = { runId: state.runId, event, type: action.type, note, observers: next.observers, connected: next.connected, online: next.online }
  return freeze({ ...next, event, history: [...state.history, frame] })
}

/** Presets are command sequences, not stored outcomes. Every message uses transition(). */
export function seedHeads(state) {
  if (state.messages.length) throw new Error('El escenario solo se prepara con la cola vacía. Reinicia para cambiarlo.')
  let commands
  if (state.preset === 'heavy') commands = [['V1', 'A2', 1], ['V2', 'A2', 1], ['V3', 'B2', 1], ['V4', 'B2', 1]]
  else if (state.preset === 'offline') commands = [['V3', 'B2', 1], ['V4', 'B2', 1]]
  else if (state.preset === 'replay') commands = [['V1', 'A2', 2], ['V1', 'A2', 2], ['V1', 'B2', 1]]
  else commands = [['V1', 'B2', 3], ['V2', 'B2', 3], ['V3', 'A2', 2], ['V4', 'A2', 2]]
  let next = state
  for (const [id, head, slot] of commands) next = transition(next, { runId: state.runId, type: 'sendHead', validator: id, block: head, slot })
  next = transition(next, { runId: state.runId, type: 'deliverAll', observer: 'O1', kind: 'head' })
  if (state.preset === 'convergence') {
    for (const message of next.messages.filter((entry) => entry.validator === 'V3' || entry.validator === 'V4')) next = transition(next, { runId: state.runId, type: 'deliver', observer: 'O2', messageId: message.id })
  }
  return next
}

export function enqueueOnlineCheckpoints(state, source, target) {
  let next = state
  const active = VALIDATORS.filter(({ id }) => state.online[id])
  if (!active.length) throw new Error('No hay validadores en línea. Reconecta al menos uno para votar.')
  for (const { id } of active) next = transition(next, { runId: state.runId, type: 'sendCheckpoint', validator: id, source, target })
  return next
}
