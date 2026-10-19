import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { siteBase } from './site-path.mjs'
import { LABS } from '../labs/catalog.mjs'

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
  const exercise = LABS.find(({ chapter }) => destination === `chapter_${chapter}`)
  if (exercise) {
    const lab = `<aside class="book-lab" aria-label="Práctica opcional del capítulo ${exercise.chapter}">
<p class="book-lab__label">Práctica opcional</p>
<p class="book-lab__title">${exercise.title}</p>
<p>${exercise.description}</p>
<form class="book-lab__launch" method="get" action="${siteBase}labs/${exercise.slug}/"><button class="book-lab__action" type="submit">Abrir laboratorio del capítulo ${exercise.chapter} <span aria-hidden="true">→</span></button></form>
<p class="book-lab__note">Complemento de The Red Guild; no forma parte del texto original.</p>
</aside>`
    const introductionEnd = content.indexOf('\n## ')
    if (introductionEnd === -1) throw new Error(`No se encontró el final de la introducción del capítulo ${exercise.chapter}.`)
    content = `${content.slice(0, introductionEnd)}\n\n${lab}\n${content.slice(introductionEnd)}`
  }
  // This reading site uses keyword search, not Vocs' external AI chat shortcuts.
  await writeFile(new URL(`pages/${destination}.md`, generated), `---\nshowAskAi: false\n---\n\n${content}`)
}
await cp(new URL('site/', root), new URL('pages/', generated), { recursive: true })
const laboratoryIndex = await readFile(new URL('site/laboratorios.md', root), 'utf8')
const laboratoryEntries = LABS.map(({ chapter, slug, title, description }) => `## Capítulo ${chapter}: ${title}\n\n${description}\n\n<form class="book-lab__launch" method="get" action="${siteBase}labs/${slug}/"><button class="book-lab__action" type="submit">Abrir laboratorio del capítulo ${chapter} <span aria-hidden="true">→</span></button></form>\n\n[Leer capítulo ${chapter}](./chapter_${chapter}.md).`).join('\n\n')
const laboratoryResources = `<form class="book-lab__launch" method="get" action="${siteBase}labs/recursos.html"><button class="book-lab__action" type="submit">Licencias y código fuente <span aria-hidden="true">→</span></button></form>`
if (!laboratoryIndex.includes('<!-- LABS_INDEX -->') || !laboratoryIndex.includes('<!-- LABS_RESOURCES -->')) throw new Error('Faltan los marcadores del índice o los recursos de laboratorios.')
await writeFile(new URL('pages/laboratorios.md', generated), laboratoryIndex.replace('<!-- LABS_INDEX -->', laboratoryEntries).replace('<!-- LABS_RESOURCES -->', laboratoryResources))
await cp(new URL('src/images/', root), new URL('public/images/', generated), { recursive: true })
await cp(new URL('src/favicon.svg', root), new URL('public/favicon.svg', generated))

const sidebar = [
  ...chapters.map(([, text, name]) => ({ text, link: name === 'intro' ? '/' : `/${name}` })),
  { text: 'Traducción', items: editorial.map(([text, name]) => ({ text, link: `/${name}` })) },
  { text: 'Laboratorios', link: '/laboratorios' },
]
await writeFile(new URL('sidebar.json', generated), `${JSON.stringify(sidebar, null, 2)}\n`)
console.log(`Vocs: ${chapters.length} páginas del libro y ${editorial.length} documentos preparados en ${fileURLToPath(generated)}`)
