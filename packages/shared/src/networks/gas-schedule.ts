import type { ChainSlug } from './adapter.types'

// Gas allowance in USDC atomic units (6 decimals). Covers all on-chain txs:
// Same-chain: pull + transfer
// Cross-chain: pull (source) + CCTP burn (source) + CCTP mint (destination)
//
// EXPLICIT_COSTS holds numbers we've calibrated against real chain behavior.
// Pairs not listed here are derived by `computeGasAllowance` from the chain
// class (EVM vs Solana vs Stellar) using the same per-class cost the existing
// entries encode. Add an entry here to override a derived value.
const EXPLICIT_COSTS: Record<string, string> = {
  'base->base': '2000', // 2 Base txs (pull + transfer)
  'base->stellar': '3200', // 2 Base txs + 1 Soroban call
  'base->solana': '3500', // 2 Base txs + 1 Solana tx
  'stellar->stellar': '10', // 1 Stellar tx (direct payment, no burn/mint)
  'stellar->base': '2500', // 2 Soroban calls + 1 Base tx
  'stellar->solana': '1500', // 2 Soroban calls + 1 Solana tx
  'solana->solana': '1000', // 2 Solana txs
  'solana->base': '3500', // 2 Solana txs + 1 Base tx
  'solana->stellar': '2500', // 2 Solana txs + 1 Soroban call
}

const CCTP_DOMAINS: Record<ChainSlug, number> = {
  base: 6,
  ethereum: 0,
  optimism: 2,
  arbitrum: 3,
  linea: 11,
  unichain: 10,
  worldchain: 14,
  solana: 5,
  stellar: 27,
}

const EVM_SLUGS: ReadonlySet<ChainSlug> = new Set([
  'base',
  'ethereum',
  'optimism',
  'arbitrum',
  'linea',
  'unichain',
  'worldchain',
])

function isEvm(slug: ChainSlug): boolean {
  return EVM_SLUGS.has(slug)
}

function computeGasAllowance(from: ChainSlug, to: ChainSlug): string {
  const explicit = EXPLICIT_COSTS[`${from}->${to}`]
  if (explicit) return explicit

  const fromEvm = isEvm(from)
  const toEvm = isEvm(to)

  // EVM same-chain: 2 txs (pull + transfer) → 2000
  // EVM cross-chain: 3 txs (pull + burn + mint), all EVM → 3000
  if (fromEvm && toEvm) {
    return from === to ? '2000' : '3000'
  }
  // EVM -> Solana: 2 EVM txs + 1 Solana tx (same shape as base->solana)
  if (fromEvm && to === 'solana') return '3500'
  // EVM -> Stellar: 2 EVM txs + 1 Soroban call (same shape as base->stellar)
  if (fromEvm && to === 'stellar') return '3200'
  // Solana -> EVM: 2 Solana txs + 1 EVM mint (same shape as solana->base)
  if (from === 'solana' && toEvm) return '3500'
  // Stellar -> EVM: 2 Soroban calls + 1 EVM mint (same shape as stellar->base)
  if (from === 'stellar' && toEvm) return '2500'

  throw new Error(`No gas schedule for ${from}->${to}`)
}

export function getGasAllowanceBySlug(from: ChainSlug, to: ChainSlug): string {
  return computeGasAllowance(from, to)
}

export function getCctpDomainBySlug(slug: ChainSlug): number {
  return CCTP_DOMAINS[slug]
}

export function calculateFeesBySlug(
  grossAmount: string,
  fromSlug: ChainSlug,
  toSlug: ChainSlug,
  platformFeeBps = 0,
): { gasAllowance: string; platformFee: string; netAmount: string } {
  const gasAllowance = getGasAllowanceBySlug(fromSlug, toSlug)
  const platformFee =
    platformFeeBps > 0 ? ((BigInt(grossAmount) * BigInt(platformFeeBps)) / 10000n).toString() : '0'
  const netAmount = (BigInt(grossAmount) - BigInt(gasAllowance) - BigInt(platformFee)).toString()
  return { gasAllowance, platformFee, netAmount }
}
