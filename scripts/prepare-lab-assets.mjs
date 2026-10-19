import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('labs/runtime-assets.json', root), 'utf8'))
const destination = process.argv[2] ? new URL(`${process.argv[2].replace(/\/$/, '')}/`, `file://${process.cwd()}/`) : new URL('.vocs-content/public/labs/vendor/', root)
const cache = new URL('.cache/lab-assets/', root)
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')

await mkdir(cache, { recursive: true })
for (const asset of manifest.assets) {
  let bytes
  if (asset.source) {
    bytes = await readFile(new URL(asset.source, root))
  } else {
    const cached = new URL(asset.sha256, cache)
    try { bytes = await readFile(cached) } catch (error) { if (error.code !== 'ENOENT') throw error }
    if (bytes && digest(bytes) !== asset.sha256) throw new Error(`La caché no coincide: ${asset.file}`)
    if (!bytes) {
      const response = await fetch(asset.url, { signal: AbortSignal.timeout(60_000) })
      if (!response.ok) throw new Error(`No se pudo obtener ${asset.file}: HTTP ${response.status}`)
      bytes = new Uint8Array(await response.arrayBuffer())
      if (digest(bytes) !== asset.sha256) throw new Error(`Hash inesperado para ${asset.file}`)
      await writeFile(cached, bytes)
    }
  }
  if (digest(bytes) !== asset.sha256) throw new Error(`Hash inesperado para ${asset.file}`)
  if (bytes.length > 25 * 1024 * 1024) throw new Error(`El recurso supera 25 MiB: ${asset.file}`)
  const target = new URL(asset.file, destination)
  await mkdir(new URL('./', target), { recursive: true })
  await writeFile(target, bytes)
}
await cp(new URL('labs/runtime-assets.json', root), new URL('manifest.json', destination))
console.log(`Recursos de compilación: ${manifest.assets.length} archivos verificados en ${fileURLToPath(destination)}`)
