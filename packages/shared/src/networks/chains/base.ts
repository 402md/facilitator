import { base as baseMainnet, baseSepolia } from 'viem/chains'
import type { ChainAdapter, ChainDefinition, ResolvedNetwork } from '../adapter.types'

// Placeholder adapter — replaced in Task 11.
function stubAdapter(_resolved: ResolvedNetwork): ChainAdapter {
  return {
    pullFromBuyer: async () => {
      throw new Error('EVM adapter not yet wired (Task 11)')
    },
    transferToSeller: async () => {
      throw new Error('EVM adapter not yet wired (Task 11)')
    },
    cctpBurn: async () => {
      throw new Error('EVM adapter not yet wired (Task 11)')
    },
    cctpMint: async () => {
      throw new Error('EVM adapter not yet wired (Task 11)')
    },
  }
}

export const base: ChainDefinition = {
  slug: 'base',
  mainnet: {
    caip2: 'eip155:8453',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    cctpDomain: 6,
    cctpTokenMessenger: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
    cctpMessageTransmitter: '0xAD09780d193884d503182aD4F75D113B9B1A7b0e',
    viemChain: baseMainnet,
    rpcUrlEnv: 'BASE_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_BASE',
    createAdapter: stubAdapter,
  },
  testnet: {
    caip2: 'eip155:84532',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    cctpDomain: 6,
    cctpTokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    cctpMessageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
    viemChain: baseSepolia,
    rpcUrlEnv: 'BASE_SEPOLIA_RPC_URL',
    rpcUrlDefault: 'https://sepolia.base.org',
    facilitatorEnv: 'FACILITATOR_BASE',
    createAdapter: stubAdapter,
  },
}
