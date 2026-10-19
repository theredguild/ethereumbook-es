export const NODES = Object.freeze(['A', 'B', 'C'])
export const EDGES = Object.freeze(['AB', 'BC', 'AC'])
export const CHANNELS = Object.freeze(['execution', 'consensus'])
export const MAX_ROUNDS = 12
export const INITIAL_BALANCE = 10
export const PRESETS = Object.freeze([
  { id: 'execution-partition', label: 'Ejecución aislada, consenso visible' },
  { id: 'consensus-partition', label: 'Consenso aislado, ejecución visible' },
  { id: 'chain', label: 'Solo cadena A–B–C' },
  { id: 'invalid-payload', label: 'Carga inválida por saldo insuficiente' },
  { id: 'connected', label: 'Todos los canales abiertos' },
].map(Object.freeze))

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

export function createConfig(preset = 'execution-partition') {
  if (!PRESETS.some(({ id }) => id === preset)) throw new Error('Selecciona un escenario disponible.')
  const channels = Object.fromEntries(CHANNELS.map((channel) => [channel,
    Object.fromEntries(EDGES.map((edge) => [edge, true])),
  ]))
  if (preset === 'execution-partition') channels.execution.AB = channels.execution.AC = false
  if (preset === 'consensus-partition') channels.consensus.AB = channels.consensus.AC = false
  if (preset === 'chain') channels.execution.AC = channels.consensus.AC = false
  return freeze({ amount: preset === 'invalid-payload' ? 11 : 4, channels })
}

function copyConfig(config) {
  if (!Number.isSafeInteger(config?.amount) || config.amount < 1 || config.amount > 20) {
    throw new Error('La transferencia debe ser un entero entre 1 y 20 unidades ficticias.')
  }
  const channels = {}
  for (const channel of CHANNELS) {
    channels[channel] = {}
    for (const edge of EDGES) {
      const enabled = config.channels?.[channel]?.[edge]
      if (typeof enabled !== 'boolean') throw new Error(`El canal ${channel} del enlace ${edge} necesita un estado válido.`)
      channels[channel][edge] = enabled
    }
  }
  return { amount: config.amount, channels }
}

export function validatePayload(payload) {
  if (payload?.from !== 'Emisor' || payload?.to !== 'Receptor' || !Number.isSafeInteger(payload?.amount) || payload.amount < 1 || payload.amount > 20) {
    return freeze({ valid: false, reason: 'Transferencia fuera de las reglas del modelo.', balances: { Emisor: 10, Receptor: 0 } })
  }
  if (payload.amount > INITIAL_BALANCE) {
    return freeze({ valid: false, reason: `Saldo insuficiente: ${payload.amount} > ${INITIAL_BALANCE}.`, balances: { Emisor: 10, Receptor: 0 } })
  }
  return freeze({ valid: true, reason: `Transferencia válida: ${payload.amount} ≤ ${INITIAL_BALANCE}.`, balances: { Emisor: INITIAL_BALANCE - payload.amount, Receptor: payload.amount } })
}

function nodeState(payloadKnown, proposalKnown, payload, proposal) {
  const validation = payloadKnown ? validatePayload(payload) : null
  const executionValidated = validation?.valid === true
  return {
    payloadKnown,
    executionValidated,
    proposalKnown,
    prerequisitesAvailable: executionValidated && proposalKnown && proposal.payloadId === payload.id,
    validation,
  }
}

function frame(round, channels, nodes, deliveries) {
  return freeze({ round, channels, nodes, deliveries })
}

export function createNetwork(input = createConfig()) {
  const config = copyConfig(input)
  const payload = { id: `bloque-transferencia-${config.amount}`, from: 'Emisor', to: 'Receptor', amount: config.amount }
  const proposal = { id: 'propuesta-1', payloadId: payload.id }
  const nodes = Object.fromEntries(NODES.map((node) => [node, nodeState(node === 'A', node === 'A', payload, proposal)]))
  return freeze({ round: 0, config, payload, proposal, nodes, history: [frame(0, config.channels, nodes, [])] })
}

/** Each receiver reads only the previous round. Invalid data may still be relayed. */
export function propagate(network) {
  if (network.round >= MAX_ROUNDS) throw new Error(`Se alcanzó el límite de ${MAX_ROUNDS} rondas. Reinicia el recorrido.`)
  const visibility = Object.fromEntries(NODES.map((node) => [node, {
    payloadKnown: network.nodes[node].payloadKnown,
    proposalKnown: network.nodes[node].proposalKnown,
  }]))
  const deliveries = []
  for (const channel of CHANNELS) {
    const field = channel === 'execution' ? 'payloadKnown' : 'proposalKnown'
    for (const edge of EDGES) {
      if (!network.config.channels[channel][edge]) continue
      const [left, right] = edge
      for (const [from, to] of [[left, right], [right, left]]) {
        if (network.nodes[from][field] && !network.nodes[to][field]) {
          visibility[to][field] = true
          deliveries.push({ channel, edge, from, to, messageId: channel === 'execution' ? network.payload.id : network.proposal.id })
        }
      }
    }
  }
  const nodes = Object.fromEntries(NODES.map((node) => [node, nodeState(visibility[node].payloadKnown, visibility[node].proposalKnown, network.payload, network.proposal)]))
  const round = network.round + 1
  return freeze({ ...network, round, nodes, history: [...network.history, frame(round, network.config.channels, nodes, deliveries)] })
}

/** Reconnection does not deliver anything until a later explicit propagation round. */
export function restoreChannels(network) {
  const channels = Object.fromEntries(CHANNELS.map((channel) => [channel, Object.fromEntries(EDGES.map((edge) => [edge, true]))]))
  return freeze({ ...network, config: { ...network.config, channels } })
}
