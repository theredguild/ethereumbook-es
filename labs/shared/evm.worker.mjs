import { createContractSession } from './evm.mjs'

let session
let serial = Promise.resolve()

async function respond(data) {
  const id = data?.id
  try {
    if (!Number.isSafeInteger(id) || id < 0) throw new Error('Identificador de solicitud inválido.')
    session ||= await createContractSession()
    let result
    switch (data.action) {
      case 'snapshot': result = { snapshot: await session.snapshot() }; break
      case 'reset': result = { snapshot: await session.reset() }; break
      case 'deploy': result = await session.deploy(data.artifact, data.options); break
      case 'transact': result = await session.transact(data.options); break
      case 'call': result = { call: await session.call(data.options), snapshot: await session.snapshot() }; break
      default: throw new Error('Acción EVM no admitida.')
    }
    self.postMessage({ id, ok: true, result })
  } catch (error) {
    const response = { id, ok: false, error: error instanceof Error ? error.message : 'Error EVM.' }
    try { if (session) response.snapshot = await session.snapshot() } catch { response.uncertain = true }
    if (!response.snapshot) response.uncertain = true
    self.postMessage(response)
  }
}

self.onmessage = ({ data }) => {
  serial = serial.then(() => respond(data)).catch((error) => self.reportError(error))
}
