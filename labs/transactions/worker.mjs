import { createTransactionLab } from './engine.mjs'

let enginePromise
let responses = Promise.resolve()

function engine() {
  if (!enginePromise) {
    enginePromise = createTransactionLab().catch((error) => {
      enginePromise = undefined
      throw new Error('No se pudo iniciar la EVM educativa. Vuelve a intentar o recarga el laboratorio.', { cause: error })
    })
  }
  return enginePromise
}

async function respond(data) {
  const id = data?.id
  let lab
  try {
    if (!Number.isSafeInteger(id) || id < 0) throw new Error('La solicitud necesita un identificador entero no negativo.')
    lab = await engine()
    const { id: requestId, ...request } = data
    const result = await lab.dispatch(request)
    self.postMessage({ id: requestId, ok: true, result })
  } catch (error) {
    const response = { id, ok: false, error: error instanceof Error ? error.message : 'Ocurrió un error en el laboratorio.' }
    if (lab) {
      try {
        response.snapshot = (await lab.dispatch({ action: 'snapshot' })).snapshot
      } catch {
        response.error += ' No se pudo recuperar el estado; reinicia el laboratorio.'
      }
    }
    self.postMessage(response)
  }
}

self.onmessage = ({ data }) => {
  // Keep error snapshots before later responses. Engine dispatch separately owns
  // execution ordering, so reset cannot overtake an in-flight transaction.
  responses = responses.then(() => respond(data)).catch((error) => {
    // Report transport failures to the UI instead of continuing with unknown state.
    self.reportError(error)
  })
}
