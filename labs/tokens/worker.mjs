import { createTokensModel, validSnapshot } from './model.mjs'

let model
let serial = Promise.resolve()
let lastId = 0
let uncertain = false

async function respond(data) {
  const id = data?.id
  try {
    if (!Number.isSafeInteger(id) || id <= lastId) throw new Error('Identificador de solicitud vencido o inválido.')
    lastId = id
    if (uncertain && !['start', 'reset'].includes(data.action)) throw new Error('Estado desconocido. Reinicia antes de continuar.')
    model ||= await createTokensModel()
    const result = await model.dispatch(data)
    if (!validSnapshot(result.snapshot)) throw new Error('El Worker no pudo validar los saldos y permisos observados.')
    uncertain = false
    self.postMessage({ id, ok: true, result })
  } catch (cause) {
    const response = { id, ok: false, error: cause instanceof Error ? cause.message : 'No se completó la acción de tokens.' }
    try {
      response.snapshot = await model?.snapshot()
      if (!validSnapshot(response.snapshot)) response.uncertain = true
    } catch { response.uncertain = true }
    if (uncertain) response.uncertain = true
    uncertain = response.uncertain === true
    self.postMessage(response)
  }
}

self.onmessage = ({ data }) => {
  serial = serial.then(() => respond(data)).catch((cause) => self.reportError(cause))
}
