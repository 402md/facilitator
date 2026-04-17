import { base as baseMainnet, baseSepolia } from 'viem/chains'
import { createEvmAdapter } from '../evm-adapter'
import type { ChainDefinition } from '../adapter.types'

export const base: ChainDefinition = {
  slug: 'base',
  mainnet: {
    caip2: 'eip155:8453',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    cctpDomain: 6,
    cctpTokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    cctpMessageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    viemChain: baseMainnet,
    rpcUrlEnv: 'BASE_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_BASE',
    createAdapter: createEvmAdapter,
  },
  testnet: {
    caip2: 'eip155:84532',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    cctpDomain: 6,
    cctpTokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    cctpMessageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    viemChain: baseSepolia,
    rpcUrlEnv: 'BASE_SEPOLIA_RPC_URL',
    rpcUrlDefault: 'https://sepolia.base.org',
    facilitatorEnv: 'FACILITATOR_BASE',
    createAdapter: createEvmAdapter,
  },
}
