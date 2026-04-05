import { getAdapter } from '@402md/shared/networks'
import type { TransferToSellerInput } from '@402md/shared/networks'

export async function transferToSeller(input: TransferToSellerInput): Promise<string> {
  const adapter = getAdapter(input.network)
  return adapter.transferToSeller(input)
}
