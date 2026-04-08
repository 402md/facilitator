import { and, eq, like, desc, type SQL } from 'drizzle-orm'
import { db, sellers } from '@402md/shared/db'

export async function listServices(options: {
  query?: string
  network?: string
  limit?: number
  offset?: number
}) {
  const { query, network, limit = 20, offset = 0 } = options

  const conditions: SQL[] = []
  if (network) conditions.push(eq(sellers.network, network))
  if (query) conditions.push(like(sellers.walletAddress, `%${query}%`))

  const results = await db
    .select()
    .from(sellers)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(sellers.createdAt))
    .limit(limit)
    .offset(offset)

  return {
    services: results.map((s) => ({
      merchantId: s.merchantId,
      walletAddress: s.walletAddress,
      network: s.network,
      registeredAt: s.createdAt,
    })),
    total: results.length,
  }
}
