import assert from 'node:assert/strict'
import test from 'node:test'
import solc from 'solc'
import { keccak_256 } from '@noble/hashes/sha3.js'
import { bytesToHex } from '@ethereumjs/util'
import { createContractSession } from './evm.mjs'
import { SOLIDITY_SOURCE } from './counter-source.mjs'
import { callData, constructorData, decodeLogs, readResult } from './contracts.mjs'

// Original test fixture. External self-call makes trace depth observable without RPC.
const TRACE_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
contract TraceExercise {
    uint256 public value;
    function inner() external { value = 12; }
    function nested(bool undo) external {
        this.inner();
        if (undo) revert("outer rollback");
    }
    function spin(uint256 rounds) external {
        for (uint256 i = 0; i < rounds; i++) { value += 1; }
    }
}
`

function compile(source, name) {
  const input = { language: 'Solidity', sources: { 'Exercise.sol': { content: source } }, settings: { evmVersion: 'shanghai', optimizer: { enabled: false }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'storageLayout'] } } } }
  const output = JSON.parse(solc.compile(JSON.stringify(input)))
  assert.deepEqual((output.errors || []).filter((item) => item.severity === 'error'), [], 'own fixture must compile through real solc')
  const contract = output.contracts['Exercise.sol'][name]
  return { name, file: 'Exercise.sol', abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}`, runtimeBytecode: `0x${contract.evm.deployedBytecode.object}`, storageLayout: contract.storageLayout, sourceHash: bytesToHex(keccak_256(new TextEncoder().encode(source))), compiler: `Solidity ${solc.version()}`, evmVersion: 'shanghai' }
}

const counter = compile(SOLIDITY_SOURCE, 'LabCounter')
const tracer = compile(TRACE_SOURCE, 'TraceExercise')
const account = (snapshot, id = 'alice') => snapshot.actors.find((item) => item.id === id)
const contractState = (snapshot, address) => snapshot.contracts.find((item) => item.address === address)

async function deployed(artifact = counter) {
  const session = await createContractSession()
  const deployment = await session.deploy(artifact, { actor: 'alice', constructorData: constructorData(artifact.abi) })
  assert.equal(deployment.receipt.status, 1)
  assert.ok(deployment.receipt.createdAddress)
  return { session, address: deployment.receipt.createdAddress, deployment, artifact }
}

async function value(lab) {
  const result = await lab.session.call({ to: lab.address, data: callData(lab.artifact.abi, 'value') })
  assert.equal(result.status, 1)
  return readResult(lab.artifact.abi, 'value', result.returnData)
}

function transact(lab, method, args = [], options = {}) {
  return lab.session.transact({ actor: 'alice', to: lab.address, data: callData(lab.artifact.abi, method, args), ...options })
}

function accounting(result, actor = 'alice') {
  const before = account(result.before, actor)
  const after = account(result.snapshot, actor)
  assert.equal(BigInt(after.nonce), BigInt(before.nonce) + 1n)
  assert.equal(BigInt(before.balanceWei) - BigInt(after.balanceWei), BigInt(result.receipt.feeWei))
  assert.equal(BigInt(result.receipt.feeWei), BigInt(result.receipt.gasUsed) * 12_000_000_000n)
  assert.ok(BigInt(result.receipt.gasUsed) > 0n)
  assert.equal(BigInt(result.snapshot.blockNumber), BigInt(result.before.blockNumber) + 1n)
  assert.equal(result.snapshot.receipts[0].hash, result.receipt.hash)
}

function boundedTrace(trace) {
  assert.ok(trace.records.length > 0 && trace.records.length <= 512)
  assert.equal(trace.memoryPrefixBytes, 128)
  assert.equal(trace.stackSuffixItems, 16)
  assert.deepEqual(trace.storageSlots, ['0', '1'])
  for (const record of trace.records) {
    assert.equal(record.phase, 'before')
    assert.ok(Number.isSafeInteger(record.pc) && record.pc >= 0)
    assert.ok(Number.isSafeInteger(record.depth) && record.depth >= 0)
    assert.ok(BigInt(record.gasLeft) >= 0n)
    assert.ok(record.stack.length <= 16 && record.stack.length <= record.stackSize)
    assert.ok((record.memory.length - 2) / 2 <= 128)
    assert.ok(BigInt(record.memoryBytes) >= BigInt((record.memory.length - 2) / 2))
    assert.equal(record.slots.length, 2)
    assert.ok(record.slots.every((slot) => /^\d+$/.test(slot)))
    assert.equal(record.storageError, undefined)
  }
}

test('real solc artifact deploys, writes 7, emits one ABI-decoded event and preserves deployment identity', async () => {
  const lab = await deployed()
  assert.equal(await value(lab), 0n)
  const owner = await lab.session.call({ to: lab.address, data: callData(counter.abi, 'owner') })
  assert.equal(readResult(counter.abi, 'owner', owner.returnData).toLowerCase(), account(lab.deployment.snapshot).address.toLowerCase())
  assert.match(lab.deployment.receipt.hash, /^0x[\da-f]{64}$/)
  assert.equal(lab.deployment.receipt.nonce, '0')
  accounting(lab.deployment)
  const metadata = contractState(lab.deployment.snapshot, lab.address)
  assert.equal(metadata.sourceHash, counter.sourceHash)
  assert.equal(metadata.compiler, counter.compiler)
  assert.equal(metadata.evmVersion, 'shanghai')
  assert.deepEqual(metadata.abi, counter.abi)
  assert.match(metadata.deploymentCodeHash, /^0x[\da-f]{64}$/)

  const written = await transact(lab, 'set_value', [7n])
  assert.equal(written.receipt.status, 1)
  assert.equal(await value(lab), 7n)
  assert.equal(contractState(written.snapshot, lab.address).slots[0], '7')
  const logs = decodeLogs(counter.abi, written.receipt.logs)
  assert.equal(logs.length, 1)
  assert.equal(logs[0].decoded.eventName, 'ValueChanged')
  assert.equal(logs[0].decoded.args.value, 7n)
  assert.equal(logs[0].decoded.args.sender.toLowerCase(), account(written.snapshot).address.toLowerCase())
  assert.equal(logs[0].address, lab.address)
  accounting(written)
})

test('edited Solidity logic executes different bytecode and stores 14 for input 7', async () => {
  const doubled = compile(SOLIDITY_SOURCE.replace('value = next;', 'value = next * 2;'), 'LabCounter')
  assert.notEqual(doubled.sourceHash, counter.sourceHash)
  assert.notEqual(doubled.bytecode, counter.bytecode)
  const lab = await deployed(doubled)
  const result = await transact(lab, 'set_value', [7n])
  assert.equal(result.receipt.status, 1)
  assert.equal(await value(lab), 14n)
  assert.equal(decodeLogs(doubled.abi, result.receipt.logs)[0].decoded.args.value, 7n, 'event expression remains independent of edited storage expression')
})

test('read and state-changing calls discard writes, logs, fees and nonce consumption', async () => {
  const lab = await deployed()
  await transact(lab, 'set_value', [7n])
  const before = await lab.session.snapshot()
  assert.equal(await value(lab), 7n)
  assert.deepEqual(await lab.session.snapshot(), before)
  const simulation = await lab.session.call({ actor: 'alice', to: lab.address, data: callData(counter.abi, 'set_value', [14n]) })
  assert.equal(simulation.status, 1)
  assert.ok(BigInt(simulation.gasUsed) > 0n)
  assert.equal(simulation.returnData, '0x')
  assert.equal(await value(lab), 7n)
  assert.deepEqual(await lab.session.snapshot(), before)
  const failed = await lab.session.call({ actor: 'alice', to: lab.address, data: callData(counter.abi, 'fail') })
  assert.equal(failed.status, 0)
  assert.equal(failed.exception, 'revert')
  assert.equal(await value(lab), 7n)
  assert.deepEqual(await lab.session.snapshot(), before)
})

test('wrong actor, value above 1000 and explicit revert preserve storage while charging sender fee and nonce', async () => {
  const lab = await deployed()
  await transact(lab, 'set_value', [7n])
  for (const [method, args, actor] of [['set_value', [8n], 'bob'], ['set_value', [1001n], 'alice'], ['fail', [], 'alice']]) {
    const result = await transact(lab, method, args, { actor })
    assert.equal(result.receipt.status, 0)
    assert.equal(result.receipt.exception, 'revert')
    assert.deepEqual(result.receipt.logs, [])
    assert.notEqual(result.receipt.returnData, '0x')
    assert.equal(await value(lab), 7n)
    assert.deepEqual(contractState(result.snapshot, lab.address).slots, contractState(result.before, lab.address).slots)
    accounting(result, actor)
    const other = actor === 'alice' ? 'bob' : 'alice'
    assert.deepEqual(account(result.snapshot, other), account(result.before, other))
  }
})

test('failed admission and invalid requests do not consume state, nonce, balance, block or receipt', async () => {
  const lab = await deployed()
  const before = await lab.session.snapshot()
  const requests = [
    [() => transact(lab, 'set_value', [7n], { gasLimit: '21000' }), /no se incluyó/],
    [() => transact(lab, 'set_value', [7n], { valueWei: '100000000000000000000' }), /no se incluyó/],
    [() => transact(lab, 'set_value', [7n], { actor: 'unknown' }), /Actor educativo desconocido/],
    [() => transact(lab, 'set_value', [7n], { gasLimit: '4000001' }), /supera el límite/],
    [() => lab.session.transact({ to: lab.address, data: '0xzz' }), /hexadecimal inválido/],
    [() => lab.session.deploy({ ...counter, evmVersion: 'cancun' }), /no válido para Shanghai/],
  ]
  for (const [request, expected] of requests) {
    await assert.rejects(request(), expected)
    assert.deepEqual(await lab.session.snapshot(), before)
  }
  const accepted = await transact(lab, 'set_value', [7n])
  assert.equal(accepted.receipt.status, 1)
  assert.equal(accepted.receipt.nonce, account(before).nonce)
})

test('trace records pre-instruction stack and storage, including reverted writes absent from accepted state', async () => {
  const lab = await deployed()
  await transact(lab, 'set_value', [7n])
  const result = await transact(lab, 'fail', [], { trace: true })
  assert.equal(result.receipt.status, 0)
  assert.equal(await value(lab), 7n)
  const trace = result.receipt.trace
  boundedTrace(trace)
  assert.equal(trace.truncated, false)
  assert.equal(trace.totalInstructions, trace.records.length)
  assert.equal(trace.records[0].pc, 0)
  assert.equal(trace.records[0].stackSize, 0)
  assert.deepEqual(trace.records[0].stack, [])
  assert.equal(trace.records[0].depth, 0)
  const index = trace.records.findIndex((record) => record.opcode === 'SSTORE')
  assert.ok(index >= 0)
  const store = trace.records[index]
  assert.equal(store.slots[0], '7', 'SSTORE sample is before the write')
  assert.equal(BigInt(store.stack.at(-1)), 0n, 'slot is top of pre-instruction stack')
  assert.equal(BigInt(store.stack.at(-2)), 999n, 'new value is below slot')
  assert.equal(trace.records[index + 1].slots[0], '999', 'next sample sees temporary write')
  assert.ok(trace.records.some((record) => record.opcode === 'REVERT' && record.slots[0] === '999'))
  assert.equal(contractState(result.snapshot, lab.address).slots[0], '7')
  accounting(result)
  const next = await transact(lab, 'set_value', [8n])
  assert.equal(next.receipt.trace, null, 'trace listener is removed after execution')
})

test('nested call depth is recorded and outer revert rolls back successful inner storage', async () => {
  const lab = await deployed(tracer)
  const result = await transact(lab, 'nested', [true], { trace: true })
  assert.equal(result.receipt.status, 0)
  boundedTrace(result.receipt.trace)
  assert.ok(result.receipt.trace.records.some((record) => record.depth === 0 && record.opcode === 'CALL'))
  assert.ok(result.receipt.trace.records.some((record) => record.depth === 1 && record.opcode === 'SSTORE'))
  assert.ok(result.receipt.trace.records.some((record) => record.depth === 0 && record.opcode === 'REVERT'))
  assert.equal(await value(lab), 0n)
  assert.equal(contractState(result.snapshot, lab.address).slots[0], '0')
  accounting(result)
  const success = await transact(lab, 'nested', [false], { trace: true })
  assert.equal(success.receipt.status, 1)
  assert.equal(await value(lab), 12n)
})

test('trace caps 512 records without stopping execution or changing final storage', async () => {
  const lab = await deployed(tracer)
  const result = await transact(lab, 'spin', [100n], { trace: true })
  assert.equal(result.receipt.status, 1)
  assert.equal(await value(lab), 100n)
  const trace = result.receipt.trace
  boundedTrace(trace)
  assert.equal(trace.records.length, 512)
  assert.ok(trace.totalInstructions > 512)
  assert.equal(trace.truncated, true)
  accounting(result)
})

test('out-of-gas rolls back writes but still consumes admitted transaction nonce and gas', async () => {
  const lab = await deployed(tracer)
  const result = await transact(lab, 'spin', [100n], { gasLimit: '50000', trace: true })
  assert.equal(result.receipt.status, 0)
  assert.equal(result.receipt.exception, 'out of gas')
  assert.equal(result.receipt.gasUsed, '50000')
  assert.equal(await value(lab), 0n)
  assert.equal(contractState(result.snapshot, lab.address).slots[0], '0')
  boundedTrace(result.receipt.trace)
  accounting(result)
})

test('reset removes deployed code, contracts and receipts and restores all three public actors', async () => {
  const lab = await deployed()
  await transact(lab, 'set_value', [7n])
  const old = await lab.session.snapshot()
  const reset = await lab.session.reset()
  assert.equal(reset.blockNumber, '0')
  assert.deepEqual(reset.contracts, [])
  assert.deepEqual(reset.receipts, [])
  assert.equal(reset.actors.length, 3)
  for (const item of reset.actors) {
    assert.equal(item.balanceWei, '100000000000000000000')
    assert.equal(item.nonce, '0')
    assert.deepEqual(item.slots, ['0', '0'])
  }
  assert.deepEqual(old.contracts[0].slots[0], '7', 'prior immutable snapshot survives reset')
  const empty = await lab.session.call({ to: lab.address, data: callData(counter.abi, 'value') })
  assert.equal(empty.status, 1)
  assert.equal(empty.returnData, '0x', 'old address has no deployed code after reset')
  assert.deepEqual(await lab.session.snapshot(), reset, 'call to old address leaves fresh state intact')
  const deployment = await lab.session.deploy(counter)
  assert.equal(deployment.receipt.status, 1)
  assert.equal(deployment.receipt.nonce, '0')
  assert.equal(deployment.receipt.createdAddress, lab.address, 'same public actor nonce deterministically recreates first address')
})
