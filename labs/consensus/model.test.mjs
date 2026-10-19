import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_EVENTS, MAX_SLOT, OBSERVERS, QUORUM, TOTAL_STAKE, VALIDATORS,
  createConfig, createConsensus, enqueueOnlineCheckpoints, isDescendant, seedHeads, transition, view,
} from './model.mjs'

const fresh = (preset = 'heavy', runId = 'prueba-1') => createConsensus(createConfig(preset), runId)
const command = (state, type, fields = {}) => transition(state, { type, runId: state.runId, ...fields })
function head(state, validator, block, slot = 1) {
  return command(state, 'sendHead', { validator, block, slot })
}
function checkpoint(state, validator, source, target) {
  return command(state, 'sendCheckpoint', { validator, source, target })
}
function deliverLast(state, observer = 'O1') {
  return command(state, 'deliver', { observer, messageId: state.messages.at(-1).id })
}
function acceptLink(state, source, target, ids = ['V1', 'V2'], observer = 'O1') {
  let next = state
  for (const id of ids) next = deliverLast(checkpoint(next, id, source, target), observer)
  return next
}

// These tests exercise public transitions and computed states, not source text or UI wiring.
test('génesis, árbol fijo, stake 6 y desempate visible sin votos', () => {
  const state = fresh()
  assert.equal(TOTAL_STAKE, 6)
  assert.equal(QUORUM, 4)
  assert.deepEqual(VALIDATORS.map(({ weight }) => weight), [2, 2, 1, 1])
  for (const id of OBSERVERS) {
    const result = view(state, id)
    assert.equal(result.head, 'A2')
    assert.deepEqual(result.path, ['G', 'A1', 'A2'])
    assert.deepEqual(result.justified, ['G'])
    assert.equal(result.finalized, 'G')
    assert.equal(result.anchor, 'G')
    assert.deepEqual(Object.values(result.weights), [0, 0, 0, 0, 0])
  }
  assert.equal(isDescendant('A2', 'G'), true)
  assert.equal(isDescendant('A2', 'A1'), true)
  assert.equal(isDescendant('A1', 'A1'), true)
  assert.equal(isDescendant('B2', 'A1'), false)
})

test('mismo número de validadores, peso 4 frente a 2 decide cabeza', () => {
  const state = seedHeads(fresh('heavy'))
  assert.equal(Object.keys(state.observers.O1.latest).length, 4)
  assert.equal(view(state, 'O1').weights.A1, 4)
  assert.equal(view(state, 'O1').weights.B1, 2)
  assert.equal(view(state, 'O1').head, 'A2')
  assert.equal(Object.keys(state.observers.O2.latest).length, 0)
})

test('un validador pesado empata con dos ligeros; no se cuentan cabezas', () => {
  let state = head(fresh(), 'V1', 'A2')
  state = head(state, 'V3', 'B2')
  state = head(state, 'V4', 'B2')
  state = command(state, 'deliverAll', { observer: 'O1', kind: 'head' })
  const result = view(state, 'O1')
  assert.equal(result.weights.A1, 2)
  assert.equal(result.weights.B1, 2)
  assert.equal(result.head, 'A2')
  assert.deepEqual(result.path, ['G', 'A1', 'A2'])
})

test('peso del subárbol incluye votos por ancestro, sin inventar peso en hijos', () => {
  let state = deliverLast(head(fresh(), 'V1', 'A1'))
  state = deliverLast(head(state, 'V2', 'A2'))
  const result = view(state, 'O1')
  assert.equal(result.weights.G, 4)
  assert.equal(result.weights.A1, 4)
  assert.equal(result.weights.A2, 2)
  assert.equal(result.head, 'A2')
})

test('mayor slot visible gana; antiguo, duplicado y reentrega no agregan peso', () => {
  let state = head(fresh(), 'V1', 'B2', 1)
  const oldId = state.messages.at(-1).id
  state = deliverLast(head(state, 'V1', 'A2', 2))
  state = command(state, 'deliver', { observer: 'O1', messageId: oldId })
  assert.match(state.history.at(-1).note, /antiguo ignorado/)
  state = deliverLast(head(state, 'V1', 'A2', 2))
  assert.match(state.history.at(-1).note, /duplicado/)
  state = deliverLast(state)
  assert.match(state.history.at(-1).note, /ya fue entregado/)
  assert.equal(state.observers.O1.latest.V1.slot, 2)
  assert.equal(state.observers.O1.latest.V1.block, 'A2')
  assert.equal(view(state, 'O1').weights.A1, 2)
  assert.equal(view(state, 'O1').weights.B1, 0)
})

test('mensaje nuevo no entregado no reemplaza último voto local', () => {
  let state = deliverLast(head(fresh(), 'V1', 'A2', 1))
  state = head(state, 'V1', 'B2', 2)
  assert.equal(view(state, 'O1').head, 'A2')
  const secondId = state.messages.at(-1).id
  state = command(state, 'deliver', { observer: 'O2', messageId: secondId })
  assert.equal(view(state, 'O1').head, 'A2')
  assert.equal(view(state, 'O2').head, 'B2')
  state = command(state, 'deliver', { observer: 'O1', messageId: secondId })
  assert.equal(view(state, 'O1').head, 'B2')
})

test('conflicto de igual validador y slot rechaza sin modificar cola o vista', () => {
  const state = deliverLast(head(fresh(), 'V1', 'A2', 3))
  const before = JSON.stringify(state)
  assert.throws(() => head(state, 'V1', 'B2', 3), /Conflicto de cabeza en el mismo slot/)
  assert.equal(JSON.stringify(state), before)
  assert.equal(view(state, 'O1').weights.A1, 2)
})

test('partición conserva mensajes; reconectar no entrega; entrega explícita converge', () => {
  let state = seedHeads(fresh('partition'))
  assert.equal(view(state, 'O1').head, 'B2')
  assert.equal(view(state, 'O2').head, 'A2')
  assert.equal(view(state, 'O2').weights.B1, 0)
  assert.throws(() => command(state, 'deliverAll', { observer: 'O2', kind: 'head' }), /O2 está desconectado/)
  state = command(state, 'setObserver', { id: 'O2', enabled: true })
  assert.equal(view(state, 'O2').weights.B1, 0)
  state = command(state, 'deliverAll', { observer: 'O2', kind: 'head' })
  assert.deepEqual(view(state, 'O1'), view(state, 'O2'))
  assert.equal(view(state, 'O2').weights.B1, 4)
})

test('vistas demoradas conectadas convergen sin propagación automática entre observadores', () => {
  let state = seedHeads(fresh('convergence'))
  assert.equal(state.connected.O1, true)
  assert.equal(state.connected.O2, true)
  assert.equal(view(state, 'O1').head, 'B2')
  assert.equal(view(state, 'O2').head, 'A2')
  assert.equal(view(state, 'O2').weights.A1, 2)
  assert.equal(view(state, 'O2').weights.B1, 0)
  state = command(state, 'deliverAll', { observer: 'O2', kind: 'head' })
  assert.deepEqual(view(state, 'O1'), view(state, 'O2'))
})

test('desconectar no elimina stake ni mensajes conocidos o pendientes', () => {
  let state = deliverLast(head(fresh(), 'V1', 'B2', 1))
  state = command(state, 'setValidator', { id: 'V1', enabled: false })
  assert.equal(view(state, 'O1').weights.B1, 2)
  assert.equal(view(state, 'O1').totalStake, 6)
  assert.throws(() => head(state, 'V1', 'A2', 2), /V1 está fuera de línea/)
  state = command(state, 'deliverAll', { observer: 'O2', kind: 'head' })
  assert.equal(view(state, 'O2').weights.B1, 2)
  state = command(state, 'setObserver', { id: 'O1', enabled: false })
  assert.equal(view(state, 'O1').weights.B1, 2)
})

test('exactamente 4 de 6 justifica destino; 2 y 3 no alcanzan', () => {
  let state = acceptLink(fresh(), 'G', 'A1', ['V1'])
  assert.equal(view(state, 'O1').links[0].weight, 2)
  assert.deepEqual(view(state, 'O1').justified, ['G'])
  state = acceptLink(state, 'G', 'A1', ['V3'])
  assert.equal(view(state, 'O1').links[0].weight, 3)
  assert.deepEqual(view(state, 'O1').justified, ['G'])
  state = acceptLink(state, 'G', 'A1', ['V4'])
  assert.equal(view(state, 'O1').links[0].weight, 4)
  assert.deepEqual(view(state, 'O1').justified, ['G', 'A1'])
  assert.equal(view(state, 'O1').finalized, 'G')
  assert.equal(view(state, 'O1').anchor, 'A1')
  assert.equal(view(state, 'O2').anchor, 'G')
})

test('G→A1 justifica A1, luego A1→A2 justifica A2 y finaliza origen A1', () => {
  let state = acceptLink(fresh(), 'G', 'A1')
  assert.equal(view(state, 'O1').finalized, 'G')
  state = acceptLink(state, 'A1', 'A2')
  const result = view(state, 'O1')
  assert.deepEqual(result.justified, ['G', 'A1', 'A2'])
  assert.equal(result.finalized, 'A1')
  assert.equal(result.anchor, 'A2')
  assert.notEqual(result.finalized, 'A2')
  assert.equal(view(state, 'O2').finalized, 'G')
  state = command(state, 'deliverAll', { observer: 'O2', kind: 'checkpoint' })
  assert.deepEqual(view(state, 'O1'), view(state, 'O2'))
})

test('rama B también soporta enlaces consecutivos con mismas reglas de origen y destino', () => {
  let state = acceptLink(fresh(), 'G', 'B1')
  assert.deepEqual(view(state, 'O1').justified, ['G', 'B1'])
  assert.equal(view(state, 'O1').anchor, 'B1')
  assert.equal(view(state, 'O1').head, 'B2')
  state = acceptLink(state, 'B1', 'B2')
  assert.equal(view(state, 'O1').finalized, 'B1')
  assert.equal(view(state, 'O1').anchor, 'B2')
})

test('fuera de línea mantiene denominador: 2/6 no justifica, reconectar pesado recupera 4/6', () => {
  let state = enqueueOnlineCheckpoints(fresh('offline'), 'G', 'A1')
  state = command(state, 'deliverAll', { observer: 'O1', kind: 'checkpoint' })
  assert.equal(view(state, 'O1').links[0].weight, 2)
  assert.equal(view(state, 'O1').totalStake, 6)
  assert.equal(view(state, 'O1').quorum, 4)
  assert.deepEqual(view(state, 'O1').justified, ['G'])
  state = command(state, 'setValidator', { id: 'V1', enabled: true })
  state = acceptLink(state, 'G', 'A1', ['V1'])
  assert.equal(view(state, 'O1').links[0].weight, 4)
  assert.deepEqual(view(state, 'O1').justified, ['G', 'A1'])
})

test('votos de checkpoint duplicados no aumentan stake; equivocación de época se rechaza', () => {
  let state = acceptLink(fresh(), 'G', 'A1', ['V1'])
  state = acceptLink(state, 'G', 'A1', ['V1'])
  assert.equal(view(state, 'O1').links[0].weight, 2)
  assert.equal(Object.keys(state.observers.O1.checkpointVotes).length, 1)
  assert.deepEqual(view(state, 'O1').justified, ['G'])
  const before = JSON.stringify(state)
  assert.throws(() => checkpoint(state, 'V1', 'G', 'B1'), /misma época de destino/)
  assert.equal(JSON.stringify(state), before)
  assert.equal(view(state, 'O1').finalized, 'G')
})

test('voto histórico compatible después de finalizar no retrocede anclas ni duplica peso', () => {
  let state = acceptLink(fresh(), 'G', 'A1')
  state = acceptLink(state, 'A1', 'A2')
  state = acceptLink(state, 'G', 'A1', ['V3'])
  assert.equal(view(state, 'O1').links.find((entry) => entry.target === 'A1').weight, 5)
  assert.equal(view(state, 'O1').finalized, 'A1')
  assert.equal(view(state, 'O1').anchor, 'A2')
  state = acceptLink(state, 'G', 'A1', ['V3'])
  assert.equal(view(state, 'O1').links.find((entry) => entry.target === 'A1').weight, 5)
  assert.equal(view(state, 'O1').finalized, 'A1')
  assert.deepEqual(view(state, 'O1').justified, ['G', 'A1', 'A2'])
})

test('origen no justificado rechaza entrega; recuperar enlace previo permite reintentar', () => {
  let state = checkpoint(fresh(), 'V1', 'A1', 'A2')
  const waitingId = state.messages.at(-1).id
  const before = JSON.stringify(state)
  assert.throws(() => deliverLast(state), /origen A1 no está justificado/)
  assert.equal(JSON.stringify(state), before)
  state = acceptLink(state, 'G', 'A1')
  state = command(state, 'deliver', { observer: 'O1', messageId: waitingId })
  assert.equal(view(state, 'O1').finalized, 'G')
  state = acceptLink(state, 'A1', 'A2', ['V2'])
  assert.equal(view(state, 'O1').finalized, 'A1')
})

test('entrega de lote inválido es atómica, no acepta prefijo ni avanza evento', () => {
  let state = checkpoint(fresh(), 'V1', 'G', 'A1')
  state = checkpoint(state, 'V1', 'A1', 'A2')
  state = checkpoint(state, 'V2', 'G', 'A1')
  const before = JSON.stringify(state)
  assert.throws(() => command(state, 'deliverAll', { observer: 'O1', kind: 'checkpoint' }), /origen A1 no está justificado/)
  assert.equal(JSON.stringify(state), before)
  assert.equal(Object.keys(state.observers.O1.checkpointVotes).length, 0)
  assert.ok(state.messages.every((entry) => entry.delivered.length === 0))
  state = command(state, 'deliver', { observer: 'O1', messageId: 'm1' })
  state = command(state, 'deliver', { observer: 'O1', messageId: 'm3' })
  state = command(state, 'deliver', { observer: 'O1', messageId: 'm2' })
  assert.deepEqual(view(state, 'O1').justified, ['G', 'A1'])
  assert.equal(view(state, 'O1').links.find((entry) => entry.source === 'A1').weight, 2)
})

test('enlaces con origen y destino incompatibles o épocas no consecutivas no crean mensajes', () => {
  const state = fresh()
  for (const [source, target, pattern] of [
    ['A1', 'B2', /descendiente estricto/], ['A2', 'A1', /descendiente estricto/],
    ['G', 'G', /descendiente estricto/], ['G', 'A2', /épocas consecutivas/],
    ['X', 'A1', /El bloque debe ser/],
  ]) assert.throws(() => checkpoint(state, 'V1', source, target), pattern)
  assert.equal(state.event, 0)
  assert.equal(state.messages.length, 0)
})

test('ancla finalizada bloquea enlace de rama competidora y seis votos de cabeza rivales', () => {
  let state = acceptLink(fresh(), 'G', 'A1')
  state = acceptLink(state, 'A1', 'A2')
  state = checkpoint(state, 'V3', 'G', 'B1')
  const before = JSON.stringify(state)
  assert.throws(() => deliverLast(state), /compite con el punto finalizado A1/)
  assert.equal(JSON.stringify(state), before)
  for (const { id } of VALIDATORS) state = deliverLast(head(state, id, 'B2', 5))
  const result = view(state, 'O1')
  assert.equal(result.weights.B1, 6)
  assert.equal(result.head, 'A2')
  assert.equal(result.anchor, 'A2')
  assert.equal(result.finalized, 'A1')
})

test('snapshots e historial inmutables conservan mensajes y pesos previos', () => {
  const empty = fresh()
  const queued = head(empty, 'V1', 'A2', 1)
  const accepted = deliverLast(queued)
  const changed = deliverLast(head(accepted, 'V1', 'B2', 2))
  assert.equal(empty.event, 0)
  assert.equal(empty.messages.length, 0)
  assert.equal(queued.messages[0].delivered.length, 0)
  assert.equal(view(accepted, 'O1').head, 'A2')
  assert.equal(view(changed, 'O1').head, 'B2')
  assert.equal(changed.history[1].observers.O1.latest.V1.block, 'A2')
  assert.equal(changed.history[0].observers.O1.latest.V1, undefined)
  assert.ok(Object.isFrozen(changed))
  assert.ok(Object.isFrozen(changed.messages[0].delivered))
  assert.ok(Object.isFrozen(changed.history[1].observers.O1.latest))
  assert.throws(() => { changed.history[1].observers.O1.latest.V1.block = 'B2' }, TypeError)
  assert.throws(() => { changed.messages.push({}) }, TypeError)
})

test('reinicio descarta historial, cola y vistas; identidad antigua se rechaza', () => {
  const prior = acceptLink(seedHeads(fresh('heavy', 'antes')), 'G', 'A1')
  const reset = fresh('heavy', 'después')
  assert.equal(reset.event, 0)
  assert.equal(reset.history.length, 0)
  assert.equal(reset.messages.length, 0)
  assert.deepEqual(view(reset, 'O1').justified, ['G'])
  assert.equal(view(reset, 'O1').weights.A1, 0)
  assert.equal(view(prior, 'O1').weights.A1, 4)
  assert.throws(() => transition(reset, { runId: prior.runId, type: 'sendHead', validator: 'V1', block: 'A2', slot: 1 }), /otro recorrido/)
})

test('máximo 40 eventos e historial acotado; acción 41 no cambia estado', () => {
  let state = fresh()
  for (let index = 0; index < MAX_EVENTS; index += 1) state = head(state, 'V1', 'A2', index)
  assert.equal(state.event, 40)
  assert.equal(state.history.length, 40)
  assert.equal(state.messages.length, 40)
  assert.deepEqual(state.history.map(({ event }) => event), Array.from({ length: 40 }, (_, index) => index + 1))
  assert.throws(() => head(state, 'V1', 'A2', MAX_EVENTS), /Límite de 40 eventos/)
  assert.equal(state.messages.length, 40)
})

test('secuencias agrupadas no publican resultados parciales al superar límite', () => {
  let state = fresh()
  for (let index = 0; index < MAX_EVENTS - 2; index += 1) state = command(state, 'setObserver', { id: 'O2', enabled: true })
  const before = JSON.stringify(state)
  assert.throws(() => seedHeads(state), /Límite de 40 eventos/)
  assert.throws(() => enqueueOnlineCheckpoints(state, 'G', 'A1'), /Límite de 40 eventos/)
  assert.equal(JSON.stringify(state), before)
  assert.equal(state.messages.length, 0)
})

test('entradas inválidas conservan estado y permiten recuperación posterior', () => {
  const state = fresh()
  for (const slot of ['', NaN, -1, 0.5, MAX_SLOT + 1, Infinity]) assert.throws(() => head(state, 'V1', 'A2', slot), /slot educativo/)
  assert.throws(() => head(state, 'V9', 'A2', 1), /Selecciona un validador/)
  assert.throws(() => head(state, 'V1', 'Z', 1), /El bloque debe ser/)
  assert.throws(() => command(state, 'setObserver', { id: 'O9', enabled: true }), /Selecciona el observador/)
  assert.throws(() => command(state, 'setValidator', { id: 'V1', enabled: 'false' }), /conectividad/)
  assert.throws(() => command(state, 'deliver', { observer: 'O1', messageId: 'm99' }), /mensaje existente/)
  assert.throws(() => command(state, 'deliverAll', { observer: 'O1', kind: 'otro' }), /tipo de mensajes/)
  assert.throws(() => command(state, 'deliverAll', { observer: 'O1', kind: 'head' }), /No hay mensajes pendientes/)
  assert.throws(() => command(state, 'desconocida'), /Acción no admitida/)
  assert.throws(() => createConfig('otro'), /escenario disponible/)
  assert.throws(() => createConsensus({ ...createConfig(), connected: {} }), /conectividad/)
  assert.equal(state.event, 0)
  assert.equal(deliverLast(head(state, 'V1', 'B2', MAX_SLOT)).observers.O1.latest.V1.block, 'B2')
})

test('escenario de repetición calcula duplicado y antiguo, sin respuestas precargadas', () => {
  const state = seedHeads(fresh('replay'))
  assert.equal(state.messages.length, 3)
  assert.equal(state.event, 4)
  assert.equal(view(state, 'O1').weights.A1, 2)
  assert.equal(view(state, 'O1').weights.B1, 0)
  assert.equal(state.observers.O1.latest.V1.slot, 2)
  assert.match(state.history.at(-1).note, /duplicado/)
  assert.match(state.history.at(-1).note, /antiguo ignorado/)
  assert.throws(() => seedHeads(state), /cola vacía/)
})

test('configuración de entrada se copia y validador totalmente desconectado no crea votos', () => {
  const config = { preset: 'heavy', connected: { O1: true, O2: true }, online: { V1: false, V2: false, V3: false, V4: false } }
  const state = createConsensus(config, 'sin-validadores')
  config.connected.O1 = false
  config.online.V1 = true
  assert.equal(state.connected.O1, true)
  assert.equal(state.online.V1, false)
  assert.throws(() => enqueueOnlineCheckpoints(state, 'G', 'A1'), /No hay validadores en línea/)
  assert.equal(state.event, 0)
})
