import { getAdapter } from '@402md/shared/networks'
import type { CctpBurnInput, CctpBurnResult } from '@402md/shared/networks'

export async function cctpBurn(input: CctpBurnInput): Promise<CctpBurnResult> {
  const adapter = getAdapter(input.fromNetwork)
  return adapter.cctpBurn(input)
}
