import { useRef, useState } from 'react'
import { Field, JsonDetails, LabShell } from '../shared/LabShell.jsx'
import {
  BLOCKS, MAX_EVENTS, MAX_SLOT, OBSERVERS, PRESETS, QUORUM, TOTAL_STAKE, VALIDATORS,
  createConfig, createConsensus, enqueueOnlineCheckpoints, seedHeads, transition, view,
} from './model.mjs'

const steps = ['Configurar las vistas', 'Mensajes y cabeza ponderada', 'Justificar y finalizar']
const initialHead = { validator: 'V1', block: 'A2', slot: '1' }
const initialCheckpoint = { validator: 'V1', source: 'G', target: 'A1' }
const messageLabel = (entry) => entry.kind === 'head'
  ? `${entry.validator} · ${entry.block} · slot ${entry.slot}`
  : `${entry.validator} · ${entry.source}→${entry.target} · época ${entry.targetEpoch}`

function Views({ run, checkpoints = false }) {
  return <>
    <p className="guidance">Estado aceptado de {run.runId}, evento {run.event}/{MAX_EVENTS}. Los borradores sin enviar no cambian estas vistas.</p>
    <div className="comparison">{OBSERVERS.map((id) => {
      const result = view(run, id)
      const local = run.observers[id]
      return <section key={id} aria-label={`Vista aceptada de ${id}`}>
        <h3>{id} · {run.connected[id] ? 'conectado' : 'desconectado'}</h3>
        <dl className="balance-list">
          <dt>Cabeza</dt><dd>{result.head}</dd>
          <dt>Ancla de elección</dt><dd>{result.anchor}</dd>
          <dt>Peso en A1 y descendientes</dt><dd>{result.weights.A1}/{TOTAL_STAKE}</dd>
          <dt>Peso en B1 y descendientes</dt><dd>{result.weights.B1}/{TOTAL_STAKE}</dd>
          <dt>Último justificado</dt><dd>{result.justified.at(-1)}</dd>
          <dt>Finalizado</dt><dd>{result.finalized}</dd>
        </dl>
        <p>Recorrido voraz: {result.path.join(' → ')}.</p>
        {!Object.keys(local.latest).length && <p>Sin votos de cabeza visibles. Cabeza {result.head} desde el ancla {result.anchor}. {result.anchor === 'G' ? 'Los pesos son 0 a 0; decide el desempate, no apoyo observado de cabeza.' : 'El ancla justificada restringe la rama; esto no atribuye votos de cabeza que el observador no recibió.'}</p>}
        {checkpoints && <>
          {result.links.length ? <ul>{result.links.map((link) => <li key={`${link.source}-${link.target}`}>
            {link.source}→{link.target}: <strong>{link.weight}/{TOTAL_STAKE}</strong>, {link.weight >= QUORUM ? 'supermayoría' : 'sin supermayoría'}. Validadores únicos: {link.validators.join(', ')}.
          </li>)}</ul> : <p>Sin votos de puntos de control visibles.</p>}
          <p>Puntos justificados: {result.justified.join(', ')}. Un enlace justifica su destino; si es consecutivo, finaliza su origen ya justificado.</p>
        </>}
        <details><summary>Ver últimos votos de cabeza de {id}</summary>
          <ul>{VALIDATORS.map(({ id: validatorId, weight }) => {
            const vote = local.latest[validatorId]
            return <li key={validatorId}>{validatorId}, peso {weight}: {vote ? `${vote.block}, slot ${vote.slot}` : 'sin mensaje visible'}.</li>
          })}</ul>
        </details>
      </section>
    })}</div>
  </>
}

function Delivery({ run, kind, observer, onObserver, onAction }) {
  const messages = run.messages.filter((entry) => entry.kind === kind)
  const pending = messages.filter((entry) => !entry.delivered.includes(observer)).length
  return <section aria-label="Entrega explícita de mensajes">
    <h3>Entregar a una vista local</h3>
    <p>Crear un mensaje no lo entrega. Reconectar tampoco. Cada observador conserva sus mensajes conocidos aunque quede desconectado.</p>
    <Field label="Observador de entrega" id={`delivery-observer-${kind}`}><select id={`delivery-observer-${kind}`} value={observer} onChange={(event) => onObserver(event.target.value)}>
      {OBSERVERS.map((id) => <option value={id} key={id}>{id} · {run.connected[id] ? 'conectado' : 'desconectado'}</option>)}
    </select></Field>
    <div className="actions">
      {!run.connected[observer] && <button type="button" onClick={() => onAction({ type: 'setObserver', id: observer, enabled: true })}>Reconectar {observer}</button>}
      <button type="button" disabled={!pending} onClick={() => onAction({ type: 'deliverAll', observer, kind })}>Entregar pendientes a {observer} · {pending}</button>
    </div>
    {messages.length > 0 ? <div className="table-scroll" role="region" tabIndex="0" aria-label={`Cola de mensajes de ${kind === 'head' ? 'cabeza' : 'puntos de control'}`}>
      <table className="compact-table"><caption>Mensajes del recorrido actual. La entrega no crea stake.</caption><thead><tr><th scope="col">ID</th><th scope="col">Contenido</th><th scope="col">Visible para</th><th scope="col">Acción</th></tr></thead>
        <tbody>{messages.map((entry) => <tr key={entry.id}>
          <th scope="row">{entry.id}</th><td>{messageLabel(entry)}</td><td>{entry.delivered.join(', ') || 'Ninguno'}</td>
          <td><button type="button" onClick={() => onAction({ type: 'deliver', observer, messageId: entry.id })}>{entry.delivered.includes(observer) ? 'Reentregar' : 'Entregar'} {entry.id} a {observer}</button></td>
        </tr>)}</tbody>
      </table>
    </div> : <p>No hay mensajes de este tipo. Crea votos antes de entregar.</p>}
    <details><summary>Cambiar conectividad sin borrar mensajes</summary>
      <div className="actions">{OBSERVERS.map((id) => <button type="button" key={id} onClick={() => onAction({ type: 'setObserver', id, enabled: !run.connected[id] })}>{run.connected[id] ? 'Desconectar' : 'Reconectar'} {id}</button>)}</div>
      <p>Los validadores fuera de línea no crean mensajes nuevos. Su stake permanece en el denominador y sus mensajes anteriores pueden entregarse.</p>
      <div className="actions">{VALIDATORS.map(({ id, weight }) => <button type="button" key={id} onClick={() => onAction({ type: 'setValidator', id, enabled: !run.online[id] })}>{run.online[id] ? 'Desconectar' : 'Reconectar'} {id} · peso {weight}</button>)}</div>
    </details>
  </section>
}

export default function App() {
  const serial = useRef(0)
  const [config, setConfig] = useState(() => createConfig())
  const [run, setRun] = useState(null)
  const [step, setStep] = useState(0)
  const [headDraft, setHeadDraft] = useState(initialHead)
  const [checkpointDraft, setCheckpointDraft] = useState(initialCheckpoint)
  const [observer, setObserver] = useState('O2')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('Configura el escenario. El stake total siempre es 6 y el umbral de supermayoría es 4.')
  const [disclosureKey, setDisclosureKey] = useState(0)
  const [receipt, setReceipt] = useState(null)
  const hasVisibleHead = Boolean(run && OBSERVERS.some((id) => Object.keys(run.observers[id].latest).length))
  const preset = PRESETS.find((entry) => entry.id === config.preset)

  function clearDraftResult() {
    setError('')
    setReceipt(null)
    setMessage('Borrador actualizado. Todavía no se envió ninguna acción nueva; el estado aceptado se conserva.')
  }

  function configure(next) {
    setConfig(next)
    setRun(null)
    setReceipt(null)
    setError('')
    setStep(0)
    setDisclosureKey((value) => value + 1)
    setMessage('Configuración modificada. Se descartaron los resultados del recorrido anterior.')
  }

  function reset() {
    configure(createConfig())
    setHeadDraft(initialHead)
    setCheckpointDraft(initialCheckpoint)
    setObserver('O2')
    setMessage('Laboratorio reiniciado. Génesis G será el único punto justificado y finalizado al iniciar.')
  }

  function start() {
    try {
      const next = createConsensus(config, `consenso-${serial.current + 1}`)
      serial.current += 1
      setRun(next)
      setStep(1)
      setObserver(config.connected.O2 ? 'O2' : 'O1')
      setError('')
      setReceipt(null)
      setMessage('Recorrido creado sin votos visibles. Prepara el escenario o crea un mensaje individual.')
    } catch (cause) { setError(cause.message) }
  }

  function apply(operation) {
    try {
      if (!run) throw new Error('Crea un recorrido antes de enviar acciones.')
      const next = typeof operation === 'function' ? operation(run) : transition(run, { ...operation, runId: run.runId })
      setRun(next)
      const frame = next.history.at(-1)
      setReceipt({ runId: next.runId, event: next.event, note: frame.note })
      setMessage(`Evento ${next.event}/${MAX_EVENTS} aceptado. ${frame.note}`)
      setError('')
    } catch (cause) {
      setReceipt(null)
      setError(cause.message)
      setMessage('Acción rechazada. No cambian el estado aceptado, la cola ni el paso actual.')
    }
  }

  function navigate(next) {
    setStep(next)
    setError('')
    setReceipt(null)
    setMessage('Vista del estado aceptado del recorrido actual. No se ejecutó ninguna acción al cambiar de paso.')
    if (next === 2) setObserver('O1')
  }

  const currentReceipt = receipt && receipt.runId === run?.runId && receipt.event === run.event ? receipt : null
  return <LabShell
    chapter={15}
    title="Bifurcaciones y finalidad"
    summary="Entrega mensajes a dos observadores. Calcula la cabeza por stake visible y luego distingue qué punto de control queda justificado y cuál queda finalizado."
    scope={`Máquina de estados educativa determinista, no un cliente Ethereum. Árbol fijo G→A1→A2 y G→B1→B2, épocas 0, 1 y 2; cuatro validadores con pesos 2, 2, 1 y 1. Solo enlaces de puntos de control consecutivos. Sin slashing, proposer boost, BLS, slots de épocas reales ni Gasper completo. No modela fondos ni garantías económicas reales. Máximo ${MAX_EVENTS} eventos por recorrido.`}
    steps={steps} step={step} onStep={navigate} available={[true, Boolean(run), hasVisibleHead]} onReset={reset} error={error} message={message}
    support={<div key={disclosureKey}>
      <details><summary>Reglas del modelo y fuentes de consenso</summary>
        <p>Material complementario independiente del capítulo. Las observaciones C15-04, C15-05, C15-07 y C15-09 de TRANSLATION_REVIEW.md registran afirmaciones del original que no se trasladan como reglas de este ejercicio. La traducción no se modifica.</p>
        <p>Base técnica: <a href="https://github.com/ethereum/consensus-specs/blob/v1.5.0/specs/phase0/fork-choice.md#get_weight">consensus-specs v1.5.0, get_weight</a> y <a href="https://github.com/ethereum/consensus-specs/blob/v1.5.0/specs/phase0/fork-choice.md#get_head">get_head</a>, junto con <a href="https://github.com/ethereum/consensus-specs/blob/v1.5.0/specs/phase0/beacon-chain.md#justification-and-finalization">justificación y finalidad</a>. Son referencias conceptuales, no una implementación de esas especificaciones.</p>
        <ul>
          <li>Cada observador usa solo el mensaje de cabeza visible de mayor slot por validador. Duplicados no agregan peso; mensajes antiguos se ignoran. Conflictos con igual validador y slot se rechazan al crear el mensaje.</li>
          <li>La elección comienza en el último punto justificado compatible con el finalizado y elige cada hijo con mayor peso de su subárbol. Los pesos vienen del stake, no del número de mensajes. Empates, incluso 0 a 0, eligen el identificador menor: A1 antes que B1. Esta política didáctica difiere del desempate de consensus-specs, que favorece la raíz de bloque lexicográficamente mayor.</li>
          <li>La lista completa de bloques es conocida desde el inicio. No hay propagación de bloques ni reenvío entre observadores. Cada entrega va de la cola compartida a un solo observador; ningún mensaje se vuelve visible automáticamente.</li>
          <li>El stake total permanece en 6 aunque un validador esté fuera de línea. El umbral es al menos dos tercios, exactamente 4 de 6; no requiere unanimidad.</li>
          <li>Cada validador aporta una vez por época de destino a un único enlace. Enlaces conflictivos para esa época se rechazan al crear mensajes, incluso antes de entregarlos. Es una restricción conservadora de este generador, no detección distribuida de equivocaciones ni slashing.</li>
          <li>Solo se admiten destinos descendientes y épocas consecutivas. El observador debe conocer la justificación del origen. G→A1 con 4 justifica A1 y mantiene G finalizado. A1→A2 con 4 justifica A2 y finaliza A1, no A2. Este ejercicio no cubre las demás condiciones de justificación y finalidad de Ethereum.</li>
          <li>Aquí los votos sintéticos justifican al entregarse. Ethereum procesa participación incluida en su estado y aplica reglas temporales de épocas; recibir mensajes de red no basta para justificar. Los slots de 0 a 99 y las épocas 0, 1 y 2 de este árbol no reproducen ese calendario.</li>
          <li>Una rama incompatible con el punto finalizado no puede cambiar ese ancla en este modelo. Esto no afirma irreversibilidad absoluta en Ethereum ni convierte un punto solo justificado en una garantía universal.</li>
          <li>Se separan mensajes de cabeza y votos de puntos de control para estudiarlos. Una atestación de Ethereum combina componentes de elección de cabeza y de origen y destino.</li>
          <li>Cada comando aceptado consume un evento. Entregar un lote consume un evento y aplica todos sus mensajes en orden de creación, de forma atómica. Si algún mensaje falla, se rechaza todo el lote; puedes entregar primero los mensajes previos necesarios de manera individual.</li>
        </ul>
      </details>
      {run && <JsonDetails title="Inspeccionar historial inmutable del recorrido" value={run.history} />}
    </div>}
  >
    {step === 0 && <div key={`config-${disclosureKey}`}>
      <p>G ya está justificado y finalizado. O1 y O2 pueden recibir conjuntos distintos de mensajes sin cambiar el árbol ni los pesos de los validadores.</p>
      <Field label="Escenario" id="consensus-preset"><select id="consensus-preset" value={config.preset} onChange={(event) => configure(createConfig(event.target.value))}>
        {PRESETS.map((entry) => <option value={entry.id} key={entry.id}>{entry.label}</option>)}
      </select></Field>
      <p className="guidance">{preset.description}</p>
      <fieldset><legend>Observadores conectados a la cola</legend><div className="inline-options">{OBSERVERS.map((id) => <label key={id} htmlFor={`config-${id}`}><input id={`config-${id}`} type="checkbox" checked={config.connected[id]} onChange={(event) => configure({ ...config, connected: { ...config.connected, [id]: event.target.checked } })} />{id}</label>)}</div></fieldset>
      <fieldset><legend>Validadores disponibles para crear mensajes</legend><div className="inline-options">{VALIDATORS.map(({ id, weight }) => <label key={id} htmlFor={`config-${id}`}><input id={`config-${id}`} type="checkbox" checked={config.online[id]} onChange={(event) => configure({ ...config, online: { ...config.online, [id]: event.target.checked } })} />{id} · stake {weight}</label>)}</div></fieldset>
      <p>Stake total fijo: {TOTAL_STAKE}. Umbral: {QUORUM}/{TOTAL_STAKE}. Desconectar no reduce este denominador ni borra mensajes ya conocidos.</p>
      <div className="actions"><button type="button" onClick={start}>Crear recorrido</button></div>
    </div>}
    {step === 1 && run && <div key={`head-${disclosureKey}`}>
      <p>{preset.description}</p>
      <p>El escenario crea mensajes y los entrega a O1. En el caso de convergencia, también entrega primero los dos votos ligeros a O2. Después controla las entregas tú mismo.</p>
      <div className="actions"><button type="button" disabled={run.messages.length > 0} onClick={() => apply(seedHeads)}>Preparar escenario y entregar a O1</button></div>
      <details><summary>Crear un mensaje de cabeza individual</summary>
        <div className="fields-grid">
          <Field label="Validador de cabeza" id="head-validator"><select id="head-validator" value={headDraft.validator} onChange={(event) => { setHeadDraft({ ...headDraft, validator: event.target.value }); clearDraftResult() }}>{VALIDATORS.map(({ id, weight }) => <option value={id} key={id}>{id} · peso {weight}</option>)}</select></Field>
          <Field label="Bloque cabeza del mensaje" id="head-block"><select id="head-block" value={headDraft.block} onChange={(event) => { setHeadDraft({ ...headDraft, block: event.target.value }); clearDraftResult() }}>{Object.keys(BLOCKS).map((id) => <option value={id} key={id}>{id}</option>)}</select></Field>
          <Field label="Slot educativo del mensaje" id="head-slot" type="number" min="0" max={MAX_SLOT} step="1" value={headDraft.slot} onChange={(event) => { setHeadDraft({ ...headDraft, slot: event.target.value }); clearDraftResult() }} />
        </div>
        <button type="button" onClick={() => apply({ type: 'sendHead', ...headDraft, slot: headDraft.slot.trim() === '' ? NaN : Number(headDraft.slot) })}>Crear mensaje de cabeza</button>
      </details>
      <Delivery run={run} kind="head" observer={observer} onObserver={(id) => { setObserver(id); clearDraftResult() }} onAction={apply} />
      <Views run={run} />
      <p className="notice">Los pesos se calculan en cada vista con los últimos votos visibles. Una mayoría de mensajes no equivale a una mayoría de stake. Empates eligen A antes que B.</p>
      <div className="actions"><button type="button" disabled={!hasVisibleHead} onClick={() => navigate(2)}>Continuar a puntos de control</button></div>
    </div>}
    {step === 2 && run && <div key={`checkpoint-${disclosureKey}`}>
      <p>Primero crea y entrega votos G→A1. Con 4/6, A1 queda justificado y G sigue finalizado. Luego crea y entrega A1→A2: con 4/6, A2 queda justificado y A1 finalizado. La cabeza y la finalidad son resultados distintos.</p>
      <div className="fields-grid">
        <Field label="Validador del punto de control" id="checkpoint-validator"><select id="checkpoint-validator" value={checkpointDraft.validator} onChange={(event) => { setCheckpointDraft({ ...checkpointDraft, validator: event.target.value }); clearDraftResult() }}>{VALIDATORS.map(({ id, weight }) => <option value={id} key={id}>{id} · peso {weight}{run.online[id] ? '' : ' · fuera de línea'}</option>)}</select></Field>
        <Field label="Punto de control de origen" id="checkpoint-source"><select id="checkpoint-source" value={checkpointDraft.source} onChange={(event) => { setCheckpointDraft({ ...checkpointDraft, source: event.target.value }); clearDraftResult() }}>{Object.keys(BLOCKS).map((id) => <option value={id} key={id}>{id} · época {BLOCKS[id].epoch}</option>)}</select></Field>
        <Field label="Punto de control de destino" id="checkpoint-target"><select id="checkpoint-target" value={checkpointDraft.target} onChange={(event) => { setCheckpointDraft({ ...checkpointDraft, target: event.target.value }); clearDraftResult() }}>{Object.keys(BLOCKS).map((id) => <option value={id} key={id}>{id} · época {BLOCKS[id].epoch}</option>)}</select></Field>
      </div>
      <div className="actions">
        <button type="button" onClick={() => apply({ type: 'sendCheckpoint', ...checkpointDraft })}>Crear voto individual</button>
        <button type="button" onClick={() => apply((current) => enqueueOnlineCheckpoints(current, checkpointDraft.source, checkpointDraft.target))}>Crear votos con validadores en línea</button>
      </div>
      <p>Crear votos no justifica nada todavía. Entrega a un observador. Al editar este borrador se descarta el comprobante de la acción anterior, no los votos aceptados.</p>
      <Delivery run={run} kind="checkpoint" observer={observer} onObserver={(id) => { setObserver(id); clearDraftResult() }} onAction={apply} />
      <Views run={run} checkpoints />
      <details><summary>Probar fallas y recuperación</summary><ul>
        <li>Entrega solo V1 para G→A1: 2/6. Agrega V3: 3/6, aún sin justificar. Agrega V4: exactamente 4/6, A1 justificado.</li>
        <li>Reentrega el mismo voto: 0 stake adicional. Un voto distinto del mismo validador para la misma época se rechaza.</li>
        <li>Crea A1→A2 antes de que el observador justifique A1. La creación es válida; su entrega falla. Entrega G→A1 con quórum y luego recupera el mensaje pendiente.</li>
        <li>Con V1 y V2 fuera de línea, V3 y V4 suman 2/6, no 2/2. Reconecta un validador pesado y entrega su voto para alcanzar 4/6.</li>
        <li>Un enlace A1→B2 se rechaza por no ser descendiente. G→A2 se rechaza porque salta una época.</li>
      </ul></details>
    </div>}
    {currentReceipt && <div className="step-result"><h3>Última acción aceptada</h3><p>{currentReceipt.note}</p><p>{currentReceipt.runId} · evento {currentReceipt.event}.</p></div>}
  </LabShell>
}
