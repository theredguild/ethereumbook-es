import { useRef, useState } from 'react'
import { LabShell, JsonDetails } from '../shared/LabShell.jsx'
import { useWorker } from '../shared/useWorker.jsx'
import { randomWitnessValue } from '../shared/proof-inputs.mjs'
import {
  emptyState, newRun, beginProve, proverInput, completeProve, beginVerify,
  completeVerify, failOperation, cancelOperation, tamperCandidate, restoreCandidate,
} from './model.mjs'
import circuitSource from './circuit.circom?raw'
import manifest from './artifacts/manifest.json'

const makeWorker = () => new Worker(new URL('../shared/proof.worker.mjs', import.meta.url), { type: 'module' })
const steps = ['Generar testigo', 'Probar relación', 'Verificar paquete', 'Alterar y recuperar']

// This view receives no witness. The browser hosting both roles still knows it.
function VerifierPanel({ candidate, expectedCommitment, verification, busy, onVerify }) {
  return <>
    <p>La afirmación que se comprueba es: existen secret y salt de 128 bits tales que Poseidon3([17, secret, salt]) es igual al compromiso esperado.</p>
    <dl>
      <div><dt>Compromiso esperado, fijado al generar el testigo</dt><dd className="hex breakable">{expectedCommitment}</dd></div>
      <div><dt>Compromiso del paquete candidato</dt><dd className="hex breakable">{candidate.publicSignals[0]}</dd></div>
    </dl>
    <p>El verificador recibe solamente proof, publicSignals y relation: knowledge. No recibe secret ni salt. La clave de verificación pública del circuito ya está incluida en el laboratorio.</p>
    <div className="actions"><button type="button" disabled={busy} onClick={onVerify}>Verificar paquete actual</button></div>
    {!verification && <p className="guidance">Sin verificación actual. Cada cambio, incluso restaurar el original, exige verificar otra vez.</p>}
    {verification && <div className="step-result" role="status">
      <h3>{verification.accepted ? 'Aceptado para la afirmación esperada' : 'Rechazado para la afirmación esperada'}</h3>
      <p>Verificación Groth16: {verification.cryptographicallyValid ? 'válida' : 'inválida'}. Coincidencia con el compromiso esperado: {verification.matchesExpected ? 'sí' : 'no'}.</p>
      {verification.cryptographicallyValid && !verification.matchesExpected && <p>Una prueba válida de otra afirmación no demuestra la afirmación original.</p>}
    </div>}
    <JsonDetails title="Inspeccionar paquete público, sin testigo" value={candidate} />
  </>
}

export default function App() {
  const [state, setState] = useState(emptyState)
  const current = useRef(state)
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [localError, setLocalError] = useState('')
  const [notice, setNotice] = useState('Genera datos nuevos de demostración. No hay campos para introducir secretos personales.')
  const [disclosures, setDisclosures] = useState(0)
  const generation = useRef(0)
  const worker = useWorker(makeWorker, 120_000)
  const busy = Boolean(state.pending) || worker.busy

  function commit(next) {
    current.current = next
    setState(next)
  }

  function restartWorker() {
    generation.current += 1
    setInitialized(false)
    setPhase('')
    worker.restart()
    worker.clearError()
    setLocalError('')
  }

  function reset() {
    restartWorker()
    commit(emptyState(current.current.runId + 1))
    setStep(0)
    setDisclosures((value) => value + 1)
    setNotice('Recorrido reiniciado. No hay testigo, paquete ni verificación actuales. Esto no garantiza borrado seguro de memoria.')
  }

  function generate() {
    try {
      const next = newRun(current.current, randomWitnessValue(), randomWitnessValue())
      restartWorker()
      commit(next)
      setStep(1)
      setDisclosures((value) => value + 1)
      setNotice('Testigo de demostración generado. El compromiso público quedó fijado para este recorrido.')
    } catch (cause) {
      setLocalError(cause.message)
    }
  }

  function cancel() {
    restartWorker()
    commit(cancelOperation(current.current))
    setNotice('Cálculo cancelado. Se terminó el Worker real. Se conservan el testigo y el compromiso; no se conserva una verificación válida. Puedes volver a calcular.')
  }

  async function prove(wrongWitness = false) {
    let identity
    const epoch = generation.current
    try {
      worker.clearError()
      setLocalError('')
      const next = beginProve(current.current, wrongWitness)
      identity = next.pending
      const input = proverInput(next)
      commit(next)
      setStep(1)
      setNotice(wrongWitness ? 'Intento con secret + 1 módulo 2^128 y el compromiso original. El circuito WASM debe rechazar este testigo.' : 'Generando una prueba nueva con el testigo de este recorrido.')
      if (!initialized) {
        setPhase('loading')
        const loaded = await worker.run('initialize', { relation: 'knowledge' }, 120_000)
        if (current.current.pending !== identity || generation.current !== epoch) return
        if (loaded?.ready !== true || loaded.relation !== 'knowledge') {
          commit(failOperation(current.current, identity, 'No se cargaron los recursos. Reintenta o reinicia el Worker.'))
          setNotice('No se generó ningún paquete.')
          return
        }
        setInitialized(true)
      }
      setPhase('proving')
      const result = await worker.run('prove', { relation: 'knowledge', input }, 120_000)
      if (current.current.pending !== identity || generation.current !== epoch) return
      if (!result) {
        commit(failOperation(current.current, identity, wrongWitness ? 'El intento falló. Revisa el diagnóstico real del probador; no hay paquete de este intento.' : 'No se completó la prueba. No hay paquete de este intento.'))
        setNotice('Intento fallido. Se descartó el paquete anterior antes de calcular; no hay éxito reutilizado.')
        return
      }
      commit(completeProve(current.current, identity, result))
      setStep(2)
      setNotice('Prueba real generada. Aún falta verificarla contra la afirmación esperada.')
    } catch (cause) {
      if (generation.current !== epoch) return
      if (identity) commit(failOperation(current.current, identity, cause.message))
      else setLocalError(cause.message)
    } finally {
      if (generation.current === epoch) setPhase('')
    }
  }

  async function verify() {
    let identity
    const epoch = generation.current
    try {
      worker.clearError()
      setLocalError('')
      const next = beginVerify(current.current)
      identity = next.pending
      commit(next)
      setPhase('verifying')
      setNotice('Comprobando Groth16 y comparando con el compromiso esperado, sin enviar el testigo al verificador.')
      const result = await worker.run('verify', next.candidate, 120_000)
      if (current.current.pending !== identity || generation.current !== epoch) return
      if (!result) {
        commit(failOperation(current.current, identity, 'No se pudo verificar. No hay aceptación actual.'))
        setNotice('Verificación no completada. Reintenta o reinicia el Worker.')
        return
      }
      const completed = completeVerify(current.current, identity, result)
      commit(completed)
      setNotice(completed.verification.accepted ? 'Aceptado: Groth16 válido y compromiso esperado coincidente.' : 'Rechazado: la prueba o el compromiso no satisfacen la afirmación esperada.')
    } catch (cause) {
      if (generation.current !== epoch) return
      if (identity) commit(failOperation(current.current, identity, cause.message))
      else setLocalError(cause.message)
    } finally {
      if (generation.current === epoch) setPhase('')
    }
  }

  function edit(target) {
    try {
      worker.clearError()
      setLocalError('')
      commit(target === 'restore' ? restoreCandidate(current.current) : tamperCandidate(current.current, target))
      setNotice(target === 'restore' ? 'Paquete original restaurado. Debes verificarlo otra vez.' : 'Paquete candidato modificado. Se invalidó la verificación anterior; el compromiso esperado no cambió.')
    } catch (cause) { setLocalError(cause.message) }
  }

  const phaseMessage = worker.fatal ? 'Worker no disponible. El paquete se conserva, pero no se muestra una aceptación actual. Reinicia el Worker y vuelve a verificar.' : phase === 'loading' ? 'Cargando WASM, clave de generación y clave de verificación del sitio…' : phase === 'proving' ? 'Probador Groth16 en ejecución real. Puedes cancelar el cálculo.' : phase === 'verifying' ? 'Verificador Groth16 en ejecución real…' : notice
  const verifier = state.candidate && <VerifierPanel candidate={state.candidate} expectedCommitment={state.claim.expectedCommitment} verification={worker.fatal ? null : state.verification} busy={busy || !worker.ready || worker.fatal} onVerify={verify} />

  return <LabShell chapter={17} title="Probar conocimiento de un testigo" summary="Genera un compromiso, produce una prueba Groth16 real y verifica exactamente la afirmación que elegiste. Después altera el paquete y observa qué se rechaza."
    scope={<><p>Material educativo local, sin billetera, RPC, fondos reales ni conexión a Ethereum. Usa únicamente datos de demostración generados aquí, nunca secretos personales.</p><p>El navegador y el probador ven el testigo; las herramientas de desarrollo pueden leerlo. La afirmación de conocimiento cero se limita al paquete público del verificador, que no incluye secret ni salt. Ambos roles se muestran en el mismo navegador, no son dos partes aisladas.</p><p>Configuración de confianza de un solo operador, no apta para producción. No se garantiza destrucción de secretos de configuración ni borrado seguro de memoria.</p></>}
    steps={steps} step={step} onStep={setStep} available={[true, Boolean(state.claim), Boolean(state.candidate), Boolean(state.candidate)]} onReset={reset} busy={busy} error={localError || worker.error || state.error} message={phaseMessage}>
    <div key={`run-${state.runId}-${step}-${disclosures}`}>
      {step === 0 && <>
        <p>Se generan secret y salt independientes, cada uno con 128 bits de aleatoriedad criptográfica. No escribas ni pegues información privada.</p>
        <p>El compromiso público será Poseidon3([17, secret, salt]). El dominio fijo 17 distingue esta relación educativa de otras relaciones.</p>
        <div className="actions"><button type="button" onClick={generate}>Generar testigo de demostración</button></div>
      </>}
      {step === 1 && state.claim && <>
        <p>Compromiso esperado de este recorrido</p><p className="hex breakable">{state.claim.expectedCommitment}</p>
        <p>El probador ejecuta las restricciones del circuito. La prueba no existe hasta que termine este cálculo.</p>
        <p>{initialized ? 'Recursos cargados en este Worker.' : 'Recursos aún no cargados. El primer cálculo los solicita al sitio; crear el Worker no significa que ya estén listos.'}</p>
        {state.attempt === 'failed' && <p className="notice">Intento fallido. No hay paquete ni verificación de éxito de este intento. Restaura el testigo correcto y genera una prueba nueva.</p>}
        {state.attempt === 'canceled' && <p className="notice">Intento cancelado. No hay paquete de este intento.</p>}
        <div className="actions">
          <button type="button" disabled={busy || !worker.ready || worker.fatal} onClick={() => prove(false)}>{state.attempt === 'failed' || state.attempt === 'canceled' ? 'Restaurar testigo correcto y generar prueba nueva' : 'Generar prueba real'}</button>
          <button type="button" disabled={busy || !worker.ready || worker.fatal} onClick={() => prove(true)}>Intentar con testigo incorrecto</button>
        </div>
        <details className="technical"><summary>Advertencia: mostrar testigo de demostración</summary>
          <p>Estos valores no son secretos frente a este navegador. El probador los usa y las herramientas de desarrollo pueden leerlos. Nunca uses datos personales. Abrir este detalle revela ambos valores en pantalla.</p>
          <dl><div><dt>secret generado</dt><dd className="hex breakable">{state.witness.secret}</dd></div><div><dt>salt generado</dt><dd className="hex breakable">{state.witness.salt}</dd></div></dl>
          <p>El intento incorrecto cambia secret a secret + 1 módulo 2^128, conserva salt y conserva el compromiso original. No se omite el probador ni se simula su error.</p>
        </details>
      </>}
      {step === 2 && verifier && <>{verifier}<div className="actions"><button type="button" disabled={busy} onClick={() => setStep(3)}>Alterar y recuperar</button></div></>}
      {step === 3 && verifier && <>
        <p>Cambia un dato y vuelve a verificar. Restaurar el paquete no restaura una aceptación anterior.</p>
        <div className="actions">
          <button type="button" disabled={busy} onClick={() => edit('proof')}>Cambiar punto de la prueba</button>
          <button type="button" disabled={busy} onClick={() => edit('commitment')}>Cambiar compromiso público</button>
          <button type="button" disabled={busy} onClick={() => edit('restore')}>Restaurar paquete original</button>
        </div>
        {verifier}
        <div className="actions"><button type="button" disabled={busy || !worker.ready || worker.fatal} onClick={() => prove(true)}>Intentar con testigo incorrecto</button></div>
      </>}
      {state.claim && <div className="actions"><button type="button" onClick={generate}>Generar otro testigo</button></div>}
      {busy && <div className="actions"><button type="button" onClick={cancel}>Cancelar cálculo</button></div>}
      {worker.fatal && !busy && <div className="actions"><button type="button" onClick={cancel}>Reiniciar Worker y conservar recorrido</button></div>}
      <details className="technical"><summary>Alcance, recursos y límites del circuito</summary>
        <p>Solo se prueba que existen dos enteros entre 0 y 2^128 − 1 cuyo Poseidon3, con dominio 17, coincide con un compromiso público del campo escalar bn128. No se prueba identidad, titularidad, secreto frente al navegador, ejecución de programas generales ni Ethereum completo.</p>
        <p>Groth16 depende de los supuestos de su configuración de confianza. Los artefactos incluidos corresponden a una configuración educativa de un solo operador. Este recorrido no demuestra una ceremonia multipartita ni la eliminación de su residuo tóxico.</p>
        <p>poseidon-lite no está auditado para este uso y puede filtrar información por tiempos de ejecución. Se usa únicamente con datos de demostración. Una prueba correcta no convierte este sitio en un sistema seguro para fondos.</p>
        <p>El cálculo y el estado quedan en memoria del navegador. No se usa almacenamiento persistente. La primera carga requiere recursos del sitio; recursos ya cargados pueden funcionar sin conexión en el mismo Worker. Reiniciar o cancelar crea otro Worker y puede necesitar el sitio de nuevo. No hay garantía de funcionamiento sin conexión ni de borrado seguro.</p>
        <details><summary>Código del circuito educativo</summary><pre className="hex" tabIndex="0"><code>{circuitSource}</code></pre></details>
        <JsonDetails title="Procedencia y hashes de los artefactos" value={manifest} />
      </details>
    </div>
  </LabShell>
}
