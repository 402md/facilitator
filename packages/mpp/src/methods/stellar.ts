import { Method } from 'mppx'
import { z } from 'zod'

export const stellarCharge = Method.from({
  name: 'stellar',
  intent: 'charge',
  schema: {
    credential: {
      payload: z.object({ type: z.literal('hash'), hash: z.string() }),
    },
    request: z.object({
      amount: z.string(),
      currency: z.string(),
      recipient: z.string(),
      description: z.string().optional(),
      externalId: z.string().optional(),
      methodDetails: z.object({ network: z.string() }).optional(),
    }),
  },
})
