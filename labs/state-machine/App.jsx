import { Fragment, useState } from 'react'
import { Field, LabShell } from '../shared/LabShell.jsx'
import {
  ACCOUNTS, DEFAULT_AMOUNTS, EXPERIMENTS, INITIAL_BALANCES,
  compareRuns, executePrepared, parseAmount, prepareExperiment,
} from './model.mjs'

const STEPS = ['Preparar y predecir', 'Ejecutar A', 'Ejecutar B', 'Comparar']
const ruleLabel = (rule) => rule === 'strict' ? 'Estricta: rechazar saldo insuficiente' : 'Alterada: permitir saldo negativo, no válida en Ethereum'
const balancesText = (balances) => ACCOUNTS.map((account) => balances[account]).join(' / ')

function amountError(value, id) {
  try { parseAmount(value, id); return '' }
  catch (cause) { return cause.message }
}

function Balances({ balances }) {
  return <dl className="balance-list">{ACCOUNTS.map((account) => <Fragment key={account}><dt>{account}</dt><dd>{balances[account]}</dd></Fragment>)}</dl>
}

function ReplicaSetup({ side, setup }) {
  return <section aria-label={`Preparación de la réplica ${side}`}>
    <h3>Réplica {side}</h3>
    <p>Orden: {setup[side].order.join(' → ')}</p>
    <p>{ruleLabel(setup[side].rule)}</p>
  </section>
}

function Trace({ side, ledger }) {
  return <details>
    <summary>Ver registro de {side}</summary>
    <p>Los saldos se muestran en orden Alicia / Bruno / Carla. Un rechazo conserva el estado previo.</p>
    <div className="table-scroll" role="region" tabIndex="0" aria-label={`Transiciones de la réplica ${side}`}>
      <table className="compact-table">
        <caption>Registro de {side}, total inicial de 14 unidades</caption>
        <thead><tr><th scope="col">Transferencia</th><th scope="col">Antes</th><th scope="col">Resultado</th><th scope="col">Después</th><th scope="col">Total</th></tr></thead>
        <tbody>{ledger.trace.map((entry) => <tr key={entry.transaction.id}>
          <th scope="row">{entry.transaction.id}: {entry.transaction.from} → {entry.transaction.to}, {entry.transaction.amount}</th>
          <td>{balancesText(entry.before)}</td>
          <td>{entry.reason}{entry.negativeAccounts.length > 0 && ' Hay saldo negativo.'}</td>
          <td>{balancesText(entry.after)}</td>
          <td>{entry.total}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </details>
}

export default function App() {
  const [step, setStep] = useState(0)
  const [experiment, setExperiment] = useState('same')
  const [amounts, setAmounts] = useState({ T1: '6', T2: '8' })
  const [acceptedAmounts, setAcceptedAmounts] = useState(DEFAULT_AMOUNTS)
  const [prediction, setPrediction] = useState('')
  const [setup, setSetup] = useState(null)
  const [resultA, setResultA] = useState(null)
  const [resultB, setResultB] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('Elige una condición y predice los saldos finales.')
  const currentA = Boolean(setup && resultA?.setup === setup)
  const currentB = Boolean(currentA && resultB?.setup === setup)
  const available = [true, Boolean(setup), currentA, currentB]
  const comparison = currentB ? compareRuns(setup, resultA, resultB) : null
  const amountErrors = { T1: amountError(amounts.T1, 'T1'), T2: amountError(amounts.T2, 'T2') }

  function invalidate() {
    setSetup(null)
    setResultA(null)
    setResultB(null)
    setStep(0)
    setError('')
    setMessage('La edición descartó la preparación y los resultados. Congela el nuevo caso antes de ejecutar.')
  }

  function editAmount(id, value) {
    const next = { ...amounts, [id]: value }
    invalidate()
    setAmounts(next)
    try {
      setAcceptedAmounts({ T1: parseAmount(next.T1, 'T1'), T2: parseAmount(next.T2, 'T2') })
    } catch {
      setMessage('Completa el borrador antes de congelar la preparación. Se conservan los últimos importes válidos.')
    }
  }

  function freeze() {
    try {
      const next = prepareExperiment({ experiment, amounts, prediction })
      setSetup(next)
      setAcceptedAmounts(next.amounts)
      setResultA(null)
      setResultB(null)
      setError('')
      setStep(1)
      setMessage('Preparación congelada. Ambas réplicas partirán del mismo estado inicial.')
    } catch (cause) {
      setError(cause.message)
    }
  }

  function execute(side) {
    if (!setup || (side === 'B' && !currentA)) return
    try {
      const result = executePrepared(setup, side)
      if (side === 'A') {
        setResultA(result)
        setResultB(null)
        setStep(2)
      } else {
        setResultB(result)
        setStep(3)
      }
      setError('')
      setMessage(`Réplica ${side} ejecutada desde Alicia 10, Bruno 4 y Carla 0. No se copió el resultado de la otra réplica.`)
    } catch (cause) {
      setError(cause.message)
    }
  }

  function navigate(next) {
    if (!available[next] || next === step) return
    if (next === 0) {
      invalidate()
      return
    }
    if (next < step) {
      if (next === 1) setResultA(null)
      setResultB(null)
      setMessage(next === 1 ? 'Volviste a la preparación congelada. Ejecuta A y B otra vez.' : 'Se descartó B. Ejecuta B otra vez para comparar.')
    }
    setError('')
    setStep(next)
  }

  function reset() {
    setStep(0)
    setExperiment('same')
    setAmounts({ T1: '6', T2: '8' })
    setAcceptedAmounts(DEFAULT_AMOUNTS)
    setPrediction('')
    setSetup(null)
    setResultA(null)
    setResultB(null)
    setError('')
    setMessage('Valores iniciales restaurados. Elige una predicción para comenzar.')
  }

  return <LabShell
    chapter={1}
    title="Máquina de estados compartida"
    summary="Dos réplicas, un estado inicial y dos transferencias. Cambia el orden o una regla por separado y compara lo que ocurre."
    scope="Modelo didáctico de tres cuentas y dos transferencias, con unidades ficticias. No ejecuta Ethereum ni modela gas, firmas, nonce, red o consenso. La regla alterada permite saldos negativos intencionalmente y no es válida en Ethereum. Sin fondos reales ni conexión a una red."
    steps={STEPS}
    step={step}
    onStep={navigate}
    available={available}
    onReset={reset}
    error={error}
    message={message}
  >
    {step === 0 && <>
      <p>Estado inicial fijo: Alicia 10, Bruno 4, Carla 0. Total: 14 unidades.</p>
      <Field id="state-experiment" label="Experimento">
        <select id="state-experiment" value={experiment} onChange={(event) => { invalidate(); setExperiment(event.target.value); setPrediction('') }}>
          {Object.entries(EXPERIMENTS).map(([id, item]) => <option value={id} key={id}>{item.label}</option>)}
        </select>
      </Field>
      <p className="guidance">{EXPERIMENTS[experiment].description}</p>
      <div className="fields-grid">
        <div>
          <Field id="state-t1" label="T1: Alicia → Bruno" type="text" inputMode="numeric" maxLength={3} value={amounts.T1} aria-invalid={Boolean(amountErrors.T1)} aria-describedby={`state-amount-help${amountErrors.T1 ? ' state-t1-error' : ''}`} onChange={(event) => editAmount('T1', event.target.value)} />
          {amountErrors.T1 && <p id="state-t1-error" className="field-error">{amountErrors.T1}</p>}
        </div>
        <div>
          <Field id="state-t2" label="T2: Bruno → Carla" type="text" inputMode="numeric" maxLength={3} value={amounts.T2} aria-invalid={Boolean(amountErrors.T2)} aria-describedby={`state-amount-help${amountErrors.T2 ? ' state-t2-error' : ''}`} onChange={(event) => editAmount('T2', event.target.value)} />
          {amountErrors.T2 && <p id="state-t2-error" className="field-error">{amountErrors.T2}</p>}
        </div>
      </div>
      <p id="state-amount-help">Cada importe admite enteros de 1 a 20. No son ETH. Últimos importes válidos: T1 = {acceptedAmounts.T1}, T2 = {acceptedAmounts.T2}.</p>
      <Field id="state-prediction" label="Predicción sobre los saldos finales de A y B">
        <select id="state-prediction" value={prediction} onChange={(event) => { invalidate(); setPrediction(event.target.value) }}>
          <option value="">Elige una predicción</option>
          <option value="equal">Serán iguales</option>
          <option value="different">Serán diferentes</option>
        </select>
      </Field>
      <p>La predicción no modifica la ejecución. Cada réplica aplica las transferencias en su orden, acepta o rechaza cada una y continúa con la siguiente.</p>
      <div className="actions"><button type="button" onClick={freeze}>Congelar preparación</button></div>
    </>}

    {step === 1 && setup && <>
      <p>{EXPERIMENTS[setup.experiment].label}. T1 = {setup.amounts.T1}; T2 = {setup.amounts.T2}.</p>
      <p>Predicción congelada: {setup.prediction === 'equal' ? 'serán iguales' : 'serán diferentes'}.</p>
      <p>Ambas réplicas comienzan con estos saldos, no con el resultado de una ejecución anterior.</p>
      <Balances balances={INITIAL_BALANCES} />
      <div className="comparison"><ReplicaSetup side="A" setup={setup} /><ReplicaSetup side="B" setup={setup} /></div>
      <div className="actions">
        <button type="button" onClick={() => execute('A')}>Ejecutar réplica A</button>
        <button type="button" className="secondary" onClick={() => navigate(0)}>Volver y editar</button>
      </div>
    </>}

    {step === 2 && currentA && <>
      <div className="step-result"><h3>Saldos finales de A</h3><Balances balances={resultA.ledger.balances} /><p>Total: {resultA.ledger.total} unidades.</p></div>
      <p>A aceptó {resultA.ledger.trace.filter((entry) => entry.accepted).length} de 2 transferencias.</p>
      <p>B todavía no se ejecutó. Parte de Alicia 10, Bruno 4 y Carla 0, no de los saldos finales de A.</p>
      <ReplicaSetup side="B" setup={setup} />
      <div className="actions">
        <button type="button" onClick={() => execute('B')}>Ejecutar réplica B y comparar</button>
        <button type="button" className="secondary" onClick={() => navigate(0)}>Volver y editar</button>
      </div>
    </>}

    {step === 3 && currentB && <>
      <div className="step-result">
        <h3>{comparison.equal ? 'Saldos finales iguales' : 'Saldos finales diferentes'}</h3>
        <p>Predijiste que serían {comparison.prediction === 'equal' ? 'iguales' : 'diferentes'}. {comparison.correct ? 'La predicción coincide con lo observado.' : 'La predicción no coincide con lo observado.'}</p>
      </div>
      <p>{EXPERIMENTS[setup.experiment].description} Importes usados: T1 = {setup.amounts.T1}, T2 = {setup.amounts.T2}.</p>
      <div className="comparison">{[resultA, resultB].map(({ side, ledger }) => <section key={side} aria-label={`Resultado de la réplica ${side}`}>
        <h3>Réplica {side}</h3>
        <p>{ledger.order.join(' → ')}. {ruleLabel(ledger.rule)}.</p>
        <Balances balances={ledger.balances} />
        <p>Total: {ledger.total} unidades.</p>
        <p>{ledger.trace.filter((entry) => !entry.accepted).length} rechazos.</p>
      </section>)}</div>
      {[resultA, resultB].flatMap(({ side, ledger }) => ledger.trace.filter((entry) => !entry.accepted).map((entry) => <p className="notice" key={`${side}-${entry.transaction.id}-rejected`}>{side}, {entry.transaction.id}: saldo insuficiente. Se rechazó sin cambiar ningún saldo. El rechazo no detiene la secuencia.</p>))}
      {[resultA, resultB].flatMap(({ side, ledger }) => ledger.trace.filter((entry) => entry.negativeAccounts.length > 0).map((entry) => <p className="notice" key={`${side}-${entry.transaction.id}-negative`}>{side}, después de {entry.transaction.id}: {entry.negativeAccounts.map((account) => `${account} = ${entry.after[account]}`).join(', ')}. Este estado negativo viola la regla estricta, aunque el total siga siendo 14.</p>))}
      <p className="guidance">{setup.experiment === 'same'
        ? 'Mismo estado inicial, mismas reglas y mismo orden producen las mismas transiciones. Eso es determinismo, no consenso.'
        : setup.experiment === 'order'
          ? 'Aquí solo cambió el orden. Un resultado distinto no contradice el determinismo. Con otros importes, ambos órdenes también pueden coincidir.'
          : 'Aquí solo cambió la regla de saldo insuficiente. El orden inverso es idéntico en A y B. Conservar el total no vuelve válida una transición con saldo negativo; importes que no activan la diferencia pueden terminar iguales.'}</p>
      <Trace side="A" ledger={resultA.ledger} />
      <Trace side="B" ledger={resultB.ledger} />
      <div className="actions"><button type="button" onClick={() => navigate(0)}>Editar otro experimento</button></div>
    </>}
  </LabShell>
}
