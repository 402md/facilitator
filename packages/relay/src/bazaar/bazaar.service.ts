import { and, eq, like, desc, type SQL } from 'drizzle-orm'
import { db, bazaarResources } from '@402md/shared/db'

interface ListResourcesOptions {
  query?: string
  network?: string
  sort?: 'uses' | 'volume'
  limit?: number
  offset?: number
}

export async function listResources(options: ListResourcesOptions) {
  const { query, network, sort = 'uses', limit = 20, offset = 0 } = options

  const conditions: SQL[] = []
  if (network) conditions.push(eq(bazaarResources.network, network))
  if (query) conditions.push(like(bazaarResources.resourceUrl, `%${query}%`))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const orderColumn =
    sort === 'volume' ? desc(bazaarResources.totalVolume) : desc(bazaarResources.useCount)

  const rows = await db
    .select()
    .from(bazaarResources)
    .where(where)
    .orderBy(orderColumn, desc(bazaarResources.lastUsedAt))

  // Group rows by resourceUrl to produce Coinbase-aligned response with multiple accepts
  const grouped = new Map<
    string,
    {
      resource: string
      type: string
      description: string | null
      accepts: { scheme: string; network: string; payTo: string; amount: string }[]
      useCount: number
      totalVolume: string
      lastUpdated: string | null
    }
  >()

  for (const r of rows) {
    const existing = grouped.get(r.resourceUrl)
    const accept = { scheme: r.scheme, network: r.network, payTo: r.payTo, amount: r.amount }

    if (existing) {
      existing.accepts.push(accept)
      existing.useCount += r.useCount
      existing.totalVolume = (BigInt(existing.totalVolume) + BigInt(r.totalVolume)).toString()
      if (
        r.lastUsedAt &&
        (!existing.lastUpdated || r.lastUsedAt.toISOString() > existing.lastUpdated)
      ) {
        existing.lastUpdated = r.lastUsedAt.toISOString()
      }
    } else {
      grouped.set(r.resourceUrl, {
        resource: r.resourceUrl,
        type: 'http',
        description: r.description,
        accepts: [accept],
        useCount: r.useCount,
        totalVolume: r.totalVolume ?? '0',
        lastUpdated: r.lastUsedAt?.toISOString() ?? null,
      })
    }
  }

  const items = [...grouped.values()]

  // Re-sort grouped items
  if (sort === 'volume') {
    items.sort((a, b) => Number(BigInt(b.totalVolume) - BigInt(a.totalVolume)))
  } else {
    items.sort((a, b) => b.useCount - a.useCount)
  }

  const paginated = items.slice(offset, offset + limit)

  return { items: paginated, total: items.length }
}
