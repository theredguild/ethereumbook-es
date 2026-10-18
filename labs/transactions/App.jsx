import { useEffect, useRef, useState } from 'react'
import { ADDRESSES, DEFAULT_INPUT, INITIAL_BASE_FEE, LIMITS } from './protocol.mjs'

const WEI_PER_ETH = 10n ** 18n
const WEI_PER_GWEI = 10n ** 9n
const REQUEST_TIMEOUT = 45_000
const bookBase = import.meta.env.BASE_URL.replace(/labs\/$/, '')

function units(value, scale = WEI_PER_ETH) {
  const amount = BigInt(value)
  const sign = amount < 0n ? '-' : ''
  const absolute = amount < 0n ? -amount : amount
  const fraction = (absolute % scale).toString().padStart(scale.toString().length - 1, '0').replace(/0+$/, '')
  return `${sign}${absolute / scale}${fraction ? `.${fraction}` : ''}`
}

function difference(after, before) {
  const delta = BigInt(after) - BigInt(before)
  return `${delta > 0n ? '+' : ''}${units(delta)}`
}

function replacementFee(value) {
  const old = BigInt(value)
  const raised = (old * 110n + 99n) / 100n
  return units(raised > old ? raised : old + 1n, WEI_PER_GWEI)
}

function useLabWorker() {
  const workerRef = useRef(null)
  const activeRef = useRef(null)
  const nextId = useRef(0)
  const [snapshot, setSnapshot] = useState(null)
  const [busy, setBusy] = useState('snapshot')
  const [fatal, setFatal] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState('Iniciando el motor local…')

  function stopWorker() {
    workerRef.current?.terminate()
    workerRef.current = null
    const active = activeRef.current
    activeRef.current = null
    if (active) {
      clearTimeout(active.timer)
      active.resolve(null)
    }
  }

  function failWorker(detail) {
    stopWorker()
    setBusy(null)
    setFatal(true)
    setError({ title: 'Motor local no disponible', detail })
    setMessage('No se confirmó el resultado. Reinicia el laboratorio para recuperar un estado conocido.')
  }

  function send(request) {
    if (!workerRef.current || activeRef.current) return Promise.resolve(null)
    const id = ++nextId.current
    setBusy(request.action)
    setError(null)
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        failWorker('El Worker no respondió en 45 segundos. Se detuvo para evitar usar un estado incierto.')
      }, REQUEST_TIMEOUT)
      activeRef.current = { id, action: request.action, resolve, timer }
      try {
        workerRef.current.postMessage({ id, ...request })
      } catch {
        failWorker('No se pudo enviar la solicitud al Worker del navegador.')
      }
    })
  }

  function startWorker() {
    stopWorker()
    setSnapshot(null)
    setFatal(false)
    setError(null)
    setMessage('Iniciando el motor local…')
    setBusy('snapshot')
    try {
      const worker = new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' })
      workerRef.current = worker
      worker.onerror = (event) => {
        if (workerRef.current !== worker) return
        event.preventDefault()
        failWorker('No se pudo cargar o ejecutar el Worker. Comprueba que el navegador permita Workers de módulos y reinicia.')
      }
      worker.onmessageerror = () => {
        if (workerRef.current === worker) failWorker('No se pudo leer una respuesta del Worker.')
      }
      worker.onmessage = ({ data }) => {
        if (workerRef.current !== worker) return
        const active = activeRef.current
        if (!active || !data || data.id !== active.id) return
        if (typeof data.ok !== 'boolean' || (data.ok && !data.result?.snapshot)) {
          failWorker('El Worker devolvió una respuesta incompleta. Reinicia antes de continuar.')
          return
        }
        clearTimeout(active.timer)
        activeRef.current = null
        setBusy(null)
        if (data.ok) {
          setSnapshot(data.result.snapshot)
          setMessage(data.result.message || 'Estado local actualizado.')
          active.resolve(data.result)
        } else if (!data.snapshot) {
          failWorker(data.error || 'No se pudo recuperar el estado local.')
          active.resolve(null)
        } else {
          setSnapshot(data.snapshot)
          setError({ title: 'El motor informó un error', detail: data.error || 'No se completó la solicitud.' })
          setMessage('Se recuperó el estado local. Revisa las cuentas y los recibos antes de continuar.')
          active.resolve(null)
        }
      }
      return send({ action: 'snapshot' })
    } catch {
      failWorker('Este navegador no pudo crear el Worker de módulos. No se ejecutó ninguna transacción.')
    }
  }

  useEffect(() => {
    startWorker()
    return stopWorker
  }, [])

  return { snapshot, busy, fatal, error, message, send, restart: startWorker }
}

function Hex({ children, label = 'Bytes hexadecimales' }) {
  return <pre className="hex" tabIndex="0" aria-label={label}><code>{children}</code></pre>
}

function AccountTable({ accounts, before }) {
  return <div className="table-scroll" tabIndex="0" role="region" aria-label={before ? 'Comparación de cuentas antes y después' : 'Estado actual de las cuentas'}>
    <table>
      <caption>{before ? 'Estado antes y después de esta inclusión' : 'Estado actual, solo en memoria'}</caption>
      <thead><tr><th scope="col">Cuenta</th>{before && <th scope="col">Saldo antes · ETH</th>}<th scope="col">Saldo {before ? 'después' : ''} · ETH</th>{before && <th scope="col">Cambio · ETH</th>}<th scope="col">Nonce {before ? 'antes → después' : ''}</th><th scope="col">Slot 0 {before ? 'antes → después' : ''}</th></tr></thead>
      <tbody>{accounts.map((account) => {
        const previous = before?.find((item) => item.id === account.id)
        return <tr key={account.id}>
          <th scope="row"><span>{account.label}</span><code className="address">{account.address}</code></th>
          {before && <td>{units(previous.balanceWei)}</td>}
          <td>{units(account.balanceWei)}</td>
          {before && <td>{difference(account.balanceWei, previous.balanceWei)}</td>}
          <td>{previous ? `${previous.nonce} → ` : ''}{account.nonce}</td>
          <td>{previous ? `${previous.storageSlotZero} → ` : ''}{account.storageSlotZero}</td>
        </tr>
      })}</tbody>
    </table>
  </div>
}

function Inspector({ signed }) {
  return <div className="inspection">
    <p className="notice">Una firma válida no garantiza admisión ni inclusión. Los bytes firmados son inmutables: editar el formulario descarta el borrador, pero no modifica una transacción ya enviada.</p>
    <dl className="facts">
      <dt>Tipo y cadena</dt><dd>EIP-1559 · 0x02 · chainId {signed.chainId}</dd>
      <dt>Firma válida</dt><dd>{signed.signatureValid ? 'Sí, verificada por el motor' : 'No'}</dd>
      <dt>Remitente recuperado</dt><dd><code>{signed.sender}</code></dd>
      <dt>Destino</dt><dd><code>{signed.to}</code></dd>
      <dt>Nonce</dt><dd>{signed.nonce}</dd>
      <dt>Valor</dt><dd>{units(signed.valueWei)} ETH · {signed.valueWei} wei</dd>
      <dt>Límite de gas</dt><dd>{signed.gasLimit}</dd>
      <dt>Gas intrínseco</dt><dd>{signed.intrinsicGas}</dd>
      <dt>Comisión máxima por gas</dt><dd>{units(signed.maxFeePerGasWei, WEI_PER_GWEI)} gwei · {signed.maxFeePerGasWei} wei</dd>
      <dt>Propina máxima por gas</dt><dd>{units(signed.maxPriorityFeePerGasWei, WEI_PER_GWEI)} gwei · {signed.maxPriorityFeePerGasWei} wei</dd>
      <dt>Saldo mínimo para admisión</dt><dd>{BigInt(signed.valueWei) + BigInt(signed.gasLimit) * BigInt(signed.maxFeePerGasWei)} wei, valor + límite de gas × comisión máxima</dd>
      <dt>Paridad de firma</dt><dd>{signed.signature.yParity}</dd>
      <dt>r</dt><dd><code>{signed.signature.r}</code></dd>
      <dt>s</dt><dd><code>{signed.signature.s}</code></dd>
    </dl>
    <h3>Hash de transacción</h3><Hex label="Hash de la transacción">{signed.hash}</Hex>
    <h3>Calldata decodificada</h3><Hex label="Calldata decodificada">{signed.data}</Hex>
    <h3>Bytes firmados · serialización 0x02</h3><Hex label="Bytes firmados completos">{signed.serialized}</Hex>
  </div>
}

function Receipt({ receipt }) {
  const baseFee = BigInt(receipt.gasUsed) === 0n ? '0' : (BigInt(receipt.burnWei) / BigInt(receipt.gasUsed)).toString()
  return <details className="receipt">
    <summary>Ver recibo completo · bloque {receipt.blockNumber} · nonce {receipt.nonce}</summary>
    <div className="receipt-body">
      <p className={receipt.status === 1 ? 'result-success' : 'result-failure'}>{receipt.status === 1
        ? 'La EVM terminó con éxito. El recibo confirma el resultado de este bloque educativo.'
        : `La EVM falló: ${receipt.exception || 'ejecución revertida'}. Se cobró gas y se consumió el nonce, pero el valor y el almacenamiento se revirtieron.`}</p>
      <Hex label="Hash del recibo">{receipt.hash}</Hex>
      <dl className="facts">
        <dt>Remitente</dt><dd><code>{receipt.from}</code></dd>
        <dt>Destino</dt><dd><code>{receipt.to}</code></dd>
        <dt>Gas usado</dt><dd>{receipt.gasUsed}</dd>
        <dt>Precio efectivo por gas</dt><dd>{receipt.effectiveGasPriceWei} wei · {units(receipt.effectiveGasPriceWei, WEI_PER_GWEI)} gwei</dd>
        <dt>Comisión base de este bloque</dt><dd>{baseFee} wei por gas</dd>
        <dt>Comisión total</dt><dd>{receipt.feeWei} wei · {units(receipt.feeWei)} ETH</dd>
        <dt>Quema</dt><dd>{receipt.burnWei} wei</dd>
        <dt>Propina al beneficiario</dt><dd>{receipt.tipWei} wei</dd>
        <dt>Valor transferido</dt><dd>{receipt.valueTransferredWei} wei · {units(receipt.valueTransferredWei)} ETH</dd>
      </dl>
      <p className="equation">{receipt.gasUsed} gas × {receipt.effectiveGasPriceWei} wei/gas = {receipt.feeWei} wei de comisión.<br />{receipt.burnWei} wei de quema + {receipt.tipWei} wei de propina = {receipt.feeWei} wei.</p>
      <AccountTable accounts={receipt.afterAccounts} before={receipt.beforeAccounts} />
    </div>
  </details>
}

const fields = [
  { name: 'to', label: 'Destino · dirección hexadecimal', hint: 'Dirección de 20 bytes. El ejercicio ya propone una cuenta educativa.', maxLength: 42 },
  { name: 'value', label: 'Valor · ETH ficticios', hint: 'Decimal exacto, con punto y hasta 18 decimales.', mode: 'decimal', maxLength: 80 },
  { name: 'nonce', label: 'Nonce', hint: 'Entero. Debe coincidir con el nonce de la cuenta para incluirse.', mode: 'numeric', maxLength: 30 },
  { name: 'gasLimit', label: 'Límite de gas', hint: `Entero, máximo ${LIMITS.gas}. No es el gas que necesariamente se cobrará.`, mode: 'numeric', maxLength: 20 },
  { name: 'maxFeePerGas', label: 'Comisión máxima por gas · gwei', hint: 'Tope total por unidad de gas, no comisión total.', mode: 'decimal', maxLength: 80 },
  { name: 'maxPriorityFeePerGas', label: 'Propina máxima por gas · gwei', hint: 'Hasta 9 decimales. No puede superar la comisión máxima.', mode: 'decimal', maxLength: 80 },
]

const steps = [
  ['prepare', 'Preparar'],
  ['review', 'Revisar'],
  ['include', 'Incluir'],
  ['result', 'Resultado'],
]

const exercises = {
  transfer: {
    label: 'Enviar 0.1 ETH',
    goal: 'Predice cuánto recibirá el destino y cuánto perderá el emisor al pagar la comisión.',
    queueHint: 'Incluye la transferencia con la comisión base de 10 gwei y compara el resultado con tu predicción.',
    help: 'Desde el reinicio, se usan 21,000 gas a 12 gwei: comisión de 252,000,000,000,000 wei, quema de 210,000,000,000,000 wei y propina de 42,000,000,000,000 wei. El emisor queda con 9.899748 ETH y nonce 1; el destino recibe 0.1 ETH.',
  },
  revert: {
    label: 'Entender REVERT',
    goal: 'Comprueba si una ejecución fallida puede cobrar gas aunque el contrato no reciba el valor.',
    queueHint: 'El contrato escribe en el slot 0 y después ejecuta REVERT. Inclúyelo para observar qué se conserva.',
    help: 'El recibo debe tener estado 0: el nonce aumenta y se cobra gas, pero el valor y el almacenamiento se revierten. Para comparar con un rechazo previo a la ejecución, intenta firmar con límite de gas 20,000 en los ajustes avanzados. No se produce recibo ni se cobra comisión.',
  },
  exhaust: {
    label: 'Agotar el gas',
    goal: 'Compara el límite de gas con el consumo de un contrato que nunca termina.',
    queueHint: 'El contrato escribe en el slot 0 y entra en un bucle. La EVM detendrá la ejecución al agotar el gas.',
    help: 'Con el límite propuesto se consumen 50,000 gas. El nonce aumenta, se cobra la comisión y se revierten el almacenamiento y el valor. No debe confundirse con un rechazo por gas intrínseco insuficiente.',
  },
  future: {
    label: 'Desbloquear un nonce futuro',
    goal: 'Envía un nonce superior al actual y descubre por qué no puede incluirse todavía.',
    queueHint: 'Primero intenta incluir el nonce futuro. Después prepara el nonce actual sin borrar la cola; incluye uno y luego el otro.',
    help: 'Desde el reinicio, nonce 1 debe esperar a nonce 0. Preparar otra transacción no reinicia la EVM ni elimina pendientes. El botón para preparar el nonce actual permite llenar el hueco. Cada intento incluye como máximo una transacción.',
  },
  replacement: {
    label: 'Reemplazar una pendiente',
    goal: 'Cambia los bytes de una pendiente sin ejecutar dos veces el mismo nonce.',
    queueHint: 'Antes de incluir, prepara un reemplazo desde la pendiente. Vuelve a firmarlo y enviarlo; compara los hashes en los detalles.',
    help: 'Para probar un rechazo, vuelve a Preparar, cambia solo el valor y conserva las comisiones: la original debe seguir pendiente. El botón de reemplazo propone los mínimos exactos, 33 y 2.2 gwei para los topes iniciales de 30 y 2. Cambiar el formulario no cambia los bytes ya enviados.',
  },
  fee: {
    label: 'Bloquear por comisión base',
    goal: 'Observa por qué una transacción firmada puede esperar aunque su nonce sea correcto.',
    queueHint: 'Sube la base del próximo intento a 31 gwei. Con tope 30, la transacción debe esperar. Después vuelve a 10 e intenta otra vez.',
    help: 'La comisión base pertenece al bloque, no a los bytes firmados. Bajarla permite incluir la misma transacción sin volver a firmar. Los motivos de la cola describen la base vigente del último intento, no un valor editado que todavía no se aplicó.',
  },
}

function TransactionField({ field, input, onChange }) {
  return <div className="field">
    <label htmlFor={`field-${field.name}`}>{field.label}</label>
    <input id={`field-${field.name}`} name={field.name} type="text" inputMode={field.mode} autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={field.maxLength} required value={input[field.name]} onChange={(event) => onChange({ ...input, [field.name]: event.target.value })} aria-describedby={`hint-${field.name}`} />
    <small id={`hint-${field.name}`}>{field.hint}</small>
  </div>
}

export default function App() {
  const { snapshot, busy, fatal, error, message, send, restart } = useLabWorker()
  const [input, setInput] = useState({ ...DEFAULT_INPUT })
  const [baseFee, setBaseFee] = useState(INITIAL_BASE_FEE)
  const [signed, setSigned] = useState(null)
  const [step, setStep] = useState('prepare')
  const [exerciseId, setExerciseId] = useState('transfer')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [receiptHash, setReceiptHash] = useState(null)
  const [disclosureEpoch, setDisclosureEpoch] = useState(0)
  const revision = useRef(0)
  const headingRef = useRef(null)
  const errorRef = useRef(null)
  const previousStep = useRef(step)
  const locked = Boolean(busy) || fatal || !snapshot
  const sender = snapshot?.accounts.find((account) => account.id === 'sender')
  const pending = snapshot?.pending || []
  const receipts = snapshot?.receipts || []
  const receipt = receipts.find((item) => item.hash === receiptHash)
  const queuedDraft = signed && pending.some((tx) => tx.hash === signed.hash)
  const includedDraft = signed && receipts.find((item) => item.hash === signed.hash)
  const exercise = exercises[exerciseId]
  const available = { prepare: true, review: Boolean(signed), include: pending.length > 0, result: receipts.length > 0 }

  useEffect(() => {
    if (previousStep.current === step) return
    previousStep.current = step
    headingRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  function editInput(next) {
    revision.current += 1
    setSigned(null)
    setInput(next)
  }

  function loadExercise(kind) {
    const next = { ...DEFAULT_INPUT, nonce: sender?.nonce || '0' }
    if (kind === 'revert') Object.assign(next, { to: ADDRESSES.reverter, gasLimit: '100000' })
    if (kind === 'exhaust') Object.assign(next, { to: ADDRESSES.exhaustor, gasLimit: '50000' })
    if (kind === 'future') next.nonce = (BigInt(next.nonce) + 1n).toString()
    setExerciseId(kind)
    editInput(next)
    setAdvancedOpen(false)
    setStep('prepare')
  }

  function prepareReplacement(transaction) {
    editInput({
      to: transaction.to,
      value: units(transaction.valueWei),
      nonce: transaction.nonce,
      gasLimit: transaction.gasLimit,
      data: transaction.data,
      maxFeePerGas: replacementFee(transaction.maxFeePerGasWei),
      maxPriorityFeePerGas: replacementFee(transaction.maxPriorityFeePerGasWei),
    })
    setExerciseId('replacement')
    setAdvancedOpen(true)
    setStep('prepare')
  }

  async function sign(event) {
    event.preventDefault()
    const version = revision.current
    setSigned(null)
    const result = await send({ action: 'sign', input: { ...input } })
    if (result?.signed && revision.current === version) {
      setSigned(result.signed)
      setStep('review')
    } else {
      setAdvancedOpen(true)
    }
  }

  async function enqueue() {
    const result = await send({ action: 'submit', serialized: signed.serialized })
    if (result) setStep('include')
  }

  async function include() {
    const beforeBlock = snapshot.blockNumber
    const result = await send({ action: 'mine', baseFeeGwei: baseFee })
    if (!result || result.snapshot.blockNumber === beforeBlock) return
    const included = result.snapshot.receipts.find((item) => item.blockNumber === result.snapshot.blockNumber)
    if (included) {
      setReceiptHash(included.hash)
      setStep('result')
    }
  }

  async function reset() {
    const result = fatal ? await restart() : await send({ action: 'reset' })
    if (!result) return
    revision.current += 1
    setSigned(null)
    setInput({ ...DEFAULT_INPUT })
    setBaseFee(INITIAL_BASE_FEE)
    setExerciseId('transfer')
    setAdvancedOpen(false)
    setReceiptHash(null)
    setDisclosureEpoch((value) => value + 1)
    setStep('prepare')
  }

  return <>
    <a className="skip-link" href="#paso-actual">Saltar al paso actual</a>
    <header className="site-header">
      <a href={`${bookBase}chapter_6`}>← Volver al capítulo 6</a>
      <span>Mastering Ethereum · The Red Guild</span>
    </header>
    <main>
      <div className="intro">
        <p className="eyebrow">Laboratorio del capítulo 6</p>
        <h1>Una transacción, paso a paso</h1>
        <p>Prepara, firma e incluye una transacción en una EVM local.</p>
      </div>
      <aside className="safety" role="note"><strong>Solo ETH ficticios y una clave privada conocida públicamente.</strong> Nunca envíes fondos reales a estas direcciones ni importes esta clave en una billetera. No ingreses claves propias.</aside>

      <nav className="step-navigation" aria-label="Pasos del laboratorio">
        <ol>{steps.map(([id, label], index) => <li key={id}>
          <button type="button" aria-label={`Paso ${index + 1}: ${label}`} aria-current={step === id ? 'step' : undefined} disabled={locked || !available[id]} onClick={() => {
            if (id === 'result' && receiptHash === null) setReceiptHash(receipts[0].hash)
            setStep(id)
          }}><span className="step-number">{index + 1}</span><span>{label}</span></button>
        </li>)}</ol>
      </nav>

      <div className="status-panel" aria-label="Estado del laboratorio" aria-busy={Boolean(busy)}>
        <p role="status" aria-live="polite" aria-atomic="true">{busy ? ({ snapshot: 'Iniciando motor local…', sign: 'Firmando…', submit: 'Validando la cola…', mine: 'Ejecutando…', reset: 'Reiniciando…' }[busy] || 'Procesando…') : message}</p>
        <button type="button" className="text-button" disabled={Boolean(busy)} onClick={reset}>{fatal ? 'Reiniciar motor y laboratorio' : 'Reiniciar laboratorio'}</button>
      </div>
      {error && <div className="error" role="alert" tabIndex="-1" ref={errorRef}><strong>{error.title}</strong><p>{error.detail}</p>{!fatal && <p>Revisa los campos o el estado recuperado antes de continuar.</p>}</div>}

      <section className="panel" id="paso-actual" tabIndex="-1" aria-labelledby="step-title" data-step={step}>
        <h2 id="step-title" tabIndex="-1" ref={headingRef}>{steps.find(([id]) => id === step)[1]}</h2>
        {fatal ? <p>El estado actual no se pudo confirmar. Reinicia el motor para volver a un estado conocido; no se muestran resultados anteriores como si fueran actuales.</p> : <>
          {step === 'prepare' && <>
            <div className="field exercise-picker"><label htmlFor="exercise">¿Qué quieres probar?</label><select id="exercise" value={exerciseId} disabled={locked} onChange={(event) => loadExercise(event.target.value)}>{Object.entries(exercises).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select></div>
            <p className="guidance">{exercise.goal}</p>
            {sender && <p className="account-summary">Emisor: <strong>{units(sender.balanceWei)} ETH</strong> · nonce actual {sender.nonce}</p>}
            {pending.some((tx) => tx.nonce === input.nonce) && <p className="pending-reason">Ya hay una pendiente con nonce {input.nonce}. Enviar otra con ese nonce intentará reemplazarla; no creará una segunda inclusión.</p>}
            <form onSubmit={sign} noValidate>
              <fieldset disabled={locked}><legend className="sr-only">Campos de la transacción</legend>
                {fields.slice(0, 2).map((field) => <TransactionField key={field.name} field={field} input={input} onChange={editInput} />)}
                <details className="advanced-fields" open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}>
                  <summary>Ajustes avanzados <span className="small">· nonce {input.nonce} · límite {input.gasLimit} gas</span></summary>
                  <div className="fields-grid">{fields.slice(2).map((field) => <TransactionField key={field.name} field={field} input={input} onChange={editInput} />)}</div>
                  <div className="field"><label htmlFor="field-data">Calldata · hexadecimal</label><textarea id="field-data" name="data" rows="2" autoComplete="off" autoCapitalize="off" spellCheck={false} required maxLength={2 + LIMITS.dataBytes * 2} value={input.data} onChange={(event) => editInput({ ...input, data: event.target.value })} aria-describedby="hint-data" /><small id="hint-data">Prefijo 0x y bytes completos. Máximo {LIMITS.dataBytes} bytes; usa 0x para una transferencia simple.</small></div>
                </details>
                <p className="small">Firmar no cambia saldos ni nonce y todavía no envía nada.</p>
                <button type="submit">Firmar y continuar</button>
              </fieldset>
            </form>
          </>}

          {step === 'review' && signed && <>
            <p className="guidance">La firma está lista. Confirma el destino y el valor antes de enviar estos bytes a la cola.</p>
            <dl className="facts compact-facts">
              <dt>Valor</dt><dd>{units(signed.valueWei)} ETH ficticios</dd>
              <dt>Destino</dt><dd><code>{signed.to}</code></dd>
              <dt>Nonce · límite de gas</dt><dd>{signed.nonce} · {signed.gasLimit} gas</dd>
              <dt>Firma</dt><dd>{signed.signatureValid ? 'Válida, remitente verificado' : 'No válida'}</dd>
            </dl>
            <details className="technical"><summary>Ver bytes, firma y campos completos</summary><Inspector signed={signed} /></details>
            <p className="small">Enviar a la cola no ejecuta la EVM. Editar después invalida este borrador, no una pendiente ya enviada.</p>
            <div className="actions"><button type="button" className="secondary" disabled={locked} onClick={() => setStep('prepare')}>Volver a editar</button>
              {includedDraft ? <button type="button" disabled={locked} onClick={() => { setReceiptHash(includedDraft.hash); setStep('result') }}>Ver recibo de estos bytes</button>
                : queuedDraft ? <button type="button" disabled={locked} onClick={() => setStep('include')}>Ver estos bytes en la cola</button>
                  : <button type="button" disabled={locked} onClick={enqueue}>Enviar a la cola y continuar</button>}
            </div>
          </>}

          {step === 'include' && <>
            <p className="guidance">{exercise.queueHint}</p>
            <p className="small">Cola evaluada con base vigente de {snapshot ? units(snapshot.baseFeeWei, WEI_PER_GWEI) : '0'} gwei. Cambiar el próximo intento no modifica los bytes firmados ni actualiza estos motivos hasta intentarlo.</p>
            <ul className="pending-list">{pending.map((tx) => <li key={tx.hash}>
              <div className="pending-heading"><h3>Nonce {tx.nonce} · {units(tx.valueWei)} ETH</h3><button type="button" className="text-button" disabled={locked} onClick={() => prepareReplacement(tx)}>Preparar reemplazo</button></div>
              <p className="pending-reason">{tx.reason}</p>
              <details><summary>Ver transacción pendiente</summary><Inspector signed={tx} /></details>
            </li>)}</ul>
            {sender && !pending.some((tx) => tx.nonce === sender.nonce) && <button type="button" className="secondary" disabled={locked} onClick={() => loadExercise('transfer')}>Preparar el nonce actual {sender.nonce}</button>}
            <div className="field"><label htmlFor="base-fee">Comisión base del próximo intento · gwei</label><input id="base-fee" type="text" inputMode="decimal" autoComplete="off" maxLength="80" value={baseFee} disabled={locked} onChange={(event) => setBaseFee(event.target.value)} /><small>Solo se incluye el nonce actual y como máximo una transacción por bloque educativo.</small></div>
            <button type="button" disabled={locked || pending.length === 0} onClick={include}>Intentar incluir una transacción</button>
            <details><summary>Cómo funciona el reemplazo</summary><p>Ambos topes deben alcanzar <code>max(anterior + 1 wei, ceil(anterior × 110 / 100))</code>. El botón propone esos mínimos, pero todavía debes firmar y enviar. No garantiza inclusión si falta saldo o la base es mayor que el tope. Es política local del laboratorio, no regla universal de Ethereum.</p></details>
          </>}

          {step === 'result' && <>
            {receipts.length > 1 && <div className="field"><label htmlFor="receipt-history">Recibo a consultar</label><select id="receipt-history" value={receipt ? receiptHash : ''} disabled={locked} onChange={(event) => setReceiptHash(event.target.value)}><option value="" disabled>Seleccionar recibo</option>{receipts.map((item) => <option key={item.hash} value={item.hash}>Bloque {item.blockNumber} · nonce {item.nonce} · {item.status === 1 ? 'éxito' : 'fallo'}</option>)}</select></div>}
            {receipt ? <>
              <p className="eyebrow">Bloque educativo {receipt.blockNumber} · nonce {receipt.nonce}</p>
              <p className={receipt.status === 1 ? 'result-success' : 'result-failure'}>{receipt.status === 1 ? 'Transacción incluida con éxito.' : `Incluida con fallo: ${receipt.exception}. Se cobró gas y se consumió el nonce; el valor y el almacenamiento se revirtieron.`}</p>
              <dl className="result-metrics"><div><dt>Valor transferido</dt><dd>{units(receipt.valueTransferredWei)} ETH</dd></div><div><dt>Gas usado</dt><dd>{receipt.gasUsed}</dd></div><div><dt>Comisión pagada</dt><dd>{units(receipt.feeWei)} ETH</dd></div></dl>
              <p className="small">Este resultado pertenece al recibo indicado, no a un borrador nuevo. No tiene finalidad de una red real.</p>
              <Receipt key={receipt.hash} receipt={receipt} />
            </> : <p>El recibo seleccionado ya no está disponible. El historial conserva hasta {LIMITS.receipts} recibos; elige uno disponible para consultarlo.</p>}
            <div className="actions">{pending.length > 0 && <button type="button" className="secondary" disabled={locked} onClick={() => setStep('include')}>Volver a pendientes ({pending.length})</button>}<button type="button" disabled={locked} onClick={() => loadExercise(exerciseId)}>Preparar otra transacción</button></div>
            <p className="small">Preparar otra conserva cuentas, pendientes y recibos. Solo reiniciar o recargar descarta el estado.</p>
          </>}
        </>}
      </section>

      <div className="support" key={disclosureEpoch}>
        <details><summary>Ayuda del ejercicio elegido</summary><p>{exercise.help}</p></details>
        <details><summary>Ver cuentas actuales y almacenamiento</summary><p className="small">Estado actual de las cinco cuentas educativas, no el estado histórico de un recibo. Los destinos personalizados aparecen en las comparaciones de cada recibo.</p>{snapshot && !fatal ? <AccountTable accounts={snapshot.accounts} /> : <p>El estado actual no está disponible.</p>}</details>
        <details><summary>Comisiones, límites y funcionamiento local</summary><p>Cadena 31337, reglas Shanghai, tipo 0x02 sin listas de acceso. Firma y ejecución reales con EthereumJS dentro de un Worker. Sin billetera, RPC, base de datos ni conexión a Ethereum; una vez iniciado, funciona sin red. La cola y los bloques son modelos sin consenso ni finalidad.</p><div className="fee-guide"><p><code>precio efectivo = min(comisión máxima, comisión base + propina máxima)</code><br /><code>comisión = gas usado × precio efectivo</code><br /><code>quema = gas usado × comisión base</code><br /><code>propina = comisión − quema</code></p></div><p>El límite no equivale al consumo. 1 ETH = 10¹⁸ wei y 1 gwei = 10⁹ wei, sin redondeo decimal. Máximos: {LIMITS.gas} gas, {LIMITS.dataBytes} bytes, {LIMITS.pending} pendientes y {LIMITS.receipts} recibos. Reiniciar restaura 10 ETH y borra todo; recargar también descarta el estado.</p></details>
      </div>
      <footer>Material complementario original de The Red Guild. No sustituye el capítulo del libro.</footer>
    </main>
  </>
}
