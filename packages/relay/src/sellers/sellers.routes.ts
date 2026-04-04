import { Elysia, t } from 'elysia'
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
    networks: [
      { network: 'eip155:8453', name: 'Base', asset: 'USDC' },
      { network: 'solana:mainnet', name: 'Solana', asset: 'USDC' },
      { network: 'stellar:pubnet', name: 'Stellar', asset: 'USDC' },
    ],
    bridgeProvider: 'circle-cctp-v2',
  }))
  .get('/.well-known/x402.json', () => ({
    version: '2',
    facilitator: {
      name: '402md Facilitator',
      url: process.env.FACILITATOR_URL ?? 'https://api.402md.com',
      networks: ['eip155:8453', 'solana:mainnet', 'stellar:pubnet'],
      bridgeProvider: 'circle-cctp-v2',
      crossChain: true,
    },
  }))
