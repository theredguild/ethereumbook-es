import { BASE_FIELD, FIELD, MAX_32, MAX_128, canonicalInteger, batchCommitment, changedProof } from '../shared/proof-inputs.mjs'

export const WINDOW_STEPS = 3
export const FINALITY_STEPS = 2

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

function balances(values, label) {
  if (!Array.isArray(values) || values.length !== 2) throw new Error(`${label}: se necesitan dos saldos.`)
  return values.map((value) => canonicalInteger(value, MAX_32, label))
}

/** Ordered, bounded relation implemented by circuit.circom. No authentication or EVM. */
export function executeBatch({ before = ['100', '100'], amountAB = '30', amountBA = '10', salt }) {
  const initial = balances(before, 'Saldo inicial')
  const ab = canonicalInteger(amountAB, MAX_32, 'A → B')
  const ba = canonicalInteger(amountBA, MAX_32, 'B → A')
  canonicalInteger(salt, MAX_128, 'Salt')
  const middle = [initial[0] - ab, initial[1] + ab]
  const after = [middle[0] + ba, middle[1] - ba]
  for (const [index, pair] of [middle, after].entries()) {
    if (pair.some((value) => value < 0n || value > MAX_32)) throw new Error(`Transferencia ${index + 1}: saldo intermedio o final fuera de 0…2³²−1.`)
  }
  return freeze({ before: initial.map(String), middle: middle.map(String), after: after.map(String), amountAB, amountBA, salt, commitment: batchCommitment(amountAB, amountBA, salt) })
}

export function createSession(epoch = 0) {
  return freeze({ epoch, revision: 0, mode: null, run: null, executed: false, claim: null, dataAvailable: false, publication: null, invalidated: false, challengeResult: null, windowStep: 0, candidate: null, originalPackage: null, proofVerified: false, verificationResult: null, active: null, settled: false, settlement: null, finalityStep: 0, l1Finalized: false, withdrawn: false })
}

export function resetSession(state) {
  return createSession(state.epoch + 1)
}

function claimRequired(state) {
  if (!state.claim) throw new Error('Primero publica una afirmación inmutable.')
}

function mutableCandidate(state) {
  claimRequired(state)
  if (state.mode !== 'validity') throw new Error('La prueba corresponde al recorrido de validez.')
  if (state.settled) throw new Error('La liquidación está cerrada. Reinicia para otro experimento.')
}

export function execute(state, options) {
  if (state.claim || state.active) throw new Error('Reinicia antes de cambiar el lote publicado.')
  if (!['optimistic', 'validity'].includes(options.mode)) throw new Error('Elige optimista o validez.')
  const run = executeBatch(options)
  return freeze({ ...resetSession(state), mode: options.mode, executed: true, run: { ...run, id: `${state.epoch + 1}:lote` } })
}

export function postClaim(state, after) {
  if (!state.executed || state.claim) throw new Error('Ejecuta un lote nuevo antes de publicar otra afirmación.')
  const claimed = balances(after, 'Saldo afirmado').map(String)
  const claim = { id: `${state.run.id}:afirmación`, before: [...state.run.before], after: claimed, commitment: state.run.commitment }
  claim.publicSignals = [...claim.before, ...claim.after, claim.commitment]
  return freeze({ ...state, claim })
}

export function publishData(state, data) {
  claimRequired(state)
  const commitment = batchCommitment(data.amountAB, data.amountBA, data.salt)
  if (commitment !== state.claim.commitment) throw new Error('Los datos no coinciden con el compromiso publicado.')
  const replay = executeBatch({ before: state.claim.before, amountAB: data.amountAB, amountBA: data.amountBA, salt: data.salt })
  return freeze({ ...state, dataAvailable: true, publication: { amountAB: data.amountAB, amountBA: data.amountBA, salt: data.salt, replay: replay.after, commitment } })
}

export function windowOpen(state) {
  return Boolean(state.claim && state.mode === 'optimistic' && !state.settled && !state.invalidated && state.windowStep < WINDOW_STEPS)
}

export function advanceWindow(state) {
  claimRequired(state)
  if (state.mode !== 'optimistic' || state.settled || state.windowStep >= WINDOW_STEPS) throw new Error('La ventana educativa no admite otro avance.')
  return freeze({ ...state, windowStep: state.windowStep + 1 })
}

export function challenge(state) {
  if (!windowOpen(state)) throw new Error('La ventana de impugnación está cerrada o la afirmación ya fue invalidada.')
  if (!state.dataAvailable) throw new Error('Faltan datos publicados para reproducir e impugnar el lote.')
  const wrong = state.publication.replay.some((value, index) => value !== state.claim.after[index])
  return freeze({ ...state, invalidated: wrong, challengeResult: wrong ? 'invalidated' : 'failed-correct-claim' })
}

function packageOnly(value) {
  if (value?.relation !== 'batch' || !Array.isArray(value.publicSignals) || value.publicSignals.length !== 5) throw new Error('Paquete ajeno a la relación de lote.')
  const publicSignals = value.publicSignals.map((item) => { canonicalInteger(item, FIELD - 1n, 'Entrada pública'); return item })
  const proof = value.proof
  if (proof?.protocol !== 'groth16' || proof.curve !== 'bn128') throw new Error('Formato de prueba no admitido.')
  const point = (items, size) => {
    if (!Array.isArray(items) || items.length !== size) throw new Error('Punto de prueba inválido.')
    return items.map((item) => { canonicalInteger(item, BASE_FIELD - 1n, 'Coordenada'); return item })
  }
  if (!Array.isArray(proof.pi_b) || proof.pi_b.length !== 3) throw new Error('Punto de prueba inválido.')
  return freeze({ relation: 'batch', proof: { pi_a: point(proof.pi_a, 3), pi_b: proof.pi_b.map((row) => point(row, 2)), pi_c: point(proof.pi_c, 3), protocol: 'groth16', curve: 'bn128' }, publicSignals })
}

export function statementMatches(candidatePackage, claim) {
  return Boolean(claim && candidatePackage?.relation === 'batch' && candidatePackage.publicSignals?.length === 5 && claim.publicSignals.every((value, index) => value === candidatePackage.publicSignals[index]))
}

export function proofInput(state) {
  claimRequired(state)
  return freeze({ before: [...state.claim.before], after: [...state.claim.after], commitment: state.claim.commitment, amountAB: state.run.amountAB, amountBA: state.run.amountBA, salt: state.run.salt })
}

function begin(state, kind) {
  mutableCandidate(state)
  if (state.active) throw new Error('Ya hay un cálculo en curso.')
  if (kind === 'verify' && !state.candidate) throw new Error('Genera una prueba candidata primero.')
  const revision = state.revision + 1
  const ticket = freeze({ epoch: state.epoch, revision, kind, claimId: state.claim.id, candidateId: kind === 'verify' ? state.candidate.id : null })
  const next = freeze({ ...state, revision, active: ticket, proofVerified: false, verificationResult: null, ...(kind === 'prove' ? { candidate: null, originalPackage: null } : {}) })
  return { state: next, ticket }
}

export function beginProve(state) { return begin(state, 'prove') }
export function beginVerify(state) { return begin(state, 'verify') }

function current(state, ticket) {
  return state.active === ticket && state.epoch === ticket.epoch && state.claim?.id === ticket.claimId && !state.settled
}

export function finishProve(state, ticket, result) {
  if (!current(state, ticket) || ticket.kind !== 'prove') return state
  const candidatePackage = packageOnly(result)
  if (!statementMatches(candidatePackage, state.claim)) throw new Error('La prueba generada no corresponde a la afirmación actual.')
  return freeze({ ...state, active: null, candidate: { id: `${state.claim.id}:candidato:${state.revision}`, package: candidatePackage }, originalPackage: candidatePackage })
}

/** result must come from shared proof Worker, never from a user control. */
export function finishVerify(state, ticket, result) {
  if (!current(state, ticket) || ticket.kind !== 'verify' || state.candidate?.id !== ticket.candidateId) return state
  const verified = result?.relation === 'batch' && result.valid === true && statementMatches(state.candidate.package, state.claim)
  return freeze({ ...state, active: null, proofVerified: verified, verificationResult: verified ? 'valid-current-statement' : 'rejected' })
}

export function failOperation(state, ticket) {
  if (!current(state, ticket)) return state
  return freeze({ ...state, active: null, proofVerified: false, verificationResult: 'failed' })
}

export function cancelOperation(state) {
  if (state.settled) return state
  return freeze({ ...state, revision: state.revision + 1, active: null, proofVerified: false, verificationResult: null })
}

export function changeCandidate(state, change) {
  mutableCandidate(state)
  if (!state.candidate || !state.originalPackage) throw new Error('Primero genera una prueba candidata.')
  let candidatePackage = structuredClone(state.candidate.package)
  if (change === 'restore') candidatePackage = structuredClone(state.originalPackage)
  else if (change === 'proof') candidatePackage.proof = changedProof(candidatePackage.proof)
  else {
    const index = { before: 0, after: 2, commitment: 4 }[change]
    if (index === undefined) throw new Error('Cambio de candidato no admitido.')
    candidatePackage.publicSignals[index] = ((BigInt(candidatePackage.publicSignals[index]) + 1n) % FIELD).toString()
  }
  const revision = state.revision + 1
  return freeze({ ...state, revision, active: null, candidate: { id: `${state.claim.id}:candidato:${revision}`, package: packageOnly(candidatePackage) }, proofVerified: false, verificationResult: null })
}

export function settle(state) {
  claimRequired(state)
  if (state.settled) throw new Error('Esta afirmación ya está liquidada.')
  if (state.active) throw new Error('Espera o cancela el cálculo en curso.')
  if (state.invalidated) throw new Error('Una afirmación invalidada no puede liquidarse, aunque venza la ventana.')
  if (state.mode === 'optimistic' && state.windowStep < WINDOW_STEPS) throw new Error('La ventana de tres pasos todavía está abierta.')
  if (state.mode === 'validity' && (!state.proofVerified || !statementMatches(state.candidate?.package, state.claim))) throw new Error('Falta verificar una prueba de la afirmación actual.')
  return freeze({ ...state, settled: true, settlement: { claim: state.claim, basis: state.mode === 'optimistic' ? 'optimistic-assumption' : 'proven-bounded-relation', package: state.mode === 'validity' ? state.candidate.package : null } })
}

export function advanceFinality(state) {
  if (!state.settled || state.l1Finalized) throw new Error('Primero liquida; la finalidad solo admite dos avances posteriores.')
  const finalityStep = state.finalityStep + 1
  return freeze({ ...state, finalityStep, l1Finalized: finalityStep === FINALITY_STEPS })
}

export function withdrawalEligible(state) {
  return Boolean(state.settled && state.settlement?.claim.id === state.claim?.id && state.dataAvailable && state.l1Finalized && !state.withdrawn)
}

export function withdraw(state) {
  if (!withdrawalEligible(state)) throw new Error('Retiro bloqueado: requiere liquidación actual, datos, finalidad L1 educativa y no haberse retirado antes.')
  return freeze({ ...state, withdrawn: true })
}

export function observableFlags(state) {
  return { executed: state.executed, dataAvailable: state.dataAvailable, proofVerified: state.proofVerified, settled: state.settled, l1Finalized: state.l1Finalized, withdrawalEligible: withdrawalEligible(state), withdrawn: state.withdrawn }
}
