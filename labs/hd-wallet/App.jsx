import { useRef, useState } from 'react'
import { Field, JsonDetails, LabShell } from '../shared/LabShell.jsx'
import { useWorker } from '../shared/useWorker.jsx'
import { DEFAULT_PATH_A, DEFAULT_PATH_B, MAX_DEPTH, MAX_INDEX, MAX_PATH_LENGTH, PUBLIC_MNEMONIC, validateRoutes } from './model.mjs'

const makeWorker = () => new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' })
const steps = ['Leer aviso y elegir rutas', 'Derivar cuenta', 'Comparar y regenerar', 'Probar xpub']
const isAccount = (value, path) => value?.path === path && /^0x[0-9a-f]{40}$/.test(value.address) && /^0x04[0-9a-f]{128}$/.test(value.publicKey) && /^0x[0-9a-f]{64}$/.test(value.keccak)

function Account({ title, value }) {
  return <section>
    <h3>{title}</h3>
    <p className="breakable"><code>{value.path}</code></p>
    <p className="breakable"><strong>Dirección Ethereum</strong><br /><code>{value.address}</code></p>
    <JsonDetails title="Ver clave pública y Keccak" value={{ clavePublicaSinComprimir: value.publicKey, keccakDeXY: value.keccak, direccion: value.address }} />
  </section>
}

export default function App() {
  const worker = useWorker(makeWorker)
  const revision = useRef(0)
  const [pathA, setPathA] = useState(DEFAULT_PATH_A)
  const [pathB, setPathB] = useState(DEFAULT_PATH_B)
  const [acknowledged, setAcknowledged] = useState(false)
  const [prepared, setPrepared] = useState(null)
  const [derived, setDerived] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [publicTest, setPublicTest] = useState(null)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('Lee el aviso. Después elige dos rutas públicas.')
  const [resetKey, setResetKey] = useState(0)
  const healthy = worker.ready && !worker.fatal
  const current = prepared?.revision === revision.current && prepared?.pathA === pathA && prepared?.pathB === pathB
  const hasDerived = current && derived !== null
  const hasComparison = hasDerived && comparison !== null
  const available = [true, healthy && current, healthy && hasDerived, healthy && hasComparison]

  function invalidate() {
    revision.current += 1
    setPrepared(null)
    setDerived(null)
    setComparison(null)
    setPublicTest(null)
    setStep(0)
    setError('')
    worker.clearError()
    setNotice('Cambió la preparación. Los resultados anteriores ya no están disponibles.')
  }

  function reset() {
    invalidate()
    setPathA(DEFAULT_PATH_A)
    setPathB(DEFAULT_PATH_B)
    setAcknowledged(false)
    setResetKey((value) => value + 1)
    setNotice('Rutas originales restauradas. Lee el aviso antes de continuar.')
    worker.restart()
  }

  function prepare() {
    setError('')
    worker.clearError()
    try {
      if (!acknowledged) throw new Error('Confirma que esta frase es pública y nunca debe recibir fondos.')
      if (!healthy) throw new Error('El Worker todavía no está disponible. Espera o reinicia el laboratorio.')
      const routes = validateRoutes(pathA, pathB)
      setPrepared({ ...routes, revision: revision.current })
      setNotice('Rutas validadas. La cuenta todavía no se ha derivado.')
      setStep(1)
    } catch (cause) {
      setError(cause.message)
    }
  }

  async function execute(action) {
    if (worker.busy || !healthy || !current) return
    if (action === 'compare' && !hasDerived) return
    if (action === 'xpub' && !hasComparison) return
    const runRevision = revision.current
    const routes = { pathA: prepared.pathA, pathB: prepared.pathB }
    setError('')
    const result = await worker.run(action, routes)
    if (runRevision !== revision.current || result === null) return
    let valid = result?.pathA === routes.pathA && result?.pathB === routes.pathB
    if (action === 'derive') {
      valid &&= result.mnemonic === PUBLIC_MNEMONIC && result.seedBytes === 64 && isAccount(result.account, routes.pathA) && Array.isArray(result.tree) && result.tree.length === routes.pathA.split('/').length && result.tree[0]?.path === 'm' && result.tree.at(-1)?.path === routes.pathA
    } else if (action === 'compare') {
      valid &&= isAccount(result.a, routes.pathA) && isAccount(result.b, routes.pathB) && isAccount(result.regenerated, routes.pathA) && result.a.address === derived.account.address && result.sameRoute === (routes.pathA === routes.pathB) && result.sameAddress === (result.a.address === result.b.address) && result.deterministic === true && result.regenerated.address === result.a.address && result.regenerated.publicKey === result.a.publicKey
    } else {
      valid &&= typeof result.xpub === 'string' && result.xpub.startsWith('xpub') && isAccount(result.viaPrivate, `${routes.pathA}/0`) && isAccount(result.viaPublic, `${routes.pathA}/0`) && result.match === true && result.viaPrivate.address === result.viaPublic.address && result.viaPrivate.publicKey === result.viaPublic.publicKey && result.publicHasPrivateKey === false && result.childHasPrivateKey === false && result.hardenedRejected === true && result.hardenedPath === `${routes.pathA}/0'` && typeof result.rejection === 'string' && result.rejection.length > 0
    }
    if (!valid) {
      setError('El Worker devolvió datos que no corresponden a estas rutas. Reinicia el laboratorio antes de continuar.')
      return
    }
    if (action === 'derive') {
      setDerived(result)
      setNotice('Cuenta A derivada desde la frase pública. Ahora puedes comparar las rutas.')
    } else if (action === 'compare') {
      setComparison(result)
      setNotice('Comparación y regeneración terminadas con una nueva semilla BIP-39.')
    } else {
      setPublicTest(result)
      setNotice('La hija pública coincide. La biblioteca rechazó la hija endurecida desde xpub.')
    }
  }

  return <LabShell
    chapter={5}
    title="Explorador de billeteras HD"
    summary="Deriva direcciones reales desde una frase pública de prueba. Cambia la ruta y observa qué permanece igual."
    scope={<><strong>Frase pública e insegura para fondos.</strong> Todas las claves de este ejercicio son conocidas. Nunca envíes fondos a estas direcciones ni importes esta frase en una billetera. No ingreses secretos personales. Sin persistencia, RPC, firma ni conexión a Ethereum. Una billetera administra claves, no almacena ether. La xpub contiene clave pública y código de cadena, no claves privadas ni fondos.</>}
    steps={steps} step={step} onStep={setStep} available={available} onReset={reset} busy={worker.busy}
    error={error || worker.error}
    message={worker.busy ? 'Derivando en el Worker local…' : worker.fatal ? 'Worker detenido. Reinicia para recuperar un estado conocido.' : !worker.ready ? 'Preparando Worker local…' : notice}
  >
    <div key={resetKey}>
      {worker.fatal ? <div className="notice"><p>No se aceptan resultados nuevos mientras el Worker esté detenido.</p><button type="button" onClick={reset}>Recuperar Worker y reiniciar</button></div> : <>
        {step === 0 && <>
          <p>Esta frase se calcula desde 128 bits fijos inventados para el laboratorio, con la lista inglesa BIP-39. No es un ejemplo del libro ni una frase generada al azar para tu uso.</p>
          <Field label="Frase mnemónica pública, solo lectura" id="hd-public-phrase"><textarea id="hd-public-phrase" readOnly rows={3} value={PUBLIC_MNEMONIC} /></Field>
          <div className="inline-options"><label htmlFor="hd-public-warning"><input id="hd-public-warning" type="checkbox" checked={acknowledged} disabled={worker.busy} onChange={(event) => { invalidate(); setAcknowledged(event.target.checked) }} />Entiendo que la frase es pública y nunca debe recibir fondos.</label></div>
          <div className="fields-grid">
            <Field label="Ruta A, cuenta seleccionada" id="hd-path-a" value={pathA} maxLength={MAX_PATH_LENGTH} spellCheck={false} autoComplete="off" aria-describedby="hd-path-help" disabled={worker.busy} onChange={(event) => { invalidate(); setPathA(event.target.value) }} />
            <Field label="Ruta B, comparación" id="hd-path-b" value={pathB} maxLength={MAX_PATH_LENGTH} spellCheck={false} autoComplete="off" aria-describedby="hd-path-help" disabled={worker.busy} onChange={(event) => { invalidate(); setPathB(event.target.value) }} />
          </div>
          <p id="hd-path-help" className="guidance">BIP-32 canónico con m minúscula y apóstrofo ASCII '. De 1 a {MAX_DEPTH} niveles, índices de 0 a {MAX_INDEX}, sin espacios, h ni ceros iniciales. Estos límites son del laboratorio, no del estándar.</p>
          <p>En <code>m/44'/60'/0'/0/0</code>, 44' es el propósito, 60' es Ethereum, 0' es la cuenta, el siguiente 0 es la rama de recepción y el último 0 es el índice de dirección. El apóstrofo indica derivación endurecida.</p>
          <details><summary>Rutas para comparar</summary><ul>
            <li>Otra cuenta: <code>m/44'/60'/1'/0/0</code>.</li>
            <li>Otro índice: <code>m/44'/60'/0'/0/1</code>.</li>
            <li>Otra rama: <code>m/44'/60'/0'/1/0</code>. La rama change viene de Bitcoin; Ethereum no necesita direcciones de cambio. Aquí solo se compara su derivación.</li>
            <li>La misma ruta A en B permite comprobar igualdad.</li>
          </ul><p>También se aceptan rutas BIP-32 que no siguen BIP-44. Su dirección no demuestra que una billetera vaya a descubrirla automáticamente.</p></details>
          <div className="actions"><button type="button" disabled={worker.busy || !healthy} onClick={prepare}>Validar rutas y continuar</button></div>
        </>}
        {step === 1 && current && <>
          <p className="breakable">Ruta seleccionada: <code>{prepared.pathA}</code>.</p>
          {!hasDerived ? <><p>La frase produce una semilla BIP-39 de 64 bytes mediante PBKDF2-HMAC-SHA512, sin frase de contraseña adicional. BIP-32 crea la raíz del árbol y recorre únicamente la ruta seleccionada.</p><div className="actions"><button type="button" disabled={worker.busy || !healthy} onClick={() => execute('derive')}>Derivar cuenta A</button></div></> : <>
            <div className="step-result"><p>Frase pública → semilla de {derived.seedBytes} bytes → raíz BIP-32 → cuenta A.</p><Account title="Cuenta A derivada" value={derived.account} /></div>
            <details><summary>Seguir la ruta en el árbol</summary><ol>{derived.tree.map((node) => <li className="breakable" key={node.path}><code>{node.path}</code>{node.path !== 'm' && (node.hardened ? ' · endurecida' : ' · no endurecida')}</li>)}</ol><p>Solo se recorren estos nodos, no se generan todas las ramas.</p></details>
            <p>La dirección son los últimos 20 bytes de Keccak-256 sobre X e Y de la clave pública secp256k1 sin comprimir, sin el prefijo 04. Se muestra en minúsculas, sin checksum EIP-55.</p>
            <div className="actions"><button type="button" disabled={worker.busy} onClick={() => setStep(2)}>Continuar a comparación</button></div>
          </>}
        </>}
        {step === 2 && hasDerived && <>
          <p>Deriva A y B desde la misma raíz. Después vuelve a calcular la semilla y la raíz desde la frase pública para regenerar A de forma independiente.</p>
          <div className="actions"><button type="button" disabled={worker.busy || !healthy} onClick={() => execute('compare')}>{hasComparison ? 'Repetir comparación y regeneración' : 'Comparar rutas y regenerar A'}</button></div>
          {hasComparison && <>
            <div className="comparison"><Account title="Ruta A" value={comparison.a} /><Account title="Ruta B" value={comparison.b} /></div>
            <div className="step-result"><p>{comparison.sameRoute ? 'Misma ruta: ambas direcciones coinciden.' : comparison.sameAddress ? 'Las rutas difieren pero las direcciones coinciden.' : 'Rutas distintas: direcciones distintas.'}</p><p>Regeneración determinista confirmada: coinciden la dirección y la clave pública de A.</p><p className="breakable"><code>{comparison.regenerated.address}</code></p></div>
            <div className="actions"><button type="button" disabled={worker.busy} onClick={() => setStep(3)}>Continuar a prueba xpub</button></div>
          </>}
        </>}
        {step === 3 && hasComparison && <>
          <p>Se exporta únicamente la xpub del nodo A y se vuelve a importar como nodo público. La prueba agrega una hija <code>/0</code> a A, no reemplaza su último índice. Estos nodos de prueba pueden tener un nivel adicional al límite de las rutas editables.</p>
          <p>La derivación privada y la pública deben producir la misma clave pública hija no endurecida. La hija <code>/0'</code> necesita la clave privada madre y debe fallar desde xpub.</p>
          <div className="actions"><button type="button" disabled={worker.busy || !healthy} onClick={() => execute('xpub')}>{publicTest ? 'Repetir prueba xpub' : 'Probar derivación pública y endurecida'}</button></div>
          {publicTest && <>
            <div className="step-result"><p>Coincidencia no endurecida confirmada. El nodo xpub y su hija pública no tienen clave privada.</p><p className="breakable">Hija comparada: <code>{publicTest.viaPublic.path}</code></p><p className="breakable">Desde derivación privada: <code>{publicTest.viaPrivate.address}</code></p><p className="breakable">Desde xpub: <code>{publicTest.viaPublic.address}</code></p></div>
            <div className="notice"><p className="breakable">Rechazo endurecido esperado para <code>{publicTest.hardenedPath}</code>.</p><p>La biblioteca respondió: <q>{publicTest.rejection}</q></p><p>Este rechazo es el resultado correcto, no una cuenta creada.</p></div>
            <JsonDetails title="Inspeccionar xpub pública de prueba" value={{ rutaMadre: pathA, xpub: publicTest.xpub, contieneClavePrivada: publicTest.publicHasPrivateKey, clavesPublicasCoinciden: publicTest.viaPrivate.publicKey === publicTest.viaPublic.publicKey }} />
            <p>Una xpub permite relacionar direcciones de su rama y afecta la privacidad. No permite firmar. Una clave privada hija no endurecida filtrada junto con la xpub madre puede comprometer esa rama. Aquí no se muestran claves privadas.</p>
            <div className="actions"><button type="button" disabled={worker.busy} onClick={() => setStep(0)}>Volver a elegir rutas</button></div>
          </>}
        </>}
      </>}
    </div>
  </LabShell>
}
