import type { ChainSlug } from './adapter.types'

const GAS_SCHEDULE: Record<string, string> = {
  'base->solana': '800',
  'base->stellar': '500',
  'solana->base': '1200',
  'solana->stellar': '800',
  'stellar->base': '500',
  'stellar->solana': '800',
  'base->base': '400',
  'solana->solana': '800',
  'stellar->stellar': '6',
}

const CCTP_DOMAINS: Record<ChainSlug, number> = {
  base: 6,
  solana: 5,
  stellar: 7,
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
