import artifacts from './artifacts.json' with { type: 'json' }
import { decodeErrorResult } from 'viem/utils'
import { createContractSession } from '../shared/evm.mjs'
import { callData, constructorData, readResult, decodeLogs } from '../shared/contracts.mjs'

export const ACTORS = ['alice', 'bob', 'carol']
export const UINT256_MAX = (1n << 256n) - 1n
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const contractNames = { erc20: 'WholeUnitsToken', erc721: 'IdentifiedTokens' }

export function uint256(text, label = 'Cantidad') {
  if (typeof text !== 'string' || !/^\d{1,78}$/.test(text) || BigInt(text) > UINT256_MAX) throw new Error(`${label}: usa un entero decimal entre 0 y 2^256 − 1, sin exponentes ni fracciones.`)
  return BigInt(text)
}

export function normalizeIntent(draft) {
  if (!draft || !contractNames[draft.mode] || !ACTORS.includes(draft.actor)) throw new Error('Selecciona un activo y un actor educativo.')
  const actions = draft.mode === 'erc20' ? ['transfer', 'approve', 'transferFrom'] : ['approve', 'transferFrom', 'setApprovalForAll']
  if (!actions.includes(draft.action)) throw new Error('Acción no admitida para este activo.')
  const intent = { mode: draft.mode, action: draft.action, actor: draft.actor }
  const target = draft.to
  if (!ACTORS.includes(target) && !(draft.mode === 'erc721' && draft.action === 'approve' && target === 'none')) throw new Error('Selecciona un destinatario o autorizado educativo.')
  intent.to = target
  if (draft.action === 'transferFrom') {
    if (!ACTORS.includes(draft.from)) throw new Error('Selecciona el propietario declarado. No se corrige automáticamente.')
    intent.from = draft.from
  }
  if (draft.mode === 'erc20') intent.amount = uint256(draft.amount).toString()
  else if (draft.action === 'setApprovalForAll') {
    if (typeof draft.approved !== 'boolean') throw new Error('Indica si concedes o revocas el permiso de operador.')
    intent.approved = draft.approved
  } else intent.tokenId = uint256(draft.tokenId, 'ID del NFT').toString()
  intent.gasLimit = uint256(draft.gasLimit ?? '1000000', 'Límite de gas').toString()
  if (BigInt(intent.gasLimit) > 4000000n) throw new Error('El límite de gas admite hasta 4000000.')
  intent.valueWei = uint256(draft.valueWei ?? '0', 'ETH adjunto en wei').toString()
  return Object.freeze(intent)
}

const addressPattern = /^0x[\da-f]{40}$/i
const numeric = (value) => typeof value === 'bigint' && value >= 0n && value <= UINT256_MAX
const matrix = (value, check) => Array.isArray(value) && value.length === 3 && value.every((row) => Array.isArray(row) && row.length === 3 && row.every(check))

export function validSnapshot(state) {
  if (!state || !Number.isSafeInteger(state.run) || state.run < 1 || !Array.isArray(state.evm?.actors) || state.evm.actors.length !== 3) return false
  if (!state.evm.actors.every((actor, i) => actor && actor.id === ACTORS[i] && typeof actor.address === 'string' && addressPattern.test(actor.address) && typeof actor.balanceWei === 'string' && /^\d+$/.test(actor.balanceWei) && typeof actor.nonce === 'string' && /^\d+$/.test(actor.nonce))) return false
  if (!Object.keys(contractNames).every((mode) => addressPattern.test(state.identities?.[mode]?.address))) return false
  const ft = state.erc20
  const nft = state.erc721
  if (!ft || typeof ft.name !== 'string' || typeof ft.symbol !== 'string' || ft.totalSupply !== 1000n || ft.decimals !== 0 || !Array.isArray(ft.balances) || ft.balances.length !== 3 || !ft.balances.every(numeric) || ft.balances.reduce((a, b) => a + b, 0n) !== ft.totalSupply || !matrix(ft.allowances, numeric)) return false
  if (!nft || typeof nft.name !== 'string' || typeof nft.symbol !== 'string' || !Array.isArray(nft.counts) || nft.counts.length !== 3 || !nft.counts.every(numeric) || nft.counts.reduce((a, b) => a + b, 0n) !== 2n || !matrix(nft.operators, (item) => typeof item === 'boolean')) return false
  if (!Array.isArray(nft.tokens) || nft.tokens.length !== 2 || !nft.tokens.every((token, i) => token && token.id === String(i + 1) && typeof token.owner === 'string' && addressPattern.test(token.owner) && state.evm.actors.some((actor) => actor.address.toLowerCase() === token.owner.toLowerCase()) && typeof token.approved === 'string' && addressPattern.test(token.approved) && typeof token.uri === 'string')) return false
  return nft.counts.every((count, i) => count === BigInt(nft.tokens.filter((token) => token.owner.toLowerCase() === state.evm.actors[i].address.toLowerCase()).length))
}

/** All calls share one checkpointed VM. Read and transaction requests run sequentially. */
export async function createTokensModel() {
  const evm = await createContractSession()
  let run = 0
  let sequence = 0
  let identities = null
  let prepared = null
  let serial = Promise.resolve()

  function artifact(mode) { return artifacts[contractNames[mode]] }
  function reason(mode, result) {
    try {
      const decoded = decodeErrorResult({ abi: artifact(mode).abi, data: result.returnData })
      return `${decoded.errorName}${decoded.args ? `(${decoded.args.map(String).join(', ')})` : ''}`
    } catch { return result.exception || 'REVERT' }
  }
  async function rawCall(mode, name, args = [], actor = 'alice') {
    if (!identities || !contractNames[mode] || !ACTORS.includes(actor)) throw new Error('La sesión de tokens no está lista.')
    return evm.call({ actor, to: identities[mode].address, data: callData(artifact(mode).abi, name, args) })
  }
  async function read(mode, name, args = [], actor = 'alice') {
    const result = await rawCall(mode, name, args, actor)
    if (result.status !== 1) throw new Error(reason(mode, result))
    return readResult(artifact(mode).abi, name, result.returnData)
  }
  async function snapshot() {
    if (!identities) return null
    const chain = await evm.snapshot()
    const balances = []
    const counts = []
    const allowances = []
    const operators = []
    for (const owner of chain.actors) {
      balances.push(await read('erc20', 'balanceOf', [owner.address]))
      counts.push(await read('erc721', 'balanceOf', [owner.address]))
      const allowanceRow = []
      const operatorRow = []
      for (const spender of chain.actors) {
        allowanceRow.push(await read('erc20', 'allowance', [owner.address, spender.address]))
        operatorRow.push(await read('erc721', 'isApprovedForAll', [owner.address, spender.address]))
      }
      allowances.push(allowanceRow)
      operators.push(operatorRow)
    }
    const tokens = []
    for (const id of ['1', '2']) tokens.push({ id, owner: await read('erc721', 'ownerOf', [BigInt(id)]), approved: await read('erc721', 'getApproved', [BigInt(id)]), uri: await read('erc721', 'tokenURI', [BigInt(id)]) })
    const erc20 = { name: await read('erc20', 'name'), symbol: await read('erc20', 'symbol'), decimals: await read('erc20', 'decimals'), totalSupply: await read('erc20', 'totalSupply'), balances, allowances }
    const erc721 = { name: await read('erc721', 'name'), symbol: await read('erc721', 'symbol'), counts, tokens, operators }
    return { run, identities: structuredClone(identities), erc20, erc721, evm: chain }
  }
  async function start() {
    identities = null
    prepared = null
    run += 1
    const initial = await evm.reset()
    const deployed = {}
    for (const mode of Object.keys(contractNames)) {
      const compiled = artifact(mode)
      if (!compiled) throw new Error(`Falta el artefacto compilado ${contractNames[mode]}.`)
      const result = await evm.deploy(compiled, { actor: 'alice', constructorData: constructorData(compiled.abi, [initial.actors[0].address]) })
      if (result.receipt.status !== 1) throw new Error(`El despliegue ${compiled.name} revirtió.`)
      deployed[mode] = { name: compiled.name, address: result.receipt.createdAddress, deploymentHash: result.receipt.hash, sourceHash: compiled.sourceHash, sourceHashes: compiled.sourceHashes, compiler: compiled.compiler, optimizer: compiled.optimizer, evmVersion: compiled.evmVersion, standardLibrary: '@openzeppelin/contracts 5.4.0' }
    }
    identities = deployed
    return { snapshot: await snapshot() }
  }
  async function prepare(draft) {
    prepared = null
    const intent = normalizeIntent(draft)
    const state = await snapshot()
    if (!state) throw new Error('Inicia la sesión antes de preparar una intención.')
    let token = null
    if (intent.mode === 'erc721' && intent.action !== 'setApprovalForAll') {
      const result = await rawCall('erc721', 'ownerOf', [BigInt(intent.tokenId)])
      token = result.status === 1 ? { id: intent.tokenId, owner: readResult(artifact('erc721').abi, 'ownerOf', result.returnData), approved: await read('erc721', 'getApproved', [BigInt(intent.tokenId)]) } : { id: intent.tokenId, error: reason('erc721', result) }
    }
    prepared = Object.freeze({ id: `${run}:${++sequence}`, run, intent, token })
    return { snapshot: state, prepared: structuredClone(prepared) }
  }
  async function execute(id, requestedRun) {
    if (!prepared || prepared.id !== id || prepared.run !== run || requestedRun !== run) throw new Error('Intención vencida. Revisa una intención nueva antes de firmar.')
    const frozen = prepared
    prepared = null
    const before = await snapshot()
    const intent = frozen.intent
    const addresses = Object.fromEntries(before.evm.actors.map((actor) => [actor.id, actor.address]))
    addresses.none = ZERO_ADDRESS
    let args
    if (intent.action === 'setApprovalForAll') args = [addresses[intent.to], intent.approved]
    else {
      const amount = BigInt(intent.mode === 'erc20' ? intent.amount : intent.tokenId)
      args = intent.action === 'transferFrom' ? [addresses[intent.from], addresses[intent.to], amount] : [addresses[intent.to], amount]
    }
    const result = await evm.transact({ actor: intent.actor, to: identities[intent.mode].address, data: callData(artifact(intent.mode).abi, intent.action, args), gasLimit: intent.gasLimit, valueWei: intent.valueWei })
    return { run, intentId: frozen.id, intent: structuredClone(intent), before, snapshot: await snapshot(), receipt: result.receipt, events: decodeLogs(artifact(intent.mode).abi, result.receipt.logs), error: result.receipt.status === 0 ? reason(intent.mode, result.receipt) : '' }
  }
  async function dispatch(request) {
    switch (request?.action) {
      case 'start': case 'reset': return start()
      case 'snapshot': return { snapshot: await snapshot() }
      case 'prepare': return prepare(request.draft)
      case 'execute': return execute(request.intentId, request.run)
      case 'invalidate': prepared = null; return { snapshot: await snapshot() }
      case 'read': return { value: await read(request.mode, request.name, request.args || [], request.actor || 'alice') }
      default: throw new Error('Solicitud de tokens no admitida.')
    }
  }
  function request(data) {
    const immutable = structuredClone(data)
    const next = serial.then(() => dispatch(immutable))
    serial = next.catch(() => {})
    return next
  }
  return { dispatch: request, snapshot: async () => (await request({ action: 'snapshot' })).snapshot }
}
