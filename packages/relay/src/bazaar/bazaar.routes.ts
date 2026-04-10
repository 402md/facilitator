import { Elysia, t } from 'elysia'
import { listResources } from './bazaar.service'

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
