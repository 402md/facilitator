import { unichain as unichainMainnet, unichainSepolia } from 'viem/chains'
import { createEvmAdapter } from '../evm-adapter'
import type { ChainDefinition } from '../adapter.types'

export const unichain: ChainDefinition = {
  slug: 'unichain',
  mainnet: {
    caip2: 'eip155:130',
    usdc: '0x078D782b760474a361dDA0AF3839290b0EF57AD6',
    cctpDomain: 10,
    cctpTokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    cctpMessageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    viemChain: unichainMainnet,
    rpcUrlEnv: 'UNICHAIN_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_UNICHAIN',
    createAdapter: createEvmAdapter,
  },
  testnet: {
    caip2: 'eip155:1301',
    usdc: '0x31d0220469e10c4E71834a79b1f276d740d3768F',
    cctpDomain: 10,
    cctpTokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    cctpMessageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    viemChain: unichainSepolia,
    rpcUrlEnv: 'UNICHAIN_SEPOLIA_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_UNICHAIN',
    createAdapter: createEvmAdapter,
  },
}
