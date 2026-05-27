import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TestWorkflowEnvironment } from '@temporalio/testing'
import { Worker, type WorkflowBundleWithSourceMap } from '@temporalio/worker'
import { ApplicationFailure } from '@temporalio/workflow'
import { crossChainSettle } from './cross-chain-settle'
import type { CrossChainSettleParams } from '../shared/types'
import { createTestEnv, getWorkflowBundle } from '../test-helpers/temporal-env'

const baseParams: CrossChainSettleParams = {
  sellerId: 'seller-1',
  sellerAddress: 'SOLANA_SELLER',
  sellerNetwork: 'solana:mainnet',
  buyerAddress: '0xBuyer',
  buyerNetwork: 'eip155:8453',
  amount: '1000000',
  authorization: {
    validAfter: '0',
    validBefore: '9999999999',
    nonce: '0x01',
    signature: '0xsig',
  },
  sourceDomain: 6,
  destinationDomain: 5,
  gasAllowance: '3500',
  platformFee: '0',
  merchantId: 'ab-test01',
  payTo: '0xFacilitatorBase',
  scheme: 'exact',
}

interface RecordedActivity {
  name: string
  input: Record<string, unknown>
}

function buildActivities(recorded: RecordedActivity[], overrides: Partial<Activities> = {}) {
  const defaults: Activities = {
    pullFromBuyer: async () => '0xpullTx',
    cctpBurn: async () => ({ txHash: '0xburnTx', messageHash: '0xmsg' }),
    waitAttestation: async () => ({ attestation: '0xatt', messageBytes: '0xmsgBytes' }),
    cctpMint: async () => '0xmintTx',
    recordPayment: async () => {},
  }
  const merged = { ...defaults, ...overrides }
  return Object.fromEntries(
    Object.entries(merged).map(([name, fn]) => [
      name,
      async (input: Record<string, unknown>) => {
        recorded.push({ name, input })
        return (fn as (i: Record<string, unknown>) => Promise<unknown>)(input)
      },
    ]),
  ) as unknown as Activities
}

interface Activities {
  pullFromBuyer: (input: Record<string, unknown>) => Promise<string>
  cctpBurn: (input: Record<string, unknown>) => Promise<{ txHash: string; messageHash: string }>
  waitAttestation: (
    input: Record<string, unknown>,
  ) => Promise<{ attestation: string; messageBytes: string }>
  cctpMint: (input: Record<string, unknown>) => Promise<string>
  recordPayment: (input: Record<string, unknown>) => Promise<void>
}

describe('crossChainSettle workflow', () => {
  let env: TestWorkflowEnvironment
  let bundle: WorkflowBundleWithSourceMap

  beforeAll(async () => {
    ;[env, bundle] = await Promise.all([createTestEnv(), getWorkflowBundle()])
  })

  afterAll(async () => {
    await env?.teardown()
  })

  it('happy path: pulls, burns net amount, waits attestation, mints, records', async () => {
    const recorded: RecordedActivity[] = []
    const worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: 'cross-chain-happy',
      workflowBundle: bundle,
      activities: buildActivities(recorded),
    })

    const result = await worker.runUntil(
      env.client.workflow.execute(crossChainSettle, {
        args: [baseParams],
        workflowId: 'cross-happy',
        taskQueue: 'cross-chain-happy',
      }),
    )

    expect(result.success).toBe(true)
    expect(result.pullTxHash).toBe('0xpullTx')
    expect(result.burnTxHash).toBe('0xburnTx')
    expect(result.mintTxHash).toBe('0xmintTx')
    // 1000000 - 3500 (gas) - 0 (platform) = 996500
    expect(result.sellerAmount).toBe('996500')
    expect(result.platformFee).toBe('0')
    expect(result.gasAllowance).toBe('3500')

    const order = recorded.map((r) => r.name)
    expect(order).toEqual([
      'pullFromBuyer',
      'cctpBurn',
      'waitAttestation',
      'cctpMint',
      'recordPayment',
    ])

    // cctpBurn must receive sellerAmount (net), NOT the gross amount.
    const burnCall = recorded.find((r) => r.name === 'cctpBurn')!
    expect(burnCall.input.amount).toBe('996500')
    expect(burnCall.input.recipient).toBe('SOLANA_SELLER')

    // Ledger must record gross amount + net + the platform fee + gas + bridge metadata.
    const recordCall = recorded.find((r) => r.name === 'recordPayment')!
    expect(recordCall.input).toMatchObject({
      type: 'BRIDGE_SETTLEMENT',
      protocol: 'x402',
      amount: '1000000',
      sellerAmount: '996500',
      gasAllowance: '3500',
      platformFee: '0',
      pullTx: '0xpullTx',
      burnTx: '0xburnTx',
      mintTx: '0xmintTx',
      bridgeProvider: 'cctp',
    })
  })

  it('platform fee + gas are both subtracted from sellerAmount', async () => {
    const recorded: RecordedActivity[] = []
    const worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: 'cross-chain-fee',
      workflowBundle: bundle,
      activities: buildActivities(recorded),
    })

    await worker.runUntil(
      env.client.workflow.execute(crossChainSettle, {
        args: [{ ...baseParams, amount: '1000000', gasAllowance: '3500', platformFee: '5000' }],
        workflowId: 'cross-fee',
        taskQueue: 'cross-chain-fee',
      }),
    )

    const burnCall = recorded.find((r) => r.name === 'cctpBurn')!
    // 1000000 - 3500 - 5000 = 991500
    expect(burnCall.input.amount).toBe('991500')
  })

  it('mint failure: records mint_pending and re-throws so workflow fails', async () => {
    const recorded: RecordedActivity[] = []
    const worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: 'cross-chain-mint-fail',
      workflowBundle: bundle,
      activities: buildActivities(recorded, {
        cctpMint: async () => {
          throw ApplicationFailure.nonRetryable('destination chain rejected mint', 'MintError')
        },
      }),
    })

    await expect(
      worker.runUntil(
        env.client.workflow.execute(crossChainSettle, {
          args: [baseParams],
          workflowId: 'cross-mint-fail',
          taskQueue: 'cross-chain-mint-fail',
        }),
      ),
    ).rejects.toThrow()

    const recordCall = recorded.find((r) => r.name === 'recordPayment')
    expect(recordCall, 'compensation must persist mint_pending row').toBeDefined()
    expect(recordCall!.input).toMatchObject({
      type: 'BRIDGE_SETTLEMENT',
      status: 'mint_pending',
      mintTx: null,
      pullTx: '0xpullTx',
      burnTx: '0xburnTx',
    })
  })

  it('retries cctpBurn on transient failure and still settles', async () => {
    const recorded: RecordedActivity[] = []
    let burnAttempts = 0
    const worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: 'cross-chain-retry',
      workflowBundle: bundle,
      activities: buildActivities(recorded, {
        cctpBurn: async () => {
          burnAttempts += 1
          if (burnAttempts < 3) {
            throw new Error(`transient RPC failure (attempt ${burnAttempts})`)
          }
          return { txHash: '0xburnTxAfterRetry', messageHash: '0xmsg' }
        },
      }),
    })

    const result = await worker.runUntil(
      env.client.workflow.execute(crossChainSettle, {
        args: [baseParams],
        workflowId: 'cross-retry',
        taskQueue: 'cross-chain-retry',
      }),
    )

    expect(burnAttempts).toBe(3)
    expect(result.burnTxHash).toBe('0xburnTxAfterRetry')
    expect(result.success).toBe(true)
  })
})
