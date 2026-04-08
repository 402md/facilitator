import { Networks } from '@stellar/stellar-sdk'
import { createStellarAdapter } from '../stellar-adapter'
import type { ChainDefinition } from '../adapter.types'

export const stellar: ChainDefinition = {
  slug: 'stellar',
  mainnet: {
    caip2: 'stellar:pubnet',
    usdc: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    cctpDomain: 27,
    cctpTokenMessenger: '',
    cctpMessageTransmitter: '',
    networkPassphrase: Networks.PUBLIC,
    rpcUrlEnv: 'STELLAR_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_STELLAR',
    createAdapter: createStellarAdapter,
  },
  testnet: {
    caip2: 'stellar:testnet',
    usdc: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    cctpDomain: 27,
    cctpTokenMessenger: '',
    cctpMessageTransmitter: '',
    networkPassphrase: Networks.TESTNET,
    rpcUrlEnv: 'STELLAR_TESTNET_RPC_URL',
    rpcUrlDefault: 'https://soroban-testnet.stellar.org',
    facilitatorEnv: 'FACILITATOR_STELLAR',
    createAdapter: createStellarAdapter,
  },
}
