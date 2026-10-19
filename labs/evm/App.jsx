import { useEffect, useRef, useState } from 'react'
import { Field, JsonDetails, LabShell } from '../shared/LabShell.jsx'
import { useWorker } from '../shared/useWorker.jsx'
import { comparisonFor, DEPLOYMENT_GAS, INITIAL_DRAFT, isExecutionResult, isLabState, PRESETS, replayRecord, returnWord, validateDraft } from './model.mjs'

const makeWorker = () => new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' })
const STEPS = ['Elegir y predecir', 'Desplegar y ejecutar', 'Reproducir la traza', 'Comparar el resultado']
const freshDraft = () => structuredClone(INITIAL_DRAFT)
const alice = (snapshot) => snapshot.actors.find((actor) => actor.id === 'alice')

function memoryLines(memory) {
  const bytes = memory.slice(2).match(/.{2}/g) || []
  const lines = []
  for (let offset = 0; offset < bytes.length; offset += 16) lines.push(`${offset.toString(16).padStart(4, '0')}: ${bytes.slice(offset, offset + 16).join(' ')}`)
  return lines.join('\n')
}

export default function App() {
  const { ready, busy: workerBusy, fatal, error: workerError, failure, run: request, restart, clearError } = useWorker(makeWorker, 30_000)
  const [draft, setDraft] = useState(freshDraft)
  const [preset, setPreset] = useState('sum')
  const [prepared, setPrepared] = useState(null)
  const [result, setResult] = useState(null)
  const [state, setState] = useState(null)
  const [step, setStep] = useState(0)
  const [index, setIndex] = useState(0)
  const [error, setError] = useState('')
  const [domainFatal, setDomainFatal] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [sessionEpoch, setSessionEpoch] = useState(0)
  const inputEpoch = useRef(0)

  useEffect(() => {
    if (!ready) return
    let active = true
    setInitializing(true)
    request('snapshot').then((value) => {
      if (!active) return
      if (value && isLabState(value)) setState(value)
      else if (value) {
        setDomainFatal(true)
        setError('El Worker devolvió un estado incompleto. Reinicia antes de continuar.')
      }
      setInitializing(false)
    })
    return () => { active = false }
  }, [ready, sessionEpoch, request])

  useEffect(() => {
    if (!failure) return
    if (!failure.fatal && isLabState(failure.snapshot)) setState(failure.snapshot)
    else setDomainFatal(true)
  }, [failure])

  const blocked = fatal || domainFatal
  useEffect(() => {
    if (!blocked) return
    inputEpoch.current += 1
    setPrepared(null)
    setResult(null)
    setState(null)
    setIndex(0)
    setStep(0)
    setInitializing(false)
    setExecuting(false)
  }, [blocked])
  const busy = workerBusy || initializing || executing
  const locked = busy || blocked || !ready || !state
  const run = result?.run ?? null
  const trace = run?.execution.receipt.trace
  const record = run && trace.records.length ? replayRecord(run, index, result.runId) : null
  const comparison = run ? comparisonFor(run) : null
  const accepted = run?.execution.snapshot.contracts.find((contract) => contract.address === run.address)

  function edit(next, presetId = 'custom') {
    inputEpoch.current += 1
    setDraft(next)
    setPreset(presetId)
    setPrepared(null)
    setResult(null)
    setIndex(0)
    setStep(0)
    setError('')
    clearError()
  }

  function choosePreset(id) {
    const chosen = PRESETS.find((item) => item.id === id)
    if (!chosen) return
    edit({ runtime: chosen.runtime, gasLimit: chosen.gasLimit, prediction: { status: '', slot0: '0', returnValue: id === 'sum' ? '5' : 'vacío' } }, id)
  }

  function predict(field, value) {
    edit({ ...draft, prediction: { ...draft.prediction, [field]: value } }, preset)
  }

  function prepare() {
    setError('')
    clearError()
    try {
      const input = validateDraft(draft)
      const inputId = `entrada-${++inputEpoch.current}`
      setPrepared({ input, draft: structuredClone(draft), inputId })
      setResult(null)
      setIndex(0)
      setStep(1)
    } catch (cause) {
      setError(`Rechazo previo al envío. No hubo despliegue, nonce ni comisión. ${cause.message}`)
    }
  }

  async function execute() {
    if (locked || !prepared || result) return
    const generation = inputEpoch.current
    setExecuting(true)
    setError('')
    const value = await request('run', { draft: prepared.draft, inputId: prepared.inputId })
    if (generation !== inputEpoch.current) return
    try {
      if (value) {
        if (value.inputId !== prepared.inputId || !isExecutionResult(value) || value.run.input.runtime !== prepared.input.runtime || value.run.input.gasLimit !== prepared.input.gasLimit) {
          setDomainFatal(true)
          setError('La respuesta no corresponde a este programa o está incompleta. Reinicia el Worker.')
          return
        }
        setState(value)
        setResult(value)
        setIndex(0)
        setStep(2)
      }
    } catch {
      setDomainFatal(true)
      setError('No se pudo interpretar el estado recibido. Reinicia el Worker.')
    } finally {
      setExecuting(false)
    }
  }

  function reset() {
    inputEpoch.current += 1
    setDraft(freshDraft())
    setPreset('sum')
    setPrepared(null)
    setResult(null)
    setState(null)
    setIndex(0)
    setStep(0)
    setError('')
    setDomainFatal(false)
    setExecuting(false)
    setInitializing(true)
    restart()
    setSessionEpoch((epoch) => epoch + 1)
  }

  const presetDescription = PRESETS.find((item) => item.id === preset)?.description
  const message = blocked ? 'Estado no confiable. Reinicia el Worker para crear una EVM vacía.' : busy ? executing ? 'Desplegando y ejecutando en la EVM local…' : 'Iniciando la EVM local…' : run ? `Ejecución ${run.id} terminada. La reproducción solo cambia la vista.` : state ? `EVM lista. Nonce de Alice: ${alice(state.snapshot).nonce}.` : 'Esperando al Worker local.'

  return <LabShell key={sessionEpoch} chapter={14} title="EVM: ejecutar y después reproducir" summary="Edita bytecode propio, predice el resultado y recorre una traza real grabada antes de cada instrucción." scope="EVM local con reglas Shanghai, no reglas actuales de una red. Cuentas públicas y fondos ficticios. Sin billetera, RPC ni red. No uses fondos ni secretos personales." steps={STEPS} step={step} onStep={setStep} available={[true, Boolean(prepared), Boolean(run), Boolean(run)]} onReset={reset} busy={busy} error={error || workerError} message={message} support={<details className="technical"><summary>Alcance, límites y ayuda técnica</summary>
    <p>La EVM usa Shanghai. TLOAD y TSTORE no están disponibles y fallan como opcodes inválidos. Esto no describe las reglas actuales de Ethereum. No se ejecutan ejemplos del libro.</p>
    <p>El runtime admite de 1 a 4096 bytes hexadecimales. No hay compilación Solidity ni ABI de funciones. ProgramaEVM tiene ABI vacía. Un prefijo de creación propio de 14 bytes copia el runtime ingresado y lo devuelve para instalarlo.</p>
    <p>La transacción de ejecución lleva calldata vacía y valor nativo 0, con límite de 21000 a 200000 gas. Desplegar es otra transacción: su techo fijo es {DEPLOYMENT_GAS} gas, suficiente para depositar el runtime máximo. Cada ejecución crea un contrato nuevo. Máximo 12 despliegues por sesión; reiniciar borra contratos, saldos, nonce e historial.</p>
    <p>La muestra guarda como máximo 512 instrucciones, los últimos 16 elementos de pila, los primeros 128 bytes de memoria y solo los slots persistentes 0 y 1 de la dirección de cada instrucción. No es todo el estado de la VM. Después de la muestra 512, la VM sigue hasta terminar o fallar.</p>
    <p>Gas restante significa gas antes de la instrucción. No se calcula un costo dinámico por opcode a partir de muestras. El gas del recibo incluye gas intrínseco y reembolsos aplicables; no es solo la diferencia entre el primer y el último gas de la traza. Precio efectivo fijo: 12 gwei.</p>
    <p>sourceHash conserva el nombre del campo compartido, pero aquí contiene Keccak-256 de los bytes del runtime. No es hash de fuente Solidity ni prueba de compilación. El hash del código de creación identifica prefijo más runtime. El recibo de creación muestra los bytes devueltos e instalados.</p>
    <p>Worker con plazo de 30 segundos. Un fallo fatal exige reiniciar. La reproducción no envía solicitudes a la VM, no vuelve a ejecutar instrucciones y no cobra más comisiones. No hay persistencia, consenso ni finalidad de red.</p>
  </details>}>
    {blocked && <div className="notice"><p>No se permite continuar con estado desconocido.</p><button type="button" onClick={reset}>Reiniciar Worker</button></div>}
    {busy && <div className="actions"><button type="button" className="secondary" onClick={reset}>Detener y reiniciar Worker</button></div>}

    {step === 0 && <>
      <Field label="Programa inicial" id="evm-preset"><select id="evm-preset" value={preset} disabled={locked} onChange={(event) => choosePreset(event.target.value)}>{PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}<option value="custom" disabled>Bytecode editado</option></select></Field>
      {presetDescription && <p className="guidance">{presetDescription}</p>}
      <Field label="Runtime hexadecimal editable" id="evm-runtime"><textarea id="evm-runtime" className="hex" rows={4} maxLength={8194} value={draft.runtime} spellCheck={false} autoCapitalize="none" autoCorrect="off" disabled={locked} aria-describedby="evm-runtime-help" onChange={(event) => edit({ ...draft, runtime: event.target.value })} /></Field>
      <p id="evm-runtime-help">Con o sin 0x. Máximo 4096 bytes. Cambiar un byte invalida la traza anterior; no cambia contratos ya ejecutados.</p>
      <Field label="Límite de gas de ejecución" id="evm-gas" value={draft.gasLimit} inputMode="numeric" maxLength={6} disabled={locked} onChange={(event) => edit({ ...draft, gasLimit: event.target.value }, preset)} />
      <h3>Predice antes de ejecutar</h3>
      <Field label="Estado que esperas" id="evm-predict-status"><select id="evm-predict-status" value={draft.prediction.status} disabled={locked} onChange={(event) => predict('status', event.target.value)}><option value="">Elige una predicción</option><option value="1">Éxito, status 1</option><option value="0">Fallo incluido, status 0</option></select></Field>
      <div className="fields-grid">
        <Field label="Slot 0 final esperado" id="evm-predict-slot" value={draft.prediction.slot0} maxLength={78} inputMode="numeric" disabled={locked} onChange={(event) => predict('slot0', event.target.value)} />
        <Field label="Retorno esperado: entero o vacío" id="evm-predict-return" value={draft.prediction.returnValue} maxLength={78} disabled={locked} onChange={(event) => predict('returnValue', event.target.value)} />
      </div>
      <p>Un entero representa una palabra de retorno de 32 bytes. Para otros formatos, compara los bytes reales del resultado.</p>
      <div className="actions"><button type="button" disabled={locked} onClick={prepare}>Preparar ejecución</button></div>
    </>}

    {step === 1 && prepared && <>
      <p>Se desplegará ProgramaEVM y luego se enviará una transacción real local, con traza, al runtime instalado. Son dos transacciones y dos comisiones ficticias.</p>
      <dl className="balance-list"><dt>Runtime</dt><dd>{(prepared.input.runtime.length - 2) / 2} bytes</dd><dt>Límite de ejecución</dt><dd>{prepared.input.gasLimit} gas</dd><dt>Valor nativo</dt><dd>0 wei</dd><dt>Predicción de status</dt><dd>{prepared.input.prediction.status}</dd><dt>Predicción del slot 0</dt><dd>{prepared.input.prediction.slot0}</dd><dt>Predicción del retorno</dt><dd>{prepared.input.prediction.returnValue}</dd></dl>
      <JsonDetails title="Revisar entrada inmutable" value={prepared} />
      {run ? <><p className="notice">Esta ejecución ya terminó. Volver a la traza no envía transacciones.</p><button type="button" onClick={() => setStep(2)}>Volver a la reproducción</button></> : <div className="actions"><button type="button" disabled={locked} onClick={execute}>Desplegar y ejecutar con traza</button><button type="button" className="secondary" disabled={locked} onClick={() => setStep(0)}>Volver a editar</button></div>}
    </>}

    {step === 2 && run && <>
      <p className="notice">La VM ya ejecutó toda la transacción. Anterior, siguiente y deslizador solo cambian la muestra visible: no ejecutan la VM ni cobran más gas.</p>
      <p>{trace.records.length} muestras guardadas de {trace.totalInstructions} instrucciones ejecutadas. Traza truncada: <strong>{trace.truncated ? 'sí' : 'no'}</strong>. {trace.truncated && 'La ejecución continuó después del límite de 512; la última muestra no es el estado final.'}</p>
      {record ? <>
        <div className="trace-controls"><button type="button" className="secondary" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>Instrucción anterior</button><output aria-live="polite" aria-atomic="true">Muestra {index + 1} de {trace.records.length}: PC {record.pc}, {record.opcode}</output><button type="button" className="secondary" disabled={index === trace.records.length - 1} onClick={() => setIndex((value) => value + 1)}>Instrucción siguiente</button></div>
        <Field label="Instrucción grabada" id="evm-replay"><input id="evm-replay" type="range" min={1} max={trace.records.length} step={1} value={index + 1} aria-valuetext={`${index + 1} de ${trace.records.length}, PC ${record.pc}, ${record.opcode}`} onChange={(event) => setIndex(Number(event.target.value) - 1)} /></Field>
        <h3>Antes de {record.opcode}, PC {record.pc}</h3>
        <dl className="balance-list"><dt>Profundidad</dt><dd>{record.depth}</dd><dt>Gas restante antes de instrucción</dt><dd>{record.gasLeft}</dd><dt>Slot 0 en esta muestra</dt><dd>{record.slots[0]}</dd><dt>Slot 1 en esta muestra</dt><dd>{record.slots[1]}</dd></dl>
        <h3>Pila previa</h3>
        <p>{record.stackSize} elementos totales; se muestran los últimos {record.stack.length}. Orden de abajo hacia arriba en la pila: la cima está en la última línea de la lista.</p>
        {record.stack.length ? <pre className="hex" tabIndex={0} aria-label="Pila previa, cima en la última línea"><code>{record.stack.map((word, offset) => `${record.stackSize - record.stack.length + offset}: ${word}${offset === record.stack.length - 1 ? ' ← cima' : ''}`).join('\n')}</code></pre> : <p>Pila vacía.</p>}
        <h3>Memoria previa</h3>
        <p>{record.memoryBytes} bytes activos. Muestra del prefijo de hasta 128 bytes; desplazamientos en hexadecimal.</p>
        {record.memory === '0x' ? <p>Sin memoria activa todavía.</p> : <pre className="hex" tabIndex={0} aria-label="Prefijo de memoria previo"><code>{memoryLines(record.memory)}</code></pre>}
        <JsonDetails title="JSON de esta muestra previa" value={record} />
      </> : <p>No hubo instrucciones grabadas. El recibo sigue mostrando el resultado real.</p>}
      <div className="actions"><button type="button" onClick={() => setStep(3)}>Comparar con el estado final</button></div>
    </>}

    {step === 3 && run && <>
      <p className="step-result"><strong>{run.execution.receipt.status === 1 ? 'Éxito incluido, status 1.' : `Fallo incluido, status 0: ${run.execution.receipt.exception}.`}</strong> {run.execution.receipt.status === 0 ? 'Consumió nonce y comisión. Las escrituras de esta transacción se revirtieron.' : 'El estado final aceptó las escrituras de esta transacción.'}</p>
      <div className="table-scroll" role="region" aria-label="Predicción y resultado real" tabIndex={0}><table className="compact-table"><thead><tr><th scope="col">Dato</th><th scope="col">Predicción</th><th scope="col">Resultado real</th><th scope="col">Comparación</th></tr></thead><tbody>
        <tr><th scope="row">Status</th><td>{run.input.prediction.status}</td><td>{comparison.status}</td><td>{comparison.matches.status ? 'Coincide' : 'No coincide'}</td></tr>
        <tr><th scope="row">Slot 0 final</th><td>{run.input.prediction.slot0}</td><td>{comparison.slot0}</td><td>{comparison.matches.slot0 ? 'Coincide' : 'No coincide'}</td></tr>
        <tr><th scope="row">Retorno como palabra</th><td>{run.input.prediction.returnValue}</td><td>{comparison.returnValue ?? 'Otro formato de bytes'}</td><td>{comparison.matches.returnValue ? 'Coincide' : 'No coincide'}</td></tr>
      </tbody></table></div>
      <dl className="balance-list"><dt>Slot 0 aceptado</dt><dd>{accepted.slots[0]}</dd><dt>Slot 1 aceptado</dt><dd>{accepted.slots[1]}</dd><dt>Gas del recibo de ejecución</dt><dd>{run.execution.receipt.gasUsed}</dd><dt>Comisión de ejecución en wei</dt><dd>{run.execution.receipt.feeWei}</dd><dt>Comisión de despliegue en wei</dt><dd>{run.deployment.receipt.feeWei}</dd><dt>Nonce de Alice, ejecución</dt><dd>{alice(run.execution.before).nonce} → {alice(run.execution.snapshot).nonce}</dd><dt>Nonce, despliegue y ejecución</dt><dd>{alice(run.deployment.before).nonce} → {alice(run.execution.snapshot).nonce}</dd></dl>
      <h3>Bytes de retorno reales</h3>
      <pre className="hex" tabIndex={0}><code>{run.execution.receipt.returnData}</code></pre>
      {returnWord(run.execution.receipt.returnData) !== null && <p>Palabra uint256: {returnWord(run.execution.receipt.returnData)}.</p>}
      <p>El gas del recibo incluye gas intrínseco y reembolsos aplicables. No equivale solo a restar el gas de las muestras. {run.execution.receipt.exception === 'out of gas' && `El agotamiento consumió los ${run.input.gasLimit} gas admitidos.`}</p>
      <p className="breakable">Contrato de esta ejecución: <code>{run.address}</code>.</p>
      <JsonDetails title="Identidad de entrada, artefacto y despliegue" value={{ runId: run.id, source: run.source, artifact: run.artifact, runtimeReturnedByCreation: run.deployment.receipt.returnData, deploymentHash: run.deployment.receipt.hash, deploymentCodeHash: accepted.deploymentCodeHash, address: run.address }} />
      <JsonDetails title="JSON completo de la ejecución y sus recibos" value={run} />
      <div className="actions"><button type="button" onClick={() => setStep(2)}>Volver a la traza grabada</button><button type="button" className="secondary" onClick={() => setStep(0)}>Elegir o editar otro programa</button></div>
    </>}
  </LabShell>
}
