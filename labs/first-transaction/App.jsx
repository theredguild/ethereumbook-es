import { useCallback, useEffect, useState } from 'react'
import { Field, JsonDetails, LabShell } from '../shared/LabShell.jsx'
import { useWorker } from '../shared/useWorker.jsx'
import { ADDRESSES, DEFAULT_INPUT, INITIAL_BASE_FEE } from '../transactions/protocol.mjs'
import { currentReceipt, evaluateFinality, isHealthySnapshot } from './model.mjs'

const transactionWorker = () => new Worker(new URL('../transactions/worker.mjs', import.meta.url), { type: 'module' })
const steps = ['Preparar y firmar', 'Enviar', 'Incluir', 'Observar', 'Simular finalidad']
const advancedFields = [
  ['gasLimit', 'Límite de gas', 'numeric'],
  ['maxFeePerGas', 'Comisión máxima · gwei', 'decimal'],
  ['maxPriorityFeePerGas', 'Propina máxima · gwei', 'decimal'],
]

function eth(value) {
  const amount = BigInt(value)
  const whole = amount / 10n ** 18n
  const fraction = (amount % 10n ** 18n).toString().padStart(18, '0').replace(/0+$/, '')
  return `${whole}${fraction ? `.${fraction}` : ''}`
}

export default function App() {
  const { ready, busy, fatal, error, failure, run, restart, clearError } = useWorker(transactionWorker)
  const [snapshot, setSnapshot] = useState(null)
  const [unknown, setUnknown] = useState(false)
  const [localError, setLocalError] = useState('')
  const [message, setMessage] = useState('Iniciando la EVM local…')
  const [input, setInput] = useState({ ...DEFAULT_INPUT })
  const [signed, setSigned] = useState(null)
  const [queued, setQueued] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [step, setStep] = useState(0)
  const [baseFee, setBaseFee] = useState(INITIAL_BASE_FEE)
  const [votesE1, setVotesE1] = useState(0)
  const [votesE2, setVotesE2] = useState(0)
  const [secondSource, setSecondSource] = useState('E1')
  const [disclosureKey, setDisclosureKey] = useState(0)
  const sender = snapshot?.accounts.find((account) => account.id === 'sender')
  const locked = busy || fatal || unknown || !ready || !snapshot
  const immutable = queued || Boolean(receipt)
  const pending = signed && snapshot?.pending.find((item) => item.hash === signed.hash)
  const finality = receipt ? evaluateFinality({ receipt, votesE1, votesE2, secondSource }) : null

  const request = useCallback(async (action, fields = {}) => {
    setLocalError('')
    const result = await run(action, fields)
    if (!result) {
      setUnknown(true)
      return null
    }
    if (!isHealthySnapshot(result.snapshot)) {
      setUnknown(true)
      setLocalError('La respuesta no permite confirmar el estado de la EVM. Reinicia el Worker antes de continuar.')
      return null
    }
    setSnapshot(result.snapshot)
    setUnknown(false)
    setMessage(result.message || 'Estado local confirmado.')
    return result
  }, [run])

  useEffect(() => {
    if (ready && !snapshot && !unknown) void request('snapshot')
  }, [ready, snapshot, unknown, request])

  useEffect(() => {
    if (!failure) return
    if (!failure.fatal && isHealthySnapshot(failure.snapshot)) {
      setSnapshot(failure.snapshot)
      setUnknown(false)
      setMessage('Estado recuperado. La acción rechazada no cobra gas ni consume nonce; corrige los campos o vuelve a intentar.')
    } else {
      setUnknown(true)
      setMessage('Estado desconocido. Solo un reinicio explícito del Worker permite continuar.')
    }
  }, [failure])

  function invalidResponse() {
    setUnknown(true)
    setLocalError('La respuesta no corresponde a esta transacción. Reinicia el Worker antes de continuar.')
  }

  function clearCurrent(nextSnapshot, resetInputs) {
    setSigned(null)
    setQueued(false)
    setReceipt(null)
    setVotesE1(0)
    setVotesE2(0)
    setSecondSource('E1')
    setStep(0)
    setInput({ ...(resetInputs ? DEFAULT_INPUT : input), nonce: nextSnapshot.accounts.find((account) => account.id === 'sender').nonce })
    setBaseFee(INITIAL_BASE_FEE)
    setDisclosureKey((key) => key + 1)
    setLocalError('')
    clearError()
  }

  function edit(name, value) {
    if (locked || immutable) return
    setInput((previous) => ({ ...previous, [name]: value }))
    setSigned(null)
    setReceipt(null)
    setVotesE1(0)
    setVotesE2(0)
    setSecondSource('E1')
    setStep(0)
    setLocalError('')
    clearError()
    setMessage('Borrador cambiado. Vuelve a firmar; la EVM no cambió.')
  }

  async function sign(event) {
    event.preventDefault()
    if (locked || immutable) return
    const result = await request('sign', { input: { ...input, nonce: sender.nonce, to: ADDRESSES.recipient, data: '0x' } })
    if (!result) return
    const next = result.signed
    if (!next || !/^0x[\da-f]{64}$/i.test(next.hash) || !/^0x02(?:[\da-f]{2})+$/i.test(next.serialized) || !next.signatureValid || next.nonce !== sender.nonce || next.to !== ADDRESSES.recipient || next.sender !== ADDRESSES.sender || next.chainId !== '31337' || !/^\d+$/.test(next.valueWei)) {
      invalidResponse()
      return
    }
    setSigned(structuredClone(next))
    setStep(1)
  }

  async function enqueue() {
    if (locked || !signed || immutable) return
    const result = await request('submit', { serialized: signed.serialized })
    if (!result) return
    if (result.signed?.hash !== signed.hash || !result.snapshot.pending.some((item) => item.hash === signed.hash && item.serialized === signed.serialized)) {
      invalidResponse()
      return
    }
    setQueued(true)
    setStep(2)
  }

  async function include() {
    if (locked || !signed || !queued || receipt || !pending) return
    const beforeBlock = snapshot.blockNumber
    const result = await request('mine', { baseFeeGwei: baseFee })
    if (!result) return
    const included = currentReceipt(signed, beforeBlock, result.snapshot)
    if (!included) {
      if (result.snapshot.blockNumber !== beforeBlock) invalidResponse()
      return
    }
    setReceipt(included)
    setVotesE1(0)
    setVotesE2(0)
    setSecondSource('E1')
    setStep(3)
  }

  async function reset() {
    if (busy) return
    if (fatal || unknown || !ready || !snapshot) {
      setLocalError('El estado no está confirmado. Usa «Reiniciar Worker y laboratorio».')
      return
    }
    const result = await request('reset')
    if (result) {
      const account = result.snapshot.accounts.find((item) => item.id === 'sender')
      if (result.snapshot.blockNumber !== '0' || result.snapshot.pending.length || result.snapshot.receipts.length || account.nonce !== '0' || account.balanceWei !== '10000000000000000000') {
        invalidResponse()
        return
      }
      clearCurrent(result.snapshot, true)
    }
  }

  async function restartWorker() {
    if (busy) return
    setUnknown(true)
    if (!restart()) return
    const result = await request('snapshot')
    if (result) clearCurrent(result.snapshot, true)
  }

  return <LabShell chapter={2} title="Primera transacción sin riesgo"
    summary="Firma una transferencia, envía sus bytes y observa su inclusión antes de explorar un modelo de finalidad."
    scope={<><strong>Solo ETH ficticios y una clave educativa pública.</strong> Nunca envíes fondos reales a estas direcciones ni importes esta clave en una billetera. No ingreses secretos. EVM Shanghai local, cadena 31337, sin billetera, RPC ni red. La finalidad posterior es sintética, no consenso real de Ethereum.</>}
    steps={steps} step={step} onStep={setStep} available={[!locked, !locked && Boolean(signed), !locked && queued, !locked && Boolean(receipt), !locked && Boolean(receipt)]}
    busy={busy} error={localError || error} message={message} onReset={reset}
    support={(unknown || fatal) && <aside className="notice"><p>No se puede confirmar el estado. Los resultados anteriores no habilitan acciones.</p><button type="button" disabled={busy} onClick={restartWorker}>Reiniciar Worker y laboratorio</button></aside>}>
    {unknown || fatal ? <p>Acciones bloqueadas hasta reiniciar el Worker. El reinicio descarta la cadena local.</p> : <>
      {step === 0 && <>
        <p>El destinatario educativo es fijo. El emisor comienza con 10 ETH ficticios.</p>
        {sender && <p>Saldo actual del emisor: <strong>{eth(sender.balanceWei)} ETH</strong>. Nonce actual: {sender.nonce}.</p>}
        {immutable && <p className="notice">Estos bytes ya se enviaron. No se pueden editar. Continúa con su inclusión o consulta su recibo.</p>}
        <form onSubmit={sign} noValidate>
          <fieldset disabled={locked || immutable}>
            <legend>Preparar transferencia</legend>
            <Field id="first-amount" label="Cantidad · ETH ficticios" type="text" inputMode="decimal" autoComplete="off" maxLength={100} value={input.value} onChange={(event) => edit('value', event.target.value)} />
            <details key={`prepare-${disclosureKey}`}>
              <summary>Ajustes avanzados y direcciones educativas</summary>
              <p className="hex">Emisor: {ADDRESSES.sender}<br />Destinatario fijo: {ADDRESSES.recipient}</p>
              <p>El nonce usa siempre el valor actual del emisor. Sin datos adicionales.</p>
              <div className="fields-grid">{advancedFields.map(([name, label, mode]) => <Field key={name} id={`first-${name}`} label={label} type="text" inputMode={mode} autoComplete="off" maxLength={100} value={input[name]} onChange={(event) => edit(name, event.target.value)} />)}</div>
            </details>
            <p>Firmar no mueve saldo, no consume nonce y no envía la transacción.</p>
            <button type="submit">Firmar transferencia</button>
          </fieldset>
        </form>
      </>}
      {step === 1 && signed && <>
        <p className="step-result">Firma válida. Transferencia de {eth(signed.valueWei)} ETH ficticios al destinatario fijo, nonce {signed.nonce}.</p>
        <p>La firma fija estos bytes. El saldo y el nonce siguen iguales. Enviar a la cola todavía no ejecuta la transferencia.</p>
        <JsonDetails key={`signed-${disclosureKey}`} title="Ver bytes firmados y campos" value={signed} />
        <div className="actions">{!immutable && <><button type="button" disabled={locked} onClick={enqueue}>Enviar bytes a la cola</button><button type="button" className="secondary" disabled={locked} onClick={() => setStep(0)}>Volver a editar</button></>}
          {queued && <button type="button" disabled={locked} onClick={() => setStep(receipt ? 3 : 2)}>{receipt ? 'Ver recibo actual' : 'Continuar con la inclusión'}</button>}
        </div>
      </>}
      {step === 2 && signed && queued && <>
        {receipt ? <><p>Estos bytes ya se incluyeron en el bloque {receipt.blockNumber}. No se ejecutarán otra vez.</p><button type="button" disabled={locked} onClick={() => setStep(3)}>Ver recibo actual</button></> : <>
          <p className="step-result">Bytes admitidos en la cola local. Aún no hay inclusión ni cambio de saldo.</p>
          <p>{pending?.reason}</p>
          <p>Incluir ejecuta la EVM y crea un bloque educativo. No produce finalidad.</p>
          <details key={`include-${disclosureKey}`}><summary>Comisión base del próximo bloque educativo</summary><Field id="first-base-fee" label="Comisión base · gwei" type="text" inputMode="decimal" autoComplete="off" maxLength={100} disabled={locked} value={baseFee} onChange={(event) => { setBaseFee(event.target.value); setLocalError(''); clearError() }} /><p>Modificar esta base no cambia los bytes firmados. Si supera su comisión máxima, la transacción sigue pendiente sin cobro.</p></details>
          <button type="button" disabled={locked || !pending} onClick={include}>Incluir en un bloque educativo</button>
        </>}
      </>}
      {step === 3 && receipt && <>
        <p className="step-result">{receipt.status === 1 ? 'Transferencia incluida con éxito.' : 'Transacción incluida con fallo.'} Bloque educativo {receipt.blockNumber}, nonce consumido {receipt.nonce}.</p>
        <ul className="balance-list">
          <li>Gas usado: <strong>{receipt.gasUsed}</strong>.</li>
          <li>Comisión pagada: <strong>{eth(receipt.feeWei)} ETH</strong>.</li>
          <li>Valor transferido: {eth(receipt.valueTransferredWei)} ETH ficticios.</li>
          <li>Saldo del emisor tras inclusión: {eth(receipt.afterAccounts.find((account) => account.id === 'sender').balanceWei)} ETH.</li>
          <li>Nonce actual del emisor: {receipt.afterAccounts.find((account) => account.id === 'sender').nonce}.</li>
        </ul>
        <p>La inclusión consume nonce y comisión. Un rechazo previo no los consume. Este recibo corresponde a los bytes firmados actuales, no al historial.</p>
        <p><strong>Incluida no significa finalizada.</strong> La EVM local no ejecuta consenso.</p>
        <JsonDetails key={`receipt-${disclosureKey}`} title="Ver recibo y saldos antes y después" value={receipt} />
        <div className="actions"><button type="button" disabled={locked} onClick={() => setStep(4)}>Explorar finalidad sintética</button><button type="button" className="secondary" disabled={locked} onClick={() => { clearCurrent(snapshot, true); setMessage('Nueva transferencia. Se conserva la cadena local y se usa el nonce actual; el historial no completa pasos.') }}>Nueva transferencia</button></div>
      </>}
      {step === 4 && receipt && finality && <>
        <p className="notice"><strong>Modelo sintético, no consenso real.</strong> Épocas E0, E1 y E2 y puntos de control sintéticos. E0 se supone justificado. E1 contiene el bloque incluido {receipt.blockNumber}; E2 es su descendiente inmediato. Cada combinación de votos es un escenario alternativo desde E0: no deshace la finalidad de una misma historia. Cambiar votos no altera la EVM, sus bloques, saldos ni recibos.</p>
        <p>Cuatro validadores tienen igual peso. El denominador siempre es 4, aunque falten votos o validadores disponibles. No desaparece stake. Al menos dos tercios requieren 3 de 4 votos.</p>
        <div className="fields-grid">{[['first-votes-e1', 'Votos E0 → E1', votesE1, setVotesE1], ['first-votes-e2', 'Votos del segundo enlace hacia E2', votesE2, setVotesE2]].map(([id, label, value, update]) => <Field key={id} id={id} label={label}><select id={id} disabled={locked} value={value} onChange={(event) => update(Number(event.target.value))}>{[0, 1, 2, 3, 4].map((count) => <option key={count} value={count}>{count} de 4</option>)}</select></Field>)}</div>
        <Field id="first-vote-source" label="Origen de los votos hacia E2"><select id="first-vote-source" disabled={locked} value={secondSource} onChange={(event) => setSecondSource(event.target.value)}><option value="E1">E1, origen requerido</option><option value="E0">E0, origen incorrecto para este caso</option></select></Field>
        <div className="step-result" role="status" aria-live="polite">
          <p>Punto de control E1: <strong>{finality.first.justified ? 'justificado' : 'no justificado'}</strong>; <strong>{finality.first.finalized ? 'finalizado en este modelo' : 'no finalizado'}</strong>.</p>
          <p>Punto de control E2: <strong>{finality.second.justified ? 'justificado' : 'no justificado'}</strong>; no finalizado.</p>
        </div>
        <p>E1 se justifica con al menos 3 votos E0 → E1. En este caso acotado, E2 se justifica y E1 se finaliza solo con E1 ya justificado y al menos 3 votos E1 → E2. Votos desde E0 hacia E2 no cumplen ese enlace. Justificar E1 por sí solo no lo finaliza.</p>
        <button type="button" className="secondary" disabled={locked} onClick={() => { clearCurrent(snapshot, true); setMessage('Nueva transferencia con el nonce actual. Votos sintéticos descartados; EVM conservada.') }}>Nueva transferencia</button>
      </>}
    </>}
  </LabShell>
}
