import { poseidon3 } from 'poseidon-lite/poseidon3'
import { poseidon4 } from 'poseidon-lite/poseidon4'

export const FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n
export const BASE_FIELD = 21888242871839275222246405745257275088696311157297823662689037894645226208583n
export const MAX_128 = (1n << 128n) - 1n
export const MAX_32 = (1n << 32n) - 1n

export function canonicalInteger(value, maximum, label = 'Valor') {
  if (typeof value !== 'string' || value.length > 78 || !/^(0|[1-9]\d*)$/.test(value)) throw new Error(`${label}: usa un entero decimal no negativo y canónico.`)
  const parsed = BigInt(value)
  if (parsed > maximum) throw new Error(`${label}: supera el límite permitido.`)
  return parsed
}

export function randomWitnessValue() {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') throw new Error('Este navegador no ofrece aleatoriedad criptográfica. No se generó testigo ni prueba.')
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  return BigInt(`0x${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')}`).toString()
}

export function knowledgeCommitment(secret, salt) {
  return poseidon3([17n, canonicalInteger(secret, MAX_128, 'Testigo'), canonicalInteger(salt, MAX_128, 'Salt')]).toString()
}

export function batchCommitment(amountAB, amountBA, salt) {
  return poseidon4([16n, canonicalInteger(amountAB, MAX_32, 'A → B'), canonicalInteger(amountBA, MAX_32, 'B → A'), canonicalInteger(salt, MAX_128, 'Salt')]).toString()
}

export function changedProof(proof) {
  const changed = structuredClone(proof)
  changed.pi_a[1] = ((BASE_FIELD - BigInt(changed.pi_a[1])) % BASE_FIELD).toString()
  return changed
}
