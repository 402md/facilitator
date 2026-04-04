import { proxyActivities, defineQuery, setHandler } from '@temporalio/workflow'
import type { BatchSessionSettleParams, BatchSessionSettleResult, CctpBurnResult, AttestationResult } from '../shared/types'

const { pullFromBuyer, cctpBurn, cctpMint } = proxyActivities<{
  pullFromBuyer: (input: any) => Promise<string>
  cctpBurn: (input: any) => Promise<CctpBurnResult>
  cctpMint: (input: any) => Promise<string>
}>({
  startToCloseTimeout: '2m',
  retry: {
    maximumAttempts: 10,
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
  },
})

const { waitAttestation } = proxyActivities<{
  waitAttestation: (input: any) => Promise<AttestationResult>
}>({
  startToCloseTimeout: '30m',
  retry: {
    maximumAttempts: 20,
    initialInterval: '5s',
    backoffCoefficient: 1.5,
    maximumInterval: '60s',
  },
  heartbeatTimeout: '2m',
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
  step: 'pulling' | 'burning' | 'attesting' | 'minting' | 'recording' | 'settled' | 'failed'
  pullTxHash?: string
  burnTxHash?: string
  mintTxHash?: string
  error?: string
}

export const statusQuery = defineQuery<WorkflowStatus>('status')

export async function batchSessionSettle(
  params: BatchSessionSettleParams
): Promise<BatchSessionSettleResult> {
  let status: WorkflowStatus = { step: 'pulling' }
  setHandler(statusQuery, () => status)

  const pullTxHash = await pullFromBuyer({
    network: params.buyerNetwork,
    buyer: params.buyerAddress,
    amount: params.totalAmount,
    authorization: {
      validAfter: '0',
      validBefore: '9999999999',
      nonce: params.sessionId,
      signature: params.sessionId,
    },
  })
  status = { ...status, step: 'burning', pullTxHash }

  const gasAllowance = '500'
  const platformFee = '0'
  const sellerAmount = (
    BigInt(params.totalAmount) - BigInt(gasAllowance) - BigInt(platformFee)
  ).toString()

  const burnResult = await cctpBurn({
    fromNetwork: params.buyerNetwork,
    toNetwork: params.sellerNetwork,
    amount: sellerAmount,
    recipient: params.sellerAddress,
    destinationDomain: params.destinationDomain,
  })
  status = { ...status, step: 'attesting', burnTxHash: burnResult.txHash }

  const attestation = await waitAttestation({
    messageHash: burnResult.messageHash,
  })
  status.step = 'minting'

  const mintTxHash = await cctpMint({
    network: params.sellerNetwork,
    attestation,
    burnResult,
  })
  status = { ...status, step: 'recording', mintTxHash }

  await recordPayment({
    type: 'MPP_SESSION_BATCH',
    protocol: 'mpp',
    sellerId: params.sellerId,
    buyerAddress: params.buyerAddress,
    buyerNetwork: params.buyerNetwork,
    sellerAddress: params.sellerAddress,
    sellerNetwork: params.sellerNetwork,
    amount: params.totalAmount,
    sellerAmount,
    platformFee,
    gasAllowance,
    pullTx: pullTxHash,
    burnTx: burnResult.txHash,
    mintTx: mintTxHash,
    transferTx: null,
    bridgeProvider: 'cctp',
  })

  status.step = 'settled'

  return {
    success: true,
    pullTxHash,
    burnTxHash: burnResult.txHash,
    mintTxHash,
    sellerAmount,
    feeAmount: platformFee,
    gasAllowance,
    voucherCount: params.voucherCount,
    settledAt: new Date().toISOString(),
  }
}
