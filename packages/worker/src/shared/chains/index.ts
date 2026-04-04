import type { ChainAdapter } from './types'
import type { Network } from '../types'

// Stub adapter for now - real implementation in Task 6
function createStubAdapter(): ChainAdapter {
  return {
    async pullFromBuyer() { throw new Error('Not implemented') },
    async transferToSeller() { throw new Error('Not implemented') },
    async cctpBurn() { throw new Error('Not implemented') },
    async cctpMint() { throw new Error('Not implemented') },
  }
}

const adapters: Record<string, () => ChainAdapter> = {
  'eip155:8453': () => createStubAdapter(),
}

export function getChainAdapter(network: Network): ChainAdapter {
  const factory = adapters[network]
  if (!factory) throw new Error(`Unsupported network: ${network}`)
  return factory()
}
