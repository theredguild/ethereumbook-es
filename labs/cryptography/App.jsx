import { useEffect, useRef, useState } from 'react'
import { Field, JsonDetails, LabShell } from '../shared/LabShell.jsx'
import { useWorker } from '../shared/useWorker.jsx'

const makeWorker = () => new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' })
const STEPS = ['Comparar hashes', 'Firmar bytes congelados', 'Verificar y alterar']
const INITIAL_TEXT = 'Hola, Ethereum'

export default function App() {
  const worker = useWorker(makeWorker)
  const revision = useRef(0)
  const verificationRevision = useRef(0)
  const [step, setStep] = useState(0)
  const [encoding, setEncoding] = useState('utf8')
  const [value, setValue] = useState(INITIAL_TEXT)
  const [hashes, setHashes] = useState(null)
  const [signed, setSigned] = useState(null)
  const [draft, setDraft] = useState(null)
  const [verification, setVerification] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('Compara los mismos bytes con dos funciones hash.')
  const [disclosure, setDisclosure] = useState(0)
  const locked = worker.busy || !worker.ready || worker.fatal

  useEffect(() => {
    if (!worker.fatal) return
    revision.current += 1
    verificationRevision.current += 1
    setHashes(null)
    setSigned(null)
    setDraft(null)
    setVerification(null)
    setStep(0)
    setDisclosure((current) => current + 1)
  }, [worker.fatal])

  function editSource(nextEncoding, nextValue) {
    revision.current += 1
    verificationRevision.current += 1
    setEncoding(nextEncoding)
    setValue(nextValue)
    setHashes(null)
    setSigned(null)
    setDraft(null)
    setVerification(null)
    setStep(0)
    setError('')
    worker.clearError()
    setDisclosure((current) => current + 1)
    setMessage('Entrada editada. Compara otra vez antes de firmar.')
  }

  function reset() {
    revision.current += 1
    verificationRevision.current += 1
    setStep(0)
    setEncoding('utf8')
    setValue(INITIAL_TEXT)
    setHashes(null)
    setSigned(null)
    setDraft(null)
    setVerification(null)
    setError('')
    setMessage('Recorrido reiniciado. Compara los mismos bytes con dos funciones hash.')
    setDisclosure((current) => current + 1)
    worker.restart()
  }

  function editVerification(fields) {
    verificationRevision.current += 1
    setDraft((current) => ({ ...current, ...fields }))
    setVerification(null)
    setError('')
    worker.clearError()
    setDisclosure((current) => current + 1)
    setMessage('La firma original se conserva. Ejecuta una nueva verificación para estos datos.')
  }

  async function compare() {
    const current = revision.current
    setError('')
    const result = await worker.run('compare', { encoding, value })
    if (!result || current !== revision.current) return
    if (result.encoding !== encoding || result.value !== value || typeof result.keccak256 !== 'string' || typeof result.sha3_256 !== 'string') {
      setError('La comparación no corresponde a la entrada actual. Reinicia el laboratorio.')
      return
    }
    setHashes(result)
    setSigned(null)
    setDraft(null)
    setVerification(null)
    verificationRevision.current += 1
    setDisclosure((previous) => previous + 1)
    setStep(1)
    setMessage('Hashes calculados sobre los mismos bytes. Todavía no hay firma.')
  }

  async function sign() {
    if (!hashes) return
    const current = revision.current
    setError('')
    const result = await worker.run('sign', { messageHex: hashes.messageHex, digest: hashes.keccak256 })
    if (!result || current !== revision.current) return
    if (result.messageHex !== hashes.messageHex || result.digest !== hashes.keccak256 || !/^0x[0-9a-f]{130}$/.test(result.signatureHex || '') || result.expectedSigner !== '0x1eff47bc3a10a45d4b230b5d10e37751fe6aa718') {
      setError('La firma no corresponde a los bytes congelados ni al firmante de práctica. Reinicia el laboratorio.')
      return
    }
    setSigned(result)
    setDraft({ messageHex: result.messageHex, signatureHex: result.signatureHex, expectedSigner: result.expectedSigner })
    setVerification(null)
    verificationRevision.current += 1
    setDisclosure((previous) => previous + 1)
    setMessage('Firma creada. Aún no se ha verificado contra el firmante esperado.')
  }

  async function chooseCase(kind) {
    if (!signed) return
    verificationRevision.current += 1
    const current = verificationRevision.current
    const source = revision.current
    setVerification(null)
    setError('')
    const result = await worker.run('tamper', {
      kind, messageHex: signed.messageHex, signatureHex: signed.signatureHex, expectedSigner: signed.expectedSigner,
    })
    if (!result || current !== verificationRevision.current || source !== revision.current) return
    setDraft(result)
    setDisclosure((previous) => previous + 1)
    setMessage(kind === 'original' ? 'Bytes, firma y firmante originales restaurados. Verifica otra vez.' : 'Caso preparado desde la firma original. Ejecuta la verificación para comprobarlo.')
  }

  async function verify() {
    if (!signed || !draft) return
    const current = verificationRevision.current
    const source = revision.current
    setError('')
    const result = await worker.run('verify', draft)
    if (!result || current !== verificationRevision.current || source !== revision.current) return
    if (result.messageHex !== draft.messageHex.toLowerCase() || result.signatureHex !== draft.signatureHex.toLowerCase() || result.expectedSigner !== draft.expectedSigner || typeof result.verified !== 'boolean') {
      setError('La respuesta no corresponde a los datos de verificación actuales. Reinicia el laboratorio.')
      return
    }
    setVerification(result)
    setDisclosure((previous) => previous + 1)
    setMessage(result.verified ? 'Verificación válida contra la dirección esperada.' : 'Verificación fallida. Recuperar una dirección no basta para aceptar la firma.')
  }

  return <LabShell
    chapter={4}
    title="Mesa de hashes y firmas"
    summary="Compara Keccak-256 y SHA3-256, firma bytes congelados y verifica qué ocurre al alterarlos."
    scope="Claves privadas educativas de conocimiento público: escalares 4 y 5. Nunca financies estas direcciones ni importes estas claves en una billetera. No firma transacciones reales, no cifra datos y no se conecta a Ethereum."
    steps={STEPS}
    step={step}
    onStep={setStep}
    available={[true, Boolean(hashes), Boolean(signed)]}
    onReset={reset}
    busy={worker.busy}
    error={error || worker.error}
    message={worker.busy ? 'Calculando en el Worker local…' : worker.fatal ? 'Worker detenido. Reinicia el laboratorio para recuperar el recorrido.' : message}
  >
    {worker.fatal && <p className="notice">No uses resultados anteriores. Pulsa "Reiniciar laboratorio" para crear un Worker nuevo.</p>}
    {step === 0 && <>
      <p>Máximo 1024 bytes. No ingreses secretos. Los espacios y saltos de línea también cuentan; el texto no se normaliza.</p>
      <Field id="crypto-encoding" label="Codificación de entrada">
        <select id="crypto-encoding" value={encoding} disabled={worker.busy} onChange={(event) => editSource(event.target.value, event.target.value === 'hex' ? '0x' : '')}>
          <option value="utf8">Texto UTF-8</option>
          <option value="hex">Bytes hexadecimales</option>
        </select>
      </Field>
      <Field id="crypto-source" label={encoding === 'utf8' ? 'Texto para comparar' : 'Bytes para comparar, con prefijo 0x'}>
        <textarea id="crypto-source" value={value} rows={4} maxLength={encoding === 'hex' ? 2050 : 1024} disabled={worker.busy} spellCheck={false} onChange={(event) => editSource(encoding, event.target.value)} aria-describedby="crypto-byte-help" />
      </Field>
      <p id="crypto-byte-help" className="guidance">UTF-8 codifica caracteres en bytes, no en posiciones de JavaScript. Por ejemplo, "ñ" tiene 1 punto de código y ocupa 2 bytes, c3 b1; "🦊" tiene 1 punto de código, 2 unidades UTF-16 y 4 bytes. Hexadecimal 0xc3b1 representa los mismos bytes que "ñ", sin interpretarlos como texto.</p>
      <div className="actions"><button type="button" disabled={locked} onClick={compare}>Comparar los mismos bytes</button></div>
    </>}
    {step === 1 && hashes && <>
      <p>Entrada congelada de {hashes.byteLength} bytes. Ambos hashes usan exactamente esta entrada. Cambian las reglas de relleno y separación de dominio, no los bytes de entrada.</p>
      {hashes.encoding === 'utf8' && <p>{hashes.codePoints} puntos de código; {hashes.utf16Units} unidades UTF-16; {hashes.byteLength} bytes UTF-8. No se aplica normalización Unicode.</p>}
      <div className="comparison">
        <section><h3>Keccak-256</h3><p className="hex breakable">{hashes.keccak256}</p></section>
        <section><h3>SHA3-256, FIPS 202</h3><p className="hex breakable">{hashes.sha3_256}</p></section>
      </div>
      <JsonDetails key={`bytes-${disclosure}`} title="Inspeccionar bytes exactos" value={{ hexadecimal: hashes.messageHex, bytes: hashes.bytesDisplay || '(entrada vacía)', longitud: hashes.byteLength }} />
      <p>Se firma el digest crudo Keccak-256 de estos bytes con ECDSA secp256k1. Sin prefijo EIP-191, sin personal_sign, sin segundo hash y sin transacción. Firma determinista RFC 6979 con s bajo; escalar privado de práctica 4, conocido públicamente.</p>
      <div className="actions"><button type="button" disabled={locked} onClick={sign}>Firmar Keccak-256 de estos bytes</button></div>
      {signed && <div className="step-result">
        <h3>Firma creada</h3>
        <p>Firmante original esperado, congelado al firmar:</p><p className="hex breakable">{signed.expectedSigner}</p>
        <JsonDetails key={`signature-${disclosure}`} title="Inspeccionar firma y digest" value={signed} />
        <div className="actions"><button type="button" disabled={locked} onClick={() => setStep(2)}>Ir a verificación independiente</button></div>
      </div>}
    </>}
    {step === 2 && signed && draft && <>
      <p>La verificación recalcula Keccak-256 del mensaje, comprueba ECDSA y compara la dirección recuperada con la esperada. El firmante original permanece fijo:</p>
      <p className="hex breakable">{signed.expectedSigner}</p>
      <p>Cada caso parte de la firma original. Preparar un caso no lo verifica. Alterar el escalar s conserva 65 bytes y un escalar válido, pero cambia la firma.</p>
      <div className="actions">
        <button type="button" disabled={locked} onClick={() => chooseCase('message')}>Alterar un byte del mensaje</button>
        <button type="button" disabled={locked} onClick={() => chooseCase('signature')}>Alterar el escalar s de la firma</button>
        <button type="button" disabled={locked} onClick={() => chooseCase('signer')}>Usar otro firmante esperado</button>
        <button type="button" disabled={locked} onClick={() => chooseCase('original')}>Restaurar datos originales</button>
      </div>
      <Field id="crypto-verify-message" label="Bytes del mensaje a verificar, hex con 0x">
        <textarea id="crypto-verify-message" value={draft.messageHex} maxLength={2050} rows={3} spellCheck={false} disabled={worker.busy} onChange={(event) => editVerification({ messageHex: event.target.value })} />
      </Field>
      <Field id="crypto-verify-signature" label="Firma a verificar, r || s || v, 65 bytes hex con 0x">
        <textarea id="crypto-verify-signature" value={draft.signatureHex} maxLength={132} rows={3} spellCheck={false} disabled={worker.busy} onChange={(event) => editVerification({ signatureHex: event.target.value })} />
      </Field>
      <Field id="crypto-expected-signer" label="Dirección esperada para esta verificación">
        <select id="crypto-expected-signer" value={draft.expectedSigner} disabled={worker.busy} onChange={(event) => editVerification({ expectedSigner: event.target.value })}>
          <option value={signed.expectedSigner}>Original, escalar de práctica 4</option>
          <option value={signed.wrongExpectedSigner}>Otra dirección, escalar de práctica 5</option>
        </select>
      </Field>
      <p className="hex breakable">{draft.expectedSigner}</p>
      <div className="actions"><button type="button" disabled={locked} onClick={verify}>Verificar contra la dirección esperada</button></div>
      {verification && <div className="step-result">
        <h3>{verification.verified ? 'Verificación válida' : 'Verificación fallida'}</h3>
        <p>{verification.verified ? 'La firma autentica estos bytes para la dirección esperada.' : verification.recoveredSigner ? 'Se recuperó una dirección, pero no coincide con la dirección esperada. Firma rechazada para ese firmante.' : 'No se pudo recuperar una clave pública válida. Firma rechazada.'}</p>
        <p>Dirección recuperada:</p><p className="hex breakable">{verification.recoveredSigner || 'No recuperable'}</p>
        <JsonDetails key={`verification-${disclosure}`} title="Inspeccionar verificación realizada" value={verification} />
      </div>}
    </>}
  </LabShell>
}
