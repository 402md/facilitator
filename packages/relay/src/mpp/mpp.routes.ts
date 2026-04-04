import { Elysia, t } from 'elysia'
import { getMppConfig, verifyCharge, settleCharge, handleSessionAction } from './mpp.service'

export const mppRoutes = new Elysia({ prefix: '/merchants' })
  .get('/:merchantId/mpp/config', async ({ params }) => {
    return getMppConfig(params.merchantId)
  }, {
    params: t.Object({ merchantId: t.String() }),
  })
  .post('/:merchantId/mpp/verify', async ({ params, body }) => {
    if (body.intent === 'session') {
      return handleSessionAction(params.merchantId, body)
    }
    return verifyCharge(params.merchantId, body)
  }, {
    params: t.Object({ merchantId: t.String() }),
    body: t.Object({
      method: t.String(),
      intent: t.String(),
      txHash: t.Optional(t.String()),
      challengeId: t.String(),
      amount: t.String(),
      buyerNetwork: t.String(),
      action: t.Optional(t.String()),
      channelAddress: t.Optional(t.String()),
      cumulativeAmount: t.Optional(t.String()),
      signature: t.Optional(t.String()),
    }),
  })
  .post('/:merchantId/mpp/settle', async ({ params, body }) => {
    return settleCharge(params.merchantId, body)
  }, {
    params: t.Object({ merchantId: t.String() }),
    body: t.Object({
      method: t.String(),
      intent: t.String(),
      txHash: t.String(),
      amount: t.String(),
      buyerNetwork: t.String(),
    }),
  })
