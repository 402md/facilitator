import { Elysia, t } from 'elysia'
import { listProviders } from './onramp.service'

export const onrampRoutes = new Elysia({ prefix: '/onramp' }).get(
  '/',
  ({ query }) => {
    return listProviders(query.network ?? 'stellar:pubnet', query.walletAddress)
  },
  {
    query: t.Object({
      network: t.Optional(t.String()),
      walletAddress: t.Optional(t.String()),
    }),
  },
)
