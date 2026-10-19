import { useCallback, useEffect, useRef, useState } from 'react'
import { createWorkerClient } from './worker-client.mjs'

/** Caller owns result validation, domain state and operation-specific deadlines. */
export function useWorker(makeWorker, timeout = 45_000) {
  const client = useRef(null)
  const epoch = useRef(0)
  const inFlight = useRef(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fatal, setFatal] = useState(false)
  const [error, setError] = useState('')
  const [failure, setFailure] = useState(null)

  const restart = useCallback(() => {
    epoch.current += 1
    client.current?.dispose()
    client.current = null
    inFlight.current = false
    setBusy(false)
    setReady(false)
    setError('')
    setFailure(null)
    const generation = epoch.current
    try {
      client.current = createWorkerClient(makeWorker, timeout, (cause) => {
        if (generation !== epoch.current) return
        setFatal(true)
        setReady(false)
        setError(cause.message)
        setFailure(cause)
      })
      setReady(true)
      setFatal(false)
      return true
    } catch (cause) {
      setFatal(true)
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el Worker.')
      return false
    }
  }, [makeWorker, timeout])

  useEffect(() => {
    restart()
    return () => {
      epoch.current += 1
      client.current?.dispose()
      client.current = null
    }
  }, [restart])

  const run = useCallback(async (action, fields, deadline) => {
    if (!client.current || inFlight.current) return null
    const generation = epoch.current
    inFlight.current = true
    setBusy(true)
    setError('')
    setFailure(null)
    try {
      const result = await client.current.request(action, fields, deadline)
      return generation === epoch.current ? result : null
    } catch (cause) {
      if (generation === epoch.current) {
        setError(cause instanceof Error ? cause.message : 'No se completó la acción.')
        setFailure(cause)
        if (cause.fatal) { setFatal(true); setReady(false) }
      }
      return null
    } finally {
      if (generation === epoch.current) {
        inFlight.current = false
        setBusy(false)
      }
    }
  }, [])

  const clearError = useCallback(() => { setError(''); setFailure(null) }, [])
  return { ready, busy, fatal, error, failure, run, restart, clearError }
}
