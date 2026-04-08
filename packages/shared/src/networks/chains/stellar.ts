import { Networks } from '@stellar/stellar-sdk'
import { createStellarAdapter } from '../stellar-adapter'
import type { ChainDefinition } from '../adapter.types'

export const stellar: ChainDefinition = {
  slug: 'stellar',
  mainnet: {
    caip2: 'stellar:pubnet',
    usdc: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    cctpDomain: 27,
    cctpTokenMessenger: '', // TODO: discover via Stellar explorer or Circle contact
    cctpMessageTransmitter: '', // TODO: discover via Stellar explorer or Circle contact
    cctpForwarder: '', // TODO: discover via Stellar explorer or Circle contact
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
    cctpTokenMessenger: 'CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP',
    cctpMessageTransmitter: 'CBJ6MTCKKZG73PMDZCJMSFRD7DQEMI4FKDH7CGDSV4W6FHCRBCQAVVJY',
    cctpForwarder: 'CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ',
    networkPassphrase: Networks.TESTNET,
    rpcUrlEnv: 'STELLAR_TESTNET_RPC_URL',
    rpcUrlDefault: 'https://soroban-testnet.stellar.org',
    facilitatorEnv: 'FACILITATOR_STELLAR',
    createAdapter: createStellarAdapter,
  },
}
