import { execFile } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { curves, powersOfTau, zKey } from 'snarkjs'

const run = promisify(execFile)
const root = fileURLToPath(new URL('../', import.meta.url))
const work = await mkdtemp(join(tmpdir(), 'ethereum-educational-zk-'))
const curve = await curves.getCurveFromName('bn128')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const paths = ['zero-knowledge', 'scaling']

try {
  console.log('Configuración educativa de un solo operador; no usar para fondos ni autorización de producción.')
  const initial = join(work, 'initial.ptau')
  const contributed = join(work, 'contributed.ptau')
  const prepared = join(work, 'prepared.ptau')
  await powersOfTau.newAccumulator(curve, 12, initial)
  await powersOfTau.contribute(initial, contributed, 'The Red Guild educational phase 1', randomBytes(64).toString('hex'))
  if (!await powersOfTau.verify(contributed)) throw new Error('La contribución de fase 1 no verifica.')
  await powersOfTau.preparePhase2(contributed, prepared)
  // snarkjs 0.7.5's verifier leaves a parameter file open in sameRatioH.
  // Its supported memory input avoids owning an OS descriptor in that path.
  const parameterBytes = new Uint8Array(await readFile(prepared))

  for (const name of paths) {
    const output = join(work, name)
    const source = join(root, 'labs', name, 'circuit.circom')
    await mkdir(output)
    const compiled = await run(process.execPath, [join(root, 'node_modules/circom2/cli.js'), source, '--r1cs', '--wasm', '--sym', '--O2', '-l', join(root, 'node_modules'), '-o', output], { cwd: root, maxBuffer: 2 * 1024 * 1024 })
    console.log(`${name}: ${compiled.stdout.trim()}`)
    const r1cs = join(output, 'circuit.r1cs')
    const firstKey = join(output, 'initial.zkey')
    const finalKey = join(output, 'final.zkey')
    await zKey.newZKey(r1cs, parameterBytes, firstKey)
    await zKey.contribute(firstKey, finalKey, 'The Red Guild educational phase 2', randomBytes(64).toString('hex'))
    if (!await zKey.verifyFromR1cs(r1cs, parameterBytes, finalKey)) throw new Error(`${name}: clave no vinculada al circuito.`)
    const verificationKey = await zKey.exportVerificationKey(finalKey)
    const destination = join(root, 'labs', name, 'artifacts')
    await mkdir(destination, { recursive: true })
    await cp(join(output, 'circuit_js/circuit.wasm'), join(destination, 'circuit.wasm'))
    await cp(finalKey, join(destination, 'final.zkey'))
    await writeFile(join(destination, 'verification-key.json'), `${JSON.stringify(verificationKey, null, 2)}\n`)
    const hashes = {}
    for (const file of ['circuit.wasm', 'final.zkey', 'verification-key.json']) hashes[file] = hash(await readFile(join(destination, file)))
    await writeFile(join(destination, 'manifest.json'), `${JSON.stringify({ circuitSha256: hash(await readFile(source)), tools: { circom2: '0.2.22', circom: '2.2.2', circomlib: '2.0.5', snarkjs: '0.7.5' }, curve: 'bn128', power: 12, setup: 'single-operator educational, not production trusted setup', phase1TranscriptSha256: hash(await readFile(contributed)), phase2TranscriptSha256: hash(await readFile(finalKey)), hashes }, null, 2)}\n`)
    console.log(`${name}: recursos públicos generados y verificados.`)
  }
} finally {
  await curve.terminate()
  await rm(work, { recursive: true, force: true })
}
