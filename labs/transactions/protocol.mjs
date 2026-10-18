// Public educational addresses. Never send real funds to these accounts.
export const ADDRESSES = Object.freeze({
  sender: '0x7e5f4552091a69125d5dfcb7b8c2659029395bdf',
  recipient: '0x1000000000000000000000000000000000000001',
  reverter: '0x1000000000000000000000000000000000000002',
  exhaustor: '0x1000000000000000000000000000000000000003',
  beneficiary: '0x1000000000000000000000000000000000000004',
})

export const DEFAULT_INPUT = Object.freeze({
  to: ADDRESSES.recipient,
  value: '0.1',
  nonce: '0',
  data: '0x',
  gasLimit: '21000',
  maxFeePerGas: '30',
  maxPriorityFeePerGas: '2',
})

export const INITIAL_BASE_FEE = '10'
export const LIMITS = Object.freeze({ gas: 1_000_000, dataBytes: 4096, pending: 20, receipts: 20 })
