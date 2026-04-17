import { mainnet, sepolia } from 'viem/chains'
import { createEvmAdapter } from '../evm-adapter'
import type { ChainDefinition } from '../adapter.types'

export const ethereum: ChainDefinition = {
  slug: 'ethereum',
  mainnet: {
    caip2: 'eip155:1',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    cctpDomain: 0,
    cctpTokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    cctpMessageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    viemChain: mainnet,
    rpcUrlEnv: 'ETHEREUM_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_ETHEREUM',
    createAdapter: createEvmAdapter,
  },
  testnet: {
    caip2: 'eip155:11155111',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    cctpDomain: 0,
    cctpTokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    cctpMessageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    viemChain: sepolia,
    rpcUrlEnv: 'ETHEREUM_SEPOLIA_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_ETHEREUM',
    createAdapter: createEvmAdapter,
  },
}
