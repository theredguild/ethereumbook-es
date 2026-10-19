import { dispatch } from './model.mjs'

self.onmessage = ({ data }) => {
  const id = data?.id
  try {
    if (!Number.isSafeInteger(id) || id < 0) throw new Error('La solicitud necesita un identificador entero no negativo.')
    const { id: requestId, ...request } = data
    const result = dispatch(request)
    self.postMessage({ id: requestId, ok: true, result })
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : 'No se pudo derivar la cuenta educativa.' })
  }
}
