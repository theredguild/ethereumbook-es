import { decodeFunctionData } from 'viem'
import artifact from '../shared/counter-artifact.json' with { type: 'json' }
import { callData } from '../shared/contracts.mjs'

export const CHAIN_ID = '0x7a69'
export const GAS_LIMIT = '0xf4240'

const methods = new Set(['eth_requestAccounts', 'eth_accounts', 'eth_chainId', 'eth_call', 'eth_sendTransaction', 'eth_getTransactionReceipt', 'eth_getLogs'])
const addressPattern = /^0x[\da-fA-F]{40}$/
const hashPattern = /^0x[\da-fA-F]{64}$/
const quantityPattern = /^0x(?:0|[1-9a-fA-F][\da-fA-F]*)$/
const sameAddress = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase()
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const copy = (value) => structuredClone(value)
const decimal = (value) => typeof value === 'string' && /^\d{1,78}$/.test(value)
const hex = (value) => `0x${BigInt(value).toString(16)}`
export const providerError = (code, message) => Object.assign(new Error(message), { code })
const invalid = (message) => { throw providerError(-32602, message) }

export function validateState(state) {
  if (!object(state) || !addressPattern.test(state.address) || !decimal(state.value) || BigInt(state.value) > 1000n || !addressPattern.test(state.owner) || !object(state.identity) || state.identity.sourceHash !== artifact.sourceHash || !object(state.snapshot) || !Array.isArray(state.snapshot.actors) || !Array.isArray(state.snapshot.receipts) || state.snapshot.receipts.length > 20 || !decimal(state.snapshot.blockNumber)) throw providerError(4900, 'Estado local incompleto. Reinicia el laboratorio.')
  for (const actor of ['alice', 'bob']) {
    const item = state.snapshot.actors.find((entry) => entry.id === actor)
    if (!item || !addressPattern.test(item.address) || !decimal(item.nonce) || !decimal(item.balanceWei)) throw providerError(4900, 'Cuentas locales incompletas. Reinicia el laboratorio.')
  }
  for (const receipt of state.snapshot.receipts) {
    if (!object(receipt) || !hashPattern.test(receipt.hash) || ![0, 1].includes(receipt.status) || !Array.isArray(receipt.logs) || !decimal(receipt.blockNumber) || !decimal(receipt.nonce) || !decimal(receipt.gasUsed) || !decimal(receipt.feeWei) || !addressPattern.test(receipt.from) || (receipt.to !== null && !addressPattern.test(receipt.to)) || BigInt(receipt.blockNumber) > BigInt(state.snapshot.blockNumber) || receipt.logs.some((log) => !object(log) || !addressPattern.test(log.address) || !Array.isArray(log.topics) || log.topics.some((topic) => !hashPattern.test(topic)) || typeof log.data !== 'string' || !/^0x(?:[\da-fA-F]{2})*$/.test(log.data))) throw providerError(4900, 'Recibo local incompleto. Reinicia el laboratorio.')
  }
  if (!sameAddress(state.owner, state.snapshot.actors.find((actor) => actor.id === 'alice').address)) throw providerError(4900, 'Propietario local inconsistente. Reinicia el laboratorio.')
  return state
}

function rpcReceipt(receipt) {
  return { transactionHash: receipt.hash, blockNumber: hex(receipt.blockNumber), status: hex(receipt.status), from: receipt.from, to: receipt.to, gasUsed: hex(receipt.gasUsed), effectiveGasPrice: hex(12000000000n), logs: receipt.logs.map((log, index) => ({ ...log, transactionHash: receipt.hash, blockNumber: hex(receipt.blockNumber), logIndex: hex(index), removed: false })), local: { nonce: receipt.nonce, feeWei: receipt.feeWei, exception: receipt.exception } }
}

/** Explicit educational EIP-1193 subset. Never injected or connected to network. */
export function createLocalProvider(execute) {
  let epoch = 0
  let nextId = 0
  let selected = 'alice'
  let permission = false
  let state = null
  let unavailable = false
  let running = false
  let approval = null
  let journal = []
  const active = new Set()
  const listeners = new Map()
  let operation = null
  let serial = Promise.resolve()
  function runActual(action, fields, record, generation = epoch) {
    const result = serial.then(() => {
      if (generation !== epoch) throw providerError(4900, 'La sesión EVM anterior ya no está disponible.')
      if (record) ensureCurrent(record)
      return execute(action, fields)
    })
    serial = result.catch(() => {})
    return result
  }

  function emit(event, value) { for (const listener of listeners.get(event) || []) listener(copy(value)) }
  function accounts() { return permission && state ? [state.snapshot.actors.find((actor) => actor.id === selected).address] : [] }
  function view() { return { epoch, selected, permission, unavailable, running, accounts: accounts(), state: copy(state), pending: approval ? copy(approval.description) : null, journal: copy(journal) } }
  function changed() { emit('change', view()) }
  function entry(record, outcome, data) {
    journal.push({ id: record.id, epoch: record.epoch, method: record.method, params: record.params, outcome, ...data })
    journal = journal.slice(-20)
  }
  function finish(record, error, result) {
    if (!active.delete(record)) return
    if (approval?.record === record) approval = null
    if (record.epoch === epoch) entry(record, error ? 'error' : 'response', error ? { error: { code: error.code, message: error.message } } : { result: copy(result) })
    if (error) record.reject(error)
    else record.resolve(copy(result))
    changed()
  }
  function cancel(message, code = 4001) {
    for (const record of [...active]) finish(record, providerError(code, message))
    approval = null
  }
  function requireAccount() {
    if (!permission) throw providerError(4100, 'La DApp no tiene permiso para usar las cuentas locales.')
  }
  function ensureCurrent(record) {
    if (record.epoch !== epoch || !active.has(record)) throw providerError(4001, 'La solicitud ya fue cancelada.')
  }
  function transaction(value, sending) {
    if (!object(value) || Object.keys(value).some((key) => !['from', 'to', 'data', 'value', 'chainId', 'gas'].includes(key))) invalid('La solicitud solo admite from, to, data, value, chainId y gas.')
    if (value.chainId !== undefined && value.chainId !== CHAIN_ID) invalid('Cadena incorrecta. Solo se admite 0x7a69.')
    if (!sameAddress(value.to, state.address)) invalid('Destino incorrecto. Solo se admite el LabCounter de este recorrido.')
    requireAccount()
    if (!sameAddress(value.from, accounts()[0])) throw providerError(4100, 'from debe coincidir con la cuenta seleccionada y autorizada.')
    if (value.value !== undefined && value.value !== '0x0') invalid('Solo se admite value 0x0, sin transferencia de ETH.')
    if (value.gas !== undefined && value.gas !== GAS_LIMIT) invalid('La política local fija gas en 0xf4240, equivalente a 1000000.')
    if (typeof value.data !== 'string' || !/^0x(?:[\da-fA-F]{2})+$/.test(value.data) || value.data.length > 138) invalid('Calldata hexadecimal inválido o fuera del límite local.')
    let decoded
    try { decoded = decodeFunctionData({ abi: artifact.abi, data: value.data }) } catch { invalid('Calldata no admitido por LabCounter.') }
    if (!['value', 'owner', 'set_value', 'fail'].includes(decoded.functionName) || callData(artifact.abi, decoded.functionName, decoded.args || []).toLowerCase() !== value.data.toLowerCase()) invalid('Calldata no canónico o método no admitido.')
    if (sending && !['set_value', 'fail'].includes(decoded.functionName)) invalid('Solo set_value y fail se admiten como transacciones.')
    return { actor: selected, data: value.data, decoded: { method: decoded.functionName, args: (decoded.args || []).map(String) } }
  }
  async function vm(record, action, fields) {
    ensureCurrent(record)
    if (running) throw providerError(-32602, 'Ya hay una operación EVM en curso. Espera su respuesta.')
    const token = {}
    operation = token
    running = true
    changed()
    try {
      const result = await runActual(action, fields, record)
      ensureCurrent(record)
      state = validateState(result.state || result)
      return result
    } catch (error) {
      if (record.epoch === epoch && active.has(record)) {
        if (error.snapshot && !error.fatal) {
          try { state = validateState(error.snapshot) } catch { unavailable = true }
        } else if (error.code !== 4001) unavailable = true
      }
      throw error.code ? error : providerError(4900, error.message || 'EVM local no disponible. Reinicia.')
    } finally {
      if (operation === token) { running = false; operation = null; changed() }
    }
  }
  function ask(record, kind, details) {
    if (approval) throw providerError(-32602, 'Ya hay una aprobación pendiente. Resuélvela antes de crear otra.')
    approval = { record, description: { id: record.id, epoch, kind, chainId: CHAIN_ID, ...details } }
    changed()
  }
  async function dispatch(record, request) {
    try {
      if (!object(request) || typeof request.method !== 'string' || Object.keys(request).some((key) => !['method', 'params'].includes(key))) invalid('Usa request({ method, params }) sin campos adicionales.')
      if (!methods.has(request.method)) throw providerError(4200, 'Método no admitido por este subconjunto local de EIP-1193.')
      const params = request.params === undefined ? [] : request.params
      if (!Array.isArray(params)) invalid('params debe ser un arreglo.')
      if (!['eth_call', 'eth_sendTransaction', 'eth_getTransactionReceipt', 'eth_getLogs'].includes(request.method) && params.length !== 0) invalid('Este método no admite parámetros.')
      if (request.method === 'eth_accounts') return finish(record, null, accounts())
      if (request.method === 'eth_chainId') return finish(record, null, CHAIN_ID)
      if (!state || unavailable) throw providerError(4900, 'La EVM local no está disponible. Reinicia el laboratorio.')
      switch (request.method) {
        case 'eth_requestAccounts':
          if (permission) finish(record, null, accounts())
          else ask(record, 'accounts', { selected, grants: ['alice', 'bob'] })
          break
        case 'eth_sendTransaction': {
          if (params.length !== 1) invalid('eth_sendTransaction requiere una transacción.')
          if (running) invalid('Espera la operación EVM antes de preparar otra transacción.')
          const tx = transaction(params[0], true)
          ask(record, 'transaction', { from: accounts()[0], to: state.address, value: '0x0', gas: GAS_LIMIT, gasPriceWei: '12000000000', decoded: tx.decoded, transaction: copy(params[0]), actor: tx.actor })
          break
        }
        case 'eth_call': {
          if (params.length < 1 || params.length > 2 || (params[1] !== undefined && params[1] !== 'latest')) invalid('eth_call admite una solicitud y únicamente el bloque latest.')
          const tx = transaction(params[0], false)
          const result = await vm(record, 'call', tx)
          if (result.call.status !== 1) throw providerError(3, `La llamada revirtió: ${result.call.exception}. Sin comisión ni cambios persistentes.`)
          finish(record, null, result.call.returnData)
          break
        }
        case 'eth_getTransactionReceipt': {
          if (params.length !== 1 || !hashPattern.test(params[0])) invalid('Se requiere un hash de transacción de 32 bytes.')
          const found = state.snapshot.receipts.find((receipt) => receipt.hash.toLowerCase() === params[0].toLowerCase())
          finish(record, null, found ? rpcReceipt(found) : null)
          break
        }
        case 'eth_getLogs': {
          const filter = params[0]
          if (params.length !== 1 || !object(filter) || Object.keys(filter).some((key) => !['address', 'fromBlock', 'toBlock'].includes(key)) || !sameAddress(filter.address, state.address)) invalid('Filtro local requiere address del LabCounter; solo admite fromBlock y toBlock.')
          const height = BigInt(state.snapshot.blockNumber)
          const bound = (value, fallback) => {
            if (value === undefined) return fallback
            if (value === 'latest') return height
            if (typeof value !== 'string' || !quantityPattern.test(value) || value.length > 18) invalid('Bloque inválido; usa latest o una cantidad hexadecimal acotada.')
            return BigInt(value)
          }
          const from = bound(filter.fromBlock, 0n)
          const to = bound(filter.toBlock, height)
          if (from > to || to > height) invalid('Rango de bloques fuera del recorrido local.')
          const logs = state.snapshot.receipts.filter((receipt) => receipt.status === 1 && BigInt(receipt.blockNumber) >= from && BigInt(receipt.blockNumber) <= to).slice().reverse().flatMap((receipt) => rpcReceipt(receipt).logs.filter((log) => sameAddress(log.address, state.address)))
          finish(record, null, logs)
          break
        }
      }
    } catch (error) { finish(record, error.code ? error : providerError(-32602, error.message)) }
  }

  function request(input) {
    const record = { id: ++nextId, epoch, method: typeof input?.method === 'string' ? input.method : '(solicitud inválida)', params: null }
    try { record.params = copy(input?.params === undefined ? [] : input.params) } catch { return Promise.reject(providerError(-32602, 'Parámetros no copiables.')) }
    record.promise = new Promise((resolve, reject) => { record.resolve = resolve; record.reject = reject })
    active.add(record)
    entry(record, 'request', {})
    changed()
    let immutable
    try { immutable = copy(input) } catch { finish(record, providerError(-32602, 'Solicitud no copiable.')); return record.promise }
    void dispatch(record, immutable)
    return record.promise
  }

  return {
    request,
    view,
    on(event, listener) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(listener); return () => listeners.get(event)?.delete(listener) },
    fail(cause) {
      const error = providerError(4900, cause?.message || 'La EVM local se detuvo. Reinicia el laboratorio.')
      epoch += 1
      unavailable = true
      permission = false
      state = null
      running = false
      operation = null
      cancel(error.message, error.code)
      emit('accountsChanged', [])
      emit('disconnect', { code: error.code, message: error.message })
      changed()
      return error
    },
    async initialize() {
      const generation = ++epoch
      cancel('Solicitud cancelada por reinicio.')
      permission = false
      selected = 'alice'
      state = null
      unavailable = false
      const token = {}
      operation = token
      running = true
      journal = []
      emit('accountsChanged', [])
      changed()
      try {
        const result = await runActual('reset')
        if (generation !== epoch) return null
        state = validateState(result)
        return view()
      } catch (error) {
        if (generation !== epoch) return null
        unavailable = true
        throw error
      } finally { if (operation === token) { running = false; operation = null; changed() } }
    },
    async approve(id) {
      const pending = approval
      if (!pending || pending.record.id !== id || pending.record.epoch !== epoch) return false
      approval = null
      const record = pending.record
      if (pending.description.kind === 'accounts') {
        permission = true
        emit('accountsChanged', accounts())
        finish(record, null, accounts())
      } else {
        try {
          requireAccount()
          const tx = transaction(pending.description.transaction, true)
          const result = await vm(record, 'send', tx)
          if (!hashPattern.test(result.receipt?.hash) || !state.snapshot.receipts.some((receipt) => receipt.hash === result.receipt.hash)) {
            unavailable = true
            throw providerError(4900, 'No se pudo identificar el recibo incluido. Reinicia.')
          }
          finish(record, null, result.receipt.hash)
        } catch (error) { finish(record, error.code ? error : providerError(4900, error.message)) }
      }
      return true
    },
    reject(id) {
      if (!approval || approval.record.id !== id || approval.record.epoch !== epoch) return false
      finish(approval.record, providerError(4001, 'El usuario rechazó la solicitud. No se envió ninguna transacción.'))
      return true
    },
    revoke() {
      cancel('Solicitud cancelada por revocación del permiso.')
      epoch += 1
      permission = false
      if (running) unavailable = true
      emit('accountsChanged', [])
      changed()
    },
    selectActor(actor) {
      if (!['alice', 'bob'].includes(actor)) throw providerError(-32602, 'Solo se admiten Alice y Bob.')
      if (running) throw providerError(-32602, 'Espera la operación EVM antes de cambiar de cuenta.')
      cancel('Solicitud cancelada al cambiar la cuenta seleccionada.')
      selected = actor
      emit('accountsChanged', accounts())
      changed()
    },
    dispose() { cancel('Se cerró el proveedor local.'); epoch += 1; listeners.clear() },
  }
}
