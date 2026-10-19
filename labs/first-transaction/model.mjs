const UINT = /^(0|[1-9]\d*)$/
const HASH = /^0x[\da-fA-F]{64}$/

function unsigned(value) {
  return typeof value === 'string' && value.length <= 100 && UINT.test(value)
}

function receiptIdentity(receipt) {
  return Boolean(receipt && HASH.test(receipt.hash) && unsigned(receipt.blockNumber) && BigInt(receipt.blockNumber) > 0n)
}

function accountState(accounts) {
  return Array.isArray(accounts)
    && ['sender', 'recipient'].every((id) => accounts.filter((account) => account?.id === id).length === 1)
    && accounts.every((account) => account && unsigned(account.balanceWei) && unsigned(account.nonce))
}

/** Structural guard for the transaction engine's recoverable state. */
export function isHealthySnapshot(snapshot) {
  if (!snapshot || !unsigned(snapshot.blockNumber) || !unsigned(snapshot.baseFeeWei)) return false
  if (!accountState(snapshot.accounts) || !Array.isArray(snapshot.pending) || !Array.isArray(snapshot.receipts)) return false
  if (!snapshot.pending.every((item) => item && HASH.test(item.hash) && typeof item.serialized === 'string')) return false
  return snapshot.receipts.every((item) => receiptIdentity(item)
    && (item.status === 0 || item.status === 1)
    && unsigned(item.nonce) && unsigned(item.gasUsed) && unsigned(item.feeWei) && unsigned(item.valueTransferredWei)
    && accountState(item.beforeAccounts) && accountState(item.afterAccounts))
}

/** Old history, even with the same hash, cannot complete a fresh inclusion. */
export function currentReceipt(signed, beforeBlock, snapshot) {
  if (!signed || !HASH.test(signed.hash) || !unsigned(beforeBlock) || !isHealthySnapshot(snapshot)) return null
  if (BigInt(snapshot.blockNumber) !== BigInt(beforeBlock) + 1n) return null
  const receipt = snapshot.receipts.find((item) => item.hash === signed.hash && item.blockNumber === snapshot.blockNumber && item.nonce === signed.nonce && item.from === signed.sender && item.to === signed.to)
  return receipt ? structuredClone(receipt) : null
}

function voteCount(value) {
  if (!Number.isInteger(value) || value < 0 || value > 4) throw new Error('Los votos deben ser números enteros entre 0 y 4.')
  return value
}

/** Synthetic two-link case only. No consensus messages or EVM writes occur here. */
export function evaluateFinality({ receipt, votesE1 = 0, votesE2 = 0, hasFirstCheckpoint = true, secondSource = 'E1', secondDescendant = true } = {}) {
  if (!receiptIdentity(receipt)) throw new Error('La simulación necesita el recibo de una transacción incluida.')
  const first = voteCount(votesE1)
  const second = voteCount(votesE2)
  if (typeof hasFirstCheckpoint !== 'boolean' || typeof secondDescendant !== 'boolean' || !['E0', 'E1'].includes(secondSource)) {
    throw new Error('La configuración de los puntos de control no es válida.')
  }
  const firstJustified = hasFirstCheckpoint && first * 3 >= 4 * 2
  const secondJustified = firstJustified && secondSource === 'E1' && secondDescendant && second * 3 >= 4 * 2
  return Object.freeze({
    synthetic: true,
    denominator: 4,
    threshold: 3,
    receiptHash: receipt.hash,
    includedBlock: receipt.blockNumber,
    votesE1: first,
    votesE2: second,
    first: Object.freeze({ epoch: 'E1', exists: hasFirstCheckpoint, containsBlock: hasFirstCheckpoint ? receipt.blockNumber : null, justified: firstJustified, finalized: secondJustified }),
    second: Object.freeze({ epoch: 'E2', source: secondSource, descendant: secondDescendant, justified: secondJustified, finalized: false }),
  })
}
