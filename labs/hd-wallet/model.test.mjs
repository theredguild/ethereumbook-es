import test from 'node:test'
import assert from 'node:assert/strict'
import { HDKey, HARDENED_OFFSET } from '@scure/bip32'
import { mnemonicToEntropy, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { privateToAddress } from '@ethereumjs/util'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import {
  DEFAULT_PATH_A, DEFAULT_PATH_B, MAX_DEPTH, MAX_INDEX, MAX_PATH_LENGTH,
  PUBLIC_ENTROPY, PUBLIC_MNEMONIC, compareLab, deriveLab, deriveRoute,
  dispatch, ethereumAccount, parsePath, testPublicDerivation, validateRoutes,
} from './model.mjs'

// BIP-0032 test vector 1, independent of the invented lab entropy.
// https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki#test-vector-1
const vectorSeed = hexToBytes('000102030405060708090a0b0c0d0e0f')

test('BIP32 vector 1 root and hardened child agree with published chain codes and public keys', () => {
  const root = HDKey.fromMasterSeed(vectorSeed)
  assert.equal(bytesToHex(root.chainCode), '873dff81c02f525623fd1fe5167eac3a55a049de3d314bb42ee227ffed37d508')
  assert.equal(bytesToHex(root.publicKey), '0339a36013301597daef41fbe593a02cc513d0b55527ec2df1050e2e8ff49c85c2')
  assert.equal(root.publicExtendedKey, 'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8')
  const { node, tree } = deriveRoute(root, "m/0'")
  assert.equal(bytesToHex(node.chainCode), '47fdacbd0f1097043b78c63c20c34ef4ed9a111d980047ad16282c7ae6236141')
  assert.equal(bytesToHex(node.publicKey), '035a784662a4a20a65bf6aab9ae98a6c068a81c52e4b032c0fb5400c706cfccc56')
  assert.equal(node.publicExtendedKey, 'xpub68Gmy5EdvgibQVfPdqkBBCHxA5htiqg55crXYuXoQRKfDBFA1WEjWgP6LHhwBZeNK1VTsfTFUHCdrfp1bgwQ9xv5ski8PX9rL2dZXvgGDnw')
  assert.equal(node.index, HARDENED_OFFSET)
  assert.deepEqual(tree.map(({ path, hardened }) => ({ path, hardened })), [{ path: 'm', hardened: false }, { path: "m/0'", hardened: true }])
})

test('public fixture is 128-bit entropy encoded as valid English BIP39 with 64-byte seed', () => {
  assert.equal(PUBLIC_ENTROPY.length, 32)
  assert.equal(PUBLIC_MNEMONIC.split(' ').length, 12)
  assert.equal(validateMnemonic(PUBLIC_MNEMONIC, wordlist), true)
  assert.equal(bytesToHex(mnemonicToEntropy(PUBLIC_MNEMONIC, wordlist)), PUBLIC_ENTROPY)
  assert.equal(mnemonicToSeedSync(PUBLIC_MNEMONIC, '').length, 64)
})

test('Ethereum address hashes uncompressed X and Y, excluding 04 prefix', () => {
  const uncompressed = '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8'
  const compressed = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
  const expected = '0x7e5f4552091a69125d5dfcb7b8c2659029395bdf'
  const account = ethereumAccount(hexToBytes(uncompressed))
  assert.equal(account.address, expected)
  assert.equal(account.publicKey, `0x${uncompressed}`)
  assert.equal(account.keccak.slice(-40), expected.slice(2))
  assert.deepEqual(ethereumAccount(hexToBytes(compressed)), account)
  assert.deepEqual(ethereumAccount(hexToBytes(uncompressed.slice(2))), account)
})

test('default route derives real Ethereum address also obtained from independent private-key conversion', () => {
  const result = deriveLab(DEFAULT_PATH_A, DEFAULT_PATH_B)
  const independentlyDerived = HDKey.fromMasterSeed(mnemonicToSeedSync(PUBLIC_MNEMONIC, '')).derive(DEFAULT_PATH_A)
  assert.equal(result.account.address, `0x${bytesToHex(privateToAddress(independentlyDerived.privateKey))}`)
  assert.equal(result.tree.length, 6)
  assert.equal(result.tree.at(-1).path, DEFAULT_PATH_A)
  assert.equal(result.seedBytes, 64)
  assert.equal(result.account.path, DEFAULT_PATH_A)
  assert.equal(result.mnemonic, PUBLIC_MNEMONIC)
  assert.deepEqual(deriveLab(DEFAULT_PATH_A, DEFAULT_PATH_B), result)
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.account), true)
  assert.equal(Object.isFrozen(result.tree), true)
  assert.equal(result.tree.every(Object.isFrozen), true)
  assert.equal('privateKey' in result.account, false)
  assert.equal('seed' in result, false)
})

test('same route produces identical account and independent deterministic regeneration', () => {
  const result = compareLab(DEFAULT_PATH_A, DEFAULT_PATH_A)
  assert.equal(result.sameRoute, true)
  assert.equal(result.sameAddress, true)
  assert.equal(result.deterministic, true)
  assert.deepEqual(result.a, result.b)
  assert.deepEqual(result.a, result.regenerated)
  assert.notStrictEqual(result.a, result.regenerated)
})

test('account, change and address-index changes each produce different addresses', () => {
  for (const alternate of [DEFAULT_PATH_B, "m/44'/60'/0'/1/0", "m/44'/60'/0'/0/1"]) {
    const result = compareLab(DEFAULT_PATH_A, alternate)
    assert.equal(result.sameRoute, false)
    assert.equal(result.sameAddress, false)
    assert.notEqual(result.a.publicKey, result.b.publicKey)
    assert.equal(result.deterministic, true)
  }
})

test('xpub derives matching non-hardened child without private key and actual library rejects hardened child', () => {
  const result = testPublicDerivation(DEFAULT_PATH_A, DEFAULT_PATH_B)
  assert.equal(result.match, true)
  assert.equal(result.publicHasPrivateKey, false)
  assert.equal(result.childHasPrivateKey, false)
  assert.deepEqual(result.viaPrivate, result.viaPublic)
  assert.equal(result.viaPublic.path, `${DEFAULT_PATH_A}/0`)
  const publicOnly = HDKey.fromExtendedKey(result.xpub)
  assert.equal(publicOnly.privateKey, null)
  const child = publicOnly.deriveChild(0)
  assert.equal(child.privateKey, null)
  assert.equal(ethereumAccount(child.publicKey).address, result.viaPublic.address)
  assert.equal(result.hardenedRejected, true)
  assert.equal(result.hardenedPath, `${DEFAULT_PATH_A}/0'`)
  assert.throws(() => publicOnly.deriveChild(HARDENED_OFFSET), { message: result.rejection })
  assert.match(result.rejection, /hardened/i)
})

test('canonical paths accept hardened and non-hardened segments at bounded limits', () => {
  assert.deepEqual(parsePath("m/0/1000'"), [
    { index: 0, hardened: false, childIndex: 0, segment: '0' },
    { index: MAX_INDEX, hardened: true, childIndex: HARDENED_OFFSET + MAX_INDEX, segment: "1000'" },
  ])
  const deepest = `m${"/1000'".repeat(MAX_DEPTH)}`
  assert.equal(deepest.length, MAX_PATH_LENGTH)
  assert.equal(parsePath(deepest).length, MAX_DEPTH)
  assert.equal(deriveLab(deepest, 'm/0').tree.length, MAX_DEPTH + 1)
  assert.deepEqual(validateRoutes('m/0', deepest), { pathA: 'm/0', pathB: deepest })
})

test('noncanonical paths, excess depth and oversized indices reject before derivation', () => {
  const invalid = [undefined, null, 5, {}, '', 'm', 'M/0', "m'/0", 'm/', '/0', 'm//0', 'm/01', 'm/00', 'm/+1', 'm/-1', 'm/1.0', 'm/1e2', 'm/0h', 'm/0H', 'm/0′', "m/0''", 'm/ 0', ' m/0', 'm/0 ', 'm/0\n', 'm/0\r', 'm/0\u2028', 'm/0/\n1', 'm/1001', "m/1001'", 'm/2147483647', `m${'/0'.repeat(MAX_DEPTH + 1)}`, `m/${'9'.repeat(10000)}`]
  for (const path of invalid) {
    assert.throws(() => parsePath(path), Error, String(path))
    assert.throws(() => deriveLab(path, DEFAULT_PATH_B), Error, String(path))
    assert.throws(() => compareLab(DEFAULT_PATH_A, path), Error, String(path))
    assert.throws(() => testPublicDerivation(DEFAULT_PATH_A, path), Error, String(path))
  }
})

test('failed requests do not poison deterministic future requests or expose secret-input actions', () => {
  const routes = { pathA: DEFAULT_PATH_A, pathB: DEFAULT_PATH_B }
  const before = dispatch({ action: 'derive', ...routes })
  for (const action of ['derive', 'compare', 'xpub']) assert.throws(() => dispatch({ action, ...routes, pathB: 'm/01' }))
  for (const request of [null, [], { action: 'unknown', ...routes }, { action: 'derive', ...routes, mnemonic: PUBLIC_MNEMONIC }, { action: 'derive', ...routes, privateKey: '01' }]) assert.throws(() => dispatch(request))
  assert.deepEqual(dispatch({ action: 'derive', ...routes }), before)
  assert.equal(dispatch({ action: 'compare', ...routes }).deterministic, true)
  assert.equal(dispatch({ action: 'xpub', ...routes }).hardenedRejected, true)
})
