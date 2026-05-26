import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TestWorkflowEnvironment } from '@temporalio/testing'
import { Worker, type WorkflowBundleWithSourceMap } from '@temporalio/worker'
import { sameChainSettle } from './same-chain-settle'
import type { SameChainSettleParams } from '../shared/types'
import { createTestEnv, getWorkflowBundle } from '../test-helpers/temporal-env'

const baseParams: SameChainSettleParams = {
  sellerId: 'seller-1',
  sellerAddress: '0xSeller',
  buyerAddress: '0xBuyer',
  network: 'eip155:8453',
  amount: '1000000',
  authorization: {
    validAfter: '0',
    validBefore: '9999999999',
    nonce: '0x01',
    signature: '0xsig',
  },
  gasAllowance: '2000',
  platformFee: '0',
  merchantId: 'ab-test01',
  payTo: '0xFacilitatorBase',
  scheme: 'exact',
}

interface RecordedActivity {
  name: string
  input: Record<string, unknown>
}

interface Activities {
  pullFromBuyer: (input: Record<string, unknown>) => Promise<string>
  transferToSeller: (input: Record<string, unknown>) => Promise<string>
  recordPayment: (input: Record<string, unknown>) => Promise<void>
}

function buildActivities(recorded: RecordedActivity[], overrides: Partial<Activities> = {}) {
  const defaults: Activities = {
    pullFromBuyer: async () => '0xpullTx',
    transferToSeller: async () => '0xtransferTx',
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

describe('sameChainSettle workflow', () => {
  let env: TestWorkflowEnvironment
  let bundle: WorkflowBundleWithSourceMap

  beforeAll(async () => {
    ;[env, bundle] = await Promise.all([createTestEnv(), getWorkflowBundle()])
  })

  afterAll(async () => {
    await env?.teardown()
  })

  it('happy path: pulls, transfers net amount, records — no bridge metadata', async () => {
    const recorded: RecordedActivity[] = []
    const worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: 'same-chain-happy',
      workflowBundle: bundle,
      activities: buildActivities(recorded),
    })

    const result = await worker.runUntil(
      env.client.workflow.execute(sameChainSettle, {
        args: [baseParams],
        workflowId: 'same-happy',
        taskQueue: 'same-chain-happy',
      }),
    )

    expect(result.success).toBe(true)
    expect(result.pullTxHash).toBe('0xpullTx')
    expect(result.transferTxHash).toBe('0xtransferTx')
    // 1000000 - 2000 (gas) - 0 (platform) = 998000
    expect(result.sellerAmount).toBe('998000')

    const order = recorded.map((r) => r.name)
    expect(order).toEqual(['pullFromBuyer', 'transferToSeller', 'recordPayment'])

    const transferCall = recorded.find((r) => r.name === 'transferToSeller')!
    expect(transferCall.input.amount).toBe('998000')
    expect(transferCall.input.seller).toBe('0xSeller')

    const recordCall = recorded.find((r) => r.name === 'recordPayment')!
    expect(recordCall.input).toMatchObject({
      type: 'SAME_CHAIN',
      protocol: 'x402',
      amount: '1000000',
      sellerAmount: '998000',
      pullTx: '0xpullTx',
      transferTx: '0xtransferTx',
      burnTx: null,
      mintTx: null,
      bridgeProvider: null,
    })
  })

  it('retries transferToSeller on transient failure and still settles', async () => {
    const recorded: RecordedActivity[] = []
    let attempts = 0
    const worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: 'same-chain-retry',
      workflowBundle: bundle,
      activities: buildActivities(recorded, {
        transferToSeller: async () => {
          attempts += 1
          if (attempts < 3) {
            throw new Error(`transient RPC failure (attempt ${attempts})`)
          }
          return '0xtransferAfterRetry'
        },
      }),
    })

    const result = await worker.runUntil(
      env.client.workflow.execute(sameChainSettle, {
        args: [baseParams],
        workflowId: 'same-retry',
        taskQueue: 'same-chain-retry',
      }),
    )

    expect(attempts).toBe(3)
    expect(result.transferTxHash).toBe('0xtransferAfterRetry')
    expect(result.success).toBe(true)
  })
})
