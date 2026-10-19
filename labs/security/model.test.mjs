import test from 'node:test'
import assert from 'node:assert/strict'
import { createSecurityLab } from './model.mjs'
import { observedOutcome, UNIT } from './config.mjs'

const account = (snapshot, id) => snapshot.chain.actors.find((item) => item.id === id)
const setup = async (variant, prediction = 'legitimate-only') => {
  const lab = await createSecurityLab()
  const ready = await lab.prepare({ variant, prediction })
  return { lab, ready }
}
const assertCharged = (operation) => {
  assert.equal(BigInt(operation.accountAfter.nonce), BigInt(operation.accountBefore.nonce) + 1n)
  assert.ok(BigInt(operation.receipt.feeWei) > 0n)
}

test('interaction before effects permits three payments and leaves an insolvent honest claim', async () => {
  const { lab, ready } = await setup('before', 'recursive-only')
  const attempted = await lab.recursiveAttempt({ runId: ready.runId, trace: true })
  assert.equal(attempted.attempt.receipt.status, 1)
  assert.equal(attempted.positions.callbacks, '3')
  assert.equal(BigInt(attempted.positions.vaultWei), 8n * UNIT)
  assert.equal(BigInt(attempted.positions.honestCreditWei), 10n * UNIT)
  assert.equal(BigInt(attempted.positions.callerWei) - UNIT, 2n * UNIT)
  assert.equal(attempted.positions.callerCreditWei, '0')
  assert.equal(attempted.attempt.events.filter((event) => event.decoded?.eventName === 'Withdrawn').length, 3)
  assert.ok(attempted.attempt.receipt.trace.records.some((record) => record.depth > 1))
  assertCharged(attempted.attempt)
  assert.equal(BigInt(attempted.attempt.accountBefore.balanceWei) - BigInt(attempted.attempt.accountAfter.balanceWei), UNIT + BigInt(attempted.attempt.receipt.feeWei))
  const finished = await lab.legitimateWithdrawal({ runId: ready.runId })
  assert.equal(finished.legitimate.receipt.status, 0)
  assert.deepEqual(finished.positions, attempted.positions)
  assert.equal(finished.legitimate.events.length, 0)
  assertCharged(finished.legitimate)
  assert.equal(BigInt(finished.legitimate.accountBefore.balanceWei) - BigInt(finished.legitimate.accountAfter.balanceWei), BigInt(finished.legitimate.receipt.feeWei))
  assert.equal(observedOutcome(finished), 'recursive-only')
})

test('effects first rolls back recursive deposit and still pays the legitimate withdrawal', async () => {
  const { lab, ready } = await setup('effects')
  const attempted = await lab.recursiveAttempt({ runId: ready.runId })
  assert.equal(attempted.attempt.receipt.status, 0)
  assert.deepEqual(attempted.positions, ready.positions)
  assert.equal(attempted.attempt.events.length, 0)
  assertCharged(attempted.attempt)
  assert.equal(BigInt(attempted.attempt.accountBefore.balanceWei) - BigInt(attempted.attempt.accountAfter.balanceWei), BigInt(attempted.attempt.receipt.feeWei))
  const finished = await lab.legitimateWithdrawal({ runId: ready.runId })
  assert.equal(finished.legitimate.receipt.status, 1)
  assert.equal(finished.positions.vaultWei, '0')
  assert.equal(finished.positions.honestCreditWei, '0')
  assert.equal(BigInt(finished.legitimate.accountAfter.balanceWei) - BigInt(finished.legitimate.accountBefore.balanceWei), 10n * UNIT - BigInt(finished.legitimate.receipt.feeWei))
  assert.equal(observedOutcome(finished), 'legitimate-only')
})

test('blocking every withdrawal also blocks the honest user, unlike the effects-first repair', async () => {
  const { lab, ready } = await setup('blocked', 'neither')
  const attempted = await lab.recursiveAttempt({ runId: ready.runId })
  const finished = await lab.legitimateWithdrawal({ runId: ready.runId })
  assert.equal(attempted.attempt.receipt.status, 0)
  assert.equal(finished.legitimate.receipt.status, 0)
  assert.deepEqual(finished.positions, ready.positions)
  assert.equal(finished.legitimate.events.length, 0)
  assertCharged(finished.legitimate)
  assert.equal(observedOutcome(finished), 'neither')
})

test('changing version creates an equivalent new VM without carrying insolvency or prior receipts', async () => {
  const { lab, ready } = await setup('before')
  const old = await lab.recursiveAttempt({ runId: ready.runId })
  const next = await lab.prepare({ variant: 'effects', prediction: 'legitimate-only' })
  assert.notEqual(next.runId, old.runId)
  assert.deepEqual(next.positions, ready.positions)
  assert.equal(next.chain.receipts.length, 3)
  assert.equal(next.attempt, null)
  assert.equal(next.legitimate, null)
  assert.equal(account(next, 'alice').nonce, '2')
  assert.equal(account(next, 'carol').nonce, '1')
  assert.equal(old.positions.vaultWei, (8n * UNIT).toString())
  const before = await lab.snapshot()
  await assert.rejects(() => lab.recursiveAttempt({ runId: old.runId }))
  assert.deepEqual(await lab.snapshot(), before)
  assert.equal((await lab.recursiveAttempt({ runId: next.runId })).attempt.receipt.status, 0)
})

test('invalid configuration and trace options preserve accepted native balances, credit and history', async () => {
  const { lab, ready } = await setup('effects')
  const before = await lab.snapshot()
  for (const fields of [{ variant: '__proto__', prediction: 'neither' }, { variant: 'before', prediction: '' }, null]) {
    await assert.rejects(() => lab.prepare(fields))
    assert.deepEqual(await lab.snapshot(), before)
  }
  await assert.rejects(() => lab.recursiveAttempt({ runId: ready.runId, trace: 'true' }))
  assert.deepEqual(await lab.snapshot(), before)
  assert.equal((await lab.recursiveAttempt({ runId: ready.runId })).phase, 'attempted')
})

test('repeated or out-of-order actions cannot charge again or complete an unfinished comparison', async () => {
  const { lab, ready } = await setup('effects')
  await assert.rejects(() => lab.legitimateWithdrawal({ runId: ready.runId }))
  assert.deepEqual(await lab.snapshot(), ready)
  assert.throws(() => observedOutcome(ready))
  const attempted = await lab.recursiveAttempt({ runId: ready.runId })
  await assert.rejects(() => lab.recursiveAttempt({ runId: ready.runId }))
  assert.deepEqual(await lab.snapshot(), attempted)
  const finished = await lab.legitimateWithdrawal({ runId: ready.runId })
  await assert.rejects(() => lab.legitimateWithdrawal({ runId: ready.runId }))
  assert.deepEqual(await lab.snapshot(), finished)
})

test('mutating returned views cannot redirect a withdrawal or change actual contract balances', async () => {
  const { lab, ready } = await setup('effects')
  const attempted = await lab.recursiveAttempt({ runId: ready.runId })
  attempted.positions.vaultWei = '0'
  attempted.deployments.vault = attempted.deployments.caller
  attempted.chain.actors[0].balanceWei = '0'
  const finished = await lab.legitimateWithdrawal({ runId: ready.runId })
  assert.equal(finished.legitimate.receipt.status, 1)
  assert.equal(finished.legitimate.before.vaultWei, (10n * UNIT).toString())
  assert.equal(finished.positions.honestCreditWei, '0')
})

test('reset removes deployed programs and liabilities and makes old run identities unusable', async () => {
  const { lab, ready } = await setup('before')
  await lab.recursiveAttempt({ runId: ready.runId })
  const reset = await lab.reset()
  assert.equal(reset.phase, 'empty')
  assert.equal(reset.positions, null)
  assert.equal(reset.deployments, null)
  assert.equal(reset.chain.contracts.length, 0)
  assert.equal(reset.chain.receipts.length, 0)
  assert.equal(reset.attempt, null)
  assert.equal(reset.legitimate, null)
  for (const item of reset.chain.actors) {
    assert.equal(item.nonce, '0')
    assert.equal(BigInt(item.balanceWei), 100n * UNIT)
  }
  await assert.rejects(() => lab.recursiveAttempt({ runId: ready.runId }))
  assert.deepEqual(await lab.snapshot(), reset)
})
