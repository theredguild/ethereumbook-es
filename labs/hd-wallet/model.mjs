import { HDKey, HARDENED_OFFSET } from '@scure/bip32'
import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { importPublic } from '@ethereumjs/util'
import { keccak_256 } from '@noble/hashes/sha3.js'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'

// Invented, public classroom fixture. Never use this entropy for funds.
export const PUBLIC_ENTROPY = '68c24e91b703da5f2a8d40e6c71935ab'
export const PUBLIC_MNEMONIC = entropyToMnemonic(hexToBytes(PUBLIC_ENTROPY), wordlist)
export const DEFAULT_PATH_A = "m/44'/60'/0'/0/0"
export const DEFAULT_PATH_B = "m/44'/60'/1'/0/0"
export const MAX_DEPTH = 8
export const MAX_INDEX = 1000
export const MAX_PATH_LENGTH = 1 + MAX_DEPTH * 6

export function parsePath(path) {
  if (typeof path !== 'string' || path.length > MAX_PATH_LENGTH || path.trim() !== path || !/^m(?:\/(?:0|[1-9][0-9]{0,3})'?)+$/.test(path)) {
    throw new Error("La ruta debe comenzar con m/ y usar índices sin ceros iniciales, separados por /. Usa ' para endurecer; no uses espacios ni h.")
  }
  const segments = path.slice(2).split('/')
  if (segments.length > MAX_DEPTH) throw new Error(`La profundidad máxima del laboratorio es ${MAX_DEPTH} niveles.`)
  return segments.map((segment) => {
    const hardened = segment.endsWith("'")
    const index = Number(hardened ? segment.slice(0, -1) : segment)
    if (!Number.isSafeInteger(index) || index > MAX_INDEX) throw new Error(`Cada índice debe estar entre 0 y ${MAX_INDEX}.`)
    return Object.freeze({ index, hardened, childIndex: index + (hardened ? HARDENED_OFFSET : 0), segment })
  })
}

export function validateRoutes(pathA, pathB) {
  parsePath(pathA)
  parsePath(pathB)
  return Object.freeze({ pathA, pathB })
}

export function ethereumAccount(publicKey) {
  const xy = importPublic(publicKey)
  const hash = keccak_256(xy)
  return Object.freeze({
    publicKey: `0x04${bytesToHex(xy)}`,
    keccak: `0x${bytesToHex(hash)}`,
    address: `0x${bytesToHex(hash.subarray(12))}`,
  })
}

export function deriveRoute(root, path) {
  const segments = parsePath(path)
  let node = root
  let currentPath = 'm'
  const tree = [Object.freeze({ path: currentPath, fingerprint: root.fingerprint.toString(16).padStart(8, '0'), hardened: false })]
  for (const segment of segments) {
    node = node.deriveChild(segment.childIndex)
    // BIP32 may skip an invalid child. Never mislabel that child as the requested path.
    if (node.index !== segment.childIndex) throw new Error('BIP-32 omitió un índice no válido. Elige otra ruta dentro de los límites del laboratorio.')
    currentPath += `/${segment.segment}`
    tree.push(Object.freeze({ path: currentPath, fingerprint: node.fingerprint.toString(16).padStart(8, '0'), hardened: segment.hardened }))
  }
  return { node, tree: Object.freeze(tree) }
}

function fixtureRoot() {
  return HDKey.fromMasterSeed(mnemonicToSeedSync(PUBLIC_MNEMONIC, ''))
}

function accountSnapshot(path, node) {
  return Object.freeze({ path, ...ethereumAccount(node.publicKey) })
}

export function deriveLab(pathA, pathB) {
  const routes = validateRoutes(pathA, pathB)
  const root = fixtureRoot()
  const { node, tree } = deriveRoute(root, pathA)
  return Object.freeze({ ...routes, mnemonic: PUBLIC_MNEMONIC, seedBytes: 64, tree, account: accountSnapshot(pathA, node) })
}

export function compareLab(pathA, pathB) {
  const routes = validateRoutes(pathA, pathB)
  const root = fixtureRoot()
  const a = accountSnapshot(pathA, deriveRoute(root, pathA).node)
  const b = accountSnapshot(pathB, deriveRoute(root, pathB).node)
  // Fresh BIP39 seed + BIP32 root, not a cached copy of the first account.
  const regenerated = accountSnapshot(pathA, deriveRoute(fixtureRoot(), pathA).node)
  return Object.freeze({
    ...routes, a, b, regenerated,
    sameRoute: pathA === pathB,
    sameAddress: a.address === b.address,
    deterministic: a.address === regenerated.address && a.publicKey === regenerated.publicKey,
  })
}

export function testPublicDerivation(pathA, pathB) {
  const routes = validateRoutes(pathA, pathB)
  const { node } = deriveRoute(fixtureRoot(), pathA)
  const xpub = node.publicExtendedKey
  const publicOnly = HDKey.fromExtendedKey(xpub)
  const privateChild = node.deriveChild(0)
  const publicChild = publicOnly.deriveChild(0)
  if (privateChild.index !== 0 || publicChild.index !== 0) throw new Error('BIP-32 omitió el índice de prueba. Elige otra ruta.')
  const viaPrivate = accountSnapshot(`${pathA}/0`, privateChild)
  const viaPublic = accountSnapshot(`${pathA}/0`, publicChild)
  let rejection = ''
  try {
    publicOnly.deriveChild(HARDENED_OFFSET)
  } catch (error) {
    rejection = error instanceof Error ? error.message : String(error)
  }
  if (!rejection) throw new Error('La biblioteca permitió una derivación endurecida desde xpub; no se acepta este resultado.')
  return Object.freeze({
    ...routes, xpub, viaPrivate, viaPublic,
    publicHasPrivateKey: publicOnly.privateKey !== null,
    childHasPrivateKey: publicChild.privateKey !== null,
    match: viaPrivate.publicKey === viaPublic.publicKey && viaPrivate.address === viaPublic.address,
    hardenedPath: `${pathA}/0'`, hardenedRejected: true, rejection,
  })
}

export function dispatch(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('Solicitud no válida.')
  if (Object.keys(request).some((key) => !['action', 'pathA', 'pathB'].includes(key))) throw new Error('La solicitud solo admite acción y rutas públicas.')
  const { action, pathA, pathB } = request
  switch (action) {
    case 'derive': return deriveLab(pathA, pathB)
    case 'compare': return compareLab(pathA, pathB)
    case 'xpub': return testPublicDerivation(pathA, pathB)
    default: throw new Error('Acción de derivación no admitida.')
  }
}
