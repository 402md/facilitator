import { Method } from 'mppx'
import { z } from 'zod'

export const solanaCharge = Method.from({
  name: 'solana',
  intent: 'charge',
  schema: {
    credential: {
      payload: z.object({ type: z.literal('signature'), signature: z.string() }),
    },
    request: z.object({
      amount: z.string(),
      currency: z.string(),
      recipient: z.string(),
      methodDetails: z.object({ network: z.string() }).optional(),
    }),
  },
})
