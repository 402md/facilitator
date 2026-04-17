import { describe, expect, test, beforeAll } from 'bun:test'
import type {
  supportedCaip2s as SupportedCaip2sType,
  getNetwork as GetNetworkType,
  getFacilitatorAddress as GetFacilitatorAddressType,
  networks as NetworksType,
} from './index'
import { UnsupportedNetworkError } from './errors'

// Env vars must be set BEFORE index.ts is first imported (it resolves them at module load).
// Using dynamic import in beforeAll to control ordering.
let supportedCaip2s: typeof SupportedCaip2sType
let getNetwork: typeof GetNetworkType
let getFacilitatorAddress: typeof GetFacilitatorAddressType
let networks: typeof NetworksType

beforeAll(async () => {
  process.env.NETWORK_ENV = 'testnet'
  process.env.BASE_SEPOLIA_RPC_URL = 'https://sepolia.base.org'
  process.env.ETHEREUM_SEPOLIA_RPC_URL = 'https://sepolia.example'
  process.env.OPTIMISM_SEPOLIA_RPC_URL = 'https://sepolia.example'
  process.env.ARBITRUM_SEPOLIA_RPC_URL = 'https://sepolia.example'
  process.env.LINEA_SEPOLIA_RPC_URL = 'https://sepolia.example'
  process.env.UNICHAIN_SEPOLIA_RPC_URL = 'https://sepolia.example'
  process.env.WORLDCHAIN_SEPOLIA_RPC_URL = 'https://sepolia.example'
  process.env.SOLANA_DEVNET_RPC_URL = 'https://api.devnet.solana.com'
  process.env.STELLAR_TESTNET_RPC_URL = 'https://soroban-testnet.stellar.org'
  process.env.FACILITATOR_BASE = '0x0000000000000000000000000000000000000001'
  process.env.FACILITATOR_ETHEREUM = '0x0000000000000000000000000000000000000001'
  process.env.FACILITATOR_OPTIMISM = '0x0000000000000000000000000000000000000001'
  process.env.FACILITATOR_ARBITRUM = '0x0000000000000000000000000000000000000001'
  process.env.FACILITATOR_LINEA = '0x0000000000000000000000000000000000000001'
  process.env.FACILITATOR_UNICHAIN = '0x0000000000000000000000000000000000000001'
  process.env.FACILITATOR_WORLDCHAIN = '0x0000000000000000000000000000000000000001'
  process.env.FACILITATOR_SOLANA = 'FacilitatorSolAddr'
  process.env.FACILITATOR_STELLAR = 'FacilitatorStellarAddr'
  const mod = await import('./index')
  supportedCaip2s = mod.supportedCaip2s
  getNetwork = mod.getNetwork
  getFacilitatorAddress = mod.getFacilitatorAddress
  networks = mod.networks
})

describe('networks registry (testnet env)', () => {
  test('supportedCaip2s contains active testnet CAIP-2s', () => {
    expect(supportedCaip2s).toContain('eip155:84532')
    expect(supportedCaip2s).toContain('eip155:11155111') // Ethereum Sepolia
    expect(supportedCaip2s).toContain('eip155:11155420') // OP Sepolia
    expect(supportedCaip2s).toContain('eip155:421614') // Arbitrum Sepolia
    expect(supportedCaip2s).toContain('eip155:59141') // Linea Sepolia
    expect(supportedCaip2s).toContain('eip155:1301') // Unichain Sepolia
    expect(supportedCaip2s).toContain('eip155:4801') // World Chain Sepolia
    expect(supportedCaip2s).toContain('solana:devnet')
    expect(supportedCaip2s).toContain('stellar:testnet')
    expect(supportedCaip2s).not.toContain('eip155:8453')
    expect(supportedCaip2s).not.toContain('eip155:1')
  })

  test('networks array has one entry per chain', () => {
    expect(networks).toHaveLength(9)
    const slugs = networks.map((n) => n.slug)
    expect(slugs).toContain('base')
    expect(slugs).toContain('ethereum')
    expect(slugs).toContain('optimism')
    expect(slugs).toContain('arbitrum')
    expect(slugs).toContain('linea')
    expect(slugs).toContain('unichain')
    expect(slugs).toContain('worldchain')
    expect(slugs).toContain('solana')
    expect(slugs).toContain('stellar')
  })

  test('getNetwork returns resolved config for active CAIP-2', () => {
    const n = getNetwork('eip155:84532')
    expect(n.slug).toBe('base')
    expect(n.usdc).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e')
    expect(n.rpcUrl).toBe('https://sepolia.base.org')
    expect(n.facilitatorAddress).toBe('0x0000000000000000000000000000000000000001')
  })

  test('getNetwork resolves Arbitrum Sepolia with correct USDC + CCTP domain', () => {
    const n = getNetwork('eip155:421614')
    expect(n.slug).toBe('arbitrum')
    expect(n.usdc).toBe('0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d')
    expect(n.cctpDomain).toBe(3)
  })

  test('getNetwork resolves Ethereum Sepolia', () => {
    const n = getNetwork('eip155:11155111')
    expect(n.slug).toBe('ethereum')
    expect(n.cctpDomain).toBe(0)
  })

  test('getNetwork throws UnsupportedNetworkError for inactive (mainnet) CAIP-2', () => {
    expect(() => getNetwork('eip155:8453')).toThrow(UnsupportedNetworkError)
    expect(() => getNetwork('eip155:1')).toThrow(UnsupportedNetworkError)
    expect(() => getNetwork('eip155:42161')).toThrow(UnsupportedNetworkError)
  })

  test('getNetwork throws UnsupportedNetworkError for unknown CAIP-2', () => {
    expect(() => getNetwork('eip155:999999')).toThrow(UnsupportedNetworkError)
  })

  test('getFacilitatorAddress returns env value', () => {
    expect(getFacilitatorAddress('eip155:84532')).toBe('0x0000000000000000000000000000000000000001')
    expect(getFacilitatorAddress('eip155:421614')).toBe(
      '0x0000000000000000000000000000000000000001',
    )
  })
})
