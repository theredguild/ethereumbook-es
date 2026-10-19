import { useState } from 'react'
import { Field, JsonDetails, LabShell } from '../shared/LabShell.jsx'
import { CHANNELS, EDGES, MAX_ROUNDS, NODES, PRESETS, createConfig, createNetwork, propagate, restoreChannels } from './model.mjs'

const steps = ['Configurar canales', 'Propagar e inspeccionar', 'Reconectar y comparar']
const channelNames = { execution: 'Datos de ejecución', consensus: 'Propuestas de consenso' }
const yesNo = (value) => value ? 'Sí' : 'No'
const validationLabel = (node) => !node.payloadKnown ? 'Sin datos' : node.executionValidated ? 'Válida' : 'Rechazada'

function NodeCards({ nodes }) {
  return <div className="node-grid">{NODES.map((id) => <section className="node-card" key={id} aria-label={`Estado del nodo ${id}`}>
    <h3>Nodo {id}</h3>
    <p>Carga conocida: <strong>{yesNo(nodes[id].payloadKnown)}</strong></p>
    <p>Ejecución validada: <strong>{validationLabel(nodes[id])}</strong></p>
    <p>Propuesta conocida: <strong>{yesNo(nodes[id].proposalKnown)}</strong></p>
    <p>Ambos requisitos válidos: <strong>{yesNo(nodes[id].prerequisitesAvailable)}</strong></p>
    <p>{nodes[id].validation?.reason || 'No puede validar sin la carga de datos.'}</p>
    {nodes[id].validation && <p>Saldos de la ejecución local: Emisor {nodes[id].validation.balances.Emisor}, Receptor {nodes[id].validation.balances.Receptor}.</p>}
  </section>)}</div>
}

export default function App() {
  const [config, setConfig] = useState(() => createConfig())
  const [preset, setPreset] = useState('execution-partition')
  const [step, setStep] = useState(0)
  const [run, setRun] = useState(null)
  const [recovery, setRecovery] = useState(null)
  const [selectedRound, setSelectedRound] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('Configura los canales. Solo A conoce la carga y la propuesta al iniciar.')

  function changeConfig(next, nextPreset = '') {
    setConfig(next)
    setPreset(nextPreset)
    setRun(null)
    setRecovery(null)
    setSelectedRound(0)
    setStep(0)
    setError('')
    setMessage('Configuración actualizada. El recorrido anterior quedó descartado.')
  }

  function reset() {
    changeConfig(createConfig(), 'execution-partition')
    setMessage('Valores iniciales restaurados. No hay rondas ejecutadas.')
  }

  function start() {
    try {
      const next = createNetwork(config)
      setRun(next)
      setRecovery(null)
      setSelectedRound(0)
      setError('')
      setMessage('Ronda 0 creada. A conoce ambos mensajes; B y C todavía no conocen ninguno.')
      setStep(1)
    } catch (cause) {
      setError(cause.message)
    }
  }

  function nextRound(isRecovery = false) {
    try {
      const source = isRecovery ? recovery : run
      if (!source) throw new Error(isRecovery ? 'Restaura los canales antes de propagar la recuperación.' : 'Inicia un recorrido antes de propagar.')
      const next = propagate(source)
      if (isRecovery) setRecovery(next)
      else {
        setRun(next)
        setRecovery(null)
        setSelectedRound(next.round)
      }
      setError('')
      setMessage(`Ronda ${next.round} registrada: ${next.history[next.round].deliveries.length} entregas de mensajes. Cada entrega recorrió un solo enlace.`)
    } catch (cause) {
      setError(cause.message)
    }
  }

  function reconnect() {
    if (!run || run.round < 1) {
      setError('Propaga al menos una ronda antes de comparar la recuperación.')
      return
    }
    setRecovery(restoreChannels(run))
    setError('')
    setMessage('Los seis canales están abiertos. Reconectar no entrega mensajes: propaga una ronda de recuperación.')
  }

  function navigate(next) {
    setStep(next)
    setError('')
  }

  const inspected = run?.history[selectedRound]
  const compared = recovery || run
  const recoveryDelivered = recovery ? recovery.history.slice(run.history.length).reduce((total, item) => total + item.deliveries.length, 0) : 0

  return <LabShell
    chapter={3}
    title="Red bajo fallas"
    summary="Separa la llegada de datos de ejecución y propuestas de consenso entre tres nodos. Observa cada salto y luego recupera los mensajes pendientes."
    scope="Modelo educativo determinista: tres nodos, una carga sintética y una propuesta que la referencia. Valida una transferencia entera de 1 a 20 unidades contra un saldo inicial de 10. No ejecuta EVM ni representa clientes o una red Ethereum real. No modela stake, gas, firmas, elección de cabeza ni finalidad. Recibir una propuesta no decide una cadena canónica. Sin fondos reales. Máximo de 12 rondas por recorrido."
    steps={steps}
    step={step}
    onStep={navigate}
    available={[true, Boolean(run), Boolean(run && run.round >= 1)]}
    onReset={reset}
    error={error}
    message={message}
  >
    {step === 0 && <>
      <p>Los nodos A, B y C permanecen presentes aunque sus enlaces estén cerrados. Cada enlace es bidireccional y tiene dos canales independientes.</p>
      <div className="fields-grid">
        <Field id="network-preset" label="Escenario de canales">
          <select id="network-preset" value={preset} onChange={(event) => changeConfig(createConfig(event.target.value), event.target.value)}>
            <option value="" disabled>Configuración personalizada</option>
            {PRESETS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
          </select>
        </Field>
        <Field id="network-amount" label="Transferencia de Emisor a Receptor, unidades ficticias" type="number" min="1" max="20" step="1" value={config.amount} onChange={(event) => changeConfig({ ...config, amount: event.target.value === '' ? '' : Number(event.target.value) })} />
      </div>
      <p>Saldo inicial fijo por nodo: Emisor 10, Receptor 0. Una carga con importe 11 se difunde, pero cada nodo la rechaza al validarla.</p>
      {CHANNELS.map((channel) => <fieldset key={channel}>
        <legend>{channelNames[channel]}</legend>
        <div className="inline-options">{EDGES.map((edge) => <label key={edge} htmlFor={`network-${channel}-${edge}`}>
          <input id={`network-${channel}-${edge}`} type="checkbox" checked={config.channels[channel][edge]} onChange={(event) => changeConfig({ ...config, channels: { ...config.channels, [channel]: { ...config.channels[channel], [edge]: event.target.checked } } })} />
          {channelNames[channel]}: enlace {edge[0]}–{edge[1]} abierto
        </label>)}</div>
      </fieldset>)}
      <p className="guidance">Un canal abierto permite entregar su mensaje en la siguiente ronda. Ningún mensaje se mueve al configurar. La cadena A–B–C necesita dos rondas para llegar de A a C.</p>
      <div className="actions"><button type="button" onClick={start}>Iniciar recorrido</button></div>
    </>}

    {step === 1 && run && inspected && <>
      <p>Última ronda ejecutada: <strong>{run.round}</strong> de {MAX_ROUNDS}. A origina la carga de {run.payload.amount} unidades y la propuesta que referencia <code>{run.proposal.payloadId}</code>.</p>
      <p className="guidance">Cada ronda usa únicamente lo conocido al inicio. B no puede reenviar a C un mensaje que acaba de recibir en esa misma ronda. Los datos rechazados también se retransmiten en este modelo.</p>
      <Field id="network-inspected-round" label="Ronda para inspeccionar">
        <select id="network-inspected-round" value={selectedRound} onChange={(event) => setSelectedRound(Number(event.target.value))}>
          {run.history.map(({ round }) => <option key={round} value={round}>Ronda {round}{round === run.round ? ' · más reciente' : ''}</option>)}
        </select>
      </Field>
      <h3>Estado al terminar la ronda {inspected.round}</h3>
      <NodeCards nodes={inspected.nodes} />
      <p className="step-result">Entregas en esta ronda: <strong>{inspected.deliveries.length}</strong>. Tener datos válidos y la propuesta solo satisface los requisitos de este ejercicio; no significa cabeza canónica ni finalidad.</p>
      <JsonDetails key={`run-${selectedRound}-${run.round}`} title={`Traza técnica de la ronda ${selectedRound}`} value={{ payload: run.payload, proposal: run.proposal, snapshot: inspected }} />
      <div className="actions">
        <button type="button" onClick={() => nextRound()}>Propagar una ronda</button>
        <button type="button" className="secondary" disabled={run.round < 1} onClick={() => navigate(2)}>Comparar recuperación</button>
        <button type="button" className="text-button" onClick={() => navigate(0)}>Volver a configurar</button>
      </div>
      <p>Al editar cualquier configuración se descartan las rondas y la recuperación anteriores. Inspeccionar una ronda pasada no cambia el punto desde el que se propaga.</p>
    </>}

    {step === 2 && run && compared && <>
      <p>Compara la ronda <strong>{run.round}</strong> del recorrido con {recovery ? `la ronda ${recovery.round} de recuperación` : 'el mismo estado, todavía sin restaurar canales'}. Reconectar conserva los nodos y su conocimiento previo.</p>
      <div className="actions">
        <button type="button" onClick={reconnect} disabled={Boolean(recovery)}>Restaurar todos los canales</button>
        <button type="button" className="secondary" disabled={!recovery} onClick={() => nextRound(true)}>Propagar una ronda de recuperación</button>
      </div>
      <p className="step-result">{!recovery ? 'Todavía no se restauraron los canales.' : recovery.round === run.round ? 'Canales restaurados. Aún no se propagó ninguna ronda de recuperación.' : `Rondas de recuperación ejecutadas: ${recovery.round - run.round}. Entregas adicionales: ${recoveryDelivered}.`}</p>
      <div className="table-scroll" role="region" aria-label="Comparación de nodos antes y después de reconectar" tabIndex="0">
        <table className="compact-table">
          <caption>Antes → después. Una carga rechazada no se corrige al reconectar.</caption>
          <thead><tr><th scope="col">Nodo</th><th scope="col">Carga conocida</th><th scope="col">Ejecución validada</th><th scope="col">Propuesta conocida</th><th scope="col">Ambos requisitos válidos</th></tr></thead>
          <tbody>{NODES.map((id) => <tr key={id}>
            <th scope="row">{id}</th>
            <td>{yesNo(run.nodes[id].payloadKnown)} → {yesNo(compared.nodes[id].payloadKnown)}</td>
            <td>{validationLabel(run.nodes[id])} → {validationLabel(compared.nodes[id])}</td>
            <td>{yesNo(run.nodes[id].proposalKnown)} → {yesNo(compared.nodes[id].proposalKnown)}</td>
            <td>{yesNo(run.nodes[id].prerequisitesAvailable)} → {yesNo(compared.nodes[id].prerequisitesAvailable)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p>Si faltaban mensajes, ahora pueden llegar por los enlaces abiertos en una ronda explícita. Si la carga era inválida, los nodos siguen rechazándola aunque conozcan la propuesta.</p>
      <JsonDetails key={`recovery-${recovery?.round ?? 'none'}`} title="Traza técnica de la comparación" value={{ before: run, after: recovery }} />
      <div className="actions"><button type="button" className="text-button" onClick={() => navigate(1)}>Volver a inspeccionar</button><button type="button" className="text-button" onClick={() => navigate(0)}>Cambiar escenario</button></div>
    </>}
  </LabShell>
}
