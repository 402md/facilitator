import { worldchain as worldchainMainnet, worldchainSepolia } from 'viem/chains'
import { createEvmAdapter } from '../evm-adapter'
import type { ChainDefinition } from '../adapter.types'

export const worldchain: ChainDefinition = {
  slug: 'worldchain',
  mainnet: {
    caip2: 'eip155:480',
    usdc: '0x79A02482A880bCe3F13E09da970dC34dB4cD24D1',
    cctpDomain: 14,
    cctpTokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    cctpMessageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    viemChain: worldchainMainnet,
    rpcUrlEnv: 'WORLDCHAIN_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_WORLDCHAIN',
    createAdapter: createEvmAdapter,
  },
  testnet: {
    caip2: 'eip155:4801',
    usdc: '0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88',
    cctpDomain: 14,
    cctpTokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    cctpMessageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    viemChain: worldchainSepolia,
    rpcUrlEnv: 'WORLDCHAIN_SEPOLIA_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_WORLDCHAIN',
    createAdapter: createEvmAdapter,
  },
}
