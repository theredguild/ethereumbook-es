import test from 'node:test'
import assert from 'node:assert/strict'
import { createDeFiModel, UNIT as U, units, quoteMetrics, validSnapshot } from './model.mjs'

async function fresh(mode) {
  const model = await createDeFiModel()
  await model.start(mode)
  return model
}
function sum(values) { return values.reduce((a, b) => a + b, 0n) }
function conserve(snapshot) {
  const s = snapshot.ledger
  if (snapshot.mode === 'amm') {
    assert.equal(s.reserveX + sum(s.walletX), 4000n * U)
    assert.equal(s.reserveY + sum(s.walletY), 4000n * U)
  } else {
    assert.equal(s.collateral + sum(s.collateralWallet), 100n * U)
    assert.equal(s.pool + sum(s.stableWallet), 2000n * U)
    assert.equal(s.pool + s.debt, 1000n * U)
  }
}
function rollback(result, actor = 'alice') {
  assert.equal(result.receipt.status, 0)
  assert.deepEqual(result.snapshot.ledger, result.before.ledger)
  assert.equal(result.receipt.logs.length, 0)
  const before = result.before.evm.actors.find((a) => a.id === actor)
  const after = result.snapshot.evm.actors.find((a) => a.id === actor)
  assert.equal(BigInt(after.nonce), BigInt(before.nonce) + 1n)
  assert.equal(BigInt(before.balanceWei) - BigInt(after.balanceWei), BigInt(result.receipt.feeWei))
  assert.ok(BigInt(result.receipt.feeWei) > 0n)
  conserve(result.snapshot)
}
async function position(amount = 80n * U) {
  const model = await fresh('loan')
  assert.equal((await model.transact('deposit', [100n * U])).receipt.status, 1)
  assert.equal((await model.transact('borrow', [amount])).receipt.status, 1)
  return model
}

test('AMM executes both directions and preserves every internal asset; fees increase k', async () => {
  const model = await fresh('amm')
  for (const [actor, direction, amount] of [['alice', true, 100n * U], ['bob', false, 75n * U], ['carol', true, 5n * U]]) {
    const before = await model.snapshot()
    const quote = await model.quote(direction, amount)
    const result = await model.transact('swap', [direction, amount, quote.amountOut], actor)
    assert.equal(result.receipt.status, 1)
    const s = result.snapshot.ledger
    const index = ['alice', 'bob', 'carol'].indexOf(actor)
    assert.equal((direction ? s.walletX[index] : s.walletY[index]), (direction ? before.ledger.walletX[index] : before.ledger.walletY[index]) - amount)
    assert.equal((direction ? s.walletY[index] : s.walletX[index]), (direction ? before.ledger.walletY[index] : before.ledger.walletX[index]) + quote.amountOut)
    assert.ok(s.reserveX * s.reserveY > before.ledger.reserveX * before.ledger.reserveY)
    assert.equal(result.logs[0].decoded.eventName, 'Swap')
    assert.equal(result.logs[0].decoded.args.amountOut, quote.amountOut)
    conserve(result.snapshot)
  }
})

test('AMM freezes intent across Bob trade; actual stale minOut reverts, explicit requote succeeds', async () => {
  const model = await fresh('amm')
  const { quote } = await model.freeze({ xToY: true, amount: '100', toleranceBps: 100 })
  const beforeRead = await model.snapshot()
  await model.quote(true, 100n * U)
  assert.deepEqual(await model.snapshot(), beforeRead)
  const bob = await model.adverseTrade()
  assert.equal(bob.receipt.status, 1)
  assert.deepEqual(bob.snapshot.frozen, quote)
  const current = await model.quote(true, quote.amountIn)
  assert.ok(current.amountOut < quote.minOut)
  const metrics = quoteMetrics(quote, current.amountOut)
  assert.ok(metrics.curveImpact > 0n)
  assert.ok(metrics.feeEffect > 0n)
  assert.equal(metrics.totalVersusSpot, metrics.curveImpact + metrics.feeEffect)
  assert.ok(metrics.slippage > 0n)
  assert.equal(quoteMetrics(quote).slippage, 0n)
  rollback(await model.executeFrozen())
  const refreshed = await model.freeze({ xToY: true, amount: '100', toleranceBps: 100 })
  assert.ok(refreshed.quote.amountOut < quote.amountOut)
  const result = await model.executeFrozen()
  assert.equal(result.receipt.status, 1)
  conserve(result.snapshot)
})

test('AMM rejects zero, zero-output dust, excess bounds and bad minOut atomically; minimum viable dust succeeds', async () => {
  const model = await fresh('amm')
  for (const amount of [0n, 1n, 1001n * U, (1n << 256n) - 1n]) {
    rollback(await model.transact('swap', [true, amount, 1n]))
  }
  rollback(await model.transact('swap', [false, U, 0n]))
  const dust = await model.quote(true, 2n)
  assert.equal(dust.amountOut, 1n)
  assert.equal((await model.transact('swap', [true, 2n, 1n])).receipt.status, 1)
  conserve(await model.snapshot())
  await model.transact('swap', [true, 1000n * U - 2n, 1n])
  rollback(await model.transact('swap', [true, U, 1n]))
})

test('A frozen dust quote becoming zero preserves committed receipts and permits real revert and requote recovery', async () => {
  const model = await fresh('amm')
  const frozen = (await model.freeze({ xToY: true, amount: '0.000002', toleranceBps: 0 })).quote
  assert.equal(frozen.minOut, 1n)
  let last
  for (let i = 0; i < 5; i += 1) {
    last = await model.adverseTrade()
    assert.equal(last.receipt.status, 1)
    assert.equal(last.snapshot.ledger.reserveX, (1000n + 100n * BigInt(i + 1)) * U)
    assert.equal(last.snapshot.ledger.walletX[1], (1000n - 100n * BigInt(i + 1)) * U)
    assert.equal(last.snapshot.frozen.minOut, 1n)
    conserve(last.snapshot)
  }
  assert.equal(last.snapshot.currentQuote.amountOut, 0n)
  assert.equal(last.logs[0].decoded.eventName, 'Swap')
  assert.equal(last.snapshot.evm.actors[1].nonce, '5')
  assert.ok(validSnapshot(last.snapshot))
  const failed = await model.executeFrozen()
  rollback(failed)
  assert.match(failed.error, /zero output/)
  const before = await model.snapshot()
  await assert.rejects(model.freeze({ xToY: true, amount: '0.000002', toleranceBps: 0 }), /zero output/)
  assert.deepEqual(await model.snapshot(), before)
  await model.freeze({ xToY: true, amount: '1', toleranceBps: 0 })
  const recovered = await model.executeFrozen()
  assert.equal(recovered.receipt.status, 1)
  assert.equal(recovered.snapshot.ledger.walletX[0], 999n * U)
  assert.ok(recovered.snapshot.ledger.walletY[0] > 1000n * U)
  conserve(recovered.snapshot)
})

test('Input rejection does not include transaction; explicit edit invalidates frozen intent', async () => {
  const model = await fresh('amm')
  await model.freeze({ xToY: false, amount: '1', toleranceBps: 0 })
  const before = await model.snapshot()
  for (const value of ['0', '-1', '1e3', '0.0000001', '1001']) assert.throws(() => units(value))
  await assert.rejects(model.freeze({ xToY: true, amount: '1', toleranceBps: 5001 }))
  assert.deepEqual(await model.snapshot(), before)
  await model.dispatch({ action: 'invalidate' })
  await assert.rejects(model.executeFrozen(), /Congela/)
  assert.equal((await model.snapshot()).frozen, null)
})

test('Loan exact max LTV and health threshold use integer contract comparisons', async () => {
  const model = await position(100n * U)
  rollback(await model.transact('borrow', [1n]))
  const threshold = await position(75n * U)
  await threshold.transact('setPrice', [U])
  assert.equal((await threshold.snapshot()).ledger.health, U)
  rollback(await threshold.transact('liquidate', [U], 'bob'), 'bob')
  await threshold.transact('setPrice', [U - 1n])
  assert.equal((await threshold.snapshot()).ledger.health, U - 1n)
  assert.equal((await threshold.transact('liquidate', [U], 'bob')).receipt.status, 1)
  conserve(await threshold.snapshot())
})

test('Loan actual partial liquidation debits Bob, credits escrow and restores health; healthy repeat fails', async () => {
  const model = await position()
  assert.equal((await model.snapshot()).ledger.health, 1_875_000n)
  rollback(await model.transact('liquidate', [40n * U], 'bob'), 'bob')
  await model.transact('setPrice', [U])
  assert.equal((await model.snapshot()).ledger.health, 937_500n)
  rollback(await model.transact('liquidate', [40n * U + 1n], 'bob'), 'bob')
  rollback(await model.transact('liquidate', [40n * U], 'carol'), 'carol')
  const result = await model.transact('liquidate', [40n * U], 'bob')
  assert.equal(result.receipt.status, 1)
  assert.deepEqual(result.snapshot.ledger, { collateralWallet: [0n, 42n * U, 0n], stableWallet: [80n * U, 960n * U, 0n], collateral: 58n * U, debt: 40n * U, pool: 960n * U, price: U, health: 1_087_500n })
  assert.equal(result.logs[0].decoded.args.repaid, 40n * U)
  assert.equal(result.logs[0].decoded.args.seized, 42n * U)
  conserve(result.snapshot)
  rollback(await model.transact('liquidate', [20n * U], 'bob'), 'bob')
  await model.transact('repay', [40n * U])
  assert.equal((await model.transact('withdraw', [58n * U])).receipt.status, 1)
  const final = await model.snapshot()
  assert.equal(final.ledger.debt, 0n)
  assert.equal(final.ledger.collateralWallet[0], 58n * U)
  assert.equal(final.ledger.pool, 1000n * U)
  conserve(final)
})

test('Loan permissions, legitimate recovery and invalid actions preserve ledger atomically', async () => {
  const model = await position()
  rollback(await model.transact('setPrice', [U], 'bob'), 'bob')
  rollback(await model.transact('deposit', [U], 'carol'), 'carol')
  for (const name of ['borrow', 'repay', 'withdraw']) rollback(await model.transact(name, [U], 'bob'), 'bob')
  rollback(await model.transact('liquidate', [U]))
  for (const [name, args] of [['withdraw', [21n * U]], ['repay', [81n * U]], ['borrow', [21n * U]], ['deposit', [1n]], ['setPrice', [9999n]], ['setPrice', [10n * U + 1n]], ['repay', [0n]], ['borrow', [0n]], ['withdraw', [0n]]]) rollback(await model.transact(name, args))
  await model.transact('setPrice', [U])
  rollback(await model.transact('liquidate', [0n], 'bob'), 'bob')
  await model.transact('setPrice', [2n * U])
  assert.equal((await model.transact('repay', [80n * U])).receipt.status, 1)
  assert.equal((await model.transact('withdraw', [100n * U])).receipt.status, 1)
  conserve(await model.snapshot())
})

test('Loan deep insolvency rejects unaffordable seizure without clamping away debt', async () => {
  const model = await position()
  await model.transact('setPrice', [10_000n])
  const result = await model.transact('liquidate', [40n * U], 'bob')
  rollback(result, 'bob')
  assert.match(result.error, /seize bounds/)
  assert.equal(result.snapshot.ledger.debt, 80n * U)
  assert.equal(result.snapshot.ledger.collateral, 100n * U)
})

test('Loan floors fractional seizure, rejects zero seizure and one-unit debt half-cap', async () => {
  const model = await fresh('loan')
  await model.transact('deposit', [4n])
  await model.transact('borrow', [4n])
  await model.transact('setPrice', [1_400_000n])
  rollback(await model.transact('liquidate', [1n], 'bob'), 'bob')
  assert.equal((await model.transact('liquidate', [2n], 'bob')).receipt.status, 1)
  assert.equal((await model.snapshot()).ledger.collateralWallet[1], 1n)
  conserve(await model.snapshot())
  const tiny = await fresh('loan')
  await tiny.transact('deposit', [1n])
  await tiny.transact('borrow', [1n])
  await tiny.transact('setPrice', [10_000n])
  rollback(await tiny.transact('liquidate', [1n], 'bob'), 'bob')
})

test('Changing module creates fresh ledger, nonce history and run; reset clears intent and receipts', async () => {
  const model = await fresh('amm')
  await model.freeze({ xToY: true, amount: '10', toleranceBps: 0 })
  await model.executeFrozen()
  const old = await model.snapshot()
  const loan = (await model.start('loan')).snapshot
  assert.ok(validSnapshot(loan))
  assert.ok(loan.run > old.run)
  assert.equal(loan.frozen, null)
  assert.equal(loan.evm.receipts.length, 1)
  assert.equal(loan.ledger.debt, 0n)
  assert.equal(loan.evm.actors[1].nonce, '0')
  const reset = (await model.start('amm')).snapshot
  assert.equal(reset.ledger.reserveX, 1000n * U)
  assert.equal(reset.ledger.reserveY, 1000n * U)
  assert.deepEqual(reset.ledger.walletX, [1000n * U, 1000n * U, 1000n * U])
  assert.equal(reset.frozen, null)
  conserve(reset)
})
