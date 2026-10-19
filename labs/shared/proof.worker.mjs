// SPDX-License-Identifier: GPL-3.0-or-later
// Uses snarkjs and circomlib-generated artifacts. See runtime licensing notices.
import { groth16 } from 'snarkjs'
import knowledgeWasm from '../zero-knowledge/artifacts/circuit.wasm?url'
import knowledgeZkey from '../zero-knowledge/artifacts/final.zkey?url'
import knowledgeVkey from '../zero-knowledge/artifacts/verification-key.json'
import batchWasm from '../scaling/artifacts/circuit.wasm?url'
import batchZkey from '../scaling/artifacts/final.zkey?url'
import batchVkey from '../scaling/artifacts/verification-key.json'
import { canonicalInteger, FIELD, MAX_128, MAX_32 } from './proof-inputs.mjs'

const definitions = { knowledge: { wasm: knowledgeWasm, key: knowledgeZkey, verification: knowledgeVkey, publicCount: 1 }, batch: { wasm: batchWasm, key: batchZkey, verification: batchVkey, publicCount: 5 } }
const loaded = new Map()
let serial = Promise.resolve()

async function load(relation) {
  const definition = definitions[relation]
  if (!definition) throw new Error('Relación de prueba desconocida.')
  if (!loaded.has(relation)) {
    loaded.set(relation, Promise.all([definition.wasm, definition.key].map(async (url) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`No se pudo cargar un recurso de prueba: HTTP ${response.status}`)
      return new Uint8Array(await response.arrayBuffer())
    })).then(([wasm, key]) => ({ ...definition, wasm, key })))
  }
  return loaded.get(relation)
}

function checkedWitness(relation, input) {
  if (!input || typeof input !== 'object') throw new Error('Falta el testigo educativo.')
  if (relation === 'knowledge') {
    canonicalInteger(input.commitment, FIELD - 1n, 'Compromiso')
    canonicalInteger(input.secret, MAX_128, 'Testigo')
    canonicalInteger(input.salt, MAX_128, 'Salt')
    return { commitment: input.commitment, secret: input.secret, salt: input.salt }
  }
  if (!Array.isArray(input.before) || !Array.isArray(input.after) || input.before.length !== 2 || input.after.length !== 2) throw new Error('Se necesitan dos saldos iniciales y dos finales.')
  for (const value of [...input.before, ...input.after, input.amountAB, input.amountBA]) canonicalInteger(value, MAX_32, 'Saldo o importe')
  canonicalInteger(input.salt, MAX_128, 'Salt')
  canonicalInteger(input.commitment, FIELD - 1n, 'Compromiso')
  return { before: input.before, after: input.after, amountAB: input.amountAB, amountBA: input.amountBA, salt: input.salt, commitment: input.commitment }
}

async function respond(data) {
  const id = data?.id
  try {
    if (!Number.isSafeInteger(id) || id < 0) throw new Error('Identificador de solicitud inválido.')
    const assets = await load(data.relation)
    const started = performance.now()
    let result
    if (data.action === 'initialize') {
      result = { ready: true, relation: data.relation, bytes: assets.wasm.length + assets.key.length }
    } else if (data.action === 'prove') {
      if (typeof globalThis.crypto?.getRandomValues !== 'function') throw new Error('No hay aleatoriedad criptográfica disponible; no se generó prueba.')
      const input = checkedWitness(data.relation, data.input)
      const generated = await groth16.fullProve(input, assets.wasm, assets.key, undefined, { memorySize: 256 }, { singleThread: true })
      result = { ...generated, relation: data.relation, elapsedMs: Math.round(performance.now() - started) }
    } else if (data.action === 'verify') {
      if (!Array.isArray(data.publicSignals) || data.publicSignals.length !== assets.publicCount) throw new Error('Cantidad incorrecta de entradas públicas.')
      for (const value of data.publicSignals) canonicalInteger(value, FIELD - 1n, 'Entrada pública')
      if (!data.proof || typeof data.proof !== 'object' || JSON.stringify(data.proof).length > 8192) throw new Error('Paquete de prueba inválido o demasiado grande.')
      result = { valid: await groth16.verify(assets.verification, data.publicSignals, data.proof), elapsedMs: Math.round(performance.now() - started), relation: data.relation }
    } else throw new Error('Acción de prueba no admitida.')
    self.postMessage({ id, ok: true, result })
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : 'No se completó la prueba.' })
  }
}

self.onmessage = ({ data }) => {
  serial = serial.then(() => respond(data)).catch((error) => self.reportError(error))
}
