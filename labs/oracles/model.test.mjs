import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeReports, alterReports, canonicalReport, configure, DOMAIN, FEED, MAX_CLOCK, MAX_PRICE, REGISTRY, signReports } from './model.mjs'

const original = signReports()
const analyze = (reports = original.reports, clock = 1000) => analyzeReports({ reports, clock })

test('real signatures authenticate all three registered sources and aggregate honest prices', () => {
  const result = analyze()
  assert.equal(result.quorum, true)
  assert.equal(result.distinctSources, 3)
  assert.equal(result.median, 200000)
  assert.equal(result.difference, 0)
  assert.deepEqual(result.sortedPrices, [199000, 200000, 201000])
  for (const row of result.rows) {
    assert.equal(row.authenticated, true)
    assert.equal(row.verification.verified, true)
    assert.equal(row.verification.recoveredSigner, REGISTRY[row.report.source])
    assert.equal(row.ageSeconds, 10)
    assert.equal(row.fresh, true)
    assert.equal(row.counted, true)
  }
})

test('canonical domain/feed/source/price/timestamp bytes are deterministic and timestamp mandatory', () => {
  const report = { domain: DOMAIN, feed: FEED, source: 'A', price: 200000, timestamp: 990 }
  const encoded = canonicalReport(report)
  assert.equal(encoded.text, JSON.stringify([DOMAIN, FEED, 'A', 200000, 990]))
  assert.equal(new TextDecoder().decode(Uint8Array.from(Buffer.from(encoded.messageHex.slice(2), 'hex'))), encoded.text)
  assert.notEqual(canonicalReport({ ...report, timestamp: 991 }).messageHex, encoded.messageHex)
  assert.throws(() => canonicalReport({ ...report, timestamp: undefined }), /Marca de tiempo/)
  assert.throws(() => canonicalReport({ ...report, domain: 'otro-dominio' }), /Dominio/)
  assert.throws(() => canonicalReport({ ...report, feed: 'otro-feed' }), /feed/)
  const missingTime = analyze([{ ...original.reports[0], timestamp: undefined }, original.reports[1]])
  assert.equal(missingTime.rows[0].authenticated, false)
  assert.equal(missingTime.quorum, false)
})

test('price altered after signing fails source authentication while other sources still form quorum', () => {
  const reports = alterReports({ reports: original.reports, kind: 'price' })
  assert.equal(reports[0].price, 200001)
  assert.equal(reports[0].signatureHex, original.reports[0].signatureHex)
  const result = analyze(reports)
  assert.equal(result.rows[0].authenticated, false)
  assert.equal(result.rows[0].fresh, true)
  assert.equal(result.rows[0].counted, false)
  assert.equal(result.distinctSources, 2)
  assert.equal(result.median, 200000)
  assert.equal(original.reports[0].price, 200000)
})

test('timestamp altered after signing fails authentication even if altered date remains fresh', () => {
  const reports = alterReports({ reports: original.reports, kind: 'timestamp' })
  const result = analyze(reports)
  assert.equal(reports[0].timestamp, 991)
  assert.equal(reports[0].signatureHex, original.reports[0].signatureHex)
  assert.equal(result.rows[0].ageSeconds, 9)
  assert.equal(result.rows[0].fresh, true)
  assert.equal(result.rows[0].authenticated, false)
  assert.equal(result.distinctSources, 2)
})

test('wrong source and self-claimed expected signer cannot override fixed registry', () => {
  const reports = alterReports({ reports: original.reports, kind: 'source' })
  const result = analyze([{ ...reports[0], expectedSigner: REGISTRY.A }, ...reports.slice(1)])
  assert.equal(result.rows[0].authenticated, false)
  assert.equal(result.rows[0].verification.expectedSigner, REGISTRY.B)
  assert.equal(result.rows[1].authenticated, true)
  assert.equal(result.rows[1].counted, true)
  assert.equal(result.rows[1].duplicate, false)
  assert.equal(result.distinctSources, 2)
  assert.equal(result.median, 200000)
})

test('duplicate fresh valid source counts once and cannot create quorum by repetition', () => {
  const result = analyze(alterReports({ reports: original.reports, kind: 'duplicate' }))
  assert.equal(result.distinctSources, 3)
  assert.equal(result.rows[3].authenticated, true)
  assert.equal(result.rows[3].fresh, true)
  assert.equal(result.rows[3].duplicate, true)
  assert.equal(result.rows[3].counted, false)
  assert.equal(result.median, 200000)
  const repeatedOnly = analyze([original.reports[0], original.reports[0]])
  assert.equal(repeatedOnly.distinctSources, 1)
  assert.equal(repeatedOnly.quorum, false)
  assert.equal(repeatedOnly.median, null)
})

test('first valid fresh report wins, later valid reports from same source do not replace price', () => {
  const later = signReports({ prices: [900000, 201000, 199000], ages: [0, 0, 0] }).reports[0]
  const result = analyze([original.reports[0], later, original.reports[1]])
  assert.equal(result.rows[1].duplicate, true)
  assert.deepEqual(result.accepted.map((report) => report.price), [200000, 201000])
  assert.equal(result.median, 200500)
  const reverse = analyze([later, original.reports[0], original.reports[1]])
  assert.equal(reverse.accepted[0].price, 900000)
  assert.equal(reverse.median, 550500)
})

test('invalid or stale first report does not reserve source against later valid fresh report', () => {
  const freshA = signReports({ ages: [0, 0, 0] }).reports[0]
  const staleA = signReports({ ages: [61, 0, 0] }).reports[0]
  const invalidA = { ...freshA, price: freshA.price + 1 }
  for (const first of [staleA, invalidA]) {
    const result = analyze([first, freshA, original.reports[1]])
    assert.equal(result.rows[0].counted, false)
    assert.equal(result.rows[1].counted, true)
    assert.equal(result.rows[1].duplicate, false)
    assert.equal(result.distinctSources, 2)
  }
})

test('freshness includes 60 seconds but excludes 61 while preserving valid authentication', () => {
  const signed = signReports({ ages: [60, 61, 0] })
  const result = analyze(signed.reports)
  assert.deepEqual(result.rows.map((row) => row.authenticated), [true, true, true])
  assert.deepEqual(result.rows.map((row) => row.fresh), [true, false, true])
  assert.deepEqual(result.rows.map((row) => row.timeStatus), ['vigente', 'vencido', 'vigente'])
  assert.equal(result.quorum, true)
  assert.equal(result.median, 199500)
  const at60 = analyze(original.reports, 1050)
  const at61 = analyze(original.reports, 1051)
  assert.equal(at60.median, 200000)
  assert.equal(at61.quorum, false)
  assert.equal(at61.median, null)
  assert.equal(at61.difference, null)
})

test('future signed timestamps remain authentic but cannot contribute to quorum', () => {
  const signed = signReports({ clock: 1001, ages: [0, 0, 0] })
  const result = analyze(signed.reports, 1000)
  assert.ok(result.rows.every((row) => row.authenticated && !row.fresh && !row.counted))
  assert.ok(result.rows.every((row) => row.timeStatus === 'futuro' && row.ageSeconds === -1))
  assert.equal(result.distinctSources, 0)
  assert.equal(result.quorum, false)
  assert.equal(result.median, null)
})

test('stale preset loses quorum without presenting its remaining single price as valid aggregate', () => {
  const result = analyze(signReports({ preset: 'stale' }).reports)
  assert.equal(result.distinctSources, 1)
  assert.equal(result.quorum, false)
  assert.equal(result.median, null)
  assert.deepEqual(result.sortedPrices, [200000])
  assert.ok(result.rows.every((row) => row.authenticated))
})

test('authenticated lying reports show one-source median resistance and two-source failure', () => {
  const one = analyze(signReports({ preset: 'one-liar' }).reports)
  const two = analyze(signReports({ preset: 'two-liars' }).reports)
  assert.ok([...one.rows, ...two.rows].every((row) => row.authenticated && row.counted))
  assert.equal(one.median, 201000)
  assert.equal(one.difference, 1000)
  assert.equal(two.median, 900000)
  assert.equal(two.difference, 700000)
  assert.equal(two.quorum, true)
})

test('even-source medians round down fractional cent, independent of report order', () => {
  const signed = signReports({ prices: [200000, 200001, 199000], ages: [0, 0, 61] })
  const first = analyze(signed.reports)
  const second = analyze([...signed.reports].reverse())
  assert.equal(first.distinctSources, 2)
  assert.equal(first.median, 200000)
  assert.equal(second.median, 200000)
  assert.equal(first.difference, 0)
})

test('input bounds reject invalid prices, ages, clocks and report counts', () => {
  for (const price of [0, -1, MAX_PRICE + 1, 1.5, NaN, Infinity, '01', ' 1', '1e3', '', {}, null]) {
    assert.throws(() => configure({ prices: [price, 201000, 199000] }), /Precio/)
  }
  for (const age of [-1, 1001, 0.5, '01', '', null]) assert.throws(() => configure({ ages: [age, 0, 0] }), /Antigüedad/)
  assert.throws(() => configure({ clock: 0, ages: [1, 0, 0] }), /Antigüedad/)
  for (const clock of [-1, MAX_CLOCK + 1, 1.5, '', null]) assert.throws(() => configure({ clock }), /Reloj/)
  assert.throws(() => configure({ prices: [1, 2] }), /exactamente tres/)
  assert.throws(() => configure({ preset: 'unknown' }), /escenario/)
  assert.throws(() => analyzeReports({ reports: [], clock: 1000 }), /entre uno y seis/)
  assert.throws(() => analyzeReports({ reports: Array(7).fill(original.reports[0]) }), /entre uno y seis/)
  const edge = signReports({ prices: [1, MAX_PRICE, 2], ages: [0, 0, 0], clock: 0 })
  assert.equal(analyze(edge.reports, 0).median, 2)
  const upper = signReports({ clock: MAX_CLOCK, ages: [1000, 0, 0] })
  assert.equal(analyze(upper.reports, MAX_CLOCK).distinctSources, 2)
  const badPrice = analyze([{ ...original.reports[0], price: MAX_PRICE + 1 }, original.reports[1]])
  assert.equal(badPrice.rows[0].authenticated, false)
  assert.equal(badPrice.quorum, false)
})

test('accepted configuration, signed reports and aggregate snapshots remain immutable', () => {
  const prices = [200000, 201000, 199000]
  const ages = [10, 10, 10]
  const signed = signReports({ prices, ages })
  prices[0] = 900000
  ages[0] = 999
  assert.equal(signed.config.prices[0], 200000)
  assert.equal(signed.reports[0].timestamp, 990)
  assert.throws(() => { signed.reports[0].price = 1 }, TypeError)
  assert.throws(() => { signed.config.prices[0] = 1 }, TypeError)
  const mutableReports = signed.reports.map((report) => ({ ...report }))
  const result = analyze(mutableReports)
  mutableReports[0].price = 1
  mutableReports[0].source = 'C'
  assert.equal(result.accepted[0].price, 200000)
  assert.equal(result.accepted[0].source, 'A')
  assert.equal(result.rows[0].report.price, 200000)
  assert.throws(() => { result.accepted[0].price = 1 }, TypeError)
  assert.throws(() => { result.accepted.push({ source: 'A', price: 1 }) }, TypeError)
  assert.throws(() => signReports({ prices: [0, 1, 2] }), /Precio/)
  assert.equal(result.median, 200000)
  assert.equal(signed.reports[0].price, 200000)
})

test('restoring original reports and re-signing at advanced clock recover without changing old snapshots', () => {
  const tampered = alterReports({ reports: original.reports, kind: 'price' })
  assert.equal(analyze(tampered).rows[0].authenticated, false)
  const restored = alterReports({ reports: original.reports, kind: 'original' })
  assert.ok(analyze(restored).rows.every((row) => row.authenticated))
  const expired = analyze(original.reports, 1051)
  assert.equal(expired.quorum, false)
  const renewed = signReports({ ...original.config, clock: 1051, ages: [0, 0, 0] })
  const recovered = analyze(renewed.reports, 1051)
  assert.equal(recovered.quorum, true)
  assert.equal(recovered.median, 200000)
  assert.ok(recovered.rows.every((row) => row.ageSeconds === 0 && row.authenticated))
  assert.equal(expired.median, null)
  assert.equal(original.reports[0].timestamp, 990)
})
