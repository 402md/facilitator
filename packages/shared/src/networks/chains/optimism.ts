import { optimism as optimismMainnet, optimismSepolia } from 'viem/chains'
import { createEvmAdapter } from '../evm-adapter'
import type { ChainDefinition } from '../adapter.types'

export const optimism: ChainDefinition = {
  slug: 'optimism',
  mainnet: {
    caip2: 'eip155:10',
    usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    cctpDomain: 2,
    cctpTokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    cctpMessageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    viemChain: optimismMainnet,
    rpcUrlEnv: 'OPTIMISM_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_OPTIMISM',
    createAdapter: createEvmAdapter,
  },
  testnet: {
    caip2: 'eip155:11155420',
    usdc: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    cctpDomain: 2,
    cctpTokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    cctpMessageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    viemChain: optimismSepolia,
    rpcUrlEnv: 'OPTIMISM_SEPOLIA_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_OPTIMISM',
    createAdapter: createEvmAdapter,
  },
}
