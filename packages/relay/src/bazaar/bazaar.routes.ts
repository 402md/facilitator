import { Elysia, t } from 'elysia'
import { listServices } from './bazaar.service'

export const bazaarRoutes = new Elysia({ prefix: '/bazaar' }).get(
  '/',
  ({ query }) => {
    return listServices({
      query: query.q,
      network: query.network,
      limit: query.limit ? Number(query.limit) : 20,
      offset: query.offset ? Number(query.offset) : 0,
    })
  },
  {
    query: t.Object({
      q: t.Optional(t.String()),
      network: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
  },
)
