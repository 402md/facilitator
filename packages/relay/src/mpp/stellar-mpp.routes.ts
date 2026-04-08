import { Elysia, t } from 'elysia'
import { handleCharge, getMppConfig } from './stellar-mpp.service'

export const stellarMppRoutes = new Elysia({ prefix: '/merchants' })
  .get(
    '/:merchantId/mpp/config',
    async ({ params }) => {
      return getMppConfig(params.merchantId)
    },
    {
      params: t.Object({ merchantId: t.String() }),
    },
  )
  .all(
    '/:merchantId/mpp/charge',
    async ({ params, query, request }) => {
      const amount = query.amount ?? '0'
      const response = await handleCharge(params.merchantId, amount, request)

      if (response.status === 402) {
        return new Response(response.body, {
          status: 402,
          headers: response.headers,
        })
      }

      return response
    },
    {
      params: t.Object({ merchantId: t.String() }),
      query: t.Object({ amount: t.Optional(t.String()) }),
    },
  )
