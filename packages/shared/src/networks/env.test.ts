import { describe, expect, test, afterEach, beforeEach } from 'bun:test'
import { resolveNetworkEnv, validateNetworkEnv } from './env'

describe('resolveNetworkEnv', () => {
  const original = process.env.NETWORK_ENV

  afterEach(() => {
    if (original === undefined) delete process.env.NETWORK_ENV
    else process.env.NETWORK_ENV = original
  })

  test('defaults to testnet when unset', () => {
    delete process.env.NETWORK_ENV
    expect(resolveNetworkEnv()).toBe('testnet')
  })

  test('defaults to testnet when empty string', () => {
    process.env.NETWORK_ENV = ''
    expect(resolveNetworkEnv()).toBe('testnet')
  })

  test('returns "mainnet" when set to mainnet', () => {
    process.env.NETWORK_ENV = 'mainnet'
    expect(resolveNetworkEnv()).toBe('mainnet')
  })

  test('returns "testnet" when set to testnet', () => {
    process.env.NETWORK_ENV = 'testnet'
    expect(resolveNetworkEnv()).toBe('testnet')
  })

  test('throws on invalid value', () => {
    process.env.NETWORK_ENV = 'prod'
    expect(() => resolveNetworkEnv()).toThrow('Invalid NETWORK_ENV="prod"')
  })
})

const FACILITATOR_PREFIXES = [
  'BASE_',
  'ETHEREUM_',
  'OPTIMISM_',
  'ARBITRUM_',
  'LINEA_',
  'UNICHAIN_',
  'WORLDCHAIN_',
  'SOLANA_',
  'STELLAR_',
]

function wipeNetworkEnv() {
  for (const key of Object.keys(process.env)) {
    if (
      key.startsWith('FACILITATOR_') ||
      FACILITATOR_PREFIXES.some((p) => key.startsWith(p)) ||
      key === 'NETWORK_ENV'
    ) {
      delete process.env[key]
    }
  }
}

function setAllFacilitatorAddresses() {
  process.env.FACILITATOR_BASE = '0xabc'
  process.env.FACILITATOR_ETHEREUM = '0xabc'
  process.env.FACILITATOR_OPTIMISM = '0xabc'
  process.env.FACILITATOR_ARBITRUM = '0xabc'
  process.env.FACILITATOR_LINEA = '0xabc'
  process.env.FACILITATOR_UNICHAIN = '0xabc'
  process.env.FACILITATOR_WORLDCHAIN = '0xabc'
  process.env.FACILITATOR_SOLANA = 'SolAddr'
  process.env.FACILITATOR_STELLAR = 'StellarAddr'
}

describe('validateNetworkEnv (testnet, defaults)', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    wipeNetworkEnv()
    process.env.NETWORK_ENV = 'testnet'
    // Testnet requires explicit RPCs for the EVM newcomers (no sensible public defaults)
    process.env.ETHEREUM_SEPOLIA_RPC_URL = 'https://sepolia.example'
    process.env.OPTIMISM_SEPOLIA_RPC_URL = 'https://sepolia.example'
    process.env.ARBITRUM_SEPOLIA_RPC_URL = 'https://sepolia.example'
    process.env.LINEA_SEPOLIA_RPC_URL = 'https://sepolia.example'
    process.env.UNICHAIN_SEPOLIA_RPC_URL = 'https://sepolia.example'
    process.env.WORLDCHAIN_SEPOLIA_RPC_URL = 'https://sepolia.example'
    setAllFacilitatorAddresses()
  })

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key]
    }
    Object.assign(process.env, originalEnv)
  })

  test('returns ok when all facilitator addresses and required RPCs present', () => {
    const result = validateNetworkEnv()
    expect(result.ok).toBe(true)
    expect(result.missing).toEqual([])
  })

  test('unconfigured chains are skipped, not reported missing (opt-in)', () => {
    // Wipe everything and configure only Base — the other 8 chains should be silently disabled.
    wipeNetworkEnv()
    process.env.NETWORK_ENV = 'testnet'
    process.env.FACILITATOR_BASE = '0xabc'
    const result = validateNetworkEnv()
    expect(result.ok).toBe(true)
    expect(result.missing).toEqual([])
  })

  test('enabled chain with missing RPC is reported', () => {
    // Enable Arbitrum but don't set its RPC URL — it MUST be reported.
    delete process.env.ARBITRUM_SEPOLIA_RPC_URL
    const result = validateNetworkEnv()
    expect(result.ok).toBe(false)
    expect(result.missing).toContain('ARBITRUM_SEPOLIA_RPC_URL')
  })

  test('requirePrivateKeys reports only one FACILITATOR_PRIVATE_KEY_EVM (shared)', () => {
    const result = validateNetworkEnv({ requirePrivateKeys: true })
    expect(result.ok).toBe(false)
    expect(result.missing).toContain('FACILITATOR_PRIVATE_KEY_EVM')
    expect(result.missing).toContain('FACILITATOR_PRIVATE_KEY_SOLANA')
    expect(result.missing).toContain('FACILITATOR_PRIVATE_KEY_STELLAR')
    // EVM key should only appear once despite 7 EVM chains
    const evmOccurrences = result.missing.filter((m) => m === 'FACILITATOR_PRIVATE_KEY_EVM').length
    expect(evmOccurrences).toBe(1)
  })

  test('legacy FACILITATOR_PRIVATE_KEY_BASE is accepted as migration fallback for _EVM', () => {
    process.env.FACILITATOR_PRIVATE_KEY_BASE = '0xlegacy'
    process.env.FACILITATOR_PRIVATE_KEY_SOLANA = 'sol'
    process.env.FACILITATOR_PRIVATE_KEY_STELLAR = 'S...'
    const result = validateNetworkEnv({ requirePrivateKeys: true })
    expect(result.missing).not.toContain('FACILITATOR_PRIVATE_KEY_EVM')
  })
})

describe('validateNetworkEnv (mainnet)', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    wipeNetworkEnv()
    process.env.NETWORK_ENV = 'mainnet'
    setAllFacilitatorAddresses()
  })

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key]
    }
    Object.assign(process.env, originalEnv)
  })

  test('reports missing mainnet RPC URLs (no defaults)', () => {
    const result = validateNetworkEnv()
    expect(result.ok).toBe(false)
    expect(result.missing).toContain('BASE_RPC_URL')
    expect(result.missing).toContain('ETHEREUM_RPC_URL')
    expect(result.missing).toContain('OPTIMISM_RPC_URL')
    expect(result.missing).toContain('ARBITRUM_RPC_URL')
    expect(result.missing).toContain('LINEA_RPC_URL')
    expect(result.missing).toContain('UNICHAIN_RPC_URL')
    expect(result.missing).toContain('WORLDCHAIN_RPC_URL')
    expect(result.missing).toContain('SOLANA_RPC_URL')
    expect(result.missing).toContain('STELLAR_RPC_URL')
  })
})
