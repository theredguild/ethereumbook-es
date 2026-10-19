import test from 'node:test'
import assert from 'node:assert/strict'
import { CHANNELS, EDGES, MAX_ROUNDS, NODES, createConfig, createNetwork, propagate, restoreChannels, validatePayload } from './model.mjs'

test('execution partition delivers proposals without payloads and keeps all nodes', () => {
  const initial = createNetwork(createConfig('execution-partition'))
  const next = propagate(initial)
  assert.deepEqual(Object.keys(next.nodes), NODES)
  for (const id of ['B', 'C']) {
    assert.equal(next.nodes[id].proposalKnown, true)
    assert.equal(next.nodes[id].payloadKnown, false)
    assert.equal(next.nodes[id].executionValidated, false)
    assert.equal(next.nodes[id].prerequisitesAvailable, false)
    assert.equal(next.nodes[id].validation, null)
  }
  assert.equal(next.history[1].deliveries.length, 2)
  assert.ok(next.history[1].deliveries.every(({ channel }) => channel === 'consensus'))
})

test('consensus partition delivers and validates payloads without proposals', () => {
  const next = propagate(createNetwork(createConfig('consensus-partition')))
  for (const id of ['B', 'C']) {
    assert.equal(next.nodes[id].payloadKnown, true)
    assert.equal(next.nodes[id].executionValidated, true)
    assert.equal(next.nodes[id].proposalKnown, false)
    assert.equal(next.nodes[id].prerequisitesAvailable, false)
    assert.deepEqual(next.nodes[id].validation.balances, { Emisor: 6, Receptor: 4 })
  }
  assert.ok(next.history[1].deliveries.every(({ channel }) => channel === 'execution'))
})

test('chain traverses exactly one hop per round using start-of-round knowledge', () => {
  const initial = createNetwork(createConfig('chain'))
  const first = propagate(initial)
  const second = propagate(first)
  assert.equal(first.nodes.B.prerequisitesAvailable, true)
  assert.equal(first.nodes.C.payloadKnown, false)
  assert.equal(first.nodes.C.proposalKnown, false)
  assert.equal(second.nodes.C.prerequisitesAvailable, true)
  assert.equal(first.history[1].deliveries.length, 2)
  assert.equal(second.history[2].deliveries.length, 2)
  assert.ok(second.history[2].deliveries.every(({ from, to, edge }) => from === 'B' && to === 'C' && edge === 'BC'))
  assert.equal(initial.round, 0)
  assert.equal(first.round, 1)
  assert.equal(second.round, 2)
  assert.equal(propagate(second).history[3].deliveries.length, 0)
})

test('each undirected edge can differ by channel', () => {
  const base = createConfig('connected')
  const config = { ...base, channels: { execution: { AB: true, BC: false, AC: false }, consensus: { AB: false, BC: false, AC: true } } }
  const next = propagate(createNetwork(config))
  assert.equal(next.nodes.B.payloadKnown, true)
  assert.equal(next.nodes.B.proposalKnown, false)
  assert.equal(next.nodes.C.payloadKnown, false)
  assert.equal(next.nodes.C.proposalKnown, true)
  assert.deepEqual(next.history[1].deliveries.map(({ channel, from, to }) => [channel, from, to]), [
    ['execution', 'A', 'B'], ['consensus', 'A', 'C'],
  ])
})

test('invalid transfer propagates as data but execution rejects it without moving balance', () => {
  const initial = createNetwork(createConfig('invalid-payload'))
  const next = propagate(initial)
  for (const id of NODES) {
    assert.equal(next.nodes[id].payloadKnown, true)
    assert.equal(next.nodes[id].proposalKnown, true)
    assert.equal(next.nodes[id].executionValidated, false)
    assert.equal(next.nodes[id].prerequisitesAvailable, false)
    assert.equal(next.nodes[id].validation.reason, 'Saldo insuficiente: 11 > 10.')
    assert.deepEqual(next.nodes[id].validation.balances, { Emisor: 10, Receptor: 0 })
  }
  const chain = createConfig('chain')
  const relayed = propagate(propagate(createNetwork({ ...chain, amount: 11 })))
  assert.equal(relayed.nodes.C.payloadKnown, true)
  assert.equal(relayed.nodes.C.executionValidated, false)
})

test('validation computes transfer from initial balance rather than preset identity', () => {
  for (const amount of [1, 4, 10]) {
    const result = validatePayload({ from: 'Emisor', to: 'Receptor', amount })
    assert.equal(result.valid, true)
    assert.deepEqual(result.balances, { Emisor: 10 - amount, Receptor: amount })
  }
  for (const amount of [0, -1, 1.5, 21, NaN, '4']) {
    assert.equal(validatePayload({ from: 'Emisor', to: 'Receptor', amount }).valid, false)
  }
  assert.equal(validatePayload({ from: 'Otra cuenta', to: 'Receptor', amount: 4 }).valid, false)
  const changed = createNetwork({ ...createConfig('invalid-payload'), amount: 3 })
  assert.equal(changed.nodes.A.executionValidated, true)
  assert.deepEqual(changed.nodes.A.validation.balances, { Emisor: 7, Receptor: 3 })
})

test('snapshots and history are deeply immutable and independent of caller configuration', () => {
  const config = { amount: 4, channels: { execution: { AB: true, BC: true, AC: false }, consensus: { AB: true, BC: true, AC: false } } }
  const initial = createNetwork(config)
  const saved = JSON.stringify(initial)
  config.channels.execution.AB = false
  config.amount = 11
  const first = propagate(initial)
  const restored = restoreChannels(first)
  const second = propagate(restored)
  assert.equal(JSON.stringify(initial), saved)
  assert.equal(initial.config.channels.execution.AB, true)
  assert.equal(initial.payload.amount, 4)
  assert.equal(first.config.channels.execution.AC, false)
  assert.equal(restored.config.channels.execution.AC, true)
  assert.equal(second.history[1].channels.execution.AC, false)
  assert.equal(second.history[2].channels.execution.AC, true)
  assert.throws(() => { first.nodes.B.payloadKnown = false }, TypeError)
  assert.throws(() => { first.nodes.B.validation.balances.Emisor = 99 }, TypeError)
  assert.throws(() => { first.history[1].deliveries[0].to = 'A' }, TypeError)
  assert.throws(() => { first.history.push({}) }, TypeError)
  assert.throws(() => { initial.config.channels.execution.AC = true }, TypeError)
  assert.throws(() => { initial.payload.amount = 20 }, TypeError)
})

test('reconnection preserves knowledge and catches up only after explicit propagation', () => {
  for (const preset of ['execution-partition', 'consensus-partition']) {
    const before = propagate(createNetwork(createConfig(preset)))
    const restored = restoreChannels(before)
    assert.equal(restored.round, before.round)
    assert.deepEqual(restored.nodes, before.nodes)
    assert.deepEqual(restored.history, before.history)
    for (const channel of CHANNELS) for (const edge of EDGES) assert.equal(restored.config.channels[channel][edge], true)
    const recovered = propagate(restored)
    for (const id of NODES) assert.equal(recovered.nodes[id].prerequisitesAvailable, true)
    assert.equal(recovered.history[2].deliveries.length, 2)
    assert.equal(before.nodes.B.prerequisitesAvailable, false)
  }
})

test('isolated nodes stay present; reconnecting cannot repair invalid execution', () => {
  const config = { amount: 11, channels: Object.fromEntries(CHANNELS.map((channel) => [channel, Object.fromEntries(EDGES.map((edge) => [edge, false]))])) }
  const isolated = propagate(createNetwork(config))
  assert.deepEqual(Object.keys(isolated.nodes), NODES)
  assert.equal(isolated.history[1].deliveries.length, 0)
  assert.equal(isolated.nodes.B.proposalKnown, false)
  const caughtUp = propagate(restoreChannels(isolated))
  assert.equal(caughtUp.history[2].deliveries.length, 4)
  assert.equal(caughtUp.nodes.B.payloadKnown, true)
  assert.equal(caughtUp.nodes.B.proposalKnown, true)
  assert.equal(caughtUp.nodes.B.executionValidated, false)
  assert.equal(caughtUp.nodes.B.prerequisitesAvailable, false)
})

test('invalid inputs and round limit throw without changing accepted snapshots', () => {
  const base = createConfig('connected')
  for (const amount of ['', 0, 21, 2.5, Infinity, '4']) assert.throws(() => createNetwork({ ...base, amount }), /entero entre 1 y 20/)
  assert.throws(() => createNetwork({ ...base, channels: { ...base.channels, execution: { ...base.channels.execution, AB: 'sí' } } }), /estado válido/)
  assert.throws(() => createConfig('unknown'), /escenario disponible/)
  let current = createNetwork(base)
  for (let round = 0; round < MAX_ROUNDS; round++) current = propagate(current)
  const saved = JSON.stringify(current)
  assert.throws(() => propagate(current), /límite de 12 rondas/)
  assert.equal(current.round, MAX_ROUNDS)
  assert.equal(current.history.length, MAX_ROUNDS + 1)
  assert.equal(JSON.stringify(current), saved)
  assert.deepEqual(propagate(createNetwork(base)), propagate(createNetwork(base)))
})

test('undirected BC carries messages from C to B on the alternate A–C–B route', () => {
  const base = createConfig('connected')
  const channels = Object.fromEntries(CHANNELS.map((channel) => [channel, { AB: false, BC: true, AC: true }]))
  const first = propagate(createNetwork({ ...base, channels }))
  assert.equal(first.nodes.C.prerequisitesAvailable, true)
  assert.equal(first.nodes.B.payloadKnown, false)
  assert.equal(first.nodes.B.proposalKnown, false)
  const second = propagate(first)
  assert.equal(second.nodes.B.prerequisitesAvailable, true)
  assert.ok(second.history[2].deliveries.every(({ edge, from, to }) => edge === 'BC' && from === 'C' && to === 'B'))
  assert.equal(second.history[2].deliveries.length, 2)
})
