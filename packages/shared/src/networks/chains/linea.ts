import { linea as lineaMainnet, lineaSepolia } from 'viem/chains'
import { createEvmAdapter } from '../evm-adapter'
import type { ChainDefinition } from '../adapter.types'

export const linea: ChainDefinition = {
  slug: 'linea',
  mainnet: {
    caip2: 'eip155:59144',
    usdc: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
    cctpDomain: 11,
    cctpTokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    cctpMessageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    viemChain: lineaMainnet,
    rpcUrlEnv: 'LINEA_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_LINEA',
    createAdapter: createEvmAdapter,
  },
  testnet: {
    caip2: 'eip155:59141',
    usdc: '0xFEce4462D57bD51A6A552365A011b95f0E16d9B7',
    cctpDomain: 11,
    cctpTokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    cctpMessageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    viemChain: lineaSepolia,
    rpcUrlEnv: 'LINEA_SEPOLIA_RPC_URL',
    rpcUrlDefault: null,
    facilitatorEnv: 'FACILITATOR_LINEA',
    createAdapter: createEvmAdapter,
  },
}
