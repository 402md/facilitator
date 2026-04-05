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

describe('validateNetworkEnv (testnet, defaults)', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Wipe all env vars this test touches
    for (const key of Object.keys(process.env)) {
      if (
        key.startsWith('FACILITATOR_') ||
        key.startsWith('BASE_') ||
        key.startsWith('SOLANA_') ||
        key.startsWith('STELLAR_') ||
        key === 'NETWORK_ENV'
      ) {
        delete process.env[key]
      }
    }
    process.env.NETWORK_ENV = 'testnet'
    process.env.FACILITATOR_BASE = '0xabc'
    process.env.FACILITATOR_SOLANA = 'SolAddr'
    process.env.FACILITATOR_STELLAR = 'StellarAddr'
  })

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key]
    }
    Object.assign(process.env, originalEnv)
  })

  test('returns ok when all facilitator addresses present', () => {
    const result = validateNetworkEnv()
    expect(result.ok).toBe(true)
    expect(result.missing).toEqual([])
  })

  test('reports missing facilitator address', () => {
    delete process.env.FACILITATOR_BASE
    const result = validateNetworkEnv()
    expect(result.ok).toBe(false)
    expect(result.missing).toContain('FACILITATOR_BASE')
  })

  test('requirePrivateKeys reports missing private key vars', () => {
    const result = validateNetworkEnv({ requirePrivateKeys: true })
    expect(result.ok).toBe(false)
    expect(result.missing).toContain('FACILITATOR_PRIVATE_KEY_BASE')
    expect(result.missing).toContain('FACILITATOR_PRIVATE_KEY_SOLANA')
    expect(result.missing).toContain('FACILITATOR_PRIVATE_KEY_STELLAR')
  })
})

describe('validateNetworkEnv (mainnet)', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (
        key.startsWith('FACILITATOR_') ||
        key.startsWith('BASE_') ||
        key.startsWith('SOLANA_') ||
        key.startsWith('STELLAR_') ||
        key === 'NETWORK_ENV'
      ) {
        delete process.env[key]
      }
    }
    process.env.NETWORK_ENV = 'mainnet'
    process.env.FACILITATOR_BASE = '0xabc'
    process.env.FACILITATOR_SOLANA = 'SolAddr'
    process.env.FACILITATOR_STELLAR = 'StellarAddr'
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
    expect(result.missing).toContain('SOLANA_RPC_URL')
    expect(result.missing).toContain('STELLAR_RPC_URL')
  })
})
