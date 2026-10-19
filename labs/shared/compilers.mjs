import { keccak_256 } from '@noble/hashes/sha3.js'
import { bytesToHex } from '@ethereumjs/util'
import solidityWorkerURL from './solidity.worker.js?url'
import { createWorkerClient } from './worker-client.mjs'

export function createCompiler(language) {
  if (!['Solidity', 'Vyper'].includes(language)) throw new Error('Lenguaje no admitido.')
  const client = createWorkerClient(language === 'Solidity'
    ? () => new Worker(solidityWorkerURL)
    : () => new Worker(new URL('./vyper.worker.mjs', import.meta.url), { type: 'module' }), 120_000)
  let ready
  const base = new URL(`${import.meta.env.BASE_URL}vendor/`, globalThis.location.origin)

  async function initialize() {
    if (!ready) ready = client.request('initialize', { url: new URL(language === 'Solidity' ? 'solc/soljson.js' : 'pyodide/', base).href })
    return ready
  }

  return {
    initialize,
    async compile(source) {
      if (typeof source !== 'string' || new TextEncoder().encode(source).length > 16_384) throw new Error('La fuente admite hasta 16 KiB.')
      await initialize()
      const { output, version } = await client.request('compile', { source })
      const sourceHash = bytesToHex(keccak_256(new TextEncoder().encode(source)))
      const diagnostics = (output.errors || []).map((item) => ({ severity: item.severity, message: item.formattedMessage || item.message || String(item.type), location: item.sourceLocation }))
      const contracts = []
      if (!diagnostics.some((item) => item.severity === 'error')) {
        for (const [file, definitions] of Object.entries(output.contracts || {})) {
          for (const [name, contract] of Object.entries(definitions)) {
            const code = contract.evm?.bytecode?.object || ''
            if (!code) continue
            contracts.push({ name, file, abi: contract.abi, bytecode: `0x${code.replace(/^0x/, '')}`, runtimeBytecode: `0x${(contract.evm?.deployedBytecode?.object || '').replace(/^0x/, '')}`, storageLayout: contract.storageLayout || contract.layout, sourceHash, compiler: `${language} ${version}`, evmVersion: 'shanghai' })
          }
        }
      }
      return { language, version, sourceHash, contracts, diagnostics }
    },
    dispose: () => client.dispose('Se canceló la compilación. La sesión EVM no se modificó.'),
  }
}
