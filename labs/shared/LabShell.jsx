import { useEffect, useRef } from 'react'
import '../transactions/style.css'
import './lab.css'

export const bookBase = import.meta.env.BASE_URL.replace(/labs\/$/, '')

/** Presentation only. Each exercise owns its state and progression rules. */
export function LabShell({ chapter, title, summary, scope, steps, step, onStep, available, onReset, busy = false, error = '', message = '', children, support }) {
  const heading = useRef(null)
  const alert = useRef(null)
  const previousStep = useRef(step)
  useEffect(() => {
    if (previousStep.current !== step && !error) heading.current?.focus()
    previousStep.current = step
  }, [step, error])
  useEffect(() => { if (error) alert.current?.focus() }, [error])

  return <>
    <a className="skip-link" href="#paso-actual">Saltar al paso actual</a>
    <header className="site-header">
      <a href={`${bookBase}chapter_${chapter}`}>← Volver al capítulo {chapter}</a>
      <a href={`${bookBase}laboratorios`}>Todos los laboratorios</a>
    </header>
    <main className="lab-workflow" style={{ '--step-count': steps.length }}>
      <div className="intro">
        <p className="eyebrow">Laboratorio del capítulo {chapter}</p>
        <h1>{title}</h1>
        <p>{summary}</p>
      </div>
      <aside className="safety" role="note">{scope}</aside>
      <nav className="step-navigation" aria-label="Pasos del laboratorio"><ol>
        {steps.map((label, index) => <li key={label}><button type="button" aria-label={`Paso ${index + 1}: ${label}`} aria-current={step === index ? 'step' : undefined} disabled={busy || !available[index]} onClick={() => onStep(index)}><span className="step-number">{index + 1}</span><span>{label}</span></button></li>)}
      </ol></nav>
      <div className="status-panel" aria-busy={busy}>
        <p role="status" aria-live="polite" aria-atomic="true">{busy ? message || 'Procesando en este navegador…' : message}</p>
        <button type="button" className="text-button" disabled={busy} onClick={onReset}>Reiniciar laboratorio</button>
      </div>
      {error && <div className="error" role="alert" tabIndex="-1" ref={alert}><strong>No se completó la acción</strong><p>{error}</p></div>}
      <section className="panel" id="paso-actual" tabIndex="-1" aria-labelledby="step-title" data-step={step}>
        <h2 id="step-title" tabIndex="-1" ref={heading}>{steps[step]}</h2>
        {children}
      </section>
      {support && <div className="support">{support}</div>}
      <footer>Material complementario original de The Red Guild. No forma parte del texto original. Estado local, sin fondos reales ni conexión a Ethereum. La recarga descarta el recorrido. <a href={import.meta.env.BASE_URL + 'recursos.html'} target="_blank" rel="noopener noreferrer">Licencias y código fuente (nueva pestaña)</a>.</footer>
    </main>
  </>
}

export function JsonDetails({ title = 'Inspeccionar datos', value }) {
  return <details className="technical"><summary>{title}</summary><pre className="hex" tabIndex="0"><code>{JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item, 2)}</code></pre></details>
}

export function Field({ label, id, children, ...props }) {
  return <div className="field"><label htmlFor={id}>{label}</label>{children || <input id={id} {...props} />}</div>
}
