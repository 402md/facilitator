import { defineQuery, setHandler } from '@temporalio/workflow'

interface RebalanceParams {
  fromNetwork: string
  toNetwork: string
  amount: string
  destinationDomain: number
  reason: 'threshold' | 'manual'
}

interface RebalanceResult {
  success: boolean
  burnTxHash: string
  mintTxHash: string
  amount: string
  fromNetwork: string
  toNetwork: string
}

export const statusQuery = defineQuery<{ step: string }>('status')

export async function rebalance(params: RebalanceParams): Promise<RebalanceResult> {
  setHandler(statusQuery, () => ({ step: 'not_implemented' }))
  throw new Error(
    `Rebalance workflow not implemented (Model B). ` +
    `Requested: ${params.fromNetwork} -> ${params.toNetwork}, amount: ${params.amount}`
  )
}
