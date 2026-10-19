import test from 'node:test'
import assert from 'node:assert/strict'
import { currentReceipt, evaluateFinality, isHealthySnapshot } from './model.mjs'

const hash = `0x${'a'.repeat(64)}`
const otherHash = `0x${'b'.repeat(64)}`
const signed = { hash, nonce: '0', sender: 'sender-address', to: 'recipient-address' }
const accounts = [
  { id: 'sender', balanceWei: '9899748000000000000', nonce: '1' },
  { id: 'recipient', balanceWei: '100000000000000000', nonce: '0' },
]
const receipt = {
  hash, blockNumber: '1', nonce: '0', from: signed.sender, to: signed.to,
  status: 1, gasUsed: '21000', feeWei: '252000000000000', valueTransferredWei: '100000000000000000',
  beforeAccounts: [{ id: 'sender', balanceWei: '10000000000000000000', nonce: '0' }, { id: 'recipient', balanceWei: '0', nonce: '0' }],
  afterAccounts: accounts,
}
const snapshot = { blockNumber: '1', baseFeeWei: '10000000000', accounts, pending: [], receipts: [receipt] }

function deepFreeze(value) {
  Object.freeze(value)
  for (const child of Object.values(value)) if (child && typeof child === 'object') deepFreeze(child)
  return value
}

test('exact threshold is three of four on both correctly sourced links', () => {
  for (let first = 0; first <= 4; first += 1) {
    for (let second = 0; second <= 4; second += 1) {
      const result = evaluateFinality({ receipt, votesE1: first, votesE2: second })
      assert.equal(result.first.justified, first >= 3, `${first}/4 E0→E1`)
      assert.equal(result.second.justified, first >= 3 && second >= 3, `${first}/4 then ${second}/4`)
      assert.equal(result.first.finalized, first >= 3 && second >= 3)
      assert.equal(result.second.finalized, false)
      assert.equal(result.denominator, 4)
      assert.equal(result.threshold, 3)
    }
  }
})

test('justification alone is not finality and unavailable votes do not shrink denominator', () => {
  const firstOnly = evaluateFinality({ receipt, votesE1: 3, votesE2: 0 })
  assert.equal(firstOnly.first.justified, true)
  assert.equal(firstOnly.first.finalized, false)
  const unavailable = evaluateFinality({ receipt, votesE1: 2, votesE2: 2 })
  assert.equal(unavailable.denominator, 4)
  assert.equal(unavailable.first.justified, false)
  assert.equal(unavailable.first.finalized, false)
})

test('missing first checkpoint, wrong source and non-descendant cannot finalize E1', () => {
  for (const change of [
    { hasFirstCheckpoint: false },
    { secondSource: 'E0' },
    { secondDescendant: false },
  ]) {
    const result = evaluateFinality({ receipt, votesE1: 4, votesE2: 4, ...change })
    assert.equal(result.first.finalized, false)
    assert.equal(result.second.justified, false)
  }
  const missing = evaluateFinality({ receipt, votesE1: 4, votesE2: 4, hasFirstCheckpoint: false })
  assert.equal(missing.first.justified, false)
  assert.equal(missing.first.containsBlock, null)
})

test('invalid vote counts fail rather than clamp, coerce or reuse a previous result', () => {
  for (const count of [-1, 5, 0.5, NaN, Infinity, '3', null, true, {}, []]) {
    assert.throws(() => evaluateFinality({ receipt, votesE1: count }), /enteros entre 0 y 4/)
    assert.throws(() => evaluateFinality({ receipt, votesE2: count }), /enteros entre 0 y 4/)
  }
})

test('no finality simulation without an included receipt identity', () => {
  for (const invalid of [undefined, null, {}, { hash, blockNumber: '0' }, { hash: 'invalid', blockNumber: '1' }, { hash, blockNumber: '-1' }]) {
    assert.throws(() => evaluateFinality({ receipt: invalid, votesE1: 4, votesE2: 4 }), /recibo/)
  }
  assert.throws(() => evaluateFinality({ receipt, secondSource: 'unknown' }), /configuración/)
  assert.throws(() => evaluateFinality({ receipt, hasFirstCheckpoint: 'true' }), /configuración/)
  assert.throws(() => evaluateFinality({ receipt, secondDescendant: 1 }), /configuración/)
})

test('finality model neither mutates inputs nor keeps mutable input references', () => {
  const input = deepFreeze({ receipt: structuredClone(receipt), votesE1: 3, votesE2: 3 })
  const before = structuredClone(input)
  const result = evaluateFinality(input)
  assert.deepEqual(input, before)
  assert.equal(result.receiptHash, hash)
  assert.equal(result.includedBlock, '1')
  assert.equal(result.first.containsBlock, '1')
  assert.equal(result.synthetic, true)
  assert.ok(Object.isFrozen(result))
  assert.ok(Object.isFrozen(result.first))
  assert.ok(Object.isFrozen(result.second))
})

test('current receipt requires signed hash, exact new block, sender, destination and nonce', () => {
  assert.deepEqual(currentReceipt(signed, '0', snapshot), receipt)
  assert.equal(currentReceipt({ ...signed, hash: otherHash }, '0', snapshot), null)
  assert.equal(currentReceipt({ ...signed, nonce: '1' }, '0', snapshot), null)
  assert.equal(currentReceipt({ ...signed, sender: 'another-sender' }, '0', snapshot), null)
  assert.equal(currentReceipt({ ...signed, to: 'another-recipient' }, '0', snapshot), null)
  assert.equal(currentReceipt(signed, '1', snapshot), null)
  assert.equal(currentReceipt(signed, '2', snapshot), null)
  assert.equal(currentReceipt(signed, 'invalid', snapshot), null)
  assert.equal(currentReceipt(null, '0', snapshot), null)
})

test('historical receipt never completes inclusion of a new transfer', () => {
  const next = { ...signed, hash: otherHash, nonce: '1' }
  const nextSnapshot = { ...snapshot, blockNumber: '2' }
  assert.equal(currentReceipt(next, '1', nextSnapshot), null)
  assert.equal(currentReceipt(signed, '1', nextSnapshot), null)
  assert.equal(currentReceipt(signed, '0', nextSnapshot), null)
  const nextReceipt = { ...receipt, hash: otherHash, nonce: '1', blockNumber: '2' }
  assert.deepEqual(currentReceipt(next, '1', { ...nextSnapshot, receipts: [receipt, nextReceipt] }), nextReceipt)
})

test('receipt lookup leaves engine snapshots unchanged and returns an independent copy', () => {
  const source = deepFreeze(structuredClone(snapshot))
  const before = structuredClone(source)
  const selected = currentReceipt(signed, '0', source)
  selected.afterAccounts[0].balanceWei = '0'
  selected.hash = otherHash
  assert.deepEqual(source, before)
})

test('incomplete recoverable snapshots are not healthy actionable state', () => {
  assert.equal(isHealthySnapshot(snapshot), true)
  for (const invalid of [
    undefined, null, {},
    { ...snapshot, accounts: [] },
    { ...snapshot, accounts: [...accounts, accounts[0]] },
    { ...snapshot, blockNumber: '-1' },
    { ...snapshot, baseFeeWei: 'ten' },
    { ...snapshot, pending: null },
    { ...snapshot, receipts: [{ ...receipt, afterAccounts: [] }] },
    { ...snapshot, receipts: [{ ...receipt, gasUsed: undefined }] },
    { ...snapshot, receipts: [{ ...receipt, status: '1' }] },
  ]) {
    assert.equal(isHealthySnapshot(invalid), false)
    assert.equal(currentReceipt(signed, '0', invalid), null)
  }
})
