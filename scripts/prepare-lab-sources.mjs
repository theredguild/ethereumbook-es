import { execFile } from 'node:child_process'
import { constants } from 'node:fs'
import { createHash } from 'node:crypto'
import { lstat, mkdir, mkdtemp, open, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)))
const run = promisify(execFile)
const recipe = 'npm ci --ignore-scripts && npm run build:labs'
const sourceScripts = [
  'build-contract-artifacts.mjs',
  'verify-zk-artifacts.mjs',
  'prepare-lab-assets.mjs',
  'build-zk-artifacts.mjs',
  'prepare-runtime-licenses.mjs',
  'prepare-lab-sources.mjs',
  'site-path.mjs',
]
const excludedDirectories = new Set([
  'node_modules', '.cache', '.git', '.vocs-content', 'dist', 'coverage',
  'keys', 'keystore', 'keystores', 'secrets', 'user-secrets', '.ssh', '.gnupg',
])
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const describe = (path, bytes) => ({ path, bytes: bytes.length, sha256: hash(bytes) })
const json = (value) => `${JSON.stringify(value, null, 2)}\n`
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/')
const metadataText = (value) => value == null ? 'No declarado' : typeof value === 'string' ? value : JSON.stringify(value)

function safeRelative(path) {
  if (typeof path !== 'string' || isAbsolute(path) || !path || path.split('/').some((part) =>
    !part || part === '.' || part === '..' || part.startsWith('-') || part.trim() !== part || !/^[A-Za-z0-9@._+ -]+$/.test(part))) {
    throw new Error(`Ruta o nombre de archivo no seguro: ${JSON.stringify(path)}`)
  }
  return path
}

function within(parent, child) {
  const path = relative(parent, child)
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`))
}

async function inspect(base, path) {
  safeRelative(path)
  let current = base
  const parts = path.split('/')
  for (const [index, part] of parts.entries()) {
    current = join(current, part)
    const stat = await lstat(current)
    if (stat.isSymbolicLink()) throw new Error(`No se permiten enlaces simbólicos: ${current}`)
    if (index < parts.length - 1 && !stat.isDirectory()) throw new Error(`No es un directorio: ${current}`)
    if (index === parts.length - 1) return stat
  }
}

async function readBytes(base, path) {
  const stat = await inspect(base, path)
  if (!stat.isFile()) throw new Error(`Se requiere un archivo regular: ${join(base, path)}`)
  const file = await open(join(base, path), constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    if (!(await file.stat()).isFile()) throw new Error(`Se requiere un archivo regular: ${path}`)
    return await file.readFile()
  } finally {
    await file.close()
  }
}

function excluded(name, directory) {
  const lower = name.toLowerCase()
  return (directory && excludedDirectories.has(lower)) ||
    /^\.env(?:[._-]|$)/i.test(name) ||
    /^(?:witness(?:es)?|keys?|private[-_]?keys?|secrets?|mnemonics?|seed[-_]?phrases?)(?:[._-]|$)/i.test(name) ||
    /\.(?:wtns|witness|pem|key|p12|pfx|jks|keystore)$/i.test(name) ||
    /(?:^|[-_.])(?:credentials|user[-_]?secrets)(?:[-_.]|$)/i.test(name) ||
    /(?:^|[-_.])pilot(?:[-_.]|$).*\.zip$/i.test(name)
}

async function walk(base, path, filter = false) {
  const stat = await inspect(base, path)
  if (stat.isFile()) return [path]
  if (!stat.isDirectory()) throw new Error(`Tipo de archivo no permitido: ${path}`)
  const files = []
  for (const name of (await readdir(join(base, path))).sort()) {
    const child = safeRelative(`${path}/${name}`)
    const childStat = await inspect(base, child)
    if (filter && excluded(name, childStat.isDirectory())) continue
    files.push(...await walk(base, child, filter))
  }
  return files
}

async function safeDirectory(path) {
  const absolute = resolve(path)
  let current = parse(absolute).root
  for (const part of absolute.slice(current.length).split(sep).filter(Boolean)) {
    current = join(current, part)
    try {
      const stat = await lstat(current)
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Directorio de salida no seguro: ${current}`)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      await mkdir(current)
    }
  }
}

async function writeOutput(base, path, bytes) {
  safeRelative(path)
  const target = join(base, path)
  await safeDirectory(dirname(target))
  try {
    const stat = await lstat(target)
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Archivo de salida no seguro: ${target}`)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  // Rename replaces existing files without writing through hard links.
  const temporary = await mkdtemp(join(dirname(target), '.lab-source-write-'))
  try {
    await writeFile(join(temporary, 'contents'), bytes, { flag: 'wx' })
    await rename(join(temporary, 'contents'), target)
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

function externalLink(value, label = value) {
  if (typeof value !== 'string') return escapeHTML(metadataText(value))
  try {
    const url = new URL(value)
    if ((url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password) {
      return `<a href="${escapeHTML(url.href)}" rel="noreferrer">${escapeHTML(label)}</a>`
    }
  } catch { /* Non-URL metadata remains text. */ }
  return escapeHTML(value)
}

function download(path, label = path) {
  return `<a href="${escapeHTML(encodePath(path))}" download>${escapeHTML(label)}</a>`
}

function fileList(files) {
  return `<ul>${files.map((file) => `<li>${download(file.path)} <small>${file.bytes} bytes; SHA-256 <code>${file.sha256}</code></small></li>`).join('')}</ul>`
}

function renderPage(manifest, inventory, runtimeAssets) {
  const packages = inventory.packages.map((entry) => {
    const repositoryURL = typeof entry.repository === 'string' ? entry.repository : entry.repository?.url
    const repository = repositoryURL ? externalLink(repositoryURL) : escapeHTML(metadataText(entry.repository))
    const texts = entry.licenseFiles.length
      ? entry.licenseFiles.map((file) => download(file.path, file.sourcePath.split('/').at(-1))).join('<br>')
      : 'Sin texto de licencia en el nivel superior del paquete. La etiqueta declarada no reemplaza el texto.'
    return `<tr><th scope="row">${escapeHTML(entry.name)}<br><code>${escapeHTML(entry.version)}</code></th><td><code>${escapeHTML(entry.packagePath)}</code><br>${escapeHTML(metadataText(entry.license))}</td><td>${externalLink(entry.resolvedNpmTarball)}<br>${repository}</td><td>${texts}<br>${download(entry.packageMetadata.path, 'Metadatos originales')}</td></tr>`
  }).join('')
  const assets = runtimeAssets.assets.map((asset) => `<tr><th scope="row"><code>${escapeHTML(asset.file)}</code></th><td>${asset.url ? externalLink(asset.url) : escapeHTML(asset.source)}</td><td><code>${escapeHTML(asset.sha256)}</code></td></tr>`).join('')
  return `<!doctype html>
<html lang="es-419">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Fuentes y licencias de los laboratorios</title>
<style>
:root { color-scheme: light dark; font-family: system-ui, sans-serif; line-height: 1.6; }
body { margin: 0 auto; max-width: 78rem; padding: 1.5rem; }
a { text-underline-offset: .18em; }
a:focus-visible, summary:focus-visible { outline: 3px solid currentColor; outline-offset: 3px; }
code, pre { overflow-wrap: anywhere; }
pre { white-space: pre-wrap; padding: 1rem; border: 1px solid; }
.table-scroll { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; }
caption { text-align: left; font-weight: bold; margin-block: .5rem; }
th, td { padding: .65rem; border: 1px solid; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
li { margin-block: .6rem; }
small { display: block; }
summary { cursor: pointer; }
</style>
</head>
<body>
<header><a href="../laboratorios">Volver a los laboratorios</a><h1>Fuentes y licencias de los laboratorios</h1></header>
<main>
<section aria-labelledby="fuentes"><h2 id="fuentes">Código fuente y reproducción</h2>
<p>${download(manifest.archive.path, 'Descargar fuentes de los laboratorios .tar.gz')} · ${download('sources/manifest.json', 'Manifiesto de fuentes y SHA-256')} · ${download('licenses/inventory.json', 'Inventario de licencias')}</p>
<p>Archivo de ${manifest.archive.bytes} bytes. SHA-256 <code>${manifest.archive.sha256}</code>.</p>
<p>El archivo contiene las fuentes preferidas para modificar los laboratorios, sus pruebas, circuitos y artefactos públicos WASM y zkey actuales, los archivos de paquetes fijados y los scripts necesarios para compilar los laboratorios. No contiene el libro, dependencias instaladas, cachés, archivos .env ni archivos de testigos del navegador. Los fixtures sí incluyen claves privadas y frases educativas conocidas públicamente; nunca deben recibir fondos reales.</p>
<p>Se requieren Node.js 26 y <code>tar</code> de Linux o macOS. Extrae el archivo en un directorio vacío, entra en ese directorio y ejecuta:</p>
<pre><code>${escapeHTML(recipe)}</code></pre>
<p>Este comando recompila los laboratorios independientes, no el libro. La instalación y la preparación de recursos pueden requerir acceso a los registros npm y a las URL fijadas en <code>labs/runtime-assets.json</code>. Los artefactos de pruebas actuales ya están incluidos. No ejecutes <code>npm run setup:zk</code> para reproducir esta compilación: ese comando crea otra configuración educativa de un solo operador y otros artefactos, no una configuración de confianza para producción.</p>
<p>Los hashes identifican los bytes distribuidos. Este inventario no declara una auditoría, una revisión humana ni una autorización adicional de derechos de terceros.</p>
</section>
<section aria-labelledby="licencias"><h2 id="licencias">Licencias separadas del libro</h2>
<p>El libro conserva su licencia CC BY-SA. Esa licencia no se sustituye por las licencias del software. El código de los laboratorios se distribuye según ${download('licenses/LICENSE', 'su texto completo de GNU GPL versión 3')}. Las dependencias y los runtimes conservan sus propias licencias y avisos; no se les atribuye una licencia uniforme.</p>
<p>${download('licenses/THIRD_PARTY_NOTICES.md', 'Avisos de terceros, versiones y referencias de fuentes')}. Consulta esos avisos para las condiciones y referencias de código fuente de los componentes GPL y MPL y de los runtimes.</p>
<p><strong>Condición no estándar de Vyper 0.4.3:</strong> su archivo LICENSE contiene una adición restrictiva que no aparece en la etiqueta Apache-2.0 de sus metadatos. Se conserva el texto exacto; su clasificación y condiciones requieren revisión humana antes de publicar el compilador.</p>
<details><summary>Textos y metadatos de los runtimes</summary>${fileList(inventory.runtimeFiles)}</details>
<details><summary>Recursos de runtime fijados</summary>
<p>Solidity ${escapeHTML(runtimeAssets.solidity)}; Vyper ${escapeHTML(runtimeAssets.vyper)}; Pyodide ${escapeHTML(runtimeAssets.pyodide)}. Las referencias siguientes proceden de <code>labs/runtime-assets.json</code>.</p>
<div class="table-scroll" role="region" aria-label="Recursos de runtime" tabindex="0"><table><caption>Archivos y orígenes fijados</caption><thead><tr><th scope="col">Archivo</th><th scope="col">Origen</th><th scope="col">SHA-256 esperado</th></tr></thead><tbody>${assets}</tbody></table></div>
</details>
</section>
<section aria-labelledby="npm"><h2 id="npm">Paquetes npm instalados</h2>
<p>Inventario de ${inventory.packages.length} paquetes instalados identificados por las rutas de <code>package-lock.json</code>. Incluye herramientas de compilación; no es una lista de módulos presentes en cada bundle del navegador. Nombre, versión, licencia y repositorio proceden del <code>package.json</code> instalado. La URL del archivo npm y su integridad proceden del lockfile. No se ejecutó código de dependencias para recopilar estos datos.</p>
<p>Se copian sin modificar los archivos de licencia y avisos del nivel superior de cada paquete. Una etiqueta SPDX o un texto ausente no demuestra que todas las obligaciones estén satisfechas.</p>
<details><summary>Ver paquetes, versiones, orígenes y textos completos</summary>
<div class="table-scroll" role="region" aria-label="Inventario npm" tabindex="0"><table><caption>Paquetes instalados y licencias declaradas</caption><thead><tr><th scope="col">Paquete y versión exacta</th><th scope="col">Ruta y licencia declarada</th><th scope="col">Archivo npm y repositorio</th><th scope="col">Textos descargables</th></tr></thead><tbody>${packages}</tbody></table></div>
</details>
${inventory.skippedOptionalPackages.length ? `<details><summary>Paquetes opcionales no instalados</summary><ul>${inventory.skippedOptionalPackages.map((entry) => `<li><code>${escapeHTML(entry.packagePath)}</code> ${escapeHTML(entry.version)}; archivo package.json ausente, ENOENT.</li>`).join('')}</ul></details>` : ''}
</section>
</main>
</body>
</html>
`
}

if (Number(process.versions.node.split('.')[0]) < 26) throw new Error('prepare-lab-sources requiere Node.js 26 o posterior.')
if (process.argv.length > 3) throw new Error('Uso: node scripts/prepare-lab-sources.mjs [directorio-de-salida-labs]')
const destination = resolve(process.argv[2] || join(root, '.vocs-content/public/labs'))
if (within(destination, root) || ['labs', 'scripts', 'node_modules'].some((path) => within(join(root, path), destination))) {
  throw new Error('La salida debe estar fuera de las fuentes, scripts y dependencias; no puede ser un antecesor del repositorio.')
}

const work = await realpath(await mkdtemp(join(tmpdir(), 'ethereum-lab-sources-')))
const snapshot = join(work, 'source')
const distribution = join(work, 'distribution')
await mkdir(snapshot)
await mkdir(distribution)
try {
  for (const required of ['labs/LICENSE', 'labs/THIRD_PARTY_NOTICES.md']) {
    try {
      const bytes = await readBytes(root, required)
      if (!bytes.length) throw new Error(`Entrada legal requerida vacía: ${required}`)
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(`Falta entrada legal requerida: ${required}`, { cause: error })
      throw error
    }
  }
  let runtimePaths
  try {
    if (!(await inspect(root, 'labs/runtime-licenses')).isDirectory()) throw new Error('labs/runtime-licenses debe ser un directorio.')
    runtimePaths = await walk(root, 'labs/runtime-licenses')
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('Falta el directorio requerido labs/runtime-licenses/.', { cause: error })
    throw error
  }
  if (!runtimePaths.length) throw new Error('Faltan los textos y metadatos requeridos en labs/runtime-licenses/.')
  const paths = [...await walk(root, 'labs', true), 'package.json', 'package-lock.json', ...sourceScripts.map((name) => `scripts/${name}`)].sort()
  for (const required of runtimePaths) {
    if (!paths.includes(required)) throw new Error(`Entrada legal requerida excluida por su nombre: ${required}`)
  }
  const files = []
  for (const path of paths) {
    const bytes = await readBytes(root, path)
    await writeOutput(snapshot, path, bytes)
    files.push(describe(path, bytes))
  }

  const inventory = { schemaVersion: 1, hashAlgorithm: 'sha256', scope: 'Installed npm packages, including build tools; not a browser bundle audit.', projectFiles: [], runtimeFiles: [], packages: [], skippedOptionalPackages: [] }
  async function copyLegal(sourceBase, sourcePath, path) {
    const bytes = await readBytes(sourceBase, sourcePath)
    await writeOutput(distribution, path, bytes)
    return { ...describe(path, bytes), sourcePath }
  }
  for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
    inventory.projectFiles.push(await copyLegal(snapshot, `labs/${name}`, `licenses/${name}`))
  }
  for (const path of runtimePaths) {
    inventory.runtimeFiles.push(await copyLegal(snapshot, path, `licenses/runtime/${path.slice('labs/runtime-licenses/'.length)}`))
  }

  const lock = JSON.parse((await readBytes(snapshot, 'package-lock.json')).toString('utf8'))
  if (!lock.packages || typeof lock.packages !== 'object') throw new Error('package-lock.json debe contener packages con rutas de instalación fijadas.')
  for (const [packagePath, pinned] of Object.entries(lock.packages).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)) {
    if (!packagePath.startsWith('node_modules/')) continue
    safeRelative(packagePath)
    if (!/^(?:node_modules\/(?:@[^/]+\/)?[^/]+)(?:\/node_modules\/(?:@[^/]+\/)?[^/]+)*$/.test(packagePath) || pinned.link) {
      throw new Error(`Ruta de paquete no admitida: ${packagePath}`)
    }
    let metadataBytes
    try {
      metadataBytes = await readBytes(root, `${packagePath}/package.json`)
    } catch (error) {
      if (error.code !== 'ENOENT' || !pinned.optional) throw error
      inventory.skippedOptionalPackages.push({ packagePath, version: pinned.version ?? null, reason: 'ENOENT' })
      continue
    }
    const metadata = JSON.parse(metadataBytes.toString('utf8'))
    if (typeof metadata.name !== 'string' || typeof metadata.version !== 'string' || metadata.version !== pinned.version) {
      throw new Error(`Nombre o versión instalada no coincide con el paquete fijado: ${packagePath}`)
    }
    const prefix = `licenses/npm/${packagePath}`
    const packageMetadata = describe(`${prefix}/package.json`, metadataBytes)
    await writeOutput(distribution, packageMetadata.path, metadataBytes)
    const licenseFiles = []
    for (const name of (await readdir(join(root, packagePath))).sort()) {
      if (!/licen[cs]e|copying|notice/i.test(name)) continue
      const path = safeRelative(`${packagePath}/${name}`)
      const stat = await inspect(root, path)
      if (stat.isFile()) licenseFiles.push(await copyLegal(root, path, `${prefix}/${name}`))
      else if (!stat.isDirectory()) throw new Error(`Tipo de archivo de licencia no permitido: ${path}`)
    }
    inventory.packages.push({
      packagePath,
      name: metadata.name,
      version: metadata.version,
      license: metadata.license ?? metadata.licenses ?? null,
      repository: metadata.repository ?? null,
      resolvedNpmTarball: pinned.resolved ?? null,
      integrity: pinned.integrity ?? null,
      packageMetadata,
      licenseFiles,
    })
  }
  await writeOutput(distribution, 'licenses/inventory.json', json(inventory))

  const archivePath = 'sources/laboratorios-source.tar.gz'
  await mkdir(join(distribution, 'sources'))
  const environment = { ...process.env, COPYFILE_DISABLE: '1' }
  delete environment.TAR_OPTIONS
  delete environment.GZIP
  await run('tar', ['-czf', join(distribution, archivePath), '--', ...paths], { cwd: snapshot, env: environment, maxBuffer: 2 * 1024 * 1024 })
  const archive = describe(archivePath, await readBytes(distribution, archivePath))
  const manifest = {
    schemaVersion: 1,
    hashAlgorithm: 'sha256',
    archive,
    build: { requirements: ['Node.js 26.x', 'tar on Linux or macOS'], command: recipe, target: 'standalone browser labs, not the book', usesIncludedProofArtifacts: true },
    files,
  }
  await writeOutput(distribution, 'sources/manifest.json', json(manifest))
  const runtimeAssets = JSON.parse((await readBytes(snapshot, 'labs/runtime-assets.json')).toString('utf8'))
  if (!Array.isArray(runtimeAssets.assets)) throw new Error('labs/runtime-assets.json debe contener assets.')
  for (const asset of runtimeAssets.assets) safeRelative(asset.file)
  await writeOutput(distribution, 'recursos.html', renderPage(manifest, inventory, runtimeAssets))

  await safeDirectory(destination)
  for (const path of ['licenses', 'sources']) {
    // These directories belong to this script. Reject unsafe prior output before replacing it.
    try {
      const stat = await lstat(join(destination, path))
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Directorio de salida no seguro: ${path}`)
      await walk(destination, path)
      await rm(join(destination, path), { recursive: true })
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    for (const file of await walk(distribution, path)) await writeOutput(destination, file, await readBytes(distribution, file))
  }
  await writeOutput(destination, 'recursos.html', await readBytes(distribution, 'recursos.html'))
  console.log(`Fuentes de laboratorios: ${files.length} archivos; SHA-256 ${archive.sha256}; ${inventory.packages.length} paquetes instalados. Salida: ${destination}`)
} finally {
  await rm(work, { recursive: true, force: true })
}
