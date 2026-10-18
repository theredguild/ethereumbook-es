import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { siteBase } from './site-path.mjs'

const root = new URL('../', import.meta.url)
const generated = new URL('.vocs-content/', root)
const summary = await readFile(new URL('src/SUMMARY.md', root), 'utf8')
const chapters = [...summary.matchAll(/^- \[([^\]]+)\]\(\.\/([^/]+)\.md\)$/gm)]
const editorial = [
  ['Guía editorial', 'TRANSLATION'],
  ['Glosario', 'GLOSSARY'],
  ['Estado de la traducción', 'TRANSLATION_STATUS'],
  ['Observaciones pendientes', 'TRANSLATION_REVIEW'],
  ['Licencia y atribución', 'LICENSE'],
]

// Only generated output is replaced. Editorial sources remain in their original paths.
await rm(generated, { recursive: true, force: true })
await mkdir(new URL('pages/', generated), { recursive: true })
await mkdir(new URL('public/', generated), { recursive: true })

const pages = [
  ...chapters.map(([, , name]) => [`src/${name}.md`, name === 'intro' ? 'index' : name]),
  ...editorial.map(([, name]) => [`${name}.md`, name]),
]
for (const [source, destination] of pages) {
  let content = await readFile(new URL(source, root), 'utf8')
  if (destination === 'chapter_6') {
    const lab = `<aside class="book-lab" aria-label="Práctica opcional: laboratorio de transacciones">
<p class="book-lab__label">Práctica opcional</p>
<p class="book-lab__title">Laboratorio de transacciones</p>
<p>Practica el flujo de una transacción EIP-1559: preparar, firmar, incluir y observar el resultado. Todo ocurre en una EVM local, sin billetera ni fondos reales.</p>
<form class="book-lab__launch" method="get" action="${siteBase}labs/transactions/"><button class="book-lab__action" type="submit">Abrir laboratorio de transacciones <span aria-hidden="true">→</span></button></form>
<p class="book-lab__note">Complemento de The Red Guild; no forma parte del texto original.</p>
</aside>`
    const introductionEnd = content.indexOf('\n## ')
    if (introductionEnd === -1) throw new Error('No se encontró el final de la introducción del capítulo 6.')
    content = `${content.slice(0, introductionEnd)}\n\n${lab}\n${content.slice(introductionEnd)}`
  }
  // This reading site uses keyword search, not Vocs' external AI chat shortcuts.
  await writeFile(new URL(`pages/${destination}.md`, generated), `---\nshowAskAi: false\n---\n\n${content}`)
}
await cp(new URL('site/', root), new URL('pages/', generated), { recursive: true })
await cp(new URL('src/images/', root), new URL('public/images/', generated), { recursive: true })
await cp(new URL('src/favicon.svg', root), new URL('public/favicon.svg', generated))

const sidebar = [
  ...chapters.map(([, text, name]) => ({ text, link: name === 'intro' ? '/' : `/${name}` })),
  { text: 'Traducción', items: editorial.map(([text, name]) => ({ text, link: `/${name}` })) },
  { text: 'Laboratorios', link: '/laboratorios' },
]
await writeFile(new URL('sidebar.json', generated), `${JSON.stringify(sidebar, null, 2)}\n`)
console.log(`Vocs: ${chapters.length} páginas del libro y ${editorial.length} documentos preparados en ${fileURLToPath(generated)}`)
