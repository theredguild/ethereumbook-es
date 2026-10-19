import { useRef, useState } from 'react'
import { LabShell, Field, JsonDetails } from '../shared/LabShell.jsx'
import { useWorker } from '../shared/useWorker.jsx'
import { randomWitnessValue, MAX_32 } from '../shared/proof-inputs.mjs'
import circuitSource from './circuit.circom?raw'
import manifest from './artifacts/manifest.json'
import { createSession, resetSession, execute, postClaim, publishData, challenge, windowOpen, advanceWindow, beginProve, beginVerify, finishProve, finishVerify, failOperation, cancelOperation, changeCandidate, proofInput, settle, advanceFinality, withdraw, withdrawalEligible, observableFlags } from './model.mjs'

const makeWorker = () => new Worker(new URL('../shared/proof.worker.mjs', import.meta.url), { type: 'module' })
const steps = ['Elegir y ejecutar', 'Publicar afirmación', 'Datos y garantías', 'Liquidar y retirar']
const defaults = { mode: 'optimistic', beforeA: '100', beforeB: '100', amountAB: '30', amountBA: '10' }

export default function App() {
  const [state, setState] = useState(createSession)
  const live = useRef(state)
  const generation = useRef(0)
  const [form, setForm] = useState(defaults)
  const [claimed, setClaimed] = useState(['80', '120'])
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('Elige el tipo de garantía y ejecuta el lote local.')
  const [assetsLoaded, setAssetsLoaded] = useState(false)
  const [phase, setPhase] = useState('')
  const [tamper, setTamper] = useState('proof')
  const [disclosureKey, setDisclosureKey] = useState(0)
  const worker = useWorker(makeWorker, 120_000)

  function put(next) { live.current = next; setState(next) }
  function action(reducer, text, nextStep) {
    setError(''); worker.clearError()
    try {
      put(reducer(live.current))
      setMessage(text)
      if (nextStep !== undefined) setStep(nextStep)
    } catch (cause) { setError(cause.message) }
  }
  function reset() {
    generation.current += 1
    worker.restart()
    setAssetsLoaded(false); setPhase(''); setError('')
    put(resetSession(live.current)); setForm(defaults); setClaimed(['80', '120'])
    setStep(0); setTamper('proof'); setDisclosureKey((value) => value + 1)
    setMessage('Recorrido nuevo. No hay lote, afirmación ni retiro anterior activo.')
  }
  function edit(name, value) {
    if (live.current.claim) return
    generation.current += 1
    put(resetSession(live.current)); setForm((old) => ({ ...old, [name]: value }))
    setError(''); worker.clearError(); setStep(0); setMessage('Cambiaste la entrada. Ejecuta el lote otra vez.')
  }
  function runBatch() {
    setError(''); worker.clearError()
    try {
      const next = execute(live.current, { mode: form.mode, before: [form.beforeA, form.beforeB], amountAB: form.amountAB, amountBA: form.amountBA, salt: randomWitnessValue() })
      put(next); setClaimed([...next.run.after]); setStep(1)
      setMessage('Lote ejecutado. Importes y salt generado quedaron congelados; todavía no hay afirmación pública.')
    } catch (cause) { setError(cause.message) }
  }
  function publish(altered = false) {
    action((current) => publishData(current, { amountAB: altered ? ((BigInt(current.run.amountAB) + 1n) % (MAX_32 + 1n)).toString() : current.run.amountAB, amountBA: current.run.amountBA, salt: current.run.salt }), 'Datos publicados: compromiso comprobado y lote reproducido. Esto no acepta por sí solo el resultado afirmado.')
  }
  function recover() {
    generation.current += 1
    worker.restart(); setAssetsLoaded(false); setPhase('')
    put(cancelOperation(live.current)); setError('')
    setMessage('Worker recreado. Cálculo anterior terminado; lote y afirmación conservados. Vuelve a cargar recursos antes de probar.')
  }
  async function loadAssets() {
    const id = ++generation.current
    setError(''); setPhase('Cargando WASM y clave del sitio…')
    const result = await worker.run('initialize', { relation: 'batch' })
    if (id !== generation.current) return
    setPhase('')
    if (result?.ready && result.relation === 'batch') {
      setAssetsLoaded(true); setMessage('Recursos cargados. Aún no se generó ni verificó una prueba.')
    }
  }
  async function cryptoAction(kind) {
    let started
    setError(''); worker.clearError()
    try {
      started = kind === 'prove' ? beginProve(live.current) : beginVerify(live.current)
      put(started.state)
      setPhase(kind === 'prove' ? 'Generando prueba Groth16 real en Worker…' : 'Verificando prueba y afirmación actual en Worker…')
      const fields = kind === 'prove' ? { relation: 'batch', input: proofInput(started.state) } : { ...started.state.candidate.package }
      const result = await worker.run(kind, fields, 120_000)
      if (live.current.active !== started.ticket) return
      setPhase('')
      if (!result) {
        put(failOperation(live.current, started.ticket))
        setMessage('Cálculo fallido. Ninguna verificación anterior habilita la liquidación.')
        return
      }
      const next = kind === 'prove' ? finishProve(live.current, started.ticket, result) : finishVerify(live.current, started.ticket, result)
      put(next)
      setMessage(kind === 'prove' ? 'Prueba candidata generada. Verifícala por separado; todavía no habilita liquidación.' : next.proofVerified ? 'Prueba válida para la afirmación actual. No publica datos ni finaliza L1.' : 'Candidato rechazado. No habilita liquidación.')
    } catch (cause) {
      if (started && live.current.active !== started.ticket) return
      if (started) put(failOperation(live.current, started.ticket))
      setPhase(''); setError(cause.message)
    }
  }

  const locked = Boolean(state.claim)
  const busy = worker.busy
  const flags = observableFlags(state)
  const available = [true, state.executed, Boolean(state.claim), Boolean(state.claim)]
  const daView = state.dataAvailable ? <div className="step-result"><h3>Datos disponibles en este modelo</h3><p>Orden publicado: A → B {state.publication.amountAB}, luego B → A {state.publication.amountBA}.</p><p>Salt publicado: <code className="hex breakable">{state.publication.salt}</code></p><p>Reproducción desde los saldos iniciales de la afirmación: A {state.publication.replay[0]} / B {state.publication.replay[1]}. Compromiso coincidente.</p></div> : <><p className="notice">Datos no publicados. Tener una prueba no equivale a disponibilidad de datos. Sin datos no se puede impugnar ni retirar en este modelo.</p><button type="button" disabled={busy} onClick={() => publish()}>Publicar importes ordenados y salt</button></>

  return <LabShell chapter="16" title="Del lote al retiro" summary="Ejecuta dos transferencias y separa afirmación, datos, prueba o impugnación, liquidación y finalidad." scope={<><strong>Modelo educativo propio, sin Ethereum, red ni activos reales.</strong> No es un rollup ni una zk-EVM. No incluye autenticación, firmas, nonce, gas o consenso. El navegador del probador conoce el testigo; usa solo datos de demostración generados, nunca secretos personales. Groth16 usa configuración de un solo operador, no apta para producción. Poseidon-lite no está auditado y es sensible al tiempo de ejecución.</>} steps={steps} step={step} onStep={(value) => { setStep(value); setError(''); worker.clearError() }} available={available} onReset={reset} busy={busy} error={error || worker.error} message={busy ? phase : message} support={<div key={disclosureKey}>
    {(busy || worker.fatal) && <div className="actions"><button type="button" onClick={recover}>{busy ? 'Cancelar cálculo y recuperar Worker' : 'Recuperar Worker'}</button>{busy && <button type="button" onClick={reset}>Cancelar y reiniciar todo</button>}</div>}
    <details className="technical"><summary>Estados observables y límites</summary><JsonDetails title="Ver indicadores independientes" value={flags} /><p>Los indicadores executed, dataAvailable, proofVerified, settled y l1Finalized son independientes. La validez de una prueba solo cubre la relación acotada.</p><p>Saldos e importes enteros de 0 a 2³²−1, incluidos saldos intermedios; salt generado de 128 bits. El circuito comprueba A → B y después B → A, conserva unidades y vincula ambos importes ordenados y salt con Poseidon4.</p><p>La ventana de tres pasos y los dos avances de finalidad L1 son relojes manuales educativos, no tiempos reales, bloques ni consenso. Una garantía optimista depende de datos y de alguien que impugne a tiempo; la prueba de validez comprueba esta relación. Ninguna implica finalidad L1 instantánea. No se modelan secuenciación basada, atomicidad entre rollups ni sus garantías.</p><p>Primera carga necesita recursos del sitio. Recursos ya cargados permiten cálculo local sin red; recrear Worker puede necesitar el sitio de nuevo. No hay garantía PWA, persistencia ni borrado seguro del testigo.</p></details>
    <details className="technical"><summary>Circuito, paquete completo y procedencia</summary><pre className="hex" tabIndex="0"><code>{circuitSource}</code></pre><JsonDetails title="Manifiesto de configuración y hashes" value={manifest} />{state.claim && <JsonDetails title="Afirmación pública inmutable" value={state.claim} />}{state.candidate && <JsonDetails title="Paquete público completo: prueba, entradas y relación" value={state.candidate.package} />}{state.settlement && <JsonDetails title="Liquidación aceptada inmutable" value={state.settlement} />}<p>El paquete de prueba no incluye importes, salt ni testigo. Publicar datos es una acción diferente que sí revela importes y salt. Ambas funciones ocurren en este navegador, no entre dos partes independientes.</p></details>
  </div>}>
    {step === 0 && <>
      <p>Saldos iniciales A 100 / B 100. El caso predeterminado transfiere 30 de A a B y luego 10 de B a A: resultado A 80 / B 120.</p>
      {locked && <p className="notice">La afirmación ya está publicada. Entradas bloqueadas; reinicia para cambiar el experimento sin alterar su historia.</p>}
      <Field label="Garantía del recorrido" id="scaling-mode"><select id="scaling-mode" value={form.mode} disabled={locked || busy} onChange={(event) => edit('mode', event.target.value)}><option value="optimistic">Optimista: ventana e impugnación</option><option value="validity">Validez: prueba Groth16 real</option></select></Field>
      <div className="fields-grid"><Field id="scaling-ab" label="Primero A → B" inputMode="numeric" maxLength={10} value={form.amountAB} disabled={locked || busy} onChange={(event) => edit('amountAB', event.target.value)} /><Field id="scaling-ba" label="Después B → A" inputMode="numeric" maxLength={10} value={form.amountBA} disabled={locked || busy} onChange={(event) => edit('amountBA', event.target.value)} /></div>
      <details key={disclosureKey} className="technical"><summary>Saldos iniciales del experimento</summary><div className="fields-grid"><Field id="scaling-before-a" label="Saldo inicial A" inputMode="numeric" maxLength={10} disabled={locked || busy} value={form.beforeA} onChange={(event) => edit('beforeA', event.target.value)} /><Field id="scaling-before-b" label="Saldo inicial B" inputMode="numeric" maxLength={10} disabled={locked || busy} value={form.beforeB} onChange={(event) => edit('beforeB', event.target.value)} /></div></details>
      <div className="actions"><button type="button" disabled={locked || busy} onClick={runBatch}>Ejecutar y congelar lote</button></div>
    </>}
    {step === 1 && state.run && <>
      <p>Ejecución local: A {state.run.before[0]} / B {state.run.before[1]} → A {state.run.middle[0]} / B {state.run.middle[1]} → A {state.run.after[0]} / B {state.run.after[1]}.</p>
      <p>Compromiso público del lote: <code className="hex breakable">{state.run.commitment}</code></p>
      <p>Importes y salt quedan privados en el testigo local hasta que publiques datos. No están ocultos al navegador del probador.</p>
      <p>Puedes afirmar un resultado incorrecto a propósito. Publicarlo no cambia la ejecución ni demuestra validez.</p>
      <div className="fields-grid"><Field id="scaling-claim-a" label="Saldo final afirmado A" inputMode="numeric" maxLength={10} value={claimed[0]} disabled={locked || busy} onChange={(event) => setClaimed([event.target.value, claimed[1]])} /><Field id="scaling-claim-b" label="Saldo final afirmado B" inputMode="numeric" maxLength={10} value={claimed[1]} disabled={locked || busy} onChange={(event) => setClaimed([claimed[0], event.target.value])} /></div>
      <div className="actions"><button type="button" disabled={locked || busy} onClick={() => action((current) => postClaim(current, claimed), 'Afirmación publicada e inmutable. No está liquidada.', 2)}>Publicar afirmación inmutable</button></div>
      {state.claim && <p className="step-result">Afirmación publicada: A {state.claim.after[0]} / B {state.claim.after[1]}.</p>}
    </>}
    {step === 2 && state.claim && <>
      <p>Afirmación actual: A {state.claim.after[0]} / B {state.claim.after[1]}. {state.settled ? 'Liquidación cerrada; candidato bloqueado.' : 'Todavía debes resolver su garantía.'}</p>
      {daView}
      {!state.dataAvailable && <details className="technical"><summary>Probar publicación incorrecta</summary><p>Cambia A → B en el envío de datos, sin cambiar la afirmación.</p><button type="button" disabled={busy} onClick={() => publish(true)}>Intentar publicar datos alterados</button></details>}
      {state.mode === 'optimistic' ? <>
        <h3>Ventana educativa {state.windowStep}/3</h3>
        <p>{state.invalidated ? 'Afirmación invalidada por reproducción. Esperar no la vuelve válida.' : windowOpen(state) ? 'Ventana abierta. Una impugnación necesita datos y debe ocurrir antes del tercer avance.' : 'Ventana cerrada. Ya no se admiten impugnaciones.'}</p>
        <div className="actions"><button type="button" disabled={busy || state.settled || state.invalidated} onClick={() => action(challenge, 'Impugnación procesada mediante reproducción del lote publicado.')}>Impugnar por reproducción</button><button type="button" disabled={busy || state.settled || state.windowStep === 3} onClick={() => action(advanceWindow, 'Reloj educativo avanzado. No equivale a un bloque ni a tiempo real.')}>Avanzar ventana un paso</button></div>
        {state.challengeResult && <p className="step-result">{state.challengeResult === 'invalidated' ? 'La reproducción detectó un resultado incorrecto. Liquidación bloqueada permanentemente para esta afirmación.' : 'Impugnación fallida: la afirmación coincide con la reproducción. No es una prueba criptográfica.'}</p>}
      </> : <>
        <h3>Prueba de la relación acotada</h3><p>La prueba vincula exactamente saldos iniciales, saldos finales afirmados y compromiso. Afirmar 81/119 en este lote impide generar una prueba válida.</p>
        <p>{assetsLoaded ? 'WASM y clave cargados.' : 'Worker disponible no significa recursos cargados. Carga WASM y clave del sitio.'}</p>
        <div className="actions">{!assetsLoaded && <button type="button" disabled={busy || !worker.ready || state.settled} onClick={loadAssets}>Cargar recursos de prueba</button>}<button type="button" disabled={busy || !assetsLoaded || !worker.ready || state.settled} onClick={() => cryptoAction('prove')}>Generar prueba candidata</button>{state.candidate && <button type="button" disabled={busy || !assetsLoaded || !worker.ready || state.settled} onClick={() => cryptoAction('verify')}>Verificar candidato actual</button>}</div>
        <p className="step-result">{state.proofVerified ? 'Prueba verificada para esta afirmación. Datos y finalidad siguen separados.' : state.verificationResult === 'rejected' ? 'Candidato rechazado. Restaura o genera otro y vuelve a verificar.' : state.candidate ? 'Candidato sin verificación vigente.' : 'Sin prueba candidata vigente.'}</p>
        {state.candidate && <details className="technical"><summary>Alterar y restaurar candidato público</summary><p>La afirmación publicada no cambia. Cada cambio o restauración borra la verificación del candidato. Tras liquidar, este experimento queda bloqueado.</p><Field label="Cambio del candidato" id="scaling-tamper"><select id="scaling-tamper" value={tamper} disabled={busy || state.settled} onChange={(event) => setTamper(event.target.value)}><option value="proof">Punto de la prueba</option><option value="before">Saldo inicial público A</option><option value="after">Saldo final público A</option><option value="commitment">Compromiso público</option></select></Field><div className="actions"><button type="button" disabled={busy || state.settled} onClick={() => action((current) => changeCandidate(current, tamper), 'Candidato alterado. Verificación anterior anulada.')}>Alterar candidato</button><button type="button" disabled={busy || state.settled} onClick={() => action((current) => changeCandidate(current, 'restore'), 'Candidato original restaurado, todavía sin verificar.')}>Restaurar candidato original</button></div></details>}
      </>}
      <div className="actions"><button type="button" disabled={busy} onClick={() => setStep(3)}>Revisar liquidación y retiro</button></div>
    </>}
    {step === 3 && state.claim && <>
      <p>Afirmación A {state.claim.after[0]} / B {state.claim.after[1]}.</p>
      <p>{state.mode === 'optimistic' ? 'Liquidación optimista acepta una suposición tras la ventana sin impugnación exitosa. No demuestra validez, incluso si nadie detectó un resultado incorrecto.' : 'Liquidación por validez exige la prueba verificada de esta relación, no de una zk-EVM.'}</p>
      {!state.settled ? <button type="button" disabled={busy} onClick={() => action(settle, 'Afirmación liquidada. Todavía no hay finalidad L1 ni retiro.', 3)}>Intentar liquidar afirmación</button> : <div className="step-result"><h3>Liquidación aceptada</h3><p>{state.settlement.basis === 'optimistic-assumption' ? 'Aceptada bajo supuesto optimista; no probada criptográficamente.' : 'Relación acotada probada y aceptada.'}</p><p>La afirmación y su liquidación no se pueden editar con un candidato posterior.</p></div>}
      <h3>Finalidad L1 sintética {state.finalityStep}/2</h3><p>Solo después de liquidar: primer avance registra inclusión educativa; segundo registra finalidad educativa. No ejecuta consenso ni mide finalidad de Ethereum.</p>
      <button type="button" disabled={busy || !state.settled || state.l1Finalized} onClick={() => action(advanceFinality, state.finalityStep === 0 ? 'Primer paso posterior a liquidación: inclusión educativa, todavía sin finalidad.' : 'Segundo paso: finalidad L1 sintética alcanzada. No es consenso real.')}>Avanzar finalidad L1 educativa</button>
      <h3>Disponibilidad de datos</h3>{daView}
      <h3>Retiro educativo</h3><p>{state.withdrawn ? 'Retiro registrado una sola vez. No se movieron activos.' : withdrawalEligible(state) ? 'Retiro habilitado: liquidación actual + datos + finalidad L1 educativa.' : 'Retiro pendiente: exige liquidación actual, datos publicados y finalidad L1 educativa.'}</p>
      <button type="button" disabled={busy || state.withdrawn} onClick={() => action(withdraw, 'Retiro educativo registrado. No puede repetirse.')}>Intentar retiro educativo</button>
      <JsonDetails title="Ver estados independientes de este recorrido" value={flags} />
    </>}
  </LabShell>
}
