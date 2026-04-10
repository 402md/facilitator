import { db, transactions, bazaarResources } from '@402md/shared/db'
import { sql } from 'drizzle-orm'
import type { RecordPaymentInput } from '@/shared/types'

function extractBaseUrl(url: string): string {
  try {
    return new URL(url).origin
  } catch {
    return url
  }
}

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

  if (input.resource?.url) {
    const baseUrl = extractBaseUrl(input.resource.url)

    await db
      .insert(bazaarResources)
      .values({
        resourceUrl: input.resource.url,
        baseUrl,
        description: input.resource.description ?? null,
        sellerId: input.sellerId,
        merchantId: input.merchantId,
        network: input.buyerNetwork,
        payTo: input.payTo,
        amount: input.amount,
        scheme: input.scheme ?? 'exact',
        useCount: 1,
        totalVolume: input.amount,
      })
      .onConflictDoUpdate({
        target: [bazaarResources.resourceUrl, bazaarResources.network],
        set: {
          description: sql`COALESCE(${input.resource.description}, ${bazaarResources.description})`,
          amount: input.amount,
          useCount: sql`${bazaarResources.useCount} + 1`,
          totalVolume: sql`${bazaarResources.totalVolume} + ${input.amount}::numeric`,
          lastUsedAt: new Date(),
        },
      })
  }
}
