import artifact from '../shared/counter-artifact.json' with { type: 'json' }
import { createContractSession } from '../shared/evm.mjs'
import { callData, readResult } from '../shared/contracts.mjs'

export { artifact }

/** Actual VM only. Permission and consent belong to provider.mjs, outside Worker. */
export async function createDappModel() {
  const session = await createContractSession()
  let address

  async function state() {
    const value = await session.call({ actor: 'alice', to: address, data: callData(artifact.abi, 'value') })
    const owner = await session.call({ actor: 'alice', to: address, data: callData(artifact.abi, 'owner') })
    if (value.status !== 1 || owner.status !== 1) throw new Error('No se pudo verificar el estado del contrato.')
    return {
      address,
      value: readResult(artifact.abi, 'value', value.returnData).toString(),
      owner: readResult(artifact.abi, 'owner', owner.returnData),
      snapshot: await session.snapshot(),
      identity: { name: artifact.name, sourceHash: artifact.sourceHash, compiler: artifact.compiler, evmVersion: artifact.evmVersion },
    }
  }

  async function reset() {
    await session.reset()
    const deployment = await session.deploy(artifact, { actor: 'alice' })
    if (deployment.receipt.status !== 1 || !deployment.receipt.createdAddress) throw new Error('Falló el despliegue local de LabCounter.')
    address = deployment.receipt.createdAddress
    return state()
  }

  async function execute(action, fields = {}) {
    switch (action) {
      case 'reset': return reset()
      case 'state': return state()
      case 'call': {
        const call = await session.call({ actor: fields.actor, to: address, data: fields.data })
        return { call, state: await state() }
      }
      case 'send': {
        const result = await session.transact({ actor: fields.actor, to: address, data: fields.data, valueWei: '0', gasLimit: '1000000' })
        return { receipt: result.receipt, before: result.before, state: await state() }
      }
      default: throw new Error('Acción EVM local no admitida.')
    }
  }

  await reset()
  return { execute }
}
