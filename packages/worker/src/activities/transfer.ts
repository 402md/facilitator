import { getChainAdapter } from '@/shared/chains'
import type { TransferToSellerInput } from '@/shared/types'

export async function transferToSeller(input: TransferToSellerInput): Promise<string> {
  const adapter = getChainAdapter(input.network)
  return adapter.transferToSeller(input)
}
