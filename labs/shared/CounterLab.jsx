import { useEffect, useRef, useState } from 'react'
import { LabShell, Field, JsonDetails } from './LabShell.jsx'
import { createCompiler } from './compilers.mjs'
import { createWorkerClient } from './worker-client.mjs'
import { callData, constructorData, decodeLogs, readResult } from './contracts.mjs'
import { SOLIDITY_SOURCE, VYPER_SOURCE } from './counter-source.mjs'

const makeEVM = () => new Worker(new URL('./evm.worker.mjs', import.meta.url), { type: 'module' })
const initialSource = (language) => language === 'Vyper' ? VYPER_SOURCE : SOLIDITY_SOURCE
const actorState = (snapshot, id) => snapshot.actors.find((actor) => actor.id === id)
const validSnapshot = (snapshot) => snapshot && Array.isArray(snapshot.actors) && ['alice', 'bob', 'carol'].every((id) => snapshot.actors.some((actor) => actor.id === id && /^\d+$/.test(actor.nonce) && /^\d+$/.test(actor.balanceWei))) && Array.isArray(snapshot.contracts) && Array.isArray(snapshot.receipts) && /^\d+$/.test(snapshot.blockNumber)
const validReceipt = (receipt) => receipt && [0, 1].includes(receipt.status) && /^0x[\da-f]{64}$/i.test(receipt.hash) && /^\d+$/.test(receipt.gasUsed) && /^\d+$/.test(receipt.feeWei) && Array.isArray(receipt.logs)

function incompatibility(artifact, language = 'Solidity') {
  if (!artifact) return language === 'Vyper' ? 'La fuente compiló, pero no produjo un único contrato Vyper desplegable.' : 'La fuente compiló, pero no produjo un contrato desplegable llamado LabCounter.'
  const functions = [
    ['value', [], ['uint256'], true],
    ['owner', [], ['address'], true],
    ['set_value', ['uint256'], [], false],
    ['fail', [], [], false],
  ]
  for (const [name, inputs, outputs, readOnly] of functions) {
    if (!artifact.abi.some((item) => item.type === 'function' && item.name === name && JSON.stringify((item.inputs || []).map((input) => input.type)) === JSON.stringify(inputs) && JSON.stringify((item.outputs || []).map((output) => output.type)) === JSON.stringify(outputs) && (readOnly ? ['view', 'pure'].includes(item.stateMutability) : ['nonpayable', 'payable'].includes(item.stateMutability)))) return `La fuente compiló, pero falta la firma del ejercicio: ${name}(${inputs.join(',')}).`
  }
  const event = artifact.abi.find((item) => item.type === 'event' && item.name === 'ValueChanged' && !item.anonymous && item.inputs?.length === 2 && item.inputs[0].type === 'address' && item.inputs[0].indexed && item.inputs[1].type === 'uint256' && !item.inputs[1].indexed)
  if (!event) return 'La fuente compiló, pero falta el evento ValueChanged(address indexed sender, uint256 value).'
  if (artifact.abi.some((item) => item.type === 'constructor' && item.inputs?.length)) return 'La fuente compiló, pero este ejercicio requiere un constructor sin argumentos.'
  return ''
}

function checkedCall(result) {
  if (!result?.call || ![0, 1].includes(result.call.status) || typeof result.call.returnData !== 'string' || !validSnapshot(result.snapshot)) throw new Error('La EVM devolvió una llamada incompleta.')
  return result
}

function valueReading(artifact, result) {
  checkedCall(result)
  if (result.call.status !== 1) return { value: null, error: `value() no pudo leerse: ${result.call.exception || 'reversión'}. La lógica editada también afecta las lecturas.` }
  try {
    return { value: readResult(artifact.abi, 'value', result.call.returnData).toString(), error: '' }
  } catch (cause) {
    return { value: null, error: `No se pudo decodificar value(): ${cause.message}` }
  }
}

async function compareCases(client, artifact) {
  const fresh = await client.request('snapshot')
  if (!validSnapshot(fresh.snapshot) || fresh.snapshot.contracts.length || fresh.snapshot.blockNumber !== '0') throw new Error('La comparación requiere una EVM nueva.')
  const deployment = await client.request('deploy', { artifact, options: { actor: 'alice', constructorData: constructorData(artifact.abi) } })
  if (!validReceipt(deployment.receipt) || deployment.receipt.status !== 1 || !deployment.receipt.createdAddress) throw new Error('El contrato de comparación no se pudo desplegar.')
  const to = deployment.receipt.createdAddress
  const cases = [
    { label: 'set_value(7), Alice', actor: 'alice', method: 'set_value', args: [7n] },
    { label: 'set_value(1001), Alice', actor: 'alice', method: 'set_value', args: [1001n] },
    { label: 'set_value(7), Bob', actor: 'bob', method: 'set_value', args: [7n] },
    { label: 'fail(), Alice', actor: 'alice', method: 'fail', args: [] },
  ]
  const results = []
  for (const item of cases) {
    const transaction = await client.request('transact', { options: { actor: item.actor, to, data: callData(artifact.abi, item.method, item.args) } })
    if (!validReceipt(transaction.receipt) || !validSnapshot(transaction.snapshot)) throw new Error('La comparación recibió una transacción incompleta.')
    const reading = await client.request('call', { options: { to, data: callData(artifact.abi, 'value') } })
    const observed = valueReading(artifact, reading)
    results.push({ label: item.label, status: transaction.receipt.status, value: observed.value, valueError: observed.error, receipt: transaction.receipt })
  }
  return { sourceHash: artifact.sourceHash, compiler: artifact.compiler, address: to, deploymentReceipt: deployment.receipt, cases: results }
}

export default function CounterLab({ language }) {
  const vyper = language === 'Vyper'
  const [source, setSource] = useState(() => initialSource(language))
  const [step, setStep] = useState(0)
  const [compilation, setCompilation] = useState(null)
  const [instance, setInstance] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [outcome, setOutcome] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [actor, setActor] = useState('alice')
  const [amount, setAmount] = useState('7')
  const [busy, setBusy] = useState('init')
  const [fatal, setFatal] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('Iniciando la EVM local…')
  const [disclosures, setDisclosures] = useState(0)
  const mounted = useRef(false)
  const evm = useRef(null)
  const compiler = useRef(null)
  const comparisonResources = useRef([])
  const comparisonEpoch = useRef(0)
  const revision = useRef(0)
  const execution = useRef(0)
  const compileEpoch = useRef(0)
  const generation = useRef(0)
  const active = useRef('init')
  const artifact = compilation?.revision === revision.current && !compilation.incompatible && !compilation.result.diagnostics.some((item) => item.severity === 'error') ? compilation.artifact : null
  const currentOutcome = outcome && outcome.id === execution.current && outcome.instanceId === instance?.id && outcome.revision === revision.current ? outcome : null
  const currentComparison = comparison?.revision === revision.current && comparison.sourceHash === artifact?.sourceHash ? comparison : null
  const locked = Boolean(busy) || fatal || !snapshot
  const steps = ['Editar y compilar', 'Desplegar', 'Interactuar', 'Resultado', ...(vyper ? ['Comparar lenguajes'] : [])]

  function createEVMClient() {
    const epoch = generation.current
    const client = createWorkerClient(makeEVM, 45_000, (cause) => {
      if (!mounted.current || evm.current !== client || epoch !== generation.current) return
      generation.current += 1
      compileEpoch.current += 1
      execution.current += 1
      compiler.current?.dispose()
      compiler.current = null
      comparisonResources.current.forEach((resource) => resource.dispose())
      comparisonResources.current = []
      active.current = ''
      setBusy('')
      setFatal(true)
      setSnapshot(null)
      setOutcome(null)
      setComparison(null)
      setError(cause.message)
      setMessage('La EVM local se detuvo. Reinicia para confirmar una sesión nueva.')
    })
    return client
  }

  useEffect(() => {
    mounted.current = true
    const epoch = ++generation.current
    let client
    try {
      client = createEVMClient()
      evm.current = client
      client.request('snapshot').then((result) => {
        if (!mounted.current || epoch !== generation.current) return
        if (!validSnapshot(result.snapshot)) throw new Error('No se pudo confirmar el estado inicial de la EVM.')
        setSnapshot(result.snapshot)
        setMessage('Edita el contrato original de este laboratorio y compílalo.')
      }).catch((cause) => {
        if (mounted.current && epoch === generation.current) { setFatal(true); setError(cause.message) }
      }).finally(() => {
        if (mounted.current && epoch === generation.current) { active.current = ''; setBusy('') }
      })
    } catch (cause) {
      setFatal(true)
      setError(cause.message)
      active.current = ''
      setBusy('')
    }
    return () => {
      mounted.current = false
      generation.current += 1
      compileEpoch.current += 1
      evm.current?.dispose()
      evm.current = null
      compiler.current?.dispose()
      comparisonResources.current.forEach((resource) => resource.dispose())
    }
  }, [])

  function begin(kind, status) {
    if (active.current || fatal || !snapshot) return false
    active.current = kind
    setBusy(kind)
    setError('')
    setMessage(status)
    return true
  }

  function finish() {
    if (!mounted.current) return
    active.current = ''
    setBusy('')
  }

  async function request(action, fields = {}) {
    try {
      const result = await evm.current.request(action, fields)
      if (!validSnapshot(result.snapshot) || (['deploy', 'transact'].includes(action) && (!validReceipt(result.receipt) || !validSnapshot(result.before))) || (action === 'call' && (!result.call || ![0, 1].includes(result.call.status) || typeof result.call.returnData !== 'string'))) {
        throw Object.assign(new Error('Respuesta EVM incompleta. El estado es desconocido; reinicia la EVM.'), { fatal: true })
      }
      if (mounted.current) setSnapshot(result.snapshot)
      return result
    } catch (cause) {
      if (mounted.current) {
        if (!cause.fatal && validSnapshot(cause.snapshot)) setSnapshot(cause.snapshot)
        else { setFatal(true); setSnapshot(null); setOutcome(null); setComparison(null) }
      }
      throw cause
    }
  }

  function invalidateResult() {
    execution.current += 1
    setOutcome(null)
    setError('')
  }

  function editSource(text) {
    revision.current += 1
    invalidateResult()
    setSource(text)
    setCompilation(null)
    setComparison(null)
    setStep(0)
    setMessage('Fuente editada. Recompila para desplegar esta revisión; la instancia anterior sigue en la EVM.')
    setDisclosures((value) => value + 1)
  }

  async function compileSource() {
    if (new TextEncoder().encode(source).length > 16_384) { setError('La fuente admite hasta 16 KiB de UTF-8. Reduce el texto antes de compilar.'); return }
    if (!begin('compile', 'Cargando el compilador y compilando en un Worker…')) return
    const epoch = ++compileEpoch.current
    const sourceRevision = revision.current
    invalidateResult()
    setCompilation(null)
    setComparison(null)
    try {
      compiler.current ||= createCompiler(language)
      const result = await compiler.current.compile(source)
      if (!mounted.current || epoch !== compileEpoch.current || sourceRevision !== revision.current) return
      if (!Array.isArray(result.contracts) || !Array.isArray(result.diagnostics) || !result.sourceHash) throw new Error('El compilador devolvió una respuesta incompleta.')
      const selected = vyper ? (result.contracts.length === 1 ? result.contracts[0] : null) : result.contracts.find((item) => item.name === 'LabCounter')
      const syntaxFailure = result.diagnostics.some((item) => item.severity === 'error')
      const incompatible = syntaxFailure ? '' : incompatibility(selected, language)
      setCompilation({ revision: sourceRevision, result, artifact: selected, incompatible })
      if (syntaxFailure) { setError('La compilación falló. Revisa los diagnósticos reales del compilador y corrige la fuente.'); setMessage('No se creó un artefacto desplegable.') }
      else if (incompatible) { setError(incompatible); setMessage('Compilación válida, interfaz incompatible con este ejercicio. No es un error de sintaxis.') }
      else { setStep(1); setMessage('Compilación válida. El artefacto pertenece a esta revisión de la fuente.') }
    } catch (cause) {
      if (mounted.current && epoch === compileEpoch.current) {
        compiler.current?.dispose()
        compiler.current = null
        setError(cause.message)
        setMessage('Puedes volver a compilar. La EVM y sus contratos no se borraron.')
      }
    } finally {
      if (epoch === compileEpoch.current) finish()
    }
  }

  function cancelCompile() {
    compileEpoch.current += 1
    compiler.current?.dispose()
    compiler.current = null
    setError('')
    setMessage('Compilación cancelada. La sesión EVM y sus contratos se conservan. Puedes volver a compilar.')
    finish()
  }

  async function deploy() {
    if (!artifact || !begin('deploy', 'Firmando y ejecutando el despliegue…')) return
    const selected = artifact
    const sourceRevision = revision.current
    invalidateResult()
    try {
      const result = await request('deploy', { artifact: selected, options: { actor: 'alice', constructorData: constructorData(selected.abi) } })
      if (result.receipt.status !== 1 || !result.receipt.createdAddress) throw new Error(`El despliegue revirtió: ${result.receipt.exception || 'status 0'}. Gas usado: ${result.receipt.gasUsed}.`)
      if (sourceRevision !== revision.current || !mounted.current) return
      setInstance({ id: result.receipt.hash, address: result.receipt.createdAddress, artifact: selected, receipt: result.receipt, revision: sourceRevision })
      setStep(2)
      setMessage('Contrato desplegado por Alice. Ahora puedes enviar una transacción o hacer una llamada sin transacción.')
    } catch (cause) { if (mounted.current) setError(cause.message) }
    finally { finish() }
  }

  async function interact(kind) {
    if (!instance) return
    let next
    if (['set', 'simulate'].includes(kind)) {
      if (!/^\d{1,78}$/.test(amount) || BigInt(amount) >= 1n << 256n) { setError('Usa un entero uint256 no negativo, de hasta 78 dígitos.'); return }
      next = BigInt(amount)
    }
    if (!begin('execute', 'Ejecutando la operación y leyendo el valor desde la EVM…')) return
    invalidateResult()
    const id = execution.current
    const sourceRevision = revision.current
    const deployed = instance
    try {
      const readOptions = { actor, to: deployed.address, data: callData(deployed.artifact.abi, 'value') }
      const beforeRead = await request('call', { options: readOptions })
      const observedBefore = valueReading(deployed.artifact, beforeRead)
      let operation = beforeRead
      if (kind !== 'read') {
        const options = { actor, to: deployed.address, data: callData(deployed.artifact.abi, kind === 'fail' ? 'fail' : 'set_value', kind === 'fail' ? [] : [next]) }
        operation = await request(kind === 'simulate' ? 'call' : 'transact', { options })
      }
      const afterRead = kind === 'read' ? beforeRead : await request('call', { options: readOptions })
      const observedAfter = kind === 'read' ? observedBefore : valueReading(deployed.artifact, afterRead)
      const beforeActor = actorState(beforeRead.snapshot, actor)
      const afterActor = actorState(afterRead.snapshot, actor)
      if (!mounted.current || id !== execution.current || sourceRevision !== revision.current) return
      setOutcome({ id, revision: sourceRevision, instanceId: deployed.id, kind, actor, amount: next?.toString(), valueBefore: observedBefore.value, valueBeforeError: observedBefore.error, valueAfter: observedAfter.value, valueAfterError: observedAfter.error, status: operation.receipt?.status ?? operation.call.status, receipt: operation.receipt || null, call: operation.call || null, events: operation.receipt ? decodeLogs(deployed.artifact.abi, operation.receipt.logs) : [], nonceBefore: beforeActor.nonce, nonceAfter: afterActor.nonce, chargedWei: (BigInt(beforeActor.balanceWei) - BigInt(afterActor.balanceWei)).toString(), before: beforeRead.snapshot, after: afterRead.snapshot })
      setStep(3)
      setMessage(kind === 'read' || kind === 'simulate' ? 'Llamada ejecutada sin incluir una transacción. Sus escrituras se descartaron.' : operation.receipt.status === 0 ? 'Transacción incluida con status 0. La reversión conserva el estado, pero consume gas y nonce.' : observedAfter.error ? 'Transacción incluida. La lectura value() falló; el recibo y sus costos siguen confirmados.' : 'Transacción incluida. El valor y los eventos provienen de esta ejecución.')
    } catch (cause) { if (mounted.current) { setError(cause.message); setMessage('No se completó la comprobación. Esto no demuestra que una transacción ya incluida haya revertido. Reinicia si la EVM se detuvo.') } }
    finally { finish() }
  }

  async function compare() {
    if (!vyper || !artifact || !begin('compare', 'Compilando Solidity y ejecutando cuatro casos en dos EVM nuevas…')) return
    const sourceRevision = revision.current
    const epoch = generation.current
    const ticket = ++comparisonEpoch.current
    const selected = artifact
    setComparison(null)
    const resources = []
    comparisonResources.current = resources
    try {
      const secondary = createCompiler('Solidity')
      resources.push(secondary)
      const compiled = await secondary.compile(SOLIDITY_SOURCE)
      const solidity = compiled.contracts.find((item) => item.name === 'LabCounter')
      if (compiled.diagnostics.some((item) => item.severity === 'error') || incompatibility(solidity)) throw new Error('No se pudo compilar la referencia Solidity de la comparación.')
      const solidityVM = createWorkerClient(makeEVM)
      resources.push(solidityVM)
      const vyperVM = createWorkerClient(makeEVM)
      resources.push(vyperVM)
      const solidityResult = await compareCases(solidityVM, solidity)
      const vyperResult = await compareCases(vyperVM, selected)
      if (!mounted.current || epoch !== generation.current || ticket !== comparisonEpoch.current || sourceRevision !== revision.current) return
      setComparison({ revision: sourceRevision, sourceHash: selected.sourceHash, solidity: solidityResult, vyper: vyperResult })
      setStep(4)
      setMessage('Comparación terminada. La EVM interactiva no recibió ninguna de estas transacciones.')
    } catch (cause) { if (mounted.current && epoch === generation.current && ticket === comparisonEpoch.current) { setError(cause.message); setMessage('La comparación no avanzó ni cambió la EVM interactiva. Puedes reintentar.') } }
    finally {
      resources.forEach((resource) => resource.dispose())
      if (comparisonResources.current === resources) comparisonResources.current = []
      if (epoch === generation.current && ticket === comparisonEpoch.current) finish()
    }
  }

  function cancelComparison() {
    comparisonEpoch.current += 1
    comparisonResources.current.forEach((resource) => resource.dispose())
    comparisonResources.current = []
    setError('')
    setMessage('Comparación cancelada. El borrador y la EVM interactiva se conservan. Puedes volver a comparar.')
    finish()
    document.getElementById('step-title')?.focus()
  }

  async function reset() {
    if (active.current) return
    active.current = 'reset'
    setBusy('reset')
    setError('')
    setMessage(fatal ? 'Creando una EVM nueva…' : 'Confirmando el reinicio de la EVM…')
    try {
      if (fatal) {
        evm.current?.dispose()
        evm.current = createEVMClient()
      }
      const result = await request(fatal ? 'snapshot' : 'reset')
      if (result.snapshot.contracts.length || result.snapshot.receipts.length || result.snapshot.blockNumber !== '0' || result.snapshot.actors.some((item) => item.nonce !== '0' || item.balanceWei !== '100000000000000000000')) throw Object.assign(new Error('La EVM no confirmó un estado inicial limpio.'), { fatal: true })
      if (!mounted.current) return
      revision.current += 1
      execution.current += 1
      compileEpoch.current += 1
      compiler.current?.dispose()
      compiler.current = null
      setSource(initialSource(language))
      setCompilation(null)
      setInstance(null)
      setOutcome(null)
      setComparison(null)
      setActor('alice')
      setAmount('7')
      setStep(0)
      setFatal(false)
      setDisclosures((value) => value + 1)
      setMessage('EVM reiniciada y confirmada. Fuente original restaurada; cada actor vuelve a tener 100 ETH ficticios y nonce 0.')
    } catch (cause) { if (mounted.current) { setError(cause.message); if (cause.fatal) { setFatal(true); setSnapshot(null) } } }
    finally { finish() }
  }

  const scope = <>
    <strong>Ejercicio original, no es un ejemplo del libro ni un IDE general.</strong> EVM real en memoria con reglas Shanghai y chainId 31337. Alice, Bob y Carol usan claves privadas educativas conocidas públicamente y 100 ETH ficticios cada uno. Nunca envíes fondos reales a estas direcciones ni importes estas claves en una billetera. No hay billetera, RPC, red Ethereum ni persistencia.
  </>
  const runtimeHelp = <details><summary>Recursos, conexión y límites</summary>
    <p>Compiladores y recursos se cargan desde este mismo sitio; la primera carga requiere acceso al sitio. Una vez cargados los Workers y sus recursos, la ejecución en memoria no necesita red. No hay descarga desde CDN ni garantía de uso sin conexión después de recargar, cancelar o recrear un Worker. La comparación crea Workers nuevos y puede requerir cargar recursos otra vez.</p>
    <p>Fuente máxima de 16 KiB UTF-8; cada solicitud al compilador admite 120 segundos y cada solicitud EVM 45 segundos. Se admiten hasta 12 despliegues por sesión y hasta 4 millones de gas por transacción; los detalles del estado conservan los últimos 20 recibos. La ejecución local no demuestra seguridad, consenso ni finalidad.</p>
  </details>
  const sourceBytes = new TextEncoder().encode(source).length

  return <LabShell chapter={vyper ? 8 : 7} title={vyper ? 'Vyper: mismo comportamiento, otro lenguaje' : 'Solidity: contrato paso a paso'} summary="Edita, compila y ejecuta un contrato propio del laboratorio. Cada cambio de lógica se ejecuta en una EVM real." scope={scope} support={runtimeHelp} steps={steps} step={step} available={[true, Boolean(artifact), Boolean(instance), Boolean(currentOutcome), ...(vyper ? [Boolean(currentComparison)] : [])]} onStep={(next) => { setStep(next); setError('') }} onReset={reset} busy={Boolean(busy)} error={error} message={message}>
    {fatal ? <div className="notice"><p>El estado de la EVM es desconocido. Despliegues, transacciones y llamadas están bloqueados. El borrador no se borra hasta confirmar una sesión nueva.</p><button type="button" disabled={Boolean(busy)} onClick={reset}>Reiniciar EVM y laboratorio</button></div> : <>
      {step === 0 && <>
        <p>Conserva {vyper ? 'un único contrato en esta fuente' : <>el nombre <code>LabCounter</code></>}, constructor sin argumentos, <code>value() → uint256</code>, <code>owner() → address</code>, <code>set_value(uint256)</code>, <code>fail()</code> y el evento <code>ValueChanged(address indexed sender, uint256 value)</code>. Puedes editar la lógica y los requisitos. La interfaz solo comprueba estas firmas, no impone el comportamiento original.</p>
        <p className="guidance">Prueba cambiar <code>{vyper ? 'self.value = next' : 'value = next'}</code> por <code>{vyper ? 'self.value = next * 2' : 'value = next * 2'}</code>. Al enviar 7, la lectura debe devolver 14. El evento conserva su propia lógica editable.</p>
        <Field id="counter-source" label={`Fuente ${language} editable`}><textarea id="counter-source" value={source} onChange={(event) => editSource(event.target.value)} disabled={Boolean(busy)} rows={22} spellCheck={false} autoCapitalize="off" autoCorrect="off" aria-describedby="source-limit" /></Field>
        <p id="source-limit">{sourceBytes} / 16384 bytes UTF-8. {instance ? 'Hay una instancia anterior en la EVM; editar o cancelar la compilación no la elimina.' : 'Todavía no hay una instancia desplegada.'}</p>
        <div className="actions"><button type="button" disabled={locked} onClick={compileSource}>Compilar fuente</button>{busy === 'compile' && <button type="button" onClick={cancelCompile}>Cancelar compilación</button>}</div>
        {compilation && <div key={`diagnostics-${disclosures}`}>
          <h3>Diagnósticos del compilador</h3>
          <p>{compilation.result.diagnostics.some((item) => item.severity === 'error') ? 'Compilación fallida.' : compilation.incompatible ? 'Compilación válida; interfaz incompatible con el ejercicio.' : 'Compilación válida.'}</p>
          {compilation.result.diagnostics.map((item, index) => <pre className="hex" key={index} tabIndex="0">{item.severity}: {item.message}</pre>)}
          <JsonDetails title="Detalles de compilación" value={compilation.result} />
        </div>}
        {instance && <div className="actions"><button type="button" disabled={locked} onClick={() => setStep(2)}>Volver a la instancia desplegada</button></div>}
      </>}
      {step === 1 && artifact && <>
        <p>La fuente actual compiló. Desplegar crea una instancia nueva, no actualiza la anterior. Alice será quien ejecute el constructor.</p>
        {compilation.result.diagnostics.length > 0 && <details key={`warnings-${disclosures}`}><summary>Advertencias del compilador</summary>{compilation.result.diagnostics.map((item, index) => <pre className="hex" tabIndex="0" key={index}>{item.severity}: {item.message}</pre>)}</details>}
        <div className="actions"><button type="button" disabled={locked} onClick={deploy}>Desplegar con Alice</button>{vyper && <button type="button" disabled={locked} onClick={compare}>Comparar con Solidity</button>}</div>
        <JsonDetails key={`artifact-${disclosures}`} title="Detalles del artefacto: compilador, Shanghai, hash, ABI y bytecode" value={artifact} />
      </>}
      {step === 2 && instance && <>
        <p>Opera sobre la instancia desplegada por Alice. {instance.revision !== revision.current && 'Esta instancia pertenece a una revisión anterior; no ejecuta el borrador actual.'}</p>
        <p className="guidance">Sin editar la fuente original: Alice puede guardar 7; 1001, Bob y fail() revierten. Una reversión incluida cobra gas y consume nonce. Una llamada no incluye una transacción y descarta sus escrituras.</p>
        <div className="fields-grid">
          <Field id="counter-actor" label="Actor público"><select id="counter-actor" value={actor} disabled={locked} onChange={(event) => { invalidateResult(); setActor(event.target.value) }}><option value="alice">Alice, despliega y es propietaria en la fuente original</option><option value="bob">Bob, otro actor</option></select></Field>
          <Field id="counter-value" label="Valor uint256 para set_value" inputMode="numeric" value={amount} disabled={locked} onChange={(event) => { invalidateResult(); setAmount(event.target.value) }} />
        </div>
        <div className="actions"><button type="button" disabled={locked} onClick={() => interact('set')}>Enviar set_value</button><button type="button" disabled={locked} onClick={() => interact('fail')}>Enviar fail</button><button type="button" disabled={locked} onClick={() => interact('read')}>Leer value sin transacción</button><button type="button" disabled={locked} onClick={() => interact('simulate')}>Simular set_value sin transacción</button></div>
        <JsonDetails key={`deployment-${disclosures}`} title="Identidad del despliegue y estado confirmado" value={{ address: instance.address, deploymentTransaction: instance.id, sourceHash: instance.artifact.sourceHash, compiler: instance.artifact.compiler, evmVersion: instance.artifact.evmVersion, currentDraftRevision: revision.current, deployedRevision: instance.revision, snapshot }} />
      </>}
      {step === 3 && currentOutcome && <>
        <p className="step-result">Valor leído antes: <strong>{currentOutcome.valueBefore ?? 'No disponible'}</strong>. Valor leído después: <strong>{currentOutcome.valueAfter ?? 'No disponible'}</strong>.</p>
        {currentOutcome.valueBeforeError && currentOutcome.valueBeforeError !== currentOutcome.valueAfterError && <p className="notice">Lectura previa no disponible: {currentOutcome.valueBeforeError}</p>}
        {currentOutcome.valueAfterError && <p className="notice">Lectura de value() no disponible: {currentOutcome.valueAfterError} {currentOutcome.receipt && 'El resultado de esa lectura no cambia el recibo de la operación.'}</p>}
        <p>{currentOutcome.receipt ? `Transacción incluida con status ${currentOutcome.status}. Gas usado: ${currentOutcome.receipt.gasUsed}. Eventos: ${currentOutcome.events.length}.` : `Llamada sin transacción con status ${currentOutcome.status}. No hay recibo ni evento incluido; las escrituras se descartan.`}</p>
        <p>Nonce de {currentOutcome.actor}: {currentOutcome.nonceBefore} → {currentOutcome.nonceAfter}. Comisión cobrada: {currentOutcome.chargedWei} wei.</p>
        {currentOutcome.status === 0 && <p className="notice">La operación revirtió. El estado persistente se conserva; si hubo transacción, su comisión y su nonce sí se consumieron.</p>}
        <div className="actions"><button type="button" disabled={locked} onClick={() => { invalidateResult(); setStep(2) }}>Probar otra operación</button><button type="button" disabled={locked} onClick={() => setStep(0)}>Editar fuente</button>{vyper && artifact && <button type="button" disabled={locked} onClick={compare}>Comparar con Solidity</button>}</div>
        <JsonDetails key={`outcome-${disclosures}-${currentOutcome.id}`} title="Detalles de esta ejecución y sus eventos" value={{ deployment: { address: instance.address, sourceHash: instance.artifact.sourceHash, compiler: instance.artifact.compiler, evmVersion: 'shanghai', transaction: instance.id }, execution: currentOutcome }} />
      </>}
      {step === 4 && currentComparison && <>
        <p>Cuatro transacciones por lenguaje, en orden, después de desplegar con Alice en dos sesiones nuevas e independientes. Vyper usa tu artefacto editado; Solidity usa la fuente original del laboratorio. La sesión interactiva sigue intacta.</p>
        <div className="table-scroll" tabIndex="0" role="region" aria-label="Comparación semántica entre Solidity y Vyper"><table className="compact-table"><thead><tr><th scope="col">Caso</th><th scope="col">Solidity: status / valor</th><th scope="col">Vyper: status / valor</th><th scope="col">Misma semántica observada</th></tr></thead><tbody>{currentComparison.solidity.cases.map((item, index) => {
          const other = currentComparison.vyper.cases[index]
          return <tr key={item.label}><th scope="row">{item.label}</th><td>{item.status} / {item.value ?? 'No disponible'}{item.valueError && <p>{item.valueError}</p>}</td><td>{other.status} / {other.value ?? 'No disponible'}{other.valueError && <p>{other.valueError}</p>}</td><td>{item.value === null || other.value === null ? 'No comparable' : item.status === other.status && item.value === other.value ? 'Sí' : 'No'}</td></tr>
        })}</tbody></table></div>
        <p>La fuente original da status/valor 1/7, 0/7, 0/7 y 0/7. Si editas lógica o requisitos, la comparación puede diferir legítimamente. Estos casos no prueban equivalencia general. No se exige igualdad de gas, almacenamiento ni bytecode.</p>
        <div className="actions"><button type="button" disabled={locked} onClick={() => setStep(0)}>Editar fuente</button>{instance && <button type="button" disabled={locked} onClick={() => setStep(2)}>Volver a la instancia desplegada</button>}</div>
        <JsonDetails key={`comparison-${disclosures}`} title="Compiladores, hashes, despliegues y recibos de comparación" value={currentComparison} />
      </>}
    </>}
    {busy === 'compare' && <div className="actions"><button type="button" onClick={cancelComparison}>Cancelar comparación</button></div>}
  </LabShell>
}
