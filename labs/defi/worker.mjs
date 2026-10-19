import { createDeFiModel } from './model.mjs'

let model
let serial = Promise.resolve()
async function respond(data) {
  const id = data?.id
  try {
    if (!Number.isSafeInteger(id) || id < 0) throw new Error('Identificador de solicitud inválido.')
    model ||= await createDeFiModel()
    const result = await model.dispatch(data)
    self.postMessage({ id, ok: true, result })
  } catch (cause) {
    const response = { id, ok: false, error: cause instanceof Error ? cause.message : 'No se completó la acción DeFi.' }
    try { response.snapshot = await model?.snapshot() } catch { response.uncertain = true }
    if (!response.snapshot) response.uncertain = true
    self.postMessage(response)
  }
}
self.onmessage = ({ data }) => {
  serial = serial.then(() => respond(data)).catch((cause) => self.reportError(cause))
}
