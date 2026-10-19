import assert from 'node:assert/strict'
import test from 'node:test'
import { createEvmLab, isExecutionResult, PRESETS, replayRecord, returnWord } from './model.mjs'

const actor = (snapshot) => snapshot.actors.find((item) => item.id === 'alice')
const contract = (run, snapshot = run.execution.snapshot) => snapshot.contracts.find((item) => item.address === run.address)
const draftFor = (preset, prediction = { status: '1', slot0: '0', returnValue: '5' }) => ({ runtime: preset.runtime, gasLimit: preset.gasLimit, prediction })

async function execute(lab, draft) {
  const prepared = lab.setDraft(draft)
  const result = await lab.execute(prepared.revision)
  assert.ok(isExecutionResult(result))
  return result.run
}

function accounting(operation) {
  assert.equal(BigInt(actor(operation.snapshot).nonce), BigInt(actor(operation.before).nonce) + 1n)
  assert.equal(BigInt(actor(operation.before).balanceWei) - BigInt(actor(operation.snapshot).balanceWei), BigInt(operation.receipt.feeWei))
  assert.equal(BigInt(operation.receipt.feeWei), BigInt(operation.receipt.gasUsed) * 12_000_000_000n)
}

function bounded(trace) {
  assert.ok(trace.records.length > 0 && trace.records.length <= 512)
  assert.equal(trace.memoryPrefixBytes, 128)
  assert.equal(trace.stackSuffixItems, 16)
  assert.deepEqual(trace.storageSlots, ['0', '1'])
  assert.equal(trace.truncated, trace.totalInstructions > trace.records.length)
  for (const record of trace.records) {
    assert.equal(record.phase, 'before')
    assert.ok(Number.isSafeInteger(record.pc) && record.pc >= 0)
    assert.ok(Number.isSafeInteger(record.depth) && record.depth >= 0)
    assert.ok(BigInt(record.gasLeft) >= 0n)
    assert.ok(record.stack.length <= 16 && record.stack.length <= record.stackSize)
    assert.ok((record.memory.length - 2) / 2 <= 128)
    assert.ok(BigInt(record.memoryBytes) >= BigInt((record.memory.length - 2) / 2))
    assert.equal(record.slots.length, 2)
    assert.equal(record.storageError, undefined)
  }
}

test('entered runtime deploys and returns 5, with actual preinstruction stack and memory', async () => {
  const lab = await createEvmLab()
  const run = await execute(lab, draftFor(PRESETS[0]))
  assert.equal(run.deployment.receipt.status, 1)
  assert.equal(run.deployment.receipt.returnData, `0x${PRESETS[0].runtime}`)
  assert.equal(run.execution.receipt.status, 1)
  assert.equal(returnWord(run.execution.receipt.returnData), '5')
  assert.equal(actor(run.execution.before).nonce, '1')
  assert.equal(actor(run.execution.snapshot).nonce, '2')
  assert.equal(contract(run).balanceWei, '0')
  assert.deepEqual(contract(run).slots, ['0', '0'])
  const trace = run.execution.receipt.trace
  bounded(trace)
  assert.equal(trace.totalInstructions, 8)
  assert.equal(trace.truncated, false)
  assert.deepEqual(trace.records.map((record) => record.pc), [0, 2, 4, 5, 7, 8, 10, 12])
  assert.deepEqual(trace.records[0].stack, [])
  assert.equal(trace.records[0].gasLeft, (BigInt(PRESETS[0].gasLimit) - 21_000n).toString())
  const add = trace.records.find((record) => record.opcode === 'ADD')
  assert.equal(add.pc, 4)
  assert.deepEqual(add.stack, ['0x2', '0x3'])
  const mstore = trace.records.find((record) => record.opcode === 'MSTORE')
  assert.equal(mstore.pc, 7)
  assert.deepEqual(mstore.stack, ['0x5', '0x0'])
  assert.equal(mstore.memoryBytes, '0')
  const returned = trace.records.at(-1)
  assert.equal(returned.opcode, 'RETURN')
  assert.deepEqual(returned.stack, ['0x20', '0x0'])
  assert.equal(returned.memoryBytes, '32')
  assert.equal(returnWord(returned.memory), '5')
  accounting(run.deployment)
  accounting(run.execution)
})

test('SSTORE commits 1 and SLOAD reads it; recorded slot samples are before each instruction', async () => {
  const lab = await createEvmLab()
  const run = await execute(lab, draftFor(PRESETS[1], { status: '1', slot0: '1', returnValue: '1' }))
  assert.equal(run.execution.receipt.status, 1)
  assert.equal(returnWord(run.execution.receipt.returnData), '1')
  assert.deepEqual(contract(run).slots, ['1', '0'])
  const records = run.execution.receipt.trace.records
  assert.deepEqual(records.find((record) => record.pc === 4).slots, ['0', '0'])
  assert.deepEqual(records.find((record) => record.pc === 5).slots, ['1', '0'])
  assert.deepEqual(records.find((record) => record.pc === 7).stack, ['0x0'])
  assert.deepEqual(records.find((record) => record.pc === 8).stack, ['0x1'])
  assert.equal(returnWord(records.at(-1).memory), '1')
  accounting(run.execution)
})

test('REVERT shows intermediate write 9 but rolls back accepted storage and charges nonce and fee', async () => {
  const lab = await createEvmLab()
  const run = await execute(lab, draftFor(PRESETS[2], { status: '0', slot0: '0', returnValue: 'vacío' }))
  assert.equal(run.execution.receipt.status, 0)
  assert.equal(run.execution.receipt.exception, 'revert')
  assert.equal(run.execution.receipt.returnData, '0x')
  const record = run.execution.receipt.trace.records.at(-1)
  assert.equal(record.pc, 9)
  assert.equal(record.opcode, 'REVERT')
  assert.deepEqual(record.slots, ['9', '0'])
  assert.deepEqual(contract(run).slots, ['0', '0'])
  assert.deepEqual(run.execution.receipt.logs, [])
  accounting(run.execution)
})

test('loop exhausts all admitted 64000 gas, rolls back, and continues after 512 recorded instructions', async () => {
  const lab = await createEvmLab()
  const run = await execute(lab, draftFor(PRESETS[3], { status: '0', slot0: '0', returnValue: 'vacío' }))
  assert.equal(run.execution.receipt.status, 0)
  assert.equal(run.execution.receipt.exception, 'out of gas')
  assert.equal(run.execution.receipt.gasUsed, '64000')
  assert.equal(run.execution.receipt.feeWei, '768000000000000')
  assert.deepEqual(contract(run).slots, ['0', '0'])
  const trace = run.execution.receipt.trace
  bounded(trace)
  assert.equal(trace.records.length, 512)
  assert.ok(trace.totalInstructions > 512)
  assert.equal(trace.truncated, true)
  assert.equal(trace.records[3].pc, 5)
  assert.equal(trace.records[3].opcode, 'JUMPDEST')
  assert.equal(trace.records[5].pc, 8)
  assert.equal(trace.records[5].opcode, 'JUMP')
  assert.deepEqual(trace.records[5].stack, ['0x5'])
  assert.deepEqual(trace.records.at(-1).slots, ['1', '0'])
  accounting(run.execution)
})

test('finite execution commits a write after the trace cap instead of stopping with the recorder', async () => {
  const lab = await createEvmLab()
  const run = await execute(lab, { runtime: `${'5b'.repeat(600)}600760005560006000f3`, gasLimit: '64000', prediction: { status: '1', slot0: '7', returnValue: 'vacío' } })
  const trace = run.execution.receipt.trace
  assert.equal(run.execution.receipt.status, 1)
  assert.equal(trace.records.length, 512)
  assert.equal(trace.totalInstructions, 606)
  assert.equal(trace.truncated, true)
  assert.ok(trace.records.every((record) => record.opcode === 'JUMPDEST' && record.slots[0] === '0'))
  assert.deepEqual(contract(run).slots, ['7', '0'])
})

test('samples bound stack to last 16, memory to first 128, and read actual slots 0 and 1', async () => {
  const lab = await createEvmLab()
  const run = await execute(lab, { runtime: `60026001556007600052600960a052${'6001'.repeat(20)}00`, gasLimit: '100000', prediction: { status: '1', slot0: '0', returnValue: 'vacío' } })
  bounded(run.execution.receipt.trace)
  const stop = run.execution.receipt.trace.records.at(-1)
  assert.equal(stop.opcode, 'STOP')
  assert.equal(stop.stackSize, 20)
  assert.deepEqual(stop.stack, Array(16).fill('0x1'))
  assert.equal(stop.memoryBytes, '192')
  assert.equal((stop.memory.length - 2) / 2, 128)
  assert.equal(BigInt(`0x${stop.memory.slice(2, 66)}`), 7n)
  assert.deepEqual(stop.slots, ['0', '2'])
  assert.deepEqual(contract(run).slots, ['0', '2'])
})

test('editing a PUSH byte executes the new runtime and returns 7, without reusing old result identity', async () => {
  const lab = await createEvmLab()
  const first = await execute(lab, draftFor(PRESETS[0]))
  const changed = await execute(lab, { ...draftFor(PRESETS[0]), runtime: '600460030160005260206000f3' })
  assert.equal(returnWord(changed.execution.receipt.returnData), '7')
  assert.notEqual(changed.id, first.id)
  assert.notEqual(changed.address, first.address)
  assert.notEqual(changed.source.hash, first.source.hash)
  assert.equal(changed.deployment.receipt.returnData, changed.input.runtime)
  assert.throws(() => lab.replay(first.id, 0), /obsoleta/)
})

test('previous, next and random replay only copy records; accepted VM state and history never change', async () => {
  const lab = await createEvmLab()
  const run = await execute(lab, draftFor(PRESETS[1], { status: '1', slot0: '1', returnValue: '1' }))
  const before = await lab.snapshot()
  for (const index of [0, 1, 2, 1, 0, 9, 4, 8]) assert.deepEqual(lab.replay(run.id, index), replayRecord(run, index, run.id))
  const copy = lab.replay(run.id, 0)
  copy.stack.push('0xff')
  assert.deepEqual(lab.replay(run.id, 0).stack, [])
  assert.throws(() => lab.replay(run.id, -1), /Índice/)
  assert.throws(() => lab.replay(run.id, 10), /Índice/)
  assert.deepEqual(await lab.snapshot(), before)
})

test('malformed input and out-of-range gas fail admission before deployment, without nonce, fee or history', async () => {
  const lab = await createEvmLab()
  const before = (await lab.snapshot()).snapshot
  const cases = [
    ['', /vacío/], ['0x', /vacío/], ['600', /impar/], ['0xgg', /inválido/], ['60 00', /inválido/], ['00'.repeat(4097), /4096/],
  ]
  for (const [runtime, expected] of cases) {
    const prepared = lab.setDraft({ ...draftFor(PRESETS[0]), runtime })
    await assert.rejects(lab.execute(prepared.revision), expected)
    assert.deepEqual((await lab.snapshot()).snapshot, before)
  }
  for (const gasLimit of ['20999', '200001', '1.5', '-1', '']) {
    const prepared = lab.setDraft({ ...draftFor(PRESETS[0]), gasLimit })
    await assert.rejects(lab.execute(prepared.revision), /21000 y 200000/)
    assert.deepEqual((await lab.snapshot()).snapshot, before)
  }
  const missingPrediction = lab.setDraft({ ...draftFor(PRESETS[0]), prediction: { status: '', slot0: '0', returnValue: '5' } })
  await assert.rejects(lab.execute(missingPrediction.revision), /Predicción/)
  assert.deepEqual((await lab.snapshot()).snapshot, before)
})

test('invalid opcode, stack underflow, TLOAD and TSTORE are included Shanghai failures, not validation refusals', async () => {
  const lab = await createEvmLab()
  for (const [runtime, exception] of [['fe', /invalid opcode/], ['01', /stack underflow/], ['5c', /invalid opcode/], ['5d', /invalid opcode/]]) {
    const run = await execute(lab, { runtime, gasLimit: '50000', prediction: { status: '0', slot0: '0', returnValue: 'vacío' } })
    assert.equal(run.execution.receipt.status, 0)
    assert.match(run.execution.receipt.exception, exception)
    assert.equal(run.execution.receipt.gasUsed, '50000')
    assert.deepEqual(contract(run).slots, ['0', '0'])
    accounting(run.execution)
  }
})

test('runtime at 4096-byte boundary can deploy and execute; 21000 gas can include a STOP', async () => {
  const lab = await createEvmLab()
  const run = await execute(lab, { runtime: '00'.repeat(4096), gasLimit: '21000', prediction: { status: '1', slot0: '0', returnValue: 'vacío' } })
  assert.equal(run.deployment.receipt.status, 1)
  assert.equal(run.deployment.receipt.returnData, `0x${'00'.repeat(4096)}`)
  assert.equal(run.execution.receipt.status, 1)
  assert.equal(run.execution.receipt.gasUsed, '21000')
  assert.equal(run.execution.receipt.trace.totalInstructions, 1)
})

test('edit invalidates trace, stale revisions cannot execute, and reset clears actual state and history', async () => {
  const lab = await createEvmLab()
  const run = await execute(lab, draftFor(PRESETS[0]))
  const old = lab.setDraft(draftFor(PRESETS[1]))
  lab.setDraft({ ...draftFor(PRESETS[0]), runtime: '0xzz' })
  assert.throws(() => lab.replay(run.id, 0), /obsoleta/)
  const before = (await lab.snapshot()).snapshot
  await assert.rejects(lab.execute(old.revision), /obsoleto/)
  assert.deepEqual((await lab.snapshot()).snapshot, before)
  const reset = await lab.reset()
  assert.equal(reset.runId, null)
  assert.equal(actor(reset.snapshot).nonce, '0')
  assert.equal(actor(reset.snapshot).balanceWei, '100000000000000000000')
  assert.equal(reset.snapshot.blockNumber, '0')
  assert.deepEqual(reset.snapshot.contracts, [])
  assert.deepEqual(reset.snapshot.receipts, [])
  assert.throws(() => lab.replay(run.id, 0), /obsoleta/)
  const fresh = await execute(lab, draftFor(PRESETS[0]))
  assert.notEqual(fresh.id, run.id)
})

test('reset during a pending execution prevents stale trace publication and leaves a fresh VM', async () => {
  const lab = await createEvmLab()
  const prepared = lab.setDraft(draftFor(PRESETS[3], { status: '0', slot0: '0', returnValue: 'vacío' }))
  const pending = lab.execute(prepared.revision)
  await Promise.resolve()
  const reset = lab.reset()
  await assert.rejects(pending, /obsoleto/)
  const state = await reset
  assert.equal(state.runId, null)
  assert.equal(actor(state.snapshot).nonce, '0')
  assert.equal(actor(state.snapshot).balanceWei, '100000000000000000000')
  assert.deepEqual(state.snapshot.contracts, [])
  assert.deepEqual(state.snapshot.receipts, [])
})
