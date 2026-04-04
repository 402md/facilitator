import { getChainAdapter } from '@/shared/chains'
import type { CctpBurnInput, CctpBurnResult } from '@/shared/types'

export async function cctpBurn(input: CctpBurnInput): Promise<CctpBurnResult> {
  const adapter = getChainAdapter(input.fromNetwork)
  return adapter.cctpBurn(input)
}
