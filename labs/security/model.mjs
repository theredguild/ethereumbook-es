import artifacts from './artifacts.json' with { type: 'json' }
import { createContractSession } from '../shared/evm.mjs'
import { callData, constructorData, decodeLogs, readResult } from '../shared/contracts.mjs'
import { VARIANTS, PREDICTIONS, UNIT } from './config.mjs'

const actor = (snapshot, id) => snapshot.actors.find((account) => account.id === id)
const checkedSetup = (result) => {
  if (result.receipt.status !== 1) throw new Error('No se completó la preparación del escenario. La sesión anterior se conserva.')
  return result
}

async function positions(vm, context) {
  async function read(artifact, address, method, args = []) {
    const result = await vm.call({ to: address, data: callData(artifact.abi, method, args) })
    if (result.status !== 1) throw Object.assign(new Error(`No se pudo confirmar ${method} en la EVM.`), { fatal: true })
    return readResult(artifact.abi, method, result.returnData).toString()
  }
  return {
    vaultWei: await read(context.vaultArtifact, context.vault, 'held'),
    honestCreditWei: await read(context.vaultArtifact, context.vault, 'credit', [context.alice]),
    callerWei: await read(artifacts.RecursiveCaller, context.caller, 'held'),
    callerCreditWei: await read(context.vaultArtifact, context.vault, 'credit', [context.caller]),
    callbacks: await read(artifacts.RecursiveCaller, context.caller, 'callbacks'),
  }
}

export async function createSecurityLab() {
  let vm = await createContractSession()
  let runId = 0
  let context = null
  let phase = 'empty'
  let variant = null
  let prediction = null
  let initial = null
  let attempt = null
  let legitimate = null

  async function snapshot() {
    return structuredClone({ runId, phase, variant, prediction, initial, positions: context ? await positions(vm, context) : null, deployments: context ? { vault: context.vault, caller: context.caller, vaultArtifact: context.vaultArtifact, callerArtifact: artifacts.RecursiveCaller } : null, attempt, legitimate, chain: await vm.snapshot() })
  }

  function current(expected, requiredPhase) {
    if (expected !== runId) throw new Error('La acción pertenece a otro recorrido. No se ejecutó.')
    if (!context || phase !== requiredPhase) throw new Error('Esta acción no está disponible en el estado actual del recorrido.')
  }

  async function prepare(fields) {
    const selected = VARIANTS.find((item) => item.id === fields.variant)
    if (!selected || !PREDICTIONS.includes(fields.prediction)) throw new Error('Selecciona una versión y una predicción antes de preparar.')
    // Prepare a separate VM first; a failed setup cannot replace the accepted run.
    const fresh = await createContractSession()
    const vaultArtifact = artifacts[selected.contract]
    const vaultResult = checkedSetup(await fresh.deploy(vaultArtifact, { actor: 'alice' }))
    const vault = vaultResult.receipt.createdAddress
    const callerResult = checkedSetup(await fresh.deploy(artifacts.RecursiveCaller, { actor: 'carol', constructorData: constructorData(artifacts.RecursiveCaller.abi, [vault]) }))
    const freshChain = await fresh.snapshot()
    const alice = actor(freshChain, 'alice').address
    checkedSetup(await fresh.transact({ actor: 'alice', to: vault, data: callData(vaultArtifact.abi, 'deposit'), valueWei: (10n * UNIT).toString() }))
    const nextContext = { vault, caller: callerResult.receipt.createdAddress, alice, vaultArtifact }
    const nextInitial = await positions(fresh, nextContext)
    vm = fresh
    context = nextContext
    runId += 1
    phase = 'ready'
    variant = selected.id
    prediction = fields.prediction
    initial = nextInitial
    attempt = null
    legitimate = null
    return snapshot()
  }

  async function recursiveAttempt(fields) {
    current(fields.runId, 'ready')
    if (fields.trace !== undefined && typeof fields.trace !== 'boolean') throw new Error('La captura de traza debe ser una opción booleana.')
    const before = await positions(vm, context)
    const result = await vm.transact({ actor: 'carol', to: context.caller, data: callData(artifacts.RecursiveCaller.abi, 'attempt'), valueWei: UNIT.toString(), trace: fields.trace === true })
    phase = 'attempted'
    attempt = { receipt: result.receipt, events: decodeLogs([...context.vaultArtifact.abi, ...artifacts.RecursiveCaller.abi], result.receipt.logs), before, after: null, accountBefore: actor(result.before, 'carol'), accountAfter: actor(result.snapshot, 'carol') }
    attempt.after = await positions(vm, context)
    return snapshot()
  }

  async function legitimateWithdrawal(fields) {
    current(fields.runId, 'attempted')
    const before = await positions(vm, context)
    const result = await vm.transact({ actor: 'alice', to: context.vault, data: callData(context.vaultArtifact.abi, 'withdraw') })
    phase = 'finished'
    legitimate = { receipt: result.receipt, events: decodeLogs(context.vaultArtifact.abi, result.receipt.logs), before, after: null, accountBefore: actor(result.before, 'alice'), accountAfter: actor(result.snapshot, 'alice') }
    legitimate.after = await positions(vm, context)
    return snapshot()
  }

  async function reset() {
    vm = await createContractSession()
    runId += 1
    context = null
    phase = 'empty'
    variant = null
    prediction = null
    initial = null
    attempt = null
    legitimate = null
    return snapshot()
  }

  return {
    snapshot, prepare, recursiveAttempt, legitimateWithdrawal, reset,
    dispatch(action, fields = {}) {
      if (action === 'snapshot') return snapshot()
      if (action === 'prepare') return prepare(fields)
      if (action === 'attempt') return recursiveAttempt(fields)
      if (action === 'withdraw') return legitimateWithdrawal(fields)
      if (action === 'reset') return reset()
      throw new Error('Acción del laboratorio no admitida.')
    },
  }
}
