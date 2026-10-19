export const ACCOUNTS = Object.freeze(['Alicia', 'Bruno', 'Carla'])
export const INITIAL_BALANCES = Object.freeze({ Alicia: 10, Bruno: 4, Carla: 0 })
export const DEFAULT_AMOUNTS = Object.freeze({ T1: 6, T2: 8 })
export const AMOUNT_LIMIT = 20

const NORMAL = Object.freeze(['T1', 'T2'])
const REVERSE = Object.freeze(['T2', 'T1'])
const STRICT_NORMAL = Object.freeze({ order: NORMAL, rule: 'strict' })
const STRICT_REVERSE = Object.freeze({ order: REVERSE, rule: 'strict' })
const ALTERED_REVERSE = Object.freeze({ order: REVERSE, rule: 'allow-negative' })

export const EXPERIMENTS = Object.freeze({
  same: Object.freeze({
    label: 'Mismo orden y mismas reglas',
    description: 'A y B ejecutan T1 → T2 con la regla estricta. No cambia ninguna condición.',
    A: STRICT_NORMAL,
    B: STRICT_NORMAL,
  }),
  order: Object.freeze({
    label: 'Cambiar solo el orden',
    description: 'A ejecuta T1 → T2 y B ejecuta T2 → T1. Ambas réplicas usan la regla estricta.',
    A: STRICT_NORMAL,
    B: STRICT_REVERSE,
  }),
  rule: Object.freeze({
    label: 'Cambiar solo la regla de saldo',
    description: 'A y B ejecutan T2 → T1. A rechaza el saldo insuficiente; B lo permite intencionalmente.',
    A: STRICT_REVERSE,
    B: ALTERED_REVERSE,
  }),
})

export function parseAmount(value, label = 'El importe') {
  const number = typeof value === 'string' && /^[0-9]{1,2}$/.test(value) ? Number(value) : value
  if (typeof number !== 'number' || !Number.isInteger(number) || number < 1 || number > AMOUNT_LIMIT) {
    throw new Error(`${label} debe ser un entero entre 1 y ${AMOUNT_LIMIT}, sin decimales ni notación exponencial.`)
  }
  return number
}

function amountsSnapshot(amounts) {
  if (!amounts || typeof amounts !== 'object') throw new Error('Faltan los importes de T1 y T2.')
  return Object.freeze({ T1: parseAmount(amounts.T1, 'T1'), T2: parseAmount(amounts.T2, 'T2') })
}

export function prepareExperiment({ experiment, amounts, prediction }) {
  if (!Object.hasOwn(EXPERIMENTS, experiment)) throw new Error('Elige un experimento disponible.')
  if (prediction !== 'equal' && prediction !== 'different') throw new Error('Predice si los saldos finales serán iguales o diferentes.')
  return Object.freeze({ experiment, amounts: amountsSnapshot(amounts), prediction, A: EXPERIMENTS[experiment].A, B: EXPERIMENTS[experiment].B })
}

/** Two bounded transfers, no gas, signatures, nonce, network or consensus. */
export function runLedger({ amounts = DEFAULT_AMOUNTS, order = NORMAL, rule = 'strict' } = {}) {
  const acceptedAmounts = amountsSnapshot(amounts)
  if (!Array.isArray(order) || order.length !== 2 || !((order[0] === 'T1' && order[1] === 'T2') || (order[0] === 'T2' && order[1] === 'T1'))) {
    throw new Error('El orden debe contener T1 y T2 exactamente una vez.')
  }
  if (rule !== 'strict' && rule !== 'allow-negative') throw new Error('La regla de saldo no está disponible.')
  const transactions = {
    T1: Object.freeze({ id: 'T1', from: 'Alicia', to: 'Bruno', amount: acceptedAmounts.T1 }),
    T2: Object.freeze({ id: 'T2', from: 'Bruno', to: 'Carla', amount: acceptedAmounts.T2 }),
  }
  let balances = INITIAL_BALANCES
  const trace = []
  for (const id of order) {
    const transaction = transactions[id]
    const before = balances
    const insufficient = before[transaction.from] < transaction.amount
    const accepted = !insufficient || rule === 'allow-negative'
    if (accepted) {
      balances = Object.freeze({
        ...before,
        [transaction.from]: before[transaction.from] - transaction.amount,
        [transaction.to]: before[transaction.to] + transaction.amount,
      })
    }
    trace.push(Object.freeze({
      transaction,
      before,
      after: balances,
      accepted,
      insufficient,
      reason: !accepted ? 'Saldo insuficiente: rechazo sin cambios.' : insufficient ? 'Regla alterada: se permite gastar sin saldo suficiente.' : 'Transferencia aceptada.',
      total: ACCOUNTS.reduce((sum, account) => sum + balances[account], 0),
      negativeAccounts: Object.freeze(ACCOUNTS.filter((account) => balances[account] < 0)),
    }))
  }
  return Object.freeze({
    rule,
    order: Object.freeze([...order]),
    amounts: acceptedAmounts,
    initial: INITIAL_BALANCES,
    balances,
    trace: Object.freeze(trace),
    total: ACCOUNTS.reduce((sum, account) => sum + balances[account], 0),
  })
}

export function executePrepared(setup, side) {
  if (side !== 'A' && side !== 'B') throw new Error('Elige la réplica A o B.')
  if (!setup || !Object.hasOwn(EXPERIMENTS, setup.experiment)) throw new Error('Primero congela una preparación válida.')
  const ledger = runLedger({ amounts: setup.amounts, ...setup[side] })
  return Object.freeze({ setup, side, ledger })
}

export function compareRuns(setup, a, b) {
  if (!setup || a?.setup !== setup || b?.setup !== setup || a?.side !== 'A' || b?.side !== 'B') {
    throw new Error('Ejecuta A y B con la preparación actual antes de comparar.')
  }
  const equal = ACCOUNTS.every((account) => a.ledger.balances[account] === b.ledger.balances[account])
  return Object.freeze({ equal, prediction: setup.prediction, correct: equal === (setup.prediction === 'equal') })
}
