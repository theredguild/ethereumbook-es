import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import solc from 'solc'
import { keccak_256 } from '@noble/hashes/sha3.js'
import { bytesToHex } from '@ethereumjs/util'

const root = fileURLToPath(new URL('../../', import.meta.url))
const standardLibrary = resolve(root, 'node_modules/@openzeppelin/contracts')
const hashSource = (source) => bytesToHex(keccak_256(new TextEncoder().encode(source)))

// Node build adapter only. Browser editors use their independent compiler Workers.
export function compileContractSource(source, file = 'LabCounter.sol') {
  const sourceHashes = { [file]: hashSource(source) }
  const settings = {
    evmVersion: 'shanghai',
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'storageLayout'] } },
  }
  const output = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources: { [file]: { content: source } }, settings }), {
    import(path) {
      if (!path.startsWith('@openzeppelin/contracts/')) return { error: 'Solo se permiten importaciones fijadas de @openzeppelin/contracts.' }
      const target = resolve(root, 'node_modules', path)
      if (!target.startsWith(`${standardLibrary}${sep}`)) return { error: 'Importación fuera de la biblioteca fijada.' }
      try {
        const contents = readFileSync(target, 'utf8')
        sourceHashes[path] = hashSource(contents)
        return { contents }
      } catch (cause) { return { error: cause.message } }
    },
  }))
  const diagnostics = output.errors || []
  const errors = diagnostics.filter((item) => item.severity === 'error')
  if (errors.length) throw new Error(errors.map((item) => item.formattedMessage || item.message).join('\n'))
  const contracts = {}
  for (const [name, contract] of Object.entries(output.contracts?.[file] || {})) {
    if (!contract.evm.bytecode.object) continue
    contracts[name] = {
      name,
      file,
      sourceHash: sourceHashes[file],
      sourceHashes,
      compiler: `Solidity ${solc.version()}`,
      evmVersion: 'shanghai',
      optimizer: settings.optimizer,
      abi: contract.abi,
      bytecode: `0x${contract.evm.bytecode.object}`,
      runtimeBytecode: `0x${contract.evm.deployedBytecode.object}`,
      storageLayout: contract.storageLayout,
    }
  }
  return { contracts, diagnostics }
}

export async function compileContractFile(url) {
  const path = fileURLToPath(url)
  return compileContractSource(await readFile(path, 'utf8'), relative(root, path).split(sep).join('/'))
}
