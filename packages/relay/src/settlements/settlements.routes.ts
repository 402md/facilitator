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
      return verifyPayment(body)
    },
    {
      body: t.Object({
        paymentPayload: t.Any(),
        paymentRequirements: t.Any(),
      }),
    },
  )
  .post(
    '/settle',
    async ({ body }) => {
      return dispatchSettlement(body)
    },
    {
      body: t.Object({
        paymentPayload: t.Any(),
        paymentRequirements: t.Any(),
      }),
    },
  )
  .get('/bridge/status/:workflowId', async ({ params }) => {
    return getWorkflowStatus(params.workflowId)
  })
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
