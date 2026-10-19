import { dispatch } from './model.mjs'

self.onmessage = ({ data }) => {
  const id = data?.id
  try {
    if (!Number.isSafeInteger(id) || id < 0) throw new Error('La solicitud necesita un identificador entero no negativo.')
    const result = dispatch(data)
    self.postMessage({ id, ok: true, result })
  } catch (cause) {
    self.postMessage({ id, ok: false, error: cause instanceof Error ? cause.message : 'No se completó la operación criptográfica.' })
  }
}
