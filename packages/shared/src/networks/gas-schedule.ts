import type { ChainSlug } from './adapter.types'

// Gas allowance in USDC atomic units (6 decimals). Covers all on-chain txs:
// Same-chain: pull + transfer
// Cross-chain: pull + CCTP burn (source) + CCTP mint (destination)
const GAS_SCHEDULE: Record<string, string> = {
  'base->base': '2000', // 2 Base txs
  'base->stellar': '3200', // 2 Base txs + 1 Soroban call
  'base->solana': '3500', // 2 Base txs + 1 Solana tx
  'stellar->stellar': '10', // 1 Stellar tx
  'stellar->base': '2500', // 2 Soroban calls + 1 Base tx
  'stellar->solana': '1500', // 2 Soroban calls + 1 Solana tx
  'solana->solana': '1000', // 2 Solana txs
  'solana->base': '3500', // 2 Solana txs + 1 Base tx
  'solana->stellar': '2500', // 2 Solana txs + 1 Soroban call
}

const CCTP_DOMAINS: Record<ChainSlug, number> = {
  base: 6,
  solana: 5,
  stellar: 27,
}

export function getGasAllowanceBySlug(from: ChainSlug, to: ChainSlug): string {
  const key = `${from}->${to}`
  const value = GAS_SCHEDULE[key]
  if (value === undefined) {
    throw new Error(`No gas schedule for ${key}`)
  }
  return value
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
