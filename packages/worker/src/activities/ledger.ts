import { db } from '@/shared/db'
import { transactions } from '@402md/relay/src/shared/schema'
import type { RecordPaymentInput } from '@/shared/types'

export async function recordPayment(input: RecordPaymentInput): Promise<void> {
  await db.insert(transactions).values({
    type: input.type,
    protocol: input.protocol ?? 'x402',
    status: 'settled',
    buyerAddress: input.buyerAddress,
    buyerNetwork: input.buyerNetwork,
    sellerAddress: input.sellerAddress,
    sellerNetwork: input.sellerNetwork,
    sellerId: input.sellerId,
    grossAmount: input.amount,
    netAmount: input.sellerAmount,
    platformFee: input.platformFee,
    gasAllowance: input.gasAllowance,
    pullTxHash: input.pullTx,
    burnTxHash: input.burnTx,
    mintTxHash: input.mintTx,
    workflowId: `${input.type.toLowerCase()}-${input.buyerNetwork}-${input.sellerNetwork}`,
    bridgeProvider: input.bridgeProvider,
    settledAt: new Date(),
  })
}
