import { createSolanaAdapter } from '../solana-adapter'
import type { ChainDefinition } from '../adapter.types'

export const solana: ChainDefinition = {
  slug: 'solana',
  mainnet: {
    caip2: 'solana:mainnet',
    usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    cctpDomain: 5,
    cctpTokenMessenger: '',
    cctpMessageTransmitter: '',
    rpcUrlEnv: 'SOLANA_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_SOLANA',
    createAdapter: createSolanaAdapter,
  },
  testnet: {
    caip2: 'solana:devnet',
    usdc: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    cctpDomain: 5,
    cctpTokenMessenger: '',
    cctpMessageTransmitter: '',
    rpcUrlEnv: 'SOLANA_DEVNET_RPC_URL',
    rpcUrlDefault: 'https://api.devnet.solana.com',
    facilitatorEnv: 'FACILITATOR_SOLANA',
    createAdapter: createSolanaAdapter,
  },
}
