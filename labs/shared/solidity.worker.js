// Static classic Worker; the pinned upstream compiler remains a separate asset.
let compilerPromise
let compile
let reset
let version

function initialize(url) {
  if (compilerPromise) return compilerPromise
  compilerPromise = new Promise((resolve, reject) => {
    self.Module = {
      onRuntimeInitialized() {
        try {
          compile = self.Module.cwrap('solidity_compile', 'string', ['string', 'number', 'number'])
          reset = self.Module.cwrap('solidity_reset', null, [])
          version = self.Module.cwrap('solidity_version', 'string', [])()
          resolve(version)
        } catch (error) { reject(error) }
      },
      onAbort(reason) { reject(new Error(String(reason))) },
    }
    try {
      const source = new URL(url)
      if (source.origin !== self.location.origin || !source.pathname.endsWith('/vendor/solc/soljson.js')) throw new Error('Ruta de compilador no permitida.')
      importScripts(source.href)
    } catch (error) { reject(error) }
  })
  return compilerPromise
}

self.onmessage = async ({ data }) => {
  const id = data?.id
  try {
    if (!Number.isSafeInteger(id) || id < 0) throw new Error('Identificador de solicitud inválido.')
    if (data.action === 'initialize') {
      await initialize(data.url)
      self.postMessage({ id, ok: true, result: { version } })
      return
    }
    if (data.action !== 'compile' || !compilerPromise) throw new Error('Inicia el compilador antes de compilar.')
    if (typeof data.source !== 'string' || new TextEncoder().encode(data.source).length > 16_384) throw new Error('La fuente admite hasta 16 KiB.')
    await compilerPromise
    const input = { language: 'Solidity', sources: { 'Lab.sol': { content: data.source } }, settings: { evmVersion: 'shanghai', optimizer: { enabled: false }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'storageLayout'] } } } }
    let output
    try { output = JSON.parse(compile(JSON.stringify(input), 0, 0)) } finally { reset() }
    self.postMessage({ id, ok: true, result: { version, output } })
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : 'Error del compilador Solidity.' })
  }
}
