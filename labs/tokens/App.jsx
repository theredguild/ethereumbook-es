import { useEffect, useRef, useState } from 'react'
import { LabShell, Field, JsonDetails } from '../shared/LabShell.jsx'
import { useWorker } from '../shared/useWorker.jsx'
import { ACTORS, ZERO_ADDRESS, validSnapshot } from './model.mjs'
import source from './contracts.sol?raw'

const makeWorker = () => new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' })
const label = (id) => id === 'none' ? 'Nadie, revocar' : id[0].toUpperCase() + id.slice(1)
const defaults = () => ({ mode: 'erc20', action: 'transfer', actor: 'alice', from: 'alice', to: 'bob', amount: '10', tokenId: '1', approved: true, gasLimit: '1000000', valueWei: '0' })
function eth(wei) {
  const value = BigInt(wei)
  return `${value / 10n ** 18n}.${(value % 10n ** 18n).toString().padStart(18, '0')}`
}
function person(address, state) {
  if (address?.toLowerCase() === ZERO_ADDRESS) return 'Nadie'
  const actor = state.evm.actors.find((item) => item.address.toLowerCase() === address?.toLowerCase())
  return actor ? label(actor.id) : address
}
function ActorSelect({ name, title, value, onChange, disabled, none = false }) {
  return <Field label={title} id={`tokens-${name}`}><select id={`tokens-${name}`} value={value} disabled={disabled} onChange={(event) => onChange(name, event.target.value)}>{ACTORS.map((actor) => <option value={actor} key={actor}>{label(actor)}</option>)}{none && <option value="none">Nadie, revocar</option>}</select></Field>
}
function Ledger({ state, mode, before }) {
  return <>
    <div className="table-scroll" role="region" aria-label="Saldos del activo" tabIndex="0"><table className="compact-table"><thead><tr><th>Cuenta</th>{before && <th>Antes</th>}<th>{mode === 'erc20' ? 'Unidades UNI ahora' : 'Cantidad de NFT ahora'}</th></tr></thead><tbody>{ACTORS.map((actor, i) => <tr key={actor}><th>{label(actor)}</th>{before && <td>{String(mode === 'erc20' ? before.erc20.balances[i] : before.erc721.counts[i])}</td>}<td>{String(mode === 'erc20' ? state.erc20.balances[i] : state.erc721.counts[i])}</td></tr>)}</tbody></table></div>
    {mode === 'erc20' ? <p>Oferta total: <strong>{String(state.erc20.totalSupply)} UNI</strong>. decimals = 0, unidades enteras. Cada unidad es intercambiable por otra del mismo contrato, no por ETH.</p> : <><ul className="balance-list">{state.erc721.tokens.map((token) => <li key={token.id}>ID {token.id}: propietario <strong>{person(token.owner, state)}</strong>; aprobación individual: {person(token.approved, state)}.</li>)}</ul><p>Dos NFT distintos, IDs 1 y 2. El saldo cuenta NFT, no suma sus IDs. Un ID no sustituye al otro. No hay imágenes, precio, derechos externos ni promesa de escasez.</p></>}
  </>
}
function Permissions({ state, mode }) {
  const values = mode === 'erc20' ? state.erc20.allowances : state.erc721.operators
  return <div className="table-scroll" role="region" aria-label={mode === 'erc20' ? 'Autorizaciones de gasto' : 'Permisos de operador'} tabIndex="0"><table className="compact-table"><thead><tr><th>Propietario → autorizado</th>{ACTORS.map((actor) => <th key={actor}>{label(actor)}</th>)}</tr></thead><tbody>{ACTORS.map((actor, i) => <tr key={actor}><th>{label(actor)}</th>{values[i].map((value, j) => <td key={j}>{typeof value === 'boolean' ? value ? 'Sí' : 'No' : String(value)}</td>)}</tr>)}</tbody></table></div>
}
function Intent({ prepared, state }) {
  const d = prepared.intent
  return <div className="step-result breakable"><p>Activo: <strong>{d.mode === 'erc20' ? 'ERC-20 UNI' : 'ERC-721 ID'}</strong>. Acción: <code>{d.action}</code>.</p><p>Firma y paga gas: <strong>{label(d.actor)}</strong>.</p>{d.action === 'transferFrom' && <p>Propietario declarado, from: <strong>{label(d.from)}</strong>. Este valor no se corrige según el dueño real.</p>}<p>{d.action === 'approve' || d.action === 'setApprovalForAll' ? 'Autorizado' : 'Destinatario'}, to: <strong>{label(d.to)}</strong>.</p>{d.mode === 'erc20' ? <p>Cantidad: <strong>{d.amount} UNI</strong>.</p> : d.action === 'setApprovalForAll' ? <p>Permiso para todos los NFT del propietario firmante: <strong>{d.approved ? 'Conceder' : 'Revocar'}</strong>. No es una aprobación por ID.</p> : <p>ID: <strong>{d.tokenId}</strong>. {prepared.token?.error ? `Consulta ownerOf: ${prepared.token.error}. La transacción igualmente puede incluirse y revertir.` : `Dueño real: ${person(prepared.token?.owner, state)}. Aprobación por ID: ${person(prepared.token?.approved, state)}.`}</p>}<p>ETH adjunto: {eth(d.valueWei)} ETH ficticios. No es cantidad ni precio del token.</p></div>
}

export default function App() {
  const worker = useWorker(makeWorker)
  const [state, setState] = useState(null)
  const [draft, setDraft] = useState(defaults)
  const [step, setStep] = useState(0)
  const [prepared, setPrepared] = useState(null)
  const [attempted, setAttempted] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const [unknown, setUnknown] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('Desplegando dos contratos locales…')
  const [resetKey, setResetKey] = useState(0)
  const generation = useRef(0)
  const active = useRef(false)
  const initialized = useRef(-1)
  const locked = worker.busy || !worker.ready || worker.fatal || unknown || !state
  const mode = draft.mode
  const current = outcome && prepared && outcome.run === state?.run && outcome.intentId === prepared.id ? outcome : null

  useEffect(() => {
    if (!worker.failure) return
    setPrepared(null); setOutcome(null)
    if (validSnapshot(worker.failure.snapshot) && !worker.failure.fatal) {
      setState(worker.failure.snapshot)
      setMessage('No hubo una nueva inclusión. Conserva el estado aceptado; vuelve a revisar la intención.')
      setStep(0)
    } else {
      setUnknown(true); setState(null)
      setMessage('Estado desconocido. Reinicia para crear un Worker y dos contratos nuevos.')
    }
  }, [worker.failure])

  async function request(action, fields = {}) {
    if (active.current || !worker.ready || worker.fatal) return null
    active.current = true
    const runGeneration = generation.current
    setError('')
    try {
      const result = await worker.run(action, fields)
      if (!result || runGeneration !== generation.current) return null
      if (!validSnapshot(result.snapshot)) {
        setUnknown(true); setState(null); setPrepared(null); setOutcome(null)
        setError('Respuesta incompleta. Reinicia antes de continuar.')
        return null
      }
      setState(result.snapshot)
      return result
    } finally { if (runGeneration === generation.current) active.current = false }
  }

  useEffect(() => {
    if (!worker.ready || initialized.current === resetKey) return
    initialized.current = resetKey
    request('start').then((result) => {
      if (result) setMessage('Contratos desplegados. Alice tiene 1000 UNI y los NFT 1 y 2. Su nonce inicial es 2 por los despliegues.')
    })
  }, [worker.ready, resetKey])

  function reset() {
    generation.current += 1; active.current = false
    setState(null); setDraft(defaults()); setPrepared(null); setAttempted(false); setOutcome(null); setStep(0); setUnknown(false); setError('')
    setMessage('Reiniciando EVM y desplegando ambos contratos; se borran permisos y resultados.')
    worker.restart(); setResetKey((value) => value + 1)
  }
  function edit(name, value) {
    if (locked) return
    setDraft((old) => {
      const next = { ...old, [name]: value }
      if (name === 'mode') { next.action = value === 'erc20' ? 'transfer' : 'approve'; next.to = 'bob' }
      if (name === 'action' && next.to === 'none' && value !== 'approve') next.to = 'bob'
      return next
    })
    setPrepared(null); setOutcome(null); setAttempted(false); setStep(0); setError(''); worker.clearError()
    setMessage('Borrador nuevo. Los saldos aceptados se conservan; el resultado anterior ya no corresponde a esta intención.')
  }
  async function inspect() {
    setOutcome(null); setAttempted(false)
    const result = await request('prepare', { draft: { ...draft } })
    if (!result) return
    if (!result.prepared || result.prepared.run !== result.snapshot.run || typeof result.prepared.id !== 'string') {
      setUnknown(true); setError('No se recibió una intención válida. Reinicia.'); return
    }
    setPrepared(result.prepared); setStep(1)
    setMessage('Consultas ABI completadas. Revisar permisos no mueve tokens ni consume nonce o ETH.')
  }
  async function execute() {
    if (!prepared || attempted) return
    setAttempted(true)
    const result = await request('execute', { intentId: prepared.id, run: prepared.run })
    if (!result) return
    if (result.intentId !== prepared.id || result.run !== prepared.run || ![0, 1].includes(result.receipt?.status) || !/^\d+$/.test(result.receipt.feeWei) || !Array.isArray(result.events)) {
      setUnknown(true); setOutcome(null); setError('Recibo sin identidad válida. Reinicia.'); return
    }
    setOutcome(result)
    if (result.receipt.status === 1) {
      setStep(3); setMessage('Transacción firmada e incluida con status 1. Se consultaron nuevamente saldos y permisos reales.')
    } else {
      setError(`Incluida con status 0: ${result.error}. Se revirtieron activos y permisos; se consumieron gas y nonce.`)
      setMessage('Reversión incluida. Examina el recibo o configura una nueva intención; no se avanza automáticamente.')
    }
  }
  function another() { setStep(0); setPrepared(null); setOutcome(null); setAttempted(false); setError(''); worker.clearError(); request('invalidate') }
  function navigate(next) { if (current?.receipt.status === 0) setError(''); setStep(next) }
  const senderIndex = prepared ? ACTORS.indexOf(prepared.intent.actor) : 0
  const ownerIndex = prepared ? ACTORS.indexOf(prepared.intent.from || prepared.intent.actor) : 0
  const spenderIndex = prepared ? ACTORS.indexOf(prepared.intent.action === 'approve' || prepared.intent.action === 'setApprovalForAll' ? prepared.intent.to : prepared.intent.actor) : 0

  return <LabShell chapter="10" title="Balances, permisos y propiedad" summary="Compara unidades ERC-20 y propiedad ERC-721 mediante transacciones firmadas en una EVM local." scope="Activos y ETH ficticios. Sin billetera, RPC, red ni secretos personales. Claves educativas públicas: nunca uses ni financies estas direcciones." steps={['Configurar intención', 'Inspeccionar permisos', 'Firmar y ejecutar', 'Observar cambios']} step={step} onStep={navigate} available={[true, Boolean(prepared), Boolean(prepared), Boolean(current)]} onReset={reset} busy={worker.busy} error={error || worker.error} message={message} support={<div key={resetKey}>
    <details className="technical"><summary>Ayuda, reglas y recorridos</summary><p>OpenZeppelin Contracts 5.4.0 implementa ambos estándares; estos contratos solo acuñan sus cantidades iniciales. ERC-20 usa decimals = 0 explícitamente. Una transferencia de 0 es válida. Los enteros se procesan como uint256 sin conversión a Number.</p><p>ERC-20: Alice aprueba 10 a Bob; Bob usa transferFrom para enviar 7 de Alice a Carol. Quedan 3 de autorización. Alice aprueba 0 para revocar; otro gasto de 1 por Bob revierte incluido. Aprobar no transfiere unidades. Un saldo insuficiente también revierte.</p><p>ERC-721: Alice aprueba a Bob para ID 1. Carol no puede transferirlo sin permiso; Bob sí puede enviarlo de Alice a Carol y se borra la aprobación individual. ID 2 no cambia. setApprovalForAll concede o revoca permisos del propietario firmante, distintos de approve por ID. Un operador del dueño anterior no controla el NFT del dueño nuevo. Un ID inexistente o un from incorrecto revierte.</p><p>Shanghai, cadena 31337, tres cuentas con 100 ETH ficticios antes de desplegar. Los dos despliegues consumen gas y llevan el nonce de Alice a 2. Cada transacción se incluye en un bloque local, sin consenso ni finalidad. Gas efectivo fijo de 12 gwei; máximo 4000000 gas. Un rechazo de admisión no cobra ni consume nonce; status 0 sí. Las lecturas ABI usan checkpoints descartados y se ejecutan en secuencia. Reiniciar crea otra EVM y despliega ambos contratos.</p></details>
    <details className="technical"><summary>Fuente Solidity del laboratorio</summary><pre className="hex" tabIndex="0"><code>{source}</code></pre></details>
    {state && <><JsonDetails title="Identidad de fuente, artefactos y despliegues" value={state.identities} /><JsonDetails title="Metadatos leídos por ABI" value={{ erc20: { name: state.erc20.name, symbol: state.erc20.symbol, decimals: state.erc20.decimals }, erc721: { name: state.erc721.name, symbol: state.erc721.symbol, tokens: state.erc721.tokens } }} /><details className="technical"><summary>Todos los permisos actuales</summary><h3>ERC-20, allowance en UNI</h3><Permissions state={state} mode="erc20" /><h3>ERC-721, operadores por propietario</h3><Permissions state={state} mode="erc721" /></details><JsonDetails title="Cuentas, nonce y ETH nativo" value={state.evm} /></>}
  </div>}>
    {step === 0 && <>
      {!state && <p>{unknown || worker.fatal ? 'Sesión detenida. Usa Reiniciar laboratorio para recuperar el Worker y volver a desplegar.' : 'Preparando contratos en este navegador…'}</p>}
      <div className="fields-grid"><Field label="Activo" id="tokens-mode"><select id="tokens-mode" value={mode} disabled={locked} onChange={(event) => edit('mode', event.target.value)}><option value="erc20">ERC-20, unidades fungibles</option><option value="erc721">ERC-721, IDs no fungibles</option></select></Field>
      <Field label="Acción" id="tokens-action"><select id="tokens-action" value={draft.action} disabled={locked} onChange={(event) => edit('action', event.target.value)}>{mode === 'erc20' && <option value="transfer">transfer, enviar unidades propias</option>}<option value="approve">approve, {mode === 'erc20' ? 'autorizar gasto o revocar con 0' : 'autorizar un ID'}</option><option value="transferFrom">transferFrom, propietario declarado</option>{mode === 'erc721' && <option value="setApprovalForAll">setApprovalForAll, permiso de operador</option>}</select></Field>
      <ActorSelect name="actor" title="Actor que firma y paga gas" value={draft.actor} disabled={locked} onChange={edit} />
      {draft.action === 'transferFrom' && <ActorSelect name="from" title="Propietario declarado, from" value={draft.from} disabled={locked} onChange={edit} />}
      <ActorSelect name="to" title={draft.action === 'approve' || draft.action === 'setApprovalForAll' ? 'Cuenta autorizada' : 'Destinatario, to'} value={draft.to} disabled={locked} onChange={edit} none={mode === 'erc721' && draft.action === 'approve'} />
      {mode === 'erc20' ? <Field label={draft.action === 'approve' ? 'Autorización en UNI, 0 revoca' : 'Cantidad en UNI, 0 es válido'} id="tokens-amount" inputMode="numeric" value={draft.amount} disabled={locked} onChange={(event) => edit('amount', event.target.value)} /> : draft.action === 'setApprovalForAll' ? <Field label="Permiso de operador" id="tokens-approved"><select id="tokens-approved" value={String(draft.approved)} disabled={locked} onChange={(event) => edit('approved', event.target.value === 'true')}><option value="true">Conceder</option><option value="false">Revocar</option></select></Field> : <Field label="ID del NFT, no cantidad" id="tokens-id" inputMode="numeric" value={draft.tokenId} disabled={locked} onChange={(event) => edit('tokenId', event.target.value)} />}</div>
      <details className="technical" key={`settings-${resetKey}`}><summary>Gas y admisión, ajustes avanzados</summary><Field label="Límite de gas, máximo 4000000" id="tokens-gas" inputMode="numeric" value={draft.gasLimit} disabled={locked} onChange={(event) => edit('gasLimit', event.target.value)} /><Field label="ETH nativo adjunto en wei, normalmente 0" id="tokens-native" inputMode="numeric" value={draft.valueWei} disabled={locked} onChange={(event) => edit('valueWei', event.target.value)} /><p>No es cantidad de tokens. Los métodos no son payable: un valor nativo distinto de 0 revierte si la transacción logra admitirse. Un monto mayor que el saldo disponible se rechaza antes de incluir.</p></details>
      <div className="actions"><button type="button" disabled={locked} onClick={inspect}>Consultar y revisar intención</button></div>
      {state && <details className="technical"><summary>Consultar saldos aceptados</summary><Ledger state={state} mode={mode} /></details>}
    </>}
    {step === 1 && prepared && state && <>
      <Intent prepared={prepared} state={state} /><Ledger state={state} mode={mode} />
      {mode === 'erc20' ? <><p>Autorizar no envía tokens. transfer usa saldo del firmante; transferFrom necesita saldo del propietario declarado y allowance para el firmante.</p>{spenderIndex >= 0 && <p className="breakable">Autorización actual de {label(ACTORS[ownerIndex])} a {label(ACTORS[spenderIndex])}: <strong>{String(state.erc20.allowances[ownerIndex][spenderIndex])} UNI</strong>.</p>}</> : <><p>approve se aplica a un solo ID. setApprovalForAll se aplica a los NFT del propietario que lo concede, no a los NFT que ya pertenecen a otra cuenta.</p>{spenderIndex >= 0 && <p>Operador {label(ACTORS[spenderIndex])} para {label(ACTORS[ownerIndex])}: <strong>{state.erc721.operators[ownerIndex][spenderIndex] ? 'Sí' : 'No'}</strong>.</p>}</>}
      <p>Nonce actual de {label(prepared.intent.actor)}: {state.evm.actors[senderIndex].nonce}. ETH nativo disponible para gas: {eth(state.evm.actors[senderIndex].balanceWei)} ETH ficticios.</p>
      <button type="button" disabled={locked || attempted} onClick={() => { setStep(2); setMessage('Intención inmutable lista. El próximo botón firma e incluye una transacción real local.') }}>Continuar a firma</button>
    </>}
    {step === 2 && prepared && state && <>
      <Intent prepared={prepared} state={state} /><p>Firmar e incluir consume nonce y ETH ficticios para gas incluso si el contrato revierte. Una intención solo admite un intento.</p>
      <div className="actions"><button type="button" disabled={locked || attempted} onClick={execute}>Firmar y ejecutar transacción local</button>{current && <button type="button" disabled={locked} onClick={() => navigate(3)}>Examinar reversión y recibo</button>}{attempted && <button type="button" disabled={locked} onClick={another}>Configurar nueva intención</button>}</div>
      {current && <p>status {current.receipt.status}. Gas usado: {current.receipt.gasUsed}. Comisión: {eth(current.receipt.feeWei)} ETH ficticios. Nonce consumido: {current.receipt.nonce}.</p>}
    </>}
    {step === 3 && current && state && <>
      <div className="step-result"><p><strong>{current.receipt.status === 1 ? 'Ejecución incluida, status 1' : 'Reversión incluida, status 0'}</strong></p><p>Intención {current.intentId}. Firma: {label(current.intent.actor)}. Nonce consumido: {current.receipt.nonce}.</p><p>Gas usado: {current.receipt.gasUsed}. Comisión nativa: <strong>{eth(current.receipt.feeWei)} ETH ficticios</strong>, separada de tokens y oferta.</p>{current.error && <p className="breakable">{current.error}. Activos y permisos no cambiaron.</p>}</div>
      <Ledger state={current.snapshot} mode={mode} before={current.before} />
      {mode === 'erc20' && <><h3>Allowance restante en UNI</h3><Permissions state={current.snapshot} mode="erc20" /></>}
      {mode === 'erc721' && <><h3>Permisos de operador por propietario</h3><Permissions state={current.snapshot} mode="erc721" /></>}
      <p>Eventos reales: {current.events.length ? current.events.map((event) => event.decoded?.eventName || 'No decodificado').join(', ') : 'Ninguno, no se conservaron logs'}.</p>
      <JsonDetails title="Recibo y eventos ABI" value={{ receipt: current.receipt, events: current.events }} />
      <button type="button" disabled={locked} onClick={another}>Configurar nueva intención</button>
    </>}
  </LabShell>
}
