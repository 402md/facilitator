import { Networks } from '@stellar/stellar-sdk'
import type { ChainAdapter, ChainDefinition, ResolvedNetwork } from '../adapter.types'

// Placeholder adapter — replaced in Task 13.
function stubAdapter(_resolved: ResolvedNetwork): ChainAdapter {
  return {
    pullFromBuyer: async () => {
      throw new Error('Stellar adapter not yet wired (Task 13)')
    },
    transferToSeller: async () => {
      throw new Error('Stellar adapter not yet wired (Task 13)')
    },
    cctpBurn: async () => {
      throw new Error('Stellar adapter not yet wired (Task 13)')
    },
    cctpMint: async () => {
      throw new Error('Stellar adapter not yet wired (Task 13)')
    },
  }
}

export const stellar: ChainDefinition = {
  slug: 'stellar',
  mainnet: {
    caip2: 'stellar:pubnet',
    usdc: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    cctpDomain: 7,
    cctpTokenMessenger: '',
    cctpMessageTransmitter: '',
    networkPassphrase: Networks.PUBLIC,
    rpcUrlEnv: 'STELLAR_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_STELLAR',
    createAdapter: stubAdapter,
  },
  testnet: {
    caip2: 'stellar:testnet',
    usdc: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    cctpDomain: 7,
    cctpTokenMessenger: '',
    cctpMessageTransmitter: '',
    networkPassphrase: Networks.TESTNET,
    rpcUrlEnv: 'STELLAR_TESTNET_RPC_URL',
    rpcUrlDefault: 'https://soroban-testnet.stellar.org',
    facilitatorEnv: 'FACILITATOR_STELLAR',
    createAdapter: stubAdapter,
  },
}
