import { useEffect, useRef, useState } from 'react'
import { formatUnits } from 'viem/utils'
import { LabShell, Field, JsonDetails } from '../shared/LabShell.jsx'
import { useWorker } from '../shared/useWorker.jsx'
import { VARIANTS, PREDICTIONS, UNIT, observedOutcome } from './config.mjs'
import source from './contracts.sol?raw'

const makeWorker = () => new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' })
const steps = ['Preparar', 'Estado inicial', 'Llamada recursiva', 'Retiro legítimo']
const labels = {
  'recursive-only': 'La llamada recursiva obtiene pagos repetidos; el retiro legítimo falla.',
  'legitimate-only': 'La llamada recursiva falla; el retiro legítimo funciona.',
  neither: 'Ambas operaciones fallan.',
  both: 'Ambas operaciones se completan.',
}
const versionName = (id) => VARIANTS.find((item) => item.id === id)?.name || 'Sin versión preparada'
const eth = (value) => formatUnits(BigInt(value), 18)
const receiptOK = (value) => value && [0, 1].includes(value.status) && /^0x[\da-f]{64}$/i.test(value.hash) && /^\d+$/.test(value.feeWei) && /^\d+$/.test(value.gasUsed)
const positionsOK = (value) => value && ['vaultWei', 'honestCreditWei', 'callerWei', 'callerCreditWei', 'callbacks'].every((key) => typeof value[key] === 'string' && /^\d+$/.test(value[key]))
function validSnapshot(value) {
  if (!value || !Number.isSafeInteger(value.runId) || !['empty', 'ready', 'attempted', 'finished'].includes(value.phase) || !Array.isArray(value.chain?.actors) || !['alice', 'bob', 'carol'].every((id) => value.chain.actors.some((item) => item.id === id && /^\d+$/.test(item.nonce) && /^\d+$/.test(item.balanceWei)))) return false
  if (value.phase === 'empty') return value.positions === null && value.deployments === null && !value.attempt && !value.legitimate
  if (!VARIANTS.some((item) => item.id === value.variant) || !PREDICTIONS.includes(value.prediction) || !positionsOK(value.initial) || !positionsOK(value.positions) || !value.deployments?.vault || !value.deployments?.caller) return false
  if (['attempted', 'finished'].includes(value.phase) && (!receiptOK(value.attempt?.receipt) || !positionsOK(value.attempt.after))) return false
  return value.phase !== 'finished' || (receiptOK(value.legitimate?.receipt) && positionsOK(value.legitimate.after))
}

function Balances({ value, title }) {
  return <div className="result-card"><h3>{title}</h3><dl className="facts">
    <div><dt>ETH ficticios en el contrato de depósitos</dt><dd>{eth(value.vaultWei)}</dd></div>
    <div><dt>Crédito pendiente de Alice</dt><dd>{eth(value.honestCreditWei)}</dd></div>
    <div><dt>ETH ficticios en el contrato recursivo</dt><dd>{eth(value.callerWei)}</dd></div>
    <div><dt>Llamadas de retorno completadas</dt><dd>{value.callbacks}</dd></div>
  </dl></div>
}

export default function App() {
  const worker = useWorker(makeWorker)
  const [snapshot, setSnapshot] = useState(null)
  const [step, setStep] = useState(0)
  const [variant, setVariant] = useState('before')
  const [prediction, setPrediction] = useState('')
  const [trace, setTrace] = useState(false)
  const [error, setError] = useState('')
  const [domainFault, setDomainFault] = useState(false)
  const [message, setMessage] = useState('Iniciando la EVM local…')
  const [frozenRevision, setFrozenRevision] = useState(null)
  const [history, setHistory] = useState({})
  const [disclosures, setDisclosures] = useState(0)
  const revision = useRef(0)
  const fatal = worker.fatal || domainFault
  const current = snapshot && frozenRevision === revision.current && snapshot.variant === variant && snapshot.prediction === prediction
  const locked = worker.busy || !snapshot || fatal

  function apply(value) {
    if (!validSnapshot(value)) { setDomainFault(true); setError('La EVM devolvió un estado incompleto. Reinicia el Worker antes de continuar.'); return false }
    setSnapshot(value)
    return true
  }

  function emptyConfirmed(value) {
    if (!apply(value) || value.phase !== 'empty') return false
    revision.current += 1
    setFrozenRevision(null)
    setVariant('before')
    setPrediction('')
    setTrace(false)
    setStep(0)
    setHistory({})
    setDisclosures((count) => count + 1)
    setMessage('Sesión nueva: sin contratos ni operaciones anteriores. Prepara un escenario.')
    return true
  }

  useEffect(() => {
    if (!worker.ready) return
    let live = true
    worker.run('snapshot').then((value) => { if (live && value) emptyConfirmed(value) })
    return () => { live = false }
  }, [worker.ready, worker.run])

  useEffect(() => {
    if (worker.failure?.snapshot && !worker.fatal) apply(worker.failure.snapshot)
  }, [worker.failure, worker.fatal])

  function edit(update) {
    revision.current += 1
    setFrozenRevision(null)
    setError('')
    worker.clearError()
    setStep(0)
    update()
    setMessage('Cambió el borrador. Preparar creará una EVM nueva con el mismo depósito inicial.')
  }

  async function perform(action, fields, next, status) {
    setError('')
    worker.clearError()
    setMessage(status)
    const value = await worker.run(action, fields)
    if (!value || !apply(value)) return null
    setStep(next)
    return value
  }

  async function prepare() {
    if (!PREDICTIONS.includes(prediction)) { setError('Elige una predicción antes de preparar el escenario.'); return }
    const value = await perform('prepare', { variant, prediction }, 1, 'Desplegando contratos originales y depositando 10 ETH ficticios de Alice…')
    if (value) { setFrozenRevision(revision.current); setDisclosures((count) => count + 1); setMessage('Escenario nuevo confirmado. Las tres versiones parten de las mismas posiciones.') }
  }

  async function attempt() {
    const value = await perform('attempt', { runId: snapshot.runId, trace }, 2, 'Ejecutando una transacción local con hasta tres pagos recursivos…')
    if (value) setMessage(`Llamada incluida con status ${value.attempt.receipt.status}. Ahora falta comprobar el retiro legítimo.`)
  }

  async function withdraw() {
    const value = await perform('withdraw', { runId: snapshot.runId }, 3, 'Alice intenta retirar sus 10 ETH ficticios mediante una transacción real en la EVM…')
    if (value) {
      setHistory((previous) => ({ ...previous, [value.variant]: { runId: value.runId, recursiveStatus: value.attempt.receipt.status, legitimateStatus: value.legitimate.receipt.status } }))
      setMessage('Ambas operaciones se ejecutaron. Impedir una llamada no basta si también se bloquea al usuario legítimo.')
    }
  }

  async function reset() {
    setError('')
    worker.clearError()
    setMessage('Confirmando una sesión EVM nueva…')
    if (fatal) {
      setSnapshot(null)
      setDomainFault(false)
      if (!worker.restart()) return
    }
    const value = await worker.run(fatal ? 'snapshot' : 'reset')
    if (value) emptyConfirmed(value)
  }

  const finished = current && snapshot.phase === 'finished'
  const outcome = finished ? observedOutcome(snapshot) : null
  const support = <div key={disclosures}>
    <details><summary>Reglas, límites y contratos del ejercicio</summary>
      <p>La llamada recursiva explora reentrancia en estos contratos originales, no en un servicio real. El contrato recursivo deposita 1 ETH ficticio e intenta recibir tres pagos de 1. Una llamada que revierte también revierte ese depósito; su transacción incluida sí consume gas y nonce.</p>
      <p>La corrección de efectos antes de interacción evita este patrón, no demuestra seguridad general. Bloquear todos los retiros también impide pagos repetidos, pero rompe una operación legítima. Cambiar de versión despliega contratos nuevos: no modifica contratos ya desplegados.</p>
      <p>Solo se permite un intento recursivo y un retiro legítimo por escenario. La traza opcional registra como máximo 512 instrucciones previas a su ejecución, los últimos 16 elementos de pila, hasta 128 bytes de memoria y slots 0/1. Puede truncarse sin detener la EVM; los créditos de esta práctica son un mapping y se leen por ABI, no por esos dos slots.</p>
      <pre className="hex" tabIndex="0"><code>{source}</code></pre>
    </details>
    {snapshot?.deployments && <JsonDetails title="Identidad, bytecode, ABI y estado real de la EVM" value={{ deployments: snapshot.deployments, chain: snapshot.chain }} />}
    {Object.keys(history).length > 0 && <details><summary>Versiones que ya ejecutaste en esta sesión</summary><div className="table-scroll" tabIndex="0" role="region" aria-label="Comparación de versiones ejecutadas"><table className="compact-table"><thead><tr><th>Versión nueva</th><th>Status recursivo</th><th>Status legítimo</th></tr></thead><tbody>{Object.entries(history).map(([id, result]) => <tr key={id}><th scope="row">{versionName(id)}</th><td>{result.recursiveStatus}</td><td>{result.legitimateStatus}</td></tr>)}</tbody></table></div><p>Solo aparecen recorridos completos realmente ejecutados. No son resultados precalculados ni una auditoría.</p></details>}
  </div>

  return <LabShell chapter={9} title="Ordenar efectos sin bloquear a usuarios" summary="Compara tres versiones de un retiro. Una solución debe impedir pagos repetidos y conservar los retiros legítimos." scope={<>EVM real en memoria, Shanghai, chainId 31337. Contratos deliberadamente imperfectos, solo educativos. No hay billetera, RPC ni conexión a Ethereum. Las claves de Alice, Bob y Carol son públicas: nunca envíes fondos reales ni las importes en una billetera.</>} steps={steps} step={step} onStep={(next) => { setError(''); worker.clearError(); setStep(next) }} available={[true, Boolean(current), Boolean(current && snapshot.attempt), Boolean(finished)]} busy={worker.busy || (!snapshot && !fatal)} onReset={reset} error={error || worker.error} message={message} support={support}>
    {fatal ? <div className="notice"><p>No se puede confirmar el estado de la sesión. Las operaciones quedan bloqueadas.</p><button type="button" onClick={reset} disabled={worker.busy}>Reiniciar Worker y laboratorio</button></div> : !snapshot ? <p>Preparando la sesión local…</p> : <>
      {step === 0 && <>
        <p>Alice depositará 10 ETH ficticios. Carol controla un contrato que deposita 1 e intenta recibirlo tres veces antes de que termine la primera llamada. Después, Alice intentará retirar su depósito.</p>
        <Field id="security-version" label="Versión que quieres comprobar"><select id="security-version" value={variant} disabled={locked} onChange={(event) => edit(() => setVariant(event.target.value))}>{VARIANTS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field id="security-prediction" label="¿Qué esperas de ambas operaciones?"><select id="security-prediction" value={prediction} disabled={locked} onChange={(event) => edit(() => setPrediction(event.target.value))}><option value="">Selecciona una predicción</option>{PREDICTIONS.map((id) => <option key={id} value={id}>{labels[id]}</option>)}</select></Field>
        <details><summary>Captura técnica opcional</summary><label><input type="checkbox" checked={trace} disabled={locked} onChange={(event) => setTrace(event.target.checked)} /> Capturar instrucciones de la llamada recursiva</label></details>
        <div className="actions"><button type="button" disabled={locked} onClick={prepare}>Preparar escenario nuevo</button></div>
      </>}
      {step === 1 && current && <>
        <p><strong>{versionName(snapshot.variant)}.</strong> Estas posiciones se registraron antes de ambas operaciones; volver a este paso no deshace transacciones.</p>
        <Balances value={snapshot.initial} title="Posiciones iniciales comprobadas" />
        <div className="actions"><button type="button" disabled={locked || snapshot.phase !== 'ready'} onClick={attempt}>Ejecutar llamada recursiva local</button></div>
        {snapshot.phase !== 'ready' && <p>La llamada de este escenario ya se ejecutó. Consulta su resultado o prepara otro escenario.</p>}
      </>}
      {step === 2 && current && snapshot.attempt && <>
        <p className="step-result">Llamada recursiva: status {snapshot.attempt.receipt.status}.</p>
        <Balances value={snapshot.attempt.after} title="Después de la llamada, antes del retiro de Alice" />
        {snapshot.attempt.receipt.status === 1 ? <p>El contrato recursivo retuvo {eth(BigInt(snapshot.attempt.after.callerWei) - UNIT)} ETH ficticios por encima de su depósito de 1, sin descontar gas. El crédito de Alice sigue siendo mayor que el saldo disponible.</p> : <p>La operación revirtió, incluido su depósito de 1. Esto todavía no demuestra una buena reparación: falta comprobar a Alice.</p>}
        <p>Gas usado: {snapshot.attempt.receipt.gasUsed}. Comisión: {eth(snapshot.attempt.receipt.feeWei)} ETH ficticios. Una reversión incluida también consume nonce.</p>
        <div className="actions"><button type="button" disabled={locked || snapshot.phase !== 'attempted'} onClick={withdraw}>Probar retiro legítimo de Alice</button></div>
        <JsonDetails title="Recibo, eventos y traza de la llamada recursiva" value={snapshot.attempt} />
      </>}
      {step === 3 && finished && <>
        <p className="step-result">{labels[outcome]}</p>
        <p>Habías predicho: {labels[snapshot.prediction]} {outcome === snapshot.prediction ? 'Tu predicción coincide con el resultado.' : 'Tu predicción no coincide con el resultado.'}</p>
        <Balances value={snapshot.legitimate.after} title="Posiciones después del retiro legítimo" />
        <p>Retiro de Alice: status {snapshot.legitimate.receipt.status}; gas {snapshot.legitimate.receipt.gasUsed}; comisión {eth(snapshot.legitimate.receipt.feeWei)} ETH ficticios.</p>
        <p>{outcome === 'legitimate-only' ? 'Para este caso, actualizar el crédito antes de la llamada externa conserva la operación legítima e impide los pagos repetidos. No es una garantía de seguridad general.' : outcome === 'neither' ? 'Que la llamada recursiva falle no basta: esta versión también bloquea a Alice y deja sus fondos ficticios inmovilizados.' : 'La llamada externa se realizó antes de actualizar el crédito. Los pagos repetidos dejaron una deuda que el contrato ya no puede cubrir.'}</p>
        <div className="actions"><button type="button" disabled={locked} onClick={() => setStep(0)}>Probar otra versión desde cero</button></div>
        <JsonDetails title="Recibo y cambios de la operación legítima" value={snapshot.legitimate} />
      </>}
    </>}
  </LabShell>
}
