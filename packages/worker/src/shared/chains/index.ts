import type { ChainAdapter } from './types'
import type { Network } from '../types'
import { createBaseAdapter } from './base'
import { createSolanaAdapter } from './solana'
import { createStellarAdapter } from './stellar'

const adapters: Record<string, () => ChainAdapter> = {
  'eip155:8453': () => createBaseAdapter(),
  'solana:mainnet': () => createSolanaAdapter(),
  'stellar:pubnet': () => createStellarAdapter(),
}

export function getChainAdapter(network: Network): ChainAdapter {
  const factory = adapters[network]
  if (!factory) throw new Error(`Unsupported network: ${network}`)
  return factory()
}
