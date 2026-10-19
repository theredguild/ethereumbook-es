export function createWorkerClient(makeWorker, defaultTimeout = 45_000, onFailure) {
  const worker = makeWorker()
  let active = null
  let nextId = 0
  let closed = false

  function close(reason = 'Se canceló el cálculo local.', unexpected = false) {
    if (closed) return
    closed = true
    worker.terminate()
    if (!active && !unexpected) return
    const error = reason instanceof Error ? reason : new Error(reason)
    error.fatal = true
    const request = active
    active = null
    if (request) {
      clearTimeout(request.timer)
      request.reject(error)
    }
    if (unexpected) onFailure?.(error)
  }

  worker.onerror = (event) => {
    event.preventDefault()
    close('No se pudo cargar o ejecutar el Worker. Reinicia antes de continuar.', true)
  }
  worker.onmessageerror = () => close('No se pudo leer la respuesta del Worker.', true)
  worker.onmessage = ({ data }) => {
    if (!active || data?.id !== active.id) return
    if (typeof data.ok !== 'boolean' || (data.ok && (data.result === undefined || data.result === null))) {
      close('El Worker devolvió una respuesta incompleta. Reinicia antes de continuar.', true)
      return
    }
    const request = active
    active = null
    clearTimeout(request.timer)
    if (data.ok) request.resolve(data.result)
    else {
      const error = new Error(typeof data.error === 'string' ? data.error : 'No se completó el cálculo local.')
      error.snapshot = data.snapshot
      error.fatal = data.uncertain === true
      request.reject(error)
      if (error.fatal) close(error, true)
    }
  }

  return {
    request(action, fields = {}, timeout = defaultTimeout) {
      if (closed) return Promise.reject(Object.assign(new Error('El Worker está detenido. Reinicia el laboratorio.'), { fatal: true }))
      if (active) return Promise.reject(new Error('Ya hay un cálculo en curso.'))
      const id = ++nextId
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => close(`El cálculo superó ${Math.ceil(timeout / 1000)} segundos y se detuvo. Reinicia antes de continuar.`, true), timeout)
        active = { id, resolve, reject, timer }
        try { worker.postMessage({ ...fields, action, id }) } catch { close('No se pudo enviar la solicitud al Worker.', true) }
      })
    },
    dispose: close,
    get closed() { return closed },
  }
}
