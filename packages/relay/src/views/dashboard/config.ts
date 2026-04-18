export interface ChainConfig {
  slug: string
  caip2: string
  label: string
}

// Ordered alphabetically on purpose — the per-chain grid renders with equal
// visual weight regardless of volume.
export const CHAINS: ChainConfig[] = [
  { slug: 'arbitrum', caip2: 'eip155:42161', label: 'Arbitrum' },
  { slug: 'base', caip2: 'eip155:8453', label: 'Base' },
  { slug: 'ethereum', caip2: 'eip155:1', label: 'Ethereum' },
  { slug: 'linea', caip2: 'eip155:59144', label: 'Linea' },
  { slug: 'optimism', caip2: 'eip155:10', label: 'Optimism' },
  { slug: 'solana', caip2: 'solana:mainnet', label: 'Solana' },
  { slug: 'stellar', caip2: 'stellar:pubnet', label: 'Stellar' },
  { slug: 'unichain', caip2: 'eip155:130', label: 'Unichain' },
  { slug: 'worldchain', caip2: 'eip155:480', label: 'World Chain' },
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
