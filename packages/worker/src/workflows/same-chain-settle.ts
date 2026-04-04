import { proxyActivities, defineQuery, setHandler, upsertSearchAttributes } from '@temporalio/workflow'
import type { SameChainSettleParams, SameChainSettleResult } from '../shared/types'

const { pullFromBuyer, transferToSeller } = proxyActivities<{
  pullFromBuyer: (input: any) => Promise<string>
  transferToSeller: (input: any) => Promise<string>
}>({
  startToCloseTimeout: '2m',
  retry: {
    maximumAttempts: 10,
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
  },
})

const { recordPayment } = proxyActivities<{
  recordPayment: (input: any) => Promise<void>
}>({
  startToCloseTimeout: '30s',
  retry: {
    maximumAttempts: 5,
    initialInterval: '500ms',
    backoffCoefficient: 2,
    maximumInterval: '10s',
  },
})

interface WorkflowStatus {
  step: 'pulling' | 'transferring' | 'recording' | 'settled' | 'failed'
  pullTxHash?: string
  transferTxHash?: string
  error?: string
}

export const statusQuery = defineQuery<WorkflowStatus>('status')

export async function sameChainSettle(
  params: SameChainSettleParams
): Promise<SameChainSettleResult> {
  let status: WorkflowStatus = { step: 'pulling' }
  setHandler(statusQuery, () => status)

  upsertSearchAttributes({
    sellerNetwork: [params.network],
    buyerNetwork: [params.network],
    settlementStatus: ['pulling'],
    protocol: ['x402'],
  })

  const pullTxHash = await pullFromBuyer({
    network: params.network,
    buyer: params.buyerAddress,
    amount: params.amount,
    authorization: params.authorization,
  })
  status = { ...status, step: 'transferring', pullTxHash }
  upsertSearchAttributes({ settlementStatus: ['transferring'] })

  const sellerAmount = (
    BigInt(params.amount) - BigInt(params.gasAllowance) - BigInt(params.platformFee)
  ).toString()

  const transferTxHash = await transferToSeller({
    network: params.network,
    seller: params.sellerAddress,
    amount: sellerAmount,
  })
  status = { ...status, step: 'recording', transferTxHash }
  upsertSearchAttributes({ settlementStatus: ['recording'] })

  await recordPayment({
    type: 'SAME_CHAIN',
    protocol: 'x402',
    sellerId: params.sellerId,
    buyerAddress: params.buyerAddress,
    buyerNetwork: params.network,
    sellerAddress: params.sellerAddress,
    sellerNetwork: params.network,
    amount: params.amount,
    sellerAmount,
    platformFee: params.platformFee,
    gasAllowance: params.gasAllowance,
    pullTx: pullTxHash,
    burnTx: null,
    mintTx: null,
    transferTx: transferTxHash,
    bridgeProvider: null,
  })

  status.step = 'settled'
  upsertSearchAttributes({ settlementStatus: ['settled'] })

  return {
    success: true,
    pullTxHash,
    transferTxHash,
    sellerAmount,
    platformFee: params.platformFee,
    gasAllowance: params.gasAllowance,
    settledAt: new Date().toISOString(),
  }
}
