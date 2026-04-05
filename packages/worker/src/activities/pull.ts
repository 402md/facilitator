import { getAdapter } from '@402md/shared/networks'
import type { PullFromBuyerInput } from '@402md/shared/networks'

export async function pullFromBuyer(input: PullFromBuyerInput): Promise<string> {
  const adapter = getAdapter(input.network)
  return adapter.pullFromBuyer(input)
}
