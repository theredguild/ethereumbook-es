import { dispatch } from './model.mjs'

self.onmessage = ({ data }) => {
  try {
    const result = dispatch(data)
    self.postMessage({ id: data.id, ok: true, result })
  } catch (cause) {
    self.postMessage({ id: data?.id, ok: false, error: cause instanceof Error ? cause.message : 'No se completó la operación de oráculos.' })
  }
}
