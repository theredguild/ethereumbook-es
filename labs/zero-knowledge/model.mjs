import { BASE_FIELD, FIELD, MAX_128, canonicalInteger, changedProof, knowledgeCommitment } from '../shared/proof-inputs.mjs'

export function emptyState(runId = 0) {
  return Object.freeze({ runId, revision: 0, claim: null, witness: null, original: null, candidate: null, pending: null, verification: null, attempt: 'idle', error: '' })
}

export function newRun(state, secret, salt) {
  const expectedCommitment = knowledgeCommitment(secret, salt)
  return Object.freeze({ ...emptyState(state.runId + 1), claim: Object.freeze({ expectedCommitment }), witness: Object.freeze({ secret, salt }) })
}

// Copy only fixed public fields. Worker timings and all witness data stay outside this package.
export function publicPackage(value) {
  if (value?.relation !== 'knowledge' || !Array.isArray(value.publicSignals) || value.publicSignals.length !== 1) throw new Error('Se requiere un paquete público de la relación knowledge con un compromiso.')
  canonicalInteger(value.publicSignals[0], FIELD - 1n, 'Compromiso público')
  const source = value.proof
  if (source?.protocol !== 'groth16' || source.curve !== 'bn128') throw new Error('Se requiere una prueba Groth16 sobre bn128.')
  function point(values, length) {
    if (!Array.isArray(values) || values.length !== length) throw new Error('Dimensiones de prueba incorrectas.')
    return Object.freeze(values.map((coordinate) => {
      canonicalInteger(coordinate, BASE_FIELD - 1n, 'Coordenada')
      return coordinate
    }))
  }
  if (!Array.isArray(source.pi_b) || source.pi_b.length !== 3) throw new Error('Dimensiones de prueba incorrectas.')
  const proof = Object.freeze({ pi_a: point(source.pi_a, 3), pi_b: Object.freeze(source.pi_b.map((row) => point(row, 2))), pi_c: point(source.pi_c, 3), protocol: 'groth16', curve: 'bn128' })
  return Object.freeze({ proof, publicSignals: Object.freeze([value.publicSignals[0]]), relation: 'knowledge' })
}

export function beginProve(state, wrongWitness = false) {
  if (!state.claim || state.pending) throw new Error('Genera un testigo y termina el cálculo anterior antes de probar.')
  const revision = state.revision + 1
  const pending = Object.freeze({ runId: state.runId, revision, kind: 'prove', wrongWitness })
  return Object.freeze({ ...state, revision, pending, candidate: null, original: null, verification: null, attempt: 'proving', error: '' })
}

export function proverInput(state) {
  if (state.pending?.kind !== 'prove') throw new Error('No hay un intento de prueba activo.')
  const { secret, salt } = state.witness
  return Object.freeze({ secret: state.pending.wrongWitness ? ((BigInt(secret) + 1n) % (MAX_128 + 1n)).toString() : secret, salt, commitment: state.claim.expectedCommitment })
}

export function completeProve(state, identity, result) {
  if (state.pending !== identity || identity?.kind !== 'prove') return state
  const candidate = publicPackage(result)
  if (candidate.publicSignals[0] !== state.claim.expectedCommitment) throw new Error('El probador devolvió otro compromiso; no se publicó el paquete.')
  return Object.freeze({ ...state, pending: null, original: candidate, candidate, attempt: 'proved', error: '' })
}

export function beginVerify(state) {
  if (!state.candidate || state.pending) throw new Error('No hay un paquete actual disponible para verificar.')
  const revision = state.revision + 1
  return Object.freeze({ ...state, revision, pending: Object.freeze({ runId: state.runId, revision, kind: 'verify' }), verification: null, error: '' })
}

export function completeVerify(state, identity, result) {
  if (state.pending !== identity || identity?.kind !== 'verify') return state
  if (result?.relation !== 'knowledge' || typeof result.valid !== 'boolean') throw new Error('Respuesta incompleta del verificador; no se aceptó el paquete.')
  const matchesExpected = state.candidate.publicSignals[0] === state.claim.expectedCommitment
  const verification = Object.freeze({ runId: state.runId, revision: identity.revision, cryptographicallyValid: result.valid, matchesExpected, accepted: result.valid && matchesExpected })
  return Object.freeze({ ...state, pending: null, verification, error: '' })
}

export function failOperation(state, identity, message) {
  if (!identity || state.pending !== identity) return state
  return Object.freeze({ ...state, pending: null, verification: null, attempt: identity.kind === 'prove' ? 'failed' : state.attempt, error: message })
}

export function cancelOperation(state) {
  return Object.freeze({ ...state, revision: state.revision + 1, pending: null, verification: null, attempt: state.pending?.kind === 'prove' ? 'canceled' : state.attempt, error: '' })
}

export function replaceCandidate(state, value) {
  if (!state.claim) throw new Error('Falta la afirmación esperada.')
  const candidate = publicPackage(value)
  return Object.freeze({ ...state, revision: state.revision + 1, candidate, pending: null, verification: null, error: '' })
}

export function tamperCandidate(state, target) {
  if (!state.candidate) throw new Error('Primero genera una prueba real.')
  if (target === 'proof') return replaceCandidate(state, { ...state.candidate, proof: changedProof(state.candidate.proof) })
  if (target === 'commitment') return replaceCandidate(state, { ...state.candidate, publicSignals: [((BigInt(state.candidate.publicSignals[0]) + 1n) % FIELD).toString()] })
  throw new Error('Alteración no admitida.')
}

export function restoreCandidate(state) {
  if (!state.original) throw new Error('Este intento no tiene un paquete original. Genera otra prueba real.')
  return replaceCandidate(state, state.original)
}
