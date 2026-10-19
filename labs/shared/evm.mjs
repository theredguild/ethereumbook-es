import { createBlock } from '@ethereumjs/block'
import { createCustomCommon, Hardfork, Mainnet } from '@ethereumjs/common'
import { createFeeMarket1559Tx } from '@ethereumjs/tx'
import { bytesToBigInt, bytesToHex, createAccount, createAddressFromString, hexToBytes, privateToAddress } from '@ethereumjs/util'
import { createVM, runTx } from '@ethereumjs/vm'
import { keccak_256 } from '@noble/hashes/sha3.js'

const UINT256 = (1n << 256n) - 1n
const MAX_GAS = 4_000_000n
const BASE_FEE = 10_000_000_000n
const BENEFICIARY = '0x00000000000000000000000000000000000000fe'
const SLOT_KEYS = [0, 1].map((slot) => hexToBytes(`0x${slot.toString(16).padStart(64, '0')}`))

function integer(value, maximum, label) {
  const text = typeof value === 'bigint' ? value.toString() : value
  if (typeof text !== 'string' || !/^\d{1,78}$/.test(text)) throw new Error(`${label}: usa un entero no negativo.`)
  const parsed = BigInt(text)
  if (parsed > maximum) throw new Error(`${label}: supera el límite del laboratorio.`)
  return parsed
}

function bytes(value, maximum, label) {
  if (typeof value !== 'string' || value.length > 2 + maximum * 2 || !/^0x(?:[\da-fA-F]{2})*$/.test(value)) throw new Error(`${label}: hexadecimal inválido o demasiado largo.`)
  return hexToBytes(value)
}

function address(value) {
  if (typeof value !== 'string' || !/^0x[\da-fA-F]{40}$/.test(value)) throw new Error('Dirección inválida.')
  return createAddressFromString(value.toLowerCase())
}

/** Actual Shanghai execution. Public fixture keys 1, 2 and 3, never user secrets. */
export async function createContractSession() {
  const common = createCustomCommon({ name: 'contract-lab', chainId: 31337 }, Mainnet, { hardfork: Hardfork.Shanghai })
  const actors = ['alice', 'bob', 'carol'].map((id, index) => {
    const key = hexToBytes(`0x${(index + 1).toString(16).padStart(64, '0')}`)
    const value = bytesToHex(privateToAddress(key))
    return { id, key, address: value, evmAddress: address(value) }
  })
  let vm
  let blockNumber = 0n
  let deployments = []
  let receipts = []

  async function reset() {
    const fresh = await createVM({ common })
    for (const actor of actors) await fresh.stateManager.putAccount(actor.evmAddress, createAccount({ balance: 100n * 10n ** 18n }))
    vm = fresh
    blockNumber = 0n
    deployments = []
    receipts = []
    return snapshot()
  }

  async function accountState(value) {
    const location = address(value)
    const account = await vm.stateManager.getAccount(location)
    const slots = await Promise.all(SLOT_KEYS.map(async (key) => bytesToBigInt(await vm.stateManager.getStorage(location, key)).toString()))
    return { address: value, balanceWei: (account?.balance ?? 0n).toString(), nonce: (account?.nonce ?? 0n).toString(), slots }
  }

  async function snapshot(contractList = deployments) {
    return { actors: await Promise.all(actors.map(async ({ id, address: value }) => ({ id, ...await accountState(value) }))), contracts: await Promise.all(contractList.map(async (item) => ({ ...item, ...await accountState(item.address) }))), blockNumber: blockNumber.toString(), receipts: structuredClone(receipts) }
  }

  function block(number = blockNumber + 1n) {
    return createBlock({ header: { number, gasLimit: MAX_GAS, baseFeePerGas: BASE_FEE, coinbase: BENEFICIARY, timestamp: 1700000000n + number, difficulty: 0n }, withdrawals: [] }, { common })
  }

  function actorFor(id) {
    const actor = actors.find((item) => item.id === id)
    if (!actor) throw new Error('Actor educativo desconocido.')
    return actor
  }

  function traceCollector() {
    const records = []
    let count = 0
    const listener = (event, next) => {
      count += 1
      if (records.length >= 512) { next?.(); return }
      const record = { pc: event.pc, opcode: event.opcode.name, depth: event.depth, address: event.address.toString(), gasLeft: event.gasLeft.toString(), stack: event.stack.slice(-16).map((item) => `0x${item.toString(16)}`), stackSize: event.stack.length, memory: bytesToHex(event.memory.slice(0, 128)), memoryBytes: (event.memoryWordCount * 32n).toString(), phase: 'before' }
      records.push(record)
      Promise.all(SLOT_KEYS.map(async (key) => bytesToBigInt(await event.stateManager.getStorage(event.address, key)).toString()))
        .then((slots) => { record.slots = slots })
        .catch((error) => { record.storageError = error.message })
        .finally(() => next?.())
    }
    return { listener, result: () => ({ records, totalInstructions: count, truncated: count > records.length, memoryPrefixBytes: 128, stackSuffixItems: 16, storageSlots: ['0', '1'] }) }
  }

  async function execute({ actor: actorId = 'alice', to, data = '0x', valueWei = '0', gasLimit = '1000000', trace = false }, artifact) {
    const actor = actorFor(actorId)
    const payload = bytes(data, artifact ? 32_768 : 4096, 'Datos')
    const value = integer(valueWei, UINT256, 'Valor en wei')
    const gas = integer(gasLimit, MAX_GAS, 'Límite de gas')
    if (artifact && deployments.length >= 12) throw new Error('Reinicia antes de desplegar más de 12 contratos.')
    const sender = await vm.stateManager.getAccount(actor.evmAddress)
    const tx = createFeeMarket1559Tx({ chainId: 31337n, nonce: sender.nonce, to: to ? address(to) : undefined, data: payload, value, gasLimit: gas, maxFeePerGas: 30_000_000_000n, maxPriorityFeePerGas: 2_000_000_000n }, { common }).sign(actor.key)
    const recorder = trace ? traceCollector() : null
    const before = await snapshot()
    await vm.stateManager.checkpoint()
    let receipt
    let newDeployment
    let after
    try {
      if (recorder) vm.evm.events.on('step', recorder.listener)
      const result = await runTx(vm, { tx, block: block() })
      if (artifact && result.receipt.status === 1 && result.createdAddress) {
        newDeployment = { name: artifact.name, address: result.createdAddress.toString(), sourceHash: artifact.sourceHash, compiler: artifact.compiler, evmVersion: 'shanghai', deploymentCodeHash: bytesToHex(keccak_256(payload)), abi: artifact.abi }
      }
      receipt = { hash: bytesToHex(tx.hash()), blockNumber: (blockNumber + 1n).toString(), status: result.receipt.status, exception: result.execResult.exceptionError?.error || null, from: actor.address, to: to || null, createdAddress: newDeployment?.address || null, nonce: tx.nonce.toString(), gasUsed: result.totalGasSpent.toString(), feeWei: (result.totalGasSpent * 12_000_000_000n).toString(), returnData: bytesToHex(result.execResult.returnValue), logs: result.receipt.logs.map(([location, topics, logData]) => ({ address: bytesToHex(location), topics: topics.map(bytesToHex), data: bytesToHex(logData) })), trace: recorder?.result() || null }
      after = await snapshot(newDeployment ? [...deployments, newDeployment] : deployments)
      await vm.stateManager.commit()
    } catch (error) {
      await vm.stateManager.revert()
      throw new Error(`La transacción no se incluyó; se conservó el estado. ${error.message}`, { cause: error })
    } finally {
      if (recorder) vm.evm.events.removeListener('step', recorder.listener)
    }
    if (newDeployment) deployments.push(newDeployment)
    blockNumber += 1n
    receipts.unshift(receipt)
    receipts.length = Math.min(receipts.length, 20)
    after.blockNumber = blockNumber.toString()
    after.receipts = structuredClone(receipts)
    return { receipt, before, snapshot: after }
  }

  async function deploy(artifact, options = {}) {
    if (!artifact || artifact.evmVersion !== 'shanghai' || !Array.isArray(artifact.abi) || typeof artifact.name !== 'string') throw new Error('Artefacto de compilación no válido para Shanghai.')
    const code = bytes(artifact.bytecode, 32_768, 'Código de creación')
    if (!code.length) throw new Error('El contrato no tiene código de creación.')
    const args = options.constructorData || '0x'
    bytes(args, 4096, 'Argumentos del constructor')
    return execute({ ...options, to: undefined, data: `${artifact.bytecode}${args.slice(2)}`, gasLimit: options.gasLimit || MAX_GAS.toString() }, artifact)
  }

  async function call({ actor: actorId = 'alice', to, data = '0x', gasLimit = '1000000' }) {
    const actor = actorFor(actorId)
    const payload = bytes(data, 4096, 'Datos')
    const gas = integer(gasLimit, MAX_GAS, 'Límite de gas')
    await vm.stateManager.checkpoint()
    try {
      const result = await vm.evm.runCall({ caller: actor.evmAddress, origin: actor.evmAddress, to: address(to), data: payload, gasLimit: gas, block: block(), value: 0n })
      return { status: result.execResult.exceptionError ? 0 : 1, exception: result.execResult.exceptionError?.error || null, returnData: bytesToHex(result.execResult.returnValue), gasUsed: result.execResult.executionGasUsed.toString() }
    } finally { await vm.stateManager.revert() }
  }

  await reset()
  return { reset, snapshot, deploy, transact: (options) => execute(options), call }
}
