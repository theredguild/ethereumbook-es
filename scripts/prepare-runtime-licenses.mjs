import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const destination = new URL('labs/runtime-licenses/', root)
const vendor = new URL('.vocs-content/public/labs/vendor/', root)
const runtime = JSON.parse(await readFile(new URL('labs/runtime-assets.json', root), 'utf8'))
const run = promisify(execFile)
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const records = []
const verified = new Map()
await mkdir(destination, { recursive: true })

async function save(file, bytes, origin) {
  await writeFile(new URL(file, destination), bytes)
  records.push({ file, bytes: bytes.length, sha256: sha256(bytes), origin })
}

const remote = [
  ['GPL-3.0.txt', 'https://raw.githubusercontent.com/argotorg/solidity/v0.8.30/LICENSE.txt'],
  ['Solidity-0.8.30-third-party-notices.h.in', 'https://raw.githubusercontent.com/argotorg/solidity/v0.8.30/cmake/templates/license.h.in'],
  ['Pyodide-0.27.7-MPL-2.0.txt', 'https://raw.githubusercontent.com/pyodide/pyodide/0.27.7/LICENSE'],
  ['CPython-3.12.7-LICENSE.txt', 'https://raw.githubusercontent.com/python/cpython/v3.12.7/LICENSE'],
  ['CPython-3.12.7-third-party-license.rst', 'https://raw.githubusercontent.com/python/cpython/v3.12.7/Doc/license.rst'],
  ['CPython-3.12.7-copyright.rst', 'https://raw.githubusercontent.com/python/cpython/v3.12.7/Doc/copyright.rst'],
  ['libffi-f08493d-LICENSE.txt', 'https://raw.githubusercontent.com/libffi/libffi/f08493d249d2067c8b3207ba46693dd858f95db3/LICENSE'],
  ['hiwire-6a1e672-LICENSE.txt', 'https://raw.githubusercontent.com/pyodide/hiwire/6a1e67280a15d929ebeceee54a6358c9c8d5f697/LICENSE'],
]
for (const [file, url] of remote) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`No se pudo obtener el aviso ${file}: HTTP ${response.status}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw new Error(`Tamaño de aviso inesperado: ${file}`)
  await save(file, bytes, { type: 'pinned-upstream-url', url })
}

for (const [file, source] of [
  ['snarkjs-0.7.5-COPYING.txt', 'node_modules/snarkjs/COPYING'],
  ['solc-js-0.8.30-wrapper-LICENSE.txt', 'node_modules/solc/LICENSE'],
  ['circomlib-2.0.5-bitify.circom', 'node_modules/circomlib/circuits/bitify.circom'],
]) await save(file, await readFile(new URL(source, root)), { type: 'installed-package-file', source })

const members = [
  ['pyodide/pycryptodome-3.20.0-cp35-abi3-pyodide_2024_0_wasm32.whl', 'pycryptodome-3.20.0.dist-info/licenses/LICENSE.rst', 'pycryptodome-3.20.0-LICENSE.rst'],
  ['pyodide/pycryptodome-3.20.0-cp35-abi3-pyodide_2024_0_wasm32.whl', 'pycryptodome-3.20.0.dist-info/licenses/AUTHORS.rst', 'pycryptodome-3.20.0-AUTHORS.rst'],
  ['pyodide/asttokens-2.4.1-py2.py3-none-any.whl', 'asttokens-2.4.1.dist-info/LICENSE', 'asttokens-2.4.1-LICENSE.txt'],
  ['pyodide/six-1.16.0-py2.py3-none-any.whl', 'six-1.16.0.dist-info/LICENSE', 'six-1.16.0-LICENSE.txt'],
  ...['LICENSE', 'LICENSE.APACHE', 'LICENSE.BSD'].map((name) => ['pyodide/packaging-24.2-py3-none-any.whl', `packaging-24.2.dist-info/licenses/${name}`, `packaging-24.2-${name}.txt`]),
  ['pyodide/vyper-0.4.3-py3-none-any.whl', 'vyper-0.4.3.dist-info/LICENSE', 'vyper-0.4.3-LICENSE.txt'],
  ['pyodide/cbor2-5.6.5-py3-none-any.whl', 'cbor2-5.6.5.dist-info/LICENSE.txt', 'cbor2-5.6.5-LICENSE.txt'],
  ['pyodide/lark-1.1.9-py3-none-any.whl', 'lark-1.1.9.dist-info/LICENSE', 'lark-1.1.9-LICENSE.txt'],
  ['pyodide/wheel-0.46.3-py3-none-any.whl', 'wheel-0.46.3.dist-info/licenses/LICENSE.txt', 'wheel-0.46.3-LICENSE.txt'],
  ...['LICENSE', 'LICENSE-APACHE', 'NOTICE'].map((name) => ['pyodide/immutables-0.21.tar.gz', `immutables-0.21/${name}`, `immutables-0.21-${name}.txt`]),
  ['pyodide/immutables-0.21.tar.gz', 'immutables-0.21/immutables/pythoncapi_compat.h', 'immutables-0.21-pythoncapi_compat.h'],
]
for (const [file, member, output] of members) {
  const asset = runtime.assets.find((item) => item.file === file)
  if (!asset) throw new Error(`Recurso fuera del manifiesto: ${file}`)
  let archive = verified.get(file)
  if (!archive) {
    archive = fileURLToPath(new URL(file, vendor))
    if (sha256(await readFile(archive)) !== asset.sha256) throw new Error(`Recurso distinto del manifiesto: ${file}`)
    verified.set(file, archive)
  }
  const command = file.endsWith('.whl') ? 'unzip' : 'tar'
  const args = command === 'unzip' ? ['-p', archive, member] : ['-xOzf', archive, member]
  const { stdout } = await run(command, args, { encoding: 'buffer', maxBuffer: 2 * 1024 * 1024 })
  if (!stdout.length) throw new Error(`Aviso vacío: ${file}:${member}`)
  await save(output, stdout, { type: 'verified-archive-member', asset, member })
}

await writeFile(new URL('labs/LICENSE', root), await readFile(new URL('GPL-3.0.txt', destination)))
await writeFile(new URL('manifest.json', destination), `${JSON.stringify({ format: 1, files: records }, null, 2)}\n`)
console.log(`Licencias de runtimes: ${records.length} textos y fuentes conservados sin modificar. Revisa por separado la licencia modificada de Vyper 0.4.3.`)
