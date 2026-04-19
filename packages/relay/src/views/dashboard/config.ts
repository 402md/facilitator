export interface ChainConfig {
  slug: string
  caip2: string
  label: string
  symbol: string
}

// Ordered alphabetically on purpose — the per-chain grid renders with equal
// visual weight regardless of volume.
export const CHAINS: ChainConfig[] = [
  { slug: 'arbitrum', caip2: 'eip155:42161', label: 'Arbitrum', symbol: 'ARB' },
  { slug: 'base', caip2: 'eip155:8453', label: 'Base', symbol: 'BASE' },
  { slug: 'ethereum', caip2: 'eip155:1', label: 'Ethereum', symbol: 'ETH' },
  { slug: 'linea', caip2: 'eip155:59144', label: 'Linea', symbol: 'LIN' },
  { slug: 'optimism', caip2: 'eip155:10', label: 'Optimism', symbol: 'OP' },
  { slug: 'solana', caip2: 'solana:mainnet', label: 'Solana', symbol: 'SOL' },
  { slug: 'stellar', caip2: 'stellar:pubnet', label: 'Stellar', symbol: 'XLM' },
  { slug: 'unichain', caip2: 'eip155:130', label: 'Unichain', symbol: 'UNI' },
  { slug: 'worldchain', caip2: 'eip155:480', label: 'World Chain', symbol: 'WLD' },
]

export const EXPLORERS: Record<string, string> = {
  'eip155:8453': 'https://basescan.org/tx/',
  'eip155:1': 'https://etherscan.io/tx/',
  'eip155:10': 'https://optimistic.etherscan.io/tx/',
  'eip155:42161': 'https://arbiscan.io/tx/',
  'eip155:59144': 'https://lineascan.build/tx/',
  'eip155:130': 'https://uniscan.xyz/tx/',
  'eip155:480': 'https://worldscan.org/tx/',
  'solana:mainnet': 'https://solscan.io/tx/',
  'stellar:pubnet': 'https://stellar.expert/explorer/public/tx/',
}
