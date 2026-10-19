import { writeFile } from 'node:fs/promises'
import { LABS } from '../labs/catalog.mjs'
import { compileContractFile, compileContractSource } from '../labs/shared/compile-fixtures.mjs'
import { SOLIDITY_SOURCE } from '../labs/shared/counter-source.mjs'

const root = new URL('../', import.meta.url)
const writeJSON = (url, value) => writeFile(url, `${JSON.stringify(value, null, 2)}\n`)
const counter = compileContractSource(SOLIDITY_SOURCE).contracts.LabCounter
await writeJSON(new URL('labs/shared/counter-artifact.json', root), {
  ...counter,
  sourceFile: 'labs/shared/counter-source.mjs',
  sourceExport: 'SOLIDITY_SOURCE',
})
let count = 1
for (const lab of LABS.filter((entry) => entry.contracts)) {
  const result = await compileContractFile(new URL(`labs/${lab.slug}/contracts.sol`, root))
  for (const diagnostic of result.diagnostics) console.warn(diagnostic.formattedMessage || diagnostic.message)
  await writeJSON(new URL(`labs/${lab.slug}/artifacts.json`, root), result.contracts)
  count += Object.keys(result.contracts).length
}
console.log(`Contratos educativos: ${count} artefactos reales de Solidity para Shanghai.`)
