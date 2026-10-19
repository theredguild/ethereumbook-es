import { createSecurityLab } from './model.mjs'

const lab = createSecurityLab()
let serial = Promise.resolve()

async function respond(data) {
  const { id, action, ...fields } = data || {}
  try {
    if (!Number.isSafeInteger(id) || id < 0) throw new Error('Identificador de solicitud inválido.')
    const result = await (await lab).dispatch(action, fields)
    self.postMessage({ id, ok: true, result })
  } catch (cause) {
    let snapshot
    try { snapshot = await (await lab).snapshot() } catch { /* No state claim without a successful read. */ }
    self.postMessage({ id, ok: false, error: cause instanceof Error ? cause.message : 'No se completó el recorrido.', snapshot, uncertain: Boolean(cause.fatal) || !snapshot })
  }
}

self.onmessage = ({ data }) => {
  serial = serial.then(() => respond(data)).catch((cause) => self.reportError(cause))
}
