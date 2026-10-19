let runtimePromise

async function initialize(base) {
  if (runtimePromise) return runtimePromise
  runtimePromise = (async () => {
    const directory = new URL(base)
    if (directory.origin !== self.location.origin || !directory.pathname.endsWith('/vendor/pyodide/')) throw new Error('Ruta de Pyodide no permitida.')
    const { loadPyodide } = await import(/* @vite-ignore */ new URL('pyodide.mjs', directory).href)
    const runtime = await loadPyodide({ indexURL: directory.href })
    await runtime.loadPackage(['pycryptodome', 'asttokens', 'packaging'])
    await runtime.loadPackage(['cbor2-5.6.5-py3-none-any.whl', 'lark-1.1.9-py3-none-any.whl', 'wheel-0.46.3-py3-none-any.whl'].map((name) => new URL(name, directory).href))
    const response = await fetch(new URL('immutables-0.21.tar.gz', directory))
    if (!response.ok) throw new Error(`No se pudo cargar immutables: HTTP ${response.status}`)
    runtime.unpackArchive(await response.arrayBuffer(), 'gztar', { extractDir: '/vendor' })
    runtime.runPython("import sys\nsys.path.insert(0, '/vendor/immutables-0.21')")
    await runtime.loadPackage([new URL('vyper-0.4.3-py3-none-any.whl', directory).href])
    runtime.runPython('import vyper\nfrom vyper.cli.vyper_json import compile_json, exc_handler_to_dict\nimport json')
    return runtime
  })()
  return runtimePromise
}

self.onmessage = async ({ data }) => {
  const id = data?.id
  try {
    if (!Number.isSafeInteger(id) || id < 0) throw new Error('Identificador de solicitud inválido.')
    if (data.action === 'initialize') {
      const runtime = await initialize(data.url)
      self.postMessage({ id, ok: true, result: { version: runtime.runPython('vyper.__version__') } })
      return
    }
    if (data.action !== 'compile' || !runtimePromise) throw new Error('Inicia el compilador antes de compilar.')
    if (typeof data.source !== 'string' || new TextEncoder().encode(data.source).length > 16_384) throw new Error('La fuente admite hasta 16 KiB.')
    const runtime = await runtimePromise
    // Only trusted adapter code runs as Python. Editor contents enter as data.
    runtime.globals.set('lab_source', data.source)
    let output
    try {
      output = JSON.parse(runtime.runPython(`json.dumps(compile_json({"language": "Vyper", "sources": {"Lab.vy": {"content": lab_source}}, "settings": {"evmVersion": "shanghai", "optimize": "gas", "outputSelection": {"*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "layout"]}}}, exc_handler=exc_handler_to_dict), default=str)`))
    } finally { runtime.globals.delete('lab_source') }
    self.postMessage({ id, ok: true, result: { version: runtime.runPython('vyper.__version__'), output } })
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : 'Error del compilador Vyper.' })
  }
}
