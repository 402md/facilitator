import { proxyActivities, defineQuery, setHandler } from '@temporalio/workflow'
import type { CrossChainSettleParams, CrossChainSettleResult, CctpBurnResult, AttestationResult } from '../shared/types'

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

export async function crossChainSettle(
  params: CrossChainSettleParams
): Promise<CrossChainSettleResult> {
  let status: WorkflowStatus = { step: 'pulling' }
  setHandler(statusQuery, () => status)

  const pullTxHash = await pullFromBuyer({
    network: params.buyerNetwork,
    buyer: params.buyerAddress,
    amount: params.amount,
    authorization: params.authorization,
  })
  status = { ...status, step: 'burning', pullTxHash }

  const sellerAmount = (
    BigInt(params.amount) - BigInt(params.gasAllowance) - BigInt(params.platformFee)
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

  const paymentData = {
    type: 'BRIDGE_SETTLEMENT' as const,
    protocol: 'x402' as const,
    sellerId: params.sellerId,
    buyerAddress: params.buyerAddress,
    buyerNetwork: params.buyerNetwork,
    sellerAddress: params.sellerAddress,
    sellerNetwork: params.sellerNetwork,
    amount: params.amount,
    sellerAmount,
    platformFee: params.platformFee,
    gasAllowance: params.gasAllowance,
    pullTx: pullTxHash,
    burnTx: burnResult.txHash,
    bridgeProvider: 'cctp' as const,
  }

  try {
    const mintTx = await cctpMint({
      network: params.sellerNetwork,
      attestation,
      burnResult,
    })
    status = { ...status, step: 'recording', mintTxHash: mintTx }

    await recordPayment({
      ...paymentData,
      mintTx,
      transferTx: null,
    })

    status.step = 'settled'

    return {
      success: true,
      pullTxHash,
      burnTxHash: burnResult.txHash,
      mintTxHash: mintTx,
      sellerAmount,
      platformFee: params.platformFee,
      gasAllowance: params.gasAllowance,
      settledAt: new Date().toISOString(),
    }
  } catch (err) {
    status = {
      step: 'failed',
      pullTxHash,
      burnTxHash: burnResult.txHash,
      error: `Mint failed: ${(err as Error).message}. Attestation valid for manual retry.`,
    }
    await recordPayment({
      ...paymentData,
      mintTx: null,
      transferTx: null,
      status: 'mint_pending',
    })
    throw err
  }
}
