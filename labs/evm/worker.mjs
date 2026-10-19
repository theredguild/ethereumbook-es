import { createEvmLab } from './model.mjs'

let lab
let active = false

self.onmessage = async ({ data }) => {
  const id = data?.id
  if (active) {
    self.postMessage({ id, ok: false, error: 'Ya hay una ejecución en curso. Reinicia el Worker.', uncertain: true })
    return
  }
  active = true
  try {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Identificador de solicitud inválido.')
    lab ||= await createEvmLab()
    let result
    switch (data.action) {
      case 'snapshot': result = await lab.snapshot(); break
      case 'reset': result = await lab.reset(); break
      case 'run': {
        if (typeof data.inputId !== 'string' || data.inputId.length > 64 || typeof data.draft?.runtime !== 'string' || data.draft.runtime.length > 8194) throw new Error('Programa o identidad de entrada fuera de los límites.')
        const prepared = lab.setDraft(data.draft)
        result = { ...await lab.execute(prepared.revision, data.inputId), inputId: data.inputId }
        break
      }
      default: throw new Error('Acción de laboratorio EVM no admitida.')
    }
    self.postMessage({ id, ok: true, result })
  } catch (error) {
    const response = { id, ok: false, error: error instanceof Error ? error.message : 'No se completó la ejecución EVM.', uncertain: error?.uncertain === true }
    try { if (lab) response.snapshot = await lab.snapshot() } catch { response.uncertain = true }
    if (!response.snapshot) response.uncertain = true
    self.postMessage(response)
  } finally {
    active = false
  }
}
