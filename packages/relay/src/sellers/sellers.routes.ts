import { Elysia, t } from 'elysia'
import { networks } from '@402md/shared/networks'
import { registerSeller, getDiscovery } from './sellers.service'

export const sellersRoutes = new Elysia()
  .post(
    '/register',
    async ({ body, set }) => {
      set.status = 201
      return registerSeller(body)
    },
    {
      body: t.Object({
        wallet: t.String({ minLength: 10 }),
        network: t.String({ minLength: 3 }),
      }),
    },
  )
  .get(
    '/discover',
    async ({ query }) => {
      return getDiscovery(query.merchantId)
    },
    {
      query: t.Object({
        merchantId: t.String(),
      }),
    },
  )
  .get('/supported', () => ({
    kinds: networks.map((n) => ({
      x402Version: 2,
      scheme: 'exact',
      network: n.caip2,
    })),
    extensions: [],
    signers: {},
  }))
  .get('/.well-known/x402.json', () => ({
    version: '2',
    facilitator: {
      name: '402md Facilitator',
      url: process.env.FACILITATOR_URL ?? 'https://api.402md.com',
      networks: networks.map((n) => n.caip2),
      bridgeProvider: 'circle-cctp-v2',
      crossChain: true,
    },
  }))
