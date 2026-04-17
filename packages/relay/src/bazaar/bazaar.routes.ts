import { Elysia, t } from 'elysia'
import { listResources } from './bazaar.service'
import { bazaarCacheKey, cached } from './cache'
import {
  parseWindow,
  getStats,
  getRoutes,
  getRankedResources,
  getRankedSellers,
  getTransactions,
  getCostComparison,
  RouteNotConfiguredError,
} from './aggregations'

const CACHE_TTL = 60

function toLimitOffset(limitRaw: string | undefined, offsetRaw: string | undefined) {
  const limit = Math.min(Math.max(limitRaw ? Number(limitRaw) : 20, 1), 100)
  const offset = Math.max(offsetRaw ? Number(offsetRaw) : 0, 0)
  return { limit, offset }
}

export const bazaarRoutes = new Elysia({ prefix: '/discovery' }).get(
  '/resources',
  ({ query }) => {
    return listResources({
      query: query.q,
      network: query.network,
      sort: (query.sort as 'uses' | 'volume') ?? 'uses',
      limit: query.limit ? Number(query.limit) : 20,
      offset: query.offset ? Number(query.offset) : 0,
    })
  },
  {
    query: t.Object({
      q: t.Optional(t.String()),
      network: t.Optional(t.String()),
      sort: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
  },
)

export const bazaarEnrichedRoutes = new Elysia({ prefix: '/bazaar' })
  .get(
    '/stats',
    async ({ query }) => {
      const window = parseWindow(query.window)
      const { value } = await cached(bazaarCacheKey('stats', { window }), CACHE_TTL, () =>
        getStats({ window }),
      )
      return value
    },
    {
      query: t.Object({ window: t.Optional(t.String()) }),
    },
  )
  .get(
    '/routes',
    async ({ query }) => {
      const window = parseWindow(query.window)
      const { value } = await cached(bazaarCacheKey('routes', { window }), CACHE_TTL, () =>
        getRoutes({ window }),
      )
      return value
    },
    {
      query: t.Object({ window: t.Optional(t.String()) }),
    },
  )
  .get(
    '/resources',
    async ({ query }) => {
      const window = parseWindow(query.window)
      const rank = query.rank === 'volume' ? 'volume' : 'uses'
      const { limit, offset } = toLimitOffset(query.limit, query.offset)
      const params = { window, rank, network: query.network, q: query.q, limit, offset }
      const { value } = await cached(bazaarCacheKey('resources', params), CACHE_TTL, () =>
        getRankedResources(params),
      )
      return value
    },
    {
      query: t.Object({
        window: t.Optional(t.String()),
        rank: t.Optional(t.String()),
        network: t.Optional(t.String()),
        q: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    },
  )
  .get(
    '/sellers',
    async ({ query }) => {
      const window = parseWindow(query.window)
      const rank = query.rank === 'tx_count' ? 'tx_count' : 'volume'
      const { limit, offset } = toLimitOffset(query.limit, query.offset)
      const params = { window, rank, network: query.network, limit, offset }
      const { value } = await cached(bazaarCacheKey('sellers', params), CACHE_TTL, () =>
        getRankedSellers(params),
      )
      return value
    },
    {
      query: t.Object({
        window: t.Optional(t.String()),
        rank: t.Optional(t.String()),
        network: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    },
  )
  .get(
    '/transactions',
    async ({ query }) => {
      const { limit, offset } = toLimitOffset(query.limit, query.offset)
      const params = {
        merchantId: query.merchantId,
        buyerNetwork: query.buyerNetwork,
        sellerNetwork: query.sellerNetwork,
        status: query.status,
        protocol: query.protocol,
        type: query.type,
        limit,
        offset,
      }
      const { value } = await cached(bazaarCacheKey('transactions', params), CACHE_TTL, () =>
        getTransactions(params),
      )
      return value
    },
    {
      query: t.Object({
        merchantId: t.Optional(t.String()),
        buyerNetwork: t.Optional(t.String()),
        sellerNetwork: t.Optional(t.String()),
        status: t.Optional(t.String()),
        protocol: t.Optional(t.String()),
        type: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    },
  )
  .get(
    '/cost-comparison',
    ({ query, set }) => {
      if (!query.buyerNetwork || !query.sellerNetwork) {
        set.status = 400
        return { error: 'MISSING_PARAMS', message: 'buyerNetwork and sellerNetwork are required' }
      }
      try {
        return getCostComparison({
          buyerNetwork: query.buyerNetwork,
          sellerNetwork: query.sellerNetwork,
        })
      } catch (err) {
        if (err instanceof RouteNotConfiguredError) {
          set.status = 404
          return { error: err.code, message: err.message }
        }
        throw err
      }
    },
    {
      query: t.Object({
        buyerNetwork: t.Optional(t.String()),
        sellerNetwork: t.Optional(t.String()),
      }),
    },
  )
