import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ACCOUNTS, AMOUNT_LIMIT, DEFAULT_AMOUNTS, INITIAL_BALANCES,
  compareRuns, executePrepared, parseAmount, prepareExperiment, runLedger,
} from './model.mjs'

const prepare = (experiment = 'same', prediction = 'equal', amounts = DEFAULT_AMOUNTS) => prepareExperiment({ experiment, prediction, amounts })

function executePair(setup) {
  return [executePrepared(setup, 'A'), executePrepared(setup, 'B')]
}

test('strict normal order transfers 6 then 8 and ends at 4/2/8', () => {
  const result = runLedger()
  assert.deepEqual(result.balances, { Alicia: 4, Bruno: 2, Carla: 8 })
  assert.deepEqual(result.trace.map((entry) => entry.accepted), [true, true])
  assert.deepEqual(result.trace[0].after, { Alicia: 4, Bruno: 10, Carla: 0 })
  assert.equal(result.total, 14)
})

test('strict reverse order rejects T2 without changing any balance', () => {
  const result = runLedger({ order: ['T2', 'T1'] })
  assert.deepEqual(result.balances, { Alicia: 4, Bruno: 10, Carla: 0 })
  assert.equal(result.trace[0].transaction.id, 'T2')
  assert.equal(result.trace[0].accepted, false)
  assert.equal(result.trace[0].insufficient, true)
  assert.strictEqual(result.trace[0].before, result.trace[0].after)
  assert.deepEqual(result.trace[0].after, INITIAL_BALANCES)
  assert.equal(result.trace[1].accepted, true)
})

test('same rules and order reproduce every transition, including rejection', () => {
  for (const order of [['T1', 'T2'], ['T2', 'T1']]) {
    for (const rule of ['strict', 'allow-negative']) {
      const options = { order, rule, amounts: { T1: 11, T2: 17 } }
      assert.deepEqual(runLedger(options), runLedger(options))
    }
  }
})

test('altered reverse rule exposes negative intermediate and different transition', () => {
  const strict = runLedger({ order: ['T2', 'T1'] })
  const altered = runLedger({ order: ['T2', 'T1'], rule: 'allow-negative' })
  assert.deepEqual(strict.order, altered.order)
  assert.equal(altered.trace[0].accepted, true)
  assert.equal(altered.trace[0].insufficient, true)
  assert.deepEqual(altered.trace[0].after, { Alicia: 10, Bruno: -4, Carla: 8 })
  assert.deepEqual(altered.trace[0].negativeAccounts, ['Bruno'])
  assert.deepEqual(altered.balances, { Alicia: 4, Bruno: 2, Carla: 8 })
  assert.notDeepEqual(strict.balances, altered.balances)
})

test('experiments isolate order from rules', () => {
  const same = prepare('same')
  assert.deepEqual(same.A, same.B)
  const order = prepare('order', 'different')
  assert.equal(order.A.rule, order.B.rule)
  assert.notDeepEqual(order.A.order, order.B.order)
  const rule = prepare('rule', 'different')
  assert.deepEqual(rule.A.order, ['T2', 'T1'])
  assert.deepEqual(rule.A.order, rule.B.order)
  assert.notEqual(rule.A.rule, rule.B.rule)
})

test('comparison checks actual balances and chosen prediction', () => {
  for (const [experiment, equal] of [['same', true], ['order', false], ['rule', false]]) {
    const correct = prepare(experiment, equal ? 'equal' : 'different')
    assert.deepEqual(compareRuns(correct, ...executePair(correct)), { equal, prediction: correct.prediction, correct: true })
    const incorrect = prepare(experiment, equal ? 'different' : 'equal')
    assert.equal(compareRuns(incorrect, ...executePair(incorrect)).correct, false)
  }
})

test('edited amounts genuinely change order and rule comparisons', () => {
  for (const experiment of ['order', 'rule']) {
    const setup = prepare(experiment, 'equal', { T1: 6, T2: 4 })
    const [a, b] = executePair(setup)
    assert.deepEqual(a.ledger.balances, { Alicia: 4, Bruno: 6, Carla: 4 })
    assert.deepEqual(b.ledger.balances, a.ledger.balances)
    assert.equal(compareRuns(setup, a, b).equal, true)
  }
})

test('maximum amounts exercise rejection and intentionally negative balances', () => {
  const strict = runLedger({ amounts: { T1: 20, T2: 20 } })
  assert.deepEqual(strict.balances, INITIAL_BALANCES)
  assert.deepEqual(strict.trace.map((entry) => entry.accepted), [false, false])
  const altered = runLedger({ amounts: { T1: 20, T2: 20 }, rule: 'allow-negative' })
  assert.deepEqual(altered.balances, { Alicia: -10, Bruno: 4, Carla: 20 })
  assert.equal(altered.total, 14)
})

test('all bounded amounts conserve 14 units, and strict states stay nonnegative', () => {
  for (let T1 = 1; T1 <= AMOUNT_LIMIT; T1++) {
    for (let T2 = 1; T2 <= AMOUNT_LIMIT; T2++) {
      for (const order of [['T1', 'T2'], ['T2', 'T1']]) {
        for (const rule of ['strict', 'allow-negative']) {
          const result = runLedger({ amounts: { T1, T2 }, order, rule })
          assert.equal(result.total, 14)
          for (const entry of result.trace) {
            assert.equal(entry.total, 14)
            assert.equal(ACCOUNTS.reduce((sum, account) => sum + entry.after[account], 0), 14)
            if (rule === 'strict') assert.deepEqual(entry.negativeAccounts, [])
            if (!entry.accepted) assert.deepEqual(entry.before, entry.after)
          }
        }
      }
    }
  }
})

test('caller inputs remain unchanged and later edits cannot rewrite snapshots', () => {
  const amounts = { T1: 6, T2: 8 }
  const order = ['T1', 'T2']
  const setup = prepare('same', 'equal', amounts)
  const result = runLedger({ amounts, order })
  assert.deepEqual(amounts, DEFAULT_AMOUNTS)
  assert.deepEqual(order, ['T1', 'T2'])
  amounts.T1 = 1
  order.reverse()
  assert.equal(setup.amounts.T1, 6)
  assert.deepEqual(result.order, ['T1', 'T2'])
  assert.deepEqual(result.trace[0].before, INITIAL_BALANCES)
  assert.deepEqual(result.trace[0].after, { Alicia: 4, Bruno: 10, Carla: 0 })
  assert.deepEqual(INITIAL_BALANCES, { Alicia: 10, Bruno: 4, Carla: 0 })
})

test('prepared snapshots, results and nested traces are immutable', () => {
  const setup = prepare()
  const result = executePrepared(setup, 'A')
  assert.throws(() => { setup.amounts.T1 = 2 }, TypeError)
  assert.throws(() => { setup.A.order.reverse() }, TypeError)
  assert.throws(() => { result.ledger.balances.Alicia = 99 }, TypeError)
  assert.throws(() => { result.ledger.trace.push({}) }, TypeError)
  assert.throws(() => { result.ledger.trace[0].transaction.amount = 99 }, TypeError)
  assert.throws(() => { result.ledger.trace[0].after.Bruno = 99 }, TypeError)
  assert.throws(() => { result.ledger.trace[0].negativeAccounts.push('Alicia') }, TypeError)
})

test('invalid amounts reject without changing previous accepted preparation', () => {
  const previous = prepare()
  for (const value of ['', ' ', '1.5', '1e1', '0x10', '-1', '21', '100', 0, -1, 1.5, 21, NaN, Infinity, null, undefined, {}, true]) {
    assert.throws(() => parseAmount(value), /entero entre 1 y 20/)
    assert.throws(() => prepare('same', 'equal', { T1: value, T2: 8 }))
    assert.throws(() => runLedger({ amounts: { T1: 6, T2: value } }))
  }
  assert.equal(parseAmount('20'), 20)
  assert.equal(parseAmount(1), 1)
  assert.deepEqual(previous.amounts, DEFAULT_AMOUNTS)
})

test('invalid order, rule, experiment and prediction reject', () => {
  for (const order of [[], ['T1'], ['T1', 'T1'], ['T2', 'T2'], ['T1', 'T3'], ['T1', 'T2', 'T1'], ['T1', ,], new Array(2), 'T1,T2', null]) {
    assert.throws(() => runLedger({ order }), /orden/)
  }
  assert.throws(() => runLedger({ rule: 'unknown' }), /regla/)
  assert.throws(() => prepare('unknown'), /experimento/)
  assert.throws(() => prepare('__proto__'), /experimento/)
  assert.throws(() => prepare('same', ''), /Predice/)
  assert.throws(() => executePrepared(prepare(), 'C'), /réplica/)
})

test('comparison refuses missing, swapped and stale results, even for identical inputs', () => {
  const setup = prepare()
  const [a, b] = executePair(setup)
  assert.throws(() => compareRuns(setup, a, null), /preparación actual/)
  assert.throws(() => compareRuns(setup, b, a), /preparación actual/)
  const next = prepare()
  assert.throws(() => compareRuns(next, a, b), /preparación actual/)
  assert.throws(() => compareRuns(next, executePrepared(next, 'A'), b), /preparación actual/)
})
