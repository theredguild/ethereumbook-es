import { createDappModel } from './model.mjs'

let model
let serial = Promise.resolve()
async function respond(data) {
  const id = data?.id
  try {
    if (!Number.isSafeInteger(id) || id < 0) throw new Error('Identificador de solicitud inválido.')
    const fresh = !model
    model ||= await createDappModel()
    const result = await model.execute(fresh && data.action === 'reset' ? 'state' : data.action, data.fields)
    self.postMessage({ id, ok: true, result })
  } catch (error) {
    const response = { id, ok: false, error: error.message || 'Falló la EVM local.' }
    try { if (model) response.snapshot = await model.execute('state') } catch { response.uncertain = true }
    if (!response.snapshot) response.uncertain = true
    self.postMessage(response)
  }
}
self.onmessage = ({ data }) => { serial = serial.then(() => respond(data)).catch((error) => self.reportError(error)) }
