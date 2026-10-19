import test from 'node:test'
import assert from 'node:assert/strict'
import { createTokensModel, normalizeIntent, uint256, UINT256_MAX, ZERO_ADDRESS, validSnapshot } from './model.mjs'

async function fresh() {
  const model = await createTokensModel()
  const { snapshot } = await model.dispatch({ action: 'start' })
  assert.equal(validSnapshot(snapshot), true)
  return model
}
const ft = (action, fields = {}) => ({ mode: 'erc20', action, actor: 'alice', from: 'alice', to: 'bob', amount: '10', ...fields })
const nft = (action, fields = {}) => ({ mode: 'erc721', action, actor: 'alice', from: 'alice', to: 'bob', tokenId: '1', approved: true, ...fields })
async function send(model, draft) {
  const { prepared } = await model.dispatch({ action: 'prepare', draft })
  const result = await model.dispatch({ action: 'execute', intentId: prepared.id, run: prepared.run })
  assert.equal(validSnapshot(result.snapshot), true)
  const index = ['alice', 'bob', 'carol'].indexOf(draft.actor)
  assert.equal(BigInt(result.snapshot.evm.actors[index].nonce), BigInt(result.before.evm.actors[index].nonce) + 1n)
  assert.equal(BigInt(result.before.evm.actors[index].balanceWei) - BigInt(result.snapshot.evm.actors[index].balanceWei), BigInt(result.receipt.feeWei))
  assert.equal(BigInt(result.receipt.feeWei), BigInt(result.receipt.gasUsed) * 12000000000n)
  assert.equal(result.snapshot.erc20.balances.reduce((a, b) => a + b, 0n), result.snapshot.erc20.totalSupply)
  return result
}
function event(result, name) {
  const found = result.events.find((item) => item.decoded?.eventName === name)
  assert.ok(found, `Expected actual ${name} log`)
  return found.decoded.args
}
function assetsUnchanged(result) {
  assert.equal(result.receipt.status, 0)
  assert.deepEqual(result.snapshot.erc20, result.before.erc20)
  assert.deepEqual(result.snapshot.erc721, result.before.erc721)
  assert.deepEqual(result.receipt.logs, [])
  assert.deepEqual(result.events, [])
}

test('decimal uint256 amounts preserve precision and include zero', () => {
  assert.equal(uint256('0'), 0n)
  assert.equal(uint256('9007199254740993'), 9007199254740993n)
  assert.equal(uint256(UINT256_MAX.toString()), UINT256_MAX)
  for (const text of ['-1', '1.0', '1e3', '', ' 1', '+1', (UINT256_MAX + 1n).toString()]) assert.throws(() => uint256(text))
  assert.equal(normalizeIntent(ft('transfer', { amount: '0' })).amount, '0')
  assert.throws(() => normalizeIntent(ft('transfer', { to: '0x0000000000000000000000000000000000000001' })))
})

test('deployment mints whole units and distinct NFT IDs; Alice pays for two deployments', async () => {
  const model = await fresh()
  const state = await model.snapshot()
  assert.deepEqual(state.erc20.balances, [1000n, 0n, 0n])
  assert.equal(state.erc20.totalSupply, 1000n)
  assert.equal(state.erc20.decimals, 0)
  assert.deepEqual(state.erc721.counts, [2n, 0n, 0n])
  assert.equal(state.erc721.tokens[0].owner.toLowerCase(), state.evm.actors[0].address)
  assert.equal(state.erc721.tokens[1].owner.toLowerCase(), state.evm.actors[0].address)
  assert.equal(state.evm.actors[0].nonce, '2')
  assert.equal(state.evm.actors[1].nonce, '0')
  const deploymentFees = state.evm.receipts.reduce((sum, receipt) => sum + BigInt(receipt.feeWei), 0n)
  assert.equal(BigInt(state.evm.actors[0].balanceWei), 100n * 10n ** 18n - deploymentFees)
})

test('approve 10 changes only allowance; Bob spends 7 leaving 3; revoke then spend reverts with fee', async () => {
  const model = await fresh()
  const approved = await send(model, ft('approve'))
  assert.equal(approved.receipt.status, 1)
  assert.deepEqual(approved.snapshot.erc20.balances, approved.before.erc20.balances)
  assert.equal(approved.snapshot.erc20.allowances[0][1], 10n)
  assert.equal(event(approved, 'Approval').value, 10n)
  const spent = await send(model, ft('transferFrom', { actor: 'bob', to: 'carol', amount: '7' }))
  assert.equal(spent.receipt.status, 1)
  assert.deepEqual(spent.snapshot.erc20.balances, [993n, 0n, 7n])
  assert.equal(spent.snapshot.erc20.allowances[0][1], 3n)
  const transfer = event(spent, 'Transfer')
  assert.equal(transfer.value, 7n)
  assert.equal(transfer.from.toLowerCase(), spent.before.evm.actors[0].address)
  assert.equal(transfer.to.toLowerCase(), spent.before.evm.actors[2].address)
  const revoked = await send(model, ft('approve', { amount: '0' }))
  assert.equal(revoked.snapshot.erc20.allowances[0][1], 0n)
  assert.equal(event(revoked, 'Approval').value, 0n)
  const denied = await send(model, ft('transferFrom', { actor: 'bob', to: 'carol', amount: '1' }))
  assetsUnchanged(denied)
  assert.match(denied.error, /ERC20InsufficientAllowance/)
})

test('direct transfers and zero transfers emit real Transfer events and conserve supply', async () => {
  const model = await fresh()
  const moved = await send(model, ft('transfer', { to: 'carol', amount: '11' }))
  assert.equal(moved.receipt.status, 1)
  assert.deepEqual(moved.snapshot.erc20.balances, [989n, 0n, 11n])
  assert.equal(event(moved, 'Transfer').value, 11n)
  const zero = await send(model, ft('transfer', { actor: 'bob', to: 'carol', amount: '0' }))
  assert.equal(zero.receipt.status, 1)
  assert.deepEqual(zero.snapshot.erc20, zero.before.erc20)
  assert.equal(event(zero, 'Transfer').value, 0n)
  const delegatedZero = await send(model, ft('transferFrom', { actor: 'bob', to: 'carol', amount: '0' }))
  assert.equal(delegatedZero.receipt.status, 1)
  assert.equal(event(delegatedZero, 'Transfer').value, 0n)
})

test('insufficient token balance and insufficient allowance are included reversions', async () => {
  const model = await fresh()
  const noBalance = await send(model, ft('transfer', { actor: 'carol', amount: '1' }))
  assetsUnchanged(noBalance)
  assert.match(noBalance.error, /ERC20InsufficientBalance/)
  await send(model, ft('approve', { amount: '10' }))
  const noAllowance = await send(model, ft('transferFrom', { actor: 'bob', to: 'carol', amount: '11' }))
  assetsUnchanged(noAllowance)
  assert.match(noAllowance.error, /ERC20InsufficientAllowance/)
  await send(model, ft('approve', { amount: '1001' }))
  const delegatedNoBalance = await send(model, ft('transferFrom', { actor: 'bob', to: 'carol', amount: '1001' }))
  assetsUnchanged(delegatedNoBalance)
  assert.equal(delegatedNoBalance.snapshot.erc20.allowances[0][1], 1001n)
  assert.match(delegatedNoBalance.error, /ERC20InsufficientBalance/)
})

test('large finite allowance spends precisely without Number rounding', async () => {
  const model = await fresh()
  await send(model, ft('approve', { amount: '9007199254740993' }))
  const result = await send(model, ft('transferFrom', { actor: 'bob', to: 'carol', amount: '7' }))
  assert.equal(result.snapshot.erc20.allowances[0][1], 9007199254740986n)
})

test('insufficient native admission and intrinsic gas failure preserve nonce, fees, receipts and assets', async () => {
  const model = await fresh()
  for (const fields of [{ valueWei: (100n * 10n ** 18n).toString() }, { gasLimit: '1000' }]) {
    const { prepared } = await model.dispatch({ action: 'prepare', draft: ft('transfer', fields) })
    const before = await model.snapshot()
    await assert.rejects(model.dispatch({ action: 'execute', intentId: prepared.id, run: prepared.run }), /no se incluyó/)
    assert.deepEqual(await model.snapshot(), before)
    await assert.rejects(model.dispatch({ action: 'execute', intentId: prepared.id, run: prepared.run }), /Intención vencida/)
  }
})

test('native ETH attached to nonpayable token method reverts after inclusion', async () => {
  const model = await fresh()
  const failed = await send(model, ft('transfer', { valueWei: '1' }))
  assetsUnchanged(failed)
})

test('single NFT approval does not transfer; unauthorized Carol reverts; Bob transfers and clears approval', async () => {
  const model = await fresh()
  const approved = await send(model, nft('approve'))
  assert.equal(approved.receipt.status, 1)
  assert.deepEqual(approved.snapshot.erc721.counts, [2n, 0n, 0n])
  assert.equal(approved.snapshot.erc721.tokens[0].approved.toLowerCase(), approved.snapshot.evm.actors[1].address)
  assert.equal(event(approved, 'Approval').tokenId, 1n)
  const denied = await send(model, nft('transferFrom', { actor: 'carol', to: 'carol' }))
  assetsUnchanged(denied)
  assert.match(denied.error, /ERC721InsufficientApproval/)
  const moved = await send(model, nft('transferFrom', { actor: 'bob', to: 'carol' }))
  assert.equal(moved.receipt.status, 1)
  assert.equal(moved.snapshot.erc721.tokens[0].owner.toLowerCase(), moved.snapshot.evm.actors[2].address)
  assert.equal(moved.snapshot.erc721.tokens[0].approved, ZERO_ADDRESS)
  assert.deepEqual(moved.snapshot.erc721.tokens[1], moved.before.erc721.tokens[1])
  assert.deepEqual(moved.snapshot.erc721.counts, [1n, 0n, 1n])
  const transfer = event(moved, 'Transfer')
  assert.equal(transfer.tokenId, 1n)
  assert.equal(transfer.from.toLowerCase(), moved.snapshot.evm.actors[0].address)
  assert.equal(transfer.to.toLowerCase(), moved.snapshot.evm.actors[2].address)
})

test('revoking one NFT approval differs from operator permission', async () => {
  const model = await fresh()
  await send(model, nft('approve'))
  const revoked = await send(model, nft('approve', { to: 'none' }))
  assert.equal(event(revoked, 'Approval').approved, ZERO_ADDRESS)
  assert.equal(revoked.snapshot.erc721.tokens[0].approved, ZERO_ADDRESS)
  const denied = await send(model, nft('transferFrom', { actor: 'bob', to: 'carol' }))
  assetsUnchanged(denied)
  const operator = await send(model, nft('setApprovalForAll'))
  assert.equal(event(operator, 'ApprovalForAll').approved, true)
  assert.equal(operator.snapshot.erc721.operators[0][1], true)
  assert.equal(operator.snapshot.erc721.tokens[1].approved, ZERO_ADDRESS)
  const moved = await send(model, nft('transferFrom', { actor: 'bob', to: 'carol', tokenId: '2' }))
  assert.equal(moved.receipt.status, 1)
  assert.equal(moved.snapshot.erc721.tokens[1].owner.toLowerCase(), moved.snapshot.evm.actors[2].address)
})

test('operator true/false changes only owner permission; previous owner operator cannot move Carol NFT', async () => {
  const model = await fresh()
  await send(model, nft('setApprovalForAll'))
  const moved = await send(model, nft('transferFrom', { actor: 'bob', to: 'carol' }))
  assert.equal(moved.receipt.status, 1)
  const formerOperator = await send(model, nft('transferFrom', { actor: 'bob', from: 'carol', to: 'alice' }))
  assetsUnchanged(formerOperator)
  assert.equal(formerOperator.snapshot.erc721.operators[0][1], true)
  assert.equal(formerOperator.snapshot.erc721.operators[2][1], false)
  const revoked = await send(model, nft('setApprovalForAll', { approved: false }))
  assert.equal(revoked.snapshot.erc721.operators[0][1], false)
  assert.equal(event(revoked, 'ApprovalForAll').approved, false)
  const denied = await send(model, nft('transferFrom', { actor: 'bob', to: 'carol', tokenId: '2' }))
  assetsUnchanged(denied)
  const carolGrants = await send(model, nft('setApprovalForAll', { actor: 'carol' }))
  assert.equal(carolGrants.snapshot.erc721.operators[2][1], true)
  const bobCanNowMove = await send(model, nft('transferFrom', { actor: 'bob', from: 'carol', to: 'alice' }))
  assert.equal(bobCanNowMove.receipt.status, 1)
})

test('wrong declared NFT owner never gets corrected, even for authorized signer', async () => {
  const model = await fresh()
  await send(model, nft('approve'))
  const wrong = await send(model, nft('transferFrom', { actor: 'bob', from: 'carol', to: 'bob' }))
  assetsUnchanged(wrong)
  assert.equal(wrong.intent.from, 'carol')
  assert.match(wrong.error, /ERC721IncorrectOwner/)
})

test('nonexistent NFT IDs have failing owner queries and actual included reverts', async () => {
  const model = await fresh()
  for (const id of ['0', '3', UINT256_MAX.toString()]) {
    const reviewed = await model.dispatch({ action: 'prepare', draft: nft('transferFrom', { tokenId: id, to: 'carol' }) })
    assert.match(reviewed.prepared.token.error, /ERC721NonexistentToken/)
    const result = await model.dispatch({ action: 'execute', intentId: reviewed.prepared.id, run: reviewed.prepared.run })
    assetsUnchanged(result)
    assert.match(result.error, /ERC721NonexistentToken/)
  }
  const failedApprove = await send(model, nft('approve', { tokenId: '3' }))
  assetsUnchanged(failedApprove)
})

test('repeated ABI reads and permission inspection preserve accepted EVM state', async () => {
  const model = await fresh()
  await send(model, ft('approve'))
  const before = await model.snapshot()
  const owner = before.evm.actors[0].address
  const spender = before.evm.actors[1].address
  for (let i = 0; i < 3; i += 1) {
    assert.equal((await model.dispatch({ action: 'read', mode: 'erc20', name: 'balanceOf', args: [owner] })).value, 1000n)
    assert.equal((await model.dispatch({ action: 'read', mode: 'erc20', name: 'allowance', args: [owner, spender] })).value, 10n)
    assert.equal((await model.dispatch({ action: 'read', mode: 'erc721', name: 'ownerOf', args: [1n] })).value.toLowerCase(), owner)
    await model.dispatch({ action: 'prepare', draft: nft('approve') })
    assert.deepEqual(await model.snapshot(), before)
  }
  await assert.rejects(model.dispatch({ action: 'read', mode: 'erc721', name: 'ownerOf', args: [3n] }), /ERC721NonexistentToken/)
  assert.deepEqual(await model.snapshot(), before)
})

test('immutable queued requests, invalidation, replaced IDs and replay prevention', async () => {
  const model = await fresh()
  const draft = ft('transfer', { amount: '7', to: 'carol' })
  const pending = model.dispatch({ action: 'prepare', draft })
  draft.amount = '999'
  const first = await pending
  assert.equal(first.prepared.intent.amount, '7')
  first.prepared.intent.amount = '500'
  const sent = await model.dispatch({ action: 'execute', intentId: first.prepared.id, run: first.prepared.run })
  assert.deepEqual(sent.snapshot.erc20.balances, [993n, 0n, 7n])
  await assert.rejects(model.dispatch({ action: 'execute', intentId: first.prepared.id, run: first.prepared.run }), /Intención vencida/)
  const second = await model.dispatch({ action: 'prepare', draft: ft('approve') })
  await model.dispatch({ action: 'invalidate' })
  const stable = await model.snapshot()
  await assert.rejects(model.dispatch({ action: 'execute', intentId: second.prepared.id, run: second.prepared.run }), /Intención vencida/)
  assert.deepEqual(await model.snapshot(), stable)
  const third = await model.dispatch({ action: 'prepare', draft: ft('approve') })
  const fourth = await model.dispatch({ action: 'prepare', draft: nft('approve') })
  assert.notEqual(third.prepared.id, fourth.prepared.id)
  await assert.rejects(model.dispatch({ action: 'execute', intentId: third.prepared.id, run: third.prepared.run }), /Intención vencida/)
  const rejectedDraft = { ...ft('transfer'), amount: '-1' }
  await assert.rejects(model.dispatch({ action: 'prepare', draft: rejectedDraft }))
  await assert.rejects(model.dispatch({ action: 'execute', intentId: fourth.prepared.id, run: fourth.prepared.run }), /Intención vencida/)
})

test('reset redeploys both standards, clears balances and permissions, rejects prior run IDs', async () => {
  const model = await fresh()
  await send(model, ft('approve'))
  await send(model, ft('transferFrom', { actor: 'bob', to: 'carol', amount: '7' }))
  await send(model, nft('setApprovalForAll'))
  await send(model, nft('transferFrom', { actor: 'bob', to: 'carol' }))
  const pending = await model.dispatch({ action: 'prepare', draft: ft('transfer') })
  const reset = await model.dispatch({ action: 'reset' })
  assert.ok(reset.snapshot.run > pending.snapshot.run)
  assert.deepEqual(reset.snapshot.erc20.balances, [1000n, 0n, 0n])
  assert.ok(reset.snapshot.erc20.allowances.every((row) => row.every((value) => value === 0n)))
  assert.deepEqual(reset.snapshot.erc721.counts, [2n, 0n, 0n])
  assert.ok(reset.snapshot.erc721.tokens.every((token) => token.owner.toLowerCase() === reset.snapshot.evm.actors[0].address && token.approved === ZERO_ADDRESS))
  assert.ok(reset.snapshot.erc721.operators.every((row) => row.every((value) => value === false)))
  assert.equal(reset.snapshot.evm.actors[0].nonce, '2')
  assert.equal(reset.snapshot.evm.actors[1].nonce, '0')
  assert.equal(reset.snapshot.evm.receipts.length, 2)
  assert.ok(reset.snapshot.evm.receipts.every((receipt) => receipt.createdAddress && receipt.status === 1))
  await assert.rejects(model.dispatch({ action: 'execute', intentId: pending.prepared.id, run: pending.prepared.run }), /Intención vencida/)
  const newIntent = await model.dispatch({ action: 'prepare', draft: ft('transfer') })
  await assert.rejects(model.dispatch({ action: 'execute', intentId: newIntent.prepared.id, run: pending.prepared.run }), /Intención vencida/)
  assert.deepEqual(await model.snapshot(), reset.snapshot)
})
