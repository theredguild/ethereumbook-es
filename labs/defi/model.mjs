import artifacts from './artifacts.json' with { type: 'json' }
import { decodeErrorResult } from 'viem/utils'
import { createContractSession } from '../shared/evm.mjs'
import { callData, constructorData, readResult, decodeLogs } from '../shared/contracts.mjs'

export const UNIT = 1_000_000n
export const ACTORS = ['alice', 'bob', 'carol']
const UINT_MAX = (1n << 256n) - 1n
const names = { amm: 'AMMLedger', loan: 'LoanLedger' }

export function units(text, maximum = 1000n * UNIT) {
  if (typeof text !== 'string' || !/^\d{1,4}(?:\.\d{1,6})?$/.test(text)) throw new Error('Usa un importe decimal positivo, con hasta seis decimales y sin exponentes.')
  const [whole, fraction = ''] = text.split('.')
  const amount = BigInt(whole) * UNIT + BigInt(fraction.padEnd(6, '0'))
  if (amount <= 0n || amount > maximum) throw new Error(`Importe fuera del intervalo de 0.000001 a ${formatUnits(maximum)}.`)
  return amount
}

export function formatUnits(value) {
  const amount = BigInt(value)
  const sign = amount < 0n ? '-' : ''
  const positive = amount < 0n ? -amount : amount
  return `${sign}${positive / UNIT}.${(positive % UNIT).toString().padStart(6, '0')}`
}

export function healthText(value) { return BigInt(value) === UINT_MAX ? 'Sin deuda' : formatUnits(value) }

export function quoteMetrics(quote, currentOutput = quote.amountOut) {
  return {
    curveImpact: quote.spotOut - quote.noFeeOut,
    feeEffect: quote.noFeeOut - quote.amountOut,
    totalVersusSpot: quote.spotOut - quote.amountOut,
    slippage: quote.amountOut - BigInt(currentOutput),
  }
}

export function validSnapshot(snapshot) {
  if (!snapshot || !names[snapshot.mode] || !Number.isSafeInteger(snapshot.run) || snapshot.run < 1 || !snapshot.identity || !/^0x[\da-f]{40}$/i.test(snapshot.identity.address) || !Array.isArray(snapshot.evm?.actors) || snapshot.evm.actors.length !== 3) return false
  if (!snapshot.evm.actors.every((actor, i) => actor.id === ACTORS[i] && /^\d+$/.test(actor.nonce) && /^\d+$/.test(actor.balanceWei))) return false
  const nonnegative = (value) => typeof value === 'bigint' && value >= 0n
  const array = (value) => Array.isArray(value) && value.length === 3 && value.every(nonnegative)
  const total = (values) => values.reduce((sum, value) => sum + value, 0n)
  const s = snapshot.ledger
  if (!s) return false
  if (snapshot.mode === 'amm') {
    if (!nonnegative(s.reserveX) || !nonnegative(s.reserveY) || !s.reserveX || !s.reserveY || !array(s.walletX) || !array(s.walletY)) return false
    if (s.reserveX + total(s.walletX) !== 4000n * UNIT || s.reserveY + total(s.walletY) !== 4000n * UNIT) return false
    const q = snapshot.frozen
    return q === null || Boolean(q && q.run === snapshot.run && typeof q.xToY === 'boolean' && ['amountIn', 'amountOut', 'minOut', 'spotOut', 'noFeeOut'].every((key) => nonnegative(q[key]) && q[key] > 0n) && q.minOut <= q.amountOut && Number.isSafeInteger(q.toleranceBps) && q.toleranceBps >= 0 && q.toleranceBps <= 5000 && nonnegative(snapshot.currentQuote?.amountOut))
  }
  return array(s.collateralWallet) && array(s.stableWallet) && ['collateral', 'debt', 'pool', 'price', 'health'].every((key) => nonnegative(s[key])) && s.collateral + total(s.collateralWallet) === 100n * UNIT && s.pool + total(s.stableWallet) === 2000n * UNIT && s.pool + s.debt === 1000n * UNIT && s.price >= 10_000n && s.price <= 10n * UNIT
}

function revertReason(receipt) {
  try {
    const decoded = decodeErrorResult({ data: receipt.returnData })
    return decoded.errorName === 'Error' ? String(decoded.args[0]) : decoded.errorName
  } catch { return receipt.exception || 'REVERT' }
}

/** Every ledger observation comes from a checkpointed EVM call. */
export async function createDeFiModel() {
  const evm = await createContractSession()
  let mode = null
  let artifact = null
  let identity = null
  let frozen = null
  let run = 0

  async function read(name, args = [], actor = 'alice') {
    if (!identity) throw new Error('Inicia una sesión antes de consultar el contrato.')
    const result = await evm.call({ actor, to: identity.address, data: callData(artifact.abi, name, args) })
    if (result.status !== 1) throw new Error(`La consulta ${name} revirtió. ${revertReason(result)}`)
    return readResult(artifact.abi, name, result.returnData)
  }

  async function snapshot() {
    if (!identity) return null
    const data = await read('state')
    const ledger = mode === 'amm'
      ? { reserveX: data[0], reserveY: data[1], walletX: [...data[2]], walletY: [...data[3]] }
      : { collateralWallet: [...data[0]], stableWallet: [...data[1]], collateral: data[2], debt: data[3], pool: data[4], price: data[5], health: data[6] }
    return { run, mode, identity: structuredClone(identity), ledger, frozen: structuredClone(frozen), currentQuote: frozen ? await quote(frozen.xToY, frozen.amountIn) : null, evm: await evm.snapshot() }
  }

  async function start(nextMode) {
    if (!names[nextMode]) throw new Error('Selecciona AMM o Préstamos.')
    identity = null
    frozen = null
    mode = nextMode
    run += 1
    const initial = await evm.reset()
    artifact = artifacts[names[mode]]
    if (!artifact) throw new Error('Falta el artefacto compilado del contrato.')
    const result = await evm.deploy(artifact, { constructorData: constructorData(artifact.abi, initial.actors.map((actor) => actor.address)), gasLimit: '4000000' })
    if (result.receipt.status !== 1) throw new Error('El despliegue local revirtió.')
    identity = { address: result.receipt.createdAddress, name: artifact.name, sourceHash: artifact.sourceHash, compiler: artifact.compiler, deploymentHash: result.receipt.hash, evmVersion: artifact.evmVersion }
    return { snapshot: await snapshot(), receipt: result.receipt }
  }

  async function quote(xToY, amountIn) {
    if (mode !== 'amm' || typeof xToY !== 'boolean') throw new Error('Dirección AMM inválida.')
    const [amountOut, spotOut, noFeeOut] = await read('quote', [xToY, BigInt(amountIn)])
    return { xToY, amountIn: BigInt(amountIn), amountOut, spotOut, noFeeOut }
  }

  async function freeze({ xToY, amount, toleranceBps }) {
    if (!Number.isSafeInteger(toleranceBps) || toleranceBps < 0 || toleranceBps > 5000) throw new Error('La tolerancia admite de 0 a 5000 puntos básicos enteros.')
    const result = await quote(xToY, units(amount))
    if (!result.amountOut) throw new Error('La cotización redondeó a cero (zero output). Aumenta el importe.')
    const minOut = result.amountOut * BigInt(10000 - toleranceBps) / 10000n
    if (!minOut) throw new Error('El mínimo redondeó a cero. Aumenta el importe o reduce la tolerancia.')
    frozen = { ...result, minOut, toleranceBps, run, blockNumber: (await evm.snapshot()).blockNumber }
    return { snapshot: await snapshot(), quote: structuredClone(frozen) }
  }

  async function transact(name, args = [], actor = 'alice') {
    const methods = mode === 'amm' ? ['swap'] : ['deposit', 'borrow', 'repay', 'withdraw', 'setPrice', 'liquidate']
    if (!methods.includes(name) || !ACTORS.includes(actor)) throw new Error('Acción no admitida en este módulo.')
    const before = await snapshot()
    const result = await evm.transact({ actor, to: identity.address, data: callData(artifact.abi, name, args), gasLimit: '1000000' })
    return { snapshot: await snapshot(), before, receipt: result.receipt, logs: decodeLogs(artifact.abi, result.receipt.logs), error: result.receipt.status === 0 ? revertReason(result.receipt) : '' }
  }

  async function executeFrozen() {
    if (!frozen || frozen.run !== run) throw new Error('Congela una cotización nueva antes de enviar.')
    return transact('swap', [frozen.xToY, frozen.amountIn, frozen.minOut])
  }

  async function adverseTrade() {
    if (!frozen || frozen.run !== run) throw new Error('Primero congela la cotización de Alice.')
    // Bob uses the same direction, moving Alice's output price adversely.
    return transact('swap', [frozen.xToY, 100n * UNIT, 1n], 'bob')
  }

  async function dispatch(request) {
    switch (request.action) {
      case 'start': return start(request.mode)
      case 'snapshot': return { snapshot: await snapshot() }
      case 'freeze': return freeze(request)
      case 'invalidate': frozen = null; return { snapshot: await snapshot() }
      case 'adverse': return adverseTrade()
      case 'execute': return executeFrozen()
      case 'transaction': return transact(request.name, (request.args || []).map((value) => typeof value === 'boolean' ? value : BigInt(value)), request.actor || 'alice')
      default: throw new Error('Acción DeFi no admitida.')
    }
  }
  return { start, snapshot, read, quote, freeze, transact, executeFrozen, adverseTrade, dispatch }
}
