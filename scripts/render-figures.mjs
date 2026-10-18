import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('figure-sources/manifest.json', root), 'utf8'))
const screenshotsOnly = process.argv.includes('--screenshots-only')
let rendered = 0

for (const figure of manifest.figures) {
  if (screenshotsOnly || figure.action !== 'recreated') continue
  const source = fileURLToPath(new URL(figure.source_file, root))
  const output = fileURLToPath(new URL(figure.image, root))
  const options = ['--background-color', 'white', '--zoom', '2', '--output', output]
  if (source.endsWith('.dot')) {
    const svg = execFileSync('dot', ['-Tsvg', source])
    execFileSync('rsvg-convert', options, { input: svg })
  } else {
    execFileSync('rsvg-convert', [...options, source])
  }
  rendered++
}

let edited = 0
for (const edition of manifest.screenshot_editions) {
  const original = fileURLToPath(new URL(edition.original, root))
  const bytes = await readFile(original)
  if (createHash('sha256').update(bytes).digest('hex') !== edition.original_sha256) {
    throw new Error(`La captura original no coincide con la versión editada ${edition.id}.`)
  }
  const dimensions = execFileSync('magick', ['identify', '-format', '%wx%h', original], { encoding: 'utf8' })
  if (dimensions !== `${edition.original_dimensions.width}x${edition.original_dimensions.height}`) {
    throw new Error(`Dimensiones inesperadas de la captura original ${edition.id}: ${dimensions}`)
  }
  const overlay = execFileSync('rsvg-convert', [fileURLToPath(new URL(edition.source_file, root))])
  const output = fileURLToPath(new URL(edition.image, root))
  execFileSync('magick', [
    original, '-background', 'white', '-alpha', 'remove', '-alpha', 'off',
    '-gravity', 'NorthWest', '-extent', `${edition.output_dimensions.width}x${edition.output_dimensions.height}`,
    'png:-', '-compose', 'Over', '-composite', '-define', 'png:exclude-chunks=date,time', output,
  ], { input: overlay })
  edited++
}

console.log(`Figuras: ${rendered} diagramas regenerados y ${edited} versiones editadas; capturas originales intactas.`)
