import { bytesToHex, ecrecover, hexToBytes, privateToAddress, pubToAddress } from '@ethereumjs/util'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { keccak_256, sha3_256 } from '@noble/hashes/sha3.js'

export const MAX_BYTES = 1024
export const SCHEME = 'ECDSA secp256k1 sobre Keccak-256(bytes), sin prefijo EIP-191'
export const EXPECTED_SIGNER = '0x1eff47bc3a10a45d4b230b5d10e37751fe6aa718'
export const WRONG_SIGNER = '0xe1ab8145f7e55dc933d51a18c793f901a3a0b276'
const ORDER = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n
// Public educational fixture, deliberately scalar 4. Never use for funds.
const DEMO_SCALAR = hexToBytes(`0x${'0'.repeat(63)}4`)

export function decodeInput(encoding, value, maximum = MAX_BYTES) {
  if (typeof value !== 'string') throw new Error('La entrada debe ser texto.')
  if (encoding === 'hex') {
    if (value.length > maximum * 2 + 2) throw new Error(`La entrada supera ${maximum} bytes.`)
    if (!/^0x(?:[0-9a-fA-F]{2})*(?![\s\S])/.test(value)) {
      throw new Error('Hex inválido: usa 0x y pares de dígitos hexadecimales, sin espacios.')
    }
    return hexToBytes(value)
  }
  if (encoding !== 'utf8') throw new Error('Selecciona UTF-8 o hexadecimal.')
  if (value.length > maximum) throw new Error(`La entrada supera ${maximum} bytes.`)
  for (const character of value) {
    const point = character.codePointAt(0)
    if (point >= 0xd800 && point <= 0xdfff) throw new Error('El texto contiene un sustituto Unicode aislado; no es UTF-8 válido.')
  }
  const bytes = new TextEncoder().encode(value)
  if (bytes.length > maximum) throw new Error(`La entrada supera ${maximum} bytes.`)
  return bytes
}

export function compareHashes({ encoding, value }) {
  const bytes = decodeInput(encoding, value)
  return Object.freeze({
    encoding,
    value,
    byteLength: bytes.length,
    messageHex: bytesToHex(bytes),
    bytesDisplay: Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(' '),
    codePoints: encoding === 'utf8' ? Array.from(value).length : null,
    utf16Units: encoding === 'utf8' ? value.length : null,
    keccak256: bytesToHex(keccak_256(bytes)),
    sha3_256: bytesToHex(sha3_256(bytes)),
  })
}

export function signFrozenBytes({ messageHex, digest }) {
  const bytes = decodeInput('hex', messageHex)
  const hash = keccak_256(bytes)
  const digestBytes = decodeInput('hex', digest, 32)
  if (digestBytes.length !== 32 || bytesToHex(digestBytes) !== bytesToHex(hash)) {
    throw new Error('El digest no coincide con Keccak-256 de los bytes congelados. Compara los hashes otra vez.')
  }
  // RFC 6979, HMAC-SHA256 nonce, low-s. No extra entropy and no second hash.
  const recovered = secp256k1.sign(hash, DEMO_SCALAR, {
    prehash: false, lowS: true, extraEntropy: false, format: 'recovered',
  })
  if (recovered[0] > 1) throw new Error('La firma necesita un identificador de recuperación no admitido por este ejercicio.')
  const r = bytesToHex(recovered.subarray(1, 33))
  const s = bytesToHex(recovered.subarray(33, 65))
  const v = recovered[0] + 27
  return Object.freeze({
    scheme: SCHEME,
    messageHex: bytesToHex(bytes),
    digest: bytesToHex(hash),
    expectedSigner: bytesToHex(privateToAddress(DEMO_SCALAR)),
    wrongExpectedSigner: WRONG_SIGNER,
    signatureHex: `${r}${s.slice(2)}${v.toString(16)}`,
    r, s, v,
  })
}

function parseSignature(signatureHex) {
  const bytes = decodeInput('hex', signatureHex, 65)
  if (bytes.length !== 65) throw new Error('La firma debe tener exactamente 65 bytes: r de 32, s de 32 y v de 1.')
  const r = bytes.subarray(0, 32)
  const s = bytes.subarray(32, 64)
  const v = bytes[64]
  if (v !== 27 && v !== 28) throw new Error('v debe ser 27 o 28 en este ejercicio, sin chainId.')
  const rNumber = BigInt(bytesToHex(r))
  const sNumber = BigInt(bytesToHex(s))
  if (rNumber < 1n || rNumber >= ORDER || sNumber < 1n || sNumber > ORDER / 2n) {
    throw new Error('Escalares inválidos: 1 ≤ r < n y 1 ≤ s ≤ n/2, con s bajo.')
  }
  return { bytes, r, s, v }
}

export function verifySignature({ messageHex, signatureHex, expectedSigner }) {
  const bytes = decodeInput('hex', messageHex)
  const signature = parseSignature(signatureHex)
  if (typeof expectedSigner !== 'string' || !/^0x[0-9a-fA-F]{40}(?![\s\S])/.test(expectedSigner)) {
    throw new Error('La dirección esperada debe tener 20 bytes hexadecimales con prefijo 0x.')
  }
  const digest = keccak_256(bytes)
  let recoveredSigner = null
  let signatureValid = false
  try {
    const publicKey = ecrecover(digest, BigInt(signature.v), signature.r, signature.s)
    recoveredSigner = bytesToHex(pubToAddress(publicKey))
    const encodedPublicKey = new Uint8Array(65)
    encodedPublicKey[0] = 4
    encodedPublicKey.set(publicKey, 1)
    signatureValid = secp256k1.verify(signature.bytes.subarray(0, 64), digest, encodedPublicKey, {
      prehash: false, lowS: true, format: 'compact',
    })
  } catch {
    // Correctly encoded scalars can still fail curve-point recovery.
    signatureValid = false
  }
  const signerMatches = recoveredSigner === expectedSigner.toLowerCase()
  return Object.freeze({
    scheme: SCHEME,
    messageHex: bytesToHex(bytes),
    digest: bytesToHex(digest),
    signatureHex: bytesToHex(signature.bytes),
    expectedSigner: expectedSigner.toLowerCase(),
    recoveredSigner,
    signatureValid,
    signerMatches,
    verified: signatureValid && signerMatches,
  })
}

export function alterMessage(messageHex) {
  const bytes = decodeInput('hex', messageHex)
  if (bytes.length === 0) return '0x01'
  bytes[0] ^= 1
  return bytesToHex(bytes)
}

export function alterSignature(signatureHex) {
  const { bytes, s } = parseSignature(signatureHex)
  const replacement = BigInt(bytesToHex(s)) === 1n ? 2 : 1
  bytes.fill(0, 32, 64)
  bytes[63] = replacement
  return bytesToHex(bytes)
}

export function dispatch(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('Solicitud inválida.')
  switch (request.action) {
    case 'compare': return compareHashes(request)
    case 'sign': return signFrozenBytes(request)
    case 'verify': return verifySignature(request)
    case 'tamper': {
      const { messageHex, signatureHex, expectedSigner, kind } = request
      decodeInput('hex', messageHex)
      parseSignature(signatureHex)
      if (!['original', 'message', 'signature', 'signer'].includes(kind)) throw new Error('Elige un caso de verificación válido.')
      if (expectedSigner !== EXPECTED_SIGNER) throw new Error('El caso necesita el firmante original de la clave pública de práctica.')
      return Object.freeze({
        messageHex: kind === 'message' ? alterMessage(messageHex) : messageHex,
        signatureHex: kind === 'signature' ? alterSignature(signatureHex) : signatureHex,
        expectedSigner: kind === 'signer' ? WRONG_SIGNER : expectedSigner,
      })
    }
    default: throw new Error('Acción desconocida. Usa compare, sign, verify o tamper.')
  }
}
