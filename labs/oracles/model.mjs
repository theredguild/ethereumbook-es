import { bytesToHex, hexToBytes, privateToAddress } from '@ethereumjs/util'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { keccak_256 } from '@noble/hashes/sha3.js'
import { verifySignature } from '../cryptography/model.mjs'

// Original supplemental rules, not an implementation of any oracle protocol.
export const DOMAIN = 'TRG-LAB-ORACULOS/v1'
export const FEED = 'ETH-USD-FICTICIO'
export const REFERENCE_CENTS = 200000
export const MAX_PRICE = 1000000000
export const MAX_CLOCK = 1000000
export const FRESH_SECONDS = 60
export const QUORUM = 2
export const SOURCES = Object.freeze(['A', 'B', 'C'])
// Public educational fixtures, decimal scalars 11, 12 and 13. Never fund or import.
const KEYS = Object.freeze(Object.fromEntries(SOURCES.map((source, index) => [source, hexToBytes(`0x${(11 + index).toString(16).padStart(64, '0')}`)])))
export const REGISTRY = Object.freeze(Object.fromEntries(SOURCES.map((source) => [source, bytesToHex(privateToAddress(KEYS[source]))])))
const PRESETS = Object.freeze({
  honest: Object.freeze({ prices: Object.freeze([200000, 201000, 199000]), ages: Object.freeze([10, 10, 10]) }),
  'one-liar': Object.freeze({ prices: Object.freeze([900000, 201000, 199000]), ages: Object.freeze([10, 10, 10]) }),
  'two-liars': Object.freeze({ prices: Object.freeze([900000, 910000, 199000]), ages: Object.freeze([10, 10, 10]) }),
  stale: Object.freeze({ prices: Object.freeze([200000, 201000, 199000]), ages: Object.freeze([10, 61, 61]) }),
})

function integer(value, minimum, maximum, label) {
  if (typeof value === 'string') {
    if (!/^(0|[1-9][0-9]{0,9})$/.test(value)) throw new Error(`${label}: usa un entero decimal sin espacios ni ceros iniciales.`)
    value = Number(value)
  }
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new Error(`${label}: el entero debe estar entre ${minimum} y ${maximum}.`)
  return value
}

export function configure({ preset = 'honest', prices, ages, clock = 1000 } = {}) {
  if (!Object.hasOwn(PRESETS, preset)) throw new Error('El escenario no está disponible.')
  const acceptedClock = integer(clock, 0, MAX_CLOCK, 'Reloj educativo')
  const selected = PRESETS[preset]
  const inputPrices = prices ?? selected.prices
  const inputAges = ages ?? selected.ages
  if (!Array.isArray(inputPrices) || inputPrices.length !== 3 || !Array.isArray(inputAges) || inputAges.length !== 3) throw new Error('Configura exactamente tres precios y tres antigüedades, en orden A, B, C.')
  return Object.freeze({
    preset, clock: acceptedClock,
    prices: Object.freeze(inputPrices.map((value) => integer(value, 1, MAX_PRICE, 'Precio en centavos'))),
    ages: Object.freeze(inputAges.map((value) => integer(value, 0, Math.min(1000, acceptedClock), 'Antigüedad en segundos'))),
  })
}

function reportFields(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) throw new Error('El reporte debe ser un objeto.')
  if (report.domain !== DOMAIN || report.feed !== FEED) throw new Error('Dominio o feed ajeno a este laboratorio.')
  if (!SOURCES.includes(report.source)) throw new Error('La fuente no pertenece al registro A, B, C.')
  return Object.freeze({
    domain: DOMAIN, feed: FEED, source: report.source,
    price: integer(report.price, 1, MAX_PRICE, 'Precio en centavos'),
    timestamp: integer(report.timestamp, 0, MAX_CLOCK, 'Marca de tiempo firmada'),
  })
}

export function canonicalReport(report) {
  const fields = reportFields(report)
  // Canonical UTF-8 JSON array: fixed order, no spaces, numeric integers, no prefix.
  const text = JSON.stringify([fields.domain, fields.feed, fields.source, fields.price, fields.timestamp])
  return Object.freeze({ text, messageHex: bytesToHex(new TextEncoder().encode(text)) })
}

export function signReports(input = {}) {
  const config = configure(input)
  const reports = SOURCES.map((source, index) => {
    const report = { domain: DOMAIN, feed: FEED, source, price: config.prices[index], timestamp: config.clock - config.ages[index] }
    const canonical = canonicalReport(report)
    const digest = keccak_256(hexToBytes(canonical.messageHex))
    const signature = secp256k1.sign(digest, KEYS[source], { prehash: false, lowS: true, extraEntropy: false, format: 'recovered' })
    if (signature[0] > 1) throw new Error('Identificador de recuperación no admitido por el ejercicio.')
    const signatureHex = `${bytesToHex(signature.subarray(1))}${(signature[0] + 27).toString(16)}`
    return Object.freeze({ ...report, signatureHex })
  })
  return Object.freeze({ config, reports: Object.freeze(reports), registry: REGISTRY })
}

export function analyzeReports({ reports, clock = 1000 } = {}) {
  const acceptedClock = integer(clock, 0, MAX_CLOCK, 'Reloj educativo')
  if (!Array.isArray(reports) || reports.length < 1 || reports.length > 6) throw new Error('Analiza entre uno y seis reportes.')
  const accepted = []
  const seen = new Set()
  const rows = reports.map((input, index) => {
    const report = Object.freeze({ domain: input?.domain, feed: input?.feed, source: input?.source, price: input?.price, timestamp: input?.timestamp, signatureHex: input?.signatureHex })
    let fields
    let canonical
    try { fields = reportFields(report); canonical = canonicalReport(fields) } catch (cause) {
      return Object.freeze({ index, report, authenticated: false, fresh: false, counted: false, duplicate: false, ageSeconds: null, timeStatus: 'inválido', reason: cause.message, verification: null })
    }
    const ageSeconds = acceptedClock - fields.timestamp
    const fresh = ageSeconds >= 0 && ageSeconds <= FRESH_SECONDS
    const timeStatus = ageSeconds < 0 ? 'futuro' : fresh ? 'vigente' : 'vencido'
    let verification = null
    let failure = ''
    try {
      verification = verifySignature({ messageHex: canonical.messageHex, signatureHex: report.signatureHex, expectedSigner: REGISTRY[fields.source] })
    } catch (cause) { failure = cause.message }
    const authenticated = verification?.verified === true
    const duplicate = authenticated && fresh && seen.has(fields.source)
    const counted = authenticated && fresh && !duplicate
    if (counted) {
      seen.add(fields.source)
      accepted.push(Object.freeze({ source: fields.source, price: fields.price, timestamp: fields.timestamp }))
    }
    const reason = !authenticated ? failure || 'Firma no válida para la fuente registrada.' : !fresh ? timeStatus === 'futuro' ? 'Marca de tiempo futura: no se cuenta.' : 'Antigüedad mayor que 60 s: no se cuenta.' : duplicate ? 'Fuente repetida: solo cuenta su primer reporte válido y vigente.' : 'Fuente autenticada y vigente: se cuenta.'
    return Object.freeze({ index, report, authenticated, fresh, counted, duplicate, ageSeconds, timeStatus, reason, canonical, verification })
  })
  const sortedPrices = Object.freeze(accepted.map((report) => report.price).sort((left, right) => left - right))
  const quorum = accepted.length >= QUORUM
  const middle = Math.floor(sortedPrices.length / 2)
  const median = !quorum ? null : sortedPrices.length % 2 ? sortedPrices[middle] : Math.floor((sortedPrices[middle - 1] + sortedPrices[middle]) / 2)
  return Object.freeze({
    clock: acceptedClock, rows: Object.freeze(rows), accepted: Object.freeze(accepted), sortedPrices,
    distinctSources: accepted.length, quorum, median, reference: REFERENCE_CENTS,
    difference: median === null ? null : median - REFERENCE_CENTS,
    rounding: 'Con cantidad par, promedio de los dos valores centrales y redondeo hacia abajo al centavo entero.',
    policy: 'En orden de llegada, cuenta solo el primer reporte válido y vigente de cada fuente.',
  })
}

export function alterReports({ reports, kind } = {}) {
  if (!Array.isArray(reports) || reports.length !== 3) throw new Error('Usa los tres reportes originales para preparar el caso.')
  const copy = reports.map((report) => Object.freeze({ ...reportFields(report), signatureHex: report.signatureHex }))
  if (kind === 'price') copy[0] = Object.freeze({ ...copy[0], price: copy[0].price === MAX_PRICE ? MAX_PRICE - 1 : copy[0].price + 1 })
  else if (kind === 'timestamp') copy[0] = Object.freeze({ ...copy[0], timestamp: copy[0].timestamp === MAX_CLOCK ? MAX_CLOCK - 1 : copy[0].timestamp + 1 })
  else if (kind === 'source') copy[0] = Object.freeze({ ...copy[0], source: 'B' })
  else if (kind === 'duplicate') copy.push(Object.freeze({ ...copy[0] }))
  else if (kind !== 'original') throw new Error('Elige un caso de alteración válido.')
  return Object.freeze(copy)
}

export function dispatch(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('Solicitud inválida.')
  switch (request.action) {
    case 'configure': return configure(request)
    case 'sign': return signReports(request)
    case 'analyze': return analyzeReports(request)
    case 'alter': return alterReports(request)
    default: throw new Error('Acción no disponible.')
  }
}
