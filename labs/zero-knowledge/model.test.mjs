import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { curves, groth16 } from 'snarkjs'
import { FIELD, MAX_128, knowledgeCommitment } from '../shared/proof-inputs.mjs'
import {
  emptyState, newRun, publicPackage, beginProve, proverInput, completeProve,
  beginVerify, completeVerify, failOperation, cancelOperation, replaceCandidate,
  tamperCandidate, restoreCandidate,
} from './model.mjs'

let wasm, key, verificationKey, generated, otherGenerated, actualValid
const secret = '12345678901234567890123456789012345678'
const salt = '98765432109876543210987654321098765432'
const otherSecret = '12345678901234567890123456789012345679'

async function generate(input) {
  const result = await groth16.fullProve(input, wasm, key, undefined, { memorySize: 256 }, { singleThread: true })
  return { ...result, relation: 'knowledge' }
}

async function verify(candidate) {
  return { valid: await groth16.verify(verificationKey, candidate.publicSignals, candidate.proof), relation: 'knowledge' }
}

before(async () => {
  wasm = new Uint8Array(await readFile(new URL('./artifacts/circuit.wasm', import.meta.url)))
  key = new Uint8Array(await readFile(new URL('./artifacts/final.zkey', import.meta.url)))
  verificationKey = JSON.parse(await readFile(new URL('./artifacts/verification-key.json', import.meta.url), 'utf8'))
  const started = beginProve(newRun(emptyState(), secret, salt))
  generated = await generate(proverInput(started))
  otherGenerated = await generate({ secret: otherSecret, salt, commitment: knowledgeCommitment(otherSecret, salt) })
  actualValid = await verify(publicPackage(generated))
})

after(async () => {
  const curve = await curves.getCurveFromName('bn128')
  await curve.terminate()
})

function proved() {
  const state = beginProve(newRun(emptyState(), secret, salt))
  return completeProve(state, state.pending, generated)
}

function checked(state, result = actualValid) {
  const pending = beginVerify(state)
  return completeVerify(pending, pending.pending, result)
}

test('own run boundary accepts both 128-bit endpoints and rejects noncanonical or out-of-range witnesses', () => {
  const state = newRun(emptyState(), '0', MAX_128.toString())
  assert.equal(state.witness.secret, '0')
  assert.equal(state.witness.salt, MAX_128.toString())
  assert.equal(state.claim.expectedCommitment, knowledgeCommitment('0', MAX_128.toString()))
  for (const value of ['-1', '01', ' 1', '1.0', (MAX_128 + 1n).toString(), '1'.repeat(79), 1]) {
    assert.throws(() => newRun(emptyState(), value, '0'))
    assert.throws(() => newRun(emptyState(), '0', value))
  }
  const wrong = beginProve(newRun(emptyState(), MAX_128.toString(), '0'), true)
  assert.equal(proverInput(wrong).secret, '0')
  assert.equal(proverInput(wrong).commitment, wrong.claim.expectedCommitment)
})

test('public package whitelists fixed proof fields, excludes witness and freezes detached copies', () => {
  const source = structuredClone(generated)
  source.secret = secret
  source.salt = salt
  source.witness = { secret, salt }
  source.proof.secret = secret
  source.elapsedMs = 42
  const candidate = publicPackage(source)
  assert.deepEqual(Object.keys(candidate).sort(), ['proof', 'publicSignals', 'relation'])
  assert.deepEqual(Object.keys(candidate.proof).sort(), ['curve', 'pi_a', 'pi_b', 'pi_c', 'protocol'])
  assert.equal(JSON.stringify(candidate).includes('"secret"'), false)
  assert.equal(JSON.stringify(candidate).includes('"salt"'), false)
  assert.equal(JSON.stringify(candidate).includes('"witness"'), false)
  assert.equal(JSON.stringify(candidate).includes('elapsedMs'), false)
  const originalCoordinate = candidate.proof.pi_a[0]
  source.proof.pi_a[0] = '0'
  assert.equal(candidate.proof.pi_a[0], originalCoordinate)
  assert.throws(() => { candidate.publicSignals[0] = '0' }, TypeError)
  assert.throws(() => { candidate.proof.pi_b[0][0] = '0' }, TypeError)
  assert.throws(() => publicPackage({ ...generated, relation: 'batch' }))
  assert.throws(() => publicPackage({ ...generated, publicSignals: [FIELD.toString()] }))
  assert.throws(() => publicPackage({ ...generated, publicSignals: ['01'] }))
  assert.throws(() => publicPackage({ ...generated, publicSignals: [] }))
  assert.throws(() => publicPackage({ ...generated, proof: { ...generated.proof, pi_a: ['0'] } }))
})

test('acceptance needs actual verification and immutable expected statement, not another valid public statement', async () => {
  const state = checked(proved())
  assert.equal(actualValid.valid, true)
  assert.equal(state.verification.accepted, true)
  const originalExpected = state.claim.expectedCommitment
  const other = replaceCandidate(state, otherGenerated)
  assert.equal(other.verification, null)
  assert.equal(other.claim.expectedCommitment, originalExpected)
  const otherResult = await verify(other.candidate)
  assert.equal(otherResult.valid, true)
  const rejected = checked(other, otherResult)
  assert.equal(rejected.verification.cryptographicallyValid, true)
  assert.equal(rejected.verification.matchesExpected, false)
  assert.equal(rejected.verification.accepted, false)
  const mismatched = beginProve(newRun(emptyState(), secret, salt))
  assert.throws(() => completeProve(mismatched, mismatched.pending, otherGenerated), /otro compromiso/)
})

test('candidate edits clear acceptance, ignore stale verification, and restoration needs actual verification again', async () => {
  const state = checked(proved())
  const verifying = beginVerify(state)
  const oldIdentity = verifying.pending
  const edited = tamperCandidate(verifying, 'proof')
  assert.equal(edited.verification, null)
  assert.equal(edited.pending, null)
  assert.strictEqual(completeVerify(edited, oldIdentity, actualValid), edited)
  assert.equal(edited.claim.expectedCommitment, state.claim.expectedCommitment)
  const rejected = checked(edited, await verify(edited.candidate))
  assert.equal(rejected.verification.cryptographicallyValid, false)
  assert.equal(rejected.verification.matchesExpected, true)
  assert.equal(rejected.verification.accepted, false)
  const changedPublic = tamperCandidate(state, 'commitment')
  assert.equal(changedPublic.verification, null)
  const publicRejected = checked(changedPublic, await verify(changedPublic.candidate))
  assert.equal(publicRejected.verification.cryptographicallyValid, false)
  assert.equal(publicRejected.verification.matchesExpected, false)
  const restored = restoreCandidate(publicRejected)
  assert.equal(restored.verification, null)
  assert.deepEqual(restored.candidate, state.original)
  assert.equal(checked(restored, await verify(restored.candidate)).verification.accepted, true)
  const pendingRestore = beginVerify(restored)
  const restoredAgain = restoreCandidate(pendingRestore)
  assert.strictEqual(completeVerify(restoredAgain, pendingRestore.pending, actualValid), restoredAgain)
})

test('wrong witness reaches real constraints; failed attempt discards old proof and correct witness generates a fresh proof', async () => {
  const old = checked(proved())
  const wrong = beginProve(old, true)
  assert.equal(wrong.candidate, null)
  assert.equal(wrong.original, null)
  assert.equal(wrong.verification, null)
  assert.equal(proverInput(wrong).secret, otherSecret)
  assert.equal(proverInput(wrong).salt, salt)
  assert.equal(proverInput(wrong).commitment, old.claim.expectedCommitment)
  let failure
  try { await generate(proverInput(wrong)) } catch (cause) { failure = cause }
  assert.ok(failure instanceof Error, 'actual WASM witness calculation must reject wrong commitment opening')
  const failed = failOperation(wrong, wrong.pending, failure.message)
  assert.equal(failed.attempt, 'failed')
  assert.equal(failed.pending, null)
  assert.equal(failed.candidate, null)
  assert.equal(failed.original, null)
  assert.equal(failed.verification, null)
  assert.throws(() => restoreCandidate(failed), /no tiene un paquete original/)
  const recovery = beginProve(failed)
  const fresh = await generate(proverInput(recovery))
  const recovered = completeProve(recovery, recovery.pending, fresh)
  assert.equal(recovered.attempt, 'proved')
  assert.equal(recovered.verification, null)
  assert.equal(checked(recovered, await verify(recovered.candidate)).verification.accepted, true)
})

test('cancel, reset and new runs reject late success or failure identities and preserve only explicit recovery data', () => {
  const pending = beginProve(checked(proved()))
  const canceled = cancelOperation(pending)
  assert.equal(canceled.attempt, 'canceled')
  assert.equal(canceled.pending, null)
  assert.equal(canceled.candidate, null)
  assert.equal(canceled.verification, null)
  assert.strictEqual(canceled.witness, pending.witness)
  assert.strictEqual(canceled.claim, pending.claim)
  assert.strictEqual(completeProve(canceled, pending.pending, generated), canceled)
  assert.strictEqual(failOperation(canceled, pending.pending, 'late failure'), canceled)
  const retried = beginProve(canceled)
  assert.notStrictEqual(retried.pending, pending.pending)
  assert.strictEqual(completeProve(retried, pending.pending, generated), retried)
  const reset = emptyState(retried.runId + 1)
  assert.equal(reset.claim, null)
  assert.equal(reset.witness, null)
  assert.equal(reset.original, null)
  assert.strictEqual(completeProve(reset, retried.pending, generated), reset)
  const next = newRun(retried, otherSecret, salt)
  assert.notEqual(next.runId, retried.runId)
  assert.notEqual(next.claim.expectedCommitment, retried.claim.expectedCommitment)
  assert.equal(next.candidate, null)
  assert.strictEqual(completeProve(next, retried.pending, generated), next)
  const verifying = beginVerify(proved())
  const stopped = cancelOperation(verifying)
  assert.equal(stopped.verification, null)
  assert.strictEqual(stopped.candidate, verifying.candidate)
  assert.strictEqual(completeVerify(stopped, verifying.pending, actualValid), stopped)
  const recovery = beginVerify(stopped)
  assert.equal(completeVerify(recovery, recovery.pending, actualValid).verification.accepted, true)
})

test('operation boundaries reject absent inputs and incomplete verifier responses without accepting anything', () => {
  assert.throws(() => beginProve(emptyState()), /Genera un testigo/)
  assert.throws(() => beginVerify(newRun(emptyState(), '1', '2')), /paquete actual/)
  const proving = beginProve(newRun(emptyState(), '1', '2'))
  assert.throws(() => beginProve(proving), /cálculo anterior/)
  const pending = beginVerify(proved())
  assert.throws(() => completeVerify(pending, pending.pending, { valid: true, relation: 'batch' }), /Respuesta incompleta/)
  assert.throws(() => completeVerify(pending, pending.pending, { relation: 'knowledge' }), /Respuesta incompleta/)
  const failed = failOperation(pending, pending.pending, 'verifier failed')
  assert.equal(failed.verification, null)
  assert.equal(failed.error, 'verifier failed')
})
