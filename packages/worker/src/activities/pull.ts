import { getChainAdapter } from '@/shared/chains'
import type { PullFromBuyerInput } from '@/shared/types'

export async function pullFromBuyer(input: PullFromBuyerInput): Promise<string> {
  const adapter = getChainAdapter(input.network)
  return adapter.pullFromBuyer(input)
}
