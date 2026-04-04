import { sql } from 'drizzle-orm'
import { db } from '@/shared/db'
import type { RecordPaymentInput } from '@/shared/types'

export async function recordPayment(input: RecordPaymentInput): Promise<void> {
  await db.execute(sql`
    INSERT INTO transactions (
      type, protocol, status,
      buyer_address, buyer_network, seller_address, seller_network, seller_id,
      gross_amount, net_amount, platform_fee, gas_allowance,
      pull_tx_hash, burn_tx_hash, mint_tx_hash, transfer_tx_hash,
      workflow_id, bridge_provider, settled_at
    ) VALUES (
      ${input.type}, ${input.protocol ?? 'x402'}, 'settled',
      ${input.buyerAddress}, ${input.buyerNetwork},
      ${input.sellerAddress}, ${input.sellerNetwork}, ${input.sellerId}::uuid,
      ${input.amount}, ${input.sellerAmount}, ${input.platformFee}, ${input.gasAllowance},
      ${input.pullTx}, ${input.burnTx}, ${input.mintTx}, ${input.transferTx},
      ${`${input.type.toLowerCase()}-${input.buyerNetwork}-${input.sellerNetwork}`},
      ${input.bridgeProvider}, NOW()
    )
  `)
}
