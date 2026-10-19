import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const hash = async (url) => createHash('sha256').update(await readFile(url)).digest('hex')
let count = 0
for (const slug of ['zero-knowledge', 'scaling']) {
  const directory = new URL(`labs/${slug}/`, root)
  const manifest = JSON.parse(await readFile(new URL('artifacts/manifest.json', directory), 'utf8'))
  const entries = [['circuit.circom', manifest.circuitSha256], ...['circuit.wasm', 'final.zkey', 'verification-key.json'].map((file) => [`artifacts/${file}`, manifest.hashes[file]])]
  for (const [file, expected] of entries) {
    const actual = await hash(new URL(file, directory))
    if (actual !== expected) throw new Error(`Recurso ZK distinto del manifiesto: ${slug}/${file}. Esperado ${expected}; obtenido ${actual}. Revisa los cambios y la configuración educativa antes de compilar.`)
    count += 1
  }
}
console.log(`Pruebas educativas: ${count} fuentes y recursos coinciden con sus manifiestos. No se regeneró la configuración.`)
