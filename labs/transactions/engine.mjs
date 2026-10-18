import { createBlock } from '@ethereumjs/block'
import { createCustomCommon, Hardfork, Mainnet } from '@ethereumjs/common'
import { createFeeMarket1559Tx, createFeeMarket1559TxFromRLP } from '@ethereumjs/tx'
import { bytesToBigInt, bytesToHex, createAccount, createAddressFromString, hexToBytes } from '@ethereumjs/util'
import { createVM, runTx } from '@ethereumjs/vm'
import { ADDRESSES, INITIAL_BASE_FEE, LIMITS } from './protocol.mjs'

const CHAIN_ID = 31337n
const UINT256_MAX = (1n << 256n) - 1n
const MAX_NONCE = (1n << 64n) - 2n
const INITIAL_BALANCE = 10n * 10n ** 18n
// Public educational scalar 1. Never import this key into a wallet or fund it.
const EDUCATIONAL_KEY = hexToBytes(`0x${'0'.repeat(63)}1`)
const SLOT_ZERO = new Uint8Array(32)
const ACCOUNTS = [
  ['sender', 'Emisor educativo'],
  ['recipient', 'Destinatario'],
  ['reverter', 'Contrato REVERT'],
  ['exhaustor', 'Contrato sin gas'],
  ['beneficiary', 'Beneficiario de propinas'],
].map(([id, label]) => ({ id, label, address: ADDRESSES[id], evmAddress: createAddressFromString(ADDRESSES[id]) }))
// Both fixtures write 1 to slot 0 before failing. Neither can keep value or storage.
const REVERTER_CODE = hexToBytes('0x600160005560006000fd')
// Offset 5 is JUMPDEST; PUSH1 5 / JUMP repeats until the VM runs out of gas.
const EXHAUSTOR_CODE = hexToBytes('0x60016000555b600556')

function decimal(value, places, label, maximum = UINT256_MAX) {
  if (typeof value !== 'string' || value.length > 100 || !/^\d+(?:\.\d+)?$/.test(value)) {
    throw new Error(`${label}: usa un número decimal no negativo, sin espacios ni exponentes.`)
  }
  const [whole, fraction = ''] = value.split('.')
  if (fraction.length > places) throw new Error(`${label}: admite hasta ${places} decimales.`)
  const parsed = BigInt(whole) * 10n ** BigInt(places) + BigInt(fraction.padEnd(places, '0') || '0')
  if (parsed > maximum) throw new Error(`${label}: supera el máximo permitido.`)
  return parsed
}

function hexadecimal(value, maxBytes, label) {
  if (typeof value !== 'string' || value.length > 2 + maxBytes * 2 || !/^0x(?:[\da-fA-F]{2})*$/.test(value)) {
    throw new Error(`${label}: usa hexadecimal con prefijo 0x, bytes completos y hasta ${maxBytes} bytes.`)
  }
  return value.toLowerCase()
}

function validateTransaction(tx) {
  if (tx.chainId !== CHAIN_ID) throw new Error('La transacción debe usar la cadena educativa 31337.')
  if (!tx.to) throw new Error('Este laboratorio no admite creación de contratos.')
  if (tx.accessList.length !== 0) throw new Error('Este laboratorio no admite listas de acceso.')
  if (tx.nonce > MAX_NONCE) throw new Error('El nonce supera el máximo permitido.')
  if (tx.gasLimit > BigInt(LIMITS.gas)) throw new Error(`El límite de gas no puede superar ${LIMITS.gas}.`)
  if (tx.data.length > LIMITS.dataBytes) throw new Error(`Los datos no pueden superar ${LIMITS.dataBytes} bytes.`)
  if (tx.maxPriorityFeePerGas > tx.maxFeePerGas) throw new Error('La propina máxima no puede superar la comisión máxima.')
  if (tx.gasLimit < tx.getIntrinsicGas()) throw new Error(`Gas insuficiente para el costo intrínseco de ${tx.getIntrinsicGas()}.`)
  if (!tx.isSigned() || !tx.verifySignature()) throw new Error('La firma de la transacción no es válida.')
  if (tx.getSenderAddress().toString() !== ADDRESSES.sender) throw new Error('Solo se admite el emisor educativo público de este laboratorio.')
}

function inspect(tx) {
  return {
    serialized: bytesToHex(tx.serialize()),
    hash: bytesToHex(tx.hash()),
    sender: tx.getSenderAddress().toString(),
    to: tx.to.toString(),
    nonce: tx.nonce.toString(),
    valueWei: tx.value.toString(),
    gasLimit: tx.gasLimit.toString(),
    maxFeePerGasWei: tx.maxFeePerGas.toString(),
    maxPriorityFeePerGasWei: tx.maxPriorityFeePerGas.toString(),
    data: bytesToHex(tx.data),
    chainId: tx.chainId.toString(),
    signature: { yParity: tx.v.toString(), r: tx.r.toString(), s: tx.s.toString() },
    signatureValid: tx.verifySignature(),
    intrinsicGas: tx.getIntrinsicGas().toString(),
  }
}

function minimumReplacement(previous) {
  const rounded = (previous * 110n + 99n) / 100n
  return rounded > previous ? rounded : previous + 1n
}

function maximumCost(tx) {
  return tx.value + tx.gasLimit * tx.maxFeePerGas
}

/** In-memory educational chain. Every action, including reset, runs in arrival order. */
export async function createTransactionLab() {
  const common = createCustomCommon({ name: 'transaction-lab', chainId: 31337 }, Mainnet, { hardfork: Hardfork.Shanghai })
  let vm
  let pending = []
  let receipts = []
  let blockNumber = 0n
  let baseFee = decimal(INITIAL_BASE_FEE, 9, 'Comisión base')
  let serial = Promise.resolve()

  async function initialize() {
    const fresh = await createVM({ common })
    for (const account of ACCOUNTS) {
      await fresh.stateManager.putAccount(account.evmAddress, createAccount({ balance: account.id === 'sender' ? INITIAL_BALANCE : 0n }))
    }
    await fresh.stateManager.putCode(createAddressFromString(ADDRESSES.reverter), REVERTER_CODE)
    await fresh.stateManager.putCode(createAddressFromString(ADDRESSES.exhaustor), EXHAUSTOR_CODE)
    // Assign only after all initialization succeeds, so a failed reset preserves state.
    vm = fresh
    pending = []
    receipts = []
    blockNumber = 0n
    baseFee = decimal(INITIAL_BASE_FEE, 9, 'Comisión base')
  }

  async function accountSnapshots(destination) {
    const definitions = destination && !ACCOUNTS.some((account) => account.address === destination)
      ? [...ACCOUNTS, { id: 'destination', label: 'Destino de esta transacción', address: destination, evmAddress: createAddressFromString(destination) }]
      : ACCOUNTS
    const accounts = []
    for (const { id, label, address, evmAddress } of definitions) {
      const account = await vm.stateManager.getAccount(evmAddress)
      const storage = account ? await vm.stateManager.getStorage(evmAddress, SLOT_ZERO) : new Uint8Array()
      accounts.push({ id, label, address, balanceWei: (account?.balance ?? 0n).toString(), nonce: (account?.nonce ?? 0n).toString(), storageSlotZero: bytesToBigInt(storage).toString() })
    }
    return accounts
  }

  function reason(tx, sender, fee) {
    if (tx.nonce > sender.nonce) return `Espera el nonce ${sender.nonce}; no se pueden saltar nonces.`
    if (tx.nonce < sender.nonce) return 'El nonce ya fue consumido.'
    if (tx.maxFeePerGas < fee) return 'La comisión máxima es menor que la comisión base del bloque.'
    if (maximumCost(tx) > sender.balance) return 'Saldo insuficiente para valor + límite de gas × comisión máxima; permanece pendiente.'
    return 'Lista para incluir con el nonce y la comisión base actuales.'
  }

  async function snapshot() {
    const accounts = await accountSnapshots()
    const sender = { nonce: BigInt(accounts[0].nonce), balance: BigInt(accounts[0].balanceWei) }
    return {
      accounts,
      pending: pending.map(({ tx, signed }) => ({ ...signed, reason: reason(tx, sender, baseFee) })),
      receipts,
      blockNumber: blockNumber.toString(),
      baseFeeWei: baseFee.toString(),
    }
  }

  function decode(serialized) {
    const hex = hexadecimal(serialized, LIMITS.dataBytes + 512, 'Transacción firmada')
    if (!hex.startsWith('0x02')) throw new Error('Solo se admiten transacciones EIP-1559 de tipo 0x02.')
    let tx
    try {
      tx = createFeeMarket1559TxFromRLP(hexToBytes(hex), { common })
    } catch {
      throw new Error('Los bytes no codifican una transacción EIP-1559 válida para la cadena educativa 31337.')
    }
    validateTransaction(tx)
    if (bytesToHex(tx.serialize()) !== hex) throw new Error('La transacción debe tener una codificación canónica.')
    return tx
  }

  function sign(input) {
    if (!input || typeof input !== 'object') throw new Error('Faltan los campos de la transacción.')
    if (typeof input.to !== 'string' || !/^0x[\da-fA-F]{40}$/.test(input.to)) throw new Error('El destino debe ser una dirección hexadecimal de 20 bytes.')
    const fields = {
      chainId: CHAIN_ID,
      to: input.to,
      value: decimal(input.value, 18, 'Valor en ETH'),
      nonce: decimal(input.nonce, 0, 'Nonce', MAX_NONCE),
      data: hexadecimal(input.data, LIMITS.dataBytes, 'Datos'),
      gasLimit: decimal(input.gasLimit, 0, 'Límite de gas', BigInt(LIMITS.gas)),
      maxFeePerGas: decimal(input.maxFeePerGas, 9, 'Comisión máxima en gwei'),
      maxPriorityFeePerGas: decimal(input.maxPriorityFeePerGas, 9, 'Propina máxima en gwei'),
      accessList: [],
    }
    if (fields.maxPriorityFeePerGas > fields.maxFeePerGas) throw new Error('La propina máxima no puede superar la comisión máxima.')
    let tx
    try {
      tx = createFeeMarket1559Tx(fields, { common }).sign(EDUCATIONAL_KEY)
    } catch {
      throw new Error('No se pudo firmar la transacción con estos campos.')
    }
    // Inspect the decoded immutable bytes, not the mutable input form.
    return inspect(decode(bytesToHex(tx.serialize())))
  }

  async function submit(serialized) {
    const tx = decode(serialized)
    const signed = inspect(tx)
    if (pending.some((entry) => entry.signed.hash === signed.hash) || receipts.some((receipt) => receipt.hash === signed.hash)) {
      throw new Error('Esta transacción ya fue enviada o incluida; no se ejecutará dos veces.')
    }
    const sender = await vm.stateManager.getAccount(ACCOUNTS[0].evmAddress)
    if (tx.nonce < sender.nonce) throw new Error('Nonce antiguo: ya fue consumido. El rechazo no cobra gas.')
    if (maximumCost(tx) > sender.balance) throw new Error('Saldo insuficiente para valor + límite de gas × comisión máxima. El rechazo no cobra gas.')
    const replacement = pending.findIndex((entry) => entry.tx.nonce === tx.nonce)
    if (replacement !== -1) {
      const previous = pending[replacement].tx
      const cap = minimumReplacement(previous.maxFeePerGas)
      const tip = minimumReplacement(previous.maxPriorityFeePerGas)
      if (tx.maxFeePerGas < cap || tx.maxPriorityFeePerGas < tip) {
        throw new Error(`Reemplazo rechazado: cada comisión debe subir al menos 10% redondeado hacia arriba y al menos 1 wei. Mínimos: comisión máxima ${cap} wei y propina máxima ${tip} wei. La original sigue pendiente.`)
      }
      pending[replacement] = { tx, signed }
      return { signed, message: 'Reemplazo aceptado por la política local. Solo los nuevos bytes podrán incluirse.' }
    }
    if (pending.length >= LIMITS.pending) throw new Error(`La cola admite hasta ${LIMITS.pending} transacciones; todavía puedes reemplazar una existente.`)
    pending.push({ tx, signed })
    return { signed, message: 'Bytes firmados admitidos en la cola local. Todavía no se ejecutó la transacción.' }
  }

  async function mine(baseFeeGwei) {
    const nextBaseFee = decimal(baseFeeGwei, 9, 'Comisión base en gwei')
    const sender = await vm.stateManager.getAccount(ACCOUNTS[0].evmAddress)
    const index = pending.findIndex(({ tx }) => tx.nonce === sender.nonce)
    if (index === -1) {
      baseFee = nextBaseFee
      return { message: pending.length ? `No se incluyó ninguna transacción. Falta el nonce ${sender.nonce}.` : 'No se incluyó ninguna transacción. La cola está vacía.' }
    }
    const { tx, signed } = pending[index]
    if (tx.maxFeePerGas < nextBaseFee || maximumCost(tx) > sender.balance) {
      baseFee = nextBaseFee
      return { message: `No se incluyó ninguna transacción. ${reason(tx, sender, nextBaseFee)}` }
    }
    const nextBlock = blockNumber + 1n
    const block = createBlock({
      header: { number: nextBlock, gasLimit: BigInt(LIMITS.gas), baseFeePerGas: nextBaseFee, coinbase: ADDRESSES.beneficiary, timestamp: 1700000000n + nextBlock, difficulty: 0n },
      withdrawals: [],
    }, { common })
    const beforeAccounts = await accountSnapshots(signed.to)
    // runTx has its own nested checkpoint. This outer checkpoint also covers
    // receipt/account capture errors after execution, before changing the queue.
    await vm.stateManager.checkpoint()
    let receipt
    try {
      const result = await runTx(vm, { tx, block })
      const gasUsed = result.totalGasSpent
      const effectiveGasPrice = tx.maxFeePerGas < nextBaseFee + tx.maxPriorityFeePerGas ? tx.maxFeePerGas : nextBaseFee + tx.maxPriorityFeePerGas
      const fee = gasUsed * effectiveGasPrice
      const burn = gasUsed * nextBaseFee
      receipt = {
        hash: signed.hash,
        blockNumber: nextBlock.toString(),
        status: result.receipt.status,
        exception: result.execResult.exceptionError?.error ?? null,
        gasUsed: gasUsed.toString(),
        effectiveGasPriceWei: effectiveGasPrice.toString(),
        feeWei: fee.toString(),
        burnWei: burn.toString(),
        tipWei: (fee - burn).toString(),
        valueTransferredWei: (result.receipt.status === 1 ? tx.value : 0n).toString(),
        from: signed.sender,
        to: signed.to,
        nonce: signed.nonce,
        beforeAccounts,
        afterAccounts: await accountSnapshots(signed.to),
      }
      await vm.stateManager.commit()
    } catch (error) {
      await vm.stateManager.revert()
      throw new Error('La ejecución interna falló. Se conservaron las cuentas y la cola; puedes volver a intentar o reiniciar.', { cause: error })
    }
    pending.splice(index, 1)
    receipts.unshift(receipt)
    if (receipts.length > LIMITS.receipts) receipts.length = LIMITS.receipts
    blockNumber = nextBlock
    baseFee = nextBaseFee
    return { message: receipt.status === 1 ? 'Transacción incluida con éxito en un bloque educativo.' : 'Transacción incluida con fallo: consumió nonce y gas, pero revirtió valor y almacenamiento.' }
  }

  async function handle(request) {
    if (!request || typeof request !== 'object') throw new Error('La solicitud del laboratorio no es válida.')
    let result = {}
    switch (request.action) {
      case 'snapshot':
        result.message = 'Estado local del laboratorio.'
        break
      case 'sign':
        result = { signed: sign(request.input), message: 'Firma creada y remitente recuperado. Las cuentas y la cola no cambiaron.' }
        break
      case 'submit':
        result = await submit(request.serialized)
        break
      case 'mine':
        result = await mine(request.baseFeeGwei)
        break
      case 'reset':
        await initialize()
        result.message = 'Laboratorio reiniciado. Se descartaron la cola y los recibos.'
        break
      default:
        throw new Error('Acción desconocida del laboratorio.')
    }
    // Do not expose retained queue inspections or receipt arrays to callers.
    return structuredClone({ ...result, snapshot: await snapshot() })
  }

  await initialize()
  return {
    dispatch(request) {
      let copy
      try {
        copy = structuredClone(request)
      } catch {
        return Promise.reject(new Error('La solicitud debe contener solo datos copiables.'))
      }
      const task = serial.then(() => handle(copy))
      // Return the original rejection to the caller; only the internal queue recovers.
      serial = task.catch(() => {})
      return task
    },
  }
}
