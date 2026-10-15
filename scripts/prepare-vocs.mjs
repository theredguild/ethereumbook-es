import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

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
  const content = await readFile(new URL(source, root), 'utf8')
  // This reading site uses keyword search, not Vocs' external AI chat shortcuts.
  await writeFile(new URL(`pages/${destination}.md`, generated), `---\nshowAskAi: false\n---\n\n${content}`)
}
await cp(new URL('site/', root), new URL('pages/', generated), { recursive: true })
await cp(new URL('src/images/', root), new URL('public/images/', generated), { recursive: true })

const sidebar = [
  ...chapters.map(([, text, name]) => ({ text, link: name === 'intro' ? '/' : `/${name}` })),
  { text: 'Traducción', items: editorial.map(([text, name]) => ({ text, link: `/${name}` })) },
]
await writeFile(new URL('sidebar.json', generated), `${JSON.stringify(sidebar, null, 2)}\n`)
console.log(`Vocs: ${chapters.length} páginas del libro y ${editorial.length} documentos preparados en ${fileURLToPath(generated)}`)
