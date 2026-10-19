import { useEffect, useRef, useState } from 'react'
import { LabShell, Field, JsonDetails } from '../shared/LabShell.jsx'
import { createWorkerClient } from '../shared/worker-client.mjs'
import { callData, decodeLogs, readResult } from '../shared/contracts.mjs'
import { SOLIDITY_SOURCE } from '../shared/counter-source.mjs'
import artifact from '../shared/counter-artifact.json' with { type: 'json' }
import { CHAIN_ID, GAS_LIMIT, createLocalProvider } from './provider.mjs'

const steps = ['Conectar cuentas locales', 'Preparar solicitud', 'Inspeccionar y decidir', 'Verificar inclusión']
const unknownHash = `0x${'ff'.repeat(32)}`
const errorText = (error) => `${error.code ?? 'Error'}: ${error.message}`

export default function App() {
  const resource = useRef(null)
  const current = useRef({})
  const [view, setView] = useState(null)
  const [step, setStep] = useState(0)
  const [value, setValue] = useState('7')
  const [prepared, setPrepared] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('Creando EVM local…')
  const [advanced, setAdvanced] = useState(null)
  const [resetKey, setResetKey] = useState(0)

  function failSession(cause) {
    if (!resource.current) return
    current.current = {}
    setPrepared(null)
    setResult(null)
    setAdvanced(null)
    setStep(0)
    const failure = resource.current.provider.fail(cause)
    setError(errorText(failure))
    setMessage('Worker detenido o no disponible. Reinicia para crear una EVM y permisos nuevos.')
  }

  function createSessionClient() {
    const client = createWorkerClient(() => new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' }), 45_000, (cause) => {
      if (resource.current?.client !== client) return
      failSession(cause)
    })
    return client
  }

  useEffect(() => {
    const provider = createLocalProvider((action, fields) => resource.current.client.request(action, { fields }))
    resource.current = { provider, client: null }
    const off = provider.on('change', setView)
    let live = true
    try {
      const client = createSessionClient()
      resource.current.client = client
      provider.initialize().then((result) => { if (live && result && resource.current?.client === client) setMessage('EVM lista. El permiso de cuentas todavía no está concedido.') }).catch((cause) => { if (live && resource.current?.client === client) setError(errorText(cause)) })
    } catch (cause) {
      failSession(cause)
    }
    return () => { live = false; current.current = {}; off(); provider.dispose(); resource.current?.client?.dispose(); resource.current = null }
  }, [])
  const provider = resource.current?.provider
  const pending = view?.pending
  const state = view?.state
  const busy = view?.running ?? true
  const usable = !!state && !view?.unavailable
  const actor = state?.snapshot.actors.find((item) => item.id === view.selected)

  function invalidate() {
    current.current = {}
    if (pending) provider.reject(pending.id)
    setPrepared(null)
    setResult(null)
    setAdvanced(null)
    setError('')
  }
  async function reset() {
    invalidate()
    setStep(0)
    setValue('7')
    setResetKey((key) => key + 1)
    setMessage('Reiniciando EVM y permisos…')
    let client = resource.current?.client
    try {
      if (!client || client.closed) {
        client?.dispose()
        client = createSessionClient()
        resource.current.client = client
      }
      const initialized = await provider.initialize()
      if (initialized && resource.current?.client === client) setMessage('Nuevo recorrido. Valor 0; permisos revocados. Alice conserva solo el nonce y la comisión del nuevo despliegue.')
    } catch (cause) { if (resource.current?.client === client) failSession(cause) }
  }
  async function connect() {
    const token = {}
    current.current = token
    setError('')
    setMessage('Decide si autorizas las cuentas educativas. Todavía no se envía una transacción.')
    try {
      await provider.request({ method: 'eth_requestAccounts' })
      if (current.current !== token) return
      setStep(1)
      setMessage('Permiso concedido. Alice y Bob están autorizados; solo se expone la cuenta seleccionada.')
    } catch (cause) { if (current.current === token) setError(errorText(cause)) }
  }
  function selectActor(next) {
    invalidate()
    try {
      provider.selectActor(next)
      setStep(view.permission ? 1 : 0)
      setMessage(`Cuenta seleccionada: ${next === 'alice' ? 'Alice' : 'Bob'}. Se emitió accountsChanged; la EVM no cambió.`)
    } catch (cause) { setError(errorText(cause)) }
  }
  function revoke() {
    invalidate()
    provider.revoke()
    setStep(0)
    setMessage('Permiso revocado; accountsChanged emitió []. No se desconectó una red ni se borró el estado EVM.')
  }
  async function prepare() {
    invalidate()
    if (!/^\d{1,4}$/.test(value) || BigInt(value) > 1001n) { setError('Usa un entero de 0 a 1001. El contrato rechaza 1001 después de la inclusión.'); return }
    const token = {}
    current.current = token
    const generation = provider.view().epoch
    const before = structuredClone(provider.view().state)
    const transaction = { chainId: CHAIN_ID, from: provider.view().accounts[0], to: before.address, data: callData(artifact.abi, 'set_value', [BigInt(value)]), value: '0x0', gas: GAS_LIMIT }
    setPrepared({ transaction, value, actor: view.selected })
    setStep(2)
    setMessage('Solicitud sin firmar. Rechazar no consume gas ni nonce.')
    try {
      const hash = await provider.request({ method: 'eth_sendTransaction', params: [transaction] })
      if (current.current !== token || provider.view().epoch !== generation) return
      const receipt = await provider.request({ method: 'eth_getTransactionReceipt', params: [hash] })
      if (!receipt || receipt.transactionHash !== hash) throw new Error('No se encontró el recibo de esta solicitud.')
      const readback = await provider.request({ method: 'eth_call', params: [{ from: provider.view().accounts[0], to: before.address, data: callData(artifact.abi, 'value'), chainId: CHAIN_ID }, 'latest'] })
      const logs = await provider.request({ method: 'eth_getLogs', params: [{ address: before.address, fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }] })
      if (current.current !== token || provider.view().epoch !== generation) return
      const verifiedValue = readResult(artifact.abi, 'value', readback).toString()
      const ownLogs = logs.filter((log) => log.transactionHash === hash)
      setResult({ hash, receipt, verifiedValue, events: decodeLogs(artifact.abi, ownLogs), before, after: provider.view().state, epoch: generation })
      setStep(3)
      setMessage(receipt.status === '0x1' ? 'Transacción incluida localmente. La lectura EVM verificó el valor; no se copió el formulario.' : 'Transacción incluida con status 0. Cambios revertidos; nonce y comisión consumidos.')
    } catch (cause) {
      if (current.current === token && provider.view().epoch === generation) { setError(errorText(cause)); setMessage('No hay un resultado nuevo. Puedes preparar otra solicitud.') }
    }
  }
  async function approveTransaction() {
    if (pending?.kind !== 'transaction') return
    const token = current.current
    setError('')
    setMessage('Solicitud aprobada. Firma y ejecución local en curso; espera el recibo.')
    try {
      await provider.approve(pending.id)
    } catch (cause) {
      if (current.current === token) setError(errorText(cause))
    }
  }

  async function advancedRequest(kind) {
    const token = current.current
    setError('')
    setAdvanced(null)
    try {
      let answer
      if (kind === 'unsupported') answer = await provider.request({ method: 'eth_blockNumber' })
      if (kind === 'receipt') answer = await provider.request({ method: 'eth_getTransactionReceipt', params: [unknownHash] })
      if (kind === 'rollback') answer = await provider.request({ method: 'eth_call', params: [{ from: provider.view().accounts[0], to: state.address, data: callData(artifact.abi, 'fail') }, 'latest'] })
      if (current.current === token) setAdvanced({ method: kind, result: answer })
    } catch (cause) { if (current.current === token) setAdvanced({ method: kind, error: { code: cause.code, message: cause.message } }) }
  }

  return <LabShell chapter={12} title="De frontend a EVM local" summary="Autoriza una cuenta, revisa una solicitud y comprueba su recibo y sus eventos reales."
    scope="Claves privadas educativas conocidas públicamente y ETH ficticio. No ingreses secretos. Sin billetera, extensión, RPC ni red. Subconjunto local de EIP-1193, no una implementación completa."
    steps={steps} step={step} onStep={setStep} available={[true, usable && !!view?.permission, usable && !!prepared, !!result && result.epoch === view?.epoch]}
    onReset={reset} busy={busy} error={error} message={message}
    support={<div key={resetKey}>
      <details className="technical"><summary>Cómo funciona este modelo local</summary>
        <p>El frontend llama request({`{ method, params }`}) en un proveedor propio, nunca en window.ethereum. El intermediario de consentimiento vive fuera del Worker. El Worker solo ejecuta operaciones EVM; esperar aprobación no ocupa su cola.</p>
        <p>Al aprobar, EthereumJS firma con la clave privada educativa, conocida públicamente, de la cuenta seleccionada e incluye la transacción automáticamente en el siguiente bloque local. No hay propagación P2P, espera de mempool, consenso ni finalidad.</p>
        <p>Cadena 31337, chainId 0x7a69, reglas Shanghai. Límite de gas fijo 1000000; comisión efectiva 12 gwei por gas usado. El despliegue inicial consume nonce y comisión de Alice. eth_call ejecuta con checkpoint y descarta escrituras y logs; no cobra gas.</p>
        <p>Solo Alice y Bob; permiso conjunto con una cuenta seleccionada. No se implementan suscripciones, cambio de red, filtros generales, bloques históricos ni RPC completo. Recibos y logs se limitan a los últimos 20 recibos locales, con address obligatorio en eth_getLogs. Un hash desconocido devuelve null, no implica que esté pendiente en una red.</p>
        <p>Rechazar cancela antes de firmar. Revocar no borra la EVM ni deshace una transacción ya aprobada. Si la revocación interrumpe una respuesta EVM, el proveedor exige reinicio para no mostrar estado incierto.</p>
      </details>
      <details className="technical"><summary>Inspector del proveedor y pruebas avanzadas</summary>
        <p>Diario real del proveedor, máximo 20 entradas entre solicitudes, respuestas y errores. No registra tráfico de red.</p>
        <JsonDetails title="Solicitudes y respuestas" value={view?.journal || []} />
        <div className="actions"><button type="button" disabled={!usable || busy || !!pending} onClick={() => advancedRequest('unsupported')}>Probar método no admitido</button><button type="button" disabled={!usable || busy || !!pending} onClick={() => advancedRequest('receipt')}>Consultar hash desconocido</button><button type="button" disabled={!usable || busy || !!pending || !view?.permission} onClick={() => advancedRequest('rollback')}>Probar eth_call que revierte</button></div>
        {advanced && <JsonDetails title="Resultado de la consulta avanzada" value={advanced} />}
      </details>
      <details className="technical"><summary>Contrato, ABI e identidad del despliegue</summary><pre className="hex" tabIndex="0"><code>{SOLIDITY_SOURCE}</code></pre><JsonDetails title="Artefacto compilado y ABI" value={artifact} /><JsonDetails title="Identidad y estado EVM actual" value={state} /></details>
    </div>}>
    {step === 0 && <>
      <p>{busy ? 'Preparando la sesión EVM local…' : usable ? 'El contrato ya existe en la EVM local. Conectar solo concede permiso a la DApp; no ejecuta set_value ni cobra gas.' : 'No hay una sesión EVM disponible. Reinicia el laboratorio antes de conectar cuentas.'}</p>
      {pending?.kind === 'accounts' ? <>
        <p>¿Permitir que esta DApp use Alice y Bob? Sus claves privadas de prueba son conocidas públicamente. Cuenta seleccionada: {view.selected === 'alice' ? 'Alice' : 'Bob'}.</p>
        <div className="actions"><button type="button" onClick={() => void provider.approve(pending.id)}>Conceder permiso</button><button type="button" onClick={() => provider.reject(pending.id)}>Rechazar conexión</button></div>
      </> : view?.permission ? <><p>Permiso activo para {view.selected === 'alice' ? 'Alice' : 'Bob'}.</p><div className="actions"><button type="button" disabled={!usable || busy} onClick={() => setStep(1)}>Preparar solicitud</button><button type="button" disabled={busy} onClick={revoke}>Revocar permiso</button></div></> : <button type="button" disabled={!usable || busy} onClick={() => void connect()}>Solicitar conexión local</button>}
    </>}
    {step === 1 && <>
      <p>Valor verificado en EVM: <strong>{state?.value}</strong>. Alice es propietaria. Bob puede autorizar una solicitud, pero el contrato rechazará su escritura.</p>
      <div className="fields-grid"><Field label="Cuenta seleccionada" id="dapp-actor"><select id="dapp-actor" value={view.selected} disabled={busy} onChange={(event) => selectActor(event.target.value)}><option value="alice">Alice, propietaria</option><option value="bob">Bob, sin permiso de escritura</option></select></Field><Field label="Nuevo valor para set_value" id="dapp-value" inputMode="numeric" value={value} disabled={busy} onChange={(event) => { invalidate(); setValue(event.target.value); setStep(1) }} /></div>
      <p>Usa 7 para una escritura válida. 1001 revierte después de incluirse. El permiso de la DApp no reemplaza el control de acceso del contrato.</p>
      <div className="actions"><button type="button" disabled={!usable || busy} onClick={() => void prepare()}>Revisar solicitud sin firmar</button><button type="button" disabled={busy} onClick={revoke}>Revocar permiso</button></div>
      <JsonDetails title="Cuenta y nonce actuales" value={actor} />
    </>}
    {step === 2 && prepared && <>
      <p>{pending?.kind === 'transaction' ? <>Solicitud sin firmar para <strong>set_value({prepared.value})</strong>. Sin cambios EVM hasta aprobar.</> : result ? <>Transacción ya incluida con status {result.receipt.status === '0x1' ? '1' : '0'}. Esta es su solicitud original, no una firma pendiente.</> : busy ? <>Solicitud aprobada para <strong>set_value({prepared.value})</strong>. La ejecución está en curso o su confirmación está pendiente; rechazar ya no cancela la operación.</> : 'Esta solicitud no tiene una aprobación pendiente. Prepara otra para solicitar una nueva firma.'}</p>
      <dl className="facts">
        <dt>Cadena</dt><dd>31337 · 0x7a69</dd>
        <dt>from</dt><dd className="hex breakable">{prepared.transaction.from}</dd>
        <dt>to</dt><dd className="hex breakable">{prepared.transaction.to}</dd>
        <dt>value</dt><dd>0 wei</dd>
        <dt>Política local de gas</dt><dd>Límite 1000000; 12 gwei por gas usado. Incluso status 0 consume nonce y comisión.</dd>
      </dl>
      <p>La aprobación firma y ejecuta con inclusión automática local. No simula una transacción pendiente en una red.</p>
      {pending?.kind === 'transaction' ? <div className="actions"><button type="button" disabled={busy} onClick={() => void approveTransaction()}>Aprobar e incluir localmente</button><button type="button" disabled={busy} onClick={() => provider.reject(pending.id)}>Rechazar sin enviar</button><button type="button" disabled={busy} onClick={revoke}>Revocar permiso</button></div> : <button type="button" disabled={busy || !usable} onClick={() => { invalidate(); setStep(1) }}>Preparar otra solicitud</button>}
      <JsonDetails title="Solicitud y decodificación" value={pending || prepared} />
    </>}
    {step === 3 && result && <>
      <p className="step-result">Valor leído desde EVM: <strong>{result.verifiedValue}</strong></p>
      <p>Recibo incluido con status <strong>{result.receipt.status === '0x1' ? '1, éxito' : '0, reversión'}</strong>. Eventos de esta transacción: <strong>{result.events.length}</strong>.</p>
      <p>Nonce de {prepared?.actor === 'bob' ? 'Bob' : 'Alice'}: {result.before.snapshot.actors.find((item) => item.id === prepared?.actor)?.nonce} → {result.after.snapshot.actors.find((item) => item.id === prepared?.actor)?.nonce}. Comisión real: {result.receipt.local.feeWei} wei.</p>
      <p>{result.receipt.status === '0x1' ? 'El evento confirmado y la lectura provienen de la ejecución, no del valor solicitado en el formulario.' : 'La reversión conserva el valor anterior y elimina los logs de esa ejecución. No devuelve la comisión ni el nonce.'}</p>
      <div className="actions"><button type="button" onClick={() => { invalidate(); setStep(1) }}>Preparar otra solicitud</button><button type="button" onClick={revoke}>Revocar permiso</button></div>
      <JsonDetails title="Recibo de esta solicitud" value={result.receipt} /><JsonDetails title="Eventos confirmados" value={result.events} /><JsonDetails title="Estado antes y después" value={{ before: result.before, after: result.after }} />
    </>}
  </LabShell>
}
