import { getChainAdapter } from '@/shared/chains'
import type { CctpMintInput } from '@/shared/types'

export async function cctpMint(input: CctpMintInput): Promise<string> {
  const adapter = getChainAdapter(input.network)
  return adapter.cctpMint(input)
}
