import test from 'node:test'
import assert from 'node:assert/strict'
import { bytesToHex, hexToBytes, privateToAddress } from '@ethereumjs/util'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { sha3_256 } from '@noble/hashes/sha3.js'
import {
  MAX_BYTES, SCHEME, EXPECTED_SIGNER, WRONG_SIGNER,
  decodeInput, compareHashes, signFrozenBytes, verifySignature,
  alterMessage, alterSignature, dispatch,
} from './model.mjs'

const EMPTY_KECCAK = '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'
const EMPTY_SHA3 = '0xa7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a'
const SCALAR4 = hexToBytes(`0x${'0'.repeat(63)}4`)
const SCALAR5 = hexToBytes(`0x${'0'.repeat(63)}5`)
const ORDER = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n

function signedFixture(encoding = 'utf8', value = '') {
  const hashes = compareHashes({ encoding, value })
  const signed = signFrozenBytes({ messageHex: hashes.messageHex, digest: hashes.keccak256 })
  return { hashes, signed }
}

function verificationFields(signed) {
  return { messageHex: signed.messageHex, signatureHex: signed.signatureHex, expectedSigner: signed.expectedSigner }
}

test('known empty-string Keccak-256 and FIPS 202 SHA3-256 vectors use identical zero bytes', () => {
  const result = compareHashes({ encoding: 'utf8', value: '' })
  assert.equal(result.messageHex, '0x')
  assert.equal(result.bytesDisplay, '')
  assert.equal(result.byteLength, 0)
  assert.equal(result.keccak256, EMPTY_KECCAK)
  assert.equal(result.sha3_256, EMPTY_SHA3)
  assert.notEqual(result.keccak256, result.sha3_256)
  const hexadecimal = compareHashes({ encoding: 'hex', value: '0x' })
  assert.equal(hexadecimal.keccak256, result.keccak256)
  assert.equal(hexadecimal.sha3_256, result.sha3_256)
})

test('UTF-8, hexadecimal and Unicode counts describe exact bytes without normalization or trimming', () => {
  const result = compareHashes({ encoding: 'utf8', value: 'ñ🦊\n' })
  assert.equal(result.messageHex, '0xc3b1f09fa68a0a')
  assert.equal(result.bytesDisplay, 'c3 b1 f0 9f a6 8a 0a')
  assert.equal(result.byteLength, 7)
  assert.equal(result.codePoints, 3)
  assert.equal(result.utf16Units, 4)
  const hex = compareHashes({ encoding: 'hex', value: '0xC3B1F09FA68A0A' })
  assert.equal(hex.messageHex, result.messageHex)
  assert.equal(hex.keccak256, result.keccak256)
  assert.equal(hex.sha3_256, result.sha3_256)
  assert.notEqual(compareHashes({ encoding: 'utf8', value: 'é' }).keccak256, compareHashes({ encoding: 'utf8', value: 'e\u0301' }).keccak256)
  assert.notEqual(compareHashes({ encoding: 'utf8', value: 'a' }).keccak256, compareHashes({ encoding: 'utf8', value: 'a ' }).keccak256)
})

test('1024-byte bound applies to encoded bytes rather than character count', () => {
  assert.equal(MAX_BYTES, 1024)
  assert.equal(decodeInput('utf8', 'a'.repeat(1024)).length, 1024)
  assert.equal(decodeInput('utf8', 'ñ'.repeat(512)).length, 1024)
  assert.equal(decodeInput('utf8', '🦊'.repeat(256)).length, 1024)
  assert.equal(decodeInput('hex', `0x${'ab'.repeat(1024)}`).length, 1024)
  assert.throws(() => decodeInput('utf8', 'a'.repeat(1025)), /1024 bytes/)
  assert.throws(() => decodeInput('utf8', 'ñ'.repeat(513)), /1024 bytes/)
  assert.throws(() => decodeInput('utf8', '🦊'.repeat(257)), /1024 bytes/)
  assert.throws(() => decodeInput('hex', `0x${'ab'.repeat(1025)}`), /1024 bytes/)
})

test('invalid hex, unsupported encodings, nonstrings and lone surrogates are rejected', () => {
  for (const invalid of ['', 'aa', '0Xaa', '0x0', '0xgg', '0x00 01', ' 0x00', '0x00\n']) {
    assert.throws(() => decodeInput('hex', invalid), /Hex inválido/)
  }
  assert.throws(() => decodeInput('utf16', 'abc'), /UTF-8 o hexadecimal/)
  assert.throws(() => decodeInput('utf8', 1), /debe ser texto/)
  assert.throws(() => decodeInput('utf8', '\ud800'), /Unicode aislado/)
  assert.throws(() => decodeInput('utf8', '\udc00'), /Unicode aislado/)
})

test('fixture addresses derive from public scalars 4 and 5, not book keys', () => {
  assert.equal(bytesToHex(privateToAddress(SCALAR4)), EXPECTED_SIGNER)
  assert.equal(bytesToHex(privateToAddress(SCALAR5)), WRONG_SIGNER)
  assert.notEqual(EXPECTED_SIGNER, WRONG_SIGNER)
})

test('exact deterministic signature bytes match direct signing of frozen known Keccak digest', () => {
  const { hashes, signed } = signedFixture()
  // Independent call with a known digest catches accidental EIP-191, SHA3 or double hashing.
  const reference = secp256k1.sign(hexToBytes(EMPTY_KECCAK), SCALAR4, {
    prehash: false, lowS: true, extraEntropy: false, format: 'recovered',
  })
  const expectedBytes = `${bytesToHex(reference.subarray(1))}${(reference[0] + 27).toString(16)}`
  assert.equal(signed.signatureHex, expectedBytes)
  assert.equal(signed.signatureHex, `${signed.r}${signed.s.slice(2)}${signed.v.toString(16)}`)
  assert.equal(signed.signatureHex.length, 132)
  assert.equal(signed.r.length, 66)
  assert.equal(signed.s.length, 66)
  assert.ok(signed.v === 27 || signed.v === 28)
  assert.ok(BigInt(signed.s) > 0n && BigInt(signed.s) <= ORDER / 2n)
  assert.equal(signed.messageHex, '0x')
  assert.equal(signed.digest, EMPTY_KECCAK)
  assert.equal(signed.scheme, SCHEME)
  assert.equal(signed.expectedSigner, EXPECTED_SIGNER)
  assert.equal(signed.wrongExpectedSigner, WRONG_SIGNER)
  assert.deepEqual(signFrozenBytes({ messageHex: hashes.messageHex, digest: hashes.keccak256 }), signed)
  assert.ok(secp256k1.verify(hexToBytes(signed.signatureHex).subarray(0, 64), hexToBytes(EMPTY_KECCAK), secp256k1.getPublicKey(SCALAR4), { prehash: false, lowS: true }))
  assert.equal(secp256k1.verify(hexToBytes(signed.signatureHex).subarray(0, 64), sha3_256(new Uint8Array()), secp256k1.getPublicKey(SCALAR4), { prehash: false }), false)
  assert.ok(Object.isFrozen(signed))
  assert.ok(Object.isFrozen(hashes))
})

test('valid signatures verify against frozen expected signer and preserve exact source bytes', () => {
  for (const [encoding, value] of [['utf8', ''], ['utf8', 'Hola, ñ🦊'], ['hex', '0x00ff01']]) {
    const { signed } = signedFixture(encoding, value)
    const result = verifySignature(verificationFields(signed))
    assert.equal(result.verified, true)
    assert.equal(result.signatureValid, true)
    assert.equal(result.signerMatches, true)
    assert.equal(result.recoveredSigner, EXPECTED_SIGNER)
    assert.equal(result.expectedSigner, EXPECTED_SIGNER)
    assert.equal(result.messageHex, signed.messageHex)
    assert.equal(result.digest, signed.digest)
    assert.equal(result.signatureHex, signed.signatureHex)
    assert.ok(Object.isFrozen(result))
  }
})

test('message byte, valid changed scalar s, and wrong expected signer each fail actual verification; originals restore', () => {
  for (const value of ['', 'Hola, Ethereum', 'ñ🦊']) {
    const { signed } = signedFixture('utf8', value)
    const original = verificationFields(signed)
    const tamperedMessage = verifySignature({ ...original, messageHex: alterMessage(signed.messageHex) })
    assert.equal(tamperedMessage.verified, false)
    assert.equal(tamperedMessage.signerMatches, false)
    const tamperedSignature = alterSignature(signed.signatureHex)
    assert.notEqual(tamperedSignature, signed.signatureHex)
    assert.equal(tamperedSignature.length, signed.signatureHex.length)
    assert.equal(tamperedSignature.slice(0, 66), signed.r)
    assert.equal(tamperedSignature.slice(-2), signed.v.toString(16))
    const changed = verifySignature({ ...original, signatureHex: tamperedSignature })
    assert.equal(changed.verified, false)
    assert.equal(changed.signerMatches, false)
    const wrongSigner = verifySignature({ ...original, expectedSigner: WRONG_SIGNER })
    assert.equal(wrongSigner.signatureValid, true)
    assert.equal(wrongSigner.recoveredSigner, EXPECTED_SIGNER)
    assert.equal(wrongSigner.signerMatches, false)
    assert.equal(wrongSigner.verified, false)
    assert.equal(verifySignature(original).verified, true)
  }
  assert.equal(alterMessage('0x'), '0x01')
  assert.equal(alterMessage('0xc3b1'), '0xc2b1')
})

test('malformed signatures, invalid scalar ranges, wrong lengths and invalid addresses reject without fake results', () => {
  const { signed } = signedFixture()
  const fields = verificationFields(signed)
  for (const signatureHex of ['0x', '0x00', signed.signatureHex.slice(0, -2), `${signed.signatureHex}00`]) {
    assert.throws(() => verifySignature({ ...fields, signatureHex }), /65 bytes/)
  }
  assert.throws(() => verifySignature({ ...fields, signatureHex: '0xzz' }), /Hex inválido/)
  assert.throws(() => verifySignature({ ...fields, signatureHex: `${signed.signatureHex.slice(0, -2)}00` }), /v debe ser 27 o 28/)
  const zeroR = `0x${'0'.repeat(64)}${signed.s.slice(2)}${signed.v.toString(16)}`
  const zeroS = `${signed.r}${'0'.repeat(64)}${signed.v.toString(16)}`
  const tooLargeR = `0x${ORDER.toString(16)}${signed.s.slice(2)}${signed.v.toString(16)}`
  const highS = `${signed.r}${(ORDER - BigInt(signed.s)).toString(16).padStart(64, '0')}${signed.v.toString(16)}`
  for (const signatureHex of [zeroR, zeroS, tooLargeR, highS]) {
    assert.throws(() => verifySignature({ ...fields, signatureHex }), /Escalares inválidos/)
  }
  for (const expectedSigner of ['', '0x1234', '0x' + 'gg'.repeat(20), null]) {
    assert.throws(() => verifySignature({ ...fields, expectedSigner }), /dirección esperada/)
  }
  assert.throws(() => verifySignature({ ...fields, messageHex: '0x0' }), /Hex inválido/)
})

test('signing rejects edited digests and byte changes instead of silently signing different input', () => {
  assert.throws(() => signFrozenBytes({ messageHex: '0x', digest: EMPTY_SHA3 }), /digest no coincide/)
  assert.throws(() => signFrozenBytes({ messageHex: '0x01', digest: EMPTY_KECCAK }), /digest no coincide/)
  assert.throws(() => signFrozenBytes({ messageHex: '0x', digest: '0x00' }), /digest no coincide/)
  assert.throws(() => signFrozenBytes({ messageHex: '0x', digest: '0xgg' }), /Hex inválido/)
  assert.throws(() => signFrozenBytes({ messageHex: '0x', digest: `0x${'00'.repeat(33)}` }), /32 bytes/)
})

test('worker actions perform complete compare, sign, tamper, verify and restore without persisted state', () => {
  const hashes = dispatch({ action: 'compare', encoding: 'utf8', value: 'práctica' })
  const signed = dispatch({ action: 'sign', messageHex: hashes.messageHex, digest: hashes.keccak256 })
  const original = verificationFields(signed)
  for (const kind of ['message', 'signature', 'signer']) {
    const modified = dispatch({ action: 'tamper', ...original, kind })
    assert.equal(dispatch({ action: 'verify', ...modified }).verified, false)
  }
  const restored = dispatch({ action: 'tamper', ...original, kind: 'original' })
  assert.deepEqual(restored, original)
  assert.equal(dispatch({ action: 'verify', ...restored }).verified, true)
  assert.throws(() => dispatch({ action: 'tamper', ...original, kind: 'other' }), /caso de verificación válido/)
  assert.throws(() => dispatch({ action: 'tamper', ...original, expectedSigner: WRONG_SIGNER, kind: 'original' }), /firmante original/)
  assert.throws(() => dispatch({ action: 'eval', source: '1+1' }), /Acción desconocida/)
  for (const invalid of [null, [], 'compare']) assert.throws(() => dispatch(invalid), /Solicitud inválida/)
})
