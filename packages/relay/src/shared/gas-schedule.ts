const GAS_SCHEDULE: Record<string, string> = {
  'eip155:8453->solana:mainnet': '800',
  'eip155:8453->stellar:pubnet': '500',
  'solana:mainnet->eip155:8453': '1200',
  'solana:mainnet->stellar:pubnet': '800',
  'stellar:pubnet->eip155:8453': '500',
  'stellar:pubnet->solana:mainnet': '800',
  'eip155:8453->eip155:8453': '400',
  'solana:mainnet->solana:mainnet': '800',
  'stellar:pubnet->stellar:pubnet': '6',
}

export function getGasAllowance(from: string, to: string): string {
  const key = `${from}->${to}`
  const allowance = GAS_SCHEDULE[key]
  if (!allowance) throw new Error(`No gas schedule for ${key}`)
  return allowance
}

export function calculateFees(
  grossAmount: string,
  from: string,
  to: string,
  platformFeeBps: number = 0,
): { gasAllowance: string; platformFee: string; netAmount: string } {
  const gasAllowance = getGasAllowance(from, to)
  const platformFee =
    platformFeeBps > 0 ? ((BigInt(grossAmount) * BigInt(platformFeeBps)) / 10000n).toString() : '0'
  const netAmount = (BigInt(grossAmount) - BigInt(gasAllowance) - BigInt(platformFee)).toString()
  return { gasAllowance, platformFee, netAmount }
}
