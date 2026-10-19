import { useRef, useState } from 'react'
import { Field, JsonDetails, LabShell } from '../shared/LabShell.jsx'
import { useWorker } from '../shared/useWorker.jsx'

const makeWorker = () => new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' })
const STEPS = ['Configurar y predecir', 'Firmar reportes congelados', 'Verificar y agregar']
const SOURCES = ['A', 'B', 'C']
const PRESETS = {
  honest: { label: 'Tres fuentes honestas', prices: ['200000', '201000', '199000'], ages: ['10', '10', '10'] },
  'one-liar': { label: 'Una fuente auténtica miente', prices: ['900000', '201000', '199000'], ages: ['10', '10', '10'] },
  'two-liars': { label: 'Dos fuentes auténticas mienten', prices: ['900000', '910000', '199000'], ages: ['10', '10', '10'] },
  stale: { label: 'Reportes vencidos: pérdida de quórum', prices: ['200000', '201000', '199000'], ages: ['10', '61', '61'] },
}
const PREDICTIONS = {
  same: 'La mediana coincide con 200000',
  different: 'Hay quórum, pero la mediana difiere de 200000',
  none: 'No hay quórum ni agregado válido',
}

function ReportsTable({ reports, label }) {
  return <div className="table-scroll" role="region" aria-label={label} tabIndex="0">
    <table className="compact-table"><caption>{label}</caption><thead><tr><th scope="col">Reporte</th><th scope="col">Fuente</th><th scope="col">Precio, centavos USD ficticios</th><th scope="col">Marca de tiempo firmada, s</th></tr></thead>
      <tbody>{reports.map((report, index) => <tr key={index}><th scope="row">{index + 1}</th><td>{report.source}</td><td>{report.price}</td><td>{report.timestamp}</td></tr>)}</tbody>
    </table>
  </div>
}

export default function App() {
  const worker = useWorker(makeWorker)
  const revision = useRef(0)
  const [step, setStep] = useState(0)
  const [preset, setPreset] = useState('honest')
  const [prices, setPrices] = useState([...PRESETS.honest.prices])
  const [ages, setAges] = useState([...PRESETS.honest.ages])
  const [prediction, setPrediction] = useState('')
  const [prepared, setPrepared] = useState(null)
  const [signed, setSigned] = useState(null)
  const [reports, setReports] = useState(null)
  const [clock, setClock] = useState(1000)
  const [caseKind, setCaseKind] = useState('original')
  const [analysis, setAnalysis] = useState(null)
  const [disclosure, setDisclosure] = useState(0)
  const [advancedEpoch, setAdvancedEpoch] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('Elige un escenario y predice el resultado antes de firmar.')
  const disabled = worker.busy || !worker.ready || worker.fatal

  function clearAnalysis() {
    revision.current += 1
    setAnalysis(null)
    setError('')
    worker.clearError()
    setDisclosure((value) => value + 1)
  }

  function invalidate() {
    clearAnalysis()
    setPrepared(null)
    setSigned(null)
    setReports(null)
    setClock(1000)
    setCaseKind('original')
    setStep(0)
    setMessage('La configuración cambió. Congela y firma de nuevo antes de analizar.')
  }

  function choosePreset(value) {
    invalidate()
    setPreset(value)
    setPrices([...PRESETS[value].prices])
    setAges([...PRESETS[value].ages])
    setPrediction('')
  }

  function editValue(setter, values, index, value) {
    invalidate()
    setter(values.map((previous, position) => position === index ? value : previous))
    setPrediction('')
  }

  function reset() {
    invalidate()
    setPreset('honest')
    setPrices([...PRESETS.honest.prices])
    setAges([...PRESETS.honest.ages])
    setPrediction('')
    setAdvancedEpoch((value) => value + 1)
    setMessage('Recorrido reiniciado. El reloj educativo vuelve a 1000 s.')
    worker.restart()
  }

  async function prepare() {
    setError('')
    if (!prediction) { setError('Selecciona una predicción antes de congelar la configuración.'); return }
    const current = revision.current
    const result = await worker.run('configure', { preset, prices, ages, clock: 1000 })
    if (!result || current !== revision.current) return
    if (result.clock !== 1000 || result.prices?.length !== 3 || result.ages?.length !== 3 || result.prices.some((value, index) => value !== Number(prices[index])) || result.ages.some((value, index) => value !== Number(ages[index]))) {
      setError('La respuesta no corresponde a la configuración actual. Reinicia el laboratorio.'); return
    }
    setPrepared(result)
    setSigned(null)
    setReports(null)
    setAnalysis(null)
    setStep(1)
    setMessage('Configuración congelada. Todavía no se generaron firmas.')
  }

  async function sign(fresh = false) {
    if (!prepared) return
    const current = revision.current
    const input = fresh ? { ...prepared, clock, ages: [0, 0, 0] } : prepared
    setError('')
    const result = await worker.run('sign', input)
    if (!result || current !== revision.current) return
    if (result.reports?.length !== 3 || result.config?.clock !== input.clock || result.reports.some((report, index) => report.source !== SOURCES[index] || report.price !== input.prices[index] || report.timestamp !== input.clock - input.ages[index] || typeof report.signatureHex !== 'string')) {
      setError('Los reportes firmados no corresponden a la configuración congelada. Reinicia el laboratorio.'); return
    }
    revision.current += 1
    setSigned(result)
    setReports(result.reports)
    setClock(result.config.clock)
    setCaseKind('original')
    setAnalysis(null)
    setDisclosure((value) => value + 1)
    setStep(2)
    setMessage(fresh ? 'Nuevos reportes firmados con la hora educativa actual. Verifica para recuperar el quórum.' : 'Tres firmas ECDSA generadas. Verifica contra el registro fijo, no contra un firmante declarado por el reporte.')
  }

  async function chooseCase(kind) {
    if (!signed) return
    clearAnalysis()
    const current = revision.current
    const result = await worker.run('alter', { reports: signed.reports, kind })
    if (!result || current !== revision.current) return
    if (!Array.isArray(result) || result.length !== (kind === 'duplicate' ? 4 : 3)) {
      setError('El Worker devolvió un caso incompleto. Reinicia el laboratorio.'); return
    }
    setCaseKind(kind)
    setReports(result)
    setMessage('Caso preparado desde los reportes originales. Las firmas no se regeneraron. Verifica otra vez.')
  }

  function advanceClock(seconds) {
    if (clock + seconds > 1000000) { setError('El reloj educativo no puede superar 1000000 s.'); return }
    clearAnalysis()
    setClock(clock + seconds)
    setMessage('El reloj avanzó sin cambiar reportes ni firmas. Verifica su nueva antigüedad.')
  }

  async function restore() {
    if (!signed) return
    clearAnalysis()
    const current = revision.current
    const result = await worker.run('alter', { reports: signed.reports, kind: 'original' })
    if (!result || current !== revision.current) return
    setReports(result)
    setCaseKind('original')
    setClock(signed.config.clock)
    setMessage('Reportes y reloj restaurados al momento de la firma. Verifica otra vez.')
  }

  async function analyze() {
    if (!reports) return
    setError('')
    const current = revision.current
    const result = await worker.run('analyze', { reports, clock })
    if (!result || current !== revision.current) return
    if (result.clock !== clock || result.rows?.length !== reports.length || typeof result.quorum !== 'boolean' || result.rows.some((row, index) => row.report.signatureHex !== reports[index].signatureHex || row.report.source !== reports[index].source || row.report.price !== reports[index].price || row.report.timestamp !== reports[index].timestamp)) {
      setError('El análisis no corresponde a los reportes actuales. Reinicia el laboratorio.'); return
    }
    setAnalysis(result)
    setDisclosure((value) => value + 1)
    setMessage(result.quorum ? 'Autenticidad y antigüedad comprobadas. La mediana no prueba veracidad.' : 'Sin quórum: no se publica ningún agregado válido.')
  }

  const outcome = analysis ? !analysis.quorum ? 'none' : analysis.median === 200000 ? 'same' : 'different' : null
  const originalRun = signed && caseKind === 'original' && clock === 1000 && signed.config.clock === 1000 && signed.config.ages.every((age, index) => age === prepared?.ages[index])

  return <LabShell chapter={11} title="Datos auténticos, precios incorrectos" summary="Firma reportes de tres fuentes y separa procedencia, antigüedad y mediana." scope={<>
    Modelo educativo complementario, no un protocolo de oráculos ni un contrato on-chain. Precios en centavos de USD ficticios. Referencia fija de 200000 centavos, no cotización ni verdad de mercado. Claves privadas educativas, conocidas públicamente, con escalares 11, 12 y 13: nunca enviar fondos ni importarlas. Sin claves personales, billetera, red ni persistencia.
  </>} steps={STEPS} step={step} onStep={setStep} available={[true, Boolean(prepared), Boolean(signed && reports)]} onReset={reset} busy={worker.busy} error={error || worker.error} message={message}>
    {worker.fatal && <div className="notice"><p>El Worker se detuvo. Reiniciar descarta el recorrido y permite volver a firmar.</p><button type="button" onClick={reset}>Reiniciar Worker y recorrido</button></div>}
    {step === 0 && <>
      <p>Reloj inicial: <strong>1000 s</strong>. Cada fuente firma precio y marca de tiempo calculada como 1000 menos antigüedad.</p>
      <Field id="oracle-preset" label="Escenario"><select id="oracle-preset" value={preset} disabled={disabled} onChange={(event) => choosePreset(event.target.value)}>{Object.entries(PRESETS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></Field>
      <p>Precios A / B / C: <strong>{prices.join(' / ')}</strong> centavos. Antigüedades: {ages.join(' / ')} s.</p>
      <Field id="oracle-prediction" label="Predicción sobre el escenario sin alteraciones"><select id="oracle-prediction" value={prediction} disabled={disabled} onChange={(event) => { invalidate(); setPrediction(event.target.value) }}><option value="">Selecciona una predicción</option>{Object.entries(PREDICTIONS).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></Field>
      <details key={`advanced-${advancedEpoch}`}><summary>Opciones avanzadas: editar precios y antigüedades</summary>
        <p>Precios enteros de 1 a 1000000000 centavos. Antigüedades enteras de 0 a 1000 s. Sin espacios, decimales ni ceros iniciales.</p>
        {SOURCES.map((source, index) => <div className="fields-grid" key={source}>
          <Field id={`oracle-price-${source}`} label={`Precio de ${source}, centavos USD ficticios`} type="number" min="1" max="1000000000" step="1" value={prices[index]} disabled={disabled} onChange={(event) => editValue(setPrices, prices, index, event.target.value)} />
          <Field id={`oracle-age-${source}`} label={`Antigüedad de ${source}, segundos`} type="number" min="0" max="1000" step="1" value={ages[index]} disabled={disabled} onChange={(event) => editValue(setAges, ages, index, event.target.value)} />
        </div>)}
      </details>
      <p className="guidance">Se necesitan dos fuentes distintas autenticadas y vigentes. Una fuente auténtica también puede mentir. Con dos valores se promedia y se redondea hacia abajo al centavo entero.</p>
      <div className="actions"><button type="button" disabled={disabled} onClick={prepare}>Congelar configuración</button></div>
    </>}
    {step === 1 && prepared && <>
      <p>Predicción registrada: {PREDICTIONS[prediction]}. Firmar no implica aceptar reportes ni obtener un precio verdadero.</p>
      <ReportsTable label="Datos congelados antes de firmar" reports={SOURCES.map((source, index) => ({ source, price: prepared.prices[index], timestamp: prepared.clock - prepared.ages[index] }))} />
      <p>Se firman bytes UTF-8 de un arreglo JSON canónico, sin espacios, en orden dominio, feed, fuente, precio entero y marca de tiempo entera. ECDSA secp256k1 sobre Keccak-256, sin prefijo EIP-191, con s bajo y v de 27 o 28.</p>
      <p>Dominio: <code>TRG-LAB-ORACULOS/v1</code>. Feed ficticio: <code>ETH-USD-FICTICIO</code>.</p>
      <div className="actions"><button type="button" disabled={disabled} onClick={() => sign()}>Firmar tres reportes</button><button type="button" disabled={worker.busy} onClick={() => setStep(0)}>Volver a configuración</button></div>
    </>}
    {step === 2 && signed && reports && <>
      <p>Reloj educativo: <strong>{clock} s</strong>. Vigencia inclusiva: antigüedad entre 0 y 60 s. Las marcas de tiempo futuras se rechazan.</p>
      <ReportsTable label="Reportes que se verificarán" reports={reports} />
      <Field id="oracle-case" label="Cambiar reporte después de firmar"><select id="oracle-case" value={caseKind} disabled={disabled} onChange={(event) => chooseCase(event.target.value)}>
        <option value="original">Reportes originales</option><option value="price">Alterar precio de A sin volver a firmar</option><option value="timestamp">Alterar marca de tiempo de A sin volver a firmar</option><option value="source">Afirmar que el reporte de A es de B</option><option value="duplicate">Duplicar reporte de A</option>
      </select></Field>
      <div className="actions"><button type="button" disabled={disabled} onClick={() => advanceClock(50)}>Avanzar reloj 50 s</button><button type="button" disabled={disabled} onClick={() => advanceClock(1)}>Avanzar reloj 1 s</button></div>
      <p>Duplicados: en orden de llegada, solo cuenta el primer reporte válido y vigente de cada fuente. Una firma inválida o vencida no ocupa su lugar.</p>
      <div className="actions"><button type="button" disabled={disabled} onClick={analyze}>Verificar autenticidad, vigencia y mediana</button></div>
      {analysis && <section className="step-result" aria-labelledby="oracle-result-title">
        <h3 id="oracle-result-title">Resultado de este análisis</h3>
        <div className="table-scroll" role="region" aria-label="Autenticidad y vigencia por reporte" tabIndex="0"><table className="compact-table"><caption>Autenticidad y vigencia por reporte</caption><thead><tr><th scope="col">Reporte y fuente</th><th scope="col">Autenticidad contra registro</th><th scope="col">Antigüedad</th><th scope="col">Vigencia</th><th scope="col">Cuenta</th></tr></thead><tbody>{analysis.rows.map((row, index) => <tr key={index}><th scope="row">{index + 1}: {row.report.source}</th><td>{row.authenticated ? 'Autenticada' : 'No autenticada'}</td><td>{row.ageSeconds === null ? 'No válida' : `${row.ageSeconds} s`}</td><td>{row.timeStatus}</td><td>{row.counted ? 'Sí' : row.duplicate ? 'No, repetida' : 'No'}</td></tr>)}</tbody></table></div>
        <ul>{analysis.rows.map((row, index) => <li key={index}>Reporte {index + 1}, fuente {row.report.source}: {row.reason}</li>)}</ul>
        <p>Fuentes distintas aceptadas: <strong>{analysis.distinctSources}</strong>. Quórum requerido: 2.</p>
        {analysis.quorum ? <>
          <p>Precios aceptados ordenados: {analysis.sortedPrices.join(', ')} centavos.</p>
          <p>Mediana válida según estas reglas: <strong>{analysis.median} centavos USD ficticios</strong>. Diferencia con referencia educativa: <strong>{analysis.difference} centavos</strong>.</p>
          <p>{analysis.rounding}</p><p>La firma autentica procedencia e integridad. No demuestra que el precio sea correcto. Controlar dos fuentes puede desviar esta mediana aunque todas las firmas sean auténticas.</p>
        </> : <p className="notice"><strong>Sin quórum: no hay agregado válido.</strong> No se reutiliza una mediana anterior.</p>}
        {originalRun && <p>Predicción inicial: {PREDICTIONS[prediction]}. {prediction === outcome ? 'Coincide con el resultado calculado.' : 'No coincide con el resultado calculado.'}</p>}
        <JsonDetails key={`analysis-${disclosure}`} title="Inspeccionar bytes canónicos, firmantes recuperados y análisis" value={analysis} />
      </section>}
      <div className="actions"><button type="button" disabled={disabled} onClick={restore}>Restaurar reportes y reloj</button><button type="button" disabled={disabled} onClick={() => sign(true)}>Actualizar y volver a firmar</button></div>
      <p>Restaurar conserva las firmas originales y vuelve a su reloj. Actualizar genera firmas nuevas con antigüedad 0 s para las tres fuentes, sin corregir precios mentirosos.</p>
      <JsonDetails key={`signed-${disclosure}`} title="Inspeccionar firmas originales y registro fijo de firmantes" value={signed} />
    </>}
  </LabShell>
}
