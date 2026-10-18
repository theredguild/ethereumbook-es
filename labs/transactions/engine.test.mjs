import assert from 'node:assert/strict'
import test from 'node:test'
import { createCustomCommon, Hardfork, Mainnet } from '@ethereumjs/common'
import { createFeeMarket1559Tx } from '@ethereumjs/tx'
import { bytesToHex, hexToBytes } from '@ethereumjs/util'
import { createTransactionLab } from './engine.mjs'
import { ADDRESSES, DEFAULT_INPUT, LIMITS } from './protocol.mjs'

const INITIAL = 10n ** 19n
const GWEI = 10n ** 9n
const ETH = 10n ** 18n
const account = (snapshot, id) => snapshot.accounts.find((entry) => entry.id === id)
const balance = (snapshot, id) => BigInt(account(snapshot, id).balanceWei)
const state = async (lab) => (await lab.dispatch({ action: 'snapshot' })).snapshot
const sign = async (lab, fields = {}) => (await lab.dispatch({ action: 'sign', input: { ...DEFAULT_INPUT, ...fields } })).signed
const submit = (lab, signed) => lab.dispatch({ action: 'submit', serialized: signed.serialized })
const mine = (lab, baseFeeGwei = '10') => lab.dispatch({ action: 'mine', baseFeeGwei })

function externallySigned(fields = {}, key = 1n, chainId = 31337) {
  const common = createCustomCommon({ chainId }, Mainnet, { hardfork: Hardfork.Shanghai })
  const tx = createFeeMarket1559Tx({ chainId: BigInt(chainId), to: ADDRESSES.recipient, nonce: 0n, value: 0n, gasLimit: 21000n, maxFeePerGas: 30n * GWEI, maxPriorityFeePerGas: 2n * GWEI, ...fields }, { common })
  return bytesToHex(tx.sign(hexToBytes(`0x${key.toString(16).padStart(64, '0')}`)).serialize())
}

async function rejectsWithoutChange(lab, request, pattern) {
  const before = await state(lab)
  await assert.rejects(lab.dispatch(request), pattern)
  assert.deepEqual(await state(lab), before)
}

function assertAccounting(snapshot, receipt) {
  const before = { accounts: receipt.beforeAccounts }
  const after = { accounts: receipt.afterAccounts }
  const used = BigInt(receipt.gasUsed)
  assert.equal(BigInt(receipt.feeWei), used * BigInt(receipt.effectiveGasPriceWei))
  assert.equal(BigInt(receipt.feeWei), BigInt(receipt.burnWei) + BigInt(receipt.tipWei))
  assert.equal(balance(before, 'sender') - balance(after, 'sender'), BigInt(receipt.feeWei) + BigInt(receipt.valueTransferredWei))
  assert.equal(balance(after, 'beneficiary') - balance(before, 'beneficiary'), BigInt(receipt.tipWei))
  assert.equal(BigInt(account(after, 'sender').nonce), BigInt(account(before, 'sender').nonce) + 1n)
  const totalBefore = receipt.beforeAccounts.reduce((sum, entry) => sum + BigInt(entry.balanceWei), 0n)
  const totalAfter = receipt.afterAccounts.reduce((sum, entry) => sum + BigInt(entry.balanceWei), 0n)
  assert.equal(totalBefore - totalAfter, BigInt(receipt.burnWei))
  assert.deepEqual(snapshot.accounts, receipt.afterAccounts)
}

test('initialization and real sign/serialize/decode/recovery leave state unchanged', async () => {
  const lab = await createTransactionLab()
  const before = await state(lab)
  assert.equal(before.accounts.length, 5)
  assert.equal(balance(before, 'sender'), INITIAL)
  for (const id of ['recipient', 'reverter', 'exhaustor', 'beneficiary']) assert.equal(balance(before, id), 0n)
  assert.ok(before.accounts.every((entry) => entry.storageSlotZero === '0' && entry.nonce === '0'))
  assert.equal(before.baseFeeWei, '10000000000')
  assert.equal(before.blockNumber, '0')
  const signed = await sign(lab, { value: '0.100000000000000001', maxFeePerGas: '30.000000001', maxPriorityFeePerGas: '2.000000001' })
  assert.equal(signed.sender, ADDRESSES.sender)
  assert.equal(signed.to, ADDRESSES.recipient)
  assert.equal(signed.chainId, '31337')
  assert.equal(signed.valueWei, '100000000000000001')
  assert.equal(signed.maxFeePerGasWei, '30000000001')
  assert.equal(signed.maxPriorityFeePerGasWei, '2000000001')
  assert.equal(signed.signatureValid, true)
  assert.match(signed.signature.yParity, /^[01]$/)
  assert.ok(BigInt(signed.signature.r) > 0n && BigInt(signed.signature.s) > 0n)
  assert.match(signed.serialized, /^0x02[0-9a-f]+$/)
  assert.match(signed.hash, /^0x[0-9a-f]{64}$/)
  assert.equal(signed.intrinsicGas, '21000')
  assert.deepEqual(await state(lab), before)
})

test('EOA transfer uses 21000 gas and exact EIP-1559 burn/tip/account balances', async () => {
  const lab = await createTransactionLab()
  const signed = await sign(lab)
  await submit(lab, signed)
  const { snapshot } = await mine(lab)
  const receipt = snapshot.receipts[0]
  assert.equal(receipt.hash, signed.hash)
  assert.equal(receipt.status, 1)
  assert.equal(receipt.exception, null)
  assert.equal(receipt.gasUsed, '21000')
  assert.equal(receipt.effectiveGasPriceWei, '12000000000')
  assert.equal(receipt.feeWei, '252000000000000')
  assert.equal(receipt.burnWei, '210000000000000')
  assert.equal(receipt.tipWei, '42000000000000')
  assert.equal(receipt.valueTransferredWei, '100000000000000000')
  assert.equal(receipt.from, ADDRESSES.sender)
  assert.equal(receipt.to, ADDRESSES.recipient)
  assert.equal(receipt.nonce, '0')
  assert.equal(receipt.blockNumber, '1')
  assert.equal(snapshot.blockNumber, '1')
  assert.equal(snapshot.pending.length, 0)
  assert.equal(balance(snapshot, 'recipient'), ETH / 10n)
  assert.equal(balance(snapshot, 'sender'), INITIAL - ETH / 10n - 252000000000000n)
  assertAccounting(snapshot, receipt)
})

test('custom destination balances are visible in receipts without accumulating or duplicating account rows', async () => {
  const lab = await createTransactionLab()
  const destination = '0x2000000000000000000000000000000000000005'
  await submit(lab, await sign(lab, { to: destination }))
  const { snapshot } = await mine(lab)
  const receipt = snapshot.receipts[0]
  const before = receipt.beforeAccounts.find((entry) => entry.address === destination)
  const after = receipt.afterAccounts.find((entry) => entry.address === destination)
  assert.equal(before.balanceWei, '0')
  assert.equal(after.balanceWei, '100000000000000000')
  assert.equal(balance(snapshot, 'sender'), INITIAL - ETH / 10n - 252000000000000n)
  assert.equal(balance(snapshot, 'beneficiary'), 42000000000000n)
  assert.equal(receipt.burnWei, '210000000000000')
  for (const accounts of [receipt.beforeAccounts, receipt.afterAccounts]) {
    assert.equal(accounts.length, 6)
    assert.equal(new Set(accounts.map((entry) => entry.address)).size, accounts.length)
  }
  const totalBefore = receipt.beforeAccounts.reduce((sum, entry) => sum + BigInt(entry.balanceWei), 0n)
  const totalAfter = receipt.afterAccounts.reduce((sum, entry) => sum + BigInt(entry.balanceWei), 0n)
  assert.equal(totalBefore - totalAfter, BigInt(receipt.burnWei))
  await submit(lab, await sign(lab, { nonce: '1' }))
  const next = (await mine(lab)).snapshot.receipts[0]
  for (const accounts of [next.beforeAccounts, next.afterAccounts]) {
    assert.equal(accounts.length, 5)
    assert.equal(accounts.filter((entry) => entry.address === ADDRESSES.recipient).length, 1)
    assert.equal(accounts.some((entry) => entry.address === destination), false)
  }
})

test('effective price is capped and unused gasLimit is not charged', async () => {
  const lab = await createTransactionLab()
  await submit(lab, await sign(lab, { gasLimit: '100000', maxFeePerGas: '11' }))
  const { snapshot } = await mine(lab)
  const receipt = snapshot.receipts[0]
  assert.equal(receipt.gasUsed, '21000')
  assert.equal(receipt.effectiveGasPriceWei, '11000000000')
  assert.equal(receipt.tipWei, '21000000000000')
  assertAccounting(snapshot, receipt)
})

for (const fixture of [
  { id: 'reverter', gasLimit: '100000', used: '43112', exception: 'revert' },
  { id: 'exhaustor', gasLimit: '50000', used: '50000', exception: 'out of gas' },
]) {
  test(`${fixture.id} writes then fails in actual EVM; storage/value roll back but nonce and fees remain`, async () => {
    const lab = await createTransactionLab()
    await submit(lab, await sign(lab, { to: ADDRESSES[fixture.id], gasLimit: fixture.gasLimit }))
    const { snapshot } = await mine(lab)
    const receipt = snapshot.receipts[0]
    assert.equal(receipt.status, 0)
    assert.equal(receipt.exception, fixture.exception)
    assert.equal(receipt.gasUsed, fixture.used)
    assert.equal(receipt.valueTransferredWei, '0')
    assert.equal(account(snapshot, fixture.id).storageSlotZero, '0')
    assert.equal(balance(snapshot, fixture.id), 0n)
    assert.equal(account(snapshot, 'sender').nonce, '1')
    assert.equal(balance(snapshot, 'sender'), INITIAL - BigInt(receipt.feeWei))
    assert.equal(snapshot.pending.length, 0)
    assertAccounting(snapshot, receipt)
    await submit(lab, await sign(lab, { nonce: '1' }))
    assert.equal((await mine(lab)).snapshot.receipts[0].status, 1)
  })
}

test('decimal, byte and field bounds reject atomically and dispatch recovers', async () => {
  const lab = await createTransactionLab()
  for (const fields of [
    { value: '1e-1' }, { value: '-1' }, { value: ' 1' }, { value: '0.0000000000000000001' },
    { value: '9'.repeat(101) }, { value: '9'.repeat(78) }, { value: 0.1 },
    { nonce: '0.1' }, { nonce: '18446744073709551615' },
    { gasLimit: '21000.0' }, { gasLimit: '20999' }, { gasLimit: '1000001' },
    { maxFeePerGas: '2', maxPriorityFeePerGas: '3' },
    { maxFeePerGas: '0.0000000001' }, { maxPriorityFeePerGas: 'Infinity' },
    { data: '0x0' }, { data: '00' }, { data: '0xzz' }, { data: `0x${'ff'.repeat(LIMITS.dataBytes + 1)}` },
    { to: '0x1234' },
  ]) await rejectsWithoutChange(lab, { action: 'sign', input: { ...DEFAULT_INPUT, ...fields } }, /./)
  for (const baseFeeGwei of ['-1', 'NaN', '1e9', '0.0000000001', '9'.repeat(101)]) {
    await rejectsWithoutChange(lab, { action: 'mine', baseFeeGwei }, /Comisión base/)
  }
  await rejectsWithoutChange(lab, { action: 'unknown' }, /Acción desconocida/)
  await rejectsWithoutChange(lab, null, /solicitud/)
  assert.equal((await sign(lab)).signatureValid, true)
})

test('admission rejects malformed, unsupported, wrong-chain/wrong-sender and intrinsic-invalid bytes without state changes', async () => {
  const lab = await createTransactionLab()
  const inputs = [
    '0x01', '0x02', '0x02ff', '0x0200', '0x0', `0x02${'00'.repeat(LIMITS.dataBytes + 513)}`,
    externallySigned({}, 2n), externallySigned({}, 1n, 1),
    externallySigned({ gasLimit: 20999n }),
    externallySigned({ gasLimit: 21000n, data: '0xff' }),
    externallySigned({ gasLimit: 1000001n }),
    externallySigned({ gasLimit: 100000n, data: `0x${'ff'.repeat(LIMITS.dataBytes + 1)}` }),
    externallySigned({ to: undefined, gasLimit: 100000n }),
    externallySigned({ gasLimit: 100000n, accessList: [{ address: ADDRESSES.recipient, storageKeys: [] }] }),
  ]
  for (const serialized of inputs) await rejectsWithoutChange(lab, { action: 'submit', serialized }, /./)
  const unsignedCommon = createCustomCommon({ chainId: 31337 }, Mainnet, { hardfork: Hardfork.Shanghai })
  const unsigned = createFeeMarket1559Tx({ to: ADDRESSES.recipient, gasLimit: 21000n, maxFeePerGas: GWEI, maxPriorityFeePerGas: 0n }, { common: unsignedCommon })
  await rejectsWithoutChange(lab, { action: 'submit', serialized: bytesToHex(unsigned.serialize()) }, /firma/)
})

test('upfront admission reserves maximum cap, not effective price, without charging rejection', async () => {
  const lab = await createTransactionLab()
  const signed = await sign(lab, { value: '9.9995' })
  // Value plus effective fee fits, but value plus 21000 * 30 gwei does not.
  await rejectsWithoutChange(lab, { action: 'submit', serialized: signed.serialized }, /Saldo insuficiente/)
  assert.equal(account(await state(lab), 'sender').nonce, '0')
})

test('future nonce and below-base head remain queued; inclusion never skips blocked nonce', async () => {
  const lab = await createTransactionLab()
  const future = await sign(lab, { nonce: '1' })
  await submit(lab, future)
  const gap = await mine(lab)
  assert.equal(gap.snapshot.receipts.length, 0)
  assert.equal(gap.snapshot.blockNumber, '0')
  assert.match(gap.snapshot.pending[0].reason, /nonce 0/)
  const blocked = await sign(lab, { maxFeePerGas: '1', maxPriorityFeePerGas: '0' })
  await submit(lab, blocked)
  const waiting = (await mine(lab)).snapshot
  assert.equal(waiting.pending.length, 2)
  assert.equal(waiting.receipts.length, 0)
  assert.equal(balance(waiting, 'sender'), INITIAL)
  assert.match(waiting.pending.find((entry) => entry.nonce === '0').reason, /comisión base/)
  const first = (await mine(lab, '0.5')).snapshot
  assert.equal(first.receipts.length, 1)
  assert.equal(first.receipts[0].hash, blocked.hash)
  assert.equal(first.pending.length, 1)
  assert.equal(first.pending[0].hash, future.hash)
  assert.equal(account(first, 'sender').nonce, '1')
  const second = (await mine(lab)).snapshot
  assert.equal(second.receipts[0].hash, future.hash)
  assert.equal(second.pending.length, 0)
  assert.equal(account(second, 'sender').nonce, '2')
  const stale = await sign(lab, { nonce: '0', value: '0.2' })
  await rejectsWithoutChange(lab, { action: 'submit', serialized: stale.serialized }, /Nonce antiguo/)
})

test('balance is revalidated after earlier inclusion; newly unaffordable transaction remains pending', async () => {
  const lab = await createTransactionLab()
  const later = await sign(lab, { nonce: '1', value: '9' })
  const earlier = await sign(lab, { value: '2' })
  await submit(lab, later)
  await submit(lab, earlier)
  const first = (await mine(lab)).snapshot
  assert.equal(first.receipts[0].hash, earlier.hash)
  assert.match(first.pending[0].reason, /Saldo insuficiente/)
  const second = (await mine(lab)).snapshot
  assert.deepEqual(second, first)
  assert.equal(second.pending[0].hash, later.hash)
  assert.equal(account(second, 'sender').nonce, '1')
})

test('replacement checks both caps atomically, rounds up and requires at least one wei', async () => {
  const lab = await createTransactionLab()
  const original = await sign(lab, { maxFeePerGas: '0.000000011', maxPriorityFeePerGas: '0' })
  await submit(lab, original)
  const insufficient = await sign(lab, { maxFeePerGas: '0.000000012', maxPriorityFeePerGas: '0.000000001' })
  await rejectsWithoutChange(lab, { action: 'submit', serialized: insufficient.serialized }, /Mínimos: comisión máxima 13 wei y propina máxima 1 wei/)
  const noTipBump = await sign(lab, { maxFeePerGas: '0.000000013', maxPriorityFeePerGas: '0' })
  await rejectsWithoutChange(lab, { action: 'submit', serialized: noTipBump.serialized }, /Reemplazo rechazado/)
  const replacement = await sign(lab, { maxFeePerGas: '0.000000013', maxPriorityFeePerGas: '0.000000001' })
  const accepted = await submit(lab, replacement)
  assert.equal(accepted.snapshot.pending.length, 1)
  assert.equal(accepted.snapshot.pending[0].hash, replacement.hash)
  assert.notEqual(replacement.hash, original.hash)
  await rejectsWithoutChange(lab, { action: 'submit', serialized: replacement.serialized }, /ya fue enviada/)
  const included = (await mine(lab, '0')).snapshot
  assert.equal(included.receipts[0].hash, replacement.hash)
  assert.equal(included.receipts[0].effectiveGasPriceWei, '1')
  assert.ok(!included.receipts.some((receipt) => receipt.hash === original.hash))
  await rejectsWithoutChange(lab, { action: 'submit', serialized: replacement.serialized }, /ya fue enviada o incluida/)
  assert.equal(account(await state(lab), 'sender').nonce, '1')
})

test('full pool rejects new nonce but permits valid replacement and preserves invalid original', async () => {
  const lab = await createTransactionLab()
  for (let nonce = 1; nonce <= LIMITS.pending; nonce++) {
    await submit(lab, await sign(lab, { nonce: String(nonce), value: '0' }))
  }
  const excess = await sign(lab, { nonce: '21', value: '0' })
  await rejectsWithoutChange(lab, { action: 'submit', serialized: excess.serialized }, /cola admite hasta 20/)
  const invalid = await sign(lab, { nonce: '1', value: '0', maxFeePerGas: '33', maxPriorityFeePerGas: '2' })
  await rejectsWithoutChange(lab, { action: 'submit', serialized: invalid.serialized }, /Reemplazo rechazado/)
  const replacement = await sign(lab, { nonce: '1', value: '0', maxFeePerGas: '33', maxPriorityFeePerGas: '2.2' })
  const { snapshot } = await submit(lab, replacement)
  assert.equal(snapshot.pending.length, LIMITS.pending)
  assert.equal(snapshot.pending.find((entry) => entry.nonce === '1').hash, replacement.hash)
})

test('maximum calldata is accepted with real intrinsic cost; one extra byte is rejected', async () => {
  const lab = await createTransactionLab()
  const signed = await sign(lab, { data: `0x${'ff'.repeat(LIMITS.dataBytes)}`, gasLimit: '1000000', value: '0' })
  assert.equal(signed.intrinsicGas, String(21000 + LIMITS.dataBytes * 16))
  await submit(lab, signed)
  const { snapshot } = await mine(lab)
  assert.equal(snapshot.receipts[0].status, 1)
  assert.equal(snapshot.receipts[0].gasUsed, signed.intrinsicGas)
  assertAccounting(snapshot, snapshot.receipts[0])
})

test('requests, returned inspections, pending and receipt snapshots cannot mutate engine state', async () => {
  const lab = await createTransactionLab()
  const input = { ...DEFAULT_INPUT }
  const signing = lab.dispatch({ action: 'sign', input })
  input.value = '9'
  const signed = (await signing).signed
  assert.equal(signed.valueWei, '100000000000000000')
  const request = { action: 'submit', serialized: signed.serialized }
  const admission = lab.dispatch(request)
  request.serialized = '0x00'
  const result = await admission
  result.signed.signature.r = '0'
  result.snapshot.pending[0].signature.r = '0'
  result.snapshot.pending.length = 0
  const queued = await state(lab)
  assert.equal(queued.pending.length, 1)
  assert.notEqual(queued.pending[0].signature.r, '0')
  const included = (await mine(lab)).snapshot
  included.receipts[0].afterAccounts[0].balanceWei = '0'
  included.receipts[0].hash = 'changed'
  included.accounts[0].nonce = '100'
  const actual = await state(lab)
  assert.equal(actual.receipts[0].hash, signed.hash)
  assert.notEqual(actual.receipts[0].afterAccounts[0].balanceWei, '0')
  assert.equal(account(actual, 'sender').nonce, '1')
})

test('concurrent submit/mine/reset/snapshot preserve order; rejection cannot poison dispatch', async () => {
  const lab = await createTransactionLab()
  const initial = await state(lab)
  const signed = await sign(lab)
  const admitted = submit(lab, signed)
  const rejected = lab.dispatch({ action: 'submit', serialized: '0x00' })
  const rejectedAssertion = assert.rejects(rejected, /tipo 0x02/)
  const included = mine(lab)
  const reset = lab.dispatch({ action: 'reset' })
  const final = state(lab)
  assert.equal((await admitted).snapshot.pending.length, 1)
  await rejectedAssertion
  assert.equal((await included).snapshot.receipts[0].hash, signed.hash)
  assert.deepEqual((await reset).snapshot, initial)
  assert.deepEqual(await final, initial)
  // Reset precedes the next admission, which can again use nonce 0.
  await submit(lab, signed)
  assert.equal((await state(lab)).pending.length, 1)
})

test('receipts are newest-first and bounded; reset clears all EVM/account/queue/history state', async () => {
  const lab = await createTransactionLab()
  const initial = await state(lab)
  let newest
  for (let nonce = 0; nonce <= LIMITS.receipts; nonce++) {
    const signed = await sign(lab, { nonce: String(nonce), value: '0' })
    await submit(lab, signed)
    newest = (await mine(lab)).snapshot
  }
  assert.equal(newest.receipts.length, LIMITS.receipts)
  assert.equal(newest.receipts[0].nonce, '20')
  assert.equal(newest.receipts.at(-1).nonce, '1')
  assert.equal(newest.blockNumber, '21')
  await submit(lab, await sign(lab, { nonce: '22', value: '0' }))
  await mine(lab, '99')
  assert.deepEqual((await lab.dispatch({ action: 'reset' })).snapshot, initial)
  await submit(lab, await sign(lab))
  assert.equal((await mine(lab)).snapshot.receipts[0].status, 1)
})
