import { sql, and, eq, like, desc, type SQL } from 'drizzle-orm'
import { db, bazaarResources, sellers, transactions } from '@402md/shared/db'
import { networks, resolveSlugByCaip2, getGasAllowanceBySlug } from '@402md/shared/networks'

export type Window = '1d' | '7d' | '30d'

export function parseWindow(raw: string | undefined): Window {
  if (raw === '1d' || raw === '7d' || raw === '30d') return raw
  return '7d'
}

function windowInterval(w: Window): SQL {
  if (w === '1d') return sql`NOW() - INTERVAL '1 day'`
  if (w === '7d') return sql`NOW() - INTERVAL '7 days'`
  return sql`NOW() - INTERVAL '30 days'`
}

function normalizeType(raw: string): 'same_chain' | 'cross_chain' | string {
  if (raw === 'SAME_CHAIN') return 'same_chain'
  if (raw === 'BRIDGE_SETTLEMENT') return 'cross_chain'
  return raw
}

function denormalizeType(raw: string): string {
  if (raw === 'same_chain') return 'SAME_CHAIN'
  if (raw === 'cross_chain') return 'BRIDGE_SETTLEMENT'
  return raw
}

export class RouteNotConfiguredError extends Error {
  readonly code = 'ROUTE_NOT_CONFIGURED'
  readonly statusCode = 404
  constructor(from: string, to: string) {
    super(`No gas schedule for route ${from} → ${to}`)
  }
}

// ----------------------------------------------------------------------------
// 1. getStats
// ----------------------------------------------------------------------------

export interface StatsResponse {
  window: Window
  chainsActive: number
  chainsSupported: number
  uniqueRoutes: number
  crossChainRoutes: number
  sameChainRoutes: number
  totalVolume: string
  txCount: number
  protocolSplit: Record<string, number>
  typeSplit: Record<string, number>
}

export async function getStats({ window }: { window: Window }): Promise<StatsResponse> {
  const interval = windowInterval(window)

  const rows = await db.execute<{
    unique_routes: string
    cross_chain_routes: string
    same_chain_routes: string
    tx_count: string
    total_volume: string | null
    chains_active: string
    protocol_split: Record<string, number> | null
    type_split: Record<string, number> | null
  }>(sql`
    WITH base AS (
      SELECT * FROM transactions
      WHERE created_at > ${interval} AND status = 'settled'
    ),
    stats AS (
      SELECT
        COUNT(DISTINCT (buyer_network || '|' || seller_network))::text AS unique_routes,
        COUNT(DISTINCT CASE WHEN buyer_network <> seller_network THEN buyer_network || '|' || seller_network END)::text AS cross_chain_routes,
        COUNT(DISTINCT CASE WHEN buyer_network = seller_network THEN buyer_network || '|' || seller_network END)::text AS same_chain_routes,
        COUNT(*)::text AS tx_count,
        COALESCE(SUM(gross_amount), 0)::text AS total_volume
      FROM base
    ),
    chains AS (
      SELECT COUNT(DISTINCT x.net)::text AS chains_active
      FROM base t, LATERAL (VALUES (t.buyer_network), (t.seller_network)) AS x(net)
    ),
    protocols AS (
      SELECT COALESCE(jsonb_object_agg(protocol, cnt), '{}'::jsonb) AS protocol_split
      FROM (SELECT protocol, COUNT(*)::int AS cnt FROM base GROUP BY protocol) p
    ),
    types AS (
      SELECT COALESCE(jsonb_object_agg(type, cnt), '{}'::jsonb) AS type_split
      FROM (SELECT type, COUNT(*)::int AS cnt FROM base GROUP BY type) t
    )
    SELECT stats.*, chains.chains_active, protocols.protocol_split, types.type_split
    FROM stats, chains, protocols, types
  `)

  const head = rows[0] ?? {
    unique_routes: '0',
    cross_chain_routes: '0',
    same_chain_routes: '0',
    tx_count: '0',
    total_volume: '0',
    chains_active: '0',
    protocol_split: {},
    type_split: {},
  }

  const protocolSplit: Record<string, number> = { ...(head.protocol_split ?? {}) }

  const rawTypeSplit = head.type_split ?? {}
  const typeSplit: Record<string, number> = {}
  for (const [rawType, count] of Object.entries(rawTypeSplit)) {
    typeSplit[normalizeType(rawType)] = count
  }

  return {
    window,
    chainsActive: Number(head.chains_active),
    chainsSupported: networks.length,
    uniqueRoutes: Number(head.unique_routes),
    crossChainRoutes: Number(head.cross_chain_routes),
    sameChainRoutes: Number(head.same_chain_routes),
    totalVolume: head.total_volume ?? '0',
    txCount: Number(head.tx_count),
    protocolSplit,
    typeSplit,
  }
}

// ----------------------------------------------------------------------------
// 2. getRoutes
// ----------------------------------------------------------------------------

export interface RouteRow {
  buyerNetwork: string
  sellerNetwork: string
  txCount: number
  volume: string
  isCrossChain: boolean
}

export interface RoutesResponse {
  window: Window
  routes: RouteRow[]
}

export async function getRoutes({ window }: { window: Window }): Promise<RoutesResponse> {
  const interval = windowInterval(window)

  const rows = await db.execute<{
    buyer_network: string
    seller_network: string
    tx_count: string
    volume: string | null
  }>(sql`
    SELECT buyer_network, seller_network, COUNT(*)::text AS tx_count, COALESCE(SUM(gross_amount), 0)::text AS volume
    FROM transactions
    WHERE created_at > ${interval} AND status = 'settled'
    GROUP BY buyer_network, seller_network
    ORDER BY SUM(gross_amount) DESC NULLS LAST
  `)

  return {
    window,
    routes: rows.map((r) => ({
      buyerNetwork: r.buyer_network,
      sellerNetwork: r.seller_network,
      txCount: Number(r.tx_count),
      volume: r.volume ?? '0',
      isCrossChain: r.buyer_network !== r.seller_network,
    })),
  }
}

// ----------------------------------------------------------------------------
// 3. getRankedResources
// ----------------------------------------------------------------------------

export interface RankedResourceAccept {
  scheme: string
  network: string
  payTo: string
  amount: string
}

export interface RankedResourceItem {
  resource: string
  type: 'http'
  description: string | null
  merchantId: string
  accepts: RankedResourceAccept[]
  useCount: number
  totalVolume: string
  windowedUseCount: number
  windowedVolume: string
  lastUsedAt: string | null
}

export interface RankedResourcesResponse {
  window: Window
  items: RankedResourceItem[]
  total: number
}

export interface RankedResourcesParams {
  window: Window
  rank: 'uses' | 'volume'
  network?: string
  q?: string
  limit: number
  offset: number
}

export async function getRankedResources(
  params: RankedResourcesParams,
): Promise<RankedResourcesResponse> {
  const { window, rank, network, q, limit, offset } = params
  const interval = windowInterval(window)

  const conditions: SQL[] = []
  if (network) conditions.push(eq(bazaarResources.network, network))
  if (q) conditions.push(like(bazaarResources.resourceUrl, `%${q}%`))
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const rows = await db
    .select({
      id: bazaarResources.id,
      resourceUrl: bazaarResources.resourceUrl,
      description: bazaarResources.description,
      merchantId: bazaarResources.merchantId,
      network: bazaarResources.network,
      payTo: bazaarResources.payTo,
      amount: bazaarResources.amount,
      scheme: bazaarResources.scheme,
      useCount: bazaarResources.useCount,
      totalVolume: bazaarResources.totalVolume,
      lastUsedAt: bazaarResources.lastUsedAt,
    })
    .from(bazaarResources)
    .where(where)
    .orderBy(desc(bazaarResources.useCount), desc(bazaarResources.lastUsedAt))

  const windowed = await db.execute<{
    resource_url: string
    use_count: string
    volume: string | null
  }>(sql`
    SELECT b.resource_url,
           COUNT(t.id)::text AS use_count,
           COALESCE(SUM(t.gross_amount), 0)::text AS volume
    FROM bazaar_resources b
    LEFT JOIN transactions t
      ON t.seller_id = b.seller_id
     AND t.seller_network = b.network
     AND t.created_at > ${interval}
     AND t.status = 'settled'
    GROUP BY b.resource_url
  `)

  const windowedByUrl = new Map<string, { useCount: number; volume: string }>()
  for (const w of windowed) {
    windowedByUrl.set(w.resource_url, {
      useCount: Number(w.use_count),
      volume: w.volume ?? '0',
    })
  }

  type GroupedEntry = {
    resource: string
    type: 'http'
    description: string | null
    merchantId: string
    accepts: RankedResourceAccept[]
    useCount: number
    totalVolume: string
    windowedUseCount: number
    windowedVolume: string
    lastUsedAt: string | null
  }

  const grouped = new Map<string, GroupedEntry>()

  for (const r of rows) {
    const existing = grouped.get(r.resourceUrl)
    const accept: RankedResourceAccept = {
      scheme: r.scheme,
      network: r.network,
      payTo: r.payTo,
      amount: r.amount,
    }

    if (existing) {
      existing.accepts.push(accept)
      existing.useCount += r.useCount
      existing.totalVolume = (BigInt(existing.totalVolume) + BigInt(r.totalVolume)).toString()
      const lastIso = r.lastUsedAt?.toISOString() ?? null
      if (lastIso && (!existing.lastUsedAt || lastIso > existing.lastUsedAt)) {
        existing.lastUsedAt = lastIso
      }
    } else {
      const w = windowedByUrl.get(r.resourceUrl)
      grouped.set(r.resourceUrl, {
        resource: r.resourceUrl,
        type: 'http',
        description: r.description,
        merchantId: r.merchantId,
        accepts: [accept],
        useCount: r.useCount,
        totalVolume: r.totalVolume ?? '0',
        windowedUseCount: w?.useCount ?? 0,
        windowedVolume: w?.volume ?? '0',
        lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
      })
    }
  }

  const items = [...grouped.values()]

  if (rank === 'volume') {
    items.sort((a, b) => {
      const diff = BigInt(b.windowedVolume) - BigInt(a.windowedVolume)
      return diff > 0n ? 1 : diff < 0n ? -1 : 0
    })
  } else {
    items.sort((a, b) => b.windowedUseCount - a.windowedUseCount)
  }

  const paginated = items.slice(offset, offset + limit)

  return { window, items: paginated, total: items.length }
}

// ----------------------------------------------------------------------------
// 4. getRankedSellers
// ----------------------------------------------------------------------------

export interface RankedSellerItem {
  merchantId: string
  primaryNetwork: string
  txCount: number
  volume: string
  resourceCount: number
  firstSeenAt: string | null
}

export interface RankedSellersResponse {
  window: Window
  items: RankedSellerItem[]
  total: number
}

export interface RankedSellersParams {
  window: Window
  rank: 'volume' | 'tx_count'
  network?: string
  limit: number
  offset: number
}

export async function getRankedSellers(
  params: RankedSellersParams,
): Promise<RankedSellersResponse> {
  const { window, rank, network, limit, offset } = params
  const interval = windowInterval(window)

  const orderColumn = rank === 'tx_count' ? sql`tx_count` : sql`volume`

  const networkFilter = network ? sql`AND s.network = ${network}` : sql``

  const rows = await db.execute<{
    merchant_id: string
    primary_network: string
    first_seen_at: Date | string | null
    tx_count: string
    volume: string | null
    resource_count: string
  }>(sql`
    SELECT s.merchant_id,
           s.network AS primary_network,
           s.created_at AS first_seen_at,
           COUNT(t.id)::text AS tx_count,
           COALESCE(SUM(t.gross_amount), 0)::text AS volume,
           (SELECT COUNT(*)::text FROM bazaar_resources WHERE seller_id = s.id) AS resource_count
    FROM sellers s
    LEFT JOIN transactions t
      ON t.seller_id = s.id
     AND t.created_at > ${interval}
     AND t.status = 'settled'
    WHERE 1 = 1 ${networkFilter}
    GROUP BY s.id
    ORDER BY ${orderColumn} DESC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}
  `)

  const totalRows = await db.execute<{ total: string }>(sql`
    SELECT COUNT(*)::text AS total FROM sellers s WHERE 1 = 1 ${networkFilter}
  `)

  const items: RankedSellerItem[] = rows.map((r) => ({
    merchantId: r.merchant_id,
    primaryNetwork: r.primary_network,
    txCount: Number(r.tx_count),
    volume: r.volume ?? '0',
    resourceCount: Number(r.resource_count),
    firstSeenAt: r.first_seen_at ? new Date(r.first_seen_at).toISOString() : null,
  }))

  return { window, items, total: Number(totalRows[0]?.total ?? 0) }
}

// ----------------------------------------------------------------------------
// 5. getTransactions
// ----------------------------------------------------------------------------

export interface TransactionItem {
  id: string
  type: string
  protocol: string | null
  status: string
  buyerNetwork: string
  sellerNetwork: string
  merchantId: string | null
  grossAmount: string
  netAmount: string | null
  gasAllowance: string | null
  pullTxHash: string | null
  burnTxHash: string | null
  mintTxHash: string | null
  createdAt: string | null
  settledAt: string | null
}

export interface TransactionsResponse {
  items: TransactionItem[]
  total: number
  limit: number
  offset: number
}

export interface TransactionsParams {
  window?: Window
  merchantId?: string
  buyerNetwork?: string
  sellerNetwork?: string
  status?: string
  protocol?: string
  type?: string
  limit: number
  offset: number
}

export async function getTransactions(params: TransactionsParams): Promise<TransactionsResponse> {
  const { window, merchantId, buyerNetwork, sellerNetwork, status, protocol, type, limit, offset } =
    params

  const conditions: SQL[] = []
  if (window) conditions.push(sql`${transactions.createdAt} > ${windowInterval(window)}`)
  if (merchantId) conditions.push(eq(sellers.merchantId, merchantId))
  if (buyerNetwork) conditions.push(eq(transactions.buyerNetwork, buyerNetwork))
  if (sellerNetwork) conditions.push(eq(transactions.sellerNetwork, sellerNetwork))
  if (status) conditions.push(eq(transactions.status, status))
  if (protocol) conditions.push(eq(transactions.protocol, protocol))
  if (type) conditions.push(eq(transactions.type, denormalizeType(type)))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      protocol: transactions.protocol,
      status: transactions.status,
      buyerNetwork: transactions.buyerNetwork,
      sellerNetwork: transactions.sellerNetwork,
      merchantId: sellers.merchantId,
      grossAmount: transactions.grossAmount,
      netAmount: transactions.netAmount,
      gasAllowance: transactions.gasAllowance,
      pullTxHash: transactions.pullTxHash,
      burnTxHash: transactions.burnTxHash,
      mintTxHash: transactions.mintTxHash,
      createdAt: transactions.createdAt,
      settledAt: transactions.settledAt,
    })
    .from(transactions)
    .leftJoin(sellers, eq(sellers.id, transactions.sellerId))
    .where(where)
    .orderBy(desc(transactions.createdAt))
    .limit(limit)
    .offset(offset)

  const totalRows = await db
    .select({ count: sql<string>`COUNT(*)::text` })
    .from(transactions)
    .leftJoin(sellers, eq(sellers.id, transactions.sellerId))
    .where(where)

  const items: TransactionItem[] = rows.map((r) => ({
    id: r.id,
    type: normalizeType(r.type),
    protocol: r.protocol,
    status: r.status,
    buyerNetwork: r.buyerNetwork,
    sellerNetwork: r.sellerNetwork,
    merchantId: r.merchantId,
    grossAmount: r.grossAmount,
    netAmount: r.netAmount,
    gasAllowance: r.gasAllowance,
    pullTxHash: r.pullTxHash,
    burnTxHash: r.burnTxHash,
    mintTxHash: r.mintTxHash,
    createdAt: r.createdAt?.toISOString() ?? null,
    settledAt: r.settledAt?.toISOString() ?? null,
  }))

  return { items, total: Number(totalRows[0]?.count ?? '0'), limit, offset }
}

// ----------------------------------------------------------------------------
// 6. getCostComparison
// ----------------------------------------------------------------------------

export interface CostComparisonTier {
  amount: string
  cctpAllowance: string
  percentAlternative: string
  savingsVsPercent: string
}

export interface CostComparisonResponse {
  buyerNetwork: string
  sellerNetwork: string
  tiers: CostComparisonTier[]
  notes: {
    cctpSource: string
    percentAssumption: string
  }
}

const COST_COMPARISON_TIERS = ['100000', '1000000', '100000000']
const PERCENT_BPS = 100n // 1% = 100 bps
const PERCENT_MIN_FLOOR = 100000n // $0.10 baseline spread

function computePercentAlternative(amount: string): string {
  const gross = BigInt(amount)
  const onePercent = (gross * PERCENT_BPS) / 10000n
  return (onePercent > PERCENT_MIN_FLOOR ? onePercent : PERCENT_MIN_FLOOR).toString()
}

export function getCostComparison(input: {
  buyerNetwork: string
  sellerNetwork: string
}): CostComparisonResponse {
  const { buyerNetwork, sellerNetwork } = input

  const fromSlug = resolveSlugByCaip2(buyerNetwork)
  const toSlug = resolveSlugByCaip2(sellerNetwork)
  if (!fromSlug || !toSlug) {
    throw new RouteNotConfiguredError(buyerNetwork, sellerNetwork)
  }

  let allowance: string
  try {
    allowance = getGasAllowanceBySlug(fromSlug, toSlug)
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('No gas schedule for')) {
      throw new RouteNotConfiguredError(buyerNetwork, sellerNetwork)
    }
    throw err
  }

  const tiers: CostComparisonTier[] = COST_COMPARISON_TIERS.map((amount) => {
    const percent = computePercentAlternative(amount)
    const savings = (BigInt(percent) - BigInt(allowance)).toString()
    return {
      amount,
      cctpAllowance: allowance,
      percentAlternative: percent,
      savingsVsPercent: savings,
    }
  })

  return {
    buyerNetwork,
    sellerNetwork,
    tiers,
    notes: {
      cctpSource: 'gas-schedule.ts',
      percentAssumption: '1% + $0.10 market-maker spread baseline',
    },
  }
}
