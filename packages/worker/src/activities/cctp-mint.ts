import { getAdapter } from '@402md/shared/networks'
import type { CctpMintInput } from '@402md/shared/networks'

export async function cctpMint(input: CctpMintInput): Promise<string> {
  const adapter = getAdapter(input.network)
  return adapter.cctpMint(input)
}
