import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { groth16, curves } from 'snarkjs'
import { MAX_32, MAX_128, batchCommitment } from '../shared/proof-inputs.mjs'
import { executeBatch, createSession, resetSession, execute, postClaim, publishData, challenge, windowOpen, advanceWindow, beginProve, beginVerify, finishProve, finishVerify, failOperation, cancelOperation, changeCandidate, proofInput, statementMatches, settle, advanceFinality, withdraw, withdrawalEligible, observableFlags } from './model.mjs'

const wasm = fileURLToPath(new URL('./artifacts/circuit.wasm', import.meta.url))
const zkey = fileURLToPath(new URL('./artifacts/final.zkey', import.meta.url))
const verificationKey = JSON.parse(await readFile(new URL('./artifacts/verification-key.json', import.meta.url), 'utf8'))
const options = { mode: 'validity', before: ['100', '100'], amountAB: '30', amountBA: '10', salt: '123456789012345678901234567890' }

function claimed(mode = 'validity', after = ['80', '120'], overrides = {}) {
  return postClaim(execute(createSession(), { ...options, mode, ...overrides }), after)
}
function publish(state) { return publishData(state, state.run) }
function expired(state) { return advanceWindow(advanceWindow(advanceWindow(state))) }
async function prove(input) {
  return { ...await groth16.fullProve(input, wasm, zkey, undefined, { memorySize: 256 }, { singleThread: true }), relation: 'batch' }
}
async function verify(candidatePackage) {
  return { valid: await groth16.verify(verificationKey, candidatePackage.publicSignals, candidatePackage.proof), relation: 'batch' }
}
let generated
function actualProof() { return generated ??= prove(proofInput(claimed())) }
async function withCandidate(state = claimed()) {
  const started = beginProve(state)
  return finishProve(started.state, started.ticket, await actualProof())
}
async function verified(state = claimed()) {
  const candidate = await withCandidate(state)
  const started = beginVerify(candidate)
  return finishVerify(started.state, started.ticket, await verify(started.state.candidate.package))
}

after(async () => {
  if (generated) {
    const curve = await curves.getCurveFromName('bn128')
    await curve.terminate()
  }
})

test('ordered execution records actual intermediate balances and conserves units', () => {
  const result = executeBatch(options)
  assert.deepEqual(result.middle, ['70', '130'])
  assert.deepEqual(result.after, ['80', '120'])
  for (const pair of [result.before, result.middle, result.after]) assert.equal(pair.reduce((sum, value) => sum + BigInt(value), 0n), 200n)
  assert.throws(() => { result.after[0] = '999' }, TypeError)
  assert.throws(() => { result.amountAB = '31' }, TypeError)
  for (let ab = 0; ab <= 100; ab += 10) {
    for (let ba = 0; ba <= 100 + ab; ba += 10) {
      const replay = executeBatch({ ...options, amountAB: String(ab), amountBA: String(ba) })
      assert.equal(BigInt(replay.after[0]) + BigInt(replay.after[1]), 200n)
    }
  }
})

test('32-bit bounds include intermediate states, rejecting overspend even with acceptable net result', () => {
  assert.throws(() => executeBatch({ ...options, amountAB: '101', amountBA: '81' }), /Transferencia 1/)
  assert.throws(() => executeBatch({ ...options, amountBA: '131' }), /Transferencia 2/)
  assert.throws(() => executeBatch({ ...options, before: ['100', MAX_32.toString()], amountAB: '1', amountBA: '1' }), /Transferencia 1/)
  assert.deepEqual(executeBatch({ ...options, before: [MAX_32.toString(), '0'], amountAB: MAX_32.toString(), amountBA: MAX_32.toString(), salt: MAX_128.toString() }).after, [MAX_32.toString(), '0'])
  for (const value of ['-1', '01', '1.5', '', '4294967296', '9'.repeat(79)]) assert.throws(() => executeBatch({ ...options, amountAB: value }))
  assert.throws(() => executeBatch({ ...options, salt: (MAX_128 + 1n).toString() }), /Salt/)
})

test('commitment binds ordered amounts and salt, not merely net balance change', () => {
  const first = executeBatch(options)
  const sameNet = executeBatch({ ...options, amountAB: '31', amountBA: '11' })
  assert.deepEqual(sameNet.after, first.after)
  assert.notEqual(sameNet.commitment, first.commitment)
  assert.notEqual(batchCommitment('10', '30', options.salt), first.commitment)
  assert.notEqual(batchCommitment('30', '10', '42'), first.commitment)
})

test('publication checks commitment and replays from immutable claimed before, without declaring claim valid', () => {
  const wrong = claimed('optimistic', ['81', '119'])
  assert.equal(wrong.dataAvailable, false)
  assert.throws(() => publishData(wrong, { ...wrong.run, amountAB: '31' }), /compromiso/)
  assert.equal(wrong.dataAvailable, false)
  const available = publishData(wrong, { ...wrong.run, before: ['999', '999'] })
  assert.deepEqual(available.publication.replay, ['80', '120'])
  assert.equal(available.dataAvailable, true)
  assert.equal(available.invalidated, false)
  assert.equal(available.settled, false)
  assert.equal(available.proofVerified, false)
  assert.throws(() => { available.claim.after[0] = '80' }, TypeError)
})

test('fraud challenge requires published data, uses replay, and invalidation survives expiration', () => {
  const wrong = claimed('optimistic', ['81', '119'])
  assert.throws(() => challenge(wrong), /Faltan datos/)
  const invalid = challenge(publish(wrong))
  assert.equal(invalid.invalidated, true)
  assert.equal(invalid.challengeResult, 'invalidated')
  assert.throws(() => challenge(invalid), /cerrada/)
  const waited = expired(invalid)
  assert.equal(waited.invalidated, true)
  assert.throws(() => settle(waited), /invalidada/)
  assert.equal(waited.settled, false)
})

test('correct claim challenge fails; exact three-step boundary closes challenges', () => {
  let state = publish(claimed('optimistic'))
  assert.throws(() => settle(state), /tres pasos/)
  state = advanceWindow(advanceWindow(state))
  assert.equal(windowOpen(state), true)
  state = challenge(state)
  assert.equal(state.challengeResult, 'failed-correct-claim')
  assert.equal(state.invalidated, false)
  state = advanceWindow(state)
  assert.equal(windowOpen(state), false)
  assert.throws(() => challenge(state), /cerrada/)
  assert.throws(() => advanceWindow(state), /otro avance/)
  const accepted = settle(state)
  assert.equal(accepted.settlement.basis, 'optimistic-assumption')
  assert.equal(accepted.proofVerified, false)
})

test('uncontested wrong optimistic claim stays an explicit assumption, not proven validity', () => {
  const expiredWrong = expired(claimed('optimistic', ['81', '119']))
  assert.throws(() => challenge(publish(expiredWrong)), /cerrada/)
  const accepted = settle(expiredWrong)
  assert.deepEqual(accepted.settlement.claim.after, ['81', '119'])
  assert.equal(accepted.settlement.basis, 'optimistic-assumption')
  assert.equal(accepted.dataAvailable, false)
  assert.equal(accepted.proofVerified, false)
})

test('settlement, data, synthetic finality and one-time withdrawal remain separate gates', () => {
  let state = claimed('optimistic')
  assert.throws(() => advanceFinality(state), /Primero liquida/)
  assert.throws(() => withdraw(state), /Retiro bloqueado/)
  state = settle(expired(state))
  assert.equal(state.settled, true)
  assert.equal(state.l1Finalized, false)
  assert.throws(() => withdraw(state), /Retiro bloqueado/)
  state = advanceFinality(state)
  assert.equal(state.finalityStep, 1)
  assert.equal(state.l1Finalized, false)
  state = advanceFinality(state)
  assert.equal(state.l1Finalized, true)
  assert.equal(withdrawalEligible(state), false)
  assert.throws(() => withdraw(state), /Retiro bloqueado/)
  state = publish(state)
  assert.equal(withdrawalEligible(state), true)
  const withdrawn = withdraw(state)
  assert.equal(withdrawn.withdrawn, true)
  assert.equal(withdrawalEligible(withdrawn), false)
  assert.throws(() => withdraw(withdrawn), /Retiro bloqueado/)
  assert.throws(() => advanceFinality(withdrawn), /dos avances/)
  assert.throws(() => settle(withdrawn), /ya está liquidada/)
})

test('real Groth16 proof binds exact before, claimed after and commitment; package excludes witness', async () => {
  const raw = await actualProof()
  assert.equal((await verify(raw)).valid, true)
  assert.deepEqual(raw.publicSignals, claimed().claim.publicSignals)
  for (const index of [0, 1, 2, 3, 4]) {
    const signals = [...raw.publicSignals]
    signals[index] = (BigInt(signals[index]) + 1n).toString()
    assert.equal((await verify({ ...raw, publicSignals: signals })).valid, false)
  }
  const state = await verified()
  assert.equal(state.proofVerified, true)
  assert.equal(state.dataAvailable, false)
  assert.equal(state.settled, false)
  assert.equal(state.l1Finalized, false)
  assert.deepEqual(Object.keys(state.candidate.package).sort(), ['proof', 'publicSignals', 'relation'])
  const publicJSON = JSON.stringify(state.candidate.package)
  assert.equal(publicJSON.includes('salt'), false)
  assert.equal(publicJSON.includes('amountAB'), false)
  assert.equal(publicJSON.includes('witness'), false)
  assert.equal(statementMatches(state.candidate.package, claimed('validity', ['81', '119']).claim), false)
  assert.throws(() => settle(claimed()), /Falta verificar/)
  assert.equal(settle(state).settlement.basis, 'proven-bounded-relation')
})

test('actual circuit rejects wrong claimed after and same-net different witness bound to old commitment', async () => {
  await actualProof()
  await assert.rejects(prove(proofInput(claimed('validity', ['81', '119']))))
  const input = proofInput(claimed())
  await assert.rejects(prove({ ...input, amountAB: '31', amountBA: '11' }))
  await assert.rejects(prove({ ...input, amountAB: '101', amountBA: '81', commitment: batchCommitment('101', '81', options.salt) }))
})

test('candidate tamper, restoration and fresh generation invalidate prior real verification', async () => {
  for (const change of ['proof', 'before', 'after', 'commitment']) {
    let state = changeCandidate(await verified(), change)
    assert.equal(state.proofVerified, false)
    assert.throws(() => settle(state), /Falta verificar/)
    const started = beginVerify(state)
    state = finishVerify(started.state, started.ticket, await verify(started.state.candidate.package))
    assert.equal(state.proofVerified, false)
    assert.equal(state.verificationResult, 'rejected')
    state = changeCandidate(state, 'restore')
    assert.equal(state.proofVerified, false)
    const restored = beginVerify(state)
    state = finishVerify(restored.state, restored.ticket, await verify(restored.state.candidate.package))
    assert.equal(state.proofVerified, true)
    assert.equal(state.claim.after[0], '80')
  }
  const started = beginProve(await verified())
  assert.equal(started.state.candidate, null)
  assert.equal(started.state.originalPackage, null)
  assert.equal(started.state.proofVerified, false)
})

test('failed actual proving attempt cannot reuse old successful package or verification', async () => {
  const started = beginProve(await verified())
  await assert.rejects(prove({ ...proofInput(started.state), after: ['81', '119'] }))
  const failed = failOperation(started.state, started.ticket)
  assert.equal(failed.active, null)
  assert.equal(failed.candidate, null)
  assert.equal(failed.originalPackage, null)
  assert.equal(failed.proofVerified, false)
  assert.throws(() => settle(failed), /Falta verificar/)
  const fresh = beginProve(failed)
  const recovered = finishProve(fresh.state, fresh.ticket, await actualProof())
  assert.ok(recovered.candidate)
  assert.equal(recovered.proofVerified, false)
})

test('stale verification after candidate edit, reset or cancellation cannot become current', async () => {
  const candidate = await withCandidate()
  const started = beginVerify(candidate)
  const response = await verify(candidate.candidate.package)
  const changed = changeCandidate(started.state, 'after')
  assert.strictEqual(finishVerify(changed, started.ticket, response), changed)
  const reset = resetSession(started.state)
  assert.strictEqual(finishVerify(reset, started.ticket, response), reset)
  const canceled = cancelOperation(started.state)
  assert.strictEqual(finishVerify(canceled, started.ticket, response), canceled)
  const fresh = beginVerify(canceled)
  assert.strictEqual(finishVerify(fresh.state, started.ticket, response), fresh.state)
  assert.equal(finishVerify(fresh.state, fresh.ticket, await verify(fresh.state.candidate.package)).proofVerified, true)
})

test('stale proving response cannot overwrite new run, reset, cancellation or newer request', async () => {
  const started = beginProve(claimed())
  const raw = await actualProof()
  const reset = resetSession(started.state)
  assert.strictEqual(finishProve(reset, started.ticket, raw), reset)
  const newRun = claimed('validity', ['79', '121'], { amountAB: '31' })
  assert.strictEqual(finishProve(newRun, started.ticket, raw), newRun)
  const canceled = cancelOperation(started.state)
  assert.strictEqual(finishProve(canceled, started.ticket, raw), canceled)
  const newer = beginProve(canceled)
  assert.strictEqual(finishProve(newer.state, started.ticket, raw), newer.state)
  assert.strictEqual(failOperation(newer.state, started.ticket), newer.state)
  assert.equal(finishProve(newer.state, newer.ticket, raw).candidate.package.publicSignals[2], '80')
})

test('accepted settlement locks candidate and claim; reset starts unrelated history without reverting snapshot', async () => {
  const accepted = settle(await verified())
  const settlement = accepted.settlement
  for (const action of [() => changeCandidate(accepted, 'after'), () => changeCandidate(accepted, 'restore'), () => beginProve(accepted), () => beginVerify(accepted), () => postClaim(accepted, ['81', '119']), () => execute(accepted, options)]) assert.throws(action)
  assert.strictEqual(cancelOperation(accepted), accepted)
  assert.throws(() => { settlement.claim.after[0] = '81' }, TypeError)
  assert.throws(() => { settlement.package.publicSignals[2] = '81' }, TypeError)
  const reset = resetSession(accepted)
  assert.deepEqual(observableFlags(reset), { executed: false, dataAvailable: false, proofVerified: false, settled: false, l1Finalized: false, withdrawalEligible: false, withdrawn: false })
  assert.equal(reset.claim, null)
  assert.equal(reset.candidate, null)
  assert.deepEqual(settlement.claim.after, ['80', '120'])
  assert.equal(accepted.settled, true)
})
