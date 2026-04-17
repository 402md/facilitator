import { arbitrum as arbitrumMainnet, arbitrumSepolia } from 'viem/chains'
import { createEvmAdapter } from '../evm-adapter'
import type { ChainDefinition } from '../adapter.types'

export const arbitrum: ChainDefinition = {
  slug: 'arbitrum',
  mainnet: {
    caip2: 'eip155:42161',
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    cctpDomain: 3,
    cctpTokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    cctpMessageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    viemChain: arbitrumMainnet,
    rpcUrlEnv: 'ARBITRUM_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_ARBITRUM',
    createAdapter: createEvmAdapter,
  },
  testnet: {
    caip2: 'eip155:421614',
    usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    cctpDomain: 3,
    cctpTokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    cctpMessageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    viemChain: arbitrumSepolia,
    rpcUrlEnv: 'ARBITRUM_SEPOLIA_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_ARBITRUM',
    createAdapter: createEvmAdapter,
  },
}
