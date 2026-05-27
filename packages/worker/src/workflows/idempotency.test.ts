import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TestWorkflowEnvironment } from '@temporalio/testing'
import { Worker, type WorkflowBundleWithSourceMap } from '@temporalio/worker'
import { WorkflowExecutionAlreadyStartedError } from '@temporalio/client'
import { sameChainSettle } from './same-chain-settle'
import type { SameChainSettleParams } from '../shared/types'
import { createTestEnv, getWorkflowBundle } from '../test-helpers/temporal-env'

const params: SameChainSettleParams = {
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

describe('workflow idempotency', () => {
  let env: TestWorkflowEnvironment
  let bundle: WorkflowBundleWithSourceMap

  beforeAll(async () => {
    ;[env, bundle] = await Promise.all([createTestEnv(), getWorkflowBundle()])
  })

  afterAll(async () => {
    await env?.teardown()
  })

  it('starting the same workflowId twice is rejected by the server (no double pull)', async () => {
    let pullCount = 0
    const worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: 'idempotency-queue',
      workflowBundle: bundle,
      activities: {
        pullFromBuyer: async () => {
          pullCount += 1
          return '0xpullTx'
        },
        transferToSeller: async () => '0xtransferTx',
        recordPayment: async () => {},
      },
    })

    await worker.runUntil(async () => {
      const handle = await env.client.workflow.start(sameChainSettle, {
        args: [params],
        workflowId: 'dedup-key-1',
        taskQueue: 'idempotency-queue',
      })

      await expect(
        env.client.workflow.start(sameChainSettle, {
          args: [params],
          workflowId: 'dedup-key-1',
          taskQueue: 'idempotency-queue',
        }),
      ).rejects.toBeInstanceOf(WorkflowExecutionAlreadyStartedError)

      await handle.result()
    })

    expect(pullCount, 'pullFromBuyer must run exactly once across the two attempts').toBe(1)
  })
})
