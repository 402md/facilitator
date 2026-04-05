import type { ChainAdapter, ChainDefinition, ResolvedNetwork } from '../adapter.types'

// Placeholder adapter — replaced in Task 12.
function stubAdapter(_resolved: ResolvedNetwork): ChainAdapter {
  return {
    pullFromBuyer: async () => {
      throw new Error('Solana adapter not yet wired (Task 12)')
    },
    transferToSeller: async () => {
      throw new Error('Solana adapter not yet wired (Task 12)')
    },
    cctpBurn: async () => {
      throw new Error('Solana adapter not yet wired (Task 12)')
    },
    cctpMint: async () => {
      throw new Error('Solana adapter not yet wired (Task 12)')
    },
  }
}

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
    createAdapter: stubAdapter,
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
    createAdapter: stubAdapter,
  },
}
