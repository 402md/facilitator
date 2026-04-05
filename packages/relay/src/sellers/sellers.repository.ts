import { eq } from 'drizzle-orm'
import { db, sellers } from '@402md/shared/db'

export async function createSeller(data: {
  merchantId: string
  walletAddress: string
  network: string
}) {
  const [seller] = await db.insert(sellers).values(data).returning()
  return seller
}

export async function findByMerchantId(merchantId: string) {
  return db.query.sellers.findFirst({
    where: eq(sellers.merchantId, merchantId),
  })
}

export async function findByWallet(walletAddress: string, network: string) {
  return db.query.sellers.findFirst({
    where: (s, { and, eq }) => and(eq(s.walletAddress, walletAddress), eq(s.network, network)),
  })
}
