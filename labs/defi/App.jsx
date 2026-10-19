import { useEffect, useRef, useState } from 'react'
import { LabShell, Field, JsonDetails } from '../shared/LabShell.jsx'
import { useWorker } from '../shared/useWorker.jsx'
import { formatUnits as f, healthText, quoteMetrics, units, validSnapshot } from './model.mjs'
import source from './contracts.sol?raw'

const makeWorker = () => new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' })
const actors = ['Alice', 'Bob', 'Carol']

function Ledger({ snapshot }) {
  const s = snapshot.ledger
  return <details className="technical"><summary>Consultar saldos reales del contrato</summary>
    <div className="table-scroll" role="region" aria-label="Saldos internos" tabIndex="0"><table className="compact-table"><thead><tr><th>Cuenta</th><th>{snapshot.mode === 'amm' ? 'X' : 'Garantía disponible'}</th><th>{snapshot.mode === 'amm' ? 'Y' : 'Stable interna'}</th></tr></thead><tbody>
      {actors.map((actor, i) => <tr key={actor}><th>{actor}</th><td>{f(snapshot.mode === 'amm' ? s.walletX[i] : s.collateralWallet[i])}</td><td>{f(snapshot.mode === 'amm' ? s.walletY[i] : s.stableWallet[i])}</td></tr>)}
      <tr><th>{snapshot.mode === 'amm' ? 'Reservas' : 'Contrato'}</th><td>{f(snapshot.mode === 'amm' ? s.reserveX : s.collateral)}</td><td>{f(snapshot.mode === 'amm' ? s.reserveY : s.pool)}</td></tr>
    </tbody></table></div>
    {snapshot.mode === 'loan' && <p>Deuda contable de Alice: {f(s.debt)}. Garantía en custodia: {f(s.collateral)}. La deuda no es stable adicional.</p>}
  </details>
}

export default function App() {
  const worker = useWorker(makeWorker)
  const [snapshot, setSnapshot] = useState(null)
  const [selected, setSelected] = useState('amm')
  const [step, setStep] = useState(0)
  const [amount, setAmount] = useState('100')
  const [direction, setDirection] = useState(true)
  const [tolerance, setTolerance] = useState('100')
  const [prepared, setPrepared] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [borrow, setBorrow] = useState('80')
  const [price, setPrice] = useState('1')
  const [operation, setOperation] = useState('liquidate')
  const [loanAmount, setLoanAmount] = useState('40')
  const [outcome, setOutcome] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('Elige un módulo. Cada sesión empieza con un contrato y saldos nuevos.')
  const [unknown, setUnknown] = useState(false)
  const [disclosure, setDisclosure] = useState(0)
  const active = useRef(false)
  const epoch = useRef(0)
  const locked = worker.busy || !worker.ready || worker.fatal || unknown
  const mode = snapshot?.mode
  const frozen = prepared ? snapshot?.frozen : null
  const ledger = snapshot?.ledger
  const steps = mode === 'loan' ? ['Elegir módulo', 'Abrir posición', 'Aplicar precio', 'Liquidar y recuperar'] : ['Elegir módulo', 'Preparar intercambio', 'Congelar y ejecutar', 'Leer resultado']

  useEffect(() => {
    if (!worker.failure) return
    if (validSnapshot(worker.failure.snapshot)) setSnapshot(worker.failure.snapshot)
    else { setUnknown(true); setPrepared(false); setOutcome(null); setSnapshot(null) }
  }, [worker.failure])

  async function request(action, fields = {}) {
    if (active.current || locked) return null
    active.current = true
    const generation = epoch.current
    setError('')
    try {
      const result = await worker.run(action, fields)
      if (!result || generation !== epoch.current) return null
      if (!validSnapshot(result.snapshot) || (result.receipt && (![0, 1].includes(result.receipt.status) || typeof result.receipt.feeWei !== 'string'))) {
        setUnknown(true); setSnapshot(null); setPrepared(false); setOutcome(null)
        setError('Respuesta incompleta. El estado es desconocido; reinicia el laboratorio.')
        return null
      }
      setSnapshot(result.snapshot)
      if (result.receipt) {
        setOutcome(result)
        if (result.receipt.status === 0) {
          setError(`La transacción se incluyó con status 0: ${result.error}. Los cambios del contrato se revirtieron; gas y nonce sí se consumieron.`)
          setMessage('Reversión real. Corrige la acción o vuelve a cotizar; el estado del contrato se conserva.')
        } else setMessage('Transacción incluida con status 1. Saldos consultados de nuevo en el contrato.')
      }
      return result
    } finally { active.current = false }
  }

  function clearResult() { setOutcome(null); setError(''); worker.clearError() }
  function editSwap(setter, value) {
    setter(value); setPrepared(false); setSubmitted(false); clearResult(); setStep(1)
    setMessage('Importe, dirección o tolerancia editados. La cotización anterior ya no autoriza enviar; congela otra.')
  }
  function defaults() {
    setAmount('100'); setDirection(true); setTolerance('100'); setBorrow('80'); setPrice('1'); setOperation('liquidate'); setLoanAmount('40')
    setPrepared(false); setSubmitted(false); setOutcome(null); setError(''); setDisclosure((n) => n + 1)
  }
  function reset() {
    epoch.current += 1; active.current = false; worker.restart(); defaults(); setSnapshot(null); setUnknown(false); setStep(0); setSelected('amm')
    setMessage('Sesión descartada. Elige un módulo para desplegar otro contrato.')
  }
  async function start() {
    const result = await request('start', { mode: selected })
    if (result) { defaults(); setStep(1); setMessage('Sesión nueva. El contrato usa unidades ficticias con seis decimales.') }
  }
  async function freeze() {
    if (!/^\d{1,4}$/.test(tolerance) || Number(tolerance) > 5000) { setError('Usa una tolerancia entera de 0 a 5000 puntos básicos.'); return }
    try { units(amount) } catch (cause) { setError(cause.message); return }
    const result = await request('freeze', { xToY: direction, amount, toleranceBps: Number(tolerance) })
    if (result) { setPrepared(true); setSubmitted(false); setOutcome(null); setStep(2); setMessage('Cotización y minOut congelados. Bob puede mover las reservas sin modificar tu intención.') }
  }
  async function swap() {
    if (!prepared || submitted) return
    const result = await request('execute')
    if (result?.receipt) {
      setSubmitted(true)
      if (result.receipt.status === 1) setStep(3)
    }
  }
  async function loanTx(name, text, actor = 'alice', nextStep) {
    let value
    try { value = units(text, name === 'setPrice' ? 10_000_000n : undefined) } catch (cause) { setError(cause.message); return }
    const result = await request('transaction', { name, args: [value.toString()], actor })
    if (result?.receipt.status === 1 && nextStep !== undefined) setStep(nextStep)
  }
  const executedOutput = submitted && outcome?.receipt.status === 1 ? outcome.logs?.find((log) => log.decoded?.eventName === 'Swap')?.decoded.args.amountOut ?? null : null
  const comparisonOutput = executedOutput ?? snapshot?.currentQuote?.amountOut
  const metrics = frozen ? quoteMetrics(frozen, comparisonOutput) : null
  const available = [true, Boolean(snapshot), mode === 'loan' ? Boolean(ledger?.debt) : Boolean(frozen), mode === 'loan' ? Boolean(ledger?.debt || step === 3) : Boolean(outcome?.receipt.status === 1 && submitted)]

  return <LabShell chapter="13" title="AMM y préstamos bajo estrés" summary="Ejecuta contratos originales en una EVM local. Observa reservas, deuda y reversiones reales." scope="Unidades internas ficticias de seis decimales, no ERC-20 ni protocolos reales. Sin billetera, RPC, red, secretos ni fondos reales. Claves educativas públicas: nunca uses ni financies estas direcciones. No es asesoría financiera." steps={steps} step={step} onStep={setStep} available={available} onReset={reset} busy={worker.busy} error={error || worker.error} message={message} support={<div key={disclosure}>
    {snapshot && <><Ledger snapshot={snapshot} /><JsonDetails title="Identidad de fuente, artefacto y despliegue" value={snapshot.identity} /><JsonDetails title="Estado EVM y cuentas educativas" value={snapshot.evm} /></>}
    <details className="technical"><summary>Reglas, límites y omisiones</summary><p>Cadena 31337, Shanghai. Firma y ejecución locales, sin consenso ni finalidad. Gas a 12 gwei ficticios; status 0 consume nonce y comisión. Reiniciar descarta todo.</p><p>AMM: reservas iniciales de 1000 X y 1000 Y. Alice, Bob y Carol tienen 1000 unidades de cada activo. Cada intercambio admite de 0.000001 a 1000 unidades. Comisión de 0.3% retenida en reservas; k crece, no permanece exactamente constante. No hay participaciones ni aportes o retiros de liquidez.</p><p>Salida = floor(entrada × 997 × reservaSalida / (reservaEntrada × 1000 + entrada × 997)). La salida y minOut deben ser positivos. Tolerancia de 0 a 5000 puntos básicos. Todos los cálculos usan enteros; la unidad mínima es 0.000001.</p><p>Préstamos: garantía inicial de Alice 100, pool de 1000 stable internas y Bob con 1000 stable internas. LTV máximo 50%, umbral de liquidación 75%, bono 5%, repago máximo por liquidación 50% de la deuda restante. Sin intereses, depositantes, transferencias de tokens ni comisiones financieras.</p><p>Valor de garantía = floor(garantía × precio / 1000000). Salud = floor(valor × 750000 / deuda), con escala 1000000. Salud igual a 1 no permite liquidar. Garantía incautada = floor(repago × 105 × 1000000 / (precio × 100)). El redondeo puede impedir liquidar polvo de deuda. Nunca se permite incautar más garantía que la custodia ni borrar deuda mediante un recorte.</p><p>Precio permitido de 0.01 a 10 stable por garantía, solo Alice lo cambia. Es una fuente centralizada y no confiable, no un oráculo verdadero. Una caída profunda puede dejar deuda incobrable. Este modelo la conserva; no promete resolver insolvencia ni seguridad de producción.</p></details>
    <details className="technical"><summary>Fuente Solidity original del laboratorio</summary><pre className="hex" tabIndex="0"><code>{source}</code></pre></details>
    {outcome && <JsonDetails title="Recibo, eventos y estado anterior" value={{ receipt: outcome.receipt, logs: outcome.logs, before: outcome.before }} />}
  </div>}>
    {step === 0 && <>
      <p>Solo un módulo está activo. Iniciar otro destruye la sesión anterior y sus recibos; nunca comparte sus saldos.</p>
      <Field label="Módulo" id="defi-module"><select id="defi-module" value={selected} disabled={locked} onChange={(event) => { setSelected(event.target.value); clearResult() }}><option value="amm">AMM</option><option value="loan">Préstamos</option></select></Field>
      <button type="button" disabled={locked} onClick={start}>Iniciar sesión nueva de {selected === 'amm' ? 'AMM' : 'Préstamos'}</button>
      {(unknown || worker.fatal) && <p>Estado desconocido. Usa Reiniciar laboratorio para crear otro Worker.</p>}
    </>}
    {mode === 'amm' && step === 1 && <>
      <p>Reservas actuales: {f(ledger.reserveX)} X / {f(ledger.reserveY)} Y. Alice paga desde su saldo interno.</p>
      <div className="fields-grid"><Field label="Dirección" id="defi-direction"><select id="defi-direction" value={direction ? 'xy' : 'yx'} disabled={locked} onChange={(event) => editSwap(setDirection, event.target.value === 'xy')}><option value="xy">X → Y</option><option value="yx">Y → X</option></select></Field>
      <Field label="Entrada de Alice" id="defi-amount" inputMode="decimal" value={amount} disabled={locked} onChange={(event) => editSwap(setAmount, event.target.value)} />
      <Field label="Tolerancia en puntos básicos (100 = 1%)" id="defi-tolerance" inputMode="numeric" value={tolerance} disabled={locked} onChange={(event) => editSwap(setTolerance, event.target.value)} /></div>
      <button type="button" disabled={locked} onClick={freeze}>Consultar contrato y congelar minOut</button>
    </>}
    {mode === 'amm' && step === 2 && frozen && <>
      <div className="step-result"><p>Entrada congelada: {f(frozen.amountIn)} {frozen.xToY ? 'X' : 'Y'}.</p><p>Cotización congelada: <strong>{f(frozen.amountOut)}</strong> {frozen.xToY ? 'Y' : 'X'}.</p><p>minOut explícito: <strong>{f(frozen.minOut)}</strong>. Tolerancia: {frozen.toleranceBps} puntos básicos.</p></div>
      <p>Referencia al spot anterior: {f(frozen.spotOut)}. Impacto de curva sin comisión: {f(metrics.curveImpact)} unidades de salida. Efecto de la comisión: {f(metrics.feeEffect)} adicionales. La diferencia total frente al spot es {f(metrics.totalVersusSpot)}.</p>
      <p>El impacto de curva equivale a {String(metrics.curveImpact * 10000n / frozen.spotOut)} puntos básicos del importe al spot anterior. La comisión pondera la entrada con 997/1000; su efecto expresado en salida no es una comisión adicional cobrada en ese activo.</p>
      <p>{executedOutput !== null ? 'Salida ejecutada' : 'Salida consultada ahora'}: {f(comparisonOutput)}. Deslizamiento frente a la cotización congelada: {f(metrics.slippage)} unidades. Cero significa que no hubo diferencia de salida respecto a la cotización; no elimina el impacto de precio ni la comisión. Un valor negativo indica mejora.</p>
      {comparisonOutput === 0n && <p className="notice">La salida actual redondea a cero y no es ejecutable. El minOut congelado se conserva. Enviar esta intención revierte incluido y consume gas; también puedes editar el importe y volver a cotizar.</p>}
      <div className="actions"><button type="button" disabled={locked || submitted} onClick={() => request('adverse')}>Bob intercambia 100 en la misma dirección</button><button type="button" disabled={locked || submitted} onClick={swap}>Enviar intercambio de Alice con minOut congelado</button></div>
      <p>Bob no actualiza la cotización ni minOut. Tras enviar, vuelve a cotizar explícitamente antes de otro intento.</p>
      <button type="button" disabled={locked} onClick={freeze}>Volver a cotizar y congelar un minOut nuevo</button>
    </>}
    {mode === 'amm' && step === 3 && outcome && <>
      <p className="step-result">Intercambio incluido con status {outcome.receipt.status}. Comisión EVM: {outcome.receipt.feeWei} wei ficticios.</p>
      {executedOutput !== null && <p>Alice recibió <strong>{f(executedOutput)} {frozen?.xToY ? 'Y' : 'X'}</strong>. Deslizamiento frente a la cotización congelada: {f(metrics.slippage)} unidades.</p>}
      <p>Reservas finales: {f(ledger.reserveX)} X / {f(ledger.reserveY)} Y.</p>
      <p>Alice ahora tiene {f(ledger.walletX[0])} X y {f(ledger.walletY[0])} Y. Los eventos registran el importe realmente intercambiado.</p>
      <button type="button" disabled={locked} onClick={() => { setPrepared(false); setSubmitted(false); clearResult(); setStep(1) }}>Preparar otro intercambio</button>
    </>}
    {mode === 'loan' && step === 1 && <>
      <p>Garantía en custodia: {f(ledger.collateral)}. Deuda: {f(ledger.debt)}. Salud: {healthText(ledger.health)}.</p>
      {ledger.collateral === 0n && ledger.debt === 0n ? <><p>Alice dispone de {f(ledger.collateralWallet[0])} unidades de garantía. Primero deposita 100.</p><button type="button" disabled={locked} onClick={() => loanTx('deposit', '100')}>Alice deposita 100 de garantía</button></> : <>
        <Field label="Stable internas que pide Alice" id="defi-borrow" inputMode="decimal" value={borrow} disabled={locked} onChange={(event) => { setBorrow(event.target.value); clearResult() }} />
        <p>Con precio 2 y garantía 100, el máximo es 100. Usa 80 para el recorrido de liquidación; 101 prueba un rechazo real.</p>
        <button type="button" disabled={locked} onClick={() => loanTx('borrow', borrow, 'alice', 2)}>Alice solicita el préstamo</button>
      </>}
    </>}
    {mode === 'loan' && step === 2 && <>
      <div className="step-result"><p>Deuda: {f(ledger.debt)}. Garantía: {f(ledger.collateral)}. Salud: <strong>{healthText(ledger.health)}</strong>.</p><p>Precio vigente: {f(ledger.price)} stable por garantía.</p></div>
      <p>Con depósito 100 y préstamo 80, la salud inicial es 1.875. Cambiar el precio a 1 produce 0.9375. Solo se liquida con salud menor que 1.</p>
      <button type="button" disabled={locked} onClick={() => loanTx('liquidate', '40', 'bob')}>Probar liquidación de Bob por 40 al precio vigente</button>
      <Field label="Precio educativo fijado por Alice" id="defi-price" inputMode="decimal" value={price} disabled={locked} onChange={(event) => { setPrice(event.target.value); clearResult() }} />
      <p>Alice administra esta fuente centralizada y no confiable. No representa un precio de mercado ni un oráculo verdadero.</p>
      <button type="button" disabled={locked} onClick={() => loanTx('setPrice', price, 'alice', 3)}>Alice aplica el precio educativo</button>
    </>}
    {mode === 'loan' && step === 3 && <>
      <div className="step-result"><p>Salud actual: <strong>{healthText(ledger.health)}</strong>. Garantía en custodia: {f(ledger.collateral)}. Deuda: {f(ledger.debt)}.</p><p>Pool: {f(ledger.pool)} stable. Bob dispone de {f(ledger.stableWallet[1])} stable y {f(ledger.collateralWallet[1])} de garantía.</p></div>
      <p>Con depósito 100, deuda 80 y precio 1, Bob paga 40 y recibe 42 de garantía; Alice conserva 58 en custodia y deuda 40. Salud final 1.0875. Una segunda liquidación falla porque la posición ya está sana. Otros importes producen otros resultados.</p>
      <Field label="Acción de recuperación o rechazo" id="defi-loan-action"><select id="defi-loan-action" value={operation} disabled={locked} onChange={(event) => { const next = event.target.value; setOperation(next); setLoanAmount(next === 'setPrice' ? '2' : next === 'withdraw' ? '58' : '40'); clearResult() }}><option value="liquidate">Bob liquida deuda</option><option value="repay">Alice repaga deuda</option><option value="withdraw">Alice retira garantía</option><option value="borrow">Alice solicita más deuda</option><option value="setPrice">Alice corrige el precio educativo</option></select></Field>
      <Field label={operation === 'setPrice' ? 'Nuevo precio educativo' : 'Importe de la acción'} id="defi-loan-amount" inputMode="decimal" value={loanAmount} disabled={locked} onChange={(event) => { setLoanAmount(event.target.value); clearResult() }} />
      <button type="button" disabled={locked} onClick={() => loanTx(operation, loanAmount, operation === 'liquidate' ? 'bob' : 'alice')}>Ejecutar acción en el contrato</button>
      {outcome && <p>Última transacción: status {outcome.receipt.status}; comisión {outcome.receipt.feeWei} wei ficticios. {outcome.receipt.status === 0 ? 'Saldos, deuda y custodia no cambiaron.' : 'Saldos actuales leídos del contrato.'}</p>}
      <p>Para salir tras la liquidación del recorrido, Alice repaga 40 y luego retira 58. También puedes corregir el precio. A precio 0.01, intentar incautar más garantía que la custodia revierte; la deuda residual no desaparece.</p>
    </>}
  </LabShell>
}
