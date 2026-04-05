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
  process.env.SOLANA_DEVNET_RPC_URL = 'https://api.devnet.solana.com'
  process.env.STELLAR_TESTNET_RPC_URL = 'https://soroban-testnet.stellar.org'
  process.env.FACILITATOR_BASE = '0x0000000000000000000000000000000000000001'
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
    expect(supportedCaip2s).toContain('solana:devnet')
    expect(supportedCaip2s).toContain('stellar:testnet')
    expect(supportedCaip2s).not.toContain('eip155:8453')
  })

  test('networks array has one entry per chain', () => {
    expect(networks).toHaveLength(3)
    const slugs = networks.map((n) => n.slug)
    expect(slugs).toContain('base')
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

  test('getNetwork throws UnsupportedNetworkError for inactive (mainnet) CAIP-2', () => {
    expect(() => getNetwork('eip155:8453')).toThrow(UnsupportedNetworkError)
  })

  test('getNetwork throws UnsupportedNetworkError for unknown CAIP-2', () => {
    expect(() => getNetwork('eip155:1')).toThrow(UnsupportedNetworkError)
  })

  test('getFacilitatorAddress returns env value', () => {
    expect(getFacilitatorAddress('eip155:84532')).toBe('0x0000000000000000000000000000000000000001')
  })
})
