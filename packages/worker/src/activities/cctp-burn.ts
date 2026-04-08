import { getAdapter, getNetwork } from '@402md/shared/networks'
import type { CctpBurnInput, CctpBurnResult } from '@402md/shared/networks'

export async function cctpBurn(input: CctpBurnInput): Promise<CctpBurnResult> {
  const adapter = getAdapter(input.fromNetwork)
  const destNetwork = getNetwork(input.toNetwork)
  return adapter.cctpBurn({
    ...input,
    cctpForwarder: destNetwork.cctpForwarder,
  })
}
