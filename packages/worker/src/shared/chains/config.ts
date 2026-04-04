import type { Network } from '../types'

export interface ChainConfig {
  rpcUrl: string
  usdcAddress: string
  cctpTokenMessenger: string
  cctpMessageTransmitter: string
  cctpDomain: number
  facilitatorAddress: string
}

export const CCTP_DOMAINS: Record<string, number> = {
  'eip155:8453': 6,
  'solana:mainnet': 5,
  'stellar:pubnet': 7,
}

export const GAS_SCHEDULE: Record<string, string> = {
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

export function getGasAllowance(from: Network, to: Network): string {
  const key = `${from}->${to}`
  const allowance = GAS_SCHEDULE[key]
  if (!allowance) throw new Error(`No gas schedule for ${key}`)
  return allowance
}

export function getChainConfig(network: Network): ChainConfig {
  const configs: Record<string, () => ChainConfig> = {
    'eip155:8453': () => ({
      rpcUrl: process.env.BASE_RPC_URL!,
      usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      cctpTokenMessenger: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
      cctpMessageTransmitter: '0xAD09780d193884d503182aD4F75D113B9B1A7b0e',
      cctpDomain: 6,
      facilitatorAddress: process.env.FACILITATOR_BASE!,
    }),
    'solana:mainnet': () => ({
      rpcUrl: process.env.SOLANA_RPC_URL!,
      usdcAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      cctpTokenMessenger: '',
      cctpMessageTransmitter: '',
      cctpDomain: 5,
      facilitatorAddress: process.env.FACILITATOR_SOLANA!,
    }),
    'stellar:pubnet': () => ({
      rpcUrl: process.env.STELLAR_RPC_URL!,
      usdcAddress: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      cctpTokenMessenger: '',
      cctpMessageTransmitter: '',
      cctpDomain: 7,
      facilitatorAddress: process.env.FACILITATOR_STELLAR!,
    }),
  }
  const factory = configs[network]
  if (!factory) throw new Error(`Unsupported network: ${network}`)
  return factory()
}
