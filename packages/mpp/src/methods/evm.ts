import { Method } from 'mppx'
import { z } from 'zod'

export const evmCharge = Method.from({
  name: 'evm',
  intent: 'charge',
  schema: {
    credential: {
      payload: z.object({ type: z.literal('hash'), hash: z.string() }),
    },
    request: z.object({
      amount: z.string(),
      currency: z.string(),
      recipient: z.string(),
      methodDetails: z.object({ chainId: z.number() }).optional(),
    }),
  },
})
