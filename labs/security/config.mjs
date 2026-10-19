export const VARIANTS = Object.freeze([
  { id: 'before', name: 'Interacción antes de efectos', contract: 'BeforeEffectsVault' },
  { id: 'effects', name: 'Efectos antes de interacción', contract: 'EffectsFirstVault' },
  { id: 'blocked', name: 'Bloquear todos los retiros', contract: 'BlockAllVault' },
])
export const PREDICTIONS = Object.freeze(['recursive-only', 'legitimate-only', 'neither'])
export const UNIT = 10n ** 18n

export function observedOutcome(snapshot) {
  if (!snapshot.attempt || !snapshot.legitimate) throw new Error('Faltan ambas ejecuciones para comparar.')
  const recursive = snapshot.attempt.receipt.status === 1
  const legitimate = snapshot.legitimate.receipt.status === 1
  return recursive ? (legitimate ? 'both' : 'recursive-only') : (legitimate ? 'legitimate-only' : 'neither')
}
