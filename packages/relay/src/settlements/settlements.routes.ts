import { Elysia, t } from 'elysia'
import {
  verifyPayment,
  dispatchSettlement,
  getWorkflowStatus,
  getFeeQuote,
} from './settlements.service'

export const settlementsRoutes = new Elysia()
  .post(
    '/verify',
    async ({ body }) => {
      console.log('[verify] req:', JSON.stringify(body, null, 2))
      const result = await verifyPayment(body)
      console.log('[verify] res:', JSON.stringify(result))
      return result
    },
    {
      body: t.Object({
        x402Version: t.Number(),
        paymentPayload: t.Any(),
        paymentRequirements: t.Any(),
      }),
      detail: { hide: true },
    },
  )
  .post(
    '/settle',
    async ({ body }) => {
      return dispatchSettlement(body)
    },
    {
      body: t.Object({
        x402Version: t.Number(),
        paymentPayload: t.Any(),
        paymentRequirements: t.Any(),
      }),
      detail: { hide: true },
    },
  )
  .get(
    '/bridge/status/:workflowId',
    async ({ params }) => {
      return getWorkflowStatus(params.workflowId)
    },
    { detail: { hide: true } },
  )
  .get(
    '/bridge/fees',
    async ({ query }) => {
      return getFeeQuote(query.from, query.to, query.amount)
    },
    {
      query: t.Object({
        from: t.String(),
        to: t.String(),
        amount: t.String(),
      }),
    },
  )
