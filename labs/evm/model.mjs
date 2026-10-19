import { bytesToHex, hexToBytes } from '@ethereumjs/util'
import { keccak_256 } from '@noble/hashes/sha3.js'
import { createContractSession } from '../shared/evm.mjs'

export const DEPLOYMENT_GAS = '1200000'
export const PRESETS = Object.freeze([
  Object.freeze({ id: 'sum', label: 'Sumar 2 + 3 y retornar 5', runtime: '600260030160005260206000f3', gasLimit: '50000', description: 'ADD suma; MSTORE guarda la palabra; RETURN devuelve 32 bytes.' }),
  Object.freeze({ id: 'store', label: 'Guardar 1 y retornar 1', runtime: '600160005560005460005260206000f3', gasLimit: '50000', description: 'SSTORE escribe el slot 0; SLOAD lee el valor; RETURN lo devuelve.' }),
  Object.freeze({ id: 'revert', label: 'Escribir 9 y revertir', runtime: '600960005560006000fd', gasLimit: '50000', description: 'La traza muestra el 9 antes de REVERT. El estado final debe descartar esa escritura.' }),
  Object.freeze({ id: 'loop', label: 'Escribir 1 y agotar gas', runtime: '60016000555b600556', gasLimit: '64000', description: 'JUMP vuelve al JUMPDEST del PC 5. La ejecución continúa aunque se llene la muestra.' }),
])
export const INITIAL_DRAFT = Object.freeze({ runtime: PRESETS[0].runtime, gasLimit: '50000', prediction: Object.freeze({ status: '', slot0: '0', returnValue: '5' }) })

export function normalizeRuntime(value) {
  if (typeof value !== 'string') throw new Error('Runtime: escribe bytes hexadecimales.')
  const text = value.trim().replace(/^0x/i, '')
  if (!text.length) throw new Error('Runtime vacío: escribe al menos un byte.')
  if (text.length > 8192) throw new Error('Runtime: máximo 4096 bytes.')
  if (!/^[\da-fA-F]+$/.test(text)) throw new Error('Runtime: hexadecimal inválido; usa solo 0–9 y a–f, sin espacios internos.')
  if (text.length % 2) throw new Error('Runtime: cantidad impar de dígitos; cada byte necesita dos.')
  return `0x${text.toLowerCase()}`
}

function decimal(value, label) {
  if (typeof value !== 'string' || !/^\d{1,78}$/.test(value) || BigInt(value) >= 1n << 256n) throw new Error(`${label}: usa un entero de 256 bits no negativo.`)
  return BigInt(value).toString()
}

export function validateDraft(draft) {
  const runtime = normalizeRuntime(draft?.runtime)
  if (typeof draft?.gasLimit !== 'string' || !/^\d{1,6}$/.test(draft.gasLimit) || BigInt(draft.gasLimit) < 21000n || BigInt(draft.gasLimit) > 200000n) throw new Error('Límite de gas: usa un entero entre 21000 y 200000.')
  const prediction = draft.prediction
  if (!prediction || !['0', '1'].includes(prediction.status)) throw new Error('Predicción: elige si la transacción terminará con éxito o con fallo incluido.')
  const slot0 = decimal(prediction.slot0, 'Predicción del slot 0')
  const returnValue = prediction.returnValue?.trim()
  if (returnValue !== 'vacío') decimal(returnValue, 'Predicción del retorno; escribe vacío o un entero')
  return { runtime, gasLimit: BigInt(draft.gasLimit).toString(), prediction: { status: prediction.status, slot0, returnValue: returnValue === 'vacío' ? returnValue : BigInt(returnValue).toString() } }
}

export function programArtifact(runtimeInput) {
  const runtimeBytecode = normalizeRuntime(runtimeInput)
  const size = ((runtimeBytecode.length - 2) / 2).toString(16).padStart(4, '0')
  // 14 bytes: PUSH2 size, PUSH1 0x0e, PUSH1 0, CODECOPY, PUSH2 size, PUSH1 0, RETURN.
  const creationPrefix = `0x61${size}600e60003961${size}6000f3`
  const runtimeHash = bytesToHex(keccak_256(hexToBytes(runtimeBytecode)))
  return { name: 'ProgramaEVM', file: 'ProgramaEVM.hex', abi: [], evmVersion: 'shanghai', compiler: 'Sin compilador: ensamblado hexadecimal', sourceHash: runtimeHash, sourceHashKind: 'keccak256 de los bytes de runtime, no de código fuente Solidity', runtimeHash, runtimeBytecode, creationPrefix, bytecode: `${creationPrefix}${runtimeBytecode.slice(2)}` }
}

export function replayRecord(run, index, expectedRunId = run?.id) {
  if (!run || run.id !== expectedRunId) throw new Error('Traza obsoleta: ejecuta el programa actual.')
  const records = run.execution?.receipt?.trace?.records
  if (!Array.isArray(records) || !Number.isSafeInteger(index) || index < 0 || index >= records.length) throw new Error('Índice fuera de la muestra grabada.')
  return structuredClone(records[index])
}

export function returnWord(data) {
  return typeof data === 'string' && /^0x[\da-f]{64}$/.test(data) ? BigInt(data).toString() : null
}

export function comparisonFor(run) {
  const receipt = run.execution.receipt
  const contract = run.execution.snapshot.contracts.find((item) => item.address === run.address)
  const returned = receipt.returnData === '0x' ? 'vacío' : returnWord(receipt.returnData)
  return { status: String(receipt.status), slot0: contract.slots[0], returnValue: returned, matches: { status: String(receipt.status) === run.input.prediction.status, slot0: contract.slots[0] === run.input.prediction.slot0, returnValue: returned === run.input.prediction.returnValue } }
}

export function isLabState(value) {
  const snapshot = value?.snapshot
  if (!Number.isSafeInteger(value?.revision) || value.revision < 0 || !(value.runId === null || typeof value.runId === 'string') || !snapshot) return false
  if (!/^\d+$/.test(snapshot.blockNumber) || !Array.isArray(snapshot.receipts) || snapshot.receipts.length > 20 || !Array.isArray(snapshot.contracts) || snapshot.contracts.length > 12 || !Array.isArray(snapshot.actors) || snapshot.actors.length !== 3) return false
  if (!snapshot.actors.every((actor) => ['alice', 'bob', 'carol'].includes(actor?.id) && /^\d+$/.test(actor.nonce) && /^\d+$/.test(actor.balanceWei)) || new Set(snapshot.actors.map((actor) => actor.id)).size !== 3) return false
  return snapshot.contracts.every((contract) => /^0x[\da-f]{40}$/.test(contract?.address) && Array.isArray(contract.slots) && contract.slots.length === 2 && contract.slots.every((slot) => /^\d+$/.test(slot)))
}

export function isExecutionResult(value) {
  if (!isLabState(value) || !value.run || value.run.id !== value.runId) return false
  const run = value.run
  const receipt = run.execution?.receipt
  const deployment = run.deployment?.receipt
  const trace = receipt?.trace
  if (run.revision !== value.revision || !/^0x[\da-f]{40}$/.test(run.address) || !/^0x(?:[\da-f]{2}){1,4096}$/.test(run.input?.runtime) || run.artifact?.runtimeBytecode !== run.input.runtime) return false
  for (const snapshot of [run.deployment?.before, run.deployment?.snapshot, run.execution?.before, run.execution?.snapshot]) {
    if (!isLabState({ revision: value.revision, runId: value.runId, snapshot })) return false
  }
  if (deployment?.status !== 1 || deployment.returnData !== run.input.runtime || deployment.createdAddress !== run.address || !/^\d+$/.test(deployment.feeWei)) return false
  if (receipt?.to !== run.address || ![0, 1].includes(receipt.status) || !/^\d+$/.test(receipt.gasUsed) || !/^\d+$/.test(receipt.feeWei) || !/^0x(?:[\da-f]{2})*$/.test(receipt.returnData)) return false
  if (!Array.isArray(trace?.records) || trace.records.length > 512 || !Number.isSafeInteger(trace.totalInstructions) || trace.totalInstructions < trace.records.length || trace.truncated !== (trace.totalInstructions > trace.records.length)) return false
  if (trace.memoryPrefixBytes !== 128 || trace.stackSuffixItems !== 16 || !Array.isArray(trace.storageSlots) || trace.storageSlots.join(',') !== '0,1') return false
  for (const record of trace.records) {
    if (!record || record.phase !== 'before' || !Number.isSafeInteger(record.pc) || record.pc < 0 || !Number.isSafeInteger(record.depth) || record.depth < 0 || typeof record.opcode !== 'string' || !/^\d+$/.test(record.gasLeft)) return false
    if (!Number.isSafeInteger(record.stackSize) || !Array.isArray(record.stack) || record.stack.length > 16 || record.stack.length > record.stackSize || !record.stack.every((word) => /^0x[\da-f]+$/.test(word))) return false
    if (!/^0x(?:[\da-f]{2}){0,128}$/.test(record.memory) || !/^\d+$/.test(record.memoryBytes) || BigInt(record.memoryBytes) < BigInt((record.memory.length - 2) / 2)) return false
    if (!Array.isArray(record.slots) || record.slots.length !== 2 || !record.slots.every((slot) => /^\d+$/.test(slot)) || record.storageError) return false
  }
  return run.execution.snapshot.contracts.some((contract) => contract.address === run.address)
}

export async function createEvmLab() {
  const session = await createContractSession()
  let revision = 0
  let runCounter = 0
  let draft = structuredClone(INITIAL_DRAFT)
  let current = null
  let serial = Promise.resolve()
  const enqueue = (action) => {
    const result = serial.then(action)
    serial = result.catch(() => {})
    return result
  }
  const assertRevision = (expected) => {
    if (expected !== revision) throw new Error('Programa obsoleto: el borrador cambió o se reinició. No se reutilizó su traza.')
  }
  async function state() {
    return { revision, runId: current?.id ?? null, snapshot: await session.snapshot() }
  }
  function setDraft(next) {
    revision += 1
    current = null
    // Invalidate first, including malformed edits. Admission validation precedes deployment.
    draft = structuredClone(next)
    return { revision, draft: structuredClone(draft) }
  }
  function execute(expectedRevision, inputId = String(expectedRevision)) {
    const inputDraft = structuredClone(draft)
    return enqueue(async () => {
      assertRevision(expectedRevision)
      const input = validateDraft(inputDraft)
      const artifact = programArtifact(input.runtime)
      const id = `evm-${inputId}-${++runCounter}`
      const deployment = await session.deploy(artifact, { actor: 'alice', valueWei: '0', gasLimit: DEPLOYMENT_GAS })
      assertRevision(expectedRevision)
      if (deployment.receipt.status !== 1 || !deployment.receipt.createdAddress || deployment.receipt.returnData !== input.runtime) throw Object.assign(new Error('El despliegue no instaló el runtime esperado. Reinicia el laboratorio.'), { uncertain: true })
      const address = deployment.receipt.createdAddress
      const execution = await session.transact({ actor: 'alice', to: address, data: '0x', valueWei: '0', gasLimit: input.gasLimit, trace: true })
      assertRevision(expectedRevision)
      current = { id, revision: expectedRevision, input, source: { kind: 'runtime hexadecimal ingresado', text: inputDraft.runtime, normalized: input.runtime, hash: artifact.runtimeHash, hashMeaning: artifact.sourceHashKind }, artifact, address, deployment, execution }
      return { revision, runId: id, snapshot: structuredClone(execution.snapshot), run: structuredClone(current) }
    })
  }
  function replay(runId, index) {
    return replayRecord(current, index, runId)
  }
  function reset() {
    revision += 1
    current = null
    draft = structuredClone(INITIAL_DRAFT)
    return enqueue(async () => { await session.reset(); return state() })
  }
  return { setDraft, execute, replay, reset, snapshot: () => enqueue(state) }
}
