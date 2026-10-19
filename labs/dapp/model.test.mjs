import test from 'node:test'
import assert from 'node:assert/strict'
import { createDappModel, artifact } from './model.mjs'
import { createLocalProvider, CHAIN_ID, GAS_LIMIT } from './provider.mjs'
import { callData, decodeLogs, readResult } from '../shared/contracts.mjs'

async function setup(executor) {
  const model = await createDappModel()
  const provider = createLocalProvider(executor ? executor(model.execute) : model.execute)
  await provider.initialize()
  return { model, provider }
}
async function grant(provider) {
  const promise = provider.request({ method: 'eth_requestAccounts' })
  await provider.approve(provider.view().pending.id)
  return promise
}
function transaction(provider, value = 7, overrides = {}) {
  const view = provider.view()
  return { from: view.accounts[0] || view.state.snapshot.actors.find((actor) => actor.id === view.selected).address, to: view.state.address, chainId: CHAIN_ID, gas: GAS_LIMIT, value: '0x0', data: callData(artifact.abi, 'set_value', [BigInt(value)]), ...overrides }
}
async function send(provider, value = 7, overrides) {
  const promise = provider.request({ method: 'eth_sendTransaction', params: [transaction(provider, value, overrides)] })
  const approval = provider.view().pending
  assert.ok(approval)
  await provider.approve(approval.id)
  const hash = await promise
  return provider.request({ method: 'eth_getTransactionReceipt', params: [hash] })
}
const account = (state, actor = 'alice') => state.snapshot.actors.find((entry) => entry.id === actor)
const rejectsCode = (promise, code) => assert.rejects(promise, (error) => error.code === code)

// These cases cross actual provider -> model -> signed EthereumJS execution.
test('permission rejection occurs before execution and connection grants no EVM changes', async () => {
  const { model, provider } = await setup()
  const before = await model.execute('state')
  assert.deepEqual(await provider.request({ method: 'eth_accounts' }), [])
  assert.equal(await provider.request({ method: 'eth_chainId' }), '0x7a69')
  await rejectsCode(provider.request({ method: 'eth_sendTransaction', params: [transaction(provider)] }), 4100)
  const connection = provider.request({ method: 'eth_requestAccounts' })
  const rejected = rejectsCode(connection, 4001)
  provider.reject(provider.view().pending.id)
  await rejected
  assert.deepEqual(await model.execute('state'), before)
  assert.equal((await grant(provider)).length, 1)
  assert.deepEqual(await model.execute('state'), before)
})

test('rejected unsigned transaction preserves value, receipts, balances and nonces', async () => {
  const { model, provider } = await setup()
  await grant(provider)
  const before = await model.execute('state')
  const promise = provider.request({ method: 'eth_sendTransaction', params: [transaction(provider)] })
  const rejected = rejectsCode(promise, 4001)
  assert.equal(provider.view().pending.decoded.method, 'set_value')
  assert.deepEqual(provider.view().pending.decoded.args, ['7'])
  provider.reject(provider.view().pending.id)
  await rejected
  assert.deepEqual(await model.execute('state'), before)
})

test('Alice approval includes signed setter, verifies readback, fee, receipt hash and committed event', async () => {
  const { provider } = await setup()
  await grant(provider)
  const before = provider.view().state
  const receipt = await send(provider)
  const after = provider.view().state
  assert.equal(receipt.status, '0x1')
  assert.equal(after.value, '7')
  assert.equal(BigInt(account(after).nonce), BigInt(account(before).nonce) + 1n)
  assert.equal(BigInt(account(before).balanceWei) - BigInt(account(after).balanceWei), BigInt(receipt.local.feeWei))
  assert.equal(BigInt(receipt.local.feeWei), BigInt(receipt.gasUsed) * 12000000000n)
  const read = await provider.request({ method: 'eth_call', params: [transaction(provider, 7, { data: callData(artifact.abi, 'value') }), 'latest'] })
  assert.equal(readResult(artifact.abi, 'value', read), 7n)
  const logs = await provider.request({ method: 'eth_getLogs', params: [{ address: after.address }] })
  assert.equal(logs.length, 1)
  assert.equal(logs[0].transactionHash, receipt.transactionHash)
  assert.equal(logs[0].blockNumber, receipt.blockNumber)
  const decoded = decodeLogs(artifact.abi, logs)
  assert.equal(decoded.length, 1)
  assert.equal(decoded[0].decoded.eventName, 'ValueChanged')
  assert.equal(decoded[0].decoded.args.value, 7n)
  assert.equal(decoded[0].decoded.args.sender.toLowerCase(), account(after).address.toLowerCase())
  assert.deepEqual(await provider.request({ method: 'eth_getTransactionReceipt', params: [receipt.transactionHash] }), receipt)
  assert.equal(await provider.request({ method: 'eth_getTransactionReceipt', params: [`0x${'ff'.repeat(32)}`] }), null)
})

for (const [actor, value] of [['alice', 1001], ['bob', 7]]) {
  test(`${actor} set_value(${value}) is included status 0, preserves storage, consumes actual nonce and fee`, async () => {
    const { provider } = await setup()
    await grant(provider)
    provider.selectActor(actor)
    const before = provider.view().state
    const receipt = await send(provider, value)
    const after = provider.view().state
    assert.equal(receipt.status, '0x0')
    assert.equal(after.value, '0')
    assert.deepEqual(receipt.logs, [])
    assert.equal(BigInt(account(after, actor).nonce), BigInt(account(before, actor).nonce) + 1n)
    assert.equal(BigInt(account(before, actor).balanceWei) - BigInt(account(after, actor).balanceWei), BigInt(receipt.local.feeWei))
    assert.ok(BigInt(receipt.local.feeWei) > 0n)
    assert.deepEqual(await provider.request({ method: 'eth_getLogs', params: [{ address: after.address }] }), [])
  })
}

test('eth_call discards successful setter writes and reverted fail writes without gas charges or logs', async () => {
  const { model, provider } = await setup()
  await grant(provider)
  const before = await model.execute('state')
  assert.equal(await provider.request({ method: 'eth_call', params: [transaction(provider, 7), 'latest'] }), '0x')
  assert.deepEqual(await model.execute('state'), before)
  await rejectsCode(provider.request({ method: 'eth_call', params: [transaction(provider, 7, { data: callData(artifact.abi, 'fail') }), 'latest'] }), 3)
  assert.deepEqual(await model.execute('state'), before)
  assert.equal(provider.view().unavailable, false)
})

test('account switch emits accountsChanged, restricts sender and revocation only removes permission', async () => {
  const { model, provider } = await setup()
  const events = []
  provider.on('accountsChanged', (accounts) => events.push(accounts))
  await grant(provider)
  const alice = provider.view().accounts[0]
  const before = await model.execute('state')
  provider.selectActor('bob')
  const bob = provider.view().accounts[0]
  assert.notEqual(alice, bob)
  assert.deepEqual(events.at(-1), [bob])
  assert.deepEqual(await provider.request({ method: 'eth_accounts' }), [bob])
  await rejectsCode(provider.request({ method: 'eth_sendTransaction', params: [transaction(provider, 7, { from: alice })] }), 4100)
  assert.throws(() => provider.selectActor('carol'), (error) => error.code === -32602)
  provider.revoke()
  assert.deepEqual(events.at(-1), [])
  assert.deepEqual(await provider.request({ method: 'eth_accounts' }), [])
  assert.deepEqual(await model.execute('state'), before)
  await rejectsCode(provider.request({ method: 'eth_call', params: [transaction(provider, 7)] }), 4100)
})

test('malformed requests, wrong chain, destination, calldata and unsupported methods reject before execution', async () => {
  const { model, provider } = await setup()
  await grant(provider)
  const before = await model.execute('state')
  for (const input of [null, {}, { method: 'eth_accounts', params: {} }, { method: 'eth_accounts', params: [1] }, { method: 'eth_accounts', extra: true }, { method: 'eth_sendTransaction', params: [] }, { method: 'eth_call', params: [transaction(provider), 'pending'] }, { method: 'eth_getTransactionReceipt', params: ['0x00'] }, { method: 'eth_getLogs', params: [{}] }, { method: 'eth_getLogs', params: [{ address: before.address, fromBlock: '0x3', toBlock: '0x1' }] }, ...[
    { chainId: '0x1' }, { to: `0x${'11'.repeat(20)}` }, { data: '0x12345678' }, { data: `${callData(artifact.abi, 'value')}00` }, { data: '0xz1' }, { value: '0x1' }, { gas: '0x1' }, { nonce: '0x1' },
  ].map((change) => ({ method: 'eth_sendTransaction', params: [transaction(provider, 7, change)] }))]) await rejectsCode(provider.request(input), -32602)
  await rejectsCode(provider.request({ method: 'eth_blockNumber' }), 4200)
  assert.deepEqual(await model.execute('state'), before)
})

test('one approval at a time, read operation works while consent waits, journal records bounded real outcomes', async () => {
  const { provider } = await setup()
  await grant(provider)
  const first = provider.request({ method: 'eth_sendTransaction', params: [transaction(provider)] })
  const firstId = provider.view().pending.id
  await rejectsCode(provider.request({ method: 'eth_sendTransaction', params: [transaction(provider, 8)] }), -32602)
  assert.equal(provider.view().pending.id, firstId)
  const read = await provider.request({ method: 'eth_call', params: [transaction(provider, 7, { data: callData(artifact.abi, 'value') })] })
  assert.equal(readResult(artifact.abi, 'value', read), 0n)
  const rejected = rejectsCode(first, 4001)
  provider.reject(firstId)
  await rejected
  for (let i = 0; i < 15; i += 1) await provider.request({ method: 'eth_chainId' })
  assert.equal(provider.view().journal.length, 20)
  assert.equal(provider.view().journal.at(-1).outcome, 'response')
  assert.equal(provider.view().journal.at(-1).result, CHAIN_ID)
})

test('reset cancels approval, ignores late old consent and clears historical receipts and permissions', async () => {
  const { provider } = await setup()
  await grant(provider)
  const receipt = await send(provider)
  const pending = provider.request({ method: 'eth_sendTransaction', params: [transaction(provider, 8)] })
  const staleId = provider.view().pending.id
  const canceled = rejectsCode(pending, 4001)
  await provider.initialize()
  await canceled
  assert.equal(await provider.approve(staleId), false)
  assert.equal(provider.view().state.value, '0')
  assert.equal(account(provider.view().state).nonce, '1')
  assert.deepEqual(await provider.request({ method: 'eth_accounts' }), [])
  assert.equal(await provider.request({ method: 'eth_getTransactionReceipt', params: [receipt.transactionHash] }), null)
  await grant(provider)
  const newPromise = provider.request({ method: 'eth_sendTransaction', params: [transaction(provider, 9)] })
  const freshId = provider.view().pending.id
  assert.notEqual(staleId, freshId)
  assert.equal(await provider.approve(staleId), false)
  assert.equal(provider.view().pending.id, freshId)
  await provider.approve(freshId)
  const newHash = await newPromise
  assert.equal(provider.view().state.value, '9')
  assert.notEqual(newHash, receipt.transactionHash)
})

test('revocation cancels pending promise and stale approval cannot execute after new grant', async () => {
  const { model, provider } = await setup()
  await grant(provider)
  const before = await model.execute('state')
  const old = provider.request({ method: 'eth_sendTransaction', params: [transaction(provider)] })
  const staleId = provider.view().pending.id
  const canceled = rejectsCode(old, 4001)
  provider.revoke()
  await canceled
  await grant(provider)
  const next = provider.request({ method: 'eth_sendTransaction', params: [transaction(provider, 8)] })
  const freshId = provider.view().pending.id
  assert.equal(await provider.approve(staleId), false)
  assert.equal(provider.view().pending.id, freshId)
  assert.deepEqual(await model.execute('state'), before)
  const rejected = rejectsCode(next, 4001)
  provider.reject(freshId)
  await rejected
})

test('reset during actual execution ignores late result and cannot complete a new request', async () => {
  let release
  let entered
  const started = new Promise((resolve) => { entered = resolve })
  const gate = new Promise((resolve) => { release = resolve })
  const { provider } = await setup((execute) => async (action, fields) => {
    const result = await execute(action, fields)
    if (action === 'send') { entered(); await gate }
    return result
  })
  await grant(provider)
  const old = provider.request({ method: 'eth_sendTransaction', params: [transaction(provider)] })
  const canceled = rejectsCode(old, 4001)
  const approval = provider.approve(provider.view().pending.id)
  await started
  const reset = provider.initialize()
  release()
  await Promise.all([approval, reset, canceled])
  assert.equal(provider.view().state.value, '0')
  assert.equal(provider.view().state.snapshot.receipts.length, 1)
  assert.equal(provider.view().permission, false)
  assert.equal(provider.view().running, false)
  assert.equal(provider.view().unavailable, false)
})

test('revocation during real signed execution ignores response, exposes no stale success and requires reset', async () => {
  let release
  let entered
  const started = new Promise((resolve) => { entered = resolve })
  const gate = new Promise((resolve) => { release = resolve })
  const { model, provider } = await setup((execute) => async (action, fields) => {
    const result = await execute(action, fields)
    if (action === 'send') { entered(); await gate }
    return result
  })
  await grant(provider)
  const old = provider.request({ method: 'eth_sendTransaction', params: [transaction(provider)] })
  const canceled = rejectsCode(old, 4001)
  const staleId = provider.view().pending.id
  const approved = provider.approve(staleId)
  await started
  provider.revoke()
  release()
  await Promise.all([approved, canceled])
  assert.equal(provider.view().permission, false)
  assert.equal(provider.view().unavailable, true)
  assert.equal(provider.view().running, false)
  assert.equal(provider.view().state.value, '0')
  assert.equal((await model.execute('state')).value, '7')
  assert.equal(await provider.approve(staleId), false)
  await rejectsCode(provider.request({ method: 'eth_requestAccounts' }), 4900)
  await provider.initialize()
  assert.equal(provider.view().state.value, '0')
  assert.equal(provider.view().unavailable, false)
})

test('logs and receipt lookups are bounded to last 20 actual committed receipts', async () => {
  const { provider } = await setup()
  await grant(provider)
  const first = await send(provider, 1)
  for (let value = 2; value <= 21; value += 1) await send(provider, value)
  const view = provider.view()
  assert.equal(view.state.value, '21')
  assert.equal(view.state.snapshot.receipts.length, 20)
  assert.equal(await provider.request({ method: 'eth_getTransactionReceipt', params: [first.transactionHash] }), null)
  const logs = await provider.request({ method: 'eth_getLogs', params: [{ address: view.state.address }] })
  assert.equal(logs.length, 20)
  assert.ok(logs.every((log) => log.transactionHash !== first.transactionHash))
  assert.equal(decodeLogs(artifact.abi, logs)[0].decoded.args.value, 2n)
  assert.equal(decodeLogs(artifact.abi, logs).at(-1).decoded.args.value, 21n)
  await rejectsCode(provider.request({ method: 'eth_accounts', params: null }), -32602)
})

test('revocation before queued approved execution prevents signing and preserves actual VM state', async () => {
  const { model, provider } = await setup()
  await grant(provider)
  const before = await model.execute('state')
  const promise = provider.request({ method: 'eth_sendTransaction', params: [transaction(provider)] })
  const canceled = rejectsCode(promise, 4001)
  const approval = provider.approve(provider.view().pending.id)
  provider.revoke()
  await Promise.all([approval, canceled])
  assert.deepEqual(await model.execute('state'), before)
  assert.equal(provider.view().permission, false)
  assert.equal(provider.view().running, false)
})

test('transport failure cancels unsigned consent, clears permissions and requires a fresh EVM', async () => {
  const { model, provider } = await setup()
  await grant(provider)
  const before = await model.execute('state')
  const pending = provider.request({ method: 'eth_sendTransaction', params: [transaction(provider)] })
  const rejected = rejectsCode(pending, 4900)
  const staleId = provider.view().pending.id
  provider.fail(new Error('Worker detenido durante consentimiento.'))
  await rejected
  assert.equal(provider.view().state, null)
  assert.equal(provider.view().permission, false)
  assert.equal(provider.view().unavailable, true)
  assert.equal(provider.view().pending, null)
  assert.deepEqual(await provider.request({ method: 'eth_accounts' }), [])
  assert.equal(await provider.approve(staleId), false)
  assert.deepEqual(await model.execute('state'), before)
  await provider.initialize()
  await grant(provider)
  assert.equal((await send(provider, 9)).status, '0x1')
  assert.equal(provider.view().state.value, '9')
})

test('failure of superseded initialization cannot replace a recovered session', async () => {
  const model = await createDappModel()
  let release
  let entered
  let first = true
  const started = new Promise((resolve) => { entered = resolve })
  const gate = new Promise((resolve) => { release = resolve })
  const provider = createLocalProvider(async (action, fields) => {
    const result = await model.execute(action, fields)
    if (first) {
      first = false
      entered()
      await gate
      throw new Error('Respuesta de un Worker perdido.')
    }
    return result
  })
  const obsolete = provider.initialize()
  await started
  provider.fail(new Error('Worker detenido durante inicialización.'))
  const recovered = provider.initialize()
  release()
  const [oldResult] = await Promise.all([obsolete, recovered])
  assert.equal(oldResult, null)
  assert.equal(provider.view().unavailable, false)
  assert.equal(provider.view().running, false)
  assert.equal(provider.view().permission, false)
  assert.equal(provider.view().state.value, '0')
  await grant(provider)
  assert.equal((await send(provider, 8)).status, '0x1')
  assert.equal(provider.view().state.value, '8')
})
